import { useAppStore } from '@/store';
import { Zap, Sparkle, Move } from 'lucide-react';
import type { Complex } from '@/core/complex';

interface Props {
  hoverZ?: Complex | null;
  hoverW?: Complex | null;
  /** 紧凑模式：用于侧栏（默认），无边框大阴影 */
  compact?: boolean;
}

// 单行复数渲染（精简版）
function ComplexInline({ z }: { z: Complex | null | undefined }) {
  if (z == null) return <span className="text-slate-600">—</span>;
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) {
    return <span className="text-red-400">∞</span>;
  }
  const re = z.re.toFixed(4).replace(/\.?0+$/, '') || '0';
  const imAbs = Math.abs(z.im).toFixed(4).replace(/\.?0+$/, '') || '0';
  const imSign = z.im >= 0 ? '+' : '−';
  const imCoef = imAbs === '1' ? '' : imAbs;
  return (
    <span className="font-mono text-[13px] tabular-nums">
      <span className="text-slate-100">{re}</span>
      <span className="text-slate-500 mx-0.5">{imSign}</span>
      <span className="text-slate-100">{imCoef}<span className="text-emerald-400 ml-0.5">i</span></span>
    </span>
  );
}

export default function ValueDisplay({ hoverZ, hoverW, compact = true }: Props) {
  const { selectedPoint, mappedPoint, functionExpr, compiledFn } = useAppStore();

  const baseClass = compact
    ? 'rounded-lg border border-deep-600 bg-deep-800/90 p-3 shadow-md'
    : 'rounded-xl border border-deep-600/80 bg-deep-900/85 backdrop-blur p-4 shadow-2xl';

  return (
    <div className={`${baseClass} animate-fade-in`}>
      {/* 标题条 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-purple-accent" />
          <div className="text-[11px] font-semibold tracking-wide text-slate-200">
            映射值
          </div>
        </div>
        <div className="font-mono text-[10px] truncate max-w-[55%] text-right">
          {compiledFn ? (
            <span className="text-cyan-glow/90">w = {functionExpr}</span>
          ) : (
            <span className="text-red-400">（编译失败）</span>
          )}
        </div>
      </div>

      {/* 选中点（两行核心数值） */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-5 inline-flex items-center justify-center rounded bg-cyan-glow/15 border border-cyan-glow/40 text-cyan-glow shrink-0">
            <Zap className="w-3 h-3" strokeWidth={2.2} />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 w-12">z =</span>
          <ComplexInline z={selectedPoint} />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-5 inline-flex items-center justify-center rounded bg-purple-accent/15 border border-purple-accent/40 text-purple-accent shrink-0">
            <Sparkle className="w-3 h-3" strokeWidth={2.2} />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 w-12">w =</span>
          <ComplexInline z={mappedPoint} />
        </div>
      </div>

      {/* 鼠标悬停预览（1行 紧凑） */}
      {(hoverZ || hoverW) && (
        <div className="mt-2 pt-2 border-t border-deep-700/70 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
            <span className="text-slate-500 shrink-0">z:</span>
            <span className="truncate"><ComplexInline z={hoverZ} /></span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
            <span className="text-slate-500 shrink-0">w:</span>
            <span className="truncate"><ComplexInline z={hoverW} /></span>
          </div>
        </div>
      )}
    </div>
  );
}
