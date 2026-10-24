import { userEvent } from "vite-plus/test/browser"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { UI } from "spell-ui/runtime"
import { foundationCSS } from "spell-ui/styles"
import { Sheets } from "spell-ui/test-helpers/Sheets"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { SavedTheme, ThemeSheet, type DOMThemeEditorElement } from "spell-ui/components/ui-theme-editor"

/** The editor in the fixture, drawn. */
async function editor(html = "<ui-theme-editor></ui-theme-editor>"): Promise<DOMThemeEditorElement> {
  const host = (await ElementFixture.render(html)) as DOMThemeEditorElement
  await ElementFixture.settle()
  return host
}

/** An element in `host`'s shadow root. */
function inner<T extends Element = HTMLElement>(host: Element, selector: string): T {
  return host.shadowRoot!.querySelector<T>(selector)!
}

/** A computed token on `<html>`. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Every `ui-change` `host` sends. */
function changes(host: Element): CustomEvent[] {
  const events: CustomEvent[] = []
  host.addEventListener("ui-change", (event) => events.push(event as CustomEvent))
  return events
}

/** Wait for the page's sheets to follow (`ThemeSheet.applyToPage()` is async). */
async function applied(): Promise<void> {
  await ElementFixture.settle()
  await new Promise((resolve) => setTimeout(resolve, 50))
  await ElementFixture.settle()
}

beforeEach(() => SavedTheme.forget())
afterEach(async () => {
  SavedTheme.forget()
  const { themes } = await UI.load()
  await themes.apply(undefined)
})

////////////////
// ## Starting
////////////////

describe("<ui-theme-editor> starting", () => {
  it("starts from fruity when the page has no theme, and applies it", async () => {
    // the page's own token sheets, as a real page has:  else each shadow root keeps its default colours
    Sheets.adopt(foundationCSS)
    const host = await editor()
    // NOTE:  axe over the light sample only:  in a test page the dark sample's label reads its own shadow root's
    // default colours (white on #3faff3), where a served page shows fruity's (the designer's shots, epic `debut` P6)
    inner(host, ".sample.ui-dark").hidden = true
    await vi.waitFor(() => expect(token("--fruity-glass")).not.toBe(""))
    expect(host.theme).toEqual({ name: "My theme", base: "fruity" })
    expect(UI.themes.current).toBe("fruity")
    expect(host.css).toContain("No changes yet:  this is fruity as it is.")
    await expectAccessible(host)
  })

  it("Light shows the light sample alone", async () => {
    const host = await editor()
    const light = inner(host, '[part~="preview"] ui-menu ui-item[value="light"]')
    await userEvent.click(light.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!)
    await ElementFixture.settle()
    expect(inner(host, ".sample.ui-dark").hidden).toBe(true)
    expect(inner(host, ".sample.ui-light").hidden).toBe(false)
  })

  it("starts from `value`, and from the kept theme when there's none", async () => {
    const given = await editor(`<ui-theme-editor value='{"primary": "pink", "corners": "soft"}'></ui-theme-editor>`)
    expect(given.theme).toMatchObject({ primary: "pink", corners: "soft", base: "fruity" })
    given.remove()
    SavedTheme.save({ name: "Kept", base: "fruity", primary: "teal" }, "/* kept */")
    const kept = await editor()
    expect(kept.theme).toMatchObject({ name: "Kept", primary: "teal" })
  })
})

////////////////
// ## Choosing
////////////////

describe("<ui-theme-editor> choosing", () => {
  it("a colour swatch changes the page's primary, and sends `ui-change` with the stylesheet", async () => {
    const host = await editor()
    const events = changes(host)
    inner(host, 'ui-property[name="primary"] button[value="pink"]').click()
    await applied()
    expect(events).toHaveLength(1)
    expect(events[0]!.detail.value.primary).toBe("pink")
    expect(events[0]!.detail.css).toContain("--ui-primary: var(--ui-pink);")
    expect(token("--ui-primary")).toBe(token("--ui-pink"))
    expect(inner(host, 'ui-property[name="primary"] button[value="pink"]').getAttribute("aria-checked")).toBe("true")
  })

  it("a segmented choice changes the page's radii;  its Reset puts the theme's own back", async () => {
    const host = await editor()
    const pill = inner(host, 'ui-property[name="corners"] ui-item[value="pill"]')
    await userEvent.click(pill.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!)
    await applied()
    expect(host.theme?.corners).toBe("pill")
    expect(token("--ui-radius-s")).toBe("9999px")
    inner(host, 'ui-property[name="corners"] ui-button[slot="actions"]').click()
    await applied()
    expect(host.theme?.corners).toBeUndefined()
    expect(token("--ui-radius-s")).toBe("8px")
  })

  it("arrow keys in a swatch row move and choose", async () => {
    const host = await editor()
    const row = inner(host, 'ui-property[name="secondary"] .swatches')
    row.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    await ElementFixture.settle()
    expect(host.theme?.secondary).toBe("red")
  })

  it("its inner elements' events stop at its shadow root", async () => {
    const host = await editor()
    const events = changes(host)
    inner(host, ".sample ui-checkbox").dispatchEvent(
      new CustomEvent("ui-change", { detail: { value: true }, bubbles: true, composed: true })
    )
    expect(events).toHaveLength(0)
  })

  it("Start over drops every change but the name and the base", async () => {
    const host = await editor(`<ui-theme-editor value='{"name": "Sunrise", "primary": "pink"}'></ui-theme-editor>`)
    inner(host, ".actions ui-button:last-child").click()
    await ElementFixture.settle()
    expect(host.theme).toEqual({ name: "Sunrise", base: "fruity" })
  })
})

////////////////
// ## The sheet, kept and copied
////////////////

describe("<ui-theme-editor> sheet", () => {
  it("Use this theme keeps it;  `SavedTheme.restore()` puts it back on a page", async () => {
    const host = await editor(`<ui-theme-editor value='{"primary": "green"}'></ui-theme-editor>`)
    inner(host, ".actions ui-button[primary]").click()
    await ElementFixture.settle()
    expect(SavedTheme.choices?.primary).toBe("green")
    expect(host.matches(":state(saved)")).toBe(true)
    host.remove()
    await applied()
    expect(token("--ui-primary")).not.toBe(token("--ui-green"))
    expect(await SavedTheme.restore()).toBe(true)
    await applied()
    expect(token("--ui-primary")).toBe(token("--ui-green"))
  })

  it("Copy CSS copies the stylesheet, and sends `ui-copy`", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined)
    const host = await editor(`<ui-theme-editor value='{"depth": "flat"}'></ui-theme-editor>`)
    const copies: CustomEvent[] = []
    host.addEventListener("ui-copy", (event) => copies.push(event as CustomEvent))
    inner(host, '[part~="sheet"] ui-button').click()
    await applied()
    expect(writeText).toHaveBeenCalledWith(host.css)
    expect(copies[0]?.detail.css).toBe(host.css)
    writeText.mockRestore()
  })

  it("taken off the page, it puts the page's theme back", async () => {
    const { themes } = await UI.load()
    await themes.apply("spell")
    const host = await editor(`<ui-theme-editor base="fruity" value='{"primary": "pink"}'></ui-theme-editor>`)
    await applied()
    expect(themes.current).toBe("fruity")
    host.remove()
    await applied()
    expect(themes.current).toBe("spell")
  })
})

describe("ThemeSheet", () => {
  const text = (key: string, params?: Record<string, string | number>) =>
    `${key}${params ? JSON.stringify(params) : ""}`

  it("writes only the choices made, in `@layer ui.app`, and names its file from the theme's name", () => {
    const sheet = new ThemeSheet({ choices: { name: "Sun Rise!", base: "fruity", textSize: 17 }, text })
    expect(sheet.fileName).toBe("themes/sun-rise.css")
    expect(sheet.css).toContain("@layer ui.app {")
    expect(sheet.css).toContain("--ui-font-size: 17px;")
    expect(sheet.css).not.toContain("--ui-primary")
  })

  it("writes fruity's glass only on fruity", () => {
    const on = (base: string) => new ThemeSheet({ choices: { name: "x", base, glass: "solid" }, text }).css
    expect(on("fruity")).toContain("--fruity-glass")
    expect(on("spell")).not.toContain("--fruity-glass")
  })
})
