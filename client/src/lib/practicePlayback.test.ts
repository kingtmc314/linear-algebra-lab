import { describe, expect, it } from "vitest";
import katex from "katex";
import { generateMatrixQuestion, generateVectorQuestion, generateLinearSystemQuestion, generateEigenQuestion } from "./practiceGenerator";
import { getDseVectorPracticeQuestions } from "./dseVectorPractice";
import { splitSolutionLatex } from "./derivationPlayback";

const render = (latex: string) => katex.renderToString(latex, { throwOnError: true, strict: "ignore" });
describe("all practice derivations", () => {
  it("every random question type has real mathematical solution steps", () => {
    const questions = [
      ...(["add", "sub", "mul", "transpose", "det", "inv", "scalar"] as const).map(type => generateMatrixQuestion(type, "en")),
      ...(["add", "sub", "dot", "cross", "magnitude"] as const).map(type => generateVectorQuestion(type, "en")),
      generateLinearSystemQuestion("en"), generateEigenQuestion("en"),
    ];
    expect(questions).toHaveLength(14);
    questions.forEach(question => {
      expect(question.solutionSteps?.length).toBeGreaterThan(1);
      question.solutionSteps?.forEach(step => {
        expect(step.descriptionEn ?? step.description).toBeTruthy();
        expect(step.descriptionEn ?? step.description).not.toMatch(/[\u3400-\u9fff]/);
        expect(() => render(step.latex!)).not.toThrow();
      });
    });
  });
  it("all DSE mark-scheme rows preserve matrices and render independently", () => {
    getDseVectorPracticeQuestions("en").forEach(question => {
      const rows = splitSolutionLatex(question.solutionLatex!);
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach(latex => expect(() => render(latex)).not.toThrow());
    });
  });
});
