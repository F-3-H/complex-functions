import { MousePointer2, Pencil, Minus, CircleDot, Square, Undo2, Trash2, RotateCcw, Hand } from 'lucide-react';
import { useAppStore, type Tool } from '@/store';

interface ToolDef {
  key: Tool;
  label: string;
  hint: string;
  Icon: typeof MousePointer2;
}

const TOOLS: ToolDef[] = [
  { key: 'select', label: '选点', hint: '点击任意位置选点，观察 f(z) 映射', Icon: MousePointer2 },
  { key: 'free', label: '自由线', hint: '鼠标拖动绘制任意曲线', Icon: Pencil },
  { key: 'line', label: '直线段', hint: '两点确定一条直线（点击或拖动）', Icon: Minus },
  { key: 'arc', label: '圆弧', hint: '3步：圆心→起点→终点', Icon: CircleDot },
  { key: 'rect', label: '矩形', hint: '对角两点绘制矩形轨迹', Icon: Square },
];

export default function Toolbar() {
  const { activeTool, setActiveTool, undoPath, clearPaths, resetPlanes, paths } = useAppStore();

  return (
    <div className="rounded-xl border border-deep-600 bg-deep-800/80 backdrop-blur p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Hand className="w-4 h-4 text-purple-accent" />
        <h3 className="text-sm font-display font-semibold tracking-wide text-slate-100">
          绘图工具
        </h3>
        <span className="ml-auto text-[10px] text-slate-500">
          Shift+拖拽 = 平移 · 滚轮 = 缩放
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {TOOLS.map(({ key, label, hint, Icon }) => {
          const active = activeTool === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTool(key)}
              title={hint}
              className={[
                'group relative flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg border transition-all duration-150',
                active
                  ? 'bg-gradient-to-br from-cyan-glow/20 to-purple-accent/10 border-cyan-glow/60 shadow-glow text-cyan-glow'
                  : 'bg-deep-900 border-deep-600 text-slate-300 hover:border-cyan-glow/40 hover:text-cyan-glow/80 hover:-translate-y-0.5',
              ].join(' ')}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[11px] font-medium">{label}</span>
              {/* tooltip */}
              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-deep-900 border border-deep-600 text-[11px] text-slate-200 shadow-lg z-20">
                {hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={undoPath}
          disabled={paths.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-deep-900 border border-deep-600 text-slate-300 text-xs hover:border-yellow-500/50 hover:text-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-3.5 h-3.5" />
          撤销 <span className="text-slate-500">({paths.length})</span>
        </button>
        <button
          onClick={clearPaths}
          disabled={paths.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-deep-900 border border-deep-600 text-slate-300 text-xs hover:border-red-500/60 hover:text-red-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          清除全部
        </button>
        <button
          onClick={resetPlanes}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-deep-900 border border-deep-600 text-slate-300 text-xs hover:border-emerald-500/60 hover:text-emerald-400 transition"
          title="重置双画板视口到默认"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置视口
        </button>
      </div>
    </div>
  );
}
