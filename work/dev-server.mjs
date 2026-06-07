import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from '../novel-browser/src/server/readnovelfull.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..', 'novel-browser');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');

  if (requestUrl.pathname.startsWith('/api/')) {
    try {
      const result = await handleApiRequest(requestUrl.pathname, requestUrl.searchParams);
      sendJson(res, result.status, result.payload);
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Request failed' });
    }
    return;
  }

  const urlPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const safePath = path.normalize(urlPath).replace(/^([.][.][\\/])+/, '');
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload));
}

const port = Number(process.env.PORT || 4200);

server.listen(port, '127.0.0.1', () => {
  console.log(`Novel browser preview at http://127.0.0.1:${port}`);
});
