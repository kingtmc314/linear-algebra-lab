// EigenPage — Eigenvalue & Eigenvector Calculator
// Academic Precision Design: matches existing app style
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MatrixInput, { DimSelector } from "@/components/MatrixInput";
import KatexRenderer from "@/components/KatexRenderer";
import { computeEigen, type EigenResult } from "@/lib/eigenMath";
import { zeroMatrix } from "@/lib/matrixMath";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

type Matrix = number[][];

function fmt(v: number): string {
  if (Math.abs(v) < 1e-10) return "0";
  const r = parseFloat(v.toFixed(4));
  return r.toString();
}

function EigenStepDisplay({ result, lang }: { result: EigenResult; lang: "zh" | "en" }) {
  const [expanded, setExpanded] = useState(true);
  const title = lang === "zh" ? "詳細計算步驟" : "Detailed Steps";

  if (!result.steps || result.steps.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground font-mono uppercase tracking-wide">
          {title}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-border">
          {result.steps.map((step, i) => (
            <div
              key={i}
              className="px-4 py-4"
              style={{
                animation: "fadeInUp 0.3s ease-out both",
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="flex gap-3">
                {/* Step number */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary font-mono">{i + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {lang === "zh" ? step.titleZh : step.titleEn}
                  </p>
                  {/* Explanation */}
                  <p className="text-xs text-muted-foreground mb-2 whitespace-pre-line">
                    {lang === "zh" ? step.explanationZh : step.explanationEn}
                  </p>
                  {/* LaTeX formula */}
                  {step.latex && (
                    <div className="overflow-x-auto py-1 bg-secondary/30 rounded px-3">
                      <KatexRenderer latex={step.latex} displayMode={true} className="text-sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EigenPage() {
  const { t, lang } = useLanguage();

  const [size, setSize] = useState<2 | 3>(2);
  const [matrix, setMatrix] = useState<Matrix>(zeroMatrix(2, 2));
  const [result, setResult] = useState<EigenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSizeChange(newSize: 2 | 3) {
    setSize(newSize);
    setMatrix(zeroMatrix(newSize, newSize));
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    setResult(null);

    // Validate: check all cells are numbers
    for (const row of matrix) {
      for (const cell of row) {
        if (isNaN(cell)) {
          setError(t.errInvalidInput);
          return;
        }
      }
    }

    const res = computeEigen(matrix);
    if (res.error) {
      setError(res.error);
    } else {
      setResult(res);
    }
  }

  function handleReset() {
    setMatrix(zeroMatrix(size, size));
    setResult(null);
    setError(null);
  }

  const pageTitle = lang === "zh" ? "特徵值與特徵向量" : "Eigenvalues & Eigenvectors";
  const pageSubtitle =
    lang === "zh"
      ? "計算方陣的特徵值 λ 及對應特徵向量 v，顯示特徵多項式展開步驟"
      : "Compute eigenvalues λ and eigenvectors v of a square matrix, with characteristic polynomial expansion";

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'IBM Plex Serif', serif" }}
        >
          {pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{pageSubtitle}</p>
      </div>

      {/* Matrix size selector */}
      <div className="p-4 rounded-lg border border-border bg-card space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">
            {lang === "zh" ? "矩陣大小" : "Matrix Size"}
          </span>
          {([2, 3] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSizeChange(s)}
              className={`px-4 py-1.5 text-sm font-mono font-semibold rounded border transition-all duration-150
                ${size === s
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary"
                }`}
            >
              {s}×{s}
            </button>
          ))}
        </div>

        {/* Matrix input */}
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-2">
            {lang === "zh" ? `輸入 ${size}×${size} 方陣 A` : `Enter ${size}×${size} square matrix A`}
          </p>
          <MatrixInput
            label={lang === "zh" ? "矩陣 A" : "Matrix A"}
            matrix={matrix}
            onChange={setMatrix}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={handleCalculate} className="font-mono">
          {lang === "zh" ? "計算特徵值" : "Compute Eigenvalues"}
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

      {/* Results */}
      {result && !error && (
        <div className="space-y-4">
          {/* Characteristic polynomial */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {lang === "zh" ? "特徵多項式" : "Characteristic Polynomial"}
            </p>
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={`p(\\lambda) = ${result.characteristicPolynomial}`}
                displayMode={true}
              />
            </div>
          </div>

          {/* Eigenvalues */}
          <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent font-mono uppercase tracking-wide">
                {lang === "zh" ? "特徵值" : "Eigenvalues"}
              </span>
            </div>
            <div className="space-y-2">
              {result.eigenvalues.map((lam, i) => (
                <div key={i} className="overflow-x-auto">
                  <KatexRenderer
                    latex={`\\lambda_{${i + 1}} = ${fmt(lam)}`}
                    displayMode={true}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Eigenvectors */}
          {result.eigenvectors.length > 0 && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary font-mono uppercase tracking-wide">
                  {lang === "zh" ? "特徵向量（歸一化）" : "Eigenvectors (Normalized)"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.eigenvectors.map((ev, i) => {
                  const lam = result.eigenvalues[i];
                  const vecLatex =
                    ev.length === 2
                      ? `\\mathbf{v}_{${i + 1}} = \\begin{pmatrix} ${fmt(ev[0])} \\\\ ${fmt(ev[1])} \\end{pmatrix}`
                      : `\\mathbf{v}_{${i + 1}} = \\begin{pmatrix} ${fmt(ev[0])} \\\\ ${fmt(ev[1])} \\\\ ${fmt(ev[2])} \\end{pmatrix}`;
                  return (
                    <div key={i} className="space-y-1">
                      <p className="text-xs text-muted-foreground font-mono">
                        {lang === "zh"
                          ? `對應 λ${i + 1} = ${fmt(lam)}`
                          : `Corresponding to λ${i + 1} = ${fmt(lam)}`}
                      </p>
                      <div className="overflow-x-auto">
                        <KatexRenderer latex={vecLatex} displayMode={true} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step-by-step derivation */}
          <EigenStepDisplay result={result} lang={lang} />
        </div>
      )}

      {/* Info box: theory note */}
      <div className="p-4 rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground font-mono text-xs uppercase tracking-wide">
          {lang === "zh" ? "理論說明" : "Theory Note"}
        </p>
        <p>
          {lang === "zh"
            ? "特徵值 λ 及特徵向量 v 滿足 Av = λv。特徵值由特徵多項式 det(A − λI) = 0 求得；特徵向量則由對應的齊次方程組 (A − λI)v = 0 的非零解求得。"
            : "Eigenvalues λ and eigenvectors v satisfy Av = λv. Eigenvalues are found by solving det(A − λI) = 0 (the characteristic polynomial); eigenvectors are non-zero solutions to the homogeneous system (A − λI)v = 0."}
        </p>
        <p>
          {lang === "zh"
            ? "本工具支援 2×2 及 3×3 實數方陣，並顯示每一步的推導過程。"
            : "This tool supports 2×2 and 3×3 real square matrices and shows every derivation step."}
        </p>
      </div>
    </div>
  );
}
