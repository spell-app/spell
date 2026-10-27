import { describe, expect, it } from "vite-plus/test"

import { foundationCSS } from "spell-ui/styles"

import { Sheets } from "spell-ui/test-helpers/Sheets"

import exampleCSS from "spell-ui/components/ui-example/UIExample.css?inline"
import exampleRaw from "spell-ui/components/ui-example/UIExample.css?raw"

/**
 * `UIExample.css`:  the sheet's source rules, and its layout on the shadow markup contract.
 * - The look is the widgets' own (`<ui-segment>`, `<ui-button>` ...), tested in their families;
 *   this sheet only lays them out, so a stand-in host with the contract's markup is enough.
 */
describe("UIExample.css source", () => {
  it("never uses rem or !important", () => {
    const text = Sheets.withoutComments(exampleRaw)
    expect(text).not.toMatch(/\d(\.\d+)?rem\b/)
    expect(text).not.toContain("!important")
  })

  it("declares its sublayer order before any rule", () => {
    const text = Sheets.withoutComments(exampleRaw).trim()
    expect(text.replace(/\s+/g, " ").startsWith(Sheets.layers("example"))).toBe(true)
  })

  it("declares no public token of its own:  private aliases only", () => {
    const declared = [...Sheets.withoutComments(exampleRaw).matchAll(/(--ui-example-[\w-]+)\s*:/g)]
    // but the three the `tools` row hands down to the page's buttons, for them to read, never to set
    const handedDown = ["--ui-example-tool-size", "--ui-example-tool-radius", "--ui-example-tool-background"]
    expect(declared.map((match) => match[1]).filter((name) => !handedDown.includes(name!))).toEqual([])
  })
})

describe("UIExample.css layout", () => {
  /** The contract's markup in a shadow root, with the foundation and the sheet adopted. */
  const MARKUP =
    `<section class="ui example" part="example"><div class="heading"><span part="header">H</span></div>` +
    `<div class="description" part="description">D</div>` +
    `<div class="frame"><button part="toggle">c</button><div part="demo">X</div></div></section>`

  it("puts the header and description above the frame, the code button inside the frame's top right corner", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, exampleCSS])
    const shadow = host.shadowRoot!
    expect(getComputedStyle(shadow.querySelector(".heading")!).display).toBe("flex")
    const frame = shadow.querySelector(".frame")!.getBoundingClientRect()
    const description = shadow.querySelector("[part~=description]")!.getBoundingClientRect()
    expect(description.bottom).toBeLessThanOrEqual(frame.top)
    const toggle = shadow.querySelector<HTMLElement>("[part~=toggle]")!
    expect(getComputedStyle(toggle).position).toBe("absolute")
    expect(getComputedStyle(toggle).opacity).toBe("1")
    toggle.style.cssText = "height: 1.35em; box-sizing: border-box; padding: 0; border: 0"
    // inside the frame's top right corner, 6px in from its padding box on both sides, over the example
    const box = toggle.getBoundingClientRect()
    const edge = shadow.querySelector<HTMLElement>(".frame")!
    const borderRight = frame.width - edge.clientLeft - edge.clientWidth
    expect(Math.round(box.top - (frame.top + edge.clientTop))).toBe(6)
    expect(Math.round(frame.right - borderRight - box.right)).toBe(6)
  })

  it("takes a public token from outside", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, exampleCSS])
    host.style.setProperty("--ui-example-toggle-opacity", "0.25")
    expect(getComputedStyle(host.shadowRoot!.querySelector("[part~=toggle]")!).opacity).toBe("0.25")
  })
})
