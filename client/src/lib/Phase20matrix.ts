import type { Matrix, StepResult } from "./matrixMath";
import type { ExprStep } from "./matrixExprParser";
import { fromFloat, rat, ratMatLatex } from "./rational";

export interface Phase20matrixStep {
  descriptionZh: string;
  descriptionEn: string;
  latex?: string;
  matrix?: Matrix;
  value?: number;
  contextZh: string;
  contextEn: string;
}

export interface Phase20matrixInput {
  label: string;
  rows: number;
  cols: number;
  latex: string;
  modelLatex?: string;
}

/** Parse the actual written rational, not a nearby fraction found by tolerance. */
function literalRational(text: string): { n: bigint; d: bigint } | null {
  const value = text.trim() || "0";
  if (/^[+-]?\d+\/[+-]?\d+$/.test(value)) {
    const [n, d] = value.split("/").map(BigInt);
    return d === 0n ? null : { n, d };
  }
  const match = value.match(/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!match || !(match[2] || match[3])) return null;
  const exponent = Number(match[4] ?? 0) - (match[3]?.length ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 400) return null;
  const n = BigInt((match[2] || "0") + (match[3] || "")) * (match[1] === "-" ? -1n : 1n);
  return exponent >= 0
    ? { n: n * 10n ** BigInt(exponent), d: 1n }
    : { n, d: 10n ** BigInt(-exponent) };
}

export function Phase20matrixParseCell(text: string): number | null {
  const literal = literalRational(text);
  if (!literal) return null;
  const value = text.includes("/")
    ? Number(literal.n) / Number(literal.d)
    : Number(text.trim() || "0");
  return Number.isFinite(value) ? value : null;
}

/** Exact cross multiplication; never certify exactness from a tolerance guess. */
export function Phase20matrixInputIsExact(text: string, value: number): boolean {
  const literal = literalRational(text);
  if (!literal || !Number.isFinite(value)) return false;
  const reconstructed = fromFloat(value);
  return literal.n * reconstructed.d === reconstructed.n * literal.d;
}

/** The existing parser reads scalar tokens through Number before converting to bigint. */
export function Phase20matrixExpressionLiteralsAreExact(expression: string): boolean {
  return (expression.match(/\d+(?:\/\d+)?/g) ?? []).every(token =>
    token.split("/").every(part => Number.isSafeInteger(Number(part)))
  );
}

export function Phase20matrixInput(label: string, data: Matrix, grid?: string[][], rationalized = false): Phase20matrixInput {
  const written = data.map((row, r) => row.map((value, c) => {
    const literal = literalRational(grid?.[r]?.[c] ?? String(value));
    return literal ? rat(literal.n, literal.d) : fromFloat(value);
  }));
  const latex = `${label} = ${ratMatLatex(written)}`;
  const modelLatex = `${label} = ${ratMatLatex(data.map(row => row.map(value => fromFloat(value))))}`;
  return {
    label,
    rows: data.length,
    cols: data[0]?.length ?? 0,
    latex,
    modelLatex: rationalized && modelLatex !== latex ? modelLatex : undefined,
  };
}

export function Phase20matrixAdaptSteps(
  steps: StepResult[], contextZh: string, contextEn: string,
): Phase20matrixStep[] {
  return steps.map(step => ({ ...step, contextZh, contextEn }));
}

/** Carry a completed snapshot forward across rule/verification frames without recalculating. */
export function Phase20matrixActiveResultLatex(steps: Phase20matrixStep[], index: number): string | undefined {
  for (let i = Math.min(index, steps.length - 1); i >= 0; i--) {
    const step = steps[i];
    if (!step.latex) continue;
    if (step.matrix || step.value !== undefined || step.descriptionEn.startsWith("Substep ")) {
      const separator = step.latex.lastIndexOf(" = ");
      return separator >= 0 ? step.latex.slice(separator + 3) : step.latex;
    }
  }
  return undefined;
}

const RULES: Record<string, { zh: string; en: string; latex: string }> = {
  add: { zh: "i 是行索引，j 是列索引；相同維度的矩陣逐項相加。", en: "i indexes rows and j indexes columns; add corresponding entries of equally sized matrices.", latex: "(M+N)_{ij}=m_{ij}+n_{ij}" },
  sub: { zh: "i 是行索引，j 是列索引；順序固定，逐項減去右側元素。", en: "i indexes rows and j indexes columns; subtract the right-hand entry without reversing operand order.", latex: "(M-N)_{ij}=m_{ij}-n_{ij}" },
  mul: { zh: "內部維度 p 必須相同；第 i 行與第 j 列做點積。M、N 是此步的左右運算元。", en: "Inner dimension p must match; take row i dotted with column j. M and N denote this step's left and right operands.", latex: "(MN)_{ij}=\\sum_{k=1}^{p}m_{ik}n_{kj}" },
  scale: { zh: "k 是純量；每個元素都乘以 k，不是矩陣乘法的點積。", en: "k is a scalar; multiply every entry by k, rather than taking row-column dot products.", latex: "(kM)_{ij}=k\\,m_{ij}" },
  transpose: { zh: "行與列互換；i、j 交換，m×n 變成 n×m。", en: "Swap row and column indices i and j; an m×n matrix becomes n×m.", latex: "(M^T)_{ij}=m_{ji}" },
  inv: { zh: "M 必須是可逆方陣；I 是同大小單位矩陣。對增廣矩陣兩側施行相同行運算。", en: "M must be an invertible square matrix; I is the identity of the same size. Apply each row operation to both sides of the augmented matrix.", latex: "[M\\mid I]\\xrightarrow{\\text{row operations}}[I\\mid M^{-1}]" },
  det: { zh: "M 是方陣；M₁ⱼ 是刪去第 1 行、第 j 列後的子矩陣之行列式，符號交替。", en: "M is square; M₁ⱼ is the determinant of the submatrix obtained by deleting row 1 and column j. Signs alternate.", latex: "\\det(M)=\\sum_{j=1}^{n}(-1)^{1+j}m_{1j}M_{1j}" },
  trace: { zh: "跡是主對角線之和；結果是純量，可以繼續乘矩陣。", en: "Trace is the sum of diagonal entries; its scalar result can subsequently scale a matrix.", latex: "\\operatorname{tr}(M)=\\sum_{i=1}^{n}m_{ii}" },
  power: { zh: "整數冪是重複矩陣乘法，不是逐元素乘冪；負冪需要可逆。", en: "Integer powers use repeated matrix multiplication, not entry-wise powers; negative powers require invertibility.", latex: "M^0=I,\\quad M^q=\\underbrace{M\\cdots M}_{q\\text{ factors}},\\quad M^{-q}=(M^{-1})^q\\ (q>0)" },
  negate: { zh: "取負等於每個元素乘以 −1。", en: "Negation multiplies every entry by −1.", latex: "(-M)_{ij}=-m_{ij}" },
};

/** Add teaching frames; the parser's original simplified equations remain verbatim. */
export function Phase20matrixExpressionSteps(steps: ExprStep[], resultLatex: string): Phase20matrixStep[] {
  const contextZh = "A、B、… 是下方輸入快照；M、N 是目前子運算式的運算元，並非新輸入。依括號與優先順序求值，再把中間結果傳回外層。";
  const contextEn = "A, B, … refer to the input snapshots below. M and N are operands of the current subexpression, not new inputs. Evaluate parentheses and precedence first, then pass the intermediate result outward.";
  const output: Phase20matrixStep[] = [{
    descriptionZh: "解析順序與變數", descriptionEn: "Parsing order and variables",
    contextZh, contextEn,
  }];
  steps.forEach((step, index) => {
    const text = step.descriptionEn;
    const key = /Matrix addition/.test(text) ? "add"
      : /Matrix subtraction/.test(text) ? "sub"
      : /Matrix multiplication/.test(text) ? "mul"
      : /Scalar × matrix|Matrix × scalar/.test(text) ? "scale"
      : /Transpose/.test(text) ? "transpose"
      : /Matrix inverse/.test(text) ? "inv"
      : /determinant/.test(text) ? "det"
      : /trace/.test(text) ? "trace"
      : /Matrix power/.test(text) ? "power"
      : /Negate matrix/.test(text) ? "negate" : null;
    if (key) {
      const rule = RULES[key];
      output.push({ descriptionZh: rule.zh, descriptionEn: rule.en, latex: rule.latex, contextZh, contextEn });
    }
    output.push({
      ...step,
      descriptionZh: `子步驟 ${index + 1} — ${step.descriptionZh}`,
      descriptionEn: `Substep ${index + 1} — ${step.descriptionEn}`,
      contextZh, contextEn,
    });
  });
  output.push({
    descriptionZh: "完成整個運算式；此值是回傳的最終矩陣或純量。",
    descriptionEn: "Complete the expression; this is the returned matrix or scalar.",
    latex: resultLatex, contextZh, contextEn,
  });
  return output;
}

/** Preserve the exact rational inverse equation; do not re-approximate its number[][] result. */
export function Phase20matrixInverseLatex(steps: StepResult[]): string | undefined {
  const exact = steps.find(step => step.matrix && step.latex.startsWith("A^{-1} = "));
  return exact?.latex.slice("A^{-1} = ".length);
}

/** Prove safe integer arithmetic, including every dot-product accumulation. */
export function Phase20matrixSafeArithmetic(op: "add" | "sub" | "mul" | "scalar" | "transpose", A: Matrix, B?: Matrix, scalar = 1): boolean {
  if (!A.flat().every(Number.isSafeInteger) || (B && !B.flat().every(Number.isSafeInteger))) return false;
  if (op === "transpose") return true;
  if (op === "scalar") return Number.isSafeInteger(scalar) && A.flat().every(value => Number.isSafeInteger(value * scalar));
  if (!B) return false;
  if (op === "add" || op === "sub") {
    return A.every((row, i) => row.every((value, j) => Number.isSafeInteger(op === "add" ? value + B[i][j] : value - B[i][j])));
  }
  return A.every(row => B[0].every((_, j) => {
    let sum = 0;
    return row.every((value, k) => {
      const product = value * B[k][j];
      sum += product;
      return Number.isSafeInteger(product) && Number.isSafeInteger(sum);
    });
  }));
}
