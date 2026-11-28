import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import katex from "katex";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RowOperationDiagram, {
  ROW_OPERATION_PRESETS,
  ROW_OPERATION_STEP_COUNT,
  clipEquationLine,
  eliminateFirstEntry,
  replaceEquationRow,
  rowExactNumber,
  rowOperationFrame,
  rowOperationSteps,
  solveRowSystem,
  type EquationRow,
} from "./RowOperationDiagram";

const example = ROW_OPERATION_PRESETS[0];
const bounds = { minX: -1, maxX: 6, minY: -1, maxY: 6 };
const residual = (row: EquationRow, x: number, y: number) =>
  row[0] * x + row[1] * y - row[2];

describe("RowOperationDiagram numeric model", () => {
  it("eliminates R2 with the exact contracted half-row operation", () => {
    expect(eliminateFirstEntry(example.first, example.second)).toEqual({
      kind: "eliminated",
      multiple: -1 / 2,
      row: [0, 5 / 2, 15 / 2],
    });
    expect(solveRowSystem(example.first, example.second)).toEqual({
      kind: "unique",
      point: [1, 3],
    });
  });

  it("preserves both source rows and is reversible", () => {
    const first: EquationRow = [2, 1, 5];
    const second: EquationRow = [1, 3, 10];
    const updated = replaceEquationRow(first, second, -1 / 2);
    expect(replaceEquationRow(first, updated, 1 / 2)).toEqual(second);
    expect(first).toEqual([2, 1, 5]);
    expect(second).toEqual([1, 3, 10]);
    expect(replaceEquationRow(first, second, 0)).toEqual(second);
  });

  it("handles a negative first pivot with a positive half-row addition", () => {
    const preset = ROW_OPERATION_PRESETS[1];
    expect(eliminateFirstEntry(preset.first, preset.second)).toEqual({
      kind: "eliminated",
      multiple: 1 / 2,
      row: [0, 5 / 2, 15 / 2],
    });
    expect(solveRowSystem(preset.first, preset.second)).toEqual({
      kind: "unique",
      point: [1, 3],
    });
  });

  it("does not divide by zero when the first pivot is missing", () => {
    expect(eliminateFirstEntry([0, 1, 3], [1, 3, 10])).toEqual({
      kind: "zero-pivot",
      multiple: null,
      row: [1, 3, 10],
    });
  });

  it("treats a dependent zero row as no constraint, not a unique point", () => {
    const preset = ROW_OPERATION_PRESETS[2];
    expect(eliminateFirstEntry(preset.first, preset.second).row).toEqual([
      0, 0, 0,
    ]);
    expect(solveRowSystem(preset.first, preset.second)).toEqual({
      kind: "infinite",
    });
    expect(solveRowSystem(preset.first, [0, 0, 0])).toEqual({
      kind: "infinite",
    });
    expect(solveRowSystem([0, 0, 0], [0, 0, 0])).toEqual({ kind: "infinite" });
  });

  it("detects inconsistent parallel rows and contradictory zero rows", () => {
    expect(solveRowSystem([2, 1, 5], [4, 2, 11])).toEqual({ kind: "none" });
    expect(solveRowSystem([0, 0, 1], [0, 0, 0])).toEqual({ kind: "none" });
    expect(solveRowSystem([0, 1, 3], [0, 0, 1])).toEqual({ kind: "none" });
  });

  it("rejects nonfinite row arithmetic and overflow", () => {
    expect(() =>
      replaceEquationRow([Infinity, 1, 2], example.second, 1)
    ).toThrow(RangeError);
    expect(() =>
      replaceEquationRow(example.first, example.second, NaN)
    ).toThrow(RangeError);
    expect(() =>
      replaceEquationRow([Number.MAX_VALUE, 0, 0], [0, 0, 0], 2)
    ).toThrow(RangeError);
    expect(() => solveRowSystem([NaN, 1, 1], [1, 1, 1])).toThrow(RangeError);
    expect(() => eliminateFirstEntry([2, 1, Infinity], [1, 3, 10])).toThrow(
      RangeError
    );
  });
});

describe("RowOperationDiagram clipped line geometry", () => {
  it("clips vertical and horizontal lines without a slope division", () => {
    expect(clipEquationLine([1, 0, 1], bounds)).toEqual([
      [1, -1],
      [1, 6],
    ]);
    expect(clipEquationLine([0, 5 / 2, 15 / 2], bounds)).toEqual([
      [-1, 3],
      [6, 3],
    ]);
  });

  it("represents zero rows, inconsistent rows and out-of-view lines without false lines", () => {
    expect(clipEquationLine([0, 0, 0], bounds)).toBeNull();
    expect(clipEquationLine([0, 0, 1], bounds)).toBeNull();
    expect(clipEquationLine([1, 0, 20], bounds)).toBeNull();
    expect(clipEquationLine([1, 1, -2], bounds)).toBeNull();
  });

  it("deduplicates corner intersections and satisfies the original line equation", () => {
    const segment = clipEquationLine([1, -1, 0], bounds);
    expect(segment).toEqual([
      [-1, -1],
      [6, 6],
    ]);
    const sloping = clipEquationLine(example.first, bounds);
    expect(sloping).not.toBeNull();
    for (const point of sloping ?? []) {
      expect(residual(example.first, ...point)).toBeCloseTo(0, 12);
      expect(point.every(Number.isFinite)).toBe(true);
    }
  });

  it("guards invalid bounds and nonfinite coordinates", () => {
    expect(() =>
      clipEquationLine(example.first, { ...bounds, minX: 6 })
    ).toThrow(RangeError);
    expect(() =>
      clipEquationLine(example.first, { ...bounds, minY: 7 })
    ).toThrow(RangeError);
    expect(() => clipEquationLine([NaN, 0, 1], bounds)).toThrow(RangeError);
  });
});

describe("RowOperationDiagram synchronized frames", () => {
  it("actually rotates the second equation line while preserving the full unique solution set", () => {
    const beginning = rowOperationFrame(example, 2, 0);
    const middle = rowOperationFrame(example, 2, 1 / 2);
    const end = rowOperationFrame(example, 2, 1);
    expect(beginning.currentRow).toEqual([1, 3, 10]);
    expect(middle.currentRow).toEqual([1 / 2, 11 / 4, 35 / 4]);
    expect(end.currentRow).toEqual([0, 5 / 2, 15 / 2]);
    expect(beginning.segment).not.toEqual(middle.segment);
    expect(middle.segment).not.toEqual(end.segment);
    for (let index = 0; index <= 20; index++) {
      const frame = rowOperationFrame(example, 2, index / 20);
      expect(residual(frame.currentRow, 1, 3)).toBeCloseTo(0, 12);
      expect(solveRowSystem(example.first, frame.currentRow)).toEqual({
        kind: "unique",
        point: [1, 3],
      });
    }
  });

  it("reveals y then x guides in their matching back-substitution stages", () => {
    expect(rowOperationFrame(example, 2, 1).yReveal).toBe(0);
    expect(rowOperationFrame(example, 3, 0.4).yReveal).toBe(0.4);
    expect(rowOperationFrame(example, 3, 1).xReveal).toBe(0);
    expect(rowOperationFrame(example, 4, 0.7).xReveal).toBe(0.7);
    expect(rowOperationFrame(example, 5, 1)).toMatchObject({
      amount: 1,
      xReveal: 1,
      yReveal: 1,
    });
  });

  it("removes the line for the degenerate zero row without claiming a unique intersection", () => {
    const preset = ROW_OPERATION_PRESETS[2];
    expect(rowOperationFrame(preset, 2, 0.5).segment).not.toBeNull();
    const end = rowOperationFrame(preset, 5, 1);
    expect(end.segment).toBeNull();
    expect(end.solution).toEqual({ kind: "infinite" });
    expect(end.yReveal).toBe(0);
    expect(end.xReveal).toBe(0);
    for (const t of [-3, 0, 1, 5]) {
      expect(residual(preset.first, t, 5 - 2 * t)).toBe(0);
      expect(residual(end.currentRow, t, 5 - 2 * t)).toBe(0);
    }
  });

  it("keeps every preset, stage and interpolated frame finite", () => {
    for (const preset of ROW_OPERATION_PRESETS) {
      for (let stage = 0; stage < ROW_OPERATION_STEP_COUNT; stage++) {
        for (const progress of [0, 0.01, 0.25, 0.5, 0.99, 1]) {
          const frame = rowOperationFrame(preset, stage, progress);
          expect(
            [
              ...frame.currentRow,
              frame.amount,
              frame.yReveal,
              frame.xReveal,
            ].every(Number.isFinite)
          ).toBe(true);
          for (const point of frame.segment ?? []) {
            expect(point.every(Number.isFinite)).toBe(true);
            expect(residual(frame.currentRow, ...point)).toBeCloseTo(0, 10);
          }
          expect(residual(frame.currentRow, 1, 3)).toBeCloseTo(0, 10);
        }
      }
    }
  });

  it("clamps progress and stage, including NaN and infinity", () => {
    expect(rowOperationFrame(example, 2, -1).amount).toBe(0);
    expect(rowOperationFrame(example, 2, 2).amount).toBe(1);
    expect(rowOperationFrame(example, NaN, Infinity)).toMatchObject({
      stage: 0,
      progress: 0,
      amount: 0,
    });
    expect(rowOperationFrame(example, 100, NaN)).toMatchObject({
      stage: 5,
      progress: 0,
      amount: 1,
    });
    expect(
      rowOperationFrame(
        { id: "example", first: [0, 1, 3], second: [1, 3, 10] },
        2,
        0.5
      ).currentRow
    ).toEqual([1, 3, 10]);
  });
});

describe("RowOperationDiagram exact bilingual formulas", () => {
  it("formats only exact integers and halves, never silently rounded decimals", () => {
    expect(rowExactNumber(5 / 2)).toBe(String.raw`\frac{5}{2}`);
    expect(rowExactNumber(-15 / 2)).toBe(String.raw`-\frac{15}{2}`);
    expect(rowExactNumber(5 / 2, false)).toBe("5/2");
    expect(rowExactNumber(-0)).toBe("0");
    expect(() => rowExactNumber(1 / 3)).toThrow(RangeError);
    expect(() => rowExactNumber(Infinity)).toThrow(RangeError);
  });

  it("provides six complete stages for both variants and all presets in both languages", () => {
    for (const lang of ["zh", "en"] as const) {
      for (const variant of ["ls-row-ops", "ls-gaussian"]) {
        for (const preset of ROW_OPERATION_PRESETS) {
          const steps = rowOperationSteps(lang, preset.id, variant);
          expect(steps).toHaveLength(ROW_OPERATION_STEP_COUNT);
          for (const step of steps) {
            expect(step.description?.length).toBeGreaterThan(20);
            expect(step.latex).toBeTruthy();
            expect(() =>
              katex.renderToString(step.latex ?? "", {
                throwOnError: true,
                strict: "error",
              })
            ).not.toThrow();
            if (lang === "en") {
              expect(`${step.description}${step.latex}`).not.toMatch(
                /[\u3400-\u9fff]/u
              );
            }
          }
        }
      }
    }
  });

  it("keeps the exact final solution and the dependent solution family distinct", () => {
    const steps = rowOperationSteps("en");
    expect(steps[2].latex).toContain(String.raw`0&\frac{5}{2}&\frac{15}{2}`);
    expect(steps[3].latex).toContain(String.raw`y=\frac{15/2}{5/2}=3`);
    expect(steps[5].latex).toContain("(x,y)=(1,3)");
    expect(rowOperationSteps("en", "negative")[4].latex).toContain("-2x-3=-5");
    expect(rowOperationSteps("en", "negative")[5].latex).toContain(
      "-2(1)-3=-5"
    );
    expect(rowOperationSteps("en", "dependent")[5].latex).toContain("(t,5-2t)");
    expect(rowOperationSteps("en", "dependent")[3].description).toContain(
      "Do not divide by zero"
    );
  });
});

describe("RowOperationDiagram accessible rendered output", () => {
  // The node-only Vitest config uses classic JSX for the shared player.
  beforeEach(() => vi.stubGlobal("React", React));
  afterEach(() => vi.unstubAllGlobals());

  it("uses the shared player's exact final state for both supported variants", () => {
    for (const variant of ["ls-row-ops", "ls-gaussian"]) {
      const markup = renderToStaticMarkup(
        createElement(RowOperationDiagram, { lang: "en", variant })
      );
      expect(markup).toContain('data-testid="knowledge-row-operations"');
      expect(markup).toContain('data-stage="5"');
      expect(markup).toContain('data-progress="1.000"');
      expect(markup).toContain('data-row-amount="1"');
      expect(markup).toContain('role="img"');
      expect(markup).toContain('width="100%"');
      expect(markup).toContain('viewBox="0 0 560 352"');
      expect(markup).toContain('data-testid="row-operation-fixed-solution"');
      expect(markup).not.toMatch(/[\u3400-\u9fff]/u);
      expect(markup).not.toContain("<img");
    }
    const chinese = renderToStaticMarkup(
      createElement(RowOperationDiagram, { lang: "zh", variant: "ls-gaussian" })
    );
    expect(chinese).toContain("消去與回代");
    expect(chinese).toContain("行變換的矩陣與直線同步圖解");
  });

  it("gives simultaneous diagrams distinct SVG title, clip and marker IDs", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(RowOperationDiagram, { lang: "en" }),
        createElement(RowOperationDiagram, {
          lang: "en",
          variant: "ls-gaussian",
        })
      )
    );
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    expect(ids.length).toBe(8);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
