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

// ─── Triangle Centers (3D) ────────────────────────────────────────────────────
// Given three 3D points A, B, C forming a triangle, compute the four centers:
// Centroid (重心), Incenter (內心), Circumcenter (外心), Orthocenter (垂心)

export interface TriangleCenterResult {
  centroid: Vec3;
  incenter: Vec3;
  circumcenter: Vec3;
  orthocenter: Vec3;
  sideA: number; // length of BC (opposite to vertex A)
  sideB: number; // length of CA (opposite to vertex B)
  sideC: number; // length of AB (opposite to vertex C)
  steps: { descriptionZh: string; descriptionEn: string; latex: string }[];
}

function tc_sub(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function tc_add(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function tc_scale(a: Vec3, s: number): Vec3 { return [a[0]*s, a[1]*s, a[2]*s]; }
function tc_len(a: Vec3): number { return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); }
function tc_dot(a: Vec3, b: Vec3): number { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

function tc_fmtV(v: Vec3): string {
  const f = (n: number) => {
    if (Math.abs(n) < 1e-10) return "0";
    if (Number.isInteger(n)) return String(n);
    return parseFloat(n.toFixed(4)).toString();
  };
  return `(${f(v[0])},\\, ${f(v[1])},\\, ${f(v[2])})`;
}
function tc_fmtN(n: number): string {
  if (Math.abs(n) < 1e-10) return "0";
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(4)).toString();
}

export function computeTriangleCenters(A: Vec3, B: Vec3, C: Vec3): TriangleCenterResult {
  const steps: { descriptionZh: string; descriptionEn: string; latex: string }[] = [];

  // Side lengths
  const BC = tc_sub(C, B); const sideA = tc_len(BC); // opposite to A
  const CA = tc_sub(A, C); const sideB = tc_len(CA); // opposite to B
  const AB = tc_sub(B, A); const sideC = tc_len(AB); // opposite to C

  steps.push({
    descriptionZh: "輸入三點坐標",
    descriptionEn: "Input three vertices",
    latex: `A=${tc_fmtV(A)},\\quad B=${tc_fmtV(B)},\\quad C=${tc_fmtV(C)}`,
  });

  steps.push({
    descriptionZh: "計算各邊長度（a = |BC|，b = |CA|，c = |AB|）",
    descriptionEn: "Compute side lengths (a = |BC|, b = |CA|, c = |AB|)",
    latex: `a=|BC|=${tc_fmtN(sideA)},\\quad b=|CA|=${tc_fmtN(sideB)},\\quad c=|AB|=${tc_fmtN(sideC)}`,
  });

  // ── Centroid: G = (A+B+C)/3 ──
  const centroid: Vec3 = [
    (A[0]+B[0]+C[0])/3,
    (A[1]+B[1]+C[1])/3,
    (A[2]+B[2]+C[2])/3,
  ];
  steps.push({
    descriptionZh: "重心（Centroid）G：三頂點坐標的算術平均，即三條中線的交點",
    descriptionEn: "Centroid G: arithmetic mean of the three vertices (intersection of medians)",
    latex: `G = \\frac{A+B+C}{3} = ${tc_fmtV(centroid)}`,
  });

  // ── Incenter: I = (a·A + b·B + c·C) / (a+b+c) ──
  const perim = sideA + sideB + sideC;
  const incenter: Vec3 = [
    (sideA*A[0] + sideB*B[0] + sideC*C[0]) / perim,
    (sideA*A[1] + sideB*B[1] + sideC*C[1]) / perim,
    (sideA*A[2] + sideB*B[2] + sideC*C[2]) / perim,
  ];
  steps.push({
    descriptionZh: "內心（Incenter）I：以對邊長為權重的加權平均，即三條角平分線的交點，是內切圓圓心",
    descriptionEn: "Incenter I: weighted average with opposite side lengths as weights (intersection of angle bisectors, center of inscribed circle)",
    latex: `I = \\frac{a\\cdot A + b\\cdot B + c\\cdot C}{a+b+c} = \\frac{${tc_fmtN(sideA)}A + ${tc_fmtN(sideB)}B + ${tc_fmtN(sideC)}C}{${tc_fmtN(perim)}} = ${tc_fmtV(incenter)}`,
  });

  // ── Circumcenter: O = A + s*AB + t*AC, solve |O-A|^2 = |O-B|^2 = |O-C|^2 ──
  // Expanding the equal-distance conditions yields:
  //   s*(AB·AB) + t*(AB·AC) = (AB·AB)/2
  //   s*(AB·AC) + t*(AC·AC) = (AC·AC)/2
  // Solve 2x2 linear system by Cramer's rule.
  const AC = tc_sub(C, A);
  const d1 = tc_dot(AB, AB); // AB·AB = |AB|^2
  const d2 = tc_dot(AB, AC); // AB·AC
  const d3 = tc_dot(AC, AC); // AC·AC = |AC|^2
  const det = d1 * d3 - d2 * d2;  // determinant of the 2x2 system
  let circumcenter: Vec3;
  if (Math.abs(det) < 1e-12) {
    // Degenerate (collinear) — fallback to centroid
    circumcenter = [...centroid] as Vec3;
    steps.push({
      descriptionZh: "外心（Circumcenter）：三點共線，三角形退化，以重心代替",
      descriptionEn: "Circumcenter: degenerate (collinear points), fallback to centroid",
      latex: `O \\approx G = ${tc_fmtV(circumcenter)}`,
    });
  } else {
    // Cramer's rule: s = (rhs1*d3 - rhs2*d2) / det, t = (d1*rhs2 - d2*rhs1) / det
    // where rhs1 = d1/2, rhs2 = d3/2
    const rhs1 = d1 / 2;
    const rhs2 = d3 / 2;
    const s = (rhs1 * d3 - rhs2 * d2) / det;
    const t = (d1 * rhs2 - d2 * rhs1) / det;
    circumcenter = tc_add(A, tc_add(tc_scale(AB, s), tc_scale(AC, t)));
    steps.push({
      descriptionZh: "外心（Circumcenter）O：三角形外接圓圓心，到三頂點距離相等，即三條垂直平分線的交點",
      descriptionEn: "Circumcenter O: center of circumscribed circle, equidistant from all three vertices (intersection of perpendicular bisectors)",
      latex: `O = A + s\\cdot\\overrightarrow{AB} + t\\cdot\\overrightarrow{AC},\\quad s=${tc_fmtN(s)},\\; t=${tc_fmtN(t)} \\Rightarrow O=${tc_fmtV(circumcenter)}`,
    });
  }

  // ── Orthocenter: H = 3G - 2O (Euler line) ──
  const orthocenter: Vec3 = [
    3*centroid[0] - 2*circumcenter[0],
    3*centroid[1] - 2*circumcenter[1],
    3*centroid[2] - 2*circumcenter[2],
  ];
  steps.push({
    descriptionZh: "垂心（Orthocenter）H：三條高的交點，利用歐拉線關係 H = 3G − 2O 計算",
    descriptionEn: "Orthocenter H: intersection of altitudes, computed via Euler line relation H = 3G − 2O",
    latex: `H = 3G - 2O = 3\\cdot${tc_fmtV(centroid)} - 2\\cdot${tc_fmtV(circumcenter)} = ${tc_fmtV(orthocenter)}`,
  });

  steps.push({
    descriptionZh: "歐拉線定理：垂心 H、重心 G、外心 O 三點共線，且 HG:GO = 2:1",
    descriptionEn: "Euler line theorem: H, G, O are collinear with ratio HG:GO = 2:1",
    latex: `H,\\, G,\\, O \\text{ are collinear on the Euler line},\\quad HG:GO = 2:1`,
  });

  return { centroid, incenter, circumcenter, orthocenter, sideA, sideB, sideC, steps };
}
