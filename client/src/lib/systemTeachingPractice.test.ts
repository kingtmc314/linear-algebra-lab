import { describe, expect, it } from "vitest";
import katex from "katex";
import { generateLinearSystemQuestion } from "./practiceGenerator";

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe("system practice vocabulary and exact worked methods", () => {
  it("covers five basic taxonomy presets and rectangular consistent/inconsistent cases", () => {
    const answers = [
      "consistent nonhomogeneous unique",
      "consistent nonhomogeneous infinite",
      "inconsistent nonhomogeneous none",
      "consistent homogeneous unique",
      "consistent homogeneous infinite",
      "consistent nonhomogeneous unique",
      "inconsistent nonhomogeneous none",
    ];
    for (let preset = 0; preset < 7; preset++) {
      const question = generateLinearSystemQuestion("en", {
        variant: "classify",
        preset,
        random: () => 0,
      });
      expect(question.checkAnswer(answers[preset])).toBe(true);
      expect(question.checkAnswer(question.answerDisplay)).toBe(true);
      expect(question.checkAnswer(answers[preset] + " wrong")).toBe(false);
      expect(
        question.checkAnswer(
          "consistent inconsistent homogeneous nonhomogeneous unique infinite none"
        )
      ).toBe(false);
      expect(question.solutionSteps!.length).toBeGreaterThan(8);
      const method = generateLinearSystemQuestion("en", {
        variant: "method",
        preset,
        random: () => 0,
      });
      const isUnique = [0, 3, 5].includes(preset);
      expect(
        method.checkAnswer(isUnique ? "Cramer's rule" : "Gaussian elimination")
      ).toBe(true);
      expect(method.checkAnswer(isUnique ? "gaussian" : "cramer")).toBe(false);
      expect(method.checkAnswer("cramer gaussian")).toBe(false);
    }
  });

  it("checks bilingual keywords without substring or opposite-keyword false positives", () => {
    const none = generateLinearSystemQuestion("zh", {
      variant: "classify",
      preset: 2,
      random: () => 0,
    });
    expect(none.checkAnswer("不相容 非齊次 無解")).toBe(true);
    expect(none.checkAnswer("inconsistent non-homogeneous no solution")).toBe(
      true
    );
    expect(none.checkAnswer("consistent nonhomogeneous none")).toBe(false);
    const infinite = generateLinearSystemQuestion("zh", {
      variant: "classify",
      preset: 4,
      random: () => 0,
    });
    expect(infinite.checkAnswer("齊次，無限多解，相容")).toBe(true);
    expect(
      infinite.checkAnswer("consistent homogeneous infinitely many solutions")
    ).toBe(true);
    const cramer = generateLinearSystemQuestion("zh", {
      variant: "method",
      preset: 0,
      random: () => 0,
    });
    expect(cramer.checkAnswer("克拉瑪法則")).toBe(true);
    const gaussian = generateLinearSystemQuestion("zh", {
      variant: "method",
      preset: 1,
      random: () => 0,
    });
    expect(gaussian.checkAnswer("高斯消去法")).toBe(true);
  });

  it("constructs original 2/3 unknown unique solve exercises with exact Cramer steps", () => {
    for (let seed = 0; seed < 24; seed++) {
      const question = generateLinearSystemQuestion("en", {
        variant: "solve",
        random: seeded(seed),
      });
      expect(question.checkAnswer(question.answerDisplay)).toBe(true);
      expect(
        question.checkAnswer(
          question.answerDisplay
            .split(" ")
            .map(value => `${Number(value) * 2}/2`)
            .join(" ")
        )
      ).toBe(true);
      expect(
        question.checkAnswer(
          question.answerDisplay
            .split(" ")
            .map(value => value + ".0")
            .join(" ")
        )
      ).toBe(true);
      expect(question.checkAnswer("not a number")).toBe(false);
      expect(question.checkAnswer(question.answerDisplay + " 0")).toBe(false);
      expect(
        question.checkAnswer(question.answerDisplay.replace(/^-?\d+/, "0/0"))
      ).toBe(false);
      expect(
        question.solutionSteps!.some(step =>
          /replace column/i.test(step.description ?? "")
        )
      ).toBe(true);
      expect(
        question.solutionSteps!.some(step =>
          step.latex?.includes("\\frac{\\det(A_")
        )
      ).toBe(true);
      expect(
        question.solutionSteps!.filter(step =>
          step.description?.includes("Substitute into original equation")
        )
      ).toHaveLength(question.answerDisplay.split(" ").length);
    }
  });

  it("is bounded with constant and invalid RNGs and deterministic with seeded generation", () => {
    for (const random of [() => 0, () => 1, () => NaN, () => -1]) {
      for (const variant of ["solve", "classify", "method"] as const) {
        const question = generateLinearSystemQuestion("en", {
          random,
          variant,
        });
        expect(question.checkAnswer(question.answerDisplay)).toBe(true);
      }
    }
    const first = generateLinearSystemQuestion("en", { random: seeded(42) });
    const second = generateLinearSystemQuestion("en", { random: seeded(42) });
    expect(first.questionLatex).toBe(second.questionLatex);
    expect(first.answerDisplay).toBe(second.answerDisplay);
  });

  it("renders all generated formulas and keeps English prompts/explanations CJK-free", () => {
    const rng = seeded(1234);
    const types = new Set<string>();
    for (let i = 0; i < 48; i++) {
      const question = generateLinearSystemQuestion("en", { random: rng });
      types.add(question.questionLatex.split(":")[0]);
      for (const expression of [
        question.questionLatex,
        question.answerLatex,
        ...question.solutionSteps!.map(step => step.latex),
      ]) {
        if (expression)
          expect(() =>
            katex.renderToString(expression, {
              throwOnError: true,
              strict: false,
            })
          ).not.toThrow();
      }
      expect(
        /[\u3400-\u9fff]/.test(
          question.questionLatex + question.inputHint + question.answerLatex
        )
      ).toBe(false);
      question.solutionSteps!.forEach(step =>
        expect(/[\u3400-\u9fff]/.test(step.description ?? "")).toBe(false)
      );
      expect(question.checkAnswer(question.answerDisplay)).toBe(true);
    }
    expect(types.size).toBe(3);
  });
});
