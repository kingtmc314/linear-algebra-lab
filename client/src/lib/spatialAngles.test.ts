import { describe, expect, it } from "vitest";
import katex from "katex";
import { rat, toNumber } from "./rational";
import {
  buildSpatialAngleScene,
  computeSpatialAngle,
  resolveSpatialPlane,
  spatialAngleSteps,
  spatialCross,
  spatialDot,
  spatialErrorMessage,
  spatialPlaneBasis,
  spatialPlaneLatex,
  spatialPlanePatch,
  spatialRational,
  spatialSqrtLatex,
  SpatialAngleError,
  type NumericVec3,
  type PlaneInput,
  type SpatialAngleInput,
  type SpatialVec3,
} from "./spatialAngles";

const plane = (
  normal: SpatialVec3,
  offset: number | string = 0
): PlaneInput => ({ kind: "equation", normal, offset });
const planes = (
  normal1: SpatialVec3,
  normal2: SpatialVec3
): SpatialAngleInput => ({
  mode: "plane-plane",
  plane1: plane(normal1),
  plane2: plane(normal2),
});
const linePlane = (
  normal: SpatialVec3,
  direction: SpatialVec3
): SpatialAngleInput => ({
  mode: "line-plane",
  plane: plane(normal),
  line: { kind: "direction", point: [0, 0, 0], direction },
});
const dot = (a: NumericVec3, b: NumericVec3) =>
  a.reduce((s, x, i) => s + x * b[i], 0);
const length = (a: NumericVec3) => Math.hypot(...a);
const vec = (x: number, y: number, z: number) =>
  [x, y, z].map(spatialRational) as ReturnType<typeof spatialCross>;

function parseAll(input: SpatialAngleInput) {
  const result = computeSpatialAngle(input);
  const latex = [
    result.angleLatex,
    result.supplementaryLatex,
    result.normalAngleLatex,
    result.ratioLatex,
    spatialPlaneLatex(result.plane1),
  ];
  if (result.plane2) latex.push(spatialPlaneLatex(result.plane2));
  for (const lang of ["en", "zh"] as const)
    for (const obtuse of [false, true]) {
      const steps = spatialAngleSteps(result, lang, obtuse);
      expect(steps).toHaveLength(6);
      latex.push(...steps.map(s => s.latex));
      expect(
        steps.every(s => s.description.length > (lang === "zh" ? 25 : 40))
      ).toBe(true);
    }
  for (const expression of latex)
    expect(
      () =>
        katex.renderToString(expression, {
          throwOnError: true,
          strict: "ignore",
        }),
      expression
    ).not.toThrow();
  return result;
}

describe("decimal-exact arithmetic for spatial angles", () => {
  it("uses String(number), not continued fraction approximations", () => {
    expect(spatialRational(0.3333)).toEqual(rat(3333, 10000));
    expect(spatialRational("-1.25e-2")).toEqual(rat(-1, 80));
    expect(spatialRational(".000001")).toEqual(rat(1, 1000000));
    expect(spatialRational("2.5000")).toEqual(rat(5, 2));
    expect(spatialRational(0.1 + 0.2)).toEqual(
      rat(30000000000000004n, 100000000000000000n)
    );
  });
  it.each([
    NaN,
    Infinity,
    -Infinity,
    "",
    "1/2",
    "abc",
    "1e99",
    "0x10",
    "1e-13",
    "1e-999",
    1000001,
    "1.123456789012345678901234567890",
  ])("rejects unsafe or nonfinite input %s", value => {
    expect(() => spatialRational(value)).toThrow(SpatialAngleError);
  });
  it.each([
    [rat(8), "2\\sqrt{2}"],
    [rat(12), "2\\sqrt{3}"],
    [rat(1, 2), "\\frac{\\sqrt{2}}{2}"],
    [rat(3, 4), "\\frac{\\sqrt{3}}{2}"],
    [rat(8, 9), "\\frac{2\\sqrt{2}}{3}"],
    [rat(25, 16), "\\frac{5}{4}"],
    [rat(0), "0"],
    [rat(72), "6\\sqrt{2}"],
    [rat(100000000000000000000n), "10000000000"],
  ])("simplifies and rationalizes exact roots", (value, expected) =>
    expect(spatialSqrtLatex(value)).toBe(expected)
  );
  it("bounded factoring keeps very large prime radicals exact", () => {
    const value = rat(100000000000000000003n);
    const latex = spatialSqrtLatex(value);
    expect(latex).toBe("\\sqrt{100000000000000000003}");
    expect(() =>
      katex.renderToString(latex, { throwOnError: true })
    ).not.toThrow();
  });
});

describe("acute two-plane angles", () => {
  it.each([
    [[0, 0, 1], [0, 0, -5], "0", 0],
    [[1, 1, 0], [2, 1, 1], "\\frac{\\pi}{6}", 30],
    [[0, 0, 1], [1, 0, 1], "\\frac{\\pi}{4}", 45],
    [[1, 1, 0], [1, 0, 1], "\\frac{\\pi}{3}", 60],
    [[0, 0, 1], [1, 0, 0], "\\frac{\\pi}{2}", 90],
  ] as [SpatialVec3, SpatialVec3, string, number][])(
    "recognizes exact special angles without floating-point guessing",
    (n1, n2, latex, degrees) => {
      const result = parseAll(planes(n1, n2));
      expect(result.angleLatex).toBe(latex);
      expect(result.degrees).toBe(degrees);
    }
  );
  it("keeps arbitrary inclined-plane angles in exact arccos form", () => {
    const result = parseAll({
      mode: "plane-plane",
      plane1: plane([1, 1, 1], 1),
      plane2: plane([1, -1, 2], 3),
    });
    expect(result.ratioSquared).toEqual(rat(2, 9));
    expect(result.ratioLatex).toBe("\\frac{\\sqrt{2}}{3}");
    expect(result.angleLatex).toBe(
      "\\arccos\\left(\\frac{\\sqrt{2}}{3}\\right)"
    );
    expect(result.degrees).toBeCloseTo(
      (Math.acos(Math.sqrt(2) / 3) * 180) / Math.PI,
      10
    );
    expect(result.supplementaryLatex).toBe(
      `\\pi-\\left(${result.angleLatex}\\right)`
    );
  });
  it("is invariant under negative normal scaling and offsets", () => {
    const base = computeSpatialAngle(planes([1, 2, -3], [-2, 1, 5]));
    const scaled = computeSpatialAngle({
      mode: "plane-plane",
      plane1: plane([-0.1, -0.2, 0.3], "0.17"),
      plane2: plane([4, -2, -10], -31),
    });
    expect(scaled.ratioSquared).toEqual(base.ratioSquared);
    expect(scaled.angleLatex).toBe(base.angleLatex);
  });
  it("derives exact normals from tilted vertex planes", () => {
    const input: SpatialAngleInput = {
      mode: "plane-plane",
      plane1: {
        kind: "points",
        points: [
          [0, 0, 1],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      plane2: {
        kind: "points",
        points: [
          [1, 0, 0],
          [0, -1, 0],
          [-1, 0, 1],
        ],
      },
    };
    const result = parseAll(input);
    expect(result.plane1.normal).toEqual(vec(1, 1, 1));
    expect(result.plane1.offset).toEqual(rat(1));
    expect(result.plane2.normal).toEqual(vec(-1, 1, -2));
    expect(result.ratioSquared).toEqual(rat(2, 9));
    expect(spatialAngleSteps(result, "en")[0].latex).toContain("\\times");
  });
  it("does not round a near-special exact decimal to a special angle", () => {
    const result = computeSpatialAngle(
      planes([0, 0, 1], ["1.000000000001", 0, 1])
    );
    expect(result.angleLatex).toContain("\\arccos");
  });
});

describe("line-plane angle and its projection", () => {
  it.each([
    [[0, 0, 1], [1, 0, 0], "0", 0],
    [[1, 1, 0], [1, 0, 1], "\\frac{\\pi}{6}", 30],
    [[0, 0, 1], [1, 0, 1], "\\frac{\\pi}{4}", 45],
    [[1, 1, 0], [2, 1, 1], "\\frac{\\pi}{3}", 60],
    [[0, 0, 1], [0, 0, -2], "\\frac{\\pi}{2}", 90],
  ] as [SpatialVec3, SpatialVec3, string, number][])(
    "uses asin and handles 0/30/45/60/90 degrees",
    (n, d, latex, degrees) => {
      const result = parseAll(linePlane(n, d));
      expect(result.angleLatex).toBe(latex);
      expect(result.degrees).toBe(degrees);
    }
  );
  it("never confuses the angle to the plane with the angle to its normal", () => {
    const result = computeSpatialAngle(linePlane([1, 1, 0], [1, 0, 1]));
    expect(result.angleLatex).toBe("\\frac{\\pi}{6}");
    expect(result.normalAngleLatex).toBe("\\frac{\\pi}{3}");
  });
  it("calculates signed exact components for an arbitrary inclined plane", () => {
    const result = parseAll(linePlane([1, 1, 1], [2, -1, -3]));
    expect(result.dot).toEqual(rat(-2));
    expect(result.projection!.lambda).toEqual(rat(-2, 3));
    expect(result.projection!.perpendicular).toEqual([
      rat(-2, 3),
      rat(-2, 3),
      rat(-2, 3),
    ]);
    expect(result.projection!.parallel).toEqual([
      rat(8, 3),
      rat(-1, 3),
      rat(-7, 3),
    ]);
    expect(
      spatialDot(result.plane1.normal, result.projection!.parallel)
    ).toEqual(rat(0));
    expect(result.ratioSquared).toEqual(rat(2, 21));
    expect(result.angleLatex).toBe(
      "\\arcsin\\left(\\frac{\\sqrt{42}}{21}\\right)"
    );
  });
  it("gets d=Q−P exactly and locates the line", () => {
    const result = parseAll({
      mode: "line-plane",
      plane: plane([0, 0, 1], "0.1"),
      line: {
        kind: "points",
        points: [
          ["0.1", "0.2", "0.3"],
          ["0.4", "0.2", "0.6"],
        ],
      },
    });
    expect(result.line!.direction).toEqual([rat(3, 10), rat(0), rat(3, 10)]);
    expect(result.angleLatex).toBe("\\frac{\\pi}{4}");
  });
  it("is invariant under nonzero direction and normal scales", () => {
    const a = computeSpatialAngle(linePlane([1, -2, 3], [4, 1, -2]));
    const b = computeSpatialAngle(linePlane([-0.1, 0.2, -0.3], [-8, -2, 4]));
    expect(a.ratioSquared).toEqual(b.ratioSquared);
    expect(a.angleLatex).toBe(b.angleLatex);
  });
});

describe("degenerate geometry and bilingual errors", () => {
  it.each([
    [planes([0, 0, 0], [1, 0, 0]), "normal"],
    [linePlane([1, 0, 0], [0, 0, 0]), "direction"],
    [
      {
        mode: "line-plane",
        plane: plane([0, 0, 1]),
        line: {
          kind: "points",
          points: [
            [1, 2, 3],
            [1, 2, 3],
          ],
        },
      },
      "coincident",
    ],
    [
      {
        mode: "plane-plane",
        plane1: {
          kind: "points",
          points: [
            [0, 0, 0],
            [1, 1, 1],
            [2, 2, 2],
          ],
        },
        plane2: plane([0, 0, 1]),
      },
      "collinear",
    ],
    [
      {
        mode: "plane-plane",
        plane1: {
          kind: "points",
          points: [
            [1, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
          ],
        },
        plane2: plane([0, 0, 1]),
      },
      "collinear",
    ],
  ] as [SpatialAngleInput, SpatialAngleError["code"]][])(
    "rejects undefined geometric definitions",
    (input, code) => {
      try {
        computeSpatialAngle(input);
        throw new Error("Expected rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(SpatialAngleError);
        expect((error as SpatialAngleError).code).toBe(code);
        expect(spatialErrorMessage(code, "en")).not.toBe(
          spatialErrorMessage(code, "zh")
        );
      }
    }
  );
});

describe("actual 3D plane patches and derivation playback", () => {
  it.each(
    (
      [
        [0, 0, 1],
        [1, 0, 0],
        [0, -2, 0],
        [1, 2, 3],
      ] as NumericVec3[]
    ).map(normal => [normal])
  )("builds a robust orthonormal basis for %s", normal => {
    const [u, v] = spatialPlaneBasis(normal);
    expect(length(u)).toBeCloseTo(1, 12);
    expect(length(v)).toBeCloseTo(1, 12);
    expect(dot(u, v)).toBeCloseTo(0, 12);
    expect(dot(normal, u)).toBeCloseTo(0, 12);
    expect(dot(normal, v)).toBeCloseTo(0, 12);
  });
  it("patch vertices satisfy an inclined plane equation and actual offset", () => {
    const resolved = resolveSpatialPlane(plane([1, 2, 3], 7));
    const center = resolved.anchor.map(toNumber) as NumericVec3;
    for (const point of spatialPlanePatch(center, [1, 2, 3], 4))
      expect(dot(point, [1, 2, 3])).toBeCloseTo(7, 10);
  });
  it("plots actual intersections and an acute arc between in-plane directions", () => {
    const result = computeSpatialAngle({
      mode: "plane-plane",
      plane1: plane([1, 1, 1], 1),
      plane2: plane([1, -1, 2], 3),
    });
    const scene = buildSpatialAngleScene(result);
    const intersection = scene.data.find(t => t.name === "Intersection") as {
      x: number[];
      y: number[];
      z: number[];
    };
    const center = [0, 1, 2].map(
      i =>
        ([intersection.x, intersection.y, intersection.z][i][0] +
          [intersection.x, intersection.y, intersection.z][i][1]) /
        2
    ) as NumericVec3;
    expect(dot(center, [1, 1, 1])).toBeCloseTo(1, 10);
    expect(dot(center, [1, -1, 2])).toBeCloseTo(3, 10);
    const ray = (name: string): NumericVec3 => {
      const trace = scene.data.find(t => t.name === name) as {
        x: number[];
        y: number[];
        z: number[];
      };
      return [
        trace.x[1] - trace.x[0],
        trace.y[1] - trace.y[0],
        trace.z[1] - trace.z[0],
      ];
    };
    const a = ray("u₁"),
      b = ray("u₂");
    expect(dot(a, [1, 1, 1])).toBeCloseTo(0, 10);
    expect(dot(b, [1, -1, 2])).toBeCloseTo(0, 10);
    expect(dot(a, b) / length(a) / length(b)).toBeCloseTo(
      Math.cos(result.radians),
      10
    );
  });
  it("supplementary arc depicts π−θ rather than silently changing the acute convention", () => {
    const result = computeSpatialAngle(planes([0, 0, 1], [1, 0, 1]));
    const acute = buildSpatialAngleScene(result).data.find(
      t => t.name === "θ"
    ) as { x: number[]; y: number[]; z: number[] };
    const obtuse = buildSpatialAngleScene(result, {
      supplementary: true,
    }).data.find(t => t.name === "θₛ") as {
      x: number[];
      y: number[];
      z: number[];
    };
    expect([obtuse.x[48], obtuse.y[48], obtuse.z[48]]).toEqual(
      [acute.x[48], acute.y[48], acute.z[48]].map(v => expect.closeTo(-v, 10))
    );
  });
  it("reveals normals, projections and the arc at the matching derivation steps without changing axis ranges", () => {
    const result = computeSpatialAngle(linePlane([0, 0, 1], [1, 0, 1]));
    const stages = Array.from({ length: 6 }, (_, stepIndex) =>
      buildSpatialAngleScene(result, { stepIndex })
    );
    expect(stages[0].data.some(t => t.name === "n")).toBe(true);
    expect(stages[0].data.some(t => t.name === "d")).toBe(false);
    expect(stages[1].data.some(t => t.name === "d")).toBe(true);
    expect(stages[2].data.some(t => t.name === "d∥")).toBe(false);
    expect(stages[3].data.some(t => t.name === "d∥")).toBe(true);
    expect(stages[3].data.some(t => t.name === "θ")).toBe(false);
    expect(stages[4].data.some(t => t.name === "θ")).toBe(true);
    stages.forEach(s => expect(s.layout.scene).toEqual(stages[5].layout.scene));
  });
  it("preserves line point and plane offset instead of forcing everything through the origin", () => {
    const result = computeSpatialAngle({
      mode: "line-plane",
      plane: plane([0, 0, 1], 3),
      line: { kind: "direction", point: [1, 2, 5], direction: [1, 0, -1] },
    });
    const scene = buildSpatialAngleScene(result);
    const patch = scene.data.find(
      t => t.type === "mesh3d" && t.name === "Π"
    ) as { z: number[] };
    expect(patch.z.every(z => z === 3)).toBe(true);
    const point = scene.data.find(
      t => (t as { text?: string[] }).text?.[0] === "P"
    ) as { x: number[]; y: number[]; z: number[] };
    expect([point.x[0], point.y[0], point.z[0]]).toEqual([1, 2, 5]);
  });
  it.each([
    planes([0, 0, 1], [0, 0, -2]),
    planes([0, 0, 1], [1, 0, 0]),
    linePlane([0, 0, 1], [1, 0, 0]),
    linePlane([0, 0, 1], [0, 0, -1]),
    {
      mode: "plane-plane",
      plane1: plane([1e-12, 0, 0], 1e6),
      plane2: plane([0, 1e-12, 0], -1e6),
    },
    {
      mode: "line-plane",
      plane: plane([1, 1, 1], 1000000),
      line: {
        kind: "direction",
        point: [-1000000, -1000000, -1000000],
        direction: [1, -1, "0.000000000001"],
      },
    },
  ] as SpatialAngleInput[])(
    "has finite 3D traces, including parallel/perpendicular/extreme valid inputs",
    input => {
      const result = parseAll(input);
      for (const supplementary of [false, true])
        for (const lang of ["en", "zh"] as const) {
          const scene = buildSpatialAngleScene(result, { supplementary, lang });
          scene.data.forEach(trace => {
            expect(trace.name ?? "").not.toContain("\\");
            for (const axis of ["x", "y", "z"] as const) {
              const values = (trace as unknown as Record<string, number[]>)[
                axis
              ];
              values?.forEach(value =>
                expect(Number.isFinite(value)).toBe(true)
              );
            }
          });
        }
    }
  );
});
