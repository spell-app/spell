import { readFileSync } from "fs"
import { describe, expect, test } from "vite-plus/test"

import type { SP } from "spell/parser/spell"
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { NotebookPageCells } from "spell/app/app/solid/notebook/NotebookPageCells"

/**
 * A counter notebook, written in markdown:  its `#` title, its `##` sections and their text.
 * - Its counter is some other project's:  so it declares no view of its own.
 */
const COUNTER = [
  '"counter notebook" is a notebook page',
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
  ""
].join("\n")

/**
 * A notebook with a view of its own, in plain Spell above its head:
 * its title and sections written as tags, and text after a drawing.
 */
const TAGGED = [
  'a "counter" is a view:',
  '\t- its "count" is a number starting at 0',
  "\t- to count up: set its count to its count + 1",
  "\t- to draw it:",
  "\t\t<button onClick={count up}>Clicked {its count} times</button>",
  "",
  '"counter notebook" is a notebook page',
  '\t<header level="1">',
  "\t\tCounter",
  "\t\t<header>A button that counts its clicks.</header>",
  "\t</header>",
  "",
  '\t<section label="Counter">',
  '\t\t<example "One counter" description="A counter starts at 0, and adds one each time it\'s clicked.">',
  "\t\t\t<counter/>",
  "\t\t</example>",
  "\t</section>",
  "",
  '\t<section label="Several counters">',
  '\t\t<example "Two counters" description="Each counter keeps its own count:  clicking one leaves the others alone.">',
  "\t\t\t<counter/>",
  "\t\t\t<counter/>",
  "\t\t</example>",
  '\t\t<text color="grey">Click either one.</text>',
  "\t</section>",
  ""
].join("\n")

/** Detail's Examples page, as committed in the Spell UI site:  a real page, its title and sections written as tags. */
const SITE_PAGE = readFileSync(
  new URL("../../../../spaces/@spell/guides/SpellUI/Detail/Examples.spell", import.meta.url),
  "utf8"
)

/**
 * A notebook's page's cells, and the edits it makes (epic `elemental-spell` P16):  every edit changes only what it's
 * about, the rest of the file byte for byte.
 */
describe("NotebookPageCells", () => {
  const model = NotebookPageCells.of(COUNTER, "/Counter.spell")!

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
    const run = model.cells[1]!
    const edited = NotebookPageCells.withCode(COUNTER, run, run.code.replace("starts at 0", "starts at zero"))
    expect(edited).toBe(COUNTER.replace("starts at 0", "starts at zero"))
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
      '"avatar examples" is a notebook page',
      '\t<example description="A comment\'s avatar.">',
      "\t\t<html>",
      "\t\t\t<ui-comment>",
      '\t\t\t\t<ui-avatar src="elliot.jpg"></ui-avatar>',
      "\t\t\t</ui-comment>",
      "\t\t</html>",
      "\t</example>",
      ""
    ].join("\n")
    const [example] = NotebookPageCells.of(text, "/Examples.spell")!.cells[0]!.examples!
    expect(example).toMatchObject({ name: "", html: true })
    expect(example!.body.code).toBe('<ui-comment>\n\t<ui-avatar src="elliot.jpg"></ui-avatar>\n</ui-comment>')
    const edited = NotebookPageCells.withCode(text, example!.body, "<ui-comment>\n\t<code>hi</code>\n</ui-comment>")
    expect(edited).toBe(text.replace('<ui-avatar src="elliot.jpg"></ui-avatar>', "<code>hi</code>"))
  })

  test("lock, and unlock:  a word of its head, first of its flags, and back as it was (P6)", () => {
    const locked = SourceEdits.applied(COUNTER, NotebookPageCells.lockEdits(COUNTER, model, true))
    expect(locked.split("\n")[0]).toBe('"counter notebook" is a locked notebook page')
    const relocked = NotebookPageCells.of(locked, "/Counter.spell")!
    expect(relocked.locked).toBe(true)
    expect(SourceEdits.applied(locked, NotebookPageCells.lockEdits(locked, relocked, false))).toBe(COUNTER)
    // locked twice is still once
    expect(SourceEdits.applied(locked, NotebookPageCells.lockEdits(locked, relocked, true))).toBe(locked)
  })

  test('written as tags:  the title\'s `<header level="1">`, each `<section label>`;  a `<text>` is just a drawing;  its own view no cell (P6)', () => {
    const tagged = NotebookPageCells.of(TAGGED, "/Counter.spell")!
    const cells = tagged.cells.map(({ kind, heading, title, lead, name }) =>
      Object.fromEntries(Object.entries({ kind, heading, title, lead, name }).filter(([, v]) => v))
    )
    expect(cells).toEqual([
      { kind: "heading", title: "Counter", lead: "A button that counts its clicks." },
      { kind: "heading", heading: "Counter" },
      { kind: "drawing", name: "One counter" },
      { kind: "heading", heading: "Several counters" },
      { kind: "drawing", name: "Two counters" },
      // the grey `<text>` after it
      { kind: "drawing" }
    ])
    // a section's cell is its opening tag;  `block`, the section whole
    const several = tagged.cells[3]!
    expect(several.code).toBe('<section label="Several counters">')
    expect(TAGGED.slice(several.block!.start, several.block!.end)).toMatch(/^<section[^]*<\/section>$/)
  })

  test("a site page:  its title and lead, its section headings, a section's cell its opening tag and the section whole", () => {
    const page = NotebookPageCells.of(SITE_PAGE, "/Detail/Examples.spell")!
    expect(page.cells[0]).toMatchObject({
      kind: "heading",
      title: "Detail",
      lead: "A detail is a label's dimmer second value, such as a count."
    })
    const sections = page.cells.filter((cell) => cell.kind === "heading" && cell.heading)
    expect(sections.map((cell) => cell.heading)).toEqual(["Owners", "Variations"])
    expect(sections[0]!.code).toBe('<section label="Owners">')
    expect(SITE_PAGE.slice(sections[1]!.block!.start, sections[1]!.block!.end)).toMatch(/^<section[^]*<\/>$/)
  })

  // epic `language` J76:  the lock agrees with `página`;  both words still read
  test("in Spanish on a plain head, locked is written bloqueada, and taken off again", () => {
    const text = '"cuaderno" es una página cuaderno\n\t# Hola\n'
    const spanish = NotebookPageCells.of(text, "/Cuaderno.es.spell")!
    const locked = SourceEdits.applied(text, NotebookPageCells.lockEdits(text, spanish, true))
    expect(locked.split("\n")[0]).toBe('"cuaderno" es una página cuaderno bloqueada')
    const lockedModel = NotebookPageCells.of(locked, "/Cuaderno.es.spell")!
    expect(lockedModel.locked).toBe(true)
    expect(SourceEdits.applied(locked, NotebookPageCells.lockEdits(locked, lockedModel, false))).toBe(text)
    const old = '"cuaderno" es una página cuaderno bloqueado\n\t# Hola\n'
    expect(NotebookPageCells.of(old, "/Cuaderno.es.spell")!.locked).toBe(true)
  })

  test("what a file's pages say:  its notebook's name, and whether a page is locked, read again as its text changes", () => {
    const file = { path: "/Counter.spell", contents: COUNTER } as unknown as SP.SpellFile
    expect(NotebookPageCells.holdsNotebook(file)).toBe(true)
    expect(NotebookPageCells.notebookNameIn(file)).toBe("counter notebook")
    expect(NotebookPageCells.holdsLockedPage(file)).toBe(false)
    file.contents = COUNTER.replace("is a notebook page", "is a locked notebook page")
    expect(NotebookPageCells.holdsLockedPage(file)).toBe(true)
    // any page, notebook or not:  the lock is every page's (epic `notebook` P1)
    file.contents = '"home" is a locked page\n\t<text>Hi</text>\n'
    expect(NotebookPageCells.holdsNotebook(file)).toBe(false)
    expect(NotebookPageCells.notebookNameIn(file)).toBe("")
    expect(NotebookPageCells.holdsLockedPage(file)).toBe(true)
    // Spanish's word for it
    const spanish = {
      path: "/Cuaderno.es.spell",
      contents: '"cuaderno" es una página cuaderno bloqueada\n\t# Hola\n'
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
  const PATH = "/Counter.spell"
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

  test("a ## section moved up, past another:  whole, with what it gathers;  no blank line left at the end", () => {
    const several = prose(COUNTER, "## Several counters")
    const counter = prose(COUNTER, "## Counter")
    const { text, starts } = SourceEdits.moved(COUNTER, [several], {
      opening: counter.start,
      where: "before",
      whole: counter
    })
    const severalText = COUNTER.slice(several.start, several.end)
    const counterText = COUNTER.slice(counter.start, counter.end)
    expect(text).toBe(COUNTER.slice(0, counter.start) + severalText + "\n\n\t" + counterText + "\n")
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
