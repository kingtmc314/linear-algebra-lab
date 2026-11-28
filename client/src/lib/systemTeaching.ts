import type {
  GeneralSolutionTerm,
  SolutionType,
  SystemResult,
} from "./linearSystem";
import { solveLinearSystem } from "./linearSystem";
import {
  type Rational,
  type RatMatrix,
  rat,
  fromFloat,
  add,
  sub,
  mul,
  div,
  neg,
  isZero,
  ratToLatex,
  ratToStr,
  ratMatLatex,
  ratAugLatex,
} from "./rational";
import {
  Phase20systemsGaussianSteps,
  Phase20systemsInputIsApproximate,
  Phase20systemsReadFraction,
  type Phase20systemsStep,
} from "./Phase20systems";

type Language = "zh" | "en";
const words = (lang: Language, zh: string, en: string) =>
  lang === "zh" ? zh : en;
const equal = (a: Rational, b: Rational) => a.n * b.d === b.n * a.d;

const greek: Record<string, string> = {
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  ε: "epsilon",
  ϵ: "varepsilon",
  ζ: "zeta",
  η: "eta",
  θ: "theta",
  ϑ: "vartheta",
  ι: "iota",
  κ: "kappa",
  λ: "lambda",
  μ: "mu",
  ν: "nu",
  ξ: "xi",
  ο: "omicron",
  π: "pi",
  ϖ: "varpi",
  ρ: "rho",
  ϱ: "varrho",
  σ: "sigma",
  ς: "varsigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  ϕ: "varphi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
};
export interface SystemVariable {
  latex: string;
  label: string;
  key: string;
}
export function defaultSystemVariables(count: number): SystemVariable[] {
  return Array.from({ length: count }, (_, i) => ({
    latex: `x_{${i + 1}}`,
    label: `x${i + 1}`,
    key: `x_${i + 1}`,
  }));
}

/** Whitelist only: never put raw names into LaTeX. Unicode and commands share duplicate keys. */
export function validateSystemVariables(
  names: string[],
  count = names.length
): {
  valid: boolean;
  variables: SystemVariable[];
  error?: "count" | "unsafe" | "duplicate";
} {
  if (names.length !== count || count < 1)
    return { valid: false, variables: [], error: "count" };
  const variables: SystemVariable[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const latin = name.match(/^([A-Za-z])(?:_?(\d{1,3}))?$/);
    if (latin) {
      const suffix = latin[2] === undefined ? "" : String(Number(latin[2]));
      variables.push({
        latex: latin[1] + (suffix ? `_{${suffix}}` : ""),
        label: latin[1] + suffix,
        key: latin[1] + (suffix ? `_${suffix}` : ""),
      });
      continue;
    }
    const command =
      greek[name] ??
      (name.startsWith("\\") && Object.values(greek).includes(name.slice(1))
        ? name.slice(1)
        : undefined);
    if (!command) return { valid: false, variables: [], error: "unsafe" };
    const label = Object.entries(greek).find(
      ([, value]) => value === command
    )![0];
    // KaTeX has no lowercase omicron command; it is visually the Latin o.
    variables.push({
      latex: command === "omicron" ? "o" : `\\${command}`,
      label,
      key: command === "omicron" ? "o" : command,
    });
  }
  if (new Set(variables.map(variable => variable.key)).size !== count)
    return { valid: false, variables: [], error: "duplicate" };
  return { valid: true, variables };
}

export function systemParameterNames(
  count: number,
  variables: SystemVariable[]
): string[] {
  if (count < 1) return [];
  const used = new Set(variables.map(variable => variable.key));
  const base = [
    "k",
    "t",
    "s",
    "c",
    "r",
    "p",
    "q",
    "h",
    "v",
    "w",
    "z",
    "j",
  ].find(
    symbol =>
      !used.has(symbol) &&
      Array.from({ length: count }, (_, i) => `${symbol}_${i + 1}`).every(
        key => !used.has(key)
      )
  );
  if (!base) throw new Error("No safe parameter name available");
  return count === 1
    ? [base]
    : Array.from({ length: count }, (_, i) => `${base}_{${i + 1}}`);
}

function assertInput(A: number[][], b: number[]) {
  if (
    !A.length ||
    !A[0]?.length ||
    A.length > 5 ||
    A[0].length > 5 ||
    b.length !== A.length ||
    A.some(row => row.length !== A[0].length) ||
    ![...A.flat(), ...b].every(Number.isFinite)
  ) {
    throw new Error(
      "Expected a finite rectangular system, at most 5 equations and 5 unknowns"
    );
  }
}

/** Pivot decisions are exact bigint zero tests in the existing fromFloat model. */
export function exactSystemRank(matrix: RatMatrix): number {
  if (!matrix.length) return 0;
  const M = matrix.map(row => [...row]);
  let pivot = 0;
  for (let col = 0; col < M[0].length && pivot < M.length; col++) {
    const found = M.findIndex((row, i) => i >= pivot && !isZero(row[col]));
    if (found < 0) continue;
    [M[pivot], M[found]] = [M[found], M[pivot]];
    for (let i = pivot + 1; i < M.length; i++) {
      if (isZero(M[i][col])) continue;
      const factor = div(M[i][col], M[pivot][col]);
      M[i] = M[i].map((cell, j) => sub(cell, mul(factor, M[pivot][j])));
    }
    pivot++;
  }
  return pivot;
}

export interface SystemTaxonomy {
  type: SolutionType;
  consistent: boolean;
  homogeneous: boolean;
  rankA: number;
  rankAugmented: number;
  n: number;
  m: number;
  freeCount: number;
  trivialSolution: boolean;
  nontrivialSolutions: boolean;
  approximate: boolean;
  method: "cramer" | "gaussian";
}
export function classifySystemExactly(
  A: number[][],
  b: number[]
): SystemTaxonomy {
  assertInput(A, b);
  const modelA = A.map(row => row.map(value => fromFloat(value)));
  const modelB = b.map(value => fromFloat(value));
  const rankA = exactSystemRank(modelA);
  const rankAugmented = exactSystemRank(
    modelA.map((row, i) => [...row, modelB[i]])
  );
  const consistent = rankA === rankAugmented;
  const n = A[0].length;
  const type = !consistent ? "none" : rankA === n ? "unique" : "infinite";
  const homogeneous = modelB.every(isZero);
  return {
    type,
    consistent,
    homogeneous,
    rankA,
    rankAugmented,
    n,
    m: A.length,
    freeCount: consistent ? n - rankA : 0,
    trivialSolution: homogeneous,
    nontrivialSolutions: homogeneous && rankA < n,
    approximate: Phase20systemsInputIsApproximate(A, b),
    method: type === "unique" ? "cramer" : "gaussian",
  };
}

/** A determinant is defined only for square matrices; never accept rectangular input. */
export function exactSystemDeterminant(A: RatMatrix): Rational {
  if (!A.length || A.some(row => row.length !== A.length))
    throw new Error("Determinant requires a nonempty square matrix");
  if (A.length === 1) return A[0][0];
  return A[0].reduce((sum, cell, col) => {
    const minor = A.slice(1).map(row => row.filter((_, j) => j !== col));
    const term = mul(cell, exactSystemDeterminant(minor));
    return add(sum, col % 2 ? neg(term) : term);
  }, rat(0));
}

export interface CramerReplacement {
  column: number;
  matrix: RatMatrix;
  determinant: Rational;
  value: Rational;
}
export interface CramerData {
  rows: number[];
  coefficientMatrix: RatMatrix;
  constants: Rational[];
  determinant: Rational;
  replacements: CramerReplacement[];
  verification: { lhs: Rational; rhs: Rational; matches: boolean }[];
}
export function exactCramerData(A: number[][], b: number[]): CramerData {
  const taxonomy = classifySystemExactly(A, b);
  if (taxonomy.type !== "unique")
    throw new Error("Cramer's rule requires a unique consistent system");
  const model = A.map(row => row.map(value => fromFloat(value)));
  const constants = b.map(value => fromFloat(value));
  const rows: number[] = [];
  // Greedy exact row basis selects an independent n-row minor, in original order.
  for (let i = 0; i < model.length && rows.length < taxonomy.n; i++) {
    if (
      exactSystemRank([...rows.map(row => model[row]), model[i]]) > rows.length
    )
      rows.push(i);
  }
  const coefficientMatrix = rows.map(i => model[i]);
  const selectedB = rows.map(i => constants[i]);
  const determinant = exactSystemDeterminant(coefficientMatrix);
  if (isZero(determinant))
    throw new Error("Independent-row model guard failed");
  const replacements = coefficientMatrix[0].map((_, col) => {
    const matrix = coefficientMatrix.map((row, i) =>
      row.map((cell, j) => (j === col ? selectedB[i] : cell))
    );
    const replacedDet = exactSystemDeterminant(matrix);
    return {
      column: col,
      matrix,
      determinant: replacedDet,
      value: div(replacedDet, determinant),
    };
  });
  const verification = model.map((row, i) => {
    const lhs = row.reduce(
      (sum, cell, j) => add(sum, mul(cell, replacements[j].value)),
      rat(0)
    );
    return { lhs, rhs: constants[i], matches: equal(lhs, constants[i]) };
  });
  if (verification.some(equation => !equation.matches))
    throw new Error("Original-equation verification guard failed");
  return {
    rows,
    coefficientMatrix,
    constants: selectedB,
    determinant,
    replacements,
    verification,
  };
}

export function systemGeneralLatex(
  terms: GeneralSolutionTerm[],
  variables: SystemVariable[],
  parameters: string[]
): string {
  return terms
    .map(term => {
      let rhs = term.constantLatex === "0" ? "" : term.constantLatex;
      term.kCoeffsLatex.forEach((coefficient, i) => {
        if (coefficient === "0") return;
        const negative = coefficient.startsWith("-");
        const magnitude = negative ? coefficient.slice(1) : coefficient;
        const value = `${magnitude === "1" ? "" : magnitude}${parameters[i]}`;
        rhs += rhs
          ? ` ${negative ? "-" : "+"} ${value}`
          : `${negative ? "-" : ""}${value}`;
      });
      return `${variables[term.varIndex].latex} = ${rhs || "0"}`;
    })
    .join(",\\quad ");
}

/** Adapt the existing exact derivations without changing arithmetic or matrix snapshots. */
export function customizeSystemSteps(
  steps: Phase20systemsStep[],
  variables: SystemVariable[],
  parameters: string[]
): Phase20systemsStep[] {
  const parameterCount = parameters.length;
  const replace = (text: string, latex = false): string => {
    const placeholders: string[] = [];
    const protect = (value: string) => {
      const token = `@@${placeholders.length}@@`;
      placeholders.push(value);
      return token;
    };
    let adapted = text.replace(
      /k_\{(\d+)\}|(?<![A-Za-z\\])k(?![A-Za-z_\d])/g,
      (match, index: string | undefined) => {
        const parameter = parameters[index ? Number(index) - 1 : 0];
        return parameterCount && parameter ? protect(parameter) : match;
      }
    );
    adapted = adapted.replace(
      /x_\{(\d+)\}|x_(\d+)\b|\bx(\d+)\b|x([₀₁₂₃₄₅₆₇₈₉]+)/g,
      (match, a, b, c, d) => {
        const index =
          Number(
            a ??
              b ??
              c ??
              Array.from(d as string, digit =>
                "₀₁₂₃₄₅₆₇₈₉".indexOf(digit)
              ).join("")
          ) - 1;
        const variable = variables[index];
        return variable
          ? protect(latex ? variable.latex : variable.label)
          : match;
      }
    );
    adapted = adapted
      .replace(/\\mathbf\{x\}/g, "\\mathbf{u}")
      .replace(/\bx_([ij])\b/g, "u_$1")
      .replace(/x([ᵢⱼ])/g, "u$1");
    return adapted.replace(/@@(\d+)@@/g, (_, i) => placeholders[Number(i)]);
  };
  return steps.map(step => ({
    ...step,
    description: replace(step.description),
    latex: step.latex ? replace(step.latex, true) : undefined,
  }));
}

export function systemTaxonomySteps(
  taxonomy: SystemTaxonomy,
  lang: Language
): Phase20systemsStep[] {
  const { rankA, rankAugmented, n, homogeneous, consistent } = taxonomy;
  const phase = words(lang, "詞彙與方法判斷", "Vocabulary & method decision");
  return [
    {
      phase,
      description: words(
        lang,
        `先在同一有理數模型中精確計算秩：rank(A)=${rankA}，rank([A|b])=${rankAugmented}，n=${n}。秩相等代表 consistent（相容，至少一解）；不相等代表 inconsistent（不相容，無解）。`,
        `Compute ranks exactly in the same rational model: rank(A)=${rankA}, rank([A|b])=${rankAugmented}, n=${n}. Equal ranks mean consistent (at least one solution); unequal ranks mean inconsistent (no solution).`
      ),
      latex: `\\operatorname{rank}(A)=${rankA},\\quad\\operatorname{rank}([A\\mid b])=${rankAugmented},\\quad n=${n}`,
    },
    {
      phase,
      description: words(
        lang,
        homogeneous
          ? `右側每個常數都是零，因此是 homogeneous（齊次）。零向量是 trivial solution（平凡解），所以一定相容。${rankA < n ? "rank(A)<n，還有 non-trivial solutions（非平凡解），其實有無限多解。" : "rank(A)=n，只能有零解。"}`
          : "至少一個右側常數非零，因此是 non-homogeneous（非齊次）；零向量不是解。非齊次可有唯一解、無限多解或無解，要由秩判斷。",
        homogeneous
          ? `All right-hand constants are zero: homogeneous. The zero vector is the trivial solution, so the system is always consistent. ${rankA < n ? "rank(A)<n: non-trivial solutions also exist, forming an infinite family." : "rank(A)=n: only the zero solution exists."}`
          : "At least one constant is nonzero: non-homogeneous. The zero vector is not a solution. A non-homogeneous system may have a unique solution, infinitely many solutions, or no solution; use the ranks to decide."
      ),
      latex: homogeneous
        ? `b=0,\\quad A\\mathbf{0}=\\mathbf{0},\\quad ${rankA < n ? "\\operatorname{rank}(A)<n" : "\\operatorname{rank}(A)=n"}`
        : "b\\ne0,\\quad A\\mathbf{0}=\\mathbf{0}\\ne b",
    },
    {
      phase,
      description: words(
        lang,
        !consistent
          ? "秩不相等：無解，使用 Gaussian elimination（高斯消去法）找出 0=非零常數的矛盾行。"
          : rankA < n
            ? `秩相等但小於 n：無限多解，使用 Gaussian elimination，指定 ${n - rankA} 個任意實數參數。`
            : "秩相等且等於 n：唯一解，以 Cramer's rule（克拉瑪法則）計算。若方程多於未知數，必須先選獨立的方陣子系統，最後驗證所有原方程。",
        !consistent
          ? "Unequal ranks: no solution. Use Gaussian elimination to expose a contradiction 0 = nonzero constant."
          : rankA < n
            ? `Equal ranks below n: infinitely many solutions. Use Gaussian elimination with ${n - rankA} arbitrary real parameters.`
            : "Equal ranks equal n: unique solution. Use Cramer's rule. For extra equations, select an independent square subsystem and verify every original equation."
      ),
      latex: !consistent
        ? "\\operatorname{rank}(A)<\\operatorname{rank}([A\\mid b])\\Rightarrow\\text{no solution}"
        : rankA < n
          ? "\\operatorname{rank}(A)=\\operatorname{rank}([A\\mid b])<n\\Rightarrow\\text{infinitely many solutions}"
          : "\\operatorname{rank}(A)=\\operatorname{rank}([A\\mid b])=n\\Rightarrow\\text{unique solution}",
    },
  ];
}

function determinantSteps(
  A: RatMatrix,
  label: string,
  lang: Language
): Phase20systemsStep[] {
  const steps: Phase20systemsStep[] = [];
  const phase = words(lang, "精確行列式計算", "Exact determinant calculation");
  const determinant = exactSystemDeterminant(A);
  const record = (zh: string, en: string, latex: string) =>
    steps.push({ phase, description: words(lang, zh, en), latex });
  if (A.length === 1) {
    record(
      "一階行列式等於唯一的元素。",
      "A 1 by 1 determinant is its only entry.",
      `\\det(${label})=${ratToLatex(determinant)}`
    );
  } else if (A.length === 2) {
    record(
      "二階行列式：主對角乘積減去副對角乘積，全部用精確分數計算。",
      "For a 2 by 2 determinant, subtract the off-diagonal product from the diagonal product using exact fractions.",
      `\\det(${label})=(${ratToLatex(A[0][0])})(${ratToLatex(A[1][1])})-(${ratToLatex(A[0][1])})(${ratToLatex(A[1][0])})=${ratToLatex(determinant)}`
    );
  } else if (A.length === 3) {
    record(
      "沿第一橫列展開，餘因子符號依序為 +、−、+。",
      "Expand along row 1; cofactor signs are +, -, +.",
      `\\det(${label})=\\sum_{j=1}^{3}(-1)^{1+j}a_{1j}\\det(M_{1j})`
    );
    const terms: string[] = [];
    A[0].forEach((cell, j) => {
      const minor = A.slice(1).map(row => row.filter((_, col) => col !== j));
      const minorLabel = `M_{1,${j + 1}}`;
      record(
        `刪除第一橫列及第 ${j + 1} 直欄，得到二階子矩陣。`,
        `Delete row 1 and column ${j + 1} to obtain the 2 by 2 minor.`,
        `${minorLabel}=${ratMatLatex(minor)}`
      );
      steps.push(...determinantSteps(minor, minorLabel, lang));
      terms.push(
        `${j % 2 ? "-" : j ? "+" : ""}(${ratToLatex(cell)})(${ratToLatex(exactSystemDeterminant(minor))})`
      );
    });
    record(
      "將各餘因子項相加並約分。",
      "Add the cofactor terms and reduce the fraction.",
      `\\det(${label})=${terms.join("")}=${ratToLatex(determinant)}`
    );
  } else {
    // For 4/5 unknowns, determinant-preserving elimination is clearer than factorial expansion.
    const M = A.map(row => [...row]);
    let swaps = 0;
    for (let col = 0; col < A.length; col++) {
      const found = M.findIndex((row, i) => i >= col && !isZero(row[col]));
      if (found < 0) {
        record(
          "此階段沒有非零主元，行列式精確為零。",
          "There is no nonzero pivot at this stage; the determinant is exactly zero.",
          `\\det(${label})=0`
        );
        return steps;
      }
      if (found !== col) {
        [M[col], M[found]] = [M[found], M[col]];
        swaps++;
        record(
          "交換兩橫列，行列式符號反轉。",
          "Swap two rows; the determinant changes sign.",
          `R_{${col + 1}}\\leftrightarrow R_{${found + 1}},\\quad U=${ratMatLatex(M)}`
        );
      }
      for (let i = col + 1; i < M.length; i++) {
        if (isZero(M[i][col])) continue;
        const factor = div(M[i][col], M[col][col]);
        M[i] = M[i].map((cell, j) => sub(cell, mul(factor, M[col][j])));
        record(
          "從一橫列減去另一橫列的倍數不改變行列式。",
          "Subtracting a multiple of another row preserves the determinant.",
          `R_{${i + 1}}\\leftarrow R_{${i + 1}}-(${ratToLatex(factor)})R_{${col + 1}},\\quad U=${ratMatLatex(M)}`
        );
      }
    }
    record(
      "上三角行列式等於對角元素乘積，再乘上列交換的符號。",
      "Multiply the triangular diagonal entries and the sign from row swaps.",
      `\\det(${label})=(-1)^{${swaps}}${M.map((row, i) => `(${ratToLatex(row[i])})`).join("")}=${ratToLatex(determinant)}`
    );
  }
  return steps;
}

function guardSource(
  result: SystemResult,
  taxonomy: SystemTaxonomy,
  A: number[][],
  b: number[]
) {
  if (result.error || result.type !== taxonomy.type)
    throw new Error("Solver/classification rational-model mismatch");
  if (result.type === "unique") {
    const data = exactCramerData(A, b);
    if (
      result.solutionLatex?.length !== taxonomy.n ||
      data.replacements.some(
        (replacement, i) =>
          !equal(
            replacement.value,
            Phase20systemsReadFraction(result.solutionLatex![i])
          )
      )
    ) {
      throw new Error("Solver/Cramer rational-model mismatch");
    }
  } else if (result.type === "infinite") {
    if (
      !result.generalSolution ||
      result.generalSolution.length !== taxonomy.n ||
      result.freeVariables?.length !== taxonomy.freeCount
    )
      throw new Error("Missing solver general solution");
    // Verify every constant and parameter coefficient; no symbolic solving is needed.
    const terms = result.generalSolution;
    A.forEach((row, i) => {
      const constant = row.reduce(
        (sum, value, j) =>
          add(
            sum,
            mul(
              fromFloat(value),
              Phase20systemsReadFraction(terms[j].constantLatex)
            )
          ),
        rat(0)
      );
      if (!equal(constant, fromFloat(b[i])))
        throw new Error("General-solution constant guard failed");
      for (let k = 0; k < taxonomy.freeCount; k++) {
        const coefficient = row.reduce(
          (sum, value, j) =>
            add(
              sum,
              mul(
                fromFloat(value),
                Phase20systemsReadFraction(terms[j].kCoeffsLatex[k])
              )
            ),
          rat(0)
        );
        if (!isZero(coefficient))
          throw new Error("General-solution parameter guard failed");
      }
    });
  }
}

export interface SystemTeaching {
  taxonomy: SystemTaxonomy;
  result: SystemResult;
  variables: SystemVariable[];
  parameters: string[];
  steps: Phase20systemsStep[];
  gaussianSteps: Phase20systemsStep[];
  solutionLatex?: string;
  cramer?: CramerData;
}
export function buildSystemTeaching(
  A: number[][],
  b: number[],
  lang: Language = "zh",
  names?: string[],
  source?: SystemResult
): SystemTeaching {
  const taxonomy = classifySystemExactly(A, b);
  const validated = names
    ? validateSystemVariables(names, taxonomy.n)
    : { valid: true, variables: defaultSystemVariables(taxonomy.n) };
  if (!validated.valid) throw new Error("Invalid or duplicate unknown names");
  const variables = validated.variables;
  const result = source ?? solveLinearSystem(A, b);
  guardSource(result, taxonomy, A, b);
  const parameters = systemParameterNames(taxonomy.freeCount, variables);
  const gaussianSteps = customizeSystemSteps(
    Phase20systemsGaussianSteps(result, A, b, lang),
    variables,
    parameters
  );
  const unknownVector = `\\mathbf{u}=\\begin{bmatrix}${variables.map(variable => variable.latex).join(" \\\\ ")}\\end{bmatrix}`;
  gaussianSteps[0] = {
    ...gaussianSteps[0],
    description: words(
      lang,
      `${taxonomy.m} 條方程、${taxonomy.n} 個實數未知數，依序為 ${variables.map(variable => variable.label).join(", ")}。係數直欄與未知數一一對應，右側是常數 b。`,
      `${taxonomy.m} equations and ${taxonomy.n} real unknowns, in order: ${variables.map(variable => variable.label).join(", ")}. Each coefficient column corresponds to one unknown; b contains the right-hand constants.`
    ),
    latex: `A=${ratMatLatex(A.map(row => row.map(value => fromFloat(value))))},\\quad ${unknownVector},\\quad b=${ratMatLatex(b.map(value => [fromFloat(value)]))}`,
  };
  gaussianSteps[1] = {
    ...gaussianSteps[1],
    latex: `A\\mathbf{u}=b,\\quad ${variables.map((variable, j) => `a_{ij}${variable.latex}`).join("+")}=b_i`,
  };
  const taxonomySteps = systemTaxonomySteps(taxonomy, lang);
  const solutionLatex =
    result.type === "unique"
      ? result
          .solutionLatex!.map((value, i) => `${variables[i].latex}=${value}`)
          .join(",\\quad ")
      : result.type === "infinite"
        ? systemGeneralLatex(result.generalSolution!, variables, parameters)
        : undefined;
  if (result.type !== "unique")
    return {
      taxonomy,
      result,
      variables,
      parameters,
      steps: [...taxonomySteps, ...gaussianSteps],
      gaussianSteps,
      solutionLatex,
    };
  const cramer = exactCramerData(A, b);
  const steps: Phase20systemsStep[] = [...taxonomySteps, gaussianSteps[0]];
  const phase = words(
    lang,
    "Cramer 法則的適用條件",
    "When Cramer's rule applies"
  );
  if (taxonomy.m !== taxonomy.n) {
    steps.push({
      phase,
      description: words(
        lang,
        `A 是 ${taxonomy.m}×${taxonomy.n} 長方形矩陣，不能計算 det(A)。以精確秩挑選原方程 ${cramer.rows.map(i => i + 1).join(", ")}，組成 ${taxonomy.n}×${taxonomy.n} 可逆子系統 C。其解只是候選解，必須逐條代回全部 ${taxonomy.m} 條原方程。`,
        `A is ${taxonomy.m} by ${taxonomy.n}, so det(A) is not defined. Exact rank selects original equations ${cramer.rows.map(i => i + 1).join(", ")} as a nonsingular ${taxonomy.n} by ${taxonomy.n} subsystem C. Its solution is a candidate until all ${taxonomy.m} original equations are verified.`
      ),
      latex: `C=${ratMatLatex(cramer.coefficientMatrix)},\\quad d=${ratMatLatex(cramer.constants.map(value => [value]))},\\quad C\\mathbf{u}=d`,
    });
  }
  const label = taxonomy.m === taxonomy.n ? "A" : "C";
  const constantLabel = label === "A" ? "b" : "d";
  steps.push({
    phase,
    description: words(
      lang,
      "先求係數方陣的行列式。只有行列式精確非零，才可用行列式比值求解；不是用數值容差判斷零。",
      "First compute the square coefficient determinant. Cramer's ratios require an exactly nonzero determinant; no numeric tolerance decides zero."
    ),
    latex: `${label}=${ratMatLatex(cramer.coefficientMatrix)},\\quad ${constantLabel}=${ratMatLatex(cramer.constants.map(value => [value]))}`,
  });
  steps.push(...determinantSteps(cramer.coefficientMatrix, label, lang));
  steps.push({
    phase,
    description: words(
      lang,
      "係數行列式非零：每個未知數等於替換直欄後的行列式除以係數行列式。",
      "The coefficient determinant is nonzero: each unknown is the replaced-column determinant divided by the coefficient determinant."
    ),
    latex: `\\det(${label})=${ratToLatex(cramer.determinant)}\\ne0,\\qquad u_i=\\frac{\\det(${label}_i)}{\\det(${label})}`,
  });
  cramer.replacements.forEach(replacement => {
    const variable = variables[replacement.column];
    const replacedLabel = `${label}_{${replacement.column + 1}}`;
    steps.push({
      phase: words(lang, "逐一直欄替換", "Replace each column"),
      description: words(
        lang,
        `求 ${variable.label}：把 ${label} 的第 ${replacement.column + 1} 直欄換成常數向量 ${constantLabel}，其餘直欄不變。${replacedLabel} 的下標表示被替換的直欄，不是橫列。`,
        `To find ${variable.label}, replace column ${replacement.column + 1} of ${label} by ${constantLabel}; leave the other columns unchanged. The subscript identifies the replaced column, not a row.`
      ),
      latex: `${replacedLabel}=${ratMatLatex(replacement.matrix)}`,
    });
    steps.push(...determinantSteps(replacement.matrix, replacedLabel, lang));
    steps.push({
      phase: words(lang, "行列式比值與約分", "Determinant ratio & reduction"),
      description: words(
        lang,
        `${variable.label} 是第 ${replacement.column + 1} 個實數未知數。代入兩個精確行列式，比值約分後得到此未知數。`,
        `${variable.label} is real unknown ${replacement.column + 1}. Substitute the two exact determinants and reduce their ratio.`
      ),
      latex: `${variable.latex}=\\frac{\\det(${replacedLabel})}{\\det(${label})}=\\frac{${ratToLatex(replacement.determinant)}}{${ratToLatex(cramer.determinant)}}=${ratToLatex(replacement.value)}`,
    });
  });
  steps.push({
    phase: words(lang, "解向量", "Solution vector"),
    description: words(
      lang,
      "保持原未知數的順序，組合所有行列式比值得到唯一解。",
      "Keep the original unknown order and combine all determinant ratios into the unique solution."
    ),
    latex: solutionLatex,
  });
  A.forEach((row, i) =>
    steps.push({
      phase: words(lang, "代回全部原方程", "Verify every original equation"),
      description: words(
        lang,
        `代回原方程 ${i + 1}：以精確分數計算左側，等於原常數 b${i + 1}。${taxonomy.m !== taxonomy.n ? "這一步也檢查未選入方陣的額外方程。" : ""}`,
        `Substitute into original equation ${i + 1}: its exact rational left side equals b${i + 1}. ${taxonomy.m !== taxonomy.n ? "This also checks equations outside the selected square subsystem." : ""}`
      ),
      latex: `${row.map((cell, j) => `(${ratToLatex(fromFloat(cell))})\\underbrace{(${ratToLatex(cramer.replacements[j].value)})}_{${variables[j].latex}}`).join("+")}=${ratToLatex(cramer.verification[i].lhs)}=b_{${i + 1}}=${ratToLatex(cramer.verification[i].rhs)}`,
    })
  );
  return {
    taxonomy,
    result,
    variables,
    parameters,
    steps,
    gaussianSteps,
    solutionLatex,
    cramer,
  };
}

export const SYSTEM_PRESETS = [
  {
    id: "unique",
    zh: "唯一解",
    en: "Unique",
    A: [
      [2, 1],
      [1, -1],
    ],
    b: [1, 0],
  },
  {
    id: "infinite",
    zh: "相依／無限多解",
    en: "Dependent / infinite",
    A: [
      [1, 2],
      [2, 4],
    ],
    b: [3, 6],
  },
  {
    id: "none",
    zh: "不相容／無解",
    en: "Inconsistent",
    A: [
      [1, 2],
      [2, 4],
    ],
    b: [3, 7],
  },
  {
    id: "homogeneous-unique",
    zh: "齊次／只有零解",
    en: "Homogeneous / zero only",
    A: [
      [2, 1],
      [1, -1],
    ],
    b: [0, 0],
  },
  {
    id: "homogeneous-infinite",
    zh: "齊次／非平凡解",
    en: "Homogeneous / non-trivial",
    A: [
      [1, 2, -1],
      [2, 4, -2],
    ],
    b: [0, 0],
  },
] as const;
