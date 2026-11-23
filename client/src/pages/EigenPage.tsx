// EigenPage — Eigenvalue & Eigenvector Calculator
import { useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MatrixInput from "@/components/MatrixInput";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import PracticePanel from "@/components/PracticePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { computeEigen, type EigenResult } from "@/lib/eigenMath";
import { zeroMatrix } from "@/lib/matrixMath";
import {
  buildEigenTeachingSteps,
  eigenvectorDiagnostics,
} from "@/lib/Phase20eigen";
import { generateEigenQuestion } from "@/lib/practiceGenerator";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Matrix = number[][];

// These displays are rounded numeric outputs, never inferred exact fractions.
function fmt(value: number): string {
  if (!Number.isFinite(value)) return "\\text{unavailable}";
  const [mantissa, exponent] = Number(value.toPrecision(6))
    .toString()
    .split("e");
  return exponent ? `${mantissa}\\times10^{${Number(exponent)}}` : mantissa;
}

export default function EigenPage() {
  const { t, lang } = useLanguage();
  const zh = lang === "zh";
  const genQuestion = useCallback(() => generateEigenQuestion(lang), [lang]);
  const [size, setSize] = useState<2 | 3>(2);
  const [matrix, setMatrix] = useState<Matrix>(zeroMatrix(2, 2));
  const [calculatedMatrix, setCalculatedMatrix] = useState<Matrix | null>(null);
  const [result, setResult] = useState<EigenResult | null>(null);
  const [calculationId, setCalculationId] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const teachingSteps = useMemo(
    () =>
      result && calculatedMatrix
        ? buildEigenTeachingSteps(calculatedMatrix, result, lang)
        : [],
    [result, calculatedMatrix, lang]
  );
  const diagnostics = useMemo(
    () =>
      result && calculatedMatrix
        ? result.eigenvectors.map((v, i) =>
            eigenvectorDiagnostics(calculatedMatrix, result.eigenvalues[i], v)
          )
        : [],
    [result, calculatedMatrix]
  );
  const hasInvalidOutput = Boolean(
    result &&
      (result.eigenvalues.some(value => !Number.isFinite(value)) ||
        diagnostics.some(item => !item.valid))
  );

  function clearCalculation() {
    setResult(null);
    setCalculatedMatrix(null);
    setError(null);
  }

  function handleSizeChange(newSize: 2 | 3) {
    setSize(newSize);
    setMatrix(zeroMatrix(newSize, newSize));
    clearCalculation();
  }

  function handleMatrixChange(next: Matrix) {
    setMatrix(next);
    clearCalculation();
  }

  function handleCalculate() {
    clearCalculation();
    if (matrix.some(row => row.some(cell => !Number.isFinite(cell)))) {
      setError(t.errInvalidInput);
      return;
    }
    const snapshot = matrix.map(row => [...row]);
    try {
      const res = computeEigen(snapshot);
      setCalculatedMatrix(snapshot);
      setResult(res);
      setCalculationId(id => id + 1);
      // Keep partial derivations playable even when complex roots are unsupported.
      if (res.error) setError(res.error);
    } catch {
      setError(
        zh
          ? "此輸入無法完成計算，請檢查矩陣數值。"
          : "This calculation could not be completed. Please check the matrix entries."
      );
    }
  }

  function handleReset() {
    setMatrix(zeroMatrix(size, size));
    clearCalculation();
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl min-w-0">
      <header>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'IBM Plex Serif', serif" }}
        >
          {zh ? "特徵值與特徵向量" : "Eigenvalues & Eigenvectors"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {zh
            ? "從特徵多項式展開，到求 λ，再由零空間求非零向量 v；逐步閱讀或播放完整推導。"
            : "Expand the characteristic polynomial, solve for λ, then find nonzero v in the null space. Read or play the full derivation."}
        </p>
      </header>

      <Tabs defaultValue="calc">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="calc">{t.calcMode}</TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>
        <TabsContent value="practice" className="mt-4">
          <PracticePanel
            generateQuestion={genQuestion}
            moduleLabel={zh ? "特徵值練習" : "Eigenvalue Practice"}
          />
        </TabsContent>

        <TabsContent value="calc" className="mt-4 space-y-4 min-w-0">
          <section className="p-4 rounded-lg border border-border bg-card space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {zh ? "矩陣大小" : "Matrix size"}
              </span>
              {([2, 3] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  onClick={() => handleSizeChange(s)}
                  className={`px-4 py-2 text-sm font-mono font-semibold rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    size === s
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary"
                  }`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto pb-1">
              <p className="text-xs text-muted-foreground mb-2">
                {zh
                  ? `輸入 ${size}×${size} 實數方陣 A；修改輸入後請重新計算。`
                  : `Enter a ${size}×${size} real square matrix A; recalculate after editing.`}
              </p>
              <MatrixInput
                label={zh ? "矩陣 A" : "Matrix A"}
                matrix={matrix}
                onChange={handleMatrixChange}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground border-t border-border pt-3">
              <p>
                <span className="font-semibold text-primary">λ</span> —{" "}
                {zh
                  ? "待求的純量特徵值，表示此方向的縮放倍率。I 是與 A 同大小的單位矩陣。"
                  : "The unknown scalar eigenvalue: the scale factor along this direction. I is the identity of the same size as A."}
              </p>
              <p>
                <span className="font-semibold text-primary">v</span> —{" "}
                {zh
                  ? "非零特徵向量，滿足 Av = λv；v₁、v₂、v₃ 是向量分量，不是特徵值。"
                  : "A nonzero eigenvector satisfying Av = λv; v₁, v₂, v₃ are vector components, not eigenvalues."}
              </p>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCalculate} className="font-mono">
              {zh ? "計算特徵值" : "Compute Eigenvalues"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="font-mono"
            >
              {t.reset}
            </Button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 min-w-0">
              <section className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {zh ? "推導閱讀指南" : "Derivation guide"}
                </h2>
                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-primary">
                  <li>1 · {zh ? "展開 det(A − λI)" : "Expand det(A − λI)"}</li>
                  <li>
                    2 · {zh ? "解多項式，求 λ" : "Solve the polynomial for λ"}
                  </li>
                  <li>
                    3 ·{" "}
                    {zh
                      ? "解零空間，歸一化與檢查"
                      : "Find the null space, normalize, check"}
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  {zh
                    ? "展開公式保留原有 LaTeX。新增係數以輸入的小數值精確整理；既有求解器的根、代入矩陣與歸一化分量均視為數值近似，即使畫面顯示整數或分數，也不據此宣稱精確。"
                    : "Original LaTeX formulas are preserved. Added coefficients are collected exactly from the decimal input; roots, substituted matrices, and normalized components from the existing solver are numerical approximations, even when displayed as integers or fractions."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {zh
                    ? "使用下方共用步驟播放器播放、暫停或逐步查看；所有子式、求根及列變換快照都在同一條推導中。"
                    : "Use the shared step player below to play, pause, or inspect individual steps; minors, root solving, and row-operation snapshots share one timeline."}
                </p>
              </section>

              {hasInvalidOutput && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    {zh
                      ? "既有求解器回傳非有限值、零向量或未通過殘差檢查的結果。以下保留原有推導供檢視，但不可視為已求得有效特徵對；本頁不猜測精確根或自行改寫結果。"
                      : "The existing solver returned a non-finite value, zero vector, or a pair that fails the residual check. Original derivations remain available for inspection, but these are not validated eigenpairs. This page does not guess exact roots or replace the results."}
                  </p>
                </div>
              )}

              <StepDisplay
                key={calculationId}
                steps={teachingSteps}
                title={
                  zh
                    ? "完整推導：多項式 → λ → v"
                    : "Full derivation: polynomial → λ → v"
                }
              />

              <section className="p-4 rounded-lg border border-border bg-card">
                <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {zh
                    ? "特徵方程式（首項係數為 1）"
                    : "Characteristic equation (monic form)"}
                </h2>
                <div className="overflow-x-auto">
                  <KatexRenderer
                    latex={result.characteristicPolynomial}
                    displayMode
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {zh
                    ? "此卡保留既有求解器的係數格式，可能含分數近似或數值門檻；輸入小數的精確整理係數請見上方推導。"
                    : "This card preserves the existing solver's coefficient formatting, which may include fraction approximations or numerical thresholds; see the timeline for exact collected coefficients of the decimal input."}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {zh
                    ? "對 3×3，原本 p(λ) = det(A − λI) 的首項為 −λ³；乘以 −1 得上式，根不變。這張卡片是方程式，不是 p(λ) 的定義。"
                    : "For 3×3, p(λ) = det(A − λI) starts with −λ³; multiplying by −1 gives this equation with the same roots. This card shows the equation, not the definition of p(λ)."}
                </p>
              </section>

              {!error && result.eigenvalues.length > 0 && (
                <section className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <h2 className="text-sm font-semibold text-primary mb-2">
                    {zh
                      ? "特徵值（數值近似）"
                      : "Eigenvalues (numerical approximations)"}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-2">
                    {zh
                      ? "顯示至多六位有效數字；3×3 求解器先四捨五入至小數點後六位。重根只列一次，這不表示其代數重數為 1。"
                      : "Shown to at most six significant digits; the 3×3 solver first rounds to six decimal places. Repeated roots are listed once; this does not imply algebraic multiplicity 1."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.eigenvalues.map((lambda, i) => (
                      <div key={i} className="overflow-x-auto">
                        <KatexRenderer
                          latex={`\\lambda_{${i + 1}} \\approx ${fmt(lambda)}`}
                          displayMode
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {!error && result.eigenvectors.length > 0 && (
                <section className="p-4 rounded-lg border border-border bg-card">
                  <h2 className="text-sm font-semibold text-foreground mb-2">
                    {zh
                      ? "特徵向量（歸一化候選值，數值近似）"
                      : "Eigenvectors (normalized candidates, approximate)"}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    {zh
                      ? "正負號與任意非零倍數均可代表同一特徵方向；每個特徵值只展示求解器回傳的一個向量。綠色檢查只代表數值殘差通過，不是精確證明。"
                      : "Opposite signs and nonzero multiples represent the same eigendirection. Only one returned vector is shown per eigenvalue. A passing check means numerical consistency, not an exact proof."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {result.eigenvectors.map((v, i) => {
                      const diagnostic = diagnostics[i];
                      return (
                        <div
                          key={i}
                          className="rounded-md border border-border p-3 min-w-0 space-y-2"
                        >
                          <p className="text-xs text-muted-foreground">
                            {zh ? "對應" : "Corresponding to"} λ{i + 1} ≈{" "}
                            {Number.isFinite(result.eigenvalues[i])
                              ? Number(
                                  result.eigenvalues[i].toPrecision(6)
                                ).toString()
                              : zh
                                ? "無有效數值"
                                : "unavailable"}
                          </p>
                          <div className="overflow-x-auto">
                            <KatexRenderer
                              latex={`\\mathbf v_{${i + 1}}\\approx\\begin{pmatrix}${v.map(fmt).join(" \\\\ ")}\\end{pmatrix}`}
                              displayMode
                            />
                          </div>
                          <div
                            className={`flex gap-2 items-start text-xs ${diagnostic.valid ? "text-primary" : "text-destructive"}`}
                          >
                            {diagnostic.valid ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span>
                              {diagnostic.valid
                                ? zh
                                  ? "數值殘差檢查通過"
                                  : "Numerical residual check passed"
                                : zh
                                  ? "未通過非零向量／殘差檢查"
                                  : "Nonzero-vector / residual check failed"}
                            </span>
                          </div>
                          <div className="overflow-x-auto text-xs">
                            <KatexRenderer
                              latex={`\\|A\\mathbf v-\\lambda\\mathbf v\\|_2\\approx${fmt(diagnostic.residual)}`}
                              displayMode
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          <aside className="p-4 rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground space-y-2">
            <h2 className="font-semibold text-foreground text-xs uppercase tracking-wide">
              {zh ? "理論說明與限制" : "Theory and limitations"}
            </h2>
            <p>
              {zh
                ? "特徵值 λ 及非零特徵向量 v 滿足 Av = λv。特徵值由 det(A − λI) = 0 求得；特徵向量由 (A − λI)v = 0 的零空間求得。若一個特徵值有多維零空間，可能有多個獨立的特徵向量。"
                : "An eigenvalue λ and nonzero eigenvector v satisfy Av = λv. Solve det(A − λI) = 0 for eigenvalues, then find the null space of (A − λI)v = 0. An eigenspace can contain several independent eigenvectors."}
            </p>
            <p>
              {zh
                ? "本工具支援 2×2、3×3 實數方陣與既有求解器的實數輸出，不提供複數特徵對或完整特徵空間基底。求解器包含數值門檻與四捨五入；接近重根或數值不穩定時，請檢視殘差與警告。"
                : "This tool supports 2×2 and 3×3 real matrices and the existing solver's real outputs, not complex eigenpairs or full eigenspace bases. The solver uses tolerances and rounding; inspect residuals and warnings near repeated roots or numerical instability."}
            </p>
          </aside>
        </TabsContent>
      </Tabs>
    </div>
  );
}
