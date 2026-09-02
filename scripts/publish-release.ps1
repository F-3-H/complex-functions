# 复变函数工具集 GitHub Release 发布脚本
# 用法：
#   1. 先登录 gh（只需一次）：  gh auth login
#   2. 运行此脚本：            powershell -ExecutionPolicy Bypass -File scripts\publish-release.ps1
# 或者直接：
#   npm run release
$ErrorActionPreference = 'Stop'

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
    $gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
}
if (-not $gh) {
    Write-Host "错误：未找到 gh CLI。请先安装：winget install GitHub.cli" -ForegroundColor Red
    exit 1
}

# 检查登录状态
$authOk = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "未登录 GitHub CLI。请先运行：" -ForegroundColor Yellow
    Write-Host "  gh auth login" -ForegroundColor Cyan
    Write-Host "选择 GitHub.com → HTTPS → Login with a web browser → 浏览器授权" -ForegroundColor Gray
    exit 1
}

$zipPath = Join-Path $PSScriptRoot "..\complex-tools-portable.zip"
$zipPath = (Resolve-Path $zipPath).Path

if (-not (Test-Path $zipPath)) {
    Write-Host "错误：找不到 complex-tools-portable.zip，请先运行 npm run build:portable" -ForegroundColor Red
    exit 1
}

$version = "v1.5.1"
$title = "复变函数工具集 $version 离线便携版"
$notes = @"
## 复变函数工具集 $version

一个交互式的复变函数可视化与计算工具集，包含五个独立工具。

## 本版更新

- 主应用（复变函数可视化计算器）接入双主题：顶栏新增 ☾/☀ 切换按钮，UI 与画布在黑夜 / 白天模式下均正常显示
- 移除主应用右上角不可用的"源码"占位按钮
- 修复白天模式下部分工具页坐标系不可见的问题（integral、vectors 网格 / 坐标轴 / 刻度改为主题感知配色）
- 切换主题时画布立即重绘，无需手动刷新

## 包含工具

### 1. 复变函数可视化计算器
- 双画板同步映射（z 平面 → w = f(z) 平面）
- 多种绘图工具：选点/自由线/直线/圆弧/矩形
- 自定义函数编译器（基于 mathjs）
- 14 级智能网格吸附
- 1~5000 倍缩放范围
- 绘图预览实时同步到 w 平面

### 2. 复变函数积分计算器
- z 平面绘制路径，w 平面实时展示 f(z)·dz 积分过程
- 多种绘图工具：画笔/直线/折线/三点圆弧/圆/矩形
- 多线段对比 + 动画播放
- 网格吸附

### 3. 复平面矢量图
- 复数以矢量形式呈现于复平面，拖拽头部至另一矢量尾部即可首尾相接，可视化复数加法
- 拖拽吸附、双击添加点、滚轮缩放、右键平移
- 内置复数四则运算（+ − × ÷），结果可一键加入画布
- 实时显示模 |z| 与辐角 arg(z)
- 涂鸦标注工具：画笔/直线/矩形/圆/橡皮
- 单位根与矢量加法预设

### 4. e^(iθ) 相位矢量动画
- f(θ) = Σ c·e^(pθ)·e^(i(aθ+b)) 任意线性组合，自定义函数
- θ 轴两点成线、θ 自动缓慢移动，右侧复平面矢量首尾相接同步旋转
- 衰变系数：指数含实部（e^(-θ)、e^((-1+i)θ) 等），曲线呈对数螺旋
- 每矢量配以矢尾为圆心、模长为半径的虚线圆，随衰变实时变化
- 播放控制：播放/暂停、时长 1–30s、往返/单程/循环模式、手动 θ 滑条
- 触屏单指平移、双指缩放

### 5. 积分可视化计算器（新增）
- ∫e^(st)dt：把每个实数微元 dt 被 e^(st) 拉伸旋转成向量，首尾累加即得积分
- s = a + bi 参数可调：纯旋转 s=i 得圆弧、增长/衰减螺旋（s=±0.5+i）、指数膨胀（s=1）、常函数直线（s=0）
- 播放/暂停、回到起点、复位视图、动画播放
- 触屏单指平移、双指缩放

## 使用方式

1. 下载 zip 文件
2. 解压到任意位置（桌面/文档/U盘都行）
3. 双击 ``start.bat`` 启动本地服务器 + 自动打开浏览器
4. 在启动页选择要使用的工具
5. 关闭弹出的黑色命令行窗口即可停止服务器

## 前置条件

- 需要已安装 Node.js（免费，https://nodejs.org 下载 LTS）
- 主流现代浏览器（Chrome / Edge / Firefox / Safari）

## 技术规格

- 体积：$([math]::Round((Get-Item $zipPath).Length/1KB, 1)) KB
- 完全离线运行，无需联网
- 启动器：Node.js 内置 HTTP 服务器（零依赖）
- 支持 Windows（双击 start.bat）/ macOS / Linux（命令行 node start.js）
- 入口：start.bat（Windows）/ launcher.html（启动页）
- 源码仓库：https://github.com/F-3-H/complex-functions
"@

Write-Host "=== 创建 GitHub Release ===" -ForegroundColor Cyan
Write-Host "版本: $version"
Write-Host "标题: $title"
Write-Host "附件: $zipPath ($([math]::Round((Get-Item $zipPath).Length/1KB, 1)) KB)"
Write-Host ""

& $gh release create $version $zipPath `
    --title $title `
    --notes $notes `
    --repo F-3-H/complex-functions

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== 发布成功 ===" -ForegroundColor Green
    Write-Host "Release 地址: https://github.com/F-3-H/complex-functions/releases/tag/$version"
} else {
    Write-Host "发布失败，请检查错误信息" -ForegroundColor Red
    exit 1
}

