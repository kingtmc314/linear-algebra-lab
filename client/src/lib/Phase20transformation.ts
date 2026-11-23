import { add, div, mul, neg, rat, ratToLatex, sub, type Rational } from "./rational";

/** Exact expressions used only by the transformation lesson.
 * Keys are 1, sqrt(2), sqrt(3), or unevaluated trigonometric functions.
 * Decimal inputs are read literally, never recovered from a tolerance guess.
 */
export type TransformationEntry = Record<string, Rational>;
export type TransformationExactMatrix = TransformationEntry[][];
export type TransformationParams = Record<string, number>;
export type TransformationDimension = "2d" | "3d";

export function transformationDecimal(value: number): Rational {
  if (!Number.isFinite(value)) throw new Error("A finite decimal input is required");
  const [mantissa, exponent = "0"] = String(value).toLowerCase().split("e");
  const negative = mantissa.startsWith("-");
  const unsigned = mantissa.replace(/^[+-]/, "");
  const [whole, fraction = ""] = unsigned.split(".");
  const power = Number(exponent) - fraction.length;
  const numerator = BigInt(whole + fraction) * (negative ? -1n : 1n);
  return power >= 0
    ? rat(numerator * 10n ** BigInt(power))
    : rat(numerator, 10n ** BigInt(-power));
}

function scalar(value: number | Rational): TransformationEntry {
  return { "": typeof value === "number" ? transformationDecimal(value) : value };
}

function scale(entry: TransformationEntry, coefficient: Rational): TransformationEntry {
  return Object.fromEntries(Object.entries(entry).map(([symbol, value]) => [symbol, mul(value, coefficient)]));
}

function sum(...entries: TransformationEntry[]): TransformationEntry {
  const result: TransformationEntry = {};
  for (const entry of entries) {
    for (const [symbol, value] of Object.entries(entry)) {
      result[symbol] = add(result[symbol] ?? rat(0), value);
    }
  }
  return result;
}

export function transformationEntryLatex(entry: TransformationEntry): string {
  const terms = Object.entries(entry).filter(([, value]) => value.n !== 0n);
  if (terms.length === 0) return "0";
  // Constants before radicals/functions for predictable, simplified output.
  terms.sort(([a], [b]) => a.localeCompare(b));
  return terms.map(([symbol, value], index) => {
    const minus = value.n < 0n;
    const absolute = minus ? neg(value) : value;
    let term: string;
    if (!symbol) term = ratToLatex(absolute);
    else if (absolute.d === 1n) term = `${absolute.n === 1n ? "" : absolute.n}${symbol}`;
    else term = `\\frac{${absolute.n === 1n ? "" : absolute.n}${symbol}}{${absolute.d}}`;
    return `${minus ? "-" : index > 0 ? "+" : ""}${term}`;
  }).join("");
}

export function transformationMatrixLatex(matrix: TransformationExactMatrix): string {
  return `\\begin{bmatrix}${matrix.map(row => row.map(transformationEntryLatex).join(" & ")).join(" \\\\ ")}\\end{bmatrix}`;
}

export function transformationVectorLatex(vector: TransformationEntry[]): string {
  return transformationMatrixLatex(vector.map(entry => [entry]));
}

/** Match the angle itself exactly; do not infer radicals from floating-point sin/cos. */
export function transformationTrig(angle: number, fn: "sin" | "cos"): TransformationEntry {
  const input = transformationDecimal(angle);
  const period = 360n * input.d;
  const numerator = ((input.n + (fn === "cos" ? 90n * input.d : 0n)) % period + period) % period;
  const sin15 = { "\\sqrt{6}": rat(1, 4), "\\sqrt{2}": rat(-1, 4) };
  const sin75 = { "\\sqrt{6}": rat(1, 4), "\\sqrt{2}": rat(1, 4) };
  const sine: Record<number, TransformationEntry> = {
    15: sin15, 75: sin75, 105: sin75, 165: sin15,
    195: scale(sin15, rat(-1)), 255: scale(sin75, rat(-1)),
    285: scale(sin75, rat(-1)), 345: scale(sin15, rat(-1)),
    0: scalar(0), 30: scalar(rat(1, 2)), 45: { "\\sqrt{2}": rat(1, 2) },
    60: { "\\sqrt{3}": rat(1, 2) }, 90: scalar(1),
    120: { "\\sqrt{3}": rat(1, 2) }, 135: { "\\sqrt{2}": rat(1, 2) },
    150: scalar(rat(1, 2)), 180: scalar(0), 210: scalar(rat(-1, 2)),
    225: { "\\sqrt{2}": rat(-1, 2) }, 240: { "\\sqrt{3}": rat(-1, 2) },
    270: scalar(-1), 300: { "\\sqrt{3}": rat(-1, 2) },
    315: { "\\sqrt{2}": rat(-1, 2) }, 330: scalar(rat(-1, 2)),
  };
  if (numerator % input.d === 0n && sine[Number(numerator / input.d)]) return sine[Number(numerator / input.d)];
  return { [`\\${fn}\\left(${ratToLatex(transformationDecimal(angle))}^{\\circ}\\right)`]: rat(1) };
}

export function transformationNumericMatrix(id: string, p: TransformationParams): number[][] {
  const t = (p.theta ?? 0) * Math.PI / 180;
  const c = Math.cos(t), s = Math.sin(t);
  switch (id) {
    case "rotate2d": return [[c, -s], [s, c]];
    case "rotate3d_x": return [[1, 0, 0], [0, c, -s], [0, s, c]];
    case "rotate3d_y": return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
    case "rotate3d_z": return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
    case "reflect_x": return [[1, 0], [0, -1]];
    case "reflect_y": return [[-1, 0], [0, 1]];
    case "reflect_yx": return [[0, 1], [1, 0]];
    case "reflect_ynx": return [[0, -1], [-1, 0]];
    case "reflect_line": {
      const a = 2 * p.alpha * Math.PI / 180;
      return [[Math.cos(a), Math.sin(a)], [Math.sin(a), -Math.cos(a)]];
    }
    case "shear_h": return [[1, p.k], [0, 1]];
    case "shear_v": return [[1, 0], [p.k, 1]];
    case "scale2d": return [[p.sx, 0], [0, p.sy]];
    case "squeeze": return [[p.k, 0], [0, 1 / p.k]];
    case "proj_x": return [[1, 0], [0, 0]];
    case "proj_y": return [[0, 0], [0, 1]];
    case "scale3d": return [[p.sx, 0, 0], [0, p.sy, 0], [0, 0, p.sz]];
    case "reflect3d_xy": return [[1, 0, 0], [0, 1, 0], [0, 0, -1]];
    case "reflect3d_xz": return [[1, 0, 0], [0, -1, 0], [0, 0, 1]];
    case "reflect3d_yz": return [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];
    case "custom2d": return [[p.a, p.b], [p.c, p.d]];
    case "custom3d": return Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => p[`m${r + 1}${c + 1}`]));
    default: throw new Error(`Unknown transformation: ${id}`);
  }
}

export function transformationExactMatrix(id: string, p: TransformationParams): TransformationExactMatrix {
  const zero = scalar(0), one = scalar(1);
  const c = transformationTrig(p.theta ?? 0, "cos");
  const s = transformationTrig(p.theta ?? 0, "sin");
  const negativeS = scale(s, rat(-1));
  switch (id) {
    case "rotate2d": return [[c, negativeS], [s, c]];
    case "rotate3d_x": return [[one, zero, zero], [zero, c, negativeS], [zero, s, c]];
    case "rotate3d_y": return [[c, zero, s], [zero, one, zero], [negativeS, zero, c]];
    case "rotate3d_z": return [[c, negativeS, zero], [s, c, zero], [zero, zero, one]];
    case "reflect_line": {
      const angle = 2 * p.alpha;
      const cosine = transformationTrig(angle, "cos"), sine = transformationTrig(angle, "sin");
      return [[cosine, sine], [sine, scale(cosine, rat(-1))]];
    }
    case "squeeze": return [[scalar(p.k), zero], [zero, scalar(div(rat(1), transformationDecimal(p.k)))]];
    default: return transformationNumericMatrix(id, p).map(row => row.map(value => scalar(value)));
  }
}

export function transformationApplyExact(matrix: TransformationExactMatrix, vector: number[]): TransformationEntry[] {
  return matrix.map(row => sum(...row.map((entry, col) => scale(entry, transformationDecimal(vector[col])))));
}

export function transformationApplyNumeric(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => row.reduce((total, value, col) => total + value * vector[col], 0));
}

export function transformationDeterminant(id: string, p: TransformationParams): Rational {
  if (id.startsWith("rotate") || id.startsWith("shear") || id === "squeeze") return rat(1);
  if (id.startsWith("reflect")) return rat(-1);
  if (id.startsWith("proj")) return rat(0);
  const m = transformationExactMatrix(id, p).map(row => row.map(entry => entry[""] ?? rat(0)));
  const minor = (a: Rational, b: Rational, c: Rational, d: Rational) => sub(mul(a, d), mul(b, c));
  if (m.length === 2) return minor(m[0][0], m[0][1], m[1][0], m[1][1]);
  return add(sub(mul(m[0][0], minor(m[1][1], m[1][2], m[2][1], m[2][2])),
    mul(m[0][1], minor(m[1][0], m[1][2], m[2][0], m[2][2]))),
    mul(m[0][2], minor(m[1][0], m[1][1], m[2][0], m[2][1])));
}

/** Snapshots only: the shared StepDisplay owns playback and all timing.
 * Rotations use their actual angle family; squeeze preserves area throughout.
 * Reflections/custom matrices use an illustrative straight morph, NOT an operation path.
 */
export function transformationSnapshot(id: string, p: TransformationParams, progress: number): number[][] {
  const t = Math.max(0, Math.min(1, progress));
  const target = transformationNumericMatrix(id, p);
  if (t === 0) return target.map((row, r) => row.map((_, c) => r === c ? 1 : 0));
  if (t === 1) return target;
  if (id.startsWith("rotate")) return transformationNumericMatrix(id, { ...p, theta: p.theta * t });
  if (id === "squeeze") return transformationNumericMatrix(id, { ...p, k: 1 + t * (p.k - 1) });
  return target.map((row, r) => row.map((value, c) => (r === c ? 1 : 0) * (1 - t) + t * value));
}

export function transformationApprox(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (value !== 0 && Math.abs(value) < 0.00005) return value.toExponential(3);
  if (Math.abs(value) >= 1e7) return value.toExponential(3);
  return Number(value.toFixed(4)).toString();
}
