import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"

/** A built site, as the javascript writer writes one:  a file's code between each separator. */
const SITE = [
  `import { core, Page, Site, h } from "@spell/core"\n\nexport class Home extends Page {\n  draw() {\n    return h("h1", "Home")\n  }\n}\nexport const home = new Home()`,
  `export class Grammar extends Page {\n  draw() {\n    // a comment naming home is no use of it\n    return h("p", "home, in words")\n  }\n}\nexport const grammar = new Grammar()`,
  `export class Card extends Page {}\nexport const card = new Card()\nexport class Deck extends Page {}`,
  `export class Notes extends Page {}\nexport const notes = new Notes()`,
  `export class Guide extends Site {\n  static pages = [{ page: "Home" }, { page: "Grammar" }, { page: "Notes" }]\n  get first() {\n    return home\n  }\n}\nexport const guide = new Guide()\nif (!core.isCarryingOver) guide.start()`
].join("\n// -----------\n")
const COMPILED = `${SITE}\n//# sourceMappingURL=Guide.spell.js.map\n`

describe("SP.PageChunks.split():  a built site's pages, each a chunk of its own (solid-2-final P13)", () => {
  test("a page alone in its file that nothing else names is cut out;  the rest stays in the main chunk", () => {
    const { main, pages } = SP.PageChunks.split(COMPILED)
    // Home:  named by the site's own code;  Card:  two pages in one file;  the site:  it starts the program
    expect([...pages.keys()]).toEqual(["Grammar", "Notes"])
    expect(main).toContain("export class Home extends Page")
    expect(main).toContain("export class Deck extends Page")
    expect(main).not.toContain("class Grammar")
    expect(main).not.toContain("class Notes")
    expect(main).toMatch(/^\/\/ spell-lazy-pages: Grammar,Notes$/m)
  })

  test("a page whose file holds a view one of the site's dialogs draws stays in the main chunk:  any page opens it", () => {
    const withDialog = COMPILED.replace(
      "export class Notes extends Page {}",
      "export class Notes extends Page {}\nexport class AddNoteDialog extends View {}"
    ).replace(
      'static pages = [{ page: "Home" }, { page: "Grammar" }, { page: "Notes" }]',
      'static pages = [{ page: "Home" }, { page: "Grammar" }, { page: "Notes" }]\n  static dialogs = [{ name: "add note dialog", view: "AddNoteDialog" }]'
    )
    const { main, pages } = SP.PageChunks.split(withDialog)
    expect([...pages.keys()]).toEqual(["Grammar"])
    expect(main).toContain("export class AddNoteDialog extends View")
  })

  test("the main chunk keeps every line where it was, so its source map holds", () => {
    const { main } = SP.PageChunks.split(COMPILED)
    expect(main.split("\n")).toHaveLength(COMPILED.split("\n").length)
    const at = (text: string, line: string) => text.split("\n").indexOf(line)
    expect(at(main, "export const guide = new Guide()")).toBe(at(COMPILED, "export const guide = new Guide()"))
    expect(main.endsWith("//# sourceMappingURL=Guide.spell.js.map\n")).toBe(true)
  })

  test("a page's chunk is its file's code under the program's imports", () => {
    const { pages } = SP.PageChunks.split(COMPILED)
    expect(pages.get("Notes")).toBe(
      `import { core, Page, Site, h } from "@spell/core"\nexport class Notes extends Page {}\nexport const notes = new Notes()`
    )
  })

  test("a program with no page alone in its file comes back as it was", () => {
    const whole = `import { core, App } from "@spell/core"\nexport class Game extends App {}\nexport const game = new Game()`
    expect(SP.PageChunks.split(whole)).toEqual({ main: whole, pages: new Map() })
  })
})
