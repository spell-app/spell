import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { defineConfig, type Plugin } from "vite-plus"

import { fmtConfig, packageLint } from "spell/toolchain/lint"
// Import directly:  the server barrel would load linkedom and the rest into every Vite start
import { KeeperLink } from "spell/server/KeeperLink"
import environment from "spell/app/spaces/server/node/environment"
import { editorPageFor } from "spell/app/spaces/server/node/routes/editorPaths"
import { moreSpacesFrom, orgGroupFolders } from "spell/app/spaces/server/node/spellSpacesDir"
import { appConfig, pageServerProxy } from "./vite.shared.ts"

/** Name of the runtime's entry in a build:  `dist/spell-runtime.js` -- see `editor.loadRuntime()`. */
const RUNTIME_ENTRY = "spell-runtime"

/** The runtime's source, from this folder:  the entry of `spell-runtime.js`. */
const RUNTIME_SOURCE = "../src/app/runner/spellRuntime.ts"

/** The kit's root, two folders up from this one (`app/app/`):  whose editor this is. */
const KIT_ROOT = path.resolve(import.meta.dirname, "../..")

/** Plugins, dedupe and CSS:  `appConfig()`, with `spell-ui`'s icon packs. */
const APP_CONFIG = appConfig({ builtInFiles: true })

/**
 * The editor app:  `yarn start:dev` / `yarn build` => `dist/`.
 * - Plugins, dedupe and CSS:  `appConfig()`;  in dev, `repoSourceInDev()` too.
 * - `builtInFiles`:  `spell-ui`'s built-in icon packs and sounds go beside the chunks holding `BuiltInPacks` and
 *   `BuiltInSounds` (`assets/`), where
 *   it looks;  the app's Solid UI draws Fomantic names from them (`spell/app/app/solid`'s `loadUI.ts`).
 * - ONE page, so it bundles its own Solid and `ui`:  `spell-solid.js` is the elements' and the runner's.
 */
export default defineConfig({
  // `vp lint` / `vp fmt`:  the repo root's `vite.lint.ts`
  fmt: fmtConfig,
  lint: packageLint({
    name: "app",
    ignorePatterns: ["build", "dist", ".cache", "dist-runner", "dist-element", "static"]
  }),
  ...APP_CONFIG,
  plugins: [
    keeperStartsMainsEditor(),
    ...APP_CONFIG.plugins,
    repoSourceInDev(),
    runPageInDev(),
    runtimeCopyInDev(),
    runtimeOwnCoreInBuild()
  ],
  server: {
    ...APP_CONFIG.server,
    port: environment.vitePort,
    // on the house network (epic `atmosphere` P39):  this machine's own side only, so its one way in is Caddy's address,
    // which refuses what shouldn't reach this machine's person from elsewhere (`caddyFileFor()`)
    // Live reload needs nothing more:  vite's page script opens its socket at the address the page came from
    // (`wss://test.spell.app`).
    // REJECTED:  a fixed `hmr` host and port 443, which would break the same editor at http://localhost:3000.
    host: environment.editorThisMachineOnly ? "127.0.0.1" : "0.0.0.0",
    // the page server's:  the API, a project's files, the elements' bundles for the demo pages (`appRoutes.ts`), Spell UI's
    // pages;  its write token added for the project data folders (`pageServerProxy()`)
    proxy: pageServerProxy({
      target: `http://${environment.api_server}:${environment.expressPort}`,
      ...(environment.serverToken !== undefined && { token: environment.serverToken }),
      ...(environment.serverTokenFile !== undefined && { tokenFile: environment.serverTokenFile })
    })
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      // the app;  the run page, a project running alone (`run.html`, epic `solid-2-final` P12);
      // and the runtime their programs run on -- its own entry, so it holds ALL of `core`
      // (`runtimeOwnCoreInBuild()`), at a FIXED name for `editor.loadRuntime()` to import.
      // See `spellRuntime.ts`.
      input: { index: "index.html", run: "run.html", [RUNTIME_ENTRY]: RUNTIME_SOURCE },
      // keep `spell-runtime.js`'s exports by NAME:  it's compiled spell's `@spell/core`
      preserveEntrySignatures: "exports-only",
      output: {
        entryFileNames: (chunk) => (chunk.name === RUNTIME_ENTRY ? `${RUNTIME_ENTRY}.js` : "assets/[name]-[hash].js"),
        // MUST stay on:  rules defined as classes register under their class name (`Rule.instantiate()`),
        // so minifying class names away would silently break every grammar.  See `build.test.ts`.
        keepNames: true
      }
    }
  },
  define: {
    global: {},
    "process.env": {},
    // the page server's address, as this dev server reaches it (`proxy`):  the theme menu's Theme bench opens there
    "import.meta.env.SPELL_PAGE_SERVER": JSON.stringify(`http://${environment.api_server}:${environment.expressPort}`)
  }
})

/**
 * In dev, the MAIN checkout's editor starts only from the server keeper or a person's own terminal (epic `epic-engine`
 * P84):  an agent's `vp dev` in main's `app/` stops at once, saying to ask the keeper (`KeeperLink.refusedStart()`).
 * - main's page server starts it with its token, so the keeper's starts pass;  a worktree's editor always does
 * - why:  a session started main's editor by hand while the keeper's ran, and three editors took 3000, 3001 and 3002
 */
function keeperStartsMainsEditor(): Plugin {
  return {
    name: "spell:keeper-starts-mains-editor",
    apply: "serve",
    config() {
      // a page server's own editor (`EditorServer`, which hands it the server's token):  the page server passed the
      // same check as it started;  one started before P84 has no keeper's mark to hand on, and Vite asks again here
      // each time this file changes
      if (process.env.SPELL_SERVER_TOKEN) return
      const refused = new KeeperLink().refusedStart("editor", KIT_ROOT)
      if (refused) throw new Error(refused)
    }
  }
}

/**
 * The dev server's `/src/...`:  the repo's `src/`, beside vite's root `app/` -- for `index.html`'s entry.
 * - `index.html` loads `../src/app/index.tsx`, a path from `app/`:  the build reads it so.
 * - The dev server can't go above its root in a URL:  it asks for `/src/app/index.tsx`, which isn't in `app/`
 *   (a 404 since epic `repo-split` P14 moved the code into `src/`;  epic `spanish` J94).
 * - So in dev only, a `/src/...` that isn't in `app/` is the repo's own file.
 */
function repoSourceInDev(): Plugin {
  const repoRoot = path.resolve(import.meta.dirname, "..")
  return {
    name: "spell-app:repo-source-in-dev",
    apply: "serve",
    enforce: "pre",
    resolveId(id) {
      if (!id.startsWith("/src/") || existsSync(path.join(import.meta.dirname, id))) return null
      const file = path.join(repoRoot, id.split("?")[0]!)
      return existsSync(file) ? file + id.slice(id.split("?")[0]!.length) : null
    }
  }
}

/**
 * The dev server's run page:  `run.html` for a `/run/...` address opened straight, as the built editor's server sends
 * it (`editorPageFor()`, `EditorServer`;  epic `solid-2-final` P12).
 * - Only a page the browser asks for (`Accept: text/html`):  the editor's own switch to Run never asks the server.
 * - Before vite's own middleware, which would send `index.html` for any address it has no file for.
 * - Its paths from `app/` (`../src/app/run/index.tsx`) made the dev server's own (`/src/app/run/index.tsx`):
 *   vite does that for `index.html` alone, so a page at `/run/<project>` would ask for them under its own address.
 */
function runPageInDev(): Plugin {
  return {
    name: "spell-app:run-page-in-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ""
        // a group's own page:  the more spaces file read again, as this server outlives the page server's restarts
        const page = editorPageFor(url.split("?")[0]!, orgGroupFolders(moreSpacesFrom()))
        if (request.method !== "GET" || page === "index.html" || !/text\/html/.test(request.headers.accept ?? "")) {
          return next()
        }
        const html = readFileSync(path.join(import.meta.dirname, page), "utf8").replaceAll('="../', '="/')
        server
          .transformIndexHtml(url, html)
          .then((transformed) => {
            response.setHeader("Content-Type", "text/html")
            response.setHeader("Cache-Control", "no-cache")
            response.end(transformed)
          })
          .catch(next)
      })
    }
  }
}

/** The queries that mark a module as a copy of its own:  the layout's (`layoutSpell.ts`), the tests' (`editor.runTests()`). */
const COPY_QUERY = /\?(?:layout|tests)-copy$/
/**
 * The folders holding what a runtime keeps per copy:  its `core`, and what runs on it.
 * - Solid, Spell UI, `spell/util` and the places stay the page's one, in dev and in a build.
 */
const PER_COPY = /\/(parser\/src\/core|app\/src\/app\/runner)\//

/**
 * In dev, the layout's copy of the runtime, as `layoutSpell.ts` asks for it, gets modules of its own;  so does the
 * copy the tests run on (`editor.runTests()`).
 * - A build's copy is the runtime's text from a new URL, holding all of `core`.
 *   Vite serves a module per file instead, so a copy of the top file would still share `core` with the first.
 * - So the query follows the imports through the folders that hold a runtime's state.
 *   Solid, Spell UI and `spell/util` stay the page's one.
 */
function runtimeCopyInDev(): Plugin {
  return {
    name: "spell-app:runtime-copy-in-dev",
    apply: "serve",
    enforce: "pre",
    async resolveId(id, importer) {
      const copy = importer && COPY_QUERY.exec(importer)?.[0]
      if (!copy) return null
      const resolved = await this.resolve(id, importer.split("?")[0], { skipSelf: true })
      if (!resolved || !PER_COPY.test(resolved.id) || resolved.id.includes("?")) return resolved
      return { ...resolved, id: resolved.id + copy }
    }
  }
}

/** The query marking a module as `spell-runtime.js`'s own, in a build:  never the same module as the editor's. */
const RUNTIME_OWN = "?spell-runtime"

/** A dynamic `import()` of a quoted name, e.g. `import("./placeSamples")`:  its quote, then the name. */
const DYNAMIC_IMPORT = /\bimport\(\s*(["'])([^"'`\n]+)\1\s*\)/g

/**
 * In a build, `spell-runtime.js` holds ALL of what a runtime keeps per copy (`PER_COPY`):
 * its `core`, and what runs on it.
 * - `loadRuntime()` copies that ONE file, from a `blob:` URL, and the copy shares the chunks it imports.
 *   With `core` in a chunk the editor shares, every copy shared ONE `core`, each with its own `View`:
 *   the last copy loaded took `core.defineElement()` over, and an app's elements were never defined.
 * - So, as `runtimeCopyInDev()` does in dev, the runtime's imports into `PER_COPY` get modules of their own,
 *   marked `RUNTIME_OWN`, followed from module to module:
 *   only the runtime imports them, so they're bundled into it, never into a chunk the editor shares.
 *   - The editor's own imports of the same files are other modules, in its own chunks.
 * - Their lazy imports of each other are made static, so they're in the file too:
 *   a lazy chunk is shared by every copy, as any chunk is.
 *   - e.g. `core`'s `placeSamples`;  a lazy import of the places or of Spell UI stays lazy, the page's one.
 * - Pinned by `build.test.ts`, which loads the built runtime and a copy of it in a browser.
 */
function runtimeOwnCoreInBuild(): Plugin {
  const entry = path.resolve(import.meta.dirname, RUNTIME_SOURCE)
  const isRuntimeOwn = (id: string) => id === entry || id.endsWith(RUNTIME_OWN)
  return {
    name: "spell-app:runtime-own-core-in-build",
    apply: "build",
    enforce: "pre",
    async resolveId(id, importer) {
      if (!importer || !isRuntimeOwn(importer)) return null
      const resolved = await this.resolve(id, importer.split("?")[0], { skipSelf: true })
      if (!resolved || resolved.external || !PER_COPY.test(resolved.id) || resolved.id.includes("?")) return resolved
      return { ...resolved, id: resolved.id + RUNTIME_OWN }
    },
    async transform(code, id) {
      if (!isRuntimeOwn(id)) return null
      const file = id.split("?")[0]!
      const inlined: string[] = []
      let rewritten = code
      for (const [whole, , name] of code.matchAll(DYNAMIC_IMPORT)) {
        const resolved = await this.resolve(name!, file)
        if (!resolved || resolved.external || !PER_COPY.test(resolved.id)) continue
        const local = `__runtimeOwn${inlined.length}`
        inlined.push(`import * as ${local} from ${JSON.stringify(name)}`)
        rewritten = rewritten.replace(whole, `Promise.resolve(${local})`)
      }
      // at the end, so every line keeps its number
      return inlined.length ? { code: `${rewritten}\n${inlined.join(";")}\n`, map: null } : null
    }
  }
}
