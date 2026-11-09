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

/**
 * An action a later `<spell-more-of>` adds, called above it (epic `language` T83, Tic-Tac-Toe's `play the square`):
 * the read-ahead scan reads `<spell-more-of "square">` as `a square :`, which re-opens the square,
 * so its `play it` is callable from the board above it, in a drawing and in an action.
 */
describe("an action a later <spell-more-of> adds is callable above it", () => {
  beforeAll(registerTestComponentPack)

  test("from a drawing's handler and from another action", () => {
    const contents = [
      '<spell-thing "square">',
      '\t<property "mark">text</>',
      "</spell-thing>",
      '<spell-thing "board" template="list of squares">',
      '\t<action "play all">',
      "\t\tfor square in it",
      "\t\t\tplay the square",
      "\t</action>",
      "\t<draw>",
      "\t\t<for square in it>",
      "\t\t\t<button onClick={play the square}>{the mark of the square}</button>",
      "\t\t</for>",
      "\t</draw>",
      "</spell-thing>",
      '<spell-more-of "square">',
      '\t<action "play it">',
      '\t\tset its mark to "X"',
      "\t</action>",
      "</spell-more-of>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Board.spellml", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain("this.forEach((square) => square.play())")
    expect(file!.compiled).toContain("square.play()")
    expect(file!.compiled).not.toContain("core.play(")
  })
})
