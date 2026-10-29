import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { PreviewPage } from "spell/ui/components/ui-theme-editor/UIThemeEditor.types"
import { BenchPages } from "spell/ui/docs-components/ui-docs-theme-bench/BenchPages"

import "spell/ui/docs-components/ui-docs-theme-bench"

describe("<ui-docs-theme-bench>", () => {
  it("shows the theme editor, handed the four pages, App and Epic page first", async () => {
    const bench = await ElementFixture.render<DOMElement>(`<ui-docs-theme-bench></ui-docs-theme-bench>`)
    await ElementFixture.settle()
    const editor = bench.shadowRoot!.querySelector("ui-theme-editor") as (Element & { pages: PreviewPage[] }) | null
    expect(editor).not.toBeNull()
    expect(editor!.pages.map((page) => page.id)).toEqual(["app", "epic", "ui", "notebook"])
    expect(editor!.pages[1]!.label).toBe("Epic page")
  })
})

describe("BenchPages.pages()", () => {
  const pages = (editorBase: string | undefined) =>
    BenchPages.pages({ siteRoot: "/worktrees/debut", editorBase, labelOf: (id) => id, noEditor: "off" })

  it("the page server's under the site's address;  the editor app's at its own, by messages, its full view", () => {
    const [editor, epic] = pages("http://localhost:3000")
    expect(epic).toMatchObject({ url: "/worktrees/debut/epics/debut/debut.plan.html", reach: "same origin" })
    expect(editor).toMatchObject({
      url: "http://localhost:3000/edit/@spell/examples/Solitaire",
      reach: "messages",
      ownPrefix: "--spell-",
      fullView: true
    })
  })

  it("the editor's pages wait while it's found, and say why when it isn't running", () => {
    expect(pages(undefined)[0]!.url).toBeUndefined()
    expect(pages("")[0]).toMatchObject({ url: "", note: "off" })
  })
})
