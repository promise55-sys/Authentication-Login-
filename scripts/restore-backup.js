'use strict';

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const { backupKey, decryptFile } = require('../lib/backup-crypto');

async function main() {
	const date = process.argv[2] || '';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Usage: node scripts/restore-backup.js YYYY-MM-DD [output-directory]');
	const dataDirectory = process.env.AUTH_DATA_DIR || path.join(process.env.LOCALAPPDATA || process.env.HOME || os.tmpdir(), 'NorthstarAccess');
	const backupDirectory = path.join(dataDirectory, 'backups');
	const key = backupKey(dataDirectory, { createIfMissing: false });
	const databaseBackup = path.join(backupDirectory, `northstar-${date}.sqlite.enc`);
	const pepperBackup = path.join(backupDirectory, `pepper-${date}.key.enc`);
	const outputDirectory = path.resolve(process.argv[3] || path.join(dataDirectory, `restored-${date}-${Date.now()}`));
	if (!fs.existsSync(databaseBackup)) throw new Error(`No encrypted database backup exists for ${date}.`);
	if (!fs.existsSync(pepperBackup) && !process.env.AUTH_PEPPER) throw new Error('This backup has no encrypted pepper key. Set the original AUTH_PEPPER before restoring.');
	if (!fs.existsSync(outputDirectory)) fs.mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
	if (fs.readdirSync(outputDirectory).length) throw new Error('The restore destination must be empty. No files were changed.');

	const databaseTemp = path.join(outputDirectory, 'northstar.sqlite.tmp');
	const pepperTemp = path.join(outputDirectory, 'pepper.key.tmp');
	try {
		await decryptFile(databaseBackup, databaseTemp, key, `database:${date}`);
		const restoredDatabase = new Database(databaseTemp, { readonly: true, fileMustExist: true });
		try {
			const check = restoredDatabase.pragma('quick_check', { simple: true });
			if (check !== 'ok') throw new Error('The decrypted database did not pass SQLite integrity validation.');
		} finally { restoredDatabase.close(); }
		fs.renameSync(databaseTemp, path.join(outputDirectory, 'northstar.sqlite'));

		if (fs.existsSync(pepperBackup)) {
			await decryptFile(pepperBackup, pepperTemp, key, `pepper:${date}`);
			fs.renameSync(pepperTemp, path.join(outputDirectory, 'pepper.key'));
		}
		console.log(`Backup restored to ${outputDirectory}. Point AUTH_DATA_DIR there to run this restored copy.`);
	} catch (error) {
		try { fs.rmSync(databaseTemp, { force: true }); } catch {}
		try { fs.rmSync(pepperTemp, { force: true }); } catch {}
		try { fs.rmSync(path.join(outputDirectory, 'northstar.sqlite'), { force: true }); } catch {}
		throw error;
	}
}

main().catch((error) => {
	console.error(`Restore stopped: ${error.message}`);
	process.exitCode = 1;
});

