import { beforeAll, describe, expect, it } from "vite-plus/test"

import type { UIT } from "spell/ui/core"
import { ThemeDraft } from "spell/ui/components/ui-theme-editor/ThemeDraft"
import { ThemeTokens } from "spell/ui/components/ui-theme-editor/ThemeTokens"

/** The editor's texts, as their keys (and params). */
const text = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ""}`

let files: ThemeTokens
beforeAll(async () => {
  files = await ThemeTokens.load()
})

/** A draft of `choices`, the theme files loaded. */
function draft(choices: Partial<UIT.ThemeChoices>, ownPrefixes: string[] = []): ThemeDraft {
  return new ThemeDraft({ choices: { name: "Sun Rise!", base: "fruity", ...choices }, files, text, ownPrefixes })
}

describe("ThemeDraft", () => {
  it("is a theme file:  its base as `extends`, named from the theme's name", () => {
    const sunrise = draft({ textSize: 17 })
    expect(sunrise.fileName).toBe("sun-rise.theme.json5")
    expect(sunrise.data).toMatchObject({ title: "Sun Rise!", extends: "fruity", typography: { size: "17px" } })
    expect(sunrise.hasChanges).toBe(true)
    expect(draft({}).hasChanges).toBe(false)
  })

  it("its sheet:  ThemeFile's, worn over the base, in `@layer ui.app`;  only what's chosen", () => {
    const { css } = draft({ textSize: 17 })
    expect(css).toContain("@layer ui.app {")
    expect(css).toContain("--ui-font-size: 17px;")
    expect(css).toContain('sheetBase{"base":"fruity"}')
    expect(css).not.toContain("--ui-primary")
  })

  it("a role pointed at a hue, the primary's shades worked out from it", () => {
    const { css } = draft({ primary: "pink" })
    expect(css).toContain("--ui-primary: var(--ui-pink);")
    expect(css).toContain("--ui-primary-text: light-dark(oklch(from var(--ui-primary) min(l, 0.5) c h)")
    expect(css).toContain("--ui-menu-active-color: var(--ui-primary-text);")
  })

  it("writes the glass only on a glass theme (Glass, Fruity), the wallpaper only on Fruity", () => {
    const on = (base: string) => draft({ base, glass: "solid", background: "teal" }).css
    expect(on("glass")).toContain("--glass-surface")
    expect(on("fruity")).toContain("--glass-surface")
    expect(on("spell")).not.toContain("--glass-surface")
    expect(on("fruity")).toContain("--glass-wallpaper")
    expect(on("glass")).not.toContain("--glass-wallpaper")
  })

  it("a token set by hand wins over the Basics;  its colour in hex", () => {
    const pinkRadius = draft({ corners: "pill", tokens: { "--ui-radius-l": { both: "rgb(255 255 255 / 0.5)" } } })
    expect(pinkRadius.data).toMatchObject({ radii: { l: "#ffffff80", s: "9999px" } })
  })

  it("a pair leaf's half set by hand keeps the other half as the base writes it", () => {
    const ink = draft({ tokens: { "--ui-ink-on-dark": { both: "#eeeeee" } } })
    const pair = (ink.data as { text: { ink: { light: string; dark: string } } }).text.ink
    expect(pair.dark).toBe("#eeeeee")
    expect(pair.light).not.toBe("#eeeeee")
    expect(ink.css).toContain("--ui-ink-on-dark: #eeeeee;")
  })

  it("frameCss:  every value `!important`;  a page's own tokens as their own rule, never in the file", () => {
    const tuned = draft({ textSize: 15, tokens: { "--spell-pane-radius": { light: "4px", dark: "8px" } } }, [
      "--spell-"
    ])
    expect(tuned.frameCss).toContain("--ui-font-size: 15px !important;")
    expect(tuned.frameCss).toContain("--spell-pane-radius: light-dark(4px, 8px) !important;")
    expect(JSON.stringify(tuned.data)).not.toContain("spell-pane")
    expect(tuned.changes).toContain('"extends": "fruity"')
    expect(tuned.changes).toContain("--spell-pane-radius")
  })

  it("no sheet until the theme files load", () => {
    const early = new ThemeDraft({ choices: { name: "x", base: "fruity", textSize: 17 }, files: undefined, text })
    expect(early.css).toBe("")
    expect(early.changes).toBe("")
  })

  it("hex():  a plain rgb() as hex;  anything else as it is", () => {
    expect(ThemeDraft.hex("rgb(255 255 255 / 0.5)")).toBe("#ffffff80")
    expect(ThemeDraft.hex("rgba(0, 0, 0, 1)")).toBe("#000000")
    expect(ThemeDraft.hex("var(--ui-red)")).toBe("var(--ui-red)")
  })
})
