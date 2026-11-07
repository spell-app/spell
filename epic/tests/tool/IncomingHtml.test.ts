/**
 * Tests of `IncomingHtml`:  HTML a command was handed, as nodes for the doc.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { IncomingHtml } from "spell/epic/tool/IncomingHtml"

/** `html` as the doc would take it, back as markup. */
function taken(html: string): string {
  const { document } = parseHTML("<!doctype html><html><body></body></html>")
  const box = document.createElement("div")
  box.append(...IncomingHtml.nodes(document as unknown as Document, html))
  return box.innerHTML
}

// epic `epic-engine` I225, r58 (🚧 language:  a status card quoting `<for …>` broke language.plan.html)
describe("IncomingHtml.quoteStrayTags():  a tag that is no page markup reads as text", () => {
  test("a quoted tag, a script:  text;  page markup, epic and ui elements:  as written", () => {
    expect(taken("Renamed <for each> to <para cada>;  no <script>alert(1)</script>")).toBe(
      "Renamed &lt;for each&gt; to &lt;para cada&gt;;  no &lt;script&gt;alert(1)&lt;/script&gt;"
    )
    expect(taken('<p>See <a href="#i3">I3</a>, <code>x</code>, <ui-label>new</ui-label></p>')).toBe(
      '<p>See <a href="#i3">I3</a>, <code>x</code>, <ui-label>new</ui-label></p>'
    )
    expect(IncomingHtml.quoteStrayTags("<epic-mark item='i3'></epic-mark> <Strong>b</Strong> a < b")).toBe(
      "<epic-mark item='i3'></epic-mark> <Strong>b</Strong> a < b"
    )
  })
})
