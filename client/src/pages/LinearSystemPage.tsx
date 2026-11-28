import { useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
import PracticePanel from "@/components/PracticePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { solveLinearSystem, type SystemResult } from "@/lib/linearSystem";
import { matInverse, type MatrixResult } from "@/lib/matrixMath";
import { ratToLatex, ratAugLatex } from "@/lib/rational";
import {
  Phase20systemsDecimal,
  Phase20systemsInverseSteps,
  type Phase20systemsStep,
} from "@/lib/Phase20systems";
import {
  buildSystemTeaching,
  customizeSystemSteps,
  defaultSystemVariables,
  validateSystemVariables,
  SYSTEM_PRESETS,
} from "@/lib/systemTeaching";
import { generateLinearSystemQuestion } from "@/lib/practiceGenerator";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Infinity, XCircle } from "lucide-react";

type PlaybackPosition = { index: number; mode: "all" | "playback" };
type SolvedInput = {
  coefficients: number[][];
  constants: number[];
  names: string[];
  result: SystemResult;
  inverse: MatrixResult | null;
};
const initialPosition: PlaybackPosition = { index: -1, mode: "all" };
const makeGrid = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, () => Array(cols).fill(0));

function DerivationContext({
  steps,
  position,
  lang,
  columns,
}: {
  steps: Phase20systemsStep[];
  position: PlaybackPosition;
  lang: "zh" | "en";
  columns: string;
}) {
  const index =
    position.mode === "all"
      ? steps.length - 1
      : Math.max(0, Math.min(position.index, steps.length - 1));
  const current = steps[index];
  if (!current) return null;
  return (
    <section
      className="min-w-0 rounded-xl border border-accent/25 bg-accent/5 p-3 space-y-2"
      aria-label={lang === "zh" ? "目前推導階段" : "Current derivation stage"}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-accent">{current.phase}</span>
        <span className="font-mono text-muted-foreground">
          {position.mode === "all"
            ? lang === "zh"
              ? "總覽 · 最終狀態"
              : "Overview · final state"
            : `${index + 1} / ${steps.length}`}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {current.description}
      </p>
      {current.snapshotLatex && (
        <>
          <p className="text-xs font-medium">{columns}</p>
          <div className="overflow-x-auto py-1">
            <KatexRenderer latex={current.snapshotLatex} displayMode />
          </div>
        </>
      )}
    </section>
  );
}

function VocabularyReference({ lang }: { lang: "zh" | "en" }) {
  const zh = lang === "zh";
  return (
    <section className="rounded-xl border border-accent/25 bg-accent/5 p-4 space-y-3">
      <h2 className="font-semibold text-sm">
        {zh
          ? "解法決策 · Vocabulary & decision"
          : "Vocabulary & method decision"}
      </h2>
      <div className="grid gap-2 sm:grid-cols-3 text-xs leading-relaxed">
        <div className="rounded-lg bg-card p-3">
          <strong className="block mb-1">
            {zh ? "唯一解 → Cramer's rule" : "Unique → Cramer's rule"}
          </strong>
          <KatexRenderer latex="r_A=r_{Ab}=n" />
        </div>
        <div className="rounded-lg bg-card p-3">
          <strong className="block mb-1">
            {zh ? "無限多解 → Gaussian" : "Infinite → Gaussian"}
          </strong>
          <KatexRenderer latex="r_A=r_{Ab}<n" />
        </div>
        <div className="rounded-lg bg-card p-3">
          <strong className="block mb-1">
            {zh ? "無解 → Gaussian" : "None → Gaussian"}
          </strong>
          <KatexRenderer latex="r_A<r_{Ab}" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {zh
          ? "r_A = rank(A)，r_Ab = rank([A|b])；n 是未知數數目。先判斷秩，再選解法。"
          : "r_A = rank(A), r_Ab = rank([A|b]); n counts unknowns. Check ranks before selecting a method."}
      </p>
      <details className="rounded-lg border border-border bg-card p-3">
        <summary className="cursor-pointer text-sm font-medium">
          {zh
            ? "展開中英詞彙與齊次定理"
            : "Expand terminology & the homogeneous theorem"}
        </summary>
        <dl className="grid gap-3 sm:grid-cols-2 mt-4 text-xs leading-relaxed">
          <div>
            <dt className="font-semibold">
              {zh ? "consistent · 相容／一致" : "Consistent"}
            </dt>
            <dd className="text-muted-foreground">
              {zh
                ? "至少一個解：包含唯一解與無限多解。"
                : "At least one solution: unique or infinitely many."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              {zh ? "inconsistent · 不相容／不一致" : "Inconsistent"}
            </dt>
            <dd className="text-muted-foreground">
              {zh
                ? "沒有解；消去後出現 0 = 非零常數。"
                : "No solution; elimination exposes 0 = a nonzero constant."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              {zh ? "homogeneous · 齊次" : "Homogeneous"}
            </dt>
            <dd className="text-muted-foreground">
              {zh
                ? "每個 bᵢ = 0，必定相容；零向量永遠是解。"
                : "Every b entry is zero. Always consistent; the zero vector is a solution."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              {zh ? "non-homogeneous · 非齊次" : "Non-homogeneous"}
            </dt>
            <dd className="text-muted-foreground">
              {zh
                ? "至少一個 bᵢ ≠ 0；可有唯一解、無限多解或無解。"
                : "At least one b entry is nonzero; any of the three solution types is possible."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              {zh
                ? "trivial / non-trivial · 平凡／非平凡解"
                : "Trivial / non-trivial solution"}
            </dt>
            <dd className="text-muted-foreground">
              {zh
                ? "平凡解是所有未知數為 0；非平凡解至少有一個非零分量。齊次且 rank(A)<n 有非平凡解，rank(A)=n 則只有零解。"
                : "Trivial means all unknowns are zero; non-trivial means at least one is nonzero. A homogeneous system has non-trivial solutions iff rank(A)<n; rank(A)=n gives zero only."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              {zh
                ? "rank / free variable · 秩／自由變數"
                : "Rank / free variable"}
            </dt>
            <dd className="text-muted-foreground">
              {zh
                ? "秩是主元數。[A|b] 包含常數欄。相容時自由變數數目是 n−rank(A)，各可獨立選任意實數。"
                : "Rank counts pivots. [A|b] includes the constant column. A consistent system has n−rank(A) independent free variables."}
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

export default function LinearSystemPage() {
  const { t, lang } = useLanguage();
  const zh = lang === "zh";
  const genQuestion = useCallback(
    () => generateLinearSystemQuestion(lang),
    [lang]
  );
  const [numEq, setNumEq] = useState(2);
  const [numVar, setNumVar] = useState(2);
  const [coeffs, setCoeffs] = useState<number[][]>(makeGrid(2, 2));
  const [consts, setConsts] = useState<number[]>(Array(2).fill(0));
  const [rawNames, setRawNames] = useState(["x1", "x2"]);
  const [solvedInput, setSolvedInput] = useState<SolvedInput | null>(null);
  const [runId, setRunId] = useState(0);
  const [primaryPosition, setPrimaryPosition] =
    useState<PlaybackPosition>(initialPosition);
  const [gaussianPosition, setGaussianPosition] =
    useState<PlaybackPosition>(initialPosition);
  const [inversePosition, setInversePosition] =
    useState<PlaybackPosition>(initialPosition);
  const [error, setError] = useState<string | null>(null);
  const onPrimaryStepChange = useCallback(
    (index: number, mode: "all" | "playback") => {
      setPrimaryPosition(previous =>
        previous.index === index && previous.mode === mode
          ? previous
          : { index, mode }
      );
    },
    []
  );
  const onGaussianStepChange = useCallback(
    (index: number, mode: "all" | "playback") => {
      setGaussianPosition(previous =>
        previous.index === index && previous.mode === mode
          ? previous
          : { index, mode }
      );
    },
    []
  );
  const onInverseStepChange = useCallback(
    (index: number, mode: "all" | "playback") => {
      setInversePosition(previous =>
        previous.index === index && previous.mode === mode
          ? previous
          : { index, mode }
      );
    },
    []
  );
  const validated = useMemo(
    () => validateSystemVariables(rawNames, numVar),
    [rawNames, numVar]
  );
  const variables = validated.valid
    ? validated.variables
    : defaultSystemVariables(numVar);
  const nameError = !validated.valid
    ? validated.error === "duplicate"
      ? zh
        ? "未知數名稱不能重複；α 與 \\alpha 視為相同。"
        : "Unknown names must be distinct; alpha Unicode and its command count as the same name."
      : zh
        ? "請使用單一英文字母（可加數字下標），或小寫希臘字母／安全命令，例如 α、\\alpha。"
        : "Use a Latin letter (optional numeric subscript), a lowercase Greek letter, or a safe command such as alpha preceded by a backslash."
    : null;
  const teaching = useMemo(
    () =>
      solvedInput
        ? buildSystemTeaching(
            solvedInput.coefficients,
            solvedInput.constants,
            lang,
            solvedInput.names,
            solvedInput.result
          )
        : null,
    [solvedInput, lang]
  );
  const inverseSteps = useMemo(() => {
    if (!solvedInput || !teaching) return [];
    const steps = customizeSystemSteps(
      Phase20systemsInverseSteps(
        solvedInput.inverse,
        solvedInput.coefficients,
        solvedInput.constants,
        lang
      ),
      teaching.variables,
      teaching.parameters
    );
    // Share the explicit custom unknown vector, not the old default x context.
    steps[0] = { ...teaching.gaussianSteps[0], snapshotLatex: undefined };
    steps[1] = { ...teaching.gaussianSteps[1], snapshotLatex: undefined };
    return steps;
  }, [solvedInput, teaching, lang]);
  const result = teaching?.result;
  const taxonomy = teaching?.taxonomy;
  const columns =
    (zh ? "係數直欄依序對應：" : "Coefficient columns, in order: ") +
    variables.map(variable => variable.label).join(", ") +
    (zh ? "；分隔線右側為常數。" : "; constants are right of the divider.");

  function invalidateResult() {
    setSolvedInput(null);
    setError(null);
    setPrimaryPosition(initialPosition);
    setGaussianPosition(initialPosition);
    setInversePosition(initialPosition);
  }
  function resizeSystem(eq: number, vr: number) {
    setNumEq(eq);
    setNumVar(vr);
    setCoeffs(makeGrid(eq, vr));
    setConsts(Array(eq).fill(0));
    setRawNames(Array.from({ length: vr }, (_, i) => `x${i + 1}`));
    invalidateResult();
  }
  function handleCoeffChange(r: number, c: number, val: string) {
    const num = parseFloat(val);
    setCoeffs(previous =>
      previous.map((row, ri) =>
        row.map((cell, ci) =>
          ri === r && ci === c ? (isNaN(num) ? 0 : num) : cell
        )
      )
    );
    invalidateResult();
  }
  function handleConstChange(r: number, val: string) {
    const num = parseFloat(val);
    setConsts(previous =>
      previous.map((value, i) => (i === r ? (isNaN(num) ? 0 : num) : value))
    );
    invalidateResult();
  }
  function handleSolve() {
    invalidateResult();
    try {
      if (
        !validated.valid ||
        ![...coeffs.flat(), ...consts].every(Number.isFinite)
      )
        throw new Error("Invalid input");
      const coefficients = coeffs.map(row => [...row]);
      const constants = [...consts];
      const res = solveLinearSystem(coefficients, constants);
      buildSystemTeaching(coefficients, constants, lang, rawNames, res); // Exact cross-model and verification guards before display.
      let inverse: MatrixResult | null = null;
      if (numEq === numVar) {
        try {
          inverse = matInverse(coefficients);
        } catch {
          inverse = { steps: [], error: "unavailable" };
        }
      }
      setSolvedInput({
        coefficients,
        constants,
        names: [...rawNames],
        result: res,
        inverse,
      });
      setRunId(previous => previous + 1);
    } catch {
      setError(
        zh
          ? "輸入無效或精確模型驗證未通過，請檢查數值與未知數名稱。"
          : "Invalid input or an exact model verification failed. Check values and unknown names."
      );
    }
  }
  function handleReset() {
    setCoeffs(makeGrid(numEq, numVar));
    setConsts(Array(numEq).fill(0));
    invalidateResult();
  }
  function loadPreset(preset: (typeof SYSTEM_PRESETS)[number]) {
    const n = preset.A[0].length;
    setNumEq(preset.A.length);
    setNumVar(n);
    setCoeffs(preset.A.map(row => [...row]));
    setConsts([...preset.b]);
    setRawNames(
      Array.from({ length: n }, (_, i) => rawNames[i] ?? `x${i + 1}`)
    );
    invalidateResult();
  }
  const systemLatex = coeffs.map((row, i) => {
    let terms = "";
    row.forEach((coefficient, j) => {
      if (coefficient === 0 || !Number.isFinite(coefficient)) return;
      const magnitude = ratToLatex(
        Phase20systemsDecimal(Math.abs(coefficient))
      );
      const term = `${magnitude === "1" ? "" : magnitude}${variables[j].latex}`;
      terms += terms
        ? ` ${coefficient < 0 ? "-" : "+"} ${term}`
        : `${coefficient < 0 ? "-" : ""}${term}`;
    });
    return `${terms || "0"} &= ${Number.isFinite(consts[i]) ? ratToLatex(Phase20systemsDecimal(consts[i])) : "\\text{invalid}"}`;
  });
  const inputAugmentedLatex = useMemo(
    () =>
      [...coeffs.flat(), ...consts].every(Number.isFinite)
        ? ratAugLatex(
            coeffs.map((row, i) => [
              ...row.map(Phase20systemsDecimal),
              Phase20systemsDecimal(consts[i]),
            ]),
            numVar
          )
        : "\\text{Invalid input}",
    [coeffs, consts, numVar]
  );

  return (
    <div className="systems-workspace space-y-6 min-w-0">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest font-mono text-accent">
          {zh ? "方程 · 解集合 · 方法" : "Equations · solution sets · methods"}
        </p>
        <h1 className="text-2xl font-bold">{t.linearSystem}</h1>
        <p className="text-sm text-muted-foreground">
          {zh
            ? "唯一解用 Cramer；其餘用 Gaussian。先理解分類，再跟著精確步驟求解。"
            : "Cramer for unique solutions; Gaussian for the others. Classify first, then follow exact worked steps."}
        </p>
      </header>
      <Tabs defaultValue="calc">
        <TabsList className="flex flex-wrap h-auto w-fit">
          <TabsTrigger value="calc">{t.calcMode}</TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>
        <TabsContent value="practice" className="mt-4">
          <PracticePanel
            generateQuestion={genQuestion}
            moduleLabel={
              zh ? "方程組與詞彙練習" : "Systems & vocabulary practice"
            }
          />
        </TabsContent>
        <TabsContent value="calc" className="mt-5 space-y-5">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-5">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <h2 className="font-semibold">
                {zh ? "01 · 建立方程組" : "01 · Set up your system"}
              </h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <label
                  className="flex gap-2 items-center"
                  htmlFor="systems-equations"
                >
                  {t.numEquations}
                  <select
                    id="systems-equations"
                    value={numEq}
                    onChange={e => resizeSystem(Number(e.target.value), numVar)}
                    className="h-9 px-2 rounded-lg border border-border bg-background"
                  >
                    {[2, 3, 4, 5].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label
                  className="flex gap-2 items-center"
                  htmlFor="systems-variables"
                >
                  {t.numVariables}
                  <select
                    id="systems-variables"
                    value={numVar}
                    onChange={e => resizeSystem(numEq, Number(e.target.value))}
                    className="h-9 px-2 rounded-lg border border-border bg-background"
                  >
                    {[2, 3, 4, 5].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset(preset)}
                  className="h-auto min-h-8 text-xs whitespace-normal"
                >
                  {zh ? preset.zh : preset.en}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                {zh ? "未知數名稱與意義" : "Unknown names & meaning"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {rawNames.map((name, i) => (
                  <label
                    key={i}
                    className="text-xs text-muted-foreground space-y-1"
                  >
                    {zh ? `未知數 ${i + 1}` : `Unknown ${i + 1}`}
                    <input
                      value={name}
                      maxLength={16}
                      onChange={e => {
                        setRawNames(previous =>
                          previous.map((value, j) =>
                            i === j ? e.target.value : value
                          )
                        );
                        invalidateResult();
                      }}
                      aria-invalid={!validated.valid}
                      className="block w-20 rounded-lg border border-border px-2 py-2 bg-background text-foreground font-mono"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {zh
                  ? "使用英文字母、α / β 等小寫希臘字母，或 \\alpha 等安全命令。它們是待求實數，並非係數；每條方程保持相同順序。"
                  : "Use Latin letters, lowercase Greek letters, or safe Greek commands. These are real unknowns, not coefficients; keep their order identical in every equation."}
              </p>
              {nameError && (
                <p role="alert" className="text-xs text-destructive">
                  {nameError}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="min-w-0 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.coefficients} · A & b
                </h3>
                <div className="overflow-x-auto">
                  <table className="border-separate border-spacing-1">
                    <thead>
                      <tr>
                        <th className="w-8">
                          <span className="sr-only">
                            {zh ? "方程" : "Equation"}
                          </span>
                        </th>
                        {variables.map((variable, j) => (
                          <th key={j} className="w-14 text-xs font-normal">
                            <KatexRenderer latex={variable.latex} />
                          </th>
                        ))}
                        <th className="w-14 text-xs">b</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coeffs.map((row, r) => (
                        <tr key={r}>
                          <td className="text-xs text-muted-foreground text-center">
                            R{r + 1}
                          </td>
                          {row.map((cell, c) => (
                            <td key={c}>
                              <input
                                type="number"
                                step="any"
                                value={cell === 0 ? "" : cell}
                                placeholder="0"
                                onChange={e =>
                                  handleCoeffChange(r, c, e.target.value)
                                }
                                className="matrix-cell"
                                aria-label={
                                  zh
                                    ? `第 ${r + 1} 條方程，${variables[c].label} 的係數`
                                    : `Equation ${r + 1}, coefficient of ${variables[c].label}`
                                }
                              />
                            </td>
                          ))}
                          <td>
                            <input
                              type="number"
                              step="any"
                              value={consts[r] === 0 ? "" : consts[r]}
                              placeholder="0"
                              onChange={e =>
                                handleConstChange(r, e.target.value)
                              }
                              className="matrix-cell border-accent/40 bg-accent/5"
                              aria-label={
                                zh
                                  ? `第 ${r + 1} 條方程，常數 b${r + 1}`
                                  : `Equation ${r + 1}, constant b${r + 1}`
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {zh
                    ? "空白為 0。任何輸入修改都會清除舊結果與播放。"
                    : "Blank means 0. Any edit clears old results and playback."}
                </p>
              </div>
              <div className="min-w-0 rounded-xl bg-secondary/30 p-3 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  {zh ? "方程預覽" : "Equation preview"}
                </h3>
                <div className="overflow-x-auto">
                  <KatexRenderer
                    latex={`\\begin{cases}${systemLatex.join(" \\\\ ")}\\end{cases}`}
                    displayMode
                  />
                </div>
                <details>
                  <summary className="text-xs cursor-pointer">
                    {t.augmentedMatrix} [A | b]
                  </summary>
                  <div className="overflow-x-auto">
                    <KatexRenderer latex={inputAugmentedLatex} displayMode />
                  </div>
                  <p className="text-xs text-muted-foreground">{columns}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {zh
                      ? "此預覽保留輸入十進位；求解分類使用既有 fromFloat 有理數模型，若轉換有差異會標明近似。"
                      : "This preview preserves decimal entries. Solving uses the existing fromFloat rational model; any conversion difference is flagged as approximate."}
                  </p>
                </details>
              </div>
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">
                {zh
                  ? "係數、維度與橫列的意義"
                  : "Coefficients, dimensions & rows"}
              </summary>
              <p className="mt-2 leading-relaxed">
                {zh
                  ? `aᵢⱼ 是第 i 條方程中第 j 個未知數的係數；bᵢ 是右側常數。m=${numEq} 是方程數，n=${numVar} 是未知數數目。Rᵢ 是整個第 i 橫列；列運算也必須作用於常數。`
                  : `a(i,j) is the coefficient of unknown j in equation i; b(i) is its constant. m=${numEq} equations and n=${numVar} unknowns. R(i) is the entire row; row operations must include its constant.`}
              </p>
              <div className="overflow-x-auto">
                <KatexRenderer
                  latex={`A\\in\\mathbb{R}^{${numEq}\\times${numVar}},\\quad\\mathbf{u}\\in\\mathbb{R}^{${numVar}},\\quad b\\in\\mathbb{R}^{${numEq}},\\quad A\\mathbf{u}=b`}
                  displayMode
                />
              </div>
            </details>
            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleSolve} disabled={!validated.valid}>
                {t.solve}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                {t.reset}
              </Button>
            </div>
          </section>
          <details className="systems-reference rounded-xl border border-border bg-card">
            <summary className="p-4 text-sm font-medium">
              {zh ? "方法與詞彙速查" : "Method & vocabulary reference"}
            </summary>
            <div className="border-t border-border p-3">
              <VocabularyReference lang={lang} />
            </div>
          </details>
          {error && (
            <div
              role="alert"
              className="flex gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {teaching && result && taxonomy && !error && (
            <>
              <section
                className="rounded-xl border border-accent/30 bg-card p-4 sm:p-5 space-y-4"
                aria-live="polite"
              >
                <h2 className="font-semibold">
                  {zh
                    ? "02 · 分類與解集合"
                    : "02 · Classification & solution set"}
                </h2>
                <div
                  className={`flex flex-wrap gap-2 items-center rounded-lg p-3 ${result.type === "none" ? "bg-destructive/10 text-destructive" : "bg-accent/5 text-accent"}`}
                >
                  {result.type === "unique" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : result.type === "none" ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <Infinity className="w-4 h-4" />
                  )}
                  <strong className="text-sm">
                    {result.type === "unique"
                      ? t.uniqueSolution
                      : result.type === "none"
                        ? t.noSolution
                        : t.infiniteSolutions}
                  </strong>
                  {taxonomy.approximate && (
                    <span className="text-xs">
                      {zh ? "有理數近似模型" : "Rational approximation model"}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {zh ? "一致性 · Consistency" : "Consistency"}
                    </p>
                    <strong>
                      {taxonomy.consistent
                        ? zh
                          ? "相容 · consistent"
                          : "Consistent"
                        : zh
                          ? "不相容 · inconsistent"
                          : "Inconsistent"}
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      {taxonomy.consistent
                        ? zh
                          ? "至少一個解"
                          : "At least one solution"
                        : zh
                          ? "沒有解"
                          : "No solution"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {zh ? "右側常數 · Homogeneity" : "Homogeneity"}
                    </p>
                    <strong>
                      {taxonomy.homogeneous
                        ? zh
                          ? "齊次 · homogeneous"
                          : "Homogeneous"
                        : zh
                          ? "非齊次 · non-homogeneous"
                          : "Non-homogeneous"}
                    </strong>
                    <p className="text-xs text-muted-foreground mt-1">
                      {taxonomy.homogeneous ? "b = 0" : "b ≠ 0"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {zh ? "精確秩 · Exact ranks" : "Exact ranks"}
                    </p>
                    <KatexRenderer
                      latex={`\\operatorname{rank}(A)=${taxonomy.rankA},\\quad\\operatorname{rank}([A|b])=${taxonomy.rankAugmented}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      n = {taxonomy.n} · {zh ? "自由變數" : "free variables"}:{" "}
                      {taxonomy.consistent ? taxonomy.freeCount : "—"}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {taxonomy.approximate
                    ? zh
                      ? "至少一個輸入被既有 fromFloat 轉為近似有理數。以下秩、齊次性、行列式、分類與代回驗證都在同一模型內精確；相對原輸入則是近似結果。"
                      : "At least one entry was rationalized approximately by the existing fromFloat model. Ranks, homogeneity, determinants, classification and verification below are exact in that same model, but approximate relative to the original entries."
                    : zh
                      ? "以下使用求解器保留的精確分數，秩與行列式以 bigint 判零，不用浮點容差。舊逆矩陣比較的數值限制會另外標明。"
                      : "Results use preserved exact fractions; ranks and determinants use bigint zero tests, not floating tolerances. Numerical limitations of the old inverse comparison are marked separately."}
                </p>
                {teaching.solutionLatex && (
                  <div className="rounded-xl border border-accent/25 bg-accent/5 p-3 overflow-x-auto">
                    <KatexRenderer latex={teaching.solutionLatex} displayMode />
                  </div>
                )}
                {result.type === "infinite" && (
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <KatexRenderer
                        latex={(result.freeVariables ?? [])
                          .map(
                            (variable, i) =>
                              `${teaching.variables[variable].latex}=${teaching.parameters[i]}\\in\\mathbb{R}`
                          )
                          .join(",\\quad ")}
                        displayMode
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {zh
                        ? "每個參數是可獨立選取的任意實數；一組參數對應一個完整解。若 k 已是未知數名稱，參數會改用不衝突的安全符號。"
                        : "Each parameter is an independent arbitrary real number; each choice gives a complete solution. If k names an unknown, a non-colliding parameter symbol is used."}
                    </p>
                  </div>
                )}
                {result.type === "none" && (
                  <p className="text-sm text-destructive">
                    {zh
                      ? "矛盾行要求 0 等於非零常數，沒有任何未知向量能同時滿足全部方程。"
                      : "A contradiction requires 0 to equal a nonzero constant; no unknown vector satisfies all equations."}
                  </p>
                )}
                {taxonomy.homogeneous && (
                  <p className="rounded-lg bg-secondary/30 p-3 text-sm">
                    {taxonomy.nontrivialSolutions
                      ? zh
                        ? "零向量是平凡解；因 rank(A)<n，也存在非平凡解。任意參數不全為零即可得到非零解。"
                        : "Zero is the trivial solution. Since rank(A)<n, non-trivial solutions exist too; choose parameters not all zero."
                      : zh
                        ? "rank(A)=n：只有平凡解，即所有未知數為零。齊次系統不可能不相容。"
                        : "rank(A)=n: only the trivial solution exists, with every unknown zero. A homogeneous system cannot be inconsistent."}
                  </p>
                )}
              </section>
              <section className="rounded-xl border border-border bg-card p-4 sm:p-5 min-w-0 space-y-4">
                <h2 className="font-semibold">
                  {zh ? "03 · 主要解法" : "03 · Primary derivation"} ·{" "}
                  {result.type === "unique"
                    ? "Cramer's rule"
                    : "Gaussian elimination"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {result.type === "unique"
                    ? zh
                      ? "係數行列式 → 每個替換直欄 → 精確比值 → 所有原方程代回驗證。長方形系統只對獨立方陣子系統使用 Cramer。"
                      : "Coefficient determinant → each replaced column → exact ratios → verify all original equations. Rectangular systems use Cramer only on an independent square subsystem."
                    : zh
                      ? "增廣矩陣 → 每次消去與回代 → 明確矛盾行或任意參數通解。"
                      : "Augmented matrix → every elimination and reduction → explicit contradiction or arbitrary-parameter family."}
                </p>
                <DerivationContext
                  steps={teaching.steps}
                  position={primaryPosition}
                  lang={lang}
                  columns={columns}
                />
                <StepDisplay
                  key={`primary-${runId}-${lang}`}
                  steps={teaching.steps}
                  title={zh ? "完整主要推導" : "Complete primary derivation"}
                  onStepChange={onPrimaryStepChange}
                />
              </section>
              <details className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <summary className="cursor-pointer font-semibold text-sm">
                  {zh
                    ? "比較其他方法 · 高斯消元／逆矩陣（各自獨立播放）"
                    : "Compare methods · Gaussian / inverse (independent players)"}
                </summary>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5 items-start">
                  <section className="min-w-0 space-y-3">
                    <h3 className="text-sm font-semibold text-accent">
                      {zh ? "高斯消元比較" : "Gaussian comparison"}
                    </h3>
                    <DerivationContext
                      steps={teaching.gaussianSteps}
                      position={gaussianPosition}
                      lang={lang}
                      columns={columns}
                    />
                    <StepDisplay
                      key={`gaussian-${runId}-${lang}`}
                      steps={teaching.gaussianSteps}
                      title={
                        zh ? "完整高斯消元推導" : "Complete Gaussian derivation"
                      }
                      onStepChange={onGaussianStepChange}
                    />
                  </section>
                  <section className="min-w-0 space-y-3">
                    <h3 className="text-sm font-semibold text-accent">
                      {zh ? "逆矩陣法比較" : "Inverse-method comparison"}
                    </h3>
                    <DerivationContext
                      steps={inverseSteps}
                      position={inversePosition}
                      lang={lang}
                      columns={
                        zh
                          ? "左側 A → I，右側 I → A⁻¹。"
                          : "Left: A → I. Right: I → A⁻¹."
                      }
                    />
                    <StepDisplay
                      key={`inverse-${runId}-${lang}`}
                      steps={inverseSteps}
                      title={
                        zh
                          ? "完整逆矩陣法推導"
                          : "Complete inverse-method derivation"
                      }
                      onStepChange={onInverseStepChange}
                    />
                  </section>
                </div>
              </details>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
