import { describe, expect, it } from "vitest";
import katex from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CrossProductDiagram, {
  CROSS_PRODUCT_PRESETS,
  createCrossProductModel,
  crossProduct3,
  crossProductGeometry,
  crossProductSteps,
  dotProduct3,
  exactCrossArea,
  projectIsometric3,
  type Vector3,
} from "./CrossProductDiagram";

const basis = createCrossProductModel([1, 0, 0], [0, 1, 0]);
const frame = (stage: number, progress: number) => ({
  stage,
  progress,
  playing: false,
});

function flattenedGeometry(
  model: ReturnType<typeof createCrossProductModel>,
  stage: number,
  progress: number
): number[] {
  const geometry = crossProductGeometry(model, frame(stage, progress));
  return [
    ...geometry.origin,
    ...geometry.aTip,
    ...geometry.bTip,
    ...geometry.normalTip,
    ...geometry.oppositeTip,
    ...geometry.polygon.flat(),
    ...geometry.translatedBStart,
    ...geometry.translatedBEnd,
    ...geometry.axes.flat(),
    ...geometry.curl.flat(),
    geometry.normalProgress,
    geometry.oppositeProgress,
    geometry.areaProgress,
  ];
}

describe("CrossProductDiagram exact numerical model", () => {
  it("matches the original e1 cross e2 example and exact area", () => {
    expect(basis.normal).toEqual([0, 0, 1]);
    expect(basis.swappedNormal).toEqual([0, 0, -1]);
    expect(basis.squaredArea).toBe(1);
    expect(basis.areaLatex).toBe("1");
    expect(basis.dotA).toBe(0);
    expect(basis.dotB).toBe(0);
    expect(basis.hasNormal).toBe(true);
  });

  it("computes all three components and verifies exact orthogonality", () => {
    const model = createCrossProductModel([1, 2, 3], [4, 1, 2]);
    expect(model.normal).toEqual([1, 10, -7]);
    expect(dotProduct3(model.normal, model.a)).toBe(0);
    expect(dotProduct3(model.normal, model.b)).toBe(0);
    expect(model.squaredArea).toBe(150);
    expect(model.areaLatex).toBe(String.raw`5\sqrt{6}`);
  });

  it("returns a tilted normal and an exact radical area", () => {
    const model = createCrossProductModel([1, 0, 1], [0, 1, 0]);
    expect(model.normal).toEqual([-1, 0, 1]);
    expect(model.areaLatex).toBe(String.raw`\sqrt{2}`);
    expect(model.areaText).toBe("√2");
  });

  it("swapping order reverses the normal without changing area", () => {
    for (const preset of CROSS_PRODUCT_PRESETS) {
      const original = createCrossProductModel(preset.a, preset.b);
      const reversed = createCrossProductModel(preset.b, preset.a);
      expect(reversed.normal).toEqual(original.swappedNormal);
      expect(reversed.normal.map(value => (value === 0 ? 0 : -value))).toEqual(
        original.normal
      );
      expect(reversed.squaredArea).toBe(original.squaredArea);
    }
  });

  it.each([
    [
      [1, 0, 0],
      [2, 0, 0],
    ],
    [
      [1, 2, 0],
      [-2, -4, 0],
    ],
    [
      [0, 0, 0],
      [1, 2, 3],
    ],
    [
      [0, 0, 0],
      [0, 0, 0],
    ],
  ] as [Vector3, Vector3][])(
    "guards degenerate pair %j and %j without inventing a normal",
    (a, b) => {
      const model = createCrossProductModel(a, b);
      expect(model.normal).toEqual([0, 0, 0]);
      expect(model.hasNormal).toBe(false);
      expect(model.areaText).toBe("0");
      expect(model.dotA).toBe(0);
      expect(model.dotB).toBe(0);
      expect(crossProductGeometry(model, frame(4, 1)).curl).toEqual([]);
    }
  );

  it("rejects nonfinite, noninteger, out-of-bounds, and overflow inputs", () => {
    expect(() => createCrossProductModel([NaN, 0, 0], [0, 1, 0])).toThrow(
      RangeError
    );
    expect(() => createCrossProductModel([Infinity, 0, 0], [0, 1, 0])).toThrow(
      RangeError
    );
    expect(() => createCrossProductModel([0.5, 0, 0], [0, 1, 0])).toThrow(
      RangeError
    );
    expect(() => createCrossProductModel([5, 0, 0], [0, 1, 0])).toThrow(
      RangeError
    );
    expect(() => crossProduct3([Number.MAX_VALUE, 0, 0], [0, 2, 0])).toThrow(
      RangeError
    );
    expect(() => dotProduct3([Number.MAX_VALUE, 0, 0], [2, 0, 0])).toThrow(
      RangeError
    );
    expect(() => projectIsometric3([0, 0, Infinity])).toThrow(RangeError);
  });

  it("formats zero, perfect squares, and simplified radicals exactly", () => {
    expect(exactCrossArea(0)).toEqual({ latex: "0", text: "0" });
    expect(exactCrossArea(25)).toEqual({ latex: "5", text: "5" });
    expect(exactCrossArea(72)).toEqual({
      latex: String.raw`6\sqrt{2}`,
      text: "6√2",
    });
    expect(exactCrossArea(3072)).toEqual({
      latex: String.raw`32\sqrt{3}`,
      text: "32√3",
    });
    for (const invalid of [-1, 1.5, NaN, Infinity, 3073]) {
      expect(() => exactCrossArea(invalid)).toThrow(RangeError);
    }
  });
});

describe("CrossProductDiagram synchronized geometry", () => {
  it("projects all three basis axes with equal lengths at 120-degree projected angles", () => {
    const axes = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ].map(axis => projectIsometric3(axis as Vector3));
    for (const axis of axes) expect(Math.hypot(...axis)).toBeCloseTo(1);
    expect(axes[0][0] * axes[1][0] + axes[0][1] * axes[1][1]).toBeCloseTo(-0.5);
    expect(projectIsometric3([2, -1, 3])).toEqual([
      (3 * Math.sqrt(3)) / 2,
      -2.5,
    ]);
  });

  it("grows input vectors during stage zero", () => {
    const start = crossProductGeometry(basis, frame(0, 0));
    const halfway = crossProductGeometry(basis, frame(0, 0.5));
    const end = crossProductGeometry(basis, frame(0, 1));
    expect(start.aTip).toEqual(start.origin);
    expect(start.bTip).toEqual(start.origin);
    expect(halfway.aTip[0]).toBeCloseTo((start.origin[0] + end.aTip[0]) / 2);
    expect(halfway.bTip[1]).toBeCloseTo((start.origin[1] + end.bTip[1]) / 2);
    expect(start.normalProgress).toBe(0);
  });

  it("sweeps the parallelogram with a translated copy of b in stage one", () => {
    const start = crossProductGeometry(basis, frame(1, 0));
    const halfway = crossProductGeometry(basis, frame(1, 0.5));
    const end = crossProductGeometry(basis, frame(1, 1));
    expect(start.translatedBStart).toEqual(start.origin);
    expect(start.translatedBEnd).toEqual(start.bTip);
    expect(end.translatedBStart).toEqual(end.aTip);
    for (const coordinate of [0, 1]) {
      expect(end.translatedBEnd[coordinate]).toBeCloseTo(
        end.aTip[coordinate] + end.bTip[coordinate] - end.origin[coordinate]
      );
      expect(halfway.translatedBStart[coordinate]).toBeCloseTo(
        (start.origin[coordinate] + end.aTip[coordinate]) / 2
      );
    }
    expect(end.polygon).toEqual([
      end.origin,
      end.aTip,
      end.translatedBEnd,
      end.bTip,
    ]);
  });

  it("grows the normal in stage two and preserves its computed 3D direction", () => {
    const start = crossProductGeometry(basis, frame(2, 0));
    const half = crossProductGeometry(basis, frame(2, 0.5));
    const end = crossProductGeometry(basis, frame(2, 1));
    expect(start.normalTip).toEqual(start.origin);
    expect(end.normalTip[0]).toBeCloseTo(end.origin[0]);
    expect(end.normalTip[1]).toBeLessThan(end.origin[1]);
    expect(half.normalTip[1]).toBeCloseTo(
      (end.normalTip[1] + end.origin[1]) / 2
    );
  });

  it("constructs a real in-plane right-hand curl and reveals the reversed normal", () => {
    const early = crossProductGeometry(basis, frame(3, 0.25));
    const curled = crossProductGeometry(basis, frame(3, 1));
    const final = crossProductGeometry(basis, frame(4, 1));
    expect(early.curl.at(-1)).not.toEqual(curled.curl.at(-1));
    expect(curled.curl[0][0]).toBeGreaterThan(curled.origin[0]);
    expect(curled.curl.at(-1)![0]).toBeLessThan(curled.origin[0]);
    for (const coordinate of [0, 1]) {
      expect(
        final.oppositeTip[coordinate] - final.origin[coordinate]
      ).toBeCloseTo(-(final.normalTip[coordinate] - final.origin[coordinate]));
    }
  });

  it.each(CROSS_PRODUCT_PRESETS)(
    "keeps every stage finite and in the SVG bounds for $id",
    preset => {
      for (const swapped of [false, true]) {
        const model = createCrossProductModel(
          swapped ? preset.b : preset.a,
          swapped ? preset.a : preset.b
        );
        for (let stage = 0; stage < 5; stage++) {
          for (const progress of [0, 0.2, 0.5, 0.9, 1]) {
            expect(
              flattenedGeometry(model, stage, progress).every(Number.isFinite)
            ).toBe(true);
            const geometry = crossProductGeometry(
              model,
              frame(stage, progress)
            );
            for (const point of [
              geometry.origin,
              geometry.aTip,
              geometry.bTip,
              geometry.normalTip,
              geometry.oppositeTip,
              ...geometry.polygon,
              ...geometry.curl,
            ]) {
              expect(point[0]).toBeGreaterThanOrEqual(60);
              expect(point[0]).toBeLessThanOrEqual(500);
              expect(point[1]).toBeGreaterThanOrEqual(50);
              expect(point[1]).toBeLessThanOrEqual(290);
            }
          }
        }
      }
    }
  );

  it("bounds progress and malformed frames without NaN or Infinity", () => {
    for (const stage of [-1, 99, NaN, Infinity]) {
      for (const progress of [-1, 2, NaN, Infinity]) {
        expect(
          flattenedGeometry(basis, stage, progress).every(Number.isFinite)
        ).toBe(true);
      }
    }
    expect(crossProductGeometry(basis, frame(2, 2)).normalProgress).toBe(1);
    expect(crossProductGeometry(basis, frame(2, -1)).normalProgress).toBe(0);
  });
});

describe("CrossProductDiagram lesson and bilingual rendering", () => {
  it("has five stages with exact KaTeX-valid formulas for every preset and order", () => {
    for (const preset of CROSS_PRODUCT_PRESETS) {
      for (const swapped of [false, true]) {
        const model = createCrossProductModel(
          swapped ? preset.b : preset.a,
          swapped ? preset.a : preset.b
        );
        for (const lang of ["zh", "en"] as const) {
          const steps = crossProductSteps(model, lang);
          expect(steps).toHaveLength(5);
          for (const step of steps) {
            expect(step.latex).toBeTruthy();
            expect(() =>
              katex.renderToString(step.latex!, { throwOnError: true })
            ).not.toThrow();
            if (lang === "en")
              expect(step.description).not.toMatch(/[\u3400-\u9fff]/);
          }
          expect(steps[4].latex).toContain(`=S&=${model.areaLatex}`);
        }
      }
    }
  });

  it("does not call the zero vector a normal direction", () => {
    const steps = crossProductSteps(
      createCrossProductModel([0, 0, 0], [0, 1, 0]),
      "en"
    );
    expect(steps[1].description).toContain("no direction");
    expect(steps[3].description).toContain("cannot define a normal direction");
    expect(steps[4].description).toContain("not a normal direction");
  });

  it("renders the accessible responsive final English example without Chinese text", () => {
    const html = renderToStaticMarkup(
      createElement(CrossProductDiagram, { lang: "en", variant: "vec-cross" })
    );
    expect(html).toContain('data-testid="knowledge-cross-product"');
    expect(html).toContain('data-stage="4"');
    expect(html).toContain('viewBox="0 0 560 340"');
    expect(html).toContain('width="100%"');
    expect(html).toContain('role="img"');
    expect(html).toContain("not a 2D cross product");
    expect(html).toContain("Right-hand curl: a → b");
    expect(html).not.toMatch(/[\u3400-\u9fff]/);
  });

  it("localizes the Chinese scene and gives separate mounted diagrams unique markers", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(CrossProductDiagram, { lang: "zh" }),
        createElement(CrossProductDiagram, { lang: "en" })
      )
    );
    expect(html).toContain("三維座標的等角二維投影");
    const markerIds = [...html.matchAll(/<marker id="([^"]+)"/g)].map(
      match => match[1]
    );
    expect(markerIds).toHaveLength(8);
    expect(new Set(markerIds).size).toBe(8);
    for (const markerId of markerIds)
      expect(html).toContain(`url(#${markerId})`);
  });
});

describe("CrossProductDiagram visible preset planes", () => {
  it("does not choose an edge-on projected plane for a nonzero-area preset", () => {
    for (const preset of CROSS_PRODUCT_PRESETS) {
      const model = createCrossProductModel(preset.a, preset.b);
      if (!model.hasNormal) continue;
      const geometry = crossProductGeometry(model, frame(4, 1));
      const aX = geometry.aTip[0] - geometry.origin[0];
      const aY = geometry.aTip[1] - geometry.origin[1];
      const bX = geometry.bTip[0] - geometry.origin[0];
      const bY = geometry.bTip[1] - geometry.origin[1];
      // Only a display visibility check; spatial area comes from the 3D model.
      expect(Math.abs(aX * bY - aY * bX)).toBeGreaterThan(100);
    }
  });
});
