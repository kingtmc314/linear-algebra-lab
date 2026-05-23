// StepDisplay — Shows calculation steps with LaTeX rendering
// Academic Precision Design: staggered fadeIn animation
import { useState } from "react";
import KatexRenderer from "./KatexRenderer";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Step {
  description: string;
  latex?: string;
  matrix?: number[][];
}

interface StepDisplayProps {
  steps: Step[];
  title?: string;
}

export default function StepDisplay({ steps, title }: StepDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useLanguage();

  if (!steps || steps.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground font-mono uppercase tracking-wide">
          {title || t.labelStepByStep}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-border">
          {steps.map((step, i) => (
            <div
              key={i}
              className="step-card px-4 py-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex gap-3">
                {/* Step number */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary font-mono">{i + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">{step.description}</p>
                  {step.latex && (
                    <div className="overflow-x-auto py-1">
                      <KatexRenderer
                        latex={step.latex}
                        displayMode={true}
                        className="text-sm"
                      />
                    </div>
                  )}
                  {step.matrix && !step.latex && (
                    <MatrixDisplay matrix={step.matrix} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact matrix display for step results */
function MatrixDisplay({ matrix }: { matrix: number[][] }) {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  function fmt(n: number): string {
    if (Object.is(n, -0)) return "0";
    const r = parseFloat(n.toFixed(4));
    return Number.isInteger(r) ? String(r) : r.toString();
  }

  return (
    <div className="flex items-center gap-1 my-1">
      <svg width="10" height={rows * 28 + 8} viewBox={`0 0 10 ${rows * 28 + 8}`} fill="none">
        <path
          d={`M8 4 L3 4 L3 ${rows * 28 + 4} L8 ${rows * 28 + 4}`}
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
        {matrix.map((row, r) =>
          row.map((cell, c) => (
            <span
              key={`${r}-${c}`}
              className="font-mono text-xs px-2 py-1 text-center min-w-[2.5rem]"
            >
              {fmt(cell)}
            </span>
          ))
        )}
      </div>
      <svg width="10" height={rows * 28 + 8} viewBox={`0 0 10 ${rows * 28 + 8}`} fill="none">
        <path
          d={`M2 4 L7 4 L7 ${rows * 28 + 4} L2 ${rows * 28 + 4}`}
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
