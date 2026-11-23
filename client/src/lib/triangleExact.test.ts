import { describe, expect, it } from "vitest";
import katex from "katex";
import { triangleExact } from "./triangleExact";
import { computeTriangleCenters, type Vec3 } from "./vectorMath";

const tuple = (...coordinates: string[]) => `\\left(${coordinates.join(",\\, ")}\\right)`;

/** Independent numerical interpreter for the emitted exact arithmetic LaTeX. */
function evaluate(latex: string): number {
  let position = 0;
  const skipSpace = () => { while (latex[position] === " ") position++; };
  function group(): number {
    skipSpace();
    if (latex[position++] !== "{") throw new Error("Expected opening brace");
    const value = sum();
    skipSpace();
    if (latex[position++] !== "}") throw new Error("Expected closing brace");
    return value;
  }
  function atom(): number {
    skipSpace();
    if (latex[position] === "-") { position++; return -atom(); }
    if (latex.startsWith("\\frac", position)) {
      position += 5;
      const numerator = group();
      return numerator / group();
    }
    if (latex.startsWith("\\sqrt", position)) { position += 5; return Math.sqrt(group()); }
    const match = /^\d+/.exec(latex.slice(position));
    if (!match) throw new Error(`Unexpected exact expression: ${latex.slice(position)}`);
    position += match[0].length;
    return Number(match[0]);
  }
  function product(): number {
    let value = atom();
    skipSpace();
    while (latex.startsWith("\\cdot", position)) {
      position += 5;
      value *= atom();
      skipSpace();
    }
    return value;
  }
  function sum(): number {
    let value = product();
    skipSpace();
    while (latex[position] === "+" || latex[position] === "-") {
      const sign = latex[position++];
      const term = product();
      value = sign === "+" ? value + term : value - term;
      skipSpace();
    }
    return value;
  }
  const value = sum();
  if (position !== latex.length) throw new Error(`Unparsed exact expression: ${latex.slice(position)}`);
  return value;
}

function evaluateTuple(latex: string): Vec3 {
  return latex.slice("\\left(".length, -"\\right)".length).split(",\\, ").map(evaluate) as Vec3;
}

function expectCorrectNumerically(A: Vec3, B: Vec3, C: Vec3) {
  const exact = triangleExact(A, B, C);
  const numeric = computeTriangleCenters(A, B, C);
  for (const key of ["centroid", "incenter", "circumcenter", "orthocenter"] as const) {
    evaluateTuple(exact[key]).forEach((coordinate, i) => expect(coordinate).toBeCloseTo(numeric[key][i], 8));
  }
  for (const key of ["sideA", "sideB", "sideC"] as const) {
    expect(evaluate(exact[key])).toBeCloseTo(numeric[key], 8);
  }
  Object.values(exact).forEach(latex => expect(() => katex.renderToString(latex, { throwOnError: true })).not.toThrow());
  return exact;
}

describe("exact triangle-center display", () => {
  it("returns reduced rational centers and sides for a 6–8–10 triangle", () => {
    expect(triangleExact([0, 0, 0], [6, 0, 0], [0, 8, 0])).toEqual({
      centroid: tuple("2", "\\frac{8}{3}", "0"),
      incenter: tuple("2", "2", "0"),
      circumcenter: tuple("3", "4", "0"),
      orthocenter: tuple("0", "0", "0"),
      sideA: "10",
      sideB: "8",
      sideC: "6",
    });
  });

  it("matches the screenshot sample exactly, including the radical incenter", () => {
    expect(expectCorrectNumerically([2, 1, 0], [4, 0, 0], [2, 3, 0])).toEqual({
      centroid: tuple("\\frac{8}{3}", "\\frac{4}{3}", "0"),
      incenter: tuple(
        "\\frac{2\\cdot \\sqrt{13} + 8 + 2\\cdot \\sqrt{5}}{\\sqrt{13} + 2 + \\sqrt{5}}",
        "\\frac{\\sqrt{13} + 3\\cdot \\sqrt{5}}{\\sqrt{13} + 2 + \\sqrt{5}}",
        "0",
      ),
      circumcenter: tuple("\\frac{15}{4}", "2", "0"),
      orthocenter: tuple("\\frac{1}{2}", "0", "0"),
      sideA: "\\sqrt{13}",
      sideB: "2",
      sideC: "\\sqrt{5}",
    });
  });

  it("parses two-decimal inputs as exact decimal rationals, never continued-fraction guesses", () => {
    expect(triangleExact([0.1, 0.2, -0.3], [0.7, 0.2, -0.3], [0.1, 1, -0.3])).toEqual({
      centroid: tuple("\\frac{3}{10}", "\\frac{7}{15}", "-\\frac{3}{10}"),
      incenter: tuple("\\frac{3}{10}", "\\frac{2}{5}", "-\\frac{3}{10}"),
      circumcenter: tuple("\\frac{2}{5}", "\\frac{3}{5}", "-\\frac{3}{10}"),
      orthocenter: tuple("\\frac{1}{10}", "\\frac{1}{5}", "-\\frac{3}{10}"),
      sideA: "1",
      sideB: "\\frac{4}{5}",
      sideC: "\\frac{3}{5}",
    });
    expect(triangleExact([0, 0, 0], [0.01, 0, 0], [0, 0.02, 0]).centroid)
      .toBe(tuple("\\frac{1}{300}", "\\frac{1}{150}", "0"));
  });

  it("supports arbitrary decimal precision and both signs of scientific exponents", () => {
    const small = triangleExact([0, 0, -0], [3e-7, 0, 0], [0, 4e-7, 0]);
    expect(small.sideA).toBe("\\frac{1}{2000000}");
    expect(small.incenter).toBe(tuple("\\frac{1}{10000000}", "\\frac{1}{10000000}", "0"));
    const large = triangleExact([0, 0, 0], [3e21, 0, 0], [0, 4e21, 0]);
    expect(large.sideA).toBe("5000000000000000000000");
    expect(large.incenter).toBe(tuple("1000000000000000000000", "1000000000000000000000", "0"));
    const precise = triangleExact([0.1234567891, 0, 0], [1.1234567891, 0, 0], [0.1234567891, 1, 0]);
    expect(precise.orthocenter).toBe(tuple("\\frac{1234567891}{10000000000}", "0", "0"));
    expect(precise.circumcenter).toBe(tuple("\\frac{6234567891}{10000000000}", "\\frac{1}{2}", "0"));
  });

  it("solves the exact Gram system in a tilted 3D plane", () => {
    const result = expectCorrectNumerically([1, 2, 3], [4, 2, 6], [1, 6, 5]);
    expect(result.centroid).toBe(tuple("2", "\\frac{10}{3}", "\\frac{14}{3}"));
    expect(result.circumcenter).toBe(tuple("\\frac{19}{9}", "\\frac{32}{9}", "\\frac{44}{9}"));
    expect(result.orthocenter).toBe(tuple("\\frac{16}{9}", "\\frac{26}{9}", "\\frac{38}{9}"));
    expect(result.sideA).toBe("\\sqrt{26}");
    expect(result.sideB).toBe("2\\cdot \\sqrt{5}");
    expect(result.sideC).toBe("3\\cdot \\sqrt{2}");
  });

  it("simplifies rational-length sides and rational incenter coordinates in 3D", () => {
    expect(triangleExact([1, 2, 3], [7, 2, 3], [1, 2, 11])).toEqual({
      centroid: tuple("3", "2", "\\frac{17}{3}"),
      incenter: tuple("3", "2", "5"),
      circumcenter: tuple("4", "2", "7"),
      orthocenter: tuple("1", "2", "3"),
      sideA: "10", sideB: "8", sideC: "6",
    });
  });

  it("combines radicals, cancels common factors, and omits zero/negative-zero coefficients", () => {
    const result = expectCorrectNumerically([0, 0, -2], [2, 0, -2], [1, 1, -2]);
    expect(result.incenter).toBe(tuple("1", "\\frac{2}{2\\cdot \\sqrt{2} + 2}", "-2"));
    expect(result.incenter).not.toContain("0\\cdot");
    expect(result.incenter).not.toContain("-0");
    expectCorrectNumerically([-2, -1, 4], [-4, 0, 4], [-2, -3, 4]);
  });

  it("leaves huge radicals exact with bounded simplification, including near-degenerate decimals", () => {
    const result = triangleExact([0, 0, 0], [1000000000.01, 0, 0], [0, 1000000000.02, 0]);
    expect(result.sideA).toBe("\\sqrt{\\frac{4000000000120000000001}{2000}}");
    Object.values(result).forEach(latex => {
      expect(latex).not.toMatch(/NaN|Infinity|\\approx|\d\.\d/);
      expect(() => katex.renderToString(latex, { throwOnError: true })).not.toThrow();
    });
    const thin = triangleExact([0, 0, 0], [1, 0, 0], [2, 1e-10, 0]);
    expect(thin.circumcenter).toBe(tuple("\\frac{1}{2}", "\\frac{200000000000000000001}{20000000000}", "0"));
  }, 3000);

  it("handles the extreme finite decimal exponents without bigint-to-number conversion", () => {
    const maximum = triangleExact([0, 0, 0], [1e308, 0, 0], [0, 1e308, 0]);
    expect(maximum.sideA).toContain("\\sqrt{");
    expect(maximum.sideB).toBe(`1${"0".repeat(308)}`);
    const minimum = triangleExact([0, 0, 0], [5e-324, 0, 0], [0, 5e-324, 0]);
    expect(minimum.sideB).toBe(`\\frac{1}{2${"0".repeat(323)}}`);
    expect(minimum.circumcenter).not.toContain("NaN");
    expect(minimum.circumcenter).not.toContain("Infinity");
  }, 3000);

  it("is invariant under cyclic vertex permutations for all four centers", () => {
    const A: Vec3 = [-0.25, 1.02, 3];
    const B: Vec3 = [2.18, -0.04, 1.5];
    const C: Vec3 = [0.13, 4.21, 2.5];
    const abc = expectCorrectNumerically(A, B, C);
    const bca = expectCorrectNumerically(B, C, A);
    for (const key of ["centroid", "circumcenter", "orthocenter"] as const) expect(abc[key]).toBe(bca[key]);
    evaluateTuple(abc.incenter).forEach((coordinate, i) => expect(coordinate).toBeCloseTo(evaluateTuple(bca.incenter)[i], 12));
    expect(abc.sideA).toBe(bca.sideC);
    expect(abc.sideB).toBe(bca.sideA);
    expect(abc.sideC).toBe(bca.sideB);
  });

  it("matches geometric center calculations over a deterministic set of decimal 3D triangles", () => {
    for (let i = 1; i <= 24; i++) {
      expectCorrectNumerically(
        [i / 10, -0.03 * i, 1.25],
        [2 + i / 100, 0.2 * i, -0.25],
        [-1 - i / 100, 3 + i / 10, 0.5],
      );
    }
  });

  it.each([
    [[0, 0, 0], [0, 0, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 2, 3], [2, 4, 6]],
    [[0.1, 0.2, 0.3], [0.2, 0.4, 0.6], [0.3, 0.6, 0.9]],
    [[NaN, 0, 0], [1, 0, 0], [0, 1, 0]],
    [[0, 0, 0], [Infinity, 0, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 0, 0], [0, -Infinity, 0]],
  ] as [Vec3, Vec3, Vec3][])("rejects non-finite or degenerate triangles: %j, %j, %j", (A, B, C) => {
    expect(() => triangleExact(A, B, C)).toThrow();
  });
});
