// VectorPage — 2D and 3D Vector Calculator with Visualization
// Academic Precision Design: split input/result, canvas visualization
import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
import VectorCanvas2D from "@/components/VectorCanvas2D";
import VectorCanvas3D from "@/components/VectorCanvas3D";
import {
  vecAdd, vecSub, vecDot, vecCross, vecMagnitude, vecAngle, vecNormalize,
  vecToLatex,
} from "@/lib/vectorMath";
import { fmt } from "@/lib/matrixMath";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import PracticePanel from "@/components/PracticePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateRandomVectorQuestion } from "@/lib/practiceGenerator";

type Dim = "2d" | "3d";
type VecOp = "add" | "sub" | "dot" | "cross" | "mag" | "angle" | "normalize";

const OPS_2D: VecOp[] = ["add", "sub", "dot", "mag", "angle", "normalize"];
const OPS_3D: VecOp[] = ["add", "sub", "dot", "cross", "mag", "angle", "normalize"];

const NEEDS_B: VecOp[] = ["add", "sub", "dot", "cross", "angle"];

export default function VectorPage() {
  const { t, lang } = useLanguage();
  const genQuestion = useCallback(() => generateRandomVectorQuestion(lang), [lang]);

  const [dim, setDim] = useState<Dim>("2d");
  const [op, setOp] = useState<VecOp>("add");
  const [vecA, setVecA] = useState([1, 2]);
  const [vecB, setVecB] = useState([3, 1]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function switchDim(d: Dim) {
    setDim(d);
    setVecA(d === "2d" ? [1, 2] : [1, 2, 3]);
    setVecB(d === "2d" ? [3, 1] : [4, 0, 1]);
    setOp("add");
    setResult(null);
    setError(null);
  }

  function handleVecAChange(i: number, val: string) {
    const num = parseFloat(val);
    setVecA((prev) => prev.map((v, idx) => (idx === i ? (isNaN(num) ? 0 : num) : v)));
    setResult(null);
  }

  function handleVecBChange(i: number, val: string) {
    const num = parseFloat(val);
    setVecB((prev) => prev.map((v, idx) => (idx === i ? (isNaN(num) ? 0 : num) : v)));
    setResult(null);
  }

  function handleCalculate() {
    setError(null);
    setResult(null);
    try {
      let res: any;
      switch (op) {
        case "add": res = vecAdd(vecA, vecB); break;
        case "sub": res = vecSub(vecA, vecB); break;
        case "dot": res = vecDot(vecA, vecB); break;
        case "cross":
          if (dim !== "3d") { setError(t.errDimMismatch); return; }
          res = vecCross(vecA as [number, number, number], vecB as [number, number, number]);
          break;
        case "mag": res = vecMagnitude(vecA); break;
        case "angle": res = vecAngle(vecA, vecB); break;
        case "normalize": res = vecNormalize(vecA); break;
        default: return;
      }
      if (res.error) {
        setError(t.errInvalidInput);
      } else {
        setResult(res);
      }
    } catch {
      setError(t.errInvalidInput);
    }
  }

  function handleReset() {
    setVecA(dim === "2d" ? [1, 2] : [1, 2, 3]);
    setVecB(dim === "2d" ? [3, 1] : [4, 0, 1]);
    setResult(null);
    setError(null);
  }

  const opLabels: Record<VecOp, string> = {
    add: t.opVecAdd,
    sub: t.opVecSubtract,
    dot: t.opDotProduct,
    cross: t.opCrossProduct,
    mag: t.opMagnitude,
    angle: t.opAngle,
    normalize: t.opNormalize,
  };

  const availableOps = dim === "2d" ? OPS_2D : OPS_3D;
  const needsB = NEEDS_B.includes(op);

  // Visualization vectors
  const visVectors2D = [
    { x: vecA[0], y: vecA[1], color: "#2563EB", label: "a" },
    ...(needsB ? [{ x: vecB[0], y: vecB[1], color: "#DC2626", label: "b" }] : []),
    ...(result?.vector
      ? [{ x: result.vector[0], y: result.vector[1], color: "#16A34A", label: "result" }]
      : []),
  ];

  const visVectors3D = [
    { x: vecA[0], y: vecA[1], z: vecA[2] || 0, color: "#2563EB", label: "a" },
    ...(needsB ? [{ x: vecB[0], y: vecB[1], z: vecB[2] || 0, color: "#DC2626", label: "b" }] : []),
    ...(result?.vector
      ? [{ x: result.vector[0], y: result.vector[1], z: result.vector[2] || 0, color: "#16A34A", label: "r" }]
      : []),
  ];

  const labels = dim === "2d" ? ["x", "y"] : ["x", "y", "z"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
          {t.vectorCalc}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dim === "2d" ? t.vector2D : t.vector3D} · {opLabels[op]}
        </p>
      </div>

      <Tabs defaultValue="calc">
        <TabsList>
          <TabsTrigger value="calc">{t.calcMode}</TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="mt-4">
          <PracticePanel generateQuestion={genQuestion} moduleLabel={lang === "zh" ? "向量練習" : "Vector Practice"} />
        </TabsContent>

        <TabsContent value="calc" className="mt-4">

      {/* Dimension toggle */}
      <div className="flex gap-2">
        {(["2d", "3d"] as Dim[]).map((d) => (
          <button
            key={d}
            onClick={() => switchDim(d)}
            className={`px-4 py-2 text-sm font-mono font-semibold rounded border transition-all duration-150
              ${dim === d
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/50"
              }`}
          >
            {d === "2d" ? t.vector2D : t.vector3D}
          </button>
        ))}
      </div>

      {/* Operation selector */}
      <div className="flex flex-wrap gap-2">
        {availableOps.map((o) => (
          <button
            key={o}
            onClick={() => { setOp(o); setResult(null); setError(null); }}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded border transition-all duration-150
              ${op === o
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary"
              }`}
          >
            {opLabels[o]}
          </button>
        ))}
      </div>

      {/* Input + Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vector inputs */}
        <div className="space-y-4">
          {/* Vector A */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
              <h3 className="text-sm font-semibold font-mono text-foreground">{t.vectorA}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <svg width="10" height={vecA.length * 42 + 8} viewBox={`0 0 10 ${vecA.length * 42 + 8}`} fill="none">
                  <path d={`M8 4 L3 4 L3 ${vecA.length * 42 + 4} L8 ${vecA.length * 42 + 4}`} stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex flex-col gap-1">
                  {vecA.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-4">{labels[i]}</span>
                      <input
                        type="number"
                        value={v === 0 ? "" : v}
                        placeholder="0"
                        onChange={(e) => handleVecAChange(i, e.target.value)}
                        className="matrix-cell border-blue-300"
                      />
                    </div>
                  ))}
                </div>
                <svg width="10" height={vecA.length * 42 + 8} viewBox={`0 0 10 ${vecA.length * 42 + 8}`} fill="none">
                  <path d={`M2 4 L7 4 L7 ${vecA.length * 42 + 4} L2 ${vecA.length * 42 + 4}`} stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                <KatexRenderer latex={`\\mathbf{a} = ${vecToLatex(vecA)}`} />
              </div>
            </div>
          </div>

          {/* Vector B */}
          {needsB && (
            <div className="p-4 rounded-lg border border-border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0" />
                <h3 className="text-sm font-semibold font-mono text-foreground">{t.vectorB}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <svg width="10" height={vecB.length * 42 + 8} viewBox={`0 0 10 ${vecB.length * 42 + 8}`} fill="none">
                    <path d={`M8 4 L3 4 L3 ${vecB.length * 42 + 4} L8 ${vecB.length * 42 + 4}`} stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex flex-col gap-1">
                    {vecB.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-4">{labels[i]}</span>
                        <input
                          type="number"
                          value={v === 0 ? "" : v}
                          placeholder="0"
                          onChange={(e) => handleVecBChange(i, e.target.value)}
                          className="matrix-cell border-red-300"
                        />
                      </div>
                    ))}
                  </div>
                  <svg width="10" height={vecB.length * 42 + 8} viewBox={`0 0 10 ${vecB.length * 42 + 8}`} fill="none">
                    <path d={`M2 4 L7 4 L7 ${vecB.length * 42 + 4} L2 ${vecB.length * 42 + 4}`} stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  <KatexRenderer latex={`\\mathbf{b} = ${vecToLatex(vecB)}`} />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleCalculate} className="font-mono">
              {t.calculate}
            </Button>
            <Button variant="outline" onClick={handleReset} className="font-mono">
              {t.reset}
            </Button>
          </div>
        </div>

        {/* Visualization */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">
            {t.visualization}
          </h3>
          <div className="flex justify-center">
            {dim === "2d" ? (
              <VectorCanvas2D vectors={visVectors2D} width={300} height={300} />
            ) : (
              <VectorCanvas3D vectors={visVectors3D} width={300} height={300} />
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs font-mono">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-blue-600 inline-block" /> {t.vectorA}
            </span>
            {needsB && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-red-600 inline-block" /> {t.vectorB}
              </span>
            )}
            {result?.vector && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-green-600 inline-block" /> {t.result}
              </span>
            )}
          </div>
        </div>
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
              {result.vector && (
                <KatexRenderer latex={vecToLatex(result.vector)} displayMode={true} />
              )}
              {result.scalar !== undefined && (
                <KatexRenderer
                  latex={`= ${fmt(result.scalar)}${op === "angle" ? "^\\circ" : ""}`}
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
