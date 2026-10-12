'use strict';

const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const store = require('../lib/database');

async function main() {
	if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env.local first.');
	const dataDirectory = process.env.AUTH_DATA_DIR || path.join(process.env.LOCALAPPDATA || process.env.HOME || os.tmpdir(), 'NorthstarAccess');
	const sourcePath = process.env.SOURCE_SQLITE_PATH || path.join(dataDirectory, 'northstar.sqlite');
	const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
	try {
		await store.initializeDatabase();
		const existing = await store.one('SELECT COUNT(*) AS count FROM users');
		if (Number(existing.count) !== 0) throw new Error('The Turso database is not empty. Migration stopped without overwriting accounts.');
		const users = source.prepare('SELECT * FROM users ORDER BY id').all();
		const transaction = await store.db.transaction('write');
		try {
			for (const user of users) {
				await transaction.execute({
					sql: `INSERT INTO users (id, username, full_name, role, password_salt, password_hash,
						totp_secret, last_totp_step, failed_attempts, locked_until, auth_version,
						signature_public_key, email, approval_status, approved_at, created_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
					args: [
						user.id, user.username, user.full_name, user.role, user.password_salt, user.password_hash,
						user.totp_secret ?? null, user.last_totp_step ?? -1, user.failed_attempts ?? 0,
						user.locked_until ?? 0, user.auth_version ?? 0, user.signature_public_key ?? null,
						user.email ?? null, user.approval_status ?? 'approved', user.approved_at ?? null, user.created_at ?? null,
					],
				});
			}
			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
		console.log(`Migrated ${users.length} account records. Password hashes and signing public keys were copied as stored.`);
	} finally {
		source.close();
	}
}

main().catch((error) => {
	console.error(`Migration stopped: ${error.message}`);
	process.exitCode = 1;
});

