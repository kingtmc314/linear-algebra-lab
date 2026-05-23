// LinearSystemPage — Solve systems of linear equations using matrix methods
// Academic Precision Design: augmented matrix display, step-by-step Gaussian elimination
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
import { solveLinearSystem } from "@/lib/linearSystem";
import { matrixToLatex, fmt } from "@/lib/matrixMath";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Infinity, XCircle } from "lucide-react";

function makeGrid(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

export default function LinearSystemPage() {
  const { t } = useLanguage();

  const [numEq, setNumEq] = useState(2);
  const [numVar, setNumVar] = useState(2);
  const [coeffs, setCoeffs] = useState<number[][]>(makeGrid(2, 2));
  const [consts, setConsts] = useState<number[]>(Array(2).fill(0));
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function resizeSystem(eq: number, vr: number) {
    setNumEq(eq);
    setNumVar(vr);
    setCoeffs(makeGrid(eq, vr));
    setConsts(Array(eq).fill(0));
    setResult(null);
    setError(null);
  }

  function handleCoeffChange(r: number, c: number, val: string) {
    const num = parseFloat(val);
    setCoeffs((prev) =>
      prev.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? (isNaN(num) ? 0 : num) : cell))
      )
    );
  }

  function handleConstChange(r: number, val: string) {
    const num = parseFloat(val);
    setConsts((prev) => prev.map((v, i) => (i === r ? (isNaN(num) ? 0 : num) : v)));
  }

  function handleSolve() {
    setError(null);
    setResult(null);
    try {
      const res = solveLinearSystem(coeffs, consts);
      setResult(res);
    } catch (e) {
      setError(t.errInvalidInput);
    }
  }

  function handleReset() {
    setCoeffs(makeGrid(numEq, numVar));
    setConsts(Array(numEq).fill(0));
    setResult(null);
    setError(null);
  }

  // Build LaTeX for the system of equations
  function systemLatex(): string {
    const varNames = ["x", "y", "z", "w", "v"].slice(0, numVar);
    const lines = coeffs.map((row, i) => {
      const terms = row
        .map((c, j) => {
          if (c === 0) return null;
          const sign = c < 0 ? "-" : j > 0 ? "+" : "";
          const absC = Math.abs(c);
          const coefStr = absC === 1 ? "" : fmt(absC);
          return `${sign} ${coefStr}${varNames[j]}`;
        })
        .filter(Boolean)
        .join(" ");
      return `${terms || "0"} &= ${fmt(consts[i])}`;
    });
    return `\\begin{cases} ${lines.join(" \\\\ ")} \\end{cases}`;
  }

  const dims = [2, 3, 4, 5];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
          {t.linearSystem}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {numEq} {t.numEquations.toLowerCase()} · {numVar} {t.numVariables.toLowerCase()}
        </p>
      </div>

      {/* Dimension selector */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">{t.numEquations}:</label>
          <select
            value={numEq}
            onChange={(e) => resizeSystem(Number(e.target.value), numVar)}
            className="h-8 px-2 text-sm border border-border rounded bg-card text-foreground focus:border-accent outline-none"
          >
            {dims.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">{t.numVariables}:</label>
          <select
            value={numVar}
            onChange={(e) => resizeSystem(numEq, Number(e.target.value))}
            className="h-8 px-2 text-sm border border-border rounded bg-card text-foreground focus:border-accent outline-none"
          >
            {dims.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* System preview */}
      <div className="p-4 rounded-lg border border-border bg-secondary/30 overflow-x-auto">
        <KatexRenderer latex={systemLatex()} displayMode={true} />
      </div>

      {/* Input grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coefficient matrix */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">
              {t.coefficients}
            </h3>
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="text-xs text-muted-foreground font-mono w-8"></th>
                    {Array.from({ length: numVar }, (_, j) => (
                      <th key={j} className="text-xs text-muted-foreground font-mono text-center w-14">
                        x<sub>{j + 1}</sub>
                      </th>
                    ))}
                    <th className="text-xs text-muted-foreground font-mono text-center w-14">b</th>
                  </tr>
                </thead>
                <tbody>
                  {coeffs.map((row, r) => (
                    <tr key={r}>
                      <td className="text-xs text-muted-foreground font-mono text-center">
                        R{r + 1}
                      </td>
                      {row.map((cell, c) => (
                        <td key={c}>
                          <input
                            type="number"
                            value={cell === 0 ? "" : cell}
                            placeholder="0"
                            onChange={(e) => handleCoeffChange(r, c, e.target.value)}
                            className="matrix-cell"
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="number"
                          value={consts[r] === 0 ? "" : consts[r]}
                          placeholder="0"
                          onChange={(e) => handleConstChange(r, e.target.value)}
                          className="matrix-cell border-accent/40 bg-accent/5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.augmentedMatrix}: [A | b]
            </p>
          </div>

          {/* Augmented matrix LaTeX preview */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">
              {t.augmentedMatrix}
            </h3>
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={`\\left[\\begin{array}{${"c".repeat(numVar)}|c} ${
                  coeffs.map((row, i) =>
                    [...row.map(fmt), fmt(consts[i])].join(" & ")
                  ).join(" \\\\ ")
                } \\end{array}\\right]`}
                displayMode={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSolve} className="font-mono">
          {t.solve}
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
          {/* Solution type badge */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            result.type === "unique"
              ? "bg-accent/5 border-accent/30 text-accent"
              : result.type === "none"
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
          }`}>
            {result.type === "unique" && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {result.type === "none" && <XCircle className="w-4 h-4 flex-shrink-0" />}
            {result.type === "infinite" && <Infinity className="w-4 h-4 flex-shrink-0" />}
            <span className="text-sm font-semibold font-mono">
              {result.type === "unique" && t.uniqueSolution}
              {result.type === "none" && t.noSolution}
              {result.type === "infinite" && t.infiniteSolutions}
            </span>
          </div>

          {/* Unique solution display */}
          {result.type === "unique" && result.solution && (
            <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
              <div className="overflow-x-auto">
                <KatexRenderer
                  latex={result.solution
                    .map((v: number, i: number) => `x_{${i + 1}} = ${fmt(v)}`)
                    .join(",\\quad ")}
                  displayMode={true}
                />
              </div>
            </div>
          )}

          {/* Steps */}
          {result.steps && result.steps.length > 0 && (
            <StepDisplay steps={result.steps} title={t.steps} />
          )}
        </div>
      )}
    </div>
  );
}
