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
  return Math.sqrt(dot(a, a));
}

function normalize(a: Vec3): Vec3 {
  const magnitude = length(a);
  if (magnitude < EPSILON) throw new Error("Cannot normalize a zero vector");
  return scale(a, 1 / magnitude);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return scale(add(a, b), 0.5);
}

function footOnLine(point: Vec3, lineStart: Vec3, lineEnd: Vec3): Vec3 {
  const direction = sub(lineEnd, lineStart);
  const denominator = dot(direction, direction);
  if (denominator < EPSILON) return lineStart;
  return add(lineStart, scale(direction, dot(sub(point, lineStart), direction) / denominator));
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

/**
 * Produces mathematically exact construction geometry for a non-degenerate 3D triangle.
 * The returned projection is global x/y for a horizontal triangle and intrinsic plane
 * coordinates otherwise, so the 2D chart always preserves the triangle's real shape.
 */
export function buildTriangleCenterGeometry(
  A: Vec3,
  B: Vec3,
  C: Vec3,
  centers: TriangleCenterResult,
): TriangleCenterGeometry {
  const AB = sub(B, A);
  const AC = sub(C, A);
  const normal = normalize(cross(AB, AC));
  const usesXYAxes = Math.abs(A[2] - B[2]) < EPSILON && Math.abs(A[2] - C[2]) < EPSILON;
  const uAxis: Vec3 = usesXYAxes ? [1, 0, 0] : normalize(AB);
  const vAxis: Vec3 = usesXYAxes ? [0, 1, 0] : normalize(cross(normal, uAxis));

  const project = (point: Vec3): Point2 => {
    if (usesXYAxes) return [point[0], point[1]];
    const relative = sub(point, A);
    return [dot(relative, uAxis), dot(relative, vAxis)];
  };

  const midAB = midpoint(A, B);
  const midBC = midpoint(B, C);
  const midCA = midpoint(C, A);
  const medians: Segment3[] = [[A, midBC], [B, midCA], [C, midAB]];

  const footFromA = footOnLine(A, B, C);
  const footFromB = footOnLine(B, C, A);
  const footFromC = footOnLine(C, A, B);
  const altitudes: Segment3[] = [[A, footFromA], [B, footFromB], [C, footFromC]];

  const longestSide = Math.max(length(AB), length(AC), length(sub(C, B)));
  const bisectorExtent = Math.max(1, longestSide * 0.58);
  const makePerpendicularBisector = (start: Vec3, end: Vec3): Segment3 => {
    const mid = midpoint(start, end);
    const perpendicular = normalize(cross(normal, sub(end, start)));
    return [add(mid, scale(perpendicular, -bisectorExtent)), add(mid, scale(perpendicular, bisectorExtent))];
  };
  const perpendicularBisectors: Segment3[] = [
    makePerpendicularBisector(A, B),
    makePerpendicularBisector(B, C),
    makePerpendicularBisector(C, A),
  ];

  const angleBisectors: Segment3[] = [
    [A, centers.incenter],
    [B, centers.incenter],
    [C, centers.incenter],
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
  };
}

export function distanceBetween(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}
