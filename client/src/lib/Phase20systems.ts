import type { Lang } from "@/contexts/LanguageContext";
import type { GeneralSolutionTerm, SystemResult } from "./linearSystem";
import { matDeterminant, type MatrixResult, type StepResult } from "./matrixMath";
import {
  type Rational, type RatMatrix, rat, fromFloat, add, sub, mul, div, neg,
  isZero, ratToLatex, ratToStr, ratMatLatex, ratAugLatex,
} from "./rational";

/** Presentation-only adapters: the existing solvers remain the source of results. */
export interface Phase20systemsStep {
  description: string;
  latex?: string;
  matrix?: number[][];
  phase: string;
  snapshotLatex?: string;
}

const words = (lang: Lang, zh: string, en: string) => lang === "zh" ? zh : en;
export const Phase20systemsParameterNames = (count: number) =>
  count === 1 ? ["k"] : Array.from({ length: count }, (_, i) => `k_{${i + 1}}`);

/** Decimal input display never uses tolerance-based fraction guessing. */
export function Phase20systemsDecimal(value: number): Rational {
  if (!Number.isFinite(value)) throw new Error("Non-finite system input");
  const [mantissa, exponent = "0"] = value.toString().toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const digits = BigInt(whole + fraction);
  const scale = fraction.length - Number(exponent);
  return scale >= 0 ? rat(digits, 10n ** BigInt(scale)) : rat(digits * 10n ** BigInt(-scale));
}

export function Phase20systemsInputIsApproximate(A: number[][], b: number[]): boolean {
  return [...A.flat(), ...b].some(value => {
    const entered = Phase20systemsDecimal(value);
    const modeled = fromFloat(value);
    return entered.n * modeled.d !== modeled.n * entered.d;
  });
}

/** Read only integer/fraction cells emitted by the existing exact solvers. */
export function Phase20systemsReadFraction(latex: string): Rational {
  const text = latex.trim();
  if (/^-?\d+$/.test(text)) return rat(BigInt(text));
  const fraction = text.match(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/);
  if (!fraction) throw new Error("Expected an exact rational LaTeX cell");
  return rat((fraction[1] ? -1n : 1n) * BigInt(fraction[2]), BigInt(fraction[3]));
}

export function Phase20systemsReadMatrix(latex: string): RatMatrix {
  const body = latex.match(/\\begin\{array\}\{[^}]+\}([\s\S]*?)\\end\{array\}/)?.[1]
    ?? latex.match(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/)?.[1];
  if (body === undefined) throw new Error("Expected an exact matrix snapshot");
  return body.trim().split(/\\\\/).map(row => row.split("&").map(Phase20systemsReadFraction));
}

export function Phase20systemsSnapshot(latex?: string): string | undefined {
  return latex?.match(/\\left\[\\begin\{array\}\{[^}]+\}[\s\S]*?\\end\{array\}\\right\]/)?.[0];
}

/** Use exact coefficient strings, not floating-point zero/unit tolerances. */
export function Phase20systemsGeneralLatex(terms: GeneralSolutionTerm[], count: number): string {
  const names = Phase20systemsParameterNames(count);
  return terms.map(term => {
    let rhs = term.constantLatex === "0" ? "" : term.constantLatex;
    term.kCoeffsLatex.forEach((coefficient, i) => {
      if (coefficient === "0") return;
      const negative = coefficient.startsWith("-");
      const magnitude = negative ? coefficient.slice(1) : coefficient;
      const value = `${magnitude === "1" ? "" : magnitude}${names[i]}`;
      rhs += rhs ? ` ${negative ? "-" : "+"} ${value}` : `${negative ? "-" : ""}${value}`;
    });
    return `x_{${term.varIndex + 1}} = ${rhs || "0"}`;
  }).join(",\\quad ");
}

function Phase20systemsPhase(step: StepResult, lang: Lang): string {
  const text = step.descriptionEn;
  if (/Contradiction|no solution|Inconsistent/i.test(text)) return words(lang, "一致性檢查", "Consistency check");
  if (/free variable|General solution|arbitrary|infinitely/i.test(text)) return words(lang, "自由變數與通解", "Free variables & general solution");
  if (/Read solution|Verification|Final result|Left side is now/i.test(text)) return words(lang, "讀取與驗證", "Read & verify");
  if (/Reduced|RREF|back substitution|normalize|Divide/i.test(text)) return words(lang, "主元標準化與回代", "Normalize & back substitute");
  if (/swap|eliminate|Pivot/i.test(text)) return words(lang, "等價列運算", "Equivalent row operations");
  if (/REF|Rank|Row Echelon/i.test(text)) return words(lang, "階梯形與秩", "Echelon form & rank");
  return words(lang, "建立模型", "Set up the model");
}

function sourceStep(step: StepResult, lang: Lang, previous?: string): Phase20systemsStep {
  return {
    description: lang === "zh" ? step.descriptionZh : step.descriptionEn,
    latex: step.latex,
    matrix: step.matrix,
    phase: Phase20systemsPhase(step, lang),
    snapshotLatex: Phase20systemsSnapshot(step.latex) ?? previous,
  };
}

function contextSteps(A: number[][], b: number[], lang: Lang): Phase20systemsStep[] {
  const n = A[0].length;
  const modelA = A.map(row => row.map(value => fromFloat(value)));
  const modelB = b.map(value => [fromFloat(value)]);
  const snapshotLatex = ratAugLatex(modelA.map((row, i) => [...row, modelB[i][0]]), n);
  return [{
    description: words(lang,
      `共有 ${A.length} 條方程與 ${n} 個實數未知數。x 的第 j 個分量為 xⱼ；A 的第 i 橫列對應第 i 條方程，bᵢ 是其右側常數。`,
      `${A.length} equations, ${n} real unknowns. Component j of x is xⱼ; row i of A represents equation i, and bᵢ is its right-hand constant.`),
    latex: `A=${ratMatLatex(modelA)},\\quad \\mathbf{x}=\\begin{bmatrix}${Array.from({ length: n }, (_, i) => `x_{${i + 1}}`).join(" \\\\ ")}\\end{bmatrix},\\quad \\mathbf{b}=${ratMatLatex(modelB)}`,
    phase: words(lang, "變數與維度", "Variables & dimensions"), snapshotLatex,
  }, {
    description: words(lang,
      "每條方程是係數與未知數的內積。列運算必須同時作用於係數和右側常數，才會保持相同的解集合。",
      "Each equation is a coefficient–unknown dot product. Apply each row operation to both coefficients and constants to preserve the solution set."),
    latex: `A\\mathbf{x}=\\mathbf{b},\\qquad \\sum_{j=1}^{${n}}a_{ij}x_j=b_i\\quad(i=1,\\ldots,${A.length})`,
    phase: words(lang, "等價方程組", "Equivalent systems"), snapshotLatex,
  }];
}

/** Fill the infinite-solution solver's single REF→RREF jump with every row operation. */
function expandRref(refLatex: string, n: number, lang: Lang): Phase20systemsStep[] {
  const aug = Phase20systemsReadMatrix(refLatex);
  const pivots = aug.map(row => row.slice(0, n).findIndex(cell => !isZero(cell)));
  const operations: Phase20systemsStep[] = [];
  const record = (description: string, operation: string) => {
    const snapshotLatex = ratAugLatex(aug, n);
    operations.push({ description, latex: `${operation} \\Rightarrow ${snapshotLatex}`, snapshotLatex,
      phase: words(lang, "主元標準化與回代", "Normalize & back substitute") });
  };
  for (let row = aug.length - 1; row >= 0; row--) {
    const col = pivots[row];
    if (col < 0) continue;
    const pivot = aug[row][col];
    if (pivot.n === pivot.d) continue;
    aug[row] = aug[row].map(cell => div(cell, pivot));
    record(words(lang,
      `第 ${row + 1} 橫列除以 ${ratToStr(pivot)}，令 x${col + 1} 的主元為 1；包括右側常數。`,
      `Divide row ${row + 1} by ${ratToStr(pivot)} to make the x${col + 1} pivot 1, including the constant.`),
    `R_{${row + 1}} \\leftarrow (${ratToLatex(div(rat(1n), pivot))})R_{${row + 1}}`);
  }
  for (let row = aug.length - 1; row >= 0; row--) {
    const col = pivots[row];
    if (col < 0) continue;
    for (let above = 0; above < row; above++) {
      const factor = aug[above][col];
      if (isZero(factor)) continue;
      aug[above] = aug[above].map((cell, j) => sub(cell, mul(factor, aug[row][j])));
      const sign = factor.n < 0n ? "+" : "-";
      record(words(lang,
        `消去第 ${above + 1} 橫列的 x${col + 1} 係數，為讀取主元變數作準備。`,
        `Clear the x${col + 1} coefficient in row ${above + 1} before reading the pivot variable.`),
      `R_{${above + 1}} \\leftarrow R_{${above + 1}} ${sign} ${ratToLatex(factor.n < 0n ? neg(factor) : factor)}R_{${row + 1}}`);
    }
  }
  return operations;
}

function verificationSteps(A: number[][], b: number[], solution: string[], lang: Lang): Phase20systemsStep[] {
  const x = solution.map(Phase20systemsReadFraction);
  return A.map((row, i) => {
    const coefficients = row.map(value => fromFloat(value));
    const sum = coefficients.reduce((acc, cell, j) => add(acc, mul(cell, x[j])), rat(0n));
    const expected = fromFloat(b[i]);
    const matches = sum.n * expected.d === expected.n * sum.d;
    return {
      description: words(lang,
        `代回第 ${i + 1} 條方程：以分數運算核對左側與 b${i + 1}${matches ? " 相等。" : " 不相等，請勿視為已驗證的解。"}`,
        `Substitute into equation ${i + 1}: rational arithmetic ${matches ? "confirms the left side equals" : "does not match"} b${i + 1}.`),
      latex: `${coefficients.map((cell, j) => `(${ratToLatex(cell)})(${solution[j]})`).join("+")}=${ratToLatex(sum)}${matches ? "=" : "\\ne"}b_{${i + 1}}${matches ? "=" : "\\text{ (expected) }"}${ratToLatex(expected)}`,
      phase: words(lang, "代回驗證", "Verify by substitution"),
    };
  });
}

export function Phase20systemsGaussianSteps(result: SystemResult, A: number[][], b: number[], lang: Lang): Phase20systemsStep[] {
  const steps = contextSteps(A, b, lang);
  let snapshot = steps[0].snapshotLatex;
  const ref = result.steps.find(step => step.descriptionEn.startsWith("Row Echelon Form complete"));
  result.steps.forEach((step, index) => {
    if (result.type === "infinite" && step.descriptionEn.startsWith("Reduced Row Echelon Form") && ref) {
      steps.push(...expandRref(ref.latex, A[0].length, lang));
    }
    if (result.type === "unique" && step.descriptionEn.startsWith("Read solution") && result.solutionLatex) {
      result.solutionLatex.forEach((value, i) => steps.push({
        description: words(lang,
          `x${i + 1} 是第 ${i + 1} 個未知數。其主元橫列現為 x${i + 1} = 常數；此值從 RREF 的右側直接讀取。`,
          `x${i + 1} is unknown ${i + 1}. Its pivot row now reads x${i + 1} = constant, read directly from the RREF right-hand column.`),
        latex: `x_{${i + 1}}=${value}`, phase: words(lang, "逐一讀取未知數", "Read each unknown"), snapshotLatex: snapshot,
      }));
    }
    if (result.type === "infinite" && step.descriptionEn.startsWith("Let free variables")) {
      const names = Phase20systemsParameterNames(result.freeVariables?.length ?? 1);
      result.freeVariables?.forEach((variable, i) => steps.push({
        description: words(lang,
          `x${variable + 1} 的直欄沒有主元，令其為任意實數參數 ${names[i]}；每個參數均可獨立選取。`,
          `Column x${variable + 1} has no pivot. Assign the independent real parameter ${names[i]} to this unknown.`),
        latex: `x_{${variable + 1}}=${names[i]}\\in\\mathbb{R}`,
        phase: words(lang, "逐一指定自由變數", "Assign each free variable"), snapshotLatex: snapshot,
      }));
    }
    const adapted = sourceStep(step, lang, snapshot);
    // The library's numeric general-solution formatter uses tolerances; use its exact fields instead.
    if (result.type === "infinite" && index === result.steps.length - 1 && result.generalSolution) {
      const count = result.freeVariables?.length ?? 1;
      const rref = Phase20systemsReadMatrix(snapshot!);
      result.generalSolution.forEach(term => {
        if (result.freeVariables?.includes(term.varIndex)) return;
        const row = rref.find(candidate => candidate.slice(0, A[0].length).findIndex(cell => !isZero(cell)) === term.varIndex);
        if (!row) return;
        const equation = row.slice(0, A[0].length).flatMap((cell, j) =>
          isZero(cell) ? [] : [`(${ratToLatex(cell)})x_{${j + 1}}`]).join("+");
        steps.push({
          description: words(lang,
            `讀取 x${term.varIndex + 1} 的主元橫列，將自由變數移到右側並代入參數，得到此未知數的分數通式。`,
            `Read the pivot row for x${term.varIndex + 1}, move the free variables to the right, and substitute their parameters.`),
          latex: `${equation}=${ratToLatex(row[A[0].length])}\\quad\\Rightarrow\\quad ${Phase20systemsGeneralLatex([term], count)}`,
          phase: words(lang, "逐一讀取主元變數", "Read each pivot variable"), snapshotLatex: snapshot,
        });
      });
      adapted.latex = Phase20systemsGeneralLatex(result.generalSolution, result.freeVariables?.length ?? 1);
    }
    snapshot = adapted.snapshotLatex;
    steps.push(adapted);
  });
  if (result.type === "unique" && result.solutionLatex) {
    steps.push(...verificationSteps(A, b, result.solutionLatex, lang).map(step => ({ ...step, snapshotLatex: snapshot })));
  }
  return steps;
}

/** All inverse row operations + each entry of A⁻¹b; never reconstruct exact fractions from numeric inverse values. */
export function Phase20systemsInverseSteps(inverse: MatrixResult | null, A: number[][], b: number[], lang: Lang): Phase20systemsStep[] {
  const steps: Phase20systemsStep[] = contextSteps(A, b, lang).map(step => ({ ...step, snapshotLatex: undefined }));
  const n = A[0].length;
  const phase = words(lang, "逆矩陣法的條件", "When the inverse method applies");
  if (A.length !== n || !inverse) {
    steps.push({ description: words(lang,
      "逆矩陣法只適用於可逆方陣。此係數矩陣不是方陣，請使用左側的高斯消元法判斷一致性與解集合。",
      "The inverse method requires an invertible square coefficient matrix. A is rectangular; use Gaussian elimination to determine consistency and the solution set."),
    latex: `A\\in\\mathbb{R}^{${A.length}\\times${n}},\\quad ${A.length}\\ne ${n}`, phase });
    return steps;
  }
  const determinant = matDeterminant(A);
  const model = A.map(row => row.map(value => fromFloat(value)));
  // Replace only determinant display matrices with exact modeled entries; keep the solver's exact arithmetic terms.
  determinant.steps.forEach((step, index) => {
    let latex = step.latex;
    if (index === 0) latex = `A=${ratMatLatex(model)}`;
    if (n > 2 && step.descriptionEn.startsWith("j=")) {
      const j = Number(step.descriptionEn.match(/^j=(\d+)/)?.[1]) - 1;
      const minor = model.slice(1).map(row => row.filter((_, col) => col !== j));
      latex = latex.replace(/\\det\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}/, `\\det${ratMatLatex(minor)}`);
    }
    steps.push({ description: lang === "zh" ? step.descriptionZh : step.descriptionEn,
      latex, phase: words(lang, "行列式與可逆性", "Determinant & invertibility") });
  });
  if (!determinant.scalarLatex) throw new Error("Missing determinant fraction");
  const det = Phase20systemsReadFraction(determinant.scalarLatex);
  if (isZero(det)) {
    steps.push({ description: words(lang,
      "有理數模型的行列式確實為零，所以 A⁻¹ 不存在；無解或無限多解必須由高斯消元的一致性檢查區分。",
      "The rational model has determinant exactly zero, so A⁻¹ does not exist. Gaussian consistency checks distinguish no solution from infinitely many solutions."),
    latex: "\\det(A)=0\\Rightarrow A^{-1}\\text{ does not exist}", phase });
    return steps;
  }
  steps.push({ description: words(lang,
    "行列式非零，因此在此有理數模型中 A 可逆。左乘 A⁻¹ 不改變未知向量的順序。",
    "The nonzero determinant makes A invertible in this rational model. Left multiplication by A⁻¹ preserves the order of the unknowns."),
  latex: `\\det(A)=${determinant.scalarLatex}\\ne0,\\qquad A^{-1}A\\mathbf{x}=A^{-1}\\mathbf{b}\\Rightarrow\\mathbf{x}=A^{-1}\\mathbf{b}`, phase });
  if (inverse.error || !inverse.result) {
    steps.push({ description: words(lang,
      "既有求逆程式因數值容差而停止，但上面的有理數行列式非零，不能據此宣稱奇異。高斯消元的結果仍可使用。",
      "The existing inverse routine stopped at a numerical tolerance despite the nonzero rational determinant above. This is not proof of singularity; the Gaussian result remains available."),
    latex: "\\mathbf{x}=A^{-1}\\mathbf{b}\\quad\\text{(inverse routine unavailable)}", phase });
    return steps;
  }
  const start = inverse.steps.findIndex(step => step.latex.startsWith("[A \\mid I]"));
  if (start < 0) throw new Error("Missing inverse row-operation sequence");
  let snapshot: string | undefined;
  inverse.steps.slice(start).forEach(step => {
    const adapted = sourceStep(step, lang, snapshot);
    snapshot = adapted.snapshotLatex;
    steps.push(adapted);
  });
  const exactResult = inverse.steps.find(step => step.matrix && step.latex.startsWith("A^{-1} = "));
  if (!exactResult) throw new Error("Missing exact inverse matrix");
  const inv = Phase20systemsReadMatrix(exactResult.latex);
  const bRat = b.map(value => fromFloat(value));
  steps.push({ description: words(lang,
    "令 cᵢⱼ 為 A⁻¹ 的第 i 橫列、第 j 直欄元素。xᵢ 是該橫列與常數向量 b 的內積；不是逐元素相乘。",
    "Let cᵢⱼ be entry (i,j) of A⁻¹. Unknown xᵢ is the dot product of inverse row i with the constant vector b, not an element-wise product."),
  latex: `\\mathbf{x}=A^{-1}\\mathbf{b},\\qquad x_i=\\sum_{j=1}^{${n}}c_{ij}b_j`,
  phase: words(lang, "逆矩陣乘常數向量", "Multiply the inverse by b"), snapshotLatex: snapshot });
  const solution = inv.map((row, i) => {
    const value = row.reduce((acc, cell, j) => add(acc, mul(cell, bRat[j])), rat(0n));
    const latex = ratToLatex(value);
    steps.push({ description: words(lang,
      `計算第 ${i + 1} 個未知數 x${i + 1}：A⁻¹ 的第 ${i + 1} 橫列與 b 的每個對應分量相乘，再相加並約分。`,
      `Compute unknown x${i + 1}: multiply inverse row ${i + 1} by the matching entries of b, then add and reduce the fraction.`),
    latex: `x_{${i + 1}}=${row.map((cell, j) => `(${ratToLatex(cell)})(${ratToLatex(bRat[j])})`).join("+")}=${latex}`,
    phase: words(lang, "逐一計算未知數", "Compute each unknown"), snapshotLatex: snapshot });
    return latex;
  });
  steps.push({ description: words(lang, "依 x₁、x₂、… 的原始順序組成解向量。", "Assemble the solution in the original x₁, x₂, … order."),
    latex: `\\mathbf{x}=${ratMatLatex(solution.map(value => [Phase20systemsReadFraction(value)]))}`,
    phase: words(lang, "解向量", "Solution vector"), snapshotLatex: snapshot });
  steps.push(...verificationSteps(A, b, solution, lang).map(step => ({ ...step, snapshotLatex: snapshot })));
  return steps;
}
