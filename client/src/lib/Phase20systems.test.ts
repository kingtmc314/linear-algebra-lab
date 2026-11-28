import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import katex from "katex";
import { solveLinearSystem, type GeneralSolutionTerm } from "./linearSystem";
import { matInverse } from "./matrixMath";
import { rat, ratToLatex, ratAugLatex } from "./rational";
import {
  Phase20systemsDecimal, Phase20systemsInputIsApproximate, Phase20systemsReadFraction,
  Phase20systemsReadMatrix, Phase20systemsGeneralLatex, Phase20systemsGaussianSteps,
  Phase20systemsInverseSteps,
} from "./Phase20systems";

describe("Phase20systems exact contextual derivations", () => {
  it("preserves entered decimals instead of guessing a nearby simple fraction", () => {
    expect(ratToLatex(Phase20systemsDecimal(0.3333333333333))).toBe("\\frac{3333333333333}{10000000000000}");
    expect(ratToLatex(Phase20systemsDecimal(-0.125))).toBe("-\\frac{1}{8}");
    expect(ratToLatex(Phase20systemsDecimal(1e-7))).toBe("\\frac{1}{10000000}");
    expect(ratToLatex(Phase20systemsDecimal(1e21))).toBe("1000000000000000000000");
    expect(Phase20systemsInputIsApproximate([[0.3333333333333, 0], [0, 1]], [1, 2])).toBe(true);
    expect(Phase20systemsInputIsApproximate([[0.125, 0], [0, 1]], [1, 2])).toBe(false);
    expect(Phase20systemsInputIsApproximate([[1e-13, 0], [0, 1]], [1, 2])).toBe(true);
    expect(() => Phase20systemsDecimal(Infinity)).toThrow();
  });

  it("parses only solver-generated integer and reduced-fraction cells", () => {
    expect(Phase20systemsReadFraction("-\\frac{7}{13}")).toEqual(rat(-7, 13));
    expect(Phase20systemsReadMatrix("A^{-1} = \\begin{bmatrix} 1 & -\\frac{2}{3} \\\\ 0 & 4 \\end{bmatrix}"))
      .toEqual([[rat(1), rat(-2, 3)], [rat(0), rat(4)]]);
    expect(() => Phase20systemsReadFraction("0.33333")).toThrow();
  });

  it("formats general-solution coefficients without numeric zero/unit tolerance", () => {
    const terms: GeneralSolutionTerm[] = [{
      varIndex: 0, constant: 0, constantLatex: "0",
      kCoeffs: [1e-13, -1], kCoeffsLatex: ["\\frac{1}{10000000000000}", "-1"],
    }];
    expect(Phase20systemsGeneralLatex(terms, 2))
      .toBe("x_{1} = \\frac{1}{10000000000000}k_{1} - k_{2}");
  });

  it("retains Gaussian exact row-operation LaTeX and adds every unknown and verification", () => {
    const A = [[3, 1], [1, -1]], b = [1, 0];
    const result = solveLinearSystem(A, b);
    const steps = Phase20systemsGaussianSteps(result, A, b, "en");
    result.steps.forEach(step => expect(steps.some(candidate => candidate.latex === step.latex)).toBe(true));
    expect(steps.filter(step => step.phase === "Read each unknown")).toHaveLength(2);
    expect(steps.filter(step => step.phase === "Verify by substitution")).toHaveLength(2);
    expect(steps.every(step => step.description.length > 0)).toBe(true);
    expect(steps.at(-1)?.snapshotLatex).toContain("\\begin{array}{cc|c}");
  });

  it("expands every infinite-solution REF-to-RREF row operation", () => {
    const A = [[2, 2, 4], [0, 3, 3], [0, 0, 0]], b = [2, 3, 0];
    const result = solveLinearSystem(A, b);
    expect(result.type).toBe("infinite");
    const steps = Phase20systemsGaussianSteps(result, A, b, "en");
    const operations = steps.filter(step => /before reading|including the constant/.test(step.description));
    expect(operations).toHaveLength(3);
    const originalRref = result.steps.find(step => step.descriptionEn.startsWith("Reduced Row Echelon Form"))!;
    expect(Phase20systemsReadMatrix(operations.at(-1)!.snapshotLatex!))
      .toEqual(Phase20systemsReadMatrix(originalRref.latex));
    expect(steps.some(step => step.latex?.includes("x_{3} = k"))).toBe(true);
    expect(steps.filter(step => step.phase === "Assign each free variable")).toHaveLength(1);
    expect(steps.filter(step => step.phase === "Read each pivot variable")).toHaveLength(2);
  });

  it("keeps contradiction matrices and avoids inventing a solution", () => {
    const A = [[1, 1], [2, 2]], b = [1, 3];
    const result = solveLinearSystem(A, b);
    expect(result.type).toBe("none");
    const gaussian = Phase20systemsGaussianSteps(result, A, b, "en");
    expect(gaussian.at(-1)?.description).toContain("Contradiction");
    expect(gaussian.at(-1)?.snapshotLatex).toContain("\\begin{array}{cc|c}");
    const inverse = Phase20systemsInverseSteps(matInverse(A), A, b, "en");
    expect(inverse.at(-1)?.latex).toContain("does not exist");
    expect(inverse.some(step => step.phase === "Compute each unknown")).toBe(false);
  });

  it("covers rectangular and zero-matrix free-variable systems", () => {
    const A = [[0, 0, 0], [0, 0, 0]], b = [0, 0];
    const result = solveLinearSystem(A, b);
    const gaussian = Phase20systemsGaussianSteps(result, A, b, "zh");
    expect(gaussian.at(-1)?.latex).toContain("x_{3} = k_{3}");
    const inverse = Phase20systemsInverseSteps(null, A, b, "zh");
    expect(inverse.at(-1)?.description).toContain("不是方陣");
    expect(inverse.at(-1)?.latex).toContain("2\\ne 3");
  });

  it("never truncates inverse operations and multiplies preserved exact inverse fractions", () => {
    const A = [[99, 98], [98, -99]], b = [1, 0];
    const inverse = matInverse(A);
    const gaussian = solveLinearSystem(A, b);
    const steps = Phase20systemsInverseSteps(inverse, A, b, "en");
    const rowStart = inverse.steps.findIndex(step => step.latex.startsWith("[A \\mid I]"));
    inverse.steps.slice(rowStart).forEach(step => expect(steps.some(candidate => candidate.latex === step.latex)).toBe(true));
    const multiplication = steps.filter(step => step.phase === "Compute each unknown");
    expect(multiplication).toHaveLength(2);
    gaussian.solutionLatex!.forEach((value, i) => expect(multiplication[i].latex).toContain(`=${value}`));
    expect(multiplication[0].latex).toContain("\\frac{99}{19405}");
    expect(steps.filter(step => step.phase === "Verify by substitution")).toHaveLength(2);
  });

  it("labels a false numerical singularity guard instead of claiming exact noninvertibility", () => {
    const A = [[1e-6, 0], [0, 1e-6]], b = [1e-6, 1e-6];
    const inverse = matInverse(A);
    expect(inverse.error).toBe("singular");
    const steps = Phase20systemsInverseSteps(inverse, A, b, "en");
    expect(steps.at(-1)?.description).toContain("not proof of singularity");
    expect(steps.some(step => step.latex?.includes("does not exist"))).toBe(false);
  });

  it("keeps the page's players independent with stable callbacks and no timers", () => {
    const page = readFileSync(new URL("../pages/LinearSystemPage.tsx", import.meta.url), "utf8");
    expect(page.match(/<StepDisplay\s/g)).toHaveLength(3);
    expect(page).toContain("onStepChange={onPrimaryStepChange}");
    expect(page).toContain("onStepChange={onGaussianStepChange}");
    expect(page).toContain("onStepChange={onInverseStepChange}");
    expect(page).toContain("const onPrimaryStepChange = useCallback");
    expect(page).toContain("const onGaussianStepChange = useCallback");
    expect(page).toContain("const onInverseStepChange = useCallback");
    expect(page).not.toMatch(/setInterval|setTimeout|slice\(0, 8\)/);
    expect(page).toContain("variables[j].latex");
    expect(page).toContain("validateSystemVariables(rawNames, numVar)");
  });

  it("attaches exact synchronized augmented snapshots to every Gaussian stage", () => {
    const A = [[0, 2], [1, 1]], b = [1, 2];
    const result = solveLinearSystem(A, b);
    const en = Phase20systemsGaussianSteps(result, A, b, "en");
    const zh = Phase20systemsGaussianSteps(result, A, b, "zh");
    expect(en.every(step => Boolean(step.snapshotLatex))).toBe(true);
    expect(en[0].snapshotLatex).toBe(ratAugLatex([[rat(0), rat(2), rat(1)], [rat(1), rat(1), rat(2)]], 2));
    expect(en.map(step => step.latex)).toEqual(zh.map(step => step.latex));
    expect(en[0].description).not.toBe(zh[0].description);
  });

  it("renders all exact LaTeX in both methods for dimensions 2 through 5", () => {
    for (const n of [2, 3, 4, 5]) {
      const A = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => i === j ? n + i : ((i + j) % 3) - 1));
      const b = Array.from({ length: n }, (_, i) => i + 1);
      const result = solveLinearSystem(A, b);
      const inverse = matInverse(A);
      const gaussian = Phase20systemsGaussianSteps(result, A, b, "en");
      const inverseSteps = Phase20systemsInverseSteps(inverse, A, b, "zh");
      for (const step of [...gaussian, ...inverseSteps]) {
        if (step.latex) expect(() => katex.renderToString(step.latex!, { throwOnError: true, strict: false })).not.toThrow();
        if (step.snapshotLatex) expect(() => katex.renderToString(step.snapshotLatex!, { throwOnError: true, strict: false })).not.toThrow();
      }
      const inverseUnknowns = inverseSteps.filter(step => step.phase === "逐一計算未知數");
      expect(inverseUnknowns).toHaveLength(n);
      result.solutionLatex!.forEach((value, i) => expect(inverseUnknowns[i].latex).toContain(`=${value}`));
    }
  });
});
