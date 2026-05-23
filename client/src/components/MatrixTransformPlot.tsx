// MatrixTransformPlot — Interactive 2D matrix geometric transformation visualization
// Shows how a 2×2 matrix transforms the unit square, standard basis vectors,
// and optionally a custom polygon (circle, triangle, etc.)
// Uses Plotly.js for interactivity.
import { useEffect, useRef, useMemo } from "react";

interface MatrixTransformPlotProps {
  matrix: number[][];  // 2×2 matrix
  lang?: "zh" | "en";
}

function applyMatrix(m: number[][], v: [number, number]): [number, number] {
  return [
    m[0][0] * v[0] + m[0][1] * v[1],
    m[1][0] * v[0] + m[1][1] * v[1],
  ];
}

function fmt(n: number): string {
  const r = parseFloat(n.toFixed(3));
  return Number.isInteger(r) ? String(r) : r.toString();
}

export default function MatrixTransformPlot({ matrix, lang = "zh" }: MatrixTransformPlotProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const { plotData, annotations, axisRange } = useMemo(() => {
    const m = matrix;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anns: any[] = [];

    // ── Unit square: corners [0,0],[1,0],[1,1],[0,1] ──────────────────────
    const squareCorners: [number, number][] = [[0,0],[1,0],[1,1],[0,1],[0,0]];
    const transformedCorners = squareCorners.map(v => applyMatrix(m, v));

    // Original unit square (dashed gray)
    data.push({
      type: "scatter", mode: "lines",
      x: squareCorners.map(v => v[0]),
      y: squareCorners.map(v => v[1]),
      fill: "toself",
      fillcolor: "rgba(156,163,175,0.12)",
      line: { color: "#9CA3AF", width: 1.5, dash: "dot" },
      hoverinfo: "skip",
      showlegend: true,
      name: lang === "zh" ? "原始單位正方形" : "Original unit square",
    });

    // Transformed square (solid indigo)
    data.push({
      type: "scatter", mode: "lines",
      x: transformedCorners.map(v => v[0]),
      y: transformedCorners.map(v => v[1]),
      fill: "toself",
      fillcolor: "rgba(99,102,241,0.15)",
      line: { color: "#6366F1", width: 2 },
      hoverinfo: "skip",
      showlegend: true,
      name: lang === "zh" ? "變換後正方形" : "Transformed square",
    });

    // ── Unit circle (16 points) ────────────────────────────────────────────
    const circlePoints: [number, number][] = [];
    for (let i = 0; i <= 32; i++) {
      const theta = (2 * Math.PI * i) / 32;
      circlePoints.push([Math.cos(theta), Math.sin(theta)]);
    }
    const transformedCircle = circlePoints.map(v => applyMatrix(m, v));

    // Original circle (dashed blue)
    data.push({
      type: "scatter", mode: "lines",
      x: circlePoints.map(v => v[0]),
      y: circlePoints.map(v => v[1]),
      line: { color: "#93C5FD", width: 1, dash: "dot" },
      hoverinfo: "skip",
      showlegend: true,
      name: lang === "zh" ? "原始單位圓" : "Original unit circle",
    });

    // Transformed circle (solid blue)
    data.push({
      type: "scatter", mode: "lines",
      x: transformedCircle.map(v => v[0]),
      y: transformedCircle.map(v => v[1]),
      fill: "toself",
      fillcolor: "rgba(37,99,235,0.08)",
      line: { color: "#2563EB", width: 1.5 },
      hoverinfo: "skip",
      showlegend: true,
      name: lang === "zh" ? "變換後橢圓" : "Transformed ellipse",
    });

    // ── Standard basis vectors e1=[1,0], e2=[0,1] ─────────────────────────
    const e1: [number, number] = [1, 0];
    const e2: [number, number] = [0, 1];
    const te1 = applyMatrix(m, e1);
    const te2 = applyMatrix(m, e2);

    // Original e1 (gray dashed arrow annotation)
    anns.push({
      x: e1[0], y: e1[1], ax: 0, ay: 0,
      xref: "x", yref: "y", axref: "x", ayref: "y",
      showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 1.5,
      arrowcolor: "#9CA3AF", text: "",
    });
    anns.push({
      x: e2[0], y: e2[1], ax: 0, ay: 0,
      xref: "x", yref: "y", axref: "x", ayref: "y",
      showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 1.5,
      arrowcolor: "#9CA3AF", text: "",
    });

    // Transformed e1 (red arrow)
    anns.push({
      x: te1[0], y: te1[1], ax: 0, ay: 0,
      xref: "x", yref: "y", axref: "x", ayref: "y",
      showarrow: true, arrowhead: 2, arrowsize: 1.4, arrowwidth: 2.5,
      arrowcolor: "#DC2626", text: "",
    });
    // Transformed e2 (green arrow)
    anns.push({
      x: te2[0], y: te2[1], ax: 0, ay: 0,
      xref: "x", yref: "y", axref: "x", ayref: "y",
      showarrow: true, arrowhead: 2, arrowsize: 1.4, arrowwidth: 2.5,
      arrowcolor: "#16A34A", text: "",
    });

    // Hover markers for transformed basis vectors
    data.push({
      type: "scatter", mode: "markers+text",
      x: [te1[0]], y: [te1[1]],
      marker: { size: 8, color: "#DC2626", symbol: "circle" },
      text: [`<b>Ae₁=(${fmt(te1[0])},${fmt(te1[1])})</b>`],
      textposition: te1[1] >= 0 ? "top right" : "bottom right",
      textfont: { color: "#DC2626", size: 10, family: "IBM Plex Mono, monospace" },
      hovertemplate: `<b>Ae₁</b><br>x: ${fmt(te1[0])}<br>y: ${fmt(te1[1])}<extra></extra>`,
      showlegend: true,
      name: "Ae₁ " + (lang === "zh" ? "（第一列）" : "(col 1)"),
    });
    data.push({
      type: "scatter", mode: "markers+text",
      x: [te2[0]], y: [te2[1]],
      marker: { size: 8, color: "#16A34A", symbol: "circle" },
      text: [`<b>Ae₂=(${fmt(te2[0])},${fmt(te2[1])})</b>`],
      textposition: te2[1] >= 0 ? "top right" : "bottom right",
      textfont: { color: "#16A34A", size: 10, family: "IBM Plex Mono, monospace" },
      hovertemplate: `<b>Ae₂</b><br>x: ${fmt(te2[0])}<br>y: ${fmt(te2[1])}<extra></extra>`,
      showlegend: true,
      name: "Ae₂ " + (lang === "zh" ? "（第二列）" : "(col 2)"),
    });

    // ── Compute determinant for area annotation ────────────────────────────
    const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    const centerX = (transformedCorners[0][0] + transformedCorners[1][0] + transformedCorners[2][0] + transformedCorners[3][0]) / 4;
    const centerY = (transformedCorners[0][1] + transformedCorners[1][1] + transformedCorners[2][1] + transformedCorners[3][1]) / 4;
    anns.push({
      x: centerX, y: centerY,
      xref: "x", yref: "y",
      text: `<b>det = ${fmt(det)}</b>`,
      showarrow: false,
      font: { color: "#6366F1", size: 11, family: "IBM Plex Mono, monospace" },
      bgcolor: "rgba(99,102,241,0.12)",
      bordercolor: "#6366F1",
      borderwidth: 1,
      borderpad: 3,
    });

    // ── Axis range ─────────────────────────────────────────────────────────
    const allPoints = [...squareCorners, ...transformedCorners, te1, te2];
    const maxCoord = Math.max(1.5, ...allPoints.flatMap(v => [Math.abs(v[0]), Math.abs(v[1])]));
    const pad = maxCoord * 0.3 + 0.5;
    const range: [number, number] = [-(maxCoord + pad), maxCoord + pad];

    return { plotData: data, annotations: anns, axisRange: range };
  }, [matrix, lang]);

  useEffect(() => {
    if (!divRef.current) return;
    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#1a1a2e" : "#F7F8FC";
    const gridColor = isDark ? "#2d2d4e" : "#E5E7EB";
    const axisColor = isDark ? "#6B7280" : "#9CA3AF";
    const fontColor = isDark ? "#D1D5DB" : "#374151";

    const layout = {
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      margin: { l: 40, r: 20, t: 20, b: 40 },
      xaxis: {
        range: axisRange,
        zeroline: true, zerolinecolor: axisColor, zerolinewidth: 1.5,
        gridcolor: gridColor, gridwidth: 0.5,
        tickfont: { family: "IBM Plex Mono, monospace", size: 10, color: fontColor },
        title: { text: "x", font: { color: fontColor, size: 12 } },
        showgrid: true, dtick: 1,
      },
      yaxis: {
        range: axisRange,
        zeroline: true, zerolinecolor: axisColor, zerolinewidth: 1.5,
        gridcolor: gridColor, gridwidth: 0.5,
        tickfont: { family: "IBM Plex Mono, monospace", size: 10, color: fontColor },
        title: { text: "y", font: { color: fontColor, size: 12 } },
        showgrid: true, scaleanchor: "x", scaleratio: 1, dtick: 1,
      },
      showlegend: true,
      legend: {
        x: 0.01, y: 0.99,
        bgcolor: isDark ? "rgba(26,26,46,0.8)" : "rgba(247,248,252,0.8)",
        bordercolor: gridColor, borderwidth: 1,
        font: { family: "IBM Plex Mono, monospace", size: 9, color: fontColor },
      },
      annotations,
      dragmode: "pan",
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
      displaylogo: false,
      scrollZoom: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("plotly.js-dist-min").then((Plotly: any) => {
      Plotly.react(divRef.current!, plotData, layout, config);
    });

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import("plotly.js-dist-min").then((Plotly: any) => {
        if (divRef.current) Plotly.purge(divRef.current);
      });
    };
  }, [plotData, annotations, axisRange]);

  return (
    <div
      ref={divRef}
      className="w-full rounded-lg border border-border overflow-hidden"
      style={{ height: 380 }}
    />
  );
}
