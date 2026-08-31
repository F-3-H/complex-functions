// 稳定启动脚本：每次启动前自动清理占用 5174 的僵尸 dev 进程，
// 避免端口漂移导致"打不开"。加 --clean 参数同时清 Vite 预构建缓存（修复偶发缓存损坏）。
// 注意：中文提示在 Windows 控制台会显示乱码，故统一用英文。
import { execSync, spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// 抑制 spawn shell:true 时的 DEP0190 警告
process.env.NODE_NO_WARNINGS = '1';

// 开发服务器端口（生产常驻服务固定 5174，见 scripts/serve.mjs）
const PORT = 5173;

function clearPort() {
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore' }
      );
    } else {
      execSync(`lsof -ti:${PORT} | xargs -r kill -9 2>/dev/null`, { stdio: 'ignore' });
    }
  } catch {
    // 端口本来就空闲，忽略
  }
}

const wantClean = process.argv.includes('--clean');

if (wantClean) {
  const viteCache = join(process.cwd(), 'node_modules/.vite');
  if (existsSync(viteCache)) {
    rmSync(viteCache, { recursive: true, force: true });
    console.log('\x1b[36m[start]\x1b[0m 已清理 .vite 预构建缓存（将重新构建依赖，首次较慢）');
  }
}

clearPort();
console.log(`\x1b[36m[start]\x1b[0m port ${PORT} ready, launching vite...`);

const args = ['vite'];
if (wantClean) args.push('--force');

// Windows 下必须经 shell 启动 .cmd 包装脚本，否则 spawn 报 EINVAL
const child = spawn('npx', args, { stdio: 'inherit', shell: true });

child.on('exit', (code) => process.exit(code ?? 0));
