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
// 设计目标：一屏尽览全部工具 + 数学艺术风格 + 双主题（dark 默认 / light）
// 主题切换机制：单一开关 <html data-theme="light"> 或无属性（dark）
// 所有颜色由 CSS 变量驱动；anti-flash 内联脚本在 <head> 最前面读取 localStorage 设置主题
const LAUNCHER_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>复变函数工具集 · 启动器</title>
<script>/* anti-flash: 在 paint 前恢复主题，支持 URL ?theme= 临时覆盖 */
(function(){try{var sp=new URLSearchParams(location.search);var t=sp.get('theme')||localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;try{localStorage.setItem('theme',t);}catch(e){}}}catch(e){}})();
</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
/* === 主题变量：dark 默认 === */
:root{
  --bg:#0f0f1e;--bg-grad-a:rgba(123,47,247,.13);--bg-grad-b:rgba(0,212,255,.11);
  --bg3:#16213e;--text:#e0e0e0;--text2:#8899aa;--border:#2a2a4a;
  --card-bg:rgba(22,33,62,0.55);--chip-bg:rgba(0,0,0,0.2);
  --title-color:#e0e0e0;--link:#00d4ff;--link-hover:#33ddff;
  --flo:.07;/* 漂浮符号基础 opacity 系数 */
}
/* === 主题变量：light === */
:root[data-theme="light"]{
  --bg:#eef2f6;--bg-grad-a:rgba(123,47,247,.07);--bg-grad-b:rgba(0,140,200,.06);
  --bg3:#dde4ed;--text:#1a1a2e;--text2:#5a6572;--border:#c4cbd4;
  --card-bg:rgba(255,255,255,0.85);--chip-bg:rgba(0,0,0,0.04);
  --title-color:#1a1a2e;--link:#0088cc;--link-hover:#006699;
  --flo:.045;
}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:radial-gradient(1100px 560px at 88% -12%,var(--bg-grad-a),transparent 62%),radial-gradient(1000px 540px at -8% 112%,var(--bg-grad-b),transparent 60%),radial-gradient(ellipse at top left,var(--bg3) 0%,var(--bg) 62%);color:var(--text);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px clamp(14px,3vw,36px);overflow-x:hidden;transition:background .4s ease,color .4s ease}
/* ---- 漂浮数学符号背景 ---- */
.math-bg{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0;transition:opacity .4s ease}
.math-bg span{position:absolute;font-family:Georgia,'Times New Roman',serif;font-style:italic;line-height:1;user-select:none;animation:floaty 16s ease-in-out infinite;transition:opacity .4s ease}
.math-bg span:nth-child(1){top:8%;left:5%;font-size:54px;color:#00d4ff;opacity:calc(var(--flo)*1.0)}
.math-bg span:nth-child(2){top:16%;right:8%;font-size:44px;color:#7b2ff7;opacity:calc(var(--flo)*1.3);animation-delay:-3s}
.math-bg span:nth-child(3){top:56%;left:3%;font-size:64px;color:#50fa7b;opacity:calc(var(--flo)*0.85);animation-delay:-6s}
.math-bg span:nth-child(4){bottom:10%;left:22%;font-size:40px;color:#ffb86c;opacity:calc(var(--flo)*1.15);animation-delay:-9s}
.math-bg span:nth-child(5){bottom:14%;right:5%;font-size:58px;color:#2dd4bf;opacity:calc(var(--flo)*1.15);animation-delay:-4.5s}
.math-bg span:nth-child(6){top:42%;right:2.5%;font-size:36px;color:#ff5eb0;opacity:calc(var(--flo)*1.15);animation-delay:-7.5s}
.math-bg span:nth-child(7){top:4%;left:40%;font-size:34px;color:var(--text);opacity:calc(var(--flo)*0.7);animation-delay:-11s}
.math-bg span:nth-child(8){bottom:4%;left:47%;font-size:46px;color:#00d4ff;opacity:calc(var(--flo)*0.85);animation-delay:-1.5s}
.math-bg span:nth-child(9){top:30%;left:13%;font-size:30px;color:var(--text);opacity:calc(var(--flo)*0.7);animation-delay:-5s}
.math-bg span:nth-child(10){top:68%;right:16%;font-size:32px;color:#7b2ff7;opacity:calc(var(--flo)*1.0);animation-delay:-12.5s}
@keyframes floaty{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-18px) rotate(4deg)}}
@media (prefers-reduced-motion:reduce){.math-bg span{animation:none}}
/* ---- 主题切换按钮 ---- */
.theme-toggle{position:fixed;top:16px;right:16px;z-index:100;width:40px;height:40px;border-radius:50%;border:1px solid var(--border);background:var(--card-bg);color:var(--text);backdrop-filter:blur(10px);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;transition:transform .2s ease,background .2s ease,border-color .2s ease}
.theme-toggle:hover{transform:rotate(20deg);border-color:var(--accent,var(--link))}
.theme-toggle .sun{display:none}
.theme-toggle .moon{display:block}
:root[data-theme="light"] .theme-toggle .sun{display:block}
:root[data-theme="light"] .theme-toggle .moon{display:none}
.container{position:relative;z-index:1;max-width:1420px;width:100%;display:flex;flex-direction:column;align-items:center;gap:24px;animation:fadeIn .55s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.header{text-align:center}
.header h1{font-size:clamp(28px,4.2vw,44px);font-weight:800;color:var(--title-color);letter-spacing:-0.02em;margin-bottom:8px;transition:color .4s ease}
.header .subtitle{font-size:13.5px;color:var(--text2);letter-spacing:0.02em;transition:color .4s ease}
.header .subtitle .sep{color:var(--border);margin:0 7px}
.header .formula{margin-top:9px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14.5px;color:var(--text2);letter-spacing:.06em;transition:color .4s ease}
.header .formula b{color:var(--link);font-weight:normal}
.header .formula .sep{color:var(--border);font-style:normal;margin:0 10px}
/* ---- 工具卡片 ---- */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(198px,1fr));gap:13px;width:100%}
.card{--c:var(--link);--cbg:rgba(0,212,255,0.10);--glow:rgba(0,212,255,0.16);position:relative;display:flex;flex-direction:column;padding:19px 17px 15px;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;text-decoration:none;color:inherit;cursor:pointer;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease,background .4s ease;backdrop-filter:blur(10px);overflow:hidden;animation:cardIn .5s ease-out backwards}
.card:nth-child(1){animation-delay:.04s}.card:nth-child(2){animation-delay:.11s}.card:nth-child(3){animation-delay:.18s}.card:nth-child(4){animation-delay:.25s}.card:nth-child(5){animation-delay:.32s}
@keyframes cardIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.card::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at top right,var(--cbg) 0%,transparent 55%);pointer-events:none;transition:opacity .25s ease;opacity:.5}
.card::after{content:'';position:absolute;top:0;left:12%;right:12%;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--c),transparent);opacity:.5;transition:opacity .25s ease}
.card:hover{transform:translateY(-5px);border-color:var(--c);box-shadow:0 10px 32px var(--glow)}
.card:hover::before{opacity:1}
.card:hover::after{opacity:1}
.card .icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:17px;color:var(--c);background:var(--cbg);border:1px solid var(--c);margin-bottom:12px}
.card h2{font-size:15.5px;font-weight:700;margin-bottom:5px;color:var(--text);line-height:1.3;transition:color .4s ease}
.card .tagline{font-size:12px;color:var(--c);margin-bottom:9px;font-family:'Consolas','Courier New',monospace}
.card .desc{font-size:12.5px;color:var(--text2);line-height:1.65;margin-bottom:11px;flex:1;transition:color .4s ease}
.card .features{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:11px}
.card .features span{font-size:10px;padding:2.5px 8px;border:1px solid var(--border);border-radius:10px;color:var(--text2);background:var(--chip-bg);transition:background .4s ease,border-color .4s ease,color .4s ease}
.card .open-btn{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--c);transition:gap .2s ease}
.card:hover .open-btn{gap:11px}
.card .open-btn .arrow{font-size:14px}
.card.fz{--c:#00d4ff;--cbg:rgba(0,212,255,0.10);--glow:rgba(0,212,255,0.16)}
.card.integral{--c:#ff5eb0;--cbg:rgba(123,47,247,0.12);--glow:rgba(123,47,247,0.20)}
.card.vectors{--c:#50fa7b;--cbg:rgba(80,250,123,0.10);--glow:rgba(80,250,123,0.16)}
.card.calc{--c:#ffb86c;--cbg:rgba(255,184,108,0.10);--glow:rgba(255,184,108,0.16)}
.card.expint{--c:#2dd4bf;--cbg:rgba(45,212,191,0.10);--glow:rgba(45,212,191,0.16)}
.footer{text-align:center;font-size:11.5px;color:var(--text2);opacity:0.65;line-height:1.7;transition:color .4s ease}
.footer a{color:var(--link);text-decoration:none}
.footer a:hover{text-decoration:underline;color:var(--link-hover)}
@media (max-width:700px){.cards{grid-template-columns:1fr 1fr}}
@media (max-width:440px){.cards{grid-template-columns:1fr}}
</style>
</head>
<body>
<button class="theme-toggle" id="themeToggle" aria-label="切换主题" title="切换黑夜 / 白天">
  <span class="moon">☾</span>
  <span class="sun">☀</span>
</button>
<div class="math-bg" aria-hidden="true">
  <span>∮</span><span>e<sup>iπ</sup></span><span>Σ</span><span>π</span><span>∞</span><span>∇</span><span>∂</span><span>∫</span><span>z̄</span><span>ω</span>
</div>
<div class="container">
  <div class="header">
    <h1>复变函数工具集</h1>
    <div class="subtitle">
      <span>双画板映射</span>
      <span class="sep">·</span>
      <span>路径积分</span>
      <span class="sep">·</span>
      <span>矢量运算</span>
      <span class="sep">·</span>
      <span>相位动画</span>
      <span class="sep">·</span>
      <span>指数积分</span>
      <span class="sep">·</span>
      <span>交互式探索</span>
    </div>
    <div class="formula">e<sup>iπ</sup> + 1 = 0<span class="sep">|</span>w = f(z)<span class="sep">|</span>∫<sub>C</sub> f(z) dz</div>
  </div>
  <div class="cards">
    <a class="card fz" href="./index.html">
      <div class="icon">f(z)</div>
      <h2>复变函数可视化计算器</h2>
      <div class="tagline">z → w = f(z)</div>
      <div class="desc">双画板实时展现复变函数几何映射：z 平面绘制轨迹，w 平面同步呈现。支持自定义函数编译与智能网格吸附。</div>
      <div class="features"><span>双画板同步</span><span>自定义函数</span><span>智能吸附</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
    <a class="card integral" href="./integral/index.html">
      <div class="icon">∮</div>
      <h2>复变函数积分计算器</h2>
      <div class="tagline">∫ f(z) dz</div>
      <div class="desc">在 z 平面绘制路径，w 平面实时展示 f(z)·dz 矢量首尾相加的积分过程，直观理解环路积分性质。</div>
      <div class="features"><span>路径积分</span><span>多线段对比</span><span>动画播放</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
    <a class="card vectors" href="./vectors/index.html">
      <div class="icon">↗</div>
      <h2>复平面矢量图</h2>
      <div class="tagline">z = a + bi</div>
      <div class="desc">复数以矢量呈现于复平面，拖拽头部至另一尾部即首尾相接，直观可视化复数加法，含四则运算与涂鸦。</div>
      <div class="features"><span>首尾相接</span><span>四则运算</span><span>涂鸦标注</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
    <a class="card calc" href="./complex-calculator/index.html">
      <div class="icon">↻</div>
      <h2>e^(iθ) 相位矢量动画</h2>
      <div class="tagline">f(θ) = Σ c·e^(iθ)</div>
      <div class="desc">θ 自动缓慢移动，每个 e^(...) 项对应一个首尾相接的旋转矢量，端点轨迹即函数图像，支持衰变螺旋。</div>
      <div class="features"><span>旋转矢量</span><span>衰变螺旋</span><span>循环播放</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
    <a class="card expint" href="./integral-exp/index.html">
      <div class="icon">∫</div>
      <h2>积分可视化计算器</h2>
      <div class="tagline">∫ e^(st) dt</div>
      <div class="desc">微元 dt 被 e^(st) 拉伸旋转成向量，首尾累加即得积分；调节 s=a+bi 得圆弧、螺旋与指数膨胀。</div>
      <div class="features"><span>e^(st) 累加</span><span>螺旋预设</span><span>动画播放</span></div>
      <div class="open-btn">打开工具<span class="arrow">→</span></div>
    </a>
  </div>
  <div class="footer">复变函数工具集 · 离线便携版 · 源码仓库：<a href="https://github.com/F-3-H/complex-functions">github.com/F-3-H/complex-functions</a></div>
</div>
<script>(function(){var b=document.getElementById('themeToggle');if(b){b.addEventListener('click',function(){var d=document.documentElement;var next=d.dataset.theme==='light'?'dark':'light';if(next==='dark')delete d.dataset.theme;else d.dataset.theme=next;try{localStorage.setItem('theme',next);}catch(e){}});}})();</script>
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

// 3c. 复制 complex-calculator/ 子项目
log('copying complex-calculator/ ...');
const calcDest = join(DIST, 'complex-calculator');
mkdirSync(calcDest, { recursive: true });
copyFileSync(join(PROJECT, 'complex-calculator', 'index.html'), join(calcDest, 'index.html'));
if (existsSync(join(PROJECT, 'complex-calculator', 'README.md'))) {
  copyFileSync(join(PROJECT, 'complex-calculator', 'README.md'), join(calcDest, 'README.md'));
}

// 3d. 复制 integral-exp/ 子项目
log('copying integral-exp/ ...');
const expDest = join(DIST, 'integral-exp');
mkdirSync(expDest, { recursive: true });
copyFileSync(join(PROJECT, 'integral-exp', 'index.html'), join(expDest, 'index.html'));
if (existsSync(join(PROJECT, 'integral-exp', 'README.md'))) {
  copyFileSync(join(PROJECT, 'integral-exp', 'README.md'), join(expDest, 'README.md'));
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
