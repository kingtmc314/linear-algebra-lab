// ============================================================
// Vector Math Library — 2D and 3D operations
// ============================================================

import { fmt } from "./matrixMath";

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type VecN = number[];

export interface VectorStep {
  description: string;
  latex: string;
  value?: number | number[];
}

export interface VectorResult {
  vector?: VecN;
  scalar?: number;
  steps: VectorStep[];
  error?: string;
}

export function vecAdd(a: VecN, b: VecN): VectorResult {
  const result = a.map((v, i) => v + b[i]);
  return {
    vector: result,
    steps: [
      {
        description: `(a + b)[i] = a[i] + b[i]`,
        latex: `\\mathbf{a} + \\mathbf{b} = ${vecToLatex(result)}`,
        value: result,
      },
    ],
  };
}

export function vecSub(a: VecN, b: VecN): VectorResult {
  const result = a.map((v, i) => v - b[i]);
  return {
    vector: result,
    steps: [
      {
        description: `(a − b)[i] = a[i] − b[i]`,
        latex: `\\mathbf{a} - \\mathbf{b} = ${vecToLatex(result)}`,
        value: result,
      },
    ],
  };
}

export function vecDot(a: VecN, b: VecN): VectorResult {
  const terms = a.map((v, i) => v * b[i]);
  const result = terms.reduce((s, v) => s + v, 0);
  const termStr = terms.map((t) => fmt(t)).join(" + ");
  return {
    scalar: result,
    steps: [
      {
        description: `a · b = Σ aᵢ × bᵢ`,
        latex: `\\mathbf{a} \\cdot \\mathbf{b} = ${a.map((v, i) => `(${fmt(v)})(${fmt(b[i])})`).join(" + ")} = ${termStr} = ${fmt(result)}`,
        value: result,
      },
    ],
  };
}

export function vecCross(a: Vec3, b: Vec3): VectorResult {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  const result = [x, y, z];
  return {
    vector: result,
    steps: [
      {
        description: `a × b = (a₂b₃−a₃b₂, a₃b₁−a₁b₃, a₁b₂−a₂b₁)`,
        latex: `\\mathbf{a} \\times \\mathbf{b} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ ${a.map(fmt).join(" & ")} \\\\ ${b.map(fmt).join(" & ")} \\end{vmatrix}`,
      },
      {
        description: `i component: ${fmt(a[1])}×${fmt(b[2])} − ${fmt(a[2])}×${fmt(b[1])} = ${fmt(x)}`,
        latex: `i: ${fmt(a[1])} \\cdot ${fmt(b[2])} - ${fmt(a[2])} \\cdot ${fmt(b[1])} = ${fmt(x)}`,
      },
      {
        description: `j component: ${fmt(a[2])}×${fmt(b[0])} − ${fmt(a[0])}×${fmt(b[2])} = ${fmt(y)}`,
        latex: `j: ${fmt(a[2])} \\cdot ${fmt(b[0])} - ${fmt(a[0])} \\cdot ${fmt(b[2])} = ${fmt(y)}`,
      },
      {
        description: `k component: ${fmt(a[0])}×${fmt(b[1])} − ${fmt(a[1])}×${fmt(b[0])} = ${fmt(z)}`,
        latex: `k: ${fmt(a[0])} \\cdot ${fmt(b[1])} - ${fmt(a[1])} \\cdot ${fmt(b[0])} = ${fmt(z)}`,
      },
      {
        description: `Result`,
        latex: `\\mathbf{a} \\times \\mathbf{b} = ${vecToLatex(result)}`,
        value: result,
      },
    ],
  };
}

export function vecMagnitude(a: VecN): VectorResult {
  const sumSq = a.reduce((s, v) => s + v * v, 0);
  const mag = Math.sqrt(sumSq);
  const termStr = a.map((v) => `(${fmt(v)})^2`).join(" + ");
  return {
    scalar: mag,
    steps: [
      {
        description: `|a| = √(Σ aᵢ²)`,
        latex: `|\\mathbf{a}| = \\sqrt{${termStr}} = \\sqrt{${fmt(sumSq)}} = ${fmt(mag)}`,
        value: mag,
      },
    ],
  };
}

export function vecAngle(a: VecN, b: VecN): VectorResult {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA < 1e-10 || magB < 1e-10) {
    return { steps: [], error: "zero_vector" };
  }
  const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magB)));
  const theta = Math.acos(cosTheta);
  const thetaDeg = (theta * 180) / Math.PI;
  return {
    scalar: thetaDeg,
    steps: [
      {
        description: `cos θ = (a · b) / (|a| × |b|)`,
        latex: `\\cos\\theta = \\frac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}||\\mathbf{b}|} = \\frac{${fmt(dot)}}{${fmt(magA)} \\times ${fmt(magB)}} = ${fmt(cosTheta)}`,
      },
      {
        description: `θ = arccos(${fmt(cosTheta)}) = ${fmt(thetaDeg)}°`,
        latex: `\\theta = \\arccos(${fmt(cosTheta)}) = ${fmt(thetaDeg)}^\\circ`,
        value: thetaDeg,
      },
    ],
  };
}

export function vecNormalize(a: VecN): VectorResult {
  const mag = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  if (mag < 1e-10) {
    return { steps: [], error: "zero_vector" };
  }
  const result = a.map((v) => v / mag);
  return {
    vector: result,
    steps: [
      {
        description: `â = a / |a|`,
        latex: `\\hat{\\mathbf{a}} = \\frac{\\mathbf{a}}{|\\mathbf{a}|} = \\frac{1}{${fmt(mag)}} ${vecToLatex(a)} = ${vecToLatex(result)}`,
        value: result,
      },
    ],
  };
}

export function vecToLatex(v: VecN): string {
  return `\\begin{pmatrix} ${v.map(fmt).join(" \\\\ ")} \\end{pmatrix}`;
}
