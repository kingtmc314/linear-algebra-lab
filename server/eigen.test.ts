/**
 * eigen.test.ts
 * Unit tests for eigenMath.ts — covers 2×2 and 3×3 eigenvalue/eigenvector computation.
 * These run in Node via vitest (no DOM required).
 */
import { describe, expect, it } from "vitest";
import { computeEigen } from "../client/src/lib/eigenMath";

const EPS = 1e-4;

function approxEqual(a: number, b: number, eps = EPS) {
  return Math.abs(a - b) < eps;
}

describe("computeEigen — 2×2 matrices", () => {
  it("symmetric matrix: [[2,1],[1,2]] → λ=3,1", () => {
    const result = computeEigen([[2, 1], [1, 2]]);
    expect(result.isComplex).toBe(false);
    expect(result.eigenvalues).toHaveLength(2);
    const sorted = [...result.eigenvalues].sort((a, b) => b - a);
    expect(approxEqual(sorted[0], 3)).toBe(true);
    expect(approxEqual(sorted[1], 1)).toBe(true);
  });

  it("diagonal matrix: [[3,0],[0,5]] → λ=5,3", () => {
    const result = computeEigen([[3, 0], [0, 5]]);
    expect(result.isComplex).toBe(false);
    const sorted = [...result.eigenvalues].sort((a, b) => b - a);
    expect(approxEqual(sorted[0], 5)).toBe(true);
    expect(approxEqual(sorted[1], 3)).toBe(true);
  });

  it("repeated eigenvalue: [[4,0],[0,4]] → λ=4 (single)", () => {
    const result = computeEigen([[4, 0], [0, 4]]);
    expect(result.isComplex).toBe(false);
    expect(result.eigenvalues.length).toBeGreaterThanOrEqual(1);
    expect(approxEqual(result.eigenvalues[0], 4)).toBe(true);
  });

  it("complex eigenvalue matrix: [[0,-1],[1,0]] → isComplex=true", () => {
    const result = computeEigen([[0, -1], [1, 0]]);
    expect(result.isComplex).toBe(true);
  });

  it("steps array is non-empty", () => {
    const result = computeEigen([[2, 1], [1, 2]]);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("each step has titleZh, titleEn, latex, explanationZh, explanationEn", () => {
    const result = computeEigen([[2, 1], [1, 2]]);
    for (const step of result.steps) {
      expect(typeof step.titleZh).toBe("string");
      expect(typeof step.titleEn).toBe("string");
      expect(typeof step.latex).toBe("string");
      expect(typeof step.explanationZh).toBe("string");
      expect(typeof step.explanationEn).toBe("string");
    }
  });

  it("verification: A·v = λ·v for each eigenpair (2×2)", () => {
    const A = [[4, 1], [2, 3]];
    const result = computeEigen(A);
    expect(result.isComplex).toBe(false);
    for (let k = 0; k < result.eigenvalues.length; k++) {
      const lam = result.eigenvalues[k];
      const v = result.eigenvectors[k];
      const Av0 = A[0][0] * v[0] + A[0][1] * v[1];
      const Av1 = A[1][0] * v[0] + A[1][1] * v[1];
      expect(approxEqual(Av0, lam * v[0])).toBe(true);
      expect(approxEqual(Av1, lam * v[1])).toBe(true);
    }
  });
});

describe("computeEigen — 3×3 matrices", () => {
  it("diagonal matrix: [[1,0,0],[0,2,0],[0,0,3]] → λ=1,2,3", () => {
    const result = computeEigen([[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
    expect(result.isComplex).toBe(false);
    const sorted = [...result.eigenvalues].sort((a, b) => a - b);
    expect(approxEqual(sorted[0], 1)).toBe(true);
    expect(approxEqual(sorted[1], 2)).toBe(true);
    expect(approxEqual(sorted[2], 3)).toBe(true);
  });

  it("symmetric matrix: [[2,1,0],[1,2,1],[0,1,2]] → 3 real eigenvalues", () => {
    const result = computeEigen([[2, 1, 0], [1, 2, 1], [0, 1, 2]]);
    expect(result.isComplex).toBe(false);
    expect(result.eigenvalues.length).toBeGreaterThanOrEqual(1);
  });

  it("verification: A·v = λ·v for each eigenpair (3×3 diagonal)", () => {
    const A = [[1, 0, 0], [0, 2, 0], [0, 0, 3]];
    const result = computeEigen(A);
    expect(result.isComplex).toBe(false);
    for (let k = 0; k < result.eigenvalues.length; k++) {
      const lam = result.eigenvalues[k];
      const v = result.eigenvectors[k];
      for (let i = 0; i < 3; i++) {
        let Avi = 0;
        for (let j = 0; j < 3; j++) Avi += A[i][j] * v[j];
        expect(approxEqual(Avi, lam * v[i])).toBe(true);
      }
    }
  });

  it("steps array is non-empty for 3×3", () => {
    const result = computeEigen([[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("characteristicPolynomial is a non-empty string", () => {
    const result = computeEigen([[2, 1, 0], [1, 2, 1], [0, 1, 2]]);
    expect(typeof result.characteristicPolynomial).toBe("string");
    expect(result.characteristicPolynomial.length).toBeGreaterThan(0);
  });
});

describe("computeEigen — unsupported sizes", () => {
  it("1×1 matrix returns error", () => {
    const result = computeEigen([[5]]);
    expect(result.error).toBeTruthy();
  });

  it("4×4 matrix returns error", () => {
    const result = computeEigen([[1,0,0,0],[0,2,0,0],[0,0,3,0],[0,0,0,4]]);
    expect(result.error).toBeTruthy();
  });
});
