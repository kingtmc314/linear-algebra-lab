# Independent linear algebra apps

The existing repository preserves the integrated linear algebra lab and adds three independently compiled React apps. There are no new repositories, managed projects, dependencies, or lockfile changes. Shared components and numerical implementations are compiled into each app's own bundles; a standalone deployment does not load the integrated app's scripts. Linear programming (LP) remains available in the integrated app only.

## Entries and output topology

| App                  | Source entry                                        | Output directory                         | Default public base           | GitHub Pages base                                |
| -------------------- | --------------------------------------------------- | ---------------------------------------- | ----------------------------- | ------------------------------------------------ |
| Integrated lab       | `client/index.html`                                 | `dist/public/`                           | `/`                           | `/linear-algebra-lab/`                           |
| Systems of equations | `apps/systems-of-equations/index.html` + `main.tsx` | `dist/public/apps/systems-of-equations/` | `/apps/systems-of-equations/` | `/linear-algebra-lab/apps/systems-of-equations/` |
| Matrices             | `apps/matrices/index.html` + `main.tsx`             | `dist/public/apps/matrices/`             | `/apps/matrices/`             | `/linear-algebra-lab/apps/matrices/`             |
| Vectors              | `apps/vector/index.html` + `main.tsx`               | `dist/public/apps/vector/`               | `/apps/vector/`               | `/linear-algebra-lab/apps/vector/`               |

Each standalone output directory contains its own `index.html`, hashed JS/CSS/assets, and generated `404.html`. Deploy the **contents** of that directory for an independent app, not the integrated output. All entry files must exist before an aggregate build; the orchestrator checks them before clearing any output.

## Commands

Run commands from the repository root using the existing pnpm setup.

```sh
# Managed integrated development server, with compiled standalone previews
pnpm dev

# Dedicated standalone Vite development servers; open the printed app base
pnpm dev:systems
pnpm dev:matrices
pnpm dev:vector
# Example: http://localhost:5173/apps/matrices/

# One independent app; each clears only its own output directory
pnpm build:systems
pnpm build:matrices
pnpm build:vector

# Integrated build only, using the original Vite configuration
pnpm build:integrated

# All four clients, strictly sequential: integrated, systems, matrices, vector
pnpm build:client

# Managed production build: all four clients, then the existing server bundle
pnpm build
pnpm start

# Existing validation commands
pnpm check
pnpm test

# All four clients for the existing GitHub Pages repository
GITHUB_PAGES=true pnpm build:client
```

`build:integrated` retains the original behavior of clearing `dist/public`, including previously compiled standalone directories. Run `build:client` or `build` when publishing all apps together. Conversely, a standalone build clears only `dist/public/apps/<its-slug>/`, preserving siblings and integrated files. The aggregate orchestrator stops on the first failed build and must not be deployed after failure.

`LAB_APP` selects the standalone entry when invoking Vite directly, for example:

```sh
LAB_APP=matrices pnpm exec vite build --config vite.standalone.config.ts
```

The scripts use POSIX environment-variable syntax, as does the existing project; Windows users can invoke them through WSL or set the variables in their shell and call Vite directly.

## Independent hosting at `/` or an arbitrary mount point

Use `APP_BASE` only for an individual app. It overrides the default base, including the GitHub Pages default, and is an absolute same-origin pathname with a trailing slash (a missing trailing slash is normalized). Relative bases, external URLs, query strings, hashes, and non-normalized paths are rejected.

```sh
APP_BASE=/ pnpm build:matrices
# Publish contents of dist/public/apps/matrices/ as the site's root.
# Direct tool URL: https://your-host.example/eigen

APP_BASE=/tools/vectors/ pnpm build:vector
# Publish contents of dist/public/apps/vector/ at /tools/vectors/.

APP_BASE=/ pnpm dev:systems
# Independent root-base development.
```

The app router must use `import.meta.env.BASE_URL`, not a hard-coded repo/app path, so the same source works at `/`. `APP_BASE` is intentionally rejected by `build:client` and `build`: one global override would make all three co-hosted apps claim the same public URLs. The output directory stays `dist/public/apps/<slug>/` regardless of hosting base.

Builds embed their public base. Rebuild after changing the mount point; do not move a default-base build to `/` without rebuilding. Asset paths are bundled independently but are not relocatable without that rebuild.

## Deep links and the parent-owned bootstrap contract

The URL transport key is exactly **`__lab_path`**. A fallback preserves the requested full `pathname + search + hash`, including an encoded query and fragment, and redirects with:

```js
location.replace(
  appBase +
    "?__lab_path=" +
    encodeURIComponent(location.pathname + location.search + location.hash)
);
```

**Each parent-owned `apps/<slug>/main.tsx` must restore this parameter before `createRoot` and before mounting Wouter.** `URLSearchParams.get()` already percent-decodes the outer transport encoding; do not call `decodeURIComponent` a second time, because the original path/query can contain meaningful percent-encoded values. A reference implementation is:

```ts
const raw = new URLSearchParams(window.location.search).get("__lab_path");
const base = import.meta.env.BASE_URL;
if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
  try {
    const restored = new URL(raw, window.location.origin);
    const inApp =
      base === "/" ||
      restored.pathname === base.slice(0, -1) ||
      restored.pathname.startsWith(base);
    if (restored.origin === window.location.origin && inApp) {
      window.history.replaceState(
        {},
        "",
        restored.pathname + restored.search + restored.hash
      );
    }
  } catch {
    // Ignore invalid transport values; never navigate to another origin/app.
  }
}
// createRoot(...).render(...) only after restoration
```

A standalone Router's scoped base is derived from the same `BASE_URL`; `/` mounts its calculator, and aliases/tools/knowledge remain app-local. Unknown and cross-topic routes stay inside that app and render its bilingual 404, rather than leaking into the integrated app. Validation must use segment boundaries (`/apps/vector/`, not `/apps/vector`) to avoid accepting sibling names.

The aggregate build writes `dist/public/404.html` as a **redirect shim**, not a blind copy of the integrated entry. It recognizes only the three complete app path prefixes (including a missing trailing slash on the app root), redirects to the matching app entry, and preserves the original pathname, query, and hash. For example:

```text
/linear-algebra-lab/apps/matrices/eigen?mode=exact#steps
→ /linear-algebra-lab/apps/matrices/?__lab_path=<encoded-full-original-URL-path>
→ bootstrap restores /linear-algebra-lab/apps/matrices/eigen?mode=exact#steps
```

For non-app URLs the shim renders the original compiled integrated HTML at the requested URL, preserving existing integrated deep links and LP without requiring a new integrated route transport. Each app's own generated `404.html` uses the same parameter and redirects only to that app's configured base; this also supports an independent deployment at `/`.

GitHub Pages serves only the publication root's `404.html` for missing paths, not the nearest nested app `404.html`; the aggregate root shim handles this. Other hosts must be configured either to serve the relevant app's `index.html` for its deep links or to serve its generated `404.html` as their custom error document. Fallback routing requires JavaScript and does not change a host's HTTP 404 response status. Pages is static hosting: it does not deploy the existing Node/API server.

## Shared preview and managed-server deep links

The managed production server serves static app roots after `pnpm build`. Its existing unknown-path fallback still serves integrated HTML; the integrated bootstrap now detects complete standalone path segments before mounting and hands them to the correct app entry using `__lab_path`. Legacy integrated routes and LP are not redirected.

The integrated Vite preview now serves independently compiled app HTML and assets under `/apps/<slug>/`, including their deep routes. Run `pnpm build:client` without `GITHUB_PAGES` first, then use the normal `pnpm dev` preview and the homepage's three app links. These are compiled snapshots: rebuild after editing standalone/shared source. For live standalone HMR, use the dedicated `dev:*` commands instead. Build output embeds its hosting base, so Pages-base output must be rebuilt before a default-base managed preview. The bootstrap also normalizes a bare app root without a trailing slash while preserving its query/hash.

## Existing GitHub Pages deployment

`.github/workflows/deploy.yml` is byte-for-byte unchanged from the original workflow: it deploys the same repository's `main` branch to its existing `gh-pages` branch with `peaceiris/actions-gh-pages@v4`, `contents: write`, and `GITHUB_TOKEN`. The current GitHub App credential cannot update workflow files, so no extra permission is required. The existing `build:client` command now builds all four clients. The existing workflow then copies integrated `index.html` to root `404.html`; that remains safe because the integrated bootstrap checks complete independent-app path segments **before mounting** and transfers them to the correct app entry with the same query/hash-preserving transport. The generated redirect shim is also available for other hosts that do not overwrite it. Repository identity, origin, Pages destination, dependencies and credentials are unchanged.

Build success validates compilation, not calculator correctness, language isolation, touch layout, or host fallback behavior. Those checks remain the parent-owned test/browser/deployment acceptance work. Build logs can contain existing large-chunk or optional analytics-variable warnings; there are no new external assets or numerical-source replacements in this build change.
