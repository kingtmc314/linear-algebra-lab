import { describe, expect, it } from "vitest";
import katex from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MatrixProductDiagram, {
  MATRIX_PRODUCT_PRESETS,
  PRODUCT_UNIT_SQUARE,
  fitProductGeometry,
  interpolateProductPolygon,
  matrixProductDimensions,
  matrixProductFrame,
  matrixProductGeometryFrame,
  matrixProductSteps,
  matrixProductTerms,
  multiplyProductMatrices,
  productMatricesEqual,
  productMatrixLatex,
  transformProductPolygon,
  type ProductMatrix,
} from "./MatrixProductDiagram";

const card = MATRIX_PRODUCT_PRESETS.card;

function numericLeaves(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap(numericLeaves);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(numericLeaves);
  return [];
}

describe("MatrixProductDiagram numerical engine", () => {
  it("reproduces the original knowledge card exactly", () => {
    expect(multiplyProductMatrices(card.a, card.b)).toEqual([
      [19, 22],
      [43, 50],
    ]);
    expect(matrixProductDimensions(card.a)).toEqual([2, 2]);
    expect(matrixProductTerms(card.a, card.b, 0, 0)).toEqual([5, 14]);
    expect(matrixProductTerms(card.a, card.b, 1, 1)).toEqual([18, 32]);
  });

  it("computes a genuine noncommutativity counterexample", () => {
    const ab = multiplyProductMatrices(card.a, card.b);
    const ba = multiplyProductMatrices(card.b, card.a);
    expect(ba).toEqual([
      [23, 34],
      [31, 46],
    ]);
    expect(productMatricesEqual(ab, ba)).toBe(false);
  });

  it("handles negative terms and exact cancellation", () => {
    const { a, b } = MATRIX_PRODUCT_PRESETS.signed;
    expect(multiplyProductMatrices(a, b)).toEqual([
      [0, 1],
      [-3, 0],
    ]);
    expect(multiplyProductMatrices(b, a)).toEqual([
      [2, 7],
      [-1, -2],
    ]);
    expect(matrixProductTerms(a, b, 0, 0)).toEqual([2, -2]);
    expect(matrixProductTerms(a, b, 1, 1)).toEqual([0, 0]);
    expect(matrixProductTerms([[1, -1]], [[2], [2]], 0, 0)).toEqual([2, -2]);
    expect(multiplyProductMatrices([[1, -1]], [[2], [2]])).toEqual([[0]]);
  });

  it("does not falsely label the zero case noncommutative", () => {
    const { a, b } = MATRIX_PRODUCT_PRESETS.zero;
    const ab = multiplyProductMatrices(a, b);
    const ba = multiplyProductMatrices(b, a);
    expect(ab).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(productMatricesEqual(ab, ba)).toBe(true);
    expect(matrixProductSteps(a, b, "en").at(-1)?.latex).not.toContain("\\ne");
    expect(matrixProductSteps(a, b, "en").at(-1)?.description).toContain(
      "happens to have AB = BA"
    );
  });

  it("supports rectangular products and reversed orders of different sizes", () => {
    const { a, b } = MATRIX_PRODUCT_PRESETS.rectangular;
    const ab = multiplyProductMatrices(a, b);
    const ba = multiplyProductMatrices(b, a);
    expect(ab).toEqual([
      [2, -1],
      [1, -2],
    ]);
    expect(ba).toEqual([
      [1, 3, 5],
      [1, 0, 2],
      [1, -3, -1],
    ]);
    expect(matrixProductDimensions(ab)).toEqual([2, 2]);
    expect(matrixProductDimensions(ba)).toEqual([3, 3]);
    expect(productMatricesEqual(ab, ba)).toBe(false);
    expect(matrixProductSteps(a, b, "en")).toHaveLength(15);
  });

  it("covers scalar, identity, and rank-deficient inputs without mutation", () => {
    expect(multiplyProductMatrices([[-3]], [[2]])).toEqual([[-6]]);
    expect(
      multiplyProductMatrices(card.a, [
        [1, 0],
        [0, 1],
      ])
    ).toEqual(card.a);
    expect(
      multiplyProductMatrices(
        [
          [1, 2],
          [2, 4],
        ],
        [[1], [-1]]
      )
    ).toEqual([[-1], [-2]]);
    const before = JSON.stringify(card);
    multiplyProductMatrices(card.a, card.b);
    matrixProductFrame(card.a, card.b, 2, 0.5);
    expect(JSON.stringify(card)).toBe(before);
  });

  it("rejects empty, ragged, and non-finite matrices", () => {
    const invalid: ProductMatrix[] = [
      [],
      [[]],
      [[1], [2, 3]],
      [[NaN]],
      [[Infinity]],
      [[-Infinity]],
    ];
    for (const input of invalid) {
      expect(() => matrixProductDimensions(input)).toThrow(RangeError);
      expect(() => multiplyProductMatrices(input, [[1]])).toThrow(RangeError);
    }
  });

  it("rejects incompatible dimensions and illegal cell indices", () => {
    expect(() => multiplyProductMatrices([[1, 2]], [[1, 2]])).toThrow(
      RangeError
    );
    expect(() => matrixProductTerms(card.a, card.b, -1, 0)).toThrow(RangeError);
    expect(() => matrixProductTerms(card.a, card.b, 0, 2)).toThrow(RangeError);
    expect(() => matrixProductTerms(card.a, card.b, 0.5, 0)).toThrow(
      RangeError
    );
    expect(() => matrixProductTerms(card.a, card.b, NaN, 0)).toThrow(
      RangeError
    );
  });

  it("guards numeric overflow and normalizes signed zero", () => {
    expect(() => multiplyProductMatrices([[Number.MAX_VALUE]], [[2]])).toThrow(
      RangeError
    );
    expect(() =>
      multiplyProductMatrices(
        [[Number.MAX_VALUE, Number.MAX_VALUE]],
        [[1], [1]]
      )
    ).toThrow(RangeError);
    expect(Object.is(multiplyProductMatrices([[-0]], [[2]])[0][0], -0)).toBe(
      false
    );
  });

  it("synchronizes each term stage to its row, column, partial sum, and finished value", () => {
    const [m, n] = matrixProductDimensions(card.a);
    const [, p] = matrixProductDimensions(card.b);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        const terms = matrixProductTerms(card.a, card.b, i, j);
        for (let k = 0; k < n; k++) {
          const stage = 1 + (i * p + j) * n + k;
          const before = matrixProductFrame(card.a, card.b, stage, 0);
          const after = matrixProductFrame(card.a, card.b, stage, 1);
          expect([after.row, after.column, after.term]).toEqual([i, j, k]);
          expect(before.accumulated).toBe(
            terms.slice(0, k).reduce((sum, value) => sum + value, 0)
          );
          expect(after.accumulated).toBe(
            terms.slice(0, k + 1).reduce((sum, value) => sum + value, 0)
          );
          expect(after.fillTravel).toBe(k === n - 1 ? 1 : 0);
          expect(after.cellReveal).toBe(k === n - 1 ? 1 : 0);
          const latex = matrixProductSteps(card.a, card.b, "en")[stage].latex!;
          expect(latex).toContain(`=${after.accumulated}`);
          expect(latex.startsWith(k === n - 1 ? "c_" : "s_")).toBe(true);
        }
      }
    }
  });

  it("moves the row-column matching geometry and swaps factors with progress", () => {
    const start = matrixProductFrame(card.a, card.b, 3, 0);
    const during = matrixProductFrame(card.a, card.b, 3, 0.2);
    const finish = matrixProductFrame(card.a, card.b, 3, 1);
    expect(start.highlightedColumn).toBe(0);
    expect(during.highlightedColumn).toBeGreaterThan(0);
    expect(finish.highlightedColumn).toBe(1);
    expect(during.pairTravel).toBeGreaterThan(start.pairTravel);
    expect(matrixProductFrame(card.a, card.b, 5, 1).highlightedRow).toBe(1);
    const swapStart = matrixProductFrame(card.a, card.b, 10, 0);
    const swapMiddle = matrixProductFrame(card.a, card.b, 10, 0.5);
    const swapEnd = matrixProductFrame(card.a, card.b, 10, 1);
    expect([swapStart.leftCenter, swapStart.rightCenter]).toEqual([100, 280]);
    expect(swapMiddle.leftOffsetY).toBeLessThan(0);
    expect(swapMiddle.rightOffsetY).toBeGreaterThan(0);
    expect([swapEnd.leftCenter, swapEnd.rightCenter]).toEqual([280, 100]);
  });

  it("produces finite bounded frames for every preset and malformed playback values", () => {
    for (const { a, b } of Object.values(MATRIX_PRODUCT_PRESETS)) {
      const steps = matrixProductSteps(a, b, "en");
      for (const stage of [
        -100,
        ...steps.map((_, i) => i),
        100,
        NaN,
        Infinity,
      ]) {
        for (const progress of [-1, 0, 0.1, 0.55, 0.9, 1, 2, NaN, Infinity]) {
          const frame = matrixProductFrame(a, b, stage, progress);
          expect(numericLeaves(frame).every(Number.isFinite)).toBe(true);
          expect(frame.progress).toBeGreaterThanOrEqual(0);
          expect(frame.progress).toBeLessThanOrEqual(1);
          expect(frame.stage).toBeGreaterThanOrEqual(0);
          expect(frame.stage).toBeLessThan(steps.length);
        }
      }
      expect(matrixProductFrame(a, b, steps.length - 1, 1).phase).toBe("swap");
    }
  });

  it("emits valid KaTeX for every bilingual stage and exact final product", () => {
    for (const { a, b } of Object.values(MATRIX_PRODUCT_PRESETS)) {
      for (const lang of ["zh", "en"] as const) {
        const steps = matrixProductSteps(a, b, lang);
        for (const step of steps) {
          expect(() =>
            katex.renderToString(step.latex!, {
              throwOnError: true,
              strict: "error",
            })
          ).not.toThrow();
          if (lang === "en")
            expect(step.description).not.toMatch(/[\u3400-\u9fff]/);
          expect(step.latex).not.toMatch(/[\u3400-\u9fff]/);
        }
        expect(steps.at(-2)?.latex).toContain(
          productMatrixLatex(multiplyProductMatrices(a, b))
        );
        expect(steps.at(-1)?.latex).toContain(
          productMatrixLatex(multiplyProductMatrices(b, a))
        );
      }
    }
    expect(matrixProductSteps(card.a, card.b, "en")).toHaveLength(11);
  });
});

describe("MatrixProductDiagram actual geometric composition", () => {
  it("maps the four square vertices and basis columns exactly: B then A gives AB", () => {
    const first = transformProductPolygon(card.b);
    expect(first).toEqual([
      [0, 0],
      [5, 7],
      [11, 15],
      [6, 8],
    ]);
    const composed = transformProductPolygon(card.a, first);
    expect(composed).toEqual([
      [0, 0],
      [19, 43],
      [41, 93],
      [22, 50],
    ]);
    expect(composed).toEqual(
      transformProductPolygon(multiplyProductMatrices(card.a, card.b))
    );
    expect(composed[1]).toEqual([19, 43]);
    expect(composed[3]).toEqual([22, 50]);
    const finish = matrixProductGeometryFrame(card.a, card.b, 9, 1)!;
    expect(finish.order).toBe("AB");
    expect(finish.first).toEqual(first);
    expect(finish.second).toEqual(composed);
  });

  it("restarts the square on swap, applies A first, then B, and reaches the distinct BA vertices", () => {
    const start = matrixProductGeometryFrame(card.a, card.b, 10, 0)!;
    const firstHalf = matrixProductGeometryFrame(card.a, card.b, 10, 0.25)!;
    const middle = matrixProductGeometryFrame(card.a, card.b, 10, 0.5)!;
    const secondHalf = matrixProductGeometryFrame(card.a, card.b, 10, 0.75)!;
    const finish = matrixProductGeometryFrame(card.a, card.b, 10, 1)!;
    expect(start.order).toBe("BA");
    expect([start.firstName, start.secondName]).toEqual(["A", "B"]);
    expect(start.first).toEqual(PRODUCT_UNIT_SQUARE);
    expect(start.second).toEqual(PRODUCT_UNIT_SQUARE);
    expect(firstHalf.first).toEqual(
      interpolateProductPolygon(
        PRODUCT_UNIT_SQUARE,
        transformProductPolygon(card.a),
        0.5
      )
    );
    expect(firstHalf.second).toEqual(firstHalf.first);
    expect(middle.first).toEqual([
      [0, 0],
      [1, 3],
      [3, 7],
      [2, 4],
    ]);
    expect(middle.second).toEqual(middle.first);
    expect(secondHalf.second).toEqual(
      interpolateProductPolygon(middle.first, finish.endpoint, 0.5)
    );
    expect(finish.second).toEqual([
      [0, 0],
      [23, 31],
      [57, 77],
      [34, 46],
    ]);
    expect(finish.second).toEqual(
      transformProductPolygon(multiplyProductMatrices(card.b, card.a))
    );
    expect(finish.second).not.toEqual(finish.ab);
  });

  it("uses the existing stage/progress to move vertices, not merely opacity or text", () => {
    const start = matrixProductGeometryFrame(card.a, card.b, 0, 0)!;
    const duringB = matrixProductGeometryFrame(card.a, card.b, 0, 0.5)!;
    const afterB = matrixProductGeometryFrame(card.a, card.b, 0, 1)!;
    expect(start.first).toEqual(PRODUCT_UNIT_SQUARE);
    expect(duringB.first).not.toEqual(start.first);
    expect(duringB.first).not.toEqual(afterB.first);
    expect(duringB.second).toEqual(duringB.first);
    const beforeA = matrixProductGeometryFrame(card.a, card.b, 1, 0)!;
    const duringA = matrixProductGeometryFrame(card.a, card.b, 4, 0.5)!;
    const afterA = matrixProductGeometryFrame(card.a, card.b, 8, 1)!;
    expect(beforeA.second).toEqual(afterB.first);
    expect(duringA.second).not.toEqual(beforeA.second);
    expect(duringA.second).not.toEqual(afterA.second);
    expect(duringA.first).toEqual(beforeA.first);
    expect(duringA.second[1]).toEqual(
      interpolateProductPolygon(
        beforeA.second,
        afterA.second,
        duringA.secondProgress
      )[1]
    );
    // Adjacent term stages are geometrically continuous, and the product stage is exact.
    for (let stage = 0; stage < 9; stage++)
      expect(
        matrixProductGeometryFrame(card.a, card.b, stage, 1)!.second
      ).toEqual(
        matrixProductGeometryFrame(card.a, card.b, stage + 1, 0)!.second
      );
  });

  it("has finite deterministic frames for square presets, malformed playback, zero, and rank-one maps", () => {
    const identity = [
      [1, 0],
      [0, 1],
    ];
    const cases = [
      MATRIX_PRODUCT_PRESETS.card,
      MATRIX_PRODUCT_PRESETS.signed,
      MATRIX_PRODUCT_PRESETS.zero,
      {
        a: [
          [1, 2],
          [2, 4],
        ],
        b: identity,
      },
      { a: identity, b: identity },
    ];
    for (const { a, b } of cases) {
      const before = JSON.stringify({ a, b });
      for (const stage of [-5, 0, 1, 4, 8, 9, 10, 100, NaN, Infinity]) {
        for (const progress of [-1, 0, 0.25, 0.5, 0.75, 1, 2, NaN, Infinity]) {
          const frame = matrixProductGeometryFrame(a, b, stage, progress)!;
          expect(numericLeaves(frame).every(Number.isFinite)).toBe(true);
          expect(frame.firstProgress).toBeGreaterThanOrEqual(0);
          expect(frame.secondProgress).toBeLessThanOrEqual(1);
          const fit = fitProductGeometry([
            ...frame.firstEndpoint,
            ...frame.endpoint,
            ...frame.ab,
            ...frame.ba,
          ]);
          expect(numericLeaves(fit).every(Number.isFinite)).toBe(true);
          expect(fit.scale).toBeGreaterThan(0);
        }
      }
      const ab = matrixProductGeometryFrame(a, b, 9, 1)!;
      const ba = matrixProductGeometryFrame(a, b, 10, 1)!;
      expect(ab.second).toEqual(
        transformProductPolygon(multiplyProductMatrices(a, b))
      );
      expect(ba.second).toEqual(
        transformProductPolygon(multiplyProductMatrices(b, a))
      );
      expect(JSON.stringify({ a, b })).toBe(before);
    }
    const zero = MATRIX_PRODUCT_PRESETS.zero;
    expect(matrixProductGeometryFrame(zero.a, zero.b, 9, 1)!.second).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(
      transformProductPolygon([
        [1, 2],
        [2, 4],
      ])
    ).toEqual([
      [0, 0],
      [1, 2],
      [3, 6],
      [2, 4],
    ]);
  });

  it("auto-fits true points with equal-axis scale and a fixed endpoint camera", () => {
    for (const { a, b } of [
      card,
      MATRIX_PRODUCT_PRESETS.signed,
      MATRIX_PRODUCT_PRESETS.zero,
    ]) {
      const end = matrixProductGeometryFrame(a, b, 10, 1)!;
      const allPoints = [
        ...PRODUCT_UNIT_SQUARE,
        ...end.firstEndpoint,
        ...end.endpoint,
        ...end.ab,
      ];
      const fit = fitProductGeometry(allPoints);
      for (const point of allPoints) {
        const x = fit.originX + point[0] * fit.scale;
        const y = fit.originY - point[1] * fit.scale;
        expect(x).toBeGreaterThanOrEqual(32 - 1e-9);
        expect(x).toBeLessThanOrEqual(288 + 1e-9);
        expect(y).toBeGreaterThanOrEqual(32 - 1e-9);
        expect(y).toBeLessThanOrEqual(198 + 1e-9);
      }
      // A unit in either direction is exactly the same screen distance.
      expect(fit.originX + fit.scale - fit.originX).toBeCloseTo(
        fit.originY - (fit.originY - fit.scale)
      );
    }
    expect(
      fitProductGeometry([
        [0, 0],
        [0, 0],
      ]).scale
    ).toBeGreaterThan(0);
    expect(() => fitProductGeometry([[Infinity, 0]])).toThrow(RangeError);
    expect(() => fitProductGeometry([])).toThrow(RangeError);
    expect(() => fitProductGeometry(PRODUCT_UNIT_SQUARE, 64, 64, 32)).toThrow(
      RangeError
    );
  });

  it("never falsely treats rectangular composition as a planar polygon", () => {
    const { a, b } = MATRIX_PRODUCT_PRESETS.rectangular;
    for (const stage of [0, 5, 13, 14])
      expect(matrixProductGeometryFrame(a, b, stage, 0.5)).toBeNull();
    expect(() => transformProductPolygon(a)).toThrow(RangeError);
    expect(() => transformProductPolygon(b)).toThrow(RangeError);
    expect(() =>
      transformProductPolygon(
        [
          [1, 0],
          [0, 1],
        ],
        [[NaN, 0]]
      )
    ).toThrow(RangeError);
    expect(() => interpolateProductPolygon([], [], 0)).toThrow(RangeError);
    expect(() => interpolateProductPolygon([[0, 0]], [], 0)).toThrow(
      RangeError
    );
  });

  it("renders accessible bilingual primary geometry above the retained accumulation detail", () => {
    for (const lang of ["zh", "en"] as const) {
      const html = renderToStaticMarkup(
        createElement(MatrixProductDiagram, { lang })
      );
      expect(
        html.indexOf('data-testid="matrix-product-composition"')
      ).toBeLessThan(html.indexOf('data-testid="matrix-product-svg"'));
      expect(html).toContain('data-testid="matrix-product-moving-polygon"');
      expect(html).toContain('data-testid="matrix-product-basis-1"');
      expect(html).toContain('data-testid="matrix-product-basis-2"');
      expect(html).toContain('data-testid="matrix-product-ab-reference"');
      expect(html).toContain('data-order="BA"');
      expect(html).toContain('role="img"');
      expect(html).toContain("aria-labelledby=");
      expect(html).toContain("grid-cols-1");
      expect(html).toContain("md:grid-cols-2");
      expect(html).toContain(lang === "zh" ? "先 A，再 B" : "A first, then B");
      const ids = Array.from(
        html.matchAll(/\sid="([^"]+)"/g),
        match => match[1]
      );
      expect(new Set(ids).size).toBe(ids.length);
      if (lang === "en") expect(html).not.toMatch(/[\u3400-\u9fff]/);
    }
  });
});
