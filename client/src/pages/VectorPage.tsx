// VectorPage — 2D and 3D Vector Calculator with Interactive Plotly Visualization
// Academic Precision Design: split input/result, interactive Plotly charts
import { useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
import VectorPlot2D from "@/components/VectorPlot2D";
import VectorPlot3D from "@/components/VectorPlot3D";
import TriangleCentersWorkspace from "@/components/TriangleCentersWorkspace";
import {
  vecAdd,
  vecSub,
  vecDot,
  vecCross,
  vecMagnitude,
  vecAngle,
  vecNormalize,
  vecProjection,
  vecToLatex,
  type Vec3,
} from "@/lib/vectorMath";
import { fmt, sqrtExact, angleExact } from "@/lib/matrixMath";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Triangle, BarChart2 } from "lucide-react";
import PracticePanel from "@/components/PracticePanel";
import DseVectorPracticePanel from "@/components/DseVectorPracticePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateRandomVectorQuestion } from "@/lib/practiceGenerator";

type Dim = "2d" | "3d";
type VecOp =
  | "add"
  | "sub"
  | "dot"
  | "cross"
  | "mag"
  | "angle"
  | "normalize"
  | "projection";

const OPS_2D: VecOp[] = [
  "add",
  "sub",
  "dot",
  "mag",
  "angle",
  "normalize",
  "projection",
];
const OPS_3D: VecOp[] = [
  "add",
  "sub",
  "dot",
  "cross",
  "mag",
  "angle",
  "normalize",
  "projection",
];

const NEEDS_B: VecOp[] = ["add", "sub", "dot", "cross", "angle", "projection"];

// Operations that benefit from interactive visualization
const VIS_OPS: VecOp[] = [
  "add",
  "sub",
  "dot",
  "cross",
  "angle",
  "normalize",
  "projection",
];

// Geometric interpretation hint for each operation
function GeomHint({
  op,
  dim,
  lang,
}: {
  op: VecOp;
  dim: Dim;
  lang: "zh" | "en";
}) {
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
    projection: {
      zh: "向量投影：a 在 b 方向的分量（綠色箭頭），垂直分量（黃色虛線）與 b 垂直",
      en: "Vector projection: component of a along b (green arrow); perpendicular component (amber dashed) is orthogonal to b",
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
  const [, navigate] = useLocation();
  const search = useSearch();
  const requestedTab = new URLSearchParams(search).get("tab") ?? "calc";
  const activeTab = ["calc", "centers", "practice", "dse"].includes(
    requestedTab
  )
    ? requestedTab
    : "calc";
  const genQuestion = useCallback(
    () => generateRandomVectorQuestion(lang),
    [lang]
  );

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
    setVecA(prev =>
      prev.map((v, idx) => (idx === i ? (isNaN(num) ? 0 : num) : v))
    );
    setResult(null);
  }

  function handleVecBChange(i: number, val: string) {
    const num = parseFloat(val);
    setVecB(prev =>
      prev.map((v, idx) => (idx === i ? (isNaN(num) ? 0 : num) : v))
    );
    setResult(null);
  }

  function handleCalculate() {
    setError(null);
    setResult(null);
    try {
      let res: any;
      switch (op) {
        case "add":
          res = vecAdd(vecA, vecB);
          break;
        case "sub":
          res = vecSub(vecA, vecB);
          break;
        case "dot":
          res = vecDot(vecA, vecB);
          break;
        case "cross":
          if (dim !== "3d") {
            setError(t.errDimMismatch);
            return;
          }
          res = vecCross(vecA as Vec3, vecB as Vec3);
          break;
        case "mag":
          res = vecMagnitude(vecA);
          break;
        case "angle":
          res = vecAngle(vecA, vecB);
          break;
        case "normalize":
          res = vecNormalize(vecA);
          break;
        case "projection":
          res = vecProjection(vecA, vecB);
          break;
        default:
          return;
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
    projection: lang === "zh" ? "向量投影" : "Projection",
  };

  const availableOps = dim === "2d" ? OPS_2D : OPS_3D;
  const needsB = NEEDS_B.includes(op);
  const showVis = VIS_OPS.includes(op);

  // Build visualization vector arrays
  // For projection: show a (blue), b (red), and the projection vector is shown via projVector prop
  const isProjection = op === "projection";
  const visVectors2D = [
    { x: vecA[0], y: vecA[1], color: "#2563EB", label: "a" },
    ...(needsB
      ? [{ x: vecB[0], y: vecB[1], color: "#DC2626", label: "b" }]
      : []),
    // For non-projection ops, show result vector
    ...(!isProjection && result?.vector
      ? [
          {
            x: result.vector[0],
            y: result.vector[1],
            color: "#16A34A",
            label: "result",
          },
        ]
      : []),
  ];

  const visVectors3D = [
    { x: vecA[0], y: vecA[1], z: vecA[2] || 0, color: "#2563EB", label: "a" },
    ...(needsB
      ? [
          {
            x: vecB[0],
            y: vecB[1],
            z: vecB[2] || 0,
            color: "#DC2626",
            label: "b",
          },
        ]
      : []),
    // For non-projection ops, show result vector
    ...(!isProjection && result?.vector
      ? [
          {
            x: result.vector[0],
            y: result.vector[1],
            z: result.vector[2] || 0,
            color: "#16A34A",
            label: "r",
          },
        ]
      : []),
  ];

  // Projection-specific visualization data
  const projVec2D =
    isProjection && result?.projVector ? result.projVector : undefined;
  const perpVec2D =
    isProjection && result?.perpVector ? result.perpVector : undefined;
  const projVec3D =
    isProjection && result?.projVector ? result.projVector : undefined;
  const perpVec3D =
    isProjection && result?.perpVector ? result.perpVector : undefined;

  const labels = dim === "2d" ? ["x", "y"] : ["x", "y", "z"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'IBM Plex Serif', serif" }}
        >
          {activeTab === "centers"
            ? lang === "zh"
              ? "幾何探索 · 三角形四心"
              : "Geometry lab · triangle centres"
            : activeTab === "dse"
              ? lang === "zh"
                ? "DSE-style 向量練習"
                : "DSE-style vector practice"
              : t.vectorCalc}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTab === "centers"
            ? lang === "zh"
              ? "拖曳頂點，播放建構，理解 G、I、O、H。"
              : "Drag vertices, play constructions and explore G, I, O, H."
            : activeTab === "dse"
              ? lang === "zh"
                ? "原創題組 · 2D／3D 向量與四心 · 精確答案及詳解"
                : "Original questions · 2D/3D vectors and triangle centres · exact answers & solutions"
              : `${dim === "2d" ? t.vector2D : t.vector3D} · ${opLabels[op]}`}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value =>
          navigate(`/vector?tab=${value}`, { replace: true })
        }
      >
        <TabsList>
          <TabsTrigger value="calc">{t.calcMode}</TabsTrigger>
          <TabsTrigger value="centers">
            <Triangle className="w-3 h-3 mr-1" />
            {lang === "zh" ? "三角形四心" : "Triangle Centers"}
          </TabsTrigger>
          <TabsTrigger value="practice">{t.practiceMode}</TabsTrigger>
          <TabsTrigger value="dse">
            {lang === "zh" ? "DSE Style 題組" : "DSE-Style Practice"}
          </TabsTrigger>
        </TabsList>

        {/* ── DSE-style Practice Tab ── */}
        <TabsContent value="dse" className="mt-4">
          <DseVectorPracticePanel />
        </TabsContent>

        {/* ── Practice Tab ── */}
        <TabsContent value="practice" className="mt-4">
          <PracticePanel
            generateQuestion={genQuestion}
            moduleLabel={lang === "zh" ? "向量練習" : "Vector Practice"}
          />
        </TabsContent>

        {/* Diagram-first, editable four-centre workspace */}
        <TabsContent value="centers" className="mt-5">
          <TriangleCentersWorkspace />
        </TabsContent>

        {/* ── Calculator Tab ── */}
        <TabsContent value="calc" className="mt-4 space-y-4">
          {/* Dimension toggle */}
          <div className="flex gap-2">
            {(["2d", "3d"] as Dim[]).map(d => (
              <button
                key={d}
                onClick={() => switchDim(d)}
                className={`px-4 py-2 text-sm font-mono font-semibold rounded border transition-all duration-150
                  ${
                    dim === d
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
            {availableOps.map(o => (
              <button
                key={o}
                onClick={() => {
                  setOp(o);
                  setResult(null);
                  setError(null);
                }}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded border transition-all duration-150
                  ${
                    op === o
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
                  <h3 className="text-sm font-semibold font-mono text-foreground">
                    {t.vectorA}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <svg
                      width="10"
                      height={vecA.length * 42 + 8}
                      viewBox={`0 0 10 ${vecA.length * 42 + 8}`}
                      fill="none"
                    >
                      <path
                        d={`M8 4 L3 4 L3 ${vecA.length * 42 + 4} L8 ${vecA.length * 42 + 4}`}
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex flex-col gap-1">
                      {vecA.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-4">
                            {labels[i]}
                          </span>
                          <input
                            type="number"
                            value={v === 0 ? "" : v}
                            placeholder="0"
                            onChange={e => handleVecAChange(i, e.target.value)}
                            className="matrix-cell border-blue-300"
                          />
                        </div>
                      ))}
                    </div>
                    <svg
                      width="10"
                      height={vecA.length * 42 + 8}
                      viewBox={`0 0 10 ${vecA.length * 42 + 8}`}
                      fill="none"
                    >
                      <path
                        d={`M2 4 L7 4 L7 ${vecA.length * 42 + 4} L2 ${vecA.length * 42 + 4}`}
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    <KatexRenderer
                      latex={`\\mathbf{a} = ${vecToLatex(vecA)}`}
                    />
                  </div>
                </div>
              </div>

              {/* Vector B */}
              {needsB && (
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0" />
                    <h3 className="text-sm font-semibold font-mono text-foreground">
                      {t.vectorB}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <svg
                        width="10"
                        height={vecB.length * 42 + 8}
                        viewBox={`0 0 10 ${vecB.length * 42 + 8}`}
                        fill="none"
                      >
                        <path
                          d={`M8 4 L3 4 L3 ${vecB.length * 42 + 4} L8 ${vecB.length * 42 + 4}`}
                          stroke="#DC2626"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex flex-col gap-1">
                        {vecB.map((v, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground w-4">
                              {labels[i]}
                            </span>
                            <input
                              type="number"
                              value={v === 0 ? "" : v}
                              placeholder="0"
                              onChange={e =>
                                handleVecBChange(i, e.target.value)
                              }
                              className="matrix-cell border-red-300"
                            />
                          </div>
                        ))}
                      </div>
                      <svg
                        width="10"
                        height={vecB.length * 42 + 8}
                        viewBox={`0 0 10 ${vecB.length * 42 + 8}`}
                        fill="none"
                      >
                        <path
                          d={`M2 4 L7 4 L7 ${vecB.length * 42 + 4} L2 ${vecB.length * 42 + 4}`}
                          stroke="#DC2626"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      <KatexRenderer
                        latex={`\\mathbf{b} = ${vecToLatex(vecB)}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleCalculate} className="font-mono">
                  {t.calculate}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="font-mono"
                >
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
                    {lang === "zh"
                      ? "（可縮放 · 可拖曳）"
                      : "(zoomable · draggable)"}
                  </span>
                </h3>
              </div>

              {showVis ? (
                dim === "2d" ? (
                  <VectorPlot2D
                    vectors={visVectors2D}
                    op={op}
                    lang={lang}
                    projVector={projVec2D}
                    perpVector={perpVec2D}
                  />
                ) : (
                  <VectorPlot3D
                    vectors={visVectors3D}
                    op={op}
                    lang={lang}
                    projVector={projVec3D}
                    perpVector={perpVec3D}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-40 rounded-lg border border-border bg-secondary/20 text-sm text-muted-foreground font-mono">
                  {lang === "zh"
                    ? "此運算無幾何視覺化"
                    : "No geometric visualization for this operation"}
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
                      {lang === "zh"
                        ? "平行四邊形（面積 = |a×b|）"
                        : "Parallelogram (area = |a×b|)"}
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
                    <KatexRenderer
                      latex={vecToLatex(result.vector)}
                      displayMode={true}
                    />
                  )}
                  {result.scalar !== undefined &&
                    (() => {
                      if (op === "angle") {
                        const { deg: dStr, rad: rStr } = angleExact(
                          result.scalar
                        );
                        return (
                          <KatexRenderer
                            latex={`= ${dStr} = ${rStr}`}
                            displayMode={true}
                          />
                        );
                      }
                      if (op === "mag") {
                        // Reconstruct sumSq from vecA to show exact sqrt form
                        const sumSq = vecA.reduce(
                          (s: number, v: number) => s + v * v,
                          0
                        );
                        return (
                          <KatexRenderer
                            latex={`= ${sqrtExact(sumSq)}`}
                            displayMode={true}
                          />
                        );
                      }
                      return (
                        <KatexRenderer
                          latex={`= ${fmt(result.scalar)}`}
                          displayMode={true}
                        />
                      );
                    })()}
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
