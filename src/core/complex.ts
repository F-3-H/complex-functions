// 复数数据类型
export interface Complex {
  re: number;
  im: number;
}

export const C = (re: number, im = 0): Complex => ({ re, im });

// ===== 基础运算 =====
export const add = (a: Complex, b: Complex): Complex => C(a.re + b.re, a.im + b.im);
export const sub = (a: Complex, b: Complex): Complex => C(a.re - b.re, a.im - b.im);
export const mul = (a: Complex, b: Complex): Complex =>
  C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);

export const div = (a: Complex, b: Complex): Complex => {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return C(NaN, NaN);
  return C(
    (a.re * b.re + a.im * b.im) / denom,
    (a.im * b.re - a.re * b.im) / denom
  );
};

export const neg = (a: Complex): Complex => C(-a.re, -a.im);
export const conj = (a: Complex): Complex => C(a.re, -a.im);
export const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
export const abs = (a: Complex): number => Math.sqrt(abs2(a));
export const arg = (a: Complex): number => Math.atan2(a.im, a.re);

// ===== 指数 / 对数 / 幂 =====
export const exp = (a: Complex): Complex => {
  const r = Math.exp(a.re);
  return C(r * Math.cos(a.im), r * Math.sin(a.im));
};

export const log = (a: Complex): Complex => {
  if (a.re === 0 && a.im === 0) return C(-Infinity, 0);
  return C(Math.log(abs(a)), arg(a));
};

export const pow = (base: Complex, exponent: Complex | number): Complex => {
  if (typeof exponent === 'number') {
    // 整数幂快速路径
    if (Number.isInteger(exponent)) {
      let e = exponent;
      if (e < 0) return div(C(1), pow(base, -e));
      let result = C(1);
      let b = base;
      while (e > 0) {
        if ((e & 1) === 1) result = mul(result, b);
        e >>= 1;
        if (e > 0) b = mul(b, b);
      }
      return result;
    }
    exponent = C(exponent, 0);
  }
  // z^w = exp(w * log(z))
  if (base.re === 0 && base.im === 0) return C(0);
  return exp(mul(exponent, log(base)));
};

export const sqrt = (a: Complex): Complex => {
  if (a.im === 0) {
    if (a.re >= 0) return C(Math.sqrt(a.re), 0);
    return C(0, Math.sqrt(-a.re));
  }
  const r = abs(a);
  const re = Math.sqrt((r + a.re) / 2);
  const im = (a.im >= 0 ? 1 : -1) * Math.sqrt((r - a.re) / 2);
  return C(re, im);
};

// ===== 三角函数 =====
export const sin = (a: Complex): Complex => {
  // sin(x+iy) = sin(x)cosh(y) + i cos(x)sinh(y)
  return C(
    Math.sin(a.re) * Math.cosh(a.im),
    Math.cos(a.re) * Math.sinh(a.im)
  );
};

export const cos = (a: Complex): Complex =>
  C(
    Math.cos(a.re) * Math.cosh(a.im),
    -Math.sin(a.re) * Math.sinh(a.im)
  );

export const tan = (a: Complex): Complex => div(sin(a), cos(a));

export const sinh = (a: Complex): Complex =>
  C(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im));

export const cosh = (a: Complex): Complex =>
  C(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im));

// ===== 格式化输出 =====
export const format = (a: Complex, digits = 4): string => {
  if (!Number.isFinite(a.re) || !Number.isFinite(a.im)) return '∞(发散)';
  const reStr = a.re.toFixed(digits).replace(/\.?0+$/, '');
  const imAbsStr = Math.abs(a.im).toFixed(digits).replace(/\.?0+$/, '');
  const imSign = a.im >= 0 ? '+' : '-';
  if (imAbsStr === '0') return reStr || '0';
  if (reStr === '0') return `${a.im < 0 ? '-' : ''}${imAbsStr === '1' ? '' : imAbsStr}i`;
  return `${reStr} ${imSign} ${imAbsStr === '1' ? '' : imAbsStr}i`;
};

// 线性插值
export const lerp = (a: Complex, b: Complex, t: number): Complex =>
  C(a.re + (b.re - a.re) * t, a.im + (b.im - a.im) * t);
