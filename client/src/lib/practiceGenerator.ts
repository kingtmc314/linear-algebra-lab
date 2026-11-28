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
import { buildSystemTeaching, SYSTEM_PRESETS } from "./systemTeaching";
import { ratAugLatex, fromFloat, rat, ratToLatex } from "./rational";
import { computeEigen } from "./eigenMath";

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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
        checkAnswer: (s) => {
          const m = parseMatrix(s);
          return m !== null && matApproxEq(m, answer);
        },
      };
    }
  }
}

// ─── Linear System Practice Questions ────────────────────────────────────────

export function generateLinearSystemQuestion(
  lang: "zh" | "en" = "zh",
  options: {
    random?: () => number;
    variant?: "solve" | "classify" | "method";
    preset?: number;
  } = {}
): PracticeQuestion {
  // Constructive generation is bounded even when the RNG always returns zero.
  const random = options.random ?? Math.random;
  const integer = (lo: number, hi: number) => {
    const sample = random();
    const bounded = Number.isFinite(sample)
      ? Math.max(0, Math.min(0.999999999, sample))
      : 0;
    return lo + Math.floor(bounded * (hi - lo + 1));
  };
  const variant =
    options.variant ??
    (["solve", "classify", "method"] as const)[integer(0, 2)];
  let A: Matrix, b: number[];
  if (variant === "solve") {
    const n = integer(2, 3);
    const lower = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        i === j ? 1 : i > j ? integer(-2, 2) : 0
      )
    );
    const upper = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        i === j
          ? integer(1, 3) * (integer(0, 1) ? 1 : -1)
          : i < j
            ? integer(-2, 2)
            : 0
      )
    );
    A = lower.map(row =>
      upper[0].map((_, j) =>
        row.reduce((sum, value, k) => sum + value * upper[k][j], 0)
      )
    );
    const x = Array.from({ length: n }, () => integer(-4, 4));
    b = A.map(row => row.reduce((sum, value, j) => sum + value * x[j], 0));
  } else {
    // Five taxonomy presets plus consistent/inconsistent overdetermined systems.
    const requested = options.preset;
    const presetIndex =
      requested === undefined
        ? integer(0, 6)
        : Math.max(
            0,
            Math.min(6, Math.floor(Number.isFinite(requested) ? requested : 0))
          );
    if (presetIndex < SYSTEM_PRESETS.length) {
      const preset = SYSTEM_PRESETS[presetIndex];
      const scale = integer(1, 3);
      A = preset.A.map(row => row.map(value => value * scale));
      b = preset.b.map(value => value * scale);
    } else {
      A = [
        [0, 1],
        [2, 1],
        [4, 3],
      ];
      b = [1, 3, presetIndex === 5 ? 7 : 8];
    }
  }
  const teaching = buildSystemTeaching(A, b, lang);
  const { taxonomy } = teaching;
  const augLatex = ratAugLatex(
    A.map((row, i) => [...row.map(value => fromFloat(value)), fromFloat(b[i])]),
    taxonomy.n
  );
  const solutionSteps = teaching.steps;
  if (variant === "solve") {
    const values = teaching.cramer!.replacements.map(
      replacement => replacement.value
    );
    return {
      questionLatex: `${lang === "zh" ? "\\text{用 Cramer 法則求解：}" : "\\text{Solve using Cramer's rule:}"}\\quad ${augLatex}`,
      inputHint:
        lang === "zh"
          ? `依 x₁ 至 x${taxonomy.n} 順序，用空格分隔數值（可輸入整數或分數，例如 1 -2 3/4）。`
          : `Enter values in x1 through x${taxonomy.n} order, separated by spaces (integers or fractions, e.g. 1 -2 3/4).`,
      answerDisplay: values
        .map(value =>
          value.d === 1n ? value.n.toString() : `${value.n}/${value.d}`
        )
        .join(" "),
      answerLatex: teaching.solutionLatex!,
      solutionSteps,
      checkAnswer: input => {
        const tokens = input.trim().split(/[\s,]+/);
        if (tokens.length !== values.length) return false;
        return tokens.every((token, i) => {
          const fraction = token.match(/^([+-]?\d+)(?:\/(\d+))?$/);
          if (token.length > 128) return false;
          try {
            let value;
            if (fraction) {
              value = rat(BigInt(fraction[1]), BigInt(fraction[2] ?? "1"));
            } else {
              if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return false;
              const negative = token.startsWith("-");
              const [whole, decimal = ""] = token
                .replace(/^[+-]/, "")
                .split(".");
              value = rat(
                (negative ? -1n : 1n) * BigInt((whole || "0") + decimal),
                10n ** BigInt(decimal.length)
              );
            }
            return ratToLatex(value) === ratToLatex(values[i]);
          } catch {
            return false;
          }
        });
      },
    };
  }
  const keywords =
    variant === "method"
      ? [taxonomy.method === "cramer" ? "cramer" : "gaussian"]
      : [
          taxonomy.consistent ? "consistent" : "inconsistent",
          taxonomy.homogeneous ? "homogeneous" : "nonhomogeneous",
          taxonomy.type === "none" ? "none" : taxonomy.type,
        ];
  // Exact keyword normalization, not substring matching: inconsistent must not match consistent.
  const checkKeywords = (input: string) => {
    const text = input
      .toLowerCase()
      .trim()
      .replace(/cramer['’]?s?(?:\s+rule)?/g, "cramer")
      .replace(/gaussian(?:\s+elimination)?/g, "gaussian")
      .replace(/non[-\s]?homogeneous/g, "nonhomogeneous")
      .replace(
        /infinitely\s+many(?:\s+solutions)?|infinite\s+solutions/g,
        "infinite"
      )
      .replace(/unique\s+solution/g, "unique")
      .replace(/no\s+solutions?/g, "none")
      .replace(/不相容|不一致/g, " inconsistent ")
      .replace(/相容|一致/g, " consistent ")
      .replace(/非齊次/g, " nonhomogeneous ")
      .replace(/齊次/g, " homogeneous ")
      .replace(/無限多解/g, " infinite ")
      .replace(/唯一解/g, " unique ")
      .replace(/無解/g, " none ")
      .replace(/克拉瑪(?:法則)?|克拉默(?:法則)?/g, " cramer ")
      .replace(/高斯(?:消去法|消元法|消去|消元)?/g, " gaussian ");
    const tokens = text.split(/[\s,，;；/、]+/).filter(Boolean);
    return (
      tokens.length === keywords.length &&
      new Set(tokens).size === keywords.length &&
      keywords.every(keyword => tokens.includes(keyword))
    );
  };
  return {
    questionLatex: `${variant === "method" ? (lang === "zh" ? "\\text{選主要解法：Cramer 或 Gaussian？}" : "\\text{Choose the primary method: Cramer or Gaussian?}") : lang === "zh" ? "\\text{判斷一致性、齊次性與解的類型：}" : "\\text{Classify consistency, homogeneity and solution type:}"}\\quad ${augLatex}`,
    inputHint:
      variant === "method"
        ? lang === "zh"
          ? "輸入 cramer 或 gaussian；唯一解用 Cramer，其餘用 Gaussian。"
          : "Enter cramer or gaussian: Cramer for unique solutions, Gaussian otherwise."
        : lang === "zh"
          ? "輸入三個詞：consistent / inconsistent、homogeneous / nonhomogeneous、unique / infinite / none（亦接受相容／不相容、齊次／非齊次、唯一解／無限多解／無解）。"
          : "Enter three keywords: consistent / inconsistent, homogeneous / nonhomogeneous, unique / infinite / none. Separate them with spaces; order does not matter.",
    answerDisplay: keywords.join(", "),
    answerLatex: keywords.map(keyword => `\\text{${keyword}}`).join(",\\quad "),
    solutionSteps,
    checkAnswer: checkKeywords,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
        solutionSteps: res.steps,
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
    solutionSteps: computeEigen(A).steps.map(step => ({ descriptionZh: step.explanationZh, descriptionEn: step.explanationEn, latex: step.latex })),
    checkAnswer: (s) => {
      const v = parseVector(s);
      if (!v || v.length !== 2) return false;
      const sorted = [...v].sort((a, b) => a - b);
      return eigenvalues.every((ev, i) => approx(sorted[i], ev));
    },
    solutionLatex: `${lang === "zh" ? "\\text{特徵多項式：}" : "\\text{Characteristic polynomial:}"} \\det(A - \\lambda I) = (${eigenvalues[0]} - \\lambda)(${eigenvalues[1]} - \\lambda) = 0`,
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
