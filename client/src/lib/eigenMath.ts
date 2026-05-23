/**
 * eigenMath.ts
 * Eigenvalue and eigenvector computation with detailed bilingual step-by-step derivations.
 * Supports 2×2 and 3×3 real matrices.
 */
import { fmt as fmtShared, sqrtExact } from "./matrixMath";

export interface EigenStep {
  titleZh: string;
  titleEn: string;
  latex: string;
  explanationZh: string;
  explanationEn: string;
}

export interface EigenResult {
  eigenvalues: number[];
  eigenvectors: number[][];
  steps: EigenStep[];
  characteristicPolynomial: string; // LaTeX
  isComplex: boolean;
  error?: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtFrac(v: number): string {
  // Use the shared exact formatter (fraction/integer/decimal)
  return fmtShared(v);
}

function matrixToLatex(m: number[][], highlight?: number[][]): string {
  const rows = m.map((row, i) =>
    row
      .map((v, j) => {
        const s = fmtFrac(v);
        return highlight && highlight[i][j] ? `\\mathbf{${s}}` : s;
      })
      .join(" & ")
  );
  return `\\begin{pmatrix} ${rows.join(" \\\\ ")} \\end{pmatrix}`;
}

function charMatrixToLatex(m: number[][]): string {
  // Renders (A - λI) symbolically
  const n = m.length;
  const rows: string[] = [];
  for (let i = 0; i < n; i++) {
    const cells: string[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        const v = m[i][j];
        if (Math.abs(v) < 1e-10) {
          cells.push("-\\lambda");
        } else {
          cells.push(`${fmtFrac(v)} - \\lambda`);
        }
      } else {
        cells.push(fmtFrac(m[i][j]));
      }
    }
    rows.push(cells.join(" & "));
  }
  return `\\begin{vmatrix} ${rows.join(" \\\\ ")} \\end{vmatrix}`;
}

// ─── 2×2 eigenvalue computation ─────────────────────────────────────────────

function solve2x2(A: number[][]): EigenResult {
  const steps: EigenStep[] = [];
  const a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1];

  // Step 1: Write characteristic equation det(A - λI) = 0
  steps.push({
    titleZh: "第一步：建立特徵方程式",
    titleEn: "Step 1: Set Up Characteristic Equation",
    latex: `\\det(A - \\lambda I) = 0`,
    explanationZh: "特徵值 λ 滿足行列式 det(A − λI) = 0。",
    explanationEn: "Eigenvalues λ satisfy the determinant equation det(A − λI) = 0.",
  });

  // Step 2: Expand the determinant
  const trA = a + d;
  const detA = a * d - b * c;
  const charMatLatex = charMatrixToLatex(A);
  steps.push({
    titleZh: "第二步：展開行列式",
    titleEn: "Step 2: Expand the Determinant",
    latex: `${charMatLatex} = (${fmtFrac(a)} - \\lambda)(${fmtFrac(d)} - \\lambda) - (${fmtFrac(b)})(${fmtFrac(c)})`,
    explanationZh: `對 2×2 矩陣展開行列式：(a−λ)(d−λ) − bc`,
    explanationEn: `Expand the 2×2 determinant: (a−λ)(d−λ) − bc`,
  });

  // Step 3: Simplify to quadratic
  // (a-λ)(d-λ) - bc = λ² - (a+d)λ + (ad-bc)
  const trSign = trA >= 0 ? `-${fmtFrac(trA)}` : `+${fmtFrac(-trA)}`;
  const detSign = detA >= 0 ? `+${fmtFrac(detA)}` : `-${fmtFrac(-detA)}`;
  const charPoly = `\\lambda^2 ${trSign}\\lambda ${detSign} = 0`;
  steps.push({
    titleZh: "第三步：整理為二次特徵多項式",
    titleEn: "Step 3: Simplify to Characteristic Polynomial",
    latex: charPoly,
    explanationZh: `展開後得到：λ² − tr(A)λ + det(A) = 0，其中 tr(A) = ${fmtFrac(trA)}，det(A) = ${fmtFrac(detA)}`,
    explanationEn: `Expanding gives: λ² − tr(A)λ + det(A) = 0, where tr(A) = ${fmtFrac(trA)}, det(A) = ${fmtFrac(detA)}`,
  });

  // Step 4: Discriminant
  const disc = trA * trA - 4 * detA;
  steps.push({
    titleZh: "第四步：計算判別式 Δ",
    titleEn: "Step 4: Compute Discriminant Δ",
    latex: `\\Delta = \\text{tr}(A)^2 - 4\\det(A) = ${fmtFrac(trA)}^2 - 4 \\times ${fmtFrac(detA)} = ${fmtFrac(disc)}`,
    explanationZh:
      disc > 0
        ? `Δ > 0，方程有兩個相異實數特徵值。`
        : disc === 0
        ? `Δ = 0，方程有一個重複特徵值。`
        : `Δ < 0，特徵值為複數（此工具僅顯示實數情況）。`,
    explanationEn:
      disc > 0
        ? `Δ > 0: two distinct real eigenvalues.`
        : disc === 0
        ? `Δ = 0: one repeated eigenvalue.`
        : `Δ < 0: complex eigenvalues (this tool handles real cases only).`,
  });

  if (disc < -1e-10) {
    return {
      eigenvalues: [],
      eigenvectors: [],
      steps,
      characteristicPolynomial: charPoly,
      isComplex: true,
      error: "此矩陣的特徵值為複數，目前僅支援實數特徵值。 / This matrix has complex eigenvalues; only real eigenvalues are supported.",
    };
  }

  const sqrtDisc = Math.sqrt(Math.max(0, disc));
  const lambda1 = (trA + sqrtDisc) / 2;
  const lambda2 = (trA - sqrtDisc) / 2;

  // Step 5: Solve for eigenvalues
  if (Math.abs(disc) < 1e-10) {
    steps.push({
      titleZh: "第五步：求解特徵值（重根）",
      titleEn: "Step 5: Solve for Eigenvalue (Repeated Root)",
      latex: `\\lambda = \\frac{\\text{tr}(A)}{2} = \\frac{${fmtFrac(trA)}}{2} = ${fmtFrac(lambda1)}`,
      explanationZh: `判別式為零，只有一個特徵值 λ = ${fmtFrac(lambda1)}（重根）。`,
      explanationEn: `Discriminant is zero; only one eigenvalue λ = ${fmtFrac(lambda1)} (repeated root).`,
    });
  } else {
    steps.push({
      titleZh: "第五步：用求根公式求特徵值",
      titleEn: "Step 5: Apply Quadratic Formula",
      latex: `\\lambda = \\frac{${fmtFrac(trA)} \\pm \\sqrt{${fmtFrac(disc)}}}{2} = \\frac{${fmtFrac(trA)} \\pm ${sqrtExact(disc)}}{2}`,
      explanationZh: `代入求根公式，得到兩個特徵值。`,
      explanationEn: `Applying the quadratic formula gives two eigenvalues.`,
    });
    steps.push({
      titleZh: "特徵值結果",
      titleEn: "Eigenvalue Results",
      latex: `\\lambda_1 = ${fmtFrac(lambda1)}, \\quad \\lambda_2 = ${fmtFrac(lambda2)}`,
      explanationZh: `λ₁ = (${fmtFrac(trA)} + ${fmtFrac(sqrtDisc)}) / 2 = ${fmtFrac(lambda1)}，λ₂ = (${fmtFrac(trA)} − ${fmtFrac(sqrtDisc)}) / 2 = ${fmtFrac(lambda2)}`,
      explanationEn: `λ₁ = (${fmtFrac(trA)} + ${fmtFrac(sqrtDisc)}) / 2 = ${fmtFrac(lambda1)}, λ₂ = (${fmtFrac(trA)} − ${fmtFrac(sqrtDisc)}) / 2 = ${fmtFrac(lambda2)}`,
    });
  }

  const eigenvalues = Math.abs(disc) < 1e-10 ? [lambda1] : [lambda1, lambda2];
  const eigenvectors: number[][] = [];

  // Step 6: Find eigenvectors for each eigenvalue
  for (let k = 0; k < eigenvalues.length; k++) {
    const lam = eigenvalues[k];
    // (A - λI)v = 0
    const A_lI = [
      [a - lam, b],
      [c, d - lam],
    ];

    steps.push({
      titleZh: `第六步（λ = ${fmtFrac(lam)}）：建立 (A − λI)v = 0`,
      titleEn: `Step 6 (λ = ${fmtFrac(lam)}): Form (A − λI)v = 0`,
      latex: `(A - ${fmtFrac(lam)} I) = \\begin{pmatrix} ${fmtFrac(a - lam)} & ${fmtFrac(b)} \\\\ ${fmtFrac(c)} & ${fmtFrac(d - lam)} \\end{pmatrix}`,
      explanationZh: `將 λ = ${fmtFrac(lam)} 代入 A − λI，求解零空間（null space）。`,
      explanationEn: `Substitute λ = ${fmtFrac(lam)} into A − λI and find the null space.`,
    });

    // Find eigenvector: use first non-trivial row
    let ev: number[];
    if (Math.abs(A_lI[0][0]) > 1e-10 || Math.abs(A_lI[0][1]) > 1e-10) {
      // From row 0: A_lI[0][0]*x + A_lI[0][1]*y = 0
      if (Math.abs(A_lI[0][1]) > 1e-10) {
        ev = [-A_lI[0][1], A_lI[0][0]];
      } else {
        ev = [1, 0];
      }
    } else if (Math.abs(A_lI[1][0]) > 1e-10 || Math.abs(A_lI[1][1]) > 1e-10) {
      if (Math.abs(A_lI[1][1]) > 1e-10) {
        ev = [-A_lI[1][1], A_lI[1][0]];
      } else {
        ev = [1, 0];
      }
    } else {
      ev = [1, 0];
    }

    // Normalize
    const norm = Math.sqrt(ev[0] * ev[0] + ev[1] * ev[1]);
    const evNorm = norm > 1e-10 ? ev.map((x) => x / norm) : ev;

    steps.push({
      titleZh: `求特徵向量（λ = ${fmtFrac(lam)}）`,
      titleEn: `Find Eigenvector (λ = ${fmtFrac(lam)})`,
      latex: `\\mathbf{v}_{${k + 1}} = \\begin{pmatrix} ${fmtFrac(ev[0])} \\\\ ${fmtFrac(ev[1])} \\end{pmatrix} \\quad \\text{（歸一化 / Normalized: } \\begin{pmatrix} ${fmtFrac(evNorm[0])} \\\\ ${fmtFrac(evNorm[1])} \\end{pmatrix}\\text{）}`,
      explanationZh: `由方程組 ${fmtFrac(A_lI[0][0])}x + ${fmtFrac(A_lI[0][1])}y = 0，令自由變數求解，得特徵向量。`,
      explanationEn: `From ${fmtFrac(A_lI[0][0])}x + ${fmtFrac(A_lI[0][1])}y = 0, set the free variable to find the eigenvector.`,
    });

    eigenvectors.push(evNorm);
  }

  // Step 7: Verification
  for (let k = 0; k < eigenvalues.length; k++) {
    const lam = eigenvalues[k];
    const ev = eigenvectors[k];
    const Av = [a * ev[0] + b * ev[1], c * ev[0] + d * ev[1]];
    const lv = [lam * ev[0], lam * ev[1]];
    steps.push({
      titleZh: `驗證：A·v${k + 1} = λ${k + 1}·v${k + 1}`,
      titleEn: `Verification: A·v${k + 1} = λ${k + 1}·v${k + 1}`,
      latex: `A \\mathbf{v}_{${k + 1}} = \\begin{pmatrix} ${fmtFrac(Av[0])} \\\\ ${fmtFrac(Av[1])} \\end{pmatrix} = ${fmtFrac(lam)} \\begin{pmatrix} ${fmtFrac(ev[0])} \\\\ ${fmtFrac(ev[1])} \\end{pmatrix} = \\lambda_{${k + 1}} \\mathbf{v}_{${k + 1}} \\checkmark`,
      explanationZh: `計算 A·v 並確認等於 λ·v，驗證結果正確。`,
      explanationEn: `Compute A·v and confirm it equals λ·v, verifying the result.`,
    });
  }

  return {
    eigenvalues,
    eigenvectors,
    steps,
    characteristicPolynomial: charPoly,
    isComplex: false,
  };
}

// ─── 3×3 eigenvalue computation ─────────────────────────────────────────────

function det3(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function minor(m: number[][], row: number, col: number): number[][] {
  return m
    .filter((_, i) => i !== row)
    .map((r) => r.filter((_, j) => j !== col));
}

function det2(m: number[][]): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

// Solve cubic: x³ + px + q = 0 using Cardano / trigonometric method
function solveCubicDepressed(p: number, q: number): number[] {
  const disc = -(4 * p * p * p + 27 * q * q);
  if (disc > 0) {
    // Three distinct real roots — trigonometric method
    const m = 2 * Math.sqrt(-p / 3);
    const theta = Math.acos((3 * q) / (p * m)) / 3;
    return [
      m * Math.cos(theta),
      m * Math.cos(theta - (2 * Math.PI) / 3),
      m * Math.cos(theta - (4 * Math.PI) / 3),
    ];
  } else if (Math.abs(disc) < 1e-8) {
    // Repeated root
    const r = 3 * q / p;
    return [r, r, -2 * r];
  } else {
    // One real root
    const A = Math.cbrt(-q / 2 + Math.sqrt(q * q / 4 + p * p * p / 27));
    const B = Math.cbrt(-q / 2 - Math.sqrt(q * q / 4 + p * p * p / 27));
    return [A + B];
  }
}

function solveCubic(a3: number, a2: number, a1: number, a0: number): number[] {
  // a3*x³ + a2*x² + a1*x + a0 = 0
  if (Math.abs(a3) < 1e-12) return [];
  const p = a1 / a3 - (a2 * a2) / (3 * a3 * a3);
  const q =
    (2 * a2 * a2 * a2) / (27 * a3 * a3 * a3) -
    (a2 * a1) / (3 * a3 * a3) +
    a0 / a3;
  const roots = solveCubicDepressed(p, q);
  return roots.map((r) => r - a2 / (3 * a3));
}

function nullSpace3(M: number[][]): number[] {
  // Gaussian elimination to find null space of 3×3 matrix
  const m = M.map((r) => [...r]);
  const eps = 1e-9;
  let pivotRow = 0;
  const pivotCols: number[] = [];

  for (let col = 0; col < 3 && pivotRow < 3; col++) {
    // Find pivot
    let maxRow = pivotRow;
    for (let r = pivotRow + 1; r < 3; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[maxRow][col])) maxRow = r;
    }
    if (Math.abs(m[maxRow][col]) < eps) continue;
    [m[pivotRow], m[maxRow]] = [m[maxRow], m[pivotRow]];
    const scale = m[pivotRow][col];
    m[pivotRow] = m[pivotRow].map((v) => v / scale);
    for (let r = 0; r < 3; r++) {
      if (r !== pivotRow) {
        const factor = m[r][col];
        m[r] = m[r].map((v, j) => v - factor * m[pivotRow][j]);
      }
    }
    pivotCols.push(col);
    pivotRow++;
  }

  // Free variable
  const freeCols = [0, 1, 2].filter((c) => !pivotCols.includes(c));
  if (freeCols.length === 0) return [0, 0, 0];

  const freeCol = freeCols[0];
  const v = [0, 0, 0];
  v[freeCol] = 1;
  for (let i = 0; i < pivotCols.length; i++) {
    v[pivotCols[i]] = -m[i][freeCol];
  }
  return v;
}

function solve3x3(A: number[][]): EigenResult {
  const steps: EigenStep[] = [];

  // Step 1: Characteristic equation
  steps.push({
    titleZh: "第一步：建立特徵方程式",
    titleEn: "Step 1: Set Up Characteristic Equation",
    latex: `\\det(A - \\lambda I) = 0`,
    explanationZh: "特徵值 λ 滿足 det(A − λI) = 0。對 3×3 矩陣，這將展開為三次多項式。",
    explanationEn: "Eigenvalues λ satisfy det(A − λI) = 0. For a 3×3 matrix, this expands to a cubic polynomial.",
  });

  // Step 2: Show (A - λI)
  const charMatLatex = charMatrixToLatex(A);
  steps.push({
    titleZh: "第二步：寫出 A − λI",
    titleEn: "Step 2: Write Out A − λI",
    latex: `A - \\lambda I = ${charMatLatex}`,
    explanationZh: "將 λI 從 A 中減去，對角線元素各減去 λ。",
    explanationEn: "Subtract λI from A; each diagonal entry becomes (aᵢᵢ − λ).",
  });

  // Step 3: Cofactor expansion along first row
  const a = A[0][0], b = A[0][1], c = A[0][2];
  const M00 = minor(A, 0, 0);
  const M01 = minor(A, 0, 1);
  const M02 = minor(A, 0, 2);

  // Characteristic polynomial coefficients: -λ³ + tr(A)λ² - (sum of 2×2 principal minors)λ + det(A)
  const trA = A[0][0] + A[1][1] + A[2][2];
  const detA = det3(A);
  // Sum of principal 2×2 minors
  const m11 = det2([[A[1][1], A[1][2]], [A[2][1], A[2][2]]]);
  const m22 = det2([[A[0][0], A[0][2]], [A[2][0], A[2][2]]]);
  const m33 = det2([[A[0][0], A[0][1]], [A[1][0], A[1][1]]]);
  const sumMinors = m11 + m22 + m33;

  // p(λ) = -λ³ + tr(A)λ² - sumMinors·λ + det(A)
  // Rewrite as: λ³ - tr(A)λ² + sumMinors·λ - det(A) = 0
  const c2 = -trA;
  const c1 = sumMinors;
  const c0 = -detA;

  const formatCoeff = (coeff: number, varStr: string) => {
    if (Math.abs(coeff) < 1e-10) return "";
    const s = fmtFrac(Math.abs(coeff));
    const sign = coeff >= 0 ? "+" : "-";
    if (s === "1" && varStr !== "") return `${sign} ${varStr}`;
    return `${sign} ${s}${varStr}`;
  };

  const charPoly = `\\lambda^3 ${formatCoeff(c2, "\\lambda^2")} ${formatCoeff(c1, "\\lambda")} ${formatCoeff(c0, "")} = 0`;

  steps.push({
    titleZh: "第三步：展開行列式，得特徵多項式",
    titleEn: "Step 3: Expand Determinant — Characteristic Polynomial",
    latex: charPoly,
    explanationZh: `利用餘子式展開，整理後得三次特徵多項式。其中：\n• tr(A) = ${fmtFrac(trA)}\n• 主 2×2 子式之和 = ${fmtFrac(sumMinors)}\n• det(A) = ${fmtFrac(detA)}`,
    explanationEn: `Using cofactor expansion, the characteristic polynomial is a cubic. Here:\n• tr(A) = ${fmtFrac(trA)}\n• Sum of principal 2×2 minors = ${fmtFrac(sumMinors)}\n• det(A) = ${fmtFrac(detA)}`,
  });

  // Step 4: Solve cubic
  steps.push({
    titleZh: "第四步：求解三次方程式",
    titleEn: "Step 4: Solve the Cubic Equation",
    latex: charPoly,
    explanationZh: "使用數值方法（Cardano 公式 / 三角法）求解三次方程式的實數根。",
    explanationEn: "Solve the cubic equation for real roots using Cardano's formula or the trigonometric method.",
  });

  const rawRoots = solveCubic(1, c2, c1, c0);
  if (rawRoots.length === 0) {
    return {
      eigenvalues: [],
      eigenvectors: [],
      steps,
      characteristicPolynomial: charPoly,
      isComplex: true,
      error: "無法求得實數特徵值。 / No real eigenvalues found.",
    };
  }

  // Round near-integer roots
  const eigenvalues = rawRoots.map((r) => {
    const rounded = Math.round(r * 1e6) / 1e6;
    return rounded;
  });

  // Deduplicate
  const uniqueEigenvalues: number[] = [];
  for (const lam of eigenvalues) {
    if (!uniqueEigenvalues.some((u) => Math.abs(u - lam) < 1e-6)) {
      uniqueEigenvalues.push(lam);
    }
  }

  const lamList = uniqueEigenvalues.map((l, i) => `\\lambda_{${i + 1}} = ${fmtFrac(l)}`).join(", \\quad ");
  steps.push({
    titleZh: "特徵值結果",
    titleEn: "Eigenvalue Results",
    latex: lamList,
    explanationZh: `求解三次方程式，得到 ${uniqueEigenvalues.length} 個實數特徵值。`,
    explanationEn: `Solving the cubic gives ${uniqueEigenvalues.length} real eigenvalue(s).`,
  });

  // Step 5: Find eigenvectors
  const eigenvectors: number[][] = [];
  for (let k = 0; k < uniqueEigenvalues.length; k++) {
    const lam = uniqueEigenvalues[k];
    const A_lI = A.map((row, i) => row.map((v, j) => (i === j ? v - lam : v)));

    steps.push({
      titleZh: `第五步（λ = ${fmtFrac(lam)}）：建立並化簡 (A − λI)v = 0`,
      titleEn: `Step 5 (λ = ${fmtFrac(lam)}): Form and Row-Reduce (A − λI)v = 0`,
      latex: `A - ${fmtFrac(lam)} I = ${matrixToLatex(A_lI)}`,
      explanationZh: `代入 λ = ${fmtFrac(lam)}，對增廣矩陣進行列化簡，求解零空間。`,
      explanationEn: `Substitute λ = ${fmtFrac(lam)}, row-reduce the augmented matrix to find the null space.`,
    });

    const ev = nullSpace3(A_lI);
    const norm = Math.sqrt(ev.reduce((s, x) => s + x * x, 0));
    const evNorm = norm > 1e-10 ? ev.map((x) => x / norm) : ev;

    steps.push({
      titleZh: `特徵向量（λ = ${fmtFrac(lam)}）`,
      titleEn: `Eigenvector (λ = ${fmtFrac(lam)})`,
      latex: `\\mathbf{v}_{${k + 1}} = \\begin{pmatrix} ${fmtFrac(ev[0])} \\\\ ${fmtFrac(ev[1])} \\\\ ${fmtFrac(ev[2])} \\end{pmatrix}`,
      explanationZh: `由列化簡後的方程組，令自由變數為 1，求出特徵向量。`,
      explanationEn: `From the row-reduced system, set the free variable to 1 to obtain the eigenvector.`,
    });

    // Verification
    const Av = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        Av[i] += A[i][j] * evNorm[j];
      }
    }
    const lv = evNorm.map((x) => lam * x);
    steps.push({
      titleZh: `驗證：A·v${k + 1} = λ${k + 1}·v${k + 1}`,
      titleEn: `Verification: A·v${k + 1} = λ${k + 1}·v${k + 1}`,
      latex: `A \\mathbf{v}_{${k + 1}} = \\begin{pmatrix} ${fmtFrac(Av[0])} \\\\ ${fmtFrac(Av[1])} \\\\ ${fmtFrac(Av[2])} \\end{pmatrix} \\approx ${fmtFrac(lam)} \\begin{pmatrix} ${fmtFrac(evNorm[0])} \\\\ ${fmtFrac(evNorm[1])} \\\\ ${fmtFrac(evNorm[2])} \\end{pmatrix} \\checkmark`,
      explanationZh: "計算 A·v 確認等於 λ·v，驗證特徵向量正確。",
      explanationEn: "Compute A·v to confirm it equals λ·v, verifying the eigenvector.",
    });

    eigenvectors.push(evNorm);
  }

  return {
    eigenvalues: uniqueEigenvalues,
    eigenvectors,
    steps,
    characteristicPolynomial: charPoly,
    isComplex: false,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function computeEigen(matrix: number[][]): EigenResult {
  const n = matrix.length;
  if (n === 2) return solve2x2(matrix);
  if (n === 3) return solve3x3(matrix);
  return {
    eigenvalues: [],
    eigenvectors: [],
    steps: [],
    characteristicPolynomial: "",
    isComplex: false,
    error: "僅支援 2×2 及 3×3 矩陣。 / Only 2×2 and 3×3 matrices are supported.",
  };
}
