// VectorPage — 2D and 3D Vector Calculator with Interactive Plotly Visualization
// Academic Precision Design: split input/result, interactive Plotly charts
import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
import VectorPlot2D from "@/components/VectorPlot2D";
import VectorPlot3D from "@/components/VectorPlot3D";
import {
  vecAdd, vecSub, vecDot, vecCross, vecMagnitude, vecAngle, vecNormalize,
  vecToLatex, computeTriangleCenters, type Vec3,
} from "@/lib/vectorMath";
import { fmt } from "@/lib/matrixMath";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Triangle, BarChart2 } from "lucide-react";
import PracticePanel from "@/components/PracticePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateRandomVectorQuestion } from "@/lib/practiceGenerator";

type Dim = "2d" | "3d";
type VecOp = "add" | "sub" | "dot" | "cross" | "mag" | "angle" | "normalize";

const OPS_2D: VecOp[] = ["add", "sub", "dot", "mag", "angle", "normalize"];
const OPS_3D: VecOp[] = ["add", "sub", "dot", "cross", "mag", "angle", "normalize"];

const NEEDS_B: VecOp[] = ["add", "sub", "dot", "cross", "angle"];

// Operations that benefit from interactive visualization
const VIS_OPS: VecOp[] = ["add", "sub", "dot", "cross", "angle", "normalize"];

function PointInput({
  label, color, value, onChange, labels,
}: {
  label: string; color: string; value: number[]; onChange: (i: number, v: string) => void; labels: string[];
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
        <h3 className="text-sm font-semibold font-mono text-foreground">{label}</h3>
      </div>
      <div className="flex gap-2 flex-wrap">
        {value.map((v, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-xs font-mono text-muted-foreground">{labels[i]}</span>
            <input
              type="number"
              value={v === 0 ? "" : v}
              placeholder="0"
              onChange={(e) => onChange(i, e.target.value)}
              className="matrix-cell w-16"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Geometric interpretation hint for each operation
function GeomHint({ op, dim, lang }: { op: VecOp; dim: Dim; lang: "zh" | "en" }) {
  const hints: Record<VecOp, { zh: string; en: string }> = {
    add: {
      zh: "平行四邊形法則：兩向量首尾相接，對角線即為合向量",
      en: "Parallelogram rule: place vectors tip-to-tail — the diagonal is the resultant",
    },
    sub: {
      zh: "a − b = a + (−b)：反轉 b 後再做向量加法",
      en: "a − b = a + (−b): reverse b, then apply vector addition",
    },
    dot: {
      zh: "點積 = |a||b|cosθ，反映兩向量夾角的餘弦值；正交時為零",
      en: "Dot product = |a||b|cosθ, measures the cosine of the angle; zero when perpendicular",
    },
    cross: {
      zh: "叉積垂直於 a 和 b 所在平面（右手定則），大小等於平行四邊形面積",
      en: "Cross product is perpendicular to the plane of a and b (right-hand rule); magnitude = parallelogram area",
    },
    mag: {
      zh: "向量的長度（模）= 各分量平方和的平方根",
      en: "Magnitude = square root of sum of squared components",
    },
    angle: {
      zh: "兩向量夾角 θ = arccos(a·b / |a||b|)，範圍 0° ~ 180°",
      en: "Angle θ = arccos(a·b / |a||b|), range 0° to 180°",
    },
    normalize: {
      zh: "單位向量：保持方向不變，將長度縮放至 1",
      en: "Unit vector: same direction as a, scaled to length 1",
    },
  };
  const h = hints[op];
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md bg-secondary/40 border border-border">
      <BarChart2 className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        {lang === "zh" ? h.zh : h.en}
      </p>
    </div>
  );
}

export default function VectorPage() {
  const { t, lang } = useLanguage();
  const genQuestion = useCallback(() => generateRandomVectorQuestion(lang), [lang]);

  const [dim, setDim] = useState<Dim>("2d");
  const [op, setOp] = useState<VecOp>("add");
  const [vecA, setVecA] = useState([1, 2]);
  const [vecB, setVecB] = useState([3, 1]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Triangle centers state
  const [ptA, setPtA] = useState<number[]>([0, 0, 0]);
  const [ptB, setPtB] = useState<number[]>([4, 0, 0]);
  const [ptC, setPtC] = useState<number[]>([2, 3, 0]);
  const [centerResult, setCenterResult] = useState<any>(null);
  const [centerError, setCenterError] = useState<string | null>(null);

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
          res = vecCross(vecA as Vec3, vecB as Vec3);
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

  function handleComputeCenters() {
    setCenterError(null);
    setCenterResult(null);
    try {
      const A = ptA as Vec3;
      const B = ptB as Vec3;
      const C = ptC as Vec3;
      const AB = [B[0]-A[0], B[1]-A[1], B[2]-A[2]];
      const AC = [C[0]-A[0], C[1]-A[1], C[2]-A[2]];
      const cross = [
        AB[1]*AC[2]-AB[2]*AC[1],
        AB[2]*AC[0]-AB[0]*AC[2],
        AB[0]*AC[1]-AB[1]*AC[0],
      ];
      const area = Math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2);
      if (area < 1e-10) {
        setCenterError(lang === "zh" ? "三點共線，無法構成三角形" : "Three points are collinear — cannot form a triangle");
        return;
      }
      const res = computeTriangleCenters(A, B, C);
      setCenterResult(res);
    } catch {
      setCenterError(lang === "zh" ? "計算錯誤，請檢查輸入" : "Computation error, please check inputs");
    }
  }

  function handleResetCenters() {
    setPtA([0, 0, 0]);
    setPtB([4, 0, 0]);
    setPtC([2, 3, 0]);
    setCenterResult(null);
    setCenterError(null);
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
  const showVis = VIS_OPS.includes(op);

  // Build visualization vector arrays
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
  const labels3D = ["x", "y", "z"];

  const fmtPt = (v: number[]) => `(${v.map(n => fmt(n)).join(", ")})`;

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
          <TabsTrigger value="centers">
            <Triangle className="w-3 h-3 mr-1" />
            {lang === "zh" ? "三角形四心" : "Triangle Centers"}
          </TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
        </TabsList>

        {/* ── Practice Tab ── */}
        <TabsContent value="practice" className="mt-4">
          <PracticePanel generateQuestion={genQuestion} moduleLabel={lang === "zh" ? "向量練習" : "Vector Practice"} />
        </TabsContent>

        {/* ── Triangle Centers Tab ── */}
        <TabsContent value="centers" className="mt-4 space-y-6">
          <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {lang === "zh" ? "輸入三角形三頂點（3D 坐標）" : "Enter three triangle vertices (3D coordinates)"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === "zh"
                ? "計算重心（G）、內心（I）、外心（O）、垂心（H）"
                : "Compute Centroid (G), Incenter (I), Circumcenter (O), Orthocenter (H)"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PointInput
              label={lang === "zh" ? "頂點 A" : "Vertex A"}
              color="#2563EB"
              value={ptA}
              onChange={(i, v) => { const n = parseFloat(v); setPtA(prev => prev.map((x, idx) => idx === i ? (isNaN(n) ? 0 : n) : x)); setCenterResult(null); }}
              labels={labels3D}
            />
            <PointInput
              label={lang === "zh" ? "頂點 B" : "Vertex B"}
              color="#DC2626"
              value={ptB}
              onChange={(i, v) => { const n = parseFloat(v); setPtB(prev => prev.map((x, idx) => idx === i ? (isNaN(n) ? 0 : n) : x)); setCenterResult(null); }}
              labels={labels3D}
            />
            <PointInput
              label={lang === "zh" ? "頂點 C" : "Vertex C"}
              color="#16A34A"
              value={ptC}
              onChange={(i, v) => { const n = parseFloat(v); setPtC(prev => prev.map((x, idx) => idx === i ? (isNaN(n) ? 0 : n) : x)); setCenterResult(null); }}
              labels={labels3D}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleComputeCenters} className="font-mono">
              {lang === "zh" ? "計算四心" : "Compute Centers"}
            </Button>
            <Button variant="outline" onClick={handleResetCenters} className="font-mono">
              {t.reset}
            </Button>
          </div>

          {centerError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{centerError}</p>
            </div>
          )}

          {centerResult && (
            <div className="space-y-4">
              {/* Summary table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  {
                    name: lang === "zh" ? "重心 G" : "Centroid G",
                    desc: lang === "zh" ? "三條中線的交點" : "Intersection of medians",
                    pt: centerResult.centroid,
                    color: "#7C3AED",
                    symbol: "G",
                  },
                  {
                    name: lang === "zh" ? "內心 I" : "Incenter I",
                    desc: lang === "zh" ? "三條角平分線的交點（內切圓圓心）" : "Intersection of angle bisectors",
                    pt: centerResult.incenter,
                    color: "#D97706",
                    symbol: "I",
                  },
                  {
                    name: lang === "zh" ? "外心 O" : "Circumcenter O",
                    desc: lang === "zh" ? "三條垂直平分線的交點（外接圓圓心）" : "Intersection of perpendicular bisectors",
                    pt: centerResult.circumcenter,
                    color: "#0891B2",
                    symbol: "O",
                  },
                  {
                    name: lang === "zh" ? "垂心 H" : "Orthocenter H",
                    desc: lang === "zh" ? "三條高的交點" : "Intersection of altitudes",
                    pt: centerResult.orthocenter,
                    color: "#DC2626",
                    symbol: "H",
                  },
                ].map(({ name, desc, pt, color, symbol }) => (
                  <div key={symbol} className="p-3 rounded-lg border bg-card space-y-2" style={{ borderColor: color + "40" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
                        {symbol}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                    <div className="overflow-x-auto">
                      <KatexRenderer
                        latex={`${symbol} = ${fmtPt(pt)}`}
                        displayMode={false}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Side lengths */}
              <div className="p-3 rounded-lg border border-border bg-secondary/30">
                <p className="text-xs font-semibold font-mono uppercase tracking-wide text-muted-foreground mb-2">
                  {lang === "zh" ? "邊長" : "Side Lengths"}
                </p>
                <KatexRenderer
                  latex={`a=|BC|=${fmt(centerResult.sideA)},\\quad b=|CA|=${fmt(centerResult.sideB)},\\quad c=|AB|=${fmt(centerResult.sideC)}`}
                  displayMode={true}
                />
              </div>

              {/* Steps */}
              <StepDisplay
                steps={centerResult.steps.map((s: any) => ({
                  description: lang === "zh" ? s.descriptionZh : s.descriptionEn,
                  latex: s.latex,
                }))}
                title={lang === "zh" ? "推導步驟" : "Derivation Steps"}
              />
            </div>
          )}
        </TabsContent>

        {/* ── Calculator Tab ── */}
        <TabsContent value="calc" className="mt-4 space-y-4">

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

          {/* Geometric hint */}
          <GeomHint op={op} dim={dim} lang={lang} />

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

            {/* Interactive Visualization */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-muted-foreground">
                  {t.visualization}
                  <span className="ml-2 text-xs font-normal normal-case text-primary/70">
                    {lang === "zh" ? "（可縮放 · 可拖曳）" : "(zoomable · draggable)"}
                  </span>
                </h3>
              </div>

              {showVis ? (
                dim === "2d" ? (
                  <VectorPlot2D vectors={visVectors2D} op={op} lang={lang} />
                ) : (
                  <VectorPlot3D vectors={visVectors3D} op={op} lang={lang} />
                )
              ) : (
                <div className="flex items-center justify-center h-40 rounded-lg border border-border bg-secondary/20 text-sm text-muted-foreground font-mono">
                  {lang === "zh" ? "此運算無幾何視覺化" : "No geometric visualization for this operation"}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-blue-600 inline-block rounded" />
                  <span className="text-muted-foreground">{t.vectorA}</span>
                </span>
                {needsB && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-red-600 inline-block rounded" />
                    <span className="text-muted-foreground">{t.vectorB}</span>
                  </span>
                )}
                {result?.vector && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-green-600 inline-block rounded" />
                    <span className="text-muted-foreground">{t.result}</span>
                  </span>
                )}
                {op === "cross" && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-2 bg-indigo-400/30 border border-indigo-400/50 inline-block rounded" />
                    <span className="text-muted-foreground">
                      {lang === "zh" ? "平行四邊形（面積 = |a×b|）" : "Parallelogram (area = |a×b|)"}
                    </span>
                  </span>
                )}
                {(op === "add" || op === "sub") && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-t border-dashed border-red-500 inline-block" />
                    <span className="text-muted-foreground">
                      {lang === "zh" ? "首尾相接法" : "tip-to-tail"}
                    </span>
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
