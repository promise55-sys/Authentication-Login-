'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
require('./lib/load-env').loadEnvFile(path.join(ROOT, '.env'));
const { handleApi } = require('./lib/handler');
const PORT = Number(process.env.PORT || 8001);
const DEVELOPMENT = process.env.NODE_ENV !== 'production';
const assets = new Map([
	['/index.html', ['index.html', 'text/html; charset=utf-8']],
	['/world.html', ['world.html', 'text/html; charset=utf-8']],
	['/style.css', ['style.css', 'text/css; charset=utf-8']],
	['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
	['/translations.js', ['translations.js', 'text/javascript; charset=utf-8']],
	['/mobile', [path.join('mobile', 'index.html'), 'text/html; charset=utf-8']],
	['/mobile/', [path.join('mobile', 'index.html'), 'text/html; charset=utf-8']],
	['/mobile/index.html', [path.join('mobile', 'index.html'), 'text/html; charset=utf-8']],
	['/mobile/style.css', [path.join('mobile', 'style.css'), 'text/css; charset=utf-8']],
	['/assets/musicians-world-profile.svg', [path.join('assets', 'musicians-world-profile.svg'), 'image/svg+xml; charset=utf-8']],
	['/assets/live-stage.mp4', [path.join('assets', 'live-stage.mp4'), 'video/mp4']],
	['/assets/live-stage-poster.jpg', [path.join('assets', 'live-stage-poster.jpg'), 'image/jpeg']],
]);

const liveReloadClients = new Set();
let liveReloadTimer = null;

function notifyLiveReload(filename) {
	if (liveReloadTimer) clearTimeout(liveReloadTimer);
	liveReloadTimer = setTimeout(() => {
		for (const client of liveReloadClients) client.write(`data: ${filename}\n\n`);
	}, 100);
}

if (DEVELOPMENT) {
	const watchedFiles = new Set(['index.html', 'world.html', 'style.css', 'app.js', 'translations.js']);
	fs.watch(ROOT, { persistent: false }, (_event, changedFile) => {
		const filename = changedFile && String(changedFile);
		if (watchedFiles.has(filename)) notifyLiveReload(filename);
	});
	fs.watch(path.join(ROOT, 'mobile'), { persistent: false }, (_event, changedFile) => {
		const filename = changedFile && String(changedFile);
		if (filename === 'index.html' || filename === 'style.css') notifyLiveReload(filename);
	});
}

function sendJson(res, status, message) {
	const body = JSON.stringify({ error: message });
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
	res.end(body);
}

const server = http.createServer((req, res) => {
	const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
	if (url.pathname === '/healthz' && (req.method === 'GET' || req.method === 'HEAD')) {
		const body = JSON.stringify({ status: 'ok' });
		res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
		res.end(req.method === 'HEAD' ? undefined : body);
		return;
	}
	if (url.pathname === '/__dev/live') {
		if (!DEVELOPMENT || req.method !== 'GET') { sendJson(res, 404, 'Not found.'); return; }
		res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
		res.write(': live reload connected\n\n');
		liveReloadClients.add(res);
		req.on('close', () => liveReloadClients.delete(res));
		return;
	}
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
		if (DEVELOPMENT && ['index.html', 'world.html', path.join('mobile', 'index.html')].includes(asset[0])) {
			const liveReloadScript = `<script>(()=>{const events=new EventSource('/__dev/live');events.onmessage=({data:file})=>{if(file==='style.css'){for(const link of document.querySelectorAll('link[rel="stylesheet"]')){const url=new URL(link.href);url.searchParams.set('__live',Date.now());link.href=url;}return;}window.location.reload();};})();</script>`;
			data = Buffer.from(data.toString('utf8').replace('</body>', `${liveReloadScript}</body>`));
		}
		const cacheControl = DEVELOPMENT ? 'no-store' : (['index.html', 'world.html', path.join('mobile', 'index.html')].includes(asset[0]) ? 'no-cache' : 'public, max-age=300');
		res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff' });
		res.end(req.method === 'HEAD' ? undefined : data);
	});
});

server.on('error', (error) => {
	if (error.code === 'EADDRINUSE') {
		console.log(`Den Promise Access is already running at http://127.0.0.1:${PORT}`);
		return;
	}
	console.error('Den Promise Access could not start:', error.message);
	process.exitCode = 1;
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Den Promise Access is running at http://127.0.0.1:${PORT}`);
	console.log('Use Ctrl+C to stop the development server.');
});
