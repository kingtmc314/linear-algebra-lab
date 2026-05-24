/**
 * TransformationPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Linear Transformation module covering:
 *   2D: Rotation, Reflection (x-axis, y-axis, y=x, y=-x, any line),
 *       Shear (horizontal, vertical), Scaling (enlargement/reduction),
 *       Squeeze, Translation (affine), Projection
 *   3D: Rotation (x/y/z axis), Scaling, Reflection (coordinate planes)
 *
 * For each transform:
 *   • Shows the transformation matrix in exact form (LaTeX)
 *   • Shows step-by-step derivation
 *   • Interactive 2D Plotly chart: unit square + unit circle + custom vectors
 *   • Interactive 3D Plotly chart for 3D transforms
 *   • Input a custom matrix to see its transformation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import KatexRenderer from "@/components/KatexRenderer";
import Plotly from "plotly.js-dist-min";

// ─── Math helpers ─────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/**
 * fmt — exact LaTeX representation of a number.
 * Handles integers, simple fractions, and k*√2/2, k*√3/2, k*√2, k*√3 forms.
 */
function fmt(n: number): string {
  if (Math.abs(n) < 1e-10) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-10) return String(Math.round(n));

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  // k * √2 / 2  (e.g. 3√2/2, 7√2/2)
  const s2h = Math.SQRT1_2; // √2/2
  const k2h = abs / s2h;
  if (Math.abs(k2h - Math.round(k2h)) < 1e-8 && Math.round(k2h) !== 0) {
    const k = Math.round(k2h);
    const num = k === 1 ? "\\sqrt{2}" : `${k}\\sqrt{2}`;
    return `${sign}\\frac{${num}}{2}`;
  }

  // k * √3 / 2  (e.g. 3√3/2)
  const s3h = Math.sqrt(3) / 2;
  const k3h = abs / s3h;
  if (Math.abs(k3h - Math.round(k3h)) < 1e-8 && Math.round(k3h) !== 0) {
    const k = Math.round(k3h);
    const num = k === 1 ? "\\sqrt{3}" : `${k}\\sqrt{3}`;
    return `${sign}\\frac{${num}}{2}`;
  }

  // k * √2  (e.g. 2√2, 3√2)
  const s2 = Math.SQRT2;
  const k2 = abs / s2;
  if (Math.abs(k2 - Math.round(k2)) < 1e-8 && Math.round(k2) !== 0) {
    const k = Math.round(k2);
    return k === 1 ? `${sign}\\sqrt{2}` : `${sign}${k}\\sqrt{2}`;
  }

  // k * √3  (e.g. 2√3)
  const s3 = Math.sqrt(3);
  const k3 = abs / s3;
  if (Math.abs(k3 - Math.round(k3)) < 1e-8 && Math.round(k3) !== 0) {
    const k = Math.round(k3);
    return k === 1 ? `${sign}\\sqrt{3}` : `${sign}${k}\\sqrt{3}`;
  }

  // Simple fractions p/q where q ∈ {2,3,4,6,8,12}
  for (const q of [2, 3, 4, 6, 8, 12]) {
    const p = Math.round(abs * q);
    if (Math.abs(abs - p / q) < 1e-8 && p !== 0) {
      const g = gcd(p, q);
      const pR = p / g, qR = q / g;
      return qR === 1 ? `${sign}${pR}` : `${sign}\\frac{${pR}}{${qR}}`;
    }
  }

  return n.toFixed(4).replace(/\.?0+$/, "");
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * fmtPlain — plain-text (no LaTeX) representation for Plotly legend labels.
 */
function fmtPlain(n: number): string {
  if (Math.abs(n) < 1e-10) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-10) return String(Math.round(n));

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  const s2h = Math.SQRT1_2;
  const k2h = abs / s2h;
  if (Math.abs(k2h - Math.round(k2h)) < 1e-8 && Math.round(k2h) !== 0) {
    const k = Math.round(k2h);
    return k === 1 ? `${sign}\u221a2/2` : `${sign}${k}\u221a2/2`;
  }

  const s3h = Math.sqrt(3) / 2;
  const k3h = abs / s3h;
  if (Math.abs(k3h - Math.round(k3h)) < 1e-8 && Math.round(k3h) !== 0) {
    const k = Math.round(k3h);
    return k === 1 ? `${sign}\u221a3/2` : `${sign}${k}\u221a3/2`;
  }

  const s2 = Math.SQRT2;
  const k2 = abs / s2;
  if (Math.abs(k2 - Math.round(k2)) < 1e-8 && Math.round(k2) !== 0) {
    const k = Math.round(k2);
    return k === 1 ? `${sign}\u221a2` : `${sign}${k}\u221a2`;
  }

  for (const q of [2, 3, 4, 6, 8, 12]) {
    const p = Math.round(abs * q);
    if (Math.abs(abs - p / q) < 1e-8 && p !== 0) {
      const g = gcd(p, q);
      const pR = p / g, qR = q / g;
      return qR === 1 ? `${sign}${pR}` : `${sign}${pR}/${qR}`;
    }
  }

  return n.toFixed(4).replace(/\.?0+$/, "");
}

function matLatex(M: number[][], bracket: "b" | "p" = "b"): string {
  const open = bracket === "b" ? "\\begin{bmatrix}" : "\\begin{pmatrix}";
  const close = bracket === "b" ? "\\end{bmatrix}" : "\\end{pmatrix}";
  const rows = M.map(row => row.map(fmt).join(" & ")).join(" \\\\ ");
  return `${open} ${rows} ${close}`;
}

function applyTransform(M: number[][], v: [number, number]): [number, number] {
  return [
    M[0][0] * v[0] + M[0][1] * v[1],
    M[1][0] * v[0] + M[1][1] * v[1],
  ];
}

function applyTransform3D(M: number[][], v: [number, number, number]): [number, number, number] {
  return [
    M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
    M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
    M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
  ];
}

// ─── Transform definitions ────────────────────────────────────────────────────

type TransformDim = "2d" | "3d";

interface TransformDef {
  id: string;
  dim: TransformDim;
  category: string;
  nameZh: string;
  nameEn: string;
  params: ParamDef[];
  matrix: (params: Record<string, number>) => number[][];
  /** Optional symbolic LaTeX for the matrix display (e.g. cos θ instead of 0.1219) */
  symbolicLatex?: (params: Record<string, number>) => string;
  latexZh: (params: Record<string, number>) => string;
  latexEn: (params: Record<string, number>) => string;
  stepsZh: (params: Record<string, number>, M: number[][]) => string[];
  stepsEn: (params: Record<string, number>, M: number[][]) => string[];
}

interface ParamDef {
  id: string;
  labelZh: string;
  labelEn: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

const TRANSFORMS: TransformDef[] = [
  // ── 2D Rotation ──
  {
    id: "rotate2d",
    dim: "2d",
    category: "2D",
    nameZh: "旋轉",
    nameEn: "Rotation",
    params: [{ id: "theta", labelZh: "角度 θ（度）", labelEn: "Angle θ (deg)", default: 45, min: -360, max: 360, step: 1, unit: "°" }],
    matrix: ({ theta }) => {
      const t = theta * DEG;
      return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
    },
    symbolicLatex: ({ theta }) => {
      const c = fmt(Math.cos(theta * DEG));
      const s = fmt(Math.sin(theta * DEG));
      const sNeg = fmt(-Math.sin(theta * DEG));
      // If fmt returned exact values, show them; otherwise show cos/sin notation
      const isExact = (v: number) => {
        const f = fmt(v);
        return !f.includes(".");
      };
      if (isExact(Math.cos(theta * DEG)) && isExact(Math.sin(theta * DEG))) {
        return `A = \\begin{bmatrix} ${c} & ${sNeg} \\\\ ${s} & ${c} \\end{bmatrix}`;
      }
      return `A = \\begin{bmatrix} \\cos(${theta}°) & -\\sin(${theta}°) \\\\ \\sin(${theta}°) & \\cos(${theta}°) \\end{bmatrix}`;
    },
    latexZh: ({ theta }) => `逆時針旋轉 ${theta}°`,
    latexEn: ({ theta }) => `Counter-clockwise rotation by ${theta}°`,
    stepsZh: ({ theta }, M) => [
      `旋轉矩陣公式：\\(R(\\theta) = \\begin{bmatrix}\\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta\\end{bmatrix}\\)`,
      `代入 \\(\\theta = ${theta}°\\)：\\(\\cos(${theta}°) = ${fmt(Math.cos(theta*DEG))}\\)，\\(\\sin(${theta}°) = ${fmt(Math.sin(theta*DEG))}\\)`,
      `得 \\(R(${theta}°) = ${matLatex(M)}\\)`,
    ],
    stepsEn: ({ theta }, M) => [
      `Rotation matrix formula: \\(R(\\theta) = \\begin{bmatrix}\\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta\\end{bmatrix}\\)`,
      `Substituting \\(\\theta = ${theta}°\\): \\(\\cos(${theta}°) = ${fmt(Math.cos(theta*DEG))}\\), \\(\\sin(${theta}°) = ${fmt(Math.sin(theta*DEG))}\\)`,
      `Result: \\(R(${theta}°) = ${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Reflection: x-axis ──
  {
    id: "reflect_x",
    dim: "2d",
    category: "2D",
    nameZh: "關於 x 軸反射",
    nameEn: "Reflection (x-axis)",
    params: [],
    matrix: () => [[1, 0], [0, -1]],
    latexZh: () => "關於 x 軸的反射",
    latexEn: () => "Reflection about the x-axis",
    stepsZh: (_, M) => [
      "關於 x 軸反射：x 座標不變，y 座標取負",
      `\\((x, y) \\mapsto (x, -y)\\)`,
      `反射矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: (_, M) => [
      "Reflection about x-axis: x unchanged, y negated",
      `\\((x, y) \\mapsto (x, -y)\\)`,
      `Reflection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Reflection: y-axis ──
  {
    id: "reflect_y",
    dim: "2d",
    category: "2D",
    nameZh: "關於 y 軸反射",
    nameEn: "Reflection (y-axis)",
    params: [],
    matrix: () => [[-1, 0], [0, 1]],
    latexZh: () => "關於 y 軸的反射",
    latexEn: () => "Reflection about the y-axis",
    stepsZh: (_, M) => [
      "關於 y 軸反射：y 座標不變，x 座標取負",
      `\\((x, y) \\mapsto (-x, y)\\)`,
      `反射矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: (_, M) => [
      "Reflection about y-axis: y unchanged, x negated",
      `\\((x, y) \\mapsto (-x, y)\\)`,
      `Reflection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Reflection: y = x ──
  {
    id: "reflect_yx",
    dim: "2d",
    category: "2D",
    nameZh: "關於 y = x 反射",
    nameEn: "Reflection (y = x)",
    params: [],
    matrix: () => [[0, 1], [1, 0]],
    latexZh: () => "關於直線 y = x 的反射",
    latexEn: () => "Reflection about the line y = x",
    stepsZh: (_, M) => [
      "關於 y = x 反射：交換 x 和 y 座標",
      `\\((x, y) \\mapsto (y, x)\\)`,
      `反射矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: (_, M) => [
      "Reflection about y = x: swap x and y coordinates",
      `\\((x, y) \\mapsto (y, x)\\)`,
      `Reflection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Reflection: y = -x ──
  {
    id: "reflect_ynx",
    dim: "2d",
    category: "2D",
    nameZh: "關於 y = -x 反射",
    nameEn: "Reflection (y = -x)",
    params: [],
    matrix: () => [[0, -1], [-1, 0]],
    latexZh: () => "關於直線 y = -x 的反射",
    latexEn: () => "Reflection about the line y = -x",
    stepsZh: (_, M) => [
      "關於 y = -x 反射：交換並取負",
      `\\((x, y) \\mapsto (-y, -x)\\)`,
      `反射矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: (_, M) => [
      "Reflection about y = -x: swap and negate",
      `\\((x, y) \\mapsto (-y, -x)\\)`,
      `Reflection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Reflection: any line through origin ──
  {
    id: "reflect_line",
    dim: "2d",
    category: "2D",
    nameZh: "關於任意直線反射",
    nameEn: "Reflection (any line)",
    params: [{ id: "alpha", labelZh: "直線角度 α（度）", labelEn: "Line angle α (deg)", default: 30, min: 0, max: 180, step: 1, unit: "°" }],
    matrix: ({ alpha }) => {
      const a = 2 * alpha * DEG;
      return [[Math.cos(a), Math.sin(a)], [Math.sin(a), -Math.cos(a)]];
    },
    symbolicLatex: ({ alpha }) => {
      const a2 = 2 * alpha;
      const c = fmt(Math.cos(2 * alpha * DEG));
      const s = fmt(Math.sin(2 * alpha * DEG));
      const isExact = (v: number) => !fmt(v).includes(".");
      if (isExact(Math.cos(2*alpha*DEG)) && isExact(Math.sin(2*alpha*DEG))) {
        return `A = \\begin{bmatrix} ${c} & ${s} \\\\ ${s} & -${c} \\end{bmatrix}`;
      }
      return `A = \\begin{bmatrix} \\cos(${a2}°) & \\sin(${a2}°) \\\\ \\sin(${a2}°) & -\\cos(${a2}°) \\end{bmatrix}`;
    },
    latexZh: ({ alpha }) => `關於通過原點、角度為 ${alpha}° 的直線的反射`,
    latexEn: ({ alpha }) => `Reflection about the line through origin at angle ${alpha}°`,
    stepsZh: ({ alpha }, M) => [
      `反射矩陣公式（直線角度 \\(\\alpha\\)）：\\(R_{\\alpha} = \\begin{bmatrix}\\cos 2\\alpha & \\sin 2\\alpha \\\\ \\sin 2\\alpha & -\\cos 2\\alpha\\end{bmatrix}\\)`,
      `代入 \\(\\alpha = ${alpha}°\\)，即 \\(2\\alpha = ${2*alpha}°\\)`,
      `\\(\\cos(${2*alpha}°) = ${fmt(Math.cos(2*alpha*DEG))}\\)，\\(\\sin(${2*alpha}°) = ${fmt(Math.sin(2*alpha*DEG))}\\)`,
      `反射矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ alpha }, M) => [
      `Reflection matrix formula (line angle \\(\\alpha\\)): \\(R_{\\alpha} = \\begin{bmatrix}\\cos 2\\alpha & \\sin 2\\alpha \\\\ \\sin 2\\alpha & -\\cos 2\\alpha\\end{bmatrix}\\)`,
      `Substituting \\(\\alpha = ${alpha}°\\), so \\(2\\alpha = ${2*alpha}°\\)`,
      `\\(\\cos(${2*alpha}°) = ${fmt(Math.cos(2*alpha*DEG))}\\), \\(\\sin(${2*alpha}°) = ${fmt(Math.sin(2*alpha*DEG))}\\)`,
      `Reflection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Horizontal Shear ──
  {
    id: "shear_h",
    dim: "2d",
    category: "2D",
    nameZh: "水平剪切",
    nameEn: "Horizontal Shear",
    params: [{ id: "k", labelZh: "剪切因子 k", labelEn: "Shear factor k", default: 1, min: -5, max: 5, step: 0.1 }],
    matrix: ({ k }) => [[1, k], [0, 1]],
    latexZh: ({ k }) => `水平剪切，因子 k = ${k}`,
    latexEn: ({ k }) => `Horizontal shear with factor k = ${k}`,
    stepsZh: ({ k }, M) => [
      "水平剪切：x 座標增加 k 倍的 y 座標，y 座標不變",
      `\\((x, y) \\mapsto (x + ${k}y,\\; y)\\)`,
      `剪切矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ k }, M) => [
      "Horizontal shear: x-coordinate shifted by k times y, y unchanged",
      `\\((x, y) \\mapsto (x + ${k}y,\\; y)\\)`,
      `Shear matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Vertical Shear ──
  {
    id: "shear_v",
    dim: "2d",
    category: "2D",
    nameZh: "垂直剪切",
    nameEn: "Vertical Shear",
    params: [{ id: "k", labelZh: "剪切因子 k", labelEn: "Shear factor k", default: 1, min: -5, max: 5, step: 0.1 }],
    matrix: ({ k }) => [[1, 0], [k, 1]],
    latexZh: ({ k }) => `垂直剪切，因子 k = ${k}`,
    latexEn: ({ k }) => `Vertical shear with factor k = ${k}`,
    stepsZh: ({ k }, M) => [
      "垂直剪切：y 座標增加 k 倍的 x 座標，x 座標不變",
      `\\((x, y) \\mapsto (x,\\; y + ${k}x)\\)`,
      `剪切矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ k }, M) => [
      "Vertical shear: y-coordinate shifted by k times x, x unchanged",
      `\\((x, y) \\mapsto (x,\\; y + ${k}x)\\)`,
      `Shear matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Scaling (Enlargement/Reduction) ──
  {
    id: "scale2d",
    dim: "2d",
    category: "2D",
    nameZh: "縮放（放大/縮小）",
    nameEn: "Scaling (Enlargement/Reduction)",
    params: [
      { id: "sx", labelZh: "x 方向縮放 sₓ", labelEn: "x-scale sₓ", default: 2, min: -5, max: 5, step: 0.1 },
      { id: "sy", labelZh: "y 方向縮放 s_y", labelEn: "y-scale s_y", default: 2, min: -5, max: 5, step: 0.1 },
    ],
    matrix: ({ sx, sy }) => [[sx, 0], [0, sy]],
    latexZh: ({ sx, sy }) => `x 方向縮放 ${sx}，y 方向縮放 ${sy}`,
    latexEn: ({ sx, sy }) => `Scale x by ${sx}, y by ${sy}`,
    stepsZh: ({ sx, sy }, M) => [
      `縮放矩陣將每個向量的 x 分量乘以 ${sx}，y 分量乘以 ${sy}`,
      `\\((x, y) \\mapsto (${sx}x,\\; ${sy}y)\\)`,
      `縮放矩陣：\\(${matLatex(M)}\\)`,
      sx === sy ? `（均勻縮放，比例因子 = ${sx}）` : `（非均勻縮放：x 和 y 方向不同）`,
    ],
    stepsEn: ({ sx, sy }, M) => [
      `Scaling matrix multiplies x-component by ${sx} and y-component by ${sy}`,
      `\\((x, y) \\mapsto (${sx}x,\\; ${sy}y)\\)`,
      `Scaling matrix: \\(${matLatex(M)}\\)`,
      sx === sy ? `(Uniform scaling, scale factor = ${sx})` : `(Non-uniform scaling: different factors for x and y)`,
    ],
  },
  // ── 2D Squeeze ──
  {
    id: "squeeze",
    dim: "2d",
    category: "2D",
    nameZh: "擠壓變換",
    nameEn: "Squeeze Mapping",
    params: [{ id: "k", labelZh: "擠壓因子 k (> 0)", labelEn: "Squeeze factor k (> 0)", default: 2, min: 0.1, max: 10, step: 0.1 }],
    matrix: ({ k }) => [[k, 0], [0, 1/k]],
    latexZh: ({ k }) => `擠壓變換，因子 k = ${k}（面積保持不變）`,
    latexEn: ({ k }) => `Squeeze mapping with factor k = ${k} (area-preserving)`,
    stepsZh: ({ k }, M) => [
      `擠壓變換：x 方向拉伸 k 倍，y 方向壓縮為 1/k 倍，面積保持不變`,
      `\\((x, y) \\mapsto (${k}x,\\; \\frac{1}{${k}}y)\\)`,
      `行列式 = ${k} \\times \\frac{1}{${k}} = 1（面積不變）`,
      `擠壓矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ k }, M) => [
      `Squeeze mapping: stretch x by k, compress y by 1/k, area preserved`,
      `\\((x, y) \\mapsto (${k}x,\\; \\frac{1}{${k}}y)\\)`,
      `Determinant = ${k} \\times \\frac{1}{${k}} = 1 (area preserved)`,
      `Squeeze matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Projection onto x-axis ──
  {
    id: "proj_x",
    dim: "2d",
    category: "2D",
    nameZh: "投影到 x 軸",
    nameEn: "Projection onto x-axis",
    params: [],
    matrix: () => [[1, 0], [0, 0]],
    latexZh: () => "正交投影到 x 軸",
    latexEn: () => "Orthogonal projection onto the x-axis",
    stepsZh: (_, M) => [
      "投影到 x 軸：保留 x 座標，丟棄 y 座標",
      `\\((x, y) \\mapsto (x, 0)\\)`,
      `注意：行列式 = 0（奇異矩陣，不可逆）`,
      `投影矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: (_, M) => [
      "Project onto x-axis: keep x, discard y",
      `\\((x, y) \\mapsto (x, 0)\\)`,
      `Note: determinant = 0 (singular matrix, not invertible)`,
      `Projection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 2D Projection onto y-axis ──
  {
    id: "proj_y",
    dim: "2d",
    category: "2D",
    nameZh: "投影到 y 軸",
    nameEn: "Projection onto y-axis",
    params: [],
    matrix: () => [[0, 0], [0, 1]],
    latexZh: () => "正交投影到 y 軸",
    latexEn: () => "Orthogonal projection onto the y-axis",
    stepsZh: (_, M) => [
      "投影到 y 軸：保留 y 座標，丟棄 x 座標",
      `\\((x, y) \\mapsto (0, y)\\)`,
      `注意：行列式 = 0（奇異矩陣，不可逆）`,
      `投影矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: (_, M) => [
      "Project onto y-axis: keep y, discard x",
      `\\((x, y) \\mapsto (0, y)\\)`,
      `Note: determinant = 0 (singular matrix, not invertible)`,
      `Projection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 3D Rotation about x-axis ──
  {
    id: "rotate3d_x",
    dim: "3d",
    category: "3D",
    nameZh: "繞 x 軸旋轉（3D）",
    nameEn: "Rotation about x-axis (3D)",
    params: [{ id: "theta", labelZh: "角度 θ（度）", labelEn: "Angle θ (deg)", default: 45, min: -360, max: 360, step: 1, unit: "°" }],
    matrix: ({ theta }) => {
      const t = theta * DEG;
      return [[1,0,0],[0,Math.cos(t),-Math.sin(t)],[0,Math.sin(t),Math.cos(t)]];
    },
    latexZh: ({ theta }) => `繞 x 軸旋轉 ${theta}°`,
    latexEn: ({ theta }) => `Rotation about x-axis by ${theta}°`,
    stepsZh: ({ theta }, M) => [
      `繞 x 軸旋轉矩陣：\\(R_x(\\theta) = \\begin{bmatrix}1&0&0\\\\0&\\cos\\theta&-\\sin\\theta\\\\0&\\sin\\theta&\\cos\\theta\\end{bmatrix}\\)`,
      `代入 \\(\\theta = ${theta}°\\)`,
      `\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ theta }, M) => [
      `Rotation matrix about x-axis: \\(R_x(\\theta) = \\begin{bmatrix}1&0&0\\\\0&\\cos\\theta&-\\sin\\theta\\\\0&\\sin\\theta&\\cos\\theta\\end{bmatrix}\\)`,
      `Substituting \\(\\theta = ${theta}°\\)`,
      `\\(${matLatex(M)}\\)`,
    ],
  },
  // ── 3D Rotation about y-axis ──
  {
    id: "rotate3d_y",
    dim: "3d",
    category: "3D",
    nameZh: "繞 y 軸旋轉（3D）",
    nameEn: "Rotation about y-axis (3D)",
    params: [{ id: "theta", labelZh: "角度 θ（度）", labelEn: "Angle θ (deg)", default: 45, min: -360, max: 360, step: 1, unit: "°" }],
    matrix: ({ theta }) => {
      const t = theta * DEG;
      return [[Math.cos(t),0,Math.sin(t)],[0,1,0],[-Math.sin(t),0,Math.cos(t)]];
    },
    latexZh: ({ theta }) => `繞 y 軸旋轉 ${theta}°`,
    latexEn: ({ theta }) => `Rotation about y-axis by ${theta}°`,
    stepsZh: ({ theta }, M) => [
      `繞 y 軸旋轉矩陣：\\(R_y(\\theta) = \\begin{bmatrix}\\cos\\theta&0&\\sin\\theta\\\\0&1&0\\\\-\\sin\\theta&0&\\cos\\theta\\end{bmatrix}\\)`,
      `代入 \\(\\theta = ${theta}°\\)`,
      `\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ theta }, M) => [
      `Rotation matrix about y-axis: \\(R_y(\\theta) = \\begin{bmatrix}\\cos\\theta&0&\\sin\\theta\\\\0&1&0\\\\-\\sin\\theta&0&\\cos\\theta\\end{bmatrix}\\)`,
      `Substituting \\(\\theta = ${theta}°\\)`,
      `\\(${matLatex(M)}\\)`,
    ],
  },
  // ── 3D Rotation about z-axis ──
  {
    id: "rotate3d_z",
    dim: "3d",
    category: "3D",
    nameZh: "繞 z 軸旋轉（3D）",
    nameEn: "Rotation about z-axis (3D)",
    params: [{ id: "theta", labelZh: "角度 θ（度）", labelEn: "Angle θ (deg)", default: 45, min: -360, max: 360, step: 1, unit: "°" }],
    matrix: ({ theta }) => {
      const t = theta * DEG;
      return [[Math.cos(t),-Math.sin(t),0],[Math.sin(t),Math.cos(t),0],[0,0,1]];
    },
    latexZh: ({ theta }) => `繞 z 軸旋轉 ${theta}°`,
    latexEn: ({ theta }) => `Rotation about z-axis by ${theta}°`,
    stepsZh: ({ theta }, M) => [
      `繞 z 軸旋轉矩陣：\\(R_z(\\theta) = \\begin{bmatrix}\\cos\\theta&-\\sin\\theta&0\\\\\\sin\\theta&\\cos\\theta&0\\\\0&0&1\\end{bmatrix}\\)`,
      `代入 \\(\\theta = ${theta}°\\)`,
      `\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ theta }, M) => [
      `Rotation matrix about z-axis: \\(R_z(\\theta) = \\begin{bmatrix}\\cos\\theta&-\\sin\\theta&0\\\\\\sin\\theta&\\cos\\theta&0\\\\0&0&1\\end{bmatrix}\\)`,
      `Substituting \\(\\theta = ${theta}°\\)`,
      `\\(${matLatex(M)}\\)`,
    ],
  },
  // ── 3D Scaling ──
  {
    id: "scale3d",
    dim: "3d",
    category: "3D",
    nameZh: "三維縮放",
    nameEn: "3D Scaling",
    params: [
      { id: "sx", labelZh: "x 縮放 sₓ", labelEn: "x-scale sₓ", default: 2, min: -5, max: 5, step: 0.1 },
      { id: "sy", labelZh: "y 縮放 s_y", labelEn: "y-scale s_y", default: 1, min: -5, max: 5, step: 0.1 },
      { id: "sz", labelZh: "z 縮放 s_z", labelEn: "z-scale s_z", default: 0.5, min: -5, max: 5, step: 0.1 },
    ],
    matrix: ({ sx, sy, sz }) => [[sx,0,0],[0,sy,0],[0,0,sz]],
    latexZh: ({ sx, sy, sz }) => `三維縮放：x×${sx}, y×${sy}, z×${sz}`,
    latexEn: ({ sx, sy, sz }) => `3D scaling: x×${sx}, y×${sy}, z×${sz}`,
    stepsZh: ({ sx, sy, sz }, M) => [
      `三維縮放矩陣將各分量分別乘以對應因子`,
      `\\((x,y,z) \\mapsto (${sx}x, ${sy}y, ${sz}z)\\)`,
      `縮放矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: ({ sx, sy, sz }, M) => [
      `3D scaling matrix multiplies each component by its scale factor`,
      `\\((x,y,z) \\mapsto (${sx}x, ${sy}y, ${sz}z)\\)`,
      `Scaling matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── 3D Reflection: xy-plane ──
  {
    id: "reflect3d_xy",
    dim: "3d",
    category: "3D",
    nameZh: "關於 xy 平面反射（3D）",
    nameEn: "Reflection about xy-plane (3D)",
    params: [],
    matrix: () => [[1,0,0],[0,1,0],[0,0,-1]],
    latexZh: () => "關於 xy 平面的反射（z 取負）",
    latexEn: () => "Reflection about the xy-plane (negate z)",
    stepsZh: (_, M) => [
      "關於 xy 平面反射：x, y 不變，z 取負",
      `\\((x,y,z) \\mapsto (x, y, -z)\\)`,
      `反射矩陣：\\(${matLatex(M)}\\)`,
    ],
    stepsEn: (_, M) => [
      "Reflection about xy-plane: x, y unchanged, z negated",
      `\\((x,y,z) \\mapsto (x, y, -z)\\)`,
      `Reflection matrix: \\(${matLatex(M)}\\)`,
    ],
  },
  // ── Custom 2D ──
  {
    id: "custom2d",
    dim: "2d",
    category: "Custom",
    nameZh: "自訂 2×2 矩陣",
    nameEn: "Custom 2×2 Matrix",
    params: [
      { id: "a", labelZh: "a", labelEn: "a", default: 1, min: -10, max: 10, step: 0.1 },
      { id: "b", labelZh: "b", labelEn: "b", default: 0, min: -10, max: 10, step: 0.1 },
      { id: "c", labelZh: "c", labelEn: "c", default: 0, min: -10, max: 10, step: 0.1 },
      { id: "d", labelZh: "d", labelEn: "d", default: 1, min: -10, max: 10, step: 0.1 },
    ],
    matrix: ({ a, b, c, d }) => [[a, b], [c, d]],
    latexZh: () => "自訂 2×2 線性變換矩陣",
    latexEn: () => "Custom 2×2 linear transformation matrix",
    stepsZh: ({ a, b, c, d }, M) => [
      `自訂矩陣：\\(A = ${matLatex(M)}\\)`,
      `行列式 = ${fmt(a*d - b*c)}`,
      `第一行（Ae₁）= \\(\\begin{bmatrix}${fmt(a)}\\\\${fmt(c)}\\end{bmatrix}\\)，第二行（Ae₂）= \\(\\begin{bmatrix}${fmt(b)}\\\\${fmt(d)}\\end{bmatrix}\\)`,
    ],
    stepsEn: ({ a, b, c, d }, M) => [
      `Custom matrix: \\(A = ${matLatex(M)}\\)`,
      `Determinant = ${fmt(a*d - b*c)}`,
      `Column 1 (Ae₁) = \\(\\begin{bmatrix}${fmt(a)}\\\\${fmt(c)}\\end{bmatrix}\\), Column 2 (Ae₂) = \\(\\begin{bmatrix}${fmt(b)}\\\\${fmt(d)}\\end{bmatrix}\\)`,
    ],
  },
];

// ─── 2D Plot ──────────────────────────────────────────────────────────────────

interface Plot2DProps {
  matrix: number[][];
  lang: "zh" | "en";
  title?: string;
  customVec?: [number, number] | null;
  det?: number | null;
}

function Plot2D({ matrix, lang, title, customVec, det }: Plot2DProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Unit square corners (closed)
    const sq = [[0,0],[1,0],[1,1],[0,1],[0,0]] as [number,number][];
    const sqT = sq.map(v => applyTransform(matrix, v));

    // Unit circle
    const N = 80;
    const circle = Array.from({ length: N+1 }, (_, i) => {
      const a = (2*Math.PI*i)/N;
      return [Math.cos(a), Math.sin(a)] as [number,number];
    });
    const circleT = circle.map(v => applyTransform(matrix, v));

    // Basis vectors
    const e1T = applyTransform(matrix, [1,0]);
    const e2T = applyTransform(matrix, [0,1]);

    // Custom vector and its image
    const cv = customVec ?? null;
    const cvT = cv ? applyTransform(matrix, cv) : null;

    const traces: Plotly.Data[] = [
      // Original square
      {
        x: sq.map(v=>v[0]), y: sq.map(v=>v[1]),
        mode: "lines", name: lang==="zh"?"原始正方形":"Original square",
        line: { color: "#94a3b8", dash: "dash", width: 1.5 },
      },
      // Original circle
      {
        x: circle.map(v=>v[0]), y: circle.map(v=>v[1]),
        mode: "lines", name: lang==="zh"?"原始圓":"Original circle",
        line: { color: "#cbd5e1", dash: "dot", width: 1 },
      },
      // Transformed square
      {
        x: sqT.map(v=>v[0]), y: sqT.map(v=>v[1]),
        mode: "lines", name: lang==="zh"?"變換後正方形":"Transformed square",
        line: { color: "#6366f1", width: 2 },
        fill: "toself", fillcolor: "rgba(99,102,241,0.08)",
      },
      // Transformed circle (ellipse)
      {
        x: circleT.map(v=>v[0]), y: circleT.map(v=>v[1]),
        mode: "lines", name: lang==="zh"?"變換後圓（橢圓）":"Transformed circle (ellipse)",
        line: { color: "#8b5cf6", width: 1.5, dash: "dot" },
      },
      // Ae1 vector
      {
        x: [0, e1T[0]], y: [0, e1T[1]],
        mode: "lines+markers", name: `Ae₁ = (${fmtPlain(e1T[0])}, ${fmtPlain(e1T[1])})`,
        line: { color: "#ef4444", width: 2.5 },
        marker: { size: [0, 8], color: "#ef4444", symbol: "arrow-up" },
      },
      // Ae2 vector
      {
        x: [0, e2T[0]], y: [0, e2T[1]],
        mode: "lines+markers", name: `Ae₂ = (${fmtPlain(e2T[0])}, ${fmtPlain(e2T[1])})`,
        line: { color: "#22c55e", width: 2.5 },
        marker: { size: [0, 8], color: "#22c55e", symbol: "arrow-up" },
      },
    ];

    // Custom vector v (grey) and Av (orange)
    const annotations: Partial<Plotly.Annotations>[] = [];

    if (cv && cvT) {
      // v arrow
      traces.push({
        x: [0, cv[0]], y: [0, cv[1]],
        mode: "lines+markers",
        name: `v = (${fmtPlain(cv[0])}, ${fmtPlain(cv[1])})`,
        line: { color: "#64748b", width: 2, dash: "dot" },
        marker: { size: [0, 8], color: "#64748b" },
      });
      // Av arrow
      traces.push({
        x: [0, cvT[0]], y: [0, cvT[1]],
        mode: "lines+markers",
        name: `Av = (${fmtPlain(cvT[0])}, ${fmtPlain(cvT[1])})`,
        line: { color: "#f97316", width: 2.5 },
        marker: { size: [0, 8], color: "#f97316" },
      });
      // Arrowhead annotations for v and Av
      annotations.push(
        {
          x: cv[0], y: cv[1], ax: 0, ay: 0,
          xref: "x", yref: "y", axref: "x", ayref: "y",
          showarrow: true, arrowhead: 3, arrowsize: 1.2, arrowwidth: 2, arrowcolor: "#64748b",
          text: `  v=(${fmtPlain(cv[0])},${fmtPlain(cv[1])})`,
          font: { size: 10, color: "#64748b" }, bgcolor: "rgba(255,255,255,0.7)",
        },
        {
          x: cvT[0], y: cvT[1], ax: 0, ay: 0,
          xref: "x", yref: "y", axref: "x", ayref: "y",
          showarrow: true, arrowhead: 3, arrowsize: 1.2, arrowwidth: 2, arrowcolor: "#f97316",
          text: `  Av=(${fmtPlain(cvT[0])},${fmtPlain(cvT[1])})`,
          font: { size: 10, color: "#f97316" }, bgcolor: "rgba(255,255,255,0.7)",
        }
      );
    }

    // Determinant annotation (area scaling)
    if (det !== null && det !== undefined) {
      const detLabel = fmtPlain(det);
      // Place near centre of transformed square
      const cx = sqT.slice(0,4).reduce((s,v)=>s+v[0],0)/4;
      const cy = sqT.slice(0,4).reduce((s,v)=>s+v[1],0)/4;
      annotations.push({
        x: cx, y: cy,
        xref: "x", yref: "y",
        text: `det = ${detLabel}`,
        showarrow: false,
        font: { size: 10, color: "#6366f1" },
        bgcolor: "rgba(255,255,255,0.8)",
        bordercolor: "#6366f1",
        borderwidth: 1,
        borderpad: 3,
      });
    }

    const layout: Partial<Plotly.Layout> = {
      title: { text: title || "", font: { size: 12 } },
      xaxis: { zeroline: true, zerolinecolor: "#64748b", zerolinewidth: 1.5, gridcolor: "#e2e8f0", title: { text: "x" } },
      yaxis: { zeroline: true, zerolinecolor: "#64748b", zerolinewidth: 1.5, gridcolor: "#e2e8f0", title: { text: "y" }, scaleanchor: "x", scaleratio: 1 },
      showlegend: true,
      legend: { x: 1.02, y: 1, font: { size: 10 } },
      margin: { l: 40, r: 140, t: 30, b: 40 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "IBM Plex Mono, monospace", size: 11 },
      annotations,
    };

    Plotly.react(ref.current, traces, layout, { responsive: true, displayModeBar: true });
  }, [matrix, lang, title, customVec, det]);

  return <div ref={ref} style={{ width: "100%", height: 420 }} />;
}

// ─── 3D Plot ──────────────────────────────────────────────────────────────────

interface Plot3DProps {
  matrix: number[][];
  lang: "zh" | "en";
}

function Plot3D({ matrix, lang }: Plot3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Unit cube edges
    const cubeEdges: [number,number,number][][] = [
      [[0,0,0],[1,0,0]], [[0,1,0],[1,1,0]], [[0,0,1],[1,0,1]], [[0,1,1],[1,1,1]],
      [[0,0,0],[0,1,0]], [[1,0,0],[1,1,0]], [[0,0,1],[0,1,1]], [[1,0,1],[1,1,1]],
      [[0,0,0],[0,0,1]], [[1,0,0],[1,0,1]], [[0,1,0],[0,1,1]], [[1,1,0],[1,1,1]],
    ];

    const origTraces: Plotly.Data[] = cubeEdges.map((edge, i) => ({
      x: edge.map(v=>v[0]), y: edge.map(v=>v[1]), z: edge.map(v=>v[2]),
      type: "scatter3d" as const,
      mode: "lines",
      name: i === 0 ? (lang==="zh"?"原始立方體":"Original cube") : undefined,
      showlegend: i === 0,
      line: { color: "#94a3b8", width: 2, dash: "dash" },
    }));

    const transEdges = cubeEdges.map(edge => edge.map(v => applyTransform3D(matrix, v)));
    const transTraces: Plotly.Data[] = transEdges.map((edge, i) => ({
      x: edge.map(v=>v[0]), y: edge.map(v=>v[1]), z: edge.map(v=>v[2]),
      type: "scatter3d" as const,
      mode: "lines",
      name: i === 0 ? (lang==="zh"?"變換後立方體":"Transformed cube") : undefined,
      showlegend: i === 0,
      line: { color: "#6366f1", width: 3 },
    }));

    // Basis vectors
    const e1T = applyTransform3D(matrix, [1,0,0]);
    const e2T = applyTransform3D(matrix, [0,1,0]);
    const e3T = applyTransform3D(matrix, [0,0,1]);

    const basisTraces: Plotly.Data[] = [
      { x:[0,e1T[0]], y:[0,e1T[1]], z:[0,e1T[2]], type:"scatter3d", mode:"lines+markers", name:"Ae₁", line:{color:"#ef4444",width:4}, marker:{size:[0,5],color:"#ef4444"} },
      { x:[0,e2T[0]], y:[0,e2T[1]], z:[0,e2T[2]], type:"scatter3d", mode:"lines+markers", name:"Ae₂", line:{color:"#22c55e",width:4}, marker:{size:[0,5],color:"#22c55e"} },
      { x:[0,e3T[0]], y:[0,e3T[1]], z:[0,e3T[2]], type:"scatter3d", mode:"lines+markers", name:"Ae₃", line:{color:"#3b82f6",width:4}, marker:{size:[0,5],color:"#3b82f6"} },
    ];

    const layout: Partial<Plotly.Layout> = {
      scene: {
        xaxis: { title: { text: "x" }, gridcolor: "#e2e8f0" },
        yaxis: { title: { text: "y" }, gridcolor: "#e2e8f0" },
        zaxis: { title: { text: "z" }, gridcolor: "#e2e8f0" },
        bgcolor: "rgba(0,0,0,0)",
      },
      showlegend: true,
      legend: { x: 1.02, y: 1, font: { size: 10 } },
      margin: { l: 0, r: 100, t: 10, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "IBM Plex Mono, monospace", size: 11 },
    };

    Plotly.react(ref.current, [...origTraces, ...transEdges.length > 0 ? transTraces : [], ...basisTraces], layout, { responsive: true });
  }, [matrix, lang]);

  return <div ref={ref} style={{ width: "100%", height: 480 }} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransformationPage() {
  const { lang } = useLanguage();

  const [selectedId, setSelectedId] = useState("rotate2d");
  const [params, setParams] = useState<Record<string, Record<string, number>>>({});

  // Custom vector state lifted here so Plot2D can show v and Av
  const [cvx, setCvx] = useState(1);
  const [cvy, setCvy] = useState(0);
  const [cvz, setCvz] = useState(0);

  const selected = TRANSFORMS.find(t => t.id === selectedId)!;

  const getParams = (id: string): Record<string, number> => {
    const def = TRANSFORMS.find(t => t.id === id)!;
    const stored = params[id] ?? {};
    const result: Record<string, number> = {};
    for (const p of def.params) {
      result[p.id] = stored[p.id] ?? p.default;
    }
    return result;
  };

  const currentParams = getParams(selectedId);
  const matrix = selected.matrix(currentParams);

  const setParam = (paramId: string, value: number) => {
    setParams(prev => ({
      ...prev,
      [selectedId]: { ...getParams(selectedId), [paramId]: value },
    }));
  };

  const det2d = selected.dim === "2d" && matrix.length === 2
    ? matrix[0][0]*matrix[1][1] - matrix[0][1]*matrix[1][0]
    : null;

  const customVec2d: [number, number] | null = selected.dim === "2d" ? [cvx, cvy] : null;

  const categories = ["2D", "3D", "Custom"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'IBM Plex Serif', serif" }}
        >
          {lang === "zh" ? "幾何變換" : "Geometric Transformations"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          {lang === "zh"
            ? "探索線性變換的幾何意義：旋轉、反射、剪切、縮放等，並觀察其對圖形的影響。"
            : "Explore the geometric meaning of linear transformations: rotation, reflection, shear, scaling, and more."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left panel: transform selector + params ── */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          {categories.map(cat => {
            const items = TRANSFORMS.filter(t => t.category === cat);
            return (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-1.5 px-1">
                  {cat}
                </p>
                <div className="space-y-1">
                  {items.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-all duration-150
                        ${selectedId === t.id
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-card text-foreground border border-border hover:bg-secondary"
                        }`}
                    >
                      {lang === "zh" ? t.nameZh : t.nameEn}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Parameter controls */}
          {selected.params.length > 0 && (
            <div
              className="rounded-xl border p-4 space-y-4"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {lang === "zh" ? "參數" : "Parameters"}
              </p>
              {selected.params.map(p => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-muted-foreground">
                      {lang === "zh" ? p.labelZh : p.labelEn}
                    </label>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {currentParams[p.id]}{p.unit ?? ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={p.min ?? -10}
                    max={p.max ?? 10}
                    step={p.step ?? 0.1}
                    value={currentParams[p.id]}
                    onChange={e => setParam(p.id, parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <input
                    type="number"
                    value={currentParams[p.id]}
                    onChange={e => setParam(p.id, parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-xs font-mono bg-background text-foreground"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel: matrix, steps, chart ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Transform name + description */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <h2 className="text-base font-bold font-mono text-foreground mb-1">
              {lang === "zh" ? selected.nameZh : selected.nameEn}
            </h2>
            <p className="text-sm text-muted-foreground font-mono">
              {lang === "zh" ? selected.latexZh(currentParams) : selected.latexEn(currentParams)}
            </p>
          </div>

          {/* Transformation matrix */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {lang === "zh" ? "變換矩陣（精確值）" : "Transformation Matrix (exact)"}
              </p>
              {det2d !== null && (
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: "#3b82f620", color: "#3b82f6" }}
                >
                  det = {fmt(det2d)}
                </span>
              )}
            </div>
            {selected.symbolicLatex ? (
              <>
                <KatexRenderer
                  latex={selected.symbolicLatex(currentParams)}
                  displayMode={true}
                />
                {/* Show numerical approximation below if symbolic differs from numerical */}
                {selected.symbolicLatex(currentParams) !== `A = ${matLatex(matrix)}` && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground font-mono mb-1">
                      {lang === "zh" ? "數值近似：" : "Numerical approximation:"}
                    </p>
                    <KatexRenderer
                      latex={`A \\approx ${matLatex(matrix)}`}
                      displayMode={true}
                    />
                  </div>
                )}
              </>
            ) : (
              <KatexRenderer
                latex={`A = ${matLatex(matrix)}`}
                displayMode={true}
              />
            )}
          </div>

          {/* Step-by-step derivation */}
          <div
            className="rounded-xl border p-4 space-y-3"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              {lang === "zh" ? "推導步驟" : "Derivation Steps"}
            </p>
            {(lang === "zh" ? selected.stepsZh(currentParams, matrix) : selected.stepsEn(currentParams, matrix)).map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-mono font-bold flex items-center justify-center text-white"
                  style={{ background: "#3b82f6" }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 text-sm text-foreground font-mono">
                  <KatexRenderer latex={step} displayMode={false} />
                </div>
              </div>
            ))}
          </div>

          {/* Interactive chart */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {lang === "zh" ? "互動圖表" : "Interactive Chart"}
              </p>
              <span className="text-xs text-muted-foreground font-mono">
                {lang === "zh" ? "（可縮放·可拖曳）" : "(zoomable · draggable)"}
              </span>
            </div>
            {selected.dim === "2d" ? (
              <>
                <Plot2D matrix={matrix} lang={lang} customVec={customVec2d} det={det2d} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-t border-dashed border-gray-400 inline-block" />
                    {lang === "zh" ? "原始正方形" : "Original square"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-2 bg-indigo-400/20 border border-indigo-400 inline-block rounded" />
                    {lang === "zh" ? "變換後" : "Transformed"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-red-500 inline-block rounded" />
                    Ae₁
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-green-500 inline-block rounded" />
                    Ae₂
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-t border-dotted border-purple-400 inline-block" />
                    {lang === "zh" ? "變換後圓" : "Transformed circle"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Plot3D matrix={matrix} lang={lang} />
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-red-500 inline-block rounded" />
                    Ae₁
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-green-500 inline-block rounded" />
                    Ae₂
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-blue-500 inline-block rounded" />
                    Ae₃
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Apply transform to custom vector */}
          <CustomVectorPanel
            matrix={matrix}
            dim={selected.dim}
            lang={lang}
            vx={cvx} vy={cvy} vz={cvz}
            setVx={setCvx} setVy={setCvy} setVz={setCvz}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Custom Vector Panel ──────────────────────────────────────────────────────

interface CustomVectorPanelProps {
  matrix: number[][];
  dim: TransformDim;
  lang: "zh" | "en";
  vx: number; vy: number; vz: number;
  setVx: (v: number) => void;
  setVy: (v: number) => void;
  setVz: (v: number) => void;
}

function CustomVectorPanel({ matrix, dim, lang, vx, vy, vz, setVx, setVy, setVz }: CustomVectorPanelProps) {

  const result = dim === "2d"
    ? applyTransform(matrix, [vx, vy])
    : applyTransform3D(matrix, [vx, vy, vz]);

  const inputVec = dim === "2d"
    ? `\\begin{bmatrix}${fmt(vx)}\\\\${fmt(vy)}\\end{bmatrix}`
    : `\\begin{bmatrix}${fmt(vx)}\\\\${fmt(vy)}\\\\${fmt(vz)}\\end{bmatrix}`;

  const resultVec = dim === "2d"
    ? `\\begin{bmatrix}${fmt(result[0])}\\\\${fmt(result[1])}\\end{bmatrix}`
    : `\\begin{bmatrix}${fmt(result[0])}\\\\${fmt(result[1])}\\\\${fmt((result as [number,number,number])[2])}\\end{bmatrix}`;

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
        {lang === "zh" ? "向量變換計算" : "Apply Transform to Vector"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-muted-foreground">x</label>
          <input type="number" value={vx} onChange={e => setVx(parseFloat(e.target.value)||0)}
            className="w-16 border rounded px-2 py-1 text-xs font-mono bg-background text-foreground"
            style={{ borderColor: "var(--border)" }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-muted-foreground">y</label>
          <input type="number" value={vy} onChange={e => setVy(parseFloat(e.target.value)||0)}
            className="w-16 border rounded px-2 py-1 text-xs font-mono bg-background text-foreground"
            style={{ borderColor: "var(--border)" }} />
        </div>
        {dim === "3d" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-muted-foreground">z</label>
            <input type="number" value={vz} onChange={e => setVz(parseFloat(e.target.value)||0)}
              className="w-16 border rounded px-2 py-1 text-xs font-mono bg-background text-foreground"
              style={{ borderColor: "var(--border)" }} />
          </div>
        )}
      </div>
      <KatexRenderer
        latex={`A \\cdot ${inputVec} = ${matLatex(matrix)} \\cdot ${inputVec} = ${resultVec}`}
        displayMode={true}
      />
    </div>
  );
}
