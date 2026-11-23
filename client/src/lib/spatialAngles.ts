import {
  add,
  sub,
  mul,
  div,
  rat,
  ratToLatex,
  toNumber,
  type Rational,
} from "./rational";
import type { Data, Layout } from "plotly.js";

export type SpatialScalar = number | string;
export type SpatialVec3 = [SpatialScalar, SpatialScalar, SpatialScalar];
export type ExactVec3 = [Rational, Rational, Rational];
export type NumericVec3 = [number, number, number];
export type PlaneInput =
  | { kind: "equation"; normal: SpatialVec3; offset: SpatialScalar }
  | { kind: "points"; points: [SpatialVec3, SpatialVec3, SpatialVec3] };
export type LineInput =
  | { kind: "direction"; point: SpatialVec3; direction: SpatialVec3 }
  | { kind: "points"; points: [SpatialVec3, SpatialVec3] };
export type SpatialAngleInput =
  | { mode: "plane-plane"; plane1: PlaneInput; plane2: PlaneInput }
  | { mode: "line-plane"; plane: PlaneInput; line: LineInput };
export type SpatialLang = "zh" | "en";
export interface SpatialStep {
  description: string;
  latex: string;
}

const ZERO = rat(0n);
const ONE = rat(1n);
function numericRational(value: Rational): number {
  const direct = toNumber(value);
  if (Number.isFinite(direct)) return direct;
  const sign = value.n < 0n ? -1 : 1;
  const numerator = (value.n < 0n ? -value.n : value.n).toString();
  const denominator = value.d.toString();
  const n = numerator.slice(0, 16),
    d = denominator.slice(0, 16);
  return (
    ((sign * Number(n)) / Number(d)) *
    10 ** (numerator.length - n.length - denominator.length + d.length)
  );
}
const HALF_PI = "\\frac{\\pi}{2}";

export class SpatialAngleError extends Error {
  constructor(
    public code: "input" | "normal" | "collinear" | "direction" | "coincident"
  ) {
    super(spatialErrorMessage(code, "en"));
    this.name = "SpatialAngleError";
  }
}
export function spatialErrorMessage(
  code: SpatialAngleError["code"],
  lang: SpatialLang
): string {
  const messages = {
    input: [
      "Enter finite decimals (at most 24 significant digits), with absolute value ≤ 1,000,000; nonzero values must be ≥ 10⁻¹².",
      "請輸入有限小數（最多 24 位有效數字），絕對值不超過 1,000,000；非零數值須不小於 10⁻¹²。",
    ],
    normal: [
      "A plane normal cannot be the zero vector. Enter at least one nonzero coefficient.",
      "平面法向量不能是零向量，請輸入至少一個非零係數。",
    ],
    collinear: [
      "Three collinear or repeated points do not determine a plane. Choose three non-collinear points.",
      "三個共線或重複的點不能確定平面，請選擇三個不共線的點。",
    ],
    direction: [
      "A line direction cannot be the zero vector.",
      "直線的方向向量不能是零向量。",
    ],
    coincident: [
      "Two identical points do not determine a line. Choose distinct points.",
      "兩個相同的點不能確定直線，請選擇兩個不同的點。",
    ],
  };
  return messages[code][lang === "zh" ? 1 : 0];
}

/** Parse the decimal representation, never a continued-fraction approximation. */
export function spatialRational(value: SpatialScalar): Rational {
  const text = String(value).trim();
  const match =
    /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match || text.length > 80) throw new SpatialAngleError("input");
  const numeric = Number(text);
  if (
    !Number.isFinite(numeric) ||
    Math.abs(numeric) > 1e6 ||
    (numeric !== 0 && Math.abs(numeric) < 1e-12)
  )
    throw new SpatialAngleError("input");
  const fraction = match[3] ?? match[4] ?? "";
  const digits = `${match[2] ?? "0"}${fraction}`.replace(/^0+/, "") || "0";
  const exponent = Number(match[5] ?? 0);
  if (
    !Number.isSafeInteger(exponent) ||
    Math.abs(exponent) > 40 ||
    digits.replace(/0+$/, "").length > 24
  )
    throw new SpatialAngleError("input");
  const power = exponent - fraction.length;
  if (Math.abs(power) > 60) throw new SpatialAngleError("input");
  const n = BigInt(digits) * (match[1] === "-" ? -1n : 1n);
  if (n !== 0n && numeric === 0) throw new SpatialAngleError("input");
  return power >= 0
    ? rat(n * 10n ** BigInt(power))
    : rat(n, 10n ** BigInt(-power));
}
const ev = (v: SpatialVec3): ExactVec3 => v.map(spatialRational) as ExactVec3;
const vadd = (a: ExactVec3, b: ExactVec3): ExactVec3 =>
  a.map((x, i) => add(x, b[i])) as ExactVec3;
const vsub = (a: ExactVec3, b: ExactVec3): ExactVec3 =>
  a.map((x, i) => sub(x, b[i])) as ExactVec3;
const vscale = (a: ExactVec3, t: Rational): ExactVec3 =>
  a.map(x => mul(x, t)) as ExactVec3;
export const spatialDot = (a: ExactVec3, b: ExactVec3): Rational =>
  a.reduce((sum, x, i) => add(sum, mul(x, b[i])), ZERO);
export const spatialCross = (a: ExactVec3, b: ExactVec3): ExactVec3 => [
  sub(mul(a[1], b[2]), mul(a[2], b[1])),
  sub(mul(a[2], b[0]), mul(a[0], b[2])),
  sub(mul(a[0], b[1]), mul(a[1], b[0])),
];
const sq = (a: Rational) => mul(a, a);
const isZeroVec = (a: ExactVec3) => a.every(x => x.n === 0n);
export const spatialVectorLatex = (a: ExactVec3): string =>
  `\\left(${a.map(ratToLatex).join(",\\, ")}\\right)`;
const paren = (a: Rational) => `\\left(${ratToLatex(a)}\\right)`;

function integerSqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const next = (x + n / x) / 2n;
    if (next >= x) return x;
    x = next;
  }
}
/** Bounded factor extraction, retaining an exact radical if its residual is large. */
function squareParts(value: bigint): [bigint, bigint] {
  if (value === 0n) return [0n, 1n];
  let inside = value;
  let outside = 1n;
  const root = integerSqrt(inside);
  if (root * root === inside) return [root, 1n];
  for (let p = 2n; p <= 2000n && p * p <= inside; p += p === 2n ? 1n : 2n) {
    let count = 0;
    while (inside % p === 0n) {
      inside /= p;
      count++;
    }
    outside *= p ** BigInt(Math.floor(count / 2));
    if (count % 2) inside *= p; // Keep one factor; subsequent candidates are different.
  }
  // An unfactored large perfect-square residual can still be extracted.
  const residualRoot = integerSqrt(inside);
  if (residualRoot * residualRoot === inside)
    return [outside * residualRoot, 1n];
  return [outside, inside];
}

/** Rationalized sqrt(p/q), with exact reduced rational coefficient. */
export function spatialSqrtLatex(value: Rational): string {
  if (value.n < 0n) throw new Error("Negative square root");
  if (value.n === 0n) return "0";
  // Split numerator and denominator first to expose large square factors cheaply.
  const [a, r] = squareParts(value.n);
  const [b, s] = squareParts(value.d);
  const [c, t] = squareParts(r * s);
  const coefficient = rat(a * c, b * s);
  if (t === 1n) return ratToLatex(coefficient);
  const numerator = `${coefficient.n === 1n ? "" : coefficient.n}\\sqrt{${t}}`;
  return coefficient.d === 1n
    ? numerator
    : `\\frac{${numerator}}{${coefficient.d}}`;
}

export interface ResolvedPlane {
  source: PlaneInput;
  normal: ExactVec3;
  offset: Rational;
  normSquared: Rational;
  anchor: ExactVec3;
  points?: [ExactVec3, ExactVec3, ExactVec3];
}
export interface ResolvedLine {
  source: LineInput;
  point: ExactVec3;
  direction: ExactVec3;
  normSquared: Rational;
  points?: [ExactVec3, ExactVec3];
}
export function resolveSpatialPlane(input: PlaneInput): ResolvedPlane {
  const points =
    input.kind === "points"
      ? (input.points.map(ev) as [ExactVec3, ExactVec3, ExactVec3])
      : undefined;
  const normal = points
    ? spatialCross(vsub(points[1], points[0]), vsub(points[2], points[0]))
    : ev((input as Extract<PlaneInput, { kind: "equation" }>).normal);
  if (isZeroVec(normal))
    throw new SpatialAngleError(points ? "collinear" : "normal");
  const normSquared = spatialDot(normal, normal);
  const offset = points
    ? spatialDot(normal, points[0])
    : spatialRational(
        (input as Extract<PlaneInput, { kind: "equation" }>).offset
      );
  const anchor = points ? points[0] : vscale(normal, div(offset, normSquared));
  return { source: input, normal, offset, normSquared, anchor, points };
}
export function resolveSpatialLine(input: LineInput): ResolvedLine {
  const points =
    input.kind === "points"
      ? (input.points.map(ev) as [ExactVec3, ExactVec3])
      : undefined;
  const point = points
    ? points[0]
    : ev((input as Extract<LineInput, { kind: "direction" }>).point);
  const direction = points
    ? vsub(points[1], points[0])
    : ev((input as Extract<LineInput, { kind: "direction" }>).direction);
  if (isZeroVec(direction))
    throw new SpatialAngleError(points ? "coincident" : "direction");
  return {
    source: input,
    point,
    direction,
    normSquared: spatialDot(direction, direction),
    points,
  };
}

export interface SpatialAngleResult {
  mode: SpatialAngleInput["mode"];
  plane1: ResolvedPlane;
  plane2?: ResolvedPlane;
  line?: ResolvedLine;
  dot: Rational;
  norm1Squared: Rational;
  norm2Squared: Rational;
  ratioSquared: Rational;
  ratioLatex: string;
  angleLatex: string;
  supplementaryLatex: string;
  normalAngleLatex: string;
  radians: number;
  degrees: number;
  /** For line-plane: d_perp=lambda*n, d_parallel=d-d_perp. */
  projection?: {
    lambda: Rational;
    parallel: ExactVec3;
    perpendicular: ExactVec3;
    parallelNormSquared: Rational;
  };
}

function specialAngle(
  q: Rational,
  fn: "cos" | "sin"
): { latex: string; degrees: number } | undefined {
  const table: [Rational, number, string][] =
    fn === "cos"
      ? [
          [ONE, 0, "0"],
          [rat(3, 4), 30, "\\frac{\\pi}{6}"],
          [rat(1, 2), 45, "\\frac{\\pi}{4}"],
          [rat(1, 4), 60, "\\frac{\\pi}{3}"],
          [ZERO, 90, HALF_PI],
        ]
      : [
          [ZERO, 0, "0"],
          [rat(1, 4), 30, "\\frac{\\pi}{6}"],
          [rat(1, 2), 45, "\\frac{\\pi}{4}"],
          [rat(3, 4), 60, "\\frac{\\pi}{3}"],
          [ONE, 90, HALF_PI],
        ];
  const found = table.find(([x]) => x.n * q.d === q.n * x.d);
  return found ? { latex: found[2], degrees: found[1] } : undefined;
}
function supplement(latex: string): string {
  const table: Record<string, string> = {
    "0": "\\pi",
    "\\frac{\\pi}{6}": "\\frac{5\\pi}{6}",
    "\\frac{\\pi}{4}": "\\frac{3\\pi}{4}",
    "\\frac{\\pi}{3}": "\\frac{2\\pi}{3}",
    [HALF_PI]: HALF_PI,
  };
  return table[latex] ?? `\\pi-\\left(${latex}\\right)`;
}
function complement(latex: string): string {
  const table: Record<string, string> = {
    "0": HALF_PI,
    "\\frac{\\pi}{6}": "\\frac{\\pi}{3}",
    "\\frac{\\pi}{4}": "\\frac{\\pi}{4}",
    "\\frac{\\pi}{3}": "\\frac{\\pi}{6}",
    [HALF_PI]: "0",
  };
  return table[latex] ?? `${HALF_PI}-\\left(${latex}\\right)`;
}
export function computeSpatialAngle(
  input: SpatialAngleInput
): SpatialAngleResult {
  const plane1 = resolveSpatialPlane(
    input.mode === "plane-plane" ? input.plane1 : input.plane
  );
  const plane2 =
    input.mode === "plane-plane"
      ? resolveSpatialPlane(input.plane2)
      : undefined;
  const line =
    input.mode === "line-plane" ? resolveSpatialLine(input.line) : undefined;
  const vector = plane2?.normal ?? line!.direction;
  const norm1Squared = plane1.normSquared;
  const norm2Squared = plane2?.normSquared ?? line!.normSquared;
  const dot = spatialDot(plane1.normal, vector);
  const ratioSquared = div(sq(dot), mul(norm1Squared, norm2Squared));
  const ratioLatex = spatialSqrtLatex(ratioSquared);
  const fn = input.mode === "plane-plane" ? "cos" : "sin";
  const special = specialAngle(ratioSquared, fn);
  const ratio = Math.sqrt(
    Math.min(1, Math.max(0, numericRational(ratioSquared)))
  );
  const radians = special
    ? (special.degrees * Math.PI) / 180
    : fn === "cos"
      ? Math.acos(ratio)
      : Math.asin(ratio);
  const angleLatex = special?.latex ?? `\\arc${fn}\\left(${ratioLatex}\\right)`;
  const projection = line
    ? (() => {
        const lambda = div(dot, norm1Squared);
        const perpendicular = vscale(plane1.normal, lambda);
        const parallel = vsub(line.direction, perpendicular);
        return {
          lambda,
          perpendicular,
          parallel,
          parallelNormSquared: spatialDot(parallel, parallel),
        };
      })()
    : undefined;
  return {
    mode: input.mode,
    plane1,
    plane2,
    line,
    dot,
    norm1Squared,
    norm2Squared,
    ratioSquared,
    ratioLatex,
    angleLatex,
    supplementaryLatex: supplement(angleLatex),
    normalAngleLatex: complement(angleLatex),
    radians,
    degrees: special?.degrees ?? (radians * 180) / Math.PI,
    projection,
  };
}

export function spatialPlaneLatex(
  plane: ResolvedPlane,
  label = "\\Pi"
): string {
  const terms = plane.normal
    .map((coefficient, i) => {
      if (coefficient.n === 0n) return "";
      const absolute = rat(
        coefficient.n < 0n ? -coefficient.n : coefficient.n,
        coefficient.d
      );
      const c = absolute.n === absolute.d ? "" : ratToLatex(absolute);
      return `${coefficient.n < 0n ? "-" : "+"}${c}${["x", "y", "z"][i]}`;
    })
    .filter(Boolean)
    .join("")
    .replace(/^\+/, "");
  return `${label}:\\quad ${terms}=${ratToLatex(plane.offset)}`;
}
export function spatialLineLatex(line: ResolvedLine): string {
  return `\\ell:\\quad \\mathbf r=${spatialVectorLatex(line.point)}+t${spatialVectorLatex(line.direction)},\\quad t\\in\\mathbb R`;
}
function planeConstruction(plane: ResolvedPlane, subscript: string): string {
  const n = `\\mathbf n${subscript}`;
  if (plane.points) {
    const [A, B, C] = plane.points;
    return `A${subscript}=${spatialVectorLatex(A)},\\ B${subscript}=${spatialVectorLatex(B)},\\ C${subscript}=${spatialVectorLatex(C)},\\quad ${n}=(B${subscript}-A${subscript})\\times(C${subscript}-A${subscript})=${spatialVectorLatex(vsub(B, A))}\\times${spatialVectorLatex(vsub(C, A))}=${spatialVectorLatex(plane.normal)},\\quad k${subscript}=${n}\\cdot A${subscript}=${ratToLatex(plane.offset)}`;
  }
  return `${spatialPlaneLatex(plane, `\\Pi${subscript}`)},\\quad ${n}=${spatialVectorLatex(plane.normal)},\\quad k${subscript}=${ratToLatex(plane.offset)}`;
}
function sumSquares(v: ExactVec3): string {
  return v.map(x => `${paren(x)}^2`).join("+");
}
function dotSubstitution(a: ExactVec3, b: ExactVec3): string {
  return a.map((x, i) => `${paren(x)}${paren(b[i])}`).join("+");
}

/** Six playback stages, matching the scene's reveal thresholds 0…5. */
export function spatialAngleSteps(
  result: SpatialAngleResult,
  lang: SpatialLang,
  obtuse = false
): SpatialStep[] {
  const text = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const p = result.plane1;
  const A = ratToLatex(result.norm1Squared),
    B = ratToLatex(result.norm2Squared),
    D = ratToLatex(result.dot);
  const norm = `\\sqrt{${A}}\\sqrt{${B}}`;
  if (result.mode === "plane-plane") {
    const p2 = result.plane2!;
    return [
      {
        description: text(
          "Define r=(x,y,z), the position vector. Plane Π₁ has normal n₁ (perpendicular to the plane) and offset k₁; a normal is not a direction within the plane.",
          "定義 r=(x,y,z) 為位置向量。平面 Π₁ 的 n₁ 是垂直於平面的法向量，k₁ 是偏移常數；法向量不是平面內的方向。"
        ),
        latex: planeConstruction(p, "_1"),
      },
      {
        description: text(
          "Construct n₂ and k₂ for Π₂. Three non-collinear vertices give a cross-product normal, so both planes may be arbitrarily inclined. Offsets affect position, not angle.",
          "求出 Π₂ 的 n₂ 與 k₂。三個不共線的頂點可用叉積求法向量，因此兩個平面都可以任意傾斜；偏移只影響位置，不影響夾角。"
        ),
        latex: planeConstruction(p2, "_2"),
      },
      {
        description: text(
          "Calculate the dot product and squared lengths exactly. Reversing or rescaling a normal does not change its plane's angle.",
          "精確計算法向量的內積及長度平方。法向量反向或縮放不會改變平面夾角。"
        ),
        latex: `\\mathbf n_1\\cdot\\mathbf n_2=${dotSubstitution(p.normal, p2.normal)}=${D},\\quad \\|\\mathbf n_1\\|^2=${sumSquares(p.normal)}=${A},\\quad \\|\\mathbf n_2\\|^2=${sumSquares(p2.normal)}=${B},\\quad \\|\\mathbf n_1\\|=${spatialSqrtLatex(result.norm1Squared)},\\ \\|\\mathbf n_2\\|=${spatialSqrtLatex(result.norm2Squared)}`,
      },
      {
        description: text(
          "Let θ be the acute dihedral angle (0≤θ≤π/2). In a section perpendicular to the intersection direction h=n₁×n₂, directions u₁=h×n₁ and u₂=h×n₂ lie in the planes. Choose the sign of u₂ giving the smaller angle; parallel planes have θ=0.",
          "設 θ 為銳二面角（0≤θ≤π/2）。取垂直於交線方向 h=n₁×n₂ 的截面，u₁=h×n₁、u₂=h×n₂ 分別在兩個平面內。選擇 u₂ 的正負使夾角較小；平行平面定義 θ=0。"
        ),
        latex: `\\cos\\theta=\\frac{|\\mathbf n_1\\cdot\\mathbf n_2|}{\\|\\mathbf n_1\\|\\|\\mathbf n_2\\|}=\\frac{|${D}|}{${norm}}=${result.ratioLatex},\\quad 0\\leq\\theta\\leq${HALF_PI}`,
      },
      {
        description: text(
          "Evaluate arccos of the exact simplified ratio. Only exact special values are replaced by rational multiples of π; all other angles remain exact inverse-trigonometric expressions.",
          "對精確化簡的比值取反餘弦。只有精確特殊值才寫成 π 的有理數倍；其他角度保留精確反三角函數式。"
        ),
        latex: `\\theta=\\arccos\\left(${result.ratioLatex}\\right)=${result.angleLatex}`,
      },
      {
        description: obtuse
          ? text(
              "The selected supplementary opening is θₛ=π−θ, not the acute dihedral convention. It is obtuse for 0<θ<90°, equals 90° when perpendicular, and is a degenerate 180° opening when parallel.",
              "已選擇補角開口 θₛ=π−θ，而非通常的銳二面角。0<θ<90° 時為鈍角；垂直時為90°，平行時為退化的180°開口。"
            )
          : text(
              "Report the acute dihedral angle. The other opening is θₛ=π−θ; the absolute dot product makes either choice of normal orientation equivalent.",
              "結果採用銳二面角。另一個開口為 θₛ=π−θ；內積取絕對值確保法向量方向的選擇不影響結果。"
            ),
        latex: `\\theta=${result.angleLatex},\\quad \\theta_s=\\pi-\\theta=${result.supplementaryLatex}`,
      },
    ];
  }
  const line = result.line!,
    projection = result.projection!;
  return [
    {
      description: text(
        "Define r=(x,y,z). Plane Π has normal n (perpendicular to the plane) and offset k. A three-vertex input gives n=(B−A)×(C−A).",
        "定義 r=(x,y,z)。平面 Π 的法向量 n 垂直於平面，k 為偏移常數。三頂點輸入可用 n=(B−A)×(C−A) 求法向量。"
      ),
      latex: planeConstruction(p, ""),
    },
    {
      description: text(
        "The line is r=P+t d: P is a point on the line, d is its nonzero direction and t is a real parameter. With two points P,Q, use d=Q−P. The point locates the line but does not affect its angle.",
        "直線為 r=P+t d：P 是直線上的點，d 是非零方向向量，t 為實數參數。兩點 P、Q 輸入時取 d=Q−P。點決定直線位置，但不影響夾角。"
      ),
      latex: `${line.points ? `P=${spatialVectorLatex(line.points[0])},\\ Q=${spatialVectorLatex(line.points[1])},\\quad \\mathbf d=Q-P=${spatialVectorLatex(line.direction)},\\quad ` : ""}${spatialLineLatex(line)}`,
    },
    {
      description: text(
        "Compute d·n, |n|² and |d|² exactly, retaining the sign of the dot product for the projection.",
        "精確計算 d·n、|n|² 和 |d|²；投影計算保留內積的正負號。"
      ),
      latex: `\\mathbf d\\cdot\\mathbf n=${dotSubstitution(line.direction, p.normal)}=${D},\\quad \\|\\mathbf n\\|^2=${sumSquares(p.normal)}=${A},\\quad \\|\\mathbf d\\|^2=${sumSquares(line.direction)}=${B},\\quad \\|\\mathbf n\\|=${spatialSqrtLatex(result.norm1Squared)},\\ \\|\\mathbf d\\|=${spatialSqrtLatex(result.norm2Squared)}`,
    },
    {
      description: text(
        "Define λ=(d·n)/(n·n). The normal component is d⊥=λn and the in-plane projection is d∥=d−λn. The diagram shows both components, with a right-angle connector. A zero projection means a perpendicular line (θ=90°), not an error.",
        "定義 λ=(d·n)/(n·n)。法向分量為 d⊥=λn，平面內投影為 d∥=d−λn。圖中顯示兩個分量及直角連線；投影為零表示直線垂直於平面（θ=90°），並非錯誤。"
      ),
      latex: `\\lambda=\\frac{\\mathbf d\\cdot\\mathbf n}{\\|\\mathbf n\\|^2}=\\frac{${D}}{${A}}=${ratToLatex(projection.lambda)},\\quad \\mathbf d_{\\perp}=\\lambda\\mathbf n=${spatialVectorLatex(projection.perpendicular)},\\quad \\mathbf d_{\\parallel}=\\mathbf d-\\lambda\\mathbf n=${spatialVectorLatex(projection.parallel)},\\quad \\|\\mathbf d_{\\parallel}\\|=${spatialSqrtLatex(projection.parallelNormSquared)},\\quad \\mathbf n\\cdot\\mathbf d_{\\parallel}=0`,
    },
    {
      description: text(
        "θ is the angle between the line and its in-plane projection (0≤θ≤π/2), not between d and the normal. The normal component gives sinθ=|d·n|/(|d||n|). The arc lies in the section spanned by d and n.",
        "θ 是直線與平面內投影的夾角（0≤θ≤π/2），不是 d 與法向量的夾角。由法向分量得 sinθ=|d·n|/(|d||n|)；角弧位於 d 與 n 張成的截面內。"
      ),
      latex: `\\sin\\theta=\\frac{|\\mathbf d\\cdot\\mathbf n|}{\\|\\mathbf d\\|\\|\\mathbf n\\|}=\\frac{|${D}|}{${norm}}=${result.ratioLatex},\\quad \\theta=\\arcsin\\left(${result.ratioLatex}\\right)=${result.angleLatex}`,
    },
    {
      description: text(
        "β denotes the smaller angle to the normal, so β=π/2−θ. Parallel line: θ=0, β=90°. Perpendicular line: θ=90°, β=0. Reversing d or n leaves θ unchanged.",
        "β 表示直線與法向量的較小夾角，因此 β=π/2−θ。平行直線：θ=0、β=90°；垂直直線：θ=90°、β=0。d 或 n 反向不改變 θ。"
      ),
      latex: `\\theta=${result.angleLatex},\\quad \\beta=${HALF_PI}-\\theta=${result.normalAngleLatex},\\quad 0\\leq\\theta,\\beta\\leq${HALF_PI}`,
    },
  ];
}

const nv = (a: ExactVec3): NumericVec3 => a.map(numericRational) as NumericVec3;
const plus = (a: NumericVec3, b: NumericVec3): NumericVec3 =>
  a.map((x, i) => x + b[i]) as NumericVec3;
const minus = (a: NumericVec3, b: NumericVec3): NumericVec3 =>
  a.map((x, i) => x - b[i]) as NumericVec3;
const times = (a: NumericVec3, t: number): NumericVec3 =>
  a.map(x => x * t) as NumericVec3;
const dotN = (a: NumericVec3, b: NumericVec3) =>
  a.reduce((s, x, i) => s + x * b[i], 0);
const crossN = (a: NumericVec3, b: NumericVec3): NumericVec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: NumericVec3) => Math.hypot(...a);
const unit = (a: NumericVec3): NumericVec3 => times(a, 1 / length(a));

/** Robust orthogonal basis: no solving z=(k-ax-by)/c or fixed coefficient division. */
export function spatialPlaneBasis(
  normal: NumericVec3
): [NumericVec3, NumericVec3] {
  const n = unit(normal);
  const index = n.reduce(
    (best, value, i) => (Math.abs(value) < Math.abs(n[best]) ? i : best),
    0
  );
  const axis: NumericVec3 = [0, 0, 0];
  axis[index] = 1;
  const u = unit(crossN(n, axis));
  return [u, unit(crossN(n, u))];
}
export function spatialPlanePatch(
  center: NumericVec3,
  normal: NumericVec3,
  radius = 3
): NumericVec3[] {
  const [u, v] = spatialPlaneBasis(normal);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) =>
    plus(center, plus(times(u, a * radius), times(v, b * radius)))
  );
}
/** A circular arc in span(start,end), including stable zero/straight-angle cases. */
export function spatialAngleArc(
  center: NumericVec3,
  start: NumericVec3,
  end: NumericVec3,
  angle: number,
  radius: number,
  fallback: NumericVec3
): NumericVec3[] {
  const u = unit(start);
  const residual = minus(unit(end), times(u, dotN(u, unit(end))));
  const v =
    length(residual) > 1e-12
      ? unit(residual)
      : unit(minus(fallback, times(u, dotN(fallback, u))));
  return Array.from({ length: 49 }, (_, i) => {
    const t = (angle * i) / 48;
    return plus(
      center,
      times(plus(times(u, Math.cos(t)), times(v, Math.sin(t))), radius)
    );
  });
}
function planeIntersection(
  a: ResolvedPlane,
  b: ResolvedPlane
): ExactVec3 | undefined {
  const d = spatialDot(a.normal, b.normal);
  const determinant = sub(mul(a.normSquared, b.normSquared), sq(d));
  if (determinant.n === 0n) return undefined;
  return vadd(
    vscale(
      a.normal,
      div(sub(mul(a.offset, b.normSquared), mul(b.offset, d)), determinant)
    ),
    vscale(
      b.normal,
      div(sub(mul(b.offset, a.normSquared), mul(a.offset, d)), determinant)
    )
  );
}
export interface SpatialSceneOptions {
  lang?: SpatialLang;
  stepIndex?: number;
  supplementary?: boolean;
}
export interface SpatialScene {
  data: Data[];
  layout: Partial<Layout>;
  note: string;
}

/** Plotly trace labels deliberately use plain text/Unicode, never raw LaTeX. */
export function buildSpatialAngleScene(
  result: SpatialAngleResult,
  options: SpatialSceneOptions = {}
): SpatialScene {
  const lang = options.lang ?? "en",
    stage = options.stepIndex ?? 5;
  const translated = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const data: Data[] = [];
  const teal = "#0f766e",
    amber = "#b7791f",
    ink = "#334155",
    rose = "#b45360";
  const p1 = result.plane1,
    p2 = result.plane2;
  const n1 = unit(nv(p1.normal)),
    n2 = p2 ? unit(nv(p2.normal)) : undefined;
  let center: NumericVec3,
    secondCenter: NumericVec3 | undefined,
    note = "";
  let start: NumericVec3, end: NumericVec3, fallback: NumericVec3;
  let radius = Math.max(
    2,
    ...(p1.points ?? []).map(p => length(minus(nv(p), nv(p1.anchor))))
  );
  const line = result.line;
  if (p2) {
    radius = Math.max(
      radius,
      ...(p2.points ?? []).map(p => length(minus(nv(p), nv(p2.anchor))))
    );
    const intersection = planeIntersection(p1, p2);
    center = intersection ? nv(intersection) : nv(p1.anchor);
    secondCenter = intersection ? center : nv(p2.anchor);
    if (!intersection) {
      start = spatialPlaneBasis(n1)[0];
      end = start;
      fallback = n1;
      note = translated(
        "Parallel planes: θ = 0. Direction rays share a translated reference point; the patches retain their actual offsets.",
        "平行平面：θ = 0。方向射線移至共同參考點；平面圖塊保留實際偏移。"
      );
      radius = Math.max(radius, length(minus(center, secondCenter)) * 0.6);
    } else {
      const h = unit(nv(spatialCross(p1.normal, p2.normal)));
      start = unit(crossN(h, n1));
      end = unit(crossN(h, n2!));
      if (dotN(start, end) < 0) end = times(end, -1);
      fallback = n1;
      note = translated(
        "The angle arc is in the section perpendicular to the planes' intersection, between directions lying in the two planes. Normal arrows show directions (unit display length).",
        "角弧位於垂直於兩平面交線的截面，兩射線分別在兩平面內。法向箭頭顯示方向（顯示為單位方向長度）。"
      );
    }
    if (options.supplementary) end = times(end, -1);
  } else {
    const signedDot = result.dot;
    const foot = vsub(
      line!.point,
      vscale(
        p1.normal,
        div(sub(spatialDot(p1.normal, line!.point), p1.offset), p1.normSquared)
      )
    );
    const t =
      signedDot.n === 0n
        ? undefined
        : div(sub(p1.offset, spatialDot(p1.normal, line!.point)), signedDot);
    center = t
      ? nv(vadd(line!.point, vscale(line!.direction, t)))
      : nv(line!.point);
    secondCenter = t ? center : nv(foot);
    radius = Math.max(
      radius,
      length(minus(center, nv(line!.point))) * 0.55,
      length(minus(center, secondCenter)) * 0.65
    );
    end = unit(nv(line!.direction));
    start = isZeroVec(result.projection!.parallel)
      ? spatialPlaneBasis(n1)[0]
      : unit(nv(result.projection!.parallel));
    fallback = n1;
    note =
      signedDot.n === 0n
        ? translated(
            "Parallel line: θ = 0. The in-plane reference direction is translated to the line; its plane patch stays at the actual offset.",
            "平行直線：θ = 0。平面內參考方向平移至直線；平面圖塊保留實際偏移。"
          )
        : translated(
            "θ is between the line and its in-plane projection, not its normal. The arc and component triangle lie in span(d,n). Arrows are scaled together for visibility.",
            "θ 是直線與平面內投影的夾角，並非法向量夾角。角弧與分量三角形位於 d、n 張成的截面；箭頭同比縮放以便觀看。"
          );
  }
  radius = Math.max(
    radius,
    ...(p1.points ?? []).map(point =>
      length(
        minus(nv(point), result.mode === "line-plane" ? secondCenter! : center)
      )
    ),
    ...(p2?.points ?? []).map(point => length(minus(nv(point), secondCenter!)))
  );
  // Even for very distant exact intersections all coordinates remain finite.
  radius = Math.max(
    radius,
    Math.max(...center.map(Math.abs), ...(secondCenter ?? []).map(Math.abs)) *
      Number.EPSILON *
      100
  );
  const lineTrace = (
    points: NumericVec3[],
    name: string,
    color: string,
    dash: "solid" | "dash" | "dot" = "solid",
    width = 5,
    showlegend = true
  ): Data => ({
    type: "scatter3d",
    mode: "lines",
    x: points.map(p => p[0]),
    y: points.map(p => p[1]),
    z: points.map(p => p[2]),
    line: { color, width, dash },
    name,
    showlegend,
    hoverinfo: "name",
  });
  const pointTrace = (
    points: NumericVec3[],
    labels: string[],
    color: string
  ): Data => ({
    type: "scatter3d",
    mode: "text+markers",
    x: points.map(p => p[0]),
    y: points.map(p => p[1]),
    z: points.map(p => p[2]),
    text: labels,
    textposition: "top center",
    marker: { color, size: 4 },
    textfont: { color, size: 12 },
    hoverinfo: "text",
    showlegend: false,
  });
  const planeTrace = (
    plane: ResolvedPlane,
    c: NumericVec3,
    name: string,
    color: string
  ) => {
    const points = spatialPlanePatch(c, nv(plane.normal), radius);
    data.push({
      type: "mesh3d",
      x: points.map(p => p[0]),
      y: points.map(p => p[1]),
      z: points.map(p => p[2]),
      i: new Float64Array([0, 0]),
      j: new Float64Array([1, 2]),
      k: new Float64Array([2, 3]),
      color,
      opacity: 0.24,
      name,
      showlegend: true,
      hoverinfo: "name",
      flatshading: true,
    } as Data);
    data.push(
      lineTrace([...points, points[0]], name, color, "solid", 2, false)
    );
    if (plane.points)
      data.push(
        pointTrace(
          plane.points.map(nv),
          p2
            ? ["A", "B", "C"].map(x => `${x}${plane === p1 ? "₁" : "₂"}`)
            : ["A", "B", "C"],
          color
        )
      );
  };
  const arrow = (
    origin: NumericVec3,
    vector: NumericVec3,
    name: string,
    color: string,
    dash: "solid" | "dash" | "dot" = "solid"
  ) => {
    if (length(vector) === 0) return;
    const tip = plus(origin, vector);
    data.push(lineTrace([origin, tip], name, color, dash));
    const direction = unit(vector),
      [a, b] = spatialPlaneBasis(direction);
    const back = minus(tip, times(direction, radius * 0.12));
    const rim = [
      plus(back, times(a, radius * 0.05)),
      plus(back, times(b, radius * 0.05)),
      minus(back, times(a, radius * 0.05)),
      minus(back, times(b, radius * 0.05)),
      tip,
    ];
    data.push({
      type: "mesh3d",
      x: rim.map(p => p[0]),
      y: rim.map(p => p[1]),
      z: rim.map(p => p[2]),
      i: new Float64Array([0, 1, 2, 3]),
      j: new Float64Array([1, 2, 3, 0]),
      k: new Float64Array([4, 4, 4, 4]),
      color,
      hoverinfo: "skip",
      showlegend: false,
    } as Data);
    data.push(pointTrace([tip], [name], color));
  };
  planeTrace(
    p1,
    result.mode === "line-plane" ? secondCenter! : center,
    p2 ? "Π₁" : "Π",
    teal
  );
  if (stage >= 0)
    arrow(
      result.mode === "line-plane" ? secondCenter! : center,
      times(n1, radius * 0.8),
      p2 ? "n₁" : "n",
      teal
    );
  if (p2 && stage >= 1) {
    planeTrace(p2, secondCenter!, "Π₂", amber);
    arrow(secondCenter!, times(n2!, radius * 0.8), "n₂", amber);
  }
  if (line && stage >= 1) {
    const d = unit(nv(line.direction));
    data.push(
      lineTrace(
        [
          minus(center, times(d, radius * 1.4)),
          plus(center, times(d, radius * 1.4)),
        ],
        "ℓ",
        ink
      )
    );
    arrow(center, times(d, radius * 0.85), "d", ink);
    data.push(
      pointTrace(
        line.points ? line.points.map(nv) : [nv(line.point)],
        line.points ? ["P", "Q"] : ["P"],
        ink
      )
    );
  }
  if (p2 && stage >= 3) {
    arrow(center, times(start, radius * 0.65), "u₁", teal);
    arrow(
      center,
      times(end, radius * 0.65),
      options.supplementary ? "−u₂" : "u₂",
      amber
    );
    const hExact = spatialCross(p1.normal, p2.normal);
    if (!isZeroVec(hExact)) {
      const h = unit(nv(hExact));
      data.push(
        lineTrace(
          [minus(center, times(h, radius)), plus(center, times(h, radius))],
          translated("Intersection", "交線"),
          ink,
          "dash",
          3
        )
      );
    }
  }
  if (line && stage >= 3) {
    const factor =
      (radius * 0.85) / Math.sqrt(numericRational(line.normSquared));
    const parallel = times(nv(result.projection!.parallel), factor);
    const perpendicular = times(nv(result.projection!.perpendicular), factor);
    arrow(center, parallel, "d∥", amber, "dash");
    arrow(center, perpendicular, "d⊥", rose, "dot");
    data.push(
      lineTrace(
        [plus(center, parallel), plus(plus(center, parallel), perpendicular)],
        translated("Normal connector", "法向連線"),
        rose,
        "dot",
        3
      )
    );
    if (length(parallel) && length(perpendicular)) {
      const a = times(unit(parallel), radius * 0.09),
        b = times(unit(perpendicular), radius * 0.09),
        corner = plus(center, parallel);
      data.push(
        lineTrace(
          [minus(corner, a), plus(minus(corner, a), b), plus(corner, b)],
          "90°",
          ink,
          "solid",
          2,
          false
        )
      );
    }
    if (isZeroVec(result.projection!.parallel))
      data.push(
        lineTrace(
          [center, plus(center, times(start, radius * 0.65))],
          translated("In-plane reference", "平面內參考方向"),
          amber,
          "dash",
          3
        )
      );
  }
  if (stage >= 4) {
    const angle =
      p2 && options.supplementary ? Math.PI - result.radians : result.radians;
    const arc = spatialAngleArc(
      center,
      start,
      end,
      angle,
      radius * 0.35,
      fallback
    );
    data.push(
      lineTrace(arc, p2 && options.supplementary ? "θₛ" : "θ", rose, "solid", 7)
    );
    data.push(
      pointTrace([arc[24]], [p2 && options.supplementary ? "θₛ" : "θ"], rose)
    );
  }
  const coordinates: NumericVec3[] = [];
  for (const trace of data) {
    const typed = trace as { x?: number[]; y?: number[]; z?: number[] };
    typed.x?.forEach((x, i) => coordinates.push([x, typed.y![i], typed.z![i]]));
  }
  const layout: Partial<Layout> = {
    scene: {
      aspectmode: "data",
      xaxis: { title: { text: "x" } },
      yaxis: { title: { text: "y" } },
      zaxis: { title: { text: "z" } },
    },
    legend: { orientation: "h", x: 0, y: -0.05 },
  };
  // Stable bounds include unrevealed planes/components, avoiding rescale during playback.
  const full =
    options.stepIndex !== undefined && stage < 5
      ? buildSpatialAngleScene(result, { ...options, stepIndex: 5 })
      : undefined;
  if (full) layout.scene = full.layout.scene;
  else {
    const extent = Math.max(
      radius,
      ...[0, 1, 2].map(
        i =>
          Math.max(...coordinates.map(p => p[i])) -
          Math.min(...coordinates.map(p => p[i]))
      )
    );
    for (const [i, key] of ["xaxis", "yaxis", "zaxis"].entries()) {
      const values = coordinates.map(p => p[i]);
      const midpoint = (Math.min(...values) + Math.max(...values)) / 2;
      (layout.scene as Record<string, unknown>)[key] = {
        title: { text: ["x", "y", "z"][i] },
        range: [midpoint - extent * 0.57, midpoint + extent * 0.57],
        autorange: false,
      };
    }
  }
  return { data, layout, note };
}
