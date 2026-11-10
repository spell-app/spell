import { beforeAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * Which tag each bare component name in a spellx file became (epic `notebook` P6):  `SP.ComponentTags`.
 * - The one answer the language server's code-spell view, the editor's code-spell tab
 *   and the Spell view of an example on a page all share.
 */
describe("ComponentTags", () => {
  beforeAll(registerTestComponentPack)

  const TEXT = [
    '<spell-view "counter">',
    '\t<property "count">a number</>',
    "\t<draw><button>Clicked {its count} times</button></draw>",
    "</spell-view>",
    '<spell-page "home">',
    "\t<draw>",
    "\t\t<counter/>",
    "\t\t<text>Hi</text>",
    "\t</draw>",
    "</spell-page>",
    ""
  ].join("\n")

  test("each element's tag, as the parse chose it:  the project's own views, then its packs'", () => {
    const [file] = parseSpellProject([{ path: "/Counter.spell", contents: TEXT }]).files
    const tags = SP.ComponentTags.of(file!)
    const counter = TEXT.indexOf("<counter/>")
    expect(tags.componentTag("counter", counter)).toMatch(/-counter$/)
    expect(tags.tagFor("counter")).toBe(tags.componentTag("counter", counter))
    expect(tags.tagFor("button")).toBe("ui-button")
    // by its place only when its name is the one written there
    expect(tags.componentTag("text", counter)).toBe("ui-text")
  })

  test("backwards:  the bare name a tag stands for;  none for a tag no bare name gives", () => {
    const [file] = parseSpellProject([{ path: "/Counter.spell", contents: TEXT }]).files
    const tags = SP.ComponentTags.of(file!)
    expect(tags.wordFor(tags.tagFor("counter")!)).toBe("counter")
    expect(tags.wordFor("ui-text")).toBe("text")
    expect(tags.wordFor("ui-nothing")).toBeUndefined()
    expect(tags.wordFor("div")).toBeUndefined()
  })

  test("kept per parse:  the same answer until the file parses again", () => {
    const [file] = parseSpellProject([{ path: "/Counter.spell", contents: TEXT }]).files
    expect(SP.ComponentTags.of(file!)).toBe(SP.ComponentTags.of(file!))
  })
})
