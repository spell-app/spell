import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A `.spellml` view reading a property its file declares further down (epic `language` P17, data's I40):
 * `its lost signal` above `<property "lost signal">` reads both words, as code spell does.
 */
describe("a spellml view reads a property declared below its drawing", () => {
  beforeAll(registerTestComponentPack)

  test("in a text and in an attribute", () => {
    const contents = [
      '<spell-thing "film">',
      "\t<spell>",
      '\t\t- its "title" is text',
      "\t</spell>",
      "</spell-thing>",
      '<spell-view "shelf">',
      "\t<spell>",
      '\t\t- its "films" is a list of films',
      "\t</spell>",
      "\t<draw>",
      "\t\t<for its films failed={its lost signal} />",
      "\t\t<text>{its lost signal}</text>",
      "\t</draw>",
      '\t<property "lost signal">"Lost."</property>',
      "</spell-view>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Shelf.spellml", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain("failedSay: () => this.lostSignal")
    expect(file!.compiled).toContain('h("ui-text", () => this.lostSignal)')
  })
})
