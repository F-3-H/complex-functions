// 常驻服务管理：install / start / stop / status / uninstall / rebuild
//  - install   : 全新构建 + 注册开机自启(启动文件夹 vbs) + 启动生产服务
//  - start     : 仅启动生产服务（后台常驻，日志写 server.log）
//  - stop      : 停止生产服务
//  - status    : 查询服务状态
//  - uninstall : 移除开机自启并停止服务
//  - rebuild   : 停止 -> 重新构建 -> 启动（日常更新代码后使用）
// 生产服务固定端口 5174，与开发 dev(5173) 互不冲突。
import { execSync, spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

process.env.NODE_NO_WARNINGS = '1';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(SCRIPTS, '..');
const SERVER_JS = join(PROJECT, 'server', 'static-server.mjs');
const LOG_FILE = join(PROJECT, 'server.log');
const PORT = 5174;
const VBS_NAME = 'complex-calc-server.vbs';

const cmd = process.argv[2];

function startupDir() {
  return join(
    process.env.APPDATA || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup'
  );
}
function vbsPath() {
  return join(startupDir(), VBS_NAME);
}

function pidOnPort(port) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    const first = out.split(/\s+/)[0];
    return first ? parseInt(first, 10) : null;
  } catch {
    return null;
  }
}

function isUp(port) {
  return pidOnPort(port) != null;
}

async function waitUp(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isUp(port)) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return isUp(port);
}

function runBuild() {
  console.log('[serve] building...');
  execSync('npm run build', { cwd: PROJECT, stdio: 'inherit' });
}

async function startServer() {
  const pid = pidOnPort(PORT);
  if (pid) {
    console.log(`[serve] already running on http://localhost:${PORT}/ (pid ${pid})`);
    return true;
  }
  // 以脱离会话的后台进程启动，日志写入 server.log
  const logFd = openSync(LOG_FILE, 'a');
  const child = spawn(process.execPath, [SERVER_JS], {
    cwd: PROJECT,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  const ok = await waitUp(PORT, 6000);
  console.log(
    ok
      ? `[serve] started -> http://localhost:${PORT}/`
      : `[serve] FAILED to start (see ${LOG_FILE})`
  );
  return ok;
}

function stopServer() {
  const pid = pidOnPort(PORT);
  if (!pid) {
    console.log('[serve] not running');
    return;
  }
  try {
    execSync(
      `powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`,
      { stdio: 'ignore' }
    );
    console.log('[serve] stopped');
  } catch {
    console.log('[serve] failed to stop pid ' + pid);
  }
}

async function checkStatus() {
  const pid = pidOnPort(PORT);
  if (!(await waitUp(PORT, 1000))) {
    console.log(`[serve] DOWN (port ${PORT} not listening)`);
    return false;
  }
  const code = await new Promise((resolve) => {
    const req = http.get(
      { host: 'localhost', port: PORT, path: '/', timeout: 2500 },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
  console.log(
    `[serve] UP  pid=${pid}  http://localhost:${PORT}/  HTTP=${code ?? 'no response'}`
  );
  return code === 200;
}

function registerAutostart() {
  const nodePath = process.execPath;
  const vbs =
    'Set ws = CreateObject("WScript.Shell")\r\n' +
    `ws.Run """${nodePath}"" ""${SERVER_JS}""", 0, False\r\n`;
  writeFileSync(vbsPath(), vbs, 'utf8');
  console.log('[serve] autostart registered -> ' + vbsPath());
}

async function install() {
  runBuild();
  registerAutostart();
  await startServer();
}

async function rebuild() {
  stopServer();
  runBuild();
  await startServer();
}

function uninstall() {
  if (existsSync(vbsPath())) {
    rmSync(vbsPath());
    console.log('[serve] autostart removed');
  }
  stopServer();
}

const actions = {
  install,
  start: startServer,
  stop: stopServer,
  status: checkStatus,
  uninstall,
  rebuild,
  autostart: registerAutostart,
};

if (!actions[cmd]) {
  console.log(
    'usage: node scripts/serve.mjs [install|start|stop|status|uninstall|rebuild|autostart]'
  );
  process.exit(1);
}

// 统一包装为 Promise，兼容不返回 Promise 的同步 action（如 stop）
Promise.resolve()
  .then(() => actions[cmd]())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
