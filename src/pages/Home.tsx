import { useMemo, useState, useCallback } from 'react';
import { FunctionSquare, BookOpen, Moon, Sun } from 'lucide-react';
import ComplexPlane from '@/components/ComplexPlane';
import FunctionEditor from '@/components/FunctionEditor';
import ParamEditor from '@/components/ParamEditor';
import Panel3D from '@/components/Panel3D';
import Toolbar from '@/components/Toolbar';
import ValueDisplay from '@/components/ValueDisplay';
import { useAppStore } from '@/store';
import type { Complex } from '@/core/complex';
import { C } from '@/core/complex';

/* 用于右上角微型浮条的紧凑复数渲染 */
function MiniComplex({ z, zColor }: { z: Complex | null | undefined; zColor: string }) {
  if (!z) return <span className="text-slate-600">—</span>;
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return <span className="text-red-400">∞</span>;
  const re = z.re.toFixed(2).replace(/\.?0+$/, '') || '0';
  const imAbs = Math.abs(z.im).toFixed(2).replace(/\.?0+$/, '') || '0';
  const imSign = z.im >= 0 ? '+' : '−';
  const imCoef = imAbs === '1' ? '' : imAbs;
  return (
    <span className={`${zColor} tabular-nums`}>
      {re}{imSign}{imCoef}i
    </span>
  );
}

/* 黑夜 / 白天主题切换按钮 */
function ThemeToggle() {
  const [light, setLight] = useState(() => document.documentElement.dataset.theme === 'light');
  const toggle = () => {
    const d = document.documentElement;
    const isLight = d.dataset.theme === 'light';
    if (isLight) delete d.dataset.theme;
    else d.dataset.theme = 'light';
    try { localStorage.setItem('theme', isLight ? 'dark' : 'light'); } catch { /* ignore */ }
    setLight(!isLight);
  };
  return (
    <button
      onClick={toggle}
      aria-label="切换主题"
      title="切换黑夜 / 白天"
      className="ml-1 shrink-0 w-8 h-8 rounded-full border border-deep-600 bg-deep-800/60 text-slate-300 hover:text-cyan-glow hover:border-cyan-glow/50 inline-flex items-center justify-center transition"
    >
      {light ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function Home() {
  const {
    paths,
    selectedPoint,
    mappedPoint,
    activeTool,
    zPlane,
    wPlane,
    setZPlane,
    setWPlane,
    setSelectedPoint,
    addPath,
    compiledFn,
  } = useAppStore();

  const [hoverZ, setHoverZ] = useState<Complex | null>(null);
  const [previewZ, setPreviewZ] = useState<Complex[] | null>(null);

  const hoverW = useMemo<Complex | null>(() => {
    if (!hoverZ || !compiledFn) return null;
    try {
      const w = compiledFn(hoverZ);
      return w && Number.isFinite(w.re) && Number.isFinite(w.im) ? w : null;
    } catch {
      return null;
    }
  }, [hoverZ, compiledFn]);

  // 将 z 平面的预览点通过 f(z) 映射为 w 平面的预览点
  const previewW = useMemo<Complex[] | null>(() => {
    if (!previewZ || previewZ.length === 0 || !compiledFn) return null;
    return previewZ.map((z) => {
      try {
        const w = compiledFn(z);
        if (w && Number.isFinite(w.re) && Number.isFinite(w.im)) return w;
        return C(NaN, NaN);
      } catch {
        return C(NaN, NaN);
      }
    });
  }, [previewZ, compiledFn]);

  // z 平面预览变化时的回调
  const handlePreviewChange = useCallback((pts: Complex[] | null) => {
    setPreviewZ(pts);
  }, []);

  const zPaths = paths.map((p) => ({ id: p.id, points: p.zPoints, color: p.color }));
  const wPaths = paths.map((p) => ({ id: p.id, points: p.wPoints, color: p.color }));

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-slate-200 font-display">
      {/* ===== 顶栏 ===== */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-deep-600/70 bg-deep-900/60 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-glow via-purple-accent to-pink-500 shadow-glow-purple flex items-center justify-center">
            <FunctionSquare className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-wide leading-tight">
              复变函数可视化计算器
            </h1>
            <p className="text-[10px] text-slate-500 leading-tight">
              Complex Visualizer · z ↦ f(z) 双平面映射
            </p>
          </div>
        </div>

        <div className="ml-auto hidden md:flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-deep-600 bg-deep-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> 实轴 Re
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-deep-600 bg-deep-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 虚轴 Im
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-deep-600 bg-deep-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow" /> 自变量 z
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-deep-600 bg-deep-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-accent" /> 像 w = f(z)
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="px-2.5 py-1.5 rounded-md text-[11px] border border-deep-600 bg-deep-800/60 text-slate-300 hover:text-cyan-glow hover:border-cyan-glow/50 inline-flex items-center gap-1.5 transition"
          >
            <BookOpen className="w-3.5 h-3.5" /> 使用说明
          </a>
        </div>
        <ThemeToggle />
      </header>

      {/* ===== 主体 ===== */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* 左侧面板（数值面板位于此处，避免遮挡画板） */}
        <aside className="lg:w-[360px] shrink-0 overflow-y-auto border-r border-deep-600/70 p-3.5 space-y-3.5 bg-deep-900/30 flex flex-col">
          <FunctionEditor />
          <ParamEditor />
          <Toolbar />
          <ValueDisplay hoverZ={hoverZ} hoverW={hoverW} compact />
          <div className="mt-auto rounded-lg border border-deep-600 bg-deep-800/60 p-3 text-[11px] leading-5.5 text-slate-400 space-y-1.5">
            <div className="text-xs font-semibold text-slate-200 mb-1">使用指南</div>
            <div><span className="text-cyan-glow">1.</span> f(z) 编辑器：z↦w 的复变函数，Ctrl+Enter 编译。</div>
            <div><span className="text-cyan-glow">2.</span> t 编辑器：x(t)/y(t) 参数化 z，f(t) 直接给 w。</div>
            <div><span className="text-cyan-glow">3.</span> 3D 面板：拖拽旋转、滚轮缩放，滑块探查 t。</div>
            <div><span className="text-cyan-glow">4.</span> 2D 画板：选点/画线查看 z↦w 映射。</div>
          </div>
        </aside>

        {/* 右侧：上=双 2D 画板并排，下=3D 面板 */}
        <section className="flex-1 min-w-0 flex flex-col p-4 gap-4 relative">
          {/* 悬浮：右上角鼠标位置微型指示（不遮挡核心内容） */}
          {(hoverZ || hoverW) && (
            <div className="absolute right-8 top-6 z-30 pointer-events-none">
              <div className="rounded-md bg-deep-900/90 border border-deep-600/80 backdrop-blur px-3 py-1.5 text-[10.5px] font-mono shadow-xl flex items-center gap-3 animate-fade-in">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="text-slate-500">z:</span>
                  <MiniComplex z={hoverZ} zColor="text-cyan-glow" />
                </span>
                <span className="text-slate-600">→</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span className="text-slate-500">w:</span>
                  <MiniComplex z={hoverW} zColor="text-purple-accent" />
                </span>
              </div>
            </div>
          )}

          {/* 上半：z / w 双 2D 画板并排 */}
          <div className="flex-1 min-h-0 flex gap-3 relative">
            <div className="flex-1 min-h-0 min-w-0">
              <ComplexPlane
                planeType="z"
                label="Z - 自变量平面 · 可交互"
                planeState={zPlane}
                setPlaneState={setZPlane}
                paths={zPaths}
                selectedPoint={selectedPoint}
                activeTool={activeTool}
                onClickPoint={(z) => setSelectedPoint(z)}
                onHover={(z) => setHoverZ(z)}
                onDrawComplete={(pts) => addPath(pts)}
                onPreviewChange={handlePreviewChange}
              />
            </div>
            {/* 中间映射箭头 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden lg:flex items-center opacity-90">
              <div className="px-2.5 py-1 rounded-full bg-deep-800/90 border border-deep-600 backdrop-blur text-[10px] font-mono text-slate-300 shadow-xl flex items-center gap-1.5">
                <span className="text-cyan-glow">z</span>
                <span>⟼</span>
                <span className="text-purple-accent">f(z)</span>
              </div>
            </div>
            <div className="flex-1 min-h-0 min-w-0">
              <ComplexPlane
                planeType="w"
                label="W - 因变量平面 · w = f(z) 映射"
                planeState={wPlane}
                setPlaneState={setWPlane}
                paths={wPaths}
                selectedPoint={mappedPoint}
                tempPoints={previewW}
                tempColor="#fbbf24"
              />
            </div>
          </div>

          {/* 下半：3D 函数面板 */}
          <div className="flex-[0.9] min-h-[220px] h-[42%]">
            <Panel3D />
          </div>
        </section>
      </main>
    </div>
  );
}
