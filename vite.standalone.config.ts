import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, searchForWorkspaceRoot, type Plugin } from "vite";

const projectRoot = import.meta.dirname;
const appIds = ["systems-of-equations", "matrices", "vector"] as const;
type AppId = (typeof appIds)[number];

function appId(): AppId {
  const value = process.env.LAB_APP;
  if (!appIds.includes(value as AppId)) {
    throw new Error(
      `LAB_APP must be one of: ${appIds.join(", ")}. Received ${JSON.stringify(value)}.`
    );
  }
  return value as AppId;
}

function appBase(id: AppId): string {
  const value =
    process.env.APP_BASE ??
    `${process.env.GITHUB_PAGES === "true" ? "/linear-algebra-lab" : ""}/apps/${id}/`;
  // A path-only base keeps the same-origin __lab_path restoration contract safe.
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[?#\\]/.test(value)
  ) {
    throw new Error(
      "APP_BASE must be an absolute URL pathname, for example / or /tools/matrices/."
    );
  }
  const normalized = value.endsWith("/") ? value : `${value}/`;
  if (
    new URL(normalized, "https://standalone.invalid").pathname !== normalized
  ) {
    throw new Error(
      "APP_BASE must be a normalized pathname without dot segments or spaces."
    );
  }
  return normalized;
}

function ownAppFallback(base: string): Plugin {
  return {
    name: "standalone-own-app-fallback",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "404.html",
        source: `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Opening application</title>
<script>
(function () {
  var base = ${JSON.stringify(base)};
  var original = location.pathname + location.search + location.hash;
  location.replace(base + '?__lab_path=' + encodeURIComponent(original));
}());
</script></head><body><p>Opening application / 正在開啟應用程式…</p><noscript>JavaScript is required / 請啟用 JavaScript。</noscript></body></html>
`,
      });
    },
  };
}

export default defineConfig(() => {
  const id = appId();
  const base = appBase(id);
  return {
    base,
    root: path.resolve(projectRoot, "apps", id),
    envDir: projectRoot,
    publicDir: path.resolve(projectRoot, "client", "public"),
    plugins: [react(), tailwindcss(), ownAppFallback(base)],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "client", "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    build: {
      outDir: path.resolve(projectRoot, "dist", "public", "apps", id),
      // Vite is rooted at this app; this only removes that app's compiled tree.
      emptyOutDir: true,
    },
    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1",
      ],
      fs: { allow: [searchForWorkspaceRoot(projectRoot)], deny: ["**/.*"] },
    },
  };
});
