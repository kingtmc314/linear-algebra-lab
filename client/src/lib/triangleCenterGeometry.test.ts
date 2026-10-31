import { describe, expect, it } from "vitest";
import { computeTriangleCenters, type Vec3 } from "./vectorMath";
import { buildTriangleCenterGeometry, distanceBetween } from "./triangleCenterGeometry";

const closeTo = (actual: number, expected: number, precision = 8) => {
  expect(actual).toBeCloseTo(expected, precision);
};

describe("triangle-center construction geometry", () => {
  const A: Vec3 = [0, 0, 0];
  const B: Vec3 = [6, 0, 0];
  const C: Vec3 = [0, 8, 0];
  const centers = computeTriangleCenters(A, B, C);
  const geometry = buildTriangleCenterGeometry(A, B, C, centers);

  it("preserves the expected four centers for a 6–8–10 right triangle", () => {
    expect(centers.centroid).toEqual([2, 8 / 3, 0]);
    expect(centers.incenter).toEqual([2, 2, 0]);
    expect(centers.circumcenter).toEqual([3, 4, 0]);
    expect(centers.orthocenter).toEqual([0, 0, 0]);
  });

  it("draws a circumcircle passing through all three vertices and an incircle tangent to AB", () => {
    const O = centers.circumcenter;
    const radius = geometry.circumradius;
    closeTo(distanceBetween(O, A), radius);
    closeTo(distanceBetween(O, B), radius);
    closeTo(distanceBetween(O, C), radius);
    closeTo(geometry.inradius, 2);
  });

  it("constructs the three medians, altitudes, and perpendicular bisectors", () => {
    expect(geometry.medians).toHaveLength(3);
    expect(geometry.altitudes).toHaveLength(3);
    expect(geometry.perpendicularBisectors).toHaveLength(3);
    expect(geometry.angleBisectors).toHaveLength(3);
    expect(geometry.eulerLine).not.toBeNull();

    const altitudeFromB = geometry.altitudes[1];
    expect(altitudeFromB?.[1]).toEqual([0, 0, 0]);
  });

  it("uses true local-plane coordinates for a triangle not parallel to the xy-plane", () => {
    const pA: Vec3 = [1, 2, 3];
    const pB: Vec3 = [4, 2, 6];
    const pC: Vec3 = [1, 6, 5];
    const tiltedCenters = computeTriangleCenters(pA, pB, pC);
    const tilted = buildTriangleCenterGeometry(pA, pB, pC, tiltedCenters);

    expect(tilted.usesXYAxes).toBe(false);
    closeTo(tilted.project(pA)[0], 0);
    closeTo(tilted.project(pA)[1], 0);
    closeTo(tilted.project(pB)[1], 0);
  });
});
