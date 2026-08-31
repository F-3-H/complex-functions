// 生产静态服务器：托管 dist 构建产物，SPA fallback，固定端口 5174。
// 由 scripts/serve.mjs 以 detached 后台进程方式启动，开机自启。
// 零依赖，仅用 Node 内置模块。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 5174);
const HOST = process.env.HOST || '0.0.0.0';
// 基于本文件定位 dist，避免依赖启动时的工作目录
const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

function send(res, code, body, type, extra = {}) {
  res.writeHead(code, { 'Content-Type': type, ...extra });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return send(res, 400, 'Bad Request', 'text/plain');
    }

    // 路径穿越防护：规范化后必须落在 DIST 内（relative 为空表示根路径本身）
    const filePath = resolve(DIST, '.' + pathname);
    const rel = relative(DIST, filePath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      return send(res, 403, 'Forbidden', 'text/plain');
    }

    let target = filePath;
    try {
      const st = await stat(target);
      if (st.isDirectory()) target = resolve(target, 'index.html');
    } catch {
      target = null;
    }

    if (target) {
      try {
        const data = await readFile(target);
        const isHtml = extname(target) === '.html';
        return send(res, 200, data, MIME[extname(target)] || 'application/octet-stream', {
          // 带 hash 的资源长缓存；入口 html 不缓存，避免更新后仍显示旧版
          'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
        });
      } catch {
        target = null;
      }
    }

    // SPA fallback：路由请求（非 /assets 且无扩展名）回 index.html
    const looksAsset = pathname.startsWith('/assets/') || extname(pathname) !== '';
    if (!looksAsset) {
      try {
        const data = await readFile(resolve(DIST, 'index.html'));
        return send(res, 200, data, MIME['.html'], { 'Cache-Control': 'no-cache' });
      } catch {
        return send(
          res,
          500,
          'dist/index.html missing. Run: npm run serve:install',
          'text/plain'
        );
      }
    }
    return send(res, 404, 'Not Found', 'text/plain');
  } catch {
    return send(res, 500, 'Internal Server Error', 'text/plain');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[static-server] http://localhost:${PORT}/  serving ${DIST}`);
});
