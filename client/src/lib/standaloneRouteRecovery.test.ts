import { describe, expect, it } from "vitest";
import { standaloneRecoveredPath } from "./standaloneRouteRecovery";

describe("standalone Pages path recovery", () => {
  for (const base of [
    "/apps/vector/",
    "/linear-algebra-lab/apps/vector/",
    "/",
  ]) {
    it(`restores queries and hashes inside ${base}`, () => {
      const target = `${base}vector?tab=spatial#normals`;
      expect(
        standaloneRecoveredPath(
          `https://example.org${base}?__lab_path=${encodeURIComponent(target)}`,
          base
        )
      ).toBe(target);
    });
  }
  it.each([
    "//evil.org/apps/vector/",
    "https://evil.org/apps/vector/",
    "/apps/matrices/",
    "/apps/vector-fake/",
    "/apps/vector/../matrices/",
  ])("rejects unsafe target %s", target => {
    expect(
      standaloneRecoveredPath(
        `https://example.org/apps/vector/?__lab_path=${encodeURIComponent(target)}`,
        "/apps/vector/"
      )
    ).toBeNull();
  });
  it("leaves normal links untouched", () => {
    expect(
      standaloneRecoveredPath(
        "https://example.org/apps/vector/vector?tab=dse",
        "/apps/vector/"
      )
    ).toBeNull();
  });
});
