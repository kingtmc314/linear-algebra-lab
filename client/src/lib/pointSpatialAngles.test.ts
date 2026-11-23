import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import katex from "katex";
import { rat, toNumber } from "./rational";
import {
  computePointSpatialAngle,
  pointSpatialSteps,
  pointSpatialScene,
  pointSpatialDefinitionLatex,
  PointSpatialError,
  pointSpatialErrorMessage,
  type NamedSpatialPoint,
  type PointSpatialInput,
  type PointSpatialResult,
  type PointSpatialErrorCode,
} from "./pointSpatialAngles";
import {
  spatialDot,
  spatialRational,
  type ExactVec3,
  type NumericVec3,
  type SpatialVec3,
} from "./spatialAngles";

const originalWarn = console.warn;
beforeAll(() =>
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    // KaTeX has no text-font metrics for Unicode Greek, but accepts all descriptions.
    if (!String(args[0]).startsWith("No character metrics for"))
      originalWarn(...args);
  })
);
afterAll(() => vi.restoreAllMocks());

const points = (
  coordinates: SpatialVec3[],
  labels?: string[]
): NamedSpatialPoint[] =>
  coordinates.map((coordinates, i) => ({
    id: `point-${i}`,
    label: labels?.[i] ?? String.fromCharCode(65 + i),
    coordinates,
  }));
const selected = (indices: number[]) => indices.map(i => `point-${i}`);
const planes = (
  coordinates: SpatialVec3[],
  plane1 = [0, 1, 2],
  plane2 = [0, 1, 3]
): PointSpatialInput => ({
  mode: "plane-plane",
  points: points(coordinates),
  plane1: selected(plane1),
  plane2: selected(plane2),
});
const linePlane = (
  coordinates: SpatialVec3[],
  plane1 = [0, 1, 2],
  line: [number, number] = [0, 3]
): PointSpatialInput => ({
  mode: "line-plane",
  points: points(coordinates),
  plane1: selected(plane1),
  line: selected(line) as [string, string],
});
const sharedFour = (): PointSpatialInput =>
  planes([
    [0, 0, 0],
    [2, 0, 0],
    [1, 2, 0],
    [3, 2, 2],
  ]);
const gramFour = (): PointSpatialInput =>
  linePlane([
    [0, 0, 0],
    [2, 0, 0],
    [1, 2, 0],
    [1, 0, 1],
  ]);
const inclined = (): PointSpatialInput =>
  planes(
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0], // n₁=(1,1,1)
      [0, -1, 0],
      [2, -1, 0],
      [3, 0, 0],
      [0, -3, 0],
      [-1, 0, 1], // selected second triple gives n₂=(-1,1,-2)
    ],
    [0, 1, 2],
    [1, 3, 7]
  );
// For arbitrary sections the triangles need not share any named vertex.
const disjointInclined = (): PointSpatialInput =>
  planes(
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
      [3, 0, 0],
      [0, -3, 0],
      [1, 0, 1],
      [100, -50, 20],
      [-200, 10, -30],
    ],
    [0, 1, 2],
    [3, 4, 5]
  );
const v = (values: SpatialVec3) => values.map(spatialRational) as ExactVec3;
const numerical = (a: ExactVec3) => a.map(toNumber) as NumericVec3;
const dotN = (a: NumericVec3, b: NumericVec3) =>
  a.reduce((s, x, i) => s + x * b[i], 0);
const length = (v: NumericVec3) => Math.hypot(...v);
type Trace = {
  name?: string;
  type?: string;
  mode?: string;
  text?: string[];
  x?: number[];
  y?: number[];
  z?: number[];
};
const ray = (
  result: PointSpatialResult,
  name: string,
  stepIndex = 5,
  supplementary = false
): NumericVec3 => {
  const trace = pointSpatialScene(result, {
    stepIndex,
    supplementary,
  }).data.find(t => t.name === name) as Trace;
  expect(trace, name).toBeDefined();
  return [0, 1, 2].map(
    i =>
      [trace.x!, trace.y!, trace.z!][i][1] -
      [trace.x!, trace.y!, trace.z!][i][0]
  ) as NumericVec3;
};
function parsed(input: PointSpatialInput): PointSpatialResult {
  const result = computePointSpatialAngle(input);
  const definitions = pointSpatialDefinitionLatex(result);
  const forbidden =
    /\\mathbf\s*r\b|\\mathbf\s*n_?\d*\s*\\cdot\s*\\mathbf\s*r|\br\s*=\s*\(?x|\\ell:.*[+=]t|\\Pi(?:_\d)?:.*[xyz]=/;
  for (const lang of ["zh", "en"] as const) {
    for (const supplementary of [false, true]) {
      const steps = pointSpatialSteps(result, lang, supplementary);
      expect(steps).toHaveLength(6);
      for (const step of steps) {
        expect(step.description.length).toBeGreaterThan(
          lang === "zh" ? 25 : 40
        );
        expect(`${step.description} ${step.latex}`).not.toMatch(forbidden);
        if (lang === "en")
          expect(step.description + step.latex).not.toMatch(/[\u3400-\u9fff]/u);
        expect(
          () =>
            katex.renderToString(step.latex, {
              throwOnError: true,
              strict: "ignore",
            }),
          step.latex
        ).not.toThrow();
        expect(() =>
          katex.renderToString(`\\text{${step.description}}`, {
            throwOnError: true,
            strict: "ignore",
          })
        ).not.toThrow();
      }
    }
  }
  for (const latex of [
    ...definitions,
    result.angle.angleLatex,
    result.cosineLatex,
  ]) {
    expect(latex).not.toMatch(forbidden);
    expect(
      () =>
        katex.renderToString(latex, { throwOnError: true, strict: "ignore" }),
      latex
    ).not.toThrow();
  }
  return result;
}
function assertScene(result: PointSpatialResult, supplementary = false) {
  const stages = Array.from({ length: 6 }, (_, stepIndex) =>
    pointSpatialScene(result, { stepIndex, supplementary, lang: "en" })
  );
  for (const scene of stages) {
    expect(scene.layout.scene).toEqual(stages[5].layout.scene);
    expect(scene.note).not.toMatch(/[\u3400-\u9fff]/u);
    const pointTrace = scene.data.find(t => t.name === "Given points") as Trace;
    expect(pointTrace.text).toEqual(result.input.points.map(p => p.label));
    expect(scene.data.filter(t => (t as Trace).text)).toHaveLength(1);
    for (const trace of scene.data as Trace[]) {
      expect(trace.name ?? "").not.toContain("\\");
      expect(trace.name ?? "").not.toMatch(/A₁|A₂|B₁|B₂|C₁|C₂/);
      for (const [i, axis] of ["x", "y", "z"].entries()) {
        const values = trace[axis as "x" | "y" | "z"];
        const range = (
          (scene.layout.scene as Record<string, unknown>)[`${axis}axis`] as {
            range: number[];
          }
        ).range;
        values?.forEach(value => {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(range[0]);
          expect(value).toBeLessThanOrEqual(range[1]);
        });
        expect(pointTrace[axis as "x" | "y" | "z"]).toEqual(
          result.points.map(p => toNumber(p.exact[i]))
        );
      }
    }
  }
  return stages;
}
function errorCode(input: PointSpatialInput, code: PointSpatialErrorCode) {
  try {
    computePointSpatialAngle(input);
    throw new Error("Expected rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(PointSpatialError);
    expect((error as PointSpatialError).code).toBe(code);
    expect(pointSpatialErrorMessage(error, "en")).toBe(
      pointSpatialErrorMessage(code, "en")
    );
    expect(pointSpatialErrorMessage(error, "zh")).not.toBe(
      pointSpatialErrorMessage(error, "en")
    );
  }
}

describe("four-or-more-point plane angles", () => {
  it("prefers shared-edge projection for four points, retaining substitutions and exact vectors", () => {
    const result = parsed(sharedFour());
    expect(result.angle.angleLatex).toBe("\\frac{\\pi}{4}");
    expect(result.construction.kind).toBe("shared-edge");
    if (result.construction.kind !== "shared-edge")
      throw new Error("Wrong construction");
    const c = result.construction;
    expect(c.h).toEqual(v([2, 0, 0]));
    expect(c.coefficient1).toEqual(rat(1, 2));
    expect(c.coefficient2).toEqual(rat(3, 2));
    expect(c.u).toEqual(v([0, 2, 0]));
    expect(c.v).toEqual(v([0, 2, 2]));
    expect(spatialDot(c.h, c.u)).toEqual(rat(0));
    expect(spatialDot(c.h, c.v)).toEqual(rat(0));
    expect(result.cosineSquared).toEqual(rat(1, 2));
    expect(pointSpatialSteps(result, "en")[2].latex).toContain("\\frac{2}{4}");
    expect(pointSpatialSteps(result, "en")[3].latex).toContain("\\frac{6}{4}");
    expect(
      pointSpatialSteps(result, "en")
        .map(s => s.latex)
        .join(" ")
    ).not.toMatch(/\\mathbf n|k_1|k_2/);
    const stages = assertScene(result);
    expect(stages[0].data.some(t => t.name === "h")).toBe(true);
    expect(stages[0].data.some(t => t.name === "c")).toBe(false);
    expect(stages[1].data.some(t => t.name === "c")).toBe(true);
    expect(stages[1].data.some(t => t.name === "u")).toBe(false);
    expect(stages[2].data.some(t => t.name === "u")).toBe(true);
    expect(stages[2].data.some(t => t.name === "v")).toBe(false);
    expect(stages[3].data.some(t => t.name === "v")).toBe(true);
    expect(stages[3].data.some(t => t.name === "θ")).toBe(false);
    expect(stages[4].data.some(t => t.name === "θ")).toBe(true);
    expect(ray(result, "u")).toEqual(numerical(c.u));
    expect(ray(result, "v")).toEqual(numerical(c.v));
    expect(stages[3].data.some(t => t.name === "90°")).toBe(true);
  });
  it("validates five selected coplanar points, finding a triple beyond collinear first vertices", () => {
    const result = parsed(
      planes(
        [
          [0, 0, 0],
          [1, 0, 0],
          [2, 0, 0],
          [0, 1, 0],
          [0, 0, 2],
        ],
        [0, 1, 2, 3],
        [0, 1, 2, 4]
      )
    );
    expect(result.plane1.triple.map(p => p.label)).toEqual(["A", "B", "D"]);
    expect(result.angle.angleLatex).toBe("\\frac{\\pi}{2}");
    expect(result.plane1.vertices).toHaveLength(4);
    const scene = assertScene(result)[5];
    const outline = scene.data.find(
      t => t.name === "Π₁" && t.type === "scatter3d"
    ) as Trace;
    expect(outline.x).toHaveLength(5);
    for (const vertex of result.plane1.vertices) {
      expect(
        outline.x!.map((x, i) => [x, outline.y![i], outline.z![i]])
      ).toContainEqual(numerical(vertex.exact));
    }
  });
  it("supports eight-point arbitrarily inclined disjoint planes and unselected extras", () => {
    const result = parsed(disjointInclined());
    expect(result.construction.kind).toBe("section");
    expect(result.angle.ratioSquared).toEqual(rat(2, 9));
    expect(result.cosineSquared).toEqual(rat(2, 9));
    expect(result.angle.angleLatex).toBe(
      "\\arccos\\left(\\frac{\\sqrt{2}}{3}\\right)"
    );
    const a = ray(result, "u (direction)"),
      b = ray(result, "v (direction)");
    expect(dotN(a, numerical(result.plane1.normal))).toBeCloseTo(0, 8);
    expect(dotN(b, numerical(result.plane2!.normal))).toBeCloseTo(0, 8);
    expect(Math.abs(dotN(a, b)) / length(a) / length(b)).toBeCloseTo(
      Math.cos(result.angle.radians),
      12
    );
    const stages = assertScene(result);
    const h = stages[2].data.find(t => t.name === "h (direction)") as Trace;
    const center = [h.x![0], h.y![0], h.z![0]] as NumericVec3;
    expect(
      dotN(
        numerical(result.plane1.normal),
        center.map(
          (x, i) => x - toNumber(result.plane1.triple[0].exact[i])
        ) as NumericVec3
      )
    ).toBeCloseTo(0, 9);
    expect(
      dotN(
        numerical(result.plane2!.normal),
        center.map(
          (x, i) => x - toNumber(result.plane2!.triple[0].exact[i])
        ) as NumericVec3
      )
    ).toBeCloseTo(0, 9);
    expect(stages[5].note).toContain("directions only");
  });
  it("supports an arbitrary inclined pair sharing only one point", () => {
    const result = parsed(inclined());
    expect(result.construction.kind).toBe("section");
    expect(result.angle.ratioSquared).toEqual(rat(2, 9));
    assertScene(result);
  });
  it("uses exact finite decimals without rounding near-special angles", () => {
    const input = planes([
      ["0.1", "0.2", "0.3"],
      ["0.3", "0.2", "0.3"],
      ["0.2", "0.4", "0.3"],
      ["0.4", "0.4", "0.5000000000002"],
    ]);
    const result = parsed(input);
    expect(result.points[0].exact).toEqual([rat(1, 10), rat(1, 5), rat(3, 10)]);
    expect(result.angle.angleLatex).toContain("\\arccos");
    expect(result.angle.angleLatex).not.toBe("\\frac{\\pi}{4}");
    assertScene(result);
  });
  it.each([
    planes([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, -2, 0],
    ]), // coincident with shared edge
    planes(
      [
        [0, 0, 2],
        [1, 0, 2],
        [0, 1, 2],
        [0, 0, 5],
        [2, 0, 5],
        [0, 3, 5],
      ],
      [0, 1, 2],
      [3, 4, 5]
    ),
    planes(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [2, 2, 0],
        [3, 2, 0],
        [2, 3, 0],
      ],
      [0, 1, 2],
      [3, 4, 5]
    ),
  ])(
    "guards parallel and coincident planes without zero normalization",
    input => {
      const result = parsed(input);
      expect(result.angle.angleLatex).toBe("0");
      assertScene(result);
      assertScene(result, true);
      expect(pointSpatialSteps(result, "en", true)[5].latex).toContain(
        "\\theta_s=\\pi-\\theta=\\pi"
      );
    }
  );
  it("supplementary ray and arc match π−θ without changing the computed smaller answer", () => {
    const result = parsed(sharedFour());
    assertScene(result, true);
    expect(ray(result, "−v", 5, true)).toEqual(
      numerical(result.direction2).map(x => (x === 0 ? 0 : -x))
    );
    const acute = pointSpatialScene(result, {}).data.find(
      t => t.name === "θ"
    ) as Trace;
    const obtuse = pointSpatialScene(result, { supplementary: true }).data.find(
      t => t.name === "θs"
    ) as Trace;
    for (const axis of ["x", "y", "z"] as const)
      expect(obtuse[axis]![48]).toBeCloseTo(-acute[axis]![48], 12);
    expect(result.angle.angleLatex).toBe("\\frac{\\pi}{4}");
  });
});

describe("line-plane angles through a two-by-two Gram projection", () => {
  it("derives explicit coefficients for a nonorthogonal in-plane basis with four points", () => {
    const result = parsed(gramFour());
    expect(result.construction.kind).toBe("gram");
    if (result.construction.kind !== "gram")
      throw new Error("Wrong construction");
    const c = result.construction;
    expect(c.aa).toEqual(rat(4));
    expect(c.ab).toEqual(rat(2));
    expect(c.bb).toEqual(rat(5));
    expect(c.determinant).toEqual(rat(16));
    expect(c.alpha).toEqual(rat(1, 2));
    expect(c.beta).toEqual(rat(0));
    expect(c.q).toEqual(v([1, 0, 0]));
    expect(c.residual).toEqual(v([0, 0, 1]));
    expect(c.q).toEqual(result.angle.projection!.parallel);
    expect(result.cosineSquared).toEqual(rat(1, 2));
    expect(result.angle.angleLatex).toBe("\\frac{\\pi}{4}");
    const latex = pointSpatialSteps(result, "en")
      .map(s => s.latex)
      .join(" ");
    expect(latex).toContain("\\Delta");
    expect(latex).toContain("\\alpha=\\frac");
    expect(latex).toContain("\\beta=\\frac");
    expect(latex).not.toMatch(/\\mathbf n|\\lambda|\\sin\\theta/);
    expect(latex).toContain("\\cos\\theta");
    const stages = assertScene(result);
    expect(stages[0].data.some(t => t.name === "d (translated)")).toBe(false);
    expect(stages[1].data.some(t => t.name === "d (translated)")).toBe(true);
    expect(stages[2].data.some(t => t.name === "q")).toBe(false);
    expect(stages[3].data.some(t => t.name === "q")).toBe(true);
    expect(stages[3].data.some(t => t.name === "θ")).toBe(false);
    expect(stages[4].data.some(t => t.name === "θ")).toBe(true);
    expect(ray(result, "d (translated)")).toEqual(numerical(c.d));
    expect(ray(result, "q")).toEqual(numerical(c.q));
    expect(ray(result, "d−q")).toEqual(numerical(c.residual));
    expect(stages[3].data.some(t => t.name === "90°")).toBe(true);
  });
  it("uses five points when both line endpoints are outside an inclined plane", () => {
    const result = parsed(
      linePlane(
        [
          [0, 0, 1],
          [1, 0, 0],
          [0, 1, 0],
          [2, 3, 4],
          [4, 2, 1],
        ],
        [0, 1, 2],
        [3, 4]
      )
    );
    if (result.construction.kind !== "gram")
      throw new Error("Wrong construction");
    expect(result.construction.q).toEqual([rat(8, 3), rat(-1, 3), rat(-7, 3)]);
    expect(result.angle.ratioSquared).toEqual(rat(2, 21));
    expect(result.cosineSquared).toEqual(rat(19, 21));
    expect(result.angle.angleLatex).toBe(
      "\\arccos\\left(\\frac{\\sqrt{399}}{21}\\right)"
    );
    expect(result.angle.radians).toBeCloseTo(Math.acos(Math.sqrt(19 / 21)), 12);
    const segment = assertScene(result)[5].data.find(
      t => t.name === "ℓ"
    ) as Trace;
    expect([segment.x![0], segment.y![0], segment.z![0]]).toEqual([2, 3, 4]);
    expect([segment.x![1], segment.y![1], segment.z![1]]).toEqual([4, 2, 1]);
  });
  it("accepts eight points with coplanar extras, retains extras in definitions and bounds", () => {
    const input = linePlane(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        ["0.2", "0.3", 0],
        [4, 3, 2],
        [5, 4, 3],
        [10000, -20000, 30000],
      ],
      [0, 1, 2, 3, 4],
      [5, 6]
    );
    const result = parsed(input);
    expect(result.plane1.vertices).toHaveLength(5);
    expect(pointSpatialDefinitionLatex(result)).toHaveLength(10);
    assertScene(result);
    const outline = pointSpatialScene(result, {}).data.find(
      t => t.name === "Π" && t.type === "scatter3d"
    ) as Trace;
    expect(outline.x).toHaveLength(6);
  });
  it("preserves exact decimal direction and Gram coefficients", () => {
    const result = parsed(
      linePlane([
        ["0.1", "0.2", "0.1"],
        ["0.2", "0.2", "0.1"],
        ["0.1", "0.4", "0.1"],
        ["0.4", "0.2", "0.4"],
      ])
    );
    if (result.construction.kind !== "gram")
      throw new Error("Wrong construction");
    expect(result.construction.d).toEqual([rat(3, 10), rat(0), rat(3, 10)]);
    expect(result.construction.alpha).toEqual(rat(3));
    expect(result.construction.beta).toEqual(rat(0));
    expect(result.construction.q).toEqual([rat(3, 10), rat(0), rat(0)]);
    expect(result.angle.angleLatex).toBe("\\frac{\\pi}{4}");
    assertScene(result);
  });
  it.each([
    [
      linePlane([
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, -2],
      ]),
      "\\frac{\\pi}{2}",
    ],
    [
      linePlane([
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [2, 1, 0],
      ]),
      "0",
    ],
    [
      linePlane([
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
      ]),
      "0",
    ], // direction parallel to b
    [
      linePlane(
        [
          [0, 0, 3],
          [1, 0, 3],
          [0, 1, 3],
          [1, 2, 5],
          [2, 2, 5],
        ],
        [0, 1, 2],
        [3, 4]
      ),
      "0",
    ],
  ] as [PointSpatialInput, string][])(
    "guards zero projection and zero residual without undefined division",
    (input, answer) => {
      const result = parsed(input);
      expect(result.angle.angleLatex).toBe(answer);
      assertScene(result);
      if (answer === "\\frac{\\pi}{2}") {
        expect(pointSpatialSteps(result, "en")[4].latex).not.toContain(
          "\\frac{|0|}"
        );
        expect(
          pointSpatialScene(result, {}).data.some(
            t => t.name === "In-plane reference (q=0)"
          )
        ).toBe(true);
      }
    }
  );
});

describe("invariance of exact point-based geometry", () => {
  it.each([sharedFour(), gramFour(), disjointInclined()])(
    "is invariant to translation, uniform negative scaling, relabeling and vertex order",
    input => {
      const base = parsed(input);
      const transformed: PointSpatialInput = {
        ...input,
        points: input.points.map((p, i) => ({
          id: p.id,
          label: `X${String.fromCharCode(65 + i)}`,
          coordinates: p.coordinates.map(
            (x, j) => -2 * Number(x) + [5, -7, 11][j]
          ) as SpatialVec3,
        })),
        plane1: [...input.plane1].reverse(),
        ...(input.plane2 ? { plane2: [...input.plane2].reverse() } : {}),
        ...(input.line
          ? { line: [...input.line].reverse() as [string, string] }
          : {}),
      };
      const other = parsed(transformed);
      expect(other.angle.angleLatex).toBe(base.angle.angleLatex);
      expect(other.cosineSquared).toEqual(base.cosineSquared);
      assertScene(other);
    }
  );
  it("independent nonuniform in-plane basis choices preserve a line-plane angle", () => {
    const input = linePlane([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 2, 3],
      [4, 3, 0],
      [-2, 1, 0],
    ]);
    const base = parsed(input);
    const other = parsed({ ...input, plane1: selected([0, 4, 5]) });
    expect(other.angle.angleLatex).toBe(base.angle.angleLatex);
    expect(other.cosineSquared).toEqual(base.cosineSquared);
    if (base.construction.kind === "gram" && other.construction.kind === "gram")
      expect(other.construction.q).toEqual(base.construction.q);
  });
  it("captures an input snapshot rather than depending on later UI mutations", () => {
    const input = sharedFour();
    const result = computePointSpatialAngle(input);
    input.points[0].label = "Changed";
    input.points[0].coordinates[0] = 999;
    input.plane1.reverse();
    expect(result.input.points[0].label).toBe("A");
    expect(result.input.points[0].coordinates[0]).toBe(0);
    expect(result.input.plane1).toEqual(selected([0, 1, 2]));
  });
});

describe("safe labels and vector-only bilingual display", () => {
  it("accepts lowercase Greek point names without leaking raw TeX or renaming points", () => {
    const input = sharedFour();
    input.points = points(
      input.points.map(p => p.coordinates),
      ["α", "β", "γ", "δ"]
    );
    const result = parsed(input);
    const definitions = pointSpatialDefinitionLatex(result);
    expect(definitions[0]).toContain("\\alpha");
    expect(definitions[1]).toContain("\\beta");
    expect(definitions.at(-2)).toContain("\\operatorname{plane}");
    assertScene(result);
  });
  it("renders all standard lowercase Greek letters, variant Greek and multi-letter names safely", () => {
    const labels = Array.from("αβγδεζηθικλμνξοπρσςτυφχψω");
    const input = linePlane([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 0, 1],
      ...Array.from(
        { length: 21 },
        (_, i) => [i + 2, i + 3, i + 4] as SpatialVec3
      ),
    ]);
    input.points.forEach((p, i) => (p.label = labels[i]));
    parsed(input);
    input.points[0].label = "Aϑ";
    input.points[1].label = "ϕϱ";
    input.points[2].label = "ϵϰ";
    parsed(input);
  });
  it("definitions only enumerate point coordinates, plane vertices and line endpoints", () => {
    const result = parsed(gramFour());
    const definitions = pointSpatialDefinitionLatex(result);
    expect(definitions).toHaveLength(6);
    expect(definitions.at(-2)).toMatch(/\\Pi:.*\\operatorname\{plane\}/);
    expect(definitions.at(-1)).toMatch(/\\ell:.*\\operatorname\{line\}/);
    const main = pointSpatialSteps(result, "en")
      .map(s => s.latex)
      .join(" ");
    expect(main).not.toMatch(/\\mathbf r|[xyz]\s*=|k_|\\mathbf n|\\sin\\theta/);
  });
});

describe("exact validation of selected and unselected points", () => {
  it.each([0, 3, 27])("requires 4 to 26 given points (count %i)", count => {
    const input = sharedFour();
    input.points = points(
      Array.from({ length: count }, (_, i) => [i, i * i, i * i * i])
    );
    errorCode(input, "point-count");
  });
  it("accepts exactly 26 distinct given points", () => {
    const input = gramFour();
    input.points.push(
      ...Array.from({ length: 22 }, (_, i) => ({
        id: `extra-${i}`,
        label: String.fromCharCode(69 + i),
        coordinates: [i + 2, i + 3, i + 4] as SpatialVec3,
      }))
    );
    assertScene(parsed(input));
  });
  it.each([
    "",
    "A",
    "A_1",
    "A1",
    "\\alpha",
    "A}{\\href{bad}",
    "點",
    "Α",
    "a b",
    "A<",
    "A".repeat(33),
  ])("rejects empty, duplicate or unsafe labels %s", label => {
    const input = sharedFour();
    input.points[1].label = label;
    errorCode(input, "label");
  });
  it.each(["", "point-0"])("rejects empty or duplicate identifiers %s", id => {
    const input = sharedFour();
    input.points[1].id = id;
    errorCode(input, "id");
  });
  it.each([
    NaN,
    Infinity,
    "",
    "1/2",
    "0x10",
    "1e-13",
    1000001,
    "1.1234567890123456789012345",
  ])("rejects invalid decimal %s even on an unselected extra", value => {
    const input = sharedFour();
    input.points.push({ id: "extra", label: "E", coordinates: [value, 9, 10] });
    errorCode(input, "coordinate");
  });
  it("rejects repeated geometric coordinates using exact rational equality", () => {
    const input = sharedFour();
    input.points.push({
      id: "extra",
      label: "E",
      coordinates: ["0.000", "0e1", "-0"],
    });
    errorCode(input, "repeated-point");
  });
  it("rejects missing coordinate components", () => {
    const input = sharedFour();
    input.points[0].coordinates = [0, 0] as unknown as SpatialVec3;
    errorCode(input, "coordinate");
  });
  it.each([[], selected([0, 1]), selected([0, 1, 1]), undefined] as (
    | string[]
    | undefined
  )[])("requires distinct plane vertices %s", selection => {
    const input = sharedFour();
    input.plane1 = selection as string[];
    errorCode(input, "plane-count");
  });
  it.each(["plane", "line"])("rejects invalid %s references", kind => {
    const input = kind === "plane" ? sharedFour() : gramFour();
    if (kind === "plane") input.plane2![2] = "missing";
    else input.line![1] = "missing";
    errorCode(input, "reference");
  });
  it.each([undefined, selected([0, 0]), selected([0]), selected([0, 1, 2])] as (
    | string[]
    | undefined
  )[])("requires two distinct line endpoints %s", line => {
    const input = gramFour();
    input.line = line as [string, string];
    errorCode(input, "line");
  });
  it("rejects fully collinear selections, but not a collinear initial triple when a later vertex is independent", () => {
    errorCode(
      planes([
        [0, 0, 0],
        [1, 1, 1],
        [2, 2, 2],
        [0, 0, 1],
      ]),
      "collinear"
    );
    parsed(
      planes(
        [
          [0, 0, 0],
          [1, 0, 0],
          [2, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        [0, 1, 2, 3],
        [0, 1, 4]
      )
    );
  });
  it.each(["plane-plane", "line-plane"] as const)(
    "rejects additional selected vertices that are not exactly coplanar in %s",
    mode => {
      const input = mode === "plane-plane" ? sharedFour() : gramFour();
      input.points.push({
        id: "extra",
        label: "E",
        coordinates: ["0.1", "0.2", "0.000000000001"],
      });
      input.plane1.push("extra");
      errorCode(input, "noncoplanar");
    }
  );
  it("checks coplanarity of additional vertices of the second plane as well", () => {
    const input = sharedFour();
    input.plane2!.push("point-2");
    errorCode(input, "noncoplanar");
  });
  it("accepts tiny but exactly nonzero plane area without tolerance-based collinearity", () => {
    const result = parsed(
      planes([
        [0, 0, 0],
        [1, 0, 0],
        ["0.1", "0.000000000001", 0],
        [0, 0, 1],
      ])
    );
    expect(result.angle.angleLatex).toBe("\\frac{\\pi}{2}");
    assertScene(result);
  });
  it("has a safe bilingual fallback for unrelated errors", () => {
    expect(pointSpatialErrorMessage(new Error("private"), "en")).not.toContain(
      "private"
    );
    expect(pointSpatialErrorMessage(new Error("private"), "zh")).toMatch(
      /[\u3400-\u9fff]/u
    );
  });
});

describe("extreme valid exact inputs remain renderable", () => {
  it.each([
    planes([
      ["0.000000000001", 0, 0],
      ["0.000000000002", 0, 0],
      ["0.000000000001", "0.000000000001", 0],
      ["0.000000000001", 0, "0.000000000001"],
    ]),
    linePlane([
      [1000000, 1000000, 1000000],
      [-1000000, 1000000, 1000000],
      [1000000, -1000000, 1000000],
      [-1000000, -1000000, -1000000],
    ]),
    planes(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 1],
        [0, 1, "1.000000000001"],
      ],
      [0, 1, 2],
      [3, 4, 5]
    ),
  ])(
    "keeps finite traces and stable bounds without undefined division",
    input => {
      const result = parsed(input);
      assertScene(result);
      assertScene(result, true);
    }
  );
});
