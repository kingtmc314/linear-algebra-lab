// ============================================================
// Vector Math Library — Detailed Step-by-Step Derivations
// Each operation shows component-wise calculation steps
// ============================================================

import { fmt } from "./matrixMath";

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type VecN = number[];

export interface VectorStep {
  descriptionZh: string;
  descriptionEn: string;
  latex: string;
  value?: number | number[];
}

export interface VectorResult {
  vector?: VecN;
  scalar?: number;
  steps: VectorStep[];
  error?: string;
}

export function vecToLatex(v: VecN): string {
  return `\\begin{pmatrix} ${v.map(fmt).join(" \\\\ ")} \\end{pmatrix}`;
}

const compLabels = ["x", "y", "z", "w"];
function compLabel(i: number): string {
  return compLabels[i] ?? `e_{${i+1}}`;
}

// ─── Vector Addition ──────────────────────────────────────────────────────────

export function vecAdd(a: VecN, b: VecN): VectorResult {
  const steps: VectorStep[] = [];
  const dim = a.length;

  steps.push({
    descriptionZh: `向量加法：兩個 ${dim}D 向量相加`,
    descriptionEn: `Vector addition: add two ${dim}D vectors`,
    latex: `\\mathbf{a} = ${vecToLatex(a)},\\quad \\mathbf{b} = ${vecToLatex(b)}`,
  });

  steps.push({
    descriptionZh: "加法規則：對應分量相加",
    descriptionEn: "Addition rule: add corresponding components",
    latex: `(\\mathbf{a}+\\mathbf{b})_i = a_i + b_i`,
  });

  const result = a.map((v, i) => v + b[i]);

  const compSteps = a.map((v, i) => {
    const bv = b[i], s = v + bv;
    const bStr = bv < 0 ? `(${fmt(bv)})` : fmt(bv);
    return `${compLabel(i)}: ${fmt(v)} + ${bStr} = ${fmt(s)}`;
  });

  steps.push({
    descriptionZh: "逐分量計算：",
    descriptionEn: "Component-wise calculation:",
    latex: compSteps.join(",\\quad "),
  });

  steps.push({
    descriptionZh: "最終結果",
    descriptionEn: "Final result",
    latex: `\\mathbf{a} + \\mathbf{b} = ${vecToLatex(result)}`,
    value: result,
  });

  return { vector: result, steps };
}

// ─── Vector Subtraction ───────────────────────────────────────────────────────

export function vecSub(a: VecN, b: VecN): VectorResult {
  const steps: VectorStep[] = [];
  const dim = a.length;

  steps.push({
    descriptionZh: `向量減法：兩個 ${dim}D 向量相減`,
    descriptionEn: `Vector subtraction: subtract two ${dim}D vectors`,
    latex: `\\mathbf{a} = ${vecToLatex(a)},\\quad \\mathbf{b} = ${vecToLatex(b)}`,
  });

  steps.push({
    descriptionZh: "減法規則：對應分量相減",
    descriptionEn: "Subtraction rule: subtract corresponding components",
    latex: `(\\mathbf{a}-\\mathbf{b})_i = a_i - b_i`,
  });

  const result = a.map((v, i) => v - b[i]);

  const compSteps = a.map((v, i) => {
    const bv = b[i], d = v - bv;
    return `${compLabel(i)}: ${fmt(v)} - ${fmt(bv)} = ${fmt(d)}`;
  });

  steps.push({
    descriptionZh: "逐分量計算：",
    descriptionEn: "Component-wise calculation:",
    latex: compSteps.join(",\\quad "),
  });

  steps.push({
    descriptionZh: "最終結果",
    descriptionEn: "Final result",
    latex: `\\mathbf{a} - \\mathbf{b} = ${vecToLatex(result)}`,
    value: result,
  });

  return { vector: result, steps };
}

// ─── Dot Product ──────────────────────────────────────────────────────────────

export function vecDot(a: VecN, b: VecN): VectorResult {
  const steps: VectorStep[] = [];

  steps.push({
    descriptionZh: `計算 ${a.length}D 向量的點積（內積）`,
    descriptionEn: `Computing dot product (inner product) of ${a.length}D vectors`,
    latex: `\\mathbf{a} = ${vecToLatex(a)},\\quad \\mathbf{b} = ${vecToLatex(b)}`,
  });

  steps.push({
    descriptionZh: "點積公式：a · b = Σ aᵢ × bᵢ（對應分量乘積之和）",
    descriptionEn: "Dot product formula: a · b = Σ aᵢ × bᵢ (sum of products of corresponding components)",
    latex: `\\mathbf{a} \\cdot \\mathbf{b} = \\sum_{i} a_i b_i`,
  });

  const terms = a.map((v, i) => v * b[i]);
  const termLatex = a.map((v, i) => `(${fmt(v)})(${fmt(b[i])})`).join(" + ");
  const termValues = terms.map(fmt).join(" + ");
  const result = terms.reduce((s, v) => s + v, 0);

  steps.push({
    descriptionZh: "展開各分量乘積：",
    descriptionEn: "Expand component products:",
    latex: `\\mathbf{a} \\cdot \\mathbf{b} = ${termLatex}`,
  });

  steps.push({
    descriptionZh: "計算各乘積的值：",
    descriptionEn: "Evaluate each product:",
    latex: `= ${termValues}`,
  });

  steps.push({
    descriptionZh: "求和得最終結果",
    descriptionEn: "Sum to get final result",
    latex: `\\mathbf{a} \\cdot \\mathbf{b} = ${fmt(result)}`,
    value: result,
  });

  return { scalar: result, steps };
}

// ─── Cross Product (3D only) ──────────────────────────────────────────────────

export function vecCross(a: Vec3, b: Vec3): VectorResult {
  const steps: VectorStep[] = [];

  steps.push({
    descriptionZh: "計算 3D 向量的叉積（外積）",
    descriptionEn: "Computing cross product (outer product) of 3D vectors",
    latex: `\\mathbf{a} = ${vecToLatex(a)},\\quad \\mathbf{b} = ${vecToLatex(b)}`,
  });

  steps.push({
    descriptionZh: "叉積公式：使用行列式展開",
    descriptionEn: "Cross product formula: expand using determinant",
    latex: `\\mathbf{a} \\times \\mathbf{b} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ ${a.map(fmt).join(" & ")} \\\\ ${b.map(fmt).join(" & ")} \\end{vmatrix}`,
  });

  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];

  steps.push({
    descriptionZh: `計算 i 分量（x）：沿 i 展開 2×2 子式`,
    descriptionEn: `Compute i component (x): expand 2×2 minor along i`,
    latex: `i: a_y b_z - a_z b_y = (${fmt(a[1])})(${fmt(b[2])}) - (${fmt(a[2])})(${fmt(b[1])}) = ${fmt(a[1]*b[2])} - ${fmt(a[2]*b[1])} = ${fmt(x)}`,
  });

  steps.push({
    descriptionZh: `計算 j 分量（y）：沿 j 展開 2×2 子式（注意負號）`,
    descriptionEn: `Compute j component (y): expand 2×2 minor along j (note negative sign)`,
    latex: `j: -(a_x b_z - a_z b_x) = -[(${fmt(a[0])})(${fmt(b[2])}) - (${fmt(a[2])})(${fmt(b[0])})] = -[${fmt(a[0]*b[2])} - ${fmt(a[2]*b[0])}] = ${fmt(y)}`,
  });

  steps.push({
    descriptionZh: `計算 k 分量（z）：沿 k 展開 2×2 子式`,
    descriptionEn: `Compute k component (z): expand 2×2 minor along k`,
    latex: `k: a_x b_y - a_y b_x = (${fmt(a[0])})(${fmt(b[1])}) - (${fmt(a[1])})(${fmt(b[0])}) = ${fmt(a[0]*b[1])} - ${fmt(a[1]*b[0])} = ${fmt(z)}`,
  });

  const result = [x, y, z];

  steps.push({
    descriptionZh: "最終結果：叉積向量",
    descriptionEn: "Final result: cross product vector",
    latex: `\\mathbf{a} \\times \\mathbf{b} = ${vecToLatex(result)}`,
    value: result,
  });

  // Verify perpendicularity
  const dotAC = a[0]*x + a[1]*y + a[2]*z;
  const dotBC = b[0]*x + b[1]*y + b[2]*z;
  steps.push({
    descriptionZh: `驗證：叉積與 a 和 b 均垂直（點積應為 0）`,
    descriptionEn: `Verification: cross product is perpendicular to both a and b (dot products should be 0)`,
    latex: `\\mathbf{a} \\cdot (\\mathbf{a}\\times\\mathbf{b}) = ${fmt(dotAC)},\\quad \\mathbf{b} \\cdot (\\mathbf{a}\\times\\mathbf{b}) = ${fmt(dotBC)}`,
  });

  return { vector: result, steps };
}

// ─── Magnitude ────────────────────────────────────────────────────────────────

export function vecMagnitude(a: VecN): VectorResult {
  const steps: VectorStep[] = [];

  steps.push({
    descriptionZh: `計算 ${a.length}D 向量的模（長度）`,
    descriptionEn: `Computing magnitude (length) of ${a.length}D vector`,
    latex: `\\mathbf{a} = ${vecToLatex(a)}`,
  });

  steps.push({
    descriptionZh: "模的公式：|a| = √(a₁² + a₂² + ... + aₙ²)",
    descriptionEn: "Magnitude formula: |a| = √(a₁² + a₂² + ... + aₙ²)",
    latex: `|\\mathbf{a}| = \\sqrt{\\sum_i a_i^2}`,
  });

  const squaredTerms = a.map((v) => v * v);
  const squaredLatex = a.map((v) => `(${fmt(v)})^2`).join(" + ");
  const sumSq = squaredTerms.reduce((s, v) => s + v, 0);
  const mag = Math.sqrt(sumSq);

  steps.push({
    descriptionZh: "計算各分量的平方：",
    descriptionEn: "Square each component:",
    latex: squaredTerms.map((sq, i) => `${compLabel(i)}: (${fmt(a[i])})^2 = ${fmt(sq)}`).join(",\\quad "),
  });

  steps.push({
    descriptionZh: "求各平方和：",
    descriptionEn: "Sum of squares:",
    latex: `${squaredLatex} = ${fmt(sumSq)}`,
  });

  steps.push({
    descriptionZh: "取平方根得模",
    descriptionEn: "Take square root to get magnitude",
    latex: `|\\mathbf{a}| = \\sqrt{${fmt(sumSq)}} = ${fmt(mag)}`,
    value: mag,
  });

  return { scalar: mag, steps };
}

// ─── Angle Between Vectors ────────────────────────────────────────────────────

export function vecAngle(a: VecN, b: VecN): VectorResult {
  const steps: VectorStep[] = [];

  steps.push({
    descriptionZh: "計算兩向量之間的夾角",
    descriptionEn: "Computing angle between two vectors",
    latex: `\\mathbf{a} = ${vecToLatex(a)},\\quad \\mathbf{b} = ${vecToLatex(b)}`,
  });

  steps.push({
    descriptionZh: "夾角公式：cos θ = (a · b) / (|a| × |b|)",
    descriptionEn: "Angle formula: cos θ = (a · b) / (|a| × |b|)",
    latex: `\\cos\\theta = \\frac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}||\\mathbf{b}|}`,
  });

  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));

  if (magA < 1e-10 || magB < 1e-10) {
    return { steps, error: "zero_vector" };
  }

  const dotTerms = a.map((v, i) => `(${fmt(v)})(${fmt(b[i])})`).join("+");
  steps.push({
    descriptionZh: `計算點積：a · b = ${dotTerms} = ${fmt(dot)}`,
    descriptionEn: `Compute dot product: a · b = ${dotTerms} = ${fmt(dot)}`,
    latex: `\\mathbf{a} \\cdot \\mathbf{b} = ${dotTerms} = ${fmt(dot)}`,
  });

  const sqA = a.map((v) => `(${fmt(v)})^2`).join("+");
  const sqB = b.map((v) => `(${fmt(v)})^2`).join("+");
  steps.push({
    descriptionZh: `計算 |a| = √(${sqA}) = ${fmt(magA)}`,
    descriptionEn: `Compute |a| = √(${sqA}) = ${fmt(magA)}`,
    latex: `|\\mathbf{a}| = \\sqrt{${sqA}} = ${fmt(magA)}`,
  });

  steps.push({
    descriptionZh: `計算 |b| = √(${sqB}) = ${fmt(magB)}`,
    descriptionEn: `Compute |b| = √(${sqB}) = ${fmt(magB)}`,
    latex: `|\\mathbf{b}| = \\sqrt{${sqB}} = ${fmt(magB)}`,
  });

  const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magB)));
  steps.push({
    descriptionZh: `代入公式：cos θ = ${fmt(dot)} / (${fmt(magA)} × ${fmt(magB)}) = ${fmt(cosTheta)}`,
    descriptionEn: `Substitute: cos θ = ${fmt(dot)} / (${fmt(magA)} × ${fmt(magB)}) = ${fmt(cosTheta)}`,
    latex: `\\cos\\theta = \\frac{${fmt(dot)}}{${fmt(magA)} \\times ${fmt(magB)}} = \\frac{${fmt(dot)}}{${fmt(magA * magB)}} = ${fmt(cosTheta)}`,
  });

  const theta = Math.acos(cosTheta);
  const thetaDeg = (theta * 180) / Math.PI;

  steps.push({
    descriptionZh: `取反餘弦：θ = arccos(${fmt(cosTheta)}) = ${fmt(thetaDeg)}°`,
    descriptionEn: `Take arccosine: θ = arccos(${fmt(cosTheta)}) = ${fmt(thetaDeg)}°`,
    latex: `\\theta = \\arccos(${fmt(cosTheta)}) = ${fmt(thetaDeg)}^\\circ`,
    value: thetaDeg,
  });

  return { scalar: thetaDeg, steps };
}

// ─── Unit Vector (Normalize) ──────────────────────────────────────────────────

export function vecNormalize(a: VecN): VectorResult {
  const steps: VectorStep[] = [];

  steps.push({
    descriptionZh: "計算單位向量（方向不變，模 = 1）",
    descriptionEn: "Computing unit vector (same direction, magnitude = 1)",
    latex: `\\mathbf{a} = ${vecToLatex(a)}`,
  });

  steps.push({
    descriptionZh: "單位向量公式：â = a / |a|",
    descriptionEn: "Unit vector formula: â = a / |a|",
    latex: `\\hat{\\mathbf{a}} = \\frac{\\mathbf{a}}{|\\mathbf{a}|}`,
  });

  const sumSq = a.reduce((s, v) => s + v * v, 0);
  const mag = Math.sqrt(sumSq);

  if (mag < 1e-10) {
    return { steps, error: "zero_vector" };
  }

  const sqTerms = a.map((v) => `(${fmt(v)})^2`).join("+");
  steps.push({
    descriptionZh: `計算模：|a| = √(${sqTerms}) = √${fmt(sumSq)} = ${fmt(mag)}`,
    descriptionEn: `Compute magnitude: |a| = √(${sqTerms}) = √${fmt(sumSq)} = ${fmt(mag)}`,
    latex: `|\\mathbf{a}| = \\sqrt{${sqTerms}} = \\sqrt{${fmt(sumSq)}} = ${fmt(mag)}`,
  });

  const result = a.map((v) => v / mag);
  const divSteps = a.map((v, i) => `${compLabel(i)}: \\frac{${fmt(v)}}{${fmt(mag)}} = ${fmt(v/mag)}`).join(",\\quad ");

  steps.push({
    descriptionZh: "各分量除以模：",
    descriptionEn: "Divide each component by magnitude:",
    latex: divSteps,
  });

  steps.push({
    descriptionZh: "最終結果：單位向量",
    descriptionEn: "Final result: unit vector",
    latex: `\\hat{\\mathbf{a}} = \\frac{1}{${fmt(mag)}} ${vecToLatex(a)} = ${vecToLatex(result)}`,
    value: result,
  });

  // Verify
  const verifyMag = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
  steps.push({
    descriptionZh: `驗證：|â| = ${fmt(verifyMag)} ≈ 1`,
    descriptionEn: `Verification: |â| = ${fmt(verifyMag)} ≈ 1`,
    latex: `|\\hat{\\mathbf{a}}| = ${fmt(verifyMag)} \\approx 1 \\checkmark`,
  });

  return { vector: result, steps };
}
