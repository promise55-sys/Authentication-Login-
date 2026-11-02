'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Database = require('better-sqlite3');
const { backupKey, encryptFile } = require('./backup-crypto');

const DATA_DIR = process.env.AUTH_DATA_DIR || path.join(process.env.LOCALAPPDATA || process.env.HOME || os.tmpdir(), 'NorthstarAccess');
const DB_PATH = path.join(DATA_DIR, 'northstar.sqlite');
const DATABASE_MODE = process.env.DATABASE_MODE || (process.env.TURSO_DATABASE_URL ? 'turso' : 'sqlite');
if (!['sqlite', 'turso'].includes(DATABASE_MODE)) throw new Error('DATABASE_MODE must be either sqlite or turso.');
const REMOTE = DATABASE_MODE === 'turso';

if (REMOTE && !process.env.TURSO_DATABASE_URL) throw new Error('Set TURSO_DATABASE_URL when DATABASE_MODE=turso.');
if (REMOTE && !process.env.TURSO_AUTH_TOKEN) throw new Error('TURSO_AUTH_TOKEN is required with TURSO_DATABASE_URL.');
if (!REMOTE && process.env.TURSO_DATABASE_URL) throw new Error('Remove TURSO_DATABASE_URL or set DATABASE_MODE=turso.');
if (process.env.NODE_ENV === 'production' && !REMOTE && !process.env.AUTH_DATA_DIR) {
	throw new Error('Production SQLite needs persistent storage. On Render, attach a persistent disk (for example mounted at /var/data) and set AUTH_DATA_DIR=/var/data. Otherwise configure Turso with DATABASE_MODE=turso.');
}

let db;
if (REMOTE) {
	const { createClient } = require('@libsql/client');
	db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
} else {
	fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
	const localDatabase = new Database(DB_PATH);
	const execute = async (query) => {
		if (typeof query === 'string') {
			const statement = localDatabase.prepare(query);
			if (statement.reader) return { rows: statement.all() };
			localDatabase.exec(query);
			return { rows: [] };
		}
		const statement = localDatabase.prepare(query.sql);
		if (statement.reader) return { rows: statement.all(query.args || []) };
		const result = statement.run(query.args || []);
		return { rows: [], rowsAffected: result.changes, lastInsertRowid: result.lastInsertRowid };
	};
	db = {
		execute,
		async transaction() {
			localDatabase.exec('BEGIN IMMEDIATE');
			return {
				execute,
				async commit() { localDatabase.exec('COMMIT'); },
				async rollback() { localDatabase.exec('ROLLBACK'); },
			};
		},
	};
}

let schemaReady;
let backupQueue = Promise.resolve();
let backupTimer;
let dailyBackupTimer;

function scheduleLocalBackup() {
	if (REMOTE) return;
	clearTimeout(backupTimer);
	backupTimer = setTimeout(() => {
		backupTimer = null;
		backupQueue = backupQueue.catch(() => {}).then(() => maintainLocalDailyBackup());
		backupQueue.catch((error) => console.error('Automatic database backup failed:', error.message));
	}, 500);
}

function startLocalBackupSchedule() {
	if (REMOTE || dailyBackupTimer) return;
	scheduleLocalBackup();
	dailyBackupTimer = setInterval(scheduleLocalBackup, 24 * 60 * 60 * 1000);
	dailyBackupTimer.unref();
}

function isWrite(sql) {
	return /^\s*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql);
}

async function initializeDatabase() {
	if (schemaReady) return schemaReady;
	schemaReady = (async () => {
		await db.execute(`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL COLLATE NOCASE UNIQUE,
			full_name TEXT NOT NULL,
			role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'viewer')),
			password_salt TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			totp_secret TEXT,
			last_totp_step INTEGER NOT NULL DEFAULT -1,
			failed_attempts INTEGER NOT NULL DEFAULT 0,
			locked_until INTEGER NOT NULL DEFAULT 0,
			auth_version INTEGER NOT NULL DEFAULT 0,
				signature_public_key TEXT,
				email TEXT COLLATE NOCASE UNIQUE,
				google_sub TEXT,
				country TEXT NOT NULL DEFAULT '',
				country_code TEXT NOT NULL DEFAULT '',
				approval_status TEXT NOT NULL DEFAULT 'approved',
				approval_due_at TEXT,
				approved_at TEXT,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`);
		await db.execute(`CREATE TABLE IF NOT EXISTS deleted_users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			original_id INTEGER NOT NULL,
			username TEXT NOT NULL,
			full_name TEXT NOT NULL,
			role TEXT NOT NULL,
			email TEXT,
			country TEXT NOT NULL DEFAULT '',
			country_code TEXT NOT NULL DEFAULT '',
			approval_status TEXT,
			approval_due_at TEXT,
			created_at TEXT,
			approved_at TEXT,
			deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			deleted_by_id INTEGER NOT NULL,
			deleted_by_username TEXT NOT NULL
			)`);
		await db.execute(`CREATE TABLE IF NOT EXISTS password_recovery (
			user_id INTEGER PRIMARY KEY,
			code_hash TEXT NOT NULL,
			expires_at INTEGER NOT NULL,
			attempts INTEGER NOT NULL DEFAULT 0,
			requested_at INTEGER NOT NULL,
			window_started_at INTEGER NOT NULL,
			send_count INTEGER NOT NULL DEFAULT 0
			)`);
		await db.execute(`CREATE TABLE IF NOT EXISTS musician_profiles (
			user_id INTEGER PRIMARY KEY,
			location TEXT NOT NULL DEFAULT '',
			country TEXT NOT NULL DEFAULT '',
			member_type TEXT NOT NULL DEFAULT 'singer',
			avatar_preset TEXT NOT NULL DEFAULT 'guitar',
			instruments TEXT NOT NULL DEFAULT '',
			genres TEXT NOT NULL DEFAULT '',
			bio TEXT NOT NULL DEFAULT '',
			contact_email TEXT NOT NULL DEFAULT '',
			avatar_data BLOB,
			avatar_mime TEXT,
			share_location INTEGER NOT NULL DEFAULT 0,
			latitude REAL,
			longitude REAL,
			language TEXT NOT NULL DEFAULT 'en',
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		const profileColumns = new Set((await db.execute('PRAGMA table_info(musician_profiles)')).rows.map((row) => String(row.name)));
		if (!profileColumns.has('country')) await db.execute("ALTER TABLE musician_profiles ADD COLUMN country TEXT NOT NULL DEFAULT ''");
		if (!profileColumns.has('member_type')) await db.execute("ALTER TABLE musician_profiles ADD COLUMN member_type TEXT NOT NULL DEFAULT 'singer'");
		if (!profileColumns.has('avatar_preset')) await db.execute("ALTER TABLE musician_profiles ADD COLUMN avatar_preset TEXT NOT NULL DEFAULT 'guitar'");
		if (!profileColumns.has('avatar_data')) await db.execute('ALTER TABLE musician_profiles ADD COLUMN avatar_data BLOB');
		if (!profileColumns.has('avatar_mime')) await db.execute('ALTER TABLE musician_profiles ADD COLUMN avatar_mime TEXT');
		if (!profileColumns.has('share_location')) await db.execute('ALTER TABLE musician_profiles ADD COLUMN share_location INTEGER NOT NULL DEFAULT 0');
		if (!profileColumns.has('latitude')) await db.execute('ALTER TABLE musician_profiles ADD COLUMN latitude REAL');
		if (!profileColumns.has('longitude')) await db.execute('ALTER TABLE musician_profiles ADD COLUMN longitude REAL');
		if (!profileColumns.has('language')) await db.execute("ALTER TABLE musician_profiles ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
		await db.execute(`CREATE TABLE IF NOT EXISTS music_posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			author_id INTEGER NOT NULL,
			kind TEXT NOT NULL CHECK (kind IN ('idea', 'collab')),
			body TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		await db.execute(`CREATE TABLE IF NOT EXISTS music_post_replies (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			post_id INTEGER NOT NULL,
			author_id INTEGER NOT NULL,
			body TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		await db.execute('CREATE INDEX IF NOT EXISTS idx_music_post_replies_post ON music_post_replies (post_id, created_at, id)');
		await db.execute(`CREATE TABLE IF NOT EXISTS gig_listings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			poster_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			location TEXT NOT NULL,
			event_date TEXT NOT NULL,
			description TEXT NOT NULL,
			contact_email TEXT NOT NULL DEFAULT '',
			opportunity_type TEXT NOT NULL DEFAULT 'gig',
			compensation TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		await db.execute(`CREATE TABLE IF NOT EXISTS music_tracks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			author_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			genre TEXT NOT NULL DEFAULT '',
			note TEXT NOT NULL DEFAULT '',
			audio_url TEXT NOT NULL,
			media_type TEXT NOT NULL DEFAULT 'audio',
			audio_data BLOB,
			audio_mime TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		const gigColumns = new Set((await db.execute('PRAGMA table_info(gig_listings)')).rows.map((row) => String(row.name)));
		if (!gigColumns.has('opportunity_type')) await db.execute("ALTER TABLE gig_listings ADD COLUMN opportunity_type TEXT NOT NULL DEFAULT 'gig'");
		if (!gigColumns.has('compensation')) await db.execute("ALTER TABLE gig_listings ADD COLUMN compensation TEXT NOT NULL DEFAULT ''");
		const trackColumns = new Set((await db.execute('PRAGMA table_info(music_tracks)')).rows.map((row) => String(row.name)));
		if (!trackColumns.has('media_type')) await db.execute("ALTER TABLE music_tracks ADD COLUMN media_type TEXT NOT NULL DEFAULT 'audio'");
		if (!trackColumns.has('audio_data')) await db.execute('ALTER TABLE music_tracks ADD COLUMN audio_data BLOB');
		if (!trackColumns.has('audio_mime')) await db.execute('ALTER TABLE music_tracks ADD COLUMN audio_mime TEXT');
		await db.execute(`CREATE TABLE IF NOT EXISTS music_track_likes (
			track_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (track_id, user_id)
		)`);
		await db.execute(`CREATE TABLE IF NOT EXISTS music_track_comments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			track_id INTEGER NOT NULL,
			author_id INTEGER NOT NULL,
			body TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		await db.execute(`CREATE TABLE IF NOT EXISTS account_activity (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			username TEXT NOT NULL,
			event TEXT NOT NULL CHECK (event IN ('sign_in', 'sign_out')),
			occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		await db.execute('CREATE INDEX IF NOT EXISTS idx_account_activity_user ON account_activity (user_id, occurred_at DESC)');
		await db.execute(`CREATE TABLE IF NOT EXISTS community_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			room TEXT NOT NULL CHECK (room IN ('singers', 'instrumentalists', 'marketplace', 'support')),
			author_id INTEGER NOT NULL,
			body TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		await db.execute('CREATE INDEX IF NOT EXISTS idx_community_messages_room ON community_messages (room, created_at DESC, id DESC)');
		await db.execute(`CREATE TABLE IF NOT EXISTS marketplace_listings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			seller_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			category TEXT NOT NULL,
			price TEXT NOT NULL DEFAULT '',
			location TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL,
			contact_email TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		const result = await db.execute('PRAGMA table_info(users)');
		const names = new Set(result.rows.map((row) => String(row.name)));
		if (!names.has('auth_version')) await db.execute('ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0');
		if (!names.has('signature_public_key')) await db.execute('ALTER TABLE users ADD COLUMN signature_public_key TEXT');
		if (!names.has('email')) {
			await db.execute('ALTER TABLE users ADD COLUMN email TEXT COLLATE NOCASE');
			await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email COLLATE NOCASE) WHERE email IS NOT NULL');
		}
		if (!names.has('approval_status')) await db.execute("ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'");
		if (!names.has('approved_at')) await db.execute('ALTER TABLE users ADD COLUMN approved_at TEXT');
		if (!names.has('google_sub')) await db.execute('ALTER TABLE users ADD COLUMN google_sub TEXT');
		if (!names.has('country')) await db.execute("ALTER TABLE users ADD COLUMN country TEXT NOT NULL DEFAULT ''");
		if (!names.has('country_code')) await db.execute("ALTER TABLE users ADD COLUMN country_code TEXT NOT NULL DEFAULT ''");
		if (!names.has('approval_due_at')) await db.execute('ALTER TABLE users ADD COLUMN approval_due_at TEXT');
		await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users(google_sub) WHERE google_sub IS NOT NULL');

		const deletedColumns = new Set((await db.execute('PRAGMA table_info(deleted_users)')).rows.map((row) => String(row.name)));
		if (!deletedColumns.has('country')) await db.execute("ALTER TABLE deleted_users ADD COLUMN country TEXT NOT NULL DEFAULT ''");
		if (!deletedColumns.has('country_code')) await db.execute("ALTER TABLE deleted_users ADD COLUMN country_code TEXT NOT NULL DEFAULT ''");
		if (!deletedColumns.has('approval_due_at')) await db.execute('ALTER TABLE deleted_users ADD COLUMN approval_due_at TEXT');
		if (!deletedColumns.has('password_salt')) await db.execute('ALTER TABLE deleted_users ADD COLUMN password_salt TEXT');
		if (!deletedColumns.has('password_hash')) await db.execute('ALTER TABLE deleted_users ADD COLUMN password_hash TEXT');
		if (!deletedColumns.has('totp_secret')) await db.execute('ALTER TABLE deleted_users ADD COLUMN totp_secret TEXT');
		if (!deletedColumns.has('last_totp_step')) await db.execute('ALTER TABLE deleted_users ADD COLUMN last_totp_step INTEGER NOT NULL DEFAULT -1');
		if (!deletedColumns.has('failed_attempts')) await db.execute('ALTER TABLE deleted_users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0');
		if (!deletedColumns.has('locked_until')) await db.execute('ALTER TABLE deleted_users ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0');
		if (!deletedColumns.has('auth_version')) await db.execute('ALTER TABLE deleted_users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0');
		if (!deletedColumns.has('signature_public_key')) await db.execute('ALTER TABLE deleted_users ADD COLUMN signature_public_key TEXT');
		if (!deletedColumns.has('google_sub')) await db.execute('ALTER TABLE deleted_users ADD COLUMN google_sub TEXT');
	})().catch((error) => { schemaReady = null; throw error; });
	return schemaReady;
}

async function one(sql, args = []) {
	const result = await db.execute({ sql, args });
	if (isWrite(sql)) scheduleLocalBackup();
	return result.rows[0] || null;
}

async function all(sql, args = []) {
	const result = await db.execute({ sql, args });
	return result.rows;
}

async function run(sql, args = []) {
	const result = await db.execute({ sql, args });
	if (isWrite(sql)) scheduleLocalBackup();
	return result;
}

async function transaction(callback) {
	const tx = await db.transaction('write');
	try {
		const value = await callback({
			one: async (sql, args = []) => (await tx.execute({ sql, args })).rows[0] || null,
			all: async (sql, args = []) => (await tx.execute({ sql, args })).rows,
			run: async (sql, args = []) => tx.execute({ sql, args }),
		});
		await tx.commit();
		scheduleLocalBackup();
		return value;
	} catch (error) {
		await tx.rollback();
		throw error;
	}
}

function replaceFile(tempPath, destination) {
	const previous = `${destination}.previous`;
	let movedPrevious = false;
	try {
		fs.rmSync(previous, { force: true });
		if (fs.existsSync(destination)) {
			fs.renameSync(destination, previous);
			movedPrevious = true;
		}
		fs.renameSync(tempPath, destination);
		fs.rmSync(previous, { force: true });
		try { fs.chmodSync(destination, 0o600); } catch {}
	} catch (error) {
		if (movedPrevious && !fs.existsSync(destination)) {
			try { fs.renameSync(previous, destination); } catch {}
		}
		throw error;
	}
}

async function encryptLegacyBackups(directory, key) {
	for (const name of fs.readdirSync(directory)) {
		const databaseMatch = /^northstar-(\d{4}-\d{2}-\d{2})\.sqlite$/.exec(name);
		const pepperMatch = /^pepper-(\d{4}-\d{2}-\d{2})\.key$/.exec(name);
		const match = databaseMatch || pepperMatch;
		if (!match) continue;
		const date = match[1];
		const isDatabase = Boolean(databaseMatch);
		const source = path.join(directory, name);
		const destination = path.join(directory, isDatabase ? `northstar-${date}.sqlite.enc` : `pepper-${date}.key.enc`);
		const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
		if (!fs.existsSync(destination)) {
			await encryptFile(source, temporary, key, `${isDatabase ? 'database' : 'pepper'}:${date}`);
			replaceFile(temporary, destination);
		}
		fs.rmSync(source, { force: true });
	}
}

async function maintainLocalDailyBackup() {
	if (REMOTE) return;
	const backupDirectory = path.join(DATA_DIR, 'backups');
	fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
	const date = new Date().toISOString().slice(0, 10);
	const key = backupKey(DATA_DIR);
	await encryptLegacyBackups(backupDirectory, key);
	const destination = path.join(backupDirectory, `northstar-${date}.sqlite.enc`);
	const pepperPath = path.join(DATA_DIR, 'pepper.key');
	const pepperDestination = path.join(backupDirectory, `pepper-${date}.key.enc`);
	const suffix = `${process.pid}.${Date.now()}`;
	const temporary = path.join(backupDirectory, `northstar-${date}.${suffix}.sqlite`);
	const encryptedTemporary = `${destination}.${suffix}.tmp`;
	const encryptedPepperTemporary = `${pepperDestination}.${suffix}.tmp`;
	let source;
	try {
		source = new Database(DB_PATH, { readonly: true, fileMustExist: true });
		await source.backup(temporary);
		source.close();
		source = null;
		await encryptFile(temporary, encryptedTemporary, key, `database:${date}`);
		if (fs.existsSync(pepperPath)) {
			await encryptFile(pepperPath, encryptedPepperTemporary, key, `pepper:${date}`);
		}
		replaceFile(encryptedTemporary, destination);
		if (fs.existsSync(encryptedPepperTemporary)) replaceFile(encryptedPepperTemporary, pepperDestination);
	} catch (error) {
		try { source?.close(); } catch {}
		try { fs.rmSync(temporary, { force: true }); } catch {}
		try { fs.rmSync(encryptedTemporary, { force: true }); } catch {}
		try { fs.rmSync(encryptedPepperTemporary, { force: true }); } catch {}
		throw error;
	}
	fs.rmSync(temporary, { force: true });
	for (const name of fs.readdirSync(backupDirectory)) {
		const match = /^northstar-(\d{4}-\d{2}-\d{2})\.sqlite\.enc$/.exec(name);
		if (match && Date.now() - Date.parse(`${match[1]}T00:00:00Z`) > 7 * 86400000) {
			fs.rmSync(path.join(backupDirectory, name), { force: true });
			fs.rmSync(path.join(backupDirectory, `pepper-${match[1]}.key.enc`), { force: true });
		}
	}
}

function listBackups() {
	if (REMOTE) return [];
	const backupDirectory = path.join(DATA_DIR, 'backups');
	if (!fs.existsSync(backupDirectory)) return [];
	return fs.readdirSync(backupDirectory)
		.filter((name) => /^northstar-\d{4}-\d{2}-\d{2}\.sqlite\.enc$/.test(name))
		.map((name) => {
			const date = name.slice('northstar-'.length, 'northstar-'.length + 10);
			const stat = fs.statSync(path.join(backupDirectory, name));
			return { filename: name, date, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
		})
		.sort((a, b) => b.date.localeCompare(a.date));
}

module.exports = { db, DATA_DIR, DB_PATH, REMOTE, all, initializeDatabase, listBackups, maintainLocalDailyBackup, one, run, scheduleLocalBackup, startLocalBackupSchedule, transaction };
