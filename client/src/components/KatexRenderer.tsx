// KaTeX math renderer component
import katex from "katex";
import { useMemo } from "react";

interface KatexRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export default function KatexRenderer({
  latex,
  displayMode = false,
  className = "",
}: KatexRendererProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        errorColor: "#E57373",
        strict: false,
      });
    } catch {
      return `<span style="color:#E57373">${latex}</span>`;
    }
  }, [latex, displayMode]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
