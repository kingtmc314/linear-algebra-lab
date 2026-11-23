import type { Vec3 } from "./vectorMath";

export type VertexName = "A" | "B" | "C";
export type CenterName = "G" | "I" | "O" | "H";
export type PlanePoint = [number, number];
export interface PlaneFrame {
  origin: Vec3;
  u: Vec3;
  v: Vec3;
  usesXY: boolean;
  project: (point: Vec3) => PlanePoint;
  unproject: (point: PlanePoint) => Vec3;
}
const subtract = (a: Vec3, b: Vec3): Vec3 => a.map((x, i) => x - b[i]) as Vec3;
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec3): Vec3 => {
  const length = Math.sqrt(dot(a, a));
  return a.map(x => x / length) as Vec3;
};

/** A relative-area guard also prevents unusably large centres for near-collinear triangles. */
export function isUsableTriangle(A: Vec3, B: Vec3, C: Vec3): boolean {
  if (![...A, ...B, ...C].every(Number.isFinite)) return false;
  const ab = subtract(B, A),
    ac = subtract(C, A),
    bc = subtract(C, B);
  const n = cross(ab, ac);
  const area2 = Math.sqrt(dot(n, n));
  const scale2 = Math.max(dot(ab, ab), dot(ac, ac), dot(bc, bc));
  return scale2 > 1e-12 && area2 > Math.max(1e-10, scale2 * 1e-4);
}

/** Freeze this frame throughout a pointer gesture: no moving origin or rotating axes. */
export function makePlaneFrame(A: Vec3, B: Vec3, C: Vec3): PlaneFrame {
  if (!isUsableTriangle(A, B, C)) throw new Error("Degenerate triangle");
  const usesXY = A[2] === B[2] && A[2] === C[2];
  const origin: Vec3 = usesXY ? [0, 0, A[2]] : [...A];
  const u: Vec3 = usesXY ? [1, 0, 0] : unit(subtract(B, A));
  const v: Vec3 = usesXY
    ? [0, 1, 0]
    : unit(cross(unit(cross(subtract(B, A), subtract(C, A))), u));
  return {
    origin,
    u,
    v,
    usesXY,
    project: point => {
      const p = subtract(point, origin);
      return [dot(p, u), dot(p, v)];
    },
    unproject: point =>
      origin.map((x, i) => x + point[0] * u[i] + point[1] * v[i]) as Vec3,
  };
}

export function snapPlanePoint(point: PlanePoint, step: number): PlanePoint {
  return step > 0
    ? (point.map(x =>
        Number((Math.round(x / step) * step).toFixed(8))
      ) as PlanePoint)
    : point;
}

export interface ConstructionLayers {
  medians: boolean;
  altitudes: boolean;
  perpendicularBisectors: boolean;
  angleBisectors: boolean;
  incircle: boolean;
  circumcircle: boolean;
  eulerLine: boolean;
}
export const ALL_LAYERS: ConstructionLayers = {
  medians: true,
  altitudes: true,
  perpendicularBisectors: true,
  angleBisectors: true,
  incircle: true,
  circumcircle: true,
  eulerLine: true,
};
export const CONSTRUCTION_STEPS = [
  {
    zh: "三角形 ABC",
    en: "Triangle ABC",
    detailZh: "先確認三個不共線頂點。拖曳 A、B、C，觀察三角形改變。",
    detailEn:
      "Start with three non-collinear vertices. Drag A, B or C to explore the triangle.",
    latex: "a=|BC|,\\quad b=|CA|,\\quad c=|AB|",
  },
  {
    zh: "中線與重心 G",
    en: "Medians & centroid G",
    detailZh: "連接每個頂點與對邊中點。三條中線相交於 G，G 將中線分成 2 : 1。",
    detailEn:
      "Join each vertex to the midpoint of its opposite side. The medians meet at G in the ratio 2 : 1.",
    latex: "G=\\frac{A+B+C}{3}",
  },
  {
    zh: "角平分線與內心 I",
    en: "Angle bisectors & incenter I",
    detailZh: "三條內角平分線相交於 I。I 到三邊的距離相等，以此距離畫內切圓。",
    detailEn:
      "Internal angle bisectors meet at I. Its equal distances to all three sides give the incircle radius.",
    latex: "I=\\frac{aA+bB+cC}{a+b+c},\\quad r=\\frac{2\\Delta}{a+b+c}",
  },
  {
    zh: "垂直平分線與外心 O",
    en: "Perpendicular bisectors & circumcenter O",
    detailZh: "在每邊中點畫垂直平分線。交點 O 到三個頂點等距，畫出外接圓。",
    detailEn:
      "Draw a perpendicular bisector through each side midpoint. O is equidistant from A, B and C; draw the circumcircle.",
    latex: "|O-A|=|O-B|=|O-C|=R",
  },
  {
    zh: "高線與垂心 H",
    en: "Altitudes & orthocenter H",
    detailZh:
      "由頂點向對邊所在直線作垂線。鈍角三角形需要延長高線，交點 H 可以在三角形外。",
    detailEn:
      "Draw a perpendicular from each vertex to its opposite side line. Extend altitudes in an obtuse triangle: H may lie outside.",
    latex: "(H-A)\\cdot(C-B)=0,\\quad H=A+B+C-2O",
  },
  {
    zh: "Euler 線：O、G、H",
    en: "Euler line: O, G, H",
    detailZh:
      "O、G、H 共線，且 OG : GH = 1 : 2。等邊三角形的三點重合，沒有唯一的 Euler 線。",
    detailEn:
      "O, G and H are collinear with OG : GH = 1 : 2. In an equilateral triangle they coincide, so no unique Euler line exists.",
    latex: "H-G=2(G-O)",
  },
] as const;

export function stageVisibility(stage: number): {
  layers: ConstructionLayers;
  centers: CenterName[];
} {
  const step = Math.max(0, Math.min(5, Math.floor(stage)));
  return {
    layers: {
      medians: step >= 1,
      angleBisectors: step >= 2,
      incircle: step >= 2,
      perpendicularBisectors: step >= 3,
      circumcircle: step >= 3,
      altitudes: step >= 4,
      eulerLine: step >= 5,
    },
    centers: (["G", "I", "O", "H"] as CenterName[]).slice(0, Math.min(step, 4)),
  };
}

export function advanceConstruction(stage: number): number {
  return Math.min(CONSTRUCTION_STEPS.length - 1, stage + 1);
}

/** A newly scheduled RAF can carry a timestamp slightly earlier than performance.now(). */
export function constructionProgress(elapsed: number, duration = 700): number {
  return Math.max(0, Math.min(1, elapsed / duration));
}
