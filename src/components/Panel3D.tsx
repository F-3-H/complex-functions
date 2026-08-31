import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useAppStore } from '@/store';
import type { Complex } from '@/core/complex';
import { C } from '@/core/complex';
import { RefreshCw, Move3d } from 'lucide-react';

interface CurvePoint {
  re: number;
  im: number;
  t: number;
  valid: boolean;
}

// 创建一条从原点出发的有色坐标轴
function makeAxis(dir: THREE.Vector3, color: number): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    dir,
  ]);
  const mat = new THREE.LineBasicMaterial({ color });
  return new THREE.Line(geo, mat);
}

// 创建文字标签 Sprite
function makeLabel(text: string, color: number, pos: THREE.Vector3): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,14,26,0.85)';
  ctx.fillRect(0, 0, 128, 64);
  ctx.font = 'bold 38px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.position.copy(pos);
  sp.scale.set(1.0, 0.5, 1);
  return sp;
}

function clearGroup(g: THREE.Group) {
  for (const c of g.children as THREE.Object3D[]) {
    const line = c as THREE.Line;
    line.geometry?.dispose?.();
    const mat = line.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose?.();
  }
  g.clear();
}

function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return '∞';
  return v.toFixed(3).replace(/\.?0+$/, '') || '0';
}

export default function Panel3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const curveGroupRef = useRef<THREE.Group | null>(null);
  const probeRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number>(0);
  const userInteractedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [probeT, setProbeT] = useState(0);
  const [viewVersion, setViewVersion] = useState(0);

  const {
    xFn,
    yFn,
    fTFn,
    compiledFn,
    tRange,
    wSource,
  } = useAppStore();

  // 计算曲线采样点：(Re(w), Im(w), t)
  const curve = useMemo<CurvePoint[]>(() => {
    const N = Math.max(2, Math.min(5000, tRange.samples | 0));
    const pts: CurvePoint[] = [];
    for (let i = 0; i <= N; i++) {
      const t = tRange.start + ((tRange.end - tRange.start) * i) / N;
      let w: Complex | null = null;
      try {
        if (wSource === 'ft') {
          if (fTFn) w = fTFn(t);
        } else if (xFn && yFn && compiledFn) {
          const z = C(xFn(t), yFn(t));
          w = compiledFn(z);
        }
      } catch {
        w = null;
      }
      const valid = !!w && Number.isFinite(w.re) && Number.isFinite(w.im);
      pts.push({ re: w?.re ?? NaN, im: w?.im ?? NaN, t, valid });
    }
    return pts;
  }, [xFn, yFn, fTFn, compiledFn, tRange.start, tRange.end, tRange.samples, wSource]);

  // 区间变化时重置探查 t
  useEffect(() => {
    setProbeT(tRange.start);
  }, [tRange.start, tRange.end]);

  // 当前探查点
  const probePoint = useMemo<CurvePoint>(() => {
    if (curve.length === 0)
      return { re: NaN, im: NaN, t: probeT, valid: false };
    let best = curve[0];
    let bestD = Math.abs(best.t - probeT);
    for (const p of curve) {
      const d = Math.abs(p.t - probeT);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }, [curve, probeT]);

  const probeZ = useMemo<Complex | null>(() => {
    if (wSource !== 'fz' || !xFn || !yFn) return null;
    try {
      const x = xFn(probeT);
      const y = yFn(probeT);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return C(x, y);
    } catch {
      return null;
    }
  }, [xFn, yFn, probeT, wSource]);

  // ===== 初始化 Three.js 场景 =====
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 400;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 100000);
    camera.position.set(7, 6, 7);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.addEventListener('start', () => {
      userInteractedRef.current = true;
    });
    controlsRef.current = controls;

    const axisLen = 4;
    const axes = new THREE.Group();
    axes.add(makeAxis(new THREE.Vector3(axisLen, 0, 0), 0xef4444)); // Re 红
    axes.add(makeAxis(new THREE.Vector3(0, 0, axisLen), 0x22c55e)); // Im 绿
    axes.add(makeAxis(new THREE.Vector3(0, axisLen, 0), 0x00d4ff)); // t 青
    scene.add(axes);

    scene.add(
      makeLabel('Re', 0xef4444, new THREE.Vector3(axisLen + 0.5, 0, 0))
    );
    scene.add(
      makeLabel('Im', 0x22c55e, new THREE.Vector3(0, 0, axisLen + 0.5))
    );
    scene.add(
      makeLabel('t', 0x00d4ff, new THREE.Vector3(0, axisLen + 0.5, 0))
    );

    const grid = new THREE.GridHelper(8, 16, 0x334155, 0x1e293b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    scene.add(grid);

    const curveGroup = new THREE.Group();
    scene.add(curveGroup);
    curveGroupRef.current = curveGroup;

    const probe = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    scene.add(probe);
    probeRef.current = probe;

    setReady(true);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const ww = container.clientWidth;
      const hh = container.clientHeight;
      if (ww === 0 || hh === 0) return;
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      renderer.setSize(ww, hh);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ===== 曲线更新（按 NaN 分段绘制） =====
  useEffect(() => {
    const group = curveGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!group || !camera || !controls || !ready) return;

    clearGroup(group);

    if (curve.length > 0) {
      const mat = new THREE.LineBasicMaterial({
        color: 0xa855f7,
        linewidth: 2,
      });
      const flush = (seg: THREE.Vector3[]) => {
        if (seg.length >= 2) {
          const g = new THREE.BufferGeometry().setFromPoints(seg);
          group.add(new THREE.Line(g, mat));
        }
      };
      let seg: THREE.Vector3[] = [];
      for (const p of curve) {
        if (!p.valid) {
          flush(seg);
          seg = [];
          continue;
        }
        seg.push(new THREE.Vector3(p.re, p.t, p.im));
      }
      flush(seg);
    }

    // 自适应相机视角（仅当用户未手动交互时）
    if (!userInteractedRef.current) {
      const bbox = new THREE.Box3();
      curve.forEach((p) => {
        if (p.valid)
          bbox.expandByPoint(new THREE.Vector3(p.re, p.t, p.im));
      });
      const sphere = new THREE.Sphere();
      if (!bbox.isEmpty()) {
        bbox.getBoundingSphere(sphere);
      } else {
        sphere.center.set(0, 0, 0);
        sphere.radius = 1;
      }
      const r = Math.max(0.5, sphere.radius);
      controls.target.copy(sphere.center);
      const dir = camera.position
        .clone()
        .sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0.7, 1);
      dir.normalize();
      camera.position.copy(
        sphere.center.clone().add(dir.multiplyScalar(r * 2.6))
      );
      controls.update();
    }
  }, [curve, ready, viewVersion]);

  // ===== 探查球位置 =====
  useEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    if (probePoint.valid) {
      probe.visible = true;
      probe.position.set(probePoint.re, probePoint.t, probePoint.im);
    } else {
      probe.visible = false;
    }
  }, [probePoint]);

  const resetView = () => {
    userInteractedRef.current = false;
    setViewVersion((v) => v + 1);
  };

  const w = probePoint;
  const wLabel =
    w.valid && Number.isFinite(w.re)
      ? `${fmtNum(w.re)} ${w.im >= 0 ? '+' : '−'} ${fmtNum(Math.abs(w.im))}i`
      : '∞';

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-deep-600 bg-deep-900/40">
      <div ref={containerRef} className="absolute inset-0" />

      {/* 标题与图例 */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-deep-900/85 border border-deep-600 backdrop-blur text-[10.5px] text-slate-200">
          <Move3d className="w-3 h-3 text-purple-accent" />
          <span className="font-semibold">3D 函数图</span>
          <span className="text-slate-500 mx-1">|</span>
          <span className="text-real-axis font-mono">Re</span>
          <span className="text-imag-axis font-mono">Im</span>
          <span className="text-cyan-glow font-mono">t</span>
        </div>
      </div>

      {/* 右上：重置视角 */}
      <button
        onClick={resetView}
        className="absolute right-3 top-3 z-10 px-2 py-1 rounded-md bg-deep-900/85 border border-deep-600 backdrop-blur text-[10.5px] text-slate-300 hover:text-cyan-glow hover:border-cyan-glow/50 inline-flex items-center gap-1 transition"
      >
        <RefreshCw className="w-3 h-3" /> 重置视角
      </button>

      {/* 底部：t 滑块 + 当前值 */}
      <div className="absolute left-3 right-3 bottom-3 z-10 rounded-lg bg-deep-900/85 border border-deep-600 backdrop-blur px-3 py-2 text-[10.5px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-cyan-glow font-mono font-semibold">t =</span>
          <span className="font-mono text-slate-100 tabular-nums">
            {fmtNum(probeT)}
          </span>
          <span className="text-slate-600 mx-1">·</span>
          {probeZ && (
            <>
              <span className="text-slate-500">z(t) =</span>
              <span className="font-mono text-cyan-glow tabular-nums">
                {fmtNum(probeZ.re)} {probeZ.im >= 0 ? '+' : '−'}{' '}
                {fmtNum(Math.abs(probeZ.im))}i
              </span>
            </>
          )}
          <span className="text-slate-600 mx-1">·</span>
          <span className="text-slate-500">w =</span>
          <span className="font-mono text-purple-accent tabular-nums">
            {wLabel}
          </span>
        </div>
        <input
          type="range"
          min={tRange.start}
          max={tRange.end}
          step={(tRange.end - tRange.start) / Math.max(1, tRange.samples)}
          value={probeT}
          onChange={(e) => setProbeT(parseFloat(e.target.value))}
          className="w-full accent-purple-accent"
        />
      </div>
    </div>
  );
}
