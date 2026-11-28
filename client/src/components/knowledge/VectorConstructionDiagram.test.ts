import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import VectorConstructionDiagram, {
  VECTOR_CONSTRUCTION_PRESETS,
  VECTOR_CONSTRUCTION_STEP_COUNT,
  VECTOR_CONSTRUCTION_VARIANTS,
  addVectors,
  subtractVectors,
  vectorMagnitude,
  normalizeVector,
  buildVectorConstructionModel,
  exactVectorLengthLatex,
  exactUnitVectorLatex,
  createVectorConstructionSteps,
  vectorStageProgress,
  vectorConstructionGeometry,
  vectorConstructionViewport,
  type Vector2,
} from "./VectorConstructionDiagram";

const finalFrame = { stage: 4, progress: 1, playing: false };
const sample = buildVectorConstructionModel([3, 4]);
const addition = buildVectorConstructionModel([3, 1], [1, 4]);
const subtraction = buildVectorConstructionModel([3, 1], [1, 4], "subtract");

function expectFiniteTree(value: unknown): void {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(expectFiniteTree);
  else if (value && typeof value === "object")
    Object.values(value).forEach(expectFiniteTree);
}

describe("vector construction numeric model", () => {
  it("matches the card addition and the directed tip difference", () => {
    expect(addVectors([3, 1], [1, 4])).toEqual([4, 5]);
    expect(subtractVectors([3, 1], [1, 4])).toEqual([2, -3]);
    expect(subtractVectors([1, 4], [3, 1])).toEqual([-2, 3]);
    expect(addition.result).toEqual([4, 5]);
    expect(subtraction.result).toEqual([2, -3]);
  });

  it("gives the exact 3-4-5 example and rational normalization", () => {
    expect(sample.squaredLength).toBe(25);
    expect(sample.magnitude).toBe(5);
    expect(sample.unit).toEqual([3 / 5, 4 / 5]);
    expect(exactVectorLengthLatex([3, 4])).toBe("5");
    expect(exactUnitVectorLatex([3, 4])).toBe(
      String.raw`\begin{pmatrix}\frac{3}{5}\\\frac{4}{5}\end{pmatrix}`
    );
  });

  it("preserves signs and direction while normalizing", () => {
    const v: Vector2 = [-3, 4],
      normalized = normalizeVector(v)!;
    expect(normalized).toEqual([-3 / 5, 4 / 5]);
    expect(Math.hypot(...normalized)).toBeCloseTo(1, 14);
    expect(v[0] * normalized[1] - v[1] * normalized[0]).toBeCloseTo(0, 14);
    expect(v[0] * normalized[0] + v[1] * normalized[1]).toBeGreaterThan(0);
    expect(exactUnitVectorLatex(v)).toContain(String.raw`-\frac{3}{5}`);
  });

  it("handles axis-aligned vectors with zero components", () => {
    expect(vectorMagnitude([0, -4])).toBe(4);
    expect(normalizeVector([0, -4])).toEqual([0, -1]);
    expect(exactUnitVectorLatex([0, -4])).toBe(
      String.raw`\begin{pmatrix}0\\-1\end{pmatrix}`
    );
    expect(exactUnitVectorLatex([6, 0])).toBe(
      String.raw`\begin{pmatrix}1\\0\end{pmatrix}`
    );
  });

  it("does not invent a unit vector for zero or a direction for cancellation", () => {
    expect(vectorMagnitude([0, 0])).toBe(0);
    expect(normalizeVector([0, 0])).toBeNull();
    expect(exactUnitVectorLatex([0, 0])).toBeNull();
    expect(exactVectorLengthLatex([0, 0])).toBe("0");
    expect(buildVectorConstructionModel([3, 1], [-3, -1]).result).toEqual([
      0, 0,
    ]);
    expect(subtractVectors([3, 1], [3, 1])).toEqual([0, 0]);
  });

  it("simplifies exact radicals instead of presenting approximate decimals", () => {
    expect(exactVectorLengthLatex([1, 1])).toBe(String.raw`\sqrt{2}`);
    expect(exactVectorLengthLatex([2, 2])).toBe(String.raw`2\sqrt{2}`);
    expect(exactVectorLengthLatex([1, 2])).toBe(String.raw`\sqrt{5}`);
    expect(exactVectorLengthLatex([6, 6])).toBe(String.raw`6\sqrt{2}`);
    expect(exactUnitVectorLatex([1, 1])).toContain(
      String.raw`\frac{1}{\sqrt{2}}`
    );
  });

  it("guards non-finite, nonintegral, and out-of-domain components", () => {
    const invalid: Vector2[] = [
      [NaN, 1],
      [Infinity, 0],
      [-Infinity, 0],
      [7, 0],
      [-7, 0],
      [0.5, 1],
    ];
    for (const v of invalid) {
      expect(() => buildVectorConstructionModel(v)).toThrow(RangeError);
      expect(() => normalizeVector(v)).toThrow(RangeError);
      expect(() => exactVectorLengthLatex(v)).toThrow(RangeError);
      expect(() => addVectors([0, 0], v)).toThrow(RangeError);
    }
    expect(addVectors([6, 6], [6, 6])).toEqual([12, 12]);
  });

  it("does not mutate caller coordinates", () => {
    const a = Object.freeze([3, 4]) as Vector2,
      b = Object.freeze([1, 2]) as Vector2;
    buildVectorConstructionModel(a, b);
    expect(a).toEqual([3, 4]);
    expect(b).toEqual([1, 2]);
  });
});

describe("synchronized construction geometry", () => {
  it("really grows the directed vector during the definition stage", () => {
    const start = vectorConstructionGeometry("vec-def", sample, {
      stage: 0,
      progress: 0,
      playing: true,
    });
    const middle = vectorConstructionGeometry("vec-def", sample, {
      stage: 0,
      progress: 0.5,
      playing: true,
    });
    const end = vectorConstructionGeometry("vec-def", sample, {
      stage: 0,
      progress: 1,
      playing: true,
    });
    expect(start.vectorTip).toEqual([0, 0]);
    expect(middle.vectorTip).toEqual([1.5, 2]);
    expect(end.vectorTip).toEqual([3, 4]);
  });

  it("constructs horizontal then vertical components at matching steps", () => {
    const horizontal = vectorConstructionGeometry("vec-def", sample, {
      stage: 1,
      progress: 0.5,
      playing: false,
    });
    const vertical = vectorConstructionGeometry("vec-def", sample, {
      stage: 2,
      progress: 0.5,
      playing: false,
    });
    expect(horizontal.horizontalTip).toEqual([1.5, 0]);
    expect(horizontal.verticalOpacity).toBe(0);
    expect(vertical.horizontalTip).toEqual([3, 0]);
    expect(vertical.verticalTip).toEqual([3, 2]);
    expect(vertical.lengthOpacity).toBe(0);
  });

  it("translates b tip-to-tail without changing its displacement", () => {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const geometry = vectorConstructionGeometry("vec-add", addition, {
        stage: 1,
        progress,
        playing: true,
      });
      expect(geometry.secondTip[0] - geometry.secondTail[0]).toBe(1);
      expect(geometry.secondTip[1] - geometry.secondTail[1]).toBe(4);
    }
    const end = vectorConstructionGeometry("vec-add", addition, finalFrame);
    expect(end.secondTail).toEqual([3, 1]);
    expect(end.secondTip).toEqual([4, 5]);
    expect(end.resultTip).toEqual([4, 5]);
  });

  it("reverses b before translating -b and ends the tip difference at a", () => {
    const reversed = vectorConstructionGeometry("vec-add", subtraction, {
      stage: 1,
      progress: 0.5,
      playing: true,
    });
    expect(reversed.secondTail).toEqual([0, 0]);
    expect(reversed.secondTip).toEqual([-1, -4]);
    const end = vectorConstructionGeometry("vec-add", subtraction, finalFrame);
    expect(end.secondTail).toEqual([3, 1]);
    expect(end.secondTip).toEqual([2, -3]);
    expect(end.tipDifferenceTip).toEqual([3, 1]);
    expect(end.tipDifferenceTip[0] - subtraction.b[0]).toBe(2);
    expect(end.tipDifferenceTip[1] - subtraction.b[1]).toBe(-3);
  });

  it("shrinks along the same ray to the exact unit endpoint", () => {
    const middle = vectorConstructionGeometry("vec-unit", sample, {
      stage: 3,
      progress: 0.5,
      playing: false,
    });
    expect(middle.vectorTip[0]).toBeCloseTo(1.8);
    expect(middle.vectorTip[1]).toBeCloseTo(2.4);
    expect(middle.vectorTip[0] * 4 - middle.vectorTip[1] * 3).toBeCloseTo(0);
    const end = vectorConstructionGeometry("vec-unit", sample, finalFrame);
    expect(end.vectorTip[0]).toBeCloseTo(3 / 5, 14);
    expect(end.vectorTip[1]).toBeCloseTo(4 / 5, 14);
    expect(end.unitCircleOpacity).toBe(1);
  });

  it("translates the definition arrow without changing its vector", () => {
    const start = vectorConstructionGeometry("vec-def", sample, {
      stage: 4,
      progress: 0,
      playing: false,
    });
    const end = vectorConstructionGeometry("vec-def", sample, finalFrame);
    expect(start.translatedTail).toEqual([0, 0]);
    expect(end.translatedTail).toEqual([-1, 1]);
    expect(end.translatedTip).toEqual([2, 5]);
  });

  it("rotates the length segment while preserving its length", () => {
    for (const progress of [0, 0.2, 0.5, 1]) {
      const geometry = vectorConstructionGeometry("vec-magnitude", sample, {
        stage: 4,
        progress,
        playing: true,
      });
      expect(Math.hypot(...geometry.measurementTip)).toBeCloseTo(5, 14);
    }
    expect(
      vectorConstructionGeometry("vec-magnitude", sample, finalFrame)
        .measurementTip
    ).toEqual([5, 0]);
  });

  it("keeps every preset, operation, stage, and invalid clock frame finite", () => {
    for (const preset of VECTOR_CONSTRUCTION_PRESETS) {
      for (const variant of VECTOR_CONSTRUCTION_VARIANTS) {
        for (const operation of ["add", "subtract"] as const) {
          const model = buildVectorConstructionModel(
            variant === "vec-add" ? preset.a : preset.v,
            variant === "vec-add" ? preset.b : [0, 0],
            operation
          );
          for (const stage of [-2, 0, 1, 2, 3, 4, 20, NaN, Infinity]) {
            for (const progress of [-1, 0, 0.5, 1, 3, NaN, Infinity]) {
              expectFiniteTree(
                vectorConstructionGeometry(variant, model, {
                  stage,
                  progress,
                  playing: true,
                })
              );
            }
          }
        }
      }
    }
    const zero = buildVectorConstructionModel([0, 0]);
    expect(
      vectorConstructionGeometry("vec-unit", zero, finalFrame).unitCircleOpacity
    ).toBe(0);
  });

  it("clamps stage progress and uses an equal, finite axis scale including zero", () => {
    expect(
      vectorStageProgress({ stage: 2, progress: 0.4, playing: false }, 1)
    ).toBe(1);
    expect(
      vectorStageProgress({ stage: 2, progress: 0.4, playing: false }, 3)
    ).toBe(0);
    expect(
      vectorStageProgress({ stage: 2, progress: 2, playing: false }, 2)
    ).toBe(1);
    expect(
      vectorStageProgress({ stage: NaN, progress: NaN, playing: false }, 0)
    ).toBe(0);
    const viewport = vectorConstructionViewport([
      [0, 0],
      [3, 4],
      [-3, -4],
    ]);
    const o = viewport.project([0, 0]),
      x = viewport.project([1, 0]),
      y = viewport.project([0, 1]);
    expect(x[0] - o[0]).toBeCloseTo(o[1] - y[1]);
    expectFiniteTree(viewport);
    expectFiniteTree(vectorConstructionViewport([]));
    expectFiniteTree(vectorConstructionViewport([[NaN, Infinity]]));
  });
});

describe("exact equations and responsive accessible output", () => {
  it("has five synchronized localized steps for all presets and operations", () => {
    for (const variant of VECTOR_CONSTRUCTION_VARIANTS) {
      for (const preset of VECTOR_CONSTRUCTION_PRESETS) {
        for (const operation of ["add", "subtract"] as const) {
          const model = buildVectorConstructionModel(
            variant === "vec-add" ? preset.a : preset.v,
            variant === "vec-add" ? preset.b : [0, 0],
            operation
          );
          const en = createVectorConstructionSteps(variant, model, "en");
          const zh = createVectorConstructionSteps(variant, model, "zh");
          expect(en).toHaveLength(VECTOR_CONSTRUCTION_STEP_COUNT);
          expect(zh).toHaveLength(VECTOR_CONSTRUCTION_STEP_COUNT);
          for (const step of en) {
            expect(step.description).not.toMatch(/[\u3400-\u9fff]/);
            expect(step.latex).not.toMatch(/[\u3400-\u9fff]/);
            expect(step.description).toBeTruthy();
          }
          expect(en[0].description).not.toBe(zh[0].description);
        }
      }
    }
  });

  it("renders every formula, including signed and zero finals, in strict KaTeX", () => {
    for (const variant of VECTOR_CONSTRUCTION_VARIANTS) {
      for (const preset of VECTOR_CONSTRUCTION_PRESETS) {
        for (const operation of ["add", "subtract"] as const) {
          const model = buildVectorConstructionModel(
            variant === "vec-add" ? preset.a : preset.v,
            variant === "vec-add" ? preset.b : [0, 0],
            operation
          );
          for (const lang of ["zh", "en"] as const) {
            for (const step of createVectorConstructionSteps(
              variant,
              model,
              lang
            )) {
              expect(() =>
                katex.renderToString(step.latex!, {
                  throwOnError: true,
                  strict: "error",
                })
              ).not.toThrow();
            }
          }
        }
      }
    }
    for (const v of [
      [1, 1],
      [-2, 2],
      [6, 6],
    ] as const) {
      expect(() =>
        katex.renderToString(exactUnitVectorLatex(v)!, { throwOnError: true })
      ).not.toThrow();
    }
  });

  it("keeps final equations exact and shows the undefined zero guard", () => {
    expect(
      createVectorConstructionSteps("vec-add", addition, "en")[4].latex
    ).toContain(String.raw`\begin{pmatrix}4\\5\end{pmatrix}`);
    expect(
      createVectorConstructionSteps("vec-add", subtraction, "en")[4].latex
    ).toContain(String.raw`\overrightarrow{BA}`);
    const unit = createVectorConstructionSteps("vec-unit", sample, "en");
    expect(unit[3].latex).toContain(String.raw`\frac{3}{5}`);
    expect(unit[4].latex).toContain(String.raw`\frac{25}{25}=1`);
    expect(unit[4].latex).not.toContain("0.6");
    const zero = createVectorConstructionSteps(
      "vec-unit",
      buildVectorConstructionModel([0, 0]),
      "en"
    );
    expect(zero[3].latex).toContain("undefined");
    expect(zero[4].latex).not.toMatch(/\\frac\{[^}]*\}\{0\}/);
  });

  it("renders all variants as accessible responsive SVGs at final stage", () => {
    for (const variant of VECTOR_CONSTRUCTION_VARIANTS) {
      const html = renderToStaticMarkup(
        createElement(VectorConstructionDiagram, { lang: "en", variant })
      );
      expect(html).toContain('data-testid="knowledge-vector-construction"');
      expect(html).toContain('data-stage="4"');
      expect(html).toContain('data-progress="1.000"');
      expect(html).toContain('viewBox="0 0 560 340"');
      expect(html).toContain('width="100%"');
      expect(html).toContain('role="img"');
      expect(html).toContain("aria-labelledby");
      expect(html).toContain("<title");
      expect(html).toContain("<desc");
      expect(html).not.toMatch(/[\u3400-\u9fff]/);
      expect(html).not.toMatch(/NaN|Infinity|Camera|<img/);
    }
  });

  it("uses different marker IDs for multiple diagrams and localizes Chinese", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(VectorConstructionDiagram, {
          lang: "en",
          variant: "vec-add",
        }),
        createElement(VectorConstructionDiagram, {
          lang: "zh",
          variant: "vec-def",
        })
      )
    );
    const markers = [...html.matchAll(/<marker[^>]+id="([^"]+)"/g)].map(
      match => match[1]
    );
    expect(markers).toHaveLength(10);
    expect(new Set(markers).size).toBe(10);
    expect(html).toContain("向量構造動畫");
    const fallback = renderToStaticMarkup(
      createElement(VectorConstructionDiagram, {
        lang: "en",
        variant: "unknown",
      })
    );
    expect(fallback).toContain('data-variant="vec-def"');
  });
});
