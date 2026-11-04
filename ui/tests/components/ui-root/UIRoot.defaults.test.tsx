import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type { DOMElement } from "spell/element"
import { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import "spell/ui/components/ui-root"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-segment"

/** A root element, its `defaults` property typed. */
type RootElement = DOMElement & { defaults?: E.AttributeDefaults }

/** The classes `<ui-button>` `id` draws on its shadow button. */
function buttonClasses(id: string): string {
  const host = document.getElementById(id) as DOMElement
  return host.shadowRoot!.querySelector<HTMLElement>("[part~=button]")!.className
}

/** The root `id`. */
function root(id: string): RootElement {
  return document.getElementById(id) as RootElement
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("<ui-root defaults>", () => {
  it("draws every button inside as a pill, from the root's JSON text", async () => {
    await ElementFixture.render(
      `<ui-root id="app" defaults='{"ui-button": {"appearance": "pill"}}'>` +
        `<ui-button id="go">Go</ui-button><ui-button id="stop" size="small">Stop</ui-button></ui-root>`
    )
    await expect.poll(() => buttonClasses("go")).toBe("ui circular button")
    expect(buttonClasses("stop")).toBe("ui small circular button")
    // the markup stays what the page wrote
    expect(document.getElementById("go")!.hasAttribute("appearance")).toBe(false)
    expect((document.getElementById("go") as DOMElement & { appearance: string }).appearance).toBe("pill")
  })

  it("lets a button's own attribute, or a property set in code, win", async () => {
    await ElementFixture.render(
      `<ui-root id="app"><ui-button id="own" appearance="basic">Own</ui-button>` +
        `<ui-button id="coded">Coded</ui-button></ui-root>`
    )
    const coded = document.getElementById("coded") as DOMElement & { appearance?: string }
    coded.appearance = "tertiary"
    root("app").defaults = { "ui-button": { appearance: "pill" } }
    await ElementFixture.settle()
    await expect.poll(() => buttonClasses("own")).toBe("ui basic button")
    expect(buttonClasses("coded")).toBe("ui tertiary button")
    // set back to nothing:  the default again
    coded.appearance = undefined
    await expect.poll(() => buttonClasses("coded")).toBe("ui circular button")
    document.getElementById("own")!.removeAttribute("appearance")
    await expect.poll(() => buttonClasses("own")).toBe("ui circular button")
  })

  it("redraws when the defaults change, and forgets one that's gone", async () => {
    await ElementFixture.render(`<ui-root id="app"><ui-button id="go">Go</ui-button></ui-root>`)
    expect(buttonClasses("go")).toBe("ui button")
    root("app").defaults = { "ui-button": { appearance: "pill", size: "large" } }
    await expect.poll(() => buttonClasses("go")).toBe("ui large circular button")
    root("app").defaults = { "ui-button": { size: "small" } }
    await expect.poll(() => buttonClasses("go")).toBe("ui small button")
    root("app").defaults = undefined
    await expect.poll(() => buttonClasses("go")).toBe("ui button")
  })

  it("inherits the outer root's in a nested root, which overrides what it sets", async () => {
    await ElementFixture.render(
      `<ui-root id="outer"><ui-button id="out">Out</ui-button>` +
        `<ui-root id="inner"><ui-button id="in">In</ui-button><ui-segment id="box">Box</ui-segment></ui-root>` +
        `</ui-root>`
    )
    root("outer").defaults = {
      "ui-button": { appearance: "pill", size: "large" },
      "ui-segment": { appearance: "raised" }
    }
    root("inner").defaults = { "ui-button": { appearance: "basic" } }
    await expect.poll(() => buttonClasses("out")).toBe("ui large circular button")
    await expect.poll(() => buttonClasses("in")).toBe("ui large basic button")
    const segment = document.getElementById("box") as DOMElement
    await expect.poll(() => segment.shadowRoot!.querySelector(".segment")?.className).toContain("raised")
  })

  it("turns away a content attribute or a bad value, warning once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    await ElementFixture.render(
      `<ui-root id="app"><ui-button id="go">Go</ui-button><ui-button id="stop">Stop</ui-button></ui-root>`
    )
    root("app").defaults = { "ui-button": { label: "Click", appearance: "pil", size: "large" } }
    await expect.poll(() => buttonClasses("go")).toBe("ui large button")
    expect(buttonClasses("stop")).toBe("ui large button")
    expect(document.getElementById("go")!.textContent).toBe("Go")
    const messages = warn.mock.calls.map(([message]) => String(message))
    const label = messages.filter((message) => message.includes("label"))
    const appearance = messages.filter((message) => message.includes('appearance="pil"'))
    expect(label).toHaveLength(1)
    expect(label[0]).toContain("<ui-root>")
    expect(label[0]).toContain("<ui-button")
    expect(appearance).toHaveLength(1)
    expect(appearance[0]).toContain('did you mean "pill"?')
    // the root itself rides along, so the console links to it
    expect(warn.mock.calls.find(([message]) => String(message).includes("label"))?.[1]).toBe(root("app"))
  })
})
