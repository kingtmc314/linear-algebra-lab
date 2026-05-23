// MatrixPage — Matrix Calculator
// Academic Precision Design: left input, right result, step-by-step accordion
import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MatrixInput, { DimSelector } from "@/components/MatrixInput";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
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
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Operation =
  | "add" | "sub" | "mul" | "transpose" | "det" | "inv" | "scalar";

const OPERATIONS: { id: Operation; needsB: boolean; needsSquare?: boolean }[] = [
  { id: "add", needsB: true },
  { id: "sub", needsB: true },
  { id: "mul", needsB: true },
  { id: "transpose", needsB: false },
  { id: "det", needsB: false, needsSquare: true },
  { id: "inv", needsB: false, needsSquare: true },
  { id: "scalar", needsB: false },
];

function makeMatrix(r: number, c: number): Matrix {
  return zeroMatrix(r, c);
}

export default function MatrixPage() {
  const { t } = useLanguage();

  const [op, setOp] = useState<Operation>("add");
  const [rowsA, setRowsA] = useState(2);
  const [colsA, setColsA] = useState(2);
  const [rowsB, setRowsB] = useState(2);
  const [colsB, setColsB] = useState(2);
  const [matA, setMatA] = useState<Matrix>(makeMatrix(2, 2));
  const [matB, setMatB] = useState<Matrix>(makeMatrix(2, 2));
  const [scalar, setScalar] = useState(2);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const opInfo = OPERATIONS.find((o) => o.id === op)!;

  function resizeA(r: number, c: number) {
    setRowsA(r); setColsA(c);
    setMatA(makeMatrix(r, c));
    setResult(null); setError(null);
  }
  function resizeB(r: number, c: number) {
    setRowsB(r); setColsB(c);
    setMatB(makeMatrix(r, c));
    setResult(null); setError(null);
  }

  function handleCalculate() {
    setError(null);
    setResult(null);

    let res: any;
    switch (op) {
      case "add": res = matAdd(matA, matB); break;
      case "sub": res = matSub(matA, matB); break;
      case "mul": res = matMul(matA, matB); break;
      case "transpose": res = matTranspose(matA); break;
      case "det": res = matDeterminant(matA); break;
      case "inv": res = matInverse(matA); break;
      case "scalar": res = matScalar(matA, scalar); break;
      default: return;
    }

    if (res.error) {
      const errMap: Record<string, string> = {
        dim_mismatch: t.errDimMismatch,
        square_required: t.errSquareRequired,
        singular: t.errSingular,
        invalid: t.errInvalidInput,
      };
      setError(errMap[res.error] || res.error);
    } else {
      setResult(res);
    }
  }

  function handleReset() {
    setMatA(makeMatrix(rowsA, colsA));
    setMatB(makeMatrix(rowsB, colsB));
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

      {/* Operation selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OPERATIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => { setOp(o.id); setResult(null); setError(null); }}
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

      {/* Input area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matrix A */}
        <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
          <DimSelector
            label={t.matrixA}
            rows={rowsA}
            cols={colsA}
            onRowsChange={(r) => resizeA(r, colsA)}
            onColsChange={(c) => resizeA(rowsA, c)}
            rowsLabel={t.matrixRows}
            colsLabel={t.matrixCols}
          />
          <MatrixInput
            label={t.matrixA}
            matrix={matA}
            onChange={setMatA}
          />
          {op === "scalar" && (
            <div className="flex items-center gap-3">
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

        {/* Matrix B (if needed) */}
        {opInfo.needsB && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
            <DimSelector
              label={t.matrixB}
              rows={rowsB}
              cols={colsB}
              onRowsChange={(r) => resizeB(r, colsB)}
              onColsChange={(c) => resizeB(rowsB, c)}
              rowsLabel={t.matrixRows}
              colsLabel={t.matrixCols}
            />
            <MatrixInput
              label={t.matrixB}
              matrix={matB}
              onChange={setMatB}
            />
          </div>
        )}
      </div>

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
          {/* Result display */}
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

          {/* Steps */}
          {result.steps && result.steps.length > 0 && (
            <StepDisplay steps={result.steps} title={t.steps} />
          )}
        </div>
      )}
    </div>
  );
}
