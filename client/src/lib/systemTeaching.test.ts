import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import katex from "katex";
import { solveLinearSystem } from "./linearSystem";
import { rat, ratToLatex } from "./rational";
import {
  buildSystemTeaching,
  classifySystemExactly,
  exactCramerData,
  exactSystemDeterminant,
  exactSystemRank,
  validateSystemVariables,
  defaultSystemVariables,
  systemParameterNames,
  systemGeneralLatex,
  SYSTEM_PRESETS,
} from "./systemTeaching";

const latex = (value: ReturnType<typeof rat>) => ratToLatex(value);
const cjk = /[\u3400-\u9fff]/;

describe("exact system teaching model", () => {
  it("computes 2 by 2 coefficient and replaced-column determinants with exact fractions", () => {
    const data = exactCramerData(
      [
        [0.5, 0.25],
        [0.25, -0.5],
      ],
      [1, 0]
    );
    expect(latex(data.determinant)).toBe("-\\frac{5}{16}");
    expect(data.replacements.map(value => latex(value.determinant))).toEqual([
      "-\\frac{1}{2}",
      "-\\frac{1}{4}",
    ]);
    expect(data.replacements.map(value => latex(value.value))).toEqual([
      "\\frac{8}{5}",
      "\\frac{4}{5}",
    ]);
    expect(data.replacements[0].matrix).toEqual([
      [rat(1), rat(1, 4)],
      [rat(0), rat(-1, 2)],
    ]);
    expect(data.verification.every(value => value.matches)).toBe(true);
  });

  it("computes 3 by 3 exact rational replacements", () => {
    const data = exactCramerData(
      [
        [2, 1, 0],
        [0, 3, 1],
        [1, 0, 2],
      ],
      [1, 2, 3]
    );
    expect(latex(data.determinant)).toBe("13");
    expect(data.replacements.map(value => latex(value.determinant))).toEqual([
      "5",
      "3",
      "17",
    ]);
    expect(data.replacements.map(value => latex(value.value))).toEqual([
      "\\frac{5}{13}",
      "\\frac{3}{13}",
      "\\frac{17}{13}",
    ]);
    const fraction = exactCramerData(
      [
        [0.5, 0.25, 0],
        [0, 0.75, 0.25],
        [0.25, 0, 0.5],
      ],
      [0.25, 0.5, 0.75]
    );
    expect(latex(fraction.determinant)).toBe("\\frac{13}{64}");
    expect(
      fraction.replacements.map(value => latex(value.determinant))
    ).toEqual(["\\frac{5}{64}", "\\frac{3}{64}", "\\frac{17}{64}"]);
    expect(fraction.replacements.map(value => latex(value.value))).toEqual(
      data.replacements.map(value => latex(value.value))
    );
  });

  it("handles row swaps without tolerances or losing determinant sign", () => {
    const data = exactCramerData(
      [
        [0, 2],
        [1, 1],
      ],
      [1, 2]
    );
    const swapped = exactCramerData(
      [
        [1, 1],
        [0, 2],
      ],
      [2, 1]
    );
    expect(latex(data.determinant)).toBe("-2");
    expect(latex(swapped.determinant)).toBe("2");
    expect(data.replacements.map(value => latex(value.value))).toEqual([
      "\\frac{3}{2}",
      "\\frac{1}{2}",
    ]);
    expect(swapped.replacements.map(value => latex(value.value))).toEqual(
      data.replacements.map(value => latex(value.value))
    );
  });

  it("selects a nonsingular row minor and checks all original equations for rectangular unique systems", () => {
    const A = [
      [0, 0],
      [1, 2],
      [2, 4],
      [0, 1],
      [3, 7],
    ];
    const b = [0, 5, 10, 2, 17];
    const data = exactCramerData(A, b);
    expect(data.rows).toEqual([1, 3]);
    expect(data.verification).toHaveLength(5);
    expect(data.replacements.map(value => latex(value.value))).toEqual([
      "1",
      "2",
    ]);
    const teaching = buildSystemTeaching(A, b, "en", ["a", "β"]);
    expect(
      teaching.steps.some(step =>
        step.description.includes("det(A) is not defined")
      )
    ).toBe(true);
    expect(
      teaching.steps.filter(
        step => step.phase === "Verify every original equation"
      )
    ).toHaveLength(5);
    expect(teaching.steps.some(step => step.latex?.includes("\\det(A)"))).toBe(
      false
    );
    expect(teaching.steps.some(step => step.latex?.includes("\\det(C)"))).toBe(
      true
    );
    expect(() => exactSystemDeterminant([[rat(1), rat(2)]])).toThrow(/square/);
    expect(() =>
      exactCramerData(
        [
          [1, 2],
          [2, 4],
        ],
        [1, 2]
      )
    ).toThrow(/unique/);
    expect(() => exactCramerData([[1, 2]], [1])).toThrow(/unique/);
  });

  it("covers all rank taxonomy and homogeneous theorem cases in the rational model", () => {
    const expected = [
      ["unique", true, false, 2, 2, false, false],
      ["infinite", true, false, 1, 1, false, false],
      ["none", false, false, 1, 2, false, false],
      ["unique", true, true, 2, 2, true, false],
      ["infinite", true, true, 1, 1, true, true],
    ];
    SYSTEM_PRESETS.forEach((preset, i) => {
      const value = classifySystemExactly(
        preset.A.map(row => [...row]),
        [...preset.b]
      );
      expect([
        value.type,
        value.consistent,
        value.homogeneous,
        value.rankA,
        value.rankAugmented,
        value.trivialSolution,
        value.nontrivialSolutions,
      ]).toEqual(expected[i]);
      expect(value.method).toBe(
        value.type === "unique" ? "cramer" : "gaussian"
      );
      expect(
        buildSystemTeaching(
          preset.A.map(row => [...row]),
          [...preset.b]
        ).taxonomy
      ).toEqual(value);
    });
    const zero = classifySystemExactly(
      [
        [0, 0, 0],
        [0, 0, 0],
      ],
      [0, 0]
    );
    expect(zero.freeCount).toBe(3);
    expect(zero.nontrivialSolutions).toBe(true);
    expect(exactSystemRank([[rat(1, 10000000000000000n)]])).toBe(1);
    expect(
      classifySystemExactly(
        [
          [1, 0],
          [0, 1],
        ],
        [1e-13, 0]
      )
    ).toMatchObject({ homogeneous: true, approximate: true });
    expect(
      classifySystemExactly(
        [
          [1e-6, 0],
          [0, 1e-6],
        ],
        [1e-6, 1e-6]
      )
    ).toMatchObject({
      type: "unique",
      rankA: 2,
      homogeneous: false,
      approximate: true,
    });
    expect(
      classifySystemExactly(
        [
          [0.3333333333333, 0],
          [0, 1],
        ],
        [1, 2]
      ).approximate
    ).toBe(true);
    expect(
      classifySystemExactly(
        [
          [0.125, 0],
          [0, 1],
        ],
        [1, 2]
      ).approximate
    ).toBe(false);
  });

  it("uses arbitrary k parameters, and avoids unknown-name collisions", () => {
    const A = [
        [1, 2, 3, 4],
        [0, 0, 0, 0],
      ],
      b = [5, 0];
    const teaching = buildSystemTeaching(A, b, "en");
    expect(teaching.parameters).toEqual(["k_{1}", "k_{2}", "k_{3}"]);
    expect(teaching.solutionLatex).toContain(
      "x_{1} = 5 - 2k_{1} - 3k_{2} - 4k_{3}"
    );
    const collision = buildSystemTeaching(
      [
        [1, 2],
        [2, 4],
      ],
      [3, 6],
      "en",
      ["k", "β"]
    );
    expect(collision.parameters).toEqual(["t"]);
    expect(collision.solutionLatex).toBe("k = 3 - 2t,\\quad \\beta = t");
    expect(
      collision.steps.some(step =>
        step.latex?.includes("\\beta=t\\in\\mathbb{R}")
      )
    ).toBe(true);
    expect(
      collision.steps.some(step => step.latex?.includes("k = 3 - 2t"))
    ).toBe(true);
    const indexed = validateSystemVariables(["k1", "x2", "x3"]).variables;
    expect(systemParameterNames(2, indexed)).toEqual(["t_{1}", "t_{2}"]);
    expect(systemParameterNames(0, defaultSystemVariables(2))).toEqual([]);
  });

  it("formats tiny exact general coefficients without floating-point zero/unit tests", () => {
    expect(
      systemGeneralLatex(
        [
          {
            varIndex: 0,
            constant: 0,
            constantLatex: "0",
            kCoeffs: [1e-13, -1],
            kCoeffsLatex: ["\\frac{1}{10000000000000}", "-1"],
          },
        ],
        validateSystemVariables(["α"]).variables,
        ["k_{1}", "k_{2}"]
      )
    ).toBe("\\alpha = \\frac{1}{10000000000000}k_{1} - k_{2}");
  });

  it("validates Latin/lowercase Greek names, aliases, duplicates and injection", () => {
    expect(
      validateSystemVariables(["a", "β", "\\lambda", "Z_2"]).variables.map(
        value => value.latex
      )
    ).toEqual(["a", "\\beta", "\\lambda", "Z_{2}"]);
    expect(validateSystemVariables(["α", "\\alpha"]).error).toBe("duplicate");
    expect(validateSystemVariables(["x1", "x_01"]).error).toBe("duplicate");
    expect(validateSystemVariables(["o", "ο"]).error).toBe("duplicate");
    for (const value of [
      "",
      "ab",
      "Γ",
      "\\text{bad}",
      "x^{2}",
      "\\href{evil}{x}",
      "x\\beta",
      "<script>",
      "\\input",
      "\\alpha{}",
      "x_1234",
    ])
      expect(validateSystemVariables([value]).valid).toBe(false);
    expect(() =>
      buildSystemTeaching(
        [
          [1, 0],
          [0, 1],
        ],
        [1, 2],
        "en",
        ["a", "a"]
      )
    ).toThrow();
    for (const symbol of [
      "α",
      "β",
      "γ",
      "δ",
      "ε",
      "ϵ",
      "ζ",
      "η",
      "θ",
      "ϑ",
      "ι",
      "κ",
      "λ",
      "μ",
      "ν",
      "ξ",
      "ο",
      "π",
      "ϖ",
      "ρ",
      "ϱ",
      "σ",
      "ς",
      "τ",
      "υ",
      "φ",
      "ϕ",
      "χ",
      "ψ",
      "ω",
    ]) {
      const variable = validateSystemVariables([symbol]).variables[0];
      expect(() =>
        katex.renderToString(variable.latex, { throwOnError: true })
      ).not.toThrow();
    }
  });

  it("retains detailed Gaussian operations and explicit contradiction/general family", () => {
    const A = [
        [2, 2, 4],
        [0, 3, 3],
        [0, 0, 0],
      ],
      b = [2, 3, 0];
    const teaching = buildSystemTeaching(A, b, "en", ["a", "β", "γ"]);
    expect(
      teaching.steps.filter(step =>
        /before reading|including the constant/.test(step.description)
      )
    ).toHaveLength(3);
    expect(teaching.steps.at(-1)?.latex).toBe(teaching.solutionLatex);
    expect(
      teaching.steps.some(step => /x_\{|\bx\d/.test(step.latex ?? ""))
    ).toBe(false);
    const none = buildSystemTeaching(
      [
        [1, 1],
        [2, 2],
      ],
      [1, 3],
      "en",
      ["a", "β"]
    );
    expect(none.steps.at(-1)?.description).toContain("Contradiction");
    expect(none.steps.at(-1)?.latex).toMatch(/0 = -?\\?frac|0 = -?\d/);
    expect(none.solutionLatex).toBeUndefined();
  });

  it("rejects source/model mismatch rather than quietly showing inconsistent teaching", () => {
    const A = [
        [1, 0],
        [0, 1],
      ],
      b = [1, 2];
    const source = solveLinearSystem(A, b);
    expect(() =>
      buildSystemTeaching(A, b, "en", undefined, { ...source, type: "none" })
    ).toThrow(/mismatch/);
    expect(() =>
      buildSystemTeaching(A, b, "en", undefined, {
        ...source,
        solutionLatex: ["0", "0"],
      })
    ).toThrow(/mismatch/);
    expect(() => classifySystemExactly([[1], [1, 2]], [1, 2])).toThrow();
    expect(() => classifySystemExactly([[Infinity]], [0])).toThrow();
    expect(() => classifySystemExactly([], [])).toThrow();
  });

  it("renders all determinant and Gaussian steps in KaTeX; English has no CJK", () => {
    for (const n of [2, 3, 4, 5]) {
      const A = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) =>
          i === j ? n + i : ((i + j) % 3) - 1
        )
      );
      const b = Array.from({ length: n }, (_, i) => i + 1);
      for (const lang of ["zh", "en"] as const) {
        const teaching = buildSystemTeaching(
          A,
          b,
          lang,
          ["α", "β", "c", "d", "e"].slice(0, n)
        );
        for (const step of [...teaching.steps, ...teaching.gaussianSteps]) {
          for (const expression of [step.latex, step.snapshotLatex])
            if (expression)
              expect(() =>
                katex.renderToString(expression, {
                  throwOnError: true,
                  strict: false,
                })
              ).not.toThrow();
          if (lang === "en")
            expect(cjk.test(step.description + (step.latex ?? ""))).toBe(false);
        }
      }
    }
    for (const preset of SYSTEM_PRESETS) {
      const teaching = buildSystemTeaching(
        preset.A.map(row => [...row]),
        [...preset.b],
        "en"
      );
      teaching.steps.forEach(step => {
        if (step.latex)
          expect(() =>
            katex.renderToString(step.latex!, {
              throwOnError: true,
              strict: false,
            })
          ).not.toThrow();
        expect(cjk.test(step.description)).toBe(false);
      });
    }
  });

  it("preserves scoped input invalidation, independent players and progressive disclosure", () => {
    const page = readFileSync(
      new URL("../pages/LinearSystemPage.tsx", import.meta.url),
      "utf8"
    );
    expect(page).toContain("systems-workspace");
    expect(page.match(/<StepDisplay\s/g)).toHaveLength(3);
    for (const method of ["Primary", "Gaussian", "Inverse"]) {
      expect(page).toContain(`const on${method}StepChange = useCallback`);
      expect(page).toContain(`onStepChange={on${method}StepChange}`);
    }
    expect(page).not.toMatch(/setInterval|setTimeout|slice\(0, 8\)/);
    expect(page).toContain("<details");
    expect(page).toContain("setSolvedInput(null)");
    expect(page).toMatch(/buildSystemTeaching\(\s*coefficients,\s*constants/);
  });
});
