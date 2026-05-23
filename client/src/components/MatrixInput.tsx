// MatrixInput — Academic Precision Design
// Grid-aligned matrix input with bracket visualization
import { useEffect, useRef } from "react";
import { Matrix } from "@/lib/matrixMath";

interface MatrixInputProps {
  label: string;
  matrix: Matrix;
  onChange: (matrix: Matrix) => void;
  readOnly?: boolean;
  highlight?: boolean;
}

export default function MatrixInput({
  label,
  matrix,
  onChange,
  readOnly = false,
  highlight = false,
}: MatrixInputProps) {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  function handleChange(r: number, c: number, val: string) {
    const num = parseFloat(val);
    const newMatrix = matrix.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? (isNaN(num) ? 0 : num) : cell))
    );
    onChange(newMatrix);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-mono">
        {label}
      </span>
      <div className="flex items-center gap-1">
        {/* Left bracket */}
        <svg
          width="12"
          height={rows * 42 + 8}
          viewBox={`0 0 12 ${rows * 42 + 8}`}
          fill="none"
          className="flex-shrink-0"
        >
          <path
            d={`M10 4 L4 4 L4 ${rows * 42 + 4} L10 ${rows * 42 + 4}`}
            stroke={highlight ? "oklch(0.55 0.18 255)" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-200"
          />
        </svg>

        {/* Matrix cells */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, 3.5rem)` }}
        >
          {matrix.map((row, r) =>
            row.map((cell, c) => (
              <input
                key={`${r}-${c}`}
                type="number"
                value={cell === 0 ? "" : cell}
                placeholder="0"
                readOnly={readOnly}
                onChange={(e) => handleChange(r, c, e.target.value)}
                className={`matrix-cell ${highlight ? "border-accent/50" : ""} ${readOnly ? "bg-muted cursor-default" : ""}`}
                style={{
                  animationDelay: `${(r * cols + c) * 20}ms`,
                }}
              />
            ))
          )}
        </div>

        {/* Right bracket */}
        <svg
          width="12"
          height={rows * 42 + 8}
          viewBox={`0 0 12 ${rows * 42 + 8}`}
          fill="none"
          className="flex-shrink-0"
        >
          <path
            d={`M2 4 L8 4 L8 ${rows * 42 + 4} L2 ${rows * 42 + 4}`}
            stroke={highlight ? "oklch(0.55 0.18 255)" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-200"
          />
        </svg>
      </div>
    </div>
  );
}

/** Dimension selector for matrix size */
interface DimSelectorProps {
  label: string;
  rows: number;
  cols: number;
  onRowsChange: (n: number) => void;
  onColsChange: (n: number) => void;
  maxDim?: number;
  rowsLabel: string;
  colsLabel: string;
  squareOnly?: boolean;
}

export function DimSelector({
  label,
  rows,
  cols,
  onRowsChange,
  onColsChange,
  maxDim = 5,
  rowsLabel,
  colsLabel,
  squareOnly = false,
}: DimSelectorProps) {
  const dims = Array.from({ length: maxDim }, (_, i) => i + 1);

  if (squareOnly) {
    // For square matrices (det, inv): show single n×n selector
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">{label}:</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">大小 / Size</label>
          <select
            value={rows}
            onChange={(e) => onRowsChange(Number(e.target.value))}
            className="h-7 px-2 text-sm border border-border rounded bg-card text-foreground focus:border-accent focus:ring-0 outline-none"
          >
            {dims.map((d) => (
              <option key={d} value={d}>{d}×{d}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">{rowsLabel}</label>
        <select
          value={rows}
          onChange={(e) => onRowsChange(Number(e.target.value))}
          className="h-7 px-2 text-sm border border-border rounded bg-card text-foreground focus:border-accent focus:ring-0 outline-none"
        >
          {dims.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <span className="text-muted-foreground">×</span>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">{colsLabel}</label>
        <select
          value={cols}
          onChange={(e) => onColsChange(Number(e.target.value))}
          className="h-7 px-2 text-sm border border-border rounded bg-card text-foreground focus:border-accent focus:ring-0 outline-none"
        >
          {dims.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
