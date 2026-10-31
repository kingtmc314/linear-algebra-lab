import { useEffect, useMemo, useRef } from "react";
import type { TriangleCenterResult, Vec3 } from "@/lib/vectorMath";
import { buildTriangleCenterGeometry, type Segment3 } from "@/lib/triangleCenterGeometry";

type CenterView = "2d" | "3d";

export interface TriangleLayerVisibility {
  medians: boolean;
  altitudes: boolean;
  perpendicularBisectors: boolean;
  angleBisectors: boolean;
  incircle: boolean;
  circumcircle: boolean;
  eulerLine: boolean;
}

interface TriangleCentersPlotProps {
  A: Vec3;
  B: Vec3;
  C: Vec3;
  centers: TriangleCenterResult;
  lang: "zh" | "en";
  view: CenterView;
  layers: TriangleLayerVisibility;
}

const COLORS = {
  triangle: "#334155",
  A: "#2563EB",
  B: "#DC2626",
  C: "#16A34A",
  G: "#7C3AED",
  I: "#D97706",
  O: "#0891B2",
  H: "#DC2626",
  medians: "#7C3AED",
  altitudes: "#DC2626",
  perpendicularBisectors: "#0891B2",
  angleBisectors: "#D97706",
  incircle: "#D97706",
  circumcircle: "#0891B2",
  eulerLine: "#475569",
};

function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(3));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function pointLabel(name: string, point: Vec3): string {
  return `${name} (${point.map(formatNumber).join(", ")})`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function segmentTrace2D(segments: Segment3[], project: (point: Vec3) => [number, number], name: string, color: string, dash: string): any {
  const x: Array<number | null> = [];
  const y: Array<number | null> = [];
  segments.forEach(([start, end]) => {
    const p = project(start);
    const q = project(end);
    x.push(p[0], q[0], null);
    y.push(p[1], q[1], null);
  });
  return {
    type: "scatter",
    mode: "lines",
    x,
    y,
    name,
    line: { color, width: 1.8, dash },
    hoverinfo: "skip",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function segmentTrace3D(segments: Segment3[], name: string, color: string, dash: string): any {
  const x: Array<number | null> = [];
  const y: Array<number | null> = [];
  const z: Array<number | null> = [];
  segments.forEach(([start, end]) => {
    x.push(start[0], end[0], null);
    y.push(start[1], end[1], null);
    z.push(start[2], end[2], null);
  });
  return {
    type: "scatter3d",
    mode: "lines",
    x,
    y,
    z,
    name,
    line: { color, width: 4, dash },
    hoverinfo: "skip",
  };
}

export default function TriangleCentersPlot({ A, B, C, centers, lang, view, layers }: TriangleCentersPlotProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const chart = useMemo(() => {
    const geometry = buildTriangleCenterGeometry(A, B, C, centers);
    const labels = {
      triangle: lang === "zh" ? "三角形 ABC" : "Triangle ABC",
      medians: lang === "zh" ? "中線" : "Medians",
      altitudes: lang === "zh" ? "高線" : "Altitudes",
      perpendicularBisectors: lang === "zh" ? "垂直平分線" : "Perpendicular bisectors",
      angleBisectors: lang === "zh" ? "角平分線" : "Angle bisectors",
      incircle: lang === "zh" ? "內切圓" : "Incircle",
      circumcircle: lang === "zh" ? "外接圓" : "Circumcircle",
      eulerLine: lang === "zh" ? "Euler 線" : "Euler line",
      vertices: lang === "zh" ? "頂點" : "Vertices",
      centers: lang === "zh" ? "四心" : "Triangle centers",
    };
    const centerPoints: Array<{ name: "G" | "I" | "O" | "H"; point: Vec3; color: string; meaning: string }> = [
      { name: "G", point: centers.centroid, color: COLORS.G, meaning: lang === "zh" ? "重心" : "Centroid" },
      { name: "I", point: centers.incenter, color: COLORS.I, meaning: lang === "zh" ? "內心" : "Incenter" },
      { name: "O", point: centers.circumcenter, color: COLORS.O, meaning: lang === "zh" ? "外心" : "Circumcenter" },
      { name: "H", point: centers.orthocenter, color: COLORS.H, meaning: lang === "zh" ? "垂心" : "Orthocenter" },
    ];

    if (view === "2d") {
      const trianglePoints = [A, B, C, A].map(geometry.project);
      const allProjected = [
        ...trianglePoints,
        ...centerPoints.map(({ point }) => geometry.project(point)),
        ...geometry.incircle.map(geometry.project),
        ...geometry.circumcircle.map(geometry.project),
      ];
      const xValues = allProjected.map(([x]) => x);
      const yValues = allProjected.map(([, y]) => y);
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      const span = Math.max(maxX - minX, maxY - minY, 1);
      const pad = span * 0.16 + 0.35;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = [
        {
          type: "scatter",
          mode: "lines",
          x: trianglePoints.map(([x]) => x),
          y: trianglePoints.map(([, y]) => y),
          fill: "toself",
          fillcolor: "rgba(51,65,85,0.05)",
          line: { color: COLORS.triangle, width: 2.5 },
          name: labels.triangle,
          hoverinfo: "skip",
        },
      ];

      if (layers.medians) data.push(segmentTrace2D(geometry.medians, geometry.project, labels.medians, COLORS.medians, "dash"));
      if (layers.altitudes) data.push(segmentTrace2D(geometry.altitudes, geometry.project, labels.altitudes, COLORS.altitudes, "dash"));
      if (layers.perpendicularBisectors) data.push(segmentTrace2D(geometry.perpendicularBisectors, geometry.project, labels.perpendicularBisectors, COLORS.perpendicularBisectors, "dot"));
      if (layers.angleBisectors) data.push(segmentTrace2D(geometry.angleBisectors, geometry.project, labels.angleBisectors, COLORS.angleBisectors, "dot"));

      if (layers.incircle) {
        const points = geometry.incircle.map(geometry.project);
        data.push({
          type: "scatter", mode: "lines", x: points.map(([x]) => x), y: points.map(([, y]) => y),
          name: labels.incircle, line: { color: COLORS.incircle, width: 2 }, hoverinfo: "skip",
        });
      }
      if (layers.circumcircle) {
        const points = geometry.circumcircle.map(geometry.project);
        data.push({
          type: "scatter", mode: "lines", x: points.map(([x]) => x), y: points.map(([, y]) => y),
          name: labels.circumcircle, line: { color: COLORS.circumcircle, width: 2 }, hoverinfo: "skip",
        });
      }
      if (layers.eulerLine && geometry.eulerLine) data.push(segmentTrace2D([geometry.eulerLine], geometry.project, labels.eulerLine, COLORS.eulerLine, "solid"));

      const vertexData = [
        { name: "A", point: A, color: COLORS.A },
        { name: "B", point: B, color: COLORS.B },
        { name: "C", point: C, color: COLORS.C },
      ];
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: vertexData.map(({ point }) => geometry.project(point)[0]),
        y: vertexData.map(({ point }) => geometry.project(point)[1]),
        text: vertexData.map(({ name }) => `<b>${name}</b>`),
        textposition: "top center",
        textfont: { size: 14, color: "#0F172A", family: "IBM Plex Serif, serif" },
        marker: { size: 11, color: vertexData.map(({ color }) => color), line: { color: "#FFFFFF", width: 1.5 } },
        name: labels.vertices,
        hovertemplate: vertexData.map(({ name, point }) => `<b>${name}</b><br>${pointLabel(name, point)}<extra></extra>`),
      });
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: centerPoints.map(({ point }) => geometry.project(point)[0]),
        y: centerPoints.map(({ point }) => geometry.project(point)[1]),
        text: centerPoints.map(({ name }) => `<b>${name}</b>`),
        textposition: "bottom center",
        textfont: { size: 14, color: "#0F172A", family: "IBM Plex Serif, serif" },
        marker: { size: 12, symbol: "diamond", color: centerPoints.map(({ color }) => color), line: { color: "#FFFFFF", width: 1.5 } },
        name: labels.centers,
        hovertemplate: centerPoints.map(({ name, point, meaning }) => `<b>${meaning} ${name}</b><br>${pointLabel(name, point)}<extra></extra>`),
      });

      return {
        data,
        layout: {
          margin: { l: 45, r: 20, t: 20, b: 45 },
          xaxis: { range: [minX - pad, maxX + pad], title: { text: "x" }, zeroline: true, gridcolor: "#E2E8F0", dtick: 1 },
          yaxis: { range: [minY - pad, maxY + pad], title: { text: "y" }, zeroline: true, gridcolor: "#E2E8F0", scaleanchor: "x", scaleratio: 1, dtick: 1 },
          dragmode: "pan",
        },
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = [
      {
        type: "mesh3d",
        x: [A[0], B[0], C[0]], y: [A[1], B[1], C[1]], z: [A[2], B[2], C[2]],
        i: [0], j: [1], k: [2], opacity: 0.12, color: COLORS.triangle,
        name: labels.triangle, hovertemplate: `${labels.triangle}<extra></extra>`,
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: [A[0], B[0], C[0], A[0]], y: [A[1], B[1], C[1], A[1]], z: [A[2], B[2], C[2], A[2]],
        line: { color: COLORS.triangle, width: 6 }, name: labels.triangle, showlegend: false, hoverinfo: "skip",
      },
    ];
    if (layers.medians) data.push(segmentTrace3D(geometry.medians, labels.medians, COLORS.medians, "dash"));
    if (layers.altitudes) data.push(segmentTrace3D(geometry.altitudes, labels.altitudes, COLORS.altitudes, "dash"));
    if (layers.perpendicularBisectors) data.push(segmentTrace3D(geometry.perpendicularBisectors, labels.perpendicularBisectors, COLORS.perpendicularBisectors, "dot"));
    if (layers.angleBisectors) data.push(segmentTrace3D(geometry.angleBisectors, labels.angleBisectors, COLORS.angleBisectors, "dot"));
    if (layers.incircle) data.push({
      type: "scatter3d", mode: "lines", x: geometry.incircle.map((point) => point[0]), y: geometry.incircle.map((point) => point[1]), z: geometry.incircle.map((point) => point[2]),
      name: labels.incircle, line: { color: COLORS.incircle, width: 4 }, hoverinfo: "skip",
    });
    if (layers.circumcircle) data.push({
      type: "scatter3d", mode: "lines", x: geometry.circumcircle.map((point) => point[0]), y: geometry.circumcircle.map((point) => point[1]), z: geometry.circumcircle.map((point) => point[2]),
      name: labels.circumcircle, line: { color: COLORS.circumcircle, width: 4 }, hoverinfo: "skip",
    });
    if (layers.eulerLine && geometry.eulerLine) data.push(segmentTrace3D([geometry.eulerLine], labels.eulerLine, COLORS.eulerLine, "solid"));

    const vertices = [
      { name: "A", point: A, color: COLORS.A },
      { name: "B", point: B, color: COLORS.B },
      { name: "C", point: C, color: COLORS.C },
    ];
    data.push({
      type: "scatter3d", mode: "markers+text",
      x: vertices.map(({ point }) => point[0]), y: vertices.map(({ point }) => point[1]), z: vertices.map(({ point }) => point[2]),
      text: vertices.map(({ name }) => `<b>${name}</b>`), textposition: "top center",
      marker: { size: 5, color: vertices.map(({ color }) => color) }, name: labels.vertices,
      hovertemplate: vertices.map(({ name, point }) => `<b>${name}</b><br>${pointLabel(name, point)}<extra></extra>`),
    });
    data.push({
      type: "scatter3d", mode: "markers+text",
      x: centerPoints.map(({ point }) => point[0]), y: centerPoints.map(({ point }) => point[1]), z: centerPoints.map(({ point }) => point[2]),
      text: centerPoints.map(({ name }) => `<b>${name}</b>`), textposition: "bottom center",
      marker: { size: 6, symbol: "diamond", color: centerPoints.map(({ color }) => color) }, name: labels.centers,
      hovertemplate: centerPoints.map(({ name, point, meaning }) => `<b>${meaning} ${name}</b><br>${pointLabel(name, point)}<extra></extra>`),
    });

    return {
      data,
      layout: {
        margin: { l: 0, r: 0, t: 20, b: 0 },
        scene: {
          xaxis: { title: "x", gridcolor: "#E2E8F0", zerolinecolor: "#94A3B8" },
          yaxis: { title: "y", gridcolor: "#E2E8F0", zerolinecolor: "#94A3B8" },
          zaxis: { title: "z", gridcolor: "#E2E8F0", zerolinecolor: "#94A3B8" },
          aspectmode: "data",
        },
      },
    };
  }, [A, B, C, centers, lang, layers, view]);

  useEffect(() => {
    if (!divRef.current) return;
    const isDark = document.documentElement.classList.contains("dark");
    const background = isDark ? "#111827" : "#F8FAFC";
    const fontColor = isDark ? "#E2E8F0" : "#334155";
    const layout = {
      ...chart.layout,
      paper_bgcolor: background,
      plot_bgcolor: background,
      showlegend: true,
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "left",
        x: 0,
        font: { family: "IBM Plex Mono, monospace", size: 10, color: fontColor },
        bgcolor: "rgba(0,0,0,0)",
      },
      font: { color: fontColor, family: "IBM Plex Sans, sans-serif" },
    };
    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      scrollZoom: true,
      modeBarButtonsToRemove: view === "2d" ? ["lasso2d", "select2d", "autoScale2d"] : [],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("plotly.js-dist-min").then((Plotly: any) => Plotly.react(divRef.current!, chart.data, layout, config));
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import("plotly.js-dist-min").then((Plotly: any) => {
        if (divRef.current) Plotly.purge(divRef.current);
      });
    };
  }, [chart, view]);

  return <div ref={divRef} className="w-full overflow-hidden rounded-lg border border-border" style={{ height: 480 }} />;
}
