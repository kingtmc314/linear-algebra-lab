// MatrixPowerPage — Compute A^n using Diagonalization
// Shows exact values: integers, fractions, or power notation
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MatrixInput, { DimSelector } from "@/components/MatrixInput";
import KatexRenderer from "@/components/KatexRenderer";
import { Matrix, zeroMatrix, matrixToLatex } from "@/lib/matrixMath";
import { computeMatrixPower, fmtExact } from "@/lib/matrixPower";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

function makeMatrix(r: number, c: number): Matrix {
  return zeroMatrix(r, c);
}

export default function MatrixPowerPage() {
  const { t, lang } = useLanguage();

  const [size, setSize] = useState<2 | 3>(2);
  const [matA, setMatA] = useState<Matrix>(makeMatrix(2, 2));
  const [nValue, setNValue] = useState<number>(3);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  function handleSizeChange(s: 2 | 3) {
    setSize(s);
    setMatA(makeMatrix(s, s));
    setResult(null);
    setError(null);
  }

  function handleCompute() {
    setError(null);
    setResult(null);
    if (!Number.isInteger(nValue) || nValue < 0) {
      setError(lang === "zh" ? "n 必須為非負整數" : "n must be a non-negative integer");
      return;
    }
    try {
      const res = computeMatrixPower(matA, nValue);
      if (res.error) {
        const errMap: Record<string, string> = {
          complex_eigenvalues: lang === "zh" ? "矩陣有複數特徵值，無法對角化（此工具只支援實數特徵值）" : "Matrix has complex eigenvalues — diagonalization requires real eigenvalues",
          not_diagonalizable: lang === "zh" ? "矩陣不可對角化（特徵向量不足）" : "Matrix is not diagonalizable (insufficient eigenvectors)",
          eigen_failed: lang === "zh" ? "特徵值計算失敗" : "Eigenvalue computation failed",
        };
        setError(errMap[res.error] || res.error);
      } else {
        setResult(res);
      }
    } catch (e) {
      setError(lang === "zh" ? "計算錯誤，請檢查輸入" : "Computation error, please check input");
    }
  }

  function handleReset() {
    setMatA(makeMatrix(size, size));
    setNValue(3);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
          {lang === "zh" ? "矩陣 n 次方（對角化法）" : "Matrix Power A^n (Diagonalization)"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "zh"
            ? "利用 A = PDP⁻¹ 對角化，計算 A^n = PD^nP⁻¹，結果以精確值表示"
            : "Uses A = PDP⁻¹ diagonalization to compute A^n = PD^nP⁻¹ with exact values"}
        </p>
      </div>

      {/* Size selector */}
      <div className="flex gap-3 items-center">
        <span className="text-sm font-medium text-muted-foreground">
          {lang === "zh" ? "矩陣大小：" : "Matrix Size:"}
        </span>
        {([2, 3] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleSizeChange(s)}
            className={`px-4 py-1.5 text-sm font-mono rounded border transition-all duration-150
              ${size === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/50"}`}
          >
            {s}×{s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
          <DimSelector
            label={lang === "zh" ? "矩陣 A" : "Matrix A"}
            rows={size}
            cols={size}
            onRowsChange={() => {}}
            onColsChange={() => {}}
            rowsLabel={t.matrixRows}
            colsLabel={t.matrixCols}
          />
          <MatrixInput
            label={lang === "zh" ? "矩陣 A" : "Matrix A"}
            matrix={matA}
            onChange={setMatA}
          />
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
          <p className="text-sm font-semibold text-foreground font-mono">
            {lang === "zh" ? "指數 n" : "Exponent n"}
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">n =</label>
            <input
              type="number"
              min={0}
              step={1}
              value={nValue}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 0) setNValue(v);
              }}
              className="matrix-cell w-24 text-center"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "zh" ? "n 為非負整數（0, 1, 2, 3, ...）" : "n must be a non-negative integer (0, 1, 2, 3, ...)"}
          </p>

          {/* Theory note */}
          <div className="mt-4 p-3 rounded bg-secondary/50 border border-border">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              {lang === "zh"
                ? "原理：若 A = PDP⁻¹，則 A^n = PD^nP⁻¹。D^n 只需將對角元素（特徵值）取 n 次方。"
                : "Theory: If A = PDP⁻¹, then A^n = PD^nP⁻¹. D^n simply raises each diagonal entry (eigenvalue) to the power n."}
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleCompute} className="font-mono">
          {lang === "zh" ? "計算 A^n" : "Compute A^n"}
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
          {/* Diagonalization summary */}
          <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent font-mono uppercase tracking-wide">
                {lang === "zh" ? "矩陣可對角化" : "Matrix is Diagonalizable"}
              </span>
            </div>

            {/* Eigenvalues */}
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={result.eigenvalues.map((v: number, i: number) =>
                  `\\lambda_{${i+1}} = ${fmtExact(v)}`
                ).join(",\\quad ")}
                displayMode={true}
              />
            </div>

            {/* P, D, P^-1 */}
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={`P = ${matrixToLatex(result.P)},\\quad D = ${matrixToLatex(result.D)},\\quad P^{-1} = ${matrixToLatex(result.Pinv)}`}
                displayMode={true}
              />
            </div>
          </div>

          {/* A^n result */}
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
            <p className="text-sm font-semibold font-mono text-primary uppercase tracking-wide">
              {lang === "zh" ? `A^{${result.n}} 的精確值` : `Exact Value of A^{${result.n}}`}
            </p>
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={`A^{${result.n}} = ${result.AnLatex}`}
                displayMode={true}
              />
            </div>
          </div>

          {/* Step-by-step accordion */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setStepsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <span className="text-sm font-semibold font-mono">
                {lang === "zh" ? "逐步推導" : "Step-by-Step Derivation"}
              </span>
              {stepsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {stepsOpen && (
              <div className="divide-y divide-border">
                {result.steps.map((step: any, i: number) => (
                  <div key={i} className="px-4 py-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {lang === "zh" ? step.titleZh : step.titleEn}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lang === "zh" ? step.explanationZh : step.explanationEn}
                    </p>
                    <div className="overflow-x-auto mt-2">
                      <KatexRenderer latex={step.latex} displayMode={true} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
