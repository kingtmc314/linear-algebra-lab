import { add, sub, mul, div, rat, neg, isZero, ratToLatex, type Rational as Rat } from "./rational";
import type { DerivationStep } from "./derivationPlayback";

type Op = "add" | "sub" | "dot" | "cross" | "mag" | "angle" | "normalize" | "projection";
export interface ExactVectorDerivation { latex: string; steps: DerivationStep[] }
function decimal(value: number): Rat {
  if (!Number.isFinite(value)) throw new Error("Non-finite vector coordinate");
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(value));
  if (!m) throw new Error("Invalid vector coordinate");
  const exponent = Number(m[4] ?? 0) - (m[3]?.length ?? 0);
  const n = BigInt(`${m[1]}${m[2]}${m[3] ?? ""}`);
  return exponent >= 0 ? rat(n * 10n ** BigInt(exponent)) : rat(n, 10n ** BigInt(-exponent));
}
const dot = (a: Rat[], b: Rat[]) => a.reduce((sum, value, i) => add(sum, mul(value, b[i])), rat(0));
const vector = (cells: string[]) => `\\begin{pmatrix}${cells.join("\\\\")}\\end{pmatrix}`;
const vec = (values: Rat[]) => vector(values.map(ratToLatex));
const eq = (a: Rat, b: Rat) => isZero(sub(a, b));
function integerSqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let r = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  let next = (r + n / r) / 2n;
  while (next < r) { r = next; next = (r + n / r) / 2n; }
  return r;
}
function rootParts(square: Rat): { coefficient: Rat; inside: Rat } {
  if (square.n < 0n) throw new Error("Negative norm square");
  const nr = integerSqrt(square.n), dr = integerSqrt(square.d);
  if (nr * nr === square.n && dr * dr === square.d) return { coefficient: rat(nr, dr), inside: rat(1) };
  let inside = square.n * square.d, outside = 1n;
  if (inside > 1_000_000_000_000n) return { coefficient: rat(1), inside: square };
  for (let k = 2n; k <= 2048n && k * k <= inside; k++) {
    while (inside % (k * k) === 0n) { inside /= k * k; outside *= k; }
  }
  const remaining = integerSqrt(inside);
  if (remaining * remaining === inside) { outside *= remaining; inside = 1n; }
  return { coefficient: rat(outside, square.d), inside: rat(inside) };
}
function radical(coefficient: Rat, inside: Rat): string {
  if (isZero(coefficient)) return "0";
  if (eq(inside, rat(1))) return ratToLatex(coefficient);
  const sign = coefficient.n < 0n ? "-" : "";
  const n = coefficient.n < 0n ? -coefficient.n : coefficient.n;
  const numerator = `${n === 1n ? "" : n}\\sqrt{${ratToLatex(inside)}}`;
  return coefficient.d === 1n ? `${sign}${numerator}` : `${sign}\\frac{${numerator}}{${coefficient.d}}`;
}
function root(square: Rat): string { const r = rootParts(square); return radical(r.coefficient, r.inside); }
function overRoot(numerator: Rat, square: Rat): string {
  if (isZero(square)) throw new Error("Zero vector");
  const r = rootParts(square);
  return radical(mul(div(numerator, square), r.coefficient), r.inside);
}
function exactAcos(numerator: Rat, denominatorSquare: Rat): string {
  const q = div(mul(numerator, numerator), denominatorSquare);
  const negative = numerator.n < 0n;
  if (isZero(numerator)) return "\\frac{\\pi}{2}";
  if (eq(q, rat(1))) return negative ? "\\pi" : "0";
  if (eq(q, rat(1, 4))) return negative ? "\\frac{2\\pi}{3}" : "\\frac{\\pi}{3}";
  if (eq(q, rat(1, 2))) return negative ? "\\frac{3\\pi}{4}" : "\\frac{\\pi}{4}";
  if (eq(q, rat(3, 4))) return negative ? "\\frac{5\\pi}{6}" : "\\frac{\\pi}{6}";
  return `\\arccos\\left(${overRoot(numerator, denominatorSquare)}\\right)`;
}

/** Text calculations are exact rational arithmetic on the entered decimal numbers; plot coordinates stay numerical. */
export function exactVectorDerivation(op: Op, inputA: number[], inputB: number[]): ExactVectorDerivation {
  if (inputA.length < 2 || inputA.length > 3 || inputB.length !== inputA.length) throw new Error("Invalid vector dimensions");
  const a = inputA.map(decimal), b = inputB.map(decimal);
  const aa = dot(a, a), bb = dot(b, b), ab = dot(a, b);
  const aLatex = vec(a), bLatex = vec(b);
  const steps: DerivationStep[] = [];
  const push = (descriptionZh: string, descriptionEn: string, latex: string) => steps.push({ descriptionZh, descriptionEn, latex });
  const binary = !["mag", "normalize"].includes(op);
  push("辨識已知向量：分量依序對應 x、y、z 坐標軸。", "Identify the vectors: components correspond to the x, y and z axes in order.", `\\mathbf a=${aLatex}${binary ? `,\\quad\\mathbf b=${bLatex}` : ""}`);
  let latex: string;
  if (op === "add" || op === "sub") {
    const symbol = op === "add" ? "+" : "-";
    push("分量規則：只有相同坐標軸的分量互相運算。", "Component rule: combine components on the same coordinate axis.", `(\\mathbf a${symbol}\\mathbf b)_i=a_i${symbol}b_i`);
    const values = a.map((value, i) => op === "add" ? add(value, b[i]) : sub(value, b[i]));
    values.forEach((value, i) => push(`計算第 ${i + 1} 個分量。`, `Calculate component ${i + 1}.`, `r_${i + 1}=${ratToLatex(a[i])}${symbol}\\left(${ratToLatex(b[i])}\\right)=${ratToLatex(value)}`));
    latex = `\\mathbf r=\\mathbf a${symbol}\\mathbf b=${vec(values)}`;
  } else if (op === "dot") {
    push("內積是各分量乘積的總和，結果為純量。", "The dot product sums component products and returns a scalar.", "\\mathbf a\\cdot\\mathbf b=\\sum_i a_i b_i");
    a.forEach((value, i) => push(`第 ${i + 1} 個乘积。`, `Product ${i + 1}.`, `a_${i + 1}b_${i + 1}=\\left(${ratToLatex(value)}\\right)\\left(${ratToLatex(b[i])}\\right)=${ratToLatex(mul(value, b[i]))}`));
    latex = `\\mathbf a\\cdot\\mathbf b=${a.map((value, i) => `\\left(${ratToLatex(mul(value, b[i]))}\\right)`).join("+")}=${ratToLatex(ab)}`;
  } else if (op === "cross") {
    if (a.length !== 3) throw new Error("Cross product requires 3D");
    push("沿 i、j、k 展開行列式，注意 j 的負號。", "Expand along i, j and k; note the negative sign on j.", `\\mathbf a\\times\\mathbf b=\\begin{vmatrix}\\mathbf i&\\mathbf j&\\mathbf k\\\\${a.map(ratToLatex).join("&")}\\\\${b.map(ratToLatex).join("&")}\\end{vmatrix}`);
    const indices = [[1, 2], [2, 0], [0, 1]];
    const values = indices.map(([j, k]) => sub(mul(a[j], b[k]), mul(a[k], b[j])));
    values.forEach((value, i) => { const [j, k] = indices[i]; push(`計算第 ${i + 1} 個叉積分量。`, `Calculate cross-product component ${i + 1}.`, `r_${i + 1}=\\left(${ratToLatex(a[j])}\\right)\\left(${ratToLatex(b[k])}\\right)-\\left(${ratToLatex(a[k])}\\right)\\left(${ratToLatex(b[j])}\\right)=${ratToLatex(value)}`); });
    latex = `\\mathbf r=\\mathbf a\\times\\mathbf b=${vec(values)}`;
    push("驗證垂直：與兩個原向量的內積均為零。", "Verify perpendicularity: both dot products are zero.", `\\mathbf a\\cdot\\mathbf r=${ratToLatex(dot(a, values))},\\quad\\mathbf b\\cdot\\mathbf r=${ratToLatex(dot(b, values))}`);
  } else if (op === "projection") {
    if (isZero(bb)) throw new Error("Cannot project onto zero vector");
    push("投影是 a 在 b 方向上的向量分量。", "Projection is the vector component of a along b.", "\\operatorname{proj}_{\\mathbf b}\\mathbf a=\\frac{\\mathbf a\\cdot\\mathbf b}{\\mathbf b\\cdot\\mathbf b}\\mathbf b");
    const scale = div(ab, bb), projection = b.map(v => mul(scale, v)), perpendicular = a.map((v, i) => sub(v, projection[i]));
    push("計算內積與投影方向的長度平方。", "Calculate the dot product and squared length of the projection direction.", `\\mathbf a\\cdot\\mathbf b=${ratToLatex(ab)},\\quad|\\mathbf b|^2=${ratToLatex(bb)}`);
    push("比例係數表示要取多少個 b。", "The scale factor specifies how many copies of b to take.", `k=\\frac{${ratToLatex(ab)}}{${ratToLatex(bb)}}=${ratToLatex(scale)}`);
    latex = `\\operatorname{proj}_{\\mathbf b}\\mathbf a=${vec(projection)}`;
    push("扣除投影得到垂直分量，與 b 的內積為零。", "Subtract the projection to obtain the perpendicular component; its dot product with b is zero.", `\\mathbf a_\\perp=${vec(perpendicular)},\\quad\\mathbf a_\\perp\\cdot\\mathbf b=${ratToLatex(dot(perpendicular, b))}`);
  } else {
    if (op !== "mag" && isZero(aa)) throw new Error("Zero vector has no direction");
    push("模的平方是各分量平方之和。", "The squared magnitude is the sum of squared components.", "|\\mathbf a|^2=\\sum_i a_i^2");
    push("代入分量，再取平方根；不使用近似小數。", "Substitute the components, then take the square root without decimal approximation.", `|\\mathbf a|^2=${a.map(v => `\\left(${ratToLatex(v)}\\right)^2`).join("+")}=${ratToLatex(aa)},\\quad|\\mathbf a|=${root(aa)}`);
    if (op === "mag") latex = `|\\mathbf a|=${root(aa)}`;
    else if (op === "normalize") {
      push("單位向量保留原方向，各分量除以向量長度。", "A unit vector keeps the direction and divides each component by the magnitude.", `\\widehat{\\mathbf a}=\\frac{\\mathbf a}{|\\mathbf a|}=\\frac{1}{${root(aa)}}${aLatex}`);
      latex = `\\widehat{\\mathbf a}=${vector(a.map(v => overRoot(v, aa)))},\\quad|\\widehat{\\mathbf a}|=1`;
    } else {
      if (isZero(bb)) throw new Error("Zero vector has no direction");
      push("θ 是 a 與 b 的有向量夾角，範圍為 0 到 π。", "θ is the angle between a and b, in the range 0 to π.", "\\cos\\theta=\\frac{\\mathbf a\\cdot\\mathbf b}{|\\mathbf a||\\mathbf b|},\\quad0\\leq\\theta\\leq\\pi");
      push("計算 b 的長度和兩向量的內積。", "Calculate the magnitude of b and the dot product.", `|\\mathbf b|^2=${ratToLatex(bb)},\\quad|\\mathbf b|=${root(bb)},\\quad\\mathbf a\\cdot\\mathbf b=${ratToLatex(ab)}`);
      push("代入精確比值；負內積表示鈍角，不取絕對值。", "Substitute the exact ratio; a negative dot product means an obtuse angle, so do not take its absolute value.", `\\cos\\theta=\\frac{${ratToLatex(ab)}}{\\left(${root(aa)}\\right)\\left(${root(bb)}\\right)}=${overRoot(ab, mul(aa, bb))}`);
      latex = `\\theta=${exactAcos(ab, mul(aa, bb))}`;
    }
  }
  push("整理所求結果。", "State the required result.", latex);
  return { latex, steps };
}
