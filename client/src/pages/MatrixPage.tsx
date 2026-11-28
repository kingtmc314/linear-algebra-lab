// MatrixPage — Matrix Calculator with multi-matrix chain operations
// Supports 2+ matrices for add/sub/mul; single-matrix for transpose/det/inv/scalar
// Also has a free-form Expression tab for arbitrary matrix expressions
import { useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MatrixInput, { DimSelector } from "@/components/MatrixInput";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
import PracticePanel from "@/components/PracticePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateRandomMatrixQuestion } from "@/lib/practiceGenerator";
import MatrixTransformPlot from "@/components/MatrixTransformPlot";
import {
  Matrix,
  zeroMatrix,
  matAdd,
  matSub,
  matMul,
  matTranspose,
  matDeterminant,
  matInverse,
  matScalar,
  matrixToLatex,
  fmt,
  type MatrixResult,
} from "@/lib/matrixMath";
import {
  parseExprFull,
  mValToLatex,
  mValDim,
  type MatrixEnv,
} from "@/lib/matrixExprParser";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Phase20matrixActiveResultLatex,
  Phase20matrixAdaptSteps,
  Phase20matrixExpressionSteps,
  Phase20matrixExpressionLiteralsAreExact,
  Phase20matrixInput,
  Phase20matrixInputIsExact,
  Phase20matrixInverseLatex,
  Phase20matrixParseCell,
  Phase20matrixSafeArithmetic,
  type Phase20matrixStep,
  type Phase20matrixInput as MatrixInputSnapshot,
} from "@/lib/Phase20matrix";

type Operation = "add" | "sub" | "mul" | "transpose" | "det" | "inv" | "scalar";

const OPERATIONS: {
  id: Operation;
  needsMulti: boolean;
  needsSquare?: boolean;
}[] = [
  { id: "add", needsMulti: true },
  { id: "sub", needsMulti: true },
  { id: "mul", needsMulti: true },
  { id: "transpose", needsMulti: false },
  { id: "det", needsMulti: false, needsSquare: true },
  { id: "inv", needsMulti: false, needsSquare: true },
  { id: "scalar", needsMulti: false },
];

function makeMatrix(r: number, c: number): Matrix {
  return zeroMatrix(r, c);
}

interface MatrixEntry {
  id: number;
  rows: number;
  cols: number;
  data: Matrix;
}

let nextId = 3;

interface MatrixCalculation extends Omit<MatrixResult, "steps"> {
  steps: Phase20matrixStep[];
  inputs: MatrixInputSnapshot[];
  expression: string;
  approximate: boolean;
  exactLatex?: string;
  revision: number;
}

/** Context follows the shared player's index; playback/timers belong only to StepDisplay. */
function MatrixDerivation({
  steps,
  inputs,
  expression,
  approximate,
  lang,
}: {
  steps: Phase20matrixStep[];
  inputs: MatrixInputSnapshot[];
  expression: string;
  approximate: boolean;
  lang: "zh" | "en";
}) {
  const [stage, setStage] = useState({
    index: Math.max(0, steps.length - 1),
    mode: "all" as "all" | "playback",
  });
  const onStepChange = useCallback(
    (index: number, mode: "all" | "playback") => {
      setStage(previous =>
        previous.index === index && previous.mode === mode
          ? previous
          : { index, mode }
      );
    },
    []
  );
  const displaySteps = useMemo(
    () =>
      steps.map(step => ({
        description: `${approximate ? (lang === "zh" ? "近似模型 · " : "Approximate model · ") : ""}${lang === "zh" ? step.descriptionZh : step.descriptionEn}`,
        latex: step.latex,
        matrix: step.matrix,
      })),
    [steps, lang, approximate]
  );
  const active = steps[Math.min(stage.index, steps.length - 1)];
  const intermediateLatex = Phase20matrixActiveResultLatex(steps, stage.index);

  return (
    <div className="matrix-derivation min-w-0 space-y-6">
      <section
        className="workspace-section min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4"
        aria-label={
          lang === "zh" ? "計算時的輸入快照" : "Inputs at calculation time"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {lang === "zh" ? "輸入快照與變數" : "Input snapshots & variables"}
          </h3>
          <code className="max-w-full break-all rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
            {expression}
          </code>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {lang === "zh"
            ? "以下是按下計算時使用的矩陣；aᵢⱼ 表示 A 第 i 行、第 j 列的元素。各步驟的局部符號會在目前階段說明。"
            : "These matrices were used when Calculate was pressed. aᵢⱼ denotes A's entry in row i, column j. Local symbols are identified for the active stage."}
        </p>
        <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-4">
          {inputs.map(input => (
            <div
              key={input.label}
              className="min-w-0 rounded-lg border border-border bg-secondary/30 p-4"
            >
              <p className="text-sm font-medium font-mono text-primary">
                {input.label} · {input.rows}×{input.cols}
              </p>
              <div className="overflow-x-auto">
                <KatexRenderer latex={input.latex} displayMode />
              </div>
              {input.modelLatex && (
                <>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {lang === "zh"
                      ? "程式採用的近似分數模型："
                      : "Approximate rational model used by the calculator:"}
                  </p>
                  <div className="overflow-x-auto">
                    <KatexRenderer latex={input.modelLatex} displayMode />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {approximate
            ? lang === "zh"
              ? "近似計算：輸入或運算含浮點數／分數重建。畫面保留原推導公式，但分數形式不代表原始輸入的精確值。"
              : "Approximate calculation: inputs or operations involve floating point / rational reconstruction. Original derivation equations are retained, but fraction formatting does not certify exactness for the original input."
            : lang === "zh"
              ? "精確性已以輸入數值或安全整數運算確認；分數已約分。"
              : "Exactness is verified from the input values or safe-integer arithmetic; fractions are simplified."}
        </p>
      </section>
      {active && (
        <section
          className="workspace-section min-w-0 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5 space-y-4"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="workspace-label text-xs font-medium text-primary">
            {lang === "zh" ? "目前階段" : "Active stage"} · {stage.index + 1}/
            {steps.length} ·{" "}
            {stage.mode === "all"
              ? lang === "zh"
                ? "全部步驟"
                : "All steps"
              : lang === "zh"
                ? "播放模式"
                : "Playback"}
          </p>
          <p className="text-base leading-relaxed font-semibold">
            {lang === "zh" ? active.descriptionZh : active.descriptionEn}
          </p>
          {approximate && (
            <p className="text-xs leading-relaxed font-medium text-muted-foreground">
              {lang === "zh"
                ? "此階段顯示近似計算模型，不是原始輸入的精確證明。"
                : "This stage shows the approximate calculation model, not an exact proof for the original input."}
            </p>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {lang === "zh" ? active.contextZh : active.contextEn}
          </p>
          {active.latex && (
            <>
              <p className="text-xs text-primary">
                {lang === "zh"
                  ? "目前公式／中間結果（保留原 LaTeX）"
                  : "Current formula / intermediate result (original LaTeX)"}
              </p>
              <div className="overflow-x-auto">
                <KatexRenderer latex={active.latex} displayMode />
              </div>
            </>
          )}
          {intermediateLatex && (
            <div className="min-w-0 rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-primary">
                {approximate
                  ? lang === "zh"
                    ? "最近已求值的中間結果（近似模型）"
                    : "Latest evaluated intermediate result (approximate model)"
                  : lang === "zh"
                    ? "最近已求值的精確中間結果"
                    : "Latest evaluated exact intermediate result"}
              </p>
              <div className="overflow-x-auto">
                <KatexRenderer latex={intermediateLatex} displayMode />
              </div>
            </div>
          )}
        </section>
      )}
      <StepDisplay
        steps={displaySteps}
        title={
          lang === "zh"
            ? "逐步推導：播放或逐步查看"
            : "Derivation: play or inspect each step"
        }
        onStepChange={onStepChange}
      />
    </div>
  );
}

// ─── Expression Tab ───────────────────────────────────────────────────────────

const EXPR_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const EXPR_COLORS = [
  "#096b62",
  "#304b49",
  "#855217",
  "#397766",
  "#546957",
  "#795c39",
  "#176b73",
  "#5b7050",
  "#886334",
  "#3f6069",
];

interface ExprMatrixState {
  rows: number;
  cols: number;
  grid: string[][];
}

function makeEmptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

interface ExprMatrixInputProps {
  label: string;
  rows: number;
  cols: number;
  grid: string[][];
  onRowsChange: (n: number) => void;
  onColsChange: (n: number) => void;
  onCellChange: (r: number, c: number, v: string) => void;
  onPaste: (text: string) => void;
  lang: "zh" | "en";
  color: string;
}

function ExprMatrixInput({
  label,
  rows,
  cols,
  grid,
  onRowsChange,
  onColsChange,
  onCellChange,
  onPaste,
  lang,
  color,
}: ExprMatrixInputProps) {
  const [pasteText, setPasteText] = useState("");

  return (
    <div className="matrix-input-card min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-semibold font-mono"
            style={{ background: color + "14", color }}
          >
            {label}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {lang === "zh" ? "矩陣" : "Matrix"} {label}
          </span>
        </div>
        <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-mono text-secondary-foreground">
          {rows} × {cols}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        <label>
          {lang === "zh" ? "行" : "Rows"}
          <select
            value={rows}
            onChange={e => onRowsChange(Number(e.target.value))}
            aria-label={
              lang === "zh" ? `矩陣 ${label} 行數` : `Matrix ${label} rows`
            }
            className="ml-2 h-8 min-w-12 border border-border rounded-md px-2 bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span>×</span>
        <label>
          {lang === "zh" ? "列" : "Cols"}
          <select
            value={cols}
            onChange={e => onColsChange(Number(e.target.value))}
            aria-label={
              lang === "zh" ? `矩陣 ${label} 列數` : `Matrix ${label} columns`
            }
            className="ml-2 h-8 min-w-12 border border-border rounded-md px-2 bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="min-w-0 overflow-x-auto pb-1">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(48px, 1fr))` }}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => (
              <input
                key={`${r}-${c}`}
                type="text"
                value={grid[r]?.[c] ?? ""}
                onChange={e => onCellChange(r, c, e.target.value)}
                placeholder="0"
                aria-label={
                  lang === "zh"
                    ? `${label} 第 ${r + 1} 行、第 ${c + 1} 列`
                    : `${label}, row ${r + 1}, column ${c + 1}`
                }
                className="h-11 min-w-0 w-full text-center border border-border rounded-lg px-1 text-sm font-mono bg-background text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
              />
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 gap-2 border-t border-border pt-4">
        <input
          type="text"
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder={
            lang === "zh"
              ? "貼上純文字，例：1 2; 3 4"
              : "Paste plain text, e.g. 1 2; 3 4"
          }
          aria-label={
            lang === "zh" ? `貼上矩陣 ${label}` : `Paste matrix ${label}`
          }
          className="h-9 min-w-0 flex-1 border border-border rounded-md px-2.5 text-xs font-mono bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={e => {
            if (e.key === "Enter") {
              onPaste(pasteText);
              setPasteText("");
            }
          }}
        />
        <button
          onClick={() => {
            onPaste(pasteText);
            setPasteText("");
          }}
          className="shrink-0 rounded-md border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {lang === "zh" ? "套用" : "Apply"}
        </button>
      </div>
    </div>
  );
}

function ExpressionTab({ lang }: { lang: "zh" | "en" }) {
  const [numMatrices, setNumMatrices] = useState(2);
  const [matrices, setMatrices] = useState<ExprMatrixState[]>(() =>
    Array.from({ length: 10 }, () => ({
      rows: 2,
      cols: 2,
      grid: makeEmptyGrid(2, 2),
    }))
  );
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    resultLatex?: string;
    dim?: string;
    steps?: Phase20matrixStep[];
    inputs?: MatrixInputSnapshot[];
    expression?: string;
    approximate?: boolean;
    revision?: number;
    error?: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);

  const updateMatrix = useCallback(
    (idx: number, patch: Partial<ExprMatrixState>) => {
      setMatrices(prev => {
        const next = [...prev];
        const cur = next[idx];
        const newRows = patch.rows ?? cur.rows;
        const newCols = patch.cols ?? cur.cols;
        let newGrid = patch.grid ?? cur.grid;
        if (patch.rows !== undefined || patch.cols !== undefined) {
          newGrid = Array.from({ length: newRows }, (_, r) =>
            Array.from({ length: newCols }, (_, c) => cur.grid[r]?.[c] ?? "")
          );
        }
        next[idx] = { rows: newRows, cols: newCols, grid: newGrid };
        return next;
      });
    },
    []
  );

  const handleCellChange = useCallback(
    (idx: number, r: number, c: number, v: string) => {
      setMatrices(prev => {
        const next = prev.map(m => ({
          ...m,
          grid: m.grid.map(row => [...row]),
        }));
        next[idx].grid[r][c] = v;
        return next;
      });
    },
    []
  );

  const handlePaste = useCallback((idx: number, text: string) => {
    const rows = text
      .trim()
      .split(/;|\n/)
      .map(row =>
        row
          .trim()
          .split(/[\s,]+/)
          .filter(Boolean)
      )
      .filter(r => r.length > 0);
    if (rows.length === 0) return;
    const cols = Math.max(...rows.map(r => r.length));
    const grid = rows.map(row =>
      Array.from({ length: cols }, (_, c) => row[c] ?? "")
    );
    setMatrices(prev => {
      const next = [...prev];
      next[idx] = { rows: rows.length, cols, grid };
      return next;
    });
  }, []);

  const handleCalculate = () => {
    if (!expr.trim()) {
      setResult({
        ok: false,
        error: lang === "zh" ? "請輸入運算式" : "Please enter an expression",
      });
      return;
    }
    const env: MatrixEnv = {};
    const inputs: MatrixInputSnapshot[] = [];
    let approximate = !Phase20matrixExpressionLiteralsAreExact(expr);
    for (let i = 0; i < numMatrices; i++) {
      const label = EXPR_LABELS[i];
      const m = matrices[i];
      const data: Matrix = [];
      for (let r = 0; r < m.rows; r++) {
        data.push([]);
        for (let c = 0; c < m.cols; c++) {
          const literal = m.grid[r]?.[c] ?? "";
          const value = Phase20matrixParseCell(literal);
          if (value === null) {
            setResult({
              ok: false,
              error:
                lang === "zh"
                  ? `${label} 第 ${r + 1} 行、第 ${c + 1} 列：請輸入有效數值或分數（分母不可為 0）。`
                  : `${label}, row ${r + 1}, column ${c + 1}: enter a valid number or fraction with a nonzero denominator.`,
            });
            return;
          }
          data[r].push(value);
          if (!Phase20matrixInputIsExact(literal, value)) approximate = true;
        }
      }
      env[label] = data;
      inputs.push(Phase20matrixInput(label, data, m.grid, true));
    }
    const res = parseExprFull(expr, env);
    if (!res.ok) {
      setResult({ ok: false, error: res.error });
    } else {
      const resultLatex = mValToLatex(res.value);
      setRevision(previous => previous + 1);
      setResult({
        ok: true,
        resultLatex,
        dim: mValDim(res.value),
        steps: Phase20matrixExpressionSteps(res.steps, resultLatex),
        inputs,
        expression: expr.trim(),
        approximate,
        revision: revision + 1,
      });
    }
  };

  const exprExamples = [
    "A + B",
    "A - 1/2*B",
    "A*B",
    "A^(-1)*B",
    "A^T + B",
    "det(A)",
    "tr(A)",
    "2*A - B + 3*C",
    "inv(A)*B",
    "A^2",
    "(A+B)^(-1)",
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* Matrix setup */}
      <section
        className="workspace-section min-w-0 space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6"
        aria-label={lang === "zh" ? "設定輸入矩陣" : "Set up input matrices"}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="workspace-label text-xs font-medium text-primary">
              {lang === "zh" ? "01 / 輸入" : "01 / INPUT"}
            </p>
            <h2 className="text-lg font-semibold tracking-tight">
              {lang === "zh" ? "設定矩陣" : "Define your matrices"}
            </h2>
          </div>
          <span className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
            {lang === "zh"
              ? "支援數值、分數與貼上"
              : "Numbers, fractions & paste"}
          </span>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {lang === "zh" ? "矩陣數量" : "Number of matrices"}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={
              lang === "zh" ? "選擇矩陣數量" : "Choose number of matrices"
            }
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setNumMatrices(n)}
                aria-pressed={numMatrices === n}
                aria-label={lang === "zh" ? `${n} 個矩陣` : `${n} matrices`}
                className={`h-9 w-9 rounded-lg border text-sm font-mono font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${numMatrices === n ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {lang === "zh"
              ? `已選擇 ${numMatrices} 個矩陣：${EXPR_LABELS.slice(0, numMatrices).split("").join(", ")}`
              : `${numMatrices} matrix/matrices: ${EXPR_LABELS.slice(0, numMatrices).split("").join(", ")}`}
          </p>
        </div>

        {/* Matrix entries */}
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: numMatrices }, (_, i) => {
            const m = matrices[i];
            return (
              <ExprMatrixInput
                key={i}
                label={EXPR_LABELS[i]}
                rows={m.rows}
                cols={m.cols}
                grid={m.grid}
                onRowsChange={n => updateMatrix(i, { rows: n })}
                onColsChange={n => updateMatrix(i, { cols: n })}
                onCellChange={(r, c, v) => handleCellChange(i, r, c, v)}
                onPaste={text => handlePaste(i, text)}
                lang={lang}
                color={EXPR_COLORS[i]}
              />
            );
          })}
        </div>
      </section>

      {/* Expression */}
      <section
        className="workspace-section min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
        aria-label={
          lang === "zh"
            ? "輸入運算式並計算"
            : "Enter an expression and calculate"
        }
      >
        <div className="space-y-1">
          <p className="workspace-label text-xs font-medium text-primary">
            {lang === "zh" ? "02 / 運算" : "02 / CALCULATE"}
          </p>
          <h2 className="text-lg font-semibold tracking-tight">
            <label htmlFor="matrix-expression">
              {lang === "zh" ? "輸入運算式" : "Enter an expression"}
            </label>
          </h2>
        </div>

        <div className="flex min-w-0 flex-col sm:flex-row gap-3">
          <input
            id="matrix-expression"
            type="text"
            value={expr}
            onChange={e => setExpr(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleCalculate();
            }}
            placeholder={
              lang === "zh" ? "例：A - 1/2*B + C" : "e.g. A - 1/2*B + C"
            }
            className="h-12 min-w-0 flex-1 border border-border rounded-lg px-4 text-base font-mono bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={handleCalculate}
            className="h-12 shrink-0 px-6 text-sm font-semibold"
          >
            {lang === "zh" ? "計算" : "Calculate"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {lang === "zh" ? "快速範例" : "Quick examples"}
          </p>
          <div className="flex flex-wrap gap-2">
            {exprExamples.map(ex => (
              <button
                key={ex}
                onClick={() => setExpr(ex)}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono text-foreground transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Syntax reference */}
        <details className="group rounded-xl border border-border bg-secondary/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            {lang === "zh" ? "語法參考" : "Syntax reference"}
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 border-t border-border px-4 py-4 text-xs font-mono leading-relaxed text-muted-foreground">
            <span>
              <span className="text-foreground">A + B</span> —{" "}
              {lang === "zh" ? "加法" : "addition"}
            </span>
            <span>
              <span className="text-foreground">A - B</span> —{" "}
              {lang === "zh" ? "減法" : "subtraction"}
            </span>
            <span>
              <span className="text-foreground">A * B</span> —{" "}
              {lang === "zh" ? "矩陣乘法" : "matrix multiply"}
            </span>
            <span>
              <span className="text-foreground">1/2 * A</span> —{" "}
              {lang === "zh" ? "純量乘法" : "scalar multiply"}
            </span>
            <span>
              <span className="text-foreground">A^(-1)</span> —{" "}
              {lang === "zh" ? "逆矩陣" : "inverse"}
            </span>
            <span>
              <span className="text-foreground">A^T</span> or{" "}
              <span className="text-foreground">A'</span> —{" "}
              {lang === "zh" ? "轉置" : "transpose"}
            </span>
            <span>
              <span className="text-foreground">det(A)</span> —{" "}
              {lang === "zh" ? "行列式" : "determinant"}
            </span>
            <span>
              <span className="text-foreground">tr(A)</span> —{" "}
              {lang === "zh" ? "跡" : "trace"}
            </span>
            <span>
              <span className="text-foreground">A^2</span> —{" "}
              {lang === "zh" ? "矩陣冪次" : "matrix power"}
            </span>
            <span>
              <span className="text-foreground">inv(A)</span> —{" "}
              {lang === "zh" ? "逆矩陣（函數）" : "inverse (function)"}
            </span>
            <span>
              <span className="text-foreground">2A</span> —{" "}
              {lang === "zh" ? "隱式純量乘" : "implicit scalar"}
            </span>
            <span>
              <span className="text-foreground">(A+B)^(-1)</span> —{" "}
              {lang === "zh" ? "括號優先" : "parentheses"}
            </span>
          </div>
        </details>
      </section>

      {/* Step 4: result */}
      {result && (
        <section
          className="matrix-results min-w-0 space-y-4"
          aria-label={lang === "zh" ? "計算結果" : "Calculation result"}
        >
          {!result.ok ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <p className="leading-relaxed">
                <span className="font-semibold">
                  {lang === "zh" ? "錯誤：" : "Error: "}
                </span>
                {result.error}
              </p>
            </div>
          ) : (
            <>
              <div
                className="workspace-section min-w-0 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-6"
                role="status"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="workspace-label text-xs font-medium text-primary">
                      {lang === "zh" ? "03 / 結果" : "03 / RESULT"}
                    </p>
                    <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                      <CheckCircle2
                        aria-hidden="true"
                        className="h-5 w-5 text-primary"
                      />
                      {lang === "zh" ? "計算結果" : "Calculation result"}
                      {result.dim && (
                        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-mono font-normal text-primary">
                          {result.dim}
                        </span>
                      )}
                    </h2>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-medium text-primary">
                    {result.approximate
                      ? lang === "zh"
                        ? "近似值"
                        : "Approximate value"
                      : lang === "zh"
                        ? "精確值"
                        : "Exact value"}
                  </span>
                </div>
                <div className="mt-4 min-w-0 overflow-x-auto rounded-xl border border-primary/10 bg-card px-4 py-3">
                  <KatexRenderer
                    latex={result.resultLatex ?? ""}
                    displayMode={true}
                  />
                </div>
              </div>

              {result.steps && result.steps.length > 0 && (
                <details className="matrix-derivation-disclosure group min-w-0 rounded-2xl border border-border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 sm:p-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {lang === "zh"
                        ? "查看逐步推導"
                        : "Explore the derivation"}
                      <span className="text-xs font-normal text-muted-foreground">
                        {lang === "zh"
                          ? `${result.steps.length} 個步驟 · 輸入快照 · 播放`
                          : `${result.steps.length} steps · snapshots · playback`}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="min-w-0 border-t border-border p-3 sm:p-5">
                    <MatrixDerivation
                      key={result.revision}
                      steps={result.steps}
                      inputs={result.inputs ?? []}
                      expression={result.expression ?? ""}
                      approximate={result.approximate ?? true}
                      lang={lang}
                    />
                  </div>
                </details>
              )}
            </>
          )}
        </section>
      )}

      {/* Tips */}
      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          {lang === "zh" ? "使用提示" : "Usage Tips"}
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="space-y-3 border-t border-border p-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            •{" "}
            {lang === "zh"
              ? "分數：直接輸入 1/2、3/4 等；結果以約分形式呈現。若數值轉換改變原輸入，會明確標示近似。"
              : "Fractions: type 1/2, 3/4 etc.; results use simplified fractions. If numeric conversion changes the written input, the result is explicitly labelled approximate."}
          </p>
          <p>
            •{" "}
            {lang === "zh"
              ? "貼上矩陣：輸入「1 2; 3 4」（分號分隔行，空格分隔元素）。"
              : "Paste matrix: type '1 2; 3 4' (semicolons for rows, spaces for elements)."}
          </p>
          <p>
            •{" "}
            {lang === "zh"
              ? "隱式乘法：2A 等同 2*A。"
              : "Implicit multiply: 2A is the same as 2*A."}
          </p>
          <p>
            •{" "}
            {lang === "zh"
              ? "括號：用括號控制優先順序，例如 (A+B)^(-1)。"
              : "Parentheses: use them to control precedence, e.g. (A+B)^(-1)."}
          </p>
          <p>
            •{" "}
            {lang === "zh"
              ? "det(A) 和 tr(A) 返回純量，可繼續參與運算，例如 det(A)*B。"
              : "det(A) and tr(A) return scalars and can be used further, e.g. det(A)*B."}
          </p>
        </div>
      </details>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatrixPage() {
  const { t, lang } = useLanguage();
  const genQuestion = useCallback(
    () => generateRandomMatrixQuestion(lang),
    [lang]
  );

  const [op, setOp] = useState<Operation>("add");
  const [transformMatrix, setTransformMatrix] = useState<number[][]>([
    [1, 0],
    [0, 1],
  ]);
  const [matrices, setMatrices] = useState<MatrixEntry[]>([
    { id: 1, rows: 2, cols: 2, data: makeMatrix(2, 2) },
    { id: 2, rows: 2, cols: 2, data: makeMatrix(2, 2) },
  ]);
  const [scalar, setScalar] = useState(2);
  const [result, setResult] = useState<MatrixCalculation | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const opInfo = OPERATIONS.find(o => o.id === op)!;

  function handleOpChange(newOp: Operation) {
    setOp(newOp);
    setResult(null);
    setError(null);
    const newOpInfo = OPERATIONS.find(o => o.id === newOp)!;
    if (!newOpInfo.needsMulti && matrices.length > 1) {
      setMatrices([matrices[0]]);
    }
  }

  function updateMatrix(id: number, data: Matrix) {
    setMatrices(prev => prev.map(m => (m.id === id ? { ...m, data } : m)));
    setResult(null);
    setError(null);
  }

  function resizeMatrix(id: number, rows: number, cols: number) {
    setMatrices(prev =>
      prev.map(m =>
        m.id === id ? { ...m, rows, cols, data: makeMatrix(rows, cols) } : m
      )
    );
    setResult(null);
    setError(null);
  }

  function addMatrix() {
    const last = matrices[matrices.length - 1];
    setMatrices(prev => [
      ...prev,
      {
        id: nextId++,
        rows: last.rows,
        cols: last.cols,
        data: makeMatrix(last.rows, last.cols),
      },
    ]);
    setResult(null);
    setError(null);
  }

  function removeMatrix(id: number) {
    if (matrices.length <= 2) return;
    setMatrices(prev => prev.filter(m => m.id !== id));
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    setResult(null);

    const errMap: Record<string, string> = {
      dim_mismatch: t.errDimMismatch,
      square_required: t.errSquareRequired,
      singular: t.errSingular,
      invalid: t.errInvalidInput,
    };

    if (
      matrices.some(matrix =>
        matrix.data.flat().some(value => !Number.isFinite(value))
      ) ||
      (op === "scalar" && !Number.isFinite(scalar))
    ) {
      setError(t.errInvalidInput);
      return;
    }
    const inputs = matrices.map((matrix, index) =>
      Phase20matrixInput(
        EXPR_LABELS[index],
        matrix.data,
        undefined,
        op === "det" || op === "inv"
      )
    );
    const operator = op === "add" ? "+" : op === "sub" ? "-" : "\\cdot";
    const expression = opInfo.needsMulti
      ? matrices
          .map((_, index) => EXPR_LABELS[index])
          .join(` ${op === "mul" ? "·" : operator} `)
      : op === "scalar"
        ? `kA, k = ${scalar}`
        : op === "transpose"
          ? "Aᵀ"
          : op === "inv"
            ? "A⁻¹"
            : "det(A)";
    let res: MatrixResult;
    let teachingSteps: Phase20matrixStep[] = [];
    let approximate = false;
    const nextRevision = revision + 1;

    if (opInfo.needsMulti) {
      if (matrices.length < 2) {
        setError(
          lang === "zh" ? "至少需要兩個矩陣" : "At least two matrices required"
        );
        return;
      }
      let acc = matrices[0].data;
      teachingSteps.push({
        descriptionZh: "從左至右計算：先設定累積矩陣 R₀ = A。",
        descriptionEn: "Evaluate left to right: initialize accumulator R₀ = A.",
        latex: `R_0 = A = ${matrixToLatex(acc)}`,
        matrix: acc,
        contextZh:
          "A、B、C、… 是具名輸入。Rᵢ 表示完成第 i 次二元運算後的累積結果；減法不重新分組，乘法不交換矩陣順序。",
        contextEn:
          "A, B, C, … are named inputs. Rᵢ is the accumulator after binary operation i. Do not regroup subtraction or reorder matrix multiplication.",
      });
      for (let i = 1; i < matrices.length; i++) {
        const label = EXPR_LABELS[i];
        const contextZh = `第 ${i} 段：原推導中的局部 A = R${i - 1}（先前累積結果），局部 B = 輸入 ${label}；若公式出現局部 C，表示本段輸出 R${i}，不是輸入 C。i、j 是公式內的行、列索引，k 是點積求和索引。`;
        const contextEn = `Stage ${i}: local A in the original equations is R${i - 1} (the previous accumulator); local B is input ${label}. Local C, if present, means stage output R${i}, not input C. i and j index rows/columns; k indexes dot-product terms.`;
        teachingSteps.push({
          descriptionZh: `第 ${i} 段 — 辨認左右運算元及目標 R${i}`,
          descriptionEn: `Stage ${i} — identify operands and target R${i}`,
          latex: `R_${i} = R_${i - 1} ${operator} ${label},\\quad R_${i - 1} = ${matrixToLatex(acc)},\\quad ${label} = ${matrixToLatex(matrices[i].data)}`,
          contextZh,
          contextEn,
        });
        let step: MatrixResult;
        switch (op) {
          case "add":
            step = matAdd(acc, matrices[i].data);
            break;
          case "sub":
            step = matSub(acc, matrices[i].data);
            break;
          case "mul":
            step = matMul(acc, matrices[i].data);
            break;
          default:
            step = { error: "invalid", steps: [] };
        }
        if (step.error) {
          setError(errMap[step.error] || step.error);
          return;
        }
        if (!step.result) return;
        if (
          !Phase20matrixSafeArithmetic(
            op as "add" | "sub" | "mul",
            acc,
            matrices[i].data
          )
        )
          approximate = true;
        teachingSteps.push(
          ...Phase20matrixAdaptSteps(step.steps, contextZh, contextEn)
        );
        acc = step.result;
        teachingSteps.push({
          descriptionZh: `第 ${i} 段完成 — R${i} 成為下一段的左運算元。`,
          descriptionEn: `Stage ${i} complete — R${i} becomes the next stage's left operand.`,
          latex: `R_${i} = ${matrixToLatex(acc)}`,
          matrix: acc,
          contextZh,
          contextEn,
        });
      }
      res = { result: acc, steps: [] };
    } else {
      const matA = matrices[0].data;
      switch (op) {
        case "transpose":
          res = matTranspose(matA);
          break;
        case "det":
          res = matDeterminant(matA);
          break;
        case "inv":
          res = matInverse(matA);
          break;
        case "scalar":
          res = matScalar(matA, scalar);
          break;
        default:
          return;
      }
      const contextZh =
        op === "inv"
          ? "A 是輸入方陣；I 是同大小單位矩陣；Rⱼ 表示增廣矩陣第 j 行。每次行運算同時作用於左右兩半，左側變成 I 時，右側就是 A⁻¹。可逆性判斷沿用既有數值容差，接近零時不可視為精確證明。"
          : op === "det"
            ? "A 是輸入方陣；aᵢⱼ 是第 i 行、第 j 列元素。2×2 公式中 a=a₁₁、b=a₁₂、c=a₂₁、d=a₂₂；M₁ⱼ 是刪去第 1 行與第 j 列所得子矩陣的行列式。結果是純量，不是矩陣。"
            : op === "transpose"
              ? "A 是輸入矩陣；aᵢⱼ 表示第 i 行、第 j 列元素。轉置把原位置 (i,j) 移到 (j,i)，m×n 變為 n×m。"
              : `A 是輸入矩陣；k=${scalar} 是純量；aᵢⱼ 是第 i 行、第 j 列元素。每個元素乘 k，維度不變。`;
      const contextEn =
        op === "inv"
          ? "A is the input square matrix; I is the identity of equal size; Rⱼ denotes row j of the augmented matrix. Each row operation affects both halves; once the left is I, the right is A⁻¹. Invertibility guards retain the existing numerical tolerances and are not exact proofs near zero."
          : op === "det"
            ? "A is the input square matrix; aᵢⱼ is its row-i, column-j entry. For 2×2: a=a₁₁, b=a₁₂, c=a₂₁, d=a₂₂. M₁ⱼ is the determinant after deleting row 1 and column j. The result is a scalar, not a matrix."
            : op === "transpose"
              ? "A is the input matrix; aᵢⱼ is its row-i, column-j entry. Transpose moves position (i,j) to (j,i), changing m×n into n×m."
              : `A is the input matrix; k=${scalar} is the scalar; aᵢⱼ is its row-i, column-j entry. Multiply each entry by k; dimensions stay unchanged.`;
      teachingSteps = Phase20matrixAdaptSteps(res.steps, contextZh, contextEn);
      approximate =
        op === "det" || op === "inv"
          ? matA.some(row =>
              row.some(
                value => !Phase20matrixInputIsExact(String(value), value)
              )
            )
          : !Phase20matrixSafeArithmetic(
              op as "transpose" | "scalar",
              matA,
              undefined,
              scalar
            );
      if (res.error) {
        setError(errMap[res.error] || res.error);
        if (teachingSteps.length) {
          setRevision(nextRevision);
          setResult({
            ...res,
            steps: teachingSteps,
            inputs,
            expression,
            approximate: true,
            revision: nextRevision,
          });
        }
        return;
      }
    }

    setRevision(nextRevision);
    setResult({
      ...res,
      steps: teachingSteps,
      inputs,
      expression,
      approximate,
      exactLatex:
        op === "inv" ? Phase20matrixInverseLatex(res.steps) : undefined,
      revision: nextRevision,
    });
  }

  function handleReset() {
    setMatrices(
      matrices.map(m => ({ ...m, data: makeMatrix(m.rows, m.cols) }))
    );
    setResult(null);
    setError(null);
  }

  const opLabels: Record<Operation, string> = {
    add: t.opAdd,
    sub: t.opSubtract,
    mul: t.opMultiply,
    transpose: t.opTranspose,
    det: t.opDeterminant,
    inv: t.opInverse,
    scalar: t.opScalar,
  };

  const matrixLabels = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="matrix-workspace min-w-0 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {lang === "zh" ? "矩陣工作區" : "Matrix workspace"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {lang === "zh"
            ? "輸入矩陣與運算式，探索精確結果及每一步推導。"
            : "Define matrices and expressions. Explore exact results and every step."}
        </p>
      </header>
      <Tabs defaultValue="expr" className="min-w-0 gap-5 sm:gap-6">
        <TabsList
          className="grid h-auto w-full grid-cols-4 gap-1 rounded-xl border border-border bg-secondary/60 p-1 sm:w-fit sm:min-w-[480px]"
          aria-label={lang === "zh" ? "矩陣工作模式" : "Matrix workspace mode"}
        >
          <TabsTrigger
            value="expr"
            className="min-h-10 min-w-0 whitespace-normal rounded-lg px-1.5 py-2 text-xs sm:px-4 sm:text-sm"
          >
            {lang === "zh" ? "運算式" : "Expression"}
          </TabsTrigger>
          <TabsTrigger
            value="calc"
            className="min-h-10 min-w-0 whitespace-normal rounded-lg px-1.5 py-2 text-xs sm:px-4 sm:text-sm"
          >
            {t.calcMode}
          </TabsTrigger>
          <TabsTrigger
            value="transform"
            className="min-h-10 min-w-0 whitespace-normal rounded-lg px-1.5 py-2 text-xs sm:px-4 sm:text-sm"
          >
            {lang === "zh" ? "幾何變換" : "Transform"}
          </TabsTrigger>
          <TabsTrigger
            value="practice"
            className="min-h-10 min-w-0 whitespace-normal rounded-lg px-1.5 py-2 text-xs sm:px-4 sm:text-sm"
          >
            {t.practiceMode}
          </TabsTrigger>
        </TabsList>

        {/* ── Expression Tab (new) ── */}
        <TabsContent value="expr" className="min-w-0 mt-0">
          <ExpressionTab lang={lang} />
        </TabsContent>

        {/* ── Geometric Transform Visualization Tab ── */}
        <TabsContent value="transform" className="min-w-0 mt-0 space-y-5">
          <div className="workspace-section p-4 sm:p-5 rounded-xl border border-border bg-card space-y-2">
            <p className="text-base font-semibold text-foreground">
              {lang === "zh"
                ? "矩陣線性變換視覺化"
                : "Matrix Linear Transformation Visualizer"}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {lang === "zh"
                ? "輸入一個 2×2 矩陣，觀察它如何將單位正方形和單位圓進行變換（拉伸、旋轉、剪切、反射）。列即標準基底的像。"
                : "Enter a 2×2 matrix to see how it transforms the unit square and unit circle (stretch, rotate, shear, reflect). Columns are images of standard basis vectors."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: lang === "zh" ? "旋轉90°" : "Rotate 90°",
                m: [
                  [0, -1],
                  [1, 0],
                ],
              },
              {
                label: lang === "zh" ? "旋轉45°" : "Rotate 45°",
                m: [
                  [Math.SQRT1_2, -Math.SQRT1_2],
                  [Math.SQRT1_2, Math.SQRT1_2],
                ],
              },
              {
                label: lang === "zh" ? "水平剪切" : "Horiz. Shear",
                m: [
                  [1, 1],
                  [0, 1],
                ],
              },
              {
                label: lang === "zh" ? "垂直剪切" : "Vert. Shear",
                m: [
                  [1, 0],
                  [1, 1],
                ],
              },
              {
                label: lang === "zh" ? "拉伸 x2" : "Scale x2",
                m: [
                  [2, 0],
                  [0, 2],
                ],
              },
              {
                label: lang === "zh" ? "水平反射" : "Horiz. Reflect",
                m: [
                  [1, 0],
                  [0, -1],
                ],
              },
              {
                label: lang === "zh" ? "對角線反射" : "Reflect y=x",
                m: [
                  [0, 1],
                  [1, 0],
                ],
              },
              {
                label: lang === "zh" ? "x 軸投影" : "Project x-axis",
                m: [
                  [1, 0],
                  [0, 0],
                ],
              },
            ].map(({ label, m }) => (
              <button
                key={label}
                onClick={() => setTransformMatrix(m.map(row => [...row]))}
                className="px-3 py-1.5 text-xs font-mono rounded border border-border bg-card hover:bg-secondary hover:border-primary/50 transition-all duration-150"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs font-semibold font-mono uppercase tracking-wide text-muted-foreground mb-3">
              {lang === "zh" ? "輸入 2×2 矩陣 A" : "Enter 2×2 Matrix A"}
            </p>
            <div className="flex items-center gap-2">
              <svg width="10" height="100" viewBox="0 0 10 100" fill="none">
                <path
                  d="M8 4 L3 4 L3 96 L8 96"
                  stroke="#6366F1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="grid grid-cols-2 gap-2">
                {transformMatrix.map((row, i) =>
                  row.map((val, j) => (
                    <input
                      key={`${i}-${j}`}
                      type="number"
                      value={val === 0 ? "" : val}
                      placeholder="0"
                      onChange={e => {
                        const n = parseFloat(e.target.value);
                        setTransformMatrix(prev =>
                          prev.map((r, ri) =>
                            r.map((c, ci) =>
                              ri === i && ci === j ? (isNaN(n) ? 0 : n) : c
                            )
                          )
                        );
                      }}
                      className="matrix-cell w-16"
                    />
                  ))
                )}
              </div>
              <svg width="10" height="100" viewBox="0 0 10 100" fill="none">
                <path
                  d="M2 4 L7 4 L7 96 L2 96"
                  stroke="#6366F1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">
                {lang === "zh" ? "變換效果" : "Transformation Effect"}
              </h3>
              <span className="text-xs text-primary/70 font-mono">
                {lang === "zh" ? "（可縮放·可拖曳）" : "(zoomable · draggable)"}
              </span>
            </div>
            <MatrixTransformPlot matrix={transformMatrix} lang={lang} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t border-dashed border-gray-400 inline-block" />
              <span className="text-muted-foreground">
                {lang === "zh" ? "原始形狀" : "Original"}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-2 bg-indigo-400/20 border border-indigo-400/60 inline-block rounded" />
              <span className="text-muted-foreground">
                {lang === "zh" ? "變換後" : "Transformed"}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-red-600 inline-block rounded" />
              <span className="text-muted-foreground">
                Ae₁ {lang === "zh" ? "（第一列）" : "(col 1)"}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-green-600 inline-block rounded" />
              <span className="text-muted-foreground">
                Ae₂ {lang === "zh" ? "（第二列）" : "(col 2)"}
              </span>
            </span>
          </div>
        </TabsContent>

        <TabsContent value="practice" className="min-w-0 mt-0">
          <PracticePanel
            generateQuestion={genQuestion}
            moduleLabel={lang === "zh" ? "矩陣練習" : "Matrix Practice"}
          />
        </TabsContent>

        <TabsContent value="calc" className="min-w-0 mt-0 space-y-6">
          {/* Operation selector */}
          <section
            className="workspace-section space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
            aria-label={t.labelOperation}
          >
            <div className="space-y-1">
              <p className="workspace-label text-xs font-medium text-primary">
                {lang === "zh" ? "01 / 設定" : "01 / SETUP"}
              </p>
              <h2 className="text-lg font-semibold tracking-tight">
                {t.labelOperation}
              </h2>
            </div>
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              role="group"
              aria-label={t.labelOperation}
            >
              {OPERATIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleOpChange(o.id)}
                  aria-pressed={op === o.id}
                  className={`min-h-11 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${
                    op === o.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary"
                  }`}
                >
                  {opLabels[o.id]}
                </button>
              ))}
            </div>
          </section>

          {/* Matrix inputs */}
          <section
            className="workspace-section min-w-0 space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6"
            aria-label={
              lang === "zh" ? "輸入矩陣與計算" : "Input matrices and calculate"
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="workspace-label text-xs font-medium text-primary">
                  {lang === "zh" ? "02 / 輸入" : "02 / INPUT"}
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  {lang === "zh" ? "矩陣元素" : "Matrix entries"}
                </h2>
              </div>
              <span className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
                {opLabels[op]}
              </span>
            </div>
            <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-4">
              {matrices.map((m, idx) => (
                <div
                  key={m.id}
                  className="matrix-input-card min-w-0 p-4 sm:p-5 rounded-xl border border-border bg-card space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold font-mono text-primary">
                        {matrixLabels[idx] ?? idx + 1}
                      </span>
                      <span className="text-sm font-semibold">
                        {lang === "zh" ? "矩陣" : "Matrix"}{" "}
                        {matrixLabels[idx] ?? idx + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-mono text-secondary-foreground">
                        {m.rows} × {m.cols}
                      </span>
                      {opInfo.needsMulti && matrices.length > 2 && (
                        <button
                          onClick={() => removeMatrix(m.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title={
                            lang === "zh" ? "刪除此矩陣" : "Remove this matrix"
                          }
                          aria-label={
                            lang === "zh"
                              ? `刪除矩陣 ${matrixLabels[idx] ?? idx + 1}`
                              : `Remove matrix ${matrixLabels[idx] ?? idx + 1}`
                          }
                        >
                          <Trash2 aria-hidden="true" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-3">
                    <DimSelector
                      label={`${lang === "zh" ? "矩陣" : "Matrix"} ${matrixLabels[idx] ?? idx + 1}`}
                      rows={m.rows}
                      cols={m.cols}
                      onRowsChange={r => {
                        if (opInfo.needsSquare) resizeMatrix(m.id, r, r);
                        else resizeMatrix(m.id, r, m.cols);
                      }}
                      onColsChange={c => {
                        if (opInfo.needsSquare) resizeMatrix(m.id, c, c);
                        else resizeMatrix(m.id, m.rows, c);
                      }}
                      rowsLabel={t.matrixRows}
                      colsLabel={t.matrixCols}
                      squareOnly={opInfo.needsSquare}
                    />
                  </div>
                  <div className="min-w-0 overflow-x-auto pb-2 pt-1">
                    <MatrixInput
                      label={`${lang === "zh" ? "矩陣" : "Matrix"} ${matrixLabels[idx] ?? idx + 1}`}
                      matrix={m.data}
                      onChange={data => updateMatrix(m.id, data)}
                    />
                  </div>
                </div>
              ))}

              {opInfo.needsMulti && matrices.length < 6 && (
                <button
                  onClick={addMatrix}
                  className="min-h-16 w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-border bg-secondary/20 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="w-4 h-4" />
                  {lang === "zh" ? "新增矩陣" : "Add Matrix"}
                </button>
              )}
            </div>

            {op === "scalar" && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4">
                <label
                  htmlFor="matrix-scalar"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {t.scalarValue} k =
                </label>
                <input
                  id="matrix-scalar"
                  type="number"
                  value={scalar}
                  onChange={e => {
                    setScalar(parseFloat(e.target.value) || 0);
                    setResult(null);
                    setError(null);
                  }}
                  className="matrix-cell w-24"
                />
              </div>
            )}

            {opInfo.needsMulti && matrices.length >= 2 && (
              <div className="min-w-0 p-4 rounded-xl bg-secondary/40 border border-border overflow-x-auto">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {lang === "zh" ? "運算順序" : "Operation order"}
                </p>
                <KatexRenderer
                  latex={matrices
                    .map((_, i) => matrixLabels[i] ?? String(i + 1))
                    .join(
                      op === "add" ? " + " : op === "sub" ? " - " : " \\cdot "
                    )}
                  displayMode={false}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
              <Button
                onClick={handleCalculate}
                className="h-11 flex-1 sm:flex-none sm:min-w-32 font-medium"
              >
                {t.calculate}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="h-11 font-medium"
              >
                {t.reset}
              </Button>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {result && (
            <div className="matrix-results min-w-0 space-y-4">
              {!error && (
                <div
                  className="workspace-section min-w-0 p-4 sm:p-6 rounded-2xl border border-primary/30 bg-primary/5"
                  role="status"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="space-y-1">
                      <p className="workspace-label text-xs font-medium text-primary">
                        {lang === "zh" ? "03 / 結果" : "03 / RESULT"}
                      </p>
                      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                        <CheckCircle2
                          aria-hidden="true"
                          className="w-5 h-5 text-primary"
                        />
                        {t.result}
                      </h2>
                    </div>
                    <span className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-medium text-primary">
                      {result.approximate
                        ? lang === "zh"
                          ? "近似值（保留既有數值結果）"
                          : "Approximate value (existing numerical result retained)"
                        : lang === "zh"
                          ? "精確值"
                          : "Exact value"}
                    </span>
                  </div>
                  <div className="result-row min-w-0 overflow-x-auto rounded-xl border border-primary/10 bg-card px-4 py-3">
                    {result.result && (
                      <KatexRenderer
                        latex={
                          result.exactLatex || matrixToLatex(result.result)
                        }
                        displayMode={true}
                      />
                    )}
                    {result.scalar !== undefined && (
                      <KatexRenderer
                        latex={`= ${result.scalarLatex || fmt(result.scalar)}`}
                        displayMode={true}
                      />
                    )}
                  </div>
                </div>
              )}

              {result.steps && result.steps.length > 0 && (
                <details
                  className="matrix-derivation-disclosure group min-w-0 rounded-2xl border border-border bg-card"
                  open={error ? true : undefined}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 sm:p-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {lang === "zh"
                        ? "查看逐步推導"
                        : "Explore the derivation"}
                      <span className="text-xs font-normal text-muted-foreground">
                        {lang === "zh"
                          ? `${result.steps.length} 個步驟 · 輸入快照 · 播放`
                          : `${result.steps.length} steps · snapshots · playback`}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="min-w-0 border-t border-border p-3 sm:p-5">
                    <MatrixDerivation
                      key={result.revision}
                      steps={result.steps}
                      inputs={result.inputs}
                      expression={result.expression}
                      approximate={result.approximate}
                      lang={lang}
                    />
                  </div>
                </details>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
