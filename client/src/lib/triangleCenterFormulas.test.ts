import { describe, expect, it } from "vitest";
import katex from "katex";
import { circumcenterGramLatex } from "./triangleCenterFormulas";

describe("triangle centre formula rendering", () => {
  it("renders the Gram matrix system without over-escaped JSX commands", () => {
    const html = katex.renderToString(circumcenterGramLatex, {
      throwOnError: true,
      displayMode: true,
    });
    expect(html).toContain("katex");
    expect(html).not.toContain("katex-error");
    expect(circumcenterGramLatex).toContain(String.raw`2\begin{bmatrix}`);
  });
});
