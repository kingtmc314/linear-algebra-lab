import { describe, expect, it } from "vitest";
import {
  advanceConstruction,
  constructionProgress,
  isUsableTriangle,
  makePlaneFrame,
  snapPlanePoint,
  stageVisibility,
} from "./triangleInteraction";
import type { Vec3 } from "./vectorMath";

describe("Triangle editing & construction progression", () => {
  it("uses actual xy and preserves z for a horizontal plane", () => {
    const frame = makePlaneFrame([0, 0, 7], [6, 0, 7], [0, 8, 7]);
    expect(frame.project([2, 4, 7])).toEqual([2, 4]);
    expect(frame.unproject([3, 5])).toEqual([3, 5, 7]);
  });
  it("round-trips a tilted triangle without distorting its true plane", () => {
    const a: Vec3 = [1, 1, 1],
      b: Vec3 = [6, 1, 3],
      c: Vec3 = [2, 5, 4];
    const frame = makePlaneFrame(a, b, c);
    for (const point of [a, b, c])
      frame
        .unproject(frame.project(point))
        .forEach((x, i) => expect(x).toBeCloseTo(point[i], 10));
    const point = frame.unproject([2.1, 3.6]);
    const ab = b.map((x, i) => x - a[i]),
      ac = c.map((x, i) => x - a[i]);
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    expect(
      point.reduce((s, x, i) => s + (x - a[i]) * normal[i], 0)
    ).toBeCloseTo(0, 10);
  });
  it("frozen frame avoids a moving drag origin when vertex A moves", () => {
    const frame = makePlaneFrame([1, 1, 1], [6, 1, 3], [2, 5, 4]);
    const a1 = frame.unproject([0.2, 0.3]);
    const a2 = frame.unproject([0.4, 0.3]);
    expect(Math.hypot(...a2.map((x, i) => x - a1[i]))).toBeCloseTo(0.2, 10);
    expect(frame.origin).toEqual([1, 1, 1]);
  });
  it("rejects collinear, coincident, near-degenerate and non-finite inputs", () => {
    expect(isUsableTriangle([0, 0, 0], [1, 0, 0], [2, 0, 0])).toBe(false);
    expect(isUsableTriangle([0, 0, 0], [0, 0, 0], [2, 2, 0])).toBe(false);
    expect(isUsableTriangle([0, 0, 0], [6, 0, 0], [1, 1e-8, 0])).toBe(false);
    expect(isUsableTriangle([0, 0, 0], [6, 0, 0], [NaN, 5, 0])).toBe(false);
    expect(isUsableTriangle([0, 0, 0], [6, 0, 0], [1, 1.5, 0])).toBe(true);
  });
  it("snaps positive and negative plane coordinates precisely", () => {
    expect(snapPlanePoint([2.149, -1.28], 0.1)).toEqual([2.1, -1.3]);
    expect(snapPlanePoint([2.149, -1.28], 0.01)).toEqual([2.15, -1.28]);
  });
  it("reveals G, I, O, H in order and shows Euler only at the end", () => {
    expect(stageVisibility(0).centers).toEqual([]);
    expect(Object.values(stageVisibility(0).layers).every(v => !v)).toBe(true);
    expect(stageVisibility(1).centers).toEqual(["G"]);
    expect(stageVisibility(2).centers).toEqual(["G", "I"]);
    expect(stageVisibility(2).layers.incircle).toBe(true);
    expect(stageVisibility(3).layers.circumcircle).toBe(true);
    expect(stageVisibility(3).layers.altitudes).toBe(false);
    expect(stageVisibility(4).centers).toEqual(["G", "I", "O", "H"]);
    expect(stageVisibility(4).layers.eulerLine).toBe(false);
    expect(stageVisibility(5).layers.eulerLine).toBe(true);
    expect(advanceConstruction(5)).toBe(5);
    expect(stageVisibility(100)).toEqual(stageVisibility(5));
    expect(stageVisibility(-1)).toEqual(stageVisibility(0));
  });
});

it("clamps animation progress when the RAF timestamp precedes registration", () => {
  expect(constructionProgress(-2)).toBe(0);
  expect(constructionProgress(0)).toBe(0);
  expect(constructionProgress(350)).toBe(0.5);
  expect(constructionProgress(700)).toBe(1);
  expect(constructionProgress(800)).toBe(1);
});
