/**
 * practiceGenerator.ts
 * Random question generators for each math module.
 * Each generator returns a PracticeQuestion compatible with PracticePanel.tsx.
 */

import type { PracticeQuestion } from "@/components/PracticePanel";
import {
  type Matrix,
  zeroMatrix,
  matAdd,
  matSub,
  matMul,
  matTranspose,
  matDeterminant,
  matInverse,
  matScalar,
  matrixToLatex,
  fmt,
} from "./matrixMath";
import { vecAdd, vecSub, vecDot, vecCross, vecMagnitude } from "./vectorMath";

// ─── Tolerance ───────────────────────────────────────────────────────────────
const TOL = 1e-4;

function approx(a: number, b: number) {
  return Math.abs(a - b) < TOL;
}

// ─── Random helpers ──────────────────────────────────────────────────────────

/** Random integer in [lo, hi] */
function ri(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** Random non-zero integer in [-max, max] */
function rnz(max = 5): number {
  let v = 0;
  while (v === 0) v = ri(-max, max);
  return v;
}

/** Random matrix with integer entries in [-max, max] */
function randMatrix(rows: number, cols: number, max = 5): Matrix {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ri(-max, max))
  );
}

/** Random invertible 2×2 matrix */
function randInvertible2x2(max = 4): Matrix {
  let M: Matrix;
  do {
    M = randMatrix(2, 2, max);
  } while (Math.abs(M[0][0] * M[1][1] - M[0][1] * M[1][0]) < 0.5);
  return M;
}

/** Random invertible 3×3 matrix */
function randInvertible3x3(max = 3): Matrix {
  let M: Matrix;
  let det: number;
  do {
    M = randMatrix(3, 3, max);
    det = M[0][0] * (M[1][1]*M[2][2] - M[1][2]*M[2][1])
        - M[0][1] * (M[1][0]*M[2][2] - M[1][2]*M[2][0])
        + M[0][2] * (M[1][0]*M[2][1] - M[1][1]*M[2][0]);
  } while (Math.abs(det) < 0.5);
  return M;
}

/** Format a matrix as LaTeX */
function mLatex(M: Matrix): string {
  return matrixToLatex(M);
}

/** Parse user input as a matrix: "1 2; 3 4" → [[1,2],[3,4]] */
function parseMatrix(s: string): Matrix | null {
  try {
    const rows = s.trim().split(";").map((r) =>
      r.trim().split(/\s+/).map(Number)
    );
    if (rows.some((r) => r.some(isNaN))) return null;
    if (rows.some((r) => r.length !== rows[0].length)) return null;
    return rows;
  } catch {
    return null;
  }
}

/** Parse user input as a vector: "1 2 3" → [1,2,3] */
function parseVector(s: string): number[] | null {
  try {
    const v = s.trim().split(/\s+/).map(Number);
    if (v.some(isNaN)) return null;
    return v;
  } catch {
    return null;
  }
}

/** Check if two matrices are approximately equal */
function matApproxEq(A: Matrix, B: Matrix): boolean {
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) {
    if (A[i].length !== B[i].length) return false;
    for (let j = 0; j < A[i].length; j++) {
      if (!approx(A[i][j], B[i][j])) return false;
    }
  }
  return true;
}

/** Format a vector as LaTeX column vector */
function vecLatex(v: number[]): string {
  return `\\begin{pmatrix} ${v.join(" \\\\ ")} \\end{pmatrix}`;
}

// ─── Matrix Practice Questions ───────────────────────────────────────────────

export type MatrixPracticeType =
  | "add" | "sub" | "mul" | "transpose" | "det" | "inv" | "scalar";

export function generateMatrixQuestion(
  type: MatrixPracticeType,
  lang: "zh" | "en" = "zh"
): PracticeQuestion {
  switch (type) {
    case "add": {
      const A = randMatrix(2, 2);
      const B = randMatrix(2, 2);
      const res = matAdd(A, B);
      const answer = res.result!;
      return {
        questionLatex: `${mLatex(A)} + ${mLatex(B)} = ?`,
        inputHint: lang === "zh"
          ? "輸入矩陣，用空格分隔元素，分號分隔行。例：1 2; 3 4"
          : "Enter matrix: space-separated elements, semicolons for rows. E.g. 1 2; 3 4",
        answerDisplay: JSON.stringify(answer),
        answerLatex: mLatex(answer),
        checkAnswer: (s) => {
          const m = parseMatrix(s);
          return m !== null && matApproxEq(m, answer);
        },
      };
    }
    case "sub": {
      const A = randMatrix(2, 2);
      const B = randMatrix(2, 2);
      const res = matSub(A, B);
      const answer = res.result!;
      return {
        questionLatex: `${mLatex(A)} - ${mLatex(B)} = ?`,
        inputHint: lang === "zh"
          ? "輸入矩陣，用空格分隔元素，分號分隔行。例：1 2; 3 4"
          : "Enter matrix: space-separated elements, semicolons for rows. E.g. 1 2; 3 4",
        answerDisplay: JSON.stringify(answer),
        answerLatex: mLatex(answer),
        checkAnswer: (s) => {
          const m = parseMatrix(s);
          return m !== null && matApproxEq(m, answer);
        },
      };
    }
    case "mul": {
      const A = randMatrix(2, 2, 3);
      const B = randMatrix(2, 2, 3);
      const res = matMul(A, B);
      const answer = res.result!;
      return {
        questionLatex: `${mLatex(A)} \\cdot ${mLatex(B)} = ?`,
        inputHint: lang === "zh"
          ? "輸入矩陣，用空格分隔元素，分號分隔行。例：1 2; 3 4"
          : "Enter matrix: space-separated elements, semicolons for rows. E.g. 1 2; 3 4",
        answerDisplay: JSON.stringify(answer),
        answerLatex: mLatex(answer),
        checkAnswer: (s) => {
          const m = parseMatrix(s);
          return m !== null && matApproxEq(m, answer);
        },
      };
    }
    case "transpose": {
      const rows = ri(2, 3), cols = ri(2, 3);
      const A = randMatrix(rows, cols);
      const res = matTranspose(A);
      const answer = res.result!;
      return {
        questionLatex: `${mLatex(A)}^T = ?`,
        inputHint: lang === "zh"
          ? "輸入轉置矩陣，用空格分隔元素，分號分隔行"
          : "Enter the transposed matrix",
        answerDisplay: JSON.stringify(answer),
        answerLatex: mLatex(answer),
        checkAnswer: (s) => {
          const m = parseMatrix(s);
          return m !== null && matApproxEq(m, answer);
        },
      };
    }
    case "det": {
      const size = ri(2, 3) as 2 | 3;
      const A = randMatrix(size, size, 4);
      const res = matDeterminant(A);
      const answer = res.scalar!;
      return {
        questionLatex: `\\det ${mLatex(A)} = ?`,
        inputHint: lang === "zh" ? "輸入行列式的數值" : "Enter the determinant value",
        answerDisplay: fmt(answer),
        answerLatex: `= ${fmt(answer)}`,
        checkAnswer: (s) => {
          const v = parseFloat(s.trim());
          return !isNaN(v) && approx(v, answer);
        },
      };
    }
    case "inv": {
      const size = ri(2, 3) as 2 | 3;
      const A = size === 2 ? randInvertible2x2() : randInvertible3x3();
      const res = matInverse(A);
      const answer = res.result!;
      return {
        questionLatex: `${mLatex(A)}^{-1} = ?`,
        inputHint: lang === "zh"
          ? "輸入逆矩陣，用空格分隔元素，分號分隔行（可用小數）"
          : "Enter the inverse matrix (decimals allowed)",
        answerDisplay: JSON.stringify(answer),
        answerLatex: mLatex(answer),
        checkAnswer: (s) => {
          const m = parseMatrix(s);
          return m !== null && matApproxEq(m, answer);
        },
      };
    }
    case "scalar": {
      const A = randMatrix(2, 2);
      const k = rnz(5);
      const res = matScalar(A, k);
      const answer = res.result!;
      return {
        questionLatex: `${k} \\cdot ${mLatex(A)} = ?`,
        inputHint: lang === "zh"
          ? "輸入純量乘積矩陣，用空格分隔元素，分號分隔行"
          : "Enter the scalar product matrix",
        answerDisplay: JSON.stringify(answer),
        answerLatex: mLatex(answer),
        checkAnswer: (s) => {
          const m = parseMatrix(s);
          return m !== null && matApproxEq(m, answer);
        },
      };
    }
  }
}

// ─── Linear System Practice Questions ────────────────────────────────────────

export function generateLinearSystemQuestion(lang: "zh" | "en" = "zh"): PracticeQuestion {
  // Generate a 2×2 or 3×3 system with a unique solution
  const size = ri(2, 3);
  let A: Matrix, b: number[], x: number[];

  if (size === 2) {
    // Ensure unique solution: generate x first, then compute b = Ax
    x = [rnz(4), rnz(4)];
    A = randInvertible2x2(3);
    b = [A[0][0]*x[0] + A[0][1]*x[1], A[1][0]*x[0] + A[1][1]*x[1]];
  } else {
    x = [rnz(3), rnz(3), rnz(3)];
    A = randInvertible3x3(3);
    b = [
      A[0][0]*x[0] + A[0][1]*x[1] + A[0][2]*x[2],
      A[1][0]*x[0] + A[1][1]*x[1] + A[1][2]*x[2],
      A[2][0]*x[0] + A[2][1]*x[1] + A[2][2]*x[2],
    ];
  }

  // Build augmented matrix LaTeX
  const augRows = A.map((row, i) => [...row, b[i]]);
  const augLatex = `\\left(\\begin{array}{${"c".repeat(size)}|c} ${
    augRows.map((row) => row.join(" & ")).join(" \\\\ ")
  } \\end{array}\\right)`;

  const xLatex = size === 2
    ? `x_1 = ${x[0]},\\quad x_2 = ${x[1]}`
    : `x_1 = ${x[0]},\\quad x_2 = ${x[1]},\\quad x_3 = ${x[2]}`;

  return {
    questionLatex: `${lang === "zh" ? "\\text{解方程組：}" : "\\text{Solve the system:}"}\\quad ${augLatex}`,
    inputHint: lang === "zh"
      ? `輸入解，用空格分隔。例：${size === 2 ? "1 -2" : "1 -2 3"}（即 x₁ x₂${size === 3 ? " x₃" : ""}）`
      : `Enter solution separated by spaces. E.g. ${size === 2 ? "1 -2" : "1 -2 3"} (i.e. x₁ x₂${size === 3 ? " x₃" : ""})`,
    answerDisplay: x.join(", "),
    answerLatex: xLatex,
    checkAnswer: (s) => {
      const v = parseVector(s);
      if (!v || v.length !== size) return false;
      return x.every((xi, i) => approx(v[i], xi));
    },
  };
}

// ─── Vector Practice Questions ────────────────────────────────────────────────

export type VectorPracticeType = "add" | "sub" | "dot" | "cross" | "magnitude";

export function generateVectorQuestion(
  type: VectorPracticeType,
  lang: "zh" | "en" = "zh"
): PracticeQuestion {
  switch (type) {
    case "add": {
      const a = [ri(-5,5), ri(-5,5), ri(-5,5)];
      const b = [ri(-5,5), ri(-5,5), ri(-5,5)];
      const res = vecAdd(a, b);
      const answer = res.vector!;
      return {
        questionLatex: `${vecLatex(a)} + ${vecLatex(b)} = ?`,
        inputHint: lang === "zh" ? "輸入向量分量，用空格分隔。例：1 -2 3" : "Enter vector components separated by spaces. E.g. 1 -2 3",
        answerDisplay: answer.join(", "),
        answerLatex: vecLatex(answer),
        checkAnswer: (s) => {
          const v = parseVector(s);
          return v !== null && v.length === 3 && answer.every((ai, i) => approx(v[i], ai));
        },
      };
    }
    case "sub": {
      const a = [ri(-5,5), ri(-5,5), ri(-5,5)];
      const b = [ri(-5,5), ri(-5,5), ri(-5,5)];
      const res = vecSub(a, b);
      const answer = res.vector!;
      return {
        questionLatex: `${vecLatex(a)} - ${vecLatex(b)} = ?`,
        inputHint: lang === "zh" ? "輸入向量分量，用空格分隔。例：1 -2 3" : "Enter vector components separated by spaces. E.g. 1 -2 3",
        answerDisplay: answer.join(", "),
        answerLatex: vecLatex(answer),
        checkAnswer: (s) => {
          const v = parseVector(s);
          return v !== null && v.length === 3 && answer.every((ai, i) => approx(v[i], ai));
        },
      };
    }
    case "dot": {
      const a = [ri(-5,5), ri(-5,5), ri(-5,5)];
      const b = [ri(-5,5), ri(-5,5), ri(-5,5)];
      const res = vecDot(a, b);
      const answer = res.scalar!;
      return {
        questionLatex: `${vecLatex(a)} \\cdot ${vecLatex(b)} = ?`,
        inputHint: lang === "zh" ? "輸入內積的數值" : "Enter the dot product value",
        answerDisplay: fmt(answer),
        answerLatex: `= ${fmt(answer)}`,
        checkAnswer: (s) => {
          const v = parseFloat(s.trim());
          return !isNaN(v) && approx(v, answer);
        },
      };
    }
    case "cross": {
      const a: [number,number,number] = [ri(-4,4), ri(-4,4), ri(-4,4)];
      const b: [number,number,number] = [ri(-4,4), ri(-4,4), ri(-4,4)];
      const res = vecCross(a, b);
      if (res.error || !res.vector) {
        // Fallback: generate again
        return generateVectorQuestion("cross", lang);
      }
      const answer = res.vector;
      return {
        questionLatex: `${vecLatex(a)} \\times ${vecLatex(b)} = ?`,
        inputHint: lang === "zh" ? "輸入叉積向量分量，用空格分隔。例：1 -2 3" : "Enter cross product vector components separated by spaces. E.g. 1 -2 3",
        answerDisplay: answer.join(", "),
        answerLatex: vecLatex(answer),
        checkAnswer: (s) => {
          const v = parseVector(s);
          return v !== null && v.length === 3 && answer.every((ai, i) => approx(v[i], ai));
        },
      };
    }
    case "magnitude": {
      // Use Pythagorean triple-based vectors for exact answers
      const triples = [[3,4,0],[0,3,4],[5,12,0],[0,5,12],[3,0,4]];
      const t = triples[ri(0, triples.length - 1)];
      const signs = [1,-1];
      const a = t.map((v) => v * signs[ri(0,1)]);
      const res = vecMagnitude(a);
      const answer = res.scalar!;
      return {
        questionLatex: `\\left|${vecLatex(a)}\\right| = ?`,
        inputHint: lang === "zh" ? "輸入向量的模（長度）" : "Enter the magnitude (length) of the vector",
        answerDisplay: fmt(answer),
        answerLatex: `= ${fmt(answer)}`,
        checkAnswer: (s) => {
          const v = parseFloat(s.trim());
          return !isNaN(v) && approx(v, answer);
        },
      };
    }
  }
}

// ─── Eigenvalue Practice Questions ───────────────────────────────────────────

export function generateEigenQuestion(lang: "zh" | "en" = "zh"): PracticeQuestion {
  // Generate a 2×2 matrix with integer eigenvalues
  // Use diagonal or triangular matrices for clean eigenvalues
  const type = ri(0, 2);
  let A: Matrix;
  let eigenvalues: number[];

  if (type === 0) {
    // Diagonal matrix: eigenvalues are diagonal entries
    const l1 = rnz(5), l2 = rnz(5);
    A = [[l1, 0], [0, l2]];
    eigenvalues = [l1, l2].sort((a, b) => a - b);
  } else if (type === 1) {
    // Upper triangular: eigenvalues are diagonal entries
    const l1 = rnz(4), l2 = rnz(4);
    A = [[l1, ri(-3,3)], [0, l2]];
    eigenvalues = [l1, l2].sort((a, b) => a - b);
  } else {
    // Symmetric matrix with integer eigenvalues
    // A = P * diag(l1, l2) * P^-1 where P is simple
    const l1 = rnz(4), l2 = rnz(4);
    // Use P = [[1,1],[0,1]] → A = [[l1, l2-l1],[0, l2]]
    // Or just use diagonal for simplicity
    A = [[l1, 0], [0, l2]];
    eigenvalues = [l1, l2].sort((a, b) => a - b);
  }

  const eigenStr = eigenvalues.join(", ");
  const eigenLatex = eigenvalues.map((v, i) => `\\lambda_{${i+1}} = ${v}`).join(",\\quad ");

  return {
    questionLatex: `${lang === "zh" ? "\\text{求矩陣的特徵值：}" : "\\text{Find the eigenvalues of:}"}\\quad ${matrixToLatex(A)}`,
    inputHint: lang === "zh"
      ? "輸入特徵值，由小到大排列，用空格分隔。例：-3 2"
      : "Enter eigenvalues sorted ascending, separated by spaces. E.g. -3 2",
    answerDisplay: eigenStr,
    answerLatex: eigenLatex,
    checkAnswer: (s) => {
      const v = parseVector(s);
      if (!v || v.length !== 2) return false;
      const sorted = [...v].sort((a, b) => a - b);
      return eigenvalues.every((ev, i) => approx(sorted[i], ev));
    },
    solutionLatex: `\\text{特徵多項式：} \\det(A - \\lambda I) = (${eigenvalues[0]} - \\lambda)(${eigenvalues[1]} - \\lambda) = 0`,
  };
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Pick a random matrix question type */
export function generateRandomMatrixQuestion(lang: "zh" | "en" = "zh"): PracticeQuestion {
  const types: MatrixPracticeType[] = ["add", "sub", "mul", "transpose", "det", "inv", "scalar"];
  return generateMatrixQuestion(types[ri(0, types.length - 1)], lang);
}

/** Pick a random vector question type */
export function generateRandomVectorQuestion(lang: "zh" | "en" = "zh"): PracticeQuestion {
  const types: VectorPracticeType[] = ["add", "sub", "dot", "cross", "magnitude"];
  return generateVectorQuestion(types[ri(0, types.length - 1)], lang);
}
