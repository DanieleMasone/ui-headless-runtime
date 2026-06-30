import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { basePath, root } from './shared.mjs';

const site = resolve(root, 'site-dist');
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (!url.pathname.startsWith(basePath)) {
      response.writeHead(302, { location: basePath });
      response.end();
      return;
    }
    const relative = decodeURIComponent(url.pathname.slice(basePath.length)).replace(
      /^\/+|\\/gu,
      '',
    );
    let file = resolve(site, relative || 'index.html');
    if (file !== site && !file.startsWith(`${site}${sep}`))
      throw new Error('Path traversal rejected.');
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      await access(file);
    } catch {
      file = resolve(site, '404.html');
    }
    response.writeHead(200, {
      'content-type': types.get(extname(file)) ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Server error');
  }
});

server.listen(4173, '127.0.0.1', () =>
  console.log(`Serving ${site} at http://127.0.0.1:4173${basePath}`),
);
