/**
 * Tests of `MarkdownFormats`:  the marks `<ui-markdown editable>`'s box puts on its text, its pieces' shapes, and its two
 * views' text (epic `epic-engine` P61).
 */
import { describe, expect, it } from "vite-plus/test"

import { MarkdownFormats, type Edit } from "spell/ui/components/ui-markdown/MarkdownFormats"

/** An edit of `text`, its selection the first `[...]` pair's inside (the brackets taken out), else at the end. */
function edit(marked: string): Edit {
  const start = marked.indexOf("⟨")
  const end = marked.indexOf("⟩") - 1
  if (start < 0) return { text: marked, start: marked.length, end: marked.length }
  return { text: marked.replace("⟨", "").replace("⟩", ""), start, end }
}

/** The text of an edit, its selection drawn back in. */
function shown({ text, start, end }: Edit): string {
  return `${text.slice(0, start)}⟨${text.slice(start, end)}⟩${text.slice(end)}`
}

describe("MarkdownFormats.toggle()", () => {
  it("wraps a selection, and takes a wrap off again", () => {
    const bold = MarkdownFormats.toggle(edit("some ⟨words⟩ here"), "**")
    expect(shown(bold)).toBe("some **⟨words⟩** here")
    expect(shown(MarkdownFormats.toggle(bold, "**"))).toBe("some ⟨words⟩ here")
    expect(shown(MarkdownFormats.toggle(edit("a ⟨**b**⟩ c"), "**"))).toBe("a ⟨b⟩ c")
  })

  it("takes the word at a bare cursor;  between words, an empty pair", () => {
    const at = { text: "some words here", start: 7, end: 7 }
    expect(shown(MarkdownFormats.toggle(at, "*"))).toBe("some *⟨words⟩* here")
    expect(shown(MarkdownFormats.toggle({ text: "a  b", start: 2, end: 2 }, "~~"))).toBe("a ~~⟨⟩~~ b")
  })

  it("italic never takes one of bold's stars;  marks skip the space around a selection", () => {
    expect(shown(MarkdownFormats.toggle(edit("**⟨bold⟩**"), "*"))).toBe("***⟨bold⟩***")
    expect(shown(MarkdownFormats.toggle(edit("a⟨ b ⟩c"), "**"))).toBe("a **⟨b⟩** c")
  })
})

describe("MarkdownFormats.link() and clear()", () => {
  it("links a selection, changes a link's address, and takes a link off", () => {
    const linked = MarkdownFormats.link(edit("see ⟨the docs⟩"), "/docs")
    expect(linked.text).toBe("see [the docs](/docs)")
    expect(MarkdownFormats.link({ ...linked }, "/guide").text).toBe("see [the docs](/guide)")
    expect(MarkdownFormats.link({ ...linked }, "").text).toBe("see the docs")
  })

  it("clears every mark in the selection, or all the text", () => {
    expect(MarkdownFormats.clear(edit("**a** *b* ~~c~~ [d](/e)")).text).toBe("a b c d")
    expect(MarkdownFormats.clear(edit("x **⟨y⟩** z")).text).toBe("x y z")
  })

  it("says which formats the cursor is in", () => {
    const text = "**bold *both*** [link](/x)"
    expect([...MarkdownFormats.formatsAt(text, 9)].sort()).toEqual(["bold", "italic"])
    expect([...MarkdownFormats.formatsAt(text, 19)]).toEqual(["link"])
  })
})

describe("MarkdownFormats shapes", () => {
  const text = "## Title\n\nwords\n\n  - item"
  const places = {
    heading: { kind: "heading", start: 3, end: 8 },
    paragraph: { kind: "paragraph", start: 10, end: 15 },
    item: { kind: "item", start: 21, end: 25 }
  } as const

  it("reads a piece's shape from its line", () => {
    expect(MarkdownFormats.shapeOf(text, places.heading)).toBe("h2")
    expect(MarkdownFormats.shapeOf(text, places.paragraph)).toBe("paragraph")
    expect(MarkdownFormats.shapeOf(text, places.item)).toBe("bullet")
    expect(MarkdownFormats.shapeOf("| a |", { kind: "cell", start: 2, end: 3 })).toBeUndefined()
  })

  it("rewrites a piece's lead:  a heading's level, a paragraph to a list, an item back, the indent kept", () => {
    expect(MarkdownFormats.reshape(text, places.heading, "Title", "h3").text).toBe("### Title\n\nwords\n\n  - item")
    expect(MarkdownFormats.reshape(text, places.paragraph, "words", "bullet").text).toBe(
      "## Title\n\n- words\n\n  - item"
    )
    const back = MarkdownFormats.reshape(text, places.item, "item", "paragraph")
    expect(back.text).toBe("## Title\n\nwords\n\n  item")
    expect(back.place.kind).toBe("paragraph")
  })
})

describe("MarkdownFormats views", () => {
  it("cuts text into runs that join back, marks apart", () => {
    const text = "a **bold *both*** and [link](/x) ~~gone~~"
    const runs = MarkdownFormats.runsOf(text)
    expect(runs.map((run) => run.text).join("")).toBe(text)
    expect(runs.filter((run) => run.isMark).map((run) => run.text)).toEqual(["**", "*", "*", "**", "[", "](/x)", "~~", "~~"])
    expect(runs.find((run) => run.text === "both")?.formats).toEqual(["bold", "italic"])
  })

  it("writes a formatted view back as markdown", () => {
    const holder = document.createElement("span")
    holder.innerHTML = 'a <b>bold</b> <i>it</i> <strike>x</strike> <a href="/y">link</a> 2*3<br>next'
    expect(MarkdownFormats.markdownOf(holder)).toBe("a **bold** *it* ~~x~~ [link](/y) 2\\*3\nnext")
  })
})
