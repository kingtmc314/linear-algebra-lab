// VectorPlot3D — Interactive 3D vector visualization using Plotly.js
// Shows vectors as 3D arrows, parallelogram for cross product,
// and right-hand rule indicator. Fully rotatable/zoomable.
import { useMemo } from "react";
import Plot3DScene from "./Plot3DScene";

interface Vec3D {
  x: number;
  y: number;
  z: number;
  color: string;
  label: string;
}

interface VectorPlot3DProps {
  vectors: Vec3D[];
  op?: string; // "add" | "sub" | "cross" | "dot" | "angle" | "normalize" | "mag" | "projection"
  lang?: "zh" | "en";
  projVector?: number[];
  perpVector?: number[];
  /** 0: inputs; 1: construction plane/tip-to-tail; 2: complete result. */
  constructionStage?: number;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : `≈ ${parseFloat(n.toFixed(3))}`;
}

function magnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
}

// Build a 3D arrow: shaft (scatter3d line) + cone (mesh3d)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildArrow(
  ox: number,
  oy: number,
  oz: number,
  ex: number,
  ey: number,
  ez: number,
  color: string,
  shaftFrac = 0.82,
  coneRadiusFrac = 0.07
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const dx = ex - ox,
    dy = ey - oy,
    dz = ez - oz;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-9) return [];

  const shaftEnd = {
    x: ox + dx * shaftFrac,
    y: oy + dy * shaftFrac,
    z: oz + dz * shaftFrac,
  };

  const shaft = {
    type: "scatter3d",
    mode: "lines",
    x: [ox, shaftEnd.x],
    y: [oy, shaftEnd.y],
    z: [oz, shaftEnd.z],
    line: { color, width: 5 },
    hoverinfo: "skip",
    showlegend: false,
    name: "",
  };

  // Cone geometry
  const ux = dx / len,
    uy = dy / len,
    uz = dz / len;
  let perpX = 0,
    perpY = 0,
    perpZ = 0;
  if (Math.abs(ux) < 0.9) {
    perpX = 0;
    perpY = -uz;
    perpZ = uy;
  } else {
    perpX = uz;
    perpY = 0;
    perpZ = -ux;
  }
  const pLen = Math.sqrt(perpX ** 2 + perpY ** 2 + perpZ ** 2);
  perpX /= pLen;
  perpY /= pLen;
  perpZ /= pLen;
  const perp2X = uy * perpZ - uz * perpY;
  const perp2Y = uz * perpX - ux * perpZ;
  const perp2Z = ux * perpY - uy * perpX;

  const r = coneRadiusFrac * len;
  const numSides = 12;
  const baseX: number[] = [],
    baseY: number[] = [],
    baseZ: number[] = [];
  for (let i = 0; i < numSides; i++) {
    const theta = (2 * Math.PI * i) / numSides;
    baseX.push(
      shaftEnd.x + r * (Math.cos(theta) * perpX + Math.sin(theta) * perp2X)
    );
    baseY.push(
      shaftEnd.y + r * (Math.cos(theta) * perpY + Math.sin(theta) * perp2Y)
    );
    baseZ.push(
      shaftEnd.z + r * (Math.cos(theta) * perpZ + Math.sin(theta) * perp2Z)
    );
  }

  const coneX = [...baseX, ex];
  const coneY = [...baseY, ey];
  const coneZ = [...baseZ, ez];
  const tipIdx = numSides;
  const iArr: number[] = [],
    jArr: number[] = [],
    kArr: number[] = [];
  for (let i = 0; i < numSides; i++) {
    iArr.push(i);
    jArr.push((i + 1) % numSides);
    kArr.push(tipIdx);
  }

  const cone = {
    type: "mesh3d",
    x: coneX,
    y: coneY,
    z: coneZ,
    i: iArr,
    j: jArr,
    k: kArr,
    color,
    opacity: 1,
    hoverinfo: "skip",
    showlegend: false,
    name: "",
    flatshading: true,
    lighting: { ambient: 0.9, diffuse: 0.5 },
  };

  return [shaft, cone];
}

/** Pure construction builder, shared by rendering and regression tests. */
export function buildVectorPlot3DData({
  vectors,
  op = "add",
  lang = "zh",
  projVector,
  perpVector,
  constructionStage = 2,
}: VectorPlot3DProps): {
  plotData: any[];
  annotations3d: any[];
  boundsData: any[];
} {
  const vecA = vectors.find(v => v.label === "a");
  const vecB = vectors.find(v => v.label === "b");
  const vecR = vectors.find(v => v.label === "r");

  const stage = Number.isFinite(constructionStage)
    ? Math.min(2, Math.max(0, constructionStage))
    : 2;
  const allVecs = vectors.filter(v => [v.x, v.y, v.z].every(Number.isFinite));
  const maxCoord = Math.max(
    1,
    ...allVecs.flatMap(v => [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)]),
    ...(projVector
      ? [
          Math.abs(projVector[0] ?? 0),
          Math.abs(projVector[1] ?? 0),
          Math.abs(projVector[2] ?? 0),
        ]
      : [])
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anns: any[] = [];

  // ── Parallelogram for cross product ───────────────────────────────────
  if (op === "cross" && vecA && vecB) {
    // Filled surface
    data.push({
      type: "mesh3d",
      x: [0, vecA.x, vecA.x + vecB.x, vecB.x],
      y: [0, vecA.y, vecA.y + vecB.y, vecB.y],
      z: [0, vecA.z, vecA.z + vecB.z, vecB.z],
      i: [0, 0],
      j: [1, 2],
      k: [2, 3],
      color: "#6366F1",
      opacity: 0.18,
      hoverinfo: "skip",
      showlegend: false,
      name: "",
      flatshading: true,
    });
    // Outline
    data.push({
      type: "scatter3d",
      mode: "lines",
      x: [0, vecA.x, vecA.x + vecB.x, vecB.x, 0],
      y: [0, vecA.y, vecA.y + vecB.y, vecB.y, 0],
      z: [0, vecA.z, vecA.z + vecB.z, vecB.z, 0],
      line: { color: "#6366F1", width: 4, dash: "dash" },
      hoverinfo: "skip",
      showlegend: false,
      name: "",
    });

    // Exact area is shown in the external calculation, not rounded inside Plotly.
  }
  // The plane spanned by the input vectors helps explain a dot product/angle.
  if ((op === "angle" || op === "dot" || op === "projection") && vecA && vecB) {
    data.push({
      type: "mesh3d",
      x: [0, vecA.x, vecB.x],
      y: [0, vecA.y, vecB.y],
      z: [0, vecA.z, vecB.z],
      i: [0],
      j: [1],
      k: [2],
      color: "#6366F1",
      opacity: 0.12,
      hoverinfo: "skip",
      showlegend: false,
    });
  }
  const planeEnd = data.length;

  // ── Projection visualization (3D) ────────────────────────────────────
  if (op === "projection" && vecA && vecB && projVector && perpVector) {
    const px = projVector[0] ?? 0,
      py = projVector[1] ?? 0,
      pz = projVector[2] ?? 0;
    const bMag = Math.sqrt(vecB.x ** 2 + vecB.y ** 2 + vecB.z ** 2);
    if (bMag > 0) {
      // Projection vector (green arrow from origin to foot)
      data.push(...buildArrow(0, 0, 0, px, py, pz, "#16A34A"));
      // Perpendicular drop line (amber dashed)
      data.push({
        type: "scatter3d",
        mode: "lines",
        x: [vecA.x, px],
        y: [vecA.y, py],
        z: [vecA.z, pz],
        line: { color: "#F59E0B", width: 5, dash: "dash" },
        hoverinfo: "text",
        hovertext: lang === "zh" ? "垂直分量 a⊥" : "Perpendicular component a⊥",
        showlegend: true,
        name: lang === "zh" ? "垂直線 a⊥" : "Perp. line a⊥",
      });
      // Right angle marker at foot
      const bUx = vecB.x / bMag,
        bUy = vecB.y / bMag,
        bUz = vecB.z / bMag;
      const dLen = Math.sqrt(
        (vecA.x - px) ** 2 + (vecA.y - py) ** 2 + (vecA.z - pz) ** 2
      );
      if (dLen > 1e-6) {
        const dUx = (vecA.x - px) / dLen,
          dUy = (vecA.y - py) / dLen,
          dUz = (vecA.z - pz) / dLen;
        const sqS = Math.min(maxCoord * 0.06, 0.25);
        data.push({
          type: "scatter3d",
          mode: "lines",
          x: [px + dUx * sqS, px + dUx * sqS + bUx * sqS, px + bUx * sqS],
          y: [py + dUy * sqS, py + dUy * sqS + bUy * sqS, py + bUy * sqS],
          z: [pz + dUz * sqS, pz + dUz * sqS + bUz * sqS, pz + bUz * sqS],
          line: { color: "#F59E0B", width: 4 },
          hoverinfo: "skip",
          showlegend: false,
          name: "",
        });
      }
      // Labels
      if (stage >= 2)
        anns.push({
          x: px * 0.5,
          y: py * 0.5,
          z: pz * 0.5,
          text: `<b>proj<sub>b</sub>a</b>`,
          showarrow: false,
          font: { color: "#16A34A", size: 11, family: "IBM Plex Serif, serif" },
          bgcolor: "rgba(22,163,74,0.08)",
        });
    }
  }
  const projectionEnd = data.length;

  // ── Tip-to-tail for add/sub ────────────────────────────────────────────
  if ((op === "add" || op === "sub") && vecA && vecB) {
    const bx = op === "sub" ? -vecB.x : vecB.x;
    const by = op === "sub" ? -vecB.y : vecB.y;
    const bz = op === "sub" ? -vecB.z : vecB.z;
    data.push({
      type: "scatter3d",
      mode: "lines",
      x: [vecA.x, vecA.x + bx],
      y: [vecA.y, vecA.y + by],
      z: [vecA.z, vecA.z + bz],
      line: { color: "#DC2626", width: 5, dash: "dash" },
      hoverinfo: "skip",
      showlegend: false,
      name: "",
    });
  }
  const constructionEnd = data.length;

  // Scene axes are owned by Plot3DScene so its axes toggle hides them all.

  // Origin marker
  data.push({
    type: "scatter3d",
    mode: "markers+text",
    x: [0],
    y: [0],
    z: [0],
    marker: { size: 4, color: "#6B7280" },
    text: ["O"],
    textposition: "bottom right",
    textfont: { color: "#9CA3AF", size: 10 },
    hoverinfo: "skip",
    showlegend: false,
    name: "",
  });

  // ── Main vectors ───────────────────────────────────────────────────────
  allVecs.forEach(v => {
    if (v.x === 0 && v.y === 0 && v.z === 0) return;
    const mag = magnitude(v);
    const labelName =
      v.label === "a"
        ? lang === "zh"
          ? "向量 a"
          : "Vector a"
        : v.label === "b"
          ? lang === "zh"
            ? "向量 b"
            : "Vector b"
          : op === "cross"
            ? lang === "zh"
              ? "a×b"
              : "a×b"
            : lang === "zh"
              ? "結果向量"
              : "Result";

    // Arrow (shaft + cone)
    const arrowStart = data.length;
    data.push(...buildArrow(0, 0, 0, v.x, v.y, v.z, v.color));

    // Hover marker at tip
    data.push({
      type: "scatter3d",
      mode: "markers",
      x: [v.x],
      y: [v.y],
      z: [v.z],
      marker: { size: 6, color: v.color, opacity: 0.8 },
      hovertemplate: `<b>${labelName}</b><br>x: ${fmt(v.x)}<br>y: ${fmt(v.y)}<br>z: ${fmt(v.z)}<br>|v|: ${fmt(mag)}<extra></extra>`,
      showlegend: true,
      name: labelName,
      legendgroup: v.label,
    });
    if (v.label === "r" && stage < 2) {
      for (let i = arrowStart; i < data.length; i++) data[i].visible = false;
      return;
    }

    // Label annotation at tip
    anns.push({
      x: v.x,
      y: v.y,
      z: v.z,
      text: `<b>${v.label === "r" ? (op === "cross" ? "a×b" : "r") : v.label}</b>`,
      showarrow: false,
      font: { color: v.color, size: 13, family: "IBM Plex Serif, serif" },
      yshift: 10,
    });

    // Coordinate annotation
    anns.push({
      x: v.x,
      y: v.y,
      z: v.z,
      text: `(${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)})`,
      showarrow: false,
      font: { color: v.color, size: 9, family: "IBM Plex Mono, monospace" },
      yshift: -8,
    });
  });

  // ── Cross product: right-hand rule note ───────────────────────────────
  if (stage >= 2 && op === "cross" && vecR && magnitude(vecR) > 0) {
    anns.push({
      x: vecR.x * 0.45,
      y: vecR.y * 0.45,
      z: vecR.z * 0.45,
      text: lang === "zh" ? "右手定則" : "Right-hand rule",
      showarrow: false,
      font: { color: "#16A34A", size: 9, family: "IBM Plex Mono, monospace" },
      bgcolor: "rgba(22,163,74,0.08)",
    });
  }

  const bounds = data.map(trace => ({ ...trace, visible: true }));
  // Include a computed result in the fit even when the parent hides its trace.
  if (vecA && vecB && ["cross", "add", "sub"].includes(op)) {
    const result =
      op === "cross"
        ? [
            vecA.y * vecB.z - vecA.z * vecB.y,
            vecA.z * vecB.x - vecA.x * vecB.z,
            vecA.x * vecB.y - vecA.y * vecB.x,
          ]
        : [
            vecA.x + (op === "sub" ? -vecB.x : vecB.x),
            vecA.y + (op === "sub" ? -vecB.y : vecB.y),
            vecA.z + (op === "sub" ? -vecB.z : vecB.z),
          ];
    bounds.push(
      ...buildArrow(0, 0, 0, result[0], result[1], result[2], "#16A34A")
    );
  }
  for (let i = 0; i < constructionEnd; i++) {
    const minimum = i < planeEnd ? 1 : i < projectionEnd ? 2 : 1;
    if (stage < minimum) data[i].visible = false;
  }
  return { plotData: data, annotations3d: anns, boundsData: bounds };
}

export default function VectorPlot3D({
  vectors,
  op = "add",
  lang = "zh",
  projVector,
  perpVector,
  constructionStage = 2,
}: VectorPlot3DProps) {
  const { plotData, annotations3d, boundsData } = useMemo(
    () =>
      buildVectorPlot3DData({
        vectors,
        op,
        lang,
        projVector,
        perpVector,
        constructionStage,
      }),
    [vectors, op, lang, projVector, perpVector, constructionStage]
  );
  const layout = useMemo(
    () => ({
      scene: { annotations: annotations3d },
      showlegend: true,
      margin: { l: 0, r: 0, t: 50, b: 5 },
      legend: { orientation: "h", x: 0.01, y: 1.09, font: { size: 10 } },
    }),
    [annotations3d]
  );

  return (
    <div className="space-y-2">
      <Plot3DScene
        data={plotData}
        boundsData={boundsData}
        layout={layout}
        lang={lang}
        name={lang === "zh" ? "三維向量" : "3D vectors"}
        uirevision="vector-3d"
        height={400}
      />
      <dl
        className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground"
        aria-label={
          lang === "zh" ? "向量座標摘要" : "Vector coordinate summary"
        }
      >
        {vectors
          .filter(
            v =>
              [v.x, v.y, v.z].every(Number.isFinite) &&
              (v.label !== "r" || constructionStage >= 2)
          )
          .map((v, index) => (
            <div key={`${v.label}-${index}`} className="flex gap-1">
              <dt className="font-semibold" style={{ color: v.color }}>
                {v.label}:
              </dt>
              <dd>
                ({fmt(v.x)}, {fmt(v.y)}, {fmt(v.z)})
              </dd>
            </div>
          ))}
      </dl>
      {vectors.some(v => [v.x, v.y, v.z].some(n => !Number.isInteger(n))) && (
        <p className="px-1 text-xs text-muted-foreground">
          {lang === "zh"
            ? "≈ 表示近似值；精確結果見計算步驟。"
            : "≈ marks approximations; see the calculation steps for exact results."}
        </p>
      )}
    </div>
  );
}
