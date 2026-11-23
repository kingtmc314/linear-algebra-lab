import { describe, expect, it } from "vitest";
import katex from "katex";
import { exactVectorDerivation } from "./vectorExact";

describe("exact vector derivations", () => {
  it("adds the actual decimal inputs without binary drift", () => {
    expect(exactVectorDerivation("add", [0.1, 0.2], [0.2, 0.1]).latex).toContain(String.raw`\frac{3}{10}`);
    expect(exactVectorDerivation("dot", [0.1, 0.2], [0.2, 0.1]).latex).toContain(String.raw`\frac{1}{25}`);
  });
  it("retains arbitrary angles as exact inverse trig and handles obtuse angles", () => {
    expect(exactVectorDerivation("angle", [1, 0], [1, 2]).latex).toBe(String.raw`\theta=\arccos\left(\frac{\sqrt{5}}{5}\right)`);
    expect(exactVectorDerivation("angle", [1, 0], [-1, 1]).latex).toBe(String.raw`\theta=\frac{3\pi}{4}`);
    expect(exactVectorDerivation("angle", [1, 0], [0, 1]).latex).toBe(String.raw`\theta=\frac{\pi}{2}`);
  });
  it("simplifies radical magnitudes and unit coordinates", () => {
    expect(exactVectorDerivation("mag", [2, 2], [0, 0]).latex).toBe(String.raw`|\mathbf a|=2\sqrt{2}`);
    expect(exactVectorDerivation("normalize", [1, 1], [0, 0]).latex).toContain(String.raw`\frac{\sqrt{2}}{2}`);
  });
  it("uses exact projection factors and cross-product components", () => {
    expect(exactVectorDerivation("projection", [1, 0], [1, 1]).latex).toContain(String.raw`\frac{1}{2}`);
    expect(exactVectorDerivation("cross", [2, -1, 1], [1, 3, -2]).latex).toContain(String.raw`\begin{pmatrix}-1\\5\\7\end{pmatrix}`);
  });
  it("rejects undefined directions but permits zero magnitude", () => {
    expect(() => exactVectorDerivation("angle", [0, 0], [1, 1])).toThrow();
    expect(() => exactVectorDerivation("projection", [1, 1], [0, 0])).toThrow();
    expect(exactVectorDerivation("mag", [0, 0], [0, 0]).latex).toBe(String.raw`|\mathbf a|=0`);
  });
  it("renders every operation in KaTeX without invalid markup", () => {
    const ops = ["add", "sub", "dot", "cross", "mag", "angle", "normalize", "projection"] as const;
    ops.forEach(op => {
      const result = exactVectorDerivation(op, [2, -1, 1], [1, 3, -2]);
      [result.latex, ...result.steps.map(step => step.latex!)].forEach(latex => expect(() => katex.renderToString(latex, { throwOnError: true })).not.toThrow());
    });
  });
});
