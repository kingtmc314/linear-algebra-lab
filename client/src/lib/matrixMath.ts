// ============================================================
// Matrix Math Library — Academic Precision Design
// All operations return exact fractional results where possible
// ============================================================

export type Matrix = number[][];

export interface StepResult {
  description: string;
  matrix?: Matrix;
  value?: number;
  latex?: string;
}

export interface MatrixResult {
  result?: Matrix;
  scalar?: number;
  steps: StepResult[];
  error?: string;
}

/** Create an m×n zero matrix */
export function zeroMatrix(m: number, n: number): Matrix {
  return Array.from({ length: m }, () => Array(n).fill(0));
}

/** Create an n×n identity matrix */
export function identityMatrix(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

/** Deep clone a matrix */
export function cloneMatrix(m: Matrix): Matrix {
  return m.map((row) => [...row]);
}

/** Format a number for display (avoid -0) */
export function fmt(n: number, decimals = 6): string {
  if (Object.is(n, -0)) return "0";
  const rounded = parseFloat(n.toFixed(decimals));
  // Show as integer if possible
  if (Number.isInteger(rounded)) return String(rounded);
  // Trim trailing zeros
  return rounded.toString();
}

/** Matrix addition A + B */
export function matAdd(A: Matrix, B: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  if (A.length !== B.length || A[0].length !== B[0].length) {
    return { steps, error: "dim_mismatch" };
  }
  const result = A.map((row, i) => row.map((val, j) => val + B[i][j]));
  steps.push({
    description: `C[i][j] = A[i][j] + B[i][j]`,
    matrix: result,
    latex: `C = A + B`,
  });
  return { result, steps };
}

/** Matrix subtraction A - B */
export function matSub(A: Matrix, B: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  if (A.length !== B.length || A[0].length !== B[0].length) {
    return { steps, error: "dim_mismatch" };
  }
  const result = A.map((row, i) => row.map((val, j) => val - B[i][j]));
  steps.push({
    description: `C[i][j] = A[i][j] - B[i][j]`,
    matrix: result,
    latex: `C = A - B`,
  });
  return { result, steps };
}

/** Matrix multiplication A × B */
export function matMul(A: Matrix, B: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  const m = A.length, n = A[0].length, p = B[0].length;
  if (n !== B.length) {
    return { steps, error: "dim_mismatch" };
  }
  const result = zeroMatrix(m, p);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  steps.push({
    description: `C[i][j] = Σ A[i][k] × B[k][j]`,
    matrix: result,
    latex: `C = A \\times B`,
  });
  return { result, steps };
}

/** Transpose A^T */
export function matTranspose(A: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  const result = A[0].map((_, j) => A.map((row) => row[j]));
  steps.push({
    description: `A^T[i][j] = A[j][i]`,
    matrix: result,
    latex: `A^T`,
  });
  return { result, steps };
}

/** Scalar multiplication k·A */
export function matScalar(A: Matrix, k: number): MatrixResult {
  const steps: StepResult[] = [];
  const result = A.map((row) => row.map((v) => k * v));
  steps.push({
    description: `(kA)[i][j] = k × A[i][j]`,
    matrix: result,
    latex: `${fmt(k)} \\cdot A`,
  });
  return { result, steps };
}

/** Determinant (recursive cofactor expansion) with steps */
export function matDeterminant(A: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  if (A.length !== A[0].length) {
    return { steps, error: "square_required" };
  }
  const n = A.length;

  function det(M: Matrix): number {
    if (M.length === 1) return M[0][0];
    if (M.length === 2) {
      return M[0][0] * M[1][1] - M[0][1] * M[1][0];
    }
    let result = 0;
    for (let j = 0; j < M.length; j++) {
      const minor = M.slice(1).map((row) => row.filter((_, k) => k !== j));
      result += M[0][j] * Math.pow(-1, j) * det(minor);
    }
    return result;
  }

  if (n === 2) {
    const d = det(A);
    steps.push({
      description: `det(A) = a₁₁×a₂₂ − a₁₂×a₂₁ = ${fmt(A[0][0])}×${fmt(A[1][1])} − ${fmt(A[0][1])}×${fmt(A[1][0])}`,
      value: d,
      latex: `\\det(A) = ${fmt(A[0][0])} \\times ${fmt(A[1][1])} - ${fmt(A[0][1])} \\times ${fmt(A[1][0])} = ${fmt(d)}`,
    });
    return { scalar: d, steps };
  }

  if (n === 3) {
    const d = det(A);
    steps.push({
      description: `Sarrus' Rule / Cofactor Expansion along Row 1`,
      latex: `\\det(A) = ${fmt(d)}`,
    });
    // Show cofactor expansion
    for (let j = 0; j < 3; j++) {
      const minor = A.slice(1).map((row) => row.filter((_, k) => k !== j));
      const cofactor = Math.pow(-1, j) * det(minor);
      steps.push({
        description: `Cofactor C₁${j + 1} = (−1)^${j} × det(M₁${j + 1}) = ${fmt(cofactor)}`,
        latex: `C_{1${j + 1}} = (-1)^{${j}} \\cdot \\det(M_{1${j + 1}}) = ${fmt(cofactor)}`,
      });
    }
    return { scalar: d, steps };
  }

  const d = det(A);
  steps.push({
    description: `Cofactor expansion along Row 1`,
    value: d,
    latex: `\\det(A) = ${fmt(d)}`,
  });
  return { scalar: d, steps };
}

/** Inverse matrix using Gauss-Jordan elimination with steps */
export function matInverse(A: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  const n = A.length;
  if (n !== A[0].length) {
    return { steps, error: "square_required" };
  }

  // Augment [A | I]
  const aug: number[][] = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  steps.push({
    description: `Augment [A | I] and apply Gauss-Jordan elimination`,
    matrix: aug.map((row) => row.slice(0, n)),
    latex: `[A \\mid I]`,
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivotRow = -1;
    for (let row = col; row < n; row++) {
      if (Math.abs(aug[row][col]) > 1e-10) {
        pivotRow = row;
        break;
      }
    }
    if (pivotRow === -1) {
      return { steps, error: "singular" };
    }

    // Swap rows
    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
      steps.push({
        description: `Swap R${col + 1} ↔ R${pivotRow + 1}`,
        matrix: aug.map((row) => row.slice(0, n)),
        latex: `R_{${col + 1}} \\leftrightarrow R_{${pivotRow + 1}}`,
      });
    }

    // Scale pivot row
    const pivot = aug[col][col];
    if (Math.abs(pivot - 1) > 1e-10) {
      for (let j = 0; j < 2 * n; j++) {
        aug[col][j] /= pivot;
      }
      steps.push({
        description: `R${col + 1} ← R${col + 1} / ${fmt(pivot)}`,
        matrix: aug.map((row) => row.slice(0, n)),
        latex: `R_{${col + 1}} \\leftarrow \\frac{1}{${fmt(pivot)}} R_{${col + 1}}`,
      });
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row !== col && Math.abs(aug[row][col]) > 1e-10) {
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
        steps.push({
          description: `R${row + 1} ← R${row + 1} − (${fmt(factor)}) × R${col + 1}`,
          matrix: aug.map((r) => r.slice(0, n)),
          latex: `R_{${row + 1}} \\leftarrow R_{${row + 1}} - ${fmt(factor)} R_{${col + 1}}`,
        });
      }
    }
  }

  const result = aug.map((row) => row.slice(n).map((v) => parseFloat(v.toFixed(10))));
  steps.push({
    description: `Result: A⁻¹`,
    matrix: result,
    latex: `A^{-1}`,
  });
  return { result, steps };
}

/** Format matrix as LaTeX */
export function matrixToLatex(M: Matrix, bracket: "b" | "p" | "v" = "b"): string {
  const rows = M.map((row) => row.map((v) => fmt(v)).join(" & ")).join(" \\\\ ");
  return `\\begin{${bracket}matrix} ${rows} \\end{${bracket}matrix}`;
}
