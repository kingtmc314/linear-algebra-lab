// MatrixPage — Matrix Calculator with multi-matrix chain operations
// Supports 2+ matrices for add/sub/mul; single-matrix for transpose/det/inv/scalar
// Also has a free-form Expression tab for arbitrary matrix expressions
import { useState, useCallback } from "react";
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
} from "@/lib/matrixMath";
import { parseExprFull, mValToLatex, mValDim, type MatrixEnv } from "@/lib/matrixExprParser";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { fromFloat, ratMatLatex } from "@/lib/rational";

type Operation =
  | "add" | "sub" | "mul" | "transpose" | "det" | "inv" | "scalar";

const OPERATIONS: { id: Operation; needsMulti: boolean; needsSquare?: boolean }[] = [
  { id: "add",       needsMulti: true  },
  { id: "sub",       needsMulti: true  },
  { id: "mul",       needsMulti: true  },
  { id: "transpose", needsMulti: false },
  { id: "det",       needsMulti: false, needsSquare: true },
  { id: "inv",       needsMulti: false, needsSquare: true },
  { id: "scalar",    needsMulti: false },
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

// ─── Expression Tab ───────────────────────────────────────────────────────────

const EXPR_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const EXPR_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b",
  "#ef4444","#ec4899","#06b6d4","#84cc16",
  "#f97316","#6366f1",
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
  label, rows, cols, grid,
  onRowsChange, onColsChange, onCellChange, onPaste, lang, color
}: ExprMatrixInputProps) {
  const [pasteText, setPasteText] = useState("");

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: color + "40", background: color + "06" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-base font-bold font-mono px-2 py-0.5 rounded"
          style={{ background: color + "20", color }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <label>
            {lang === "zh" ? "行" : "Rows"}
            <select
              value={rows}
              onChange={e => onRowsChange(Number(e.target.value))}
              className="ml-1 border rounded px-1 py-0.5 bg-background text-foreground text-xs"
            >
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span>×</span>
          <label>
            {lang === "zh" ? "列" : "Cols"}
            <select
              value={cols}
              onChange={e => onColsChange(Number(e.target.value))}
              className="ml-1 border rounded px-1 py-0.5 bg-background text-foreground text-xs"
            >
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(52px, 1fr))` }}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => (
              <input
                key={`${r}-${c}`}
                type="text"
                value={grid[r]?.[c] ?? ""}
                onChange={e => onCellChange(r, c, e.target.value)}
                placeholder="0"
                className="w-full text-center border rounded px-1 py-1.5 text-sm font-mono bg-background text-foreground focus:outline-none focus:ring-1"
              />
            ))
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder={lang === "zh" ? "貼上純文字，例：1 2; 3 4" : "Paste plain text, e.g. 1 2; 3 4"}
          className="flex-1 border rounded px-2 py-1 text-xs font-mono bg-background text-foreground focus:outline-none focus:ring-1"
          onKeyDown={e => {
            if (e.key === "Enter") {
              onPaste(pasteText);
              setPasteText("");
            }
          }}
        />
        <button
          onClick={() => { onPaste(pasteText); setPasteText(""); }}
          className="px-3 py-1 rounded text-xs font-mono text-white transition-colors"
          style={{ background: color }}
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
    Array.from({ length: 10 }, () => ({ rows: 2, cols: 2, grid: makeEmptyGrid(2, 2) }))
  );
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    resultLatex?: string;
    dim?: string;
    steps?: { descriptionZh: string; descriptionEn: string; latex: string }[];
    error?: string;
  } | null>(null);

  const updateMatrix = useCallback((idx: number, patch: Partial<ExprMatrixState>) => {
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
  }, []);

  const handleCellChange = useCallback((idx: number, r: number, c: number, v: string) => {
    setMatrices(prev => {
      const next = prev.map(m => ({ ...m, grid: m.grid.map(row => [...row]) }));
      next[idx].grid[r][c] = v;
      return next;
    });
  }, []);

  const handlePaste = useCallback((idx: number, text: string) => {
    const rows = text.trim().split(/;|\n/).map(row =>
      row.trim().split(/[\s,]+/).filter(Boolean)
    ).filter(r => r.length > 0);
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

  const parseCell = (v: string): number => {
    const trimmed = v.trim();
    if (trimmed === "" || trimmed === "0") return 0;
    if (trimmed.includes("/")) {
      const [p, q] = trimmed.split("/").map(Number);
      if (!isNaN(p) && !isNaN(q) && q !== 0) return p / q;
    }
    const n = parseFloat(trimmed);
    return isNaN(n) ? 0 : n;
  };

  const handleCalculate = () => {
    if (!expr.trim()) {
      setResult({ ok: false, error: lang === "zh" ? "請輸入運算式" : "Please enter an expression" });
      return;
    }
    const env: MatrixEnv = {};
    for (let i = 0; i < numMatrices; i++) {
      const label = EXPR_LABELS[i];
      const m = matrices[i];
      env[label] = m.grid.map(row => row.map(parseCell));
    }
    const res = parseExprFull(expr, env);
    if (!res.ok) {
      setResult({ ok: false, error: res.error, steps: res.steps });
    } else {
      setResult({
        ok: true,
        resultLatex: mValToLatex(res.value),
        dim: mValDim(res.value),
        steps: res.steps,
      });
    }
  };

  const exprExamples = [
    "A + B", "A - 1/2*B", "A*B", "A^(-1)*B",
    "A^T + B", "det(A)", "tr(A)", "2*A - B + 3*C",
    "inv(A)*B", "A^2", "(A+B)^(-1)",
  ];

  return (
    <div className="space-y-6 mt-4">
      {/* Description */}
      <div
        className="rounded-lg border p-3 text-sm text-muted-foreground"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {lang === "zh"
          ? "輸入多個矩陣，然後輸入任意運算式（如 A - 1/2*B + C），即可得到精確結果及逐步推導。"
          : "Define multiple matrices, then type any expression (e.g. A - 1/2*B + C) to get an exact result with step-by-step derivation."}
      </div>

      {/* Step 1: number of matrices */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          {lang === "zh" ? "步驟 1 — 選擇矩陣數量" : "Step 1 — Choose number of matrices"}
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setNumMatrices(n)}
              className="w-9 h-9 rounded-lg border text-sm font-mono font-semibold transition-all duration-150 active:scale-95"
              style={{
                background: numMatrices === n ? EXPR_COLORS[n - 1] : "var(--card)",
                color: numMatrices === n ? "#fff" : "var(--foreground)",
                borderColor: numMatrices === n ? EXPR_COLORS[n - 1] : "var(--border)",
              }}
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

      {/* Step 2: input matrices */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          {lang === "zh" ? "步驟 2 — 輸入矩陣元素" : "Step 2 — Enter matrix entries"}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Step 3: expression */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          {lang === "zh" ? "步驟 3 — 輸入運算式" : "Step 3 — Enter expression"}
        </p>

        {/* Syntax reference */}
        <div
          className="rounded-lg border p-3 text-xs font-mono"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="font-semibold text-foreground mb-2">
            {lang === "zh" ? "語法參考：" : "Syntax reference:"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5 text-muted-foreground">
            <span><span className="text-foreground">A + B</span> — {lang === "zh" ? "加法" : "addition"}</span>
            <span><span className="text-foreground">A - B</span> — {lang === "zh" ? "減法" : "subtraction"}</span>
            <span><span className="text-foreground">A * B</span> — {lang === "zh" ? "矩陣乘法" : "matrix multiply"}</span>
            <span><span className="text-foreground">1/2 * A</span> — {lang === "zh" ? "純量乘法" : "scalar multiply"}</span>
            <span><span className="text-foreground">A^(-1)</span> — {lang === "zh" ? "逆矩陣" : "inverse"}</span>
            <span><span className="text-foreground">A^T</span> or <span className="text-foreground">A'</span> — {lang === "zh" ? "轉置" : "transpose"}</span>
            <span><span className="text-foreground">det(A)</span> — {lang === "zh" ? "行列式" : "determinant"}</span>
            <span><span className="text-foreground">tr(A)</span> — {lang === "zh" ? "跡" : "trace"}</span>
            <span><span className="text-foreground">A^2</span> — {lang === "zh" ? "矩陣冪次" : "matrix power"}</span>
            <span><span className="text-foreground">inv(A)</span> — {lang === "zh" ? "逆矩陣（函數）" : "inverse (function)"}</span>
            <span><span className="text-foreground">2A</span> — {lang === "zh" ? "隱式純量乘" : "implicit scalar"}</span>
            <span><span className="text-foreground">(A+B)^(-1)</span> — {lang === "zh" ? "括號優先" : "parentheses"}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={expr}
            onChange={e => setExpr(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCalculate(); }}
            placeholder={lang === "zh" ? "例：A - 1/2*B + C" : "e.g. A - 1/2*B + C"}
            className="flex-1 border rounded-lg px-4 py-2.5 text-sm font-mono bg-background text-foreground focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          />
          <button
            onClick={handleCalculate}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 active:scale-95"
            style={{ background: "#3b82f6" }}
          >
            {lang === "zh" ? "計算" : "Calculate"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground font-mono self-center">
            {lang === "zh" ? "範例：" : "Examples:"}
          </span>
          {exprExamples.map(ex => (
            <button
              key={ex}
              onClick={() => setExpr(ex)}
              className="px-2 py-0.5 rounded text-xs font-mono border transition-colors hover:bg-accent"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Step 4: result */}
      {result && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            {lang === "zh" ? "步驟 4 — 計算結果" : "Step 4 — Result"}
          </p>

          {!result.ok ? (
            <div
              className="rounded-lg border p-4 text-sm font-mono"
              style={{ background: "#ef444410", borderColor: "#ef444440", color: "#ef4444" }}
            >
              <span className="font-semibold">{lang === "zh" ? "錯誤：" : "Error: "}</span>
              {result.error}
            </div>
          ) : (
            <>
              <div
                className="rounded-xl border p-5"
                style={{ background: "var(--card)", borderColor: "#3b82f640" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    {lang === "zh" ? "結果" : "Result"}
                    {result.dim && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs"
                        style={{ background: "#3b82f620", color: "#3b82f6" }}>
                        {result.dim}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {lang === "zh" ? "精確值" : "Exact value"}
                  </span>
                </div>
                <KatexRenderer latex={result.resultLatex ?? ""} displayMode={true} />
              </div>

              {result.steps && result.steps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    {lang === "zh" ? "逐步推導" : "Step-by-step derivation"}
                  </p>
                  {result.steps.map((step, i) => (
                    <div
                      key={i}
                      className="rounded-lg border p-3"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-mono font-bold flex items-center justify-center text-white"
                          style={{ background: "#3b82f6" }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-muted-foreground mb-1">
                            {lang === "zh" ? step.descriptionZh : step.descriptionEn}
                          </p>
                          <KatexRenderer latex={step.latex} displayMode={true} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tips */}
      <div
        className="rounded-xl border p-4 text-xs font-mono text-muted-foreground space-y-1"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <p className="font-semibold text-foreground text-sm mb-2">
          {lang === "zh" ? "使用提示" : "Usage Tips"}
        </p>
        <p>• {lang === "zh" ? "分數：直接輸入 1/2、3/4 等，結果亦以精確分數表示。" : "Fractions: type 1/2, 3/4 etc. — results are shown as exact fractions."}</p>
        <p>• {lang === "zh" ? "貼上矩陣：輸入「1 2; 3 4」（分號分隔行，空格分隔元素）。" : "Paste matrix: type '1 2; 3 4' (semicolons for rows, spaces for elements)."}</p>
        <p>• {lang === "zh" ? "隱式乘法：2A 等同 2*A。" : "Implicit multiply: 2A is the same as 2*A."}</p>
        <p>• {lang === "zh" ? "括號：用括號控制優先順序，例如 (A+B)^(-1)。" : "Parentheses: use them to control precedence, e.g. (A+B)^(-1)."}</p>
        <p>• {lang === "zh" ? "det(A) 和 tr(A) 返回純量，可繼續參與運算，例如 det(A)*B。" : "det(A) and tr(A) return scalars and can be used further, e.g. det(A)*B."}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatrixPage() {
  const { t, lang } = useLanguage();
  const genQuestion = useCallback(() => generateRandomMatrixQuestion(lang), [lang]);

  const [op, setOp] = useState<Operation>("add");
  const [transformMatrix, setTransformMatrix] = useState<number[][]>([[1, 0], [0, 1]]);
  const [matrices, setMatrices] = useState<MatrixEntry[]>([
    { id: 1, rows: 2, cols: 2, data: makeMatrix(2, 2) },
    { id: 2, rows: 2, cols: 2, data: makeMatrix(2, 2) },
  ]);
  const [scalar, setScalar] = useState(2);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const opInfo = OPERATIONS.find((o) => o.id === op)!;

  function handleOpChange(newOp: Operation) {
    setOp(newOp);
    setResult(null);
    setError(null);
    const newOpInfo = OPERATIONS.find((o) => o.id === newOp)!;
    if (!newOpInfo.needsMulti && matrices.length > 1) {
      setMatrices([matrices[0]]);
    }
  }

  function updateMatrix(id: number, data: Matrix) {
    setMatrices((prev) => prev.map((m) => m.id === id ? { ...m, data } : m));
    setResult(null); setError(null);
  }

  function resizeMatrix(id: number, rows: number, cols: number) {
    setMatrices((prev) => prev.map((m) =>
      m.id === id ? { ...m, rows, cols, data: makeMatrix(rows, cols) } : m
    ));
    setResult(null); setError(null);
  }

  function addMatrix() {
    const last = matrices[matrices.length - 1];
    setMatrices((prev) => [
      ...prev,
      { id: nextId++, rows: last.rows, cols: last.cols, data: makeMatrix(last.rows, last.cols) },
    ]);
    setResult(null); setError(null);
  }

  function removeMatrix(id: number) {
    if (matrices.length <= 2) return;
    setMatrices((prev) => prev.filter((m) => m.id !== id));
    setResult(null); setError(null);
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

    let res: any;

    if (opInfo.needsMulti) {
      if (matrices.length < 2) {
        setError(lang === "zh" ? "至少需要兩個矩陣" : "At least two matrices required");
        return;
      }
      let acc = matrices[0].data;
      let accSteps: any[] = [];
      for (let i = 1; i < matrices.length; i++) {
        let step: any;
        switch (op) {
          case "add": step = matAdd(acc, matrices[i].data); break;
          case "sub": step = matSub(acc, matrices[i].data); break;
          case "mul": step = matMul(acc, matrices[i].data); break;
          default: step = { error: "invalid" };
        }
        if (step.error) {
          setError(errMap[step.error] || step.error);
          return;
        }
        acc = step.result;
        if (step.steps) accSteps = accSteps.concat(step.steps);
      }
      res = { result: acc, steps: accSteps };
    } else {
      const matA = matrices[0].data;
      switch (op) {
        case "transpose": res = matTranspose(matA); break;
        case "det":       res = matDeterminant(matA); break;
        case "inv": {
          res = matInverse(matA);
          if (!res.error && res.result) {
            const ratMat = res.result.map((row: number[]) => row.map((v: number) => fromFloat(v)));
            (res as any).exactLatex = ratMatLatex(ratMat);
          }
          break;
        }
        case "scalar":    res = matScalar(matA, scalar); break;
        default: return;
      }
      if (res.error) {
        setError(errMap[res.error] || res.error);
        return;
      }
    }

    setResult(res);
  }

  function handleReset() {
    setMatrices(matrices.map((m) => ({ ...m, data: makeMatrix(m.rows, m.cols) })));
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
          {t.matrixCalc}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.labelOperation}: {opLabels[op]}
        </p>
      </div>

      <Tabs defaultValue="expr">
        <TabsList>
          <TabsTrigger value="expr">
            {lang === "zh" ? "運算式" : "Expression"}
          </TabsTrigger>
          <TabsTrigger value="calc">{t.calcMode}</TabsTrigger>
          <TabsTrigger value="transform">
            {lang === "zh" ? "幾何變換" : "Transform"}
          </TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>

        {/* ── Expression Tab (new) ── */}
        <TabsContent value="expr">
          <ExpressionTab lang={lang} />
        </TabsContent>

        {/* ── Geometric Transform Visualization Tab ── */}
        <TabsContent value="transform" className="mt-4 space-y-4">
          <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {lang === "zh" ? "矩陣線性變換視覺化" : "Matrix Linear Transformation Visualizer"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === "zh"
                ? "輸入一個 2×2 矩陣，觀察它如何將單位正方形和單位圓進行變換（拉伸、旋轉、剪切、反射）。列即標準基底的像。"
                : "Enter a 2×2 matrix to see how it transforms the unit square and unit circle (stretch, rotate, shear, reflect). Columns are images of standard basis vectors."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: lang === "zh" ? "旋轉90°" : "Rotate 90°", m: [[0,-1],[1,0]] },
              { label: lang === "zh" ? "旋轉45°" : "Rotate 45°", m: [[Math.SQRT1_2,-Math.SQRT1_2],[Math.SQRT1_2,Math.SQRT1_2]] },
              { label: lang === "zh" ? "水平剪切" : "Horiz. Shear", m: [[1,1],[0,1]] },
              { label: lang === "zh" ? "垂直剪切" : "Vert. Shear", m: [[1,0],[1,1]] },
              { label: lang === "zh" ? "拉伸 x2" : "Scale x2", m: [[2,0],[0,2]] },
              { label: lang === "zh" ? "水平反射" : "Horiz. Reflect", m: [[1,0],[0,-1]] },
              { label: lang === "zh" ? "對角線反射" : "Reflect y=x", m: [[0,1],[1,0]] },
              { label: lang === "zh" ? "x 軸投影" : "Project x-axis", m: [[1,0],[0,0]] },
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
                <path d="M8 4 L3 4 L3 96 L8 96" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="grid grid-cols-2 gap-2">
                {transformMatrix.map((row, i) =>
                  row.map((val, j) => (
                    <input
                      key={`${i}-${j}`}
                      type="number"
                      value={val === 0 ? "" : val}
                      placeholder="0"
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        setTransformMatrix(prev => prev.map((r, ri) => r.map((c, ci) => ri === i && ci === j ? (isNaN(n) ? 0 : n) : c)));
                      }}
                      className="matrix-cell w-16"
                    />
                  ))
                )}
              </div>
              <svg width="10" height="100" viewBox="0 0 10 100" fill="none">
                <path d="M2 4 L7 4 L7 96 L2 96" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              <span className="text-muted-foreground">{lang === "zh" ? "原始形狀" : "Original"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-2 bg-indigo-400/20 border border-indigo-400/60 inline-block rounded" />
              <span className="text-muted-foreground">{lang === "zh" ? "變換後" : "Transformed"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-red-600 inline-block rounded" />
              <span className="text-muted-foreground">Ae₁ {lang === "zh" ? "（第一行）" : "(col 1)"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-green-600 inline-block rounded" />
              <span className="text-muted-foreground">Ae₂ {lang === "zh" ? "（第二行）" : "(col 2)"}</span>
            </span>
          </div>
        </TabsContent>

        <TabsContent value="practice" className="mt-4">
          <PracticePanel generateQuestion={genQuestion} moduleLabel={lang === "zh" ? "矩陣練習" : "Matrix Practice"} />
        </TabsContent>

        <TabsContent value="calc" className="mt-4">

          {/* Operation selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OPERATIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => handleOpChange(o.id)}
                className={`px-3 py-2 text-xs font-mono font-medium rounded border transition-all duration-150
                  ${op === o.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary"
                  }`}
              >
                {opLabels[o.id]}
              </button>
            ))}
          </div>

          {/* Matrix inputs */}
          <div className="space-y-4 mt-4">
            {matrices.map((m, idx) => (
              <div key={m.id} className="p-4 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <DimSelector
                    label={`${lang === "zh" ? "矩陣" : "Matrix"} ${matrixLabels[idx] ?? idx + 1}`}
                    rows={m.rows}
                    cols={m.cols}
                    onRowsChange={(r) => {
                      if (opInfo.needsSquare) resizeMatrix(m.id, r, r);
                      else resizeMatrix(m.id, r, m.cols);
                    }}
                    onColsChange={(c) => {
                      if (opInfo.needsSquare) resizeMatrix(m.id, c, c);
                      else resizeMatrix(m.id, m.rows, c);
                    }}
                    rowsLabel={t.matrixRows}
                    colsLabel={t.matrixCols}
                    squareOnly={opInfo.needsSquare}
                  />
                  {opInfo.needsMulti && matrices.length > 2 && (
                    <button
                      onClick={() => removeMatrix(m.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title={lang === "zh" ? "刪除此矩陣" : "Remove this matrix"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <MatrixInput
                  label={`${lang === "zh" ? "矩陣" : "Matrix"} ${matrixLabels[idx] ?? idx + 1}`}
                  matrix={m.data}
                  onChange={(data) => updateMatrix(m.id, data)}
                />
              </div>
            ))}

            {opInfo.needsMulti && matrices.length < 6 && (
              <button
                onClick={addMatrix}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm font-mono"
              >
                <Plus className="w-4 h-4" />
                {lang === "zh" ? "新增矩陣" : "Add Matrix"}
              </button>
            )}

            {op === "scalar" && (
              <div className="flex items-center gap-3 px-4">
                <label className="text-sm font-medium text-muted-foreground">{t.scalarValue} k =</label>
                <input
                  type="number"
                  value={scalar}
                  onChange={(e) => setScalar(parseFloat(e.target.value) || 0)}
                  className="matrix-cell w-20"
                />
              </div>
            )}
          </div>

          {opInfo.needsMulti && matrices.length >= 2 && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border overflow-x-auto mt-4">
              <KatexRenderer
                latex={matrices.map((_, i) => matrixLabels[i] ?? String(i + 1)).join(
                  op === "add" ? " + " : op === "sub" ? " - " : " \\cdot "
                )}
                displayMode={false}
              />
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button onClick={handleCalculate} className="font-mono">
              {t.calculate}
            </Button>
            <Button variant="outline" onClick={handleReset} className="font-mono">
              {t.reset}
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive mt-4">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && !error && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-accent font-mono uppercase tracking-wide">
                    {t.result}
                  </span>
                </div>
                <div className="result-row overflow-x-auto">
                  {result.result && (
                    <KatexRenderer
                      latex={(result as any).exactLatex || matrixToLatex(result.result)}
                      displayMode={true}
                    />
                  )}
                  {result.scalar !== undefined && (
                    <KatexRenderer
                      latex={`= ${(result as any).scalarLatex || fmt(result.scalar)}`}
                      displayMode={true}
                    />
                  )}
                </div>
              </div>

              {result.steps && result.steps.length > 0 && (
                <StepDisplay steps={result.steps} title={t.steps} />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
