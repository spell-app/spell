import { describe, expect, it } from "vite-plus/test"

import { foundationCSS } from "spell-ui/styles"

import { Sheets } from "spell-ui/test-helpers/Sheets"

import exampleCSS from "spell-ui/docs-components/ui-docs-example/UIDocsExample.css?inline"
import exampleRaw from "spell-ui/docs-components/ui-docs-example/UIDocsExample.css?raw"

/**
 * `UIDocsExample.css`:  the sheet's source rules, and its layout on the shadow markup contract.
 * - The look is the widgets' own (`<ui-segment>`, `<ui-button>` ...), tested in their families;
 *   this sheet only lays them out, so a stand-in host with the contract's markup is enough.
 */
describe("UIDocsExample.css source", () => {
  it("never uses rem or !important", () => {
    const text = Sheets.withoutComments(exampleRaw)
    expect(text).not.toMatch(/\d(\.\d+)?rem\b/)
    expect(text).not.toContain("!important")
  })

  it("declares its sublayer order before any rule", () => {
    const text = Sheets.withoutComments(exampleRaw).trim()
    expect(text.replace(/\s+/g, " ").startsWith(Sheets.layers("docs-example"))).toBe(true)
  })

  it("declares no public token of its own:  private aliases only", () => {
    const declared = [...Sheets.withoutComments(exampleRaw).matchAll(/(--ui-docs-example-[\w-]+)\s*:/g)]
    expect(declared.map((match) => match[1])).toEqual([])
  })
})

describe("UIDocsExample.css layout", () => {
  /** The contract's markup in a shadow root, with the foundation and the sheet adopted. */
  const MARKUP =
    `<section class="ui example" part="example"><div class="heading"><span part="header">H</span></div>` +
    `<div class="description" part="description">D</div>` +
    `<div class="frame"><button part="toggle">c</button><div part="demo">X</div></div></section>`

  it("puts the header and description above the frame, the code button over the frame's corner (centred in a one-line frame)", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, exampleCSS])
    const shadow = host.shadowRoot!
    expect(getComputedStyle(shadow.querySelector(".heading")!).display).toBe("flex")
    const frame = shadow.querySelector(".frame")!.getBoundingClientRect()
    const description = shadow.querySelector("[part~=description]")!.getBoundingClientRect()
    expect(description.bottom).toBeLessThanOrEqual(frame.top)
    const toggle = shadow.querySelector<HTMLElement>("[part~=toggle]")!
    expect(getComputedStyle(toggle).position).toBe("absolute")
    expect(getComputedStyle(toggle).opacity).toBe("1")
    // a one-line frame:  centred top to bottom (the sheet takes the button as the mini `<ui-button>`'s 1.35em)
    toggle.style.cssText = "height: 1.35em; box-sizing: border-box; padding: 0; border: 0"
    const box = toggle.getBoundingClientRect()
    expect(Math.abs(box.top - frame.top - (frame.bottom - box.bottom))).toBeLessThan(1.5)
    // a tall frame:  the same inset from its top and right edges
    shadow.querySelector<HTMLElement>("[part~=demo]")!.style.height = "200px"
    const tall = shadow.querySelector(".frame")!.getBoundingClientRect()
    const corner = toggle.getBoundingClientRect()
    expect(Math.abs(corner.top - tall.top - (tall.right - corner.right))).toBeLessThan(1)
  })

  it("takes a public token from outside", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, exampleCSS])
    host.style.setProperty("--ui-docs-example-toggle-opacity", "0.25")
    expect(getComputedStyle(host.shadowRoot!.querySelector("[part~=toggle]")!).opacity).toBe("0.25")
  })
})
