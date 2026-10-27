import { describe, expect, it } from "vite-plus/test"

import { foundationCSS } from "spell-ui/styles"

import { Sheets } from "spell-ui/test-helpers/Sheets"

import themesCSS from "spell-ui/components/ui-theme-menu/UIThemeMenu.css?inline"
import themesRaw from "spell-ui/components/ui-theme-menu/UIThemeMenu.css?raw"

/** The scheme button and the overlay's rows, as the element renders them (the shadow markup contract). */
const MARKUP = `<div class="ui themes" part="controls">
  <button class="palette button" part="palette"><span class="glyph">P</span></button>
  <button class="scheme light button" part="scheme">
    <span class="light glyph">S</span><span class="dark glyph">M</span>
  </button>
  <div class="panel">
    <div class="schemes" role="radiogroup">
      <button class="choice checked" role="radio" aria-checked="true"><span class="name">Light</span></button>
      <button class="choice" role="radio" aria-checked="false"><span class="name">Dark</span></button>
      <button class="choice" role="radio" aria-checked="false"><span class="name">Auto</span></button>
    </div>
    <div class="menu">
      <button class="option checked" role="menuitemradio"><span class="check">C</span><span class="name">Spell</span></button>
      <button class="option" role="menuitemradio"><span class="check">C</span><span class="name">Merlot</span></button>
    </div>
  </div>
</div>`

/**
 * `UIThemeMenu.css`:  the sheet's source rules, and its look on the shadow markup contract.
 * - The overlay box and the dropdown are other families' (`<ui-popup>`, `<ui-dropdown>`), tested there;
 *   a stand-in host with the contract's markup is enough for the rest.
 */
describe("UIThemeMenu.css source", () => {
  it("never uses rem;  its one !important is the documented sun / moon swap", () => {
    const text = Sheets.withoutComments(themesRaw)
    expect(text).not.toMatch(/\d(\.\d+)?rem\b/)
    expect(text.match(/!important/g)).toHaveLength(1)
    expect(text).toMatch(/\.scheme \.glyph \{\s*transition:[^}]*!important;/)
  })

  it("declares its sublayer order before any rule", () => {
    const text = Sheets.withoutComments(themesRaw).trim()
    expect(text.replace(/\s+/g, " ").startsWith(Sheets.layers("theme-menu"))).toBe(true)
  })

  it("declares no public token of its own:  private aliases only", () => {
    const declared = [...Sheets.withoutComments(themesRaw).matchAll(/(--ui-theme-menu-[\w-]+)\s*:/g)]
    expect(declared.map((match) => match[1])).toEqual([])
  })
})

describe("UIThemeMenu.css look", () => {
  it("lays the controls in one row:  28px round buttons, --ui-theme-menu-gap / -button-size set them", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, themesCSS])
    const shadow = host.shadowRoot!
    const controls = shadow.querySelector<HTMLElement>("[part~=controls]")!
    const scheme = shadow.querySelector<HTMLElement>("[part~=scheme]")!
    expect(getComputedStyle(controls).display).toBe("inline-flex")
    expect(getComputedStyle(controls).columnGap).toBe("4px")
    expect([getComputedStyle(scheme).width, getComputedStyle(scheme).height]).toEqual(["28px", "28px"])
    expect(getComputedStyle(scheme).borderRadius).toBe("50%")
    // quiet at rest, as a page header's other icons:  no fill, no ring
    expect([getComputedStyle(scheme).backgroundColor, getComputedStyle(scheme).boxShadow]).toEqual([
      "rgba(0, 0, 0, 0)",
      "none"
    ])
    host.style.setProperty("--ui-theme-menu-gap", "20px")
    host.style.setProperty("--ui-theme-menu-button-size", "40px")
    expect(getComputedStyle(controls).columnGap).toBe("20px")
    expect(getComputedStyle(scheme).width).toBe("40px")
  })

  it("shows the glyph of the button's scheme:  the other one shrunk, faded and blurred", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, themesCSS])
    const shadow = host.shadowRoot!
    const sun = getComputedStyle(shadow.querySelector(".light.glyph")!)
    const moon = getComputedStyle(shadow.querySelector(".dark.glyph")!)
    expect([sun.opacity, sun.scale, sun.filter]).toEqual(["1", "1", "blur(0px)"])
    expect([moon.opacity, moon.scale, moon.filter]).toEqual(["0", "0.25", "blur(4px)"])
    shadow.querySelector("[part~=scheme]")!.className = "scheme dark button"
    for (const animation of shadow.getAnimations()) animation.finish()
    expect(getComputedStyle(shadow.querySelector(".dark.glyph")!).opacity).toBe("1")
    expect(getComputedStyle(shadow.querySelector(".light.glyph")!).opacity).toBe("0")
  })

  it("marks the chosen theme;  Light | Dark | Auto:  three equal keys, the chosen one raised", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, themesCSS])
    const [checked, other] = host.shadowRoot!.querySelectorAll(".option")
    expect(getComputedStyle(checked!.querySelector(".check")!).opacity).toBe("1")
    expect(getComputedStyle(other!.querySelector(".check")!).opacity).toBe("0")
    expect(getComputedStyle(checked!).backgroundColor).not.toBe(getComputedStyle(other!).backgroundColor)
    const schemes = getComputedStyle(host.shadowRoot!.querySelector(".schemes")!)
    expect(schemes.display).toBe("grid")
    expect(schemes.gridTemplateColumns.split(" ")).toHaveLength(3)
    const [chosen, plain] = host.shadowRoot!.querySelectorAll(".choice")
    expect(getComputedStyle(chosen!).boxShadow).not.toBe("none")
    expect(getComputedStyle(plain!).boxShadow).toBe("none")
    expect(getComputedStyle(chosen!).backgroundColor).not.toBe(getComputedStyle(plain!).backgroundColor)
  })

  it("size scales the buttons", () => {
    const host = Sheets.host(MARKUP.replace('class="ui themes"', 'class="ui small themes"'), [
      ...foundationCSS,
      themesCSS
    ])
    expect(getComputedStyle(host.shadowRoot!.querySelector("[part~=scheme]")!).width).toBe("24.5px")
  })
})
