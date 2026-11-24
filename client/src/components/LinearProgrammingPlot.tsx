import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Scan,
  ZoomIn,
  ZoomOut,
  Move,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  lpRational,
  lpConstraintLatex,
  type LPResult,
  type LPGoal,
  type LPLang,
  type LPNames,
  type LPPoint,
  type LPExactConstraint,
} from "@/lib/linearProgramming";
import {
  add,
  sub,
  mul,
  div,
  neg,
  ratToStr,
  toNumber,
  type Rational,
} from "@/lib/rational";
import KatexRenderer from "./KatexRenderer";

export interface LinearProgrammingPlotProps {
  result: LPResult;
  goal: LPGoal;
  lang: LPLang;
  stepIndex: number;
  level: number;
  onLevelChange: (level: number) => void;
  names?: LPNames;
  parameterMode?: boolean;
}

type View = { left: number; right: number; bottom: number; top: number };
const W = 600,
  H = 480,
  M = 42;
const colors = [
  "#287c80",
  "#6e61a5",
  "#bf7544",
  "#478b62",
  "#527ca8",
  "#af6183",
  "#7e8450",
  "#578a91",
  "#8a658e",
  "#8f754d",
  "#4f8176",
  "#767da6",
];
const buttonClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40";
const samePoint = (p: LPPoint, q: LPPoint) =>
  p.x.n * q.x.d === q.x.n * p.x.d && p.y.n * q.y.d === q.y.n * p.y.d;
const cleanPoints = (points: LPPoint[]) =>
  points
    .filter((p, i) => !i || !samePoint(p, points[i - 1]))
    .filter(
      (p, i, arr) =>
        arr.length < 2 || i !== arr.length - 1 || !samePoint(p, arr[0])
    );

// All intersections, including viewport clipping, are rational. Viewport endpoints
// are only drawing coordinates: they never enter the LP result or vertex table.
function halfPlane(
  polygon: LPPoint[],
  a: Rational,
  b: Rational,
  rhs: Rational
): LPPoint[] {
  if (!polygon.length) return [];
  const side = (p: LPPoint) => sub(rhs, add(mul(a, p.x), mul(b, p.y)));
  const output: LPPoint[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i],
      q = polygon[(i + 1) % polygon.length];
    const sp = side(p),
      sq = side(q),
      insideP = sp.n >= 0n,
      insideQ = sq.n >= 0n;
    if (insideP) output.push(p);
    if (insideP !== insideQ) {
      const t = div(sp, sub(sp, sq));
      output.push({
        x: add(p.x, mul(t, sub(q.x, p.x))),
        y: add(p.y, mul(t, sub(q.y, p.y))),
      });
    }
  }
  return cleanPoints(output);
}
function clip(polygon: LPPoint[], constraint: LPExactConstraint) {
  let p = polygon;
  if (constraint.relation !== ">=")
    p = halfPlane(p, constraint.a, constraint.b, constraint.rhs);
  if (constraint.relation !== "<=")
    p = halfPlane(p, neg(constraint.a), neg(constraint.b), neg(constraint.rhs));
  return p;
}
function rectangle(view: View): LPPoint[] {
  const l = lpRational(String(view.left)),
    r = lpRational(String(view.right)),
    b = lpRational(String(view.bottom)),
    t = lpRational(String(view.top));
  return [
    { x: l, y: b },
    { x: r, y: b },
    { x: r, y: t },
    { x: l, y: t },
  ];
}
function hasArea(p: LPPoint[]) {
  let area = lpRational("0");
  for (let i = 0; i < p.length; i++)
    area = add(
      area,
      sub(
        mul(p[i].x, p[(i + 1) % p.length].y),
        mul(p[i].y, p[(i + 1) % p.length].x)
      )
    );
  return area.n !== 0n;
}
function fitView(result: LPResult): View {
  const xs = [0],
    ys = [0];
  for (const p of [
    ...result.vertices,
    ...(result.witness ? [result.witness] : []),
  ]) {
    const x = toNumber(p.x),
      y = toNumber(p.y);
    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Math.abs(x) <= 1e8 &&
      Math.abs(y) <= 1e8
    ) {
      xs.push(x);
      ys.push(y);
    }
  }
  for (const c of result.constraints) {
    if (c.a.n) {
      const v = toNumber(div(c.rhs, c.a));
      if (Number.isFinite(v) && Math.abs(v) < 1e6) xs.push(v);
    }
    if (c.b.n) {
      const v = toNumber(div(c.rhs, c.b));
      if (Number.isFinite(v) && Math.abs(v) < 1e6) ys.push(v);
    }
  }
  const xlo = Math.min(...xs),
    xhi = Math.max(...xs),
    ylo = Math.min(...ys),
    yhi = Math.max(...ys);
  const span =
    Math.max(8, xhi - xlo, ((yhi - ylo) * (W - M * 2)) / (H - M * 2)) * 1.35;
  const height = (span * (H - M * 2)) / (W - M * 2);
  return {
    left: (xlo + xhi - span) / 2,
    right: (xlo + xhi + span) / 2,
    bottom: (ylo + yhi - height) / 2,
    top: (ylo + yhi + height) / 2,
  };
}
function ticks(lo: number, hi: number) {
  const raw = (hi - lo) / 7,
    base = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 5, 10].find(v => v * base >= raw)! * base;
  const values: number[] = [];
  for (let i = Math.ceil(lo / unit); i * unit <= hi && values.length < 20; i++)
    values.push(i * unit);
  return values;
}
const formatTick = (v: number) =>
  Math.abs(v) >= 1e5 || (Math.abs(v) > 0 && Math.abs(v) < 0.001)
    ? v.toExponential(1)
    : Number(v.toPrecision(5)).toString();

export default function LinearProgrammingPlot({
  result,
  goal,
  lang,
  stepIndex,
  level,
  onLevelChange,
  names,
  parameterMode,
}: LinearProgrammingPlotProps) {
  const zh = lang === "zh";
  const initialView = useRef<View>(fitView(result));
  const [view, setView] = useState<View>(initialView.current);
  const [panMode, setPanMode] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const drag = useRef<{ x: number; y: number; view: View } | null>(null);
  const plotId = useId().replace(/:/g, "");
  const stage = Math.max(0, Math.min(5, stepIndex));
  const optimum = result[goal];
  const project = (p: LPPoint) => ({
    x:
      M +
      ((toNumber(p.x) - view.left) / (view.right - view.left)) * (W - M * 2),
    y:
      H -
      M -
      ((toNumber(p.y) - view.bottom) / (view.top - view.bottom)) * (H - M * 2),
  });
  const px = (x: number) =>
    M + ((x - view.left) / (view.right - view.left)) * (W - M * 2);
  const py = (y: number) =>
    H - M - ((y - view.bottom) / (view.top - view.bottom)) * (H - M * 2);
  const viewport = useMemo(() => rectangle(view), [view]);
  const region = useMemo(
    () => (result.feasible ? result.constraints.reduce(clip, viewport) : []),
    [result, viewport]
  );
  const objectiveConstraint = (value: Rational): LPExactConstraint => ({
    id: "objective",
    a: result.objective.a,
    b: result.objective.b,
    relation: "=",
    rhs: sub(value, result.objective.c),
  });
  const support =
    optimum.status === "finite" && optimum.value
      ? clip(region, objectiveConstraint(optimum.value))
      : [];
  const objectiveIsConstant =
    result.objective.a.n === 0n && result.objective.b.n === 0n;
  const levelRange = useMemo(() => {
    const values = [
      result.min.value,
      result.max.value,
      result.witness
        ? add(
            add(
              mul(result.objective.a, result.witness.x),
              mul(result.objective.b, result.witness.y)
            ),
            result.objective.c
          )
        : null,
    ]
      .filter((v): v is Rational => v !== null)
      .map(toNumber)
      .filter(v => Number.isFinite(v) && Math.abs(v) <= 1e100);
    const lo = values.length ? Math.min(...values) : -10,
      hi = values.length ? Math.max(...values) : 10;
    const margin = Math.max(
      2,
      Math.abs(lo) * 0.1,
      Math.abs(hi) * 0.1,
      (hi - lo) * 0.25
    );
    return { min: lo - margin, max: hi + margin };
  }, [result]);
  const callback = useRef(onLevelChange);
  callback.current = onLevelChange;
  const currentLevel = useRef(level);
  currentLevel.current = level;
  useEffect(() => {
    setPlaying(false);
  }, [result, goal, stage]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    sync();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    if (!playing || reducedMotion || document.hidden) return;
    let frame = 0,
      previous = 0,
      direction = 1;
    const animate = (time: number) => {
      if (document.hidden) {
        setPlaying(false);
        return;
      }
      if (!previous) previous = time;
      const elapsed = Math.min(time - previous, 50);
      previous = time;
      let next =
        currentLevel.current +
        ((direction * elapsed) / 8000) * (levelRange.max - levelRange.min);
      if (next >= levelRange.max) {
        next = levelRange.max;
        direction = -1;
      }
      if (next <= levelRange.min) {
        next = levelRange.min;
        direction = 1;
      }
      currentLevel.current = next;
      callback.current(next);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, reducedMotion, levelRange]);

  function zoom(factor: number) {
    setView(v => {
      const cx = (v.left + v.right) / 2,
        cy = (v.bottom + v.top) / 2;
      const dx = Math.max(1e-5, Math.min(1e8, (v.right - v.left) * factor)) / 2,
        dy = (dx * (H - M * 2)) / (W - M * 2);
      return { left: cx - dx, right: cx + dx, bottom: cy - dy, top: cy + dy };
    });
  }
  function pan(dx: number, dy: number) {
    setView(v => ({
      left: v.left + dx * (v.right - v.left),
      right: v.right + dx * (v.right - v.left),
      bottom: v.bottom + dy * (v.top - v.bottom),
      top: v.top + dy * (v.top - v.bottom),
    }));
  }
  function pathFor(points: LPPoint[]) {
    return points
      .map(p => {
        const v = project(p);
        return `${v.x},${v.y}`;
      })
      .join(" ");
  }
  function shape(
    points: LPPoint[],
    color: string,
    fill: string,
    width: number,
    key: string
  ) {
    if (!points.length) return null;
    if (points.length === 1) {
      const p = project(points[0]);
      return <circle key={key} cx={p.x} cy={p.y} r={width + 2} fill={color} />;
    }
    if (hasArea(points))
      return (
        <polygon
          key={key}
          points={pathFor(points)}
          fill={fill}
          stroke={color}
          strokeWidth={width}
        />
      );
    // Degenerate feasible sets may be lines or points, never fake polygons.
    const sorted = [...points].sort(
      (p, q) => toNumber(p.x) - toNumber(q.x) || toNumber(p.y) - toNumber(q.y)
    );
    return (
      <polyline
        key={key}
        points={pathFor([sorted[0], sorted[sorted.length - 1]])}
        fill="none"
        stroke={color}
        strokeWidth={width}
      />
    );
  }
  const visibleCount =
    stage === 0
      ? Math.min(1, result.constraints.length)
      : result.constraints.length;
  const stages = zh
    ? [
        "第一條邊界",
        "所有約束邊界",
        "共同可行區域",
        "真正頂點",
        "平行目標直線",
        "最優支撐線與解",
      ]
    : [
        "First boundary",
        "All constraint boundaries",
        "Common feasible region",
        "True vertices",
        "Parallel objective lines",
        "Optimal support and solutions",
      ];

  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
      data-testid="lp-plot"
      data-stage={stage}
      data-view={`${view.left},${view.right},${view.bottom},${view.top}`}
      aria-label={
        zh ? "線性規劃互動圖" : "Interactive linear programming graph"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div>
          <h2 className="text-sm font-semibold">
            {zh ? "可行區域實驗室" : "Feasible-region lab"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {stage + 1}/6 · {stages[stage]}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={buttonClass}
            aria-label={zh ? "放大圖形" : "Zoom in graph"}
            onClick={() => zoom(0.75)}
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-label={zh ? "縮小圖形" : "Zoom out graph"}
            onClick={() => zoom(1.35)}
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-label={zh ? "適合目前約束" : "Fit current constraints"}
            onClick={() => setView(fitView(result))}
          >
            <Scan size={16} />
            <span>{zh ? "適合" : "Fit"}</span>
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-label={zh ? "重置圖形視窗" : "Reset graph view"}
            onClick={() => setView(initialView.current)}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full bg-[#fcfcf7]"
        role="img"
        tabIndex={0}
        aria-label={
          zh
            ? "座標圖：陰影僅為視窗內可行部分；圓點為真正頂點。方向鍵平移，加減鍵縮放。"
            : "Coordinate graph: shading is only the visible feasible portion; dots are true vertices. Arrow keys pan; plus and minus zoom."
        }
        style={{
          touchAction: panMode ? "none" : "pan-y",
          cursor: panMode ? "grab" : "default",
        }}
        onKeyDown={e => {
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "+",
              "=",
              "-",
            ].includes(e.key)
          )
            e.preventDefault();
          if (e.key === "ArrowLeft") pan(-0.15, 0);
          if (e.key === "ArrowRight") pan(0.15, 0);
          if (e.key === "ArrowUp") pan(0, 0.15);
          if (e.key === "ArrowDown") pan(0, -0.15);
          if (e.key === "+" || e.key === "=") zoom(0.75);
          if (e.key === "-") zoom(1.35);
        }}
        onPointerDown={e => {
          if (!panMode) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, view };
        }}
        onPointerMove={e => {
          const d = drag.current;
          if (!d) return;
          const box = e.currentTarget.getBoundingClientRect();
          const dx =
              ((((e.clientX - d.x) / box.width) * W) / (W - M * 2)) *
              (d.view.right - d.view.left),
            dy =
              ((((e.clientY - d.y) / box.height) * H) / (H - M * 2)) *
              (d.view.top - d.view.bottom);
          setView({
            left: d.view.left - dx,
            right: d.view.right - dx,
            bottom: d.view.bottom + dy,
            top: d.view.top + dy,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <title>
          {zh
            ? "線性規劃的精確頂點與視窗裁切"
            : "Exact LP vertices and viewport clipping"}
        </title>
        <defs>
          <clipPath id={plotId}>
            <rect x={M} y={M} width={W - M * 2} height={H - M * 2} />
          </clipPath>
        </defs>
        {ticks(view.left, view.right).map(v => (
          <g key={`x${v}`}>
            <line x1={px(v)} x2={px(v)} y1={M} y2={H - M} stroke="#e5e7df" />
            <text
              x={px(v)}
              y={H - M + 18}
              textAnchor="middle"
              fontSize="11"
              fill="#737b78"
            >
              {formatTick(v)}
            </text>
          </g>
        ))}
        {ticks(view.bottom, view.top).map(v => (
          <g key={`y${v}`}>
            <line x1={M} x2={W - M} y1={py(v)} y2={py(v)} stroke="#e5e7df" />
            <text
              x={M - 7}
              y={py(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#737b78"
            >
              {formatTick(v)}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${plotId})`}>
          {stage >= 2 && shape(region, "#5caaa0", "#78bdb12c", 1.5, "region")}
          <line
            x1={M}
            x2={W - M}
            y1={py(0)}
            y2={py(0)}
            stroke="#87928c"
            strokeWidth="1.4"
          />
          <line
            y1={M}
            y2={H - M}
            x1={px(0)}
            x2={px(0)}
            stroke="#87928c"
            strokeWidth="1.4"
          />
          {result.constraints.slice(0, visibleCount).map((c, i) => {
            if (!c.a.n && !c.b.n) return null;
            const line = clip(viewport, { ...c, relation: "=" });
            return (
              <g key={c.id}>
                <title>{lpConstraintLatex(c, names)}</title>
                {shape(line, colors[i % colors.length], "none", 2, c.id)}
              </g>
            );
          })}
          {stage >= 4 &&
            !objectiveIsConstant &&
            Number.isFinite(level) &&
            [-1, 0, 1].map(offset => {
              const value = lpRational(
                String(
                  level + (offset * (levelRange.max - levelRange.min)) / 10
                )
              );
              const line = clip(viewport, objectiveConstraint(value));
              return (
                <g
                  key={`parallel${offset}`}
                  opacity={offset ? 0.25 : 0.9}
                  strokeDasharray={offset ? "4 6" : "9 5"}
                >
                  <title>
                    {zh
                      ? `近似目標水平 ${formatTick(toNumber(value))}`
                      : `Approximate objective level ${formatTick(toNumber(value))}`}
                  </title>
                  {shape(
                    line,
                    "#217d85",
                    "none",
                    offset ? 1.5 : 2.5,
                    `parallel${offset}`
                  )}
                </g>
              );
            })}
          {stage >= 5 && (
            <g>
              <title>
                {zh
                  ? "精確最優支撐：裁切端點不是額外頂點"
                  : "Exact optimal support: clipped endpoints are not extra vertices"}
              </title>
              {shape(
                support,
                "#bc8732",
                objectiveIsConstant ? "#d9ad3520" : "none",
                4,
                "support"
              )}
            </g>
          )}
          {stage >= 3 &&
            result.vertices.map((p, i) => {
              const v = project(p),
                optimal =
                  stage >= 5 && optimum.points.some(q => samePoint(p, q));
              return (
                <g
                  key={`${p.x.n}/${p.x.d},${p.y.n}/${p.y.d}`}
                  data-testid={`lp-vertex-${i}`}
                  data-x={ratToStr(p.x)}
                  data-y={ratToStr(p.y)}
                >
                  <title>{`V${i + 1}: (${ratToStr(p.x)}, ${ratToStr(p.y)})${optimal ? (zh ? " · 最優" : " · optimal") : ""}`}</title>
                  <circle
                    cx={v.x}
                    cy={v.y}
                    r={optimal ? 6 : 4.5}
                    fill={optimal ? "#bc8732" : "#254e52"}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    x={v.x + 9}
                    y={v.y - 9}
                    fontSize="12"
                    fontWeight="600"
                    fill="#254e52"
                    stroke="#fcfcf7"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    V{i + 1}
                  </text>
                </g>
              );
            })}
        </g>
        <rect
          x={M}
          y={M}
          width={W - M * 2}
          height={H - M * 2}
          fill="none"
          stroke="#cdd6cd"
        />
        <text
          x={W - M + 9}
          y={Math.max(M + 12, Math.min(H - M - 8, py(0) - 8))}
          fontSize="15"
          fill="#254e52"
        >
          {names?.x || "x"}
        </text>
        <text
          y={M - 13}
          x={Math.max(M + 10, Math.min(W - M - 10, px(0) + 12))}
          fontSize="15"
          fill="#254e52"
        >
          {names?.y || "y"}
        </text>
        {stage >= 2 && !result.feasible && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fill="#b34c48"
            fontSize="17"
          >
            {zh ? "沒有可行點" : "No feasible points"}
          </text>
        )}
      </svg>
      <div className="space-y-3 border-t border-border p-3">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={`${buttonClass} ${panMode ? "border-primary bg-primary/10" : ""}`}
            aria-pressed={panMode}
            onClick={() => setPanMode(!panMode)}
          >
            <Move size={15} />
            {zh ? "拖曳平移" : "Drag to pan"}
          </button>
          {[
            {
              icon: ArrowLeft,
              dx: -0.15,
              dy: 0,
              label: zh ? "向左平移" : "Pan left",
            },
            {
              icon: ArrowRight,
              dx: 0.15,
              dy: 0,
              label: zh ? "向右平移" : "Pan right",
            },
            {
              icon: ArrowUp,
              dx: 0,
              dy: 0.15,
              label: zh ? "向上平移" : "Pan up",
            },
            {
              icon: ArrowDown,
              dx: 0,
              dy: -0.15,
              label: zh ? "向下平移" : "Pan down",
            },
          ].map(({ icon: Icon, dx, dy, label }) => (
            <button
              key={label}
              type="button"
              className={buttonClass}
              aria-label={label}
              onClick={() => pan(dx, dy)}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor={`${plotId}-level`}
              className="text-xs font-semibold"
            >
              {zh
                ? "目標水平（近似視覺值）"
                : "Objective level (approximate visual value)"}{" "}
              <span className="font-mono">≈ {formatTick(level)}</span>
            </label>
            <button
              type="button"
              className={buttonClass}
              disabled={stage < 4 || reducedMotion || objectiveIsConstant}
              onClick={() => setPlaying(!playing)}
              aria-label={
                playing
                  ? zh
                    ? "暫停目標線掃描"
                    : "Pause objective sweep"
                  : zh
                    ? "播放目標線掃描"
                    : "Play objective sweep"
              }
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? (zh ? "暫停" : "Pause") : zh ? "掃描" : "Sweep"}
            </button>
          </div>
          <input
            id={`${plotId}-level`}
            data-testid="lp-objective-level"
            aria-label={zh ? "近似目標水平" : "Approximate objective level"}
            type="range"
            min={Math.min(levelRange.min, level)}
            max={Math.max(levelRange.max, level)}
            step={(levelRange.max - levelRange.min) / 1000}
            value={level}
            disabled={stage < 4 || objectiveIsConstant}
            onChange={e => {
              setPlaying(false);
              onLevelChange(Number(e.target.value));
            }}
            className="block min-h-11 w-full accent-[#287c80]"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {zh
              ? "拖動只改變平行線的位置，不改變目標係數或精確答案；金色支撐線來自精確最值。"
              : "Dragging moves parallel lines only, not objective coefficients or the exact answer. The gold support comes from the exact extremum."}
            {reducedMotion &&
              (zh
                ? " 已啟用減少動態效果：請手動拖動。"
                : " Reduced motion is enabled: move the slider manually.")}
            {parameterMode &&
              (zh
                ? " 係數滑桿在結果面板中，會改變直線斜率。"
                : " The coefficient slider in the result panel changes the slope.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs">
          {result.constraints.slice(0, visibleCount).map((c, i) => (
            <span key={c.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-0.5 w-4"
                style={{ background: colors[i % colors.length] }}
              />
              <KatexRenderer latex={lpConstraintLatex(c, names)} />
            </span>
          ))}
        </div>
        <p
          className="text-xs leading-relaxed text-muted-foreground"
          data-testid="lp-viewport-note"
        >
          {zh
            ? "陰影僅為可行區域與目前視窗的交集；視窗邊框不代表約束，裁切角點不是頂點或最優解。未加入任何隱藏的正數限制。"
            : "Shading is the feasible region intersected with this viewport. The frame is not a constraint; clipped corners are not vertices or optima. No hidden non-negativity constraints are added."}
        </p>
        {stage >= 3 && result.feasible && !result.vertices.length && (
          <p className="text-xs text-primary">
            {zh
              ? "此可行集合沒有真正頂點；有限最值仍可能在整條線或區域上取得。"
              : "This feasible set has no true vertices; a finite optimum may still occur along a line or throughout a region."}
          </p>
        )}
        {stage >= 5 && objectiveIsConstant && result.feasible && (
          <p className="text-xs text-primary">
            {zh
              ? "目標函數為常數：所有可行點均為最優解。"
              : "The objective is constant: every feasible point is optimal."}
          </p>
        )}
      </div>
    </section>
  );
}
