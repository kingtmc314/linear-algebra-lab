import { fmtExact, type MatrixPowerResult } from "./matrixPower";

export interface Phase20powerStep {
  description: string;
  latex?: string;
}

/** Teaching-only adapter: the numerical solver and its original LaTeX stay unchanged. */
export function buildPhase20powerSteps(
  result: MatrixPowerResult,
  lang: "zh" | "en"
): Phase20powerStep[] {
  const zh = lang === "zh";
  const m = result.P.length;
  const steps: Phase20powerStep[] = [];
  const text = (zhText: string, enText: string) => (zh ? zhText : enText);
  const add = (zhText: string, enText: string, latex: string) => {
    steps.push({ description: text(zhText, enText), latex });
  };
  const approximate = text(
    "數值近似：分數是原有格式器對浮點數的顯示，不代表已證明的精確有理數。",
    "Numerical approximation: fractions are the original formatter’s display of floating-point values, not certified exact rationals."
  );
  const original = (index: number) => {
    const step = result.steps[index];
    if (!step) return;
    // Correct the old Chinese row/column description and the solver's exactness claim.
    const context =
      index === 2
        ? text(
            "P 的第 i 列（column）是 vᵢ；D 的第 i 個對角元素是同一個 λᵢ。配對次序不可交換。",
            "Column i of P is vᵢ; diagonal entry i of D is the matching λᵢ. Keep their order paired."
          )
        : index === 5
          ? text(
              "保留原有簡化 LaTeX 輸出；本工具以數值對角化計算，結果須視為近似。",
              "The original simplified LaTeX output is preserved; the numerical diagonalization result must be treated as approximate."
            )
          : text(step.explanationZh, step.explanationEn);
    steps.push({
      description: `${text(step.titleZh, step.titleEn)} — ${context} ${approximate}`,
      latex: step.latex,
    });
  };
  const matrix = (rows: string[][]) =>
    `\\begin{pmatrix} ${rows.map(row => row.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
  const numericMatrix = (rows: number[][]) =>
    matrix(rows.map(row => row.map(fmtExact)));

  add(
    `變數與目標：A 是 ${m}×${m} 方陣；n = ${result.n} 是相乘的次數，不是矩陣大小。Iₘ 是單位矩陣。`,
    `Variables and goal: A is an ${m}×${m} square matrix; n = ${result.n} counts repeated multiplication, not matrix size. Iₘ is the identity matrix.`,
    `A\\in\\mathbb{R}^{${m}\\times${m}},\\quad n=${result.n}\\in\\mathbb{Z}_{\\geq0},\\quad A^0=I_{${m}}`
  );
  original(0);
  add(
    "對角化的條件：選取 m 個線性獨立的非零特徵向量 vᵢ。λᵢ 是對應特徵值，i 是配對編號；重複特徵值仍須有足夠的獨立向量。",
    "Diagonalization condition: choose m linearly independent nonzero eigenvectors vᵢ. λᵢ is the matching eigenvalue and i labels the pair; repeated eigenvalues still require enough independent vectors.",
    `\\det(A-\\lambda I_{${m}})=0,\\qquad (A-\\lambda_i I_{${m}})v_i=0,\\quad v_i\\neq0`
  );
  original(1);
  for (let i = 0; i < m; i++) {
    const column = result.P.map(row => [row[i]]);
    add(
      `第 ${i + 1} 組：把 v${i + 1} 放在 P 的第 ${i + 1} 列（直向 column），並將 λ${i + 1} 放在 D 的同一位置。向量可作非零倍數縮放，但 P⁻¹ 必須一起重算。${approximate}`,
      `Pair ${i + 1}: place v${i + 1} in column ${i + 1} of P and λ${i + 1} in the same diagonal position of D. Nonzero rescaling is allowed, but P⁻¹ must be recomputed with it. ${approximate}`,
      `v_{${i + 1}}\\approx${numericMatrix(column)},\\quad \\lambda_{${i + 1}}\\approx${fmtExact(result.eigenvalues[i])},\\quad Av_{${i + 1}}=\\lambda_{${i + 1}}v_{${i + 1}}`
    );
  }
  add(
    "組成 P：將特徵向量並排作為各列（columns）。P 將特徵向量基底的座標轉回原來的座標；det(P) ≠ 0 表示這些向量線性獨立。數值 P 為近似。",
    "Assemble P by placing eigenvectors side by side as columns. P converts eigenbasis coordinates into original coordinates; det(P) ≠ 0 means the vectors are independent. Numerical P is approximate.",
    `P=[v_1\\;\\cdots\\;v_{${m}}]\\approx${numericMatrix(result.P)},\\quad\\det(P)\\neq0`
  );
  add(
    "組成 D：只有對角線上放特徵值，其他元素為零。AP = PD 是把每個 Avᵢ = λᵢvᵢ 合併成一個矩陣等式。數值 D 為近似。",
    "Assemble D with eigenvalues on the diagonal and zeros elsewhere. AP = PD combines all equations Avᵢ = λᵢvᵢ into one matrix identity. Numerical D is approximate.",
    `D=\\operatorname{diag}(\\lambda_1,\\ldots,\\lambda_{${m}})\\approx${numericMatrix(result.D)},\\qquad AP=PD`
  );
  add(
    "求 P⁻¹：它不是逐元素取倒數，而是滿足 P⁻¹P = PP⁻¹ = I 的逆矩陣。可將增廣矩陣 [P | I] 作行運算；P⁻¹ 把原座標轉入特徵向量基底。",
    "Find P⁻¹: it is not an element-wise reciprocal, but the inverse satisfying P⁻¹P = PP⁻¹ = I. Row-reduce [P | I]; P⁻¹ converts original coordinates into the eigenbasis.",
    `[P\\mid I_{${m}}]\\xrightarrow{\\text{row operations}}[I_{${m}}\\mid P^{-1}],\\qquad P^{-1}P=PP^{-1}=I_{${m}}`
  );
  add(
    m === 2
      ? "2×2 逆矩陣公式：a、b、c、d 是 P 的四個元素，不是 A 的元素；分母 ad − bc 必須非零。"
      : "3×3 逆矩陣公式：Cᵢⱼ 是 P 的餘因子（刪去第 i 行、第 j 列的子矩陣行列式乘符號）。先轉置餘因子矩陣，再除以 det(P)。",
    m === 2
      ? "2×2 inverse formula: a, b, c, d are entries of P, not A; the denominator ad − bc must be nonzero."
      : "3×3 inverse formula: Cᵢⱼ is a cofactor of P (signed determinant after deleting row i and column j). Transpose the cofactor matrix, then divide by det(P).",
    m === 2
      ? `P=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}\\quad\\Longrightarrow\\quad P^{-1}=\\frac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}`
      : `C_{ij}=(-1)^{i+j}\\det(P_{\\widehat{i},\\widehat{j}}),\\quad P^{-1}=\\frac{C^T}{\\det(P)}`
  );
  if (m === 2) {
    const [[a, b], [c, d]] = result.P;
    const det = a * d - b * c;
    add(
      `代入 P 的元素計算行列式，再交換對角元素、將非對角元素變號。所有數值運算及重建分數均為近似。`,
      `Substitute the entries of P into the determinant, then swap diagonal entries and negate off-diagonal entries. All numerical arithmetic and reconstructed fractions are approximate.`,
      `\\begin{aligned}\\det(P)&\\approx\\left(${fmtExact(a)}\\right)\\cdot\\left(${fmtExact(d)}\\right)-\\left(${fmtExact(b)}\\right)\\cdot\\left(${fmtExact(c)}\\right)\\approx${fmtExact(det)}\\\\P^{-1}&\\approx\\frac{1}{\\left(${fmtExact(det)}\\right)}${numericMatrix(
        [
          [d, -b],
          [-c, a],
        ]
      )}\\end{aligned}`
    );
  } else {
    const cofactors = result.P.map((row, i) =>
      row.map((_, j) => {
        const minor = result.P.filter((_, r) => r !== i).map(r =>
          r.filter((_, c) => c !== j)
        );
        return (i + j) % 2 === 0
          ? minor[0][0] * minor[1][1] - minor[0][1] * minor[1][0]
          : -(minor[0][0] * minor[1][1] - minor[0][1] * minor[1][0]);
      })
    );
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        const minor = result.P.filter((_, r) => r !== i).map(r =>
          r.filter((_, c) => c !== j)
        );
        add(
          `餘因子 C${i + 1}${j + 1}：刪去 P 的第 ${i + 1} 行、第 ${j + 1} 列，再乘棋盤式符號。${approximate}`,
          `Cofactor C${i + 1}${j + 1}: delete row ${i + 1} and column ${j + 1} of P, then apply the checkerboard sign. ${approximate}`,
          `C_{${i + 1}${j + 1}}=(-1)^{${i + 1}+${j + 1}}\\det(P_{\\widehat{${i + 1}},\\widehat{${j + 1}}})\\approx${(i + j) % 2 === 0 ? "" : "-"}\\det${numericMatrix(minor)}\\approx${fmtExact(cofactors[i][j])}`
        );
      }
    }
    const det = result.P[0].reduce(
      (sum, value, j) => sum + value * cofactors[0][j],
      0
    );
    const transposed = cofactors[0].map((_, j) => cofactors.map(row => row[j]));
    add(
      `沿 P 的第一行展開行列式，再使用 C 的轉置除以行列式。${approximate}`,
      `Expand det(P) along its first row, then divide the transpose of C by the determinant. ${approximate}`,
      `\\begin{aligned}\\det(P)&=\\sum_{j=1}^{3}p_{1j}C_{1j}\\approx${fmtExact(det)}\\\\P^{-1}&\\approx\\frac{1}{\\left(${fmtExact(det)}\\right)}${numericMatrix(transposed)}\\end{aligned}`
    );
  }
  add(
    `數值逆矩陣快照：使用原計算器的 P⁻¹，並保留其分數格式。${approximate}`,
    `Numerical inverse snapshot: use the original calculator’s P⁻¹ and retain its fraction formatting. ${approximate}`,
    `P^{-1}\\approx${numericMatrix(result.Pinv)}`
  );
  add(
    "完成對角化：在 AP = PD 的右側乘 P⁻¹，便得到 A = PDP⁻¹。矩陣乘法的順序不可任意交換。",
    "Complete diagonalization: multiply AP = PD on the right by P⁻¹ to obtain A = PDP⁻¹. Matrix multiplication order cannot be swapped freely.",
    `AP=PD\\quad\\Longrightarrow\\quad APP^{-1}=PDP^{-1}\\quad\\Longrightarrow\\quad A=PDP^{-1}`
  );
  original(2);
  add(
    "平方時，中間的 P⁻¹P 消去成 I；只留下最外側的 P、P⁻¹ 和中間的 D²。這是對角化能簡化次方的原因。",
    "For the square, the middle P⁻¹P cancels to I, leaving outer P and P⁻¹ with D² in between. This is why diagonalization simplifies powers.",
    `A^2=(PDP^{-1})(PDP^{-1})=PD\\underbrace{(P^{-1}P)}_{I}DP^{-1}=PD^2P^{-1}`
  );
  add(
    "立方再消去一次；重複相同的消去便得到所有正整數 n 的公式。n = 0 則直接使用單位矩陣。",
    "For the cube, cancel once more; repeating the same cancellation gives the formula for every positive integer n. For n = 0, use the identity matrix directly.",
    `A^3=(PD^2P^{-1})(PDP^{-1})=PD^3P^{-1},\\qquad A^n=PD^nP^{-1}\\ (n\\geq1)`
  );
  if (result.n === 0) {
    add(
      "零次方特例：不論 A 是否奇異，A⁰ 都定義為 I。D⁰ 也是 I；即使 λᵢ = 0，也不需要把 0⁰ 當作純量運算。",
      "Zero-power case: A⁰ is defined as I even when A is singular. D⁰ is also I; a zero eigenvalue does not require evaluating scalar 0⁰.",
      `D^0=I_{${m}},\\qquad A^0=PI_{${m}}P^{-1}=I_{${m}}`
    );
  }
  original(3);
  add(
    `代入 n = ${result.n}：只有對角線上的 λᵢ 取次方，非對角元素仍是零；不是把 P、P⁻¹ 或 A 的每個元素取次方。`,
    `Substitute n = ${result.n}: only diagonal λᵢ entries are raised to the power; off-diagonal entries stay zero. Do not raise each entry of P, P⁻¹ or A to that power.`,
    `D^{${result.n}}\\approx${numericMatrix(result.Dn)},\\qquad A^{${result.n}}=PD^{${result.n}}P^{-1}`
  );
  original(4);
  add(
    `按元素展開：i 是結果的行編號，j 是列編號，k = 1,…,${m} 枚舉特徵值；pᵢₖ 是 P 的元素，rₖⱼ 是 P⁻¹ 的元素。每個元素是 m 個加權特徵值次方之和。`,
    `Expand by entry: i is the output row, j the column and k = 1,…,${m} ranges over eigenvalues; pᵢₖ is an entry of P and rₖⱼ an entry of P⁻¹. Each entry is a sum of m weighted eigenvalue powers.`,
    `r_{kj}=(P^{-1})_{kj},\\qquad (A^n)_{ij}=\\sum_{k=1}^{${m}}p_{ik}\\lambda_k^n r_{kj}`
  );
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      const terms = result.eigenvalues.map(
        (lambda, k) =>
          `\\left(${fmtExact(result.P[i][k])}\\right)\\cdot\\left(${fmtExact(lambda)}\\right)^{${result.n}}\\cdot\\left(${fmtExact(result.Pinv[k][j])}\\right)`
      );
      add(
        `第 ${i + 1} 行、第 ${j + 1} 列：依序取 P 的行、Dⁿ 的對角值、P⁻¹ 的列，保留乘法符號後相加。${approximate}`,
        `Row ${i + 1}, column ${j + 1}: combine the row of P, diagonal values of Dⁿ and column of P⁻¹, keeping explicit multiplication signs before summing. ${approximate}`,
        result.n === 0
          ? `(A^0)_{${i + 1}${j + 1}}=(I_{${m}})_{${i + 1}${j + 1}}=${i === j ? "1" : "0"}`
          : `\\begin{aligned}(A^{${result.n}})_{${i + 1}${j + 1}}&\\approx ${terms.join("\\\\&\\quad+ ")}\\\\&\\approx ${fmtExact(result.An[i][j])}\\end{aligned}`
      );
    }
  }
  original(5);
  original(6);
  return steps;
}
