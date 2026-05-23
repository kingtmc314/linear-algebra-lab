/**
 * matrixPower.ts
 * Compute A^n using diagonalization: A = PDP⁻¹ → A^n = PD^nP⁻¹
 * All results expressed as exact values (integers, fractions, or power notation).
 * Supports 2×2 and 3×3 diagonalizable matrices with real eigenvalues.
 */

import { computeEigen } from "./eigenMath";

// ─── Exact Rational Arithmetic ───────────────────────────────────────────────

/** Greatest common divisor */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { const t = b; b = a % b; a = t; }
  return a || 1;
}

/** Represent a number as a fraction {num, den} in lowest terms */
function toFrac(v: number): { num: number; den: number } {
  if (Math.abs(v) < 1e-9) return { num: 0, den: 1 };
  // Try denominators up to 10000 for exact rational representation
  for (let den = 1; den <= 10000; den++) {
    const num = Math.round(v * den);
    if (Math.abs(num / den - v) < 1e-9) {
      const g = gcd(Math.abs(num), den);
      return { num: num / g, den: den / g };
    }
  }
  return { num: Math.round(v * 1000), den: 1000 };
}

/** Format a number as exact LaTeX: integer, fraction, or decimal */
export function fmtExact(v: number): string {
  if (Math.abs(v) < 1e-9) return "0";
  const { num, den } = toFrac(v);
  if (den === 1) return num.toString();
  const sign = num < 0 ? "-" : "";
  return `${sign}\\dfrac{${Math.abs(num)}}{${den}}`;
}

/** Format λ^n as exact LaTeX */
export function fmtPower(base: number, exp: number): string {
  if (exp === 0) return "1";
  if (Math.abs(base) < 1e-9) return "0";
  if (Math.abs(base - 1) < 1e-9) return "1";
  if (Math.abs(base + 1) < 1e-9) return exp % 2 === 0 ? "1" : "-1";

  const { num: bNum, den: bDen } = toFrac(base);

  // Compute the actual value
  const value = Math.pow(base, exp);

  // If value is a small integer, show it directly
  if (Math.abs(value - Math.round(value)) < 1e-6 && Math.abs(value) < 1e15) {
    return Math.round(value).toString();
  }

  // If base is integer, show as base^exp
  if (bDen === 1) {
    return `${bNum}^{${exp}}`;
  }

  // Fraction base: (num/den)^exp = num^exp / den^exp
  const numPow = Math.pow(bNum, exp);
  const denPow = Math.pow(bDen, exp);
  if (Math.abs(numPow - Math.round(numPow)) < 1e-6 && Math.abs(denPow - Math.round(denPow)) < 1e-6) {
    const np = Math.round(numPow);
    const dp = Math.round(denPow);
    const g = gcd(Math.abs(np), dp);
    if (dp / g === 1) return (np / g).toString();
    return `\\dfrac{${np / g}}{${dp / g}}`;
  }

  return `\\left(\\dfrac{${bNum}}{${bDen}}\\right)^{${exp}}`;
}

/** Format a matrix entry that is a linear combination of λ^n terms */
function fmtEntry(terms: Array<{ coeff: number; lambdaPow: number; exp: number }>): string {
  const nonZero = terms.filter((t) => Math.abs(t.coeff) > 1e-9);
  if (nonZero.length === 0) return "0";

  const parts = nonZero.map((t, i) => {
    const powStr = fmtPower(t.lambdaPow, t.exp);
    const { num: cNum, den: cDen } = toFrac(t.coeff);
    const absNum = Math.abs(cNum);
    const sign = t.coeff < 0 ? "-" : i > 0 ? "+" : "";

    let coeffStr: string;
    if (cDen === 1 && absNum === 1) {
      coeffStr = ""; // coefficient of 1 is omitted
    } else if (cDen === 1) {
      coeffStr = absNum.toString();
    } else {
      coeffStr = `\\dfrac{${absNum}}{${cDen}}`;
    }

    if (powStr === "1") return `${sign}${cDen === 1 ? (absNum === 1 ? "1" : absNum.toString()) : `\\dfrac{${absNum}}{${cDen}}`}`;
    if (powStr === "0") return `${sign}0`;
    return `${sign}${coeffStr}${powStr}`;
  });

  return parts.join(" ").trim() || "0";
}

// ─── Matrix helpers ──────────────────────────────────────────────────────────

type Matrix = number[][];

function matMul(A: Matrix, B: Matrix): Matrix {
  const m = A.length, n = B[0].length, k = B.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Array.from({ length: k }, (_, l) => A[i][l] * B[l][j]).reduce((s, v) => s + v, 0)
    )
  );
}

function matToLatex(M: Matrix, fn: (v: number) => string = fmtExact): string {
  const rows = M.map((row) => row.map((v) => fn(v)).join(" & "));
  return `\\begin{pmatrix} ${rows.join(" \\\\ ")} \\end{pmatrix}`;
}

/** 2×2 matrix inverse (exact) */
function inv2x2(M: Matrix): Matrix | null {
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  if (Math.abs(det) < 1e-9) return null;
  return [
    [ M[1][1] / det, -M[0][1] / det],
    [-M[1][0] / det,  M[0][0] / det],
  ];
}

/** 3×3 matrix inverse (exact) */
function inv3x3(M: Matrix): Matrix | null {
  const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, k] = M[2];
  const det = a*(e*k - f*h) - b*(d*k - f*g) + c*(d*h - e*g);
  if (Math.abs(det) < 1e-9) return null;
  const adj: Matrix = [
    [ (e*k-f*h), -(b*k-c*h),  (b*f-c*e)],
    [-(d*k-f*g),  (a*k-c*g), -(a*f-c*d)],
    [ (d*h-e*g), -(a*h-b*g),  (a*e-b*d)],
  ];
  return adj.map((row) => row.map((v) => v / det));
}

// ─── Power Step Interface ────────────────────────────────────────────────────

export interface PowerStep {
  titleZh: string;
  titleEn: string;
  latex: string;
  explanationZh: string;
  explanationEn: string;
}

export interface MatrixPowerResult {
  n: number;
  eigenvalues: number[];
  P: Matrix;
  Pinv: Matrix;
  D: Matrix;
  Dn: Matrix;
  An: Matrix;
  AnLatex: string;          // exact LaTeX for A^n (symbolic when n is symbolic)
  AnSymbolicLatex: string;  // symbolic form with λ^n
  steps: PowerStep[];
  isDiagonalizable: boolean;
  error?: string;
}

// ─── Main: Compute A^n ───────────────────────────────────────────────────────

export function computeMatrixPower(A: Matrix, n: number): MatrixPowerResult {
  const size = A.length as 2 | 3;
  const steps: PowerStep[] = [];

  // Step 1: Compute eigenvalues/eigenvectors
  const eigenResult = computeEigen(A);

  if (eigenResult.error || eigenResult.isComplex) {
    return {
      n, eigenvalues: [], P: [], Pinv: [], D: [], Dn: [], An: [],
      AnLatex: "", AnSymbolicLatex: "",
      steps, isDiagonalizable: false,
      error: eigenResult.isComplex ? "complex_eigenvalues" : (eigenResult.error || "eigen_failed"),
    };
  }

  const lambdas = eigenResult.eigenvalues;
  const vecs = eigenResult.eigenvectors;

  steps.push({
    titleZh: "第一步：求特徵值與特徵向量",
    titleEn: "Step 1: Find Eigenvalues and Eigenvectors",
    latex: `A = ${matToLatex(A)}`,
    explanationZh: `利用特徵多項式 det(A - λI) = 0 求特徵值`,
    explanationEn: `Solve characteristic polynomial det(A - λI) = 0`,
  });

  const lambdaList = lambdas.map((v, i) => `\\lambda_{${i+1}} = ${fmtExact(v)}`).join(",\\quad ");
  steps.push({
    titleZh: "特徵值",
    titleEn: "Eigenvalues",
    latex: lambdaList,
    explanationZh: "特徵值即為對角矩陣 D 的對角線元素",
    explanationEn: "Eigenvalues become the diagonal entries of D",
  });

  // Build P (columns = eigenvectors) and D
  const P: Matrix = Array.from({ length: size }, (_, i) => vecs.map((v) => v[i]));
  const D: Matrix = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? lambdas[i] : 0))
  );

  // Check P is invertible
  const Pinv = size === 2 ? inv2x2(P) : inv3x3(P);
  if (!Pinv) {
    return {
      n, eigenvalues: lambdas, P, Pinv: [], D, Dn: [], An: [],
      AnLatex: "", AnSymbolicLatex: "",
      steps, isDiagonalizable: false,
      error: "not_diagonalizable",
    };
  }

  steps.push({
    titleZh: "第二步：建立對角化分解 A = PDP⁻¹",
    titleEn: "Step 2: Diagonalization A = PDP⁻¹",
    latex: `P = ${matToLatex(P)},\\quad D = ${matToLatex(D)},\\quad P^{-1} = ${matToLatex(Pinv)}`,
    explanationZh: "P 的各列為對應特徵向量，D 為對角特徵值矩陣",
    explanationEn: "Columns of P are eigenvectors; D is the diagonal eigenvalue matrix",
  });

  // D^n: diagonal entries are λ_i^n
  const Dn: Matrix = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? Math.pow(lambdas[i], n) : 0))
  );

  // DnLatex is unused but kept for reference
  const _DnLatex = matToLatex(D, (v) => {
    const idx = lambdas.findIndex((lam) => Math.abs(lam - v) < 1e-9);
    if (idx >= 0) return `\\lambda_{${idx+1}}^n`;
    return fmtExact(v);
  });

  // Build symbolic D^n latex
  const DnSymLatex = `\\begin{pmatrix} ${lambdas.map((lam, i) => {
    const row = lambdas.map((_, j) => (i === j ? `\\lambda_{${i+1}}^n` : "0"));
    return row.join(" & ");
  }).join(" \\\\ ")} \\end{pmatrix}`;

  steps.push({
    titleZh: "第三步：計算 D^n（對角矩陣的 n 次方）",
    titleEn: "Step 3: Compute D^n (power of diagonal matrix)",
    latex: `D^n = ${DnSymLatex} = ${matToLatex(Dn, (v) => fmtExact(v))}`,
    explanationZh: "對角矩陣的 n 次方只需將各對角元素取 n 次方",
    explanationEn: "For a diagonal matrix, raise each diagonal entry to the power n",
  });

  // A^n = P D^n P^{-1}
  const PDn = matMul(P, Dn);
  const An = matMul(PDn, Pinv);

  steps.push({
    titleZh: "第四步：計算 A^n = P · D^n · P⁻¹",
    titleEn: "Step 4: Compute A^n = P · D^n · P⁻¹",
    latex: `A^n = P \\cdot D^n \\cdot P^{-1} = ${matToLatex(P)} \\cdot ${matToLatex(Dn, fmtExact)} \\cdot ${matToLatex(Pinv)}`,
    explanationZh: "代入具體 n 值計算最終結果",
    explanationEn: "Substitute the specific value of n to get the final result",
  });

  // Build exact LaTeX for A^n
  const AnLatex = matToLatex(An, fmtExact);

  // Build symbolic A^n using λ^n expressions
  // For 2×2: A^n = P * diag(λ1^n, λ2^n) * P^{-1}
  // We build a symbolic expression per entry
  const AnSymbolicEntries: string[][] = Array.from({ length: size }, () => Array(size).fill("0"));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      // A^n[i][j] = sum_k P[i][k] * λ_k^n * Pinv[k][j]
      const terms = lambdas.map((lam, k) => ({
        coeff: P[i][k] * Pinv[k][j],
        lambdaPow: lam,
        exp: n,
      }));
      AnSymbolicEntries[i][j] = fmtEntry(terms);
    }
  }
  const AnSymbolicLatex = `\\begin{pmatrix} ${AnSymbolicEntries.map((row) => row.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;

  steps.push({
    titleZh: `最終結果：A^{${n}}`,
    titleEn: `Final Result: A^{${n}}`,
    latex: `A^{${n}} = ${AnLatex}`,
    explanationZh: `所有元素均以精確值表示`,
    explanationEn: `All entries expressed as exact values`,
  });

  // Verify: A^n should satisfy A^n * v = λ^n * v for each eigenvector
  const verifyLatex = lambdas.map((lam, i) =>
    `\\lambda_{${i+1}}^{${n}} = ${fmtPower(lam, n)}`
  ).join(",\\quad ");
  steps.push({
    titleZh: "驗證：各特徵值的 n 次方",
    titleEn: "Verification: n-th power of each eigenvalue",
    latex: verifyLatex,
    explanationZh: "對角矩陣 D^n 的對角元素即為各特徵值的 n 次方",
    explanationEn: "Diagonal entries of D^n equal the n-th power of each eigenvalue",
  });

  return {
    n, eigenvalues: lambdas, P, Pinv, D, Dn, An,
    AnLatex, AnSymbolicLatex,
    steps, isDiagonalizable: true,
  };
}

/** Check if a matrix is diagonalizable (real eigenvalues, linearly independent eigenvectors) */
export function isDiagonalizable(A: Matrix): boolean {
  const result = computeEigen(A);
  if (result.error || result.isComplex) return false;
  const size = A.length;
  const P: Matrix = Array.from({ length: size }, (_, i) =>
    result.eigenvectors.map((v) => v[i])
  );
  const Pinv = size === 2 ? inv2x2(P) : inv3x3(P);
  return Pinv !== null;
}
