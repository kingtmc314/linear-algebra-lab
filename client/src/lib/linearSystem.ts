// ============================================================
// Linear System Solver — Detailed Step-by-Step Gaussian Elimination
// Each step shows the exact row operation and resulting matrix state
// ============================================================

import { fmt, matrixToLatex } from "./matrixMath";

export type SolutionType = "unique" | "infinite" | "none";

export interface SystemStep {
  descriptionZh: string;
  descriptionEn: string;
  matrix: number[][];
  latex: string;
}

export interface SystemResult {
  type: SolutionType;
  solution?: number[];
  freeVariables?: number[];
  steps: SystemStep[];
  error?: string;
}

/** Format augmented matrix [A|b] as LaTeX */
function augLatex(aug: number[][], n: number): string {
  const rows = aug.map((row) => {
    const left = row.slice(0, n).map(fmt).join(" & ");
    const right = fmt(row[n]);
    return `${left} & ${right}`;
  });
  const cols = "c".repeat(n) + "|c";
  return `\\left[\\begin{array}{${cols}} ${rows.join(" \\\\ ")} \\end{array}\\right]`;
}

/** Solve Ax = b using Gaussian elimination with partial pivoting */
export function solveLinearSystem(A: number[][], b: number[]): SystemResult {
  const m = A.length;
  const n = A[0].length;
  const steps: SystemStep[] = [];

  // Build augmented matrix [A | b]
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  steps.push({
    descriptionZh: `建立增廣矩陣 [A | b]：將係數矩陣與常數向量合併為 ${m}×${n+1} 矩陣`,
    descriptionEn: `Form augmented matrix [A | b]: combine coefficient matrix and constant vector into ${m}×${n+1} matrix`,
    matrix: aug.map((r) => [...r]),
    latex: augLatex(aug, n),
  });

  steps.push({
    descriptionZh: "目標：使用初等列變換（高斯消去法）將增廣矩陣化為行階梯形式（REF）",
    descriptionEn: "Goal: use elementary row operations (Gaussian elimination) to reduce augmented matrix to Row Echelon Form (REF)",
    matrix: aug.map((r) => [...r]),
    latex: `\\text{Elementary row operations: } R_i \\leftrightarrow R_j,\\; cR_i,\\; R_i + cR_j`,
  });

  let pivotRow = 0;
  const pivotCols: number[] = [];

  for (let col = 0; col < n && pivotRow < m; col++) {
    // Find max pivot (partial pivoting)
    let maxRow = pivotRow;
    for (let row = pivotRow + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }

    if (Math.abs(aug[maxRow][col]) < 1e-10) {
      steps.push({
        descriptionZh: `第 ${col+1} 列全為零，跳過（自由變量列）`,
        descriptionEn: `Column ${col+1} is all zeros — skip (free variable column)`,
        matrix: aug.map((r) => [...r]),
        latex: `\\text{Column } ${col+1} \\text{ has no pivot — free variable}`,
      });
      continue;
    }

    // Swap rows if needed
    if (maxRow !== pivotRow) {
      [aug[pivotRow], aug[maxRow]] = [aug[maxRow], aug[pivotRow]];
      steps.push({
        descriptionZh: `部分主元選取：交換第 ${pivotRow+1} 行與第 ${maxRow+1} 行，使絕對值最大的元素成為主元`,
        descriptionEn: `Partial pivoting: swap row ${pivotRow+1} ↔ row ${maxRow+1} to bring largest absolute value to pivot position`,
        matrix: aug.map((r) => [...r]),
        latex: `R_{${pivotRow+1}} \\leftrightarrow R_{${maxRow+1}} \\Rightarrow ${augLatex(aug, n)}`,
      });
    }

    pivotCols.push(col);
    const pivotVal = aug[pivotRow][col];

    steps.push({
      descriptionZh: `主元為 a[${pivotRow+1}][${col+1}] = ${fmt(pivotVal)}，對其下方各行進行消去`,
      descriptionEn: `Pivot is a[${pivotRow+1}][${col+1}] = ${fmt(pivotVal)}; eliminate entries below`,
      matrix: aug.map((r) => [...r]),
      latex: `\\text{Pivot: } a_{${pivotRow+1},${col+1}} = ${fmt(pivotVal)}`,
    });

    // Eliminate below pivot
    for (let row = pivotRow + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) < 1e-10) continue;
      const factor = aug[row][col] / pivotVal;
      const oldRowVal = aug[row][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[pivotRow][j];
      }
      const sign = factor > 0 ? "-" : "+";
      steps.push({
        descriptionZh: `消去第 ${row+1} 行第 ${col+1} 列的元素：乘數 = ${fmt(oldRowVal)} ÷ ${fmt(pivotVal)} = ${fmt(factor)}`,
        descriptionEn: `Eliminate element in row ${row+1}, col ${col+1}: multiplier = ${fmt(oldRowVal)} ÷ ${fmt(pivotVal)} = ${fmt(factor)}`,
        matrix: aug.map((r) => [...r]),
        latex: `R_{${row+1}} \\leftarrow R_{${row+1}} ${sign} ${fmt(Math.abs(factor))} R_{${pivotRow+1}} \\Rightarrow ${augLatex(aug, n)}`,
      });
    }

    pivotRow++;
  }

  const rank = pivotRow;

  steps.push({
    descriptionZh: `行階梯形式完成，矩陣秩 = ${rank}，方程數 = ${m}，未知數 = ${n}`,
    descriptionEn: `Row Echelon Form complete. Rank = ${rank}, equations = ${m}, unknowns = ${n}`,
    matrix: aug.map((r) => [...r]),
    latex: `\\text{REF: rank}(A) = ${rank} \\Rightarrow ${augLatex(aug, n)}`,
  });

  // Check consistency
  for (let row = rank; row < m; row++) {
    if (Math.abs(aug[row][n]) > 1e-10) {
      steps.push({
        descriptionZh: `矛盾行：第 ${row+1} 行為 [0...0 | ${fmt(aug[row][n])}]，即 0 = ${fmt(aug[row][n])}，方程組無解`,
        descriptionEn: `Contradiction row: row ${row+1} is [0...0 | ${fmt(aug[row][n])}], i.e. 0 = ${fmt(aug[row][n])} — no solution`,
        matrix: aug.map((r) => [...r]),
        latex: `0 = ${fmt(aug[row][n])} \\Rightarrow \\text{Inconsistent — No Solution}`,
      });
      return { type: "none", steps };
    }
  }

  // Infinite solutions
  if (rank < n) {
    const freeVars = [];
    const pivotSet = new Set(pivotCols);
    for (let j = 0; j < n; j++) {
      if (!pivotSet.has(j)) freeVars.push(j);
    }
    const freeVarNames = freeVars.map((j) => `x_{${j+1}}`).join(", ");
    steps.push({
      descriptionZh: `秩 ${rank} < 未知數個數 ${n}，有 ${n - rank} 個自由變量：${freeVarNames}，方程組有無限多解`,
      descriptionEn: `Rank ${rank} < unknowns ${n}; ${n - rank} free variable(s): ${freeVarNames} — infinitely many solutions`,
      matrix: aug.map((r) => [...r]),
      latex: `\\text{rank}(A) = ${rank} < ${n} = n \\Rightarrow \\text{Infinite Solutions (free vars: } ${freeVarNames}\\text{)}`,
    });
    return { type: "infinite", steps, freeVariables: freeVars };
  }

  // Unique solution — back substitution
  steps.push({
    descriptionZh: "秩 = 未知數個數，方程組有唯一解，進行回代（Back Substitution）",
    descriptionEn: "Rank = number of unknowns — unique solution exists; perform back substitution",
    matrix: aug.map((r) => [...r]),
    latex: `\\text{rank}(A) = ${rank} = n \\Rightarrow \\text{Unique Solution}`,
  });

  // Scale pivot rows to 1 (RREF)
  for (let row = rank - 1; row >= 0; row--) {
    const col = pivotCols[row];
    const pivot = aug[row][col];
    if (Math.abs(pivot - 1) > 1e-10) {
      aug[row] = aug[row].map((v) => v / pivot);
      steps.push({
        descriptionZh: `第 ${row+1} 行除以主元 ${fmt(pivot)}，令主元 = 1`,
        descriptionEn: `Divide row ${row+1} by pivot ${fmt(pivot)} to normalize`,
        matrix: aug.map((r) => [...r]),
        latex: `R_{${row+1}} \\leftarrow \\frac{1}{${fmt(pivot)}} R_{${row+1}} \\Rightarrow ${augLatex(aug, n)}`,
      });
    }
  }

  // Eliminate above pivots (full RREF)
  for (let row = rank - 1; row >= 0; row--) {
    const col = pivotCols[row];
    for (let above = 0; above < row; above++) {
      const factor = aug[above][col];
      if (Math.abs(factor) < 1e-10) continue;
      for (let j = 0; j <= n; j++) {
        aug[above][j] -= factor * aug[row][j];
      }
      const sign = factor > 0 ? "-" : "+";
      steps.push({
        descriptionZh: `消去第 ${above+1} 行第 ${col+1} 列的元素（回代）`,
        descriptionEn: `Eliminate element above pivot in row ${above+1}, col ${col+1} (back substitution)`,
        matrix: aug.map((r) => [...r]),
        latex: `R_{${above+1}} \\leftarrow R_{${above+1}} ${sign} ${fmt(Math.abs(factor))} R_{${row+1}} \\Rightarrow ${augLatex(aug, n)}`,
      });
    }
  }

  steps.push({
    descriptionZh: "簡化行階梯形式（RREF）完成",
    descriptionEn: "Reduced Row Echelon Form (RREF) complete",
    matrix: aug.map((r) => [...r]),
    latex: `\\text{RREF} \\Rightarrow ${augLatex(aug, n)}`,
  });

  const solution = pivotCols.map((col, row) => parseFloat(aug[row][n].toFixed(10)));
  const fullSolution = new Array(n).fill(0);
  pivotCols.forEach((col, row) => { fullSolution[col] = solution[row]; });

  steps.push({
    descriptionZh: "讀取解：從 RREF 直接讀出每個變量的值",
    descriptionEn: "Read solution: directly read each variable's value from RREF",
    matrix: [fullSolution],
    latex: fullSolution.map((v, i) => `x_{${i+1}} = ${fmt(v)}`).join(",\\quad "),
  });

  return { type: "unique", solution: fullSolution, steps };
}
