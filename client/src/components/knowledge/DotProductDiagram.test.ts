import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { describe, expect, it } from "vitest";
import DotProductDiagram, {
  DOT_PRODUCT_CARD_LATEX,
  DOT_PRODUCT_PRESETS,
  DOT_PRODUCT_STEP_COUNT,
  dotAngleArc,
  dotGeometry,
  dotProduct,
  dotProductSteps,
  dotVisualFrame,
} from "./DotProductDiagram";

describe("DotProductDiagram exact numerical model", () => {
  it("matches the original three-dimensional arithmetic card", () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(DOT_PRODUCT_CARD_LATEX).toContain("4+10+18=32");
  });

  it("computes the exact 45-degree example and signed projection", () => {
    const model = dotGeometry([1, 0], [1, 1]);
    expect(model.dot).toBe(1);
    expect(model.magnitudeA).toBe(1);
    expect(model.magnitudeB).toBe(Math.sqrt(2));
    expect(model.cosine).toBeCloseTo(Math.sqrt(2) / 2);
    expect(model.angle).toBeCloseTo(Math.PI / 4);
    expect(model.signedProjection).toBe(1);
    expect(model.projection).toEqual([1, 0]);
    expect(model.perpendicular).toEqual([0, 1]);
    expect(model.sign).toBe("positive");
  });

  it("distinguishes a negative projection and an obtuse angle", () => {
    const model = dotGeometry([1, 0], [-1, 1]);
    expect(model.dot).toBe(-1);
    expect(model.projection).toEqual([-1, -0]);
    expect(model.signedProjection).toBe(-1);
    expect(model.angle).toBeCloseTo((3 * Math.PI) / 4);
    expect(model.sign).toBe("negative");
  });

  it("handles a perpendicular nonzero pair without a nonzero arrow", () => {
    const model = dotGeometry([1, 0], [0, 1]);
    expect(model.dot).toBe(0);
    expect(model.cosine).toBe(0);
    expect(model.angle).toBe(Math.PI / 2);
    expect(model.projection).toEqual([0, 0]);
    expect(model.sign).toBe("zero");
  });

  it("handles same and opposite directions exactly", () => {
    expect(dotGeometry([1, 0], [1, 0]).angle).toBe(0);
    expect(dotGeometry([1, 0], [-1, 0]).angle).toBe(Math.PI);
    expect(dotGeometry([1, 0], [-1, 0]).cosine).toBe(-1);
  });

  it("does not define projection or angle onto a zero vector", () => {
    const model = dotGeometry([0, 0], [1, 1]);
    expect(model.dot).toBe(0);
    expect(model.angle).toBeNull();
    expect(model.cosine).toBeNull();
    expect(model.projection).toBeNull();
    expect(model.signedProjection).toBeNull();
    expect(model.sign).toBe("undefined");
  });

  it("defines the zero-vector projection onto nonzero a, but not its angle", () => {
    const model = dotGeometry([1, 0], [0, 0]);
    expect(model.dot).toBe(0);
    expect(model.projection).toEqual([0, 0]);
    expect(model.angle).toBeNull();
    expect(model.cosine).toBeNull();
    expect(model.sign).toBe("zero");
  });

  it("handles two zero vectors without division by zero", () => {
    const model = dotGeometry([0, 0], [0, 0]);
    expect(model.dot).toBe(0);
    expect(model.angle).toBeNull();
    expect(model.projection).toBeNull();
  });

  it("projects in an arbitrary direction, not just along the x-axis", () => {
    const model = dotGeometry([3, 4], [4, -3]);
    expect(model.magnitudeA).toBe(5);
    expect(model.magnitudeB).toBe(5);
    expect(model.dot).toBe(0);
    expect(model.angle).toBe(Math.PI / 2);
    expect(model.projection).toEqual([0, 0]);
    const other = dotGeometry([3, 4], [1, 0]);
    expect(other.projection?.[0]).toBeCloseTo(9 / 25);
    expect(other.projection?.[1]).toBeCloseTo(12 / 25);
    expect(dotProduct(other.perpendicular!, [3, 4])).toBeCloseTo(0);
    expect(other.magnitudeA * other.signedProjection!).toBeCloseTo(other.dot);
  });

  it("rejects empty/mismatched dimensions, nonfinite input and overflow", () => {
    expect(() => dotProduct([], [])).toThrow(RangeError);
    expect(() => dotProduct([1], [1, 2])).toThrow(RangeError);
    expect(() => dotGeometry([NaN, 1], [1, 1])).toThrow(RangeError);
    expect(() => dotGeometry([1, 1], [Infinity, 1])).toThrow(RangeError);
    expect(() => dotProduct([Number.MAX_VALUE], [2])).toThrow(RangeError);
    expect(() =>
      dotGeometry([Number.MAX_VALUE, Number.MAX_VALUE], [0, 0])
    ).toThrow(RangeError);
  });

  it("preserves projection decomposition for every selectable preset", () => {
    for (const preset of DOT_PRODUCT_PRESETS) {
      const model = dotGeometry(preset.a, preset.b);
      if (model.projection && model.perpendicular) {
        for (let axis = 0; axis < 2; axis++) {
          expect(
            model.projection[axis] + model.perpendicular[axis]
          ).toBeCloseTo(preset.b[axis]);
        }
        expect(dotProduct(preset.a, model.perpendicular)).toBeCloseTo(0);
      }
      if (model.cosine !== null) {
        expect(model.magnitudeA * model.magnitudeB * model.cosine).toBeCloseTo(
          model.dot
        );
      }
    }
  });
});

describe("DotProductDiagram synchronized visual frames", () => {
  it("grows the vectors in stage zero", () => {
    const model = dotGeometry([1, 0], [1, 1]);
    expect(dotVisualFrame(model, { stage: 0, progress: 0 }).vectorB).toEqual([
      0, 0,
    ]);
    expect(dotVisualFrame(model, { stage: 0, progress: 0.5 }).vectorB).toEqual([
      0.5, 0.5,
    ]);
    expect(dotVisualFrame(model, { stage: 0, progress: 1 }).vectorB).toEqual([
      1, 1,
    ]);
  });

  it("reveals the angle, drops the perpendicular, then grows signed projection", () => {
    const model = dotGeometry([1, 0], [-1, 1]);
    const angle = dotVisualFrame(model, { stage: 1, progress: 0.5 });
    expect(angle.arcAngle).toBeCloseTo((3 * Math.PI) / 8);
    expect(angle.projectionOpacity).toBe(0);
    const drop = dotVisualFrame(model, { stage: 2, progress: 0.5 });
    expect(drop.dropStart).toEqual([-1, 1]);
    expect(drop.dropEnd).toEqual([-1, 0.5]);
    const projection = dotVisualFrame(model, { stage: 3, progress: 0.5 });
    expect(projection.projectionEnd).toEqual([-0.5, -0]);
    expect(projection.dropEnd).toEqual([-1, 0]);
  });

  it("matches the exact model at the final frame and changes final geometry", () => {
    const model = dotGeometry([1, 0], [1, 1]);
    const beginning = dotVisualFrame(model, { stage: 4, progress: 0 });
    const final = dotVisualFrame(model, { stage: 4, progress: 1 });
    expect(final.vectorA).toEqual(model.a);
    expect(final.vectorB).toEqual(model.b);
    expect(final.dropEnd).toEqual(model.projection);
    expect(final.projectionEnd).toEqual(model.projection);
    expect(final.arcAngle).toBe(model.angle);
    expect(final.resultOpacity).toBe(1);
    expect(final.arcRadius).toBeGreaterThan(beginning.arcRadius);
  });

  it("keeps stage boundaries geometrically continuous", () => {
    const model = dotGeometry([1, 0], [1, 1]);
    for (let stage = 0; stage < DOT_PRODUCT_STEP_COUNT - 1; stage++) {
      expect(dotVisualFrame(model, { stage, progress: 1 })).toEqual(
        dotVisualFrame(model, { stage: stage + 1, progress: 0 })
      );
    }
  });

  it("keeps all preset frames finite, including invalid playback inputs", () => {
    for (const preset of DOT_PRODUCT_PRESETS) {
      const model = dotGeometry(preset.a, preset.b);
      for (const stage of [-5, 0, 1, 2, 3, 4, 99, NaN, Infinity]) {
        for (const progress of [-1, 0, 0.5, 1, 2, NaN, Infinity]) {
          const frame = dotVisualFrame(model, { stage, progress });
          const numbers = Object.values(frame).flat();
          expect(
            numbers.every(
              value => typeof value === "number" && Number.isFinite(value)
            )
          ).toBe(true);
          if (model.angle === null) expect(frame.arcOpacity).toBe(0);
          if (model.projection === null)
            expect(frame.projectionOpacity).toBe(0);
        }
      }
    }
  });

  it("handles empty and half-circle SVG arcs without invalid coordinates", () => {
    expect(dotAngleArc(0, 40)).toBe("");
    expect(dotAngleArc(Math.PI, 0)).toBe("");
    expect(dotAngleArc(NaN, 40)).toBe("");
    expect(dotAngleArc(Math.PI, 40)).toContain("A 40 40 0 0 0 -40");
    expect(dotAngleArc(Math.PI / 4, 40)).not.toMatch(/NaN|Infinity/);
    expect(dotAngleArc(Math.PI / 2, 40, Math.PI / 2)).not.toMatch(
      /NaN|Infinity/
    );
  });
});

describe("DotProductDiagram lesson and SVG contract", () => {
  it("produces five valid KaTeX steps for every preset, language and variant", () => {
    expect(() =>
      katex.renderToString(DOT_PRODUCT_CARD_LATEX, { throwOnError: true })
    ).not.toThrow();
    for (const preset of DOT_PRODUCT_PRESETS) {
      for (const lang of ["zh", "en"] as const) {
        for (const variant of ["vec-dot", "vec-angle"]) {
          const steps = dotProductSteps(preset.id, lang, variant);
          expect(steps).toHaveLength(DOT_PRODUCT_STEP_COUNT);
          for (const step of steps) {
            expect(step.description).toBeTruthy();
            expect(() =>
              katex.renderToString(step.latex!, {
                throwOnError: true,
                strict: "error",
              })
            ).not.toThrow();
            if (lang === "en")
              expect(`${step.description}${step.latex}`).not.toMatch(
                /[\u3400-\u9fff]/
              );
          }
        }
      }
    }
  });

  it("uses exact radical cosine values instead of interpolated decimals", () => {
    const positive = dotProductSteps("positive", "en", "vec-angle")[4].latex!;
    const negative = dotProductSteps("negative", "en", "vec-angle")[4].latex!;
    expect(positive).toContain(String.raw`\frac{\sqrt{2}}{2}`);
    expect(positive).toContain(String.raw`45^\circ`);
    expect(negative).toContain(String.raw`-\frac{\sqrt{2}}{2}`);
    expect(negative).toContain(String.raw`135^\circ`);
    expect(positive).not.toContain("0.707");
  });

  it("guards both zero-vector final equations and avoids claiming 90 degrees", () => {
    for (const preset of ["zero-a", "zero-b"] as const) {
      const steps = dotProductSteps(preset, "en", "vec-angle");
      expect(steps[4].latex).toContain(String.raw`\theta=\text{undefined}`);
      expect(steps[4].latex).not.toContain(String.raw`90^\circ`);
      expect(steps[4].description).toContain("does not form a 90° angle");
    }
    expect(dotProductSteps("zero-a", "en")[2].latex).toContain("undefined");
    expect(dotProductSteps("zero-b", "en")[2].latex).toContain("(0,0)");
  });

  it("renders responsive accessible English SVG and the original arithmetic separately", () => {
    const html = renderToStaticMarkup(
      createElement(DotProductDiagram, { lang: "en", variant: "vec-dot" })
    );
    expect(html).toContain('data-testid="knowledge-dot-product"');
    expect(html).toContain('viewBox="0 0 560 340"');
    expect(html).toContain('width="100%"');
    expect(html).toContain('role="img"');
    expect(html).toContain("<title");
    expect(html).toContain("<desc");
    expect(html).toContain("Separate 2D numerical demo");
    expect(html).toContain("32");
    expect(html).toContain('data-stage="4"');
    expect(html).not.toMatch(/[\u3400-\u9fff]|NaN|Infinity/);
  });

  it("renders the bilingual angle variant and uniquely scoped SVG markers", () => {
    const english = renderToStaticMarkup(
      createElement(DotProductDiagram, { lang: "en", variant: "vec-angle" })
    );
    const chinese = renderToStaticMarkup(
      createElement(DotProductDiagram, { lang: "zh", variant: "vec-angle" })
    );
    expect(english).toContain("Signed projection and vector angle");
    expect(chinese).toContain("有號投影與向量夾角");
    expect(chinese).toContain("45°");
    const combined = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(DotProductDiagram, { lang: "en" }),
        createElement(DotProductDiagram, { lang: "en" })
      )
    );
    const markerIds = Array.from(
      combined.matchAll(/<marker id="([^"]+)"/g),
      match => match[1]
    );
    expect(markerIds).toHaveLength(6);
    expect(new Set(markerIds).size).toBe(6);
  });
});
