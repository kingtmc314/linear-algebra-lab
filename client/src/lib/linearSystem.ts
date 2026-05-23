// ============================================================
// Linear System Solver — Gaussian Elimination with Partial Pivoting
// Returns step-by-step augmented matrix transformations
// ============================================================

import { fmt } from "./matrixMath";

export type SolutionType = "unique" | "infinite" | "none";

export interface SystemStep {
  description: string;
  matrix: number[][];
  latex?: string;
}

export interface SystemResult {
  type: SolutionType;
  solution?: number[];
  freeVariables?: number[];
  steps: SystemStep[];
  error?: string;
}

/** Solve Ax = b using Gaussian elimination with partial pivoting */
export function solveLinearSystem(
  A: number[][],
  b: number[]
): SystemResult {
  const m = A.length;
  const n = A[0].length;
  const steps: SystemStep[] = [];

  // Build augmented matrix [A | b]
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  steps.push({
    description: "Augmented matrix [A | b]",
    matrix: aug.map((r) => [...r]),
    latex: "\\text{Augmented matrix } [A \\mid b]",
  });

  let pivotRow = 0;
  const pivotCols: number[] = [];

  for (let col = 0; col < n && pivotRow < m; col++) {
    // Find max pivot in column
    let maxRow = pivotRow;
    for (let row = pivotRow + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }

    if (Math.abs(aug[maxRow][col]) < 1e-10) continue; // Skip zero column

    // Swap rows
    if (maxRow !== pivotRow) {
      [aug[pivotRow], aug[maxRow]] = [aug[maxRow], aug[pivotRow]];
      steps.push({
        description: `Swap R${pivotRow + 1} ↔ R${maxRow + 1}`,
        matrix: aug.map((r) => [...r]),
        latex: `R_{${pivotRow + 1}} \\leftrightarrow R_{${maxRow + 1}}`,
      });
    }

    pivotCols.push(col);

    // Eliminate below
    for (let row = pivotRow + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) < 1e-10) continue;
      const factor = aug[row][col] / aug[pivotRow][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[pivotRow][j];
      }
      steps.push({
        description: `R${row + 1} ← R${row + 1} − (${fmt(factor)}) × R${pivotRow + 1}`,
        matrix: aug.map((r) => [...r]),
        latex: `R_{${row + 1}} \\leftarrow R_{${row + 1}} - ${fmt(factor)} R_{${pivotRow + 1}}`,
      });
    }

    pivotRow++;
  }

  const rank = pivotRow;

  steps.push({
    description: "Row Echelon Form",
    matrix: aug.map((r) => [...r]),
    latex: "\\text{Row Echelon Form}",
  });

  // Check consistency: if any row has [0...0 | nonzero], no solution
  for (let row = rank; row < m; row++) {
    if (Math.abs(aug[row][n]) > 1e-10) {
      return {
        type: "none",
        steps,
      };
    }
  }

  // Infinite solutions if rank < n
  if (rank < n) {
    return {
      type: "infinite",
      steps,
      freeVariables: Array.from({ length: n - rank }, (_, i) => rank + i),
    };
  }

  // Back substitution for unique solution
  const solution = new Array(n).fill(0);

  // Scale pivot rows to 1
  for (let row = rank - 1; row >= 0; row--) {
    const col = pivotCols[row];
    const pivot = aug[row][col];
    aug[row] = aug[row].map((v) => v / pivot);
  }

  steps.push({
    description: "Reduced Row Echelon Form (RREF)",
    matrix: aug.map((r) => [...r]),
    latex: "\\text{Reduced Row Echelon Form}",
  });

  // Back substitution
  for (let row = rank - 1; row >= 0; row--) {
    const col = pivotCols[row];
    let val = aug[row][n];
    for (let j = col + 1; j < n; j++) {
      val -= aug[row][j] * solution[j];
    }
    solution[col] = parseFloat(val.toFixed(10));
  }

  steps.push({
    description: "Solution by back substitution",
    matrix: [solution],
    latex: `\\text{Solution: } ${solution.map((v, i) => `x_{${i + 1}} = ${fmt(v)}`).join(",\\; ")}`,
  });

  return { type: "unique", solution, steps };
}
