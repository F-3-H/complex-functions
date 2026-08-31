import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
  optimizeDeps: {
    // 预声明全部依赖，避免运行时二次发现导致 react / react-dom 预构建版本分裂
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'react-router-dom',
      'zustand',
      'mathjs',
      'lucide-react',
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
    ],
  },
  server: {
    // 开发服务器固定 5173；生产常驻服务固定 5174（见 scripts/serve.mjs），两者互不冲突
    port: 5173,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },
})
