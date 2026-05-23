// VectorCanvas2D — GeoGebra-style 2D vector visualization
// Academic Precision Design: clean grid, labeled axes, animated arrows
import { useEffect, useRef } from "react";

interface VectorCanvas2DProps {
  vectors: { x: number; y: number; color: string; label: string }[];
  width?: number;
  height?: number;
}

export default function VectorCanvas2D({
  vectors,
  width = 360,
  height = 360,
}: VectorCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;

    // Auto-scale based on vector magnitudes
    const maxMag = Math.max(
      1,
      ...vectors.flatMap((v) => [Math.abs(v.x), Math.abs(v.y)])
    );
    const scale = Math.min(cx, cy) * 0.75 / (maxMag || 1);

    // Background
    ctx.fillStyle = "#F7F8FC";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    const gridStep = scale;
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 0.5;
    for (let x = cx % gridStep; x < width; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = cy % gridStep; y < height; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#9CA3AF";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();

    // Axis labels
    ctx.fillStyle = "#6B7280";
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText("x", width - 16, cy - 8);
    ctx.fillText("y", cx + 8, 16);

    // Tick marks with numbers
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "10px IBM Plex Mono, monospace";
    for (let i = 1; i * gridStep < Math.min(cx, cy) - 10; i++) {
      const label = String(i);
      ctx.fillText(label, cx + i * gridStep - 4, cy + 14);
      ctx.fillText(`-${label}`, cx - i * gridStep - 8, cy + 14);
      ctx.fillText(label, cx + 4, cy - i * gridStep + 4);
      ctx.fillText(`-${label}`, cx + 4, cy + i * gridStep + 4);
    }

    // Draw vectors
    vectors.forEach((v) => {
      if (v.x === 0 && v.y === 0) return;
      const ex = cx + v.x * scale;
      const ey = cy - v.y * scale;

      // Vector line
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(cy - ey, ex - cx);
      const arrowLen = 12;
      const arrowAngle = Math.PI / 6;
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - arrowLen * Math.cos(angle - arrowAngle),
        ey + arrowLen * Math.sin(angle - arrowAngle)
      );
      ctx.lineTo(
        ex - arrowLen * Math.cos(angle + arrowAngle),
        ey + arrowLen * Math.sin(angle + arrowAngle)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.fillStyle = v.color;
      ctx.font = "bold 13px IBM Plex Serif, serif";
      const labelX = ex + (v.x >= 0 ? 8 : -20);
      const labelY = ey + (v.y >= 0 ? -8 : 16);
      ctx.fillText(v.label, labelX, labelY);

      // Coordinates
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText(`(${fmt(v.x)}, ${fmt(v.y)})`, labelX, labelY + 14);
    });
  }, [vectors, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-border"
      style={{ width, height }}
    />
  );
}

function fmt(n: number): string {
  const r = parseFloat(n.toFixed(3));
  return Number.isInteger(r) ? String(r) : r.toString();
}
