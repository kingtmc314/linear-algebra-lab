import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import { ratToLatex } from "./rational";
import {
  transformationApplyExact, transformationApplyNumeric, transformationDecimal,
  transformationDeterminant, transformationEntryLatex, transformationExactMatrix,
  transformationMatrixLatex, transformationNumericMatrix, transformationSnapshot,
  transformationTrig, transformationVectorLatex,
} from "./Phase20transformation";
import { Phase20transformationDefinitions, Phase20transformationLesson } from "../pages/TransformationPage";

vi.mock("plotly.js-dist-min", () => ({ default: {} }));
vi.mock("@/components/Plot3DScene", () => ({ default: () => null }));

describe("transformation lesson exact values", () => {
  it("parses literal decimals and exponent notation without tolerance guessing", () => {
    expect(ratToLatex(transformationDecimal(0.1))).toBe("\\frac{1}{10}");
    expect(ratToLatex(transformationDecimal(1e-12))).toBe("\\frac{1}{1000000000000}");
    expect(ratToLatex(transformationDecimal(-2.5))).toBe("-\\frac{5}{2}");
    expect(ratToLatex(transformationDecimal(1.0000000001))).toBe("\\frac{10000000001}{10000000000}");
  });
  it("simplifies standard angle values, with signs in every quadrant", () => {
    expect(transformationEntryLatex(transformationTrig(45, "cos"))).toBe("\\frac{\\sqrt{2}}{2}");
    expect(transformationEntryLatex(transformationTrig(-30, "sin"))).toBe("-\\frac{1}{2}");
    expect(transformationEntryLatex(transformationTrig(180, "cos"))).toBe("-1");
    expect(transformationEntryLatex(transformationTrig(360, "sin"))).toBe("0");
  });
  it("simplifies all standard 15-degree multiples to radicals", () => {
    for (let angle = -360; angle <= 360; angle += 15) {
      expect(transformationEntryLatex(transformationTrig(angle, "cos"))).not.toContain("\\cos");
      expect(transformationEntryLatex(transformationTrig(angle, "sin"))).not.toContain("\\sin");
    }
  });
  it("retains exact trigonometry for nonstandard angles, including very near a standard angle", () => {
    expect(transformationEntryLatex(transformationTrig(31, "cos"))).toContain("\\cos");
    expect(transformationEntryLatex(transformationTrig(45.00000000000001, "sin"))).toContain("\\sin");
  });
  it("reduces exact radical sums and cancellations in a rotated custom vector", () => {
    const exact = transformationExactMatrix("rotate2d", { theta: 45 });
    expect(transformationVectorLatex(transformationApplyExact(exact, [1, 1]))).toBe("\\begin{bmatrix}0 \\\\ \\sqrt{2}\\end{bmatrix}");
    expect(transformationEntryLatex(transformationApplyExact(exact, [3, 1])[0])).toBe("\\sqrt{2}");
  });
  it("uses rational input arithmetic for custom vector outputs and determinants", () => {
    const p = { a: 0.1, b: 0.2, c: 0.3, d: 0.4 };
    const exact = transformationExactMatrix("custom2d", p);
    const result = transformationApplyExact(exact, [0.1, 0.2]).map(transformationEntryLatex);
    expect(result).toEqual(["\\frac{1}{20}", "\\frac{11}{100}"]);
    expect(ratToLatex(transformationDeterminant("custom2d", p))).toBe("-\\frac{1}{50}");
  });
  it("does not turn a tiny custom coefficient into zero", () => {
    const exact = transformationExactMatrix("custom2d", { a: 1e-12, b: 0, c: 0, d: 1 });
    expect(transformationEntryLatex(exact[0][0])).toBe("\\frac{1}{1000000000000}");
  });
  it("represents a squeeze reciprocal exactly instead of a rounded decimal", () => {
    expect(transformationEntryLatex(transformationExactMatrix("squeeze", { k: 0.3 })[1][1])).toBe("\\frac{10}{3}");
    expect(ratToLatex(transformationDeterminant("squeeze", { k: 0.3 }))).toBe("1");
  });
  it("preserves the sign in arbitrary-line reflection matrices", () => {
    const latex = transformationMatrixLatex(transformationExactMatrix("reflect_line", { alpha: 90 }));
    expect(latex).toBe("\\begin{bmatrix}-1 & 0 \\\\ 0 & 1\\end{bmatrix}");
    expect(latex).not.toContain("--");
  });
});

describe("all transformation geometry snapshots", () => {
  const cases: [string, Record<string, number>][] = [
    ["rotate2d", { theta: 45 }], ["reflect_x", {}], ["reflect_y", {}],
    ["reflect_yx", {}], ["reflect_ynx", {}], ["reflect_line", { alpha: 31 }],
    ["shear_h", { k: -2 }], ["shear_v", { k: 0.3 }],
    ["scale2d", { sx: -1, sy: 2 }], ["squeeze", { k: 0.3 }],
    ["proj_x", {}], ["proj_y", {}],
    ["rotate3d_x", { theta: 90 }], ["rotate3d_y", { theta: 31 }], ["rotate3d_z", { theta: -45 }],
    ["scale3d", { sx: 2, sy: 1, sz: 0.5 }],
    ["reflect3d_xy", {}], ["reflect3d_xz", {}], ["reflect3d_yz", {}],
    ["custom2d", { a: 1, b: 2, c: 3, d: 4 }],
    ["custom3d", { m11: 1, m12: 2, m13: 0, m21: 0, m22: 1, m23: 3, m31: 0, m32: 0, m33: 2 }],
  ];
  it.each(cases)("%s begins at identity and ends at the target", (id, p) => {
    const target = transformationNumericMatrix(id, p);
    const n = target.length;
    expect(transformationSnapshot(id, p, 0)).toEqual(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 1 : 0)));
    expect(transformationSnapshot(id, p, 1)).toEqual(target);
    for (const value of transformationSnapshot(id, p, 0.5).flat()) expect(Number.isFinite(value)).toBe(true);
  });
  it("uses an actual rotational path, not a shrinking straight interpolation", () => {
    const matrix = transformationSnapshot("rotate2d", { theta: 90 }, 0.5);
    expect(transformationApplyNumeric(matrix, [1, 0])[0]).toBeCloseTo(Math.SQRT1_2);
    expect(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]).toBeCloseTo(1);
  });
  it("preserves area at every squeeze snapshot", () => {
    const m = transformationSnapshot("squeeze", { k: 0.3 }, 0.5);
    expect(m[0][0] * m[1][1]).toBeCloseTo(1);
  });
  it("explicitly allows reflection illustrations to collapse halfway", () => {
    expect(transformationSnapshot("reflect_x", {}, 0.5)).toEqual([[1, 0], [0, 0]]);
  });
  it("computes a 3D custom determinant and all vector components", () => {
    const p = cases[cases.length - 1][1];
    expect(ratToLatex(transformationDeterminant("custom3d", p))).toBe("2");
    expect(transformationApplyExact(transformationExactMatrix("custom3d", p), [1, 2, 3]).map(transformationEntryLatex)).toEqual(["5", "11", "6"]);
  });
});

describe("bilingual full transformation lessons", () => {
  it("gives every defined 2D/3D/custom transform contextual stages and valid exact LaTeX", () => {
    expect(Phase20transformationDefinitions).toHaveLength(21);
    for (const definition of Phase20transformationDefinitions) {
      const params = Object.fromEntries(definition.params.map(p => [p.id, p.default]));
      const vector = definition.dim === "2d" ? [0.1, -2] : [0.1, -2, 3];
      for (const lang of ["zh", "en"] as const) {
        const steps = Phase20transformationLesson(definition, params, vector, lang);
        expect(steps.length).toBeGreaterThanOrEqual(11);
        expect(steps[0].progress).toBe(0);
        expect(steps[steps.length - 1].progress).toBe(1);
        expect(steps[steps.length - 1].vectorVisible).toBe(true);
        expect(steps.filter(step => step.activeRow !== undefined)).toHaveLength(vector.length);
        for (const step of steps) {
          expect(step.description.length).toBeGreaterThan(15);
          expect(() => katex.renderToString(step.latex!, { throwOnError: true, displayMode: true })).not.toThrow();
          expect(step.latex).not.toContain("\\approx");
        }
      }
    }
  });
  it("retains trigonometric expressions through nonstandard-angle final answers", () => {
    for (const id of ["rotate2d", "rotate3d_x", "rotate3d_y", "rotate3d_z", "reflect_line"]) {
      const definition = Phase20transformationDefinitions.find(item => item.id === id)!;
      const params = id === "reflect_line" ? { alpha: 31 } : { theta: 31 };
      const vector = definition.dim === "2d" ? [2, 3] : [2, 3, 4];
      const steps = Phase20transformationLesson(definition, params, vector, "en");
      expect(steps[steps.length - 1].latex).toContain("\\cos");
      for (const step of steps) expect(() => katex.renderToString(step.latex!, { throwOnError: true })).not.toThrow();
    }
  });
});
