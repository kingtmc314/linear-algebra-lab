import type { Data, Layout } from "plotly.js";
import {
  add,
  sub,
  mul,
  div,
  neg,
  rat,
  ratToLatex,
  toNumber,
  type Rational,
} from "./rational";
import {
  spatialCross,
  spatialDot,
  spatialVectorLatex,
  spatialSqrtLatex,
  spatialPlaneBasis,
  spatialAngleArc,
  type ExactVec3,
  type NumericVec3,
  type SpatialScene,
  type SpatialStep,
} from "./spatialAngles";
import {
  pointSpatialDefinitionLatex,
  type PointSpatialResult,
  type PointSpatialPlane,
} from "./pointSpatialAngles";

export interface PlaneNormalOptions {
  flipFirst?: boolean;
  flipSecond?: boolean;
  supplementary?: boolean;
}
export interface PlaneNormalConceptResult {
  source: PointSpatialResult;
  options: PlaneNormalOptions;
  n1: ExactVec3;
  n2: ExactVec3;
  dot: Rational;
  norm1Squared: Rational;
  norm2Squared: Rational;
  cosineSquared: Rational;
  signedCosineLatex: string;
  rawAngleLatex: string;
  rawRadians: number;
  rawDegrees: number;
  smallerAngleLatex: string;
  smallerRadians: number;
  smallerDegrees: number;
  openingAngleLatex: string;
  openingRadians: number;
  openingDegrees: number;
  parallel: boolean;
  turnAxis: ExactVec3;
  intersection?: { point: ExactVec3; direction: ExactVec3 };
  sectionU: ExactVec3;
  sectionV: ExactVec3;
}

const plus = (a: ExactVec3, b: ExactVec3) =>
  a.map((x, i) => add(x, b[i])) as ExactVec3;
const minus = (a: ExactVec3, b: ExactVec3) =>
  a.map((x, i) => sub(x, b[i])) as ExactVec3;
const scale = (a: ExactVec3, t: Rational) => a.map(x => mul(x, t)) as ExactVec3;
const isZero = (a: ExactVec3) => a.every(x => x.n === 0n);
const norm2 = (a: ExactVec3) => spatialDot(a, a);
const vec = spatialVectorLatex;
const r = ratToLatex;
const paren = (x: Rational) => `\\left(${r(x)}\\right)`;
const dotSub = (a: ExactVec3, b: ExactVec3) =>
  a.map((x, i) => `${paren(x)}${paren(b[i])}`).join("+");
const squareSub = (a: ExactVec3) => a.map(x => `${paren(x)}^2`).join("+");
const aligned = (...lines: string[]) =>
  `\\begin{aligned}${lines.join("\\\\[3pt]")}\\end{aligned}`;

/** Exact arithmetic only. Normal orientation and opening selection are independent. */
export function computePlaneNormalConcept(
  source: PointSpatialResult,
  options: PlaneNormalOptions = {}
): PlaneNormalConceptResult {
  if (
    !source ||
    source.input?.mode !== "plane-plane" ||
    source.angle?.mode !== "plane-plane" ||
    !source.plane1 ||
    !source.plane2
  )
    throw new Error(
      "The normal-vector concept requires a valid point-defined plane-plane result; line-plane results are not supported."
    );
  const original1 = source.plane1.normal,
    original2 = source.plane2.normal;
  if (isZero(original1) || isZero(original2))
    throw new Error("A plane normal cannot be the zero vector.");
  const snapshot: PlaneNormalOptions = {
    flipFirst: Boolean(options.flipFirst),
    flipSecond: Boolean(options.flipSecond),
    supplementary: Boolean(options.supplementary),
  };
  const n1 = scale(original1, rat(snapshot.flipFirst ? -1 : 1)),
    n2 = scale(original2, rat(snapshot.flipSecond ? -1 : 1));
  const dot = spatialDot(n1, n2),
    norm1Squared = norm2(n1),
    norm2Squared = norm2(n2),
    cosineSquared = div(mul(dot, dot), mul(norm1Squared, norm2Squared));
  const cross = spatialCross(original1, original2),
    parallel = isZero(cross);
  // A parallel pair has no unique intersection line. a1 is exactly nonzero and
  // perpendicular to both normals, so it is a valid, flip-independent turn axis.
  const turnAxis = parallel ? scale(source.plane1.a, rat(1)) : cross;
  if (isZero(turnAxis)) throw new Error("A nonzero turn axis is required.");
  let intersection: PlaneNormalConceptResult["intersection"];
  if (!parallel) {
    const anchor = source.plane1.triple[0].exact;
    const displacement = spatialCross(turnAxis, original1);
    // The displacement stays in plane 1; this scalar dot constraint makes its
    // endpoint lie in plane 2. No Cartesian plane equation or offset is used.
    const point =
      source.construction.kind === "shared-edge"
        ? scale(source.construction.edge[0].exact, rat(1))
        : plus(
            anchor,
            scale(
              displacement,
              div(
                spatialDot(
                  original2,
                  minus(source.plane2.triple[0].exact, anchor)
                ),
                spatialDot(original2, displacement)
              )
            )
          );
    intersection = { point, direction: turnAxis };
  }
  const negative = dot.n < 0n;
  const smallerAngleLatex = source.angle.angleLatex,
    smallerRadians = source.angle.radians,
    smallerDegrees = source.angle.degrees;
  // Reuse the existing canonical special-angle / exact-arccos output. Numeric
  // plotting never decides whether an exact ratio is a special value.
  return {
    source,
    options: snapshot,
    n1,
    n2,
    dot,
    norm1Squared,
    norm2Squared,
    cosineSquared,
    signedCosineLatex: `${negative ? "-" : ""}${spatialSqrtLatex(cosineSquared)}`,
    rawAngleLatex: negative
      ? source.angle.supplementaryLatex
      : smallerAngleLatex,
    rawRadians: negative ? Math.PI - smallerRadians : smallerRadians,
    rawDegrees: negative ? 180 - smallerDegrees : smallerDegrees,
    smallerAngleLatex,
    smallerRadians,
    smallerDegrees,
    openingAngleLatex: snapshot.supplementary
      ? source.angle.supplementaryLatex
      : smallerAngleLatex,
    openingRadians: snapshot.supplementary
      ? Math.PI - smallerRadians
      : smallerRadians,
    openingDegrees: snapshot.supplementary
      ? 180 - smallerDegrees
      : smallerDegrees,
    parallel,
    turnAxis,
    ...(intersection ? { intersection } : {}),
    sectionU: spatialCross(turnAxis, n1),
    sectionV: spatialCross(turnAxis, n2),
  };
}

const basisLatex = (p: PointSpatialPlane, i: number) => {
  const [A, B, C] = p.triple;
  return `\\mathbf a_${i}=${vec(B.exact)}-${vec(A.exact)}=${vec(p.a)},\\quad\\mathbf b_${i}=${vec(C.exact)}-${vec(A.exact)}=${vec(p.b)}`;
};
const crossSub = (a: ExactVec3, b: ExactVec3) => {
  const component = (j: number, k: number) =>
    `${paren(a[j])}${paren(b[k])}-${paren(a[k])}${paren(b[j])}`;
  return `\\left(${component(1, 2)},\\,${component(2, 0)},\\,${component(0, 1)}\\right)`;
};

/** Exactly six vector-only stages, matching planeNormalScene's reveal thresholds. */
export function planeNormalSteps(
  result: PlaneNormalConceptResult,
  lang: "zh" | "en"
): SpatialStep[] {
  const text = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const s = result.source,
    hh = norm2(result.turnAxis),
    uv = spatialDot(result.sectionU, result.sectionV);
  const crossStep = (
    plane: PointSpatialPlane,
    i: number,
    flipped: boolean,
    n: ExactVec3
  ) =>
    aligned(
      `\\mathbf n_${i}^{0}=\\mathbf a_${i}\\times\\mathbf b_${i}=${vec(plane.a)}\\times${vec(plane.b)}=${crossSub(plane.a, plane.b)}=${vec(plane.normal)}`,
      `\\mathbf n_${i}=${flipped ? "-" : ""}\\mathbf n_${i}^{0}=${vec(n)},\\qquad\\mathbf n_${i}\\cdot\\mathbf a_${i}=${r(spatialDot(n, plane.a))},\\quad\\mathbf n_${i}\\cdot\\mathbf b_${i}=${r(spatialDot(n, plane.b))}`
    );
  return [
    {
      description: text(
        "Use the current given points and their point-defined planes, not new plane equations. Subtract the first point of each non-collinear triple to obtain two independent in-plane vectors. All shown points and plane vertices keep their actual coordinates.",
        "使用目前已知點及其所定義的兩平面，不另設平面方程式。各不共線三點組以首點相減，得到兩個獨立的平面內向量。圖中所有已知點及平面頂點均保留實際座標。"
      ),
      latex: aligned(
        pointSpatialDefinitionLatex(s).slice(s.points.length).join(",\\quad"),
        basisLatex(s.plane1, 1),
        basisLatex(s.plane2!, 2)
      ),
    },
    {
      description: text(
        "Cross the first plane's two in-plane vectors to obtain its original normal. The selected sign only reverses this perpendicular direction; it cannot move the plane. Both exact zero dot products verify perpendicularity. Diagram normal arrows are explicitly scaled directions, not these magnitudes.",
        "第一平面內兩向量的叉積給出原法向量。所選正負只反轉垂直方向，不能移動平面；兩個精確零內積驗證垂直性。圖中法向箭頭明確按顯示長度縮放，並非此向量的實際大小。"
      ),
      latex: crossStep(
        s.plane1,
        1,
        Boolean(result.options.flipFirst),
        result.n1
      ),
    },
    {
      description: text(
        "Repeat the cross product for the second plane. Reversing a triple or flipping one normal reverses the signed dot product and replaces the raw angle φ by π−φ. Neither operation chooses an interior opening or changes the smaller plane angle θ.",
        "對第二平面重複叉積。反轉三點順序或單獨反轉一個法向量，會反轉內積正負並把原始夾角 φ 改為 π−φ；兩者均不會自動選取內部開口，也不改變較小平面夾角 θ。"
      ),
      latex: crossStep(
        s.plane2!,
        2,
        Boolean(result.options.flipSecond),
        result.n2
      ),
    },
    {
      description: result.parallel
        ? text(
            "The original normals are parallel, so there is no unique intersection edge. Use the nonzero in-plane vector a₁ as a fixed demonstration axis h. The common-origin section rays are translated references. Rotating both normals by the same 90° gives in-plane directions and preserves their signed angle, including 0° and 180°.",
            "原法向量平行，故不存在唯一交線。取非零平面內向量 a₁ 為固定示範軸 h；共起點截面射線只是平移參考。兩個法向量同向旋轉 90° 得到平面內方向，並保留有向內積所定夾角，包括 0° 與 180°。"
          )
        : text(
            "Fix h from the ORIGINAL normals, independently of both flip controls. A vector displacement or the given shared edge locates the intersection. In its perpendicular section, u=h×n₁ and v=h×n₂ lie in their planes. The exact right-angle and cross-product identities explain why the same 90° rotation of both normals preserves φ; intermediate rotated rays are directions, not normals.",
            "以原法向量固定 h，不受兩個反向按鈕影響。向量位移或已知共邊確定交線位置。在垂直截面內，u=h×n₁、v=h×n₂ 各在相應平面內。精確直角及叉積恆等式說明：兩法向量同向轉 90° 保留 φ；中途旋轉射線是方向，不是法向量。"
          ),
      latex: aligned(
        result.parallel
          ? `\\mathbf n_1^0\\times\\mathbf n_2^0=\\mathbf0,\\quad\\mathbf h=\\mathbf a_1=${vec(result.turnAxis)}\\ne\\mathbf0`
          : `\\mathbf h=\\mathbf n_1^0\\times\\mathbf n_2^0=${vec(s.plane1.normal)}\\times${vec(s.plane2!.normal)}=${vec(result.turnAxis)},\\quad O=${vec(result.intersection!.point)}`,
        `\\mathbf h\\cdot\\mathbf n_1=\\mathbf h\\cdot\\mathbf n_2=0,\\quad\\|\\mathbf h\\|^2=${r(hh)}`,
        `\\mathbf u=\\mathbf h\\times\\mathbf n_1=${vec(result.turnAxis)}\\times${vec(result.n1)}=${vec(result.sectionU)},\\quad\\mathbf v=\\mathbf h\\times\\mathbf n_2=${vec(result.turnAxis)}\\times${vec(result.n2)}=${vec(result.sectionV)}`,
        `\\mathbf u\\cdot\\mathbf n_1=\\mathbf u\\cdot\\mathbf h=\\mathbf v\\cdot\\mathbf n_2=\\mathbf v\\cdot\\mathbf h=0`,
        `\\mathbf u\\cdot\\mathbf v=\\|\\mathbf h\\|^2(\\mathbf n_1\\cdot\\mathbf n_2)-(\\mathbf h\\cdot\\mathbf n_1)(\\mathbf h\\cdot\\mathbf n_2)=${paren(hh)}${paren(result.dot)}=${r(uv)}`,
        `\\|\\mathbf u\\|^2=\\|\\mathbf h\\|^2\\|\\mathbf n_1\\|^2=${r(norm2(result.sectionU))},\\quad\\|\\mathbf v\\|^2=\\|\\mathbf h\\|^2\\|\\mathbf n_2\\|^2=${r(norm2(result.sectionV))}`,
        `\\widehat{\\mathbf h}=\\frac{\\mathbf h}{\\|\\mathbf h\\|},\\quad R_{\\widehat{\\mathbf h}}\\!\\left(\\frac{\\pi}{2}\\right)\\mathbf n_i=\\frac{\\mathbf h\\times\\mathbf n_i}{\\|\\mathbf h\\|},\\quad i=1,2`
      ),
    },
    {
      description: text(
        "Substitute exact dot products and squared lengths. The signed ratio gives the raw normal angle φ in [0,π]; the absolute value gives the invariant smaller plane angle θ in [0,π/2]. The section identity gives the same signed cosine after the paired turn. Keep the source's exact special angles or exact inverse cosine, never a rounded special angle.",
        "代入精確內積及長度平方。有正負的比值給出 [0,π] 內原始法向夾角 φ；絕對值給出 [0,π/2] 內不受反向影響的較小平面夾角 θ。截面恆等式保證同向轉動後餘弦仍保留正負。沿用原結果的精確特殊角或反餘弦，不以四捨五入判定特殊角。"
      ),
      latex: aligned(
        `\\mathbf n_1\\cdot\\mathbf n_2=${dotSub(result.n1, result.n2)}=${r(result.dot)}`,
        `\\|\\mathbf n_1\\|^2=${squareSub(result.n1)}=${r(result.norm1Squared)},\\quad\\|\\mathbf n_2\\|^2=${squareSub(result.n2)}=${r(result.norm2Squared)}`,
        `\\cos\\varphi=\\frac{\\mathbf n_1\\cdot\\mathbf n_2}{\\|\\mathbf n_1\\|\\|\\mathbf n_2\\|}=\\frac{${r(result.dot)}}{\\sqrt{${r(result.norm1Squared)}}\\sqrt{${r(result.norm2Squared)}}}=${result.signedCosineLatex}=\\frac{\\mathbf u\\cdot\\mathbf v}{\\|\\mathbf u\\|\\|\\mathbf v\\|},\\quad\\varphi=${result.rawAngleLatex}`,
        `\\cos\\theta=\\frac{|\\mathbf n_1\\cdot\\mathbf n_2|}{\\|\\mathbf n_1\\|\\|\\mathbf n_2\\|}=\\frac{|${r(result.dot)}|}{\\sqrt{${r(result.norm1Squared)}}\\sqrt{${r(result.norm2Squared)}}}=${spatialSqrtLatex(result.cosineSquared)},\\quad\\theta=\\arccos\\left(${spatialSqrtLatex(result.cosineSquared)}\\right)=${result.smallerAngleLatex}`,
        `0\\leq\\varphi\\leq\\pi,\\quad\\theta=\\min(\\varphi,\\pi-\\varphi),\\quad0\\leq\\theta\\leq\\frac{\\pi}{2}`
      ),
    },
    {
      description: text(
        "Independently select the requested opening δ as θ or π−θ; the diagram selects the appropriate in-plane ray sign, not a normal flip. Without specified halfplanes or a justified outward-normal convention, arbitrary normals cannot determine an interior opening automatically. Parallel planes give degenerate 0°/180° choices; perpendicular planes give 90° for either choice.",
        "獨立選擇所求開口 δ 為 θ 或 π−θ；圖中選取相應平面內射線的正負，而非反轉法向量。沒有指定半平面或有理據的外法向約定時，任意法向量不能自動確定內部開口。平行時是退化的 0°／180° 選擇；垂直時兩種選擇均為 90°。"
      ),
      latex: aligned(
        `\\theta=${result.smallerAngleLatex},\\quad\\pi-\\theta=${s.angle.supplementaryLatex}`,
        `\\delta=${result.options.supplementary ? "\\pi-\\theta" : "\\theta"}=${result.openingAngleLatex},\\quad\\delta\\in\\{\\theta,\\pi-\\theta\\}`
      ),
    },
  ];
}

// All remaining helpers are numeric rendering only. Direction normalization first
// divides by the exact largest component, avoiding huge/tiny-vector overflow.
function numberOf(value: Rational): number {
  const direct = toNumber(value);
  if (Number.isFinite(direct) && (direct !== 0 || value.n === 0n))
    return direct;
  const sign = value.n < 0n ? -1 : 1,
    numerator = (value.n < 0n ? -value.n : value.n).toString(),
    denominator = value.d.toString(),
    a = numerator.slice(0, 16),
    b = denominator.slice(0, 16);
  return (
    ((sign * Number(a)) / Number(b)) *
    10 ** (numerator.length - a.length - denominator.length + b.length)
  );
}
const numeric = (v: ExactVec3) => v.map(numberOf) as NumericVec3;
const nplus = (a: NumericVec3, b: NumericVec3) =>
  a.map((x, i) => x + b[i]) as NumericVec3;
const nminus = (a: NumericVec3, b: NumericVec3) =>
  a.map((x, i) => x - b[i]) as NumericVec3;
const nscale = (a: NumericVec3, t: number) => a.map(x => x * t) as NumericVec3;
const ndot = (a: NumericVec3, b: NumericVec3) =>
  a.reduce((s, x, i) => s + x * b[i], 0);
const ncross = (a: NumericVec3, b: NumericVec3): NumericVec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const nlength = (v: NumericVec3) => Math.hypot(...v);
const nunit = (v: NumericVec3) => nscale(v, 1 / nlength(v));
function unitExact(v: ExactVec3): NumericVec3 {
  const maximum = v.reduce((best, x) => {
    const absolute = x.n < 0n ? neg(x) : x;
    return absolute.n * best.d > best.n * absolute.d ? absolute : best;
  }, rat(0));
  if (maximum.n === 0n) throw new Error("Cannot render a zero direction.");
  return nunit(v.map(x => numberOf(div(x, maximum))) as NumericVec3);
}
function rotate(v: NumericVec3, axis: NumericVec3, t: number): NumericVec3 {
  // Rodrigues: both rays use the same fixed unit axis and the same angle.
  return nplus(
    nplus(nscale(v, Math.cos(t)), nscale(ncross(axis, v), Math.sin(t))),
    nscale(axis, ndot(axis, v) * (1 - Math.cos(t)))
  );
}

/** Real point geometry plus explicitly scaled auxiliary direction constructions. */
export function planeNormalScene(
  result: PlaneNormalConceptResult,
  options: { lang: "zh" | "en"; stepIndex?: number; rotationDegrees?: number }
): SpatialScene {
  const text = (en: string, zh: string) => (options.lang === "zh" ? zh : en);
  const stage = Number.isFinite(options.stepIndex)
      ? Math.max(0, Math.min(5, Math.floor(options.stepIndex!)))
      : 5,
    degrees = Number.isFinite(options.rotationDegrees)
      ? Math.max(0, Math.min(90, options.rotationDegrees!))
      : 90,
    t = (degrees * Math.PI) / 180;
  const source = result.source,
    plane1 = source.plane1,
    plane2 = source.plane2!,
    data: Data[] = [],
    teal = "#0f766e",
    amber = "#b7791f",
    ink = "#334155",
    rose = "#b45360",
    blue = "#6479b2";
  const given = source.points.map(p => numeric(p.exact)),
    A = numeric(plane1.triple[0].exact),
    B = numeric(plane2.triple[0].exact),
    center = result.intersection ? numeric(result.intersection.point) : A;
  const extent = Math.max(
    ...[0, 1, 2].map(
      i => Math.max(...given.map(p => p[i])) - Math.min(...given.map(p => p[i]))
    )
  );
  const displayLength = Math.max(
    extent * 0.35,
    Math.max(...center.map(Math.abs), ...given.flat().map(Math.abs)) *
      Number.EPSILON *
      64
  );
  const n1 = unitExact(result.n1),
    n2 = unitExact(result.n2),
    h = unitExact(result.turnAxis),
    u = unitExact(result.sectionU),
    v = unitExact(result.sectionV);
  // Selected opening rays use ORIGINAL directions; arbitrary normal flips never
  // choose halfplanes or silently change the selected visible opening.
  const openingStart = unitExact(spatialCross(result.turnAxis, plane1.normal)),
    originalV = unitExact(spatialCross(result.turnAxis, plane2.normal)),
    smallerEnd = nscale(
      originalV,
      spatialDot(plane1.normal, plane2.normal).n < 0n ? -1 : 1
    ),
    openingEnd = nscale(smallerEnd, result.options.supplementary ? -1 : 1),
    planeFallback = unitExact(plane1.normal);
  const line = (
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
  const arrow = (
    origin: NumericVec3,
    tip: NumericVec3,
    name: string,
    color: string,
    dash: "solid" | "dash" | "dot" = "solid"
  ) => {
    line([origin, tip], name, color, dash);
    const vector = nminus(tip, origin),
      length = nlength(vector);
    if (!length) return;
    const direction = nunit(vector),
      [a] = spatialPlaneBasis(direction),
      size = Math.min(length, displayLength) * 0.1,
      back = nminus(tip, nscale(direction, size));
    line(
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
  const directionArrow = (
    origin: NumericVec3,
    direction: NumericVec3,
    name: string,
    color: string,
    dash: "solid" | "dash" | "dot" = "solid"
  ) =>
    arrow(
      origin,
      nplus(origin, nscale(direction, displayLength)),
      name,
      color,
      dash
    );
  const rightAngle = (a: NumericVec3, b: NumericVec3, name = "90°") => {
    const x = nscale(a, displayLength * 0.12),
      y = nscale(b, displayLength * 0.12);
    line(
      [nplus(center, x), nplus(nplus(center, x), y), nplus(center, y)],
      name,
      ink,
      "solid",
      2,
      false
    );
  };
  const mesh = (
    points: NumericVec3[],
    name: string,
    color: string,
    opacity: number
  ) => {
    // A centroid fan connects the actual ordered vertices; section meshes use
    // separately labelled construction vertices, never substitute plane patches.
    const centroid = nscale(points.reduce(nplus, [0, 0, 0]), 1 / points.length),
      vertices = [centroid, ...points];
    data.push({
      type: "mesh3d",
      x: vertices.map(p => p[0]),
      y: vertices.map(p => p[1]),
      z: vertices.map(p => p[2]),
      i: new Float64Array(points.map(() => 0)),
      j: new Float64Array(points.map((_, i) => i + 1)),
      k: new Float64Array(points.map((_, i) => ((i + 1) % points.length) + 1)),
      name,
      color,
      opacity,
      flatshading: true,
      showlegend: false,
      hoverinfo: "name",
    } as Data);
  };
  const plane = (p: PointSpatialPlane, name: string, color: string) => {
    const vertices = p.vertices.map(q => numeric(q.exact)),
      centroid = nscale(vertices.reduce(nplus, [0, 0, 0]), 1 / vertices.length),
      [a, b] = spatialPlaneBasis(unitExact(p.normal));
    const ordered = vertices
      .map(q => ({
        q,
        angle: Math.atan2(
          ndot(nminus(q, centroid), b),
          ndot(nminus(q, centroid), a)
        ),
      }))
      .sort((x, y) => x.angle - y.angle)
      .map(x => x.q);
    line([...ordered, ordered[0]], name, color, "solid", 3);
    mesh(ordered, name, color, 0.18);
  };
  data.push({
    type: "scatter3d",
    mode: "text+markers",
    x: given.map(p => p[0]),
    y: given.map(p => p[1]),
    z: given.map(p => p[2]),
    name: text("Given points", "已知點"),
    text: source.points.map(p => p.label),
    textposition: "top center",
    textfont: { color: ink, size: 12 },
    marker: { color: ink, size: 4 },
    showlegend: false,
    hoverinfo: "text",
  } as Data);
  plane(plane1, "Π₁", teal);
  plane(plane2, "Π₂", amber);
  // Actual endpoint arrows, not separately rescaled basis vectors.
  arrow(A, numeric(plane1.triple[1].exact), "a₁", teal);
  arrow(A, numeric(plane1.triple[2].exact), "b₁", teal);
  arrow(B, numeric(plane2.triple[1].exact), "a₂", amber);
  arrow(B, numeric(plane2.triple[2].exact), "b₂", amber);
  const normal1Name = text("n₁ (scaled direction)", "n₁（縮放方向）"),
    normal2Name = text("n₂ (scaled direction)", "n₂（縮放方向）");
  if (stage >= 1) directionArrow(A, n1, normal1Name, teal);
  if (stage >= 2) directionArrow(B, n2, normal2Name, amber);
  if (stage >= 3) {
    const axisName = result.parallel
      ? text(
          "Demonstration axis h (not an intersection)",
          "示範軸 h（不是交線）"
        )
      : text("Intersection direction h", "交線方向 h");
    line(
      [
        nminus(center, nscale(h, displayLength * 1.2)),
        nplus(center, nscale(h, displayLength * 1.2)),
      ],
      axisName,
      ink,
      "dash",
      3
    );
    const section = [-1, 1].flatMap(x =>
      [-1, 1].map(y =>
        nplus(
          center,
          nscale(nplus(nscale(n1, x), nscale(u, y)), displayLength * 0.65)
        )
      )
    );
    mesh(
      [section[0], section[1], section[3], section[2]],
      result.parallel
        ? text(
            "Perpendicular reference section (translated demonstration)",
            "垂直參考截面（平移示範）"
          )
        : text("Normal section (perpendicular to h)", "法向截面（垂直 h）"),
      blue,
      0.08
    );
    directionArrow(
      center,
      n1,
      text("n₁ (translated scaled direction)", "n₁（平移縮放方向）"),
      teal,
      "dot"
    );
    directionArrow(
      center,
      n2,
      text("n₂ (translated scaled direction)", "n₂（平移縮放方向）"),
      amber,
      "dot"
    );
    directionArrow(
      center,
      u,
      text("u (scaled section direction)", "u（縮放截面方向）"),
      teal,
      "dot"
    );
    directionArrow(
      center,
      v,
      text("v (scaled section direction)", "v（縮放截面方向）"),
      amber,
      "dot"
    );
    directionArrow(
      center,
      rotate(n1, h, t),
      text("r₁ (rotated direction)", "r₁（旋轉方向）"),
      teal,
      "dash"
    );
    directionArrow(
      center,
      rotate(n2, h, t),
      text("r₂ (rotated direction)", "r₂（旋轉方向）"),
      amber,
      "dash"
    );
    rightAngle(n1, u, "90° (n₁, u)");
    rightAngle(n2, v, "90° (n₂, v)");
    rightAngle(h, u, "90° (h, u)");
    rightAngle(h, v, "90° (h, v)");
  }
  if (stage >= 4) {
    line(
      spatialAngleArc(
        center,
        n1,
        n2,
        result.rawRadians,
        displayLength * 0.25,
        u
      ),
      "φ",
      rose,
      "solid",
      6
    );
    directionArrow(
      center,
      openingStart,
      text("θ ray in Π₁ (scaled direction)", "Π₁ 內 θ 射線（縮放方向）"),
      teal
    );
    directionArrow(
      center,
      smallerEnd,
      text(
        "θ ray in Π₂ (selected sign, scaled direction)",
        "Π₂ 內 θ 射線（所選正負、縮放方向）"
      ),
      amber
    );
    line(
      spatialAngleArc(
        center,
        openingStart,
        smallerEnd,
        result.smallerRadians,
        displayLength * 0.38,
        planeFallback
      ),
      "θ",
      blue,
      "solid",
      6
    );
  }
  if (stage >= 5) {
    directionArrow(
      center,
      openingStart,
      text("δ ray in Π₁ (scaled direction)", "Π₁ 內 δ 射線（縮放方向）"),
      teal
    );
    directionArrow(
      center,
      openingEnd,
      text(
        "δ ray in Π₂ (selected sign, scaled direction)",
        "Π₂ 內 δ 射線（所選正負、縮放方向）"
      ),
      amber
    );
    line(
      spatialAngleArc(
        center,
        openingStart,
        openingEnd,
        result.openingRadians,
        displayLength * 0.53,
        planeFallback
      ),
      "δ",
      rose,
      "solid",
      7
    );
  }
  // A hidden cube encloses ALL stages, signs, opening choices, and the complete
  // 0..90° turn, not merely sampled rotations (A cos t+B sin t can peak between
  // samples). Bounds tools include opacity-zero traces, so UI boundsData remains
  // stable without fabricated visible geometry or recursive scene generation.
  const radius = displayLength * 1.5,
    boundCenters = [...given, center],
    minimum = [0, 1, 2].map(i =>
      Math.min(...given.map(p => p[i]), ...boundCenters.map(p => p[i] - radius))
    ),
    maximum = [0, 1, 2].map(i =>
      Math.max(...given.map(p => p[i]), ...boundCenters.map(p => p[i] + radius))
    );
  const corners = [0, 1].flatMap(i =>
    [0, 1].flatMap(j =>
      [0, 1].map(
        k =>
          [
            i ? maximum[0] : minimum[0],
            j ? maximum[1] : minimum[1],
            k ? maximum[2] : minimum[2],
          ] as NumericVec3
      )
    )
  );
  data.push({
    type: "scatter3d",
    mode: "markers",
    x: corners.map(p => p[0]),
    y: corners.map(p => p[1]),
    z: corners.map(p => p[2]),
    name: text(
      "Stable construction bounds (invisible)",
      "穩定構造邊界（隱藏）"
    ),
    opacity: 0,
    marker: { opacity: 0, size: 1 },
    showlegend: false,
    hoverinfo: "skip",
  } as Data);
  const layout: Partial<Layout> = {
    // A compact HTML key lives outside the canvas. Long auxiliary trace names
    // remain available on hover without shrinking the mobile 3D viewport.
    showlegend: false,
    scene: {
      aspectmode: "data",
      xaxis: {
        title: { text: "x" },
        range: [minimum[0], maximum[0]],
        autorange: false,
      },
      yaxis: {
        title: { text: "y" },
        range: [minimum[1], maximum[1]],
        autorange: false,
      },
      zaxis: {
        title: { text: "z" },
        range: [minimum[2], maximum[2]],
        autorange: false,
      },
    },
    legend: { orientation: "h", x: 0, y: -0.05 },
  };
  const note =
    text(
      `Given points and both plane outlines retain actual coordinates; a₁, b₁, a₂, b₂ retain actual endpoints and lengths. Normal, section, opening and rotated arrows show scaled directions with common display length L=${displayLength.toPrecision(5)} coordinate units, NOT exact vector magnitudes. Both r rays rotate ${degrees.toFixed(1)}° in the same sense about fixed h; they are rotated directions, not intermediate normals. The turn preserves φ and does not change exact θ or selected δ. `,
      `已知點及兩平面輪廓保留實際座標；a₁、b₁、a₂、b₂ 保留實際端點及長度。法向、截面、開口及旋轉箭頭僅顯示縮放方向，共同顯示長度 L=${displayLength.toPrecision(5)} 座標單位，並非精確向量大小。兩條 r 射線繞固定 h 同向旋轉 ${degrees.toFixed(1)}°；它們是旋轉方向，中途並非法向量。轉動保留 φ，不改變精確 θ 或所選 δ。`
    ) +
    (result.parallel
      ? text(
          "Parallel (possibly coincident) planes have no unique intersection. h is a nonzero in-plane demonstration axis, and common-origin rays are translated references, not a claimed shared edge. The 0°/180° openings are degenerate choices.",
          "平行（或重合）平面不存在唯一交線；h 是非零平面內示範軸，共起點射線只是平移參考，並非聲稱有共邊。0°／180° 開口是退化選擇。"
        )
      : text(
          "The common origin is an exact point on both infinite planes; the section is perpendicular to their intersection direction. δ is an independent θ or π−θ selection, not an automatically identified interior opening.",
          "共同起點精確位於兩個無限延伸平面上；截面垂直交線方向。δ 是獨立選擇的 θ 或 π−θ，並非自動辨認的內部開口。"
        ));
  return { data, layout, note };
}
