import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { SourceHomes, type FileHome, type MakingHome } from "spell/app/lsp/SourceHomes"

describe("SourceEdits", () => {
  const TAG = `<draw>\n\t<ui-button color="red" appearance="basic" onClick={play it}>Go</ui-button>\n</draw>`
  const opening = TAG.indexOf("<ui-button")

  test("an attribute's value changes, and nothing else", () => {
    const edits = SourceEdits.settingAttribute(TAG, opening, "color", "blue")
    expect(SourceEdits.applied(TAG, edits)).toBe(TAG.replace(`color="red"`, `color="blue"`))
  })

  test("keeps the quotes as written", () => {
    const text = `<ui-text color='red'>x</ui-text>`
    expect(SourceEdits.applied(text, SourceEdits.settingAttribute(text, 0, "color", "blue"))).toBe(
      `<ui-text color='blue'>x</ui-text>`
    )
  })

  test("an attribute not written yet is added after the tag's name", () => {
    const edits = SourceEdits.settingAttribute(TAG, opening, "size", "large")
    expect(SourceEdits.applied(TAG, edits)).toBe(TAG.replace(`<ui-button `, `<ui-button size="large" `))
  })

  test("true is bare, false takes it off with its space", () => {
    expect(SourceEdits.applied(TAG, SourceEdits.settingAttribute(TAG, opening, "fluid", true))).toContain(
      `<ui-button fluid color`
    )
    expect(SourceEdits.applied(TAG, SourceEdits.settingAttribute(TAG, opening, "basic", false))).toBe(
      TAG.replace(` basic`, "")
    )
  })

  test("an expression is code:  it throws", () => {
    expect(() => SourceEdits.settingAttribute(TAG, opening, "onClick", "x")).toThrow(/expression/)
  })

  test("reads a tag past braces and quotes holding >", () => {
    const text = `<ui-text title="a > b" color={if x > 1: red}>y</ui-text>`
    const tag = SourceEdits.tagAt(text, 0)!
    expect(tag.attributes.map((each) => [each.name, each.quote])).toEqual([
      ["title", '"'],
      ["color", "{"]
    ])
    expect(text.slice(tag.end)).toBe("y</ui-text>")
  })

  test("swaps two spans, with what's between them left alone", () => {
    const text = "one\nmiddle\ntwo"
    const edits = SourceEdits.swapped(text, { start: 0, end: 3 }, { start: 11, end: 14 })
    expect(SourceEdits.applied(text, edits)).toBe("two\nmiddle\none")
  })

  test("offsets and positions agree", () => {
    const text = "ab\ncde\n\nf"
    for (let offset = 0; offset <= text.length; offset++) {
      expect(SourceEdits.offsetAt(text, SourceEdits.positionAt(text, offset))).toBe(offset)
    }
  })
})

/** Where property `name` of a thing of `type` lives in `contents`, and the text after an edit to `value` there. */
function edited(path: string, contents: string, type: string, name: string, value: unknown, made?: string) {
  const parsed = parseSpellProject([{ path, contents }])
  const offset = made === undefined ? undefined : contents.indexOf(made)
  const file = parsed.files.find((each) => each.path === path)!
  const home = (offset === undefined
    ? SourceHomes.ofDefault(parsed.files, [type], name)
    : SourceHomes.ofMaking(file, offset, name)) ?? { kind: "running" as const }
  if (home.kind !== "written" && home.kind !== "default") return { home, text: contents }
  if (!("style" in home)) throw new TypeError("not a literal")
  const literal = SourceHomes.literalFor(value, home.style)
  return { home, text: SourceEdits.applied(contents, [SourceEdits.replacing(contents, home.span, literal)]) }
}

describe("SourceHomes", () => {
  const CARD = [
    `<spell-view "card">`,
    `\t<property "count" one-of="1, 2"/>`,
    `\t<property "title">a text</>`,
    `\t<property "suit" one-of="clubs, hearts"/>`,
    `\t<property "score">a number</>`,
    `\t<action "create it">`,
    `\t\tset its count to 2`,
    `\t\tset its title to "hi"`,
    `\t\tset its suit to clubs`,
    `\t\tset its score to the count + 1`,
    `\t</action>`,
    `</spell-view>`,
    `<spell-app "solo">`,
    `\t<property "first">a new card with title = "x", count = 1</>`,
    `</spell-app>`,
    ``
  ].join("\n")

  test("a type's default:  its create line, in place", () => {
    const { home, text } = edited("/Card.spellml", CARD, "Card", "count", 5)
    expect(home.kind).toBe("default")
    expect(text).toBe(CARD.replace("set its count to 2", "set its count to 5"))
  })

  test("a default written as text keeps its quotes", () => {
    const { text } = edited("/Card.spellml", CARD, "Card", "title", "bye")
    expect(text).toBe(CARD.replace(`set its title to "hi"`, `set its title to "bye"`))
  })

  test("a default written as one of its words stays a word", () => {
    const { home, text } = edited("/Card.spellml", CARD, "Card", "suit", "hearts")
    expect(home.kind).toBe("default")
    expect(text).toBe(CARD.replace("set its suit to clubs", "set its suit to hearts"))
  })

  test("a default that's code is an expression", () => {
    expect(edited("/Card.spellml", CARD, "Card", "score", 5).home.kind).toBe("expression")
  })

  test("a value on the line that made it wins over the default", () => {
    const { home, text } = edited("/Card.spellml", CARD, "Card", "title", "y", "a new card with")
    expect(home.kind).toBe("written")
    expect(text).toBe(CARD.replace(`title = "x"`, `title = "y"`))
  })

  test("a value that line doesn't give can be added to it, joined to what it says", () => {
    const { home } = edited("/Card.spellml", CARD, "Card", "suit", "hearts", "a new card with")
    expect(home).toMatchObject({ kind: "notWritten", place: "making", hasWith: true })
    expect(CARD.slice(0, (home as MakingHome).at).endsWith(`count = 1`)).toBe(true)
  })

  test("a making that says nothing yet is told so", () => {
    const code = CARD.replace(` with title = "x", count = 1`, "")
    const { home } = edited("/Card.spellml", code, "Card", "suit", "hearts", "a new card")
    expect(home).toMatchObject({ kind: "notWritten", place: "making", hasWith: false })
  })

  test("a value on a making comes off with its comma, or with its `with` when it's the only one", () => {
    const removed = (contents: string, name: string) => {
      const parsed = parseSpellProject([{ path: "/Card.spellml", contents }])
      const home = SourceHomes.ofMaking(parsed.files[0]!, contents.indexOf("a new card"), name) as FileHome
      return SourceEdits.applied(contents, [SourceEdits.replacing(contents, home.removal!, "")])
    }
    expect(removed(CARD, "count")).toContain(`a new card with title = "x"</>`)
    expect(removed(CARD, "title")).toContain(`a new card with count = 1</>`)
    const one = CARD.replace(`title = "x", count = 1`, `count = 1`)
    expect(removed(one, "count")).toContain(`a new card</>`)
  })

  test("yes and no are literals, in the file's language", () => {
    const code = [`a "card" is a thing where:`, `\t- to create it:`, `\t\tset its shown to yes`, ``].join("\n")
    const { home } = edited("/Card.spell", code, "Card", "shown", false)
    expect(home).toMatchObject({ kind: "default", style: "boolean" })
    expect(SourceHomes.literalFor(false, "boolean")).toBe("no")
    expect(SourceHomes.literalFor(true, "boolean", "es")).toBe("sí")
    expect(SourceHomes.valueOfLiteral("yes", "boolean")).toBe(true)
    expect(SourceHomes.valueOfLiteral("no", "boolean")).toBe(false)
  })

  test("nothing in the source says:  set while running", () => {
    expect(edited("/Card.spellml", CARD, "Card", "nickname", "x").home.kind).toBe("running")
  })

  test("a code-spell file too", () => {
    const code = [
      `a "counter" is a view where:`,
      `\t- its "count" is a number`,
      `\t- to create it:`,
      `\t\tset its count to 0`,
      ``
    ].join("\n")
    const { home, text } = edited("/Counter.spell", code, "Counter", "count", 7)
    expect(home.kind).toBe("default")
    expect(text).toBe(code.replace("set its count to 0", "set its count to 7"))
  })

  test("a Spanish file keeps its words", () => {
    const code = [
      `un "contador" es una vista donde:`,
      `\t- su "cuenta" es un número`,
      `\t- para crearlo:`,
      `\t\tponer su cuenta a 0`,
      ``
    ].join("\n")
    const { home, text } = edited("/Contador.es.spell", code, "Contador", "cuenta", 7)
    expect(home.kind).toBe("default")
    expect(text).toBe(code.replace("poner su cuenta a 0", "poner su cuenta a 7"))
  })

  test("a tag's text, plain or code", () => {
    const text = `<ui-button>Go</ui-button>\n<ui-text>{its name}</ui-text>`
    expect(SourceHomes.ofTagText(text, 0)?.kind).toBe("written")
    expect(SourceHomes.ofTagText(text, text.indexOf("<ui-text"))?.kind).toBe("expression")
  })

  test("a tag's attributes:  written, code, or not yet", () => {
    const text = `<ui-button color="red" size={its size}>Go</ui-button>`
    expect(SourceHomes.ofAttribute(text, 0, "color")?.kind).toBe("written")
    expect(SourceHomes.ofAttribute(text, 0, "size")?.kind).toBe("expression")
    expect(SourceHomes.ofAttribute(text, 0, "basic")?.kind).toBe("notWritten")
  })
})

describe("SourceEdits, on whole elements", () => {
  const APP = [
    "<draw>",
    "\t<ui-container>",
    "\t\t// a comment stays where it is",
    "\t\t<ui-button>One</ui-button>",
    '\t\t<ui-card heading="Two">',
    "\t\t\t<ui-text>Inside</ui-text>",
    "\t\t</ui-card>",
    "\t\t<ui-divider/>",
    "\t</ui-container>",
    "</draw>",
    ""
  ].join("\n")
  const at = (text: string, tag: string) => text.indexOf(`<${tag}`)

  test("an element runs to its own closing tag, through what's inside it", () => {
    const card = SourceEdits.elementAt(APP, at(APP, "ui-card"))!
    expect(APP.slice(card.start, card.end)).toBe(
      '<ui-card heading="Two">\n\t\t\t<ui-text>Inside</ui-text>\n\t\t</ui-card>'
    )
    const divider = SourceEdits.elementAt(APP, at(APP, "ui-divider"))!
    expect(APP.slice(divider.start, divider.end)).toBe("<ui-divider/>")
    expect(divider.bodyStart).toBeUndefined()
  })

  test("Spell's own closer closes what's open", () => {
    const text = '<property "x">a thing</> <after/>'
    const element = SourceEdits.elementAt(text, 0)!
    expect(text.slice(element.start, element.end)).toBe('<property "x">a thing</>')
  })

  test("written beside an element, it takes that element's indent, on its own line", () => {
    const { text, start } = SourceEdits.written(
      APP,
      { opening: at(APP, "ui-button"), where: "after" },
      "<ui-label>New</ui-label>"
    )
    expect(text).toContain("\t\t<ui-button>One</ui-button>\n\t\t<ui-label>New</ui-label>\n\t\t<ui-card")
    expect(text.startsWith("<ui-label", start)).toBe(true)
    const before = SourceEdits.written(
      APP,
      { opening: at(APP, "ui-button"), where: "before" },
      "<ui-label>New</ui-label>"
    )
    expect(before.text).toContain("\t\t<ui-label>New</ui-label>\n\t\t<ui-button>One</ui-button>")
    expect(before.text.startsWith("<ui-label", before.start)).toBe(true)
  })

  test("written inside, it goes last, a step further in", () => {
    const { text, start } = SourceEdits.written(
      APP,
      { opening: at(APP, "ui-card"), where: "inside" },
      "<ui-label>New</ui-label>"
    )
    expect(text).toContain("<ui-text>Inside</ui-text>\n\t\t\t<ui-label>New</ui-label>\n\t\t</ui-card>")
    expect(text.startsWith("<ui-label", start)).toBe(true)
  })

  test("inside a tag closed with />, it opens to hold it", () => {
    const { text, start } = SourceEdits.written(
      APP,
      { opening: at(APP, "ui-divider"), where: "inside" },
      "<ui-label>New</ui-label>"
    )
    expect(text).toContain("\t\t<ui-divider>\n\t\t\t<ui-label>New</ui-label>\n\t\t</ui-divider>")
    expect(text.startsWith("<ui-label", start)).toBe(true)
  })

  test("a file indented with spaces gets spaces", () => {
    const spaced = "<draw>\n  <ui-card></ui-card>\n</draw>\n"
    const { text } = SourceEdits.written(spaced, { opening: at(spaced, "ui-card"), where: "inside" }, "<ui-label/>")
    expect(text).toBe("<draw>\n  <ui-card>\n    <ui-label/>\n  </ui-card>\n</draw>\n")
  })

  test("moved down and in:  each keeps its words, only those lines change", () => {
    const button = SourceEdits.elementAt(APP, at(APP, "ui-button"))!
    const { text, starts } = SourceEdits.moved(APP, [button], { opening: at(APP, "ui-card"), where: "inside" })
    expect(text).toContain("\t\t// a comment stays where it is\n\t\t<ui-card")
    expect(text).toContain("<ui-text>Inside</ui-text>\n\t\t\t<ui-button>One</ui-button>\n\t\t</ui-card>")
    expect(text.startsWith("<ui-button", starts[0]!)).toBe(true)
  })

  test("moved up:  a block keeps its shape, with its new indent", () => {
    const card = SourceEdits.elementAt(APP, at(APP, "ui-card"))!
    const { text } = SourceEdits.moved(APP, [card], { opening: at(APP, "ui-container"), where: "before" })
    expect(text).toContain(
      '<draw>\n\t<ui-card heading="Two">\n\t\t<ui-text>Inside</ui-text>\n\t</ui-card>\n\t<ui-container>'
    )
  })

  test("several move together, in the order they're written", () => {
    const button = SourceEdits.elementAt(APP, at(APP, "ui-button"))!
    const divider = SourceEdits.elementAt(APP, at(APP, "ui-divider"))!
    const { text, starts } = SourceEdits.moved(APP, [divider, button], { opening: at(APP, "ui-card"), where: "before" })
    expect(text).toContain("\t\t<ui-button>One</ui-button>\n\t\t<ui-divider/>\n\t\t<ui-card")
    expect(text.startsWith("<ui-button", starts[0]!)).toBe(true)
    expect(text.startsWith("<ui-divider", starts[1]!)).toBe(true)
  })

  test("nothing goes inside itself", () => {
    const card = SourceEdits.elementAt(APP, at(APP, "ui-card"))!
    expect(() => SourceEdits.moved(APP, [card], { opening: at(APP, "ui-text"), where: "after" })).toThrow(TypeError)
  })

  test("without an element, its line goes;  sharing a line, only it does", () => {
    const button = SourceEdits.elementAt(APP, at(APP, "ui-button"))!
    expect(SourceEdits.without(APP, [button])).not.toContain("One")
    expect(SourceEdits.without(APP, [button]).split("\n")).toHaveLength(APP.split("\n").length - 1)
    const shared = "<a/> <b/>\n"
    expect(SourceEdits.without(shared, [{ start: 5, end: 9 }])).toBe("<a/>\n")
  })

  test("the edit between two texts is whole lines, enough to find again, and makes the same text", () => {
    const button = SourceEdits.elementAt(APP, at(APP, "ui-button"))!
    for (const after of [
      SourceEdits.without(APP, [button]),
      SourceEdits.written(APP, { opening: button.start, where: "after" }, "<ui-label/>").text,
      SourceEdits.moved(APP, [button], { opening: at(APP, "ui-divider"), where: "after" }).text
    ]) {
      const { edit, span, newText } = SourceEdits.editBetween(APP, after)
      expect(SourceEdits.applied(APP, [edit])).toBe(after)
      expect(newText.length).toBeGreaterThan(0)
      expect(span.end).toBeGreaterThan(span.start)
    }
  })
})
