import { useState, useEffect, useCallback } from 'react';
import {
  Variable,
  Play,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Sliders,
} from 'lucide-react';
import { useAppStore, type WSource } from '@/store';

interface ParamPreset {
  name: string;
  x: string;
  y: string;
  ft: string;
  tStart: number;
  tEnd: number;
  wSource: WSource;
  desc: string;
}

const PARAM_PRESETS: ParamPreset[] = [
  {
    name: '单位圆',
    x: 'cos(t)',
    y: 'sin(t)',
    ft: 'exp(i*t)',
    tStart: 0,
    tEnd: Math.PI * 2,
    wSource: 'fz',
    desc: 'z=cos(t)+i·sin(t)，经 f(z) 映射',
  },
  {
    name: '阿基米德螺旋',
    x: 't*cos(t)/3',
    y: 't*sin(t)/3',
    ft: 't*exp(i*t)/3',
    tStart: 0,
    tEnd: Math.PI * 6,
    wSource: 'fz',
    desc: '半径随 t 线性增长',
  },
  {
    name: '利萨如 2:3',
    x: 'cos(2*t)',
    y: 'sin(3*t)',
    ft: 'exp(i*2*t)',
    tStart: 0,
    tEnd: Math.PI * 2,
    wSource: 'fz',
    desc: '频率比 2:3 的封闭曲线',
  },
  {
    name: '指数衰减螺旋',
    x: 'exp(-t/4)*cos(t)',
    y: 'exp(-t/4)*sin(t)',
    ft: 'exp(-t/4+i*t)',
    tStart: 0,
    tEnd: Math.PI * 8,
    wSource: 'fz',
    desc: '半径指数衰减',
  },
  {
    name: 'f(t) 直接',
    x: 'cos(t)',
    y: 'sin(t)',
    ft: 't*exp(i*t)',
    tStart: 0,
    tEnd: Math.PI * 4,
    wSource: 'ft',
    desc: '3D 图直接来自 f(t)',
  },
];

interface RowProps {
  label: string;
  sub: string;
  value: string;
  accent: string;
  placeholder: string;
  error: string | null;
  synced: boolean;
  onChange: (v: string) => void;
  onCommit: () => void;
}

function ExprRow({ label, sub, value, accent, placeholder, error, synced, onChange, onCommit }: RowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className={`font-mono font-semibold ${accent}`}>{label}</span>
        <span className="text-slate-500 text-[10px]">{sub}</span>
        <span className="ml-auto">
          {synced && !error ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : error ? (
            <AlertTriangle className="w-3 h-3 text-red-400" />
          ) : (
            <span className="w-3 h-3 inline-block rounded-full bg-slate-600" />
          )}
        </span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            onCommit();
          }
        }}
        spellCheck={false}
        placeholder={placeholder}
        className={[
          'w-full rounded-md font-mono text-[13px] px-2.5 py-1.5 bg-deep-900 border transition',
          error
            ? 'border-red-500/60 animate-pulse'
            : synced
              ? 'border-emerald-500/40'
              : 'border-deep-600 focus:border-cyan-glow/60',
          'focus:ring-1 focus:ring-cyan-glow/40',
        ].join(' ')}
        style={{ color: '#e2e8f0' }}
      />
      {error && synced && (
        <div className="text-[10px] text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          {error}
        </div>
      )}
    </div>
  );
}

export default function ParamEditor() {
  const {
    xExpr, yExpr, fTExpr,
    setXExpr, setYExpr, setFTExpr,
    compileXExpr, compileYExpr, compileFTExpr,
    xError, yError, fTError,
    tRange, setTRange,
    wSource, setWSource,
  } = useAppStore();

  const [lx, setLx] = useState(xExpr);
  const [ly, setLy] = useState(yExpr);
  const [lft, setLft] = useState(fTExpr);

  useEffect(() => setLx(xExpr), [xExpr]);
  useEffect(() => setLy(yExpr), [yExpr]);
  useEffect(() => setLft(fTExpr), [fTExpr]);

  const compileAll = useCallback(() => {
    setXExpr(lx);
    setYExpr(ly);
    setFTExpr(lft);
    compileXExpr();
    compileYExpr();
    compileFTExpr();
  }, [lx, ly, lft, setXExpr, setYExpr, setFTExpr, compileXExpr, compileYExpr, compileFTExpr]);

  const applyPreset = (p: ParamPreset) => {
    setLx(p.x);
    setLy(p.y);
    setLft(p.ft);
    setXExpr(p.x);
    setYExpr(p.y);
    setFTExpr(p.ft);
    setTRange({ start: p.tStart, end: p.tEnd });
    setWSource(p.wSource);
    // 编译在下一帧，确保 expr 已落地
    compileXExpr();
    compileYExpr();
    compileFTExpr();
  };

  const xSynced = lx === xExpr;
  const ySynced = ly === yExpr;
  const ftSynced = lft === fTExpr;

  return (
    <div className="rounded-xl border border-deep-600 bg-deep-800/80 backdrop-blur p-3.5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Variable className="w-4 h-4 text-purple-accent" />
        <h3 className="text-sm font-display font-semibold tracking-wide text-slate-100">
          参数化 t 编辑器
        </h3>
        <span className="ml-auto text-[10px] text-slate-400">t → z → w / t → w</span>
      </div>

      <div className="space-y-2.5">
        <ExprRow
          label="x(t) ="
          sub="实部·z=x+iy"
          accent="text-real-axis"
          placeholder="如 cos(t), t, exp(-t/4)*cos(t)"
          value={lx}
          error={xError}
          synced={xSynced}
          onChange={setLx}
          onCommit={compileAll}
        />
        <ExprRow
          label="y(t) ="
          sub="虚部·z=x+iy"
          accent="text-imag-axis"
          placeholder="如 sin(t), t^2/3"
          value={ly}
          error={yError}
          synced={ySynced}
          onChange={setLy}
          onCommit={compileAll}
        />
        <ExprRow
          label="f(t) ="
          sub="复数·可用 i"
          accent="text-purple-accent"
          placeholder="如 exp(i*t), t*exp(i*t)"
          value={lft}
          error={fTError}
          synced={ftSynced}
          onChange={setLft}
          onCommit={compileAll}
        />
      </div>

      <button
        onClick={compileAll}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-accent text-white font-semibold text-sm hover:shadow-glow-purple hover:-translate-y-0.5 transition duration-200"
      >
        <Play className="w-4 h-4 fill-current" />
        编译 t 参数
      </button>

      {/* w 来源切换 */}
      <div className="mt-3">
        <div className="flex items-center gap-1 mb-1.5 text-[11px] text-slate-400">
          <GitBranch className="w-3.5 h-3.5 text-cyan-glow" />
          <span>3D 图中 w 的来源</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { v: 'fz' as WSource, label: '经 z 路径', hint: 'w=f(x(t)+iy(t))' },
            { v: 'ft' as WSource, label: '直接 f(t)', hint: 'w=f(t)' },
          ]).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setWSource(opt.v)}
              className={[
                'px-2 py-1.5 rounded-md text-[11px] border transition text-left',
                wSource === opt.v
                  ? 'bg-cyan-glow/15 border-cyan-glow text-cyan-glow'
                  : 'bg-deep-900 border-deep-600 text-slate-300 hover:border-cyan-glow/40',
              ].join(' ')}
            >
              <div className="font-semibold">{opt.label}</div>
              <div className="font-mono text-[9.5px] text-slate-500">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* t 范围控件 */}
      <div className="mt-3">
        <div className="flex items-center gap-1 mb-1.5 text-[11px] text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>t 区间与采样</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <label className="text-[10px] text-slate-500">
            起点
            <input
              type="number"
              step={0.1}
              value={tRange.start}
              onChange={(e) => setTRange({ start: parseFloat(e.target.value) || 0 })}
              className="mt-0.5 w-full rounded-md font-mono text-[12px] px-2 py-1 bg-deep-900 border border-deep-600 focus:border-cyan-glow/60 focus:ring-1 focus:ring-cyan-glow/40"
              style={{ color: '#e2e8f0' }}
            />
          </label>
          <label className="text-[10px] text-slate-500">
            终点
            <input
              type="number"
              step={0.1}
              value={tRange.end}
              onChange={(e) => setTRange({ end: parseFloat(e.target.value) || 0 })}
              className="mt-0.5 w-full rounded-md font-mono text-[12px] px-2 py-1 bg-deep-900 border border-deep-600 focus:border-cyan-glow/60 focus:ring-1 focus:ring-cyan-glow/40"
              style={{ color: '#e2e8f0' }}
            />
          </label>
          <label className="text-[10px] text-slate-500">
            采样点
            <input
              type="number"
              step={50}
              min={20}
              max={5000}
              value={tRange.samples}
              onChange={(e) => setTRange({ samples: Math.max(20, Math.min(5000, parseInt(e.target.value) || 400)) })}
              className="mt-0.5 w-full rounded-md font-mono text-[12px] px-2 py-1 bg-deep-900 border border-deep-600 focus:border-cyan-glow/60 focus:ring-1 focus:ring-cyan-glow/40"
              style={{ color: '#e2e8f0' }}
            />
          </label>
        </div>
      </div>

      {/* 参数预设 */}
      <div className="mt-3">
        <div className="text-[10px] text-slate-400 mb-1.5">参数曲线预设</div>
        <div className="grid grid-cols-2 gap-1.5">
          {PARAM_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              title={p.desc}
              className="px-2 py-1.5 rounded-md text-[11px] font-mono border bg-deep-900 border-deep-600 text-slate-300 hover:border-purple-accent/60 hover:text-purple-accent transition"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
