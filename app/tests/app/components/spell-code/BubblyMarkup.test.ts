import { describe, expect, test } from "vite-plus/test"

import { BubblyMarkup, type MarkupElement } from "spell/app/app/components/spell-code/BubblyMarkup"

describe("BubblyMarkup.treeOf()", () => {
  /** The first element of `source`'s tree, and the names of its start tag's attributes. */
  function firstOf(source: string): { element: MarkupElement; names: string[] } {
    const element = BubblyMarkup.treeOf(source).find((node) => node.kind === "element")!
    return { element, names: element.open.attributes.map((attribute) => attribute.name) }
  }

  test("a quote left open ends at its line's end:  the attributes and tags after it read as written (I145)", () => {
    // Owen:  "Quotes don't span lines, so a quoted expression should only break its line"
    const source =
      '<toolbar\n\tclass="GameBar"\n\tsize="small\n\tshrinkable\n>\n\t<text slot="title">Hi</text>\n</toolbar>'
    const { element, names } = firstOf(source)
    expect(names).toEqual(["class", "size", "shrinkable"])
    expect(source.slice(element.open.end - 1, element.open.end)).toBe(">")
    expect(element.open.end).toBe(source.indexOf("\n>") + 2)
    const text = element.children.find((node) => node.kind === "element")! as MarkupElement
    expect(text.open.attributes.map((attribute) => `${attribute.name}=${attribute.value}`)).toEqual(["slot=title"])
    expect(element.close).toBeTruthy()
  })

  test("...a quoted word left open too:  its tag ends with its line, the next line's tag its own", () => {
    const source = '<segment>\n\t<action "auto play\n\t<action "cheat"/>\n</segment>'
    const segment = firstOf(source).element
    const actions = segment.children.filter((node) => node.kind === "element") as MarkupElement[]
    expect(actions.map((action) => action.open.attributes.map((attribute) => attribute.value))).toEqual([[], ["cheat"]])
    expect(segment.close).toBeTruthy()
  })

  test("...on one line:  its `/>` still ends it", () => {
    const [action, next] = BubblyMarkup.treeOf('<action "auto play/>\n<action "cheat"/>').filter(
      (node) => node.kind === "element"
    ) as MarkupElement[]
    expect(action!.open.selfClosing).toBe(true)
    expect(next!.open.attributes.map((attribute) => attribute.value)).toEqual(["cheat"])
  })

  test("a value in quotes is still read whole on its line", () => {
    expect(firstOf('<a title="one two" href=x>').element.open.attributes.map((attribute) => attribute.value)).toEqual([
      "one two",
      "x"
    ])
  })
})
