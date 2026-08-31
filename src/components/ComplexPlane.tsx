import { useEffect, useRef, useState, useCallback } from 'react';
import type { Complex } from '@/core/complex';
import { C } from '@/core/complex';
import type { PlaneState } from '@/store';

export interface ComplexPlaneProps {
  planeType: 'z' | 'w';
  label: string;
  planeState: PlaneState;
  setPlaneState: (p: Partial<PlaneState>) => void;
  paths: { points: Complex[]; color: string; id: string }[];
  selectedPoint?: Complex | null;
  onHover?: (z: Complex | null) => void;
  onClickPoint?: (z: Complex) => void;
  onDrawComplete?: (points: Complex[]) => void;
  /** 预览变化时回调（z 平面绘制中实时通知父组件，用于同步到 w 平面） */
  onPreviewChange?: (points: Complex[] | null) => void;
  activeTool?: 'select' | 'free' | 'line' | 'arc' | 'rect';
  tempPoints?: Complex[] | null;
  tempColor?: string;
}

type DrawingState = {
  mode: 'free' | 'line' | 'arc' | 'rect';
  points: Complex[];
  start: Complex | null;
  pending: Complex | null;
  arcStage: 0 | 1 | 2;
  arcCenter: Complex | null;
  arcStart: Complex | null;
} | null;

/* ==========  配置常量（吸附/缩放/刻度）  ========== */
/** 缩放极限（scale = 像素 / 1 复数单位） */
const SCALE_MIN = 1;     // 最缩小（看大范围）：1 复数单位 = 1 像素
const SCALE_MAX = 5000;  // 最放大（看小数点）：1 复数单位 = 5000 像素
/** 缩放按钮倍率 */
const ZOOM_OUT = 0.72;
const ZOOM_IN  = 1.4;

interface GridStep {
  /** 主网格刻度（带数字） */
  major: number;
  /** 次网格刻度（细分线） */
  minor: number;
  /** 吸附目标步长（吸附到整数倍步长）——多数情况下与 major 一致；高放大时用更小的 sub-step */
  snap: number;
}

/**
 * 根据当前缩放值选择网格分级
 * 从小到大（大视野 → 高放大）共 14 级，保证 major 线像素间距始终在 ~50~120px 之间
 */
function getGridStep(scale: number): GridStep {
  if (scale < 2)    return { major: 200, minor: 40,   snap: 50 };
  if (scale < 4)    return { major: 100, minor: 20,   snap: 20 };
  if (scale < 8)    return { major: 50,  minor: 10,   snap: 10 };
  if (scale < 16)   return { major: 20,  minor: 4,    snap: 5 };
  if (scale < 32)   return { major: 10,  minor: 2,    snap: 2 };
  if (scale < 70)   return { major: 5,   minor: 1,    snap: 1 };
  if (scale < 150)  return { major: 2,   minor: 0.4,  snap: 1 };
  if (scale < 320)  return { major: 1,   minor: 0.2,  snap: 1 };
  if (scale < 700)  return { major: 0.5, minor: 0.1,  snap: 0.5 };
  if (scale < 1500) return { major: 0.2, minor: 0.04, snap: 0.2 };
  if (scale < 3000) return { major: 0.1, minor: 0.02, snap: 0.1 };
  return              { major: 0.05,minor: 0.01, snap: 0.05 };
}

/**
 * 根据缩放值返回"吸附半径（像素）"。
 * 规则：缩放越小（看到的范围越大）吸附半径越大，让用户在全局视图中更容易对准整数点。
 * 高放大时保持适中的吸附像素半径以避免过于"粘滞"。
 */
function getSnapPixelRadius(scale: number): number {
  if (scale < 8)   return 26;   // 极小缩放：极强吸附
  if (scale < 16)  return 20;
  if (scale < 40)  return 14;
  if (scale < 120) return 10;
  if (scale < 400) return 8;
  return 6;                    // 高放大：略弱吸附，保证精细度可调
}

/**
 * 吸附到最近网格点（只在屏幕像素距离 ≤ radius 时生效，否则返回原值）
 * @param z 原始复数坐标
 * @param scale 当前画板 scale
 * @param screenPos 当前指针屏幕坐标（可选，用于像素距离判定）
 * @param complexToScreen 坐标映射函数
 */
function snapToGrid(
  z: Complex,
  scale: number,
  screenPos: { x: number; y: number },
  complexToScreen: (c: Complex) => { x: number; y: number }
): { snapped: Complex; applied: boolean } {
  const { snap } = getGridStep(scale);
  const radiusPx = getSnapPixelRadius(scale);
  // 四舍五入到 snap 的整数倍
  const reRounded = Math.round(z.re / snap) * snap;
  const imRounded = Math.round(z.im / snap) * snap;
  // 修正浮点误差（极小值视为 0）
  const fix = (n: number) => Math.abs(n) < snap * 1e-6 ? 0 : n;
  const snapped = C(fix(reRounded), fix(imRounded));
  // 像素距离判断
  const p0 = complexToScreen(z);
  const p1 = complexToScreen(snapped);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const distPx = Math.hypot(dx, dy);
  // 使用 screenPos 做二次校验：snapped 到真实指针位置的屏幕距离
  const p2 = complexToScreen(snapped);
  const dist2 = Math.hypot(p2.x - screenPos.x, p2.y - screenPos.y);
  const dist = Math.min(distPx, dist2);
  const applied = dist <= radiusPx && Number.isFinite(snapped.re) && Number.isFinite(snapped.im);
  return { snapped: applied ? snapped : z, applied };
}

/* ==========  组件主体  ========== */
export default function ComplexPlane({
  planeType,
  label,
  planeState,
  setPlaneState,
  paths,
  selectedPoint,
  onHover,
  onClickPoint,
  onDrawComplete,
  onPreviewChange,
  activeTool = 'select',
  tempPoints: externalTemp,
  tempColor: externalColor,
}: ComplexPlaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 400, h: 300 });
  const hoverRef = useRef<Complex | null>(null);
  const hoverScreenRef = useRef<{ x: number; y: number } | null>(null);
  const hoverSnappedRef = useRef<{ snapped: Complex; applied: boolean } | null>(null);
  const drawingRef = useRef<DrawingState>(null);
  const [tick, setTick] = useState(0);
  const forceRerender = () => setTick((n) => n + 1);

  // 预览变化时通知父组件（用于同步预览到 w 平面）
  // 注意：必须传数组副本，否则 free 模式复用同一 d.points 引用，
  // 父组件 setPreviewZ(同引用) 不触发重渲染，w 平面预览不会更新
  useEffect(() => {
    if (!onPreviewChange) return;
    const preview = getInternalPreview();
    onPreviewChange(preview ? preview.points.slice() : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize({ w, h });
      if (canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = w * dpr;
        canvasRef.current.height = h * dpr;
        canvasRef.current.style.width = `${w}px`;
        canvasRef.current.style.height = `${h}px`;
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const screenToComplex = useCallback(
    (px: number, py: number): Complex => {
      const { w, h } = size;
      const { re: cx, im: cy } = planeState.center;
      const s = planeState.scale;
      return C(cx + (px - w / 2) / s, cy - (py - h / 2) / s);
    },
    [size, planeState]
  );

  const complexToScreen = useCallback(
    (z: Complex) => {
      const { w, h } = size;
      const { re: cx, im: cy } = planeState.center;
      const s = planeState.scale;
      return {
        x: (z.re - cx) * s + w / 2,
        y: -(z.im - cy) * s + h / 2,
      };
    },
    [size, planeState]
  );

  const interpolateLine = (a: Complex, b: Complex, N = 120): Complex[] => {
    const arr: Complex[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      arr.push(C(a.re + (b.re - a.re) * t, a.im + (b.im - a.im) * t));
    }
    return arr;
  };
  const interpolateRect = (a: Complex, b: Complex, N = 160): Complex[] => {
    const p1 = a, p2 = C(b.re, a.im), p3 = b, p4 = C(a.re, b.im);
    const n = Math.ceil(N / 4);
    return [
      ...interpolateLine(p1, p2, n),
      ...interpolateLine(p2, p3, n).slice(1),
      ...interpolateLine(p3, p4, n).slice(1),
      ...interpolateLine(p4, p1, n).slice(1),
    ];
  };
  const interpolateArc = (center: Complex, start: Complex, end: Complex, N = 240): Complex[] => {
    const R1 = Math.hypot(start.re - center.re, start.im - center.im);
    const a1 = Math.atan2(start.im - center.im, start.re - center.re);
    const a2 = Math.atan2(end.im - center.im, end.re - center.re);
    const R = R1 || Math.hypot(end.re - center.re, end.im - center.im) || 1;
    let diff = a2 - a1;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    const arr: Complex[] = [];
    for (let i = 0; i <= N; i++) {
      const a = a1 + diff * (i / N);
      arr.push(C(center.re + R * Math.cos(a), center.im + R * Math.sin(a)));
    }
    return arr;
  };
  const interpolateFullCircle = (center: Complex, R: number, N = 260): Complex[] => {
    const arr: Complex[] = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      arr.push(C(center.re + R * Math.cos(a), center.im + R * Math.sin(a)));
    }
    return arr;
  };

  /** 给 z 平面的"锚点"（选点、起点、圆心等）做坐标+吸附封装 */
  function pickPoint(px: number, py: number): { z: Complex; snapped: boolean } {
    const raw = screenToComplex(px, py);
    if (planeType !== 'z') return { z: raw, snapped: false };
    const res = snapToGrid(raw, planeState.scale, { x: px, y: py }, complexToScreen);
    return { z: res.snapped, snapped: res.applied };
  }

  function getInternalPreview(): { points: Complex[]; color: string; markers: Complex[] } | null {
    if (planeType !== 'z') return null;
    const d = drawingRef.current;
    if (!d) return null;
    const COLOR = '#fbbf24';

    if (d.mode === 'free' && d.points.length > 0) {
      return { points: d.points, color: COLOR, markers: [] };
    }
    if (d.mode === 'line' && d.start && d.pending) {
      return {
        points: interpolateLine(d.start, d.pending, 100),
        color: COLOR,
        markers: [d.start],
      };
    }
    if (d.mode === 'rect' && d.start && d.pending) {
      return {
        points: interpolateRect(d.start, d.pending, 120),
        color: COLOR,
        markers: [d.start],
      };
    }
    if (d.mode === 'arc' && d.arcStage === 0 && d.arcCenter && d.pending) {
      const R = Math.hypot(d.pending.re - d.arcCenter.re, d.pending.im - d.arcCenter.im);
      return {
        points: interpolateFullCircle(d.arcCenter, R, 200),
        color: COLOR,
        markers: [d.arcCenter],
      };
    }
    if (d.mode === 'arc' && d.arcStage === 1 && d.arcCenter && d.arcStart) {
      const end = d.pending ?? d.arcStart;
      return {
        points: interpolateArc(d.arcCenter, d.arcStart, end, 180),
        color: COLOR,
        markers: [d.arcCenter, d.arcStart],
      };
    }
    if (d.mode === 'arc' && d.arcStage === 2 && d.arcCenter && d.arcStart && d.pending) {
      return {
        points: interpolateArc(d.arcCenter, d.arcStart, d.pending, 200),
        color: COLOR,
        markers: [d.arcCenter, d.arcStart],
      };
    }
    const markers: Complex[] = [];
    if (d.mode === 'line' && d.start) markers.push(d.start);
    if (d.mode === 'arc' && d.arcCenter) markers.push(d.arcCenter);
    if (d.mode === 'arc' && d.arcStart) markers.push(d.arcStart);
    if (markers.length > 0) return { points: [], color: COLOR, markers };
    return null;
  }

  /* =====  绘制：网格/轴/路径/点/吸附标记  ===== */
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    const { w, h } = size;

    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, w, h);
    drawAxes(ctx, w, h);

    for (const path of paths) drawPath(ctx, path.points, path.color, 2.2);

    const internal = getInternalPreview();
    if (internal) {
      if (internal.points.length > 0) drawPath(ctx, internal.points, internal.color, 2, 0.92, true);
      for (const m of internal.markers) drawMarkerDot(ctx, m, internal.color);
    } else if (externalTemp && externalTemp.length > 0 && externalColor) {
      drawPath(ctx, externalTemp, externalColor, 2, 0.85, true);
    }

    if (selectedPoint) {
      drawPoint(ctx, selectedPoint, planeType === 'z' ? '#00d4ff' : '#a855f7', 7);
    }

    // 吸附视觉反馈：z 平面 + 指针在画板内 + 吸附生效时
    if (planeType === 'z' && hoverRef.current && hoverScreenRef.current && hoverSnappedRef.current?.applied) {
      drawSnapHint(
        ctx,
        hoverScreenRef.current,
        complexToScreen(hoverSnappedRef.current.snapped),
        hoverSnappedRef.current.snapped
      );
    } else if (planeType === 'z' && hoverRef.current && hoverScreenRef.current) {
      // 没吸附：普通准星
      drawCrosshair(ctx, hoverRef.current, '#ffffff4d');
    }

    ctx.restore();
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const s = planeState.scale;
    const cx = planeState.center.re;
    const cy = planeState.center.im;
    const { major, minor } = getGridStep(s);

    const leftR = cx - w / 2 / s;
    const rightR = cx + w / 2 / s;
    const topI = cy + h / 2 / s;
    const botI = cy - h / 2 / s;

    // 次网格
    if (minor > 0) {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.22)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      const sr0 = Math.floor(leftR / minor) * minor;
      for (let r = sr0; r <= rightR; r += minor) {
        const p = complexToScreen(C(r, 0));
        ctx.moveTo(p.x, 0); ctx.lineTo(p.x, h);
      }
      const si0 = Math.floor(botI / minor) * minor;
      for (let i = si0; i <= topI; i += minor) {
        const p = complexToScreen(C(0, i));
        ctx.moveTo(0, p.y); ctx.lineTo(w, p.y);
      }
      ctx.stroke();
    }

    // 主网格
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    const sr2 = Math.floor(leftR / major) * major;
    for (let r = sr2; r <= rightR; r += major) {
      const p = complexToScreen(C(r, 0));
      ctx.moveTo(p.x, 0); ctx.lineTo(p.x, h);
    }
    const si2 = Math.floor(botI / major) * major;
    for (let i = si2; i <= topI; i += major) {
      const p = complexToScreen(C(0, i));
      ctx.moveTo(0, p.y); ctx.lineTo(w, p.y);
    }
    ctx.stroke();

    // 刻度文字（高放大时显示更多小数位，低缩放下简写 K）
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    const originPx = complexToScreen(C(0, 0));
    const fmtNum = (n: number) => {
      if (major >= 1) {
        return Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(/\.?0+$/, '');
      }
      const digits = Math.ceil(-Math.log10(major)) + 1;
      const str = n.toFixed(Math.max(0, digits));
      return str.replace(/\.?0+$/, '') || '0';
    };
    ctx.textAlign = 'start';
    ctx.textBaseline = 'top';
    for (let r = sr2; r <= rightR; r += major) {
      if (Math.abs(r) < major * 1e-6) continue;
      const p = complexToScreen(C(r, 0));
      ctx.fillText(fmtNum(r), p.x + 3, Math.min(Math.max(originPx.y + 4, 2), h - 14));
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    for (let i = si2; i <= topI; i += major) {
      if (Math.abs(i) < major * 1e-6) continue;
      const p = complexToScreen(C(0, i));
      const xPos = Math.max(Math.min(originPx.x - 4, w - 4), 30);
      ctx.fillText(`${fmtNum(i)}i`, xPos, p.y + 4);
    }
  }

  function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const o = complexToScreen(C(0, 0));
    // 实轴
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, o.y); ctx.lineTo(w, o.y);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(w - 2, o.y - 5); ctx.lineTo(w + 8, o.y); ctx.lineTo(w - 2, o.y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillText('Re', Math.max(w - 30, 10), o.y + 16);
    // 虚轴
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(o.x, h); ctx.lineTo(o.x, 0);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(o.x - 5, 2); ctx.lineTo(o.x, -8); ctx.lineTo(o.x + 5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillText('Im', Math.min(o.x + 6, w - 28), 10);
    // 原点
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(o.x, o.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('O', o.x + 6, o.y + 14);
  }

  function drawPath(
    ctx: CanvasRenderingContext2D,
    pts: Complex[],
    color: string,
    width: number,
    alpha = 1,
    dashed = false
  ) {
    if (pts.length < 2) {
      if (pts.length === 1) {
        const p = complexToScreen(pts[0]);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, width, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) ctx.setLineDash([7, 5]);
    let started = false;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const z = pts[i];
      const bad = !Number.isFinite(z.re) || !Number.isFinite(z.im);
      if (bad) {
        if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
        continue;
      }
      const p = complexToScreen(z);
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    if (started) ctx.stroke();
    ctx.restore();
  }

  function drawPoint(
    ctx: CanvasRenderingContext2D,
    z: Complex,
    color: string,
    r: number
  ) {
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
    const p = complexToScreen(z);
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
    grd.addColorStop(0, color + 'cc');
    grd.addColorStop(1, color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawMarkerDot(ctx: CanvasRenderingContext2D, z: Complex, color: string) {
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
    const p = complexToScreen(z);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 18);
    grd.addColorStop(0, color + '55');
    grd.addColorStop(1, color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCrosshair(ctx: CanvasRenderingContext2D, z: Complex, color: string) {
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
    const p = complexToScreen(z);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(p.x - 12, p.y); ctx.lineTo(p.x - 4, p.y);
    ctx.moveTo(p.x + 4, p.y); ctx.lineTo(p.x + 12, p.y);
    ctx.moveTo(p.x, p.y - 12); ctx.lineTo(p.x, p.y - 4);
    ctx.moveTo(p.x, p.y + 4); ctx.lineTo(p.x, p.y + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffffff55';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** 吸附提示：绿色目标点 + 从指针位置拉一条虚线 */
  function drawSnapHint(
    ctx: CanvasRenderingContext2D,
    pointerScreen: { x: number; y: number },
    targetScreen: { x: number; y: number },
    targetZ: Complex
  ) {
    ctx.save();
    // 虚线连接指针位置 → 吸附目标
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pointerScreen.x, pointerScreen.y);
    ctx.lineTo(targetScreen.x, targetScreen.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 吸附目标（绿色正方形/点）
    const p = targetScreen;
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 20);
    grd.addColorStop(0, 'rgba(34,197,94,0.55)');
    grd.addColorStop(1, 'rgba(34,197,94,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // 小菱形（吸附标记）
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 6);
    ctx.lineTo(p.x + 6, p.y);
    ctx.lineTo(p.x, p.y + 6);
    ctx.lineTo(p.x - 6, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 吸附值 tooltip
    const fmt = (n: number) => {
      const { major } = getGridStep(planeState.scale);
      const digits = Math.max(0, Math.ceil(-Math.log10(Math.max(major, 1e-9))) + 1);
      return n.toFixed(digits).replace(/\.?0+$/, '') || '0';
    };
    const label = `${fmt(targetZ.re)}, ${fmt(targetZ.im)}i`;
    ctx.font = '10.5px "JetBrains Mono", monospace';
    const metrics = ctx.measureText(label);
    const pad = 5;
    const tw = metrics.width + pad * 2;
    const th = 18;
    let tx = p.x + 10;
    let ty = p.y + 10;
    if (tx + tw > size.w) tx = p.x - 10 - tw;
    if (ty + th > size.h) ty = p.y - 10 - th;
    // bubble
    ctx.fillStyle = 'rgba(15, 118, 110, 0.92)';
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1;
    const rr = 4;
    ctx.beginPath();
    ctx.moveTo(tx + rr, ty);
    ctx.lineTo(tx + tw - rr, ty);
    ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + rr);
    ctx.lineTo(tx + tw, ty + th - rr);
    ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - rr, ty + th);
    ctx.lineTo(tx + rr, ty + th);
    ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - rr);
    ctx.lineTo(tx, ty + rr);
    ctx.quadraticCurveTo(tx, ty, tx + rr, ty);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ecfeff';
    ctx.fillText(label, tx + pad, ty + 12.5);
    ctx.restore();
  }

  draw();

  /* =====  交互：缩放  ===== */
  function handleWheel(e: React.WheelEvent) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = screenToComplex(mx, my);
    const factor = e.deltaY < 0 ? ZOOM_IN : 1 / ZOOM_IN;
    const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, planeState.scale * factor));
    const { w, h } = size;
    const newCx = before.re - (mx - w / 2) / newScale;
    const newCy = before.im + (my - h / 2) / newScale;
    setPlaneState({
      scale: newScale,
      center: C(newCx, newCy),
    });
  }

  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  function getPos(e: React.PointerEvent) {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!canvasRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);

    if (e.button === 1 || e.shiftKey) {
      isPanningRef.current = true;
      panStartRef.current = {
        x, y,
        cx: planeState.center.re,
        cy: planeState.center.im,
      };
      return;
    }

    if (planeType !== 'z') return;
    const d = drawingRef.current;
    const { z } = pickPoint(x, y);

    if (activeTool === 'select') {
      onClickPoint?.(z);
    } else if (activeTool === 'free') {
      drawingRef.current = {
        mode: 'free', start: z, points: [z], pending: z,
        arcStage: 0, arcCenter: null, arcStart: null,
      };
    } else if (activeTool === 'line') {
      if (!d || d.mode !== 'line' || d.start == null) {
        drawingRef.current = {
          mode: 'line', start: z, points: [], pending: z,
          arcStage: 0, arcCenter: null, arcStart: null,
        };
      } else {
        onDrawComplete?.(interpolateLine(d.start, z, 140));
        drawingRef.current = null;
      }
    } else if (activeTool === 'arc') {
      if (!d || d.mode !== 'arc') {
        drawingRef.current = {
          mode: 'arc', start: null, points: [], pending: z,
          arcStage: 0, arcCenter: z, arcStart: null,
        };
      } else if (d.arcStage === 0) {
        d.arcCenter = z;
        d.arcStage = 1;
      } else if (d.arcStage === 1) {
        d.arcStart = z;
        d.arcStage = 2;
      } else {
        const c = d.arcCenter!;
        const s = d.arcStart!;
        onDrawComplete?.(interpolateArc(c, s, z, 260));
        drawingRef.current = null;
      }
    } else if (activeTool === 'rect') {
      drawingRef.current = {
        mode: 'rect', start: z, points: [], pending: z,
        arcStage: 0, arcCenter: null, arcStart: null,
      };
    }
    forceRerender();
  }

  function handlePointerMove(e: React.PointerEvent) {
    const { x, y } = getPos(e);
    hoverScreenRef.current = { x, y };
    const raw = screenToComplex(x, y);

    // 吸附（用于显示视觉反馈 + 把吸附结果传给 pending）
    const snapRes = snapToGrid(raw, planeState.scale, { x, y }, complexToScreen);
    hoverSnappedRef.current = snapRes;
    hoverRef.current = raw;
    onHover?.(raw);

    if (isPanningRef.current && panStartRef.current) {
      const dx = x - panStartRef.current.x;
      const dy = y - panStartRef.current.y;
      const s = planeState.scale;
      setPlaneState({
        center: C(
          panStartRef.current.cx - dx / s,
          panStartRef.current.cy + dy / s
        ),
      });
      return;
    }
    if (planeType !== 'z' || !drawingRef.current) {
      forceRerender();
      return;
    }
    const dd = drawingRef.current;
    // 用于预览的 pending 值采用吸附后的值，让预览线看起来是对齐网格的
    dd.pending = snapRes.snapped;

    if (dd.mode === 'free' && dd.points.length > 0) {
      const prev = dd.points[dd.points.length - 1];
      const distSq = (prev.re - raw.re) ** 2 + (prev.im - raw.im) ** 2;
      const threshold = (1 / planeState.scale) ** 2 * 9;
      if (distSq >= threshold) dd.points.push(raw);
    }
    forceRerender();
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      return;
    }
    if (planeType !== 'z' || !drawingRef.current) return;
    const { x, y } = getPos(e);
    const d = drawingRef.current;
    const { z: up } = pickPoint(x, y);

    if (d.mode === 'free') {
      if (d.points.length >= 2) onDrawComplete?.(d.points);
      drawingRef.current = null;
    } else if (d.mode === 'rect' && d.start) {
      onDrawComplete?.(interpolateRect(d.start, up, 200));
      drawingRef.current = null;
    } else if (d.mode === 'line' && d.start) {
      const sp = complexToScreen(d.start);
      if (Math.hypot(x - sp.x, y - sp.y) > 8) {
        onDrawComplete?.(interpolateLine(d.start, up, 140));
        drawingRef.current = null;
      }
    }
    forceRerender();
  }

  useEffect(() => {
    drawingRef.current = null;
    forceRerender();
  }, [activeTool]);

  const stageHint = (() => {
    if (planeType !== 'z' || activeTool === 'select') return null;
    const d = drawingRef.current;
    if (activeTool === 'free') return '自由绘制 · 拖拽中…';
    if (activeTool === 'line') return d?.start ? '直线 · 点击第2点 / 拖动释放' : '直线 · 点击起点（自动吸附刻度）';
    if (activeTool === 'arc') {
      const stage = d?.arcStage ?? 0;
      return `圆弧 · ${['点击确定圆心（吸附）', '点击确定起点(半径)', '点击扫掠终点确定圆弧'][stage]}`;
    }
    if (activeTool === 'rect') return '矩形 · 按住拖动对角两点';
    return null;
  })();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl border border-deep-600 bg-deep-800 overflow-hidden shadow-[0_0_0_1px_rgba(0,212,255,0.08),0_10px_30px_-10px_rgba(0,0,0,0.8)]"
    >
      <div className="absolute top-3 left-3 right-24 z-10 flex items-center gap-2 flex-wrap">
        <div className="px-3 py-1 rounded-md bg-deep-900/80 backdrop-blur border border-deep-600 text-xs font-display tracking-wider flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: planeType === 'z' ? '#00d4ff' : '#a855f7',
              boxShadow: `0 0 10px ${planeType === 'z' ? '#00d4ff' : '#a855f7'}`,
            }}
          />
          <span className="text-slate-200">{label}</span>
        </div>
        {stageHint && (
          <div className="px-2.5 py-1 rounded-md bg-yellow-500/15 border border-yellow-500/40 text-[11px] text-yellow-200 font-medium animate-fade-in">
            ✎ {stageHint}
          </div>
        )}
        <div className="px-2 py-0.5 rounded-md bg-deep-900/60 border border-deep-600/60 text-[10px] text-slate-500 font-mono">
          1 单位 = {planeState.scale < 10
            ? planeState.scale.toFixed(2)
            : planeState.scale.toFixed(1)} px
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button
          type="button"
          onClick={() => setPlaneState({ scale: Math.max(SCALE_MIN, planeState.scale * ZOOM_OUT) })}
          className="w-7 h-7 rounded bg-deep-900/80 border border-deep-600 text-slate-300 hover:bg-deep-700 hover:text-cyan-glow text-sm transition"
          title={`缩小（最小 ${SCALE_MIN}）`}
        >−</button>
        <button
          type="button"
          onClick={() => setPlaneState({ center: C(0, 0), scale: 60 })}
          className="px-2 h-7 rounded bg-deep-900/80 border border-deep-600 text-slate-300 hover:bg-deep-700 hover:text-cyan-glow text-[11px] transition"
          title="重置视口"
        >⌂1</button>
        <button
          type="button"
          onClick={() => setPlaneState({ scale: Math.min(SCALE_MAX, planeState.scale * ZOOM_IN) })}
          className="w-7 h-7 rounded bg-deep-900/80 border border-deep-600 text-slate-300 hover:bg-deep-700 hover:text-cyan-glow text-sm transition"
          title={`放大（最大 ${SCALE_MAX}）`}
        >+</button>
      </div>

      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(e) => handlePointerUp(e)}
        onPointerLeave={() => {
          isPanningRef.current = false;
          panStartRef.current = null;
          hoverRef.current = null;
          hoverScreenRef.current = null;
          hoverSnappedRef.current = null;
          onHover?.(null);
          forceRerender();
        }}
        style={{
          cursor: planeType === 'z'
            ? (isPanningRef.current ? 'grabbing' : activeTool === 'select' ? 'crosshair' : 'cell')
            : 'crosshair',
        }}
        className="block w-full h-full"
      />
    </div>
  );
}
