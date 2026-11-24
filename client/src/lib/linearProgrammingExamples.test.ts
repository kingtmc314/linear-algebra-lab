import { describe, expect, it } from "vitest";
import katex from "katex";
import {
  generateLPPractice,
  linearProgrammingExamples,
  lpChoiceMatches,
  lpExampleCorrectChoice,
  lpExampleNumericAnswer,
} from "./linearProgrammingExamples";
import {
  solveLinearProgram,
  solveCoefficientTarget,
  solveConstantTarget,
  linearProgramSteps,
} from "./linearProgramming";
import { ratToStr } from "./rational";

const cases = ([1, 2, 3] as const).flatMap(level =>
  Array.from({ length: 50 }, (_, index) => ({ level, index }))
);

describe("Supplied linear-programming MC examples", () => {
  it("2020 Q36: minimum base -13, k=37, choice C", () => {
    const example = linearProgrammingExamples[0];
    const result = solveLinearProgram(example.input);
    expect(result.vertices).toHaveLength(4);
    expect(ratToStr(result.min.value!)).toBe("-13");
    expect(ratToStr(result.max.value!)).toBe("-1");
    expect(lpExampleNumericAnswer(example)).toBe("37");
    expect(lpExampleCorrectChoice(example)).toBe(2);
    expect(lpChoiceMatches(example, "74/2")).toBe(true);
    expect(lpChoiceMatches(example, "25")).toBe(false);
  });
  it("2023 Q37: complete beta range is beta>=4, NOT beta>=-10", () => {
    const example = linearProgrammingExamples[1];
    const answer = solveCoefficientTarget(example.input, "max", 24, "a", "en", {
      parameter: "β",
    });
    expect(answer.status).toBe("solved");
    expect(answer.intervals).toHaveLength(1);
    expect(ratToStr(answer.intervals[0].lower!)).toBe("4");
    expect(answer.intervals[0].upper).toBeNull();
    expect(answer.intervals[0].lowerClosed).toBe(true);
    expect(lpExampleCorrectChoice(example)).toBe(3);
    expect(lpChoiceMatches(example, String.raw`\beta\geq 4`)).toBe(true);
    expect(lpChoiceMatches(example, "β≥4")).toBe(true);
    expect(lpChoiceMatches(example, String.raw`\beta\ge-10`)).toBe(false);
    for (const [beta, maximum] of [
      [3, "27"],
      [4, "24"],
      [5, "24"],
      [100, "24"],
    ] as const) {
      const result = solveLinearProgram({
        ...example.input,
        objective: { ...example.input.objective, a: beta },
      });
      expect(ratToStr(result.max.value!)).toBe(maximum);
    }
  });
  it("2024 Q37: source-checked 5x-2y+c gives c=25, choice C", () => {
    const example = linearProgrammingExamples[2];
    expect(example.input.objective.a).toBe(5);
    expect(example.uncertain).not.toBe(true);
    const result = solveLinearProgram(example.input);
    expect(result.vertices).toHaveLength(3);
    expect(ratToStr(result.min.value!)).toBe("-3");
    expect(lpExampleNumericAnswer(example)).toBe("25");
    expect(lpExampleCorrectChoice(example)).toBe(2);
  });
});

describe("Original deterministic practice bank", () => {
  for (const level of [1, 2, 3] as const) {
    it(`Level ${level}: 50 distinct mathematical inputs, reproducible generation`, () => {
      const inputs = Array.from({ length: 50 }, (_, index) =>
        generateLPPractice(level, index)
      );
      expect(
        new Set(
          inputs.map(q => JSON.stringify([q.input, q.task, q.goal, q.target]))
        ).size
      ).toBe(50);
      expect(generateLPPractice(level, 17)).toEqual(
        generateLPPractice(level, 17)
      );
      expect(generateLPPractice(level, 51).id).not.toBe(
        generateLPPractice(level, 1).id
      );
      const followup = generateLPPractice(level, 50);
      expect(followup.input).not.toEqual(generateLPPractice(level, 0).input);
      expect(lpExampleCorrectChoice(followup)).toBeGreaterThanOrEqual(0);
      expect(inputs.every(q => q.difficulty === level)).toBe(true);
    });
  }
  it.each(cases)(
    "Level $level question $index has exactly one computed MC answer and six valid steps",
    ({ level, index }) => {
      const example = generateLPPractice(level, index);
      const result = solveLinearProgram(example.input);
      expect(result.feasible).toBe(true);
      expect(result.regionBounded).toBe(true);
      expect(result.min.status).toBe("finite");
      expect(result.max.status).toBe("finite");
      expect(example.choices).toHaveLength(4);
      expect(new Set(example.choices).size).toBe(4);
      const correct = lpExampleCorrectChoice(example);
      expect(correct).toBeGreaterThanOrEqual(0);
      expect(
        example.choices.filter(choice => lpChoiceMatches(example, choice))
      ).toHaveLength(1);
      if (level === 2 || (level === 1 && example.task === "constant")) {
        expect(lpExampleNumericAnswer(example)).toBe(String(5 + index));
      }
      if (level === 3) {
        const answer = solveCoefficientTarget(
          example.input,
          "max",
          example.target,
          "a",
          "en",
          { parameter: "β" }
        );
        expect(ratToStr(answer.intervals[0].lower!)).toBe(
          String((1 + (index % 6)) * (1 + (index % 7)))
        );
        expect(answer.intervals[0].upper).toBeNull();
      }
      expect(/[\u3400-\u9fff]/u.test(example.titleEn + example.noteEn)).toBe(
        false
      );
      const steps =
        example.task === "coefficient"
          ? solveCoefficientTarget(
              example.input,
              example.goal,
              example.target,
              example.coefficient,
              "en",
              { parameter: example.parameter }
            ).steps
          : example.task === "constant"
            ? solveConstantTarget(result, example.goal, example.target, "en", {
                constant: example.parameter,
              }).steps
            : linearProgramSteps(result, example.goal, "en");
      expect(steps).toHaveLength(6);
      for (const step of steps) {
        expect(/[\u3400-\u9fff]/u.test(step.description)).toBe(false);
        if (step.latex)
          expect(() =>
            katex.renderToString(step.latex!, { throwOnError: true })
          ).not.toThrow();
      }
      for (const choice of example.choices)
        expect(() =>
          katex.renderToString(choice, { throwOnError: true })
        ).not.toThrow();
    }
  );
  it("rejects invalid difficulty/index and malformed choices", () => {
    expect(() => generateLPPractice(0 as 1, 0)).toThrow();
    expect(() => generateLPPractice(1, -1)).toThrow();
    expect(() => generateLPPractice(1, 0.5)).toThrow();
    expect(() => generateLPPractice(1, Infinity)).toThrow();
    expect(lpChoiceMatches(linearProgrammingExamples[0], "1/0")).toBe(false);
    expect(lpChoiceMatches(linearProgrammingExamples[1], "garbage")).toBe(
      false
    );
  });
});
