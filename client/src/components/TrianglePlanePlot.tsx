import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Maximize2, Minus, Plus, Move } from "lucide-react";
import { buildTriangleCenterGeometry } from "@/lib/triangleCenterGeometry";
import type { TriangleCenterResult, Vec3 } from "@/lib/vectorMath";
import {
  constructionProgress,
  isUsableTriangle,
  makePlaneFrame,
  snapPlanePoint,
  type CenterName,
  type ConstructionLayers,
  type PlaneFrame,
  type VertexName,
} from "@/lib/triangleInteraction";

interface Props {
  A: Vec3;
  B: Vec3;
  C: Vec3;
  centers: TriangleCenterResult;
  lang: "zh" | "en";
  layers: ConstructionLayers;
  visibleCenters: CenterName[];
  revision: number;
  snap: number;
  animateConstruction?: boolean;
  onVertexChange: (vertex: VertexName, point: Vec3) => void;
  onDragState: (active: boolean) => void;
}
interface Viewport {
  x: number;
  y: number;
  span: number;
}
const W = 760,
  H = 500,
  LEFT = 38,
  TOP = 20,
  PW = 692,
  PH = 440;
const color = {
  A: "#2563eb",
  B: "#dc2626",
  C: "#16a34a",
  G: "#7c3aed",
  I: "#b7791f",
  O: "#0891b2",
  H: "#dc2626",
};
const short = (n: number) => String(Number(n.toFixed(3)));

function fitViewport(points: Vec3[], frame: PlaneFrame): Viewport {
  const projected = points.map(frame.project);
  const xs = projected.map(p => p[0]),
    ys = projected.map(p => p[1]);
  const span =
    Math.max(
      Math.max(...xs) - Math.min(...xs),
      ((Math.max(...ys) - Math.min(...ys)) * PW) / PH,
      2
    ) * 1.24;
  return {
    x: (Math.max(...xs) + Math.min(...xs)) / 2,
    y: (Math.max(...ys) + Math.min(...ys)) / 2,
    span,
  };
}
function tickStep(span: number) {
  const rough = span / 12,
    base = 10 ** Math.floor(Math.log10(rough));
  return ([1, 2, 5, 10].find(x => x * base >= rough) ?? 10) * base;
}

function ConstructionPath({
  segments,
  animate,
  ...props
}: React.SVGProps<SVGPathElement> & {
  segments: Array<Array<[number, number]>>;
  animate: boolean;
}) {
  const [progress, setProgress] = useState(animate ? 0 : 1);
  useEffect(() => {
    if (
      !animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setProgress(1);
      return;
    }
    let id = 0;
    const start = performance.now();
    function frame(now: number) {
      const p = constructionProgress(now - start);
      setProgress(p);
      if (p < 1) id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [animate]);
  const d = segments
    .map(points => {
      if (!points.length) return "";
      const end = progress * (points.length - 1);
      const count = Math.floor(end);
      const partial = points.slice(0, count + 1);
      if (count < points.length - 1)
        partial.push([
          points[count][0] +
            (points[count + 1][0] - points[count][0]) * (end - count),
          points[count][1] +
            (points[count + 1][1] - points[count][1]) * (end - count),
        ]);
      return partial.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
    })
    .join(" ");
  return <path {...props} d={d} />;
}

export default function TrianglePlanePlot({
  A,
  B,
  C,
  centers,
  lang,
  layers,
  visibleCenters,
  revision,
  snap,
  animateConstruction = false,
  onVertexChange,
  onDragState,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(W);
  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new ResizeObserver(entries =>
      setSvgWidth(entries[0].contentRect.width || W)
    );
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);
  const displayScale = svgWidth / W;
  const id = useId().replace(/:/g, "");
  const geometry = useMemo(
    () => buildTriangleCenterGeometry(A, B, C, centers),
    [A, B, C, centers]
  );
  const [frame, setFrame] = useState(() => makePlaneFrame(A, B, C));
  const fitPoints = [
    A,
    B,
    C,
    centers.centroid,
    centers.incenter,
    centers.circumcenter,
    centers.orthocenter,
    ...geometry.circumcircle,
  ];
  const [viewport, setViewport] = useState(() => fitViewport(fitPoints, frame));
  const [invalid, setInvalid] = useState(false);
  const [dragging, setDragging] = useState<VertexName | null>(null);
  const gesture = useRef<{
    id: number;
    vertex: VertexName | null;
    frame: PlaneFrame;
    viewport: Viewport;
    start: [number, number];
  } | null>(null);
  const latest = useRef({ A, B, C, onVertexChange, onDragState });
  latest.current = { A, B, C, onVertexChange, onDragState };

  // External coordinate input / presets reset the frame, never a pointer move.
  useEffect(() => {
    const next = makePlaneFrame(A, B, C);
    setFrame(next);
    setViewport(fitViewport(fitPoints, next));
    setInvalid(false);
    // Deliberately only external edits reset the graph; numeric dependencies are not drag resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
  useEffect(
    () => () => {
      if (gesture.current) latest.current.onDragState(false);
    },
    []
  );

  const scale = PW / viewport.span;
  const px = (p: Vec3) =>
    LEFT + PW / 2 + (frame.project(p)[0] - viewport.x) * scale;
  const py = (p: Vec3) =>
    TOP + PH / 2 - (frame.project(p)[1] - viewport.y) * scale;
  const path = (points: Vec3[]) =>
    points
      .map((p, i) => `${i ? "L" : "M"}${px(p).toFixed(3)},${py(p).toFixed(3)}`)
      .join(" ");

  function svgPoint(event: {
    clientX: number;
    clientY: number;
  }): [number, number] {
    const svg = svgRef.current!;
    const matrix = svg.getScreenCTM();
    if (!matrix) return [0, 0];
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse()
    );
    return [point.x, point.y];
  }
  function begin(event: ReactPointerEvent, vertex: VertexName | null) {
    if (event.button !== 0 || gesture.current) return;
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    gesture.current = {
      id: event.pointerId,
      vertex,
      frame,
      viewport,
      start: svgPoint(event),
    };
    setDragging(vertex);
    setInvalid(false);
    if (vertex) onDragState(true);
  }
  function move(event: ReactPointerEvent) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const [x, y] = svgPoint(event);
    const s = PW / current.viewport.span;
    if (!current.vertex) {
      setViewport({
        ...current.viewport,
        x: current.viewport.x - (x - current.start[0]) / s,
        y: current.viewport.y + (y - current.start[1]) / s,
      });
      return;
    }
    const plane = snapPlanePoint(
      [
        current.viewport.x + (x - LEFT - PW / 2) / s,
        current.viewport.y - (y - TOP - PH / 2) / s,
      ],
      snap
    );
    const point = current.frame.unproject(plane);
    const { A: a, B: b, C: c } = latest.current;
    const usable = isUsableTriangle(
      current.vertex === "A" ? point : a,
      current.vertex === "B" ? point : b,
      current.vertex === "C" ? point : c
    );
    setInvalid(!usable);
    if (usable) latest.current.onVertexChange(current.vertex, point);
  }
  function finish(event: ReactPointerEvent) {
    if (gesture.current?.id !== event.pointerId) return;
    if (gesture.current.vertex) latest.current.onDragState(false);
    gesture.current = null;
    setDragging(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId))
      svgRef.current.releasePointerCapture(event.pointerId);
  }
  function zoom(factor: number) {
    setViewport(previous => ({
      ...previous,
      span: Math.max(0.001, Math.min(1e9, previous.span * factor)),
    }));
  }
  const step = tickStep(viewport.span);
  const xMin = viewport.x - viewport.span / 2,
    yMin = viewport.y - (viewport.span * PH) / PW / 2;
  const xTicks = Array.from(
    { length: Math.ceil(viewport.span / step) + 1 },
    (_, i) => Math.ceil(xMin / step) * step + i * step
  ).filter(x => x <= xMin + viewport.span);
  const yTicks = Array.from(
    { length: Math.ceil((viewport.span * PH) / PW / step) + 1 },
    (_, i) => Math.ceil(yMin / step) * step + i * step
  ).filter(y => y <= yMin + (viewport.span * PH) / PW);
  const xPixel = (x: number) => LEFT + PW / 2 + (x - viewport.x) * scale;
  const yPixel = (y: number) => TOP + PH / 2 - (y - viewport.y) * scale;
  const points = [
    { name: "G" as const, point: centers.centroid, zh: "重心", en: "Centroid" },
    { name: "I" as const, point: centers.incenter, zh: "內心", en: "Incenter" },
    {
      name: "O" as const,
      point: centers.circumcenter,
      zh: "外心",
      en: "Circumcenter",
    },
    {
      name: "H" as const,
      point: centers.orthocenter,
      zh: "垂心",
      en: "Orthocenter",
    },
  ];
  const segments = [
    { key: "medians" as const, list: geometry.medians, stroke: color.G },
    {
      key: "angleBisectors" as const,
      list: geometry.angleBisectors,
      stroke: color.I,
    },
    {
      key: "perpendicularBisectors" as const,
      list: geometry.perpendicularBisectors,
      stroke: color.O,
    },
    { key: "altitudes" as const, list: geometry.altitudes, stroke: color.H },
  ];

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Move size={13} />
          {lang === "zh"
            ? "拖曳 A、B、C · 拖空白處平移"
            : "Drag A, B, C · drag background to pan"}
        </span>
        <div className="flex gap-1">
          {[
            {
              Icon: Plus,
              label: lang === "zh" ? "放大" : "Zoom in",
              action: () => zoom(0.8),
            },
            {
              Icon: Minus,
              label: lang === "zh" ? "縮小" : "Zoom out",
              action: () => zoom(1.25),
            },
            {
              Icon: Maximize2,
              label: lang === "zh" ? "適合圖形" : "Fit diagram",
              action: () => setViewport(fitViewport(fitPoints, frame)),
            },
          ].map(({ Icon, label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              title={label}
              aria-label={label}
              className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full block select-none"
        style={{
          touchAction: "none",
          cursor: gesture.current ? "grabbing" : "grab",
        }}
        aria-label={
          lang === "zh"
            ? "三角形四心平面圖。頂點支援拖曳與方向鍵移動。"
            : "Triangle centre diagram. Drag vertices or focus them and use arrow keys."
        }
        onPointerDown={event => begin(event, null)}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      >
        <title>
          {lang === "zh"
            ? "互動式三角形建構"
            : "Interactive triangle construction"}
        </title>
        <defs>
          <clipPath id={`clip-${id}`}>
            <rect x={LEFT} y={TOP} width={PW} height={PH} />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${id})`}>
          {xTicks.map(x => (
            <line
              key={`x${x}`}
              x1={xPixel(x)}
              x2={xPixel(x)}
              y1={TOP}
              y2={TOP + PH}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}
          {yTicks.map(y => (
            <line
              key={`y${y}`}
              x1={LEFT}
              x2={LEFT + PW}
              y1={yPixel(y)}
              y2={yPixel(y)}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}
          <line
            x1={xPixel(0)}
            x2={xPixel(0)}
            y1={TOP}
            y2={TOP + PH}
            stroke="#94a3b8"
            strokeWidth={1.4}
          />
          <line
            x1={LEFT}
            x2={LEFT + PW}
            y1={yPixel(0)}
            y2={yPixel(0)}
            stroke="#94a3b8"
            strokeWidth={1.4}
          />
          <path
            d={`${path([A, B, C])} Z`}
            fill="rgba(13,148,136,0.07)"
            stroke="var(--foreground)"
            strokeWidth={2.6}
          />
          {segments
            .filter(s => layers[s.key])
            .map(s => (
              <ConstructionPath
                key={s.key}
                animate={animateConstruction}
                segments={s.list.map(pair =>
                  pair.map(p => [px(p), py(p)] as [number, number])
                )}
                data-layer={s.key}
                fill="none"
                stroke={s.stroke}
                strokeWidth={2.3}
                strokeDasharray="9 6"
                opacity={0.82}
              />
            ))}
          {layers.incircle && (
            <ConstructionPath
              animate={animateConstruction}
              segments={[
                geometry.incircle.map(p => [px(p), py(p)] as [number, number]),
              ]}
              data-layer="incircle"
              fill="none"
              stroke={color.I}
              strokeWidth={2}
            />
          )}
          {layers.circumcircle && (
            <ConstructionPath
              animate={animateConstruction}
              segments={[
                geometry.circumcircle.map(
                  p => [px(p), py(p)] as [number, number]
                ),
              ]}
              data-layer="circumcircle"
              fill="none"
              stroke={color.O}
              strokeWidth={2}
            />
          )}
          {layers.eulerLine && geometry.eulerLine && (
            <ConstructionPath
              animate={animateConstruction}
              segments={[
                geometry.eulerLine.map(p => [px(p), py(p)] as [number, number]),
              ]}
              data-layer="eulerLine"
              stroke="#475569"
              strokeWidth={2.5}
              fill="none"
            />
          )}
          {points
            .filter(p => visibleCenters.includes(p.name))
            .map(p => (
              <g key={p.name} data-center={p.name}>
                <title>{`${lang === "zh" ? p.zh : p.en} ${p.name}: (${p.point.map(short).join(", ")})`}</title>
                <path
                  d={`M${px(p.point)},${py(p.point) - 6} l6,6 l-6,6 l-6,-6 Z`}
                  fill={color[p.name]}
                  stroke="white"
                  strokeWidth={1.5}
                />
                <text
                  x={px(p.point) + Math.max(9, 5 / displayScale)}
                  y={py(p.point) + Math.max(18, 11 / displayScale)}
                  fill={color[p.name]}
                  fontSize={Math.max(15, 11 / displayScale)}
                  fontWeight={700}
                  paintOrder="stroke"
                  stroke="var(--background)"
                  strokeWidth={3}
                >
                  {p.name}
                </text>
              </g>
            ))}
          {(["A", "B", "C"] as VertexName[]).map(name => {
            const point = { A, B, C }[name];
            return (
              <g key={name}>
                <circle
                  data-vertex={name}
                  cx={px(point)}
                  cy={py(point)}
                  r={Math.max(18, 22 / displayScale)}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${lang === "zh" ? "移動頂點" : "Move vertex"} ${name} (${point.map(short).join(", ")})`}
                  style={{
                    cursor: dragging === name ? "grabbing" : "grab",
                    outline: "none",
                  }}
                  onPointerDown={event => begin(event, name)}
                  onKeyDown={event => {
                    const delta = (
                      {
                        ArrowLeft: [-1, 0],
                        ArrowRight: [1, 0],
                        ArrowUp: [0, 1],
                        ArrowDown: [0, -1],
                      } as Record<string, [number, number]>
                    )[event.key];
                    if (!delta) return;
                    event.preventDefault();
                    const p = frame.project(point),
                      amount = event.shiftKey ? 1 : snap || 0.1;
                    const next = frame.unproject([
                      p[0] + delta[0] * amount,
                      p[1] + delta[1] * amount,
                    ]);
                    if (
                      isUsableTriangle(
                        name === "A" ? next : A,
                        name === "B" ? next : B,
                        name === "C" ? next : C
                      )
                    ) {
                      onDragState(true);
                      onVertexChange(name, next);
                      onDragState(false);
                      setInvalid(false);
                    } else setInvalid(true);
                  }}
                  className="focus:stroke-primary focus:stroke-2"
                >
                  <title>{`${name} (${point.map(short).join(", ")}) · ${lang === "zh" ? "拖曳或方向鍵移動" : "drag or use arrow keys"}`}</title>
                </circle>
                <circle
                  cx={px(point)}
                  cy={py(point)}
                  r={Math.max(dragging === name ? 9 : 7, 5 / displayScale)}
                  fill={color[name]}
                  stroke="white"
                  strokeWidth={2}
                  pointerEvents="none"
                />
                <text
                  x={px(point)}
                  y={py(point) - Math.max(14, 10 / displayScale)}
                  textAnchor="middle"
                  fill={color[name]}
                  fontSize={Math.max(16, 12 / displayScale)}
                  fontWeight={700}
                  pointerEvents="none"
                  paintOrder="stroke"
                  stroke="var(--background)"
                  strokeWidth={3}
                >
                  {name}
                </text>
              </g>
            );
          })}
        </g>
        {xTicks.map(x => (
          <text
            key={`xt${x}`}
            x={xPixel(x)}
            y={TOP + PH + 20}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize={Math.max(11, 8 / displayScale)}
          >
            {short(x)}
          </text>
        ))}
        {yTicks.map(y => (
          <text
            key={`yt${y}`}
            x={LEFT - 8}
            y={yPixel(y) + 4}
            textAnchor="end"
            fill="var(--muted-foreground)"
            fontSize={Math.max(11, 8 / displayScale)}
          >
            {short(y)}
          </text>
        ))}
        <text
          x={LEFT + PW}
          y={TOP + PH + 35}
          textAnchor="end"
          fill="var(--muted-foreground)"
          fontSize={12}
        >
          {frame.usesXY ? "x" : "u"}
        </text>
        <text
          x={LEFT - 15}
          y={TOP - 6}
          fill="var(--muted-foreground)"
          fontSize={12}
        >
          {frame.usesXY ? "y" : "v"}
        </text>
      </svg>
      <div
        className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground"
        role="status"
      >
        {invalid ? (
          <span className="text-destructive">
            {lang === "zh"
              ? "不能形成共線或過於扁平的三角形；請將頂點移開。"
              : "Collinear or nearly flat triangles are blocked. Move the vertex away."}
          </span>
        ) : frame.usesXY ? (
          lang === "zh" ? (
            "真實 x–y 坐標 · 頂點可用方向鍵微調"
          ) : (
            "Actual x–y coordinates · arrow keys adjust a focused vertex"
          )
        ) : lang === "zh" ? (
          "u–v 為三角形所在平面的正交坐標；拖曳固定在此平面。真實 xyz 同步到輸入框。"
        ) : (
          "u–v are orthonormal coordinates in the triangle plane. Dragging stays in this plane; actual xyz update in the inputs."
        )}
      </div>
    </div>
  );
}
