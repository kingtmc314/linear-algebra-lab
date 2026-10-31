import { describe, expect, it } from "vitest";
import { getDseVectorPracticeQuestions } from "./dseVectorPractice";

describe("DSE-style vector practice bank", () => {
  const questions = getDseVectorPracticeQuestions("zh");

  it("covers 2D vectors, 3D vectors, and all four triangle centres", () => {
    expect(questions.filter((question) => question.topic === "2d")).toHaveLength(4);
    expect(questions.filter((question) => question.topic === "3d")).toHaveLength(4);
    expect(questions.filter((question) => question.topic === "centers")).toHaveLength(4);
    expect(new Set(questions.map((question) => question.id)).size).toBe(12);
  });

  it("accepts vector answers including rational coordinates", () => {
    expect(questions.find((question) => question.id === "2d-resultant")?.checkAnswer("2 6")).toBe(true);
    expect(questions.find((question) => question.id === "centers-centroid")?.checkAnswer("(2, 1)")).toBe(true);
    expect(questions.find((question) => question.id === "2d-section-formula")?.checkAnswer("5; 4")).toBe(true);
    expect(questions.find((question) => question.id === "centers-centroid")?.checkAnswer("2 2")).toBe(false);
  });

  it("requires the exact radical form where the DSE-style question asks for it", () => {
    const areaQuestion = questions.find((question) => question.id === "3d-triangle-area");
    expect(areaQuestion?.checkAnswer("5√3/2")).toBe(true);
    expect(areaQuestion?.checkAnswer("5sqrt3/2")).toBe(true);
    expect(areaQuestion?.checkAnswer("4.3301")).toBe(false);
  });

  it("provides bilingual question wording and a step-by-step mark scheme", () => {
    const english = getDseVectorPracticeQuestions("en");
    expect(english).toHaveLength(12);
    expect(english.every((question) => Boolean(question.solutionLatex && question.skillEn))).toBe(true);
    expect(questions.every((question) => Boolean(question.solutionLatex && question.skillZh))).toBe(true);
  });
});
