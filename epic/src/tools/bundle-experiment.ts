/**
 * `yarn tsx src/tools/bundle-experiment.ts <entry.ts> [<out.js>]` (from spell-epic's root):  a guide's own live elements as
 * ONE classic script, built from a TypeScript entry in the guide's `experiments/` folder.
 *
 *     yarn tsx src/tools/bundle-experiment.ts ../spell.epics/guides/custom-elements/experiments/custom-elements.entry.ts
 *
 * - What it's for:  a page that teaches with WORKING elements of its own (the custom elements guide's
 *   `<ui-counter>`) loads the script right after `spell-ui.js`;  the elements it defines extend the page's own
 *   Spell UI, so they work like any `<ui-*>` there.
 * - `<out.js>`:  default, the entry's name with `.bundle.js` for `.entry.ts`, beside it.
 * - Built as a component pack's script is (`spell-pack build`, the kit's `ComponentPack`):
 *   - Vite, on Spell UI's `baseConfig()`:  decorators BEFORE Solid, Solid's JSX, Lightning CSS
 *   - one minified IIFE, banner first, saying how it was built
 *   - every `PACK_MODULES` specifier (`solid-js`, `@solidjs/web`, `spell/element`, `spell/ui/core`, `spell/ui/forms`, `ImageZoom`)
 *     left external, read from `globalThis.SpellUI.packModules`:  the page's one Solid, spell-element and Spell UI core
 * - Unlike a pack:
 *   - no `<ui-root>` catalog, no `registerPack()`:  the entry defines its tags itself, as the script runs
 *   - it may import Spell UI's DOC-ONLY families (`spell/ui/docs-components/<family>`, e.g. `<ui-docs-inspector>`),
 *     bundled from this checkout's source;  any other `spell/ui/...` module, or Solid's, fails
 * - Why not in `spell-ui.js`:  that bundle is built from `ui`'s `dist/`, which has no docs families;
 *   and only the page that needs these pays for them.
 * - The entry lives in SHARED content, which has no `node_modules`:
 *   `spell/ui/docs-components/...` resolves to Spell UI's `src/` by alias (the `spell-ui` workspace Node's resolver
 *   finds from here), so the script is built from the checkout that runs this.
 * - A shared module is read from `SpellUI.packModules` by its import name as written (`spell/ui/core`):
 *   the names the docs bundle offers (`spell-ui.entry.js`;  epic `repo-split` P14).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { PACK_MODULES } from "spell/element-tools/packModules"

import { packageDir } from "./packageDir.ts"
import { parseArgs } from "./pages.js"

/** `src`, the folder of the docs tools (`tools/`). */
const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/** Spell UI (`spell-ui`, spell-ui):  its Vite config (`baseConfig()`) and the docs families' source. */
const UI_DIR = packageDir("spell-ui") ?? join(DOCS, "spell-ui (not installed)")

/** Imports bundled from `ui`'s source:  the doc-only families and what they import of `ui` beyond the core. */
const UI_SOURCE = /^spell-ui\/(docs-components|components\/components\.types)(\/|$)/

/** Imports the page must share, never bundled:  Spell UI, Solid, our other repos' packages (as `packBuild.ts`). */
const SHARED_IMPORT = /^solid-js(\/|$)|^@solidjs\/|^spell-(ui|lang|app|brand|epic)(\/|$)|^spell\/element(\/|$)/

const { positional } = parseArgs(process.argv.slice(2))
const entry = positional[0] ? resolve(positional[0]) : ""
if (!entry.endsWith(".ts") || !existsSync(entry)) {
  console.error("usage:  yarn tsx src/tools/bundle-experiment.ts <entry.ts> [<out.js>]")
  process.exit(1)
}
const out = resolve(positional[1] ?? entry.replace(/(\.entry)?\.ts$/, ".bundle.js"))
await bundle(entry, out)
console.log(`wrote ${relative(process.cwd(), out)}`)

/**
 * Build `entry` into `out`.
 * - In this process, through Vite's API;  `configFile: false`, as the pack build.
 */
async function bundle(entry: string, out: string) {
  const { build } = await import("vite-plus")
  const config = pathToFileURL(join(UI_DIR, "vite.config.ts")).href
  const { baseConfig } = (await import(config)) as { baseConfig: () => Record<string, any> }
  const base = baseConfig()
  await build({
    ...base,
    configFile: false,
    plugins: [...base.plugins, keepSideEffects(dirname(entry))],
    root: dirname(entry),
    logLevel: "warn",
    publicDir: false,
    resolve: {
      ...base.resolve,
      alias: [
        {
          find: /^spell-ui\/(?=docs-components|components\/components\.types)/,
          replacement: `${join(UI_DIR, "src")}/`
        }
      ]
    },
    build: {
      outDir: dirname(out),
      emptyOutDir: false,
      sourcemap: false,
      minify: true,
      target: "esnext",
      reportCompressedSize: false,
      lib: { entry, formats: ["iife"], name: "SpellExperiment", fileName: () => basename(out) },
      rolldownOptions: {
        // the modules a script SHARES with the page instead of bundling, as a pack's build (the kit's `PACK_MODULES`):
        // each read from `globalThis.SpellUI.packModules[<key>]` (the docs bundle's, `spell-ui.entry.js`)
        external: (id: string) => {
          if (PACK_MODULES.includes(id)) return true
          if (SHARED_IMPORT.test(id) && !UI_SOURCE.test(id)) {
            throw new Error(
              `bundle-experiment:  '${id}' can't be shared with the page;  import from solid-js, @solidjs/web, ` +
                `spell/element, spell/ui/core, spell/ui/forms, or a doc-only family ('spell/ui/docs-components/<family>')`
            )
          }
          return false
        },
        output: {
          // custom element class names are read by dev-time warnings (see ui's `vite.config.ts`)
          keepNames: true,
          globals: (id: string) => `globalThis.SpellUI.packModules[${JSON.stringify(id)}]`
        }
      }
    }
  })
  // The banner goes on AFTER the build:  the minifier drops `output.banner`'s comment
  const command = `yarn tsx src/tools/bundle-experiment.ts ${relative(resolve(DOCS, ".."), entry)}`
  const banner = `/* GENERATED -- do not edit:  \`${command}\` (from spell-epic's root) */`
  writeFileSync(out, `${banner}\n${readFileSync(out, "utf8")}`)
}

/**
 * A Vite plugin:  every file in the guide's `folder` keeps its side effects (`UICounter.define()`).
 * - The content folder has no `package.json`, so the nearest one is the kit's (the content repo sits inside it):
 *   its `sideEffects` list doesn't name the guide's files, and the build dropped them, `<ui-counter>` undefined.
 * - On the resolved module, since that beats Rolldown's `treeshake.moduleSideEffects`.
 */
function keepSideEffects(folder: string) {
  return {
    name: "spell-epic:experiment-side-effects",
    enforce: "pre" as const,
    async resolveId(this: any, source: string, importer: string | undefined, options: Record<string, unknown>) {
      if (!importer?.startsWith(folder)) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved?.id.startsWith(folder) ? { ...resolved, moduleSideEffects: true } : resolved
    }
  }
}
