import { readFileSync } from "fs"
import { beforeAll, describe, test, expect } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell-parser/spell/test"
import { SX } from "spell-parser/spellx"

/** spell's spellx pairs:  each `X.spellx` beside the `X.spell` it means (`tests/spell/spellx/`). */
const PAIRS = ["Card", "FlipTile", "Deck", "Scores", "Carta.es", "Ficha.es", "DoubleSidedView", "Solitaire"]

/**
 * The CODE SPELL a `.spellx` file means, as text (epic `elemental-spell` P8):  `SX.CodeSpellWriter.write()`.
 * - Each pair's spellx, written as code spell, compiles to what its `.spell` twin does:
 *   the text is the program, not a sketch of it.
 * - It differs from the twin `.spell` only in layout:  prose stays where it was (inside the template, not above it),
 *   and a template's line ends `:`, not `where:`.
 */
describe("CodeSpellWriter", () => {
  beforeAll(registerTestComponentPack)

  test.each(PAIRS)("%s.spellx, written as code spell, compiles as %s.spell does", (name) => {
    const written = SX.CodeSpellWriter.write(pair(`${name}.spellx`), { path: `/${name}.spellx` })
    const fromSpellx = compiled(written, `/${name}.spell`)
    const twin = compiled(pair(`${name}.spell`), `/${name}.spell`)
    expect(fromSpellx.errors).toEqual([])
    expect(fromSpellx.code).toBe(twin.code)
  })

  test("a member is bulleted, its details and aliases under it, a closer gone", () => {
    const written = SX.CodeSpellWriter.write(pair("FlipTile.spellx"), { path: "/FlipTile.spellx" })
    expect(written).toContain('a "flip tile" is a view:\n\t// A tile that shows one side at a time.\n')
    expect(written).toContain('\t- its "side" is one of up, down\n\t\t- it "is showing (side)"\n')
    expect(written).toContain("\t// Turns it over.\n\t- to flip it:\n\t\t- shortcut meta+F\n")
    expect(written).toContain("\t- on mouse down: flip it\n")
    expect(written).not.toMatch(/<\/>|<\/action>|<\/spell-view>/)
  })

  test("a drawing's bare names are their components' tags, each `</>` naming what it closes", () => {
    const written = SX.CodeSpellWriter.write(pair("FlipTile.spellx"), { path: "/FlipTile.spellx" })
    expect(written).toContain("\t- to draw its back:\n\t\t<ui-text>back</ui-text>\n")
    // the editor knows a project's own views:  its `componentTag`
    const card = SX.CodeSpellWriter.write('<spell-view "board">\n\t<draw>\n\t\t<card />\n\t</>\n</spell-view>\n', {
      componentTag: (word) => (word === "card" ? "game-card" : undefined)
    })
    expect(card).toContain("\t\t<game-card />")
  })

  test("the language's example word stays an example, though a pack has a component by that name (`<ui-example>`)", () => {
    const text = '<spell-view "board">\n\t<draw>\n\t\t<example "one">\n\t\t\t<text>hi</>\n\t\t</>\n\t</>\n</spell-view>\n'
    const written = SX.CodeSpellWriter.write(text, {
      componentTag: (word) => (word === "example" ? "ui-example" : word === "text" ? "ui-text" : undefined)
    })
    expect(written).toContain('\t\t<example "one">')
    expect(written).not.toContain("ui-example")
    expect(written).toContain("<ui-text>hi</ui-text>")
  })

  test("markup alone, an example's body:  its tags, at its own indent (P18)", () => {
    const body = '<card>\n\t<content>\n\t\t<avatar src="jenny.jpg"/> Jenny Hess\n\t</>\n</card>'
    const starts: number[] = []
    const written = SX.CodeSpellWriter.writeMarkup(body, {
      componentTag: (word, start) => {
        starts.push(start)
        return `ui-${word}`
      }
    })
    expect(written).toBe(
      '<ui-card>\n\t<ui-content>\n\t\t<ui-avatar src="jenny.jpg"/> Jenny Hess\n\t</ui-content>\n</ui-card>'
    )
    // each element's start, in the markup itself
    expect(starts.sort((a, b) => a - b)).toEqual([0, body.indexOf("<content>"), body.indexOf("<avatar")])
    expect(SX.CodeSpellWriter.writeMarkup("<button>Go</>")).toBe("<ui-button>Go</ui-button>")
  })

  test("an example with no name:  its twin writes none, no empty quoted name (P18)", () => {
    const text = [
      '<spell-notebook "avatar notebook">',
      '\t<example description="A button.">',
      "\t\t<button>Go</button>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const written = SX.CodeSpellWriter.write(text, { path: "/Avatar.spellx" })
    expect(written).toContain('\t\t<example description="A button.">\n')
    expect(written).not.toContain('<example ""')
  })
})

/** Pair fixture `name`'s text. */
function pair(name: string): string {
  return readFileSync(new URL(`../spell/spellx/${name}`, import.meta.url), "utf8")
}

/** `text`, one file at `path` of its own project, compiled:  its code without comments, and its parse errors. */
function compiled(text: string, path: string) {
  const [file] = parseSpellProject([{ path, contents: text }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors }
}
