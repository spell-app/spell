import { describe, expect, it } from "vite-plus/test"

import { CodeOnServer } from "spell/ui/drawings/CodeOnServer.server"
import { MermaidOnServer } from "spell/ui/drawings/MermaidOnServer.server"

/** A page as the page server serves it:  the closing tags split as the formatter writes them. */
const PAGE = `<!doctype html><html><head></head><body>
  <ui-code language="typescript"
    ><script type="text/plain">
      const greeting = "hello"
      if (greeting) console.log(greeting)
    </script></ui-code
  >
  <ui-code language="bash" line-numbers>echo hi</ui-code>
  <ui-code source="examples/sample.json"></ui-code>
  <ui-mermaid-diagram look="hand-drawn">
    <script type="text/mermaid">
      flowchart LR
        a --> b
    </script>
  </ui-mermaid-diagram>
  <ui-mermaid-diagram scheme="dark">flowchart LR
  a[fa:fa-car Car] --> b</ui-mermaid-diagram>
  <ui-mermaid-diagram scheme="dark" layout="elk" seed="7">flowchart TD
  x --> y</ui-mermaid-diagram>
</body></html>`

describe("CodeOnServer", () => {
  const drawer = new CodeOnServer()

  it("finds each <ui-code> with text of its own, as the element reads it", () => {
    expect(drawer.find(PAGE)).toEqual([
      {
        kind: "code",
        settings: { language: "typescript", drawing: true },
        text: 'const greeting = "hello"\nif (greeting) console.log(greeting)'
      },
      { kind: "code", settings: { language: "bash", drawing: false }, text: "echo hi" }
    ])
  })

  it("colours code with highlight.js, or guesses its language;  leaves a language it lacks", async () => {
    const asked = await drawer.draw({ kind: "code", settings: { language: "ts", drawing: true }, text: "const x = 1" })
    expect(asked).toEqual({
      markup: '<span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>',
      data: { language: "typescript", detected: false }
    })
    const guessed = await drawer.draw({
      kind: "code",
      settings: { language: "", drawing: true },
      text: "def total(xs):\n    return sum(xs)\n"
    })
    expect(guessed?.data).toEqual({ language: "python", detected: true })
    expect(
      await drawer.draw({ kind: "code", settings: { language: "spell", drawing: true }, text: "x" })
    ).toBeUndefined()
    expect(drawer.takes({ kind: "code", settings: { language: "text" }, text: "x" })).toBe(false)
  })
})

describe("MermaidOnServer", () => {
  const drawer = new MermaidOnServer({ serverUrl: () => "http://127.0.0.1:0" })

  it("finds each diagram with text of its own and no icons, in light and dark unless its scheme says", () => {
    const items = drawer.find(PAGE)
    expect(items.map((item) => item.settings)).toEqual([
      { theme: "spell", look: "hand-drawn", layout: "auto", seed: 1, scheme: "light" },
      { theme: "spell", look: "hand-drawn", layout: "auto", seed: 1, scheme: "dark" },
      { theme: "spell", look: "classic", layout: "elk", seed: 7, scheme: "dark" }
    ])
    expect(items[0]?.text).toBe("flowchart LR\n  a --> b")
  })
})
