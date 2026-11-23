import { describe, expect, it } from "vitest";
import katex from "katex";
import { computeEigen } from "./eigenMath";
import {
  buildEigenTeachingSteps,
  eigenvectorDiagnostics,
} from "./Phase20eigen";

describe("Phase20eigen teaching timeline", () => {
  const matrices = [
    [
      [2, 1],
      [1, 3],
    ],
    [
      [1, 0],
      [0, 2],
    ],
    [
      [0, 0],
      [0, 0],
    ],
    [
      [0, -1],
      [1, 0],
    ],
    [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
    [
      [1, 0, 0],
      [0, 2, 0],
      [0, 0, 4],
    ],
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [1e-7, 0],
      [0, 2e-7],
    ],
  ];

  it.each(matrices.map((A, index) => ({ A, index })))(
    "preserves every existing formula and renders both languages: case $index",
    ({ A }) => {
      const result = computeEigen(A);
      for (const lang of ["zh", "en"] as const) {
        const teaching = buildEigenTeachingSteps(A, result, lang);
        // Existing formulas must remain in the same order, even on error paths.
        let cursor = -1;
        for (const step of result.steps) {
          cursor = teaching.findIndex(
            (item, index) => index > cursor && item.latex === step.latex
          );
          expect(cursor).toBeGreaterThanOrEqual(0);
        }
        for (const step of teaching) {
          expect(step.description).not.toBe("");
          if (lang === "en")
            expect(`${step.description} ${step.latex ?? ""}`).not.toMatch(/[\u3400-\u9fff]/);
          if (step.latex)
            expect(() =>
              katex.renderToString(step.latex!, {
                displayMode: true,
                throwOnError: true,
                strict: "ignore",
              })
            ).not.toThrow();
        }
      }
    }
  );

  it("collects coefficients exactly from decimal input rather than tolerance guesses", () => {
    const A = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    const steps = buildEigenTeachingSteps(A, computeEigen(A), "en");
    expect(
      steps.some(
        step =>
          step.latex ===
          "p(\\lambda)=\\lambda^{2} -\\frac{1}{2}\\lambda -\\frac{1}{50}"
      )
    ).toBe(true);
  });

  it("includes all three cubic minors, the sign convention, and the numerical root method", () => {
    const A = [
      [1, 0, 0],
      [0, 2, 0],
      [0, 0, 4],
    ];
    const steps = buildEigenTeachingSteps(A, computeEigen(A), "en");
    for (const j of [1, 2, 3])
      expect(
        steps.some(step => step.latex?.startsWith(`M_{1${j}}(\\lambda)=`))
      ).toBe(true);
    expect(
      steps.some(
        step =>
          step.latex ===
          "p(\\lambda)=-\\lambda^{3} +7\\lambda^{2} -14\\lambda +8"
      )
    ).toBe(true);
    expect(
      steps.some(step =>
        step.description.includes("without changing its roots")
      )
    ).toBe(true);
    expect(steps.some(step => step.latex?.includes("\\sqrt[3]"))).toBe(true);
  });

  it("records individual row operations with independent snapshots and free-variable context", () => {
    const A = [
      [3, 2],
      [2, 3],
    ];
    const original = A.map(row => [...row]);
    const steps = buildEigenTeachingSteps(A, computeEigen(A), "en");
    const snapshots = steps.filter(step =>
      step.description.includes("Approximate row-operation snapshot")
    );
    expect(snapshots.length).toBeGreaterThan(3);
    expect(
      snapshots.some(step => step.latex?.includes("R_{2}\\leftarrow"))
    ).toBe(true);
    expect(snapshots.some(step => step.description.includes("Set v"))).toBe(
      true
    );
    expect(snapshots[0].matrix).not.toBe(snapshots[1].matrix);
    expect(A).toEqual(original);
  });

  it("labels legacy numerical equals signs rather than claiming exact roots", () => {
    const A = [
      [2, 1],
      [1, 3],
    ];
    const steps = buildEigenTeachingSteps(A, computeEigen(A), "en");
    const resultStep = steps.find(step =>
      step.description.includes("Eigenvalue Results")
    );
    expect(resultStep?.description).toContain("do not establish exact values");
    expect(
      steps.some(step =>
        step.description.includes("not proof of an exact equality")
      )
    ).toBe(true);
  });

  it("keeps polynomial derivations available when complex eigenvalues are unsupported", () => {
    const A = [
      [0, -1],
      [1, 0],
    ];
    const result = computeEigen(A);
    expect(result.error).toBeTruthy();
    expect(
      buildEigenTeachingSteps(A, result, "en").some(
        step => step.phase === "polynomial"
      )
    ).toBe(true);
  });

  it("does not mark a zero vector, a large residual, or a non-finite value as verified", () => {
    const A = [
      [1, 0],
      [0, 2],
    ];
    expect(eigenvectorDiagnostics(A, 1, [1, 0]).valid).toBe(true);
    expect(eigenvectorDiagnostics(A, 1, [0, 0]).valid).toBe(false);
    expect(eigenvectorDiagnostics(A, 1, [0, 1]).valid).toBe(false);
    expect(eigenvectorDiagnostics(A, NaN, [1, 0]).valid).toBe(false);
  });

  it("explicitly warns about existing zero-vector solver output", () => {
    const A = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const steps = buildEigenTeachingSteps(A, computeEigen(A), "en");
    expect(
      steps.some(step => step.description.includes("fails the numerical check"))
    ).toBe(true);
    expect(steps.some(step => step.description.includes("p = q = 0"))).toBe(
      true
    );
  });
});
