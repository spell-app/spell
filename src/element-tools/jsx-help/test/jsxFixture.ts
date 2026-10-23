/// <reference types="node" />

import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

/**
 * A tiny package on disk for the elements help's tests:  its own Custom Elements Manifest, and a dependency's.
 * - The package `fixture-app` ships `<fx-card>`, whose family is `src/components/fx-card/`;
 *   its dependency `fixture-ui` ships `<fx-modal>`, with slots `header` and `actions`.
 * - Shared by the kit's `JsxElementHelp` tests and spell-app's VS Code extension's (`ElementsHelp`):
 *   one fixture, so the two can't drift apart.
 * - Node built-ins only, and no test runner:  each test file cleans up its own folder.
 */

/** `<fx-modal>`'s manifest:  the dependency's. */
export const MODAL_MANIFEST = manifest("src/fx-modal.ts", {
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

/** `<fx-card>`'s manifest:  the package's own, its family in `src/components/fx-card/`. */
export const CARD_MANIFEST = manifest("src/components/fx-card/index.ts", {
  name: "FxCard",
  tagName: "fx-card",
  slots: [{ name: "" }],
  cssParts: [
    { name: "box", description: "The card's box." },
    { name: "title", description: "Its title line." }
  ]
})

/** A page using `<fx-modal>`:  one misspelt slot (`acions`), one known, and a plain tag's child. */
export const PAGE = `
export const page = (
  <fx-modal>
    <div slot="acions">OK</div>
    {true && <div slot="header">Title</div>}
    <fx-card slot="" />
  </fx-modal>
)
export const plain = <div><span slot="anything" /></div>
`

/** `<fx-modal>`'s dashed attributes:  known ones, always-allowed ones, and three it doesn't have. */
export const ATTRIBUTES = `
export const attributes = (
  <fx-modal size="big" closed-bi="any" data-id="1" aria-label="A" on-fx-close={() => {}} on-fx-clos={() => {}} wild-thing>
    <x-unknown any-dashed="ok" />
  </fx-modal>
)
`

/** `<fx-card>`'s own JSX, in its family's folder:  one known part, one misspelt (`titel`). */
export const CARD = `
export class FxCard {
  render() {
    return <div part="box titel">x</div>
  }
}
`

/**
 * Write the fixture package into a new temporary folder.
 * - Its root is a REAL path (macOS's `/var` is a link):  the catalog names its folders by their real paths.
 * - The caller removes `root` when it's done.
 */
export function writeJsxFixture(): JsxFixture {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "jsx-element-help-")))
  writeFiles(root, {
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
  return {
    root,
    pageFile: join(root, "src/page.tsx"),
    attributesFile: join(root, "src/attributes.tsx"),
    cardFile: join(root, "src/components/fx-card/FxCard.tsx")
  }
}

/** The fixture package written by `writeJsxFixture()`:  absolute paths. */
export type JsxFixture = {
  /** The package's folder, a temporary one. */
  root: string
  /** `PAGE`'s file, `src/page.tsx`. */
  pageFile: string
  /** `ATTRIBUTES`' file, `src/attributes.tsx`. */
  attributesFile: string
  /** `CARD`'s file, in `<fx-card>`'s family:  `src/components/fx-card/FxCard.tsx`. */
  cardFile: string
}

/** A Custom Elements Manifest of one module, declaring one element. */
export function manifest(path: string, declaration: object) {
  return {
    schemaVersion: "2.1.0",
    modules: [
      { kind: "javascript-module", path, declarations: [{ kind: "class", customElement: true, ...declaration }] }
    ]
  }
}

/** Write `files` under `root`:  objects as JSON. */
export function writeFiles(root: string, files: Record<string, string | object>): void {
  for (const [path, content] of Object.entries(files)) {
    const file = join(root, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content))
  }
}
