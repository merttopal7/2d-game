// ─── server.ts — Bun static file server ──────────────────────────────────────
import { join } from 'path';

const PORT = 3002;
const ROOT = import.meta.dir; // directory of this file = project root

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.ts':   'application/javascript; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.map':  'application/json',
};

function getMime(path: string): string {
  const ext = path.match(/\.[^.]+$/)?.[0] ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;

    // Prevent directory traversal
    const filePath = join(ROOT, pathname.replace(/^\/+/, ''));

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response('404 Not Found', { status: 404 });
    }

    return new Response(file, {
      headers: {
        'Content-Type': getMime(filePath),
        'Cache-Control': 'no-cache',
      },
    });
  },
});

console.log(`\n🦻 HearCare Shop running at → http://localhost:${server.port}\n`);
console.log('   Press Ctrl+C to stop.\n');
