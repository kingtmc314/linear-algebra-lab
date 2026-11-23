import type { Data, Layout } from "plotly.js";
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
import {
  computeSpatialAngle,
  spatialRational,
  spatialDot,
  spatialCross,
  spatialVectorLatex,
  spatialSqrtLatex,
  spatialPlaneBasis,
  spatialAngleArc,
  type ExactVec3,
  type NumericVec3,
  type SpatialVec3,
  type SpatialAngleResult,
  type SpatialStep,
  type SpatialSceneOptions,
  type SpatialScene,
} from "./spatialAngles";

export interface NamedSpatialPoint {
  id: string;
  label: string;
  coordinates: SpatialVec3;
}
export interface PointSpatialInput {
  mode: "plane-plane" | "line-plane";
  points: NamedSpatialPoint[];
  plane1: string[];
  plane2?: string[];
  line?: [string, string];
}
export interface ExactNamedSpatialPoint extends NamedSpatialPoint {
  exact: ExactVec3;
}
export interface PointSpatialPlane {
  vertices: ExactNamedSpatialPoint[];
  triple: [
    ExactNamedSpatialPoint,
    ExactNamedSpatialPoint,
    ExactNamedSpatialPoint,
  ];
  a: ExactVec3;
  b: ExactVec3;
  normal: ExactVec3;
}
export type PointSpatialConstruction =
  | {
      kind: "shared-edge";
      edge: [ExactNamedSpatialPoint, ExactNamedSpatialPoint];
      vertex1: ExactNamedSpatialPoint;
      vertex2: ExactNamedSpatialPoint;
      h: ExactVec3;
      ac: ExactVec3;
      ad: ExactVec3;
      hh: Rational;
      coefficient1: Rational;
      coefficient2: Rational;
      u: ExactVec3;
      v: ExactVec3;
    }
  | {
      kind: "section";
      n1: ExactVec3;
      n2: ExactVec3;
      h: ExactVec3;
      u: ExactVec3;
      v: ExactVec3;
      parallel: boolean;
    }
  | {
      kind: "gram";
      a: ExactVec3;
      b: ExactVec3;
      d: ExactVec3;
      aa: Rational;
      ab: Rational;
      bb: Rational;
      da: Rational;
      db: Rational;
      determinant: Rational;
      alpha: Rational;
      beta: Rational;
      q: ExactVec3;
      residual: ExactVec3;
    };
export interface PointSpatialResult {
  input: PointSpatialInput;
  angle: SpatialAngleResult;
  points: ExactNamedSpatialPoint[];
  plane1: PointSpatialPlane;
  plane2?: PointSpatialPlane;
  line?: [ExactNamedSpatialPoint, ExactNamedSpatialPoint];
  construction: PointSpatialConstruction;
  direction1: ExactVec3;
  direction2: ExactVec3;
  directionDot: Rational;
  direction1NormSquared: Rational;
  direction2NormSquared: Rational;
  /** Cosine squared of the smaller angle; also defined as zero when q=0. */
  cosineSquared: Rational;
  cosineLatex: string;
}

export type PointSpatialErrorCode =
  | "input"
  | "point-count"
  | "id"
  | "label"
  | "coordinate"
  | "repeated-point"
  | "reference"
  | "plane-count"
  | "collinear"
  | "noncoplanar"
  | "line";
export class PointSpatialError extends Error {
  constructor(public code: PointSpatialErrorCode) {
    super(pointSpatialErrorMessage(code, "en"));
    this.name = "PointSpatialError";
  }
}
/** Accept the thrown error itself (or its code), so callers need not inspect errors. */
export function pointSpatialErrorMessage(
  error: unknown,
  lang: "zh" | "en"
): string {
  const messages: Record<PointSpatialErrorCode, [string, string]> = {
    input: [
      "Choose a point-defined plane-plane or line-plane calculation.",
      "請選擇以已知點計算的兩平面或直線與平面夾角。",
    ],
    "point-count": [
      "Give 4 to 26 distinct points before selecting planes and a line.",
      "請先給定 4 至 26 個不同的點，再選擇平面或直線。",
    ],
    id: [
      "Every point needs a nonempty, unique identifier.",
      "每個點都必須有非空且不重複的識別碼。",
    ],
    label: [
      "Use unique point labels containing only Latin letters or lowercase Greek letters (for example A, B, α, β).",
      "點名不可重複，且只可使用英文字母或小寫希臘字母（例如 A、B、α、β）。",
    ],
    coordinate: [
      "Enter three finite exact decimals per point (at most 24 significant digits, absolute value at most 1,000,000; nonzero magnitudes at least 10⁻¹²).",
      "每個點請輸入三個有限精確小數（最多 24 位有效數字、絕對值不超過 1,000,000；非零絕對值至少為 10⁻¹²）。",
    ],
    "repeated-point": [
      "Different given points must not have identical geometric coordinates.",
      "不同的已知點不可具有完全相同的座標。",
    ],
    reference: [
      "Select only identifiers of the given points.",
      "只能選擇已給定點的識別碼。",
    ],
    "plane-count": [
      "Each plane needs at least three distinct selected points; do not select a point twice.",
      "每個平面至少須選擇三個不同的點，不可重複選取。",
    ],
    collinear: [
      "All selected vertices are collinear; choose a non-collinear triple to define the plane.",
      "所選頂點全部共線；請選擇包含三個不共線點的頂點以確定平面。",
    ],
    noncoplanar: [
      "The selected plane vertices are not exactly coplanar. Every additional selected vertex must lie in the same plane.",
      "所選平面頂點並非精確共面；所有額外選取的頂點必須位於同一平面。",
    ],
    line: [
      "Choose two distinct given points as the line endpoints.",
      "請選擇兩個不同的已知點作為直線端點。",
    ],
  };
  const candidate = error instanceof PointSpatialError ? error.code : error;
  const code =
    typeof candidate === "string" &&
    Object.prototype.hasOwnProperty.call(messages, candidate)
      ? (candidate as PointSpatialErrorCode)
      : "input";
  return messages[code][lang === "zh" ? 1 : 0];
}

const ZERO = rat(0);
const HALF_PI = "\\frac{\\pi}{2}";
const plus = (a: ExactVec3, b: ExactVec3) =>
  a.map((x, i) => add(x, b[i])) as ExactVec3;
const minus = (a: ExactVec3, b: ExactVec3) =>
  a.map((x, i) => sub(x, b[i])) as ExactVec3;
const scale = (a: ExactVec3, t: Rational) => a.map(x => mul(x, t)) as ExactVec3;
const zeroVector = (a: ExactVec3) => a.every(x => x.n === 0n);
const norm2 = (a: ExactVec3) => spatialDot(a, a);
const vec = spatialVectorLatex;
const r = ratToLatex;
const paren = (x: Rational) => `\\left(${r(x)}\\right)`;
const dotSub = (a: ExactVec3, b: ExactVec3) =>
  a.map((x, i) => `${paren(x)}${paren(b[i])}`).join("+");
const squareSub = (a: ExactVec3) => a.map(x => `${paren(x)}^2`).join("+");
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
  ο: "mathrm{o}",
  π: "pi",
  ρ: "rho",
  σ: "sigma",
  ς: "varsigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
  ϑ: "vartheta",
  ϕ: "varphi",
  ϖ: "varpi",
  ϱ: "varrho",
  ϵ: "varepsilon",
  ϰ: "varkappa",
  ϐ: "beta",
  ϲ: "mathrm{c}",
};
const validLabel = (label: string) =>
  /^[A-Za-zα-ωϑϕϖϱϵϰϐϲ]+$/u.test(label) && label.length <= 32;
/** Labels are validated before interpolation; no user-supplied TeX commands are accepted. */
const labelLatex = (point: NamedSpatialPoint) =>
  `{${Array.from(point.label)
    .map(c => (greek[c] ? `\\${greek[c]} ` : c))
    .join("")}}`;
const edgeLatex = (p: NamedSpatialPoint, q: NamedSpatialPoint) =>
  `\\overrightarrow{${labelLatex(p)}${labelLatex(q)}}`;
const differenceLatex = (
  p: ExactNamedSpatialPoint,
  q: ExactNamedSpatialPoint
) =>
  `${edgeLatex(p, q)}=${vec(q.exact)}-${vec(p.exact)}=${vec(minus(q.exact, p.exact))}`;

function resolvePointPlane(
  ids: string[],
  lookup: Map<string, ExactNamedSpatialPoint>
): PointSpatialPlane {
  if (!Array.isArray(ids) || ids.length < 3 || new Set(ids).size !== ids.length)
    throw new PointSpatialError("plane-count");
  const vertices = ids.map(id => {
    const point = lookup.get(id);
    if (!point) throw new PointSpatialError("reference");
    return point;
  });
  const A = vertices[0];
  let triple: PointSpatialPlane["triple"] | undefined;
  let a: ExactVec3 | undefined,
    b: ExactVec3 | undefined,
    normal: ExactVec3 | undefined;
  for (let i = 1; i < vertices.length && !triple; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const candidateA = minus(vertices[i].exact, A.exact);
      const candidateB = minus(vertices[j].exact, A.exact);
      const candidateNormal = spatialCross(candidateA, candidateB);
      if (!zeroVector(candidateNormal)) {
        triple = [A, vertices[i], vertices[j]];
        a = candidateA;
        b = candidateB;
        normal = candidateNormal;
        break;
      }
    }
  }
  if (!triple) throw new PointSpatialError("collinear");
  for (const point of vertices)
    if (spatialDot(normal!, minus(point.exact, A.exact)).n !== 0n)
      throw new PointSpatialError("noncoplanar");
  return { vertices, triple, a: a!, b: b!, normal: normal! };
}

/** All validation and geometry are rational-exact; floating point is used only to render. */
export function computePointSpatialAngle(
  input: PointSpatialInput
): PointSpatialResult {
  if (!input || (input.mode !== "plane-plane" && input.mode !== "line-plane"))
    throw new PointSpatialError("input");
  if (
    !Array.isArray(input.points) ||
    input.points.length < 4 ||
    input.points.length > 26
  )
    throw new PointSpatialError("point-count");
  const ids = new Set<string>(),
    labels = new Set<string>(),
    positions = new Set<string>();
  const points = input.points.map(point => {
    if (
      !point ||
      typeof point.id !== "string" ||
      !point.id.trim() ||
      ids.has(point.id)
    )
      throw new PointSpatialError("id");
    if (
      typeof point.label !== "string" ||
      !validLabel(point.label) ||
      labels.has(point.label)
    )
      throw new PointSpatialError("label");
    ids.add(point.id);
    labels.add(point.label);
    if (!Array.isArray(point.coordinates) || point.coordinates.length !== 3)
      throw new PointSpatialError("coordinate");
    let exact: ExactVec3;
    try {
      if (
        point.coordinates.some(
          x => typeof x !== "string" && typeof x !== "number"
        )
      )
        throw new Error("Invalid scalar");
      exact = point.coordinates.map(spatialRational) as ExactVec3;
    } catch {
      throw new PointSpatialError("coordinate");
    }
    const key = exact.map(x => `${x.n}/${x.d}`).join(",");
    if (positions.has(key)) throw new PointSpatialError("repeated-point");
    positions.add(key);
    return {
      id: point.id,
      label: point.label,
      coordinates: [...point.coordinates] as SpatialVec3,
      exact,
    };
  });
  const lookup = new Map(points.map(p => [p.id, p]));
  const plane1 = resolvePointPlane(input.plane1, lookup);
  const plane2 =
    input.mode === "plane-plane"
      ? resolvePointPlane(input.plane2!, lookup)
      : undefined;
  let line: PointSpatialResult["line"];
  if (input.mode === "line-plane") {
    if (
      !Array.isArray(input.line) ||
      input.line.length !== 2 ||
      input.line[0] === input.line[1]
    )
      throw new PointSpatialError("line");
    const P = lookup.get(input.line[0]),
      Q = lookup.get(input.line[1]);
    if (!P || !Q) throw new PointSpatialError("reference");
    line = [P, Q];
  }
  const planeInput = (p: PointSpatialPlane) => ({
    kind: "points" as const,
    points: p.triple.map(x => x.coordinates) as [
      SpatialVec3,
      SpatialVec3,
      SpatialVec3,
    ],
  });
  // The legacy solver is used only for its canonical exact answer and resolved geometry.
  const angle = computeSpatialAngle(
    plane2
      ? {
          mode: "plane-plane",
          plane1: planeInput(plane1),
          plane2: planeInput(plane2),
        }
      : {
          mode: "line-plane",
          plane: planeInput(plane1),
          line: {
            kind: "points",
            points: line!.map(x => x.coordinates) as [SpatialVec3, SpatialVec3],
          },
        }
  );
  let construction: PointSpatialConstruction;
  let direction1: ExactVec3, direction2: ExactVec3;
  if (plane2) {
    const shared = plane1.vertices.filter(p =>
      plane2.vertices.some(q => q.id === p.id)
    );
    if (shared.length >= 2) {
      const edge: [ExactNamedSpatialPoint, ExactNamedSpatialPoint] = [
        shared[0],
        shared[1],
      ];
      const h = minus(edge[1].exact, edge[0].exact),
        hh = norm2(h);
      const vertex1 = plane1.vertices.find(
        p => !zeroVector(spatialCross(h, minus(p.exact, edge[0].exact)))
      )!;
      const vertex2 = plane2.vertices.find(
        p => !zeroVector(spatialCross(h, minus(p.exact, edge[0].exact)))
      )!;
      const ac = minus(vertex1.exact, edge[0].exact),
        ad = minus(vertex2.exact, edge[0].exact);
      const coefficient1 = div(spatialDot(ac, h), hh),
        coefficient2 = div(spatialDot(ad, h), hh);
      const u = minus(ac, scale(h, coefficient1)),
        v = minus(ad, scale(h, coefficient2));
      construction = {
        kind: "shared-edge",
        edge,
        vertex1,
        vertex2,
        h,
        ac,
        ad,
        hh,
        coefficient1,
        coefficient2,
        u,
        v,
      };
      direction1 = u;
      direction2 = v;
    } else {
      const n1 = plane1.normal,
        n2 = plane2.normal,
        h = spatialCross(n1, n2);
      const parallel = zeroVector(h);
      const u = parallel ? plane1.a : spatialCross(h, n1);
      const v = parallel ? plane1.a : spatialCross(h, n2);
      construction = { kind: "section", n1, n2, h, u, v, parallel };
      direction1 = u;
      direction2 = v;
    }
  } else {
    const a = plane1.a,
      b = plane1.b,
      d = minus(line![1].exact, line![0].exact);
    const aa = norm2(a),
      ab = spatialDot(a, b),
      bb = norm2(b),
      da = spatialDot(d, a),
      db = spatialDot(d, b);
    const determinant = sub(mul(aa, bb), mul(ab, ab));
    // Independent in-plane vectors guarantee a strictly positive Gram determinant.
    const alpha = div(sub(mul(da, bb), mul(db, ab)), determinant);
    const beta = div(sub(mul(db, aa), mul(da, ab)), determinant);
    const q = plus(scale(a, alpha), scale(b, beta)),
      residual = minus(d, q);
    construction = {
      kind: "gram",
      a,
      b,
      d,
      aa,
      ab,
      bb,
      da,
      db,
      determinant,
      alpha,
      beta,
      q,
      residual,
    };
    direction1 = d;
    direction2 = q;
  }
  const directionDot = spatialDot(direction1, direction2);
  const direction1NormSquared = norm2(direction1),
    direction2NormSquared = norm2(direction2);
  const cosineSquared =
    direction2NormSquared.n === 0n
      ? ZERO
      : div(
          mul(directionDot, directionDot),
          mul(direction1NormSquared, direction2NormSquared)
        );
  const cosineLatex = spatialSqrtLatex(cosineSquared);
  if (input.mode === "line-plane" && angle.angleLatex.startsWith("\\arcsin")) {
    // Preserve legacy exact special values, but display the Gram-projection method's
    // inverse cosine for arbitrary angles rather than an unexplained normal ratio.
    angle.angleLatex = `\\arccos\\left(${cosineLatex}\\right)`;
    angle.supplementaryLatex = `\\pi-\\left(${angle.angleLatex}\\right)`;
    angle.normalAngleLatex = `${HALF_PI}-\\left(${angle.angleLatex}\\right)`;
  }
  const snapshot: PointSpatialInput = {
    mode: input.mode,
    points: points.map(({ id, label, coordinates }) => ({
      id,
      label,
      coordinates: [...coordinates] as SpatialVec3,
    })),
    plane1: [...input.plane1],
    ...(plane2 ? { plane2: [...input.plane2!] } : {}),
    ...(line ? { line: [...input.line!] as [string, string] } : {}),
  };
  return {
    input: snapshot,
    angle,
    points,
    plane1,
    plane2,
    line,
    construction,
    direction1,
    direction2,
    directionDot,
    direction1NormSquared,
    direction2NormSquared,
    cosineSquared,
    cosineLatex,
  };
}

/** Point coordinates and vertex/endpoint definitions only, never Cartesian equations. */
export function pointSpatialDefinitionLatex(
  result: PointSpatialResult
): string[] {
  const definitions = result.points.map(
    p => `${labelLatex(p)}=${vec(p.exact)}`
  );
  const plane = (p: PointSpatialPlane, name: string) =>
    `${name}:\\quad\\operatorname{plane}\\left(${p.vertices.map(labelLatex).join(",\\,")}\\right)`;
  definitions.push(plane(result.plane1, result.plane2 ? "\\Pi_1" : "\\Pi"));
  if (result.plane2) definitions.push(plane(result.plane2, "\\Pi_2"));
  if (result.line)
    definitions.push(
      `\\ell:\\quad\\operatorname{line}\\left(${result.line.map(labelLatex).join(",\\,")}\\right)`
    );
  return definitions;
}
const basisLatex = (plane: PointSpatialPlane, subscript = "") => {
  const [A, B, C] = plane.triple;
  return `\\mathbf a${subscript}=${differenceLatex(A, B)},\\quad\\mathbf b${subscript}=${differenceLatex(A, C)}`;
};
const metricLatex = (result: PointSpatialResult, a: string, b: string) =>
  `${a}\\cdot${b}=${dotSub(result.direction1, result.direction2)}=${r(result.directionDot)},\\quad\\|${a}\\|^2=${squareSub(result.direction1)}=${r(result.direction1NormSquared)},\\quad\\|${b}\\|^2=${squareSub(result.direction2)}=${r(result.direction2NormSquared)},\\quad\\|${a}\\|=${spatialSqrtLatex(result.direction1NormSquared)},\\ \\|${b}\\|=${spatialSqrtLatex(result.direction2NormSquared)}`;
const cosineFormula = (result: PointSpatialResult, a: string, b: string) =>
  `\\cos\\theta=\\frac{|${a}\\cdot${b}|}{\\|${a}\\|\\|${b}\\|}=\\frac{|${r(result.directionDot)}|}{${paren(result.direction1NormSquared)}^{1/2}${paren(result.direction2NormSquared)}^{1/2}}=${result.cosineLatex},\\quad\\theta=\\arccos\\left(${result.cosineLatex}\\right)=${result.angle.angleLatex}`;

/** Exactly six vector-only construction stages; stage indices match pointSpatialScene. */
export function pointSpatialSteps(
  result: PointSpatialResult,
  lang: "zh" | "en",
  supplementary = false
): SpatialStep[] {
  const text = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const c = result.construction,
    angle = result.angle;
  const final: SpatialStep = {
    description: result.plane2
      ? supplementary
        ? text(
            "The requested supplementary opening is θs=π−θ, not the standard smaller dihedral angle. It is 90° for perpendicular planes and a degenerate 180° for parallel planes.",
            "所選補角開口為 θs=π−θ，而非通常的較小二面角；垂直時為 90°，平行時為退化的 180° 開口。"
          )
        : text(
            "Report the smaller dihedral angle. Taking the absolute dot product makes reversed vertex order and opposite projected directions equivalent; the other opening is π−θ.",
            "結果採用較小二面角。內積取絕對值，使頂點順序反轉或投影方向反向不影響結果；另一開口為 π−θ。"
          )
      : text(
          "Report the smaller line-plane angle, always between 0° and 90°. Reversing the endpoints or changing the independent in-plane basis leaves the result unchanged.",
          "結果採用 0° 至 90° 的較小直線與平面夾角；端點反向或更換平面內的獨立基底不會改變結果。"
        ),
    latex: result.plane2
      ? `\\theta=${angle.angleLatex},\\quad\\theta_s=\\pi-\\theta=${angle.supplementaryLatex}`
      : `\\theta=${angle.angleLatex},\\quad 0\\leq\\theta\\leq${HALF_PI}`,
  };
  if (c.kind === "shared-edge") {
    const [A, B] = c.edge,
      C = c.vertex1,
      D = c.vertex2;
    return [
      {
        description: text(
          "Start with the given named points and two planes defined by their vertices. Their shared edge supplies the direction h; let the unknown smaller dihedral angle be θ, with 0≤θ≤π/2.",
          "從已知點與頂點所定義的兩平面出發。共邊提供方向 h；設未知的較小二面角為 θ，且 0≤θ≤π/2。"
        ),
        latex: `${pointSpatialDefinitionLatex(result).slice(result.points.length).join(",\\quad")},\\quad\\mathbf h=${differenceLatex(A, B)},\\quad 0\\leq\\theta\\leq${HALF_PI}`,
      },
      {
        description: text(
          "Choose one vertex off the shared edge in each plane. Subtract the edge origin from those points to obtain two in-plane vectors; neither is parallel to h.",
          "各平面選取一個不在共邊上的頂點。以共邊起點相減得到兩個平面內向量；兩者都不平行於 h。"
        ),
        latex: `\\mathbf c=${differenceLatex(A, C)},\\quad\\mathbf e=${differenceLatex(A, D)}`,
      },
      {
        description: text(
          "Remove the component along h from the first in-plane vector. The resulting nonzero u is in the first plane and perpendicular to the shared edge: it is a direction in a perpendicular section.",
          "從第一個平面內向量扣除沿 h 的分量。非零 u 位於第一平面內且垂直共邊，是垂直截面中的方向。"
        ),
        latex: `\\mathbf h\\cdot\\mathbf h=${squareSub(c.h)}=${r(c.hh)},\\quad\\mathbf c\\cdot\\mathbf h=${dotSub(c.ac, c.h)}=${r(spatialDot(c.ac, c.h))},\\quad\\mathbf u=\\mathbf c-\\frac{\\mathbf c\\cdot\\mathbf h}{\\mathbf h\\cdot\\mathbf h}\\mathbf h=${vec(c.ac)}-\\frac{${r(spatialDot(c.ac, c.h))}}{${r(c.hh)}}${vec(c.h)}=${vec(c.ac)}-${paren(c.coefficient1)}${vec(c.h)}=${vec(c.u)},\\quad\\mathbf u\\cdot\\mathbf h=0`,
      },
      {
        description: text(
          "Do the same for the second plane to obtain v. Both projected directions lie in the section perpendicular to h; the diagram's projection connectors are parallel to h and make right angles with u and v.",
          "同樣投影第二平面得到 v。兩個投影方向都在垂直 h 的截面中；圖中的投影連線平行 h，並與 u、v 成直角。"
        ),
        latex: `\\mathbf e\\cdot\\mathbf h=${dotSub(c.ad, c.h)}=${r(spatialDot(c.ad, c.h))},\\quad\\mathbf v=\\mathbf e-\\frac{\\mathbf e\\cdot\\mathbf h}{\\mathbf h\\cdot\\mathbf h}\\mathbf h=${vec(c.ad)}-\\frac{${r(spatialDot(c.ad, c.h))}}{${r(c.hh)}}${vec(c.h)}=${vec(c.ad)}-${paren(c.coefficient2)}${vec(c.h)}=${vec(c.v)},\\quad\\mathbf v\\cdot\\mathbf h=0`,
      },
      {
        description: text(
          "Evaluate the exact dot product and lengths of u and v. Choose v or −v for the smaller opening; the absolute dot product gives its cosine. Special angles are exact multiples of π; otherwise keep exact inverse trigonometry.",
          "精確計算 u、v 的內積及長度，選取 v 或 −v 形成較小開口；內積絕對值給出餘弦。特殊角寫成精確 π 倍數，其餘保留反三角函數。"
        ),
        latex: `${metricLatex(result, "\\mathbf u", "\\mathbf v")},\\quad${cosineFormula(result, "\\mathbf u", "\\mathbf v")}`,
      },
      final,
    ];
  }
  if (c.kind === "section") {
    return [
      {
        description: text(
          "The given points define the first plane by vertices, not by an equation. Choose a non-collinear triple and subtract its first vertex to obtain independent in-plane directions a₁ and b₁. Let θ be the unknown smaller dihedral angle.",
          "已知點以頂點而非方程式定義第一平面。選取不共線三點並相減，得到獨立的平面內方向 a₁、b₁；設未知較小二面角為 θ。"
        ),
        latex: `${basisLatex(result.plane1, "_1")},\\quad 0\\leq\\theta\\leq${HALF_PI}`,
      },
      {
        description: text(
          "Construct independent directions a₂ and b₂ in the second plane. Cross products give auxiliary perpendicular vectors n₁ and n₂; these are not in-plane directions and require no plane equations.",
          "同樣求出第二平面內的獨立方向 a₂、b₂。叉積得到輔助垂直向量 n₁、n₂；它們不是平面內方向，也不需平面方程式。"
        ),
        latex: `${basisLatex(result.plane2!, "_2")},\\quad\\mathbf n_1=\\mathbf a_1\\times\\mathbf b_1=${vec(result.plane1.a)}\\times${vec(result.plane1.b)}=${vec(c.n1)},\\quad\\mathbf n_2=\\mathbf a_2\\times\\mathbf b_2=${vec(result.plane2!.a)}\\times${vec(result.plane2!.b)}=${vec(c.n2)}`,
      },
      {
        description: c.parallel
          ? text(
              "The cross product h is zero, so the planes are parallel (possibly coincident). No section direction is obtained by dividing by h: define θ=0 and use a translated common in-plane direction for display.",
              "叉積 h 為零，故兩平面平行（或重合）。不可除以 h 求截面方向；直接定義 θ=0，圖中使用平移的共同平面內方向。"
            )
          : text(
              "Use h=n₁×n₂ as the intersection direction. It is perpendicular to both auxiliary perpendicular vectors; the angle is measured in a section perpendicular to h.",
              "取 h=n₁×n₂ 為交線方向，它垂直兩個輔助垂直向量；夾角在垂直 h 的截面中量度。"
            ),
        latex: `\\mathbf h=\\mathbf n_1\\times\\mathbf n_2=${vec(c.n1)}\\times${vec(c.n2)}=${vec(c.h)}${c.parallel ? ",\\quad\\theta=0" : ""}`,
      },
      {
        description: c.parallel
          ? text(
              "A common in-plane direction can be translated between parallel planes without changing its direction. The patches still connect the actual given vertices; no zero vector is normalized.",
              "平行平面可共用平移後的平面內方向，方向不變。圖塊仍連接實際已知頂點，不會將零向量正規化。"
            )
          : text(
              "Construct u=h×n₁ and v=h×n₂. Each lies in its own plane and is perpendicular to h, so they are the section directions whose smaller angle equals the dihedral angle.",
              "構造 u=h×n₁、v=h×n₂。各自位於相應平面內且垂直 h，因此這兩個截面方向的較小夾角就是二面角。"
            ),
        latex: c.parallel
          ? `\\mathbf u=\\mathbf a_1=${vec(c.u)},\\quad\\mathbf v=\\mathbf u=${vec(c.v)}`
          : `\\mathbf u=\\mathbf h\\times\\mathbf n_1=${vec(c.h)}\\times${vec(c.n1)}=${vec(c.u)},\\quad\\mathbf v=\\mathbf h\\times\\mathbf n_2=${vec(c.h)}\\times${vec(c.n2)}=${vec(c.v)},\\quad\\mathbf u\\cdot\\mathbf h=\\mathbf v\\cdot\\mathbf h=0`,
      },
      {
        description: text(
          "Calculate the exact section-direction dot product and lengths. Absolute value selects the smaller angle independently of vertex orientation. Only exact special values become multiples of π; other values remain inverse-trigonometric expressions.",
          "精確計算截面方向的內積與長度。絕對值選取較小夾角，不受頂點方向影響；只有精確特殊值化為 π 倍數，其餘保留反三角函數。"
        ),
        latex: `${metricLatex(result, "\\mathbf u", "\\mathbf v")},\\quad${cosineFormula(result, "\\mathbf u", "\\mathbf v")}`,
      },
      final,
    ];
  }
  const [P, Q] = result.line!;
  return [
    {
      description: text(
        "Start with a plane defined by at least three non-collinear given vertices. Subtract one vertex from two others to obtain independent in-plane vectors a and b. Let θ be the unknown smaller angle between the selected line and this plane.",
        "從至少三個不共線已知頂點所定義的平面出發。以一個頂點為起點相減，得到獨立的平面內向量 a、b；設所選直線與此平面的未知較小夾角為 θ。"
      ),
      latex: `${basisLatex(result.plane1)},\\quad 0\\leq\\theta\\leq${HALF_PI}`,
    },
    {
      description: text(
        "The selected endpoints give d=Q−P. Define its in-plane projection q=αa+βb. Orthogonality of d−q to both a and b produces a two-by-two Gram dot-product system, with no normal or plane equation needed.",
        "所選端點相減得到 d。定義平面內投影 q=αa+βb；要求 d−q 同時垂直 a、b，得到二乘二 Gram 內積系統，不需法向量或平面方程式。"
      ),
      latex: `\\mathbf d=${differenceLatex(P, Q)},\\quad\\mathbf q=\\alpha\\mathbf a+\\beta\\mathbf b,\\quad(\\mathbf d-\\mathbf q)\\cdot\\mathbf a=(\\mathbf d-\\mathbf q)\\cdot\\mathbf b=0,\\quad\\begin{pmatrix}\\mathbf a\\cdot\\mathbf a&\\mathbf a\\cdot\\mathbf b\\\\\\mathbf a\\cdot\\mathbf b&\\mathbf b\\cdot\\mathbf b\\end{pmatrix}\\binom{\\alpha}{\\beta}=\\binom{\\mathbf d\\cdot\\mathbf a}{\\mathbf d\\cdot\\mathbf b}`,
    },
    {
      description: text(
        "Compute all five dot products by coordinate substitution. The Gram determinant Δ is strictly positive because a and b are independent; solve explicitly for α and β using exact rational arithmetic.",
        "以座標代入精確計算五個內積。a、b 獨立，故 Gram 行列式 Δ 嚴格為正；以精確有理數明確求出 α、β。"
      ),
      latex: `\\mathbf a\\cdot\\mathbf a=${squareSub(c.a)}=${r(c.aa)},\\quad\\mathbf a\\cdot\\mathbf b=${dotSub(c.a, c.b)}=${r(c.ab)},\\quad\\mathbf b\\cdot\\mathbf b=${squareSub(c.b)}=${r(c.bb)},\\quad\\mathbf d\\cdot\\mathbf a=${dotSub(c.d, c.a)}=${r(c.da)},\\quad\\mathbf d\\cdot\\mathbf b=${dotSub(c.d, c.b)}=${r(c.db)},\\quad\\Delta=(\\mathbf a\\cdot\\mathbf a)(\\mathbf b\\cdot\\mathbf b)-(\\mathbf a\\cdot\\mathbf b)^2=${paren(c.aa)}${paren(c.bb)}-${paren(c.ab)}^2=${r(c.determinant)}>0,\\quad\\alpha=\\frac{(\\mathbf d\\cdot\\mathbf a)(\\mathbf b\\cdot\\mathbf b)-(\\mathbf d\\cdot\\mathbf b)(\\mathbf a\\cdot\\mathbf b)}{\\Delta}=\\frac{${paren(c.da)}${paren(c.bb)}-${paren(c.db)}${paren(c.ab)}}{${r(c.determinant)}}=${r(c.alpha)},\\quad\\beta=\\frac{(\\mathbf d\\cdot\\mathbf b)(\\mathbf a\\cdot\\mathbf a)-(\\mathbf d\\cdot\\mathbf a)(\\mathbf a\\cdot\\mathbf b)}{\\Delta}=\\frac{${paren(c.db)}${paren(c.aa)}-${paren(c.da)}${paren(c.ab)}}{${r(c.determinant)}}=${r(c.beta)}`,
    },
    {
      description: text(
        "Substitute α and β to construct q and the perpendicular residual d−q. The projection and residual form a right-angle component triangle. A zero projection means a perpendicular line; a zero residual means a parallel line.",
        "代入 α、β 構造投影 q 與垂直餘量 d−q。兩分量形成直角三角形；投影為零表示直線垂直平面，餘量為零表示直線平行平面。"
      ),
      latex: `\\mathbf q=\\alpha\\mathbf a+\\beta\\mathbf b=${paren(c.alpha)}${vec(c.a)}+${paren(c.beta)}${vec(c.b)}=${vec(c.q)},\\quad\\mathbf d-\\mathbf q=${vec(c.d)}-${vec(c.q)}=${vec(c.residual)},\\quad(\\mathbf d-\\mathbf q)\\cdot\\mathbf a=(\\mathbf d-\\mathbf q)\\cdot\\mathbf b=0,\\quad\\mathbf q\\cdot(\\mathbf d-\\mathbf q)=0`,
    },
    {
      description: zeroVector(c.q)
        ? text(
            "Here q=0, so the line is perpendicular to the plane and θ=π/2. Do not divide by its zero length; the diagram uses an explicitly marked in-plane reference direction, not a nonzero projection.",
            "此處 q=0，故直線垂直平面且 θ=π/2。不可除以零長度；圖中明確標示平面內參考方向，而非非零投影。"
          )
        : zeroVector(c.residual)
          ? text(
              "Here d=q, so the line is parallel to the plane and θ=0. The exact cosine is one. Otherwise the smaller angle is between d and its in-plane projection, not a perpendicular vector.",
              "此處 d=q，故直線平行平面且 θ=0，精確餘弦為一。一般較小夾角介於 d 與其平面內投影之間，並非與垂直向量的夾角。"
            )
          : text(
              "Measure θ between d and its in-plane projection q. Substitute exact dot products and radicals into the cosine formula. Its exact arccos agrees with the canonical exact answer; do not round arbitrary angles to special values.",
              "量度 d 與平面內投影 q 的夾角 θ。代入精確內積與根式計算餘弦；精確反餘弦與標準精確答案一致，不可將任意角四捨五入為特殊角。"
            ),
      latex: `${metricLatex(result, "\\mathbf d", "\\mathbf q")},\\quad${zeroVector(c.q) ? `\\mathbf q=\\mathbf 0\\;\\Longrightarrow\\;\\theta=${HALF_PI}` : cosineFormula(result, "\\mathbf d", "\\mathbf q")}`,
    },
    final,
  ];
}

// Numeric helpers are rendering-only; retain the exact construction above for teaching.
function numberOf(value: Rational): number {
  const direct = toNumber(value);
  if (Number.isFinite(direct)) return direct;
  const sign = value.n < 0n ? -1 : 1;
  const n = (value.n < 0n ? -value.n : value.n).toString(),
    d = value.d.toString();
  const a = n.slice(0, 16),
    b = d.slice(0, 16);
  return (
    ((sign * Number(a)) / Number(b)) *
    10 ** (n.length - a.length - d.length + b.length)
  );
}
const numeric = (v: ExactVec3) => v.map(numberOf) as NumericVec3;
const nplus = (a: NumericVec3, b: NumericVec3) =>
  a.map((x, i) => x + b[i]) as NumericVec3;
const nminus = (a: NumericVec3, b: NumericVec3) =>
  a.map((x, i) => x - b[i]) as NumericVec3;
const nscale = (a: NumericVec3, t: number) => a.map(x => x * t) as NumericVec3;
const nlength = (v: NumericVec3) => Math.hypot(...v);
const nunit = (v: NumericVec3) => nscale(v, 1 / nlength(v));

/** Scene geometry is built from the same vectors as the six stages, with real vertices. */
export function pointSpatialScene(
  result: PointSpatialResult,
  options: SpatialSceneOptions
): SpatialScene {
  const stage = Math.max(0, Math.min(5, options.stepIndex ?? 5)),
    lang = options.lang ?? "en";
  const text = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const data: Data[] = [],
    teal = "#0f766e",
    amber = "#b7791f",
    ink = "#334155",
    rose = "#b45360";
  const given = result.points.map(p => numeric(p.exact));
  const extent = Math.max(
    ...[0, 1, 2].map(
      i => Math.max(...given.map(p => p[i])) - Math.min(...given.map(p => p[i]))
    )
  );
  const displayLength = extent * 0.35;
  const lineTrace = (
    points: NumericVec3[],
    name: string,
    color: string,
    dash: "solid" | "dash" | "dot" = "solid",
    width = 4,
    showlegend = true
  ) => {
    data.push({
      type: "scatter3d",
      mode: "lines",
      x: points.map(p => p[0]),
      y: points.map(p => p[1]),
      z: points.map(p => p[2]),
      name,
      line: { color, dash, width },
      showlegend,
      hoverinfo: "name",
    } as Data);
  };
  const pointsTrace = (
    points: NumericVec3[],
    labels: string[],
    color: string,
    name: string
  ) => {
    data.push({
      type: "scatter3d",
      mode: "text+markers",
      x: points.map(p => p[0]),
      y: points.map(p => p[1]),
      z: points.map(p => p[2]),
      name,
      text: labels,
      textposition: "top center",
      marker: { color, size: 4 },
      textfont: { color, size: 12 },
      showlegend: false,
      hoverinfo: "text",
    } as Data);
  };
  // All given points, including unselected extras, are shown exactly once at every stage.
  pointsTrace(
    given,
    result.points.map(p => p.label),
    ink,
    text("Given points", "已知點")
  );
  const planeTrace = (
    plane: PointSpatialPlane,
    name: string,
    color: string
  ) => {
    const vertices = plane.vertices.map(p => numeric(p.exact));
    const centroid = nscale(
      vertices.reduce(nplus, [0, 0, 0]),
      1 / vertices.length
    );
    const [u, v] = spatialPlaneBasis(numeric(plane.normal));
    const dot = (a: NumericVec3, b: NumericVec3) =>
      a.reduce((s, x, i) => s + x * b[i], 0);
    // Angular ordering gives a vertex outline without replacing the user points by a patch.
    const ordered = vertices
      .map(p => ({
        p,
        angle: Math.atan2(
          dot(nminus(p, centroid), v),
          dot(nminus(p, centroid), u)
        ),
      }))
      .sort((a, b) => a.angle - b.angle)
      .map(x => x.p);
    lineTrace([...ordered, ordered[0]], name, color, "solid", 3);
    const mesh = [centroid, ...ordered];
    data.push({
      type: "mesh3d",
      name,
      x: mesh.map(p => p[0]),
      y: mesh.map(p => p[1]),
      z: mesh.map(p => p[2]),
      i: new Float64Array(ordered.map(() => 0)),
      j: new Float64Array(ordered.map((_, i) => i + 1)),
      k: new Float64Array(
        ordered.map((_, i) => ((i + 1) % ordered.length) + 1)
      ),
      color,
      opacity: 0.2,
      flatshading: true,
      showlegend: false,
      hoverinfo: "name",
    } as Data);
  };
  const arrow = (
    origin: NumericVec3,
    vector: NumericVec3,
    name: string,
    color: string,
    dash: "solid" | "dash" | "dot" = "solid"
  ) => {
    if (!nlength(vector)) return;
    const tip = nplus(origin, vector),
      unit = nunit(vector);
    lineTrace([origin, tip], name, color, dash);
    const [a] = spatialPlaneBasis(unit),
      size = Math.min(nlength(vector) * 0.12, displayLength * 0.12);
    const back = nminus(tip, nscale(unit, size));
    lineTrace(
      [
        nplus(back, nscale(a, size * 0.4)),
        tip,
        nminus(back, nscale(a, size * 0.4)),
      ],
      name,
      color,
      "solid",
      3,
      false
    );
  };
  const rightAngle = (corner: NumericVec3, a: NumericVec3, b: NumericVec3) => {
    if (!nlength(a) || !nlength(b)) return;
    const size = Math.min(nlength(a), nlength(b), displayLength) * 0.13;
    const x = nscale(nunit(a), size),
      y = nscale(nunit(b), size);
    lineTrace(
      [nplus(corner, x), nplus(nplus(corner, x), y), nplus(corner, y)],
      "90°",
      ink,
      "solid",
      2,
      false
    );
  };
  planeTrace(result.plane1, result.plane2 ? "Π₁" : "Π", teal);
  if (result.plane2 && stage >= 1) planeTrace(result.plane2, "Π₂", amber);
  const c = result.construction;
  let center: NumericVec3,
    start: NumericVec3,
    end: NumericVec3,
    fallback: NumericVec3,
    note: string;
  if (c.kind === "shared-edge") {
    center = numeric(c.edge[0].exact);
    const h = numeric(c.h),
      ac = numeric(c.ac),
      ad = numeric(c.ad),
      u = numeric(c.u),
      v = numeric(c.v);
    start = u;
    end = v;
    fallback = h;
    arrow(center, h, "h", ink);
    if (stage >= 1) {
      arrow(center, ac, "c", teal);
      arrow(center, ad, "e", amber);
    }
    if (stage >= 2) {
      arrow(center, u, "u", teal);
      const foot = nplus(center, u),
        vertex = numeric(c.vertex1.exact);
      lineTrace(
        [foot, vertex],
        text("First projection connector", "第一投影連線"),
        teal,
        "dot",
        3
      );
      rightAngle(foot, nscale(u, -1), nminus(vertex, foot));
    }
    if (stage >= 3) {
      arrow(center, v, "v", amber);
      const foot = nplus(center, v),
        vertex = numeric(c.vertex2.exact);
      lineTrace(
        [foot, vertex],
        text("Second projection connector", "第二投影連線"),
        amber,
        "dot",
        3
      );
      rightAngle(foot, nscale(v, -1), nminus(vertex, foot));
    }
    note = text(
      "The named vertices are at their actual coordinates. h, c, e, u and v retain their actual vector lengths; dotted connectors remove the components along the shared edge. The arc chooses v or −v for the smaller opening.",
      "具名頂點位於實際座標。h、c、e、u、v 保留實際向量長度；點線扣除沿共邊的分量。角弧選取 v 或 −v 形成較小開口。"
    );
  } else if (c.kind === "section") {
    // Find a point on both planes by a vector displacement from the first vertex.
    const origin = result.plane1.triple[0].exact;
    const denominator = spatialDot(c.n2, c.u);
    const exactCenter = c.parallel
      ? origin
      : plus(
          origin,
          scale(
            c.u,
            div(
              spatialDot(c.n2, minus(result.plane2!.triple[0].exact, origin)),
              denominator
            )
          )
        );
    center = numeric(exactCenter);
    start = nscale(nunit(numeric(c.u)), displayLength);
    end = nscale(nunit(numeric(c.v)), displayLength);
    fallback = numeric(c.n1);
    const A = numeric(origin),
      B = numeric(result.plane2!.triple[0].exact);
    if (stage >= 0) {
      arrow(A, numeric(result.plane1.a), "a₁", teal);
      arrow(A, numeric(result.plane1.b), "b₁", teal);
    }
    if (stage >= 1) {
      arrow(B, numeric(result.plane2!.a), "a₂", amber);
      arrow(B, numeric(result.plane2!.b), "b₂", amber);
      arrow(
        A,
        nscale(nunit(numeric(c.n1)), displayLength),
        "n₁ (direction)",
        teal,
        "dot"
      );
      arrow(
        B,
        nscale(nunit(numeric(c.n2)), displayLength),
        "n₂ (direction)",
        amber,
        "dot"
      );
    }
    if (stage >= 2 && !c.parallel)
      arrow(
        center,
        nscale(nunit(numeric(c.h)), displayLength),
        "h (direction)",
        ink,
        "dash"
      );
    if (stage >= 3) {
      arrow(center, start, "u (direction)", teal);
      arrow(center, end, "v (direction)", amber);
      if (!c.parallel) {
        const h = nscale(nunit(numeric(c.h)), displayLength);
        rightAngle(center, start, h);
        rightAngle(center, end, h);
      }
    }
    note = c.parallel
      ? text(
          "Parallel planes: θ=0. Vertex outlines retain their actual positions. The common in-plane display direction is translated; auxiliary perpendicular and section arrows show directions only, with a common display length.",
          "平行平面：θ=0。頂點輪廓保留實際位置；共同平面內方向平移顯示。輔助垂直與截面箭頭僅顯示方向，使用共同顯示長度。"
        )
      : text(
          "Vertex outlines retain actual coordinates. The section is perpendicular to h at a point on both planes. Auxiliary perpendicular and section arrows show directions only, with a common display length, not their computed magnitudes.",
          "頂點輪廓保留實際座標。截面於兩平面上的一點垂直 h。輔助垂直與截面箭頭僅顯示方向，使用共同顯示長度，並非計算所得大小。"
        );
  } else {
    center = numeric(result.plane1.triple[0].exact);
    const a = numeric(c.a),
      b = numeric(c.b),
      d = numeric(c.d),
      q = numeric(c.q),
      residual = numeric(c.residual);
    start = zeroVector(c.q) ? a : q;
    end = d;
    fallback = zeroVector(c.q)
      ? d
      : zeroVector(c.residual)
        ? numeric(result.plane1.normal)
        : residual;
    arrow(center, a, "a", teal);
    arrow(center, b, "b", teal);
    if (stage >= 1) {
      lineTrace(
        result.line!.map(p => numeric(p.exact)),
        "ℓ",
        ink,
        "solid",
        5
      );
      arrow(center, d, "d (translated)", ink);
    }
    if (stage >= 3) {
      if (!zeroVector(c.q)) arrow(center, q, "q", amber, "dash");
      arrow(nplus(center, q), residual, "d−q", rose, "dot");
      rightAngle(nplus(center, q), nscale(q, -1), residual);
      if (zeroVector(c.q)) {
        arrow(
          center,
          a,
          text("In-plane reference (q=0)", "平面內參考方向（q=0）"),
          amber,
          "dash"
        );
        rightAngle(center, a, d);
      }
    }
    note = text(
      "All named points and the endpoint segment keep their actual coordinates. For the component triangle, d is translated to the first plane vertex; d, q and d−q keep their actual lengths, with no rescaling. When q=0, the in-plane ray is a reference, not the projection.",
      "所有具名點與端點線段保留實際座標。分量三角形將 d 平移至第一平面頂點；d、q、d−q 保留實際長度，未經縮放。q=0 時，平面內射線是參考方向而非投影。"
    );
  }
  if (result.plane2 && result.directionDot.n < 0n) end = nscale(end, -1);
  if (result.plane2 && options.supplementary) end = nscale(end, -1);
  if (stage >= 4) {
    if (result.plane2) {
      const original = numeric(result.direction2);
      const negative =
        result.directionDot.n < 0n !== Boolean(options.supplementary);
      if (negative)
        arrow(
          center,
          c.kind === "section"
            ? nscale(nunit(original), -displayLength)
            : nscale(original, -1),
          c.kind === "section" ? "−v (direction)" : "−v",
          amber,
          "dash"
        );
    }
    const radians =
      result.plane2 && options.supplementary
        ? Math.PI - result.angle.radians
        : result.angle.radians;
    // Arc radius fits the actual rays instead of implying normalized arrows have real lengths.
    const radius = Math.min(nlength(start), nlength(end), displayLength) * 0.3;
    const arc = spatialAngleArc(center, start, end, radians, radius, fallback);
    lineTrace(
      arc,
      result.plane2 && options.supplementary ? "θs" : "θ",
      rose,
      "solid",
      6
    );
  }
  const coordinates: NumericVec3[] = [];
  for (const trace of data) {
    const t = trace as unknown as { x?: number[]; y?: number[]; z?: number[] };
    t.x?.forEach((x, i) => coordinates.push([x, t.y![i], t.z![i]]));
  }
  const layout: Partial<Layout> = {
    scene: { aspectmode: "data" },
    legend: { orientation: "h", x: 0, y: -0.05 },
  };
  if (stage < 5)
    layout.scene = pointSpatialScene(result, {
      ...options,
      stepIndex: 5,
    }).layout.scene;
  else {
    const span = Math.max(
      extent,
      ...[0, 1, 2].map(
        i =>
          Math.max(...coordinates.map(p => p[i])) -
          Math.min(...coordinates.map(p => p[i]))
      )
    );
    for (const [i, axis] of ["xaxis", "yaxis", "zaxis"].entries()) {
      const values = coordinates.map(p => p[i]);
      const midpoint = (Math.min(...values) + Math.max(...values)) / 2;
      (layout.scene as Record<string, unknown>)[axis] = {
        title: { text: ["x", "y", "z"][i] },
        range: [midpoint - span * 0.57, midpoint + span * 0.57],
      };
    }
  }
  return { data, layout, note };
}
