import { describe, expect, it } from "vitest";
import katex from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CharacteristicDiagram, {
  CHARACTERISTIC_MATRIX,
  CHARACTERISTIC_PRESETS,
  CHARACTERISTIC_ROOTS,
  CHARACTERISTIC_STEP_COUNT,
  characteristicCurvePoints,
  characteristicFrame,
  characteristicModel,
  characteristicSteps,
  characteristicValue,
} from "./CharacteristicDiagram";

function wedge(a: readonly number[], b: readonly number[]) {
  return a[0] * b[1] - a[1] * b[0];
}

describe("CharacteristicDiagram fixed mathematical example", () => {
  it("matches the original card's matrix, trace and determinant", () => {
    expect(CHARACTERISTIC_MATRIX).toEqual([
      [4, 1],
      [2, 3],
    ]);
    expect(CHARACTERISTIC_MATRIX[0][0] + CHARACTERISTIC_MATRIX[1][1]).toBe(7);
    expect(characteristicValue(0)).toBe(10);
    for (const lambda of [-4, 0, 1, 2, 3, 3.5, 5, 6, 9]) {
      expect(characteristicValue(lambda)).toBe(lambda ** 2 - 7 * lambda + 10);
    }
  });

  it("has exactly the required two real roots in this quadratic example", () => {
    expect(CHARACTERISTIC_ROOTS).toEqual([2, 5]);
    expect(7 ** 2 - 4 * 10).toBe(9);
    expect(characteristicValue(2)).toBe(0);
    expect(characteristicValue(5)).toBe(0);
    expect(Object.is(characteristicValue(2), -0)).toBe(false);
  });

  it("agrees with the shifted matrix determinant and absolute column area", () => {
    for (const lambda of [-1, 0, 1, 2, 3, 3.5, 5, 6]) {
      const model = characteristicModel(lambda);
      const [[a, b], [c, d]] = model.matrix;
      expect(model.determinant).toBe(a * d - b * c);
      expect(wedge(...model.columns)).toBe(model.determinant);
      expect(model.area).toBe(Math.abs(wedge(...model.columns)));
    }
  });

  it("distinguishes negative orientation from a negative area", () => {
    const positive = characteristicModel(0);
    const negative = characteristicModel(3);
    expect(positive).toMatchObject({
      determinant: 10,
      area: 10,
      orientation: "positive",
      rank: 2,
    });
    expect(negative).toMatchObject({
      determinant: -2,
      area: 2,
      orientation: "negative",
      singular: false,
      rank: 2,
    });
    expect(negative.kernel).toBeNull();
  });

  it("collapses to same-direction collinear columns at lambda = 2", () => {
    const model = characteristicModel(2);
    expect(model.columns).toEqual([
      [2, 2],
      [1, 1],
    ]);
    expect(model).toMatchObject({
      area: 0,
      rank: 1,
      singular: true,
      orientation: "zero",
      kernel: [1, -2],
    });
    expect(model.columns[0]).toEqual(model.columns[1].map(value => 2 * value));
  });

  it("collapses to opposite collinear columns at lambda = 5", () => {
    const model = characteristicModel(5);
    expect(model.columns).toEqual([
      [-1, 2],
      [1, -2],
    ]);
    expect(model).toMatchObject({
      area: 0,
      rank: 1,
      singular: true,
      orientation: "zero",
      kernel: [1, 1],
    });
    expect(model.columns[0]).toEqual(model.columns[1].map(value => -value));
  });

  it("gives a genuine nonzero null vector at both singular roots", () => {
    for (const lambda of CHARACTERISTIC_ROOTS) {
      const { kernel, matrix } = characteristicModel(lambda);
      expect(kernel).not.toBeNull();
      const v = kernel!;
      expect(v.some(value => value !== 0)).toBe(true);
      for (const row of matrix) expect(row[0] * v[0] + row[1] * v[1]).toBe(0);
    }
  });

  it("does not classify merely nearby nonsingular values as roots", () => {
    for (const lambda of [2 - 1e-8, 2 + 1e-8, 5 - 1e-8, 5 + 1e-8]) {
      expect(characteristicModel(lambda).singular).toBe(false);
      expect(characteristicModel(lambda).rank).toBe(2);
    }
  });

  it("rejects nonfinite or overflowing polynomial inputs", () => {
    for (const lambda of [NaN, Infinity, -Infinity, Number.MAX_VALUE]) {
      expect(() => characteristicValue(lambda)).toThrow(RangeError);
      expect(() => characteristicModel(lambda)).toThrow(RangeError);
    }
  });
});

describe("CharacteristicDiagram synchronized playback geometry", () => {
  it("has six meaningful stages with exact completed endpoint models", () => {
    const targets = [0, 1, 6, 2, 5, 5];
    expect(CHARACTERISTIC_STEP_COUNT).toBe(6);
    targets.forEach((target, stage) => {
      const frame = characteristicFrame({ stage, progress: 1 });
      expect(frame.lambda).toBe(target);
      expect(frame.target).toBe(target);
      expect(frame.settled).toBe(true);
      expect(frame.determinant).toBe(characteristicValue(target));
    });
  });

  it("moves actual columns and the polynomial marker together within a stage", () => {
    const beginning = characteristicFrame({ stage: 3, progress: 0 });
    const middle = characteristicFrame({ stage: 3, progress: 0.5 });
    const end = characteristicFrame({ stage: 3, progress: 1 });
    expect([beginning.lambda, middle.lambda, end.lambda]).toEqual([6, 4, 2]);
    expect(beginning.columns).not.toEqual(middle.columns);
    expect(middle.columns).not.toEqual(end.columns);
    for (const frame of [beginning, middle, end]) {
      expect(wedge(...frame.columns)).toBe(frame.determinant);
      expect(frame.determinant).toBe(characteristicValue(frame.lambda));
    }
    expect(middle.settled).toBe(false);
  });

  it("maintains lambda and column continuity across each forward stage boundary", () => {
    for (let stage = 0; stage < 5; stage++) {
      const previous = characteristicFrame({ stage, progress: 1 }, 0);
      const next = characteristicFrame({ stage: stage + 1, progress: 0 }, 0);
      expect(next.lambda).toBe(previous.lambda);
      expect(next.columns).toEqual(previous.columns);
      expect(next.curveEnd).toBe(previous.curveEnd);
    }
  });

  it("reveals the curve, root markers and summary using stage progress", () => {
    expect(
      characteristicFrame({ stage: 0, progress: 0.25 }).columnOpacity
    ).toBe(0.25);
    expect(characteristicFrame({ stage: 2, progress: 0 }).curveEnd).toBe(1);
    expect(characteristicFrame({ stage: 2, progress: 1 }).curveEnd).toBe(6);
    expect(
      characteristicFrame({ stage: 2, progress: 1 }).firstRootOpacity
    ).toBe(0);
    expect(
      characteristicFrame({ stage: 3, progress: 0.5 }).firstRootOpacity
    ).toBe(0.5);
    expect(
      characteristicFrame({ stage: 3, progress: 1 }).secondRootOpacity
    ).toBe(0);
    expect(
      characteristicFrame({ stage: 4, progress: 0.5 }).secondRootOpacity
    ).toBe(0.5);
    expect(
      characteristicFrame({ stage: 5, progress: 0.5 }).summaryOpacity
    ).toBe(0.5);
  });

  it("supports positive, negative and both singular final-step check presets", () => {
    expect(CHARACTERISTIC_PRESETS).toEqual([0, 3, 2, 5]);
    for (const selected of CHARACTERISTIC_PRESETS) {
      const frame = characteristicFrame({ stage: 5, progress: 1 }, selected);
      expect(frame.lambda).toBe(selected);
      expect(frame.determinant).toBe(characteristicValue(selected));
      expect(frame.singular).toBe(selected === 2 || selected === 5);
    }
  });

  it("keeps all sampled frames finite, bounded, and mathematically coherent", () => {
    for (const selected of CHARACTERISTIC_PRESETS) {
      for (let stage = 0; stage < 6; stage++) {
        for (const progress of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
          const frame = characteristicFrame({ stage, progress }, selected);
          expect(Number.isFinite(frame.lambda)).toBe(true);
          expect(Number.isFinite(frame.determinant)).toBe(true);
          expect(frame.lambda).toBeGreaterThanOrEqual(0);
          expect(frame.lambda).toBeLessThanOrEqual(6);
          frame.columns
            .flat()
            .forEach(value => expect(Number.isFinite(value)).toBe(true));
          expect(wedge(...frame.columns)).toBeCloseTo(frame.determinant, 10);
        }
      }
    }
  });

  it("guards malformed frame and preset input without NaN SVG coordinates", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const frame = characteristicFrame({ stage: bad, progress: bad }, bad);
      expect(frame.stage).toBe(0);
      expect(frame.progress).toBe(0);
      expect(frame.lambda).toBe(0);
      expect(frame.determinant).toBe(10);
    }
    expect(characteristicFrame({ stage: 100, progress: 2 }, 42).lambda).toBe(5);
    expect(characteristicFrame({ stage: -1, progress: -1 }).stage).toBe(0);
    expect(characteristicFrame({ stage: 3.8, progress: 0.5 }).stage).toBe(3);
  });

  it("samples an exact numeric curve and guards degenerate sampling options", () => {
    const points = characteristicCurvePoints(6, 6);
    expect(points).toHaveLength(7);
    expect(points[0]).toEqual([0, 10]);
    expect(points[2]).toEqual([2, 0]);
    expect(points[5]).toEqual([5, 0]);
    expect(points[6]).toEqual([6, 4]);
    expect(characteristicCurvePoints(0, 0)).toEqual([
      [0, 10],
      [0, 10],
    ]);
    expect(characteristicCurvePoints(NaN, NaN)).toHaveLength(81);
    expect(
      characteristicCurvePoints(Infinity, -Infinity)
        .flat()
        .every(Number.isFinite)
    ).toBe(true);
    expect(characteristicCurvePoints(100, 10000)).toHaveLength(201);
  });
});

describe("CharacteristicDiagram lesson equations and localization", () => {
  it("renders every step, including all final preset equations, with strict KaTeX", () => {
    for (const lang of ["zh", "en"] as const) {
      for (const selected of CHARACTERISTIC_PRESETS) {
        const steps = characteristicSteps(lang, selected);
        expect(steps).toHaveLength(CHARACTERISTIC_STEP_COUNT);
        for (const step of steps) {
          expect(step.description?.length).toBeGreaterThan(10);
          expect(() =>
            katex.renderToString(step.latex!, {
              throwOnError: true,
              strict: "error",
            })
          ).not.toThrow();
        }
      }
    }
  });

  it("keeps English descriptions and all formulas free of CJK", () => {
    for (const selected of CHARACTERISTIC_PRESETS) {
      for (const step of characteristicSteps("en", selected)) {
        expect(step.description).not.toMatch(/[\u3400-\u9fff]/);
        expect(step.latex).not.toMatch(/[\u3400-\u9fff]/);
      }
      for (const step of characteristicSteps("zh", selected)) {
        expect(step.latex).not.toMatch(/[\u3400-\u9fff]/);
      }
    }
  });

  it("states exact signed and singular final results and limits the real-root claim", () => {
    expect(characteristicSteps("en", 3)[5].latex).toContain("p(3)=-2");
    expect(characteristicSteps("en", 3)[5].latex).toContain("|p(3)|=2");
    expect(characteristicSteps("en", 2)[5].description).toContain(
      "singular (not invertible)"
    );
    expect(characteristicSteps("en", 0)[5].description).toContain(
      "is invertible"
    );
    expect(characteristicSteps("en", 5)[5].description).toContain(
      "need not have only real eigenvalues"
    );
    expect(characteristicSteps("zh", 5)[5].description).toContain(
      "一般矩陣的特徵值未必全為實數"
    );
  });

  it("falls back to the default exact preset when the step builder gets invalid input", () => {
    expect(characteristicSteps("en", NaN)).toEqual(
      characteristicSteps("en", 5)
    );
    expect(characteristicSteps("zh", 42)).toEqual(characteristicSteps("zh", 5));
  });
});

describe("CharacteristicDiagram accessible responsive SVG markup", () => {
  it("renders bilingual accessible SVGs, exact final geometry, and touch presets", () => {
    for (const lang of ["zh", "en"] as const) {
      const markup = renderToStaticMarkup(
        createElement(CharacteristicDiagram, {
          lang,
          variant: "matrix-char-poly",
        })
      );
      expect(markup).toContain('data-testid="knowledge-characteristic"');
      expect(markup).toContain('data-stage="5"');
      expect(markup).toContain('data-progress="1.000"');
      expect(markup).toContain('data-variant="matrix-char-poly"');
      expect(markup.match(/role="img"/g)).toHaveLength(2);
      expect(markup.match(/<title /g)).toHaveLength(2);
      expect(markup.match(/<desc /g)).toHaveLength(2);
      expect(markup.match(/viewBox="0 0 280 270"/g)).toHaveLength(2);
      expect(markup).toContain("grid-cols-1");
      expect(markup).toContain("sm:grid-cols-2");
      expect(markup).toContain("min-h-10");
      expect(markup).toContain('points="132,160 113,122 132,160 151,198"');
      expect(markup).not.toMatch(/(?:NaN|Infinity)/);
      if (lang === "en") expect(markup).not.toMatch(/[\u3400-\u9fff]/);
      else expect(markup).toContain("特徵多項式");
    }
  });

  it("keeps marker and accessible text IDs unique across simultaneous lessons", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(CharacteristicDiagram, { lang: "en" }),
        createElement(CharacteristicDiagram, { lang: "zh" })
      )
    );
    const ids = Array.from(
      markup.matchAll(/\bid="([^"]+)"/g),
      match => match[1]
    );
    expect(ids.length).toBeGreaterThanOrEqual(14);
    expect(new Set(ids).size).toBe(ids.length);
    const references = Array.from(
      markup.matchAll(/url\(#([^\)]+)\)/g),
      match => match[1]
    );
    expect(references.length).toBe(8);
    references.forEach(reference => expect(ids).toContain(reference));
  });
});
