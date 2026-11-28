import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { describe, expect, it, vi } from "vitest";
import CramerDiagram, {
  CRAMER_PRESETS,
  CRAMER_STEP_COUNT,
  createCramerModel,
  cramerDeterminant,
  cramerFraction,
  cramerFractionLatex,
  cramerLessonSteps,
  cramerParallelogram,
  cramerViewport,
  getCramerFrame,
  replaceCramerColumn,
  type CramerMatrix,
  type CramerVector,
} from "./CramerDiagram";

// Isolate the geometry engine from the parent's RAF/browser player.
vi.mock("./AnimatedKnowledgeLesson", () => ({
  default: ({
    children,
    controls,
  }: {
    children: (frame: {
      stage: number;
      progress: number;
      playing: boolean;
    }) => ReactNode;
    controls: ReactNode;
  }) =>
    createElement(
      "section",
      null,
      controls,
      children({ stage: 4, progress: 1, playing: false })
    ),
}));

const example = () =>
  createCramerModel(CRAMER_PRESETS[0].matrix, CRAMER_PRESETS[0].b);
const frame = (stage: number, progress: number) => ({ stage, progress });
const signedArea = (vertices: readonly CramerVector[]) =>
  vertices.reduce((sum, p, i) => {
    const q = vertices[(i + 1) % vertices.length];
    return sum + p[0] * q[1] - p[1] * q[0];
  }, 0) / 2;

function numbersIn(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(numbersIn);
  return [];
}

describe("Cramer exact model", () => {
  it("matches the card's determinants and exact solution", () => {
    const model = example();
    expect(model.columns).toEqual([
      [2, 1],
      [1, 3],
    ]);
    expect(model.determinant).toBe(5);
    expect(model.replacementDeterminants).toEqual([5, 15]);
    expect(model.solution).toEqual([
      { numerator: 1, denominator: 1 },
      { numerator: 3, denominator: 1 },
    ]);
    expect(model.solutionType).toBe("unique");
  });

  it("replaces columns rather than rows and does not mutate inputs", () => {
    const matrix: CramerMatrix = [
      [2, 1],
      [1, 3],
    ];
    const b: CramerVector = [5, 10];
    expect(replaceCramerColumn(matrix, b, 0)).toEqual([
      [5, 1],
      [10, 3],
    ]);
    expect(replaceCramerColumn(matrix, b, 1)).toEqual([
      [2, 5],
      [1, 10],
    ]);
    expect(matrix).toEqual([
      [2, 1],
      [1, 3],
    ]);
    expect(b).toEqual([5, 10]);
    expect(() => replaceCramerColumn(matrix, b, 2 as 0)).toThrow(RangeError);
  });

  it("preserves signs under a negative determinant", () => {
    const preset = CRAMER_PRESETS[1];
    const model = createCramerModel(preset.matrix, preset.b);
    expect(model.determinant).toBe(-5);
    expect(model.replacementDeterminants).toEqual([-15, -5]);
    expect(model.solution).toEqual([
      { numerator: 3, denominator: 1 },
      { numerator: 1, denominator: 1 },
    ]);
    expect(
      cramerDeterminant([
        [1, 0],
        [0, -2],
      ])
    ).toBe(-2);
  });

  it("retains reduced exact rational answers, including negative numerators", () => {
    const preset = CRAMER_PRESETS[2];
    const model = createCramerModel(preset.matrix, preset.b);
    expect(model.solution).toEqual([
      { numerator: 3, denominator: 5 },
      { numerator: -1, denominator: 5 },
    ]);
    expect(cramerFraction(4, -6)).toEqual({ numerator: -2, denominator: 3 });
    expect(cramerFraction(-4, -6)).toEqual({ numerator: 2, denominator: 3 });
    expect(cramerFraction(0, -7)).toEqual({ numerator: 0, denominator: 1 });
    expect(cramerFractionLatex({ numerator: -2, denominator: 3 })).toBe(
      String.raw`-\frac{2}{3}`
    );
  });

  it("rejects zero or nonintegral denominators and unsafe fractions", () => {
    expect(() => cramerFraction(1, 0)).toThrow(RangeError);
    expect(() => cramerFraction(1, 0.5)).toThrow(RangeError);
    expect(() => cramerFraction(Infinity, 2)).toThrow(RangeError);
    expect(() => cramerFraction(Number.MAX_SAFE_INTEGER + 1, 2)).toThrow(
      RangeError
    );
  });

  it("guards consistent singular systems instead of emitting 0/0 solutions", () => {
    const preset = CRAMER_PRESETS[3];
    const model = createCramerModel(preset.matrix, preset.b);
    expect(model.determinant).toBe(0);
    expect(model.replacementDeterminants).toEqual([0, 0]);
    expect(model.solution).toBeNull();
    expect(model.solutionType).toBe("infinite");
    expect(getCramerFrame(model, frame(4, 1)).reconstruction).toBe(0);
  });

  it("distinguishes inconsistent singular systems", () => {
    const preset = CRAMER_PRESETS[4];
    const model = createCramerModel(preset.matrix, preset.b);
    expect(model.determinant).toBe(0);
    expect(model.replacementDeterminants).toEqual([-30, 15]);
    expect(model.solution).toBeNull();
    expect(model.solutionType).toBe("none");
  });

  it("handles the zero-matrix rank-zero degeneracy", () => {
    expect(
      createCramerModel(
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0]
      ).solutionType
    ).toBe("infinite");
    const inconsistent = createCramerModel(
      [
        [0, 0],
        [0, 0],
      ],
      [1, 0]
    );
    expect(inconsistent.replacementDeterminants).toEqual([0, 0]);
    expect(inconsistent.solutionType).toBe("none");
    expect(inconsistent.solution).toBeNull();
  });

  it("handles a zero right-hand side with a unique zero solution", () => {
    const model = createCramerModel(
      [
        [2, 1],
        [1, 3],
      ],
      [0, 0]
    );
    expect(model.solution).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 0, denominator: 1 },
    ]);
    expect(getCramerFrame(model, frame(4, 1)).sum).toEqual([0, 0]);
  });

  it("rejects nonfinite, nonintegral, and out-of-bounds entries", () => {
    for (const value of [NaN, Infinity, -Infinity, 0.5, 13, -13]) {
      expect(() =>
        createCramerModel(
          [
            [value, 1],
            [1, 3],
          ],
          [5, 10]
        )
      ).toThrow(RangeError);
      expect(() =>
        createCramerModel(
          [
            [2, 1],
            [1, 3],
          ],
          [5, value]
        )
      ).toThrow(RangeError);
    }
    expect(
      createCramerModel(
        [
          [12, -12],
          [-12, -12],
        ],
        [12, -12]
      ).determinant
    ).toBe(-288);
  });

  it("verifies Ax=b exactly using integer numerator identities for every nonsingular preset", () => {
    for (const preset of CRAMER_PRESETS) {
      const model = createCramerModel(preset.matrix, preset.b);
      if (!model.solution) continue;
      const [d1, d2] = model.replacementDeterminants;
      for (let row = 0; row < 2; row++) {
        expect(model.matrix[row][0] * d1 + model.matrix[row][1] * d2).toBe(
          model.b[row] * model.determinant
        );
      }
    }
  });
});

describe("Cramer synchronized geometry", () => {
  it("builds oriented parallelograms with signed areas matching all target determinants", () => {
    for (const preset of CRAMER_PRESETS) {
      const model = createCramerModel(preset.matrix, preset.b);
      const final = getCramerFrame(model, frame(4, 1));
      expect(signedArea(cramerParallelogram(...final.baseColumns))).toBe(
        model.determinant
      );
      expect(signedArea(cramerParallelogram(...final.replacement1))).toBe(
        model.replacementDeterminants[0]
      );
      expect(signedArea(cramerParallelogram(...final.replacement2))).toBe(
        model.replacementDeterminants[1]
      );
    }
  });

  it("animates the initial columns and area reveal without changing the target equations", () => {
    const model = example();
    expect(getCramerFrame(model, frame(0, 0)).baseColumns).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(getCramerFrame(model, frame(0, 0.5)).baseColumns).toEqual([
      [1, 0.5],
      [0.5, 1.5],
    ]);
    expect(getCramerFrame(model, frame(1, 0)).fills[0]).toBe(0);
    expect(getCramerFrame(model, frame(1, 1)).fills[0]).toBe(1);
    expect(model.determinant).toBe(5);
  });

  it("replaces only column one during its stage and holds column two fixed", () => {
    const model = example();
    expect(getCramerFrame(model, frame(2, 0)).replacement1).toEqual(
      model.columns
    );
    expect(getCramerFrame(model, frame(2, 0.5)).replacement1).toEqual([
      [3.5, 5.5],
      [1, 3],
    ]);
    expect(getCramerFrame(model, frame(2, 1)).replacement1).toEqual([
      [5, 10],
      [1, 3],
    ]);
    expect(getCramerFrame(model, frame(2, 1)).replacement2).toEqual(
      model.columns
    );
  });

  it("replaces column two from the original matrix and reconstructs b at the end", () => {
    const model = example();
    expect(getCramerFrame(model, frame(3, 0.5)).replacement2).toEqual([
      [2, 1],
      [3, 6.5],
    ]);
    const final = getCramerFrame(model, frame(4, 1));
    expect(final.replacement2).toEqual([
      [2, 1],
      [5, 10],
    ]);
    expect(final.firstTerm).toEqual([2, 1]);
    expect(final.sum).toEqual(model.b);
    expect(final.reconstruction).toBe(1);
    expect(getCramerFrame(model, frame(4, 0.5)).sum).toEqual([2.5, 5]);
  });

  it("has continuous endpoint geometry at every adjacent stage", () => {
    const model = example();
    for (let stage = 0; stage < CRAMER_STEP_COUNT - 1; stage++) {
      const {
        stage: _a,
        progress: _b,
        ...end
      } = getCramerFrame(model, frame(stage, 1));
      const {
        stage: _c,
        progress: _d,
        ...start
      } = getCramerFrame(model, frame(stage + 1, 0));
      expect(end).toEqual(start);
    }
  });

  it("keeps all frames finite and clamps malformed progress/stage values", () => {
    for (const preset of CRAMER_PRESETS) {
      const model = createCramerModel(preset.matrix, preset.b);
      for (const stage of [-2, 0, 1, 2, 3, 4, 8, NaN, Infinity]) {
        for (const progress of [-1, 0, 0.25, 0.5, 1, 2, NaN, Infinity]) {
          const current = getCramerFrame(model, frame(stage, progress));
          expect(numbersIn(current).every(Number.isFinite)).toBe(true);
          expect(current.stage).toBeGreaterThanOrEqual(0);
          expect(current.stage).toBeLessThanOrEqual(4);
          expect(current.progress).toBeGreaterThanOrEqual(0);
          expect(current.progress).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("uses finite common equal-axis scaling, including all-zero and signed examples", () => {
    const models = [
      ...CRAMER_PRESETS.map(preset =>
        createCramerModel(preset.matrix, preset.b)
      ),
      createCramerModel(
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0]
      ),
    ];
    for (const model of models) {
      const view = cramerViewport(model);
      expect(numbersIn(view).every(Number.isFinite)).toBe(true);
      expect(view.unit).toBeGreaterThan(0);
      const final = getCramerFrame(model, frame(4, 1));
      const points = [
        ...cramerParallelogram(...final.baseColumns),
        ...cramerParallelogram(...final.replacement1),
        ...cramerParallelogram(...final.replacement2),
        final.firstTerm,
        final.sum,
      ];
      for (const p of points) {
        const x = view.origin[0] + p[0] * view.unit;
        const y = view.origin[1] - p[1] * view.unit;
        expect(x).toBeGreaterThanOrEqual(40 - 1e-8);
        expect(x).toBeLessThanOrEqual(260 + 1e-8);
        expect(y).toBeGreaterThanOrEqual(45 - 1e-8);
        expect(y).toBeLessThanOrEqual(215 + 1e-8);
      }
    }
  });
});

describe("Cramer lesson and accessible output", () => {
  it("renders every step in both languages with valid KaTeX", () => {
    for (const preset of CRAMER_PRESETS) {
      const model = createCramerModel(preset.matrix, preset.b);
      for (const lang of ["zh", "en"] as const) {
        const steps = cramerLessonSteps(model, lang);
        expect(steps).toHaveLength(CRAMER_STEP_COUNT);
        for (const step of steps) {
          expect(step.description).toBeTruthy();
          expect(() =>
            katex.renderToString(step.latex!, {
              throwOnError: true,
              strict: "error",
            })
          ).not.toThrow();
          expect(step.latex).not.toMatch(/[\u3400-\u9fff]/u);
          if (lang === "en")
            expect(step.description).not.toMatch(/[\u3400-\u9fff]/u);
        }
      }
    }
  });

  it("uses exact fractions rather than rounded decimals in final formulas", () => {
    const preset = CRAMER_PRESETS[2];
    const steps = cramerLessonSteps(
      createCramerModel(preset.matrix, preset.b),
      "en"
    );
    expect(steps[4].latex).toContain(String.raw`\frac{3}{5}`);
    expect(steps[4].latex).toContain(String.raw`-\frac{1}{5}`);
    expect(steps[4].latex).not.toContain("0.6");
    expect(steps[4].latex).not.toContain("-0.2");
    for (const preset of CRAMER_PRESETS.slice(3)) {
      const final = cramerLessonSteps(
        createCramerModel(preset.matrix, preset.b),
        "en"
      )[4].latex!;
      expect(final).toContain("not applicable");
      expect(final).not.toContain(String.raw`\frac`);
    }
  });

  it("provides three responsive labelled SVGs, presets, and no CJK in the English markup", () => {
    const english = renderToStaticMarkup(
      createElement(CramerDiagram, { lang: "en", variant: "ls-cramer" })
    );
    const chinese = renderToStaticMarkup(
      createElement(CramerDiagram, { lang: "zh" })
    );
    expect((english.match(/role="img"/g) ?? []).length).toBe(3);
    expect((english.match(/viewBox="0 0 300 260"/g) ?? []).length).toBe(3);
    expect(english).toContain("grid-cols-1");
    expect(english).toContain("md:grid-cols-3");
    expect(english).toContain("aria-labelledby=");
    expect((english.match(/<option/g) ?? []).length).toBe(
      CRAMER_PRESETS.length
    );
    expect(english).toContain("Numerical demo");
    expect(english).not.toMatch(/[\u3400-\u9fff]/u);
    expect(chinese).toContain("數值示範");
    expect(english).not.toMatch(/NaN|Infinity|<img/);
  });

  it("uses unique accessible titles and arrow markers across simultaneous instances", () => {
    const html = renderToStaticMarkup(
      createElement(
        "main",
        null,
        createElement(CramerDiagram, { lang: "en" }),
        createElement(CramerDiagram, { lang: "en" })
      )
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const match of html.matchAll(/url\(#([^)]*)\)/g))
      expect(ids).toContain(match[1]);
  });
});
