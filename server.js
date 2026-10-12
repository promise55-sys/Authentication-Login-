'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
require('./lib/load-env').loadEnvFile(path.join(ROOT, '.env'));
const { handleApi } = require('./lib/handler');
const PORT = Number(process.env.PORT || 8000);
const assets = new Map([
	['/index.html', ['index.html', 'text/html; charset=utf-8']],
	['/style.css', ['style.css', 'text/css; charset=utf-8']],
	['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

function sendJson(res, status, message) {
	const body = JSON.stringify({ error: message });
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
	res.end(body);
}

const server = http.createServer((req, res) => {
	const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
	if (url.pathname === '/api' || url.pathname === '/api/') {
		void handleApi(req, res);
		return;
	}
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		sendJson(res, 405, 'Method not allowed.');
		return;
	}
	let pathname;
	try { pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname); }
	catch { sendJson(res, 400, 'Invalid path.'); return; }
	const asset = assets.get(pathname);
	if (!asset) { sendJson(res, 404, 'Not found.'); return; }
	fs.readFile(path.join(ROOT, asset[0]), (error, data) => {
		if (error) { sendJson(res, 404, 'Not found.'); return; }
		res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': asset[0] === 'index.html' ? 'no-cache' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
		res.end(req.method === 'HEAD' ? undefined : data);
	});
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Den Promise Access is running at http://127.0.0.1:${PORT}`);
	console.log('Use Ctrl+C to stop the development server.');
});



