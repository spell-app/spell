import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui"

/**
 * The old attribute names (`AttributeSpec.replaces`) worked from epic `ui-gaps` P2 until P13:  now they do nothing.
 * - One old name per kind, on the tags that had them:  an old switch, an old plain name, a shared one, one turned round.
 * - `spell ui rename` still knows them all, to rewrite markup that's behind (`OldNames.test.ts`).
 * - spell ui rename: leave this file (its cases are the old names)
 */
describe("old attribute names, gone", () => {
  it.each([
    ["an old switch", `<ui-button primary>Go</ui-button>`, "color", undefined],
    ["an old look", `<ui-segment raised>x</ui-segment>`, "appearance", undefined],
    ["an old plain name", `<ui-card header="Title"></ui-card>`, "heading", undefined],
    ["the shared link's old name", `<ui-text href="help.html">help</ui-text>`, "link", undefined],
    ["one turned round", `<ui-section label="H" collapsible collapsed>x</ui-section>`, "open", true]
  ])("%s does nothing:  %s", async (_kind, html, attribute, value) => {
    const host = await ElementFixture.render<DOMElement>(html)
    await ElementFixture.settle()
    expect(host.valueNamed(attribute)).toBe(value)
  })

  it("isn't observed:  the tag lists only its attributes", () => {
    const observed = (customElements.get("ui-button") as unknown as { observedAttributes: string[] }).observedAttributes
    expect(observed).toContain("color")
    expect(observed).not.toContain("primary")
    expect(observed).not.toContain("href")
  })
})

describe("old tags, gone", () => {
  it.each(["ui-docs-themes", "ui-docs-toc", "ui-docs-example"])(
    "`<%s>` is defined by nothing:  a page still writing it draws nothing (epic `ui-gaps` Q28)",
    (tag) => {
      expect(customElements.get(tag)).toBeUndefined()
    }
  )
})
