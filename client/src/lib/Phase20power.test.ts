import { describe, expect, it } from "vitest";
import katex from "katex";
import { readFileSync } from "node:fs";
import { buildPhase20powerSteps } from "./Phase20power";
import { computeMatrixPower } from "./matrixPower";

const sample = [
  [2, 1],
  [1, 2],
];

describe("Phase20power derivation adapter", () => {
  it.each(["zh", "en"] as const)(
    "preserves every original step LaTeX unchanged in %s",
    lang => {
      const result = computeMatrixPower(sample, 3);
      expect(result.error).toBeUndefined();
      const before = JSON.stringify(result);
      const steps = buildPhase20powerSteps(result, lang);
      const latex = steps.map(step => step.latex);
      result.steps.forEach(original => expect(latex).toContain(original.latex));
      expect(JSON.stringify(result)).toBe(before);
      expect(latex).toContain(`A^{3} = ${result.AnLatex}`);
      expect(result.An[0][0]).toBeCloseTo(14, 8);
      expect(result.An[0][1]).toBeCloseTo(13, 8);
    }
  );

  it("provides column-based P, matching D, inverse, cancellation, and all entry expansions", () => {
    const result = computeMatrixPower(sample, 3);
    const steps = buildPhase20powerSteps(result, "en");
    const descriptions = steps.map(step => step.description).join("\n");
    const latex = steps.map(step => step.latex).join("\n");
    expect(descriptions).toContain(
      "counts repeated multiplication, not matrix size"
    );
    expect(descriptions).toContain("Column i of P");
    expect(descriptions).toContain("not an element-wise reciprocal");
    expect(descriptions).toContain("i is the output row, j the column");
    expect(latex).toContain("\\underbrace{(P^{-1}P)}_{I}");
    expect(latex).toContain("A^3=(PD^2P^{-1})(PDP^{-1})");
    expect(latex).toContain("\\sum_{k=1}^{2}");
    expect(
      steps.filter(step => step.description.startsWith("Row "))
    ).toHaveLength(4);
    expect(descriptions).not.toContain("All entries expressed as exact values");
    expect(descriptions).toContain(
      "Substitute the entries of P into the determinant"
    );
    for (const original of result.steps) {
      expect(
        steps.find(step => step.latex === original.latex)?.description
      ).toContain("Numerical approximation");
    }
  });

  it("handles n = 0 with an identity snapshot, including a zero eigenvalue", () => {
    const result = computeMatrixPower(
      [
        [1, 1],
        [1, 1],
      ],
      0
    );
    expect(result.error).toBeUndefined();
    const steps = buildPhase20powerSteps(result, "en");
    expect(
      steps.some(step =>
        step.description.includes("does not require evaluating scalar 0⁰")
      )
    ).toBe(true);
    expect(steps.map(step => step.latex)).toContain(
      "(A^0)_{11}=(I_{2})_{11}=1"
    );
    expect(steps.map(step => step.latex)).toContain(
      "(A^0)_{12}=(I_{2})_{12}=0"
    );
    const entries = steps.filter(step => step.description.startsWith("Row "));
    expect(entries.every(step => !step.latex?.includes("\\right)^{0}"))).toBe(
      true
    );
  });

  it.each([0, 1, 3])(
    "renders all bilingual 2×2 formulas with strict KaTeX for n = %s",
    n => {
      const result = computeMatrixPower(sample, n);
      for (const lang of ["zh", "en"] as const) {
        for (const step of buildPhase20powerSteps(result, lang)) {
          expect(() =>
            katex.renderToString(step.latex ?? "", { throwOnError: true })
          ).not.toThrow();
        }
      }
    }
  );

  it("supports a 3×3 derivation, with nine entry snapshots and the cofactor inverse rule", () => {
    const result = computeMatrixPower(
      [
        [2, 0, 0],
        [0, 3, 0],
        [0, 0, 4],
      ],
      2
    );
    expect(result.error).toBeUndefined();
    const steps = buildPhase20powerSteps(result, "en");
    expect(
      steps.filter(step => step.description.startsWith("Row "))
    ).toHaveLength(9);
    expect(
      steps.some(step => step.latex?.includes("P^{-1}=\\frac{C^T}{\\det(P)}"))
    ).toBe(true);
    expect(
      steps.filter(step => step.description.startsWith("Cofactor C"))
    ).toHaveLength(9);
    for (const step of steps) {
      expect(() =>
        katex.renderToString(step.latex ?? "", { throwOnError: true })
      ).not.toThrow();
    }
  });

  it("does not certify reconstructed fractions from an irrational spectrum as exact", () => {
    const result = computeMatrixPower(
      [
        [1, 1],
        [1, 0],
      ],
      4
    );
    expect(result.error).toBeUndefined();
    for (const lang of ["zh", "en"] as const) {
      const steps = buildPhase20powerSteps(result, lang);
      const originalEigenvalues = steps.find(
        step => step.latex === result.steps[1].latex
      );
      expect(originalEigenvalues?.description).toContain(
        lang === "zh"
          ? "不代表已證明的精確有理數"
          : "not certified exact rationals"
      );
      for (const step of steps) {
        expect(() =>
          katex.renderToString(step.latex ?? "", { throwOnError: true })
        ).not.toThrow();
      }
    }
  });

  it("uses only the shared StepDisplay and clears stale results when inputs change", () => {
    const page = readFileSync(
      new URL("../pages/MatrixPowerPage.tsx", import.meta.url),
      "utf8"
    );
    expect(page).toMatch(/<StepDisplay\s+steps=\{derivationSteps\}/);
    expect(page).not.toMatch(
      /setInterval|setTimeout|stepsOpen|result\.steps\.map\(\(step/
    );
    expect(page).toMatch(/setMatA\(matrix\);\s+clearResult\(\);/);
    expect(page).toContain("Number.isSafeInteger(nValue)");
    expect(page).toContain(
      "Numerical approximations versus symbolic identities"
    );
    expect(page).not.toContain("Exact Value of");
  });
});
