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
        case "inv":       res = matInverse(matA); break;
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
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>

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
                onRowsChange={(r) => resizeMatrix(m.id, r, m.cols)}
                onColsChange={(c) => resizeMatrix(m.id, m.rows, c)}
                rowsLabel={t.matrixRows}
                colsLabel={t.matrixCols}
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
                  latex={matrixToLatex(result.result)}
                  displayMode={true}
                />
              )}
              {result.scalar !== undefined && (
                <KatexRenderer
                  latex={`= ${fmt(result.scalar)}`}
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
