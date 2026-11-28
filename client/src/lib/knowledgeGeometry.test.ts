import { describe, expect, it } from "vitest";
import katex from "katex";
import { phase20KnowledgeTopics } from "./Phase20knowledge";
import { knowledgeGeometry } from "./knowledgeGeometry";

describe("geometric meaning for every knowledge item", () => {
  for (const topic of phase20KnowledgeTopics) {
    for (const item of topic.items) {
      it(`${item.id} has localized geometry with strict LaTeX`, () => {
        const entry = knowledgeGeometry[item.id];
        expect(entry).toBeDefined();
        expect(entry.zh.length).toBeGreaterThan(20);
        expect(entry.en.length).toBeGreaterThan(30);
        expect(entry.en).not.toMatch(/[\u3400-\u9fff]/);
        expect(entry.latex).not.toMatch(/[\u3400-\u9fff]/);
        expect(() =>
          katex.renderToString(entry.latex, { throwOnError: true })
        ).not.toThrow();
      });
    }
  }
  it("does not invent geometry for an unknown item", () => {
    expect(knowledgeGeometry["unknown"]).toBeUndefined();
  });
  it("distinguishes transpose of entries from reflection of a plane", () => {
    expect(knowledgeGeometry["matrix-transpose"].en).toContain(
      "not generally a reflection"
    );
  });
  it("keeps point-defined spatial angles free of plane equations", () => {
    expect(knowledgeGeometry["vec-line-plane-angle"].en).toContain(
      "not a plane equation"
    );
    expect(knowledgeGeometry["vec-plane-plane-angle"].en).toContain(
      "four or more points"
    );
  });
  it("calls the cross product a vector product, not an outer product", () => {
    const card = phase20KnowledgeTopics
      .flatMap(topic => topic.items)
      .find(item => item.id === "vec-cross")!;
    expect(card.titleEn).toBe("Cross Product (Vector Product)");
    expect(card.descriptionEn).toContain("not the matrix-valued outer product");
    expect(card.descriptionEn).toContain("no normal direction");
  });
  it("does not assign a geometric angle to the zero vector", () => {
    for (const id of ["vec-dot", "vec-angle"]) {
      const card = phase20KnowledgeTopics
        .flatMap(topic => topic.items)
        .find(item => item.id === id)!;
      expect(card.descriptionEn).toContain("undefined");
      expect(card.descriptionZh).toContain("未定義");
    }
  });
});
