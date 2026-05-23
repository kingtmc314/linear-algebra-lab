// VectorPlot2D — Interactive 2D vector visualization using Plotly.js
// Shows vectors as arrows with parallelogram for addition/subtraction,
// angle arc for dot product, and proper GeoGebra-style labeling.
import { useEffect, useRef, useMemo } from "react";

interface Vec2D {
  x: number;
  y: number;
  color: string;
  label: string;
}

interface VectorPlot2DProps {
  vectors: Vec2D[];
  op?: string; // "add" | "sub" | "dot" | "angle" | "normalize" | "mag" | "projection"
  lang?: "zh" | "en";
  projVector?: number[];
  perpVector?: number[];
}

function fmt(n: number): string {
  const r = parseFloat(n.toFixed(3));
  return Number.isInteger(r) ? String(r) : r.toString();
}

export default function VectorPlot2D({ vectors, op = "add", lang = "zh", projVector, perpVector }: VectorPlot2DProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const vecA = vectors.find((v) => v.label === "a");
  const vecB = vectors.find((v) => v.label === "b");
  const vecR = vectors.find((v) => v.label === "result");

  const { plotData, annotations, axisRange } = useMemo(() => {
    const allVecs = [vecA, vecB, vecR].filter(Boolean) as Vec2D[];
    const maxCoord = Math.max(
      1,
      ...allVecs.flatMap((v) => [Math.abs(v.x), Math.abs(v.y)]),
      ...(projVector ? [Math.abs(projVector[0] ?? 0), Math.abs(projVector[1] ?? 0)] : []),
    );
    const pad = maxCoord * 0.35 + 1;
    const range: [number, number] = [-(maxCoord + pad), maxCoord + pad];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anns: any[] = [];

    // ── Parallelogram for add/sub ──────────────────────────────────────────
    if ((op === "add" || op === "sub") && vecA && vecB) {
      const bx = op === "sub" ? -vecB.x : vecB.x;
      const by = op === "sub" ? -vecB.y : vecB.y;
      data.push({
        type: "scatter",
        mode: "lines",
        x: [0, vecA.x, vecA.x + bx, bx, 0],
        y: [0, vecA.y, vecA.y + by, by, 0],
        fill: "toself",
        fillcolor: "rgba(99,102,241,0.08)",
        line: { color: "rgba(99,102,241,0.3)", width: 1, dash: "dot" },
        hoverinfo: "skip",
        showlegend: false,
        name: "",
      });

      // Tip-to-tail: draw b starting from tip of a (dashed)
      anns.push({
        x: vecA.x + bx,
        y: vecA.y + by,
        ax: vecA.x,
        ay: vecA.y,
        xref: "x",
        yref: "y",
        axref: "x",
        ayref: "y",
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1.2,
        arrowwidth: 1.8,
        arrowcolor: "#DC262688",
        text: "",
      });
    }

    // ── Angle arc for dot/angle ────────────────────────────────────────────
    if ((op === "dot" || op === "angle") && vecA && vecB) {
      const magA = Math.sqrt(vecA.x ** 2 + vecA.y ** 2);
      const magB = Math.sqrt(vecB.x ** 2 + vecB.y ** 2);
      if (magA > 0 && magB > 0) {
        const angleA = Math.atan2(vecA.y, vecA.x);
        const angleB = Math.atan2(vecB.y, vecB.x);
        let diff = angleB - angleA;
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;
        const arcR = Math.min(magA, magB) * 0.28;
        const steps = 40;
        const arcX: number[] = [];
        const arcY: number[] = [];
        for (let i = 0; i <= steps; i++) {
          const theta = angleA + (diff * i) / steps;
          arcX.push(arcR * Math.cos(theta));
          arcY.push(arcR * Math.sin(theta));
        }
        data.push({
          type: "scatter",
          mode: "lines",
          x: arcX,
          y: arcY,
          line: { color: "#7C3AED", width: 1.5 },
          hoverinfo: "skip",
          showlegend: false,
          name: "",
        });

        // Angle label
        const midTheta = angleA + diff / 2;
        const dot = vecA.x * vecB.x + vecA.y * vecB.y;
        const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magB)));
        const angleDeg = (Math.acos(cosTheta) * 180) / Math.PI;
        data.push({
          type: "scatter",
          mode: "text",
          x: [arcR * 1.7 * Math.cos(midTheta)],
          y: [arcR * 1.7 * Math.sin(midTheta)],
          text: [`θ=${fmt(angleDeg)}°`],
          textfont: { color: "#7C3AED", size: 11, family: "IBM Plex Mono, monospace" },
          hoverinfo: "skip",
          showlegend: false,
          name: "",
        });
      }
    }

    // ── Projection visualization ───────────────────────────────────────────
    if (op === "projection" && vecA && vecB && projVector && perpVector) {
      const px = projVector[0], py = projVector[1];
      const bMag = Math.sqrt(vecB.x ** 2 + vecB.y ** 2);
      if (bMag > 0) {
        // Projection vector arrow (green, from origin to proj foot)
        anns.push({
          x: px, y: py, ax: 0, ay: 0,
          xref: "x", yref: "y", axref: "x", ayref: "y",
          showarrow: true, arrowhead: 2, arrowsize: 1.3, arrowwidth: 2.2,
          arrowcolor: "#16A34A", text: "",
        });
        // Perpendicular drop line: from tip of a to foot of projection
        data.push({
          type: "scatter", mode: "lines",
          x: [vecA.x, px], y: [vecA.y, py],
          line: { color: "#F59E0B", width: 1.8, dash: "dash" },
          hoverinfo: "text",
          hovertext: lang === "zh" ? "垂直分量 a⊥" : "Perpendicular component a⊥",
          showlegend: true,
          name: lang === "zh" ? "垂直線 a⊥" : "Perp. line a⊥",
        });
        // Right angle marker at foot of projection
        const bUx = vecB.x / bMag, bUy = vecB.y / bMag;
        const perpUx = -bUy, perpUy = bUx;
        const sqSize = Math.min(maxCoord * 0.06, 0.3);
        const sq = [
          [px + perpUx * sqSize, py + perpUy * sqSize],
          [px + perpUx * sqSize + bUx * sqSize, py + perpUy * sqSize + bUy * sqSize],
          [px + bUx * sqSize, py + bUy * sqSize],
        ];
        data.push({
          type: "scatter", mode: "lines",
          x: sq.map((p) => p[0]), y: sq.map((p) => p[1]),
          line: { color: "#F59E0B", width: 1.2 },
          hoverinfo: "skip", showlegend: false, name: "",
        });
        // Label: proj_b(a)
        data.push({
          type: "scatter", mode: "text",
          x: [px * 0.5], y: [py * 0.5],
          text: [`<b>proj<sub>b</sub>a</b>`],
          textfont: { color: "#16A34A", size: 11, family: "IBM Plex Serif, serif" },
          hoverinfo: "skip", showlegend: false, name: "",
        });
        // Label: a⊥
        data.push({
          type: "scatter", mode: "text",
          x: [(vecA.x + px) / 2 + perpUx * 0.3],
          y: [(vecA.y + py) / 2 + perpUy * 0.3],
          text: [`<b>a⊥</b>`],
          textfont: { color: "#F59E0B", size: 11, family: "IBM Plex Serif, serif" },
          hoverinfo: "skip", showlegend: false, name: "",
        });
      }
    }

    // ── Arrow annotations for main vectors ────────────────────────────────
    allVecs.forEach((v) => {
      if (v.x === 0 && v.y === 0) return;
      anns.push({
        x: v.x,
        y: v.y,
        ax: 0,
        ay: 0,
        xref: "x",
        yref: "y",
        axref: "x",
        ayref: "y",
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1.4,
        arrowwidth: 2.5,
        arrowcolor: v.color,
        text: "",
      });
    });

    // ── Hover-able scatter points for each vector ──────────────────────────
    allVecs.forEach((v) => {
      if (v.x === 0 && v.y === 0) return;
      const labelName =
        v.label === "a"
          ? lang === "zh" ? "向量 a" : "Vector a"
          : v.label === "b"
          ? lang === "zh" ? "向量 b" : "Vector b"
          : lang === "zh" ? "結果向量" : "Result";
      const mag = Math.sqrt(v.x ** 2 + v.y ** 2);
      data.push({
        type: "scatter",
        mode: "markers+text",
        x: [v.x * 0.55],
        y: [v.y * 0.55],
        marker: { size: 0, opacity: 0, color: v.color },
        text: [`<b>${v.label === "result" ? "r" : v.label}</b>`],
        textposition: v.y >= 0 ? "top center" : "bottom center",
        textfont: { color: v.color, size: 13, family: "IBM Plex Serif, serif" },
        hovertemplate: `<b>${labelName}</b><br>x: ${fmt(v.x)}<br>y: ${fmt(v.y)}<br>|v|: ${fmt(mag)}<extra></extra>`,
        showlegend: true,
        name: labelName,
        legendgroup: v.label,
      });

      // Coordinate label at tip
      data.push({
        type: "scatter",
        mode: "text",
        x: [v.x],
        y: [v.y],
        text: [`(${fmt(v.x)}, ${fmt(v.y)})`],
        textposition: v.y >= 0 ? "top right" : "bottom right",
        textfont: { color: v.color, size: 9, family: "IBM Plex Mono, monospace" },
        hoverinfo: "skip",
        showlegend: false,
        name: "",
      });
    });

    return { plotData: data, annotations: anns, axisRange: range };
  }, [vectors, op, lang, vecA, vecB, vecR, projVector, perpVector]);

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
        zeroline: true,
        zerolinecolor: axisColor,
        zerolinewidth: 1.5,
        gridcolor: gridColor,
        gridwidth: 0.5,
        tickfont: { family: "IBM Plex Mono, monospace", size: 10, color: fontColor },
        title: { text: "x", font: { color: fontColor, size: 12 } },
        showgrid: true,
        dtick: 1,
      },
      yaxis: {
        range: axisRange,
        zeroline: true,
        zerolinecolor: axisColor,
        zerolinewidth: 1.5,
        gridcolor: gridColor,
        gridwidth: 0.5,
        tickfont: { family: "IBM Plex Mono, monospace", size: 10, color: fontColor },
        title: { text: "y", font: { color: fontColor, size: 12 } },
        showgrid: true,
        scaleanchor: "x",
        scaleratio: 1,
        dtick: 1,
      },
      showlegend: true,
      legend: {
        x: 0.01,
        y: 0.99,
        bgcolor: isDark ? "rgba(26,26,46,0.8)" : "rgba(247,248,252,0.8)",
        bordercolor: gridColor,
        borderwidth: 1,
        font: { family: "IBM Plex Mono, monospace", size: 10, color: fontColor },
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
      style={{ height: 360 }}
    />
  );
}
