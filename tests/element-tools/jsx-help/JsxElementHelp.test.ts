import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ElementCatalog } from "spell-kit/element-tools/jsx-help/ElementCatalog"
import { JsxElementHelp } from "spell-kit/element-tools/jsx-help/JsxElementHelp"
import { ELEMENT_HELP_CODES } from "spell-kit/element-tools/tools.types"

/**
 * The JSX help, over a tiny package on disk:  its own Custom Elements Manifest, and a dependency's.
 * - The package `fixture-app` ships `<fx-card>`, whose family is `src/components/fx-card/`;
 *   its dependency `fixture-ui` ships `<fx-modal>`, with slots `header` and `actions`.
 */
const ROOT = realpathSync(mkdtempSync(join(tmpdir(), "jsx-element-help-")))
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
const help = new JsxElementHelp({ catalog: new ElementCatalog({ from: join(ROOT, "src") }) })

describe("ElementCatalog", () => {
  test("finds the package's own manifest first, then its dependencies'", () => {
    expect(help.catalog.manifestFiles).toEqual([
      join(ROOT, "custom-elements.json"),
      join(ROOT, "node_modules/fixture-ui/cem.json")
    ])
    expect(help.catalog.elementFor("fx-modal")?.slots.map((it) => it.name)).toEqual(["", "header", "actions"])
    expect(help.catalog.elementsIn(join(ROOT, "src/components/fx-card")).map((it) => it.tagName)).toEqual(["fx-card"])
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

describe("JsxElementHelp completions", () => {
  test("`slot=\"` completes the PARENT tag's named slots, with their descriptions", () => {
    const position = PAGE.indexOf('slot="acions"') + 'slot="'.length
    expect(help.completionsAt(fileOf(PAGE_FILE), position)).toEqual({
      kind: "slot",
      label: "<fx-modal>",
      start: position,
      length: 6,
      names: [
        { name: "header", description: "The title bar." },
        { name: "actions", description: "Buttons along the bottom." }
      ]
    })
  })

  test("a child of a plain tag gets no slot completions", () => {
    const position = PAGE.indexOf('slot="anything"') + 'slot="'.length
    expect(help.completionsAt(fileOf(PAGE_FILE), position)).toBeUndefined()
  })

  test("`part=\"` in a component's own JSX completes its parts", () => {
    const position = CARD.indexOf("titel")
    expect(help.completionsAt(fileOf(CARD_FILE), position)).toMatchObject({
      kind: "part",
      label: "<fx-card>",
      start: position,
      length: 5,
      names: [{ name: "box" }, { name: "title" }]
    })
  })

  test("the text as it is in the editor, saved or not:  a value typed a moment ago", () => {
    const text = 'export const x = <fx-modal><b slot="" /></fx-modal>'
    const position = text.indexOf('slot="') + 'slot="'.length
    const names = help.completionsAt({ fileName: PAGE_FILE, text }, position)?.names.map((it) => it.name)
    expect(names).toEqual(["header", "actions"])
  })

  test("a file that isn't JSX gets nothing", () => {
    expect(help.completionsAt({ fileName: join(ROOT, "src/page.ts"), text: PAGE }, 10)).toBeUndefined()
    expect(help.warningsFor({ fileName: join(ROOT, "src/page.ts"), text: PAGE })).toEqual([])
  })
})

describe("JsxElementHelp warnings", () => {
  test("a slot the parent doesn't have is a WARNING;  a known one, and a plain tag's child, aren't", () => {
    expect(warningsFor(PAGE_FILE)).toEqual([
      {
        code: ELEMENT_HELP_CODES.unknownSlot,
        start: PAGE.indexOf("acions"),
        length: 6,
        message: '<fx-modal> has no slot "acions";  its slots:  header, actions'
      }
    ])
  })

  test("a part its component doesn't list is a warning, one per unknown name", () => {
    expect(warningsFor(CARD_FILE)).toEqual([
      {
        code: ELEMENT_HELP_CODES.unknownPart,
        start: CARD.indexOf("titel"),
        length: 5,
        message: '<fx-card> has no part "titel";  its parts:  box, title'
      }
    ])
  })
})

describe("JsxElementHelp dashed attributes", () => {
  // epic `intellisense` I2:  TypeScript lets any dashed name through in JSX
  test("a dashed attribute the tag doesn't have is a warning, with a guess when one is close", () => {
    expect(warningsFor(ATTRIBUTES_FILE)).toEqual(
      [
        ["closed-bi", '<fx-modal> has no attribute "closed-bi";  did you mean "closed-by"?'],
        ["on-fx-clos", '<fx-modal> has no attribute "on-fx-clos";  did you mean "on-fx-close"?'],
        ["wild-thing", '<fx-modal> has no attribute "wild-thing"']
      ].map(([name, message]) => ({
        code: ELEMENT_HELP_CODES.unknownAttribute,
        start: ATTRIBUTES.search(new RegExp(` ${name}[= >]`)) + 1,
        length: name!.length,
        message
      }))
    )
  })
})

////////////////
// ## Helpers
////////////////

/** The help's warnings for `file`, as it is on disk. */
function warningsFor(file: string) {
  return help.warningsFor(fileOf(file))
}

/** `file` as it is on disk. */
function fileOf(fileName: string) {
  return { fileName, text: readFileSync(fileName, "utf8") }
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
