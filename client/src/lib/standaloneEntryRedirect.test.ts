import { describe, expect, it } from "vitest";
import { standaloneEntryRedirect } from "./standaloneEntryRedirect";
import { standaloneRecoveredPath } from "./standaloneRouteRecovery";

describe("managed integrated entry dispatch", () => {
  for (const siteBase of ["/", "/linear-algebra-lab/"]) {
    for (const id of ["systems-of-equations", "matrices", "vector"]) {
      it(`dispatches ${id} under ${siteBase} with query/hash intact`, () => {
        const base = `${siteBase}apps/${id}/`;
        const target = `${base}knowledge?q=a%2Bb#steps`;
        const redirect = standaloneEntryRedirect(
          `https://example.org${target}`,
          siteBase
        );
        expect(redirect).toBe(
          `${base}?__lab_path=${encodeURIComponent(target)}`
        );
        expect(
          standaloneRecoveredPath(`https://example.org${redirect}`, base)
        ).toBe(target);
      });
    }
  }
  it.each([
    "/",
    "/system",
    "/matrix",
    "/vector?tab=spatial",
    "/knowledge",
    "/linear-programming",
    "/apps/vector-fake/vector",
    "/apps/matrices-fake/",
    "/apps/unknown/",
  ])("preserves legacy or unrelated %s", path => {
    expect(
      standaloneEntryRedirect(`https://example.org${path}`, "/")
    ).toBeNull();
  });
  it("normalizes an app root without trailing slash, preserving its tab", () => {
    const redirect = standaloneEntryRedirect(
      "https://example.org/apps/vector?tab=centers#construction",
      "/"
    );
    expect(redirect).not.toBeNull();
    expect(
      standaloneRecoveredPath(`https://example.org${redirect}`, "/apps/vector/")
    ).toBe("/apps/vector/?tab=centers#construction");
  });
});
