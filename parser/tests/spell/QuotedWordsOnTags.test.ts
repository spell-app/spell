import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SX } from "spell/parser/spellx"

/**
 * A tag's quoted word (epic `language` P38):  `<header "Hardware"/>` ~== `<header>Hardware</header>`.
 * - The tokens first, then whole compiles in both languages.
 */
describe("a tag's quoted word", () => {
  const tokenizer = SP.english.parser.tokenizer
  const elementFor = (markup: string, language = tokenizer) => {
    const element = language.matchJSXElement(markup) as P.JSXElementToken
    return element
  }
  const childValues = (element: P.JSXElementToken) => (element.children ?? []).map((child) => `${child.raw}`)

  test("becomes the contents of a tag closed with />", () => {
    const element = elementFor('<header "Hardware" size="large"/>')
    expect(element.isUnaryTag).toBe(true)
    expect(childValues(element)).toEqual(["Hardware"])
    expect(element.attributes?.map((attribute) => attribute.name)).toEqual(["size"])
  })

  test("comes before what's between the tags", () => {
    const element = elementFor('<label "Inbox"><detail>3</detail></label>')
    expect(element.isUnaryTag).toBeFalsy()
    expect(childValues(element)[0]).toBe("Inbox")
    expect((element.children![1] as P.JSXElementToken).tagName).toBe("detail")
  })

  test("reads a hole, and leaves a < as text", () => {
    const element = elementFor('<header "Hi {its name}, 1 < 2"/>')
    const [before, hole, after] = element.children as P.Token[]
    expect(before).toBeInstanceOf(P.JSXTextToken)
    expect(hole).toBeInstanceOf(P.JSXExpressionToken)
    expect(`${after!.raw}`).toBe(", 1 < 2")
  })

  test("what named a tag before still does", () => {
    expect(elementFor('<tree-node "If"/>').attributes?.[0]?.name).toBe("label")
    expect(elementFor('<cell "Name"/>').attributes?.[0]?.name).toBe("data-column")
    expect(elementFor('<tab "One"/>').attributes?.[0]?.name).toBe("label")
  })

  test("a word two languages spell alike goes by the language", () => {
    expect(elementFor('<panel "Settings"/>').attributes?.[0]?.name).toBe("label")
    expect(elementFor('<panel "Ajustes"/>', SP.spanish.parser.tokenizer).attributes?.[0]?.name).toBe("etiqueta")
  })

  test("the editor's view of a tag keeps the word in its head", () => {
    const text =
      '<spell-view "notes">\n\t<draw>\n\t\t<header "Hardware" size="large">more</header>\n\t</draw>\n</spell-view>\n'
    const file = SX.SpellxView.read(text, { path: "Notes.spell" })
    const header = [...file.walk()]
      .map(({ node }) => node)
      .find((node) => node.kind === "element" && node.name === "header")
    if (header?.kind !== "element") throw new TypeError("no header")
    expect(text.slice(header.headSpan.start, header.headSpan.end).trim()).toBe('<header "Hardware" size="large">')
    expect(header.attributes.map((attribute) => attribute.name)).toEqual(["size"])
  })
})
