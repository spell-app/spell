import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { keepingCommentsIn } from "spell/util/node/json5"
import { SiteDataBuilder } from "spell/ui/tools/SiteDataBuilder"
import { SpellUIGuide } from "spell/ui/util/SpellUIGuide"

import { AppUIDataBuilder } from "spell/app/app/tools/AppUIDataBuilder"

/** The pages read from a vocabulary, not a `file`:  the component file whose banner names the page. */
const VOCABULARY_FAMILY_FILES = {
  "spell-viewer": "src/app/components/spell-viewer/SpellViewer.tsx",
  "spell-editor": "src/app/components/spell-editor/SpellEditor.tsx",
  "spell-code": "src/app/components/spell-code/SpellCode.tsx",
  "spell-markdown": "src/app/components/spell-markdown/SpellMarkdown.tsx",
  "spell-reference-page": "src/app/components/spell-reference-page/SpellReferencePage.tsx",
  "spell-element": "src/app/runner/SpellElement.tsx"
}

/** One builder, one build, for every test:  it reads every `.tsx` file of the app. */
const BUILDER = new AppUIDataBuilder()
const DATA = await BUILDER.build()

describe("AppUIDataBuilder.build()", () => {
  test("components.json5 is up to date:  run `yarn site:data` after changing what it reads", () => {
    expect(readFileSync(BUILDER.dataFile, "utf8")).toBe(
      keepingCommentsIn(BUILDER.dataFile, SiteDataBuilder.stringify(DATA))
    )
  })

  test("EVERY page it lists is in the guide's site, at its address (epic `editor` P44)", () => {
    const site = readFileSync(path.join(BUILDER.root, "spaces/@spell/guides/AppUI/AppUI.spell"), "utf8")
    const missing = Object.keys(DATA.families).filter(
      (family) => !site.includes(`page at "${SpellUIGuide.setAddressOf("app", family).replace("/components/app", "")}"`)
    )
    expect(missing).toEqual([])
  })

  test("EVERY page's component points at its page, in its banner", () => {
    const files: Record<string, string | undefined> = {
      ...Object.fromEntries(Object.entries(BUILDER.pages.families).map(([family, seed]) => [family, seed.file])),
      ...VOCABULARY_FAMILY_FILES
    }
    const silent = Object.entries(files).filter(
      ([family, file]) =>
        !file || !readFileSync(path.join(BUILDER.root, file), "utf8").includes(SpellUIGuide.setAddressOf("app", family))
    )
    expect(silent.map(([family]) => family)).toEqual([])
  })

  test("files each tag under its page's group, and links a sub-component to its header there", () => {
    const sub = DATA.components.find((tag) => tag.tag === "SpellPage")
    expect(sub).toMatchObject({ topics: ["shell"] })
    expect(DATA.components.find((tag) => tag.tag === "spell-viewer")).toMatchObject({
      name: "<spell-viewer>",
      topics: ["web components"],
      href: "/components/app/spell-viewer"
    })
  })

  test("says where the app draws a component", () => {
    expect(DATA.components.find((tag) => tag.tag === "Notice")?.usedIn).toEqual([
      { name: "index", file: "src/app/index.tsx" }
    ])
  })
})
