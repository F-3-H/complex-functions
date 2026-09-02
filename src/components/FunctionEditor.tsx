import { useState, useEffect } from 'react';
import { Code2, Play, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store';
import { PRESETS } from '@/core/presets';

export default function FunctionEditor() {
  const {
    functionExpr,
    setFunctionExpr,
    compileUserExpr,
    compileError,
    isUserCustom,
    applyPreset,
  } = useAppStore();

  const [localExpr, setLocalExpr] = useState(functionExpr);
  const [status, setStatus] = useState<'ok' | 'error' | 'idle' | 'compiling'>('idle');

  // sync from outside (applyPreset)
  useEffect(() => {
    if (!isUserCustom) setLocalExpr(functionExpr);
  }, [functionExpr, isUserCustom]);

  // 实时尝试编译，用于状态指示
  useEffect(() => {
    if (localExpr === functionExpr && !compileError) {
      setStatus('ok');
    } else if (compileError && localExpr === functionExpr) {
      setStatus('error');
    } else {
      setStatus('idle');
    }
  }, [functionExpr, compileError, localExpr]);

  const handleCompile = () => {
    setStatus('compiling');
    setFunctionExpr(localExpr);
    setTimeout(() => {
      const ok = compileUserExpr();
      setStatus(ok ? 'ok' : 'error');
    }, 10);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCompile();
    }
  };

  return (
    <div className="rounded-xl border border-deep-600 bg-deep-800/80 backdrop-blur p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Code2 className="w-4 h-4 text-cyan-glow" />
        <h3 className="text-sm font-display font-semibold tracking-wide text-slate-100">
          f(z) 函数编辑器
        </h3>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
          <kbd className="px-1.5 py-0.5 rounded bg-deep-700 border border-deep-600">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-deep-700 border border-deep-600">Enter</kbd>
          <span className="ml-1">编译</span>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={localExpr}
          onChange={(e) => setLocalExpr(e.target.value)}
          onKeyDown={handleKey}
          spellCheck={false}
          placeholder="例如：z^2, exp(z), sin(z), 1/z, conj(z), z + 1/z ..."
          rows={2}
          className={[
            'w-full resize-none rounded-lg font-mono text-sm p-3 bg-deep-900 border',
            'focus:ring-2 focus:ring-cyan-glow/60 transition duration-200',
            status === 'error'
              ? 'border-red-500/60 animate-pulse focus:ring-red-500/40'
              : status === 'ok'
                ? 'border-emerald-500/40'
                : 'border-deep-600 focus:border-cyan-glow/60',
          ].join(' ')}
          style={{ color: 'rgb(var(--c-slate-200))' }}
        />
        <div className="absolute top-2 right-2">
          {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
        </div>
      </div>

      {status === 'error' && compileError && (
        <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 animate-fade-in">
          <AlertTriangle className="w-3 h-3 inline mr-1 align-[-2px]" />
          {compileError}
        </div>
      )}

      <div className="mt-3 flex gap-2 flex-wrap">
        <button
          onClick={handleCompile}
          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-glow text-deep-900 font-semibold text-sm hover:shadow-glow hover:-translate-y-0.5 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={!localExpr.trim()}
        >
          <Play className="w-4 h-4 fill-current" />
          编译 & 应用
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-1 mb-2 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-purple-accent" />
          <span>常用函数预设</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => {
            const active = !isUserCustom && p.expr === functionExpr;
            return (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                title={p.description}
                className={[
                  'px-2 py-1.5 rounded-md text-xs font-mono border transition',
                  active
                    ? 'bg-purple-accent/20 border-purple-accent text-purple-200 shadow-glow-purple'
                    : 'bg-deep-900 border-deep-600 text-slate-300 hover:border-cyan-glow/50 hover:text-cyan-glow',
                ].join(' ')}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
