// MatrixPowerPage — diagonalization teaching with the shared derivation player.
import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MatrixInput, { DimSelector } from "@/components/MatrixInput";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import { type Matrix, zeroMatrix, matrixToLatex } from "@/lib/matrixMath";
import {
  computeMatrixPower,
  fmtExact,
  type MatrixPowerResult,
} from "@/lib/matrixPower";
import { buildPhase20powerSteps } from "@/lib/Phase20power";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function MatrixPowerPage() {
  const { t, lang } = useLanguage();
  const zh = lang === "zh";
  const [size, setSize] = useState<2 | 3>(2);
  const [matA, setMatA] = useState<Matrix>(zeroMatrix(2, 2));
  const [nValue, setNValue] = useState<number>(3);
  const [result, setResult] = useState<MatrixPowerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derivationSteps = useMemo(() => {
    if (!result) return [];
    if (!result.error) return buildPhase20powerSteps(result, zh ? "zh" : "en");
    return result.steps.map(step => ({
      description: zh
        ? `${step.titleZh} — ${step.explanationZh}（數值近似；此處只保留已完成的步驟，尚未建立完整對角化。）`
        : `${step.titleEn} — ${step.explanationEn} (Numerical approximation; only completed steps are retained, not a full diagonalization.)`,
      latex: step.latex,
    }));
  }, [result, zh]);

  function clearResult() {
    setResult(null);
    setError(null);
  }

  function handleSizeChange(s: 2 | 3) {
    setSize(s);
    setMatA(zeroMatrix(s, s));
    clearResult();
  }

  function handleCompute() {
    clearResult();
    if (!Number.isSafeInteger(nValue) || nValue < 0) {
      setError(
        zh
          ? "n 必須為可安全表示的非負整數"
          : "n must be a safely representable non-negative integer"
      );
      return;
    }
    if (!matA.every(row => row.every(Number.isFinite))) {
      setError(
        zh
          ? "矩陣元素必須為有限實數"
          : "Matrix entries must be finite real numbers"
      );
      return;
    }
    try {
      const res = computeMatrixPower(matA, nValue);
      if (res.error) {
        const errMap: Record<string, string> = {
          complex_eigenvalues: zh
            ? "此工具只支援實數特徵值，無法完成此實數對角化。這不表示矩陣在複數範圍必定不可對角化。"
            : "This tool supports real eigenvalues only and cannot complete this real diagonalization. This does not rule out diagonalization over the complex numbers.",
          not_diagonalizable: zh
            ? "此求解器未能建立足夠的獨立特徵向量（重複特徵值亦可能受目前求解器限制）。這不是所有情況下不可對角化的證明。"
            : "The solver could not build enough independent eigenvectors (repeated eigenvalues may also encounter current solver limitations). This is not a proof of non-diagonalizability in every case.",
          eigen_failed: zh ? "特徵值計算失敗" : "Eigenvalue computation failed",
        };
        setResult(res);
        setError(errMap[res.error] || res.error);
      } else if (
        ![res.P, res.D, res.Pinv, res.Dn, res.An].every(matrix =>
          matrix.every(row => row.every(Number.isFinite))
        )
      ) {
        setError(
          zh
            ? "此輸入的數值計算溢位，無法可靠顯示結果；請縮小元素或指數。"
            : "The numerical computation overflowed and cannot be displayed reliably; use smaller entries or an exponent."
        );
      } else {
        setResult(res);
      }
    } catch {
      setError(
        zh ? "計算錯誤，請檢查輸入" : "Computation error, please check input"
      );
    }
  }

  function handleReset() {
    setMatA(zeroMatrix(size, size));
    setNValue(3);
    clearResult();
  }

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'IBM Plex Serif', serif" }}
        >
          {zh
            ? "矩陣 n 次方（對角化法）"
            : "Matrix Power A^n (Diagonalization)"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {zh
            ? "從特徵向量基底出發，逐步建立 P、D、P⁻¹，再用 Aⁿ = PDⁿP⁻¹ 計算次方。保留原有簡化 LaTeX，數值結果明確標示為近似。"
            : "Build P, D and P⁻¹ from an eigenvector basis, then compute powers with Aⁿ = PDⁿP⁻¹. Original simplified LaTeX is retained; numerical results are clearly labelled approximate."}
        </p>
      </div>

      <section
        className="rounded-lg border border-primary/20 bg-primary/5 p-4"
        aria-label={zh ? "符號與座標基底" : "Symbols and coordinate bases"}
      >
        <h2 className="text-sm font-semibold text-primary mb-3">
          {zh ? "先認識符號" : "Know the symbols"}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="font-mono font-semibold text-foreground">
              A · n · I
            </dt>
            <dd className="text-muted-foreground leading-relaxed">
              {zh
                ? "A 是輸入方陣；n 是非負整數指數，不是維度；I 是單位矩陣，A⁰ = I。"
                : "A is the input square matrix; n is a non-negative integer exponent, not its dimension; I is the identity and A⁰ = I."}
            </dd>
          </div>
          <div>
            <dt className="font-mono font-semibold text-foreground">λᵢ · vᵢ</dt>
            <dd className="text-muted-foreground leading-relaxed">
              {zh
                ? "λᵢ 是特徵值，vᵢ 是對應非零特徵向量，滿足 Avᵢ = λᵢvᵢ；i 是配對編號。"
                : "λᵢ is an eigenvalue and vᵢ its nonzero eigenvector, with Avᵢ = λᵢvᵢ; i labels the pair."}
            </dd>
          </div>
          <div>
            <dt className="font-mono font-semibold text-foreground">P · P⁻¹</dt>
            <dd className="text-muted-foreground leading-relaxed">
              {zh
                ? "P 的各列（直向 columns）是獨立特徵向量；P 將基底座標轉回原座標，P⁻¹ 做相反方向的轉換。逆矩陣不是逐元素取倒數。"
                : "The columns of P are independent eigenvectors. P converts eigenbasis coordinates to original coordinates; P⁻¹ reverses this. An inverse is not an element-wise reciprocal."}
            </dd>
          </div>
          <div>
            <dt className="font-mono font-semibold text-foreground">D · Dⁿ</dt>
            <dd className="text-muted-foreground leading-relaxed">
              {zh
                ? "D 的第 i 個對角元素是與 P 第 i 列配對的 λᵢ。Dⁿ 只將對角元素取次方，其他元素仍為零。"
                : "Diagonal entry i of D is λᵢ, paired with column i of P. Dⁿ powers only those diagonal entries; all other entries remain zero."}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-muted-foreground">
          {zh ? "矩陣大小：" : "Matrix size:"}
        </span>
        {([2, 3] as const).map(s => (
          <button
            key={s}
            onClick={() => handleSizeChange(s)}
            aria-pressed={size === s}
            className={`min-h-10 px-4 py-1.5 text-sm font-mono rounded border transition-colors ${size === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/50"}`}
          >
            {s}×{s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 rounded-lg border border-border bg-card min-w-0">
          <DimSelector
            label={zh ? "矩陣 A" : "Matrix A"}
            rows={size}
            cols={size}
            onRowsChange={() => {}}
            onColsChange={() => {}}
            rowsLabel={t.matrixRows}
            colsLabel={t.matrixCols}
          />
          <MatrixInput
            label={zh ? "矩陣 A" : "Matrix A"}
            matrix={matA}
            onChange={matrix => {
              setMatA(matrix);
              clearResult();
            }}
          />
        </div>
        <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
          <p className="text-sm font-semibold text-foreground font-mono">
            {zh ? "指數 n" : "Exponent n"}
          </p>
          <div className="flex items-center gap-3">
            <label
              htmlFor="matrix-power-exponent"
              className="text-sm font-medium text-muted-foreground"
            >
              n =
            </label>
            <input
              id="matrix-power-exponent"
              type="number"
              min={0}
              step={1}
              value={nValue}
              aria-describedby="matrix-power-exponent-help"
              onChange={e => {
                setNValue(e.target.value === "" ? 0 : Number(e.target.value));
                clearResult();
              }}
              className="matrix-cell w-24 min-h-10 text-center"
            />
          </div>
          <p
            id="matrix-power-exponent-help"
            className="text-xs text-muted-foreground leading-relaxed"
          >
            {zh
              ? "n 為非負整數（0, 1, 2, 3, …）。n = 0 時使用單位矩陣；n = 1 時回到 A。改動輸入會清除舊結果。"
              : "n is a non-negative integer (0, 1, 2, 3, …). n = 0 gives the identity; n = 1 returns A. Editing inputs clears the previous result."}
          </p>
          <div className="p-3 rounded bg-secondary/50 border border-border space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {zh
                ? "計算順序：P⁻¹ 轉換基底 → Dⁿ 在各特徵方向縮放 → P 轉回原座標。乘法順序不可交換。"
                : "Reading right to left: P⁻¹ changes basis → Dⁿ scales each eigendirection → P returns to original coordinates. Keep this multiplication order."}
            </p>
            <div className="overflow-x-auto">
              <KatexRenderer latex="A^n=PD^nP^{-1}" displayMode />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleCompute} className="font-mono">
          {zh ? "計算 Aⁿ" : "Compute Aⁿ"}
        </Button>
        <Button variant="outline" onClick={handleReset} className="font-mono">
          {t.reset}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {result && !error && (
        <div className="space-y-4 min-w-0">
          <div
            role="note"
            className="p-4 rounded-lg border border-border bg-secondary/50 text-sm text-muted-foreground leading-relaxed"
          >
            <p className="font-semibold text-foreground mb-1">
              {zh
                ? "數值近似與符號恆等式的區別"
                : "Numerical approximations versus symbolic identities"}
            </p>
            {zh
              ? "A = PDP⁻¹ 和 Aⁿ = PDⁿP⁻¹ 是完整特徵向量基底下的精確恆等式。但本求解器以浮點數計算特徵值、歸一化特徵向量與逆矩陣，並以容差重建分數；因此下方數值（包括看似整數或分數的元素）均標示為近似，不能單憑分數外觀斷言精確。推導保留原有 LaTeX 字串，數值等號亦應在此近似脈絡下閱讀。"
              : "A = PDP⁻¹ and Aⁿ = PDⁿP⁻¹ are exact identities for a complete eigenvector basis. However, this solver uses floating-point eigenvalues, normalized eigenvectors and inverses, then reconstructs fractions with tolerances. All numerical values below—including integer-looking or fractional entries—are therefore labelled approximate, not certified exact. Original derivation LaTeX strings are preserved; numerical equality signs should be read in this approximate context."}
          </div>
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3 min-w-0">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <h2 className="text-sm font-semibold text-primary">
                {zh
                  ? "已建立數值對角化（近似）"
                  : "Numerical diagonalization assembled (approximate)"}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={result.eigenvalues
                  .map((v, i) => `\\lambda_{${i + 1}} \\approx ${fmtExact(v)}`)
                  .join(",\\quad ")}
                displayMode
              />
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              {[
                { name: "P", matrix: result.P },
                { name: "D", matrix: result.D },
                { name: "P^{-1}", matrix: result.Pinv },
              ].map(({ name, matrix }) => (
                <div
                  key={name}
                  className="rounded border border-border bg-card p-2 min-w-0 overflow-x-auto"
                >
                  <KatexRenderer
                    latex={`${name} \\approx ${matrixToLatex(matrix)}`}
                    displayMode
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-primary/30 bg-card space-y-3 min-w-0">
            <h2 className="text-sm font-semibold font-mono text-primary">
              {zh
                ? `A^${result.n} 的計算結果（數值近似）`
                : `Computed A^${result.n} (numerical approximation)`}
            </h2>
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={`A^{${result.n}} \\approx ${result.AnLatex}`}
                displayMode
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {zh
                ? "保留原有矩陣元素與簡化分數格式。請使用下方共用播放器逐步查看每組特徵向量、基底轉換、消去與元素展開。"
                : "Original matrix entries and simplified fraction formatting are retained. Use the shared player below to follow eigenvector pairs, basis changes, cancellation and entry expansions."}
            </p>
          </div>
        </div>
      )}

      {derivationSteps.length > 0 && (
        <StepDisplay
          steps={derivationSteps}
          title={
            zh
              ? "完整推導：基底 → 對角次方 → 原座標"
              : "Full derivation: eigenbasis → diagonal power → original coordinates"
          }
        />
      )}
    </div>
  );
}
