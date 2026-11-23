import { describe, expect, it } from "vitest";
import katex from "katex";
import { readFileSync } from "node:fs";
import { knowledgeTopics } from "./knowledgeData";
import {
  buildKnowledgeLesson,
  matchesKnowledgeQuery,
  phase20KnowledgeTopics,
  spatialKnowledgeItems,
} from "./Phase20knowledge";
import { add, div, mul, rat, sub, type Rational } from "./rational";

const allItems = phase20KnowledgeTopics.flatMap(topic => topic.items);
const findItem = (id: string) => {
  const item = allItems.find(item => item.id === id);
  if (!item) throw new Error(`Missing concept ${id}`);
  return item;
};

function readExactAugmentedArray(latex: string): Rational[][] {
  const body = latex.match(
    /\\begin\{array\}\{cc\|cc\}([\s\S]*?)\\end\{array\}/
  )?.[1];
  if (!body) throw new Error(`Missing augmented matrix: ${latex}`);
  return body.split(String.raw`\\`).map(row =>
    row.split("&").map(cell => {
      const normalized = cell.trim();
      const fraction = normalized.match(
        /^(-?)\\frac(?:\{(\d+)\}|(\d))(?:\{(\d+)\}|(\d))$/
      );
      if (fraction)
        return rat(
          BigInt(`${fraction[1]}${fraction[2] ?? fraction[3]}`),
          BigInt(fraction[4] ?? fraction[5])
        );
      return rat(BigInt(normalized));
    })
  );
}

function multiply(a: Rational[][], b: Rational[][]): Rational[][] {
  return a.map(row =>
    b[0].map((_, col) =>
      row.reduce(
        (sum, entry, index) => add(sum, mul(entry, b[index][col])),
        rat(0)
      )
    )
  );
}

describe("Phase20knowledge bilingual teaching lessons", () => {
  it("retains the original categories and all 23 concepts, adding only two spatial-angle cards", () => {
    expect(phase20KnowledgeTopics.map(topic => topic.slug)).toEqual(
      knowledgeTopics.map(topic => topic.slug)
    );
    expect(allItems).toHaveLength(25);
    const originals = knowledgeTopics.flatMap(topic => topic.items);
    expect(originals).toHaveLength(23);
    originals.forEach(item => expect(findItem(item.id)).toBe(item));
    expect(new Set(allItems.map(item => item.id)).size).toBe(25);
  });

  it.each(["zh", "en"] as const)(
    "gives every concept variable context, original formula and explanation, and reviewed example steps in %s",
    lang => {
      for (const item of allItems) {
        const lesson = buildKnowledgeLesson(item, lang);
        expect(lesson.conceptSteps.length, item.id).toBeGreaterThanOrEqual(3);
        expect(
          lesson.conceptSteps[0].description.length,
          item.id
        ).toBeGreaterThan(30);
        expect(
          lesson.conceptSteps.map(step => step.latex),
          item.id
        ).toContain(item.formula);
        expect(lesson.conceptSteps.at(-1)?.description).toBe(
          lang === "zh" ? item.descriptionZh : item.descriptionEn
        );
        expect(lesson.exampleSteps.length, item.id).toBeGreaterThanOrEqual(3);
        expect(lesson.exampleSteps.at(-1)?.latex).toBe(
          lang === "zh" ? item.exampleZh : item.exampleEn
        );
        expect(
          lesson.exampleSteps.slice(0, -1).every(step => Boolean(step.latex))
        ).toBe(true);
      }
    }
  );

  it("does not mutate existing bilingual data while constructing repeatable steps", () => {
    const before = JSON.stringify(knowledgeTopics);
    for (const item of allItems) {
      expect(buildKnowledgeLesson(item, "zh")).toEqual(
        buildKnowledgeLesson(item, "zh")
      );
      const zh = buildKnowledgeLesson(item, "zh");
      const en = buildKnowledgeLesson(item, "en");
      expect(zh.conceptSteps[0].description).not.toBe(
        en.conceptSteps[0].description
      );
      expect(zh.exampleSteps[0].description).not.toBe(
        en.exampleSteps[0].description
      );
      expect(zh.exampleSteps.slice(0, -1).map(step => step.latex)).toEqual(
        en.exampleSteps.slice(0, -1).map(step => step.latex)
      );
    }
    expect(JSON.stringify(knowledgeTopics)).toBe(before);
  });

  it.each(["zh", "en"] as const)(
    "renders all original formulas and new exact snapshots with KaTeX in %s",
    lang => {
      for (const item of allItems) {
        const lesson = buildKnowledgeLesson(item, lang);
        for (const snapshot of [
          ...lesson.conceptSteps,
          ...lesson.exampleSteps.slice(0, -1),
        ]) {
          if (snapshot.latex) {
            expect(
              () =>
                katex.renderToString(snapshot.latex!, {
                  throwOnError: true,
                  strict: false,
                }),
              `${item.id}: ${snapshot.latex}`
            ).not.toThrow();
          }
        }
      }
    }
  );

  it("verifies every inverse matrix snapshot by exact rational row operations", () => {
    const steps = buildKnowledgeLesson(
      findItem("matrix-inverse"),
      "en"
    ).exampleSteps;
    const snapshots = steps
      .slice(0, 5)
      .map(step => readExactAugmentedArray(step.latex!));
    const expected = [
      [rat(2), rat(1), rat(1), rat(0)],
      [rat(5), rat(3), rat(0), rat(1)],
    ];
    expect(snapshots[0]).toEqual(expected);
    expected[0] = expected[0].map(value => div(value, rat(2)));
    expect(snapshots[1]).toEqual(expected);
    expected[1] = expected[1].map((value, col) =>
      sub(value, mul(rat(5), expected[0][col]))
    );
    expect(snapshots[2]).toEqual(expected);
    expected[1] = expected[1].map(value => mul(value, rat(2)));
    expect(snapshots[3]).toEqual(expected);
    expected[0] = expected[0].map((value, col) =>
      sub(value, div(expected[1][col], rat(2)))
    );
    expect(snapshots[4]).toEqual(expected);
    const a = snapshots[0].map(row => row.slice(0, 2));
    const inverse = snapshots[4].map(row => row.slice(2));
    const identity = [
      [rat(1), rat(0)],
      [rat(0), rat(1)],
    ];
    expect(multiply(a, inverse)).toEqual(identity);
    expect(multiply(inverse, a)).toEqual(identity);
  });

  it("checks exact Gaussian-elimination fractions and both original equations", () => {
    const half = rat(1, 2);
    expect(sub(rat(1), mul(half, rat(2)))).toEqual(rat(0));
    expect(sub(rat(3), mul(half, rat(1)))).toEqual(rat(5, 2));
    expect(sub(rat(10), mul(half, rat(5)))).toEqual(rat(15, 2));
    const y = div(rat(15, 2), rat(5, 2));
    const x = div(sub(rat(5), y), rat(2));
    expect([x, y]).toEqual([rat(1), rat(3)]);
    expect(add(mul(rat(2), x), y)).toEqual(rat(5));
    expect(add(x, mul(rat(3), y))).toEqual(rat(10));
    const lesson = buildKnowledgeLesson(findItem("ls-gaussian"), "en");
    expect(lesson.exampleSteps.map(step => step.latex).join("\n")).toContain(
      String.raw`y=\frac{15/2}{5/2}=3,\quad x=\frac{5-y}{2}=1`
    );
  });

  it("supplies the previously implicit eigenspace matrix and distinguishes zero from eigenvectors", () => {
    const lesson = buildKnowledgeLesson(findItem("matrix-eigen-space"), "en");
    expect(lesson.conceptSteps[0].description).toContain("A=[[4,1],[2,3]]");
    expect(lesson.exampleSteps[0].latex).toContain(
      String.raw`A-5I=\begin{bmatrix}-1&1\\2&-2\end{bmatrix}`
    );
    expect(lesson.exampleSteps[2].description).toContain("only t≠0");
  });

  it("keeps terminating unit-vector decimals exact and adds reduced fractional equivalents", () => {
    const lesson = buildKnowledgeLesson(findItem("vec-unit"), "en");
    expect(lesson.conceptSteps[0].description).toContain("not approximations");
    expect(lesson.exampleSteps[1].latex).toContain(
      String.raw`\begin{pmatrix}\frac35\\\frac45\end{pmatrix}`
    );
    expect(add(mul(rat(3, 5), rat(3, 5)), mul(rat(4, 5), rat(4, 5)))).toEqual(
      rat(1)
    );
    expect(lesson.exampleSteps.at(-1)?.latex).toBe(
      findItem("vec-unit").exampleEn
    );
  });

  it("distinguishes plane–plane cosine from line–plane sine using nonzero vector definitions and exact angles", () => {
    const [planes, linePlane] = spatialKnowledgeItems;
    expect(planes.formula).toContain(String.raw`\arccos`);
    expect(planes.formula).toContain(String.raw`|\mathbf n_1\cdot\mathbf n_2|`);
    expect(linePlane.formula).toContain(String.raw`\arcsin`);
    expect(linePlane.formula).toContain(String.raw`|\mathbf u\cdot\mathbf n|`);
    for (const item of spatialKnowledgeItems) {
      const lesson = buildKnowledgeLesson(item, "en");
      expect(lesson.conceptSteps[0].description).toContain("≠0");
      expect(lesson.exampleSteps.at(-2)?.latex).toContain(
        String.raw`\frac\pi4=45^\circ`
      );
    }
    expect(
      buildKnowledgeLesson(linePlane, "en").exampleSteps[1].latex
    ).toContain(String.raw`\alpha=\frac\pi2-\beta`);
  });

  it("preserves bilingual title/description search and adds condition/tag search with normalized whitespace", () => {
    expect(matchesKnowledgeQuery(findItem("matrix-mul"), "矩陣乘法")).toBe(
      true
    );
    expect(
      matchesKnowledgeQuery(findItem("matrix-mul"), "  MULTIPLICATION  ")
    ).toBe(true);
    expect(
      matchesKnowledgeQuery(findItem("matrix-mul"), "k runs from 1 to n")
    ).toBe(true);
    expect(
      matchesKnowledgeQuery(findItem("vec-plane-plane-angle"), "法向量")
    ).toBe(true);
    expect(
      matchesKnowledgeQuery(findItem("vec-line-plane-angle"), "spatial")
    ).toBe(true);
    expect(allItems.every(item => matchesKnowledgeQuery(item, "   "))).toBe(
      true
    );
    expect(
      allItems.some(item => matchesKnowledgeQuery(item, "no-such-concept-927"))
    ).toBe(false);
  });

  it("uses only the shared player for both lesson paths and does not make player clicks collapse a card", () => {
    const page = readFileSync(
      new URL("../pages/KnowledgePage.tsx", import.meta.url),
      "utf8"
    );
    expect(page).toContain(
      'import StepDisplay from "@/components/StepDisplay"'
    );
    expect(page).toContain("steps={lesson.conceptSteps}");
    expect(page).toContain("steps={lesson.exampleSteps}");
    expect(page).toContain('href="/vector?tab=spatial"');
    expect(page).not.toMatch(
      /setInterval|setTimeout|requestAnimationFrame|onStepChange|\.steps\.map/
    );
    expect(page).not.toMatch(/<Card\s[^>]*onClick=/);
    expect(page).toContain("aria-expanded={expanded}");
    expect(page).toContain("aria-pressed={activeFilter === filter.slug}");
    expect(page).toContain("sm:col-span-2 xl:col-span-3");
    expect(page).toContain("overflow-x-auto");
  });
});
