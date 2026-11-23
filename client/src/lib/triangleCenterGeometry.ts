import type { TriangleCenterResult, Vec3 } from "./vectorMath";

export type Segment3 = [Vec3, Vec3];
export type Point2 = [number, number];

export interface TriangleCenterGeometry {
  A: Vec3;
  B: Vec3;
  C: Vec3;
  normal: Vec3;
  uAxis: Vec3;
  vAxis: Vec3;
  usesXYAxes: boolean;
  medians: Segment3[];
  altitudes: Segment3[];
  perpendicularBisectors: Segment3[];
  angleBisectors: Segment3[];
  eulerLine: Segment3 | null;
  incircle: Vec3[];
  circumcircle: Vec3[];
  inradius: number;
  circumradius: number;
  project: (point: Vec3) => Point2;
  unproject: (point: Point2) => Vec3;
}

const EPSILON = 1e-10;

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: Vec3, scalar: number): Vec3 {
  return [a[0] * scalar, a[1] * scalar, a[2] * scalar];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function length(a: Vec3): number {
  return Math.hypot(...a);
}

function normalize(a: Vec3): Vec3 {
  const magnitude = length(a);
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Cannot normalize a zero or non-finite vector");
  }
  return scale(a, 1 / magnitude);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return add(a, scale(sub(b, a), 0.5));
}

function footOnLine(point: Vec3, lineStart: Vec3, lineEnd: Vec3): Vec3 {
  const direction = normalize(sub(lineEnd, lineStart));
  return add(lineStart, scale(direction, dot(sub(point, lineStart), direction)));
}

function pointToLineDistance(point: Vec3, lineStart: Vec3, lineEnd: Vec3): number {
  return length(sub(point, footOnLine(point, lineStart, lineEnd)));
}

function circlePoints(center: Vec3, radius: number, uAxis: Vec3, vAxis: Vec3, count = 96): Vec3[] {
  return Array.from({ length: count + 1 }, (_, index) => {
    const theta = (2 * Math.PI * index) / count;
    return add(center, add(scale(uAxis, radius * Math.cos(theta)), scale(vAxis, radius * Math.sin(theta))));
  });
}

function assertFinitePoint(point: Vec3): void {
  if (point.length !== 3 || !point.every(Number.isFinite)) {
    throw new Error("Triangle coordinates and centers must be finite 3D points");
  }
}

/**
 * Produces construction geometry for a non-degenerate 3D triangle. The numerical
 * construction lines include their centers even when those centers are exterior.
 * Projection is global x/y for a horizontal triangle and intrinsic plane coordinates
 * otherwise, so the 2D chart preserves distances and angles in the actual plane.
 */
export function buildTriangleCenterGeometry(
  A: Vec3,
  B: Vec3,
  C: Vec3,
  centers: TriangleCenterResult,
): TriangleCenterGeometry {
  [A, B, C, centers.centroid, centers.incenter, centers.circumcenter, centers.orthocenter].forEach(assertFinitePoint);
  const AB = sub(B, A);
  const AC = sub(C, A);
  // Normalizing the sides first avoids an area-based absolute tolerance, which
  // would incorrectly reject small but perfectly valid triangles.
  const planeNormal = cross(normalize(AB), normalize(AC));
  if (length(planeNormal) === 0) throw new Error("Triangle vertices must not be collinear");
  const normal = normalize(planeNormal);
  // An almost-horizontal triangle is still tilted: using global axes in that
  // case would put sampled circle points outside the actual triangle plane.
  const usesXYAxes = A[2] === B[2] && A[2] === C[2];
  const uAxis: Vec3 = usesXYAxes ? [1, 0, 0] : normalize(AB);
  const vAxis: Vec3 = usesXYAxes ? [0, 1, 0] : normalize(cross(normal, uAxis));

  const project = (point: Vec3): Point2 => {
    if (usesXYAxes) return [point[0], point[1]];
    const relative = sub(point, A);
    return [dot(relative, uAxis), dot(relative, vAxis)];
  };
  const unproject = (point: Point2): Vec3 => usesXYAxes
    ? [point[0], point[1], A[2]]
    : add(A, add(scale(uAxis, point[0]), scale(vAxis, point[1])));

  const midAB = midpoint(A, B);
  const midBC = midpoint(B, C);
  const midCA = midpoint(C, A);
  const medians: Segment3[] = [[A, midBC], [B, midCA], [C, midAB]];

  const makeAltitude = (vertex: Vec3, sideStart: Vec3, sideEnd: Vec3): Segment3 => {
    const foot = footOnLine(vertex, sideStart, sideEnd);
    const direction = normalize(sub(foot, vertex));
    const footDistance = length(sub(foot, vertex));
    const hDistance = dot(sub(centers.orthocenter, vertex), direction);
    // Project H onto the correct altitude instead of using H as an arbitrary
    // endpoint. This keeps the rendered segment perpendicular despite rounding.
    const start = hDistance < 0 ? add(vertex, scale(direction, hDistance)) : vertex;
    const end = hDistance > footDistance ? add(vertex, scale(direction, hDistance)) : foot;
    return [start, end];
  };
  const altitudes: Segment3[] = [
    makeAltitude(A, B, C),
    makeAltitude(B, C, A),
    makeAltitude(C, A, B),
  ];

  const longestSide = Math.max(length(AB), length(AC), length(sub(C, B)));
  const bisectorExtent = Math.max(1, longestSide * 0.58);
  const makePerpendicularBisector = (start: Vec3, end: Vec3): Segment3 => {
    const mid = midpoint(start, end);
    const perpendicular = normalize(cross(normal, sub(end, start)));
    const oDistance = dot(sub(centers.circumcenter, mid), perpendicular);
    const low = Math.min(-bisectorExtent, oDistance);
    const high = Math.max(bisectorExtent, oDistance);
    return [add(mid, scale(perpendicular, low)), add(mid, scale(perpendicular, high))];
  };
  const perpendicularBisectors: Segment3[] = [
    makePerpendicularBisector(A, B),
    makePerpendicularBisector(B, C),
    makePerpendicularBisector(C, A),
  ];

  const makeAngleBisector = (vertex: Vec3, sideStart: Vec3, sideEnd: Vec3): Segment3 => {
    const toStart = length(sub(sideStart, vertex));
    const toEnd = length(sub(sideEnd, vertex));
    // Internal angle-bisector theorem: BD/DC = AB/AC. The full
    // vertex-to-opposite-side segment contains I and stays inside the triangle.
    const intersection = add(sideStart, scale(sub(sideEnd, sideStart), toStart / (toStart + toEnd)));
    return [vertex, intersection];
  };
  const angleBisectors: Segment3[] = [
    makeAngleBisector(A, B, C),
    makeAngleBisector(B, C, A),
    makeAngleBisector(C, A, B),
  ];

  const inradius = pointToLineDistance(centers.incenter, A, B);
  const circumradius = length(sub(centers.circumcenter, A));
  const eulerDistance = length(sub(centers.orthocenter, centers.circumcenter));

  return {
    A,
    B,
    C,
    normal,
    uAxis,
    vAxis,
    usesXYAxes,
    medians,
    altitudes,
    perpendicularBisectors,
    angleBisectors,
    eulerLine: eulerDistance < EPSILON ? null : [centers.orthocenter, centers.circumcenter],
    incircle: circlePoints(centers.incenter, inradius, uAxis, vAxis),
    circumcircle: circlePoints(centers.circumcenter, circumradius, uAxis, vAxis),
    inradius,
    circumradius,
    project,
    unproject,
  };
}

export function distanceBetween(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}
