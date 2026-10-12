'use strict';

const fs = require('node:fs');

function loadEnvFile(filePath) {
	let source;
	try { source = fs.readFileSync(filePath, 'utf8'); }
	catch (error) { if (error.code === 'ENOENT') return false; throw error; }

	for (const line of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const entry = line.trim();
		if (!entry || entry.startsWith('#')) continue;
		const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(entry);
		if (!match || process.env[match[1]] !== undefined) continue;
		let value = match[2].trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
			if (match[2].trim().startsWith('"')) value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
		} else {
			value = value.replace(/\s+#.*$/, '').trim();
		}
		process.env[match[1]] = value;
	}
	return true;
}

module.exports = { loadEnvFile };
