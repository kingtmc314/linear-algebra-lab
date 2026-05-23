// ============================================================
// Rational Arithmetic — Exact fraction computation
// Represents numbers as { n: numerator, d: denominator }
// All operations preserve exactness with no floating-point drift
// ============================================================

export interface Rational {
  n: bigint; // numerator
  d: bigint; // denominator (always > 0)
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Create a reduced rational from numerator and denominator */
export function rat(n: bigint | number, d: bigint | number = 1): Rational {
  const bn = BigInt(typeof n === "number" ? Math.round(n) : n);
  const bd = BigInt(typeof d === "number" ? Math.round(d) : d);
  if (bd === 0n) throw new Error("Denominator cannot be zero");
  const g = gcd(bn < 0n ? -bn : bn, bd < 0n ? -bd : bd);
  const sign = bd < 0n ? -1n : 1n;
  return { n: (sign * bn) / g, d: (sign * bd) / g };
}

/** Convert a floating-point number to a Rational (best approximation) */
export function fromFloat(x: number, maxDenom = 10000): Rational {
  if (!isFinite(x)) return rat(x >= 0 ? 1 : -1, 0);
  if (Math.abs(x) < 1e-12) return rat(0n);
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  // Stern-Brocot / continued fraction approximation
  let a = 0n, b = 1n, c = 1n, d = 0n;
  for (let i = 0; i < 100; i++) {
    const m = a + c;
    const n2 = b + d;
    const mid = Number(m) / Number(n2);
    if (Math.abs(mid - x) < 1e-12 || Number(n2) > maxDenom) {
      // pick closer of b/d or m/n2
      const errLeft = Math.abs(Number(a) / Number(b) - x);
      const errMid = Math.abs(mid - x);
      const errRight = Math.abs(Number(c) / Number(d === 0n ? 1n : d) - x);
      if (errMid <= errLeft && errMid <= errRight) {
        return rat(BigInt(sign) * m, n2);
      }
      if (errLeft <= errRight) {
        return rat(BigInt(sign) * a, b);
      }
      return rat(BigInt(sign) * c, d === 0n ? 1n : d);
    }
    if (mid < x) { a = m; b = n2; }
    else { c = m; d = n2; }
  }
  return rat(BigInt(sign) * (a + c), b + d);
}

export function add(p: Rational, q: Rational): Rational {
  return rat(p.n * q.d + q.n * p.d, p.d * q.d);
}

export function sub(p: Rational, q: Rational): Rational {
  return rat(p.n * q.d - q.n * p.d, p.d * q.d);
}

export function mul(p: Rational, q: Rational): Rational {
  return rat(p.n * q.n, p.d * q.d);
}

export function div(p: Rational, q: Rational): Rational {
  if (q.n === 0n) throw new Error("Division by zero");
  return rat(p.n * q.d, p.d * q.n);
}

export function neg(p: Rational): Rational {
  return { n: -p.n, d: p.d };
}

export function isZero(p: Rational): boolean {
  return p.n === 0n;
}

export function toNumber(p: Rational): number {
  return Number(p.n) / Number(p.d);
}

/** Format a Rational as LaTeX string */
export function ratToLatex(p: Rational): string {
  if (p.n === 0n) return "0";
  if (p.d === 1n) return p.n.toString();
  if (p.n < 0n) return `-\\frac{${(-p.n).toString()}}{${p.d.toString()}}`;
  return `\\frac{${p.n.toString()}}{${p.d.toString()}}`;
}

/** Format a Rational as plain string (for descriptions) */
export function ratToStr(p: Rational): string {
  if (p.n === 0n) return "0";
  if (p.d === 1n) return p.n.toString();
  return `${p.n}/${p.d}`;
}

export type RatMatrix = Rational[][];

/** Convert a number[][] to RatMatrix */
export function toRatMatrix(M: number[][]): RatMatrix {
  return M.map((row) => row.map((v) => fromFloat(v)));
}

/** Convert a RatMatrix to number[][] */
export function fromRatMatrix(M: RatMatrix): number[][] {
  return M.map((row) => row.map(toNumber));
}

/** Format a RatMatrix row as LaTeX cells */
export function ratRowToLatex(row: Rational[]): string {
  return row.map(ratToLatex).join(" & ");
}

/** Format augmented RatMatrix as LaTeX */
export function ratAugLatex(aug: RatMatrix, n: number): string {
  const rows = aug.map((row) => {
    const left = row.slice(0, n).map(ratToLatex).join(" & ");
    const right = ratToLatex(row[n]);
    return `${left} & ${right}`;
  });
  const cols = "c".repeat(n) + "|c";
  return `\\left[\\begin{array}{${cols}} ${rows.join(" \\\\ ")} \\end{array}\\right]`;
}

/** Format a square RatMatrix as LaTeX bmatrix */
export function ratMatLatex(M: RatMatrix, bracket: "b" | "p" | "v" = "b"): string {
  const rows = M.map((row) => row.map(ratToLatex).join(" & ")).join(" \\\\ ");
  return `\\begin{${bracket}matrix} ${rows} \\end{${bracket}matrix}`;
}
