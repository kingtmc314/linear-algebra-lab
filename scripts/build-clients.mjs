import { spawn } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const appIds = ["systems-of-equations", "matrices", "vector"];
const publicRoot = path.join(projectRoot, "dist", "public");
const siteBase =
  process.env.GITHUB_PAGES === "true" ? "/linear-algebra-lab/" : "/";
const viteCli = path.join(
  projectRoot,
  "node_modules",
  "vite",
  "bin",
  "vite.js"
);

function runVite(label, args, env = {}) {
  console.log(`\n[build:client] Building ${label}...`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [viteCli, "build", ...args], {
      cwd: projectRoot,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${label} build failed (${signal ? `signal ${signal}` : `exit ${code}`}).`
          )
        );
    });
  });
}

async function writeRootFallback() {
  const integratedHtml = await readFile(
    path.join(publicRoot, "index.html"),
    "utf8"
  );
  // Prevent an embedded </script> or HTML-sensitive character from terminating
  // the shim's script. Legacy integrated routes retain their original URL.
  const serializedHtml = JSON.stringify(integratedHtml).replace(
    /</g,
    "\\u003c"
  );
  const appBases = appIds.map(id => `${siteBase}apps/${id}/`);
  const fallback = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Opening Linear Algebra Lab</title></head><body>
<script>
(function () {
  var pathname = location.pathname;
  var bases = ${JSON.stringify(appBases)};
  var base = bases.find(function (candidate) {
    return pathname === candidate.slice(0, -1) || pathname.indexOf(candidate) === 0;
  });
  if (base) {
    var original = pathname + location.search + location.hash;
    location.replace(base + '?__lab_path=' + encodeURIComponent(original));
    return;
  }
  // Only non-app URLs can load the original integrated entry. Keeping this
  // document at the requested URL preserves all legacy Wouter routes and LP.
  document.open();
  document.write(${serializedHtml});
  document.close();
}());
</script>
<noscript>JavaScript is required / 請啟用 JavaScript。</noscript></body></html>
`;
  await writeFile(path.join(publicRoot, "404.html"), fallback);
}

async function main() {
  if (process.env.APP_BASE !== undefined) {
    throw new Error(
      "APP_BASE is for one independently deployed app. Use build:systems, build:matrices, or build:vector, not build:client/build."
    );
  }
  // Check all entries before the integrated build clears its existing output.
  for (const id of appIds) {
    for (const filename of ["index.html", "main.tsx"]) {
      await access(path.join(projectRoot, "apps", id, filename)).catch(() => {
        throw new Error(
          `Missing apps/${id}/${filename}. Create all app entries before running build:client.`
        );
      });
    }
  }
  await runVite("integrated", ["--config", "vite.config.ts"]);
  // The integrated build owns dist/public; standalone builds follow it and
  // only clear dist/public/apps/<their-id>, never siblings or the integrated app.
  for (const id of appIds) {
    await runVite(id, ["--config", "vite.standalone.config.ts"], {
      LAB_APP: id,
    });
  }
  await writeRootFallback();
  console.log(
    "\n[build:client] Complete: integrated + systems-of-equations + matrices + vector; root/app 404 fallbacks generated."
  );
}

main().catch(error => {
  console.error(`[build:client] ${error.message}`);
  process.exitCode = 1;
});
