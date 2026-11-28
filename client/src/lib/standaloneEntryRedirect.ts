import { standaloneApps } from "./standaloneApps";

/** A managed SPA fallback must hand app paths to their own compiled entry. */
export function standaloneEntryRedirect(
  currentHref: string,
  siteBase: string
): string | null {
  const current = new URL(currentHref);
  const prefix = siteBase.endsWith("/") ? siteBase : `${siteBase}/`;
  for (const id of Object.keys(standaloneApps)) {
    const appBase = `${prefix}apps/${id}/`;
    if (
      current.pathname === appBase.slice(0, -1) ||
      current.pathname.startsWith(appBase)
    ) {
      return `${appBase}?__lab_path=${encodeURIComponent(current.pathname + current.search + current.hash)}`;
    }
  }
  return null;
}
