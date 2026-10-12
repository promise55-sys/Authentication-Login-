'use strict';

const byId = (id) => document.getElementById(id);
const loginView = byId('loginView');
const appView = byId('appView');
const steps = { setup: byId('setupStep'), login: byId('passwordStep'), signup: byId('signupStep') };
let csrfToken = '';
let currentAccount = null;
let signingKey = null;
let googleSignInClientId = '';
let googleSignInNonce = '';

function setStep(name) {
	Object.entries(steps).forEach(([key, section]) => { section.hidden = key !== name; });
	loginView.hidden = false;
	appView.hidden = true;
}

function showMessage(id, message, success = false) {
	const element = byId(id);
	element.textContent = message;
	element.classList.toggle('success', success);
}

async function request(action, method = 'POST', payload = null) {
	if (location.protocol === 'file:') throw new Error('Open this app through the Node.js server at http://127.0.0.1:8000. Do not open the HTML file directly.');
	const options = { method, credentials: 'same-origin', headers: {} };
	if (method === 'POST') {
		options.headers['Content-Type'] = 'application/json';
		options.headers['X-CSRF-Token'] = csrfToken;
		options.body = JSON.stringify(payload || {});
	}
	let response;
	try {
		response = await fetch(`/api?action=${encodeURIComponent(action)}`, options);
	} catch {
		throw new Error('Cannot reach the Node.js server. In this folder, run npm.cmd install and npm.cmd start, then open http://127.0.0.1:8000.');
	}
	let result;
	try { result = await response.json(); }
	catch { throw new Error('The Node.js API is not responding. Start the app with npm.cmd start and open http://127.0.0.1:8000, not VS Code Go Live.'); }
	if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('The server returned an invalid response.');
	if (!response.ok) {
		const reference = result.requestId ? ` (Reference: ${result.requestId})` : '';
		throw new Error(`${result.error || 'The request could not be completed.'}${reference}`);
	}
	return result;
}

function formValues(form) {
	return Object.fromEntries(new FormData(form));
}

function handleGoogleCredential(response) {
	const messageId = byId('signupStep').hidden ? 'googleLoginMessage' : 'googleSignupMessage';
	(async () => {
		try {
			const result = await request('google-login', 'POST', { credential: response.credential });
			if (result.pendingApproval) {
				let message = result.emailSent
					? `${result.message} A confirmation email has been sent.`
					: `${result.message} Email delivery could not be confirmed.`;
				if (!result.adminNotified) message += ' The request remains visible in the administrator dashboard.';
				showMessage(messageId, message, true);
				return;
			}
			csrfToken = result.csrfToken;
			showMessage(messageId, '');
			openWorkspace(result.user);
		} catch (error) {
			showMessage(messageId, error.message);
		}
	})();
}

function initializeGoogleSignIn(clientId) {
	googleSignInClientId = clientId;
	const sections = [byId('googleSignInSection'), byId('googleSignupSection')];
	sections.forEach((section) => { section.hidden = !clientId; });
	if (!clientId) return;

	const script = document.createElement('script');
	script.src = 'https://accounts.google.com/gsi/client';
	script.async = true;
	script.defer = true;
	script.onload = () => {
		window.google.accounts.id.initialize({ client_id: googleSignInClientId, nonce: googleSignInNonce, callback: handleGoogleCredential });
		window.google.accounts.id.renderButton(byId('googleSignInButton'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 320 });
		window.google.accounts.id.renderButton(byId('googleSignupButton'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 320 });
	};
	script.onerror = () => {
		sections.forEach((section) => {
			section.hidden = false;
			const message = section.id === 'googleSignInSection' ? 'googleLoginMessage' : 'googleSignupMessage';
			showMessage(message, 'Google sign-in could not be loaded. Please try again later.');
		});
	};
	document.head.append(script);
}

async function savePassword(values, checkboxId) {
	if (!byId(checkboxId).checked || typeof PasswordCredential === 'undefined' || !navigator.credentials?.store) return;
	try { await navigator.credentials.store(new PasswordCredential({ id: values.username, password: values.password })); } catch {}
}

function openWorkspace(user) {
	currentAccount = user;
	loginView.hidden = true;
	appView.hidden = false;
	byId('welcomeText').textContent = `Signed in as ${user.name}`;
	byId('roleBadge').textContent = user.role;
	byId('adminDashboard').hidden = user.role !== 'admin';
	byId('userDashboard').hidden = user.role === 'admin';
	byId('adminTools').hidden = user.role !== 'admin';
	byId('approvalsPanel').hidden = user.role !== 'admin';
	byId('pendingStatCard').hidden = user.role !== 'admin';
	byId('accessMetric').textContent = user.role[0].toUpperCase() + user.role.slice(1);
	byId('userDashboardName').textContent = user.name;
	byId('userDashboardUsername').textContent = user.username;
	byId('userDashboardRole').textContent = user.role[0].toUpperCase() + user.role.slice(1);
	byId('dashboardDate').textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date());
	void prepareSigningKey();
	void loadAccount();
	if (user.role === 'admin') {
		void loadUsers();
		void loadApprovals();
	}
}

function openKeyStore() {
	return new Promise((resolve, reject) => {
		const opening = indexedDB.open('northstar-signatures', 1);
		opening.onupgradeneeded = () => opening.result.createObjectStore('keys');
		opening.onsuccess = () => resolve(opening.result);
		opening.onerror = () => reject(opening.error || new Error('Could not open browser key storage.'));
	});
}

async function storedKey(mode, action, value) {
	const database = await openKeyStore();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('keys', mode);
		const store = transaction.objectStore('keys');
		const id = `account-signing-key:${currentAccount.username.toLowerCase()}`;
		const request = action === 'get' ? store.get(id) : store.put(value, id);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error || new Error('Could not access browser key storage.'));
		transaction.oncomplete = () => database.close();
		transaction.onerror = () => { database.close(); reject(transaction.error); };
	});
}

function toBase64(buffer) {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(value) {
	return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function signaturePayload(record) {
	return JSON.stringify({ format: record.format, algorithm: record.algorithm, signer: record.signer, signedAt: record.signedAt, message: record.message });
}

async function prepareSigningKey() {
	const status = byId('signatureKeyStatus');
	signingKey = null;
	byId('signMessageButton').disabled = true;
	try {
		if (!crypto.subtle || !indexedDB) throw new Error('Secure browser signing requires a modern browser over HTTPS or localhost.');
		signingKey = await storedKey('readonly', 'get');
		const { keys } = await request('signature-keys', 'GET');
		const registered = keys[currentAccount.username] || Object.entries(keys).find(([name]) => name.toLowerCase() === currentAccount.username.toLowerCase())?.[1];
		if (registered && !signingKey) throw new Error('This account has a signing key in another browser. Browser storage cannot recover its private key.');
		if (!signingKey) {
			const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
			const exported = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
			const privateKey = await crypto.subtle.importKey('pkcs8', exported, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
			signingKey = { privateKey, publicKey: toBase64(await crypto.subtle.exportKey('spki', pair.publicKey)) };
			new Uint8Array(exported).fill(0);
			await storedKey('readwrite', 'put', signingKey);
		}
		if (registered && registered !== signingKey.publicKey) throw new Error('The local signing key does not match the key registered to this account.');
		if (!registered) await request('register-signature-key', 'POST', { publicKey: signingKey.publicKey });
		status.textContent = 'Signing key ready in this browser';
		byId('signingMetric').textContent = 'Ready';
		byId('userSigningMetric').textContent = 'Ready';
		byId('signMessageButton').disabled = false;
	} catch (error) {
		status.textContent = error.message;
		byId('signingMetric').textContent = 'Unavailable';
		byId('userSigningMetric').textContent = 'Unavailable';
	}
}

async function loadAccount() {
	try {
		const result = await request('account', 'GET');
		currentAccount = result.user;
		byId('accountEmail').value = result.email || '';
	} catch (error) {
		showMessage('accountMessage', error.message);
	}
}

async function loadUsers() {
	try {
		const result = await request('users', 'GET');
		currentAccount = result.user;
		byId('memberCount').textContent = result.users.length.toLocaleString();
		renderUsers(result.users);
	} catch (error) {
		showMessage('directoryMessage', error.message);
	}
}

async function loadApprovals() {
	try {
		const result = await request('approvals', 'GET');
		byId('pendingCount').textContent = result.requests.length.toLocaleString();
		byId('requestCount').textContent = `${result.requests.length} pending`;
		renderApprovals(result.requests);
	} catch (error) { showMessage('approvalMessage', error.message); }
}

function renderApprovals(requests) {
	const list = byId('approvalRows');
	list.replaceChildren();
	if (!requests.length) {
		const empty = document.createElement('div');
		empty.className = 'approval-empty';
		empty.textContent = 'You’re all caught up. No accounts are waiting for review.';
		list.append(empty);
		return;
	}
	for (const accessRequest of requests) {
		const item = document.createElement('article');
		item.className = 'approval-item';
		const details = document.createElement('div');
		details.className = 'approval-person';
		const name = document.createElement('strong');
		name.textContent = accessRequest.full_name;
		const meta = document.createElement('span');
		meta.textContent = `${accessRequest.username} · ${accessRequest.email}`;
		const date = document.createElement('small');
		date.textContent = `Requested ${new Date(`${accessRequest.created_at.replace(' ', 'T')}Z`).toLocaleDateString()}`;
		details.append(name, meta, date);
		const actions = document.createElement('div');
		actions.className = 'approval-actions';
		const approve = document.createElement('button');
		approve.type = 'button';
		approve.className = 'review-button approve';
		approve.textContent = 'Approve';
		const decline = document.createElement('button');
		decline.type = 'button';
		decline.className = 'review-button decline';
		decline.textContent = 'Decline';
		approve.addEventListener('click', () => reviewRequest(accessRequest, 'approve', approve, decline));
		decline.addEventListener('click', () => reviewRequest(accessRequest, 'decline', approve, decline));
		actions.append(approve, decline);
		item.append(details, actions);
		list.append(item);
	}
}

async function reviewRequest(accessRequest, decision, approve, decline) {
	if (decision === 'decline' && !confirm(`Decline the access request from ${accessRequest.full_name}?`)) return;
	approve.disabled = true;
	decline.disabled = true;
	try {
		const result = await request('review-user', 'POST', { id: accessRequest.id, decision });
		showMessage('approvalMessage', result.noticeSent ? `${result.message} Email sent.` : `${result.message} Email notification could not be sent.`, true);
		await Promise.all([loadUsers(), loadApprovals()]);
	} catch (error) {
		showMessage('approvalMessage', error.message);
		approve.disabled = false;
		decline.disabled = false;
	}
}

function renderUsers(users) {
	const body = byId('staffRows');
	body.replaceChildren();
	if (!users.length) {
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 4;
		cell.className = 'empty';
		cell.textContent = 'No team members found.';
		row.append(cell);
		body.append(row);
		return;
	}
	for (const user of users) {
		const row = document.createElement('tr');
		const personCell = document.createElement('td');
		personCell.dataset.label = 'Team member';
		const person = document.createElement('div');
		person.className = 'person';
		const avatar = document.createElement('span');
		avatar.className = 'avatar';
		avatar.textContent = user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
		const name = document.createElement('span');
		name.textContent = user.name;
		person.append(avatar, name);
		personCell.append(person);
		const usernameCell = document.createElement('td');
		usernameCell.dataset.label = 'Username';
		usernameCell.textContent = user.username;
		const roleCell = document.createElement('td');
		roleCell.dataset.label = 'Role';
		roleCell.textContent = user.role;
		const accessCell = document.createElement('td');
		accessCell.dataset.label = 'Access';
		if (currentAccount.role === 'admin' && user.id !== currentAccount.id) {
			const remove = document.createElement('button');
			remove.className = 'remove-button';
			remove.type = 'button';
			remove.textContent = 'Delete account';
			remove.setAttribute('aria-label', `Delete ${user.name}`);
			remove.addEventListener('click', () => deleteAccount(user));
			accessCell.append(remove);
		} else {
			const viewOnly = document.createElement('span');
			viewOnly.className = 'view-only';
			viewOnly.textContent = 'VIEW ONLY';
			accessCell.append(viewOnly);
		}
		row.append(personCell, usernameCell, roleCell, accessCell);
		body.append(row);
	}
}

async function deleteAccount(user) {
	if (!confirm(`Delete ${user.role} account ${user.name}? This cannot be undone.`)) return;
	try {
		const result = await request('delete-account', 'POST', { id: user.id });
		showMessage('directoryMessage', result.message, true);
		await loadUsers();
	} catch (error) { showMessage('directoryMessage', error.message); }
}

byId('togglePassword').addEventListener('click', (event) => {
	const input = byId('password');
	const show = input.type === 'password';
	input.type = show ? 'text' : 'password';
	event.currentTarget.textContent = show ? 'Hide' : 'Show';
	event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

byId('setupForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		const result = await request('setup', 'POST', formValues(event.currentTarget));
		csrfToken = result.csrfToken;
		openWorkspace(result.user);
	} catch (error) { showMessage('setupMessage', error.message); }
});

byId('loginForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	showMessage('loginMessage', '');
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	const originalText = button.innerHTML;
	const values = formValues(form);
	button.disabled = true;
	button.textContent = 'Checking securely…';
	try {
		const result = await request('login', 'POST', values);
		csrfToken = result.csrfToken;
		void savePassword(values, 'savePassword');
		openWorkspace(result.user);
	} catch (error) { showMessage('loginMessage', error.message); }
	finally { button.disabled = false; button.innerHTML = originalText; }
});

byId('signupForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const values = formValues(form);
	try {
		const result = await request('signup', 'POST', values);
		form.reset();
		setStep('login');
		let message = result.emailSent
			? `${result.message} A confirmation email is on its way.`
			: `${result.message} Email could not be sent; contact the administrator if you need an update.`;
		if (!result.adminNotified) message += ' The request remains visible in the administrator dashboard.';
		showMessage('loginMessage', message, true);
	} catch (error) { showMessage('signupMessage', error.message); }
});

byId('showSignupButton').addEventListener('click', () => {
	showMessage('signupMessage', '');
	setStep('signup');
	byId('signupName').focus();
});
byId('cancelSignupButton').addEventListener('click', () => setStep('login'));

byId('emailSettingsForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		const result = await request('update-email', 'POST', { email: byId('accountEmail').value.trim() });
		showMessage('accountMessage', result.message, true);
	} catch (error) { showMessage('accountMessage', error.message); }
});

byId('staffForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget instanceof HTMLFormElement ? event.currentTarget : byId('staffForm');
	try {
		const result = await request('create-user', 'POST', formValues(form));
		showMessage('staffMessage', result.message, true);
		if (form && typeof form.reset === 'function') form.reset();
		await loadUsers();
	} catch (error) { showMessage('staffMessage', error.message); }
});

byId('logoutButton').addEventListener('click', async () => {
	try {
		await request('logout', 'POST');
		currentAccount = null;
		signingKey = null;
		await loadState();
	} catch (error) { showMessage('directoryMessage', error.message); }
});

byId('signMessageButton').addEventListener('click', async () => {
	const message = byId('signatureMessage').value.trim();
	if (!message || !signingKey || !currentAccount) {
		showMessage('signatureMessageStatus', 'Enter a statement before signing.');
		return;
	}
	const button = byId('signMessageButton');
	button.disabled = true;
	try {
		const record = { format: 'northstar-ecdsa-v1', algorithm: 'ECDSA-P256-SHA256', signer: currentAccount.username, signedAt: new Date().toISOString(), message, publicKey: signingKey.publicKey };
		record.signature = toBase64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey.privateKey, new TextEncoder().encode(signaturePayload(record))));
		byId('signatureRecord').value = JSON.stringify(record, null, 2);
		byId('signatureResult').hidden = false;
		showMessage('signatureMessageStatus', 'Statement signed. Download the record to share it.', true);
	} catch (error) { showMessage('signatureMessageStatus', `Could not sign this statement: ${error.message}`); }
	finally { button.disabled = false; }
});

byId('downloadSignatureButton').addEventListener('click', () => {
	const record = byId('signatureRecord').value;
	if (!record) return;
	const fileUrl = URL.createObjectURL(new Blob([record], { type: 'application/json' }));
	const link = document.createElement('a');
	link.href = fileUrl;
	link.download = 'northstar-signed-record.json';
	link.click();
	URL.revokeObjectURL(fileUrl);
});

byId('verifySignatureButton').addEventListener('click', async () => {
	const file = byId('signatureFile').files[0];
	const status = byId('signatureVerifyStatus');
	status.textContent = '';
	if (!file) { status.textContent = 'Choose a signed JSON record first.'; return; }
	if (file.size > 100000) { status.textContent = 'That file is too large to verify.'; return; }
	try {
		const record = JSON.parse(await file.text());
		if (record.format !== 'northstar-ecdsa-v1' || record.algorithm !== 'ECDSA-P256-SHA256' || typeof record.signer !== 'string' || typeof record.signedAt !== 'string' || typeof record.message !== 'string' || typeof record.publicKey !== 'string' || typeof record.signature !== 'string') throw new Error('This is not a supported signed record.');
		const { keys } = await request('signature-keys', 'GET');
		const registered = keys[record.signer] || Object.entries(keys).find(([name]) => name.toLowerCase() === record.signer.toLowerCase())?.[1];
		if (!registered || registered !== record.publicKey) throw new Error('The signer key is not registered to that account, or the record contains a different key.');
		const publicKey = await crypto.subtle.importKey('spki', fromBase64(registered), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
		const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, fromBase64(record.signature), new TextEncoder().encode(signaturePayload(record)));
		status.textContent = valid ? `Signature is valid for this statement. Claimed signer: ${record.signer}.` : 'Signature is invalid or the statement changed.';
		status.classList.toggle('success', valid);
	} catch (error) {
		status.textContent = error instanceof SyntaxError ? 'The selected file is not valid JSON.' : (error.message || 'Could not verify this record.');
		status.classList.remove('success');
	}
});

async function loadState() {
	if (location.protocol === 'file:') {
		setStep('login');
		showMessage('loginMessage', 'Serve this page with the Node.js app at http://127.0.0.1:8000 instead of opening the HTML file.');
		return;
	}
	try {
		const state = await request('state', 'GET');
		csrfToken = state.csrfToken;
		googleSignInNonce = state.googleNonce;
		initializeGoogleSignIn(state.googleClientId);
		if (state.user) openWorkspace(state.user);
		else setStep(state.setupRequired ? 'setup' : 'login');
	} catch (error) {
		setStep('login');
		showMessage('loginMessage', error.message);
	}
}

void loadState();
