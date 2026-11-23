import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  SlidersHorizontal,
  Triangle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import TriangleCentersPlot from "@/components/TriangleCentersPlot";
import { computeTriangleCenters, type Vec3 } from "@/lib/vectorMath";
import { triangleExact } from "@/lib/triangleExact";
import {
  ALL_LAYERS,
  CONSTRUCTION_STEPS,
  advanceConstruction,
  isUsableTriangle,
  stageVisibility,
  type CenterName,
  type ConstructionLayers,
  type VertexName,
} from "@/lib/triangleInteraction";

const PRESETS: Array<{
  id: string;
  zh: string;
  en: string;
  A: Vec3;
  B: Vec3;
  C: Vec3;
  view: "2d" | "3d";
}> = [
  {
    id: "right",
    zh: "直角 6–8–10",
    en: "Right 6–8–10",
    A: [0, 0, 0],
    B: [6, 0, 0],
    C: [0, 8, 0],
    view: "2d",
  },
  {
    id: "acute",
    zh: "銳角",
    en: "Acute",
    A: [0, 0, 0],
    B: [6, 0, 0],
    C: [2, 5, 0],
    view: "2d",
  },
  {
    id: "obtuse",
    zh: "鈍角",
    en: "Obtuse",
    A: [0, 0, 0],
    B: [6, 0, 0],
    C: [1, 1.5, 0],
    view: "2d",
  },
  {
    id: "space",
    zh: "空間",
    en: "In space",
    A: [1, 1, 1],
    B: [6, 1, 3],
    C: [2, 5, 4],
    view: "3d",
  },
];
const VERTICES: VertexName[] = ["A", "B", "C"];
const CENTER_NAMES: CenterName[] = ["G", "I", "O", "H"];
const START_LAYERS: ConstructionLayers = {
  ...ALL_LAYERS,
  altitudes: false,
  perpendicularBisectors: false,
  angleBisectors: false,
};
const CENTER_META = [
  {
    symbol: "G" as const,
    key: "centroid" as const,
    zh: "重心",
    en: "Centroid",
    descZh: "三條中線的交點",
    descEn: "Intersection of medians",
    color: "#7c3aed",
  },
  {
    symbol: "I" as const,
    key: "incenter" as const,
    zh: "內心",
    en: "Incenter",
    descZh: "角平分線的交點",
    descEn: "Intersection of angle bisectors",
    color: "#b7791f",
  },
  {
    symbol: "O" as const,
    key: "circumcenter" as const,
    zh: "外心",
    en: "Circumcenter",
    descZh: "垂直平分線的交點",
    descEn: "Intersection of perpendicular bisectors",
    color: "#0891b2",
  },
  {
    symbol: "H" as const,
    key: "orthocenter" as const,
    zh: "垂心",
    en: "Orthocenter",
    descZh: "三條高線的交點",
    descEn: "Intersection of altitudes",
    color: "#dc2626",
  },
];
const LAYER_OPTIONS: Array<{
  key: keyof ConstructionLayers;
  zh: string;
  en: string;
  color: string;
}> = [
  { key: "medians", zh: "中線 → G", en: "Medians → G", color: "#7c3aed" },
  {
    key: "angleBisectors",
    zh: "角平分線 → I",
    en: "Angle bisectors → I",
    color: "#b7791f",
  },
  { key: "incircle", zh: "內切圓", en: "Incircle", color: "#b7791f" },
  {
    key: "perpendicularBisectors",
    zh: "垂直平分線 → O",
    en: "Perp. bisectors → O",
    color: "#0891b2",
  },
  { key: "circumcircle", zh: "外接圓", en: "Circumcircle", color: "#0891b2" },
  { key: "altitudes", zh: "高線 → H", en: "Altitudes → H", color: "#dc2626" },
  { key: "eulerLine", zh: "Euler 線", en: "Euler line", color: "#475569" },
];
const pretty = (p: Vec3) => `(${p.map(x => Number(x.toFixed(4))).join(", ")})`;

export default function TriangleCentersWorkspace() {
  const { lang } = useLanguage();
  const zh = lang === "zh";
  const [vertices, setVertices] = useState<Record<VertexName, Vec3>>({
    A: PRESETS[0].A,
    B: PRESETS[0].B,
    C: PRESETS[0].C,
  });
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [mode, setMode] = useState<"explore" | "steps">("explore");
  const [layers, setLayers] = useState<ConstructionLayers>(START_LAYERS);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [snap, setSnap] = useState(0.1);
  const [dragging, setDragging] = useState(false);
  const { A, B, C } = vertices;
  const result = useMemo(() => {
    if (!isUsableTriangle(A, B, C)) return null;
    try {
      return computeTriangleCenters(A, B, C);
    } catch {
      return null;
    }
  }, [A, B, C]);
  const exact = useMemo(() => {
    if (!result || dragging) return null;
    try {
      return triangleExact(A, B, C);
    } catch {
      return null;
    }
  }, [A, B, C, result, dragging]);
  const visibility = useMemo(
    () =>
      mode === "steps"
        ? stageVisibility(stage)
        : { layers, centers: CENTER_NAMES },
    [mode, stage, layers]
  );
  const step = CONSTRUCTION_STEPS[stage];

  useEffect(() => {
    if (
      !playing ||
      !result ||
      dragging ||
      stage === CONSTRUCTION_STEPS.length - 1
    ) {
      if (playing) setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setStage(advanceConstruction),
      2400 / speed
    );
    return () => window.clearTimeout(timer);
  }, [playing, stage, speed, result, dragging]);
  useEffect(() => {
    const pauseHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseHidden);
    return () => document.removeEventListener("visibilitychange", pauseHidden);
  }, []);

  const handleDragState = useCallback((active: boolean) => {
    setDragging(active);
    if (active) setPlaying(false);
  }, []);
  const handleVertexDrag = useCallback((vertex: VertexName, point: Vec3) => {
    setVertices(previous => ({ ...previous, [vertex]: point }));
  }, []);
  function updateCoordinate(
    vertex: VertexName,
    coordinate: number,
    value: string
  ) {
    const number = value === "" ? 0 : Number(value);
    if (!Number.isFinite(number)) return;
    setPlaying(false);
    setVertices(previous => ({
      ...previous,
      [vertex]: previous[vertex].map((x, i) =>
        i === coordinate ? number : x
      ) as Vec3,
    }));
    setRevision(n => n + 1);
  }
  function preset(p: (typeof PRESETS)[number]) {
    setPlaying(false);
    setDragging(false);
    setVertices({ A: p.A, B: p.B, C: p.C });
    setView(p.view);
    setRevision(n => n + 1);
    setStage(0);
  }
  function selectMode(next: "explore" | "steps") {
    setPlaying(false);
    setMode(next);
    if (next === "steps") setStage(0);
  }
  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (mode !== "steps" || stage === 5) {
      setMode("steps");
      setStage(0);
    }
    setPlaying(true);
  }
  const exactStepSuffix = exact
    ? [
        "",
        `,\\quad G=${exact.centroid}`,
        `,\\quad I=${exact.incenter}`,
        `,\\quad O=${exact.circumcenter}`,
        `,\\quad H=${exact.orthocenter}`,
        "",
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Triangle className="text-primary" size={21} />
            {zh ? "三角形四心工作台" : "Triangle centres workspace"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {zh
              ? "先看圖、再動手，最後理解每個中心的建構。"
              : "See the diagram, change the shape, then understand each construction."}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1 self-start shrink-0">
          {[
            { key: "explore" as const, title: zh ? "自由探索" : "Explore" },
            { key: "steps" as const, title: zh ? "逐步建構" : "Step by step" },
          ].map(item => (
            <button
              key={item.key}
              type="button"
              aria-pressed={mode === item.key}
              onClick={() => selectMode(item.key)}
              className={`px-3 py-2 text-xs font-semibold rounded-md ${mode === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {zh ? "互動圖形" : "Interactive diagram"}
            </span>
            <div className="inline-flex gap-1">
              {(["2d", "3d"] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => {
                    setView(value);
                    setPlaying(false);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-md border ${view === value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"}`}
                >
                  {value === "2d"
                    ? zh
                      ? "平面・可拖頂點"
                      : "2D · edit vertices"
                    : zh
                      ? "3D・旋轉"
                      : "3D · rotate"}
                </button>
              ))}
            </div>
          </div>
          {result ? (
            <TriangleCentersPlot
              A={A}
              B={B}
              C={C}
              centers={result}
              lang={lang}
              view={view}
              layers={visibility.layers}
              visibleCenters={visibility.centers}
              revision={revision}
              snap={snap}
              animateConstruction={mode === "steps"}
              onVertexChange={handleVertexDrag}
              onDragState={handleDragState}
            />
          ) : (
            <div
              role="alert"
              className="rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-16 flex items-start gap-3"
            >
              <AlertCircle className="text-destructive shrink-0" />
              <div>
                <h3 className="font-semibold">
                  {zh
                    ? "需要三個不共線頂點"
                    : "Three non-collinear vertices required"}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {zh
                    ? "三角形共線、過於扁平，或輸入無效。請修改坐標，或選擇預設三角形恢復。"
                    : "This triangle is collinear, nearly flat or invalid. Edit the coordinates or choose a preset to recover."}
                </p>
              </div>
            </div>
          )}
          {view === "3d" && (
            <p className="text-xs text-muted-foreground">
              {zh
                ? "3D 圖用作旋轉觀察；如要拖曳頂點，請切換「平面・可拖頂點」。"
                : "Rotate the 3D view to inspect it. To drag vertices, switch to “2D · edit vertices”."}
            </p>
          )}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={togglePlay}
                disabled={!result || dragging}
                className="gap-1.5"
                aria-label={
                  playing
                    ? zh
                      ? "暫停建構"
                      : "Pause construction"
                    : zh
                      ? "播放建構"
                      : "Play construction"
                }
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
                {playing
                  ? zh
                    ? "暫停"
                    : "Pause"
                  : zh
                    ? "播放建構"
                    : "Play construction"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!result}
                onClick={() => {
                  setMode("steps");
                  setStage(0);
                  setPlaying(false);
                }}
                aria-label={zh ? "重播：回到開始" : "Restart construction"}
                title={zh ? "回到開始" : "Restart"}
              >
                <RotateCcw size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!result || mode !== "steps" || stage === 0}
                onClick={() => {
                  setPlaying(false);
                  setStage(n => Math.max(0, n - 1));
                }}
                aria-label={zh ? "上一步" : "Previous step"}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!result || (mode === "steps" && stage === 5)}
                onClick={() => {
                  setPlaying(false);
                  if (mode !== "steps") {
                    setMode("steps");
                    setStage(1);
                  } else setStage(advanceConstruction);
                }}
                aria-label={zh ? "下一步" : "Next step"}
              >
                <ChevronRight size={16} />
              </Button>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                {zh ? "速度" : "Speed"}
                <select
                  aria-label={
                    zh ? "建構播放速度" : "Construction playback speed"
                  }
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="rounded-md border border-border bg-card px-1.5 py-1.5 text-foreground"
                >
                  {[0.5, 1, 1.5, 2].map(s => (
                    <option key={s} value={s}>
                      {s}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {mode === "steps" ? (
              <>
                <div
                  className="flex gap-1.5"
                  aria-label={zh ? "建構進度" : "Construction progress"}
                >
                  {CONSTRUCTION_STEPS.map((s, i) => (
                    <button
                      key={s.en}
                      type="button"
                      aria-label={`${i + 1}. ${zh ? s.zh : s.en}`}
                      aria-current={stage === i ? "step" : undefined}
                      title={zh ? s.zh : s.en}
                      onClick={() => {
                        setStage(i);
                        setPlaying(false);
                      }}
                      className={`h-1.5 rounded-full flex-1 ${i <= stage ? "bg-primary" : "bg-primary/15"}`}
                    />
                  ))}
                </div>
                <div
                  data-testid="construction-stage"
                  data-stage={stage}
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">
                      0{stage + 1} / 06
                    </span>
                    <h3 className="font-semibold text-sm">
                      {zh ? step.zh : step.en}
                    </h3>
                    {!playing && (
                      <span className="text-[10px] ml-auto text-muted-foreground">
                        {stage === 5
                          ? zh
                            ? "已完成"
                            : "Complete"
                          : zh
                            ? "已暫停"
                            : "Paused"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {zh ? step.detailZh : step.detailEn}
                  </p>
                  <div className="mt-2 overflow-x-auto">
                    <KatexRenderer latex={step.latex} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {zh
                  ? "按「播放建構」從三角形開始，逐步顯示建構線與四心。拖曳頂點會暫停播放。"
                  : "Press Play construction to reveal the lines and centres step by step. Dragging a vertex pauses playback."}
              </p>
            )}
          </div>
        </section>
        <aside className="rounded-xl border border-border bg-card p-4 space-y-5 min-w-0">
          <section>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">
              {zh ? "01　選擇三角形" : "01  Choose a triangle"}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => preset(p)}
                  className="rounded-lg border border-border px-2 py-2 text-xs text-foreground hover:border-primary hover:bg-primary/5"
                >
                  {zh ? p.zh : p.en}
                </button>
              ))}
            </div>
          </section>
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              {zh ? "02　頂點坐標" : "02  Vertex coordinates"}
            </h3>
            {VERTICES.map((vertex, index) => (
              <div key={vertex} className="rounded-lg bg-secondary/30 p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-5 h-5 text-[11px] text-white rounded-full flex items-center justify-center font-semibold"
                    style={{
                      background: ["#2563eb", "#dc2626", "#16a34a"][index],
                    }}
                  >
                    {vertex}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {zh ? "頂點" : "Vertex"} {vertex}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {vertices[vertex].map((coordinate, axis) => (
                    <label
                      key={axis}
                      className="text-[10px] text-muted-foreground"
                    >
                      {["x", "y", "z"][axis]}
                      <input
                        aria-label={`${vertex} ${["x", "y", "z"][axis]}`}
                        type="number"
                        step="any"
                        value={Number(coordinate.toPrecision(12))}
                        title={String(coordinate)}
                        onChange={e =>
                          updateCoordinate(vertex, axis, e.target.value)
                        }
                        className="w-full min-w-0 border border-border rounded-md bg-background text-foreground px-2 py-2 mt-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
              {zh ? "拖曳吸附（平面單位）" : "Drag snap (plane units)"}
              <select
                aria-label={zh ? "拖曳吸附間距" : "Drag snap distance"}
                value={snap}
                onChange={e => setSnap(Number(e.target.value))}
                className="border border-border rounded-md bg-background p-1.5 text-foreground"
              >
                {[1, 0.5, 0.1, 0.01].map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal size={13} />
              {zh ? "03　建構圖層" : "03  Construction layers"}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1 mb-2">
              {mode === "steps"
                ? zh
                  ? "逐步模式自動控制圖層；自由探索可自行開關。"
                  : "Step mode controls layers automatically. Switch to Explore to toggle them."
                : zh
                  ? "四心保持標示；選擇所需輔助線。"
                  : "All centres remain labelled. Choose the construction lines."}
            </p>
            <div className="space-y-1">
              {LAYER_OPTIONS.map(item => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${mode === "steps" ? "text-muted-foreground" : "hover:bg-secondary/40 cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    disabled={mode === "steps"}
                    checked={visibility.layers[item.key]}
                    onChange={() =>
                      setLayers(previous => ({
                        ...previous,
                        [item.key]: !previous[item.key],
                      }))
                    }
                    className="accent-primary"
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: item.color }}
                  />
                  {zh ? item.zh : item.en}
                </label>
              ))}
            </div>
          </section>
          <Button
            variant="outline"
            className="w-full gap-1.5 text-xs"
            onClick={() => {
              preset(PRESETS[0]);
              setLayers(START_LAYERS);
              setMode("explore");
            }}
          >
            <RotateCcw size={13} />
            {zh ? "重設工作台" : "Reset workspace"}
          </Button>
        </aside>
      </div>
      {result && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              {zh ? "四心結果" : "Centre results"}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {exact
                ? zh
                  ? "精確值優先 · 圖上坐標為近似值"
                  : "Exact values first · diagram labels are approximate"
                : zh
                  ? "拖曳中顯示近似值；放開後更新精確值"
                  : "Approximations while dragging; exact values on release"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
            {CENTER_META.map(meta => (
              <div
                key={meta.symbol}
                className={`rounded-xl border border-border bg-card p-4 space-y-2 min-w-0 ${!visibility.centers.includes(meta.symbol) ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg text-white text-sm font-semibold flex items-center justify-center"
                    style={{ background: meta.color }}
                  >
                    {meta.symbol}
                  </span>
                  <h4 className="font-semibold text-sm">
                    {zh ? meta.zh : meta.en}
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {zh ? meta.descZh : meta.descEn}
                </p>
                <div className="overflow-x-auto text-sm">
                  <KatexRenderer
                    latex={`${meta.symbol}${exact ? "=" : "\\approx"}${exact ? exact[meta.key] : pretty(result[meta.key])}`}
                  />
                </div>
                {exact && (
                  <p className="text-[10px] font-mono text-muted-foreground break-words">
                    ≈ {pretty(result[meta.key])}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 overflow-x-auto">
            <KatexRenderer
              latex={`a=|BC|${exact ? "=" : "\\approx"}${exact?.sideA ?? result.sideA.toFixed(4)},\\quad b=|CA|${exact ? "=" : "\\approx"}${exact?.sideB ?? result.sideB.toFixed(4)},\\quad c=|AB|${exact ? "=" : "\\approx"}${exact?.sideC ?? result.sideC.toFixed(4)}`}
            />
          </div>
          <details className="rounded-xl border border-border bg-card p-4">
            <summary className="text-sm font-semibold cursor-pointer">
              {zh
                ? "查看完整 LaTeX 推導與公式"
                : "View full LaTeX derivation & formulas"}
            </summary>
            <div className="pt-4">
              <StepDisplay
                title={
                  zh ? "建構與坐標推導" : "Construction & coordinate derivation"
                }
                steps={CONSTRUCTION_STEPS.map((s, i) => ({
                  description: zh ? s.detailZh : s.detailEn,
                  latex: s.latex + (exactStepSuffix[i] ?? ""),
                }))}
              />
              <div className="mt-4 text-xs text-muted-foreground">
                <p>
                  {zh
                    ? "空間三角形：外心在三角形平面內，令 u = B − A、v = C − A，解以下 Gram 方程。"
                    : "For a triangle in space, the circumcenter lies in its plane. Let u = B − A, v = C − A and solve the Gram system."}
                </p>
                <div className="overflow-x-auto mt-2">
                  <KatexRenderer latex="2\\begin{bmatrix}u\\cdot u&u\\cdot v\\\\u\\cdot v&v\\cdot v\\end{bmatrix}\\begin{bmatrix}s\\\\t\\end{bmatrix}=\\begin{bmatrix}u\\cdot u\\\\v\\cdot v\\end{bmatrix},\\quad O=A+su+tv" />
                </div>
              </div>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
