'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const store = require('./database');
const mail = require('./email');

const SESSION_NAME = 'northstar_session';
const MAX_BODY = 64 * 1024;
let pepperValue;
let backupAttempted = false;
let googleClient;

if (store.REMOTE && !process.env.AUTH_PEPPER) throw new Error('Set AUTH_PEPPER before starting with a remote database.');
if (process.env.AUTH_PEPPER && Buffer.byteLength(process.env.AUTH_PEPPER) < 32) throw new Error('AUTH_PEPPER must contain at least 32 characters.');

function pepper() {
	if (pepperValue) return pepperValue;
	const configured = process.env.AUTH_PEPPER;
	if (configured) {
		if (Buffer.byteLength(configured) < 32) throw new Error('AUTH_PEPPER must contain at least 32 characters.');
		pepperValue = `*${configured}*`;
		return pepperValue;
	}
	if (store.REMOTE) throw new Error('AUTH_PEPPER must be configured when using a remote database.');
	const file = path.join(store.DATA_DIR, 'pepper.key');
	try { fs.writeFileSync(file, `*${crypto.randomBytes(32).toString('hex')}*`, { flag: 'wx', mode: 0o600 }); }
	catch (error) { if (error.code !== 'EEXIST') throw error; }
	pepperValue = fs.readFileSync(file, 'utf8');
	if (Buffer.byteLength(pepperValue) < 32) throw new Error('Cannot read or create the private pepper key.');
	return pepperValue;
}

function sessionKey() {
	return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(pepper(), 'utf8'), Buffer.alloc(0), Buffer.from('northstar/session/v1', 'utf8'), 32));
}

function encodeSession(session) {
	const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
	const signature = crypto.createHmac('sha256', sessionKey()).update(payload).digest('base64url');
	return `${payload}.${signature}`;
}

function readSession(req) {
	try {
		const cookies = String(req.headers.cookie || '').split(';');
		const cookie = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_NAME}=`));
		if (!cookie) return null;
		const value = decodeURIComponent(cookie.slice(SESSION_NAME.length + 1));
		const [payload, signature] = value.split('.');
		if (!payload || !signature) return null;
		const expected = crypto.createHmac('sha256', sessionKey()).update(payload).digest();
		const actual = Buffer.from(signature, 'base64url');
		if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
		const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		return session && Number.isSafeInteger(session.expiresAt) && session.expiresAt > Date.now() ? session : null;
	} catch { return null; }
}

function cookie(req, session) {
	const secure = process.env.NODE_ENV === 'production' || Boolean(req.socket?.encrypted);
	return `${SESSION_NAME}=${encodeURIComponent(encodeSession(session))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800${secure ? '; Secure' : ''}`;
}

function newSession() {
	return { csrfToken: crypto.randomBytes(32).toString('hex'), expiresAt: Date.now() + 30 * 60 * 1000 };
}

function json(res, status, data, headers = {}) {
	const body = JSON.stringify(data);
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...headers });
	res.end(body);
}

function parseBody(req) {
	if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
	if (typeof req.body === 'string') {
		try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.reject(new HttpError(400, 'Request body must be valid JSON.')); }
	}
	return new Promise((resolve, reject) => {
		const chunks = [];
		let length = 0;
		req.on('data', (chunk) => {
			length += chunk.length;
			if (length > MAX_BODY) { reject(new HttpError(413, 'Request body is too large.')); req.destroy(); return; }
			chunks.push(chunk);
		});
		req.on('end', () => {
			try {
				const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
				if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
				resolve(body);
			} catch { reject(new HttpError(400, 'Request body must be valid JSON.')); }
		});
		req.on('error', reject);
	});
}

async function postData(req, session) {
	if (req.method !== 'POST') throw new HttpError(405, 'Use POST for this action.');
	const csrf = req.headers['x-csrf-token'];
	if (!session?.csrfToken || typeof csrf !== 'string' || csrf !== session.csrfToken) throw new HttpError(403, 'Your session expired. Refresh the page and try again.');
	return parseBody(req);
}

function safeUser(user) {
	return { id: Number(user.id), username: String(user.username), name: String(user.full_name), role: String(user.role) };
}

async function currentUser(session) {
	if (!session?.userId) return null;
	const user = await store.one('SELECT * FROM users WHERE id = ?', [session.userId]);
	if (!user || Number(user.auth_version) !== Number(session.authVersion)) return null;
	session.expiresAt = Date.now() + 30 * 60 * 1000;
	return user;
}

function validIdentity(username, name) {
	const length = [...name.trim()].length;
	return /^[a-zA-Z0-9._]{3,32}$/.test(username) && length >= 1 && length <= 80;
}

function validEmail(email, required = false) {
	if (!email || !email.trim()) return !required;
	const value = email.trim();
	return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function passwordMaterial(password, salt) {
	return crypto.createHmac('sha256', pepper()).update(`${password}#${salt}`, 'utf8').digest('hex');
}

async function createAccount(data, role, approvalStatus = 'approved', googleSub = null) {
	const username = String(data.username || '').trim();
	const name = String(data.name || '').trim();
	const email = String(data.email || '').trim();
	const password = String(data.password || '');
	if (!validIdentity(username, name) || !validEmail(email) || Buffer.byteLength(password) < 12 || Buffer.byteLength(password) > 1024) throw new HttpError(422, 'Enter a valid name, username, email, and password of at least 12 characters.');
	const salt = `${username}#${crypto.randomBytes(16).toString('hex')}`;
	const approvedAt = approvalStatus === 'approved' ? new Date().toISOString() : null;
	try {
		const result = await store.one('INSERT INTO users (username, full_name, role, password_salt, password_hash, email, google_sub, approval_status, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *', [username, name, role, salt, bcrypt.hashSync(passwordMaterial(password, salt), 12), email || null, googleSub, approvalStatus, approvedAt]);
		return result;
	} catch (error) {
		if (String(error.code || '').includes('CONSTRAINT') || /UNIQUE constraint failed/i.test(error.message)) throw new HttpError(409, 'That username or email is already in use.');
		throw error;
	}
}

async function administratorEmail() {
	if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL.trim();
	const administrator = await store.one("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL ORDER BY id LIMIT 1");
	return String(administrator?.email || '').trim();
}

async function sendNotice(to, notice) {
	return mail.sendEmail(to, notice.subject, notice.text, notice.html);
}

async function requestViewerAccess(data, googleSub = null) {
	const admins = await store.one("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
	if (Number(admins.count) < 1) throw new HttpError(409, 'Sign-up will be available after the initial admin account is set up.');
	data.email = String(data.email || '').trim().toLowerCase();
	if (!validEmail(data.email, true)) throw new HttpError(422, 'Enter a valid name, username, email, and password of at least 12 characters.');
	const adminEmail = await administratorEmail();
	if (process.env.NODE_ENV === 'production' && (!mail.emailConfigured() || !adminEmail)) throw new HttpError(503, 'Email delivery is not configured. Ask the administrator to finish email setup before creating an account.');
	const created = await createAccount(data, 'viewer', 'pending', googleSub);
	const [emailSent, adminNotified] = await Promise.all([
		sendNotice(created.email, mail.requestReceived(created)),
		adminEmail ? sendNotice(adminEmail, mail.adminRequestNotice(created)) : false,
	]);
	return { emailSent, adminNotified };
}

function googleOAuthClient() {
	if (!process.env.GOOGLE_CLIENT_ID) throw new HttpError(503, 'Google sign-in is not configured. Ask the administrator to configure it.');
	googleClient ||= new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
	return googleClient;
}

function finishSignIn(req, res, user) {
	const session = newSession();
	session.userId = Number(user.id);
	session.authVersion = Number(user.auth_version || 0);
	json(res, 200, { user: safeUser(user), csrfToken: session.csrfToken }, { 'Set-Cookie': cookie(req, session) });
}

class HttpError extends Error {
	constructor(status, message) { super(message); this.status = status; }
}

async function route(req, res, url, session) {
	const action = url.searchParams.get('action') || '';
	let data;
	if (action === 'state' && req.method === 'GET') {
		const user = await currentUser(session);
		const active = user ? session : (session || newSession());
		if (process.env.GOOGLE_CLIENT_ID) active.googleNonce = crypto.randomBytes(32).toString('base64url');
		const count = await store.one('SELECT COUNT(*) AS count FROM users');
		if (!backupAttempted && !store.REMOTE) {
			backupAttempted = true;
			pepper();
			store.startLocalBackupSchedule();
		}
		return json(res, 200, { csrfToken: active.csrfToken, setupRequired: Number(count.count) === 0, googleClientId: process.env.GOOGLE_CLIENT_ID || '', googleNonce: active.googleNonce || '', user: user ? safeUser(user) : null }, { 'Set-Cookie': cookie(req, active) });
	}
	if (action === 'setup') {
		data = await postData(req, session);
		const count = await store.one('SELECT COUNT(*) AS count FROM users');
		if (Number(count.count) !== 0) throw new HttpError(409, 'Initial setup is already complete.');
		return finishSignIn(req, res, await createAccount(data, 'admin'));
	}
	if (action === 'signup') {
		data = await postData(req, session);
		const { emailSent, adminNotified } = await requestViewerAccess(data);
		return json(res, 202, {
			message: 'Your request was submitted and is waiting for administrator review.',
			emailSent,
			adminNotified,
		});
	}
	if (action === 'google-login') {
		data = await postData(req, session);
		const credential = String(data.credential || '');
		if (!credential || credential.length > 8192) throw new HttpError(422, 'Google did not provide a valid sign-in credential.');
		const verifier = googleOAuthClient();
		let payload;
		try {
			const ticket = await verifier.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
			payload = ticket.getPayload();
		} catch (error) {
			console.error('Google credential verification failed:', error.message);
			throw new HttpError(401, 'Google could not verify this sign-in. Please try again.');
		}
		if (!payload?.sub || !payload.email || (payload.email_verified !== true && payload.email_verified !== 'true')) {
			throw new HttpError(401, 'Use a Google account with a verified email address.');
		}
		if (!session?.googleNonce || payload.nonce !== session.googleNonce) throw new HttpError(401, 'This Google sign-in has expired. Please try again.');
		const email = String(payload.email).trim().toLowerCase();
		if (!validEmail(email, true)) throw new HttpError(401, 'Google returned an invalid email address.');
		const linkedAccount = await store.one('SELECT * FROM users WHERE google_sub = ?', [String(payload.sub)]);
		if (linkedAccount) {
			if (linkedAccount.approval_status !== 'approved') {
				throw new HttpError(403, linkedAccount.approval_status === 'pending' ? 'Your Google account request is waiting for administrator approval.' : 'This Google account request was declined. Contact the administrator.');
			}
			return finishSignIn(req, res, linkedAccount);
		}
		const emailAccount = await store.one('SELECT id FROM users WHERE email = ? COLLATE NOCASE', [email]);
		if (emailAccount) throw new HttpError(409, 'An account already uses this email. Sign in with that account or contact the administrator to link Google sign-in.');
		const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9._]/g, '').slice(0, 21) || 'google';
		const username = `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
		const name = (String(payload.name || '').trim() || prefix).slice(0, 80);
		const { emailSent, adminNotified } = await requestViewerAccess({
			username,
			name,
			email,
			password: crypto.randomBytes(32).toString('base64url'),
		}, String(payload.sub));
		session.googleNonce = crypto.randomBytes(32).toString('base64url');
		return json(res, 202, {
			pendingApproval: true,
			message: 'Your Google account request was submitted and is waiting for administrator review.',
			emailSent,
			adminNotified,
		}, { 'Set-Cookie': cookie(req, session) });
	}
	if (action === 'login') {
		data = await postData(req, session);
		const identity = String(data.username || '').trim();
		const user = await store.one('SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1', [identity, identity]);
		const now = Math.floor(Date.now() / 1000);
		if (!user || Number(user.locked_until) > now) throw new HttpError(401, 'Username or password is incorrect, or sign-in is temporarily locked.');
		const password = String(data.password || '');
		if (!bcrypt.compareSync(passwordMaterial(password, user.password_salt), user.password_hash)) {
			const failures = Number(user.failed_attempts) + 1;
			await store.run('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [failures, failures >= 5 ? now + 900 : 0, user.id]);
			throw new HttpError(401, 'Username or password is incorrect, or sign-in is temporarily locked.');
		}
		if (bcrypt.getRounds(user.password_hash) < 12) {
			await store.run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(passwordMaterial(password, user.password_salt), 12), user.id]);
		}
		await store.run('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?', [user.id]);
		if (user.approval_status && user.approval_status !== 'approved') {
			throw new HttpError(403, user.approval_status === 'pending' ? 'Your account is waiting for administrator approval.' : 'This account is not approved for sign-in.');
		}
		return finishSignIn(req, res, user);
	}
	if (action === 'account' && req.method === 'GET') {
		const user = await currentUser(session);
		if (!user) throw new HttpError(401, 'Please sign in again.');
		return json(res, 200, { user: safeUser(user), email: String(user.email || '') }, { 'Set-Cookie': cookie(req, session) });
	}
	if (action === 'users' && req.method === 'GET') {
		const user = await currentUser(session);
		if (!user) throw new HttpError(401, 'Please sign in again.');
		if (user.role !== 'admin') throw new HttpError(403, 'Only an admin can view the account directory.');
		const users = await store.all("SELECT id, username, full_name, role FROM users WHERE approval_status = 'approved' ORDER BY full_name COLLATE NOCASE");
		return json(res, 200, { user: safeUser(user), email: String(user.email || ''), users: users.map(safeUser) }, { 'Set-Cookie': cookie(req, session) });
	}
	if (action === 'approvals' && req.method === 'GET') {
		const user = await currentUser(session);
		if (!user) throw new HttpError(401, 'Please sign in again.');
		if (user.role !== 'admin') throw new HttpError(403, 'Only an admin can review access requests.');
		const requests = await store.all("SELECT id, username, full_name, email, created_at FROM users WHERE approval_status = 'pending' ORDER BY created_at, id");
		const stats = await store.one("SELECT COUNT(*) AS total, SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins FROM users WHERE approval_status = 'approved'");
		return json(res, 200, { requests, totalMembers: Number(stats.total || 0), administrators: Number(stats.admins || 0) }, { 'Set-Cookie': cookie(req, session) });
	}
	if (action === 'signature-keys' && req.method === 'GET') {
		if (!await currentUser(session)) throw new HttpError(401, 'Please sign in again.');
		const rows = await store.all('SELECT username, signature_public_key FROM users WHERE signature_public_key IS NOT NULL');
		const keys = Object.fromEntries(rows.map((row) => [String(row.username), String(row.signature_public_key)]));
		return json(res, 200, { keys }, { 'Set-Cookie': cookie(req, session) });
	}
	if (action === 'logout') {
		await postData(req, session);
		return json(res, 200, { message: 'Signed out.' }, { 'Set-Cookie': `${SESSION_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` });
	}
	data = await postData(req, session);
	const user = await currentUser(session);
	if (action === 'update-email') {
		if (!user) throw new HttpError(401, 'Please sign in again.');
		const email = String(data.email || '').trim().toLowerCase();
		if (!validEmail(email, true)) throw new HttpError(422, 'Enter a valid email address.');
		try { await store.run('UPDATE users SET email = ? WHERE id = ?', [email, user.id]); }
		catch (error) { if (String(error.code || '').includes('CONSTRAINT') || /UNIQUE constraint failed/i.test(error.message)) throw new HttpError(409, 'That email address is already linked to another account.'); throw error; }
		return json(res, 200, { message: 'Email saved. You can now use it with your password to sign in.' });
	}
	if (action === 'register-signature-key') {
		if (!user) throw new HttpError(401, 'Please sign in again.');
		const encoded = String(data.publicKey || '');
		let key;
		try {
			const der = Buffer.from(encoded, 'base64');
			if (der.toString('base64') !== encoded) throw new Error();
			key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
		} catch { throw new HttpError(422, 'The signing public key is invalid.'); }
		if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new HttpError(422, 'Use an ECDSA P-256 signing key.');
		await store.run('UPDATE users SET signature_public_key = ? WHERE id = ? AND signature_public_key IS NULL', [encoded, user.id]);
		const saved = await store.one('SELECT signature_public_key FROM users WHERE id = ?', [user.id]);
		if (saved.signature_public_key !== encoded) throw new HttpError(409, 'This account already has a registered signing key. Use the browser where it was created or request an administrator key reset.');
		return json(res, 200, { publicKey: encoded });
	}
	if (action === 'create-user') {
		if (!user) throw new HttpError(401, 'Please sign in again.');
		if (user.role !== 'admin') throw new HttpError(403, 'Only an admin can create accounts.');
		const role = String(data.role || '');
		if (!['admin', 'staff', 'viewer'].includes(role)) throw new HttpError(422, 'Choose the admin, staff, or viewer role.');
		const created = await createAccount(data, role);
		return json(res, 201, { user: safeUser(created), message: 'Account created. Share the initial password securely.' });
	}
	if (action === 'review-user') {
		if (!user) throw new HttpError(401, 'Please sign in again.');
		if (user.role !== 'admin') throw new HttpError(403, 'Only an admin can review access requests.');
		const id = Number(data.id);
		const decision = String(data.decision || '');
		if (!Number.isSafeInteger(id) || id < 1 || !['approve', 'decline'].includes(decision)) throw new HttpError(422, 'Choose a valid account and review decision.');
		const target = await store.one("SELECT id, username, full_name, email FROM users WHERE id = ? AND approval_status = 'pending'", [id]);
		if (!target) throw new HttpError(404, 'That access request was already reviewed or no longer exists.');
		const approved = decision === 'approve';
		const updated = await store.one("UPDATE users SET approval_status = ?, approved_at = ? WHERE id = ? AND approval_status = 'pending' RETURNING id", [approved ? 'approved' : 'declined', approved ? new Date().toISOString() : null, id]);
		if (!updated) throw new HttpError(409, 'That access request was reviewed by another administrator. Refresh the dashboard.');
		const noticeSent = await sendNotice(target.email, mail.reviewNotice(target, approved));
		return json(res, 200, {
			message: approved ? `${target.full_name}'s account is approved.` : `${target.full_name}'s request was declined.`,
			noticeSent,
		});
	}
	if (action === 'delete-account') {
		if (!user) throw new HttpError(401, 'Please sign in again.');
		if (user.role !== 'admin') throw new HttpError(403, 'Only an admin can delete accounts.');
		const id = Number(data.id);
		if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(422, 'Invalid account.');
		const target = await store.transaction(async (tx) => {
			const account = await tx.one('SELECT id, full_name, role FROM users WHERE id = ?', [id]);
			if (!account) throw new HttpError(404, 'Account not found.');
			if (Number(account.id) === Number(user.id)) throw new HttpError(409, 'You cannot delete the account you are currently using. Sign in as the replacement admin first.');
			if (account.role === 'admin') {
				const admins = await tx.one("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
				if (Number(admins.count) <= 1) throw new HttpError(409, 'The last admin account cannot be deleted. Create a replacement admin first.');
			}
			await tx.run('DELETE FROM users WHERE id = ?', [id]);
			return account;
		});
		return json(res, 200, { message: `${String(target.role).replace(/^./, (letter) => letter.toUpperCase())} account deleted.` });
	}
	throw new HttpError(404, 'Unknown action.');
}

async function handleApi(req, res) {
	const requestId = crypto.randomUUID();
	try {
		await store.initializeDatabase();
		const session = readSession(req);
		const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
		await route(req, res, url, session);
	} catch (error) {
		if (error instanceof HttpError) return json(res, error.status, { error: error.message });
		const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
		console.error(`API error ${requestId} (${req.method} ${url.searchParams.get('action') || 'unknown'}):`, error);
		return json(res, 500, { error: 'The server could not complete the request.', requestId });
	}
}

module.exports = { handleApi };
