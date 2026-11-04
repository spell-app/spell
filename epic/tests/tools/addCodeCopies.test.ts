import { parseHTML } from "linkedom"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { PageNotices } from "spell/epic/review"
import { addCodeCopies } from "spell/epic/tools/_assets/spell-doc-helpers.js"

const COMMAND = "mkdir -p /tmp/try-epics/app && cd /tmp/try-epics/app && git init -b main"

/** A page's `main` holding `html`, its document the global one (`el()` draws with it). */
function mainOf(html: string) {
  const { document } = parseHTML(`<html><body><main>${html}</main></body></html>`)
  vi.stubGlobal("document", document)
  return document.querySelector("main")!
}

/** The copy buttons in `main`. */
function buttonsIn(main: Element) {
  return Array.from(main.querySelectorAll(".spell-code-copy"))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// Owen, 2026-10-29 (epic `epic-engine` I182), on epic-friend's M1:  "this should have a copy icon on the left"
describe("addCodeCopies():  a copy button at the left of every code block", () => {
  test("a `<pre><code>` gets one, first in the pre:  a mini circular Spell UI button, titled Copy", () => {
    const main = mainOf(`<epic-field label="Step">1. In Terminal:<pre><code>${COMMAND}</code></pre></epic-field>`)
    addCodeCopies(main)
    const [button] = buttonsIn(main)
    expect(button.localName).toBe("ui-button")
    expect(button.parentElement!.firstElementChild).toBe(button)
    expect(button.nextElementSibling!.localName).toBe("code")
    for (const [name, value] of Object.entries({
      appearance: "circular basic",
      size: "mini",
      icon: "copy",
      title: "Copy",
      "aria-label": "Copy",
      "data-spell-added": ""
    }))
      expect(button.getAttribute(name)).toBe(value)
  })

  test("called again (every live update):  never a second one", () => {
    const main = mainOf(`<pre><code>a</code></pre><pre><code>b</code></pre>`)
    addCodeCopies(main)
    addCodeCopies(main)
    expect(buttonsIn(main)).toHaveLength(2)
  })

  test("not `<epic-code>` or `<ui-code>`, which draw their own;  not a pre without code, nor an empty one", () => {
    const main = mainOf(
      `<epic-code><pre><code>x</code></pre></epic-code><ui-code><pre><code>y</code></pre></ui-code>` +
        `<pre>a drawing</pre><pre><code>  </code></pre>`
    )
    addCodeCopies(main)
    expect(buttonsIn(main)).toHaveLength(0)
  })

  test("a click copies the code's text, and says Copied in the page's notices", async () => {
    const main = mainOf(`<pre><code>${COMMAND}</code></pre>`)
    const writeText = vi.fn(async () => {})
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const show = vi.spyOn(PageNotices, "show").mockImplementation(() => {})
    addCodeCopies(main)
    buttonsIn(main)[0].dispatchEvent(new (main.ownerDocument.defaultView as any).Event("click"))
    await vi.waitFor(() => expect(show).toHaveBeenCalled())
    expect(writeText).toHaveBeenCalledWith(COMMAND)
    expect(show).toHaveBeenCalledWith("Copied", expect.objectContaining({ tone: "plain" }))
  })
})
