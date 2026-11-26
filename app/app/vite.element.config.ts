import { readFileSync } from "fs"
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import { defineConfig, type Plugin } from "vite"

import environment from "spell/app/spaces/server/node/environment"
import { appConfig, sharedFiles } from "./vite.shared.ts"

/** The two entries, `input` below, from this folder. */
const ENTRIES = {
  "spell-viewer": "../src/app/components/spell-viewer/index.ts",
  "spell-runtime": "../src/app/runner/spellRuntime.ts"
}

/** Each entry's module id:  its file. */
const ENTRY_IDS = Object.values(ENTRIES).map((entry) => fileURLToPath(new URL(entry, import.meta.url)))

/**
 * Build the `<spell-viewer>` web component:  `yarn build:element` => `dist-element/`, after `vite.solid.config.ts`.
 * - Two entries:
 *   - `spell-viewer.js`:  the element, for pages to load -- see `src/app/components/spell-viewer/index.ts`
 *   - `spell-runtime.js`:  what ONE app runs on, loaded afresh per element -- see `spellRuntime.ts`
 * - What both use goes in shared chunks.
 *   `core` MUST stay in `spell-runtime.js` alone -- pinned by `element.build.test.ts`.
 * - Solid, `ui`'s element core and `spell-ui` are NOT bundled:
 *   they come from `spell-solid.js` / `spell-ui.js` beside it, which `<spell-editor>` imports too --
 *   one Solid per page.
 *   - How:  `sharedFiles()`, through `spell-solid-shared.js` (on a docs page:  the page's own instead).
 *   - `<spell-viewer>` imports `spell-ui.js` not at all:  it's a root, loading each Spell UI family it draws from `ui/`.
 *   - `spell-runtime.js` takes Solid and `h` through `spell-solid-shared.js` too
 *     (compiled spell draws with Solid), never `spell-ui.js`.
 * - Nor spell's grammar, for a layout's spell (`LayoutSpell.js`):  it comes from `spell-grammar.js` beside it,
 *   `vite.code.config.ts`'s, which `<spell-code>`'s colours load too -- one grammar per page (`sharedFiles({ grammar: true })`).
 * - Fixed names, no hashes:  the element finds the runtime, styles and scope packs beside itself.
 * - One `spell-app.css`, which the element puts in each shadow root -- see `shadowStyles.ts`.
 * - `static/` is copied in, so Lato sits beside the bundle --
 *   and the built-in types' scope pack, `core.scopes.js`, see `builtInsPack()`.
 * - And the component pack of both elements, `spell.pack.js`:  see `componentPack()`.
 * - Plugins, dedupe and CSS:  `appConfig()`, as `vite.config.ts`.
 *   `keepNames` MUST stay on -- see `parser/build.test.ts`.
 */
const shared = appConfig()
export default defineConfig({
  ...shared,
  plugins: [...shared.plugins, sharedFiles({ grammar: true }), builtInsPack(), componentPack()],
  // its lazy chunk (`LayoutSpell.js`, a layout's spell) is preloaded from beside `spell-viewer.js`, not the page's root
  base: "./",
  publicDir: "static",
  build: {
    chunkSizeWarningLimit: 2000,
    outDir: "dist-element",
    // `vite.solid.config.ts` emptied it
    emptyOutDir: false,
    sourcemap: true,
    cssCodeSplit: false,
    rolldownOptions: {
      input: ENTRIES,
      // keep `spell-runtime.js`'s exports:  nothing in the bundle imports it, the element loads it by URL
      preserveEntrySignatures: "exports-only",
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: (asset) =>
          asset.names?.some((name) => name.endsWith(".css")) ? "spell-app.css" : "[name][extname]",
        keepNames: true,
        // everything both entries load up front, in ONE chunk with a name that says so -- NOT e.g. `Button.js`
        codeSplitting: { groups: [{ name: sharedUpFront(), debugName: "spell-shared" }] }
      }
    }
  },
  define: {
    global: {},
    "process.env": {}
  }
})

/**
 * The name of the chunk both entries load up front, `spell-shared`, for a module BOTH import statically;
 * `null` for every other, which Rolldown splits as it would.
 * - NOT every module two chunks share (`minShareCount: 2`):  that counted the lazy chunks too, so the parser a layout's
 *   spell compiles with (`LayoutSpell.js`) went into `spell-shared.js`, which every cloud app loaded before it ran
 *   (epic `solid-2-final` P12:  1.1 MB of source no program needs to run).
 * - Worked out once, the first time it's asked:  each entry's static imports, followed.
 */
function sharedUpFront(): (moduleId: string, ctx: ChunkingContext) => string | null {
  let both: Set<string> | undefined
  return (moduleId, ctx) => {
    both ??= bothEntriesImport(ctx)
    return both.has(moduleId) ? "spell-shared" : null
  }
}

/** Every module both entries reach through static imports alone. */
function bothEntriesImport(ctx: ChunkingContext): Set<string> {
  const reached = ENTRY_IDS.map((start) => {
    const seen = new Set<string>()
    const next = [start]
    for (let id = next.pop(); id !== undefined; id = next.pop()) {
      if (seen.has(id)) continue
      seen.add(id)
      next.push(...(ctx.getModuleInfo(id)?.importedIds ?? []))
    }
    return seen
  })
  return new Set([...reached[0]!].filter((id) => reached.every((set) => set.has(id))))
}

/** What Rolldown hands a chunk group's `name()`:  each module's imports. */
type ChunkingContext = { getModuleInfo(moduleId: string): { importedIds: readonly string[] } | null }

/**
 * Copy the built-in types' scope pack, `core`'s `src/core.scopes.js`, beside the bundle --
 * where `<spell-viewer>` looks for it.  See `LSP.ScopePack`.
 */
function builtInsPack(): Plugin {
  return {
    name: "spell-built-ins-pack",
    apply: "build",
    generateBundle() {
      const source = readFileSync(`${environment.coreDir}/core.scopes.js`, "utf8")
      this.emitFile({ type: "asset", fileName: "core.scopes.js", source })
    }
  }
}

////////////////
// ## The component pack
////////////////

/** The element families, `src/app/components/<tag>/`:  each one's barrel is the entry of `<tag>.js`. */
const COMPONENTS = fileURLToPath(new URL("../src/app/components", import.meta.url))

/**
 * The kit's `RootCatalog` (`spell/element-tools/RootCatalog`, Spell UI's until epic `repo-split` P10), which reads
 * a catalog from vocabularies.
 * - Imported as the build runs, by URL, found through the kit's `exports` (never a path into another repo):
 *   a static import would have `tsc -p tsconfig.node.json` check the kit's source.
 * - Node runs its `.ts` files as they are (type stripping).
 * - By its name WITH `.ts`:  node's resolver adds no extension (the kit's `"./*.ts"` entry).
 */
const ROOT_CATALOG = pathToFileURL(createRequire(import.meta.url).resolve("spell/element-tools/RootCatalog.ts")).href

/** What `RootCatalog` knows of a tag:  `RootCatalogEntry` (its folder, its skeleton). */
type CatalogEntry = { readonly folder: string; readonly skeleton?: unknown }

/** The pack's script, beside the bundle. */
const PACK_FILE = "spell.pack.js"

/** The pack's name (as its file implies:  `ComponentPacks.nameFor()`) and its tags' prefix. */
const PACK = { name: "spell", prefix: "spell-" }

/**
 * Write `spell.pack.js`:  the app's elements as a Spell UI COMPONENT PACK,
 * every family in `src/app/components/`:  `<spell-viewer>`, `<spell-editor>`, `<spell-code>`, `<spell-markdown>`,
 * `<spell-reference-page>`.
 * A page with a `<ui-root>` loads it through `<ui-components source>`, as the docs' pages load `epics.pack.js`:
 *
 *     <script type="module" src="/element/spell-ui.js"></script>
 *     <ui-root>
 *       <ui-components source="/element/spell.pack.js"></ui-components>
 *       <spell-viewer project="@spell/examples/Solitaire" toolbar></spell-viewer>
 *     </ui-root>
 *
 * - A classic script calling `SpellUI.registerPack({ name, prefix, catalog, define })` as it runs:
 *   `spell-ui.js` (`vite.solid.config.ts`) puts `registerPack` there.
 * - Its `catalog` is read from the families' vocabularies by the kit's `RootCatalog`,
 *   as `spell pack build` reads a pack's.
 * - Its `define()` imports each family's ES module beside it (`spell-viewer.js`, `spell-editor.js` ...;
 *   `spell-code.js`, `spell-markdown.js` and `spell-reference-page.js` are `vite.code.config.ts`'s):
 *   NOT one script holding them, as `spell pack build` makes,
 *   because the elements need what a classic script can't have --
 *   CodeMirror and the parser as lazy chunks, `spell-runtime.js` loaded afresh per app.
 * - The modules take Solid and Spell UI's core from the page when it has its own
 *   (a docs page's bundle:  `spell-solid-shared.js`, `vite.solid.config.ts`), else from `spell-solid.js` beside them:
 *   one Solid per page either way (two fail silently).
 * - A family that won't load is a warning, and the others still define:  e.g. `spell-code.js` on a page whose own
 *   Spell UI shares no code family (`spell-ui-shared.js`), where `<spell-viewer>` still runs.
 * - A page with only `<spell-viewer>`s needs no pack:
 *   `spell-viewer.js` by itself (`<spell-viewer>` is a root,
 *   which loads `spell-editor.js` only when an editor appears inside it).
 */
function componentPack(): Plugin {
  return {
    name: "spell-component-pack",
    apply: "build",
    async generateBundle() {
      const { RootCatalog } = (await import(/* @vite-ignore */ ROOT_CATALOG)) as {
        RootCatalog: { read(roots: string[]): Promise<Record<string, CatalogEntry>> }
      }
      const catalog = await RootCatalog.read([COMPONENTS])
      this.emitFile({ type: "asset", fileName: PACK_FILE, source: packSource(catalog) })
    }
  }
}

/** The text of `spell.pack.js`, for `catalog`. */
function packSource(catalog: Record<string, CatalogEntry>): string {
  const folders = [...new Set(Object.values(catalog).map((entry) => entry.folder))].sort()
  const imports = folders.map((folder) => `load(${JSON.stringify(`${folder}.js`)})`)
  return `/* GENERATED -- do not edit:  \`yarn build:element\` (\`componentPack()\`, \`vite.element.config.ts\`) */
/**
 * The \`${PACK.name}\` component pack:  ${Object.keys(catalog)
   .sort()
   .map((tag) => `<${tag}>`)
   .join(", ")}, for a \`<ui-root>\` page:
 * \`<ui-components source=".../${PACK_FILE}">\`.  Its \`define()\` imports each family's module, beside this file.
 */
;(() => {
  const here = document.currentScript.src
  const at = (file) => new URL(file, here).href
  // one family that won't load (\`spell-code.js\` on a page whose Spell UI shares no code family) leaves the rest
  const load = (file) =>
    import(at(file)).catch((error) => console.warn(\`spell.pack.js:  \${file} didn't load;  its tags stay undefined\`, error))
  globalThis.SpellUI.registerPack({
    name: ${JSON.stringify(PACK.name)},
    prefix: ${JSON.stringify(PACK.prefix)},
    catalog: ${JSON.stringify(catalog)},
    define: () => Promise.all([${imports.join(", ")}])
  })
})()
`
}
