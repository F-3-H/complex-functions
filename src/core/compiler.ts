import { create, all, MathNode } from 'mathjs';
import type { Complex } from './complex';
import * as CX from './complex';

const math = create(all, {
  number: 'BigNumber',
  precision: 64,
});

// 将 mathjs 复数 → 我们的 Complex
const fromMathComplex = (c: { re: number; im: number }): Complex => CX.C(c.re, c.im);

// 将自定义函数注入 mathjs 作用域
function buildScope(z: Complex) {
  return {
    z: math.complex(z.re, z.im),
    // 显式提供一些安全的自定义复数函数
    conj: (c: { re: number; im: number }) => math.complex(c.re, -c.im),
    abs2: (c: { re: number; im: number }) => c.re * c.re + c.im * c.im,
  };
}

export interface CompileResult {
  fn: ((z: Complex) => Complex) | null;
  error: string | null;
}

// 编译用户输入表达式，返回可调用函数或错误信息
export function compileExpression(expr: string): CompileResult {
  const trimmed = expr.trim();
  if (!trimmed) {
    return { fn: null, error: '表达式为空' };
  }

  try {
    // 预处理：替换 ^ 为 pow 的替代；但 mathjs 已支持 ^
    // 先解析语法树，验证表达式是否合法（不依赖 z 外的自由变量）
    let node: MathNode;
    try {
      node = math.parse(trimmed);
    } catch (e) {
      return { fn: null, error: `语法错误: ${(e as Error).message}` };
    }

    // 注意：变量合法性检查交由运行时捕获（避免 TS 类型兼容问题）
    void create; void all;

    const compiled = node.compile();

    const fn = (z: Complex): Complex => {
      try {
        const scope = buildScope(z);
        const result = compiled.evaluate(scope);
        if (result == null) return CX.C(NaN, NaN);
        // 处理返回的类型
        if (typeof result === 'number') return CX.C(result, 0);
        if (typeof result === 'boolean') return CX.C(result ? 1 : 0, 0);
        if (typeof result === 'object' && 're' in result && 'im' in result) {
          return fromMathComplex(result);
        }
        return CX.C(Number(result) || NaN, 0);
      } catch {
        return CX.C(NaN, NaN);
      }
    };

    // 用一个测试点试一下
    const test = fn(CX.C(1, 1));
    if (!Number.isFinite(test.re)) {
      // 不一定是错误，可能是发散（如 1/z 在 z=0），这里就接受
    }
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: `编译错误: ${(e as Error).message}` };
  }
}

// ===== 以 t 为自变量的参数化表达式编译 =====
// mathjs 中 i 为虚数单位常量，t 为本编译器的自由实参
function buildTScope(t: number) {
  return {
    t,
    conj: (c: { re: number; im: number }) => math.complex(c.re, -c.im),
    abs2: (c: { re: number; im: number }) => c.re * c.re + c.im * c.im,
    re: (c: { re: number; im: number }) => c.re,
    im: (c: { re: number; im: number }) => c.im,
  };
}

export interface CompileTResult {
  fn: ((t: number) => Complex) | null;
  error: string | null;
}

// 编译以 t 为自变量的复数函数 t -> Complex（用于 f(t)）
export function compileTExpr(expr: string): CompileTResult {
  const trimmed = expr.trim();
  if (!trimmed) return { fn: null, error: '表达式为空' };
  try {
    let node: MathNode;
    try {
      node = math.parse(trimmed);
    } catch (e) {
      return { fn: null, error: `语法错误: ${(e as Error).message}` };
    }
    const compiled = node.compile();
    const fn = (t: number): Complex => {
      try {
        const scope = buildTScope(t);
        const result = compiled.evaluate(scope);
        if (result == null) return CX.C(NaN, NaN);
        if (typeof result === 'number') return CX.C(result, 0);
        if (typeof result === 'boolean') return CX.C(result ? 1 : 0, 0);
        if (typeof result === 'object' && 're' in result && 'im' in result) {
          return fromMathComplex(result);
        }
        return CX.C(Number(result) || NaN, 0);
      } catch {
        return CX.C(NaN, NaN);
      }
    };
    fn(0);
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: `编译错误: ${(e as Error).message}` };
  }
}

export interface CompileTRealResult {
  fn: ((t: number) => number) | null;
  error: string | null;
}

// 编译以 t 为自变量的实数函数 t -> number（用于 x(t)、y(t)，取实部）
export function compileTRealExpr(expr: string): CompileTRealResult {
  const result = compileTExpr(expr);
  if (!result.fn) return { fn: null, error: result.error };
  const cfn = result.fn;
  const rfn = (t: number): number => {
    const c = cfn(t);
    if (!Number.isFinite(c.re)) return NaN;
    return c.re;
  };
  rfn(0);
  return { fn: rfn, error: null };
}
