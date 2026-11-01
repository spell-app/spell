import { beforeEach, describe, expect, onTestFinished, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UI } from "spell/ui/core"
import type { DOMJsonElement } from "spell/ui/components/ui-json"

import "spell/ui/components/ui-json"
import "spell/ui/components/ui-tree-diagram"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-json/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A file a `source` loads:  answered by the stub of `fetch` below. */
const DATA_URL = "/test-data/tree.json"

/** Render `<ui-json>` markup, settled. */
async function json(html: string) {
  const element = await ElementFixture.render<DOMJsonElement>(html)
  await ElementFixture.settle()
  return element
}

/** Answer `DATA_URL` with `text`, for this test. */
function serve(text: string) {
  const real = globalThis.fetch
  const stub = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input instanceof Request ? input.url : input)
    return url.endsWith(DATA_URL) ? Promise.resolve(new Response(text)) : real(input, init)
  })
  onTestFinished(() => stub.mockRestore())
}

/** The labels a diagram draws. */
function labels(diagram: Element): string[] {
  return [...diagram.shadowRoot!.querySelectorAll("text.label")].map((text) => text.textContent ?? "")
}

beforeEach(async () => {
  const ui = await UI.load()
  ui.sources.forget()
})

describe("<ui-json> value", () => {
  test("parses its own text;  draws nothing", async () => {
    const element = await json(`<ui-json>{ "a": [1, 2, { "b": "[not a fill-in]" }] }</ui-json>`)
    expect(element.value).toEqual({ a: [1, 2, { b: "[not a fill-in]" }] })
    expect(getComputedStyle(element).display).toBe("none")
    expect(element.shadowRoot!.childElementCount).toBe(0)
  })

  test("reads a script child too:  the safe way to hold a `<` in a page", async () => {
    const element = await json(`<ui-json><script type="application/json">{ "tag": "<b>" }</script></ui-json>`)
    expect(element.value).toEqual({ tag: "<b>" })
  })

  test("empty text is no data, and no error", async () => {
    const element = await json(`<ui-json></ui-json>`)
    expect(element.value).toBeUndefined()
    expect(element.matches(":state(error)")).toBe(false)
  })

  test("`value` set writes the text, and sends `ui-changed` once, with the data", async () => {
    const element = await json(`<ui-json>{ "a": 1 }</ui-json>`)
    const changed = vi.fn()
    element.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail))
    element.value = { a: 2 }
    await ElementFixture.settle()
    expect(element.value).toEqual({ a: 2 })
    expect(JSON.parse(element.content)).toEqual({ a: 2 })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(changed.mock.calls[0]![0].value).toEqual({ a: 2 })
    expect(element.dirty).toBe(true)
  })

  test("follows its text as the page changes it", async () => {
    const element = await json(`<ui-json>{ "a": 1 }</ui-json>`)
    const changed = vi.fn()
    element.addEventListener("ui-changed", changed)
    element.textContent = `{ "a": 3 }`
    await ElementFixture.settle()
    expect(element.value).toEqual({ a: 3 })
    expect(changed).toHaveBeenCalledTimes(1)
  })
})

describe("<ui-json> errors", () => {
  test("text that isn't JSON:  no value, one warning, `ui-error`, `:state(error)`;  fixing it clears them", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const errors = vi.fn()
    addEventListener("ui-error", errors)
    onTestFinished(() => removeEventListener("ui-error", errors))
    const element = await json(`<ui-json>{ not json }</ui-json>`)
    expect(element.value).toBeUndefined()
    expect(element.matches(":state(error)")).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(errors).toHaveBeenCalledTimes(1)
    expect((errors.mock.calls[0]![0] as CustomEvent).detail.kind).toBe("render")
    element.textContent = `{ "a": 1 }`
    await ElementFixture.settle()
    expect(element.value).toEqual({ a: 1 })
    expect(element.matches(":state(error)")).toBe(false)
  })

  test("a `source` that fails warns too:  nothing else would show it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const element = await ElementFixture.render<DOMJsonElement>(`<ui-json source="/no/such/file.json"></ui-json>`)
    await expect(element.loaded).rejects.toThrow()
    expect(element.value).toBeUndefined()
    expect(element.matches(":state(error)")).toBe(true)
    expect(warn).toHaveBeenCalled()
  })
})

describe("<ui-json> source", () => {
  test("loads through `UI.sources`:  `loaded`, then `value` and `ui-changed`", async () => {
    serve(`{ "from": "file" }`)
    const element = await ElementFixture.render<DOMJsonElement>(`<ui-json source="${DATA_URL}"></ui-json>`)
    const changed = vi.fn()
    element.addEventListener("ui-changed", changed)
    await element.loaded
    await ElementFixture.settle()
    expect(element.value).toEqual({ from: "file" })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(element.matches(":state(loading)")).toBe(false)
  })
})

describe("<ui-tree-diagram> reading a <ui-json> child", () => {
  test("draws its text, and follows it", async () => {
    const diagram = await ElementFixture.render(
      `<ui-tree-diagram><ui-json>{ "label": "Before" }</ui-json></ui-tree-diagram>`
    )
    await ElementFixture.settle()
    expect(labels(diagram)).toEqual(["Before"])
    diagram.querySelector("ui-json")!.textContent = `{ "label": "After" }`
    await ElementFixture.settle()
    expect(labels(diagram)).toEqual(["After"])
  })

  test("draws a `source` file once it's loaded", async () => {
    serve(`{ "label": "Root", "children": [{ "label": "From a file" }] }`)
    const diagram = await ElementFixture.render(
      `<ui-tree-diagram><ui-json source="${DATA_URL}"></ui-json></ui-tree-diagram>`
    )
    await diagram.querySelector<DOMJsonElement>("ui-json")!.loaded
    await ElementFixture.settle()
    expect(labels(diagram)).toEqual(["Root", "From a file"])
  })

  test("follows `value` set by script", async () => {
    const diagram = await ElementFixture.render(
      `<ui-tree-diagram><ui-json>{ "label": "Before" }</ui-json></ui-tree-diagram>`
    )
    await ElementFixture.settle()
    diagram.querySelector<DOMJsonElement>("ui-json")!.value = { label: "Set" }
    await ElementFixture.settle()
    expect(labels(diagram)).toEqual(["Set"])
  })
})

describe("<ui-json> accessibility", () => {
  test.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await ElementFixture.settle()
    await expectAccessible(root)
  })
})
