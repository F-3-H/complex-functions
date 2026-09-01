// 便携 zip 打包脚本
// 用法：npm run build:portable
// 流程：构建主项目 → 复制 integral/ → 写启动页 → 写启动器 → 打包 zip
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(SCRIPTS, '..');
const DIST = join(PROJECT, 'dist');
const ZIP_PATH = join(PROJECT, 'complex-tools-portable.zip');

function log(msg) { console.log(`[portable] ${msg}`); }

// ============ 启动页 HTML ============
const LAUNCHER_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>复变函数工具集 · 启动器</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0f0f1e;--bg2:#1a1a2e;--bg3:#16213e;--accent:#00d4ff;--accent2:#7b2ff7;--accent3:#ff5eb0;--text:#e0e0e0;--text2:#8899aa;--border:#2a2a4a;--card-bg:rgba(22,33,62,0.6)}
html,body{height:100%}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:radial-gradient(ellipse at top left,var(--bg3) 0%,var(--bg) 60%);color:var(--text);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;overflow-x:hidden}
.container{max-width:960px;width:100%;display:flex;flex-direction:column;align-items:center;gap:48px;animation:fadeIn .6s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.header{text-align:center}
.header h1{font-size:clamp(32px,5vw,52px);font-weight:800;background:linear-gradient(135deg,var(--accent) 0%,var(--accent2) 50%,var(--accent3) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-0.02em;margin-bottom:10px}
.header .subtitle{font-size:15px;color:var(--text2);letter-spacing:0.02em}
.header .subtitle .sep{color:var(--border);margin:0 8px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;width:100%}
.card{position:relative;display:block;padding:32px 28px;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;text-decoration:none;color:inherit;cursor:pointer;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease;backdrop-filter:blur(10px);overflow:hidden}
.card::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at top right,rgba(0,212,255,0.08) 0%,transparent 50%);pointer-events:none;transition:opacity .25s ease;opacity:0.6}
.card:hover{transform:translateY(-6px);border-color:var(--accent);box-shadow:0 12px 40px rgba(0,212,255,0.15)}
.card:hover::before{opacity:1}
.card .icon{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:14px;font-size:28px;margin-bottom:20px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent2) 100%);color:#fff;font-weight:bold;box-shadow:0 4px 16px rgba(0,212,255,0.25)}
.card.integral .icon{background:linear-gradient(135deg,var(--accent2) 0%,var(--accent3) 100%);box-shadow:0 4px 16px rgba(123,47,247,0.25)}
.card.vectors .icon{background:linear-gradient(135deg,#50fa7b 0%,var(--accent) 100%);box-shadow:0 4px 16px rgba(80,250,123,0.25)}
.card h2{font-size:20px;font-weight:700;margin-bottom:8px;color:var(--text)}
.card .tagline{font-size:13px;color:var(--accent);margin-bottom:14px;font-family:'Consolas','Courier New',monospace}
.card.integral .tagline{color:var(--accent3)}
.card.vectors .tagline{color:#50fa7b}
.card .desc{font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:20px}
.card .features{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.card .features span{font-size:11px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;color:var(--text2);background:rgba(0,0,0,0.2)}
.card .open-btn{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--accent);transition:gap .2s ease}
.card.integral .open-btn{color:var(--accent3)}
.card.vectors .open-btn{color:#50fa7b}
.card:hover .open-btn{gap:12px}
.card .open-btn .arrow{font-size:16px}
.footer{text-align:center;font-size:12px;color:var(--text2);opacity:0.7;line-height:1.8}
.footer a{color:var(--accent);text-decoration:none}
.footer a:hover{text-decoration:underline}
@media (max-width:600px){.cards{grid-template-columns:1fr}.card{padding:24px 20px}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>复变函数工具集</h1>
    <div class="subtitle">
      <span>双画板映射</span>
      <span class="sep">·</span>
      <span>积分可视化</span>
      <span class="sep">·</span>
      <span>矢量运算</span>
      <span class="sep">·</span>
      <span>交互式探索</span>
    </div>
  </div>
  <div class="cards">
    <a class="card" href="./index.html">
      <div class="icon">f(z)</div>
      <h2>复变函数可视化计算器</h2>
      <div class="tagline">z → w = f(z)</div>
      <div class="desc">通过双画板实时展现复变函数的几何映射。在 z 平面绘制轨迹，w 平面同步呈现因变量的变化。支持自定义函数编译、智能网格吸附、超大范围缩放。</div>
      <div class="features"><span>双画板同步</span><span>自定义函数</span><span>14级智能吸附</span><span>1~5000倍缩放</span><span>预览实时同步</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
    <a class="card integral" href="./integral/index.html">
      <div class="icon">∮</div>
      <h2>复变函数积分计算器</h2>
      <div class="tagline">∫ f(z) dz</div>
      <div class="desc">在 z 平面绘制路径，w 平面实时展示 f(z)·dz 矢量首尾相加的积分过程。支持多线段对比、动画播放，直观理解复变函数的环路积分性质。</div>
      <div class="features"><span>积分矢量可视化</span><span>多种绘图工具</span><span>多线段对比</span><span>动画播放</span><span>网格吸附</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
    <a class="card vectors" href="./vectors/index.html">
      <div class="icon">↗</div>
      <h2>复平面矢量图</h2>
      <div class="tagline">z = a + bi</div>
      <div class="desc">在复平面上以矢量形式呈现复数，将一个矢量头部拖至另一矢量尾部即可首尾相接，直观可视化复数加法。内置四则运算、模与辐角显示、涂鸦标注与单位根预设。</div>
      <div class="features"><span>矢量首尾相接</span><span>拖拽吸附</span><span>复数四则运算</span><span>模与辐角</span><span>涂鸦标注</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
  </div>
  <div class="footer">复变函数工具集 · 离线便携版<br>源码仓库：<a href="https://github.com/F-3-H/complex-functions">github.com/F-3-H/complex-functions</a></div>
</div>
</body>
</html>`;

// ============ start.bat ============
const START_BAT = `@echo off
title Complex Function Tools
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto no_node

echo.
echo ============================================
echo   Complex Function Tools - Starting...
echo ============================================
echo.

node start.js
goto end

:no_node
echo [X] Node.js not found
echo.
echo   This tool requires Node.js to run.
echo   Please install Node.js first (free):
echo.
echo     https://nodejs.org
echo.
echo   Download LTS, install, then run start.bat again.
echo.
pause

:end
`;

// ============ start.js ============
const START_JS = `// Minimal Node.js static HTTP server (zero deps)
// Usage: node start.js  -- finds free port + opens browser
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
};

function findFreePort(start = 5180, end = 5250) {
  return new Promise((resolve) => {
    let port = start;
    function tryPort() {
      const srv = http.createServer();
      srv.once('error', () => {
        port++;
        if (port <= end) tryPort();
        else resolve(-1);
      });
      srv.once('listening', () => {
        srv.close(() => resolve(port));
      });
      srv.listen(port, HOST);
    }
    tryPort();
  });
}

async function main() {
  const port = await findFreePort();
  if (port === -1) {
    console.error('No free port found (5180-5250)');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/launcher.html';
    if (urlPath.includes('..')) { res.writeHead(403); res.end('Forbidden'); return; }

    let filePath = path.join(ROOT, urlPath);
    try { const stat = fs.statSync(filePath); if (stat.isDirectory()) filePath = path.join(filePath, 'index.html'); } catch {}
    if (!fs.existsSync(filePath)) filePath = path.join(ROOT, 'launcher.html');

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    try {
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404); res.end('Not Found');
    }
  });

  server.listen(port, HOST, () => {
    const url = 'http://' + HOST + ':' + port + '/launcher.html';
    console.log('');
    console.log('============================================');
    console.log('  Complex Function Tools - Server Running');
    console.log('============================================');
    console.log('  URL: ' + url);
    console.log('  Close this window to stop.');
    console.log('');
    try {
      const cmd = process.platform === 'win32'
        ? 'start "" "' + url + '"'
        : process.platform === 'darwin' ? 'open "' + url + '"' : 'xdg-open "' + url + '"';
      execSync(cmd, { stdio: 'ignore' });
    } catch {}
  });

  process.on('SIGINT', () => { console.log('\\nServer stopped.'); process.exit(0); });
}

main();
`;

// ============ 主流程 ============

// 1. 清理旧产物
log('cleaning old dist...');
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });

// 2. 构建主项目
log('building main project...');
execSync('npm run build', { cwd: PROJECT, stdio: 'inherit' });

// 3. 复制 integral/ 子项目
log('copying integral/ ...');
const integralDest = join(DIST, 'integral');
mkdirSync(integralDest, { recursive: true });
copyFileSync(join(PROJECT, 'integral', 'index.html'), join(integralDest, 'index.html'));
if (existsSync(join(PROJECT, 'integral', 'README.md'))) {
  copyFileSync(join(PROJECT, 'integral', 'README.md'), join(integralDest, 'README.md'));
}

// 3b. 复制 vectors/ 子项目
log('copying vectors/ ...');
const vectorsDest = join(DIST, 'vectors');
mkdirSync(vectorsDest, { recursive: true });
copyFileSync(join(PROJECT, 'vectors', 'index.html'), join(vectorsDest, 'index.html'));
if (existsSync(join(PROJECT, 'vectors', 'README.md'))) {
  copyFileSync(join(PROJECT, 'vectors', 'README.md'), join(vectorsDest, 'README.md'));
}

// 4. 写启动页
log('writing launcher.html...');
writeFileSync(join(DIST, 'launcher.html'), LAUNCHER_HTML, 'utf8');

// 5. 写启动器脚本（便携版核心）
log('writing start.bat + start.js...');
// start.bat 用 ASCII 编码（全英文内容）
writeFileSync(join(DIST, 'start.bat'), START_BAT, 'ascii');
writeFileSync(join(DIST, 'start.js'), START_JS, 'utf8');

// 6. 统计文件
function walkDir(dir, base = '') {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = statSync(full);
    if (st.isDirectory()) files.push(...walkDir(full, rel));
    else files.push({ path: rel, size: st.size });
  }
  return files;
}
const allFiles = walkDir(DIST);
const totalSize = allFiles.reduce((s, f) => s + f.size, 0);
log(`dist contains ${allFiles.length} files, ${(totalSize/1024).toFixed(1)} KB total`);
for (const f of allFiles) console.log(`  ${f.path}  (${(f.size/1024).toFixed(1)} KB)`);

// 7. 打包 zip（PowerShell Compress-Archive，排除 .map）
// 注意：用临时 .ps1 文件执行，避免 -Command 内联字符串在含中文/反斜杠路径上的转义问题
log('creating zip...');
if (existsSync(ZIP_PATH)) rmSync(ZIP_PATH, { force: true });

const psScript = `
$ErrorActionPreference = 'Stop'
$src = '${DIST.replace(/'/g, "''")}'
$dst = '${ZIP_PATH.replace(/'/g, "''")}'
$tempDir = Join-Path $env:TEMP "complex-pack-$(Get-Random)"
New-Item -Path $tempDir -ItemType Directory -Force | Out-Null
Get-ChildItem -LiteralPath $src -Recurse -File | Where-Object { $_.Extension -ne '.map' } | ForEach-Object {
  $rel = $_.FullName.Substring($src.Length + 1)
  $dest = Join-Path $tempDir $rel
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) { New-Item -Path $destDir -ItemType Directory -Force | Out-Null }
  Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
}
Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $dst -Force
Remove-Item $tempDir -Recurse -Force
`;
const psFile = join(PROJECT, 'scripts', '_zip-pack.ps1');
// 写入 UTF-8 BOM，避免 Windows PowerShell 5.1 以 ANSI(GBK) 误读中文路径
writeFileSync(psFile, '\uFEFF' + psScript, 'utf8');
try {
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { stdio: 'inherit' });
} finally {
  if (existsSync(psFile)) rmSync(psFile, { force: true });
}

const zipStat = statSync(ZIP_PATH);
log(`zip created: ${ZIP_PATH}`);
log(`size: ${(zipStat.size/1024).toFixed(1)} KB`);
log('done!');
