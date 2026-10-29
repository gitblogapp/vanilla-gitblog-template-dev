import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvFile } from './lib/env.mjs';
import { pagesBase } from './lib/site-config.mjs';
loadEnvFile('.env.production');
const base = pagesBase(process.env);
const root = path.resolve('build');
const args = process.argv.slice(2);
const flag = (key, fallback) => {
  const index = args.indexOf(key);
  return index < 0 ? fallback : args[index + 1];
};
const host = flag('--host', '127.0.0.1');
const port = Number(flag('--port', '4173'));
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};
const server = createServer(async (request, response) => {
  const send = (status, body = '', headers = {}) => {
    response.writeHead(status, headers);
    response.end(body);
  };
  if (!['GET', 'HEAD'].includes(request.method))
    return send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  let url, pathname;
  try {
    url = new URL(request.url || '/', 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return send(400, 'Invalid URL');
  }
  if (base && (pathname === '/' || pathname === base))
    return send(307, '', { Location: `${base}/${url.search}` });
  if (base && !pathname.startsWith(`${base}/`)) return send(404, 'Not found');
  let file = path.resolve(root, pathname.slice(base.length).replace(/^\/+/, ''));
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) return send(403, 'Forbidden');
  try {
    const info = await stat(file);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/'))
        return send(307, '', { Location: `${url.pathname}/${url.search}` });
      file = path.join(file, 'index.html');
    } else if (!info.isFile()) return send(404, 'Not found');
    const body = request.method === 'HEAD' ? null : await readFile(file);
    return send(200, body, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
  } catch (error) {
    return send(
      error.code === 'ENOENT' ? 404 : 500,
      error.code === 'ENOENT' ? 'Not found' : 'Read failed',
    );
  }
});
server.listen(port, host, () =>
  console.log(`Serving build/ at http://${host}:${server.address().port}${base}/`),
);
