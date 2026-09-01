# 复变函数工具集

一组交互式的复变函数可视化与计算工具，帮助理解复变函数的几何映射与积分性质。

## 包含的工具

### 1. 复变函数可视化计算器（主项目）

位于根目录，基于 Vite + React + TypeScript 构建。

**功能特点：**

- **双画板同步映射**：左侧自变量 z 平面 + 右侧因变量 w = f(z) 平面，实时展现复变函数的几何变换
- **多种绘图工具**：选点、自由线、直线、圆弧、矩形等，绘制时 w 平面同步映射预览
- **自定义函数编译器**：支持完整复变函数语法（基于 mathjs：sin/cos/exp/log/sqrt/conj 等）
- **14 级智能网格吸附**：缩放越强吸附越明显，高放大时支持小数刻度吸附
- **大范围缩放**：1~5000 倍缩放，可观察超大值与小数点级精度
- **预设函数库**：z²、e^z、sin(z)、1/z、log(z)、√z、Joukowski 翼型等 12 个常用函数

**使用方式：**

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

详细文档参见：
- [产品需求文档](.trae/documents/PRD-复变函数计算器.md)
- [技术架构文档](.trae/documents/TechArch-复变函数计算器.md)

---

### 2. 复变函数积分计算器（integral/）

位于 [`integral/`](./integral/) 子目录，单文件 HTML 应用，浏览器直接打开即可使用。

**功能特点：**

- **z 平面绘制**：画笔、直线、折线、三点圆弧、圆、矩形等多种绘图工具
- **w 平面积分可视化**：实时展示 f(z)·dz 矢量首尾相加的积分过程
- **自定义函数**：支持完整复变函数语法（sin, cos, exp, log, sqrt, conj 等）
- **多线段对比**：支持绘制多条独立线段，分别积分对比
- **动画播放**：逐步展示积分累加过程
- **网格吸附**：绘图时自动吸附到网格交点

**使用方式：**

直接在浏览器中打开 [`integral/index.html`](./integral/index.html) 即可使用，无需安装任何依赖。

详细说明见 [`integral/README.md`](./integral/README.md)。

---

## 技术栈

| 项目 | 技术栈 | 构建方式 | 部署方式 |
|------|--------|----------|----------|
| 主项目（可视化计算器） | Vite 6 + React 18 + TypeScript + Tailwind + Zustand + mathjs + three.js | `npm run build` → dist/ | Vercel / GitHub Pages / 静态托管 |
| integral/（积分计算器） | 原生 HTML + CSS + JavaScript（零依赖） | 无需构建，单文件 | GitHub Pages / 任意静态托管 |

## 部署

### Vercel（推荐）

根目录已配置 [vercel.json](./vercel.json)，可一键部署到 Vercel：

```bash
npm i -g vercel
vercel login
npm run deploy
```

### GitHub Pages

两个项目都可以部署到 GitHub Pages：

- 主项目：在仓库 Settings → Pages → Source 选择 GitHub Actions，配置构建流程
- integral/ 子项目：可作为独立的 GitHub Pages 站点

## License

MIT
