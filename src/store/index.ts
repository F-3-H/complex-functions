import { create } from 'zustand';
import type { Complex } from '@/core/complex';
import { DEFAULT_PRESET, PATH_COLORS } from '@/core/presets';
import { compileExpression, compileTExpr, compileTRealExpr } from '@/core/compiler';

export type Tool = 'select' | 'free' | 'line' | 'arc' | 'rect';

export interface Path {
  id: string;
  zPoints: Complex[];
  wPoints: Complex[];
  color: string;
}

export interface PlaneState {
  center: Complex; // 视口中心复数坐标
  scale: number;   // 像素 / 复数单位
}

// ===== 参数化 t 相关 =====
export interface TRange {
  start: number;
  end: number;
  samples: number; // 采样点数
}

export type WSource = 'fz' | 'ft'; // 3D 图中 w 的来源

interface AppState {
  // 函数
  functionExpr: string;
  compiledFn: ((z: Complex) => Complex) | null;
  compileError: string | null;
  isUserCustom: boolean;

  // 选点
  selectedPoint: Complex | null;
  mappedPoint: Complex | null;

  // 轨迹
  paths: Path[];
  colorCursor: number;

  // 工具
  activeTool: Tool;

  // 画板视口
  zPlane: PlaneState;
  wPlane: PlaneState;

  // 参数化 t 表达式（用于 3D 面板）
  xExpr: string;
  xFn: ((t: number) => number) | null;
  xError: string | null;
  yExpr: string;
  yFn: ((t: number) => number) | null;
  yError: string | null;
  fTExpr: string;
  fTFn: ((t: number) => Complex) | null;
  fTError: string | null;

  tRange: TRange;
  wSource: WSource;

  // ===== actions =====
  setFunctionExpr: (expr: string) => void;
  applyPreset: (preset: { expr: string; fn: (z: Complex) => Complex }) => void;
  compileUserExpr: () => boolean;

  setSelectedPoint: (z: Complex | null) => void;

  addPath: (zPoints: Complex[]) => void;
  undoPath: () => void;
  clearPaths: () => void;

  setActiveTool: (tool: Tool) => void;

  setZPlane: (p: Partial<PlaneState>) => void;
  setWPlane: (p: Partial<PlaneState>) => void;
  resetPlanes: () => void;

  // t 参数 actions
  setXExpr: (s: string) => void;
  setYExpr: (s: string) => void;
  setFTExpr: (s: string) => void;
  compileXExpr: () => boolean;
  compileYExpr: () => boolean;
  compileFTExpr: () => boolean;
  setTRange: (p: Partial<TRange>) => void;
  setWSource: (s: WSource) => void;
}

const genId = () => Math.random().toString(36).slice(2, 10);

// 应用函数映射，遇到 nan 就跳过（不要打断整条轨迹）
function mapPathPoints(
  zPoints: Complex[],
  fn: ((z: Complex) => Complex) | null
): Complex[] {
  if (!fn) return [];
  return zPoints.map((z) => {
    try {
      const w = fn(z);
      return w && Number.isFinite(w.re) && Number.isFinite(w.im)
        ? w
        : { re: NaN, im: NaN };
    } catch {
      return { re: NaN, im: NaN };
    }
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  functionExpr: DEFAULT_PRESET.expr,
  compiledFn: DEFAULT_PRESET.fn,
  compileError: null,
  isUserCustom: false,

  selectedPoint: null,
  mappedPoint: null,

  paths: [],
  colorCursor: 0,

  activeTool: 'select',

  zPlane: { center: { re: 0, im: 0 } as Complex, scale: 60 },
  wPlane: { center: { re: 0, im: 0 } as Complex, scale: 60 },

  // 参数化 t：默认单位圆 z=cos(t)+i sin(t)，t∈[0,2π]
  xExpr: 'cos(t)',
  yExpr: 'sin(t)',
  fTExpr: 'exp(i*t)',
  xFn: (() => {
    const r = compileTRealExpr('cos(t)');
    return r.fn;
  })(),
  yFn: (() => {
    const r = compileTRealExpr('sin(t)');
    return r.fn;
  })(),
  fTFn: (() => {
    const r = compileTExpr('exp(i*t)');
    return r.fn;
  })(),
  xError: null,
  yError: null,
  fTError: null,
  tRange: { start: 0, end: Math.PI * 2, samples: 400 },
  wSource: 'fz',

  setFunctionExpr: (expr) => set({ functionExpr: expr, isUserCustom: true }),

  applyPreset: (preset) =>
    set({
      functionExpr: preset.expr,
      compiledFn: preset.fn,
      compileError: null,
      isUserCustom: false,
    }),

  compileUserExpr: () => {
    const { functionExpr } = get();
    const result = compileExpression(functionExpr);
    if (result.fn && !result.error) {
      const existingPaths = get().paths;
      // 重新映射已有轨迹
      const newPaths = existingPaths.map((p) => ({
        ...p,
        wPoints: mapPathPoints(p.zPoints, result.fn!),
      }));
      const sp = get().selectedPoint;
      const mapped = sp ? result.fn(sp) : null;
      set({
        compiledFn: result.fn,
        compileError: null,
        paths: newPaths,
        mappedPoint:
          mapped && Number.isFinite(mapped.re) && Number.isFinite(mapped.im)
            ? mapped
            : null,
      });
      return true;
    }
    set({ compiledFn: null, compileError: result.error, paths: get().paths });
    return false;
  },

  setSelectedPoint: (z) => {
    if (!z) {
      set({ selectedPoint: null, mappedPoint: null });
      return;
    }
    const fn = get().compiledFn;
    let mapped: Complex | null = null;
    if (fn) {
      try {
        const w = fn(z);
        if (w && Number.isFinite(w.re) && Number.isFinite(w.im)) mapped = w;
      } catch {}
    }
    set({ selectedPoint: z, mappedPoint: mapped });
  },

  addPath: (zPoints) => {
    if (zPoints.length === 0) return;
    const { compiledFn, colorCursor } = get();
    const wPoints = mapPathPoints(zPoints, compiledFn);
    const color = PATH_COLORS[colorCursor % PATH_COLORS.length];
    const path: Path = {
      id: genId(),
      zPoints,
      wPoints,
      color,
    };
    set((s) => ({
      paths: [...s.paths, path],
      colorCursor: (s.colorCursor + 1) % PATH_COLORS.length,
    }));
  },

  undoPath: () => set((s) => ({ paths: s.paths.slice(0, -1) })),
  clearPaths: () => set({ paths: [] }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setZPlane: (p) => set((s) => ({ zPlane: { ...s.zPlane, ...p } })),
  setWPlane: (p) => set((s) => ({ wPlane: { ...s.wPlane, ...p } })),
  resetPlanes: () =>
    set({
      zPlane: { center: { re: 0, im: 0 } as Complex, scale: 60 },
      wPlane: { center: { re: 0, im: 0 } as Complex, scale: 60 },
    }),

  // ===== t 参数 actions =====
  setXExpr: (s) => set({ xExpr: s }),
  setYExpr: (s) => set({ yExpr: s }),
  setFTExpr: (s) => set({ fTExpr: s }),

  compileXExpr: () => {
    const r = compileTRealExpr(get().xExpr);
    if (r.fn && !r.error) {
      set({ xFn: r.fn, xError: null });
      return true;
    }
    set({ xFn: null, xError: r.error });
    return false;
  },
  compileYExpr: () => {
    const r = compileTRealExpr(get().yExpr);
    if (r.fn && !r.error) {
      set({ yFn: r.fn, yError: null });
      return true;
    }
    set({ yFn: null, yError: r.error });
    return false;
  },
  compileFTExpr: () => {
    const r = compileTExpr(get().fTExpr);
    if (r.fn && !r.error) {
      set({ fTFn: r.fn, fTError: null });
      return true;
    }
    set({ fTFn: null, fTError: r.error });
    return false;
  },

  setTRange: (p) => set((s) => ({ tRange: { ...s.tRange, ...p } })),
  setWSource: (src) => set({ wSource: src }),
}));
