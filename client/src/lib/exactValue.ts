// ============================================================
// Exact Value System — Symbolic representation of π, √, fractions
// Used to display mathematical results in exact form (no decimals)
// ============================================================

/** Convert a number to a fraction string "p/q" in LaTeX, or integer, or null */
function toFractionLatex(x: number, maxDen = 120): string | null {
  if (!isFinite(x)) return null;
  if (Math.abs(x) < 1e-10) return "0";
  if (Number.isInteger(x)) return String(x);
  const neg = x < 0;
  const ax = Math.abs(x);
  const tol = 1e-8;
  for (let d = 2; d <= maxDen; d++) {
    const num = Math.round(ax * d);
    if (Math.abs(num / d - ax) < tol) {
      const n = neg ? -num : num;
      if (n < 0) return `-\\frac{${-n}}{${d}}`;
      return `\\frac{${n}}{${d}}`;
    }
  }
  return null;
}

/** GCD of two positive integers */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

/**
 * Try to express √n in simplified form: k√m where m is square-free.
 * Returns LaTeX string like "2\\sqrt{3}" or "\\sqrt{5}" or "3" (if perfect square).
 */
function simplifySquareRoot(n: number): string | null {
  if (n < 0) return null;
  if (Math.abs(n) < 1e-10) return "0";
  // Check if n is a ratio of integers
  const frac = toFractionLatex(n, 200);
  // n must be a non-negative integer or simple fraction for exact sqrt
  // Try integer case first
  const rounded = Math.round(n);
  if (Math.abs(rounded - n) < 1e-9) {
    if (rounded === 0) return "0";
    // Factor out perfect squares
    let outside = 1;
    let inside = rounded;
    for (let i = 2; i * i <= inside; i++) {
      while (inside % (i * i) === 0) {
        outside *= i;
        inside = inside / (i * i);
      }
    }
    if (inside === 1) return String(outside); // perfect square
    if (outside === 1) return `\\sqrt{${inside}}`;
    return `${outside}\\sqrt{${inside}}`;
  }
  // Try p/q form: √(p/q) = √p / √q
  for (let d = 2; d <= 100; d++) {
    const num = Math.round(n * d);
    if (Math.abs(num / d - n) < 1e-9 && num > 0) {
      const g = gcd(num, d);
      const p = num / g, q = d / g;
      const sqrtP = simplifySquareRoot(p);
      const sqrtQ = simplifySquareRoot(q);
      if (sqrtP && sqrtQ) {
        if (sqrtQ === "1") return sqrtP;
        return `\\frac{${sqrtP}}{${sqrtQ}}`;
      }
    }
  }
  return null;
}

/**
 * Express a magnitude (square root of sumSq) in exact form.
 * e.g. sumSq=5 → "\\sqrt{5}", sumSq=4 → "2", sumSq=8 → "2\\sqrt{2}"
 */
export function exactSqrt(sumSq: number): string {
  const exact = simplifySquareRoot(sumSq);
  if (exact) return exact;
  // Fallback: decimal
  return parseFloat(Math.sqrt(sumSq).toFixed(6)).toString();
}

/**
 * Express an angle in exact form using common arccos values.
 * Returns LaTeX like "\\frac{\\pi}{3}", "\\frac{2\\pi}{3}", "\\frac{\\pi}{2}", "0", "\\pi"
 * or degrees like "45^\\circ" for common degree values,
 * or decimal degrees as fallback.
 */
export function exactAngle(cosTheta: number): { latex: string; degrees: number } {
  const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  const degrees = (theta * 180) / Math.PI;

  // Check common exact values (cosTheta → angle in radians → LaTeX)
  const commonAngles: Array<{ cos: number; latex: string; deg: number }> = [
    { cos: 1,           latex: "0",                          deg: 0   },
    { cos: Math.sqrt(3)/2, latex: "\\frac{\\pi}{6}",         deg: 30  },
    { cos: Math.sqrt(2)/2, latex: "\\frac{\\pi}{4}",         deg: 45  },
    { cos: 0.5,         latex: "\\frac{\\pi}{3}",            deg: 60  },
    { cos: 0,           latex: "\\frac{\\pi}{2}",            deg: 90  },
    { cos: -0.5,        latex: "\\frac{2\\pi}{3}",           deg: 120 },
    { cos: -Math.sqrt(2)/2, latex: "\\frac{3\\pi}{4}",       deg: 135 },
    { cos: -Math.sqrt(3)/2, latex: "\\frac{5\\pi}{6}",       deg: 150 },
    { cos: -1,          latex: "\\pi",                       deg: 180 },
  ];

  for (const ca of commonAngles) {
    if (Math.abs(cosTheta - ca.cos) < 1e-9) {
      return { latex: ca.latex, degrees: ca.deg };
    }
  }

  // Try to express as fraction of π (multiples of π/12 = 15°)
  const piMultiple = degrees / 180; // fraction of π
  const frac = toFractionLatex(piMultiple, 24);
  if (frac && frac !== "0") {
    // Simplify: if frac = "1" → "\\pi", if frac = "\\frac{1}{2}" → "\\frac{\\pi}{2}"
    if (frac === "1") return { latex: "\\pi", degrees };
    // Check if it's a simple fraction \frac{p}{q}
    const fracMatch = frac.match(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/);
    if (fracMatch) {
      const sign = fracMatch[1];
      const p = fracMatch[2];
      const q = fracMatch[3];
      if (p === "1") {
        return { latex: `${sign}\\frac{\\pi}{${q}}`, degrees };
      }
      return { latex: `${sign}\\frac{${p}\\pi}{${q}}`, degrees };
    }
    // Integer multiple
    const intMatch = frac.match(/^(-?)(\d+)$/);
    if (intMatch) {
      const sign = intMatch[1];
      const n = intMatch[2];
      return { latex: `${sign}${n}\\pi`, degrees };
    }
  }

  // Fallback: decimal degrees
  const rounded = parseFloat(degrees.toFixed(4));
  return { latex: `${rounded}^\\circ`, degrees };
}

/**
 * Format a number as exact LaTeX value.
 * Integers → as-is, fractions → \\frac{p}{q}, otherwise decimal.
 */
export function exactFmt(n: number): string {
  if (!isFinite(n)) return n > 0 ? "\\infty" : "-\\infty";
  if (Math.abs(n) < 1e-10) return "0";
  const frac = toFractionLatex(n);
  if (frac) return frac;
  return parseFloat(n.toFixed(6)).toString();
}

/**
 * Format a vector component as exact LaTeX, including √ forms.
 * e.g. 1/√2 → "\\frac{1}{\\sqrt{2}}" or "\\frac{\\sqrt{2}}{2}"
 */
export function exactComponent(n: number): string {
  if (Math.abs(n) < 1e-10) return "0";
  if (Number.isInteger(n)) return String(n);
  // Try fraction first
  const frac = toFractionLatex(n);
  if (frac) return frac;
  // Try to express as p√q / r form
  // n² might be a nice fraction
  const n2 = n * n;
  const neg = n < 0;
  const an = Math.abs(n);
  // Check if n = p/q * √m
  for (let m = 2; m <= 20; m++) {
    const ratio = an / Math.sqrt(m);
    const ratioFrac = toFractionLatex(ratio);
    if (ratioFrac) {
      // n = ratioFrac * √m
      const sqrtM = simplifySquareRoot(m) ?? `\\sqrt{${m}}`;
      let result: string;
      if (ratioFrac === "1") {
        result = sqrtM;
      } else if (ratioFrac.startsWith("\\frac")) {
        // \frac{p}{q} * \sqrt{m} = \frac{p\sqrt{m}}{q}
        const fm = ratioFrac.match(/^\\frac\{(\d+)\}\{(\d+)\}$/);
        if (fm) {
          const p = fm[1], q = fm[2];
          result = `\\frac{${p}${sqrtM}}{${q}}`;
        } else {
          result = `${ratioFrac}\\cdot ${sqrtM}`;
        }
      } else {
        result = `${ratioFrac}${sqrtM}`;
      }
      return neg ? `-${result}` : result;
    }
  }
  return parseFloat(n.toFixed(6)).toString();
}

/**
 * Build a LaTeX column vector with exact components.
 */
export function exactVecLatex(v: number[]): string {
  return `\\begin{pmatrix} ${v.map(exactComponent).join(" \\\\ ")} \\end{pmatrix}`;
}
