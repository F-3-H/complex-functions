import type { Complex } from './complex';
import * as CX from './complex';

export interface Preset {
  name: string;
  expr: string;
  description: string;
  fn: (z: Complex) => Complex;
}

export const PRESETS: Preset[] = [
  {
    name: 'z²',
    expr: 'z^2',
    description: '平方映射：将辐角加倍，模长平方',
    fn: (z) => CX.pow(z, 2),
  },
  {
    name: 'z³',
    expr: 'z^3',
    description: '立方映射：辐角三倍，模长立方',
    fn: (z) => CX.pow(z, 3),
  },
  {
    name: 'e^z',
    expr: 'exp(z)',
    description: '指数函数：水平带→扇形区域',
    fn: (z) => CX.exp(z),
  },
  {
    name: 'sin(z)',
    expr: 'sin(z)',
    description: '复正弦：周期函数',
    fn: (z) => CX.sin(z),
  },
  {
    name: 'cos(z)',
    expr: 'cos(z)',
    description: '复余弦',
    fn: (z) => CX.cos(z),
  },
  {
    name: '1/z',
    expr: '1/z',
    description: '反演变换：关于单位圆反演+实轴对称',
    fn: (z) => CX.div(CX.C(1), z),
  },
  {
    name: 'log(z)',
    expr: 'log(z)',
    description: '主值对数：扇形→水平带（有支割）',
    fn: (z) => CX.log(z),
  },
  {
    name: '√z',
    expr: 'sqrt(z)',
    description: '平方根主值',
    fn: (z) => CX.sqrt(z),
  },
  {
    name: 'z + 1/z',
    expr: 'z + 1/z',
    description: 'Joukowski映射：圆→翼型',
    fn: (z) => CX.add(z, CX.div(CX.C(1), z)),
  },
  {
    name: 'z² + z',
    expr: 'z^2 + z',
    description: '二次多项式映射',
    fn: (z) => CX.add(CX.pow(z, 2), z),
  },
  {
    name: '1/z²',
    expr: '1/z^2',
    description: '二次反演',
    fn: (z) => CX.div(CX.C(1), CX.pow(z, 2)),
  },
  {
    name: 'z̄',
    expr: 'conj(z)',
    description: '复共轭：关于实轴对称',
    fn: (z) => CX.conj(z),
  },
];

export const DEFAULT_PRESET = PRESETS[0];

// 轨迹颜色循环
export const PATH_COLORS = [
  '#f97316', // orange
  '#a855f7', // purple
  '#00d4ff', // cyan
  '#ec4899', // pink
  '#eab308', // yellow
  '#22c55e', // green
  '#f43f5e', // rose
  '#38bdf8', // sky
];
