import { describe, expect, it } from "vitest";
import { phase20KnowledgeTopics } from "./Phase20knowledge";
import { knowledgeAnimationFor } from "./knowledgeAnimationRegistry";

describe("knowledge diagram coverage", () => {
  for (const topic of phase20KnowledgeTopics) {
    for (const item of topic.items) {
      it(`${topic.slug}/${item.id} has an animated diagram`, () => {
        expect(knowledgeAnimationFor(item.id)).toBeDefined();
      });
    }
  }
  it("retains the existing pure-vector spatial animations", () => {
    expect(knowledgeAnimationFor("vec-plane-plane-angle")).toBe("spatial");
    expect(knowledgeAnimationFor("vec-line-plane-angle")).toBe("spatial");
  });
  it("does not silently substitute a wrong diagram for unknown knowledge", () => {
    expect(knowledgeAnimationFor("not-a-concept")).toBeUndefined();
  });
});
