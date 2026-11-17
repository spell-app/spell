import { describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

import { MarkupMarks } from "spell/app/app/ui/MarkupMarks"
import { CodeMirrorMarkup } from "spell/app/app/ui/codemirror/CodeMirrorMarkup"

/**
 * `CodeMirrorMarkup`, HTML drawn bubbly in CodeMirror (epic `codemirror` P3):  the shared `MarkupMarks`
 * tests, from the same shared reading, its shapes drawn on the text itself.
 * - Runs in node:  the decorations are worked out from an editor state, no view needed.
 */
describe("CodeMirrorMarkup", () => {
  /** A page, as the drawn-bubbly page's examples are:  `MarkupMarks`' own test's. */
  const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>A demo</title>
  </head>
  <body>
    <h2>Two <code>x</code></h2>
    <spell-viewer id="a"></spell-viewer>
  </body>
</html>
`

  test("each tag in a line a pill, each tag alone a band, each block's start tag an open band, its end tag a tiny foot", () => {
    const marked = marksOf(PAGE)
    expect(textWith(marked, "cmb-tag-pill")).toEqual([
      "<title>",
      "</title>",
      "<h2>",
      "<code>",
      "</code>",
      "</h2>",
      '<spell-viewer id="a"></spell-viewer>'
    ])
    expect(textWith(marked, "cmb-band-open")).toEqual(['<html lang="en">', "<head>", "<body>"])
    expect(textWith(marked, "cmb-tag-foot")).toEqual(["</head>", "</body>", "</html>"])
    expect(textWith(marked, "cmb-tag-band").filter((tag) => !/<(html|head|body)/.test(tag))).toEqual([
      "<!doctype html>",
      '<meta charset="UTF-8" />'
    ])
  })

  test("its pieces are the shared reading's, as the editor marks them:  brackets, names, a value's white pill", () => {
    const marked = marksOf(PAGE)
    expect(textWith(marked, "bubbly-tag-name").slice(0, 3)).toEqual(["html", "head", "meta"])
    expect(textWith(marked, "bubbly-attribute-name")).toEqual(["lang", "charset", "id"])
    expect(textWith(marked, "bubbly-input")).toEqual(["en", "UTF-8", "a"])
    // every mark of the shared reading is drawn:  as many stretches with classes as it worked out
    const shared = MarkupMarks.of(PAGE, CodeMirrorMarkup.make).marks.filter((stretch) => stretch.classes)
    for (const stretch of shared) expect(marked.has(`${stretch.start}:${stretch.end}`)).toBe(true)
  })

  test("a block's body:  a rail on each line under its start tag, to its end tag's turn, nested ones inside", () => {
    const rails = railsOf(PAGE)
    // `<head>`'s lines:  inside `<html>` and `<head>`
    expect(rails.get("    <title>A demo</title>")).toBe(2)
    expect(rails.get("  </head>")).toBe(2)
    expect(rails.get("  <body>")).toBe(1)
    // `</body>` and `</html>`:  one row, `</body>`'s line's, inside both
    expect(rails.get("  </body>")).toBe(2)
    expect(rails.get("</html>")).toBeUndefined()
    expect(rails.get("<!doctype html>")).toBeUndefined()
  })

  test("a run of end tags alone on their lines:  ONE row of feet, nested, the line breaks between them hidden (I132)", () => {
    const state = EditorState.create({ doc: PAGE })
    const rows = new Map<string, { classes: string; style: string }>()
    const feet: Array<{ text: string; style: string }> = []
    const joins: Array<{ text: string; isAtomic: boolean }> = []
    eachDecoration(CodeMirrorMarkup.decorationsOf(state), (from, to, spec) => {
      const style = (spec.attributes as Record<string, string> | undefined)?.style ?? ""
      const classes = typeof spec.class === "string" ? spec.class : ""
      if (classes.includes("cmb-feet-row")) rows.set(state.doc.lineAt(from).text, { classes, style })
      if (classes.includes("cmb-tag-foot")) feet.push({ text: PAGE.slice(from, to), style })
      if (to > from && PAGE.slice(from, to).includes("\n"))
        joins.push({ text: PAGE.slice(from, to), isAtomic: !!spec.atomic })
    })
    // `</head>` alone:  a row of one foot, room under it before `<body>`'s band (T141);  `</body>` and `</html>`:  one row
    expect([...rows.keys()]).toEqual(["  </head>", "  </body>"])
    expect(rows.get("  </head>")!.classes).toContain("cmb-feet-above-band")
    expect(rows.get("  </head>")!.style).toContain("--cmb-feet: 1")
    expect(rows.get("  </body>")!.classes).not.toContain("cmb-feet-above-band")
    expect(rows.get("  </body>")!.style).toContain("--cmb-feet: 2")
    // the blocks' own rails end in the row:  each foot draws its own
    expect(rows.get("  </body>")!.style).toContain("--cmb-rail-sizes: 0 0, 0 0")
    // each foot at its block's rail, the outer one a step down;  a block inside `<html>` pulled toward its rail (I162)
    expect(feet.map(({ text, style }) => [text, style])).toEqual([
      ["</head>", "--cmb-column: 0; --cmb-spaces: 2; --cmb-foot-level: 0; --cmb-foot-nest: 1"],
      ["</body>", "--cmb-column: 0; --cmb-spaces: 2; --cmb-foot-level: 0; --cmb-foot-nest: 1"],
      ["</html>", "--cmb-column: 0; --cmb-spaces: 0; --cmb-foot-level: 1; --cmb-foot-nest: 0"]
    ])
    // the line break between `</body>` and `</html>` hidden, one step for the caret;  nothing else
    expect(joins).toEqual([{ text: "\n", isAtomic: true }])
  })

  test("a one-line element with something between its tags:  a link between its pills", () => {
    expect(textWith(marksOf(PAGE), "cmb-tag-link")).toEqual(["A demo", "Two <code>x</code>", "x"])
  })

  test("spacers where the shared reading has room:  before a block's tags, either side of a tag in a line", () => {
    const kinds = spacersOf(PAGE)
    expect(kinds).toContain("bubbly-tag-head-spacer")
    expect(kinds).toContain("bubbly-tag-foot-spacer")
    expect(kinds).toContain("bubbly-tag-spacer")
  })

  test("a reading that fails leaves the text plain:  NEVER throws", () => {
    expect(() => CodeMirrorMarkup.decorationsOf(EditorState.create({ doc: "<<<</ />" }))).not.toThrow()
  })
})

/** Each mark's classes, by its stretch (`start:end`), and the text it's on. */
function marksOf(text: string): Map<string, { text: string; classes: string[] }> {
  const marked = new Map<string, { text: string; classes: string[] }>()
  eachDecoration(CodeMirrorMarkup.decorationsOf(EditorState.create({ doc: text })), (from, to, spec) => {
    // a quote mark's `"` is a widget showing its curly mark, in its own classes
    const classes =
      typeof spec.class === "string" ? spec.class : (spec.widget as { classes?: unknown } | undefined)?.classes
    if (typeof classes === "string" && to > from && !spec.block) {
      marked.set(`${from}:${to}`, { text: text.slice(from, to), classes: classes.split(" ") })
    }
  })
  return marked
}

/** The text of each mark with class `name`, in order. */
function textWith(marked: Map<string, { text: string; classes: string[] }>, name: string): string[] {
  return [...marked.entries()]
    .filter(([, mark]) => mark.classes.includes(name))
    .sort(([a], [b]) => Number(a.split(":")[0]) - Number(b.split(":")[0]))
    .map(([, mark]) => mark.text)
}

/** How many rails each railed line of `text` draws, by its text. */
function railsOf(text: string): Map<string, number> {
  const state = EditorState.create({ doc: text })
  const rails = new Map<string, number>()
  eachDecoration(CodeMirrorMarkup.decorationsOf(state), (from, to, spec) => {
    const style = (spec.attributes as Record<string, string> | undefined)?.style
    if (from === to && style?.startsWith("--cmb-rails")) {
      rails.set(state.doc.lineAt(from).text, style.split("linear-gradient").length - 1)
    }
  })
  return rails
}

/** The classes of each spacer widget. */
function spacersOf(text: string): string[] {
  const kinds: string[] = []
  eachDecoration(CodeMirrorMarkup.decorationsOf(EditorState.create({ doc: text })), (_from, _to, spec) => {
    const widget = spec.widget as { classes?: string } | undefined
    if (widget?.classes) kinds.push(...widget.classes.split(" ").filter((name) => name.endsWith("-spacer")))
  })
  return kinds
}

/** Call `each` with every decoration's range and spec. */
function eachDecoration(
  decorations: DecorationSet,
  each: (from: number, to: number, spec: Record<string, unknown>) => void
): void {
  const cursor = decorations.iter()
  while (cursor.value) {
    each(cursor.from, cursor.to, cursor.value.spec as Record<string, unknown>)
    cursor.next()
  }
}
