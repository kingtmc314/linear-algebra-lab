import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { describe, expect, it } from "vitest";
import SystemMatrixDiagram, {
  createSystemMatrixModel,
  SYSTEM_MATRIX_PRESETS,
  SYSTEM_MATRIX_STEP_COUNT,
  SystemMatrixScene,
  systemMatrixFinalLatex,
  systemMatrixFraction,
  systemMatrixFractionLatex,
  systemMatrixGeometry,
  systemMatrixSteps,
} from "./SystemMatrixDiagram";

const original = createSystemMatrixModel(
  [
    [2, 1],
    [1, 3],
  ],
  [5, 10]
);

describe("SystemMatrixDiagram exact correspondence model", () => {
  it("copies the original equation coefficients and constants in row order", () => {
    expect(original.A).toEqual([
      [2, 1],
      [1, 3],
    ]);
    expect(original.augmented).toEqual([
      [2, 1, 5],
      [1, 3, 10],
    ]);
    expect(original.determinant).toBe(5);
    expect(original.solution).toEqual([
      { numerator: 1, denominator: 1 },
      { numerator: 3, denominator: 1 },
    ]);
    expect(original.solution![0]).not.toEqual(original.solution![1]);
  });

  it.each(SYSTEM_MATRIX_PRESETS)(
    "preserves every entry of preset $id",
    preset => {
      const model = createSystemMatrixModel(preset.A, preset.b);
      model.A.forEach((row, i) => {
        expect(model.augmented[i].slice(0, 2)).toEqual(row);
        expect(model.augmented[i][2]).toBe(model.b[i]);
        if (model.solution) {
          const [x, y] = model.solution;
          // Check rational equality without a floating-point division.
          expect(
            row[0] * x.numerator * y.denominator +
              row[1] * y.numerator * x.denominator
          ).toBe(model.b[i] * x.denominator * y.denominator);
        }
      });
    }
  );

  it("represents a consistent dependent system without fabricating a unique solution", () => {
    const model = createSystemMatrixModel(
      [
        [2, 1],
        [4, 2],
      ],
      [5, 10]
    );
    expect(model.kind).toBe("infinite");
    expect(model.solution).toBeNull();
    expect(model.determinant).toBe(0);
  });

  it("rejects an inconsistent dependent system and retains its constants", () => {
    const model = createSystemMatrixModel(
      [
        [2, 1],
        [4, 2],
      ],
      [5, 11]
    );
    expect(model.kind).toBe("none");
    expect(model.solution).toBeNull();
    expect(model.augmented[1]).toEqual([4, 2, 11]);
    expect(systemMatrixFinalLatex(model)).toContain("no solution");
  });

  it("handles both all-zero systems and a contradiction in a zero row", () => {
    expect(
      createSystemMatrixModel(
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0]
      ).kind
    ).toBe("infinite");
    expect(
      createSystemMatrixModel(
        [
          [0, 0],
          [0, 0],
        ],
        [0, 1]
      ).kind
    ).toBe("none");
    expect(
      createSystemMatrixModel(
        [
          [0, 0],
          [1, 2],
        ],
        [1, 3]
      ).kind
    ).toBe("none");
    expect(
      createSystemMatrixModel(
        [
          [1, 2],
          [0, 0],
        ],
        [3, 0]
      ).kind
    ).toBe("infinite");
  });

  it("retains zero-coefficient column positions and signed determinants", () => {
    const model = createSystemMatrixModel(
      [
        [0, 1],
        [2, 0],
      ],
      [3, 2]
    );
    expect(model.determinant).toBe(-2);
    expect(model.augmented).toEqual([
      [0, 1, 3],
      [2, 0, 2],
    ]);
    expect(model.solution).toEqual(original.solution);
  });

  it("returns reduced exact fractions, including negative and zero solutions", () => {
    expect(systemMatrixFraction(6, -8)).toEqual({
      numerator: -3,
      denominator: 4,
    });
    expect(systemMatrixFraction(0, -5)).toEqual({
      numerator: 0,
      denominator: 1,
    });
    const model = createSystemMatrixModel(
      [
        [2, 0],
        [0, 3],
      ],
      [-1, 1]
    );
    expect(model.solution).toEqual([
      { numerator: -1, denominator: 2 },
      { numerator: 1, denominator: 3 },
    ]);
    expect(systemMatrixFractionLatex(model.solution![0])).toBe(
      String.raw`-\frac{1}{2}`
    );
    expect(systemMatrixFinalLatex(model)).toContain(String.raw`y=\frac{1}{3}`);
  });

  it("guards nonfinite, fractional, oversized entries and invalid fractions", () => {
    for (const invalid of [NaN, Infinity, -Infinity, 0.5, 21, -21]) {
      expect(() =>
        createSystemMatrixModel(
          [
            [invalid, 1],
            [1, 3],
          ],
          [5, 10]
        )
      ).toThrow(RangeError);
      expect(() =>
        createSystemMatrixModel(
          [
            [2, 1],
            [1, 3],
          ],
          [5, invalid]
        )
      ).toThrow(RangeError);
    }
    expect(() => systemMatrixFraction(1, 0)).toThrow(RangeError);
    expect(() => systemMatrixFraction(Infinity, 1)).toThrow(RangeError);
    expect(() => systemMatrixFraction(1, 1.5)).toThrow(RangeError);
  });

  it("does not retain mutable references to its input", () => {
    const A: [[number, number], [number, number]] = [
      [2, 1],
      [1, 3],
    ];
    const b: [number, number] = [5, 10];
    const model = createSystemMatrixModel(A, b);
    A[0][0] = 9;
    b[0] = 9;
    expect(model.A[0][0]).toBe(2);
    expect(model.b[0]).toBe(5);
  });
});

describe("SystemMatrixDiagram shared-clock geometry", () => {
  it("moves coefficients first, then constants, then assembles Ax=b", () => {
    const initial = systemMatrixGeometry({
      stage: 0,
      progress: 1,
      playing: false,
    });
    const half = systemMatrixGeometry({
      stage: 1,
      progress: 0.5,
      playing: false,
    });
    const A = systemMatrixGeometry({ stage: 1, progress: 1, playing: false });
    const augmented = systemMatrixGeometry({
      stage: 2,
      progress: 1,
      playing: false,
    });
    const product = systemMatrixGeometry({
      stage: 3,
      progress: 1,
      playing: false,
    });
    expect(initial.tiles[0]).toMatchObject({ x: 86, y: 98 });
    expect(half.tiles[0].x).toBeGreaterThan(initial.tiles[0].x);
    expect(half.tiles[0].x).toBeLessThan(A.tiles[0].x);
    expect(A.tiles[0]).toMatchObject({ x: 215, y: 230 });
    expect(A.tiles[2]).toMatchObject({ x: 351, y: 98 });
    expect(A.bracketRight).toBe(302);
    expect(augmented.tiles[2]).toMatchObject({ x: 351, y: 230 });
    expect(augmented.bracketRight).toBe(378);
    expect(product.tiles[0]).toMatchObject({ x: 161, y: 230 });
    expect(product.tiles[2]).toMatchObject({ x: 441, y: 230 });
    expect(product.product).toBe(1);
  });

  it("is continuous at every stage boundary, including paused manual steps", () => {
    for (let stage = 0; stage < 5; stage++) {
      const before = systemMatrixGeometry({
        stage,
        progress: 1,
        playing: true,
      });
      const after = systemMatrixGeometry({
        stage: stage + 1,
        progress: 0,
        playing: false,
      });
      expect(after).toEqual(before);
    }
  });

  it("moves the verification probe across the matching row", () => {
    const first = systemMatrixGeometry({
      stage: 4,
      progress: 0.25,
      playing: false,
    });
    const second = systemMatrixGeometry({
      stage: 4,
      progress: 0.75,
      playing: false,
    });
    expect(first.row).toBe(0);
    expect(second.row).toBe(1);
    expect(first.probeX).not.toBe(second.probeX);
    expect(first.probeY).not.toBe(second.probeY);
    expect(
      systemMatrixGeometry({ stage: 5, progress: 1, playing: false }).result
    ).toBe(1);
  });

  it("produces finite bounded coordinates for all stages and malformed frame values", () => {
    for (const stage of [-100, 0, 1, 2, 3, 4, 5, 100, NaN, Infinity]) {
      for (const progress of [-2, 0, 0.25, 0.5, 1, 3, NaN, Infinity]) {
        const geometry = systemMatrixGeometry({
          stage,
          progress,
          playing: false,
        });
        for (const tile of geometry.tiles) {
          expect(Number.isFinite(tile.x) && Number.isFinite(tile.y)).toBe(true);
          expect(tile.x).toBeGreaterThanOrEqual(0);
          expect(tile.x).toBeLessThanOrEqual(560);
          expect(tile.y).toBeGreaterThanOrEqual(0);
          expect(tile.y).toBeLessThanOrEqual(380);
        }
        expect(
          Number.isFinite(geometry.probeX) && Number.isFinite(geometry.probeY)
        ).toBe(true);
      }
    }
  });
});

describe("SystemMatrixDiagram formulas and semantic SVG", () => {
  it.each(["ls-def", "ls-augmented"] as const)(
    "renders every preset step with valid KaTeX for %s",
    variant => {
      for (const preset of SYSTEM_MATRIX_PRESETS) {
        const model = createSystemMatrixModel(preset.A, preset.b);
        for (const lang of ["zh", "en"] as const) {
          const steps = systemMatrixSteps(model, lang, variant);
          expect(steps).toHaveLength(SYSTEM_MATRIX_STEP_COUNT);
          for (const step of steps) {
            expect(step.description).toBeTruthy();
            expect(() =>
              katex.renderToString(step.latex!, { throwOnError: true })
            ).not.toThrow();
            if (lang === "en")
              expect(`${step.description} ${step.latex}`).not.toMatch(
                /[\u3400-\u9fff]/u
              );
          }
        }
      }
    }
  );

  it("keeps exact original values in the final formula and supports degenerate LaTeX", () => {
    expect(systemMatrixFinalLatex(original)).toContain(
      String.raw`x=1,\quad y=3`
    );
    const none = createSystemMatrixModel(
      [
        [0, 0],
        [0, 0],
      ],
      [0, 1]
    );
    expect(() =>
      katex.renderToString(systemMatrixFinalLatex(none), { throwOnError: true })
    ).not.toThrow();
  });

  it("provides responsive accessible SVG with unique marker and description IDs", () => {
    const frame = { stage: 4, progress: 0.5, playing: false };
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(SystemMatrixScene, {
          model: original,
          frame,
          lang: "en",
        }),
        createElement(SystemMatrixScene, { model: original, frame, lang: "zh" })
      )
    );
    expect(markup).toContain('viewBox="0 0 560 380"');
    expect(markup).toContain('width="100%"');
    expect(markup).toContain('role="img"');
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(markup).toContain("marker-end=");
    expect(markup).not.toMatch(/NaN|Infinity/);
  });

  it("renders visibly different tile transforms as progress advances", () => {
    const start = renderToStaticMarkup(
      createElement(SystemMatrixScene, {
        model: original,
        lang: "en",
        frame: { stage: 1, progress: 0, playing: false },
      })
    );
    const end = renderToStaticMarkup(
      createElement(SystemMatrixScene, {
        model: original,
        lang: "en",
        frame: { stage: 1, progress: 1, playing: false },
      })
    );
    expect(start).toContain('transform="translate(86 98)"');
    expect(end).toContain('transform="translate(215 230)"');
    expect(start).not.toEqual(end);
    expect(end).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it.each(["ls-def", "ls-augmented"] as const)(
    "uses the shared player and starts at the exact final step for %s",
    variant => {
      const markup = renderToStaticMarkup(
        createElement(SystemMatrixDiagram, { lang: "en", variant })
      );
      expect(markup).toContain('data-testid="knowledge-system-matrix"');
      expect(markup).toContain('data-stage="5"');
      expect(markup).toContain('data-progress="1.000"');
      expect(markup).toContain("x = 1, y = 3");
      expect(markup).toContain("Zero entries");
      expect(markup).toContain("Dependent");
      expect(markup).not.toMatch(/[\u3400-\u9fff]/u);
    }
  );
});
