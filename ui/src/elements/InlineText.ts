/****************
 * ### `InlineText`
 * An element's own content as the text it shows:  what `LoadableComponent` reads when there's no `source`.
 * - `of()`:  a `<script type="text/...">` child (exact text), else a `<template>` child (its markup), else the
 *   element's text;  dedented (`dedent()`)
 * - Plain DOM, and imports nothing:  the page server's drawers read a page's `<ui-code>` and `<ui-mermaid-diagram>`
 *   with it too, on linkedom (`spell/ui/drawings`), so the text they draw ahead is the text the element will read,
 *   character for character, and their keys match (`GivenDrawings`).
 * - STATIC and instance-free:  pure text out of an element.
 ****************/
export class InlineText {
  /** `element`'s own content as text, dedented. */
  static of(element: InlineElement): string {
    let text = element.textContent ?? ""
    for (const child of element.children) {
      if (child.localName === "script" && (child.getAttribute("type") ?? "").startsWith("text/")) {
        text = child.textContent ?? ""
        break
      }
      if (child.localName === "template") {
        text = child.innerHTML
        break
      }
    }
    return InlineText.dedent(text)
  }

  /**
   * `text` without its common indent, and without blank first / last lines:
   * inline content is indented with the page's markup.
   * - Tabs and spaces count one each;  blank lines don't set the indent.
   */
  static dedent(text: string): string {
    const lines = text.replace(/\r\n?/g, "\n").split("\n")
    while (lines.length && !lines[0].trim()) lines.shift()
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
    let indent = Infinity
    for (const line of lines) if (line.trim()) indent = Math.min(indent, line.length - line.trimStart().length)
    if (!Number.isFinite(indent) || indent === 0) return lines.join("\n")
    return lines.map((line) => line.slice(Math.min(indent, line.length - line.trimStart().length))).join("\n")
  }
}

/** What `InlineText.of()` reads of an element:  a page's, or linkedom's. */
export type InlineElement = {
  readonly textContent: string | null
  readonly children: Iterable<{
    readonly localName: string
    readonly textContent: string | null
    readonly innerHTML: string
    getAttribute(name: string): string | null
  }>
}
