import { describe, expect, it } from "vitest";
import katex from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EigenDiagram, {
  EIGEN_PRESETS,
  EIGEN_STEP_COUNT,
  analyzeEigenvector,
  eigenResidual,
  getEigenGeometry,
  getEigenSteps,
  isInEigenspace,
  multiplyEigenMatrix,
  type EigenPresetId,
} from "./EigenDiagram";

const A = EIGEN_PRESETS.stretch.matrix;
const presets = Object.keys(EIGEN_PRESETS) as EigenPresetId[];

describe("EigenDiagram exact model", () => {
  it("computes both eigenpairs from the original definition example", () => {
    expect(multiplyEigenMatrix(A, [1, 1])).toEqual([3, 3]);
    expect(multiplyEigenMatrix(A, [1, -1])).toEqual([1, -1]);
    expect(analyzeEigenvector(A, [1, 1])).toMatchObject({
      eigenvector: true,
      eigenvalue: 3,
      relation: "same",
    });
    expect(analyzeEigenvector(A, [1, -1])).toMatchObject({
      eigenvector: true,
      eigenvalue: 1,
      relation: "same",
    });
  });

  it("rejects a non-eigenvector whose image changes line", () => {
    expect(analyzeEigenvector(A, [1, 0])).toMatchObject({
      image: [2, 1],
      eigenvector: false,
      eigenvalue: null,
      zeroVector: false,
      relation: "changed",
    });
    expect(isInEigenspace(A, [1, 0], 3)).toBe(false);
  });

  it("includes zero in each kernel, but never as an eigenvector", () => {
    expect(isInEigenspace(A, [0, 0], 3)).toBe(true);
    expect(isInEigenspace(A, [0, 0], 1)).toBe(true);
    expect(isInEigenspace(A, [0, 0], 99)).toBe(true);
    expect(analyzeEigenvector(A, [0, 0])).toMatchObject({
      image: [0, 0],
      zeroVector: true,
      eigenvector: false,
      eigenvalue: null,
      relation: "zero",
    });
  });

  it("keeps negative multiples on the same eigenspace line", () => {
    expect(analyzeEigenvector(A, [-2, -2])).toMatchObject({
      image: [-6, -6],
      eigenvalue: 3,
      relation: "same",
    });
    expect(eigenResidual(A, [-2, -2], 3)).toEqual([0, 0]);
  });

  it("models negative lambda as reversed orientation, not a changed line", () => {
    const { matrix, vector } = EIGEN_PRESETS.reverse;
    expect(analyzeEigenvector(matrix, vector)).toMatchObject({
      image: [-3, -3],
      eigenvector: true,
      eigenvalue: -3,
      relation: "reversed",
    });
  });

  it("recognizes a nonzero eigenvector with eigenvalue zero", () => {
    const { matrix, vector } = EIGEN_PRESETS.collapse;
    expect(analyzeEigenvector(matrix, vector)).toMatchObject({
      image: [0, 0],
      eigenvector: true,
      zeroVector: false,
      eigenvalue: 0,
      relation: "collapsed",
    });
  });

  it("verifies both eigenspace bases for every preset", () => {
    for (const preset of presets) {
      const example = EIGEN_PRESETS[preset];
      expect(
        eigenResidual(example.matrix, example.basis, example.eigenvalue)
      ).toEqual([0, 0]);
      expect(
        eigenResidual(
          example.matrix,
          example.otherBasis,
          example.otherEigenvalue
        )
      ).toEqual([0, 0]);
      for (const t of [-2, -1, 0, 1, 2]) {
        expect(
          isInEigenspace(
            example.matrix,
            [t * example.basis[0], t * example.basis[1]],
            example.eigenvalue
          )
        ).toBe(true);
      }
    }
  });

  it("does not round a tiny nonzero vector into zero or an eigenvector", () => {
    expect(analyzeEigenvector(A, [1e-100, 0])).toMatchObject({
      zeroVector: false,
      eigenvector: false,
    });
    expect(analyzeEigenvector(A, [1e-100, 1e-100])).toMatchObject({
      zeroVector: false,
      eigenvector: true,
      eigenvalue: 3,
    });
  });

  it("rejects nonfinite inputs, overflow, and invalid tolerances", () => {
    expect(() => multiplyEigenMatrix(A, [Infinity, 1])).toThrow(RangeError);
    expect(() =>
      multiplyEigenMatrix(
        [
          [NaN, 0],
          [0, 1],
        ],
        [1, 1]
      )
    ).toThrow(RangeError);
    expect(() =>
      multiplyEigenMatrix(A, [Number.MAX_VALUE, Number.MAX_VALUE])
    ).toThrow(RangeError);
    expect(() => eigenResidual(A, [1, 1], Infinity)).toThrow(RangeError);
    expect(() => isInEigenspace(A, [1, 1], 3, -1)).toThrow(RangeError);
  });
});

describe("EigenDiagram shared-clock geometry", () => {
  it("moves the stretch endpoint, and ends at exact Av", () => {
    const start = getEigenGeometry("stretch", { stage: 2, progress: 0 });
    const middle = getEigenGeometry("stretch", { stage: 2, progress: 0.5 });
    const end = getEigenGeometry("stretch", { stage: 2, progress: 1 });
    expect(start.transformed).toEqual([1, 1]);
    expect(middle.transformed).toEqual([2, 2]);
    expect(end.transformed).toEqual([3, 3]);
    expect(
      getEigenGeometry("stretch", { stage: 4, progress: 1 }).transformed
    ).toEqual([3, 3]);
  });

  it("changes the non-eigenvector direction and reverses signed examples", () => {
    expect(
      getEigenGeometry("turn", { stage: 2, progress: 0.5 }).transformed
    ).toEqual([1.5, 0.5]);
    expect(
      getEigenGeometry("turn", { stage: 2, progress: 1 }).transformed
    ).toEqual([2, 1]);
    expect(
      getEigenGeometry("reverse", { stage: 2, progress: 0.5 }).transformed
    ).toEqual([-1, -1]);
    expect(
      getEigenGeometry("reverse", { stage: 2, progress: 1 }).transformed
    ).toEqual([-3, -3]);
  });

  it("reveals the line, sample points, and zero inclusion at separate stages", () => {
    expect(
      getEigenGeometry("fixed", { stage: 0, progress: 1 }).lineOpacity
    ).toBe(0);
    expect(
      getEigenGeometry("fixed", { stage: 1, progress: 0.5 }).lineOpacity
    ).toBe(0.5);
    expect(
      getEigenGeometry("fixed", { stage: 3, progress: 0.5 }).sampleProgress
    ).toBe(0.5);
    expect(
      getEigenGeometry("fixed", { stage: 3, progress: 1 }).conclusionOpacity
    ).toBe(0);
    expect(
      getEigenGeometry("fixed", { stage: 4, progress: 1 }).conclusionOpacity
    ).toBe(1);
  });

  it("keeps every preset frame finite, including malformed playback values", () => {
    for (const preset of presets) {
      for (const stage of [-1, 0, 1, 2, 3, 4, 100, NaN, Infinity]) {
        for (const progress of [-1, 0, 0.25, 0.5, 1, 2, NaN, Infinity]) {
          const frame = getEigenGeometry(preset, { stage, progress });
          for (const value of Object.values(frame).flat()) {
            expect(Number.isFinite(value)).toBe(true);
          }
          for (const opacity of [
            frame.inputOpacity,
            frame.outputOpacity,
            frame.lineOpacity,
            frame.sampleProgress,
            frame.conclusionOpacity,
          ]) {
            expect(opacity).toBeGreaterThanOrEqual(0);
            expect(opacity).toBeLessThanOrEqual(1);
          }
        }
      }
      expect(
        getEigenGeometry(preset, { stage: 4, progress: 1 }).transformed
      ).toEqual(
        multiplyEigenMatrix(
          EIGEN_PRESETS[preset].matrix,
          EIGEN_PRESETS[preset].vector
        )
      );
    }
  });
});

describe("EigenDiagram equations and rendering", () => {
  it("renders every step and final exact formula with KaTeX in both languages", () => {
    for (const lang of ["zh", "en"] as const) {
      for (const variant of ["matrix-eigen-def", "matrix-eigen-space"]) {
        for (const preset of presets) {
          const steps = getEigenSteps(lang, variant, preset);
          expect(steps).toHaveLength(EIGEN_STEP_COUNT);
          for (const step of steps) {
            expect(step.description?.length).toBeGreaterThan(0);
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
    }
  });

  it("uses the required example, not the different static eigenspace card matrix", () => {
    const steps = getEigenSteps("en", "matrix-eigen-space", "stretch");
    expect(steps[0].latex).toContain(
      String.raw`\begin{bmatrix}2&1\\1&2\end{bmatrix}`
    );
    expect(steps[4].latex).toContain("E_{3}");
    expect(steps[4].latex).toContain("E_{1}");
    expect(steps[4].latex).not.toContain("E_{5}");
    expect(steps[4].latex).toContain(String.raw`\mathbf v\ne\mathbf0`);
  });

  it("renders accessible responsive SVG for both variants without CJK in English", () => {
    for (const variant of ["matrix-eigen-def", "matrix-eigen-space"]) {
      const markup = renderToStaticMarkup(
        createElement(EigenDiagram, { lang: "en", variant })
      );
      expect(markup).toContain('data-testid="knowledge-eigen"');
      expect(markup).toContain('data-stage="4"');
      expect(markup).toContain('viewBox="0 0 560 340"');
      expect(markup).toContain('role="img"');
      expect(markup).toContain("aria-labelledby=");
      expect(markup).toContain("<title");
      expect(markup).toContain("<desc");
      expect(markup).toContain("(3, 3)");
      expect(markup).not.toMatch(/[\u3400-\u9fff]/u);
      expect(markup).not.toMatch(/NaN|Infinity/);
    }
  });
});
