import { describe, expect, it } from "vitest";
import { computeTriangleCenters, type Vec3 } from "./vectorMath";
import { buildTriangleCenterGeometry, distanceBetween, type Segment3 } from "./triangleCenterGeometry";

const closeTo = (actual: number, expected: number, precision = 8) => {
  expect(actual).toBeCloseTo(expected, precision);
};
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, coordinate, i) => sum + coordinate * b[i], 0);
const norm = (a: Vec3) => Math.hypot(...a);
const pointCloseTo = (actual: Vec3, expected: Vec3) => actual.forEach((value, i) => closeTo(value, expected[i]));

function expectOnSegment(point: Vec3, [start, end]: Segment3) {
  const direction = sub(end, start);
  const relative = sub(point, start);
  const parameter = dot(relative, direction) / dot(direction, direction);
  expect(parameter).toBeGreaterThanOrEqual(-1e-8);
  expect(parameter).toBeLessThanOrEqual(1 + 1e-8);
  pointCloseTo(point, start.map((value, i) => value + parameter * direction[i]) as Vec3);
}

function expectedFoot(vertex: Vec3, start: Vec3, end: Vec3): Vec3 {
  const direction = sub(end, start);
  const parameter = dot(sub(vertex, start), direction) / dot(direction, direction);
  return start.map((value, i) => value + parameter * direction[i]) as Vec3;
}

function verifyConstructions(A: Vec3, B: Vec3, C: Vec3) {
  const centers = computeTriangleCenters(A, B, C);
  const geometry = buildTriangleCenterGeometry(A, B, C, centers);
  const vertices = [A, B, C];
  const oppositeSides: Segment3[] = [[B, C], [C, A], [A, B]];

  geometry.altitudes.forEach((segment, i) => {
    expectOnSegment(vertices[i], segment);
    expectOnSegment(expectedFoot(vertices[i], ...oppositeSides[i]), segment);
    expectOnSegment(centers.orthocenter, segment);
    const direction = sub(segment[1], segment[0]);
    const side = sub(oppositeSides[i][1], oppositeSides[i][0]);
    closeTo(dot(direction, side) / (norm(direction) * norm(side)), 0);
  });

  const sides: Segment3[] = [[A, B], [B, C], [C, A]];
  geometry.perpendicularBisectors.forEach((segment, i) => {
    const [start, end] = sides[i];
    const midpoint = start.map((value, j) => (value + end[j]) / 2) as Vec3;
    expectOnSegment(midpoint, segment);
    expectOnSegment(centers.circumcenter, segment);
    const direction = sub(segment[1], segment[0]);
    const side = sub(end, start);
    closeTo(dot(direction, side) / (norm(direction) * norm(side)), 0);
  });

  geometry.angleBisectors.forEach(([start, intersection], i) => {
    pointCloseTo(start, vertices[i]);
    expectOnSegment(intersection, oppositeSides[i]);
    expectOnSegment(centers.incenter, [start, intersection]);
    const [sideStart, sideEnd] = oppositeSides[i];
    closeTo(
      distanceBetween(sideStart, intersection) / distanceBetween(intersection, sideEnd),
      distanceBetween(start, sideStart) / distanceBetween(start, sideEnd),
    );
  });

  for (const [points, center, radius] of [
    [geometry.incircle, centers.incenter, geometry.inradius],
    [geometry.circumcircle, centers.circumcenter, geometry.circumradius],
  ] as const) {
    expect(points).toHaveLength(97);
    pointCloseTo(points[0], points[points.length - 1]);
    points.forEach(point => {
      closeTo(dot(sub(point, A), geometry.normal), 0);
      closeTo(distanceBetween(point, center), radius);
      pointCloseTo(geometry.unproject(geometry.project(point)), point);
    });
  }
  vertices.forEach(vertex => closeTo(distanceBetween(vertex, centers.circumcenter), geometry.circumradius));
  oppositeSides.forEach(side => closeTo(distanceBetween(centers.incenter, expectedFoot(centers.incenter, ...side)), geometry.inradius));
  return { centers, geometry };
}

describe("triangle-center construction geometry", () => {
  it("preserves all four centers and construction lines for a 6–8–10 right triangle", () => {
    const { centers, geometry } = verifyConstructions([0, 0, 0], [6, 0, 0], [0, 8, 0]);
    expect(centers.centroid).toEqual([2, 8 / 3, 0]);
    expect(centers.incenter).toEqual([2, 2, 0]);
    expect(centers.circumcenter).toEqual([3, 4, 0]);
    expect(centers.orthocenter).toEqual([0, 0, 0]);
    closeTo(geometry.inradius, 2);
    closeTo(geometry.circumradius, 5);
    expect(geometry.medians).toHaveLength(3);
    expect(geometry.altitudes[1][1]).toEqual([0, 0, 0]);
    expect(geometry.eulerLine).not.toBeNull();
  });

  it.each([
    [[0, 0, 0], [4, 0, 0], [1, 1, 0]],
    [[2, 1, 0], [4, 0, 0], [2, 3, 0]],
    [[0, 0, 0], [10, 0, 0], [2, 0.1, 0]],
    [[0, 0, 0], [5, 0, 0], [2, 4, 0]],
  ] as [Vec3, Vec3, Vec3][])("contains H and every altitude foot, and O on every perpendicular bisector: %j, %j, %j", (A, B, C) => {
    verifyConstructions(A, B, C);
  });

  it("extends an obtuse altitude behind its vertex without tilting its line", () => {
    const { centers, geometry } = verifyConstructions([0, 0, 0], [4, 0, 0], [1, 1, 0]);
    pointCloseTo(centers.orthocenter, [1, 3, 0]);
    pointCloseTo(geometry.altitudes[2][0], centers.orthocenter);
    pointCloseTo(geometry.altitudes[2][1], [1, 0, 0]);
    expect(geometry.perpendicularBisectors[0][0][1]).toBeLessThanOrEqual(centers.circumcenter[1]);
  });

  it("contains exterior centers for an obtuse triangle in a tilted 3D plane", () => {
    const { centers } = verifyConstructions([1, 2, 3], [1, 6, 3], [0.4, 3, 3.8]);
    pointCloseTo(centers.orthocenter, [-0.8, 3, 5.4]);
    pointCloseTo(centers.circumcenter, [1.6, 4, 2.2]);
  });

  it("uses true local-plane coordinates and circles for tilted and vertical triangles", () => {
    for (const triangle of [
      [[1, 2, 3], [4, 2, 6], [1, 6, 5]],
      [[1, 2, 3], [7, 2, 3], [1, 2, 11]],
    ] as [Vec3, Vec3, Vec3][]) {
      const { geometry } = verifyConstructions(...triangle);
      expect(geometry.usesXYAxes).toBe(false);
      closeTo(geometry.project(triangle[0])[0], 0);
      closeTo(geometry.project(triangle[0])[1], 0);
      closeTo(geometry.project(triangle[1])[1], 0);
      const pB = geometry.project(triangle[1]);
      const pC = geometry.project(triangle[2]);
      closeTo(Math.hypot(pB[0] - pC[0], pB[1] - pC[1]), distanceBetween(triangle[1], triangle[2]));
    }
  });

  it("keeps horizontal triangles at their actual z and retains the global XY projection", () => {
    const { geometry } = verifyConstructions([1, 2, 7], [7, 2, 7], [1, 10, 7]);
    expect(geometry.usesXYAxes).toBe(true);
    expect(geometry.project([1, 2, 7])).toEqual([1, 2]);
    expect(geometry.unproject([3, 4])).toEqual([3, 4, 7]);
    geometry.circumcircle.forEach(point => expect(point[2]).toBe(7));
  });

  it("does not flatten a nearly-horizontal plane", () => {
    const A: Vec3 = [0, 0, 0];
    const B: Vec3 = [6, 0, 0];
    const C: Vec3 = [0, 8, 1e-11];
    const { geometry } = verifyConstructions(A, B, C);
    expect(geometry.usesXYAxes).toBe(false);
    expect(geometry.circumcircle.some(point => point[2] !== 0)).toBe(true);
  });

  it("omits the non-unique Euler line for an equilateral triangle", () => {
    const { geometry } = verifyConstructions([0, 0, 0], [2, 0, 0], [1, Math.sqrt(3), 0]);
    expect(geometry.eulerLine).toBeNull();
  });

  it.each([
    [[0, 0, 0], [0, 0, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 2, 3], [2, 4, 6]],
    [[NaN, 0, 0], [1, 0, 0], [0, 1, 0]],
    [[0, 0, 0], [Infinity, 0, 0], [0, 1, 0]],
  ] as [Vec3, Vec3, Vec3][])("rejects invalid vertices instead of generating fake geometry: %j, %j, %j", (A, B, C) => {
    const centers = computeTriangleCenters([0, 0, 0], [6, 0, 0], [0, 8, 0]);
    expect(() => buildTriangleCenterGeometry(A, B, C, centers)).toThrow();
  });

  it("rejects non-finite centers", () => {
    const centers = computeTriangleCenters([0, 0, 0], [6, 0, 0], [0, 8, 0]);
    centers.orthocenter[0] = Infinity;
    expect(() => buildTriangleCenterGeometry([0, 0, 0], [6, 0, 0], [0, 8, 0], centers)).toThrow(/finite/);
  });
});
