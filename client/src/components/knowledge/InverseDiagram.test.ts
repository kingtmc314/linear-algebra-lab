import { describe, expect, it } from "vitest";
import katex from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InverseDiagram from "./InverseDiagram";
import {
  buildInverseModel,
  INVERSE_PRESETS,
  INVERSE_STEP_COUNT,
  inverseDeterminant,
  inverseDiagramFrame,
  inverseFractionLatex,
  inverseLessonSteps,
  inverseTransform,
  invertMatrix2,
  type InverseMatrix2,
  type InversePoint2,
} from "./InverseDiagram";

function expectPoint(actual: InversePoint2, expected: InversePoint2) {
  expect(actual[0]).toBeCloseTo(expected[0], 12);
  expect(actual[1]).toBeCloseTo(expected[1], 12);
}

function expectIdentityProduct(left: InverseMatrix2, right: InverseMatrix2) {
  expectPoint(inverseTransform(left, inverseTransform(right, [1, 0])), [1, 0]);
  expectPoint(inverseTransform(left, inverseTransform(right, [0, 1])), [0, 1]);
}

describe("InverseDiagram exact model", () => {
  it("computes the rational default inverse and transformed square exactly", () => {
    const model = buildInverseModel(INVERSE_PRESETS[0].matrix);
    expect(model.determinant).toBe(3);
    expect(model.inverse).toEqual([
      [2 / 3, -1 / 3],
      [-1 / 3, 2 / 3],
    ]);
    expect(model.transformed).toEqual([
      [0, 0],
      [2, 1],
      [3, 3],
      [1, 2],
    ]);
    expectIdentityProduct(model.matrix, model.inverse!);
    expectIdentityProduct(model.inverse!, model.matrix);
  });

  it("handles a negative determinant without rejecting its inverse", () => {
    const model = buildInverseModel(INVERSE_PRESETS[1].matrix);
    expect(model.determinant).toBe(-3);
    expect(model.inverse).toEqual([
      [-1 / 3, 2 / 3],
      [2 / 3, -1 / 3],
    ]);
    expectIdentityProduct(model.matrix, model.inverse!);
    expectIdentityProduct(model.inverse!, model.matrix);
  });

  it("keeps the original card example numerically correct", () => {
    const model = buildInverseModel([
      [2, 1],
      [5, 3],
    ]);
    expect(model.determinant).toBe(1);
    expect(model.inverse).toEqual([
      [3, -1],
      [-5, 2],
    ]);
    expectPoint(
      inverseTransform(model.inverse!, inverseTransform(model.matrix, [1, 1])),
      [1, 1]
    );
  });

  it("identifies singular line collapse and distinct inputs with a common image", () => {
    const model = buildInverseModel(INVERSE_PRESETS[2].matrix);
    expect(model.determinant).toBe(0);
    expect(model.inverse).toBeNull();
    const [p, q] = model.collision!;
    expect(p).not.toEqual(q);
    expect(inverseTransform(model.matrix, p)).toEqual(
      inverseTransform(model.matrix, q)
    );
    expect(model.transformed).toEqual([
      [0, 0],
      [1, 2],
      [2, 4],
      [1, 2],
    ]);
  });

  it("handles the zero matrix and a singular matrix with a zero first row", () => {
    for (const matrix of [
      INVERSE_PRESETS[3].matrix,
      [
        [0, 0],
        [2, -4],
      ],
    ] as const) {
      const model = buildInverseModel(matrix);
      const [p, q] = model.collision!;
      expect(model.inverse).toBeNull();
      expect(p).not.toEqual(q);
      expectPoint(inverseTransform(matrix, p), inverseTransform(matrix, q));
    }
    expect(buildInverseModel(INVERSE_PRESETS[3].matrix).transformed).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });

  it("rejects non-finite, non-integer, and unbounded demo entries", () => {
    for (const entry of [NaN, Infinity, -Infinity, 0.5, 9, -9]) {
      expect(() =>
        buildInverseModel([
          [entry, 0],
          [0, 1],
        ])
      ).toThrow(RangeError);
    }
    expect(
      invertMatrix2([
        [NaN, 0],
        [0, 1],
      ])
    ).toBeNull();
    expect(
      invertMatrix2([
        [Infinity, 0],
        [0, 1],
      ])
    ).toBeNull();
    expect(
      invertMatrix2([
        [1e308, 0],
        [0, 1e308],
      ])
    ).toBeNull();
    expect(
      invertMatrix2([
        [Number.MIN_VALUE, 0],
        [0, 1],
      ])
    ).toBeNull();
  });

  it("retains identity and reflection edge cases", () => {
    for (const matrix of [
      [
        [1, 0],
        [0, 1],
      ],
      [
        [-1, 0],
        [0, 1],
      ],
    ] as const) {
      const model = buildInverseModel(matrix);
      expectIdentityProduct(model.inverse!, matrix);
      expect(
        inverseDiagramFrame(model, { stage: 4, progress: 1 }).vertices
      ).toEqual(model.source);
    }
  });

  it("formats reduced exact fractions with normalized signs and no decimals", () => {
    expect(inverseFractionLatex(2, 3)).toBe(String.raw`\frac{2}{3}`);
    expect(inverseFractionLatex(2, -6)).toBe(String.raw`-\frac{1}{3}`);
    expect(inverseFractionLatex(-2, -6)).toBe(String.raw`\frac{1}{3}`);
    expect(inverseFractionLatex(-6, 3)).toBe("-2");
    expect(inverseFractionLatex(0, -3)).toBe("0");
    expect(() => inverseFractionLatex(1, 0)).toThrow(RangeError);
    expect(() => inverseFractionLatex(0.5, 2)).toThrow(RangeError);
    expect(() => inverseFractionLatex(Infinity)).toThrow(RangeError);
  });
});

describe("InverseDiagram shared-clock geometry", () => {
  it("continuously deforms the source into A's actual column parallelogram", () => {
    const model = buildInverseModel(INVERSE_PRESETS[0].matrix);
    const start = inverseDiagramFrame(model, { stage: 1, progress: 0 });
    const middle = inverseDiagramFrame(model, { stage: 1, progress: 0.5 });
    const end = inverseDiagramFrame(model, { stage: 1, progress: 1 });
    expect(start.vertices).toEqual(model.source);
    expect(middle.vertices).toEqual([
      [0, 0],
      [1.5, 0.5],
      [2, 2],
      [0.5, 1.5],
    ]);
    expect(end.vertices).toEqual(model.transformed);
    expect(middle.vertices).not.toEqual(start.vertices);
    expect(middle.vertices).not.toEqual(end.vertices);
  });

  it("applies the actual inverse to move the image back to the square", () => {
    const model = buildInverseModel(INVERSE_PRESETS[0].matrix);
    const start = inverseDiagramFrame(model, { stage: 3, progress: 0 });
    const middle = inverseDiagramFrame(model, { stage: 3, progress: 0.5 });
    const end = inverseDiagramFrame(model, { stage: 3, progress: 1 });
    expect(start.vertices).toEqual(model.transformed);
    middle.vertices.forEach((point, index) =>
      expectPoint(point, [
        (model.transformed[index][0] + model.source[index][0]) / 2,
        (model.transformed[index][1] + model.source[index][1]) / 2,
      ])
    );
    expect(end.vertices).toEqual(model.source);
    expect(
      inverseDiagramFrame(model, { stage: 4, progress: 1 }).vertices
    ).toEqual(model.source);
  });

  it("is continuous at stage boundaries for each preset", () => {
    for (const preset of INVERSE_PRESETS) {
      const model = buildInverseModel(preset.matrix);
      for (let stage = 0; stage < INVERSE_STEP_COUNT - 1; stage++) {
        const previous = inverseDiagramFrame(model, { stage, progress: 1 });
        const next = inverseDiagramFrame(model, {
          stage: stage + 1,
          progress: 0,
        });
        expect(next.vertices).toEqual(previous.vertices);
      }
    }
  });

  it("never restores a singular shape or exposes a fictitious inverse", () => {
    for (const preset of INVERSE_PRESETS.slice(2)) {
      const model = buildInverseModel(preset.matrix);
      for (const stage of [2, 3, 4]) {
        for (const progress of [0, 0.5, 1]) {
          const scene = inverseDiagramFrame(model, { stage, progress });
          expect(scene.returnAvailable).toBe(false);
          expect(scene.returnProgress).toBe(0);
          expect(scene.vertices).toEqual(model.transformed);
          expect(scene.vertices).not.toEqual(model.source);
          expectPoint(scene.collisionPoints[0], scene.collisionPoints[1]);
        }
      }
    }
  });

  it("does not confuse a reflection interpolation collapse with target singularity", () => {
    const model = buildInverseModel([
      [-1, 0],
      [0, 1],
    ]);
    const frame = inverseDiagramFrame(model, { stage: 1, progress: 0.5 });
    expect(model.determinant).toBe(-1);
    expect(frame.vertices[1]).toEqual([0, 0]);
    expect(frame.returnAvailable).toBe(true);
    expect(
      inverseDiagramFrame(model, { stage: 4, progress: 1 }).vertices
    ).toEqual(model.source);
  });

  it("produces finite bounded frames even with invalid clock values", () => {
    for (const preset of INVERSE_PRESETS) {
      const model = buildInverseModel(preset.matrix);
      for (const stage of [-50, 0, 1, 2, 3, 4, 500, NaN, Infinity]) {
        for (const progress of [-2, 0, 0.5, 1, 9, NaN, Infinity]) {
          const frame = inverseDiagramFrame(model, { stage, progress });
          expect(frame.vertices.flat().every(Number.isFinite)).toBe(true);
          expect(frame.columns.flat().every(Number.isFinite)).toBe(true);
          expect(frame.progress).toBeGreaterThanOrEqual(0);
          expect(frame.progress).toBeLessThanOrEqual(1);
          expect(frame.stage).toBeGreaterThanOrEqual(0);
          expect(frame.stage).toBeLessThan(INVERSE_STEP_COUNT);
        }
      }
    }
  });
});

describe("InverseDiagram exact synchronized equations", () => {
  it("renders every preset's bilingual step equations as valid KaTeX", () => {
    for (const preset of INVERSE_PRESETS) {
      for (const lang of ["zh", "en"] as const) {
        const steps = inverseLessonSteps(
          buildInverseModel(preset.matrix),
          lang
        );
        expect(steps).toHaveLength(INVERSE_STEP_COUNT);
        for (const step of steps) {
          expect(step.latex).toBeTruthy();
          expect(() =>
            katex.renderToString(step.latex!, { throwOnError: true })
          ).not.toThrow();
          if (lang === "en")
            expect(`${step.description}${step.latex}`).not.toMatch(
              /[\u3400-\u9fff]/u
            );
        }
        expect(() =>
          katex.renderToString(steps.at(-1)!.latex!, { throwOnError: true })
        ).not.toThrow();
      }
    }
  });

  it("includes exact rational entries and matches geometric column endpoints", () => {
    const model = buildInverseModel(INVERSE_PRESETS[0].matrix);
    const steps = inverseLessonSteps(model, "en");
    expect(steps[1].latex).toContain(
      String.raw`\begin{bmatrix}2&1\\1&2\end{bmatrix}`
    );
    expect(steps[2].latex).toContain(
      String.raw`\begin{bmatrix}\frac{2}{3}&-\frac{1}{3}\\-\frac{1}{3}&\frac{2}{3}\end{bmatrix}`
    );
    expect(steps[4].latex).toContain(String.raw`A^{-1}A=`);
    expect(steps[4].latex).toContain(String.raw`AA^{-1}=I_2`);
    expect(steps[2].latex).not.toMatch(/0\.\d/);
  });

  it("singular final equations state nonexistence rather than an identity product", () => {
    for (const preset of INVERSE_PRESETS.slice(2)) {
      const steps = inverseLessonSteps(buildInverseModel(preset.matrix), "en");
      expect(steps[2].latex).toContain(String.raw`\det(A)=0`);
      expect(steps[3].latex).toContain("AP=AQ");
      expect(steps[4].latex).toContain(String.raw`\nexists\,A^{-1}`);
      expect(steps[4].latex).not.toContain("=I");
    }
  });

  it("computes determinant from the selected example rather than interpolated geometry", () => {
    for (const preset of INVERSE_PRESETS) {
      const determinant = inverseDeterminant(preset.matrix);
      const steps = inverseLessonSteps(buildInverseModel(preset.matrix), "en");
      expect(steps[1].latex).toContain(`\\det(A)=${determinant}`);
    }
  });
});

describe("InverseDiagram responsive SVG integration", () => {
  it("renders the shared player at the exact final square with accessible English SVG", () => {
    const html = renderToStaticMarkup(
      createElement(InverseDiagram, { lang: "en", variant: "matrix-inverse" })
    );
    expect(html).toContain('data-testid="knowledge-inverse"');
    expect(html).toContain('data-stage="4"');
    expect(html).toContain('data-progress="1.000"');
    expect(html).toContain('viewBox="0 0 560 340"');
    expect(html).toContain('width="100%"');
    expect(html).toContain('role="img"');
    expect(html).toContain("<title");
    expect(html).toContain("<desc");
    expect(html).toContain('data-testid="inverse-current-shape"');
    expect(html).toContain("A⁻¹A = I₂");
    expect(html).not.toMatch(/[\u3400-\u9fff]/u);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });

  it("localizes Chinese content and allocates unique markers for multiple instances", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(InverseDiagram, { lang: "zh" }),
        createElement(InverseDiagram, { lang: "en" })
      )
    );
    expect(html).toContain("逆矩陣：變換，再還原");
    expect(html).toContain("奇異：壓成直線");
    const ids = [...html.matchAll(/<marker id="([^"]+)"/g)].map(
      match => match[1]
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(html).toContain(`url(#${id})`);
  });
});
