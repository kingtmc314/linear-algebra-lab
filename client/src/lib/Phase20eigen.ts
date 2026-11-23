import type { EigenResult } from "./eigenMath";
import { rat, add, sub, mul, div, ratToLatex, type Rational } from "./rational";

export type EigenTeachingPhase = "polynomial" | "values" | "vectors";
export interface EigenTeachingStep {
  description: string;
  latex?: string;
  matrix?: number[][];
  phase: EigenTeachingPhase;
}

type Language = "zh" | "en";

// Treat the finite decimal supplied by the input as written, never infer a
// fraction or an exact eigenvalue by matching a floating-point tolerance.
function decimalRational(value: number): Rational {
  const [mantissa, exponent = "0"] = value.toString().toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const power = Number(exponent) - fraction.length;
  const digits = BigInt(`${whole}${fraction}`);
  return power >= 0
    ? rat(digits * 10n ** BigInt(power))
    : rat(digits, 10n ** BigInt(-power));
}

function approx(value: number): string {
  if (!Number.isFinite(value)) return "\\text{not finite}";
  const [mantissa, exponent] = Number(value.toPrecision(6))
    .toString()
    .split("e");
  return exponent ? `${mantissa}\\times10^{${Number(exponent)}}` : mantissa;
}

function column(values: number[]): string {
  return `\\begin{pmatrix}${values.map(approx).join(" \\\\ ")}\\end{pmatrix}`;
}

// Teaching snapshots only: do not replace or alter computeEigen's output.
function rowOperationSnapshots(
  A: number[][],
  lambda: number,
  lang: Language
): EigenTeachingStep[] {
  const n = A.length;
  const M = A.map((row, i) =>
    row.map((cell, j) => cell - (i === j ? lambda : 0))
  );
  const snapshots: EigenTeachingStep[] = [];
  const pivotColumns: number[] = [];
  const zh = lang === "zh";
  const epsilon = 1e-9;
  const record = (
    descriptionZh: string,
    descriptionEn: string,
    operation: string
  ) => {
    const matrix = M.map(row => [...row, 0]);
    const latex = `\\left[\\begin{array}{${"c".repeat(n)}|c}${matrix.map(row => row.map(approx).join(" & ")).join(" \\\\ ")}\\end{array}\\right]`;
    snapshots.push({
      phase: "vectors",
      description: `${zh ? "計算特徵向量 · 數值列變換快照（約值）" : "Calculate eigenvectors · Approximate row-operation snapshot"} — ${zh ? descriptionZh : descriptionEn}`,
      latex: `${operation}\\quad\\Longrightarrow\\quad${latex}\\quad\\text{(approx.)}`,
      matrix,
    });
  };
  let pivotRow = 0;
  for (let col = 0; col < n && pivotRow < n; col++) {
    let best = pivotRow;
    for (let row = pivotRow + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[best][col])) best = row;
    }
    if (Math.abs(M[best][col]) < epsilon) {
      record(
        `第 ${col + 1} 個分量沒有主元，以 10⁻⁹ 數值門檻視為自由分量；這不是精確為零的判定。`,
        `Component ${col + 1} has no pivot at the numerical 10⁻⁹ threshold and is treated as free; this is not an exact-zero proof.`,
        `\\text{no pivot in column }${col + 1}`
      );
      continue;
    }
    if (best !== pivotRow) {
      [M[pivotRow], M[best]] = [M[best], M[pivotRow]];
      record(
        "交換行，把較大的主元移到目前行。",
        "Swap rows to move the larger pivot into the current row.",
        `R_{${pivotRow + 1}}\\leftrightarrow R_{${best + 1}}`
      );
    }
    const pivot = M[pivotRow][col];
    M[pivotRow] = M[pivotRow].map(cell => cell / pivot);
    record(
      `將第 ${pivotRow + 1} 行除以主元，使主元成為 1。`,
      `Divide row ${pivotRow + 1} by its pivot to make the pivot 1.`,
      `R_{${pivotRow + 1}}\\leftarrow\\frac{1}{${approx(pivot)}}R_{${pivotRow + 1}}`
    );
    for (let row = 0; row < n; row++) {
      if (row === pivotRow || M[row][col] === 0) continue;
      const factor = M[row][col];
      M[row] = M[row].map((cell, j) => cell - factor * M[pivotRow][j]);
      record(
        `以主元行消去第 ${row + 1} 行第 ${col + 1} 個係數。`,
        `Eliminate the coefficient in row ${row + 1}, column ${col + 1} using the pivot row.`,
        `R_{${row + 1}}\\leftarrow R_{${row + 1}}-(${approx(factor)})R_{${pivotRow + 1}}`
      );
    }
    pivotColumns.push(col);
    pivotRow++;
  }
  const free = Array.from({ length: n }, (_, j) => j).filter(
    j => !pivotColumns.includes(j)
  );
  if (free.length > 0) {
    const chosen = free[0];
    const assignments = Array.from({ length: n }, (_, j) => {
      const row = pivotColumns.indexOf(j);
      return `v_{${j + 1}}\\approx${row < 0 ? (j === chosen ? "1" : "0") : approx(-M[row][chosen])}`;
    });
    record(
      `選 v${chosen + 1} = 1，其餘自由分量為 0，再由每個主元行讀出其分量。此方向是数值列變換的示範；下方仍保留既有求解器的結果。`,
      `Set v${chosen + 1} = 1 and other free components to 0, then read each pivot component from its row. This direction illustrates the numerical row operations; the original solver's results remain below.`,
      assignments.join(",\\quad ")
    );
  } else {
    record(
      "目前四捨五入的 λ 在此門檻下產生滿秩矩陣，只有零解；不能由此宣稱找到非零特徵向量。這可能是根近似的敏感性，請查看下方殘差警告。",
      "At this threshold, the rounded λ gives full rank and only the zero solution; no nonzero eigenvector is established here. This may reflect sensitivity to root rounding; inspect the residual warning below.",
      `\\mathbf v=\\mathbf0\\quad\\text{(no nonzero null vector at this threshold)}`
    );
  }
  return snapshots;
}

function polynomial(coefficients: Rational[]): string {
  const degree = coefficients.length - 1;
  const terms = coefficients.flatMap((coefficient, index) => {
    if (coefficient.n === 0n) return [];
    const exponent = degree - index;
    const magnitude = ratToLatex(
      rat(coefficient.n < 0n ? -coefficient.n : coefficient.n, coefficient.d)
    );
    const variable =
      exponent === 0
        ? ""
        : exponent === 1
          ? "\\lambda"
          : `\\lambda^{${exponent}}`;
    return [
      {
        negative: coefficient.n < 0n,
        text: `${magnitude === "1" && variable ? "" : magnitude}${variable}`,
      },
    ];
  });
  return (
    terms
      .map(
        (term, index) =>
          `${term.negative ? "-" : index > 0 ? "+" : ""}${term.text}`
      )
      .join(" ") || "0"
  );
}

export function eigenvectorDiagnostics(
  A: number[][],
  lambda: number,
  v: number[]
) {
  const finite =
    Number.isFinite(lambda) &&
    v.length === A.length &&
    v.every(Number.isFinite);
  const norm = finite ? Math.hypot(...v) : NaN;
  const Av = finite
    ? A.map(row => row.reduce((sum, cell, j) => sum + cell * v[j], 0))
    : A.map(() => NaN);
  const residual = finite
    ? Math.hypot(...Av.map((cell, i) => cell - lambda * v[i]))
    : NaN;
  const scale = finite
    ? Math.max(1, Math.hypot(...A.flat()) * norm, Math.abs(lambda) * norm)
    : NaN;
  return {
    norm,
    Av,
    residual,
    valid:
      finite &&
      Number.isFinite(norm) &&
      Number.isFinite(residual) &&
      Number.isFinite(scale) &&
      norm > 0 &&
      residual <= 1e-6 * scale,
  };
}

/** A presentation adapter only: computeEigen remains the source of results.
 * Original derivation strings are copied verbatim; new numeric snapshots are
 * explicitly approximate and never used to manufacture symbolic roots.
 */
export function buildEigenTeachingSteps(
  A: number[][],
  result: EigenResult,
  lang: Language
): EigenTeachingStep[] {
  const zh = lang === "zh";
  const steps: EigenTeachingStep[] = [];
  const labels = zh
    ? {
        polynomial: "多項式展開",
        values: "求解特徵值",
        vectors: "計算特徵向量",
      }
    : {
        polynomial: "Polynomial expansion",
        values: "Solve eigenvalues",
        vectors: "Calculate eigenvectors",
      };
  const push = (
    phase: EigenTeachingPhase,
    descriptionZh: string,
    descriptionEn: string,
    latex?: string,
    matrix?: number[][]
  ) => {
    steps.push({
      phase,
      description: `${labels[phase]} · ${zh ? descriptionZh : descriptionEn}`,
      latex,
      matrix,
    });
  };
  const Q = A.map(row => row.map(decimalRational));
  const q = (i: number, j: number) => ratToLatex(Q[i][j]);
  const matrixLatex = `\\begin{pmatrix}${Q.map(row => row.map(ratToLatex).join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;
  let cubicCoefficients:
    | { alpha: Rational; beta: Rational; gamma: Rational }
    | undefined;
  push(
    "polynomial",
    `固定本次輸入 A（${A.length}×${A.length}）。I 是同大小的單位矩陣；λ 是待求的純量，v 是非零向量，vᵢ 是第 i 個分量。Av = λv 表示 A 只縮放此方向（λ < 0 時反向），而不是把它轉到另一條直線。`,
    `Fix this calculation's ${A.length}×${A.length} input A. I is the identity of the same size; λ is the unknown scalar, v is a nonzero vector, and vᵢ is its ith component. Av = λv means A scales this direction (reversing it if λ < 0), without moving it to a different line.`,
    `A=${matrixLatex},\\quad A\\mathbf v=\\lambda\\mathbf v,\\quad \\mathbf v\\ne\\mathbf0`,
    A
  );
  push(
    "polynomial",
    "把 λv 移到左側：(A − λI)v = 0。要有非零解，A − λI 必須不可逆，因此令 p(λ) = det(A − λI) = 0；v = 0 永遠是解，但不算特徵向量。",
    "Move λv to the left: (A − λI)v = 0. A nonzero solution requires A − λI to be singular, so set p(λ) = det(A − λI) = 0. The zero vector always solves the system, but is not an eigenvector.",
    `(A-\\lambda I)\\mathbf v=\\mathbf0\\quad\\Longrightarrow\\quad p(\\lambda)=\\det(A-\\lambda I)=0`
  );

  let phase: EigenTeachingPhase = "polynomial";
  let vectorIndex = -1;
  for (const step of result.steps) {
    if (
      step.titleEn.includes("Discriminant") ||
      step.titleEn.includes("Solve for Eigenvalue") ||
      step.titleEn.includes("Quadratic Formula") ||
      step.titleEn.includes("Solve the Cubic") ||
      step.titleEn === "Eigenvalue Results"
    )
      phase = "values";
    if (
      step.titleEn.includes("(λ =") ||
      step.titleEn.startsWith("Verification:")
    )
      phase = "vectors";
    const isFormation =
      step.titleEn.includes("Form (A") ||
      step.titleEn.includes("Form and Row-Reduce");
    if (isFormation) vectorIndex++;
    const numerical =
      phase === "vectors" ||
      step.titleEn === "Eigenvalue Results" ||
      step.titleEn.includes("Repeated Root");
    const caution = numerical
      ? zh
        ? " 數值快照：既有公式中的數字可能經過四捨五入或分數近似；等號不代表已證明精確值。"
        : " Numerical snapshot: numbers in the original formula may be rounded or fraction approximations; its equals signs do not establish exact values."
      : "";
    // Preserve every original LaTeX string, including simplified radicals.
    push(
      phase,
      `${step.titleZh}。${step.explanationZh}${zh ? caution : ""}`,
      `${step.titleEn}. ${step.explanationEn}${!zh ? caution : ""}`,
      step.latex
    );

    if (A.length === 2 && step.titleEn.includes("Expand the Determinant")) {
      push(
        "polynomial",
        "令 a = A₁₁、b = A₁₂、c = A₂₁、d = A₂₂。先分配相乘，再合併 λ 項；tr(A) 是對角線總和，det(A) = ad − bc。下式保留展開的每一項。",
        "Let a = A₁₁, b = A₁₂, c = A₂₁, d = A₂₂. Distribute the product before collecting powers of λ; tr(A) is the diagonal sum and det(A) = ad − bc. Each expanded term is shown below.",
        `p(\\lambda)=ad-a\\lambda-d\\lambda+\\lambda^2-bc=\\lambda^2-(a+d)\\lambda+(ad-bc)`
      );
      const trace = add(Q[0][0], Q[1][1]);
      const determinant = sub(mul(Q[0][0], Q[1][1]), mul(Q[0][1], Q[1][0]));
      push(
        "polynomial",
        "以輸入小數的精確分數形式整理係數，尚未求根。",
        "Collect coefficients as exact fractions of the supplied decimal input; no roots have been inferred.",
        `p(\\lambda)=${polynomial([rat(1), rat(-trace.n, trace.d), determinant])}`
      );
    }
    if (step.titleEn.includes("Discriminant")) {
      push(
        "values",
        "Δ 是二次式的判別式；Δ > 0、= 0、< 0 分別表示兩個相異實根、重根、非實根。λ₊、λ₋ 表示取正、負平方根分支；此代數公式本身是精確關係，代入求解器的小數輸出後則只保留數值精度。",
        "Δ is the quadratic discriminant: Δ > 0, = 0, or < 0 means two distinct real roots, a repeated root, or non-real roots. λ₊ and λ₋ denote the positive and negative square-root branches. This algebraic formula is exact; substituting the solver's decimal outputs retains only numerical precision.",
        `\\Delta=\\operatorname{tr}(A)^2-4\\det(A),\\qquad \\lambda_{\\pm}=\\frac{\\operatorname{tr}(A)\\pm\\sqrt{\\Delta}}{2}`
      );
    }
    if (A.length === 3 && step.titleEn.includes("Write Out A")) {
      push(
        "polynomial",
        "符號提醒：上一個既有公式中的豎線表示行列式，也就是 p(λ)，而不是矩陣本身。A − λI 是係數矩陣；只有對角線元素減 λ。",
        "Notation note: the vertical bars in the original formula above denote a determinant, namely p(λ), not the matrix itself. A − λI is the coefficient matrix; only its diagonal entries subtract λ.",
        `A-\\lambda I=\\begin{pmatrix}${Q.map((row, i) => row.map((cell, j) => (i === j ? `${ratToLatex(cell)}-\\lambda` : ratToLatex(cell))).join(" & ")).join(" \\\\ ")}\\end{pmatrix}`
      );
      push(
        "polynomial",
        "沿第一行展開，符號依序為 +、−、+。M₁ⱼ(λ) 是刪去第一行及第 j 列後的 2×2 子式行列式；每個子式內的對角線仍要減 λ。",
        "Expand along row 1 with signs +, −, +. M₁ⱼ(λ) is the determinant left after deleting row 1 and column j; diagonal entries inside each minor still include −λ.",
        `p(\\lambda)=(a_{11}-\\lambda)M_{11}(\\lambda)-a_{12}M_{12}(\\lambda)+a_{13}M_{13}(\\lambda)`
      );
      const m1 = `(${q(1, 1)}-\\lambda)(${q(2, 2)}-\\lambda)-(${q(1, 2)})(${q(2, 1)})`;
      const m2 = `(${q(1, 0)})(${q(2, 2)}-\\lambda)-(${q(1, 2)})(${q(2, 0)})`;
      const m3 = `(${q(1, 0)})(${q(2, 1)})-(${q(1, 1)}-\\lambda)(${q(2, 0)})`;
      [m1, m2, m3].forEach((minor, j) =>
        push(
          "polynomial",
          `子式 M₁${j + 1}(λ)：使用 2×2 的「主對角線乘積減副對角線乘積」。`,
          `Minor M₁${j + 1}(λ): multiply the main diagonal and subtract the other diagonal product.`,
          `M_{1${j + 1}}(\\lambda)=${minor}`
        )
      );
      push(
        "polynomial",
        "將三個子式代回，逐項分配相乘，再依 λ 的次方收集。",
        "Substitute all three minors, distribute each product, then collect powers of λ.",
        `p(\\lambda)=(${q(0, 0)}-\\lambda)\\left[${m1}\\right]-(${q(0, 1)})\\left[${m2}\\right]+(${q(0, 2)})\\left[${m3}\\right]`
      );
      const trace = add(add(Q[0][0], Q[1][1]), Q[2][2]);
      const minors = add(
        add(
          sub(mul(Q[0][0], Q[1][1]), mul(Q[0][1], Q[1][0])),
          sub(mul(Q[0][0], Q[2][2]), mul(Q[0][2], Q[2][0]))
        ),
        sub(mul(Q[1][1], Q[2][2]), mul(Q[1][2], Q[2][1]))
      );
      const determinant = add(
        sub(
          mul(Q[0][0], sub(mul(Q[1][1], Q[2][2]), mul(Q[1][2], Q[2][1]))),
          mul(Q[0][1], sub(mul(Q[1][0], Q[2][2]), mul(Q[1][2], Q[2][0])))
        ),
        mul(Q[0][2], sub(mul(Q[1][0], Q[2][1]), mul(Q[1][1], Q[2][0])))
      );
      cubicCoefficients = {
        alpha: rat(-trace.n, trace.d),
        beta: minors,
        gamma: rat(-determinant.n, determinant.d),
      };
      push(
        "polynomial",
        "s 是三個主 2×2 子式的總和。p(λ) 的最高次項為 −λ³；既有求根步驟把整式乘 −1，根不變。以下係數精確取自輸入小數，不是由近似根猜測。",
        "s is the sum of the three principal 2×2 minors. p(λ) has leading term −λ³; the original solving steps multiply the equation by −1, without changing its roots. These exact coefficients come from the decimal input, not guessed roots.",
        `p(\\lambda)=${polynomial([rat(-1), trace, rat(-minors.n, minors.d), determinant])}`
      );
    }
    if (step.titleEn.includes("Solve the Cubic")) {
      push(
        "values",
        "以 α、β、γ 表示已整理的三次式係數，α = −tr(A)、β = s、γ = −det(A)。令 λ = u − α/3 消去二次項；這裡的 p、q 是降冪三次式係數，並非上面的特徵多項式 p(λ)。",
        "Write the collected cubic coefficients as α = −tr(A), β = s, γ = −det(A). Set λ = u − α/3 to remove the quadratic term; p and q here are depressed-cubic coefficients, not the characteristic polynomial p(λ).",
        `\\lambda^3+\\alpha\\lambda^2+\\beta\\lambda+\\gamma=0,\\quad \\lambda=u-\\frac{\\alpha}{3},\\quad u^3+pu+q=0`
      );
      push(
        "values",
        "代入換元並整理得到 p、q；D 用來選擇實數根的數值求解方法，不是把小數猜成精確根。",
        "Substitute and collect to obtain p and q. D selects the numerical real-root method; it does not turn rounded decimals into exact roots.",
        `p=\\beta-\\frac{\\alpha^2}{3},\\quad q=\\frac{2\\alpha^3}{27}-\\frac{\\alpha\\beta}{3}+\\gamma,\\quad D=\\left(\\frac q2\\right)^2+\\left(\\frac p3\\right)^3`
      );
      if (cubicCoefficients) {
        const { alpha, beta, gamma } = cubicCoefficients;
        const p = sub(beta, div(mul(alpha, alpha), rat(3)));
        const q = add(
          sub(
            div(mul(rat(2), mul(mul(alpha, alpha), alpha)), rat(27)),
            div(mul(alpha, beta), rat(3))
          ),
          gamma
        );
        const D = add(div(mul(q, q), rat(4)), div(mul(mul(p, p), p), rat(27)));
        push(
          "values",
          "本次輸入的精確係數與判別量如下。注意：這些是係數的精確代數計算，不是對既有求解器四捨五入的根作精確性保證。",
          "The input's exact coefficients and discriminant are below. These are exact coefficient calculations, not a guarantee that the existing solver's rounded roots are exact.",
          `\\alpha=${ratToLatex(alpha)},\\quad\\beta=${ratToLatex(beta)},\\quad\\gamma=${ratToLatex(gamma)},\\qquad p=${ratToLatex(p)},\\quad q=${ratToLatex(q)},\\quad D=${ratToLatex(D)}`
        );
      }
      push(
        "values",
        "D > 0 時用實數立方根求一個實根；D < 0 時用三角法求三個實根。D = 0 為重根情況；p = q = 0 時 u = 0 為三重根。最後換回 λ。本頁僅展示既有求解器回傳的實數近似結果。",
        "For D > 0, real cube roots give one real root; for D < 0, use the trigonometric method for three real roots. D = 0 is a repeated-root case; p = q = 0 gives the triple root u = 0. Convert back to λ. This page displays only the existing solver's approximate real outputs.",
        `\\begin{aligned}D>0:\\quad u&=\\sqrt[3]{-q/2+\\sqrt D}+\\sqrt[3]{-q/2-\\sqrt D}\\\\D<0:\\quad u_k&=2\\sqrt{-p/3}\\cos\\left(\\tfrac13\\arccos\\left(\\frac{3q}{2p}\\sqrt{-3/p}\\right)-\\tfrac{2\\pi k}{3}\\right),\\ k=0,1,2\\end{aligned}`
      );
      push(
        "values",
        "重根公式：令 c 為 −q/2 的實數立方根，則 u = 2c 及 u = −c（重根）。三重根時 c = 0。將各 u 換回 λ = u − α/3；下方回傳值仍標示為近似，且以殘差檢查是否可靠。",
        "Repeated-root formula: let c be the real cube root of −q/2; the roots are u = 2c and u = −c (repeated). The triple-root case has c = 0. Convert each u back with λ = u − α/3; returned values remain labeled approximate and checked numerically below.",
        `D=0:\\quad c=\\sqrt[3]{-q/2},\\quad u_1=2c,\\quad u_2=u_3=-c;\\qquad\\lambda_k=u_k-\\frac{\\alpha}{3}`
      );
    }
    if (isFormation && vectorIndex < result.eigenvalues.length) {
      const lambda = result.eigenvalues[vectorIndex];
      push(
        "vectors",
        `現在固定第 ${vectorIndex + 1} 個特徵值的數值近似，未知量改為 v₁、…、v${A.length}。每一行是 ∑ⱼ(Aᵢⱼ − λδᵢⱼ)vⱼ = 0，δᵢⱼ 在 i = j 時為 1，否則為 0。`,
        `Now fix numerical eigenvalue ${vectorIndex + 1}; the unknowns are v₁, …, v${A.length}. Each row states ∑ⱼ(Aᵢⱼ − λδᵢⱼ)vⱼ = 0, with δᵢⱼ = 1 if i = j, and 0 otherwise.`,
        `\\left[\\begin{array}{${"c".repeat(A.length)}|c}${A.map((row, i) => `${row.map((cell, j) => approx(cell - (i === j ? lambda : 0))).join(" & ")} & 0`).join(" \\\\ ")}\\end{array}\\right]\\quad\\text{(approx.)}`
      );
      push(
        "vectors",
        "列變換不改變零空間：交換行、將行乘以非零數、或加上另一行的倍數。主元分量由自由分量決定；選一個自由分量為 1、其餘為 0，便可取一個非零方向。若有多個自由分量，本工具只回傳一個代表向量，不是整組基底。",
        "Row operations preserve the null space: swap rows, multiply a row by a nonzero scalar, or add a multiple of another row. Pivot components depend on free components; set one free component to 1 and others to 0 to select a nonzero direction. With multiple free components, this tool returns only one representative, not an entire basis.",
        `R_i\\leftrightarrow R_j,\\quad R_i\\leftarrow cR_i\\ (c\\ne0),\\quad R_i\\leftarrow R_i+cR_j;\\qquad v_{\\mathrm{pivot}}=-\\sum_j r_j v_{\\mathrm{free},j}`
      );
      if (Number.isFinite(lambda))
        steps.push(...rowOperationSnapshots(A, lambda, lang));
    }
    if (
      step.titleEn.startsWith("Find Eigenvector") ||
      step.titleEn.startsWith("Eigenvector (")
    ) {
      push(
        "vectors",
        "特徵向量的任意非零倍數仍是特徵向量。以長度 ||w||₂ 除候選方向 w 可得單位向量 v；若 w = 0，不能歸一化，也不能當作特徵向量。下方結果以近似數字呈現。",
        "Any nonzero multiple remains an eigenvector. Divide a candidate direction w by its length ||w||₂ to obtain unit vector v; w = 0 cannot be normalized or accepted as an eigenvector. Numerical results below are approximate.",
        `\\|\\mathbf w\\|_2=\\sqrt{\\sum_{j=1}^{${A.length}}w_j^2},\\qquad \\mathbf v=\\frac{\\mathbf w}{\\|\\mathbf w\\|_2}\\quad(\\mathbf w\\ne\\mathbf0)`
      );
    }
  }
  result.eigenvectors.forEach((v, i) => {
    const diagnostics = eigenvectorDiagnostics(A, result.eigenvalues[i], v);
    push(
      "vectors",
      diagnostics.valid
        ? `第 ${i + 1} 組數值殘差檢查通過。計算 r = Av − λv 及 ||r||₂；很小的殘差只是數值一致性，不是精確等式的證明。`
        : `第 ${i + 1} 組未通過數值檢查：向量為零、含非有限值，或殘差過大。上面的既有驗證公式不應視為驗證成功；請換一個矩陣或檢查求解器輸出。`,
      diagnostics.valid
        ? `Pair ${i + 1} passes a numerical residual check. Compute r = Av − λv and ||r||₂; a small residual indicates numerical consistency, not proof of an exact equality.`
        : `Pair ${i + 1} fails the numerical check: a zero/non-finite vector or excessive residual. Do not treat the original verification formula above as a successful verification; inspect the solver output or try another matrix.`,
      `\\mathbf v_{${i + 1}}\\approx${column(v)},\\quad \\|\\mathbf v_{${i + 1}}\\|_2\\approx${approx(diagnostics.norm)},\\quad \\|A\\mathbf v_{${i + 1}}-\\lambda_{${i + 1}}\\mathbf v_{${i + 1}}\\|_2\\approx${approx(diagnostics.residual)}`
    );
  });
  return steps;
}
