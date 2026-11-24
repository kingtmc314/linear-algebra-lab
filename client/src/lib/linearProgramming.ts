import {
  rat,
  add,
  sub,
  mul,
  div,
  neg,
  ratToLatex,
  type Rational,
} from "./rational";

export type LPScalar = string | number;
export type LPGoal = "min" | "max";
export type LPLang = "zh" | "en";
export interface LPConstraintInput {
  id: string;
  a: LPScalar;
  b: LPScalar;
  relation: "<=" | ">=" | "=";
  rhs: LPScalar;
}
export interface LPInput {
  constraints: LPConstraintInput[];
  objective: { a: LPScalar; b: LPScalar; c: LPScalar };
}
export interface LPPoint {
  x: Rational;
  y: Rational;
}
export interface LPExactConstraint {
  id: string;
  a: Rational;
  b: Rational;
  relation: "<=" | ">=" | "=";
  rhs: Rational;
}
export interface LPOptimum {
  status: "finite" | "unbounded" | "infeasible";
  value: Rational | null;
  points: LPPoint[];
  witness?: LPPoint;
  multiple: boolean;
}
export interface LPResult {
  input: LPInput;
  constraints: LPExactConstraint[];
  objective: { a: Rational; b: Rational; c: Rational };
  feasible: boolean;
  regionBounded: boolean;
  vertices: LPPoint[];
  witness?: LPPoint;
  min: LPOptimum;
  max: LPOptimum;
}
export interface LPStep {
  description: string;
  latex?: string;
}
export interface LPNames {
  x?: string;
  y?: string;
  parameter?: string;
  constant?: string;
}
export interface LPConstantResult {
  status: "finite" | "unbounded" | "infeasible";
  value: Rational | null;
  latex: string;
  steps: LPStep[];
}
export interface LPParameterInterval {
  lower: Rational | null;
  upper: Rational | null;
  lowerClosed: boolean;
  upperClosed: boolean;
}
export interface LPCoefficientResult {
  status: "solved" | "empty" | "infeasible";
  intervals: LPParameterInterval[];
  latex: string;
  steps: LPStep[];
  breakpoints: Rational[];
}

type ErrorCode =
  | "scalar"
  | "large"
  | "zeroDenominator"
  | "constraints"
  | "relation"
  | "name"
  | "input";
export class LPError extends Error {
  constructor(public readonly code: ErrorCode = "input") {
    super(code);
    this.name = "LPError";
  }
}
const errors: Record<ErrorCode, [string, string]> = {
  scalar: [
    "請輸入整數、小數、科學記數或分數。",
    "Enter an integer, decimal, scientific notation, or fraction.",
  ],
  large: [
    "輸入數字過長或指數過大（最多 120 位及指數絕對值 120）。",
    "Input is too large (at most 120 digits and exponent magnitude 120).",
  ],
  zeroDenominator: ["分母不可為零。", "The denominator must not be zero."],
  constraints: [
    "限制條件數目必須為 0 至 12。",
    "Provide between 0 and 12 constraints.",
  ],
  relation: [
    "限制條件只可使用 ≤、≥ 或 =。",
    "Constraints must use <=, >=, or =.",
  ],
  name: [
    "變數須為單一英文字母或支援的小寫希臘字母。",
    "Names must be a single Latin letter or a supported lowercase Greek letter.",
  ],
  input: [
    "請檢查限制條件及目標函數的輸入。",
    "Check the constraints and objective inputs.",
  ],
};
export function lpErrorMessage(error: unknown, lang: LPLang): string {
  return errors[error instanceof LPError ? error.code : "input"][
    lang === "zh" ? 0 : 1
  ];
}
const Z = rat(0n),
  O = rat(1n);
const cmp = (p: Rational, q: Rational): number =>
  p.n * q.d < q.n * p.d ? -1 : p.n * q.d > q.n * p.d ? 1 : 0;
const eq = (p: Rational, q: Rational): boolean => cmp(p, q) === 0;
const abs = (p: Rational): Rational => (p.n < 0n ? neg(p) : p);
const key = (p: Rational): string => `${p.n}/${p.d}`;
const pointKey = (p: LPPoint): string => `${key(p.x)},${key(p.y)}`;
const dot = (a: Rational, b: Rational, p: LPPoint): Rational =>
  add(mul(a, p.x), mul(b, p.y));
const uniquePoints = (points: LPPoint[]): LPPoint[] => [
  ...new Map(points.map(p => [pointKey(p), p])).values(),
];
const uniqueRationals = (values: Rational[]): Rational[] =>
  [...new Map(values.map(v => [key(v), v])).values()].sort(cmp);

/** Parse decimal syntax directly into BigInts, never via approximate fromFloat. */
export function lpRational(value: LPScalar): Rational {
  if (typeof value !== "string" && typeof value !== "number")
    throw new LPError("scalar");
  if (typeof value === "number" && !Number.isFinite(value))
    throw new LPError("scalar");
  const text = String(value).trim().replace(/−/g, "-");
  if (text.length > 512) throw new LPError("large");
  function decimal(s: string): Rational {
    const m = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(
      s.trim()
    );
    if (!m) throw new LPError("scalar");
    const whole = m[2] ?? "0",
      fraction = m[3] ?? m[4] ?? "";
    if (whole.length + fraction.length > 120) throw new LPError("large");
    const exponent = m[5] ? BigInt(m[5]) : 0n;
    if (exponent < -120n || exponent > 120n) throw new LPError("large");
    const scale = BigInt(fraction.length) - exponent;
    const numerator = BigInt(whole + fraction) * (m[1] === "-" ? -1n : 1n);
    return scale >= 0n
      ? rat(numerator, 10n ** scale)
      : rat(numerator * 10n ** -scale);
  }
  const parts = text.split("/");
  if (parts.length === 1) return decimal(parts[0]);
  if (parts.length !== 2) throw new LPError("scalar");
  const numerator = decimal(parts[0]),
    denominator = decimal(parts[1]);
  if (denominator.n === 0n) throw new LPError("zeroDenominator");
  return div(numerator, denominator);
}

// All internal half-planes have form a*x + b*y <= r; equalities are two half-planes.
interface HalfPlane {
  a: Rational;
  b: Rational;
  r: Rational;
}
interface Bound {
  lower: Rational | null;
  upper: Rational | null;
  feasible: boolean;
}
function normalize(constraints: LPExactConstraint[]): HalfPlane[] {
  return constraints.flatMap(c => {
    const h = { a: c.a, b: c.b, r: c.rhs };
    const opposite = { a: neg(c.a), b: neg(c.b), r: neg(c.rhs) };
    return c.relation === "="
      ? [h, opposite]
      : [c.relation === ">=" ? opposite : h];
  });
}
function compact(planes: HalfPlane[]): HalfPlane[] {
  // Positive rescaling keeps meaning. Keep only the strongest RHS for each normal.
  const map = new Map<string, HalfPlane>();
  for (const p of planes) {
    const divisor = p.a.n !== 0n ? abs(p.a) : p.b.n !== 0n ? abs(p.b) : O;
    const h = {
      a: div(p.a, divisor),
      b: div(p.b, divisor),
      r: div(p.r, divisor),
    };
    const k = `${key(h.a)},${key(h.b)}`,
      old = map.get(k);
    if (!old || cmp(h.r, old.r) < 0) map.set(k, h);
  }
  return [...map.values()];
}
function oneDimensional(inequalities: { a: Rational; r: Rational }[]): Bound {
  let lower: Rational | null = null,
    upper: Rational | null = null;
  for (const h of inequalities) {
    if (h.a.n === 0n) {
      if (h.r.n < 0n) return { lower, upper, feasible: false };
      continue;
    }
    const v = div(h.r, h.a);
    if (h.a.n > 0n) {
      if (upper === null || cmp(v, upper) < 0) upper = v;
    } else if (lower === null || cmp(v, lower) > 0) lower = v;
  }
  return {
    lower,
    upper,
    feasible: lower === null || upper === null || cmp(lower, upper) <= 0,
  };
}
/** Exact Fourier–Motzkin projection onto x. Bounds are closed and genuinely attainable. */
function projectX(source: HalfPlane[]): Bound {
  const planes = compact(source),
    positive = planes.filter(h => h.b.n > 0n),
    negative = planes.filter(h => h.b.n < 0n);
  const projected = planes
    .filter(h => h.b.n === 0n)
    .map(h => ({ a: h.a, r: h.r }));
  for (const p of positive)
    for (const n of negative) {
      projected.push({
        a: sub(div(p.a, p.b), div(n.a, n.b)),
        r: sub(div(p.r, p.b), div(n.r, n.b)),
      });
    }
  return oneDimensional(projected);
}
function choose(bound: Bound): Rational {
  if (bound.lower !== null && cmp(bound.lower, Z) > 0) return bound.lower;
  if (bound.upper !== null && cmp(bound.upper, Z) < 0) return bound.upper;
  return Z;
}
function findPoint(planes: HalfPlane[]): LPPoint | undefined {
  const xBound = projectX(planes);
  if (!xBound.feasible) return undefined;
  const x = choose(xBound);
  const yBound = oneDimensional(
    planes.map(h => ({ a: h.b, r: sub(h.r, mul(h.a, x)) }))
  );
  if (!yBound.feasible) return undefined;
  return { x, y: choose(yBound) };
}
function objectiveRange(
  planes: HalfPlane[],
  objective: LPResult["objective"]
): Bound {
  const { a, b, c } = objective;
  if (a.n === 0n && b.n === 0n)
    return { lower: c, upper: c, feasible: projectX(planes).feasible };
  // t=a*x+b*y+c. Substitute one original variable; project the remaining one.
  const transformed =
    a.n !== 0n
      ? planes.map(h => ({
          a: div(h.a, a),
          b: sub(h.b, div(mul(h.a, b), a)),
          r: add(h.r, div(mul(h.a, c), a)),
        }))
      : planes.map(h => ({
          a: div(h.b, b),
          b: h.a,
          r: add(h.r, div(mul(h.b, c), b)),
        }));
  return projectX(transformed);
}
function equalityPlanes(a: Rational, b: Rational, r: Rational): HalfPlane[] {
  return [
    { a, b, r },
    { a: neg(a), b: neg(b), r: neg(r) },
  ];
}
function inside(p: LPPoint, planes: HalfPlane[]): boolean {
  return planes.every(h => cmp(dot(h.a, h.b, p), h.r) <= 0);
}
interface Intersection {
  i: number;
  j: number;
  point: LPPoint;
  valid: boolean;
}
function intersections(
  constraints: LPExactConstraint[],
  planes: HalfPlane[]
): Intersection[] {
  const found: Intersection[] = [];
  for (let i = 0; i < constraints.length; i++)
    for (let j = i + 1; j < constraints.length; j++) {
      const p = constraints[i],
        q = constraints[j],
        determinant = sub(mul(p.a, q.b), mul(q.a, p.b));
      if (determinant.n === 0n) continue;
      const point = {
        x: div(sub(mul(p.rhs, q.b), mul(q.rhs, p.b)), determinant),
        y: div(sub(mul(p.a, q.rhs), mul(q.a, p.rhs)), determinant),
      };
      found.push({ i, j, point, valid: inside(point, planes) });
    }
  return found;
}
function anchors(result: LPResult): LPPoint[] {
  if (!result.feasible) return [];
  if (result.vertices.length) return result.vertices;
  const planes = normalize(result.constraints),
    points = result.witness ? [result.witness] : [];
  for (const c of result.constraints) {
    if (c.a.n === 0n && c.b.n === 0n) continue;
    const p = findPoint([...planes, ...equalityPlanes(c.a, c.b, c.rhs)]);
    if (p) points.push(p);
  }
  return uniquePoints(points);
}
/** Exact generators of the homogeneous recession cone, including lineality. */
function recessionRays(planes: HalfPlane[]): LPPoint[] {
  const candidates: LPPoint[] = [
    { x: O, y: Z },
    { x: neg(O), y: Z },
    { x: Z, y: O },
    { x: Z, y: neg(O) },
  ];
  for (const h of planes)
    if (h.a.n !== 0n || h.b.n !== 0n) {
      candidates.push({ x: h.b, y: neg(h.a) }, { x: neg(h.b), y: h.a });
    }
  return uniquePoints(
    candidates
      .filter(p => planes.every(h => dot(h.a, h.b, p).n <= 0n))
      .map(p => {
        const d = p.x.n !== 0n ? abs(p.x) : abs(p.y);
        return { x: div(p.x, d), y: div(p.y, d) };
      })
  );
}
function parseInput(input: LPInput): {
  constraints: LPExactConstraint[];
  objective: LPResult["objective"];
} {
  if (!input || !Array.isArray(input.constraints) || !input.objective)
    throw new LPError("input");
  if (input.constraints.length > 12) throw new LPError("constraints");
  const constraints = input.constraints.map(c => {
    if (!c || !["<=", ">=", "="].includes(c.relation))
      throw new LPError("relation");
    return {
      id: String(c.id ?? ""),
      a: lpRational(c.a),
      b: lpRational(c.b),
      relation: c.relation,
      rhs: lpRational(c.rhs),
    };
  });
  const objective = {
    a: lpRational(input.objective.a),
    b: lpRational(input.objective.b),
    c: lpRational(input.objective.c),
  };
  return { constraints, objective };
}
export function solveLinearProgram(input: LPInput): LPResult {
  const { constraints, objective } = parseInput(input),
    planes = normalize(constraints),
    witness = findPoint(planes);
  const vertices = uniquePoints(
    intersections(constraints, planes)
      .filter(i => i.valid)
      .map(i => i.point)
  );
  const feasible = witness !== undefined,
    range = objectiveRange(planes, objective);
  const xRange = projectX(planes),
    yRange = projectX(planes.map(h => ({ a: h.b, b: h.a, r: h.r })));
  function optimum(goal: LPGoal): LPOptimum {
    if (!feasible)
      return { status: "infeasible", value: null, points: [], multiple: false };
    const value = goal === "min" ? range.lower : range.upper;
    if (value === null)
      return { status: "unbounded", value: null, points: [], multiple: false };
    const face = [
      ...planes,
      ...equalityPlanes(objective.a, objective.b, sub(value, objective.c)),
    ];
    const faceWitness = findPoint(face)!;
    const fx = projectX(face),
      fy = projectX(face.map(h => ({ a: h.b, b: h.a, r: h.r })));
    const singleton = (r: Bound) =>
      r.lower !== null && r.upper !== null && eq(r.lower, r.upper);
    return {
      status: "finite",
      value,
      points: vertices.filter(p =>
        eq(add(dot(objective.a, objective.b, p), objective.c), value)
      ),
      witness: faceWitness,
      multiple: !singleton(fx) || !singleton(fy),
    };
  }
  return {
    input,
    constraints,
    objective,
    feasible,
    regionBounded:
      feasible &&
      xRange.lower !== null &&
      xRange.upper !== null &&
      yRange.lower !== null &&
      yRange.upper !== null,
    vertices,
    witness,
    min: optimum("min"),
    max: optimum("max"),
  };
}

const greek: Record<string, string> = {
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  ε: "epsilon",
  ζ: "zeta",
  η: "eta",
  θ: "theta",
  ι: "iota",
  κ: "kappa",
  λ: "lambda",
  μ: "mu",
  ν: "nu",
  ξ: "xi",
  ο: "omicron",
  π: "pi",
  ρ: "rho",
  σ: "sigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
  ϵ: "varepsilon",
  ϑ: "vartheta",
  ϕ: "varphi",
  ϱ: "varrho",
  ς: "varsigma",
  ϖ: "varpi",
};
function safeName(name: string | undefined, fallback: string): string {
  const s = name ?? fallback;
  if (/^[a-zA-Z]$/.test(s)) return s;
  const g =
    greek[s] ??
    (Object.values(greek).includes(s.replace(/^\\/, ""))
      ? s.replace(/^\\/, "")
      : undefined);
  if (g) return g === "omicron" ? "o" : `\\${g}`;
  throw new LPError("name");
}
function labels(names?: LPNames) {
  return {
    x: safeName(names?.x, "x"),
    y: safeName(names?.y, "y"),
    p: safeName(names?.parameter, "β"),
    k: safeName(names?.constant, "k"),
  };
}
function scalar(value: LPScalar | Rational): Rational {
  return typeof value === "object" ? value : lpRational(value);
}
function expression(
  terms: { coefficient: Rational; symbol: string }[],
  constant = Z
): string {
  let output = "";
  for (const t of [...terms, { coefficient: constant, symbol: "" }]) {
    if (t.coefficient.n === 0n) continue;
    const magnitude = abs(t.coefficient),
      body =
        t.symbol && eq(magnitude, O)
          ? t.symbol
          : `${ratToLatex(magnitude)}${t.symbol}`;
    output += `${output ? (t.coefficient.n < 0n ? "-" : "+") : t.coefficient.n < 0n ? "-" : ""}${body}`;
  }
  return output || "0";
}
const relationLatex = (r: LPConstraintInput["relation"]): string =>
  r === "<=" ? "\\le" : r === ">=" ? "\\ge" : "=";
export function lpPointLatex(point: LPPoint): string {
  return `\\left(${ratToLatex(point.x)},\\,${ratToLatex(point.y)}\\right)`;
}
export function lpConstraintLatex(
  constraint: LPConstraintInput | LPExactConstraint,
  names?: LPNames
): string {
  const n = labels(names);
  return `${expression([
    { coefficient: scalar(constraint.a), symbol: n.x },
    { coefficient: scalar(constraint.b), symbol: n.y },
  ])}${relationLatex(constraint.relation)}${ratToLatex(scalar(constraint.rhs))}`;
}
export function lpObjectiveLatex(
  objective: LPInput["objective"] | LPResult["objective"],
  names?: LPNames
): string {
  const n = labels(names);
  return expression(
    [
      { coefficient: scalar(objective.a), symbol: n.x },
      { coefficient: scalar(objective.b), symbol: n.y },
    ],
    scalar(objective.c)
  );
}
const text = (lang: LPLang, zh: string, en: string): string =>
  lang === "zh" ? zh : en;
const aligned = (rows: string[]): string =>
  rows.length ? `\\begin{gathered}${rows.join("\\\\")}\\end{gathered}` : "";
function intervalLatex(
  bound: { lower: Rational | null; upper: Rational | null },
  symbol: string
): string {
  if (
    bound.lower !== null &&
    bound.upper !== null &&
    eq(bound.lower, bound.upper)
  )
    return `${symbol}=${ratToLatex(bound.lower)}`;
  if (bound.lower !== null && bound.upper !== null)
    return `${ratToLatex(bound.lower)}\\le ${symbol}\\le ${ratToLatex(bound.upper)}`;
  if (bound.lower !== null) return `${symbol}\\ge ${ratToLatex(bound.lower)}`;
  if (bound.upper !== null) return `${symbol}\\le ${ratToLatex(bound.upper)}`;
  return `${symbol}\\in\\mathbb{R}`;
}
function intersectionLatex(result: LPResult, names?: LPNames): string {
  const n = labels(names);
  const list = intersections(result.constraints, normalize(result.constraints));
  return aligned(
    list.map(i => {
      const p = result.constraints[i.i],
        q = result.constraints[i.j];
      const product = (a: Rational, b: Rational) =>
        `\\left(${ratToLatex(a)}\\right)\\left(${ratToLatex(b)}\\right)`;
      const determinant = sub(mul(p.a, q.b), mul(q.a, p.b));
      const calculation = `D=${product(p.a, q.b)}-${product(q.a, p.b)}=${ratToLatex(determinant)},\\quad ${n.x}=\\frac{${product(p.rhs, q.b)}-${product(q.rhs, p.b)}}{${ratToLatex(determinant)}}=${ratToLatex(i.point.x)},\\quad ${n.y}=\\frac{${product(p.a, q.rhs)}-${product(q.a, p.rhs)}}{${ratToLatex(determinant)}}=${ratToLatex(i.point.y)}`;
      const checks = result.constraints.map((c, index) => {
        const v = dot(c.a, c.b, i.point),
          comparison = cmp(v, c.rhs);
        const pass =
          c.relation === "="
            ? comparison === 0
            : c.relation === "<="
              ? comparison <= 0
              : comparison >= 0;
        return `C_{${index + 1}}:\\ ${ratToLatex(v)}${relationLatex(c.relation)}${ratToLatex(c.rhs)}\\ ${pass ? "\\checkmark" : "\\times"}`;
      });
      return `C_{${i.i + 1}}\\cap C_{${i.j + 1}}:\\ ${lpPointLatex(i.point)},\\ ${i.valid ? "\\checkmark" : "\\times"};\\quad ${calculation}\\\\${checks.join(",\\ ")}`;
    })
  );
}
function coordinateRangeLatex(result: LPResult, names?: LPNames): string {
  if (!result.feasible) return "S=\\varnothing";
  const n = labels(names),
    planes = normalize(result.constraints);
  return aligned([
    intervalLatex(projectX(planes), n.x),
    intervalLatex(projectX(planes.map(h => ({ a: h.b, b: h.a, r: h.r }))), n.y),
    `P_0=${lpPointLatex(result.witness!)}`,
  ]);
}
export function linearProgramSteps(
  result: LPResult,
  goal: LPGoal,
  lang: LPLang,
  names?: LPNames
): LPStep[] {
  const n = labels(names),
    optimum = result[goal],
    planes = normalize(result.constraints),
    rays = recessionRays(planes);
  const calculation = (p: LPPoint): string =>
    `${expression(
      [
        {
          coefficient: result.objective.a,
          symbol: `\\left(${ratToLatex(p.x)}\\right)`,
        },
        {
          coefficient: result.objective.b,
          symbol: `\\left(${ratToLatex(p.y)}\\right)`,
        },
      ],
      result.objective.c
    )}=${ratToLatex(add(dot(result.objective.a, result.objective.b, p), result.objective.c))}`;
  const comparisons = result.vertices.map(
    (p, i) => `F(P_{${i + 1}})=F${lpPointLatex(p)}=${calculation(p)}`
  );
  if (!result.vertices.length && result.feasible)
    for (const [i, p] of anchors(result).entries())
      comparisons.push(
        `Q_{${i + 1}}=${lpPointLatex(p)},\\quad F(Q_{${i + 1}})=${calculation(p)}`
      );
  if (result.feasible) {
    comparisons.push(
      intervalLatex(objectiveRange(planes, result.objective), "F")
    );
    for (const [i, r] of rays.entries())
      comparisons.push(
        `d_{${i + 1}}=${lpPointLatex(r)},\\quad \\Delta F(d_{${i + 1}})=${ratToLatex(dot(result.objective.a, result.objective.b, r))}`
      );
  }
  let outcome = "S=\\varnothing";
  if (optimum.status === "unbounded")
    outcome = `${goal === "min" ? "\\inf" : "\\sup"}_{S}F=${goal === "min" ? "-" : "+"}\\infty`;
  if (optimum.status === "finite")
    outcome = `${goal === "min" ? "\\min" : "\\max"}_{S}F=${ratToLatex(optimum.value!)},\\quad P_*=${lpPointLatex(optimum.witness!)}`;
  return [
    {
      description: text(
        lang,
        "定義兩個實數變數及可行集 S；逐項寫出限制條件和目標函數。沒有另行假設變數非負。零係數限制須檢查是否為恆真式或矛盾式。",
        "Define two real variables and the feasible set S; write every constraint and the objective. Nonnegativity is NOT assumed. Check zero-coefficient constraints for tautology or contradiction."
      ),
      latex: aligned([
        `${n.x},${n.y}\\in\\mathbb{R}`,
        ...result.constraints.map(
          (c, i) => `C_{${i + 1}}:\ ${lpConstraintLatex(c, names)}`
        ),
        `F=${lpObjectiveLatex(result.objective, names)}`,
      ]),
    },
    {
      description: text(
        lang,
        result.feasible
          ? `用精確消元（傅立葉–莫茨金）求座標投影並代回找可行見證。可行集${result.regionBounded ? "有界" : "無界"}；無界不代表每個目標函數都無界。座標投影不是可行集的矩形描述。`
          : "用精確消元檢查所有限制，得到矛盾：可行集為空，沒有最大或最小值。",
        result.feasible
          ? `Exact Fourier–Motzkin elimination gives coordinate projections; back-substitution supplies a feasible witness. The region is ${result.regionBounded ? "bounded" : "unbounded"}; an unbounded region can have finite objective extrema. Coordinate projections do not describe S as a rectangle.`
          : "Exact elimination detects inconsistent constraints: S is empty, so neither extremum exists."
      ),
      latex: coordinateRangeLatex(result, names),
    },
    {
      description: text(
        lang,
        "將每對非平行邊界聯立，用行列式求精確交點；把每個交點代回全部原限制，剔除任何不符合者。平行或重合直線沒有唯一交點。只有保留下來的獨立邊界交點才是真頂點；沒有頂點時不可捏造角點。",
        "Solve every pair of nonparallel boundaries exactly by determinants; substitute each intersection into ALL original constraints and discard invalid ones. Parallel or coincident lines have no unique intersection. Retained independent-boundary intersections are true vertices; do not invent vertices when none exist."
      ),
      latex:
        intersectionLatex(result, names) ||
        (result.vertices.length
          ? aligned(result.vertices.map(lpPointLatex))
          : "\\{P:\\ P\\text{ is a vertex of }S\\}=\\varnothing"),
    },
    {
      description: text(
        lang,
        result.vertices.length
          ? "比較目標函數在全部真頂點的精確值；同時檢查可行衰退方向及完整目標投影，不能只憑頂點判斷無界情況。衰退方向滿足齊次限制，沿此方向移動保持可行。"
          : "沒有真頂點：使用可行見證及可行邊界錨點（不是頂點），並用精確目標投影求可達範圍。另檢查齊次限制的衰退方向，包含直線的正反方向。",
        result.vertices.length
          ? "Compare exact objective values at ALL true vertices, and check recession directions and the full objective projection. Vertices alone cannot establish boundedness. A recession direction satisfies the homogeneous constraints and preserves feasibility."
          : "There are no true vertices. Use the feasible witness and feasible boundary anchors (NOT vertices), then exact objective projection for the attainable range. Check homogeneous recession directions, including both directions of lineality."
      ),
      latex: aligned(comparisons) || "S=\\varnothing",
    },
    {
      description: text(
        lang,
        result.objective.a.n === 0n && result.objective.b.n === 0n
          ? "目標函數為常數，不能當作可平移的直線；可行集非空時每個可行點都是最優解。"
          : `等值直線的法向量固定，改變等值量只會平行移動直線。沿${goal === "min" ? "減少" : "增加"}目標值方向移動，直到最後接觸可行集；若能無限移動，便沒有有限最優值。${optimum.multiple ? "最優解不唯一，整段邊界或無界最優面皆可取得同一值。" : ""}`,
        result.objective.a.n === 0n && result.objective.b.n === 0n
          ? "The objective is constant, not a movable level line; every feasible point is optimal if S is nonempty."
          : `Level lines have a fixed normal and move parallel as the level changes. Move toward ${goal === "min" ? "smaller" : "larger"} values until the last contact with S; unlimited movement means no finite optimum.${optimum.multiple ? " The optimum is not unique: an edge or unbounded optimal face attains the same value." : ""}`
      ),
      latex: aligned([
        `${lpObjectiveLatex(result.objective, names)}=t`,
        outcome,
      ]),
    },
    {
      description: text(
        lang,
        optimum.status === "finite"
          ? "寫出確切最優值及取得該值的可行點。以上是可達最值，不只是上界或下界。"
          : optimum.status === "infeasible"
            ? "結論：限制互相矛盾，沒有可行解。"
            : "結論：目標沿可行方向無限增大或減小，沒有有限最值。",
        optimum.status === "finite"
          ? "State the exact optimum and an attaining feasible point. This is an attained extremum, not merely a bound."
          : optimum.status === "infeasible"
            ? "Conclusion: the constraints are inconsistent; no feasible solution exists."
            : "Conclusion: the objective grows or decreases without limit along a feasible direction; no finite extremum exists."
      ),
      latex: outcome,
    },
  ];
}
export function solveConstantTarget(
  result: LPResult,
  goal: LPGoal,
  target: LPScalar,
  lang: LPLang,
  names?: LPNames
): LPConstantResult {
  const t = lpRational(target),
    n = labels(names),
    optimum = result[goal],
    steps = linearProgramSteps(result, goal, lang, names);
  if (optimum.status !== "finite") {
    const latex = `${n.k}\\in\\varnothing`;
    steps[5] = {
      description: text(
        lang,
        "不存在所求加法常數：加上有限常數不能修復不可行性或無界最值。",
        "No additive constant solves the target: a finite shift cannot repair infeasibility or an unbounded objective."
      ),
      latex,
    };
    return { status: optimum.status, value: null, latex, steps };
  }
  const value = sub(t, optimum.value!),
    latex = `${n.k}=${ratToLatex(value)}`;
  steps[4] = {
    description: text(
      lang,
      "未知加法常數與原本固定常數是不同項；加上未知常數只把所有目標值整體平移，不改變最優點。非常數目標的等值直線保持平行。",
      "The unknown additive constant is distinct from the fixed constant already in F. Adding it shifts every objective value equally and does not change the optimizing set. Nonconstant level lines remain parallel."
    ),
    latex: `${goal === "min" ? "\\min" : "\\max"}_{S}(F+${n.k})=${ratToLatex(optimum.value!)}+${n.k}=${ratToLatex(t)}`,
  };
  steps[5] = {
    description: text(
      lang,
      "以目標最值减去原目標函數的最值，求未知加法常數；代回驗證並保留原最優點。",
      "Subtract the base optimum from the target to find the unknown additive constant; substitute back and retain the original optimizer."
    ),
    latex: aligned([
      `${n.k}=${ratToLatex(t)}-\\left(${ratToLatex(optimum.value!)}\\right)=${ratToLatex(value)}`,
      `${ratToLatex(optimum.value!)}+\\left(${ratToLatex(value)}\\right)=${ratToLatex(t)}`,
    ]),
  };
  return { status: "finite", value, latex, steps };
}

interface ParameterTerm {
  slope: Rational;
  intercept: Rational;
}
function parameterTerm(
  p: LPPoint,
  objective: LPResult["objective"],
  which: "a" | "b",
  constant: boolean
): ParameterTerm {
  return {
    slope: which === "a" ? p.x : p.y,
    intercept: add(
      mul(which === "a" ? objective.b : objective.a, which === "a" ? p.y : p.x),
      constant ? objective.c : Z
    ),
  };
}
function termLatex(t: ParameterTerm, parameter: string): string {
  return expression([{ coefficient: t.slope, symbol: parameter }], t.intercept);
}
function contains(bound: Bound, value: Rational): boolean {
  return (
    bound.feasible &&
    (bound.lower === null || cmp(value, bound.lower) >= 0) &&
    (bound.upper === null || cmp(value, bound.upper) <= 0)
  );
}
function makeInterval(bound: {
  lower: Rational | null;
  upper: Rational | null;
}): LPParameterInterval {
  return {
    lower: bound.lower,
    upper: bound.upper,
    lowerClosed: bound.lower !== null,
    upperClosed: bound.upper !== null,
  };
}
/** Global bound plus attained equality, using a finite exact generator representation of S. */
export function solveCoefficientTarget(
  input: LPInput,
  goal: LPGoal,
  target: LPScalar,
  which: "a" | "b",
  lang: LPLang,
  names?: LPNames
): LPCoefficientResult {
  if (which !== "a" && which !== "b") throw new LPError("input");
  const t = lpRational(target),
    n = labels(names);
  // The replaced coefficient is intentionally ignored; it need not itself be numeric.
  const result = solveLinearProgram({
    ...input,
    objective: { ...input.objective, [which]: "0" },
  });
  const steps = linearProgramSteps(result, goal, lang, names);
  const parameterObjective =
    which === "a"
      ? expression(
          [
            { coefficient: O, symbol: `{${n.p}}{${n.x}}` },
            { coefficient: result.objective.b, symbol: n.y },
          ],
          result.objective.c
        )
      : expression(
          [
            { coefficient: result.objective.a, symbol: n.x },
            { coefficient: O, symbol: `{${n.p}}{${n.y}}` },
          ],
          result.objective.c
        );
  steps[0] = {
    description: text(
      lang,
      "定義實數變數、可行集及未知係數；只替換所選係數，保留另一係數和固定加法常數。目標最值必須在可行集中真正取得。",
      "Define the real variables, feasible set, and unknown coefficient. Replace ONLY the selected coefficient; retain the other coefficient and fixed constant. The target extremum must actually be attained in S."
    ),
    latex: aligned([
      `${n.x},${n.y},${n.p}\\in\\mathbb{R}`,
      ...result.constraints.map(c => lpConstraintLatex(c, names)),
      `F_{${n.p}}=${parameterObjective}`,
      `${goal === "min" ? "\\min" : "\\max"}_{S}F_{${n.p}}=${ratToLatex(t)}`,
    ]),
  };
  if (!result.feasible)
    return {
      status: "infeasible",
      intervals: [],
      latex: `${n.p}\\in\\varnothing`,
      steps,
      breakpoints: [],
    };
  const points = anchors(result),
    rays = recessionRays(normalize(result.constraints));
  const pointTerms = points.map(p =>
    parameterTerm(p, result.objective, which, true)
  );
  const rayTerms = rays.map(p =>
    parameterTerm(p, result.objective, which, false)
  );
  const sign = goal === "max" ? O : neg(O);
  const inequalities = [
    ...pointTerms.map(v => ({
      a: mul(sign, v.slope),
      r: mul(sign, sub(t, v.intercept)),
    })),
    ...rayTerms.map(v => ({
      a: mul(sign, v.slope),
      r: neg(mul(sign, v.intercept)),
    })),
  ];
  const bound = oneDimensional(inequalities);
  const identical = pointTerms.some(
    v => v.slope.n === 0n && eq(v.intercept, t)
  );
  const roots = uniqueRationals(
    pointTerms
      .filter(v => v.slope.n !== 0n)
      .map(v => div(sub(t, v.intercept), v.slope))
  );
  const intervals: LPParameterInterval[] = !bound.feasible
    ? []
    : identical
      ? [makeInterval(bound)]
      : roots
          .filter(v => contains(bound, v))
          .map(v => makeInterval({ lower: v, upper: v }));
  const breakpointValues = [
    ...roots,
    ...rayTerms
      .filter(v => v.slope.n !== 0n)
      .map(v => div(neg(v.intercept), v.slope)),
  ];
  for (let i = 0; i < pointTerms.length; i++)
    for (let j = i + 1; j < pointTerms.length; j++) {
      const difference = sub(pointTerms[i].slope, pointTerms[j].slope);
      if (difference.n !== 0n)
        breakpointValues.push(
          div(sub(pointTerms[j].intercept, pointTerms[i].intercept), difference)
        );
    }
  if (bound.lower !== null) breakpointValues.push(bound.lower);
  if (bound.upper !== null) breakpointValues.push(bound.upper);
  const latex = intervals.length
    ? intervals.map(i => intervalLatex(i, n.p)).join("\\quad\\text{or}\\quad")
    : `${n.p}\\in\\varnothing`;
  const globalRelation = goal === "max" ? "\\le" : "\\ge";
  steps[3] = {
    description: text(
      lang,
      result.vertices.length
        ? "要使目標成為最值，先要求所有真頂點的值均不越過目標，並要求每個可行衰退方向不會令目標越界。必須檢查全部頂點，不可只選一個角點。"
        : "沒有頂點：在每條可行邊界取精確錨點，另加可行見證；它們不是頂點。結合全部齊次衰退方向，就能控制所有可行點，不可套用不存在的角點。",
      result.vertices.length
        ? "Require ALL true vertex values to stay on the correct side of the target, and every recession direction to prevent escape beyond it. Checking just one corner is insufficient."
        : "With no vertices, use exact feasible boundary anchors and a feasible witness (NOT vertices). Together with all homogeneous recession directions these control every feasible point."
    ),
    latex: aligned([
      ...points.map(
        (p, i) =>
          `${result.vertices.length ? "P" : "Q"}_{${i + 1}}=${lpPointLatex(p)}:\\quad ${termLatex(pointTerms[i], n.p)}${globalRelation}${ratToLatex(t)}`
      ),
      ...rays.map(
        (r, i) =>
          `d_{${i + 1}}=${lpPointLatex(r)}:\\quad ${termLatex(rayTerms[i], n.p)}${globalRelation}0`
      ),
      ...inequalities.map(h =>
        h.a.n === 0n
          ? `0\\le ${ratToLatex(h.r)}`
          : `${n.p}${h.a.n > 0n ? "\\le" : "\\ge"}${ratToLatex(div(h.r, h.a))}`
      ),
    ]),
  };
  steps[4] = {
    description: text(
      lang,
      "取全部點值及衰退條件的交集，得到全域上界／下界的參數範圍。每個可行點都能表示為頂點／錨點的凸組合加上衰退方向的非負組合，所以還必須至少有一個點值等於目標，才是可達最值；只有不等式不足夠。非零法向量的等值直線在固定參數下平行，但改變係數通常會旋轉直線。",
      "Intersect ALL point and recession conditions for a global upper/lower bound. Every feasible point is a convex combination of vertices/anchors plus a nonnegative combination of recession directions. Therefore at least one anchor value must equal the target for attainment; inequalities alone are insufficient. For a fixed parameter, nonzero-normal level lines are parallel; varying a coefficient generally rotates them."
    ),
    latex: aligned([
      bound.feasible ? intervalLatex(bound, n.p) : `${n.p}\\in\\varnothing`,
      `P=\\sum_i\\lambda_iQ_i+\\sum_j\\mu_jd_j,\\quad\\lambda_i,\\mu_j\\ge0,\\quad\\sum_i\\lambda_i=1`,
      `\\exists i:\\quad ${pointTerms.map(v => `${termLatex(v, n.p)}=${ratToLatex(t)}`).join("\\quad\\text{or}\\quad")}`,
      `${parameterObjective}=${ratToLatex(t)}`,
    ]),
  };
  steps[5] = {
    description: text(
      lang,
      intervals.length
        ? "結論：列出所有可行參數區間或孤立值。有限端點包含在內（原限制封閉）；每個列出的參數都滿足全域界限及目標取得条件。"
        : "結論：沒有參數同時满足全域界限及目標取得条件；不可把只有界限的參數範圍當成答案。",
      intervals.length
        ? "Conclusion: list ALL solution intervals or isolated values. Finite endpoints are included because the constraints are closed. Every listed parameter satisfies both the global bound and target attainment."
        : "Conclusion: no parameter satisfies both the global bound and target attainment. A bound-only range is not an answer."
    ),
    latex,
  };
  return {
    status: intervals.length ? "solved" : "empty",
    intervals,
    latex,
    steps,
    breakpoints: uniqueRationals(breakpointValues),
  };
}
