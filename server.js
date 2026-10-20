const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.mjs', '.wasm', '.json', '.css', '.svg', '.otf', '.ttf']);

const server = http.createServer((req, res) => {
  try {
    let cleanUrl = req.url.split('?')[0];
    let reqPath = decodeURIComponent(cleanUrl);

    // Support both root "/" and GitHub Pages base-href "/portfolio/"
    if (reqPath.startsWith('/portfolio')) {
      reqPath = reqPath.slice('/portfolio'.length);
    }
    if (!reqPath || reqPath === '/') {
      reqPath = '/index.html';
    }

    let filePath = path.join(ROOT, reqPath);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      // If file doesn't exist, fallback to index.html for SPA routing
      if (err || !stats.isFile()) {
        filePath = path.join(ROOT, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      if (ext === '.html' || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }

      const stream = fs.createReadStream(filePath);
      stream.on('error', (streamErr) => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end('500 Server Error: ' + streamErr.message);
      });

      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (COMPRESSIBLE_EXTS.has(ext) && acceptEncoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.writeHead(200);
        stream.pipe(zlib.createGzip()).pipe(res);
      } else {
        res.writeHead(200);
        stream.pipe(res);
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('500 Server Error: ' + err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`====================================================`);
  console.log(`Flutter Web Portfolio High-Speed Server (Gzip enabled)`);
  console.log(`URL (Root):          http://localhost:${PORT}/`);
  console.log(`URL (GitHub Pages):  http://localhost:${PORT}/portfolio/`);
  console.log(`====================================================`);
});
