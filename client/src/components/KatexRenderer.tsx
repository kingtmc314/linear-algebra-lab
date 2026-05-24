/**
 * KatexRenderer
 * Renders a string that may contain:
 *   - Inline math:   \( ... \)
 *   - Display math:  \[ ... \]
 *   - Plain text in between
 *
 * When `latex` contains NO delimiters, the whole string is treated as
 * pure LaTeX and rendered in the mode specified by `displayMode`.
 */
import katex from "katex";
import { useMemo } from "react";

interface KatexRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

function renderMath(src: string, display: boolean): string {
  try {
    return katex.renderToString(src, {
      displayMode: display,
      throwOnError: false,
      errorColor: "#E57373",
      strict: false,
    });
  } catch {
    return `<span style="color:#E57373">${escapeHtml(src)}</span>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseMixed(
  input: string
): Array<{ kind: "text" | "inline" | "display"; content: string }> {
  const segments: Array<{ kind: "text" | "inline" | "display"; content: string }> = [];
  const re = /\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", content: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ kind: "inline", content: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ kind: "display", content: match[2] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ kind: "text", content: input.slice(lastIndex) });
  }
  return segments;
}

export default function KatexRenderer({
  latex,
  displayMode = false,
  className = "",
}: KatexRendererProps) {
  const html = useMemo(() => {
    if (!latex) return "";
    // Mixed text+math mode
    if (/\\\(|\\\[/.test(latex)) {
      return parseMixed(latex)
        .map(seg => {
          if (seg.kind === "text") return escapeHtml(seg.content);
          if (seg.kind === "inline") return renderMath(seg.content, false);
          return renderMath(seg.content, true);
        })
        .join("");
    }
    // Pure LaTeX mode
    return renderMath(latex, displayMode);
  }, [latex, displayMode]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
