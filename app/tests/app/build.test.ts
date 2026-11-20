import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, posix } from "node:path"

import { chromium } from "playwright"
import { createServer } from "vite-plus"
import { afterAll, beforeAll, describe, test, expect } from "vite-plus/test"

import { SRV } from "spell/server"
import { serveHandler } from "spell/server/test/serve"
import { absoluteImports } from "spell/app/app/runner"

/**
 * Production build smoke test.
 * - Rules defined as classes register under their CLASS NAME (`Rule.instantiate()`), so a minifier which
 *   mangles class names silently breaks every grammar -- and only in production.
 * - `vite.config.ts` sets `output.keepNames` to prevent that;  this fails if someone removes it.
 * - Standard decorators MUST be lowered by `vite.decorators.ts` -- vite's own transformer passes them
 *   through raw, which no browser can run.
 * - `core` MUST be in `spell-runtime.js` alone -- the runtime programs run on -- NOT in the app's chunks.
 *   - Nor in any chunk it loads:  a copy of it (`loadRuntime()`) shares those, and would share `core` with them
 *     (epic `from-console` P13).  A browser loads the runtime and a copy to check.
 * - And `spell-runtime.js` holds no Solid or `spell-ui`:  compiled spell draws with the APP's Solid, from a
 *   shared chunk (epic `output-targets` P10).  Only `@solidjs/h` is its own, a thin layer over that Solid.
 * - No React anywhere:  not in the app's chunks (P9), nor in what programs run on (epic `output-targets` P11).
 * - `ui`'s icon packs and sounds beside the chunks holding `BuiltInPacks` and `BuiltInSounds`, where they look
 *   (`appConfig({ builtInFiles })`).
 * - Built with `--sourcemap` (the config writes none):  what a chunk holds comes from its map's `sources`.
 */
describe("production build", () => {
  /** The build, made once in `beforeAll()`. */
  let outDir = ""

  beforeAll(() => {
    outDir = mkdtempSync(join(tmpdir(), "spell-build-"))
    // `vp`, the install's Vite:  it has no `vite` command, and `npx vite` would fetch another
    execFileSync("vp", ["build", "--outDir", outDir, "--emptyOutDir", "--sourcemap", "--logLevel", "silent"], {
      // the package folder:  a root run has another working directory
      cwd: join(import.meta.dirname, "../../app"),
      stdio: "pipe"
    })
  }, 120_000)

  afterAll(() => rmSync(outDir, { recursive: true, force: true }))

  test("keeps rule class names, lowers decorators, keeps `core` in `spell-runtime.js`, emits icon packs and sounds", () => {
    {
      const assets = join(outDir, "assets")
      const files = readdirSync(assets).filter((file) => file.endsWith(".js"))
      const chunks = files.map((file) => readFileSync(join(assets, file), "utf8"))
      // the runtime programs run on -- its own entry, holding ALL of `core` (`resetRuntime` is its own);
      // none of the app's chunks may load a second one.  See `spellRuntime.ts`.
      const runtime = readFileSync(join(outDir, "spell-runtime.js"), "utf8")
      expect(runtime).toContain("resetRuntime")
      expect(chunks.filter((chunk) => chunk.includes("resetRuntime"))).toEqual([])
      expect(() => execFileSync("node", ["--check", join(outDir, "spell-runtime.js")], { stdio: "pipe" })).not.toThrow()
      expect(sources(join(outDir, "spell-runtime.js")).filter((source) => SOLID_OR_UI.test(source))).toEqual([])
      const js = [runtime, ...chunks].join("\n")
      // No raw decorator syntax survived (e.g. `@proto static alias = ...`)
      // NOTE: bare `@proto` DOES legitimately appear, in error message strings.
      expect(js).not.toMatch(/@proto\s+static\s+\w+\s*=/)
      // `DefinePropertyHas` is a REGISTERED rule, its name in the grammar worked out from its class name
      // (`define_property_has`, `P.Rule.ruleNameFor()`) -- that's what `keepNames` protects.
      // - Minified without it, it'd be e.g. `Ab=class extends ...` and the rule would register under a garbage name.
      // - Survives in one of three shapes:  `X = class`, `class X`, or, for a decorated class,
      //   esbuild's `__name(cls, "X")` helper, itself minified to e.g. ``Px(uS,`X`)``.
      //   - The minified class may be named with a `$`, e.g. ``E($m,`X`)``:  which name it gets moves with every build.
      const RULE = "DefinePropertyHas"
      expect(js).toMatch(
        new RegExp(String.raw`\b${RULE}\s*=\s*class\b|\bclass ${RULE}\b|\([\w$]+,\s*[\`"']${RULE}[\`"']\)`)
      )
      // no React anywhere:  the app has none (P9), and programs draw with Solid (epic `output-targets` P11)
      const withReact = [...files.map((file) => join(assets, file)), join(outDir, "spell-runtime.js")].filter((file) =>
        sources(file).some((source) => REACT.test(source))
      )
      expect(withReact).toEqual([])
      // icon packs where `BuiltInPacks` looks:  beside its own chunk
      const builtIns = files.filter((file) => sources(join(assets, file)).some((source) => BUILT_IN_PACKS.test(source)))
      expect(builtIns).toHaveLength(1)
      const packs = join(assets, dirname(builtIns[0]!), "icon-packs")
      for (const pack of ["fa7-free", "fa7-brands", "fomantic"]) {
        expect(existsSync(join(packs, pack, "pack.js")), pack).toBe(true)
      }
      // the built-in sounds where `BuiltInSounds` looks:  beside its own chunk (epic `mockup` P28)
      const soundCode = files.filter((file) =>
        sources(join(assets, file)).some((source) => BUILT_IN_SOUNDS.test(source))
      )
      expect(soundCode).toHaveLength(1)
      expect(existsSync(join(assets, dirname(soundCode[0]!), "sound-library", "card-slide.ogg"))).toBe(true)
    }
  })

  test("what a runtime keeps per copy -- `core` and the runner -- is in `spell-runtime.js`, never in a chunk it loads", () => {
    // every chunk it loads, at once or lazily:  a copy shares them all (`loadRuntime()`)
    const loaded = importedChunks(outDir, "spell-runtime.js")
    expect(loaded.length).toBeGreaterThan(0)
    const perCopy = loaded.filter((file) => sources(join(outDir, file)).some((source) => PER_COPY.test(source)))
    expect(perCopy).toEqual([])
  })

  /**
   * The runtime and a copy of it, as `loadRuntime()` makes one, in a real browser (epic `from-console` P13):
   * - each has its OWN `core`, so the copy loaded last can't take over the first one's `defineElement()`
   * - both draw on the page's ONE Spell UI element core, and the Solid under it:  `E`'s decorators are its
   *   - not `h`:  `@solidjs/h` is a thin layer each runtime bundles, over that Solid
   * - a view class declared on either gets its tag defined on the page;
   *   one of the other copy's gets none, and a warning
   */
  test("a copy of the runtime has its own `core`, and the page's one Spell UI and Solid", async () => {
    writeFileSync(join(outDir, "blank.html"), "<!doctype html><title>blank</title>")
    const served = await serveHandler(new SRV.StaticHandler({ mounts: [{ prefix: "/", dir: outDir }] }).handle)
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      const warnings: string[] = []
      page.on("console", (message) => {
        if (message.type() === "warning") warnings.push(message.text())
      })
      await page.goto(`${served.base}/blank.html`)
      const url = `${served.base}/spell-runtime.js`
      const copySource = absoluteImports(readFileSync(join(outDir, "spell-runtime.js"), "utf8"), url)
      const seen = await page.evaluate(
        async ([url, copySource]) => {
          type Runtime = {
            core: { defineElement(Class: unknown, project: string): string | undefined }
            View: new () => object
            E: { proto: unknown }
          }
          // not a bare `import()`:  Vitest would rewrite it into its own, which the page hasn't got
          // oxlint-disable-next-line no-implied-eval -- a fixed text, so Vitest leaves the `import()` in it alone
          const load = new Function("url", "return import(url)") as (url: string) => Promise<Runtime>
          const main = await load(url!)
          // the copy loads AFTER the main one, as the layout's did when it broke
          const blob = URL.createObjectURL(new Blob([copySource!], { type: "text/javascript" }))
          const copy = await load(blob)
          const mainTag = main.core.defineElement(class Card extends main.View {}, "Probe")
          const copyTag = copy.core.defineElement(class Pile extends copy.View {}, "Probe")
          const foreignTag = main.core.defineElement(class Stray extends copy.View {}, "Probe")
          // the page hears of a view class in a microtask
          await new Promise((resolve) => setTimeout(resolve, 0))
          return {
            sameCore: main.core === copy.core,
            sameSpellUI: main.E.proto === copy.E.proto,
            mainTag,
            copyTag,
            foreignTag,
            mainDefined: !!mainTag && !!customElements.get(mainTag),
            copyDefined: !!copyTag && !!customElements.get(copyTag)
          }
        },
        [url, copySource]
      )
      expect(seen).toMatchObject({
        sameCore: false,
        sameSpellUI: true,
        mainTag: "probe-card",
        copyTag: "probe-pile",
        foreignTag: undefined,
        mainDefined: true,
        copyDefined: true
      })
      expect(warnings.filter((text) => text.includes("Stray is a view of another copy"))).toHaveLength(1)
    } finally {
      await browser.close()
      await served.close()
    }
  }, 60_000)
})

/**
 * The editor's dev server, `vp dev` in `app/` (`EditorServer`, `yarn start:dev`):  its page's entry loads.
 * - `index.html` loads `../src/app/index.tsx`;  the dev server asks for it as `/src/app/index.tsx`,
 *   outside its root, so `vite.config.ts`'s `repoSourceInDev()` finds it in the repo's `src/` (epic `spanish` J94).
 * - A copy of the runtime (`?layout-copy`) imports its own `core` and runner, and the page's Solid and Spell UI
 *   (`runtimeCopyInDev()`;  epic `from-console` P13).
 */
describe("dev server", () => {
  test("serves the editor's page, `/edit/...`, and its entry, from the repo's `src/`;  a runtime copy's own `core`", async () => {
    // a cache of its own:  sharing `node_modules/.vite` would make a running editor's optimized deps outdated
    const cacheDir = mkdtempSync(join(tmpdir(), "spell-vite-"))
    const server = await createServer({
      configFile: join(import.meta.dirname, "../../app/vite.config.ts"),
      root: join(import.meta.dirname, "../../app"),
      cacheDir,
      logLevel: "silent",
      // any free port, and no proxy:  the page server's API isn't needed for the page itself
      server: { port: 0, strictPort: false, hmr: false, proxy: {} }
    })
    try {
      await server.listen()
      const base = server.resolvedUrls!.local[0]!
      const page = new URL("edit/@spell/examples/Solitaire", base)
      const html = await (await fetch(page)).text()
      const entry = /<script type="module" src="([^"]+index\.tsx)"/.exec(html)?.[1]
      expect(entry).toBeDefined()
      const response = await fetch(new URL(entry!, page))
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toMatch(/javascript/)
      expect(await response.text()).toContain("app/src/app/editor.ts")
      // the layout's copy of the runtime:  its imports of `core` and the runner are copies too, but not Solid's
      const copy = await (await fetch(new URL("/src/app/runner/spellRuntime.ts?layout-copy", base))).text()
      const imports = importsOf(copy)
      expect(imports.find((specifier) => specifier.includes("/parser/src/core/"))).toMatch(/\?layout-copy$/)
      expect(imports.find((specifier) => specifier.includes("/runner/runCompiled"))).toMatch(/\?layout-copy$/)
      // its element, which draws with the page's Solid and Spell UI:  never copies of them
      const element = imports.find((specifier) => specifier.includes("/runner/SpellElement"))!
      expect(element).toMatch(/\?layout-copy$/)
      const elementImports = importsOf(await (await fetch(new URL(element, base))).text())
      const shared = elementImports.filter(
        (specifier) => SOLID_OR_UI.test(specifier) || /\/(solid-js|@solidjs_web)\b/.test(specifier)
      )
      expect(shared.length).toBeGreaterThan(1)
      expect(shared.filter((specifier) => specifier.includes("-copy"))).toEqual([])
    } finally {
      await server.close()
      rmSync(cacheDir, { recursive: true, force: true })
    }
  }, 60_000)
})

/** Solid's packages and `spell-ui`, as they appear in a sourcemap's `sources`. */
const SOLID_OR_UI = /\/node_modules\/(solid-js|@solidjs\/(web|signals))\/|\/ui\/src\//

/** The modules a dev server's module imports statically:  `from "..."`. */
function importsOf(source: string): string[] {
  return [...source.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map(([, specifier]) => specifier!)
}

/** What a runtime keeps per copy, as it appears in a sourcemap's `sources`:  `PER_COPY` in `vite.config.ts`. */
const PER_COPY = /\/(parser\/src\/core|app\/src\/app\/runner)\//

/** A relative import in minified output, static or lazy:  `from"./x.js"`, `import"./x.js"`, ``import(`./x.js`)``. */
const RELATIVE_IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*["'`](\.{1,2}\/[^"'`]+\.js)["'`]/g

/**
 * `entry`'s chunks, every one it imports, transitively, at once or lazily -- paths from `dir`, `entry` left out.
 * - Reads the minified output's relative imports (`RELATIVE_IMPORT`).
 */
function importedChunks(dir: string, entry: string): string[] {
  const seen = new Set<string>([entry])
  const queue = [entry]
  for (let file = queue.shift(); file; file = queue.shift()) {
    for (const [, specifier] of readFileSync(join(dir, file), "utf8").matchAll(RELATIVE_IMPORT)) {
      const imported = posix.join(posix.dirname(file), specifier!)
      if (seen.has(imported)) continue
      seen.add(imported)
      queue.push(imported)
    }
  }
  seen.delete(entry)
  return [...seen]
}

/** React and what renders with it, as they appear in a sourcemap's `sources`. */
const REACT = /\/node_modules\/(react|react-dom|scheduler|semantic-ui-react)\//

/** `ui`'s `BuiltInPacks`, which looks for the packs beside its own chunk. */
const BUILT_IN_PACKS = /\/ui\/src\/icons\/BuiltInPacks\.ts$/

/** `ui`'s `BuiltInSounds`, which looks for the sounds beside its own chunk. */
const BUILT_IN_SOUNDS = /\/ui\/src\/sounds\/BuiltInSounds\.ts$/

/** Source modules javascript file `file` was built from, from its sourcemap;  none for a chunk without one (a facade). */
function sources(file: string): string[] {
  const map = `${file}.map`
  return existsSync(map) ? (JSON.parse(readFileSync(map, "utf8")) as { sources: string[] }).sources : []
}
