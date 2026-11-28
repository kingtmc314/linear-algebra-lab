import { describe, expect, it } from "vitest";
import katex from "katex";
import { knowledgeTopics } from "./knowledgeData";
import { phase20KnowledgeTopics } from "./Phase20knowledge";
import {
  standaloneApps,
  standaloneBase,
  standaloneLanguageKey,
  standaloneOwnsPath,
  type StandaloneAppId,
  type StandaloneAppIcon,
} from "./standaloneApps";

const appIds: StandaloneAppId[] = [
  "systems-of-equations",
  "matrices",
  "vector",
];
const supportedIcons: StandaloneAppIcon[] = [
  "Sigma",
  "Grid3X3",
  "Compass",
  "Sparkles",
  "Zap",
  "Move",
  "Triangle",
  "GraduationCap",
  "BookOpen",
];

const ownedPaths: Record<StandaloneAppId, string[]> = {
  "systems-of-equations": ["/system", "/knowledge"],
  matrices: [
    "/matrix",
    "/eigen",
    "/matrix-power",
    "/transformation",
    "/knowledge",
  ],
  vector: [
    "/vector",
    "/vector?tab=spatial",
    "/vector?tab=centers",
    "/vector?tab=dse",
    "/knowledge",
  ],
};
const calculatorPaths = [
  "/system",
  "/matrix",
  "/eigen",
  "/matrix-power",
  "/transformation",
  "/vector",
];

describe("standalone app metadata", () => {
  it("has exactly three uniquely keyed independent apps", () => {
    expect(Object.keys(standaloneApps)).toEqual(appIds);
    expect(Object.values(standaloneApps).map(app => app.id)).toEqual(appIds);
    expect(new Set(Object.values(standaloneApps).map(app => app.id)).size).toBe(
      appIds.length
    );
  });

  it.each(appIds)("provides complete bilingual branding for %s", id => {
    const app = standaloneApps[id];
    expect(app.id).toBe(id);
    for (const field of [
      app.titleZh,
      app.titleEn,
      app.shortZh,
      app.shortEn,
      app.mark,
      app.formula,
    ]) {
      expect(field.trim()).not.toBe("");
    }
    expect(`${app.titleZh}${app.shortZh}`).toMatch(/[\u3400-\u9fff]/);
    expect(`${app.titleEn}${app.shortEn}`).not.toMatch(/[\u3400-\u9fff]/);
    expect(() =>
      katex.renderToString(app.formula, { throwOnError: true, strict: false })
    ).not.toThrow();
  });

  it.each(appIds)("preserves only owned tool navigation in %s", id => {
    const app = standaloneApps[id];
    expect(app.routes.map(route => route.path)).toEqual(ownedPaths[id]);
    expect(new Set(app.routes.map(route => route.path)).size).toBe(
      app.routes.length
    );
    expect(app.routes[0].path).toBe(app.primaryPath);
    expect(
      app.routes.filter(route => route.path === "/knowledge")
    ).toHaveLength(1);
    for (const route of app.routes) {
      expect(route.path.startsWith("/")).toBe(true);
      expect(route.path.startsWith("//")).toBe(false);
      expect(route.labelZh).toMatch(/[\u3400-\u9fff]/);
      expect(route.labelEn.trim()).not.toBe("");
      expect(route.labelEn).not.toMatch(/[\u3400-\u9fff]/);
      expect(supportedIcons).toContain(route.icon);
      expect(standaloneOwnsPath(id, route.path)).toBe(true);
    }
  });

  it("keeps each legacy calculator alias and all matrix-associated tools", () => {
    expect(appIds.map(id => standaloneApps[id].primaryPath)).toEqual([
      "/system",
      "/matrix",
      "/vector",
    ]);
    expect(standaloneApps.matrices.routes.map(route => route.path)).toEqual(
      expect.arrayContaining(["/eigen", "/matrix-power", "/transformation"])
    );
  });

  it("preserves vector spatial/3D, triangle-center, and DSE tab entry links", () => {
    const tabs = standaloneApps.vector.routes
      .filter(route => route.path.includes("?"))
      .map(route => {
        const [pathname, query] = route.path.split("?");
        expect(pathname).toBe("/vector");
        return new URLSearchParams(query).get("tab");
      });
    expect(tabs).toEqual(["spatial", "centers", "dse"]);
  });

  it("filters knowledge using only existing topic slugs with no overlap", () => {
    expect(standaloneApps["systems-of-equations"].topicSlugs).toEqual([
      "linear-system",
    ]);
    expect(standaloneApps.matrices.topicSlugs).toEqual(["matrix"]);
    expect(standaloneApps.vector.topicSlugs).toEqual(["vector"]);

    const assignedSlugs = appIds.flatMap(id => standaloneApps[id].topicSlugs);
    expect(new Set(assignedSlugs).size).toBe(assignedSlugs.length);
    expect([...assignedSlugs].sort()).toEqual(
      knowledgeTopics.map(topic => topic.slug).sort()
    );
    for (const id of appIds) {
      const filtered = phase20KnowledgeTopics.filter(topic =>
        standaloneApps[id].topicSlugs.includes(topic.slug)
      );
      expect(filtered.map(topic => topic.slug)).toEqual(
        standaloneApps[id].topicSlugs
      );
      expect(filtered.every(topic => topic.items.length > 0)).toBe(true);
    }
  });

  it("keeps eigen concepts with matrices and spatial concepts with vectors", () => {
    const matrixTopic = phase20KnowledgeTopics.find(topic =>
      standaloneApps.matrices.topicSlugs.includes(topic.slug)
    );
    expect(matrixTopic?.items.map(item => item.id)).toEqual(
      expect.arrayContaining([
        "matrix-eigen-def",
        "matrix-char-poly",
        "matrix-eigen-space",
      ])
    );
    const vectorTopic = phase20KnowledgeTopics.find(topic =>
      standaloneApps.vector.topicSlugs.includes(topic.slug)
    );
    expect(vectorTopic?.items.map(item => item.id)).toEqual(
      expect.arrayContaining(["vec-plane-plane-angle", "vec-line-plane-angle"])
    );
  });
});

describe("exact standalone route scopes", () => {
  it.each(appIds)("owns its root and knowledge routes in %s", id => {
    expect(standaloneOwnsPath(id, "/")).toBe(true);
    expect(standaloneOwnsPath(id, "/?tab=spatial#diagram")).toBe(true);
    expect(standaloneOwnsPath(id, "/knowledge?query=vector#concept")).toBe(
      true
    );
    expect(standaloneOwnsPath(id, standaloneApps[id].primaryPath)).toBe(true);
  });

  it.each(appIds)("denies every known cross-topic calculator in %s", id => {
    const owned = new Set(ownedPaths[id].map(path => path.split(/[?#]/, 1)[0]));
    for (const path of calculatorPaths) {
      expect(standaloneOwnsPath(id, path), `${id}: ${path}`).toBe(
        owned.has(path)
      );
      expect(standaloneOwnsPath(id, `${path}?tab=spatial#plot`)).toBe(
        owned.has(path)
      );
    }
    for (const path of [
      "/vector?tab=spatial",
      "/vector?tab=centers",
      "/vector?tab=dse",
    ]) {
      expect(standaloneOwnsPath(id, path)).toBe(id === "vector");
    }
  });

  it.each(appIds)(
    "rejects unknown, prefix, URL, and integrated-only paths in %s",
    id => {
      const primary = standaloneApps[id].primaryPath;
      for (const path of [
        "",
        "?tab=dse",
        "#plot",
        "system",
        "/404",
        "/not-a-tool",
        "/linear-programming",
        "/linear-programming?tab=dse",
        "/knowledge/extra",
        `${primary}/extra`,
        `${primary}-extra`,
        `${primary}/`,
        `/other${primary}`,
        "/../system",
        "/%73ystem",
        `https://example.com${primary}`,
        `//example.com${primary}`,
        `${standaloneBase(id)}${primary.slice(1)}`,
        `${standaloneBase(id, true)}${primary.slice(1)}`,
      ]) {
        expect(standaloneOwnsPath(id, path), `${id}: ${path}`).toBe(false);
      }
    }
  );

  it("treats vector query tabs as state on the existing exact vector route", () => {
    for (const tab of ["calc", "spatial", "centers", "practice", "dse"]) {
      expect(standaloneOwnsPath("vector", `/vector?tab=${tab}#diagram`)).toBe(
        true
      );
    }
    expect(standaloneOwnsPath("vector", "/spatial")).toBe(false);
    expect(standaloneOwnsPath("vector", "/centers")).toBe(false);
    expect(standaloneOwnsPath("vector", "/dse")).toBe(false);
  });
});

describe("standalone deployment and language isolation", () => {
  it.each(appIds)("creates the correct public bases for %s", id => {
    expect(standaloneBase(id)).toBe(`/apps/${id}/`);
    expect(standaloneBase(id, false)).toBe(`/apps/${id}/`);
    expect(standaloneBase(id, true)).toBe(`/linear-algebra-lab/apps/${id}/`);
    for (const githubPages of [false, true]) {
      const base = standaloneBase(id, githubPages);
      expect(base.endsWith("/")).toBe(true);
      expect(base).not.toContain("//");
      expect(`${base}${standaloneApps[id].primaryPath.slice(1)}`).toBe(
        `${githubPages ? "/linear-algebra-lab" : ""}/apps/${id}${standaloneApps[id].primaryPath}`
      );
    }
  });

  it.each(appIds)("uses a stable app-specific language key for %s", id => {
    const expected = `linear-algebra-lab-${id}-language`;
    expect(standaloneLanguageKey(id)).toBe(expected);
    expect(standaloneLanguageKey(id)).toBe(standaloneLanguageKey(id));
    expect(standaloneLanguageKey(id)).not.toBe("linear-algebra-lab-language");
  });

  it("does not collide across standalone bases or language preferences", () => {
    const bases = appIds.flatMap(id => [
      standaloneBase(id),
      standaloneBase(id, true),
    ]);
    expect(new Set(bases).size).toBe(appIds.length * 2);
    expect(new Set(appIds.map(standaloneLanguageKey)).size).toBe(appIds.length);
  });
});
