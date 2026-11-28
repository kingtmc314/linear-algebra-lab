/** Recover a GitHub Pages redirect before Wouter mounts; never leave this app/origin. */
export function standaloneRecoveredPath(
  currentHref: string,
  base: string
): string | null {
  const current = new URL(currentHref);
  const saved = current.searchParams.get("__lab_path");
  if (!saved || !saved.startsWith("/") || saved.startsWith("//")) return null;
  const target = new URL(saved, current.origin);
  const prefix = base.endsWith("/") ? base : `${base}/`;
  if (target.pathname === prefix.slice(0, -1)) target.pathname = prefix;
  if (target.origin !== current.origin || !target.pathname.startsWith(prefix))
    return null;
  target.searchParams.delete("__lab_path");
  return `${target.pathname}${target.search}${target.hash}`;
}
