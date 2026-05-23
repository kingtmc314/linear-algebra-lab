// MatrixPage — Matrix Calculator with multi-matrix chain operations
// Supports 2+ matrices for add/sub/mul; single-matrix for transpose/det/inv/scalar
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
    // For single-matrix ops, keep only first matrix
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
      // Chain operation: fold over all matrices
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

      <Tabs defaultValue="calc">
        <TabsList>
          <TabsTrigger value="calc">{t.calcMode}</TabsTrigger>
          <TabsTrigger value="transform">
            {lang === "zh" ? "幾何變換" : "Transform"}
          </TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>

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

          {/* Preset buttons */}
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

          {/* Matrix input */}
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

          {/* Visualization */}
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

          {/* Legend */}
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
      <div className="space-y-4">
        {matrices.map((m, idx) => (
          <div key={m.id} className="p-4 rounded-lg border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <DimSelector
                label={`${lang === "zh" ? "矩陣" : "Matrix"} ${matrixLabels[idx] ?? idx + 1}`}
                rows={m.rows}
                cols={m.cols}
                onRowsChange={(r) => {
                  // For square-required ops, keep rows === cols
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

        {/* Add matrix button (only for multi-matrix ops) */}
        {opInfo.needsMulti && matrices.length < 6 && (
          <button
            onClick={addMatrix}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm font-mono"
          >
            <Plus className="w-4 h-4" />
            {lang === "zh" ? "新增矩陣" : "Add Matrix"}
          </button>
        )}

        {/* Scalar input */}
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

      {/* Chain operation notation */}
      {opInfo.needsMulti && matrices.length >= 2 && (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border overflow-x-auto">
          <KatexRenderer
            latex={matrices.map((_, i) => matrixLabels[i] ?? String(i + 1)).join(
              op === "add" ? " + " : op === "sub" ? " - " : " \\cdot "
            )}
            displayMode={false}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={handleCalculate} className="font-mono">
          {t.calculate}
        </Button>
        <Button variant="outline" onClick={handleReset} className="font-mono">
          {t.reset}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && !error && (
        <div className="space-y-4">
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
