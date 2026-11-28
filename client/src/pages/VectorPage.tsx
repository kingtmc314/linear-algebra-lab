// VectorPage — 2D and 3D Vector Calculator with Interactive Plotly Visualization
// Compact workspace: parameters → exact result → computed diagram and derivation
import { useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import StepDisplay from "@/components/StepDisplay";
import KatexRenderer from "@/components/KatexRenderer";
import VectorPlot2D from "@/components/VectorPlot2D";
import VectorPlot3D from "@/components/VectorPlot3D";
import TriangleCentersWorkspace from "@/components/TriangleCentersWorkspace";
import SpatialAnglesPanel from "@/components/SpatialAnglesPanel";
import type { DerivationMode } from "@/lib/derivationPlayback";
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
import { exactVectorDerivation } from "@/lib/vectorExact";
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
  "mag",
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
    <div className="flex items-start gap-2.5 rounded-xl bg-secondary/50 p-3 text-secondary-foreground">
      <BarChart2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
      <p className="text-xs leading-relaxed text-muted-foreground">
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
  const activeTab = ["calc", "centers", "spatial", "practice", "dse"].includes(
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
  const [derivation, setDerivation] = useState<{
    index: number;
    mode: DerivationMode;
  }>({ index: 0, mode: "all" });
  const onDerivationStep = useCallback(
    (index: number, mode: DerivationMode) =>
      setDerivation(previous =>
        previous.index === index && previous.mode === mode
          ? previous
          : { index, mode }
      ),
    []
  );

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
    setDerivation({ index: 0, mode: "all" });
    try {
      if (
        [...vecA, ...vecB].some(
          value => !Number.isFinite(value) || Math.abs(value) > 1_000_000
        )
      ) {
        setError(
          lang === "zh"
            ? "請輸入有限數值，每個分量的絕對值不可超過 1,000,000。"
            : "Enter finite values with each component between −1,000,000 and 1,000,000."
        );
        return;
      }
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
        const exact = exactVectorDerivation(op, vecA, vecB);
        res.exactLatex = exact.latex;
        res.steps = exact.steps.map((step, index) =>
          index === exact.steps.length - 1
            ? { ...step, value: res.vector ?? res.scalar ?? res.projVector }
            : step
        );
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
  const resultStep =
    result?.steps?.findIndex(
      (step: { value?: unknown }) => step.value !== undefined
    ) ?? -1;
  const constructionStage =
    derivation.mode === "all"
      ? 2
      : derivation.index >=
          (resultStep >= 0 ? resultStep : (result?.steps?.length ?? 1) - 1)
        ? 2
        : derivation.index >= 1
          ? 1
          : 0;
  const revealResult = constructionStage === 2;

  // Build visualization vector arrays
  // For projection: show a (blue), b (red), and the projection vector is shown via projVector prop
  const isProjection = op === "projection";
  const visVectors2D = [
    { x: vecA[0], y: vecA[1], color: "#2563EB", label: "a" },
    ...(needsB
      ? [{ x: vecB[0], y: vecB[1], color: "#DC2626", label: "b" }]
      : []),
    // For non-projection ops, show result vector
    ...(!isProjection && revealResult && result?.vector
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
    ...(!isProjection && revealResult && result?.vector
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
    isProjection && revealResult && result?.projVector
      ? result.projVector
      : undefined;
  const perpVec2D =
    isProjection && revealResult && result?.perpVector
      ? result.perpVector
      : undefined;
  const projVec3D =
    isProjection && revealResult && result?.projVector
      ? result.projVector
      : undefined;
  const perpVec3D =
    isProjection && revealResult && result?.perpVector
      ? result.perpVector
      : undefined;

  const labels = dim === "2d" ? ["x", "y"] : ["x", "y", "z"];

  return (
    <div className="vector-workspace min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="workspace-label text-xs font-semibold uppercase tracking-widest text-primary">
            {lang === "zh" ? "向量 · 工作區" : "Vectors · workspace"}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {activeTab === "spatial"
              ? lang === "zh"
                ? "直線與平面夾角"
                : "Lines & planes"
              : activeTab === "centers"
                ? lang === "zh"
                  ? "三角形四心"
                  : "Triangle centres"
                : activeTab === "dse"
                  ? lang === "zh"
                    ? "DSE 向量練習"
                    : "DSE vector practice"
                  : activeTab === "practice"
                    ? lang === "zh"
                      ? "向量練習"
                      : "Vector practice"
                    : t.vectorCalc}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {activeTab === "spatial"
              ? lang === "zh"
                ? "由四點或以上的已知坐標，以平面內向量、投影與內積求夾角，並播放同步建構圖。"
                : "Start from four or more given points, then use in-plane vectors, projections and dot products with animated geometry."
              : activeTab === "centers"
                ? lang === "zh"
                  ? "拖曳頂點，播放建構，理解 G、I、O、H。"
                  : "Drag vertices, play constructions and explore G, I, O, H."
                : activeTab === "dse"
                  ? lang === "zh"
                    ? "原創題組 · 2D／3D 向量與四心 · 精確答案及詳解"
                    : "Original questions · 2D/3D vectors and triangle centres · exact answers & solutions"
                  : activeTab === "practice"
                    ? lang === "zh"
                      ? "隨機題目，逐步檢查答案與解法。"
                      : "Random questions with answers and step-by-step solutions."
                    : lang === "zh"
                      ? "選擇運算、輸入分量，再探索精確答案與幾何意義。"
                      : "Choose an operation, enter components and explore exact answers with geometry."}
          </p>
        </div>
        {activeTab === "calc" && (
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground">
            {dim === "2d" ? "2D" : "3D"} · {opLabels[op]}
          </span>
        )}
      </header>

      <Tabs
        value={activeTab}
        onValueChange={value =>
          navigate(`/vector?tab=${value}`, { replace: true })
        }
        className="min-w-0"
      >
        <nav
          aria-label={
            lang === "zh" ? "向量工作區分頁" : "Vector workspace tabs"
          }
          className="vector-workspace-nav -mx-1 overflow-x-auto px-1 pb-1"
        >
          <TabsList className="h-auto w-max min-w-full justify-start gap-1 rounded-xl bg-secondary/70 p-1.5 text-secondary-foreground sm:min-w-0">
            <TabsTrigger
              value="calc"
              aria-label={t.calcMode}
              className="h-9 shrink-0 rounded-lg px-4 text-sm"
            >
              {lang === "zh" ? "計算" : "Calculate"}
            </TabsTrigger>
            <TabsTrigger
              value="centers"
              aria-label={lang === "zh" ? "三角形四心" : "Triangle Centers"}
              className="h-9 shrink-0 rounded-lg px-4 text-sm"
            >
              <Triangle className="mr-1.5 h-3.5 w-3.5" />
              {lang === "zh" ? "四心" : "Centres"}
            </TabsTrigger>
            <TabsTrigger
              value="spatial"
              aria-label={lang === "zh" ? "直線／平面夾角" : "Lines & planes"}
              className="h-9 shrink-0 rounded-lg px-4 text-sm"
            >
              {lang === "zh" ? "空間" : "Spatial"}
            </TabsTrigger>
            <TabsTrigger
              value="practice"
              aria-label={t.practiceMode}
              className="h-9 shrink-0 rounded-lg px-4 text-sm"
            >
              {lang === "zh" ? "練習" : "Practice"}
            </TabsTrigger>
            <TabsTrigger
              value="dse"
              aria-label={
                lang === "zh" ? "DSE Style 題組" : "DSE-Style Practice"
              }
              className="h-9 shrink-0 rounded-lg px-4 text-sm"
            >
              DSE
            </TabsTrigger>
          </TabsList>
        </nav>

        <TabsContent
          value="dse"
          className="workspace-section vector-dse-workspace mt-5 min-w-0"
        >
          <DseVectorPracticePanel />
        </TabsContent>
        <TabsContent
          value="practice"
          className="workspace-section vector-practice-workspace mt-5 min-w-0"
        >
          <PracticePanel
            generateQuestion={genQuestion}
            moduleLabel={lang === "zh" ? "向量練習" : "Vector Practice"}
          />
        </TabsContent>
        <TabsContent
          value="centers"
          className="workspace-section vector-centers-workspace mt-5 min-w-0"
        >
          <TriangleCentersWorkspace />
        </TabsContent>
        <TabsContent
          value="spatial"
          className="workspace-section vector-spatial-workspace mt-5 min-w-0"
        >
          <SpatialAnglesPanel />
        </TabsContent>

        <TabsContent
          value="calc"
          className="vector-calculator mt-5 min-w-0 space-y-5"
        >
          {/* Compact tool selection; the essential meaning stays visible. */}
          <section
            className="workspace-section vector-tools space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5"
            aria-label={
              lang === "zh" ? "選擇向量運算" : "Choose a vector operation"
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="workspace-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {lang === "zh" ? "01 / 運算" : "01 / Operation"}
                </span>
                <h2 className="text-sm font-semibold">{opLabels[op]}</h2>
              </div>
              <div
                className="flex items-center gap-1 rounded-lg bg-secondary p-1 text-secondary-foreground"
                role="group"
                aria-label={lang === "zh" ? "向量維度" : "Vector dimensions"}
              >
                {(["2d", "3d"] as Dim[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => switchDim(d)}
                    aria-pressed={dim === d}
                    aria-label={d === "2d" ? t.vector2D : t.vector3D}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dim === d ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {d === "2d" ? "2D" : "3D"}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={lang === "zh" ? "向量運算" : "Vector operations"}
            >
              {availableOps.map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    setOp(o);
                    setResult(null);
                    setError(null);
                  }}
                  aria-pressed={op === o}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${op === o ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary"}`}
                >
                  {opLabels[o]}
                </button>
              ))}
            </div>
            <GeomHint op={op} dim={dim} lang={lang} />
          </section>

          <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            {/* Mobile reading order: inputs, exact result, diagram, derivation. */}
            <div className="min-w-0 space-y-5">
              <section
                className="workspace-section vector-parameters space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5"
                aria-labelledby="vector-input-title"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="vector-input-title" className="text-sm font-semibold">
                    <span className="workspace-label mr-2 text-xs font-medium text-muted-foreground">
                      02 /
                    </span>
                    {lang === "zh" ? "輸入分量" : "Components"}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {needsB
                      ? lang === "zh"
                        ? "兩個向量"
                        : "Two vectors"
                      : lang === "zh"
                        ? "只需向量 a"
                        : "Vector a only"}
                  </span>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div
                    className={`min-w-0 space-y-3 rounded-xl border border-border bg-background p-3 text-foreground ${!needsB ? "sm:col-span-2 lg:col-span-1 xl:col-span-2" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-600" />
                      <h3 className="text-sm font-semibold">{t.vectorA}</h3>
                    </div>
                    <div
                      className="grid grid-cols-2 gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {vecA.map((v, i) => (
                        <label key={i} className="min-w-0 space-y-1.5">
                          <span className="block text-xs font-mono text-muted-foreground">
                            {labels[i]}
                          </span>
                          <input
                            type="number"
                            value={v === 0 ? "" : v}
                            placeholder="0"
                            onChange={e => handleVecAChange(i, e.target.value)}
                            aria-label={`${t.vectorA} ${labels[i]}`}
                            className="matrix-cell !w-full min-w-0 rounded-lg border-blue-300 !text-sm focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="overflow-x-auto border-t border-border pt-2 text-xs text-muted-foreground">
                      <KatexRenderer
                        latex={`\\mathbf{a} = ${vecToLatex(vecA)}`}
                      />
                    </div>
                  </div>

                  {needsB && (
                    <div className="min-w-0 space-y-3 rounded-xl border border-border bg-background p-3 text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-600" />
                        <h3 className="text-sm font-semibold">{t.vectorB}</h3>
                      </div>
                      <div
                        className="grid grid-cols-2 gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {vecB.map((v, i) => (
                          <label key={i} className="min-w-0 space-y-1.5">
                            <span className="block text-xs font-mono text-muted-foreground">
                              {labels[i]}
                            </span>
                            <input
                              type="number"
                              value={v === 0 ? "" : v}
                              placeholder="0"
                              onChange={e =>
                                handleVecBChange(i, e.target.value)
                              }
                              aria-label={`${t.vectorB} ${labels[i]}`}
                              className="matrix-cell !w-full min-w-0 rounded-lg border-red-300 !text-sm focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="overflow-x-auto border-t border-border pt-2 text-xs text-muted-foreground">
                        <KatexRenderer
                          latex={`\\mathbf{b} = ${vecToLatex(vecB)}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-border pt-4">
                  <Button
                    onClick={handleCalculate}
                    className="flex-1 rounded-lg font-semibold"
                  >
                    {t.calculate}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="rounded-lg bg-background text-foreground"
                  >
                    {t.reset}
                  </Button>
                </div>
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">{error}</p>
                  </div>
                )}
              </section>

              <section
                className="workspace-section vector-result min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5"
                aria-labelledby="vector-result-title"
                aria-live="polite"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2
                    id="vector-result-title"
                    className="text-sm font-semibold"
                  >
                    <span className="workspace-label mr-2 text-xs font-medium text-muted-foreground">
                      03 /
                    </span>
                    {t.result}
                  </h2>
                  {result && !error && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {lang === "zh" ? "精確答案" : "Exact answer"}
                    </span>
                  )}
                </div>
                {result && !error ? (
                  <div className="result-row overflow-x-auto rounded-xl bg-secondary/50 px-3 py-2 text-secondary-foreground">
                    <KatexRenderer latex={result.exactLatex} displayMode />
                  </div>
                ) : (
                  <p className="rounded-xl bg-secondary/40 p-3 text-sm leading-relaxed text-muted-foreground">
                    {lang === "zh"
                      ? "輸入分量後按「計算」，精確答案會顯示在這裡。圖解會隨輸入即時更新。"
                      : "Enter components and select Calculate to see the exact answer here. The diagram updates as you edit."}
                  </p>
                )}
              </section>
            </div>

            <div className="min-w-0 space-y-5">
              <section
                className="workspace-section vector-diagram min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5"
                aria-labelledby="vector-diagram-title"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    id="vector-diagram-title"
                    className="text-sm font-semibold"
                  >
                    <span className="workspace-label mr-2 text-xs font-medium text-muted-foreground">
                      04 /
                    </span>
                    {t.visualization}
                  </h2>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    {lang === "zh" ? "可縮放 · 可拖曳" : "Zoom · drag"}
                  </span>
                </div>

                {showVis ? (
                  dim === "2d" ? (
                    <VectorPlot2D
                      vectors={visVectors2D}
                      op={op}
                      lang={lang}
                      projVector={projVec2D}
                      perpVector={perpVec2D}
                      constructionStage={constructionStage}
                    />
                  ) : (
                    <VectorPlot3D
                      vectors={visVectors3D}
                      op={op}
                      lang={lang}
                      projVector={projVec3D}
                      perpVector={perpVec3D}
                      constructionStage={constructionStage}
                    />
                  )
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl bg-secondary/40 text-sm text-muted-foreground">
                    {lang === "zh"
                      ? "此運算無幾何視覺化"
                      : "No geometric visualization for this operation"}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 rounded bg-blue-600" />
                    <span className="text-muted-foreground">{t.vectorA}</span>
                  </span>
                  {needsB && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-4 rounded bg-red-600" />
                      <span className="text-muted-foreground">{t.vectorB}</span>
                    </span>
                  )}
                  {result?.vector && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-4 rounded bg-green-600" />
                      <span className="text-muted-foreground">{t.result}</span>
                    </span>
                  )}
                  {op === "cross" && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-4 rounded border border-indigo-400/50 bg-indigo-400/30" />
                      <span className="text-muted-foreground">
                        {lang === "zh"
                          ? "平行四邊形（面積 = |a×b|）"
                          : "Parallelogram (area = |a×b|)"}
                      </span>
                    </span>
                  )}
                  {(op === "add" || op === "sub") && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-4 border-t border-dashed border-red-500" />
                      <span className="text-muted-foreground">
                        {lang === "zh" ? "首尾相接法" : "tip-to-tail"}
                      </span>
                    </span>
                  )}
                </div>
              </section>

              {result && !error && result.steps && result.steps.length > 0 && (
                <details className="workspace-section vector-derivation group min-w-0 rounded-2xl border border-border bg-card text-card-foreground">
                  <summary className="cursor-pointer rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
                    <span className="ml-1 text-sm font-semibold">
                      {t.steps}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {lang === "zh"
                        ? `${result.steps.length} 步 · 展開推導與同步播放`
                        : `${result.steps.length} steps · expand for derivation & playback`}
                    </span>
                  </summary>
                  <div className="min-w-0 border-t border-border p-4 sm:p-5">
                    <StepDisplay
                      steps={result.steps}
                      title={t.steps}
                      onStepChange={onDerivationStep}
                    />
                  </div>
                </details>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
