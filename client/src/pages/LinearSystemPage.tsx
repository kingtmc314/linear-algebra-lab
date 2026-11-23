// LinearSystemPage — independent Gaussian and inverse-method derivation playback.
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
  Phase20systemsDecimal, Phase20systemsGeneralLatex, Phase20systemsGaussianSteps,
  Phase20systemsInverseSteps, Phase20systemsInputIsApproximate,
  Phase20systemsParameterNames, type Phase20systemsStep,
} from "@/lib/Phase20systems";
import { generateLinearSystemQuestion } from "@/lib/practiceGenerator";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Infinity, XCircle } from "lucide-react";

type PlaybackPosition = { index: number; mode: "all" | "playback" };
type SolvedInput = { coefficients: number[][]; constants: number[] };
const initialPosition: PlaybackPosition = { index: -1, mode: "all" };

function makeGrid(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function DerivationContext({ steps, position, lang, matrixKind }: {
  steps: Phase20systemsStep[];
  position: PlaybackPosition;
  lang: "zh" | "en";
  matrixKind: "system" | "inverse";
}) {
  const index = position.mode === "all" ? steps.length - 1 : Math.max(0, Math.min(position.index, steps.length - 1));
  const current = steps[index];
  if (!current) return null;
  return (
    <section className="min-w-0 rounded-lg border border-accent/25 bg-accent/5 p-3 space-y-2" aria-label={lang === "zh" ? "目前推導階段" : "Current derivation stage"}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-accent">{current.phase}</span>
        <span className="font-mono text-muted-foreground">
          {position.mode === "all" ? (lang === "zh" ? "總覽 · 最終狀態" : "Overview · final state") : `${index + 1} / ${steps.length}`}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{current.description}</p>
      {current.snapshotLatex && (
        <>
          <p className="text-xs font-medium text-foreground">
            {matrixKind === "system"
              ? (lang === "zh" ? "此步驟的增廣矩陣：直欄依序為 x₁、x₂、…，分隔線右側為常數。" : "Augmented snapshot: columns follow x₁, x₂, …; constants are right of the divider.")
              : (lang === "zh" ? "此步驟的求逆增廣矩陣：左側追蹤 A → I，右側追蹤 I → A⁻¹。" : "Inverse snapshot: the left block follows A → I; the right block follows I → A⁻¹.")}
          </p>
          <div className="overflow-x-auto py-1">
            <KatexRenderer latex={current.snapshotLatex} displayMode />
          </div>
        </>
      )}
    </section>
  );
}

export default function LinearSystemPage() {
  const { t, lang } = useLanguage();
  const genQuestion = useCallback(() => generateLinearSystemQuestion(lang), [lang]);
  const [numEq, setNumEq] = useState(2);
  const [numVar, setNumVar] = useState(2);
  const [coeffs, setCoeffs] = useState<number[][]>(makeGrid(2, 2));
  const [consts, setConsts] = useState<number[]>(Array(2).fill(0));
  const [result, setResult] = useState<SystemResult | null>(null);
  const [inverseResult, setInverseResult] = useState<MatrixResult | null>(null);
  const [solvedInput, setSolvedInput] = useState<SolvedInput | null>(null);
  const [runId, setRunId] = useState(0);
  const [gaussianPosition, setGaussianPosition] = useState<PlaybackPosition>(initialPosition);
  const [inversePosition, setInversePosition] = useState<PlaybackPosition>(initialPosition);
  const [error, setError] = useState<string | null>(null);

  // Stable callbacks keep the two shared players independent without page-owned timers.
  const onGaussianStepChange = useCallback((index: number, mode: "all" | "playback") => {
    setGaussianPosition(previous => previous.index === index && previous.mode === mode ? previous : { index, mode });
  }, []);
  const onInverseStepChange = useCallback((index: number, mode: "all" | "playback") => {
    setInversePosition(previous => previous.index === index && previous.mode === mode ? previous : { index, mode });
  }, []);

  const gaussianSteps = useMemo(() => result && solvedInput
    ? Phase20systemsGaussianSteps(result, solvedInput.coefficients, solvedInput.constants, lang) : [], [result, solvedInput, lang]);
  const inverseSteps = useMemo(() => result && solvedInput
    ? Phase20systemsInverseSteps(inverseResult, solvedInput.coefficients, solvedInput.constants, lang) : [], [result, inverseResult, solvedInput, lang]);
  const approximateInput = useMemo(() => solvedInput
    ? Phase20systemsInputIsApproximate(solvedInput.coefficients, solvedInput.constants) : false, [solvedInput]);

  function invalidateResult() {
    setResult(null);
    setInverseResult(null);
    setSolvedInput(null);
    setGaussianPosition(initialPosition);
    setInversePosition(initialPosition);
    setError(null);
  }

  function resizeSystem(eq: number, vr: number) {
    setNumEq(eq);
    setNumVar(vr);
    setCoeffs(makeGrid(eq, vr));
    setConsts(Array(eq).fill(0));
    invalidateResult();
  }

  function handleCoeffChange(r: number, c: number, val: string) {
    const num = parseFloat(val);
    setCoeffs(previous => previous.map((row, ri) => row.map((cell, ci) =>
      ri === r && ci === c ? (isNaN(num) ? 0 : num) : cell)));
    invalidateResult();
  }

  function handleConstChange(r: number, val: string) {
    const num = parseFloat(val);
    setConsts(previous => previous.map((value, i) => i === r ? (isNaN(num) ? 0 : num) : value));
    invalidateResult();
  }

  function handleSolve() {
    invalidateResult();
    try {
      if (![...coeffs.flat(), ...consts].every(Number.isFinite)) throw new Error("Invalid input");
      const input = { coefficients: coeffs.map(row => [...row]), constants: [...consts] };
      const res = solveLinearSystem(input.coefficients, input.constants);
      let inverse: MatrixResult | null = null;
      // A failed numerical inverse guard must not discard a valid Gaussian result.
      if (numEq === numVar) {
        try { inverse = matInverse(input.coefficients); }
        catch { inverse = { steps: [], error: "unavailable" }; }
      }
      setSolvedInput(input);
      setResult(res);
      setInverseResult(inverse);
      setRunId(previous => previous + 1);
    } catch {
      setError(t.errInvalidInput);
    }
  }

  function handleReset() {
    setCoeffs(makeGrid(numEq, numVar));
    setConsts(Array(numEq).fill(0));
    invalidateResult();
  }

  function systemLatex(): string {
    const lines = coeffs.map((row, i) => {
      let terms = "";
      row.forEach((coefficient, j) => {
        if (coefficient === 0 || !Number.isFinite(coefficient)) return;
        const magnitude = ratToLatex(Phase20systemsDecimal(Math.abs(coefficient)));
        const term = `${magnitude === "1" ? "" : magnitude}x_{${j + 1}}`;
        terms += terms ? ` ${coefficient < 0 ? "-" : "+"} ${term}` : `${coefficient < 0 ? "-" : ""}${term}`;
      });
      return `${terms || "0"} &= ${Number.isFinite(consts[i]) ? ratToLatex(Phase20systemsDecimal(consts[i])) : "\\text{invalid}"}`;
    });
    return `\\begin{cases} ${lines.join(" \\\\ ")} \\end{cases}`;
  }

  const inputAugmentedLatex = useMemo(() => [...coeffs.flat(), ...consts].every(Number.isFinite)
    ? ratAugLatex(coeffs.map((row, i) => [...row.map(Phase20systemsDecimal), Phase20systemsDecimal(consts[i])]), numVar)
    : "\\text{Invalid input}", [coeffs, consts, numVar]);
  const dims = [2, 3, 4, 5];
  const freeNames = Phase20systemsParameterNames(result?.freeVariables?.length ?? 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'IBM Plex Serif', serif" }}>{t.linearSystem}</h1>
        <p className="text-sm text-muted-foreground mt-1">{numEq} {t.numEquations.toLowerCase()} · {numVar} {t.numVariables.toLowerCase()}</p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {lang === "zh" ? "從方程到增廣矩陣，逐步追蹤每次列運算。高斯消元與逆矩陣法各有獨立播放控制。" : "Follow every row operation from equations to augmented matrices. Gaussian elimination and the inverse method have independent playback controls."}
        </p>
      </div>

      <Tabs defaultValue="calc">
        <TabsList>
          <TabsTrigger value="calc">{t.calcMode}</TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>
        <TabsContent value="practice" className="mt-4">
          <PracticePanel generateQuestion={genQuestion} moduleLabel={lang === "zh" ? "方程組練習" : "Linear System Practice"} />
        </TabsContent>
        <TabsContent value="calc" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2">
              <label htmlFor="systems-equations" className="text-sm font-medium text-muted-foreground">{t.numEquations}:</label>
              <select id="systems-equations" value={numEq} onChange={e => resizeSystem(Number(e.target.value), numVar)} className="h-9 px-2 text-sm border border-border rounded bg-card text-foreground focus:border-accent outline-none">
                {dims.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="systems-variables" className="text-sm font-medium text-muted-foreground">{t.numVariables}:</label>
              <select id="systems-variables" value={numVar} onChange={e => resizeSystem(numEq, Number(e.target.value))} className="h-9 px-2 text-sm border border-border rounded bg-card text-foreground focus:border-accent outline-none">
                {dims.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <section className="p-4 rounded-lg border border-border bg-secondary/30 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{lang === "zh" ? "變數與方程的對應" : "What the variables mean"}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {lang === "zh" ? `x₁ 至 x${numVar} 是待求的實數，所有方程使用相同順序。aᵢⱼ 是第 i 條方程中 xⱼ 的係數，bᵢ 是右側常數。m = ${numEq} 是方程數，n = ${numVar} 是未知數數目。Rᵢ 表示整個第 i 橫列；列運算會連同 bᵢ 一起變換。` : `x₁ through x${numVar} are the real unknowns, in the same order in every equation. aᵢⱼ is the coefficient of xⱼ in equation i; bᵢ is its right-hand constant. m = ${numEq} counts equations and n = ${numVar} counts unknowns. Rᵢ means the entire ith row, including its constant.`}
            </p>
            <div className="overflow-x-auto"><KatexRenderer latex={`A\\in\\mathbb{R}^{${numEq}\\times${numVar}},\\quad\\mathbf{x}\\in\\mathbb{R}^{${numVar}},\\quad\\mathbf{b}\\in\\mathbb{R}^{${numEq}},\\qquad A\\mathbf{x}=\\mathbf{b}`} displayMode /></div>
            <div className="overflow-x-auto"><KatexRenderer latex={systemLatex()} displayMode /></div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="min-w-0 p-4 rounded-lg border border-border bg-card space-y-3">
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">{t.coefficients}</h3>
              <div className="overflow-x-auto">
                <table className="border-separate border-spacing-1">
                  <thead><tr>
                    <th className="text-xs text-muted-foreground font-mono w-8"><span className="sr-only">{lang === "zh" ? "方程" : "Equation"}</span></th>
                    {Array.from({ length: numVar }, (_, j) => <th key={j} className="text-xs text-muted-foreground font-mono text-center w-14">x<sub>{j + 1}</sub></th>)}
                    <th className="text-xs text-muted-foreground font-mono text-center w-14">b</th>
                  </tr></thead>
                  <tbody>{coeffs.map((row, r) => <tr key={r}>
                    <td className="text-xs text-muted-foreground font-mono text-center">R{r + 1}</td>
                    {row.map((cell, c) => <td key={c}>
                      <input type="number" step="any" value={cell === 0 ? "" : cell} placeholder="0" onChange={e => handleCoeffChange(r, c, e.target.value)} className="matrix-cell" aria-label={lang === "zh" ? `第 ${r + 1} 條方程，x${c + 1} 的係數` : `Equation ${r + 1}, coefficient of x${c + 1}`} />
                    </td>)}
                    <td><input type="number" step="any" value={consts[r] === 0 ? "" : consts[r]} placeholder="0" onChange={e => handleConstChange(r, e.target.value)} className="matrix-cell border-accent/40 bg-accent/5" aria-label={lang === "zh" ? `第 ${r + 1} 條方程，右側常數 b${r + 1}` : `Equation ${r + 1}, constant b${r + 1}`} /></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">{lang === "zh" ? "空白視為 0。修改輸入後，請重新求解；舊播放會清除，避免與新方程混淆。" : "Blank entries mean 0. Editing clears prior playback; solve again to match the new equations."}</p>
            </div>
            <div className="min-w-0 p-4 rounded-lg border border-border bg-card space-y-3">
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">{t.augmentedMatrix} [A | b]</h3>
              <div className="overflow-x-auto"><KatexRenderer latex={inputAugmentedLatex} displayMode /></div>
              <p className="text-xs text-muted-foreground leading-relaxed">{lang === "zh" ? "左側 n 個直欄依序是 x₁、x₂、… 的係數，分隔線右側是常數向量 b。此預覽保留輸入十進位的分數值，不以容差猜測簡單分數。" : "The n left columns contain coefficients of x₁, x₂, …; b is right of the divider. This preview preserves decimal input values as fractions without tolerance-based guessing."}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSolve} className="font-mono">{t.solve}</Button>
            <Button variant="outline" onClick={handleReset} className="font-mono">{t.reset}</Button>
          </div>
          {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><p className="text-sm">{error}</p>
          </div>}

          {result && !error && <div className="space-y-4">
            <div className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border ${result.type === "none" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-accent/5 border-accent/30 text-accent"}`}>
              {result.type === "unique" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {result.type === "none" && <XCircle className="w-4 h-4 shrink-0" />}
              {result.type === "infinite" && <Infinity className="w-4 h-4 shrink-0" />}
              <span className="text-sm font-semibold font-mono">{result.type === "unique" ? t.uniqueSolution : result.type === "none" ? t.noSolution : t.infiniteSolutions}</span>
              {approximateInput && <span className="text-xs font-medium">{lang === "zh" ? "（有理數近似模型）" : "(rational approximation model)"}</span>}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground rounded-lg border border-border bg-card p-3">
              {approximateInput
                ? (lang === "zh" ? "近似結果：既有求解器將至少一個輸入轉為有理數近似。以下約分分數與列運算在該模型內精確，但相對於原始輸入只能視為近似；解的分類也針對此模型。" : "Approximate result: the existing solver rationalizes at least one input approximately. Reduced fractions and row operations are exact within that model, not necessarily for the original entries; solution classification also describes this model.")
                : (lang === "zh" ? "分數顯示使用求解器保留的約分分子與分母，而非從浮點答案猜測分數。求逆程式另有數值容差限制，若停止會明確註明。" : "Fraction displays use the solver’s preserved reduced numerators and denominators, not guesses from numeric answers. Any numerical-tolerance limitation of the inverse routine is stated separately.")}
            </p>

            {result.type === "unique" && result.solutionLatex && <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-2">
              <p className="text-xs font-semibold text-accent">{approximateInput ? (lang === "zh" ? "近似模型的解" : "Solution of the approximate model") : t.solution}</p>
              <div className="overflow-x-auto"><KatexRenderer latex={result.solutionLatex.map((value, i) => `x_{${i + 1}}=${value}`).join(",\\quad ")} displayMode /></div>
            </div>}
            {result.type === "infinite" && result.generalSolution && <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
              <p className="text-xs font-semibold text-accent">{lang === "zh" ? "通解：自由變數與任意實數參數" : "General solution: free variables and real parameters"}</p>
              <div className="overflow-x-auto"><KatexRenderer latex={Phase20systemsGeneralLatex(result.generalSolution, freeNames.length)} displayMode /></div>
              <div className="overflow-x-auto"><KatexRenderer latex={(result.freeVariables ?? []).map((variable, i) => `x_{${variable + 1}}=${freeNames[i]}\\in\\mathbb{R}`).join(",\\quad ")} displayMode /></div>
              <p className="text-xs leading-relaxed text-muted-foreground">{lang === "zh" ? "自由變數所在直欄沒有主元，可各自取任意實數；其餘主元變數由這些參數決定。每組參數對應一個解，而不是尚未算出的唯一答案。" : "A free-variable column has no pivot and can take any real value independently. Pivot variables depend on these parameters. Each parameter choice gives a solution, not an unfinished unique answer."}</p>
            </div>}
            {result.type === "none" && <p className="text-sm leading-relaxed text-destructive rounded-lg border border-destructive/25 bg-destructive/5 p-3">{lang === "zh" ? "矛盾橫列的所有未知數係數均為 0，但右側常數不為 0，要求 0 等於非零數。不存在任何未知向量可同時滿足全部方程；下方逐步保留導致矛盾的矩陣。" : "A contradiction row has zero coefficients for every unknown but a nonzero constant, demanding that 0 equal a nonzero number. No vector satisfies all equations; the derivation below retains the matrix that exposes the contradiction."}</p>}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <section className="min-w-0 space-y-3">
                <h2 className="text-sm font-semibold text-accent border-b border-border pb-2">{lang === "zh" ? "方法一：高斯消元法" : "Method 1: Gaussian elimination"}</h2>
                <p className="text-xs leading-relaxed text-muted-foreground">{lang === "zh" ? "建立 [A | b] → 主元與消去 → 階梯形及一致性 → 回代／通解 → 代回驗證。此播放器只控制高斯消元。" : "Build [A | b] → pivots and elimination → echelon form and consistency → back substitution or parameters → verification. This player controls only Gaussian elimination."}</p>
                <DerivationContext steps={gaussianSteps} position={gaussianPosition} lang={lang} matrixKind="system" />
                <StepDisplay key={`gaussian-${runId}-${lang}`} steps={gaussianSteps} title={lang === "zh" ? "完整高斯消元推導" : "Complete Gaussian derivation"} onStepChange={onGaussianStepChange} />
              </section>
              <section className="min-w-0 space-y-3">
                <h2 className="text-sm font-semibold text-accent border-b border-border pb-2">{lang === "zh" ? "方法二：逆矩陣法" : "Method 2: Inverse matrix method"}</h2>
                <p className="text-xs leading-relaxed text-muted-foreground">{lang === "zh" ? "先確認方陣及可逆性 → [A | I] 化為 [I | A⁻¹] → 逐一計算 A⁻¹b → 代回驗證。所有步驟均保留；此播放器與高斯消元互不影響。" : "Check square shape and invertibility → reduce [A | I] to [I | A⁻¹] → compute each entry of A⁻¹b → verify. No steps are truncated; this player is independent of Gaussian playback."}</p>
                <DerivationContext steps={inverseSteps} position={inversePosition} lang={lang} matrixKind="inverse" />
                <StepDisplay key={`inverse-${runId}-${lang}`} steps={inverseSteps} title={lang === "zh" ? "完整逆矩陣法推導" : "Complete inverse-method derivation"} onStepChange={onInverseStepChange} />
              </section>
            </div>
          </div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
