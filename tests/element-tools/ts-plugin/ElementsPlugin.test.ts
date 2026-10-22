import ts from "@typescript/typescript6"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ElementCatalog } from "spell-kit/element-tools/ts-plugin/ElementCatalog"
import { ElementsPlugin } from "spell-kit/element-tools/ts-plugin/ElementsPlugin"
import { ELEMENTS_PLUGIN_CODES, ELEMENTS_PLUGIN_SOURCE } from "spell-kit/element-tools/tools.types"

/**
 * The TypeScript plugin, through TypeScript's own language service, in this process:
 * a tiny package on disk (its own Custom Elements Manifest, and a dependency's), and TypeScript 6's service over it.
 * - The package `fixture-app` ships `<fx-card>`, whose family is `src/components/fx-card/`;
 *   its dependency `fixture-ui` ships `<fx-modal>`, with slots `header` and `actions`.
 */
const ROOT = realpathSync(mkdtempSync(join(tmpdir(), "elements-plugin-")))
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

const MODAL_MANIFEST = manifest("src/fx-modal.ts", {
  name: "FxModal",
  tagName: "fx-modal",
  slots: [
    { name: "", description: "Its content." },
    { name: "header", description: "The title bar." },
    { name: "actions", description: "Buttons along the bottom." }
  ],
  cssParts: [{ name: "dialog" }],
  attributes: [{ name: "size" }, { name: "closed-by" }],
  events: [{ name: "fx-close" }]
})

const CARD_MANIFEST = manifest("src/components/fx-card/index.ts", {
  name: "FxCard",
  tagName: "fx-card",
  slots: [{ name: "" }],
  cssParts: [
    { name: "box", description: "The card's box." },
    { name: "title", description: "Its title line." }
  ]
})

const PAGE = `
export const page = (
  <fx-modal>
    <div slot="acions">OK</div>
    {true && <div slot="header">Title</div>}
    <fx-card slot="" />
  </fx-modal>
)
export const plain = <div><span slot="anything" /></div>
`

const ATTRIBUTES = `
export const attributes = (
  <fx-modal size="big" closed-bi="any" data-id="1" aria-label="A" on-fx-close={() => {}} on-fx-clos={() => {}} wild-thing>
    <x-unknown any-dashed="ok" />
  </fx-modal>
)
`

const CARD = `
export class FxCard {
  render() {
    return <div part="box titel">x</div>
  }
}
`

writeFiles({
  "package.json": {
    name: "fixture-app",
    customElements: "custom-elements.json",
    dependencies: { "fixture-ui": "*" }
  },
  "custom-elements.json": CARD_MANIFEST,
  "node_modules/fixture-ui/package.json": { name: "fixture-ui", customElements: "cem.json" },
  "node_modules/fixture-ui/cem.json": MODAL_MANIFEST,
  "src/page.tsx": PAGE,
  "src/attributes.tsx": ATTRIBUTES,
  "src/components/fx-card/FxCard.tsx": CARD
})

const PAGE_FILE = join(ROOT, "src/page.tsx")
const ATTRIBUTES_FILE = join(ROOT, "src/attributes.tsx")
const CARD_FILE = join(ROOT, "src/components/fx-card/FxCard.tsx")
const plugin = new ElementsPlugin({ typescript: ts, languageService: languageServiceOver(ROOT), projectDir: ROOT })
const service = plugin.decorated()

describe("ElementCatalog", () => {
  test("finds the package's own manifest first, then its dependencies'", () => {
    expect(plugin.catalog.manifestFiles).toEqual([
      join(ROOT, "custom-elements.json"),
      join(ROOT, "node_modules/fixture-ui/cem.json")
    ])
    expect(plugin.catalog.elementFor("fx-modal")?.slots.map((it) => it.name)).toEqual(["", "header", "actions"])
    expect(plugin.catalog.elementsIn(join(ROOT, "src/components/fx-card")).map((it) => it.tagName)).toEqual(["fx-card"])
  })

  test("re-reads a manifest when it changes", () => {
    const file = join(ROOT, "changing.json")
    writeFileSync(file, JSON.stringify(MODAL_MANIFEST))
    const catalog = new ElementCatalog({ from: ROOT, manifestFiles: [file] })
    expect(catalog.elementFor("fx-modal")).toBeDefined()
    writeFileSync(file, JSON.stringify(CARD_MANIFEST))
    utimesSync(file, new Date(), new Date(Date.now() + 10_000))
    expect(catalog.elementFor("fx-modal")).toBeUndefined()
    expect(catalog.elementFor("fx-card")).toBeDefined()
  })
})

describe("ElementsPlugin completions", () => {
  test("`slot=\"` completes the PARENT tag's named slots, with their descriptions", () => {
    const position = PAGE.indexOf('slot="acions"') + 'slot="'.length
    const completions = service.getCompletionsAtPosition(PAGE_FILE, position, {})
    expect(completions?.entries.slice(0, 2)).toMatchObject([
      { name: "header", labelDetails: { description: "<fx-modal>" }, replacementSpan: { start: position, length: 6 } },
      { name: "actions" }
    ])
    const details = service.getCompletionEntryDetails(PAGE_FILE, position, "actions", {}, undefined, {}, undefined)
    expect(details?.documentation).toEqual([{ kind: "text", text: "Buttons along the bottom." }])
  })

  test("a child of a plain tag gets no slot completions", () => {
    const position = PAGE.indexOf('slot="anything"') + 'slot="'.length
    const names = service.getCompletionsAtPosition(PAGE_FILE, position, {})?.entries.map((it) => it.name) ?? []
    expect(names).not.toContain("header")
  })

  test("`part=\"` in a component's own JSX completes its parts", () => {
    const position = CARD.indexOf("titel")
    const completions = service.getCompletionsAtPosition(CARD_FILE, position, {})
    expect(completions?.entries.slice(0, 2)).toMatchObject([
      { name: "box", labelDetails: { description: "<fx-card>" }, replacementSpan: { start: position, length: 5 } },
      { name: "title" }
    ])
  })
})

describe("ElementsPlugin warnings", () => {
  test("a slot the parent doesn't have is a WARNING;  a known one, and a plain tag's child, aren't", () => {
    expect(ourWarnings(PAGE_FILE)).toEqual([
      {
        code: ELEMENTS_PLUGIN_CODES.unknownSlot,
        category: ts.DiagnosticCategory.Warning,
        start: PAGE.indexOf("acions"),
        length: 6,
        messageText: '<fx-modal> has no slot "acions";  its slots:  header, actions'
      }
    ])
  })

  test("a part its component doesn't list is a warning, one per unknown name", () => {
    expect(ourWarnings(CARD_FILE)).toEqual([
      {
        code: ELEMENTS_PLUGIN_CODES.unknownPart,
        category: ts.DiagnosticCategory.Warning,
        start: CARD.indexOf("titel"),
        length: 5,
        messageText: '<fx-card> has no part "titel";  its parts:  box, title'
      }
    ])
  })
})

describe("ElementsPlugin dashed attributes", () => {
  // epic `intellisense` I2:  TypeScript lets any dashed name through in JSX
  test("a dashed attribute the tag doesn't have is a warning, with a guess when one is close", () => {
    expect(ourWarnings(ATTRIBUTES_FILE)).toEqual(
      [
        ["closed-bi", '<fx-modal> has no attribute "closed-bi";  did you mean "closed-by"?'],
        ["on-fx-clos", '<fx-modal> has no attribute "on-fx-clos";  did you mean "on-fx-close"?'],
        ["wild-thing", '<fx-modal> has no attribute "wild-thing"']
      ].map(([name, messageText]) => ({
        code: ELEMENTS_PLUGIN_CODES.unknownAttribute,
        category: ts.DiagnosticCategory.Warning,
        start: ATTRIBUTES.search(new RegExp(` ${name}[= >]`)) + 1,
        length: name!.length,
        messageText
      }))
    )
  })
})

describe("plugin.cjs", () => {
  test("loads as tsserver loads it, by the name a tsconfig gives:  a plugin module whose `create()` wraps the service", () => {
    // tsserver's own lookup (`Project.importServicePluginSync()`):  `node_modules` three folders above its file
    const searchPath = join(resolve(ts.sys.getExecutingFilePath(), "../../.."), "node_modules")
    // `require()` is tsserver's, not in TypeScript's public types
    const sys = ts.sys as typeof ts.sys & { require(dir: string, name: string): { module?: unknown; error?: Error } }
    const loaded = sys.require(searchPath, "spell-kit/src/element-tools/ts-plugin/plugin.cjs")
    expect(loaded.error).toBeUndefined()
    const init = loaded.module as ts.server.PluginModuleFactory
    const info = {
      languageService: languageServiceOver(ROOT),
      project: { getCurrentDirectory: () => ROOT, projectService: { logger: { info: () => {} } } }
    } as unknown as ts.server.PluginCreateInfo
    const wrapped = init({ typescript: ts }).create(info)
    expect(wrapped.getSemanticDiagnostics(CARD_FILE).some((it) => it.source === ELEMENTS_PLUGIN_SOURCE)).toBe(true)
  })
})

////////////////
// ## Helpers
////////////////

/** The plugin's own warnings for `file`, their fields that matter. */
function ourWarnings(file: string) {
  return service
    .getSemanticDiagnostics(file)
    .filter((it) => it.source === ELEMENTS_PLUGIN_SOURCE)
    .map(({ code, category, start, length, messageText }) => ({ code, category, start, length, messageText }))
}

/** A Custom Elements Manifest of one module, declaring one element. */
function manifest(path: string, declaration: object) {
  return {
    schemaVersion: "2.1.0",
    modules: [
      { kind: "javascript-module", path, declarations: [{ kind: "class", customElement: true, ...declaration }] }
    ]
  }
}

/** Write `files` under `ROOT`:  objects as JSON. */
function writeFiles(files: Record<string, string | object>) {
  for (const [path, content] of Object.entries(files)) {
    const file = join(ROOT, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content))
  }
}

/** TypeScript's language service over the `.tsx` files of `dir`'s `src/`, as JSX that's kept as is. */
function languageServiceOver(dir: string): ts.LanguageService {
  const fileNames = ["src/page.tsx", "src/attributes.tsx", "src/components/fx-card/FxCard.tsx"].map((it) =>
    join(dir, it)
  )
  const options: ts.CompilerOptions = { jsx: ts.JsxEmit.Preserve, noLib: true, types: [] }
  return ts.createLanguageService({
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => "1",
    getScriptSnapshot: (file) => {
      const text = ts.sys.readFile(file)
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => dir,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (it) => ts.getDefaultLibFilePath(it),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile
  })
}
