import { readFileSync } from "fs"
import { describe, expect, test } from "vite-plus/test"

import type { SP } from "spell/parser/spell"
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { NotebookPageCells } from "spell/app/app/solid/notebook/NotebookPageCells"

/**
 * The Counter notebook, written in markdown:  its `#` title, its `##` sections and their text.
 * - Its counter is the Counter example's, which its project imports:  so it has no template cell of its own.
 */
const COUNTER = [
  '<spell-notebook "counter notebook">',
  "\t# Counter",
  "\tA button that counts its clicks.",
  "",
  "\t## Counter",
  "\tA counter starts at 0, and adds one each time it's clicked.",
  '\t<example "One counter">',
  "\t\t<counter/>",
  "\t</example>",
  "",
  "\t## Several counters",
  "\tEach counter keeps its own count:  clicking one leaves the others alone.",
  "\t<section>",
  '\t\t<example "Two counters">',
  "\t\t\t<counter/>",
  "\t\t\t<counter/>",
  "\t\t</example>",
  '\t\t<text color="grey">Click either one.</text>',
  "\t</section>",
  "</spell-notebook>",
  ""
].join("\n")

/** The Counter notebook, `@spell/notebooks/Counter`, as committed:  its title and sections written as tags. */
const TAGGED = readFileSync(
  new URL("../../../../spaces/@spell/notebooks/Counter/Counter.spellml", import.meta.url),
  "utf8"
)

/** A notebook with a template of its own, a card:  for the template cell's edits and groups. */
const CARDS = [
  '<spell-notebook "cards">',
  '\t<spell-view "card">',
  '\t\t<group "direction" description="Face up or face down"/>',
  '\t\t<property "direction" one-of="up, down"/>',
  '\t\t<action "turn it over">set its direction to up</>',
  "\t</spell-view>",
  "</spell-notebook>",
  ""
].join("\n")

/**
 * A notebook's page's cells, and the edits it makes (epic `elemental-spell` P16):  every edit changes only what it's
 * about, the rest of the file byte for byte.
 */
describe("NotebookPageCells", () => {
  const model = NotebookPageCells.of(COUNTER, "/Counter.spellml")!

  test("its cells, in order:  prose split at each ## heading, what it draws", () => {
    expect(model.name).toBe("counter notebook")
    expect(model.locked).toBe(false)
    expect(model.cells.map(({ kind, heading, title, name }) => ({ kind, heading, title, name }))).toEqual([
      { kind: "prose", heading: undefined, title: "Counter", name: undefined },
      { kind: "prose", heading: "Counter", title: undefined, name: undefined },
      { kind: "drawing", heading: undefined, title: undefined, name: "One counter" },
      { kind: "prose", heading: "Several counters", title: undefined, name: undefined },
      { kind: "drawing", heading: undefined, title: undefined, name: "" }
    ])
    // a drawing's examples, however deep:  the section's
    expect(model.cells[4]!.examples!.map((example) => [example.name, example.body.code])).toEqual([
      ["Two counters", "<counter/>\n<counter/>"]
    ])
  })

  test("an edit changes only its cell's span, its indent put back on every line", () => {
    const [template] = NotebookPageCells.of(CARDS, "/Cards.spellml")!.cells
    const edited = NotebookPageCells.withCode(CARDS, template!, template!.code.replace("to up", "to down"))
    expect(edited).toBe(CARDS.replace("to up", "to down"))
    const example = model.cells[2]!.examples![0]!
    expect(NotebookPageCells.withCode(COUNTER, example.body, "<counter/>\n<counter/>")).toBe(
      COUNTER.replace(
        '\t<example "One counter">\n\t\t<counter/>\n',
        '\t<example "One counter">\n\t\t<counter/>\n\t\t<counter/>\n'
      )
    )
  })

  test("an example that's one `<html>` block:  its body is what's inside the block, and an edit lands there (P18)", () => {
    const text = [
      '<spell-notebook "avatar examples">',
      '\t<example description="A comment\'s avatar.">',
      "\t\t<html>",
      "\t\t\t<ui-comment>",
      '\t\t\t\t<ui-avatar src="elliot.jpg"></ui-avatar>',
      "\t\t\t</ui-comment>",
      "\t\t</html>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const [example] = NotebookPageCells.of(text, "/Examples.spellml")!.cells[0]!.examples!
    expect(example).toMatchObject({ name: "", html: true })
    expect(example!.body.code).toBe('<ui-comment>\n\t<ui-avatar src="elliot.jpg"></ui-avatar>\n</ui-comment>')
    const edited = NotebookPageCells.withCode(text, example!.body, "<ui-comment>\n\t<code>hi</code>\n</ui-comment>")
    expect(edited).toBe(text.replace('<ui-avatar src="elliot.jpg"></ui-avatar>', "<code>hi</code>"))
  })

  test("lock, and unlock:  the Inspector's attribute edit, after the quoted name, and back as it was (P6)", () => {
    const locked = SourceEdits.applied(COUNTER, NotebookPageCells.lockEdits(COUNTER, model, true))
    expect(locked.split("\n")[0]).toBe('<spell-notebook "counter notebook" locked>')
    const relocked = NotebookPageCells.of(locked, "/Counter.spellml")!
    expect(relocked.locked).toBe(true)
    expect(SourceEdits.applied(locked, NotebookPageCells.lockEdits(locked, relocked, false))).toBe(COUNTER)
    // locked twice is still once
    expect(SourceEdits.applied(locked, NotebookPageCells.lockEdits(locked, relocked, true))).toBe(locked)
  })

  test('written as tags:  the title\'s `<header level="1">`, each `<section label>`;  a `<text>` is just a drawing (P6)', () => {
    const tagged = NotebookPageCells.of(TAGGED, "/Counter.spellml")!
    const cells = tagged.cells.map(({ kind, heading, title, lead, name }) =>
      Object.fromEntries(Object.entries({ kind, heading, title, lead, name }).filter(([, v]) => v))
    )
    expect(cells).toEqual([
      { kind: "heading", title: "Counter", lead: "A button that counts its clicks." },
      { kind: "template", name: "counter" },
      { kind: "heading", heading: "Counter" },
      { kind: "drawing", name: "One counter" },
      { kind: "heading", heading: "Several counters" },
      { kind: "drawing", name: "Two counters" },
      // the grey `<text>` after it
      { kind: "drawing" }
    ])
    // a section's cell is its opening tag;  `block`, the section whole
    const several = tagged.cells[4]!
    expect(several.code).toBe('<section label="Several counters">')
    expect(TAGGED.slice(several.block!.start, several.block!.end)).toMatch(/^<section[^]*<\/section>$/)
  })

  test("a template's groups:  each one's members together, under its name and description", () => {
    const [template] = NotebookPageCells.of(CARDS, "/Cards.spellml")!.cells
    expect(template!.groups).toEqual([
      { name: "direction", description: "Face up or face down", members: ["direction", "turn it over"] }
    ])
  })

  test("in Spanish, locked is bloqueado", () => {
    const text = '<encanto-cuaderno "cuaderno">\n\t# Hola\n</encanto-cuaderno>\n'
    const spanish = NotebookPageCells.of(text, "/Cuaderno.es.spellml")!
    expect(SourceEdits.applied(text, NotebookPageCells.lockEdits(text, spanish, true)).split("\n")[0]).toBe(
      '<encanto-cuaderno "cuaderno" bloqueado>'
    )
  })

  test("what a file's pages say:  its notebook's name, and whether a page is locked, read again as its text changes", () => {
    const file = { path: "/Counter.spellml", contents: COUNTER } as unknown as SP.SpellFile
    expect(NotebookPageCells.holdsNotebook(file)).toBe(true)
    expect(NotebookPageCells.notebookNameIn(file)).toBe("counter notebook")
    expect(NotebookPageCells.holdsLockedPage(file)).toBe(false)
    file.contents = COUNTER.replace('"counter notebook">', '"counter notebook" locked>')
    expect(NotebookPageCells.holdsLockedPage(file)).toBe(true)
    // any page, notebook or not:  the lock is every page's (epic `notebook` P1)
    file.contents = '<spell-page "home" locked>\n\t<draw><text>Hi</text></draw>\n</spell-page>\n'
    expect(NotebookPageCells.holdsNotebook(file)).toBe(false)
    expect(NotebookPageCells.notebookNameIn(file)).toBe("")
    expect(NotebookPageCells.holdsLockedPage(file)).toBe(true)
    // Spanish's word for it
    const spanish = {
      path: "/Cuaderno.es.spellml",
      contents: '<encanto-cuaderno "cuaderno" bloqueado>\n\t# Hola\n</encanto-cuaderno>\n'
    }
    expect(NotebookPageCells.holdsLockedPage(spanish as unknown as SP.SpellFile)).toBe(true)
  })
})

/**
 * Moving a page's parts, as the editor's drag and drop does (`PartEdits`, epic `notebook` P5):
 * a tag's span is `SourceEdits.elementAt()`'s, a run of prose's `NotebookPageCells.proseAt()`'s, and
 * `SourceEdits.moved()` moves them;  only what moved changes, the rest byte for byte.
 */
describe("NotebookPageCells.proseAt(), moved by SourceEdits", () => {
  const PATH = "/Counter.spellml"
  const at = (text: string, words: string) => text.indexOf(words)
  const prose = (text: string, words: string) => NotebookPageCells.proseAt(text, at(text, words), PATH)!
  const element = (text: string, words: string) => SourceEdits.elementAt(text, at(text, words))!

  test("a run of prose, a ## heading's section, and the section's own markdown", () => {
    const span = (words: string) => {
      const { start, end } = prose(COUNTER, words)
      return COUNTER.slice(start, end)
    }
    expect(span("# Counter")).toBe("# Counter\n\tA button that counts its clicks.")
    expect(span("## Counter")).toBe(
      "## Counter\n\tA counter starts at 0, and adds one each time it's clicked.\n" +
        '\t<example "One counter">\n\t\t<counter/>\n\t</example>'
    )
    expect(span("A counter starts")).toBe("A counter starts at 0, and adds one each time it's clicked.")
    // none starts at a tag, nor inside a run
    expect(NotebookPageCells.proseAt(COUNTER, at(COUNTER, '<example "One'), PATH)).toBeUndefined()
    expect(NotebookPageCells.proseAt(COUNTER, at(COUNTER, "counts its clicks"), PATH)).toBeUndefined()
  })

  test("an example moved before a ## section:  a blank line between them, the rest as it was", () => {
    const example = element(COUNTER, '<example "One counter">')
    const section = prose(COUNTER, "## Counter")
    const { text } = SourceEdits.moved(COUNTER, [example], { opening: section.start, where: "before", whole: section })
    expect(text).toBe(
      COUNTER.replace(
        "\t## Counter\n\tA counter starts at 0, and adds one each time it's clicked.\n" +
          '\t<example "One counter">\n\t\t<counter/>\n\t</example>\n',
        '\t<example "One counter">\n\t\t<counter/>\n\t</example>\n\n' +
          "\t## Counter\n\tA counter starts at 0, and adds one each time it's clicked.\n"
      )
    )
  })

  test("a ## section moved up, past another:  whole, with what it gathers;  no blank line left before the closer", () => {
    const several = prose(COUNTER, "## Several counters")
    const counter = prose(COUNTER, "## Counter")
    const { text, starts } = SourceEdits.moved(COUNTER, [several], {
      opening: counter.start,
      where: "before",
      whole: counter
    })
    const severalText = COUNTER.slice(several.start, several.end)
    const counterText = COUNTER.slice(counter.start, counter.end)
    expect(text).toBe(COUNTER.slice(0, counter.start) + severalText + "\n\n\t" + counterText + "\n</spell-notebook>\n")
    expect(text.startsWith("## Several counters", starts[0]!)).toBe(true)
  })

  test("a run of prose moved after an example:  its own lines, a blank line before it", () => {
    const run = prose(COUNTER, "A counter starts")
    const example = element(COUNTER, '<example "One counter">')
    const { text } = SourceEdits.moved(COUNTER, [run], { opening: example.start, where: "after" })
    expect(text).toBe(
      COUNTER.replace("\tA counter starts at 0, and adds one each time it's clicked.\n", "").replace(
        "\t</example>\n\n\t## Several",
        "\t</example>\n\n\tA counter starts at 0, and adds one each time it's clicked.\n\n\t## Several"
      )
    )
    // it reads as a run of its own, in the same section
    const cells = NotebookPageCells.of(text, PATH)!.cells.map((cell) => cell.code.split("\n")[0])
    expect(cells.slice(1, 4)).toEqual([
      "## Counter",
      '<example "One counter">',
      "A counter starts at 0, and adds one each time it's clicked."
    ])
  })
})
