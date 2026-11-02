'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const bcrypt = require('bcryptjs');

const ROOT = path.join(__dirname, '..');
require('../lib/load-env').loadEnvFile(path.join(ROOT, '.env'));
const store = require('../lib/database');

function readHidden(prompt) {
	return new Promise((resolve, reject) => {
		const input = process.stdin;
		if (!input.isTTY || typeof input.setRawMode !== 'function') {
			reject(new Error('Run this command in an interactive PowerShell or terminal window.'));
			return;
		}
		let value = '';
		const finish = (error) => {
			input.removeListener('data', onData);
			input.setRawMode(false);
			input.pause();
			process.stdout.write('\n');
			if (error) reject(error);
			else resolve(value);
		};
		const onData = (buffer) => {
			for (const character of buffer.toString('utf8')) {
				if (character === '\u0003') { finish(new Error('Cancelled.')); return; }
				if (character === '\r' || character === '\n') { finish(); return; }
				if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
				else if (character >= ' ' && character !== '\u007f') value += character;
			}
		};
		process.stdout.write(prompt);
		input.setRawMode(true);
		input.resume();
		input.on('data', onData);
	});
}

async function main() {
	if (store.REMOTE) throw new Error('This recovery command works only with local SQLite. It will not modify a hosted database.');
	const authPepper = process.env.AUTH_PEPPER;
	const pepperPath = path.join(store.DATA_DIR, 'pepper.key');
	if (!authPepper && !fs.existsSync(pepperPath)) {
		throw new Error('The password pepper for this database is missing. Restart this command from the same terminal/environment used to run the app; do not generate a replacement pepper.');
	}
	const pepper = authPepper ? `*${authPepper}*` : fs.readFileSync(pepperPath, 'utf8');
	if (Buffer.byteLength(pepper) < 32) throw new Error('The configured password pepper is invalid.');

	const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
	const username = (await new Promise((resolve) => prompt.question('Account username: ', resolve))).trim();
	prompt.close();
	if (!username) throw new Error('Enter the account username.');

	const db = new (require('better-sqlite3'))(store.DB_PATH);
	try {
		const account = db.prepare('SELECT id, username, password_salt FROM users WHERE username = ? COLLATE NOCASE').get(username);
		if (!account) throw new Error('No matching account was found in the selected local database.');
		const password = await readHidden('New password (12 characters minimum): ');
		const confirmation = await readHidden('Repeat new password: ');
		if (password !== confirmation) throw new Error('The passwords did not match. No account changes were made.');
		if (Buffer.byteLength(password) < 12 || Buffer.byteLength(password) > 1024) throw new Error('Use a password between 12 and 1024 bytes. No account changes were made.');
		const hashInput = crypto.createHmac('sha256', pepper).update(`${password}#${account.password_salt}`, 'utf8').digest('hex');
		const passwordHash = bcrypt.hashSync(hashInput, 12);
		db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = 0 WHERE id = ?').run(passwordHash, account.id);
		console.log(`Password reset for ${account.username}. Sign in with the new password.`);
	} finally {
		db.close();
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
