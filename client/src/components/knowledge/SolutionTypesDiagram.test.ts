import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { KnowledgeFrame } from "./AnimatedKnowledgeLesson";

const playback = vi.hoisted(() => ({ stage: 4, progress: 1, playing: false }));
vi.mock("./AnimatedKnowledgeLesson", () => ({
  default: (props: {
    testId: string;
    title: string;
    controls?: ReactNode;
    children: (frame: KnowledgeFrame) => ReactNode;
  }) =>
    createElement(
      "section",
      { "data-testid": props.testId },
      props.title,
      props.controls,
      props.children(playback)
    ),
}));

import SolutionTypesDiagram, {
  SOLUTION_TYPES_PRESETS,
  SOLUTION_TYPES_STEP_COUNT,
  classifySolutionSystem,
  clipEquationLine,
  solutionTypesFinalLatex,
  solutionTypesFrame,
  solutionTypesSteps,
  type SolutionKind,
} from "./SolutionTypesDiagram";

const kinds: SolutionKind[] = ["unique", "infinite", "none"];
const box = { xMin: -3, xMax: 7, yMin: -1, yMax: 5 };

describe("exact solution-types model", () => {
  it("matches the unique card example and both original equations", () => {
    const rows = SOLUTION_TYPES_PRESETS.unique.rows;
    const result = classifySolutionSystem(rows);
    expect(result).toMatchObject({
      kind: "unique",
      rankA: 2,
      rankAugmented: 2,
      determinant: 5,
      point: [1, 3],
    });
    expect(result.exactPoint).toEqual([
      { numerator: 1, denominator: 1 },
      { numerator: 3, denominator: 1 },
    ]);
    for (const [a, b, c] of rows)
      expect(a * result.point![0] + b * result.point![1]).toBe(c);
  });

  it("uses a free parameter for the coincident-line card example", () => {
    const rows = SOLUTION_TYPES_PRESETS.infinite.rows;
    expect(classifySolutionSystem(rows)).toMatchObject({
      kind: "infinite",
      rankA: 1,
      rankAugmented: 1,
      point: null,
    });
    for (const t of [-10, -1, 0, 1, 2, 7]) {
      for (const [a, b, c] of rows) expect(a * t + b * (2 - t)).toBe(c);
    }
    expect(SOLUTION_TYPES_PRESETS.infinite.echelon[1]).toEqual([0, 0, 0]);
  });

  it("detects the parallel-line contradiction 0=1", () => {
    const preset = SOLUTION_TYPES_PRESETS.none;
    expect(classifySolutionSystem(preset.rows)).toMatchObject({
      kind: "none",
      rankA: 1,
      rankAugmented: 2,
      point: null,
    });
    expect(
      preset.rows[1].map((value, index) => value - 2 * preset.rows[0][index])
    ).toEqual([0, 0, 1]);
    expect(preset.echelon[1]).toEqual([0, 0, 1]);
  });

  it("reduces fractions and normalizes signs when determinant is negative", () => {
    expect(
      classifySolutionSystem([
        [0, 2, 1],
        [3, 0, -1],
      ])
    ).toMatchObject({
      kind: "unique",
      determinant: -6,
      point: [-1 / 3, 1 / 2],
      exactPoint: [
        { numerator: -1, denominator: 3 },
        { numerator: 1, denominator: 2 },
      ],
    });
  });

  it("does not confuse all-zero equations with an inconsistent zero row", () => {
    expect(
      classifySolutionSystem([
        [0, 0, 0],
        [0, 0, 0],
      ])
    ).toMatchObject({ kind: "infinite", rankA: 0, rankAugmented: 0 });
    expect(
      classifySolutionSystem([
        [0, 0, 0],
        [0, 0, 1],
      ])
    ).toMatchObject({ kind: "none", rankA: 0, rankAugmented: 1 });
    expect(
      classifySolutionSystem([
        [0, 0, 1],
        [1, 1, 2],
      ])
    ).toMatchObject({ kind: "none", rankA: 1, rankAugmented: 2 });
    expect(
      classifySolutionSystem([
        [0, 0, 0],
        [1, 1, 2],
      ])
    ).toMatchObject({ kind: "infinite", rankA: 1, rankAugmented: 1 });
  });

  it("handles signed coincident and parallel equations", () => {
    expect(
      classifySolutionSystem([
        [-1, -1, -2],
        [2, 2, 4],
      ])
    ).toMatchObject({ kind: "infinite", rankA: 1, rankAugmented: 1 });
    expect(
      classifySolutionSystem([
        [-1, -1, -2],
        [2, 2, 5],
      ])
    ).toMatchObject({ kind: "none", rankA: 1, rankAugmented: 2 });
  });

  it("rejects nonfinite, fractional, and unbounded model input", () => {
    for (const invalid of [
      NaN,
      Infinity,
      -Infinity,
      0.1,
      1001,
      -1001,
      Number.MAX_SAFE_INTEGER,
    ]) {
      expect(() =>
        classifySolutionSystem([
          [invalid, 1, 2],
          [1, 1, 3],
        ])
      ).toThrow(RangeError);
    }
  });

  it("matches every exact row-elimination result", () => {
    for (const kind of kinds) {
      const preset = SOLUTION_TYPES_PRESETS[kind];
      const expected =
        kind === "unique"
          ? preset.rows[1].map(
              (value, index) => 2 * value - preset.rows[0][index]
            )
          : preset.rows[1].map(
              (value, index) => value - 2 * preset.rows[0][index]
            );
      expect(expected).toEqual(preset.echelon[1]);
      expect(classifySolutionSystem(preset.rows).kind).toBe(
        classifySolutionSystem(preset.echelon).kind
      );
    }
  });
});

describe("line clipping and synchronized geometry", () => {
  it("clips all presets to finite endpoints satisfying their original equations", () => {
    for (const kind of kinds) {
      for (const row of SOLUTION_TYPES_PRESETS[kind].rows) {
        const segment = clipEquationLine(row, box)!;
        expect(segment).not.toBeNull();
        for (const [x, y] of segment) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(box.xMin);
          expect(x).toBeLessThanOrEqual(box.xMax);
          expect(y).toBeGreaterThanOrEqual(box.yMin);
          expect(y).toBeLessThanOrEqual(box.yMax);
          expect(row[0] * x + row[1] * y).toBeCloseTo(row[2], 10);
        }
      }
    }
  });

  it("handles vertical, horizontal, zero, invalid, and offscreen equations", () => {
    expect(clipEquationLine([1, 0, 1], box)).toEqual([
      [1, -1],
      [1, 5],
    ]);
    expect(clipEquationLine([0, 1, 2], box)).toEqual([
      [-3, 2],
      [7, 2],
    ]);
    for (const row of [
      [0, 0, 0],
      [0, 0, 1],
      [1, 0, 10],
      [NaN, 1, 0],
    ] as const)
      expect(clipEquationLine(row, box)).toBeNull();
    expect(clipEquationLine([1, 1, 2], { ...box, xMax: box.xMin })).toBeNull();
  });

  it("keeps coincident geometry identical and the parallel gap exact", () => {
    const preset = SOLUTION_TYPES_PRESETS.infinite;
    expect(clipEquationLine(preset.rows[0], box)).toEqual(
      clipEquationLine(preset.rows[1], box)
    );
    const [a, b, c] = SOLUTION_TYPES_PRESETS.none.rows[0];
    const [d, e, f] = SOLUTION_TYPES_PRESETS.none.rows[1];
    expect(a * e - b * d).toBe(0);
    const gap = Math.abs(c - f / 2) / Math.hypot(a, b);
    expect(gap).toBeCloseTo(Math.SQRT2 / 4, 12);
    expect(Math.hypot(1.25 - 1, 1.25 - 1)).toBeCloseTo(gap, 12);
  });

  it("reveals the actual line segments and result only at their own stages", () => {
    expect(solutionTypesFrame(0, 1)).toMatchObject({
      firstLine: 0,
      secondLine: 0,
      rowCheck: 0,
      result: 0,
    });
    expect(solutionTypesFrame(1, 0.25).firstLine).toBe(0.25);
    expect(solutionTypesFrame(2, 0.75)).toMatchObject({
      firstLine: 1,
      secondLine: 0.75,
      result: 0,
    });
    expect(solutionTypesFrame(3, 0.5).rowCheck).toBe(0.5);
    expect(solutionTypesFrame(4, 1)).toMatchObject({
      firstLine: 1,
      secondLine: 1,
      rowCheck: 1,
      result: 1,
      sampleT: 2,
    });
    expect(solutionTypesFrame(4, 0).sampleT).not.toBe(
      solutionTypesFrame(4, 1).sampleT
    );
  });

  it("produces bounded finite frames for invalid playback and all stage boundaries", () => {
    for (const stage of [-Infinity, NaN, -1, 0, 1, 2, 3, 4, 99, Infinity]) {
      for (const progress of [-Infinity, NaN, -1, 0, 0.5, 1, 99, Infinity]) {
        const frame = solutionTypesFrame(stage, progress);
        expect(Object.values(frame).every(Number.isFinite)).toBe(true);
        for (const [key, value] of Object.entries(frame)) {
          if (key !== "sampleT") {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});

describe("lesson and accessible SVG output", () => {
  it("renders every exact formula with KaTeX in both languages", () => {
    for (const kind of kinds) {
      for (const lang of ["zh", "en"] as const) {
        const steps = solutionTypesSteps(kind, lang);
        expect(steps).toHaveLength(SOLUTION_TYPES_STEP_COUNT);
        expect(steps[0].latex).toContain(String.raw`x,y\in\mathbb R`);
        expect(steps[4].latex).toBe(solutionTypesFinalLatex(kind));
        for (const step of steps) {
          expect(() =>
            katex.renderToString(step.latex!, { throwOnError: true })
          ).not.toThrow();
          if (lang === "en")
            expect(`${step.description}${step.latex}`).not.toMatch(
              /[\u3400-\u9fff]/u
            );
        }
      }
    }
  });

  it("shows a responsive accessible diagram with bilingual preset controls", () => {
    playback.stage = 4;
    playback.progress = 1;
    const english = renderToStaticMarkup(
      createElement(SolutionTypesDiagram, {
        lang: "en",
        variant: "ls-solution-types",
      })
    );
    const chinese = renderToStaticMarkup(
      createElement(SolutionTypesDiagram, { lang: "zh" })
    );
    expect(english).toContain('data-testid="knowledge-solution-types"');
    expect(english).toContain('viewBox="0 0 560 350"');
    expect(english).toContain('width="100%"');
    expect(english).toContain('role="img"');
    expect(english).toContain("aria-labelledby=");
    expect(english).toContain('aria-pressed="true"');
    expect(english).toContain("Three separate numerical presets");
    expect(english).not.toMatch(/[\u3400-\u9fff]/u);
    expect(chinese).toContain("三個獨立數值預設");
    expect(chinese).toContain("唯一解");
  });

  it("changes SVG path reveal attributes with the shared player frame", () => {
    playback.stage = 1;
    playback.progress = 0;
    const start = renderToStaticMarkup(
      createElement(SolutionTypesDiagram, { lang: "en" })
    );
    playback.progress = 0.5;
    const middle = renderToStaticMarkup(
      createElement(SolutionTypesDiagram, { lang: "en" })
    );
    expect(start).toContain('stroke-dashoffset="1"');
    expect(middle).toContain('stroke-dashoffset="0.5"');
    expect(start).not.toContain('stroke-dashoffset="0.5"');
    playback.stage = 4;
    playback.progress = 1;
  });
});
