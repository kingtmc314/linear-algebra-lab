import { describe, expect, it } from "vitest";
import katex from "katex";
import { add, sub, mul, div, neg, rat, toNumber } from "./rational";
import {
  computePointSpatialAngle,
  type PointSpatialInput,
  type PointSpatialResult,
} from "./pointSpatialAngles";
import {
  spatialCross,
  spatialDot,
  spatialRational,
  type ExactVec3,
  type NumericVec3,
  type SpatialVec3,
  type SpatialScene,
} from "./spatialAngles";
import { dataBounds3D } from "./plot3dControls";
import {
  computePlaneNormalConcept,
  planeNormalSteps,
  planeNormalScene,
  type PlaneNormalOptions,
  type PlaneNormalConceptResult,
} from "./planeNormalConcept";

function planes(
  coordinates: SpatialVec3[],
  first = [0, 1, 2],
  second = [0, 1, 3],
  labels?: string[]
): PointSpatialInput {
  return {
    mode: "plane-plane",
    points: coordinates.map((coordinates, i) => ({
      id: `p${i}`,
      label: labels?.[i] ?? String.fromCharCode(65 + i),
      coordinates,
    })),
    plane1: first.map(i => `p${i}`),
    plane2: second.map(i => `p${i}`),
  };
}
const shared = () =>
  planes([
    [0, 0, 0],
    [2, 0, 0],
    [1, 2, 0],
    [3, 2, 2],
  ]);
const inclined = () =>
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
const parallelInputs = [
  planes([
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, -2, 0],
  ]),
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
  planes(
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
      [2, -1, 0],
      [3, -1, -1],
      [2, 0, -1],
    ],
    [0, 1, 2],
    [3, 4, 5]
  ),
];
const v = (x: SpatialVec3) => x.map(spatialRational) as ExactVec3;
const numerical = (x: ExactVec3) => x.map(toNumber) as NumericVec3;
const minus = (a: ExactVec3, b: ExactVec3) =>
  a.map((x, i) => sub(x, b[i])) as ExactVec3;
const scale = (a: ExactVec3, k: number) =>
  a.map(x => mul(x, rat(k))) as ExactVec3;
const ndot = (a: NumericVec3, b: NumericVec3) =>
  a.reduce((s, x, i) => s + x * b[i], 0);
const length = (a: NumericVec3) => Math.hypot(...a);
const nminus = (a: NumericVec3, b: NumericVec3) =>
  a.map((x, i) => x - b[i]) as NumericVec3;
const nscale = (a: NumericVec3, k: number) => a.map(x => x * k) as NumericVec3;
const nunit = (a: NumericVec3) => nscale(a, 1 / length(a));
type Trace = {
  name?: string;
  type?: string;
  mode?: string;
  text?: string[];
  opacity?: number;
  hoverinfo?: string;
  showlegend?: boolean;
  line?: { dash?: string };
  x?: number[];
  y?: number[];
  z?: number[];
};
const scene = (
  result: PlaneNormalConceptResult,
  stepIndex = 5,
  rotationDegrees = 90
) => planeNormalScene(result, { lang: "en", stepIndex, rotationDegrees });
const find = (s: SpatialScene, name: string) => {
  const trace = s.data.find(t => t.name === name) as Trace;
  expect(trace, name).toBeDefined();
  return trace;
};
const pointAt = (t: Trace, i: number): NumericVec3 => [
  t.x![i],
  t.y![i],
  t.z![i],
];
const ray = (s: SpatialScene, name: string) => {
  const t = find(s, name);
  return nminus(pointAt(t, 1), pointAt(t, 0));
};
function identities(result: PlaneNormalConceptResult) {
  const { n1, n2, turnAxis: h, sectionU: u, sectionV: w } = result;
  const hh = spatialDot(h, h);
  expect(hh.n).toBeGreaterThan(0n);
  for (const [a, b] of [
    [h, n1],
    [h, n2],
    [u, n1],
    [w, n2],
    [u, h],
    [w, h],
  ] as [ExactVec3, ExactVec3][])
    expect(spatialDot(a, b)).toEqual(rat(0));
  expect(u).toEqual(spatialCross(h, n1));
  expect(w).toEqual(spatialCross(h, n2));
  expect(spatialDot(u, w)).toEqual(mul(hh, result.dot));
  expect(spatialDot(u, u)).toEqual(mul(hh, result.norm1Squared));
  expect(spatialDot(w, w)).toEqual(mul(hh, result.norm2Squared));
  if (result.intersection) {
    expect(result.intersection.direction).toEqual(h);
    for (const p of [result.source.plane1, result.source.plane2!])
      expect(
        spatialDot(
          p.normal,
          minus(result.intersection.point, p.triple[0].exact)
        )
      ).toEqual(rat(0));
  } else expect(result.parallel).toBe(true);
}
function parses(result: PlaneNormalConceptResult) {
  for (const lang of ["en", "zh"] as const) {
    const steps = planeNormalSteps(result, lang);
    expect(steps).toHaveLength(6);
    for (const step of steps) {
      expect(step.description.length).toBeGreaterThan(40);
      expect(step.latex).not.toMatch(/\\mathbf\s*r\s*=|k_[12]|[xyz]\s*=/);
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
    }
  }
  for (const value of [
    result.signedCosineLatex,
    result.rawAngleLatex,
    result.smallerAngleLatex,
    result.openingAngleLatex,
  ])
    expect(() =>
      katex.renderToString(value, { throwOnError: true, strict: "ignore" })
    ).not.toThrow();
}
function finiteActualScene(
  result: PlaneNormalConceptResult,
  stepIndex = 5,
  rotationDegrees = 90
) {
  const s = scene(result, stepIndex, rotationDegrees);
  const given = find(s, "Given points");
  expect(given.text).toEqual(result.source.points.map(p => p.label));
  for (const [i, axis] of ["x", "y", "z"].entries())
    expect(given[axis as "x" | "y" | "z"]).toEqual(
      result.source.points.map(p => toNumber(p.exact[i]))
    );
  for (const [i, plane] of [
    result.source.plane1,
    result.source.plane2!,
  ].entries()) {
    const outline = s.data.find(
      t => t.name === ["Π₁", "Π₂"][i] && t.type === "scatter3d"
    ) as Trace;
    expect(outline).toBeDefined();
    expect(outline.x).toHaveLength(plane.vertices.length + 1);
    for (const p of plane.vertices)
      expect(outline.x!.map((_, j) => pointAt(outline, j))).toContainEqual(
        numerical(p.exact)
      );
    const normal = numerical(plane.normal);
    const mesh = s.data.find(
      t => t.name === ["Π₁", "Π₂"][i] && t.type === "mesh3d"
    ) as Trace;
    mesh.x!.forEach((_, j) =>
      expect(
        ndot(normal, nminus(pointAt(mesh, j), numerical(plane.triple[0].exact)))
      ).toBeCloseTo(0, 7)
    );
  }
  for (const trace of s.data as Trace[]) {
    expect(trace.name ?? "").not.toContain("\\");
    expect(trace.name ?? "").not.toMatch(/[\u3400-\u9fff]/u);
    for (const [i, axis] of ["x", "y", "z"].entries()) {
      const range = (
        (s.layout.scene as Record<string, unknown>)[`${axis}axis`] as {
          range: number[];
        }
      ).range;
      trace[axis as "x" | "y" | "z"]?.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(range[0]);
        expect(value).toBeLessThanOrEqual(range[1]);
      });
    }
  }
  expect(s.note).not.toMatch(/[\u3400-\u9fff]/u);
  expect(s.note).toContain("NOT exact vector magnitudes");
  return s;
}
const combos: PlaneNormalOptions[] = [false, true].flatMap(flipFirst =>
  [false, true].flatMap(flipSecond =>
    [false, true].map(supplementary => ({
      flipFirst,
      flipSecond,
      supplementary,
    }))
  )
);

describe("exact live normal-vector concept", () => {
  it("retains the live result, exact cross/dot substitutions and canonical 45°/135° outputs", () => {
    const source = computePointSpatialAngle(shared()),
      result = computePlaneNormalConcept(source);
    expect(result.source).toBe(source);
    expect(result.n1).toEqual(source.plane1.normal);
    expect(result.n2).toEqual(source.plane2!.normal);
    expect(result.n1).toEqual(v([0, 0, 4]));
    expect(result.n2).toEqual(v([0, -4, 4]));
    expect(result.dot).toEqual(rat(16));
    expect(result.norm1Squared).toEqual(rat(16));
    expect(result.norm2Squared).toEqual(rat(32));
    expect(result.cosineSquared).toEqual(rat(1, 2));
    expect(result.signedCosineLatex).toBe("\\frac{\\sqrt{2}}{2}");
    expect(result.smallerAngleLatex).toBe("\\frac{\\pi}{4}");
    expect(
      computePlaneNormalConcept(source, { supplementary: true })
        .openingAngleLatex
    ).toBe("\\frac{3\\pi}{4}");
    expect(result.intersection!.point).toEqual(source.plane1.triple[0].exact);
    const steps = planeNormalSteps(result, "en");
    expect(steps[1].latex).toContain("\\times");
    expect(steps[3].latex).toContain("\\|\\mathbf h\\|^2");
    expect(steps[4].latex).toContain("\\left(4\\right)\\left(4\\right)");
    identities(result);
    parses(result);
  });
  it.each(combos)(
    "normal flips and selected opening are independent: %j",
    options => {
      const source = computePointSpatialAngle(shared()),
        base = computePlaneNormalConcept(source),
        result = computePlaneNormalConcept(source, options);
      expect(result.dot).toEqual(
        options.flipFirst !== options.flipSecond ? neg(base.dot) : base.dot
      );
      expect(result.n1).toEqual(scale(base.n1, options.flipFirst ? -1 : 1));
      expect(result.n2).toEqual(scale(base.n2, options.flipSecond ? -1 : 1));
      expect(result.turnAxis).toEqual(base.turnAxis);
      expect(result.intersection).toEqual(base.intersection);
      expect(result.cosineSquared).toEqual(base.cosineSquared);
      expect(result.smallerDegrees).toBe(45);
      expect(result.rawDegrees).toBe(
        options.flipFirst !== options.flipSecond ? 135 : 45
      );
      expect(result.openingDegrees).toBe(options.supplementary ? 135 : 45);
      expect(result.rawAngleLatex).toBe(
        options.flipFirst !== options.flipSecond
          ? source.angle.supplementaryLatex
          : source.angle.angleLatex
      );
      identities(result);
      parses(result);
      const actual = scene(result),
        sameOpening = scene(
          computePlaneNormalConcept(source, {
            supplementary: options.supplementary,
          })
        );
      expect(find(actual, "δ")).toEqual(find(sameOpening, "δ"));
      expect(find(actual, "θ")).toEqual(find(sameOpening, "θ"));
      expect(source.plane1.normal).toEqual(base.n1);
    }
  );
  it("snapshots options and never mutates source normals or point coordinates", () => {
    const options = { flipFirst: true, supplementary: true },
      source = computePointSpatialAngle(shared());
    const before = structuredClone(source),
      result = computePlaneNormalConcept(source, options);
    options.flipFirst = false;
    options.supplementary = false;
    result.n1[0].n = 123n;
    expect(result.options).toEqual({
      flipFirst: true,
      flipSecond: false,
      supplementary: true,
    });
    expect(source).toEqual(before);
  });
  it("rejects line-plane results and missing or zero plane normals explicitly", () => {
    const input = shared();
    input.mode = "line-plane";
    input.line = ["p0", "p3"];
    delete input.plane2;
    expect(() =>
      computePlaneNormalConcept(computePointSpatialAngle(input))
    ).toThrow(/plane-plane.*line-plane/);
    expect(() =>
      computePlaneNormalConcept(undefined as unknown as PointSpatialResult)
    ).toThrow(/plane-plane/);
    const source = computePointSpatialAngle(shared());
    expect(() =>
      computePlaneNormalConcept({ ...source, plane2: undefined })
    ).toThrow(/plane-plane/);
    expect(() =>
      computePlaneNormalConcept({
        ...source,
        plane1: { ...source.plane1, normal: v([0, 0, 0]) },
      })
    ).toThrow(/zero vector/);
  });
  it("does not round a near-special decimal ratio into the exact 45° special value", () => {
    const result = computePlaneNormalConcept(
      computePointSpatialAngle(
        planes([
          ["0.1", "0.2", "0.3"],
          ["0.3", "0.2", "0.3"],
          ["0.2", "0.4", "0.3"],
          ["0.4", "0.4", "0.5000000000002"],
        ])
      ),
      { flipSecond: true, supplementary: true }
    );
    expect(result.smallerAngleLatex).toContain("\\arccos");
    expect(result.smallerAngleLatex).not.toBe("\\frac{\\pi}{4}");
    expect(result.rawAngleLatex).toBe(result.source.angle.supplementaryLatex);
    expect(result.openingAngleLatex).toBe(result.rawAngleLatex);
    identities(result);
    parses(result);
    finiteActualScene(result);
  });
  it("solves disjoint inclined plane intersection by exact vector displacement", () => {
    const source = computePointSpatialAngle(inclined()),
      result = computePlaneNormalConcept(source);
    expect(result.parallel).toBe(false);
    expect(result.cosineSquared).toEqual(rat(2, 9));
    expect(result.smallerAngleLatex).toBe(
      "\\arccos\\left(\\frac{\\sqrt{2}}{3}\\right)"
    );
    const displacement = spatialCross(result.turnAxis, source.plane1.normal),
      anchor = source.plane1.triple[0].exact;
    const coefficient = div(
      spatialDot(
        source.plane2!.normal,
        minus(source.plane2!.triple[0].exact, anchor)
      ),
      spatialDot(source.plane2!.normal, displacement)
    );
    expect(result.intersection!.point).toEqual(
      anchor.map((x, i) => add(x, mul(displacement[i], coefficient)))
    );
    identities(result);
    parses(result);
    finiteActualScene(result);
  });
  it("retains exact angle under translation, uniform negative scale, Greek names and reversed triples", () => {
    const input = inclined(),
      source = computePointSpatialAngle(input),
      base = computePlaneNormalConcept(source);
    const changed = computePlaneNormalConcept(
      computePointSpatialAngle({
        ...input,
        points: input.points.map((p, i) => ({
          ...p,
          label: ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ"][i],
          coordinates: p.coordinates.map(
            (x, j) => -3 * Number(x) + [7, -11, 5][j]
          ) as SpatialVec3,
        })),
        plane1: [...input.plane1].reverse(),
        plane2: [...input.plane2!].reverse(),
      })
    );
    expect(changed.cosineSquared).toEqual(base.cosineSquared);
    expect(changed.smallerAngleLatex).toBe(base.smallerAngleLatex);
    expect(planeNormalSteps(changed, "en")[0].latex).toContain("\\alpha");
    identities(changed);
    parses(changed);
    finiteActualScene(changed);
  });
  it.each(["first", "second"])(
    "one reversed %s triple supplements raw φ, not θ or selected δ",
    plane => {
      const input = shared(),
        base = computePlaneNormalConcept(computePointSpatialAngle(input), {
          supplementary: true,
        });
      const reversed = computePlaneNormalConcept(
        computePointSpatialAngle({
          ...input,
          [plane === "first" ? "plane1" : "plane2"]: [
            ...(plane === "first" ? input.plane1 : input.plane2!),
          ].reverse(),
        }),
        { supplementary: true }
      );
      expect(reversed.rawDegrees).toBe(180 - base.rawDegrees);
      expect(reversed.smallerAngleLatex).toBe(base.smallerAngleLatex);
      expect(reversed.openingAngleLatex).toBe(base.openingAngleLatex);
      identities(reversed);
      parses(reversed);
    }
  );
  it("supports a later non-collinear triple and full coplanar vertex selection", () => {
    const source = computePointSpatialAngle(
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
    const result = computePlaneNormalConcept(source);
    expect(source.plane1.triple.map(p => p.label)).toEqual(["A", "B", "D"]);
    expect(result.smallerDegrees).toBe(90);
    identities(result);
    parses(result);
    finiteActualScene(result);
  });
});

describe("parallel/perpendicular and degenerate endpoints", () => {
  it.each(parallelInputs)(
    "parallel/coincident inputs have a nonzero fallback and no claimed intersection: %j",
    input => {
      const source = computePointSpatialAngle(input);
      for (const options of combos) {
        const result = computePlaneNormalConcept(source, options);
        expect(result.parallel).toBe(true);
        expect(result.intersection).toBeUndefined();
        expect(result.turnAxis).toEqual(source.plane1.a);
        expect(result.smallerAngleLatex).toBe("0");
        expect([0, 180]).toContain(result.rawDegrees);
        expect(result.openingDegrees).toBe(options.supplementary ? 180 : 0);
        identities(result);
        parses(result);
        const s = finiteActualScene(result);
        expect(s.data.some(t => /^Intersection/.test(t.name ?? ""))).toBe(
          false
        );
        expect(s.note).toContain("no unique intersection");
        expect(s.note).toContain("translated references");
      }
    }
  );
  it("perpendicular planes stay exact π/2 under every normal flip and opening choice", () => {
    const source = computePointSpatialAngle(
      planes([
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ])
    );
    for (const options of combos) {
      const result = computePlaneNormalConcept(source, options);
      expect(result.dot).toEqual(rat(0));
      expect(result.signedCosineLatex).toBe("0");
      expect(result.rawAngleLatex).toBe("\\frac{\\pi}{2}");
      expect(result.smallerAngleLatex).toBe(result.rawAngleLatex);
      expect(result.openingAngleLatex).toBe(result.rawAngleLatex);
      expect(result.rawDegrees).toBe(90);
      identities(result);
      parses(result);
      finiteActualScene(result);
    }
  });
  it.each([0, 90, 180])(
    "φ=%i arcs have finite correct ray endpoints, including zero and straight arcs",
    raw => {
      const source = computePointSpatialAngle(
        raw === 90
          ? planes([
              [0, 0, 0],
              [1, 0, 0],
              [0, 1, 0],
              [0, 0, 1],
            ])
          : parallelInputs[2]
      );
      const result = computePlaneNormalConcept(source, {
        flipSecond: raw === 180,
        supplementary: true,
      });
      expect(result.rawDegrees).toBe(raw);
      const s = finiteActualScene(result),
        arc = find(s, "φ");
      const center = pointAt(find(s, "n₁ (translated scaled direction)"), 0),
        start = ray(s, "n₁ (translated scaled direction)"),
        end = ray(s, "n₂ (translated scaled direction)");
      expect(
        ndot(nunit(nminus(pointAt(arc, 0), center)), nunit(start))
      ).toBeCloseTo(1, 12);
      expect(
        ndot(nunit(nminus(pointAt(arc, 48), center)), nunit(end))
      ).toBeCloseTo(1, 12);
      const selected = find(s, "δ"),
        selectedEnd = ray(s, "δ ray in Π₂ (selected sign, scaled direction)");
      expect(
        ndot(nunit(nminus(pointAt(selected, 48), center)), nunit(selectedEnd))
      ).toBeCloseTo(1, 12);
    }
  );
});

describe("paired rotation and stable staged real-vertex scenes", () => {
  it("reveals precisely six aligned stages while keeping both actual planes visible", () => {
    const result = computePlaneNormalConcept(
      computePointSpatialAngle(shared())
    );
    const stages = Array.from({ length: 6 }, (_, i) =>
      finiteActualScene(result, i)
    );
    expect(stages.map(s => s.layout.scene)).toEqual(
      Array(6).fill(stages[5].layout.scene)
    );
    const names = stages.map(s => s.data.map(t => t.name));
    expect(names[0]).not.toContain("n₁ (scaled direction)");
    expect(names[1]).toContain("n₁ (scaled direction)");
    expect(names[1]).not.toContain("n₂ (scaled direction)");
    expect(names[2]).toContain("n₂ (scaled direction)");
    expect(names[2]).not.toContain("r₁ (rotated direction)");
    expect(names[3]).toContain("r₁ (rotated direction)");
    expect(names[3]).toContain("90° (n₁, u)");
    expect(names[3]).not.toContain("φ");
    expect(names[4]).toContain("φ");
    expect(names[4]).toContain("θ");
    expect(names[4]).not.toContain("δ");
    expect(names[5]).toContain("δ");
  });
  it.each(combos)(
    "paired Rodrigues turn preserves signed φ and terminates in the planes: %j",
    options => {
      const result = computePlaneNormalConcept(
        computePointSpatialAngle(inclined()),
        options
      );
      const first = scene(result, 3, 0),
        last = scene(result, 3, 90);
      for (const angle of [0, 17, 33, 45, 61, 83, 90]) {
        const s = finiteActualScene(result, 3, angle),
          r1 = ray(s, "r₁ (rotated direction)"),
          r2 = ray(s, "r₂ (rotated direction)");
        expect(ndot(r1, r2) / length(r1) / length(r2)).toBeCloseTo(
          Math.cos(result.rawRadians),
          12
        );
        expect(find(s, "r₁ (rotated direction)").line?.dash).toBe("dash");
        expect(s.layout.scene).toEqual(first.layout.scene);
        expect(result.smallerAngleLatex).toBe(result.source.angle.angleLatex);
      }
      for (const [i, n] of [result.n1, result.n2].entries()) {
        const name = ["r₁ (rotated direction)", "r₂ (rotated direction)"][i];
        expect(ndot(nunit(ray(first, name)), nunit(numerical(n)))).toBeCloseTo(
          1,
          12
        );
        expect(ndot(nunit(ray(last, name)), nunit(numerical(n)))).toBeCloseTo(
          0,
          12
        );
        expect(
          ndot(
            nunit(ray(last, name)),
            nunit(numerical([result.sectionU, result.sectionV][i]))
          )
        ).toBeCloseTo(1, 12);
      }
      identities(result);
    }
  );
  it("right-angle marker sides are perpendicular to normal/section and axis/section", () => {
    const result = computePlaneNormalConcept(
        computePointSpatialAngle(inclined())
      ),
      s = scene(result, 3);
    for (const name of [
      "90° (n₁, u)",
      "90° (n₂, v)",
      "90° (h, u)",
      "90° (h, v)",
    ]) {
      const t = find(s, name),
        a = nminus(pointAt(t, 1), pointAt(t, 0)),
        b = nminus(pointAt(t, 2), pointAt(t, 1));
      expect(ndot(nunit(a), nunit(b))).toBeCloseTo(0, 12);
    }
  });
  it("selected arc endpoints and ray cosine agree with θ or π−θ for every flip", () => {
    const source = computePointSpatialAngle(inclined());
    for (const options of combos) {
      const result = computePlaneNormalConcept(source, options),
        s = scene(result),
        arc = find(s, "δ");
      const startTrace = find(s, "δ ray in Π₁ (scaled direction)"),
        center = pointAt(startTrace, 0);
      const start = ray(s, "δ ray in Π₁ (scaled direction)"),
        end = ray(s, "δ ray in Π₂ (selected sign, scaled direction)");
      expect(ndot(nunit(start), nunit(end))).toBeCloseTo(
        Math.cos(result.openingRadians),
        12
      );
      expect(
        ndot(nunit(nminus(pointAt(arc, 0), center)), nunit(start))
      ).toBeCloseTo(1, 12);
      expect(
        ndot(nunit(nminus(pointAt(arc, 48), center)), nunit(end))
      ).toBeCloseTo(1, 12);
      expect(
        ndot(nunit(start), nunit(numerical(source.plane1.normal)))
      ).toBeCloseTo(0, 12);
      expect(
        ndot(nunit(end), nunit(numerical(source.plane2!.normal)))
      ).toBeCloseTo(0, 12);
    }
  });
  it("invisible full bounds include continuous rotation extrema, flips, all stages and choices", () => {
    const source = computePointSpatialAngle(inclined()),
      base = scene(computePlaneNormalConcept(source), 0, 0);
    const bounds = dataBounds3D(base.data),
      cube = find(base, "Stable construction bounds (invisible)");
    expect(cube.opacity).toBe(0);
    expect(cube.hoverinfo).toBe("skip");
    expect(cube.showlegend).toBe(false);
    expect(cube.x).toHaveLength(8);
    for (const options of combos) {
      const result = computePlaneNormalConcept(source, options);
      for (let angle = 0; angle <= 90; angle += 3) {
        const s = scene(result, 5, angle);
        expect(s.layout.scene).toEqual(base.layout.scene);
        expect(dataBounds3D(s.data)).toEqual(bounds);
        for (const trace of s.data as Trace[])
          for (const axis of ["x", "y", "z"] as const)
            trace[axis]?.forEach(value => {
              expect(value).toBeGreaterThanOrEqual(bounds[axis][0]);
              expect(value).toBeLessThanOrEqual(bounds[axis][1]);
            });
      }
    }
  });
  it("clamps plotting-only stage and rotation input without affecting exact answers", () => {
    const result = computePlaneNormalConcept(
        computePointSpatialAngle(shared())
      ),
      before = structuredClone(result);
    expect(scene(result, -2, -90)).toEqual(scene(result, 0, 0));
    expect(scene(result, 99, 120)).toEqual(scene(result, 5, 90));
    expect(scene(result, NaN, NaN)).toEqual(scene(result, 5, 90));
    expect(result).toEqual(before);
  });
});

describe("exact regression extremes and safe labels", () => {
  it.each([
    planes([
      ["1e-12", 0, 0],
      ["2e-12", 0, 0],
      ["1e-12", "1e-12", 0],
      ["1e-12", 0, "1e-12"],
    ]),
    planes([
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
    planes([
      [0, 0, 0],
      [1, 0, 0],
      ["0.1", "1e-12", 0],
      [0, 0, 1],
    ]),
  ])(
    "tiny, huge, near-parallel and near-collinear valid inputs remain exact and finite: %j",
    input => {
      const source = computePointSpatialAngle(input);
      for (const options of [{}, { flipFirst: true, supplementary: true }]) {
        const result = computePlaneNormalConcept(source, options);
        identities(result);
        parses(result);
        for (const stage of [0, 3, 5])
          for (const rotation of [0, 37, 90])
            finiteActualScene(result, stage, rotation);
      }
    }
  );
  it("Greek variants and multi-letter given names survive all six KaTeX stages and plain hover", () => {
    const input = shared();
    input.points.forEach((p, i) => (p.label = ["Aϑ", "ϕϱ", "ϵϰ", "οϐϲ"][i]));
    const result = computePlaneNormalConcept(computePointSpatialAngle(input), {
      flipFirst: true,
      supplementary: true,
    });
    parses(result);
    finiteActualScene(result);
    const latex = planeNormalSteps(result, "en")[0].latex;
    expect(latex).toContain("\\vartheta");
    expect(latex).toContain("\\varphi");
    expect(latex).toContain("\\mathrm{o}");
    const zh = planeNormalScene(result, {
      lang: "zh",
      stepIndex: 5,
      rotationDegrees: 45,
    });
    expect(zh.note).toMatch(/[\u3400-\u9fff]/u);
    expect(zh.data.some(t => t.name?.includes("縮放方向"))).toBe(true);
  });
});

it("keeps long auxiliary names on hover without a viewport-shrinking Plotly legend", () => {
  const result = computePlaneNormalConcept(computePointSpatialAngle(shared()));
  for (const lang of ["zh", "en"] as const) {
    for (let stage = 0; stage < 6; stage++) {
      const scene = planeNormalScene(result, { lang, stepIndex: stage });
      expect(scene.layout.showlegend).toBe(false);
      expect(scene.data.some((trace: any) => trace.hoverinfo === "name")).toBe(
        true
      );
    }
  }
});
