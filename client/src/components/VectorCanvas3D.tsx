// VectorCanvas3D — Isometric-style 3D vector visualization using SVG
// Academic Precision Design: clean 3D axes, labeled vectors
import { useMemo } from "react";

interface Vec3 {
  x: number;
  y: number;
  z: number;
  color: string;
  label: string;
}

interface VectorCanvas3DProps {
  vectors: Vec3[];
  width?: number;
  height?: number;
}

// Isometric projection
function project(x: number, y: number, z: number, scale: number): [number, number] {
  // Standard isometric: rotate 45° around Y, then 35.26° around X
  const px = (x - z) * Math.cos(Math.PI / 6) * scale;
  const py = (x + z) * Math.sin(Math.PI / 6) * scale - y * scale;
  return [px, py];
}

export default function VectorCanvas3D({
  vectors,
  width = 360,
  height = 360,
}: VectorCanvas3DProps) {
  const cx = width / 2;
  const cy = height / 2 + 20;

  const maxMag = Math.max(
    1,
    ...vectors.flatMap((v) => [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)])
  );
  const scale = Math.min(cx, cy) * 0.55 / (maxMag || 1);
  const axisLen = Math.min(cx, cy) * 0.55 / scale;

  // Axis endpoints
  const axes = [
    { end: [axisLen, 0, 0] as [number, number, number], label: "x", color: "#9CA3AF" },
    { end: [0, axisLen, 0] as [number, number, number], label: "y", color: "#9CA3AF" },
    { end: [0, 0, axisLen] as [number, number, number], label: "z", color: "#9CA3AF" },
  ];

  function toSVG(x: number, y: number, z: number): [number, number] {
    const [px, py] = project(x, y, z, scale);
    return [cx + px, cy - py];
  }

  function arrowhead(
    ox: number, oy: number, ex: number, ey: number, color: string, size = 8
  ): string {
    const angle = Math.atan2(ey - oy, ex - ox);
    const a1x = ex - size * Math.cos(angle - Math.PI / 6);
    const a1y = ey - size * Math.sin(angle - Math.PI / 6);
    const a2x = ex - size * Math.cos(angle + Math.PI / 6);
    const a2y = ey - size * Math.sin(angle + Math.PI / 6);
    return `M${ex},${ey} L${a1x},${a1y} L${a2x},${a2y} Z`;
  }

  const [ox, oy] = toSVG(0, 0, 0);

  return (
    <svg
      width={width}
      height={height}
      className="rounded-lg border border-border bg-background"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Background */}
      <rect width={width} height={height} fill="#F7F8FC" rx="8" />

      {/* Grid on XZ plane */}
      {Array.from({ length: 5 }, (_, i) => i - 2).map((i) =>
        Array.from({ length: 5 }, (_, j) => j - 2).map((j) => {
          const [x1, y1] = toSVG(i * (axisLen / 3), 0, j * (axisLen / 3));
          const [x2, y2] = toSVG((i + 1) * (axisLen / 3), 0, j * (axisLen / 3));
          const [x3, y3] = toSVG(i * (axisLen / 3), 0, (j + 1) * (axisLen / 3));
          return (
            <g key={`${i}-${j}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E5E7EB" strokeWidth="0.5" />
              <line x1={x1} y1={y1} x2={x3} y2={y3} stroke="#E5E7EB" strokeWidth="0.5" />
            </g>
          );
        })
      )}

      {/* Axes */}
      {axes.map((axis) => {
        const [ex, ey] = toSVG(...axis.end);
        return (
          <g key={axis.label}>
            <line
              x1={ox} y1={oy} x2={ex} y2={ey}
              stroke={axis.color} strokeWidth="1.5"
            />
            <path
              d={arrowhead(ox, oy, ex, ey, axis.color, 7)}
              fill={axis.color}
            />
            <text
              x={ex + (axis.label === "x" ? 8 : axis.label === "z" ? 8 : -14)}
              y={ey + (axis.label === "y" ? -6 : 4)}
              fill="#6B7280"
              fontSize="12"
              fontFamily="IBM Plex Mono, monospace"
              fontWeight="600"
            >
              {axis.label}
            </text>
          </g>
        );
      })}

      {/* Origin dot */}
      <circle cx={ox} cy={oy} r="3" fill="#6B7280" />
      <text x={ox + 6} y={oy + 12} fill="#9CA3AF" fontSize="10" fontFamily="IBM Plex Mono, monospace">O</text>

      {/* Vectors */}
      {vectors.map((v, idx) => {
        if (v.x === 0 && v.y === 0 && v.z === 0) return null;
        const [ex, ey] = toSVG(v.x, v.y, v.z);

        // Dashed projection lines
        const [px, py] = toSVG(v.x, 0, v.z);
        const [pxY, pyY] = toSVG(v.x, v.y, v.z);

        return (
          <g key={idx}>
            {/* Projection to XZ plane */}
            <line x1={ox} y1={oy} x2={px} y2={py} stroke={v.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            <line x1={px} y1={py} x2={ex} y2={ey} stroke={v.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />

            {/* Main vector */}
            <line x1={ox} y1={oy} x2={ex} y2={ey} stroke={v.color} strokeWidth="2.5" />
            <path d={arrowhead(ox, oy, ex, ey, v.color)} fill={v.color} />

            {/* Label */}
            <text
              x={ex + 8}
              y={ey - 4}
              fill={v.color}
              fontSize="13"
              fontFamily="IBM Plex Serif, serif"
              fontWeight="700"
            >
              {v.label}
            </text>
            <text
              x={ex + 8}
              y={ey + 10}
              fill={v.color}
              fontSize="9"
              fontFamily="IBM Plex Mono, monospace"
              opacity="0.8"
            >
              ({fmt(v.x)},{fmt(v.y)},{fmt(v.z)})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function fmt(n: number): string {
  const r = parseFloat(n.toFixed(2));
  return Number.isInteger(r) ? String(r) : r.toString();
}
