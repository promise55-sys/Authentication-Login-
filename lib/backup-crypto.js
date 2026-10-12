'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const { pipeline } = require('node:stream/promises');

const MAGIC = Buffer.from('NPBACK01');
const HEADER_BYTES = MAGIC.length + 12;
const TAG_BYTES = 16;

function backupKey(dataDirectory, { createIfMissing = true } = {}) {
	const configured = process.env.BACKUP_ENCRYPTION_KEY;
	if (configured) {
		let key;
		if (/^[a-f0-9]{64}$/i.test(configured)) key = Buffer.from(configured, 'hex');
		else if (/^[A-Za-z0-9_-]{43}$/.test(configured)) key = Buffer.from(configured, 'base64url');
		if (!key || key.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY must be a 32-byte key encoded as 64 hex or 43 base64url characters.');
		return key;
	}

	const keyPath = require('node:path').join(dataDirectory, 'backup.key');
	if (!fs.existsSync(keyPath) && !createIfMissing) throw new Error('The local backup.key file is missing. Restore it from your secure key copy or set BACKUP_ENCRYPTION_KEY.');
	if (createIfMissing) {
		try {
			fs.writeFileSync(keyPath, crypto.randomBytes(32), { flag: 'wx', mode: 0o600 });
		} catch (error) {
			if (error.code !== 'EEXIST') throw error;
		}
	}
	const key = fs.readFileSync(keyPath);
	if (key.length !== 32) throw new Error('The local backup key is invalid; preserve a valid 32-byte backup.key file or set BACKUP_ENCRYPTION_KEY.');
	try { fs.chmodSync(keyPath, 0o600); } catch {}
	return key;
}

async function encryptFile(sourcePath, destinationPath, key, context) {
	const nonce = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
	cipher.setAAD(Buffer.from(context, 'utf8'));
	const output = fs.createWriteStream(destinationPath, { flags: 'wx', mode: 0o600 });
	try {
		output.write(Buffer.concat([MAGIC, nonce]));
		await pipeline(fs.createReadStream(sourcePath), cipher, output);
		fs.appendFileSync(destinationPath, cipher.getAuthTag());
	} catch (error) {
		try { output.destroy(); } catch {}
		try { fs.rmSync(destinationPath, { force: true }); } catch {}
		throw error;
	}
}

async function decryptFile(sourcePath, destinationPath, key, context) {
	const fd = fs.openSync(sourcePath, 'r');
	try {
		const stat = fs.fstatSync(fd);
		if (stat.size < HEADER_BYTES + TAG_BYTES) throw new Error('Encrypted backup file is too short.');
		const header = Buffer.alloc(HEADER_BYTES);
		const tag = Buffer.alloc(TAG_BYTES);
		fs.readSync(fd, header, 0, HEADER_BYTES, 0);
		fs.readSync(fd, tag, 0, TAG_BYTES, stat.size - TAG_BYTES);
		if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Unsupported encrypted backup format.');
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
		decipher.setAAD(Buffer.from(context, 'utf8'));
		decipher.setAuthTag(tag);
		const output = fs.createWriteStream(destinationPath, { flags: 'wx', mode: 0o600 });
		try {
			await pipeline(fs.createReadStream(sourcePath, { start: HEADER_BYTES, end: stat.size - TAG_BYTES - 1 }), decipher, output);
		} catch (error) {
			try { output.destroy(); } catch {}
			try { fs.rmSync(destinationPath, { force: true }); } catch {}
			throw new Error('Backup authentication failed. The file, key, or backup date may be incorrect.', { cause: error });
		}
	} finally {
		fs.closeSync(fd);
	}
}

module.exports = { backupKey, decryptFile, encryptFile };
