import { useMemo } from "react";
import {
  buildTriangleCenterGeometry,
  type Segment3,
} from "@/lib/triangleCenterGeometry";
import type { TriangleCenterResult, Vec3 } from "@/lib/vectorMath";
import type {
  CenterName,
  ConstructionLayers,
  VertexName,
} from "@/lib/triangleInteraction";
import TrianglePlanePlot from "./TrianglePlanePlot";
import Plot3DScene from "./Plot3DScene";

export type TriangleLayerVisibility = ConstructionLayers;
interface Props {
  A: Vec3;
  B: Vec3;
  C: Vec3;
  centers: TriangleCenterResult;
  lang: "zh" | "en";
  view: "2d" | "3d";
  layers: TriangleLayerVisibility;
  visibleCenters: CenterName[];
  revision: number;
  snap: number;
  animateConstruction?: boolean;
  onVertexChange: (vertex: VertexName, point: Vec3) => void;
  onDragState: (active: boolean) => void;
}
const colors = {
  medians: "#7c3aed",
  angleBisectors: "#b7791f",
  perpendicularBisectors: "#0891b2",
  altitudes: "#dc2626",
  incircle: "#b7791f",
  circumcircle: "#0891b2",
  eulerLine: "#475569",
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function traceSegments(segments: Segment3[], name: string, color: string): any {
  return {
    type: "scatter3d",
    mode: "lines",
    x: segments.flatMap(s => [s[0][0], s[1][0], null]),
    y: segments.flatMap(s => [s[0][1], s[1][1], null]),
    z: segments.flatMap(s => [s[0][2], s[1][2], null]),
    line: { color, width: 5, dash: "dash" },
    name,
    hoverinfo: "skip",
  };
}
function TriangleSpacePlot({
  A,
  B,
  C,
  centers,
  lang,
  layers,
  visibleCenters,
}: Props) {
  const data = useMemo(() => {
    const geometry = buildTriangleCenterGeometry(A, B, C, centers);
    const points = [A, B, C, A];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traces: any[] = [
      {
        type: "mesh3d",
        x: [A[0], B[0], C[0]],
        y: [A[1], B[1], C[1]],
        z: [A[2], B[2], C[2]],
        i: [0],
        j: [1],
        k: [2],
        opacity: 0.1,
        color: "#0d9488",
        hoverinfo: "skip",
        showlegend: false,
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: points.map(p => p[0]),
        y: points.map(p => p[1]),
        z: points.map(p => p[2]),
        line: { color: "#334155", width: 6 },
        name: "ABC",
        hoverinfo: "skip",
      },
    ];
    const labels = {
      medians: lang === "zh" ? "中線" : "Medians",
      angleBisectors: lang === "zh" ? "角平分線" : "Angle bisectors",
      perpendicularBisectors:
        lang === "zh" ? "垂直平分線" : "Perpendicular bisectors",
      altitudes: lang === "zh" ? "高線" : "Altitudes",
      incircle: lang === "zh" ? "內切圓" : "Incircle",
      circumcircle: lang === "zh" ? "外接圓" : "Circumcircle",
      eulerLine: lang === "zh" ? "Euler 線" : "Euler line",
    };
    (
      [
        "medians",
        "angleBisectors",
        "perpendicularBisectors",
        "altitudes",
      ] as const
    ).forEach(key => {
      if (layers[key])
        traces.push(traceSegments(geometry[key], labels[key], colors[key]));
    });
    (["incircle", "circumcircle"] as const).forEach(key => {
      if (layers[key])
        traces.push({
          type: "scatter3d",
          mode: "lines",
          x: geometry[key].map(p => p[0]),
          y: geometry[key].map(p => p[1]),
          z: geometry[key].map(p => p[2]),
          line: { color: colors[key], width: 4 },
          name: labels[key],
          hoverinfo: "skip",
        });
    });
    if (layers.eulerLine && geometry.eulerLine)
      traces.push(
        traceSegments([geometry.eulerLine], labels.eulerLine, colors.eulerLine)
      );
    const vertexPoints = [A, B, C];
    traces.push({
      type: "scatter3d",
      mode: "markers+text",
      x: vertexPoints.map(p => p[0]),
      y: vertexPoints.map(p => p[1]),
      z: vertexPoints.map(p => p[2]),
      text: ["A", "B", "C"],
      textposition: "top center",
      marker: { size: 6, color: ["#2563eb", "#dc2626", "#16a34a"] },
      name: lang === "zh" ? "頂點" : "Vertices",
      hovertemplate: "%{text}: ≈ (%{x:.3f}, %{y:.3f}, %{z:.3f})<extra></extra>",
    });
    const centerPoints = [
      { name: "G" as const, point: centers.centroid, color: colors.medians },
      { name: "I" as const, point: centers.incenter, color: colors.incircle },
      {
        name: "O" as const,
        point: centers.circumcenter,
        color: colors.circumcircle,
      },
      {
        name: "H" as const,
        point: centers.orthocenter,
        color: colors.altitudes,
      },
    ].filter(p => visibleCenters.includes(p.name));
    if (centerPoints.length)
      traces.push({
        type: "scatter3d",
        mode: "markers+text",
        x: centerPoints.map(p => p.point[0]),
        y: centerPoints.map(p => p.point[1]),
        z: centerPoints.map(p => p.point[2]),
        text: centerPoints.map(p => p.name),
        textposition: "bottom center",
        marker: {
          size: 7,
          symbol: "diamond",
          color: centerPoints.map(p => p.color),
        },
        name: lang === "zh" ? "四心" : "Centres",
        hovertemplate:
          "%{text}: ≈ (%{x:.3f}, %{y:.3f}, %{z:.3f})<extra></extra>",
      });
    return traces;
  }, [A, B, C, centers, lang, layers, visibleCenters]);
  const layout = useMemo(
    () => ({
      margin: { l: 0, r: 0, t: 55, b: 5 },
      legend: { orientation: "h", y: 1.1, font: { size: 10 } },
    }),
    []
  );
  return (
    <Plot3DScene
      data={data}
      layout={layout}
      lang={lang}
      name={lang === "zh" ? "三角形四心・三維" : "Triangle centres · 3D"}
      uirevision="triangle-space"
      height={450}
    />
  );
}
export default function TriangleCentersPlot(props: Props) {
  return props.view === "2d" ? (
    <TrianglePlanePlot {...props} />
  ) : (
    <TriangleSpacePlot {...props} />
  );
}
