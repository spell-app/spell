import { describe, expect, onTestFinished, test } from "vite-plus/test"

import { UI, type Themes } from "spell/ui/runtime"
import { ThemeHarness } from "spell/ui/test-helpers/ThemeHarness"

import "spell/ui/components/ui-button"

////////////////
// ## The sheets
////////////////

describe("UI.themes.sheets", () => {
  test("lists every sheet of the folder's top level:  classic, dark and our own;  none of the archived ones", async () => {
    await UI.load()
    expect(UI.themes.sheets).toContain("classic")
    expect(UI.themes.sheets).toContain("dark")
    for (const name of UI.themes.own) expect(UI.themes.sheets).toContain(name)
    // Fomantic's, archived in `themes/archive/` (epic `debut` P17):  in no bundle
    expect(UI.themes.sheets).not.toContain("github")
    expect(UI.themes.has("material")).toBe(false)
  })
})

describe("UI.themes.scopedTokens()", () => {
  test("one part of the page wears another theme's tokens, the rest keeps the page's", async () => {
    await UI.load()
    const css = await UI.themes.scopedTokens("spell", ".scoped")
    expect(css).toContain(":root .scoped {")
    const style = document.head.appendChild(document.createElement("style"))
    style.textContent = css
    const inside = document.body.appendChild(Object.assign(document.createElement("div"), { className: "scoped" }))
    onTestFinished(() => {
      style.remove()
      inside.remove()
    })
    const token = (element: Element) => getComputedStyle(element).getPropertyValue("--ui-font-family-heading")
    // Spell's headings are its serif;  the page's (no theme) aren't
    expect(token(inside)).toContain("Spell Serif")
    expect(token(document.body)).not.toContain("Spell Serif")
  })

  test("light or dark stays the page's:  the scope re-declares no scheme (epic `debut` I80)", async () => {
    await UI.load()
    const css = await UI.themes.scopedTokens("spell", ".scoped")
    expect(css).not.toMatch(/color-scheme|--ui-scheme/)
    // nor the cursor over controls:  a panel in another theme's look behaves as its page does
    expect(css).not.toContain("--ui-control-cursor")
    const style = document.head.appendChild(document.createElement("style"))
    style.textContent = css
    // a part set to dark, whatever the OS says:  the scope inside it stays dark
    const dark = document.body.appendChild(Object.assign(document.createElement("div"), { className: "ui-dark" }))
    const inside = dark.appendChild(Object.assign(document.createElement("div"), { className: "scoped" }))
    onTestFinished(() => {
      style.remove()
      dark.remove()
    })
    expect(getComputedStyle(inside).colorScheme).toBe("dark")
  })
})

describe("Themes.RENAMED", () => {
  test("every old name comes back as a theme of the set, and names no sheet of its own", async () => {
    await UI.load()
    // a static on the runtime's lazy class:  reached through the instance, as the remembered themes read it (`UIT`)
    const { RENAMED } = UI.themes.constructor as typeof Themes
    for (const [old, now] of Object.entries(RENAMED)) {
      expect(UI.themes.own, old).toContain(now)
      expect(UI.themes.has(old), old).toBe(false)
    }
    expect(RENAMED).toEqual({ studio: "merlot", "spell-brand": "spell" })
  })
})

describe("UI.themes.load()", () => {
  test("every sheet is wholly inside @layer ui.theme (bar LAYER_EXCEPTIONS)", async () => {
    await UI.load()
    // a reset must sit UNDER everything:  `resetcss` in `ui.theme` would beat typography and native.css
    const LAYER_EXCEPTIONS: Readonly<Record<string, string>> = { resetcss: "ui.reset" }
    for (const name of UI.themes.sheets) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(await UI.themes.load(name))
      for (const rule of sheet.cssRules) {
        // `@font-face` / `@property` can't live in a layer and are harmless outside one
        if (rule instanceof CSSFontFaceRule || rule instanceof CSSPropertyRule) continue
        expect(rule instanceof CSSLayerBlockRule && rule.name, `${name}.css:  ${rule.cssText.slice(0, 60)}`).toBe(
          LAYER_EXCEPTIONS[name] ?? "ui.theme"
        )
      }
    }
  })
})

////////////////
// ## Applying
////////////////

describe("UI.themes.apply()", () => {
  test("registers classic + the theme on the page and in shadow roots, in that order;  undefined clears", async () => {
    const { host } = await ThemeHarness.inner(`<ui-button>Probe</ui-button>`, ".ui.button")
    await ThemeHarness.use(UI.themes.own[0]!)
    const base = UI.styles.sheet(UI.themes.slots.base)!
    const sheet = UI.styles.sheet(UI.themes.slots.theme)!
    expect(document.adoptedStyleSheets).toContain(base)
    expect(document.adoptedStyleSheets).toContain(sheet)
    const adopted = [...host.shadowRoot!.adoptedStyleSheets]
    expect(adopted.indexOf(base)).toBeGreaterThan(-1)
    expect(adopted.indexOf(sheet)).toBeGreaterThan(adopted.indexOf(base))
    // the app stylesheet stays last
    expect(adopted.at(-1)).toBe(UI.styles.appSheet)

    await UI.themes.apply(undefined)
    expect(UI.styles.has(UI.themes.slots.base)).toBe(false)
    expect(UI.styles.has(UI.themes.slots.theme)).toBe(false)
    expect(host.shadowRoot!.adoptedStyleSheets).not.toContain(sheet)
    expect(UI.themes.current).toBeUndefined()
  })

  test('apply("classic") is classic alone, and reaches components (Lato, 14px)', async () => {
    const before = (await ThemeHarness.inner(`<ui-button>Probe</ui-button>`, ".ui.button")).style.fontFamily
    await ThemeHarness.use("classic")
    expect(UI.styles.has(UI.themes.slots.theme)).toBe(false)
    const { style } = await ThemeHarness.inner(`<ui-button>Probe</ui-button>`, ".ui.button")
    expect(style.fontFamily).toMatch(/^Lato/)
    expect(style.fontFamily).not.toBe(before)
  })

  test("the last apply() wins", async () => {
    await UI.load()
    const [first, second] = UI.themes.own as [string, string]
    onTestFinished(() => UI.themes.apply(undefined))
    await Promise.all([UI.themes.apply(first), UI.themes.apply(second)])
    expect(UI.themes.current).toBe(second)
    expect(UI.styles.sheet(UI.themes.slots.theme)!.cssRules.length).toBeGreaterThan(0)
    const text = await UI.themes.load(second)
    const probe = new CSSStyleSheet()
    probe.replaceSync(text)
    expect(UI.styles.sheet(UI.themes.slots.theme)!.cssRules[0]!.cssText).toBe(probe.cssRules[0]!.cssText)
  })

  test("refuses dark and unknown names", async () => {
    await UI.load()
    await expect(UI.themes.apply("dark")).rejects.toThrow(/isn't a theme/)
    await expect(UI.themes.apply("no-such-theme")).rejects.toThrow(/isn't a theme/)
  })
})
