// ============================================================
// Matrix Math Library — Detailed Step-by-Step Derivations
// Each operation returns steps showing HOW each result is obtained
// ============================================================

import {
  type Rational,
  type RatMatrix,
  rat,
  fromFloat,
  div as ratDiv,
  sub as ratSub,
  mul as ratMul,
  neg as ratNeg,
  isZero as ratIsZero,
  toNumber as ratToNumber,
  ratToLatex,
  ratToStr,
  ratMatLatex,
} from "./rational";

export type Matrix = number[][];

export interface StepResult {
  descriptionZh: string;
  descriptionEn: string;
  latex: string;
  matrix?: Matrix;
  value?: number;
}

export interface MatrixResult {
  result?: Matrix;
  scalar?: number;
  steps: StepResult[];
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function zeroMatrix(m: number, n: number): Matrix {
  return Array.from({ length: m }, () => Array(n).fill(0));
}

export function identityMatrix(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

export function cloneMatrix(m: Matrix): Matrix {
  return m.map((row) => [...row]);
}

/** Format a number: show fraction if possible, else decimal */
export function fmt(n: number, decimals = 6): string {
  if (Object.is(n, -0)) return "0";
  if (!isFinite(n)) return n > 0 ? "\\infty" : "-\\infty";
  if (Math.abs(n) < 1e-10) return "0";
  const frac = toFraction(n);
  if (frac) return frac;
  const rounded = parseFloat(n.toFixed(decimals));
  return rounded.toString();
}

function toFraction(x: number): string | null {
  if (Number.isInteger(x)) return String(x);
  const tol = 1e-8;
  for (let d = 2; d <= 120; d++) {
    const num = Math.round(x * d);
    if (Math.abs(num / d - x) < tol) {
      if (num < 0) return `-\\frac{${-num}}{${d}}`;
      return `\\frac{${num}}{${d}}`;
    }
  }
  return null;
}

/**
 * Render a square-root expression in exact LaTeX form.
 * e.g. sqrtExact(5) => "\\sqrt{5}", sqrtExact(4) => "2", sqrtExact(12) => "2\\sqrt{3}"
 */
export function sqrtExact(n: number): string {
  if (n < 0) return `\\sqrt{${fmt(n)}}`;
  if (Math.abs(n) < 1e-10) return "0";
  const sqrtN = Math.sqrt(n);
  if (Math.abs(sqrtN - Math.round(sqrtN)) < 1e-8) return fmt(Math.round(sqrtN));
  const nInt = Math.round(n);
  if (Math.abs(nInt - n) < 1e-8 && nInt > 0) {
    for (let k = Math.floor(Math.sqrt(nInt)); k >= 2; k--) {
      if (nInt % (k * k) === 0) {
        const inner = nInt / (k * k);
        if (inner === 1) return `${k}`;
        return `${k}\\sqrt{${inner}}`;
      }
    }
    return `\\sqrt{${nInt}}`;
  }
  // Non-integer: try fraction under sqrt e.g. sqrt(1/2) => \frac{\sqrt{2}}{2}
  for (let d = 2; d <= 60; d++) {
    const num = Math.round(n * d * d);
    if (Math.abs(num / (d * d) - n) < 1e-8 && num > 0) {
      const inner = num;
      const sqrtInner = Math.sqrt(inner);
      if (Math.abs(sqrtInner - Math.round(sqrtInner)) < 1e-8) {
        return `\\frac{${Math.round(sqrtInner)}}{${d}}`;
      }
      for (let k = Math.floor(Math.sqrt(inner)); k >= 2; k--) {
        if (inner % (k * k) === 0) {
          const rem = inner / (k * k);
          if (rem === 1) return `\\frac{${k}}{${d}}`;
          return `\\frac{${k}\\sqrt{${rem}}}{${d}}`;
        }
      }
      return `\\frac{\\sqrt{${inner}}}{${d}}`;
    }
  }
  return fmt(sqrtN);
}

/**
 * Render an angle in exact form (degrees and radians).
 * Returns { deg: "60^\\circ", rad: "\\frac{\\pi}{3}" }
 */
export function angleExact(deg: number): { deg: string; rad: string } {
  const tol = 1e-6;
  const exactAngles: { d: number; degStr: string; radStr: string }[] = [
    { d: 0,   degStr: "0^\\circ",          radStr: "0" },
    { d: 30,  degStr: "30^\\circ",         radStr: "\\frac{\\pi}{6}" },
    { d: 45,  degStr: "45^\\circ",         radStr: "\\frac{\\pi}{4}" },
    { d: 60,  degStr: "60^\\circ",         radStr: "\\frac{\\pi}{3}" },
    { d: 90,  degStr: "90^\\circ",         radStr: "\\frac{\\pi}{2}" },
    { d: 120, degStr: "120^\\circ",        radStr: "\\frac{2\\pi}{3}" },
    { d: 135, degStr: "135^\\circ",        radStr: "\\frac{3\\pi}{4}" },
    { d: 150, degStr: "150^\\circ",        radStr: "\\frac{5\\pi}{6}" },
    { d: 180, degStr: "180^\\circ",        radStr: "\\pi" },
  ];
  for (const { d, degStr, radStr } of exactAngles) {
    if (Math.abs(deg - d) < tol) return { deg: degStr, rad: radStr };
  }
  const rad = (deg * Math.PI) / 180;
  for (let d = 1; d <= 12; d++) {
    for (let n = 1; n <= 2 * d; n++) {
      if (Math.abs(rad - (n * Math.PI) / d) < tol) {
        const radStr = n === 1 ? `\\frac{\\pi}{${d}}` : `\\frac{${n}\\pi}{${d}}`;
        return { deg: `${fmt(deg)}^\\circ`, rad: radStr };
      }
    }
  }
  return { deg: `${fmt(deg)}^\\circ`, rad: `${fmt(rad)}` };
}

/** Convert a matrix to LaTeX bmatrix */
export function matrixToLatex(M: Matrix, bracket: "b" | "p" | "v" = "b"): string {
  const rows = M.map((row) => row.map((v) => fmt(v)).join(" & ")).join(" \\\\ ");
  return `\\begin{${bracket}matrix} ${rows} \\end{${bracket}matrix}`;
}

function augMatrixLatex(aug: Matrix, n: number): string {
  const rows = aug.map((row) => {
    const left = row.slice(0, n).map(fmt).join(" & ");
    const right = row.slice(n).map(fmt).join(" & ");
    return `${left} & ${right}`;
  });
  const cols = "c".repeat(n) + "|" + "c".repeat(n);
  return `\\left[\\begin{array}{${cols}} ${rows.join(" \\\\ ")} \\end{array}\\right]`;
}

// ─── Matrix Addition ──────────────────────────────────────────────────────────

export function matAdd(A: Matrix, B: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  if (A.length !== B.length || A[0].length !== B[0].length) {
    return { steps, error: "dim_mismatch" };
  }
  const m = A.length, n = A[0].length;

  steps.push({
    descriptionZh: `確認維度：A 和 B 均為 ${m}×${n} 矩陣，可以相加`,
    descriptionEn: `Verify dimensions: both A and B are ${m}×${n} matrices — addition is valid`,
    latex: `A = ${matrixToLatex(A)},\\quad B = ${matrixToLatex(B)}`,
  });

  steps.push({
    descriptionZh: "矩陣加法規則：對應位置元素相加",
    descriptionEn: "Matrix addition rule: add corresponding elements",
    latex: `(A+B)_{ij} = a_{ij} + b_{ij}`,
  });

  const result: Matrix = [];
  for (let i = 0; i < m; i++) {
    result.push([]);
    const rowTerms: string[] = [];
    for (let j = 0; j < n; j++) {
      const a = A[i][j], b = B[i][j], s = a + b;
      result[i].push(s);
      const bStr = b < 0 ? `(${fmt(b)})` : fmt(b);
      rowTerms.push(`${fmt(a)}+${bStr}=${fmt(s)}`);
    }
    steps.push({
      descriptionZh: `第 ${i+1} 行逐元素計算`,
      descriptionEn: `Row ${i+1} element-wise`,
      latex: rowTerms.join(",\\quad "),
    });
  }

  steps.push({
    descriptionZh: "最終結果",
    descriptionEn: "Final result",
    latex: `A + B = ${matrixToLatex(result)}`,
    matrix: result,
  });

  return { result, steps };
}

// ─── Matrix Subtraction ───────────────────────────────────────────────────────

export function matSub(A: Matrix, B: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  if (A.length !== B.length || A[0].length !== B[0].length) {
    return { steps, error: "dim_mismatch" };
  }
  const m = A.length, n = A[0].length;

  steps.push({
    descriptionZh: `確認維度：A 和 B 均為 ${m}×${n} 矩陣，可以相減`,
    descriptionEn: `Verify dimensions: both A and B are ${m}×${n} matrices — subtraction is valid`,
    latex: `A = ${matrixToLatex(A)},\\quad B = ${matrixToLatex(B)}`,
  });

  steps.push({
    descriptionZh: "矩陣減法規則：(A−B)ᵢⱼ = Aᵢⱼ − Bᵢⱼ",
    descriptionEn: "Matrix subtraction rule: (A−B)ᵢⱼ = Aᵢⱼ − Bᵢⱼ",
    latex: `(A-B)_{ij} = a_{ij} - b_{ij}`,
  });

  const result: Matrix = [];
  for (let i = 0; i < m; i++) {
    result.push([]);
    const rowTerms: string[] = [];
    for (let j = 0; j < n; j++) {
      const a = A[i][j], b = B[i][j], d = a - b;
      result[i].push(d);
      rowTerms.push(`${fmt(a)}-${fmt(b)}=${fmt(d)}`);
    }
    steps.push({
      descriptionZh: `第 ${i+1} 行逐元素計算`,
      descriptionEn: `Row ${i+1} element-wise`,
      latex: rowTerms.join(",\\quad "),
    });
  }

  steps.push({
    descriptionZh: "最終結果",
    descriptionEn: "Final result",
    latex: `A - B = ${matrixToLatex(result)}`,
    matrix: result,
  });

  return { result, steps };
}

// ─── Matrix Multiplication ────────────────────────────────────────────────────

export function matMul(A: Matrix, B: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  const mA = A.length, nA = A[0].length, mB = B.length, nB = B[0].length;

  if (nA !== mB) {
    return { steps, error: "dim_mismatch" };
  }

  steps.push({
    descriptionZh: `確認維度：A 為 ${mA}×${nA}，B 為 ${mB}×${nB}，結果 C 為 ${mA}×${nB}`,
    descriptionEn: `Verify dimensions: A is ${mA}×${nA}, B is ${mB}×${nB}, result C is ${mA}×${nB}`,
    latex: `A_{${mA}\\times${nA}} \\times B_{${mB}\\times${nB}} = C_{${mA}\\times${nB}}`,
  });

  steps.push({
    descriptionZh: "矩陣乘法規則：Cᵢⱼ = 第 i 行與第 j 列的點積",
    descriptionEn: "Matrix multiplication rule: Cᵢⱼ = dot product of row i and column j",
    latex: `c_{ij} = \\sum_{k=1}^{${nA}} a_{ik} \\cdot b_{kj}`,
  });

  const result: Matrix = zeroMatrix(mA, nB);

  for (let i = 0; i < mA; i++) {
    for (let j = 0; j < nB; j++) {
      const terms: string[] = [];
      let sum = 0;
      for (let k = 0; k < nA; k++) {
        const prod = A[i][k] * B[k][j];
        sum += prod;
        terms.push(`(${fmt(A[i][k])})(${fmt(B[k][j])})`);
      }
      result[i][j] = sum;
      steps.push({
        descriptionZh: `計算 C[${i+1}][${j+1}]：第 ${i+1} 行 · 第 ${j+1} 列`,
        descriptionEn: `Compute C[${i+1}][${j+1}]: row ${i+1} · col ${j+1}`,
        latex: `c_{${i+1}${j+1}} = ${terms.join("+")} = ${fmt(sum)}`,
      });
    }
  }

  steps.push({
    descriptionZh: "最終結果",
    descriptionEn: "Final result",
    latex: `C = A \\times B = ${matrixToLatex(result)}`,
    matrix: result,
  });

  return { result, steps };
}

// ─── Transpose ────────────────────────────────────────────────────────────────

export function matTranspose(A: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  const m = A.length, n = A[0].length;

  steps.push({
    descriptionZh: `輸入矩陣 A 為 ${m}×${n}，轉置後 Aᵀ 為 ${n}×${m}`,
    descriptionEn: `Input A is ${m}×${n}; transpose Aᵀ is ${n}×${m}`,
    latex: `A = ${matrixToLatex(A)}`,
  });

  steps.push({
    descriptionZh: "轉置規則：(Aᵀ)ᵢⱼ = Aⱼᵢ（行列互換）",
    descriptionEn: "Transpose rule: (Aᵀ)ᵢⱼ = Aⱼᵢ (swap rows and columns)",
    latex: `(A^T)_{ij} = a_{ji}`,
  });

  // Show a few swap examples
  const swaps: string[] = [];
  for (let i = 0; i < m && swaps.length < 6; i++) {
    for (let j = 0; j < n && swaps.length < 6; j++) {
      if (i !== j) swaps.push(`a_{${i+1}${j+1}}=${fmt(A[i][j])} \\Rightarrow (A^T)_{${j+1}${i+1}}=${fmt(A[i][j])}`);
    }
  }
  if (swaps.length > 0) {
    steps.push({
      descriptionZh: "元素位置互換示例：",
      descriptionEn: "Example element position swaps:",
      latex: swaps.join(",\\quad "),
    });
  }

  const result = A[0].map((_, j) => A.map((row) => row[j]));

  steps.push({
    descriptionZh: "最終結果",
    descriptionEn: "Final result",
    latex: `A^T = ${matrixToLatex(result)}`,
    matrix: result,
  });

  return { result, steps };
}

// ─── Scalar Multiplication ────────────────────────────────────────────────────

export function matScalar(A: Matrix, k: number): MatrixResult {
  const steps: StepResult[] = [];

  steps.push({
    descriptionZh: `純量 k = ${fmt(k)}，矩陣 A 為 ${A.length}×${A[0].length}`,
    descriptionEn: `Scalar k = ${fmt(k)}, matrix A is ${A.length}×${A[0].length}`,
    latex: `k = ${fmt(k)},\\quad A = ${matrixToLatex(A)}`,
  });

  steps.push({
    descriptionZh: "純量乘法規則：每個元素乘以 k",
    descriptionEn: "Scalar multiplication rule: multiply every element by k",
    latex: `(kA)_{ij} = k \\cdot a_{ij}`,
  });

  const result: Matrix = [];
  for (let i = 0; i < A.length; i++) {
    result.push([]);
    const rowTerms: string[] = [];
    for (let j = 0; j < A[0].length; j++) {
      const val = k * A[i][j];
      result[i].push(val);
      rowTerms.push(`${fmt(k)} \\times ${fmt(A[i][j])} = ${fmt(val)}`);
    }
    steps.push({
      descriptionZh: `第 ${i+1} 行`,
      descriptionEn: `Row ${i+1}`,
      latex: rowTerms.join(",\\quad "),
    });
  }

  steps.push({
    descriptionZh: "最終結果",
    descriptionEn: "Final result",
    latex: `${fmt(k)} \\cdot A = ${matrixToLatex(result)}`,
    matrix: result,
  });

  return { result, steps };
}

// ─── Determinant ──────────────────────────────────────────────────────────────

function computeDetRaw(M: Matrix): number {
  const n = M.length;
  if (n === 1) return M[0][0];
  if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
  let d = 0;
  for (let j = 0; j < n; j++) {
    const minor = M.slice(1).map((row) => row.filter((_, k) => k !== j));
    d += M[0][j] * Math.pow(-1, j) * computeDetRaw(minor);
  }
  return d;
}

export function matDeterminant(A: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  const n = A.length;

  if (n !== A[0].length) {
    return { steps, error: "square_required" };
  }

  steps.push({
    descriptionZh: `計算 ${n}×${n} 方陣的行列式`,
    descriptionEn: `Computing determinant of ${n}×${n} square matrix`,
    latex: `A = ${matrixToLatex(A)}`,
  });

  if (n === 1) {
    steps.push({
      descriptionZh: "1×1 矩陣的行列式等於其唯一元素",
      descriptionEn: "Determinant of 1×1 matrix equals its single element",
      latex: `\\det(A) = ${fmt(A[0][0])}`,
      value: A[0][0],
    });
    return { scalar: A[0][0], steps };
  }

  if (n === 2) {
    const d = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    steps.push({
      descriptionZh: "2×2 行列式公式：det(A) = ad − bc",
      descriptionEn: "2×2 determinant formula: det(A) = ad − bc",
      latex: `\\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc`,
    });
    steps.push({
      descriptionZh: "代入數值：",
      descriptionEn: "Substituting values:",
      latex: `\\det(A) = (${fmt(A[0][0])})(${fmt(A[1][1])}) - (${fmt(A[0][1])})(${fmt(A[1][0])})`,
    });
    steps.push({
      descriptionZh: `計算：${fmt(A[0][0]*A[1][1])} − ${fmt(A[0][1]*A[1][0])} = ${fmt(d)}`,
      descriptionEn: `Compute: ${fmt(A[0][0]*A[1][1])} − ${fmt(A[0][1]*A[1][0])} = ${fmt(d)}`,
      latex: `= ${fmt(A[0][0]*A[1][1])} - (${fmt(A[0][1]*A[1][0])}) = ${fmt(d)}`,
      value: d,
    });
    return { scalar: d, steps };
  }

  // n >= 3: cofactor expansion along row 1
  steps.push({
    descriptionZh: "沿第一行進行餘因子展開（Laplace 展開）",
    descriptionEn: "Cofactor expansion along row 1 (Laplace expansion)",
    latex: `\\det(A) = \\sum_{j=1}^{${n}} (-1)^{1+j} a_{1j} M_{1j}`,
  });

  let totalDet = 0;
  const summaryTerms: string[] = [];

  for (let j = 0; j < n; j++) {
    const sign = Math.pow(-1, j);
    const minor = A.slice(1).map((row) => row.filter((_, k) => k !== j));
    const minorDet = computeDetRaw(minor);
    const cofactor = sign * minorDet;
    const term = A[0][j] * cofactor;
    totalDet += term;

    steps.push({
      descriptionZh: `j=${j+1}：元素 a₁${j+1}=${fmt(A[0][j])}，符號=(−1)^{1+${j+1}}=${sign>0?'+1':'-1'}，子式 M₁${j+1}`,
      descriptionEn: `j=${j+1}: element a₁${j+1}=${fmt(A[0][j])}, sign=(−1)^{1+${j+1}}=${sign>0?'+1':'-1'}, minor M₁${j+1}`,
      latex: `(-1)^{1+${j+1}} \\cdot ${fmt(A[0][j])} \\cdot \\det${matrixToLatex(minor)} = ${fmt(cofactor)} \\cdot ${fmt(A[0][j])} = ${fmt(term)}`,
    });

    const signStr = term >= 0 ? "+" : "";
    summaryTerms.push(`${signStr}${fmt(term)}`);
  }

  steps.push({
    descriptionZh: "將所有餘因子項相加：",
    descriptionEn: "Sum all cofactor terms:",
    latex: `\\det(A) = ${summaryTerms.join(" ")} = ${fmt(totalDet)}`,
    value: totalDet,
  });

  return { scalar: totalDet, steps };
}

// ─── Inverse Matrix (Gauss-Jordan) ────────────────────────────────────────────

export function matInverse(A: Matrix): MatrixResult {
  const steps: StepResult[] = [];
  const n = A.length;
  if (n !== A[0].length) {
    return { steps, error: "square_required" };
  }
  // ── Step 0: Check determinant first (singular matrix guard) ──────────────
  steps.push({
    descriptionZh: `計算 ${n}×${n} 方陣的逆矩陣，首先計算行列式以判斷矩陣是否可逆`,
    descriptionEn: `Computing inverse of ${n}×${n} matrix — first check determinant to verify invertibility`,
    latex: `A = ${matrixToLatex(A)}`,
  });
  const det = computeDetRaw(A);
  if (n === 2) {
    steps.push({
      descriptionZh: `計算行列式：det(A) = (${fmt(A[0][0])})(${fmt(A[1][1])}) − (${fmt(A[0][1])})(${fmt(A[1][0])}) = ${fmt(det)}`,
      descriptionEn: `Compute determinant: det(A) = (${fmt(A[0][0])})(${fmt(A[1][1])}) − (${fmt(A[0][1])})(${fmt(A[1][0])}) = ${fmt(det)}`,
      latex: `\\det(A) = (${fmt(A[0][0])})(${fmt(A[1][1])}) - (${fmt(A[0][1])})(${fmt(A[1][0])}) = ${fmt(det)}`,
    });
  } else {
    steps.push({
      descriptionZh: `計算行列式（餘因子展開）：det(A) = ${fmt(det)}`,
      descriptionEn: `Compute determinant (cofactor expansion): det(A) = ${fmt(det)}`,
      latex: `\\det(A) = ${fmt(det)}`,
    });
  }
  if (Math.abs(det) < 1e-10) {
    steps.push({
      descriptionZh: `det(A) = ${fmt(det)} = 0，矩陣為奇異矩陣（Singular Matrix）`,
      descriptionEn: `det(A) = ${fmt(det)} = 0 — the matrix is singular (Singular Matrix)`,
      latex: `\\det(A) = 0 \\Rightarrow A \\text{ is singular — inverse does not exist}`,
    });
    return { steps, error: "singular" };
  }
  steps.push({
    descriptionZh: `det(A) = ${fmt(det)} ≠ 0，矩陣可逆，繼續使用高斯-喬登消去法求逆矩陣`,
    descriptionEn: `det(A) = ${fmt(det)} ≠ 0 — matrix is invertible; proceed with Gauss-Jordan elimination`,
    latex: `\\det(A) = ${fmt(det)} \\neq 0 \\Rightarrow A^{-1} \\text{ exists}`,
  });
  steps.push({
    descriptionZh: "建立增廣矩陣 [A | I]，對其進行列變換，直到左側化為 I",
    descriptionEn: "Form augmented matrix [A | I]; apply row operations until left side becomes I",
    latex: `[A \\mid I] \\xrightarrow{\\text{row ops}} [I \\mid A^{-1}]`,
  });

  // ── Use exact rational arithmetic for all row operations ─────────────────
  // Build rational augmented matrix [A | I]
  const ratAug: RatMatrix = A.map((row, i) => [
    ...row.map((v) => fromFloat(v)),
    ...Array.from({ length: n }, (_, j) => rat(i === j ? 1n : 0n)),
  ]);

  const snapLatex = () => {
    // Format as augmented [left|right] with vertical bar
    const rows = ratAug.map((row) => {
      const left = row.slice(0, n).map(ratToLatex).join(" & ");
      const right = row.slice(n).map(ratToLatex).join(" & ");
      return `${left} & ${right}`;
    });
    const cols = "c".repeat(n) + "|" + "c".repeat(n);
    return `\\left[\\begin{array}{${cols}} ${rows.join(" \\\\ ")} \\end{array}\\right]`;
  };

  steps.push({
    descriptionZh: "初始增廣矩陣：",
    descriptionEn: "Initial augmented matrix:",
    latex: snapLatex(),
  });

  for (let col = 0; col < n; col++) {
    // Find pivot (partial pivoting)
    let pivotRow = -1;
    let maxAbs = 0;
    for (let row = col; row < n; row++) {
      const abs = Math.abs(ratToNumber(ratAug[row][col]));
      if (abs > maxAbs) { maxAbs = abs; pivotRow = row; }
    }
    if (pivotRow === -1 || maxAbs < 1e-12) {
      return { steps, error: "singular" };
    }
    // Swap rows
    if (pivotRow !== col) {
      [ratAug[col], ratAug[pivotRow]] = [ratAug[pivotRow], ratAug[col]];
      steps.push({
        descriptionZh: `交換第 ${col+1} 行與第 ${pivotRow+1} 行，使主元非零`,
        descriptionEn: `Swap row ${col+1} ↔ row ${pivotRow+1} to get non-zero pivot`,
        latex: `R_{${col+1}} \\leftrightarrow R_{${pivotRow+1}} \\Rightarrow ${snapLatex()}`,
      });
    }
    // Scale pivot row
    const pivot = ratAug[col][col];
    if (!(pivot.n === 1n && pivot.d === 1n)) {
      for (let j = 0; j < 2 * n; j++) {
        ratAug[col][j] = ratDiv(ratAug[col][j], pivot);
      }
      steps.push({
        descriptionZh: `將第 ${col+1} 行除以主元 ${ratToStr(pivot)}，令主元 = 1`,
        descriptionEn: `Divide row ${col+1} by pivot ${ratToStr(pivot)} so pivot = 1`,
        latex: `R_{${col+1}} \\leftarrow \\frac{1}{${ratToLatex(pivot)}} R_{${col+1}} \\Rightarrow ${snapLatex()}`,
      });
    }
    // Eliminate all other rows in this column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = ratAug[row][col];
      if (ratIsZero(factor)) continue;
      for (let j = 0; j < 2 * n; j++) {
        ratAug[row][j] = ratSub(ratAug[row][j], ratMul(factor, ratAug[col][j]));
      }
      const fNum = ratToNumber(factor);
      const sign = fNum > 0 ? "-" : "+";
      const absFactorLatex = fNum < 0 ? ratToLatex(ratNeg(factor)) : ratToLatex(factor);
      steps.push({
        descriptionZh: `消去第 ${row+1} 行第 ${col+1} 列的元素（值 = ${ratToStr(factor)}）`,
        descriptionEn: `Eliminate element in row ${row+1}, col ${col+1} (value = ${ratToStr(factor)})`,
        latex: `R_{${row+1}} \\leftarrow R_{${row+1}} ${sign} ${absFactorLatex} R_{${col+1}} \\Rightarrow ${snapLatex()}`,
      });
    }
  }

  // Extract result (exact rational → number)
  const result: Matrix = ratAug.map((row) =>
    row.slice(n).map((v) => ratToNumber(v))
  );
  // Build exact LaTeX for result
  const resultRatRows = ratAug.map((row) => row.slice(n));
  const resultLatex = ratMatLatex(resultRatRows);

  steps.push({
    descriptionZh: "左側已化為單位矩陣，右側即為 A⁻¹",
    descriptionEn: "Left side is now identity; right side is A⁻¹",
    latex: `[I \\mid A^{-1}] = ${snapLatex()}`,
  });
  steps.push({
    descriptionZh: "最終結果：逆矩陣 A⁻¹（精確分數形式）",
    descriptionEn: "Final result: inverse matrix A⁻¹ (exact fraction form)",
    latex: `A^{-1} = ${resultLatex}`,
    matrix: result,
  });
  steps.push({
    descriptionZh: "驗證：A × A⁻¹ = I（單位矩陣）",
    descriptionEn: "Verification: A × A⁻¹ = I (identity matrix)",
    latex: `A \\cdot A^{-1} = I_{${n}}`,
  });
  return { result, steps };
}
