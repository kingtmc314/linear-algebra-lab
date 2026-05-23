// ============================================================
// Linear System Solver — Exact Rational Arithmetic
// Uses bigint-based fractions to guarantee exact solutions
// (no floating-point drift — 1/3 stays 1/3, not 0.333...)
// ============================================================

import { fmt } from "./matrixMath";
import {
  type Rational,
  type RatMatrix,
  rat,
  fromFloat,
  add,
  sub,
  mul,
  div,
  neg,
  isZero,
  toNumber,
  ratToLatex,
  ratToStr,
  ratAugLatex,
  toRatMatrix,
  fromRatMatrix,
} from "./rational";

export type SolutionType = "unique" | "infinite" | "none";

export interface SystemStep {
  descriptionZh: string;
  descriptionEn: string;
  matrix: number[][];
  latex: string;
}

export interface GeneralSolutionTerm {
  varIndex: number;       // which variable (0-based)
  constant: number;       // constant part (numeric, for display)
  constantLatex: string;  // LaTeX of constant part (exact fraction)
  kCoeffs: number[];      // coefficient for each free variable k_1, k_2, ...
  kCoeffsLatex: string[]; // LaTeX of each k coefficient (exact fraction)
}

export interface SystemResult {
  type: SolutionType;
  solution?: number[];
  solutionLatex?: string[];   // exact LaTeX for each solution variable
  freeVariables?: number[];
  generalSolution?: GeneralSolutionTerm[];
  steps: SystemStep[];
  error?: string;
}

/** Solve Ax = b using exact rational Gaussian elimination */
export function solveLinearSystem(A: number[][], b: number[]): SystemResult {
  const m = A.length;
  const n = A[0].length;
  const steps: SystemStep[] = [];

  // Build augmented rational matrix [A | b]
  const aug: RatMatrix = A.map((row, i) => [
    ...row.map((v) => fromFloat(v)),
    fromFloat(b[i]),
  ]);

  const snapNum = (): number[][] => aug.map((r) => r.map(toNumber));

  steps.push({
    descriptionZh: `建立增廣矩陣 [A | b]：將係數矩陣與常數向量合併為 ${m}×${n + 1} 矩陣`,
    descriptionEn: `Form augmented matrix [A | b]: combine coefficient matrix and constant vector into ${m}×${n + 1} matrix`,
    matrix: snapNum(),
    latex: ratAugLatex(aug, n),
  });

  steps.push({
    descriptionZh: "目標：使用初等列變換（高斯消去法）將增廣矩陣化為行階梯形式（REF）",
    descriptionEn: "Goal: use elementary row operations (Gaussian elimination) to reduce augmented matrix to Row Echelon Form (REF)",
    matrix: snapNum(),
    latex: `\\text{Elementary row operations: } R_i \\leftrightarrow R_j,\\; cR_i,\\; R_i + cR_j`,
  });

  let pivotRow = 0;
  const pivotCols: number[] = [];

  for (let col = 0; col < n && pivotRow < m; col++) {
    // Find max pivot (partial pivoting by absolute value)
    let maxRow = pivotRow;
    let maxAbs = Math.abs(toNumber(aug[maxRow][col]));
    for (let row = pivotRow + 1; row < m; row++) {
      const abs = Math.abs(toNumber(aug[row][col]));
      if (abs > maxAbs) { maxAbs = abs; maxRow = row; }
    }

    if (isZero(aug[maxRow][col])) {
      steps.push({
        descriptionZh: `第 ${col + 1} 列全為零，跳過（自由變量列）`,
        descriptionEn: `Column ${col + 1} is all zeros — skip (free variable column)`,
        matrix: snapNum(),
        latex: `\\text{Column } ${col + 1} \\text{ has no pivot — free variable}`,
      });
      continue;
    }

    // Swap rows if needed
    if (maxRow !== pivotRow) {
      [aug[pivotRow], aug[maxRow]] = [aug[maxRow], aug[pivotRow]];
      steps.push({
        descriptionZh: `部分主元選取：交換第 ${pivotRow + 1} 行與第 ${maxRow + 1} 行`,
        descriptionEn: `Partial pivoting: swap row ${pivotRow + 1} ↔ row ${maxRow + 1}`,
        matrix: snapNum(),
        latex: `R_{${pivotRow + 1}} \\leftrightarrow R_{${maxRow + 1}} \\Rightarrow ${ratAugLatex(aug, n)}`,
      });
    }

    pivotCols.push(col);
    const pivotVal = aug[pivotRow][col];

    steps.push({
      descriptionZh: `主元為 a[${pivotRow + 1}][${col + 1}] = ${ratToStr(pivotVal)}，對其下方各行進行消去`,
      descriptionEn: `Pivot is a[${pivotRow + 1}][${col + 1}] = ${ratToStr(pivotVal)}; eliminate entries below`,
      matrix: snapNum(),
      latex: `\\text{Pivot: } a_{${pivotRow + 1},${col + 1}} = ${ratToLatex(pivotVal)}`,
    });

    // Eliminate below pivot
    for (let row = pivotRow + 1; row < m; row++) {
      if (isZero(aug[row][col])) continue;
      const factor = div(aug[row][col], pivotVal);
      const oldVal = aug[row][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] = sub(aug[row][j], mul(factor, aug[pivotRow][j]));
      }
      const sign = toNumber(factor) > 0 ? "-" : "+";
      const absFactorLatex = toNumber(factor) < 0 ? ratToLatex(neg(factor)) : ratToLatex(factor);
      steps.push({
        descriptionZh: `消去第 ${row + 1} 行第 ${col + 1} 列：乘數 = ${ratToStr(oldVal)} ÷ ${ratToStr(pivotVal)} = ${ratToStr(factor)}`,
        descriptionEn: `Eliminate row ${row + 1}, col ${col + 1}: multiplier = ${ratToStr(oldVal)} ÷ ${ratToStr(pivotVal)} = ${ratToStr(factor)}`,
        matrix: snapNum(),
        latex: `R_{${row + 1}} \\leftarrow R_{${row + 1}} ${sign} ${absFactorLatex} R_{${pivotRow + 1}} \\Rightarrow ${ratAugLatex(aug, n)}`,
      });
    }

    pivotRow++;
  }

  const rank = pivotRow;

  steps.push({
    descriptionZh: `行階梯形式完成，矩陣秩 = ${rank}，方程數 = ${m}，未知數 = ${n}`,
    descriptionEn: `Row Echelon Form complete. Rank = ${rank}, equations = ${m}, unknowns = ${n}`,
    matrix: snapNum(),
    latex: `\\text{REF: rank}(A) = ${rank} \\Rightarrow ${ratAugLatex(aug, n)}`,
  });

  // Check consistency
  for (let row = rank; row < m; row++) {
    if (!isZero(aug[row][n])) {
      steps.push({
        descriptionZh: `矛盾行：第 ${row + 1} 行為 [0...0 | ${ratToStr(aug[row][n])}]，即 0 = ${ratToStr(aug[row][n])}，方程組無解`,
        descriptionEn: `Contradiction row: row ${row + 1} is [0...0 | ${ratToStr(aug[row][n])}], i.e. 0 = ${ratToStr(aug[row][n])} — no solution`,
        matrix: snapNum(),
        latex: `0 = ${ratToLatex(aug[row][n])} \\Rightarrow \\text{Inconsistent — No Solution}`,
      });
      return { type: "none", steps };
    }
  }

  // ── Infinite solutions ────────────────────────────────────────────────────
  if (rank < n) {
    const pivotSet = new Set(pivotCols);
    const freeVars: number[] = [];
    for (let j = 0; j < n; j++) {
      if (!pivotSet.has(j)) freeVars.push(j);
    }
    const freeVarNames = freeVars.map((j) => `x_{${j + 1}}`).join(", ");
    const kCount = freeVars.length;

    steps.push({
      descriptionZh: `秩 ${rank} < 未知數個數 ${n}，有 ${kCount} 個自由變量：${freeVarNames}，方程組有無限多解`,
      descriptionEn: `Rank ${rank} < unknowns ${n}; ${kCount} free variable(s): ${freeVarNames} — infinitely many solutions`,
      matrix: snapNum(),
      latex: `\\text{rank}(A) = ${rank} < ${n} = n \\Rightarrow \\text{Infinite Solutions}`,
    });

    // RREF: scale pivot rows
    for (let row = rank - 1; row >= 0; row--) {
      const col = pivotCols[row];
      const pivot = aug[row][col];
      if (pivot.n !== pivot.d || pivot.n !== 1n) {
        for (let j = 0; j <= n; j++) {
          aug[row][j] = div(aug[row][j], pivot);
        }
      }
    }
    // Eliminate above pivots
    for (let row = rank - 1; row >= 0; row--) {
      const col = pivotCols[row];
      for (let above = 0; above < row; above++) {
        const factor = aug[above][col];
        if (isZero(factor)) continue;
        for (let j = 0; j <= n; j++) {
          aug[above][j] = sub(aug[above][j], mul(factor, aug[row][j]));
        }
      }
    }

    steps.push({
      descriptionZh: `簡化行階梯形式（RREF），以便讀取通解`,
      descriptionEn: `Reduced Row Echelon Form (RREF) for reading general solution`,
      matrix: snapNum(),
      latex: `\\text{RREF} \\Rightarrow ${ratAugLatex(aug, n)}`,
    });

    const kNames = kCount === 1 ? ["k"] : freeVars.map((_, i) => `k_{${i + 1}}`);
    const letSteps = freeVars
      .map((fv, i) => `\\text{Let } x_{${fv + 1}} = ${kNames[i]} \\in \\mathbb{R}`)
      .join(",\\quad ");
    steps.push({
      descriptionZh: `令自由變量為任意實數 ${kNames.join(", ")}`,
      descriptionEn: `Let free variables equal arbitrary real numbers ${kNames.join(", ")}`,
      matrix: snapNum(),
      latex: letSteps,
    });

    const generalSolution: GeneralSolutionTerm[] = [];
    for (let vi = 0; vi < n; vi++) {
      const freeIdx = freeVars.indexOf(vi);
      if (freeIdx >= 0) {
        const kCoeffs = freeVars.map((_, i) => (i === freeIdx ? 1 : 0));
        const kCoeffsLatex = freeVars.map((_, i) => (i === freeIdx ? "1" : "0"));
        generalSolution.push({
          varIndex: vi,
          constant: 0,
          constantLatex: "0",
          kCoeffs,
          kCoeffsLatex,
        });
      } else {
        const pivotRowIdx = pivotCols.indexOf(vi);
        if (pivotRowIdx < 0) continue;
        const row = aug[pivotRowIdx];
        const constRat = row[n];
        const kCoeffsRat = freeVars.map((fv) => neg(row[fv]));
        generalSolution.push({
          varIndex: vi,
          constant: toNumber(constRat),
          constantLatex: ratToLatex(constRat),
          kCoeffs: kCoeffsRat.map(toNumber),
          kCoeffsLatex: kCoeffsRat.map(ratToLatex),
        });
      }
    }

    // Build LaTeX for general solution
    const genLatexParts = generalSolution.map((term) => {
      const kParts = term.kCoeffsLatex
        .map((cLatex, i) => {
          const c = term.kCoeffs[i];
          if (Math.abs(c) < 1e-12) return "";
          const sign = c > 0 ? "+" : "-";
          const absLatex = c < 0
            ? (cLatex.startsWith("-\\frac") ? cLatex.slice(1) : cLatex.replace(/^-/, ""))
            : cLatex;
          const coefStr = Math.abs(Math.abs(c) - 1) < 1e-12 ? "" : absLatex;
          return `${sign} ${coefStr}${kNames[i]}`;
        })
        .filter(Boolean)
        .join(" ");
      const isConstZero = Math.abs(term.constant) < 1e-12;
      const constStr = isConstZero && kParts ? "" : term.constantLatex;
      const rhs = constStr + (kParts ? " " + kParts : "") || "0";
      return `x_{${term.varIndex + 1}} = ${rhs.trim()}`;
    });

    steps.push({
      descriptionZh: `通解（以任意數 ${kNames.join(", ")} 表示）`,
      descriptionEn: `General solution (expressed using arbitrary parameter${kCount > 1 ? "s" : ""} ${kNames.join(", ")})`,
      matrix: snapNum(),
      latex: genLatexParts.join(",\\quad "),
    });

    return { type: "infinite", steps, freeVariables: freeVars, generalSolution };
  }

  // ── Unique solution ───────────────────────────────────────────────────────
  steps.push({
    descriptionZh: "秩 = 未知數個數，方程組有唯一解，進行回代（Back Substitution）",
    descriptionEn: "Rank = number of unknowns — unique solution exists; perform back substitution",
    matrix: snapNum(),
    latex: `\\text{rank}(A) = ${rank} = n \\Rightarrow \\text{Unique Solution}`,
  });

  // Scale pivot rows to 1
  for (let row = rank - 1; row >= 0; row--) {
    const col = pivotCols[row];
    const pivot = aug[row][col];
    if (!(pivot.n === 1n && pivot.d === 1n)) {
      for (let j = 0; j <= n; j++) {
        aug[row][j] = div(aug[row][j], pivot);
      }
      steps.push({
        descriptionZh: `第 ${row + 1} 行除以主元 ${ratToStr(pivot)}，令主元 = 1`,
        descriptionEn: `Divide row ${row + 1} by pivot ${ratToStr(pivot)} to normalize`,
        matrix: snapNum(),
        latex: `R_{${row + 1}} \\leftarrow \\frac{1}{${ratToLatex(pivot)}} R_{${row + 1}} \\Rightarrow ${ratAugLatex(aug, n)}`,
      });
    }
  }

  // Eliminate above pivots (full RREF)
  for (let row = rank - 1; row >= 0; row--) {
    const col = pivotCols[row];
    for (let above = 0; above < row; above++) {
      const factor = aug[above][col];
      if (isZero(factor)) continue;
      for (let j = 0; j <= n; j++) {
        aug[above][j] = sub(aug[above][j], mul(factor, aug[row][j]));
      }
      const sign = toNumber(factor) > 0 ? "-" : "+";
      const absFactorLatex = toNumber(factor) < 0 ? ratToLatex(neg(factor)) : ratToLatex(factor);
      steps.push({
        descriptionZh: `消去第 ${above + 1} 行第 ${col + 1} 列的元素（回代）`,
        descriptionEn: `Eliminate element above pivot in row ${above + 1}, col ${col + 1} (back substitution)`,
        matrix: snapNum(),
        latex: `R_{${above + 1}} \\leftarrow R_{${above + 1}} ${sign} ${absFactorLatex} R_{${row + 1}} \\Rightarrow ${ratAugLatex(aug, n)}`,
      });
    }
  }

  steps.push({
    descriptionZh: "簡化行階梯形式（RREF）完成",
    descriptionEn: "Reduced Row Echelon Form (RREF) complete",
    matrix: snapNum(),
    latex: `\\text{RREF} \\Rightarrow ${ratAugLatex(aug, n)}`,
  });

  // Extract exact solution
  const solutionRat: Rational[] = new Array(n).fill(rat(0n));
  pivotCols.forEach((col, row) => {
    solutionRat[col] = aug[row][n];
  });

  const solution = solutionRat.map(toNumber);
  const solutionLatex = solutionRat.map(ratToLatex);

  steps.push({
    descriptionZh: "讀取解：從 RREF 直接讀出每個變量的精確值",
    descriptionEn: "Read solution: directly read each variable's exact value from RREF",
    matrix: [solution],
    latex: solutionRat.map((v, i) => `x_{${i + 1}} = ${ratToLatex(v)}`).join(",\\quad "),
  });

  return { type: "unique", solution, solutionLatex, steps };
}
