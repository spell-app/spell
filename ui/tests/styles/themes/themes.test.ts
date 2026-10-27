import { describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { UI } from "spell-ui/runtime"
import { A11y } from "spell/test-helpers/A11y"
import { Painted } from "spell-ui/test-helpers/Painted"
import { ThemeHarness } from "spell-ui/test-helpers/ThemeHarness"

import "spell-ui/components/ui-button"
import "spell-ui/components/ui-checkbox"
import "spell-ui/components/ui-flag"
import "spell-ui/components/ui-segment"
import "spell-ui/components/ui-parts"
import "spell-ui/components/ui-input"
import "spell-ui/components/ui-menu"
import "spell-ui/components/ui-message"
import "spell-ui/components/ui-modal"
import "spell-ui/components/ui-progress"

/*
 * Every theme sheet's cases, one `describe("<name>.css")` each (theme agents APPEND theirs;  don't rewrite).
 * - Helpers:  `ThemeHarness` (`spell-ui/test-helpers/ThemeHarness`).  `UI.themes`' own tests:  `tests/runtime/Themes.test.ts`.
 * - Import the families a case renders at the top (`import "spell-ui/components/ui-<name>"`).
 * - Fomantic's themes are archived (`src/styles/themes/archive/`, epic `debut` P17):  not tested.
 */

////////////////
// ## Spell's own:  the one set (`UI.themes.own`)
////////////////

/**
 * Helpers for the cases of Spell's own themes (epic `debut` P17):  a block per theme of the set.
 * - Each block checks the same five facts:  listed, its primary colour, font, corners, its dark page;
 *   then what makes it itself.
 */
class Own {
  /** Apply theme `name` for this test, the families its cases render loaded. */
  static async use(name: string) {
    await Promise.all([import("spell-ui/components/ui-card"), import("spell-ui/components/ui-checkbox")])
    await ThemeHarness.use(name)
  }

  /**
   * The dark scheme page-wide, for this test.
   * - `box`:  its transitions off first, so its colour lands at once
   *   (under a loaded test run a waitFor can time out mid-way, an `oklch(...)` in between)
   */
  static dark(box?: Element) {
    if (box) (box as HTMLElement).style.transition = "none"
    document.documentElement.classList.add("ui-dark")
    onTestFinished(() => document.documentElement.classList.remove("ui-dark"))
  }

  /** A colour token as the page computes it, painted (`rgb(...)`), so hex, `oklch()` and `light-dark()` compare alike. */
  static color(token: string): string {
    const probe = document.createElement("span")
    probe.style.color = `var(${token})`
    document.body.append(probe)
    onTestFinished(() => probe.remove())
    const { r, g, b } = Painted.rgb(getComputedStyle(probe).color)
    return `rgb(${[r, g, b].map((channel) => Math.round(channel * 255)).join(", ")})`
  }

  /** A primary button's box, inside its shadow root. */
  static async primaryButton(): Promise<Element> {
    const { box } = await ThemeHarness.inner(`<ui-button color="primary">Build</ui-button>`, ".ui.button")
    return box
  }
}

describe("Themes.own:  the one set", () => {
  it("is Spell, Glass, Fruity, Merlot, Paper, Midnight, Crisp, Pop and Matrix, in that order, each a sheet of the folder", async () => {
    await UI.load()
    expect(UI.themes.own).toEqual(["spell", "glass", "fruity", "merlot", "paper", "midnight", "crisp", "pop", "matrix"])
    for (const name of UI.themes.own) expect(UI.themes.sheets).toContain(name)
  })
})

describe("spell.css", () => {
  it("Spell Purple primary (lilac on the aubergine dark), pill buttons that press in", async () => {
    await Own.use("spell")
    const box = await Own.primaryButton()
    expect(getComputedStyle(box)).toMatchObject({
      backgroundColor: "rgb(101, 80, 202)", // violet-600
      borderTopLeftRadius: "9999px",
      fontWeight: "500",
      transitionProperty: expect.stringContaining("scale")
    })
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(184, 180, 255)")) // violet-300
    expect(Own.color("--ui-background")).toBe("rgb(26, 16, 64)") // violet-950:  aubergine, not black
  })

  it("Spell Serif headers:  regular by default, a page h1 bold;  16px cards", async () => {
    await Own.use("spell")
    const { style } = await ThemeHarness.inner(`<ui-header>Today</ui-header>`, ".ui.header")
    expect(style.fontFamily).toMatch(/^"Spell Serif"/)
    expect(style.fontWeight).toBe("400")
    const h1 = await ThemeHarness.inner(`<ui-header level="1">Write in plain language.</ui-header>`, "h1.ui.header")
    expect(h1.style.fontWeight).toBe("700")
    const card = await ThemeHarness.inner(`<ui-card><ui-content>Streak</ui-content></ui-card>`, ".ui.card")
    expect(card.style.borderTopLeftRadius).toBe("16px")
    // no font files ship:  an installed Palatino-family face, else the stack ends in the generic `serif`
    expect(style.fontFamily).toMatch(/, serif$/)
  })

  it("the brand roles, folded in from Spell Brand:  ivory warm surface, aubergine inverse, lilac in dark", async () => {
    await Own.use("spell")
    expect(Own.color("--spell-surface-warm")).toBe("rgb(250, 245, 234)") // accent-75
    expect(Own.color("--spell-surface-inverse")).toBe("rgb(42, 29, 96)") // violet-900:  aubergine
    Own.dark()
    await vi.waitFor(() => expect(Own.color("--spell-accent")).toBe("rgb(184, 180, 255)")) // violet-300:  lilac
  })

  it("a ticked checkbox is the brand's done to-do:  a filled purple circle, white check", async () => {
    await Own.use("spell")
    const { box } = await ThemeHarness.inner(`<ui-checkbox selected>Drink water</ui-checkbox>`, ".ui.checkbox > label")
    await vi.waitFor(() => expect(getComputedStyle(box, "::before").backgroundColor).toBe("rgb(101, 80, 202)"))
    expect(getComputedStyle(box, "::before").borderTopLeftRadius).toBe("50%")
    expect(getComputedStyle(box, "::after").backgroundColor).toMatch(/^(rgb\(255, 255, 255\)|oklch\(1 0 0\))$/) // white
  })
})

describe("glass.css", () => {
  it("the violet accent (a deeper violet in dark, white on it), 8px buttons, the system font", async () => {
    await Own.use("glass")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(106, 63, 214)", borderTopLeftRadius: "8px" })
    expect(style.fontFamily).toMatch(/^-apple-system/)
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(124, 85, 230)"))
    expect(Own.color("--ui-background")).toBe("rgb(21, 19, 28)")
  })

  it("glass:  a card is translucent, 14px round, and blurs what's behind it", async () => {
    await Own.use("glass")
    const { style } = await ThemeHarness.inner(`<ui-card><ui-content>Streak</ui-content></ui-card>`, ".ui.card")
    expect(style.borderTopLeftRadius).toBe("14px")
    expect(style.backgroundColor).toBe("rgba(255, 255, 255, 0.62)")
    expect(style.backdropFilter).toBe("blur(28px) saturate(1.7)")
  })

  it("a SOLID page:  one colour, light and dark, no wallpaper", async () => {
    await Own.use("glass")
    const page = () => getComputedStyle(document.documentElement)
    expect(page()).toMatchObject({ backgroundImage: "none", backgroundColor: "rgb(242, 238, 251)" })
    Own.dark()
    await vi.waitFor(() => expect(page().backgroundColor).toBe("rgb(21, 19, 28)"))
    expect(page().backgroundImage).toBe("none")
  })
})

describe("glass.css:  interfaces.dev's cheat sheet", () => {
  it("buttons press in with a named transition, never `all`", async () => {
    await Own.use("glass")
    const { style } = await ThemeHarness.inner(`<ui-button>Save</ui-button>`, ".ui.button")
    expect(style.transitionProperty).toContain("scale")
    expect(style.transitionProperty).not.toContain("all")
  })

  it("a page image wears a 1px outline inside its edge;  links skip descenders", async () => {
    await Own.use("glass")
    const img = document.createElement("img")
    const link = document.createElement("a")
    link.href = "#"
    document.body.append(img, link)
    onTestFinished(() => {
      img.remove()
      link.remove()
    })
    expect(getComputedStyle(img)).toMatchObject({ outlineWidth: "1px", outlineOffset: "-1px" })
    expect(getComputedStyle(link).textUnderlinePosition).toBe("from-font")
  })
})

describe("fruity.css", () => {
  it("Glass's look whole:  its violet primary, 8px buttons, the system font, its dark page", async () => {
    await Own.use("fruity")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(106, 63, 214)", borderTopLeftRadius: "8px" })
    expect(style.fontFamily).toMatch(/^-apple-system/)
    const card = await ThemeHarness.inner(`<ui-card><ui-content>Streak</ui-content></ui-card>`, ".ui.card")
    expect(card.style.backdropFilter).toBe("blur(28px) saturate(1.7)")
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(124, 85, 230)"))
    expect(Own.color("--ui-background")).toBe("rgb(21, 19, 28)")
  })

  it("its pastel wallpaper over Glass's page;  a shadow root wears neither", async () => {
    await Own.use("fruity")
    const page = getComputedStyle(document.documentElement)
    expect(page.backgroundImage).toMatch(/^radial-gradient\(at 12% 18%, rgb\(200, 182, 255\)/) // #c8b6ff, lavender
    expect(page.backgroundColor).toBe("rgb(242, 238, 251)") // Glass's page, under the washes
    const { style } = await ThemeHarness.inner(`<ui-segment appearance="basic">Plain</ui-segment>`, ".ui.segment")
    expect(style.backgroundImage).toBe("none")
    expect(style.backdropFilter).toBe("none")
  })

  it("its sheet is Glass's with the wallpaper added:  the import inlined, one sheet", async () => {
    await UI.load()
    const [glass, fruity] = await Promise.all([UI.themes.load("glass"), UI.themes.load("fruity")])
    expect(fruity).not.toContain("@import")
    expect(fruity).toContain("--glass-surface-strong")
    expect(fruity.length).toBeGreaterThan(glass.length)
  })
})

describe("merlot.css", () => {
  it("a maroon primary in light, a warm gold in dark;  8px buttons, the system font;  a deep wine page", async () => {
    await Own.use("merlot")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(140, 29, 64)", borderTopLeftRadius: "8px" }) // #8c1d40
    expect(style.fontFamily).toMatch(/^system-ui/)
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(230, 194, 122)")) // #e6c27a
    expect(Own.color("--ui-background")).toBe("rgb(26, 12, 19)") // #1a0c13
  })

  it("the page a VISIBLE step from the panels on it, light and dark (Studio's had none to speak of)", async () => {
    await Own.use("merlot")
    const step = () => A11y.contrast(Own.color("--ui-surface"), [Own.color("--ui-background")])
    expect(step()).toBeGreaterThanOrEqual(PANEL_STEP)
    Own.dark()
    await vi.waitFor(() => expect(Own.color("--ui-background")).toBe("rgb(26, 12, 19)"))
    expect(step()).toBeGreaterThanOrEqual(PANEL_STEP)
  })
})

describe("paper.css", () => {
  it("an oxblood primary in light, a rose in dark;  4px buttons, the serif (Iowan Old Style first);  a lamplit page", async () => {
    await Own.use("paper")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(139, 44, 44)", borderTopLeftRadius: "4px" }) // #8b2c2c
    const body = getComputedStyle(document.documentElement).getPropertyValue("--ui-font-family")
    expect(body).toMatch(/^\s*"Iowan Old Style", Palatino/)
    // the controls keep the system's sans:  a serif button reads as a word in a sentence
    expect(style.fontFamily).toMatch(/^system-ui/)
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(235, 164, 147)")) // #eba493
    expect(Own.color("--ui-background")).toBe("rgb(29, 22, 16)") // #1d1610
  })

  it("its sheets a step off the cream page, light and dark", async () => {
    await Own.use("paper")
    const step = () => A11y.contrast(Own.color("--ui-surface"), [Own.color("--ui-background")])
    expect(step()).toBeGreaterThanOrEqual(1.08)
    Own.dark()
    await vi.waitFor(() => expect(Own.color("--ui-background")).toBe("rgb(29, 22, 16)"))
    expect(step()).toBeGreaterThanOrEqual(1.08)
  })
})

describe("midnight.css", () => {
  it("a deep teal primary in light, a glowing teal in dark;  10px buttons, the system font;  a blue-black page", async () => {
    await Own.use("midnight")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(11, 104, 112)", borderTopLeftRadius: "10px" }) // #0b6870
    expect(style.fontFamily).toMatch(/^system-ui/)
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(67, 217, 207)")) // #43d9cf
    expect(Own.color("--ui-background")).toBe("rgb(10, 15, 21)") // #0a0f15
  })

  it("dark:  panels a clear step off the page, their edges lit", async () => {
    await Own.use("midnight")
    Own.dark()
    await vi.waitFor(() => expect(Own.color("--ui-background")).toBe("rgb(10, 15, 21)"))
    expect(A11y.contrast(Own.color("--ui-surface"), [Own.color("--ui-background")])).toBeGreaterThanOrEqual(PANEL_STEP)
    expect(getComputedStyle(document.documentElement).getPropertyValue("--ui-shadow-raised")).toMatch(/^0 0 0 1px/)
  })
})

describe("crisp.css", () => {
  it("a strong blue primary in light, a light blue in dark;  4px buttons, the system font;  pure black and white", async () => {
    await Own.use("crisp")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(0, 64, 193)", borderTopLeftRadius: "4px" }) // #0040c1
    expect(style.fontFamily).toMatch(/^system-ui/)
    expect(Own.color("--ui-background")).toBe("rgb(255, 255, 255)")
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(140, 182, 255)")) // #8cb6ff
    expect(Own.color("--ui-background")).toBe("rgb(0, 0, 0)")
  })

  it("2px borders, a 3px focus ring, and no shadows:  every edge is a line", async () => {
    await Own.use("crisp")
    const root = getComputedStyle(document.documentElement)
    expect(root.getPropertyValue("--ui-border-width").trim()).toBe("2px")
    expect(root.getPropertyValue("--ui-focus-width").trim()).toBe("3px")
    for (const shadow of ["subtle", "raised", "floating", "floating-hover", "overlay"])
      expect(root.getPropertyValue(`--ui-shadow-${shadow}`).trim(), shadow).toBe("none")
  })
})

describe("pop.css", () => {
  it("a hot pink primary in light, a lighter pink in dark;  12px buttons, the rounded font;  a deep plum page", async () => {
    await Own.use("pop")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(200, 18, 93)", borderTopLeftRadius: "12px" }) // #c8125d
    expect(style.fontFamily).toMatch(/^ui-rounded/)
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(255, 122, 184)")) // #ff7ab8
    expect(Own.color("--ui-background")).toBe("rgb(29, 15, 39)") // #1d0f27
  })

  it("the sticker:  a filled button wears an ink outline and a hard offset shadow, no blur", async () => {
    await Own.use("pop")
    const box = await Own.primaryButton()
    expect(getComputedStyle(box).boxShadow).toMatch(/\) 0px 0px 0px 2px, .+\) 3px 3px 0px 2px$/)
  })
})

describe("matrix.css", () => {
  it("a deep mint primary in light, mint in dark;  8px buttons, the system font;  a near-black green page", async () => {
    await Own.use("matrix")
    const box = await Own.primaryButton()
    const style = getComputedStyle(box)
    expect(style).toMatchObject({ backgroundColor: "rgb(11, 117, 82)", borderTopLeftRadius: "8px" }) // #0b7552
    expect(style.fontFamily).toMatch(/^system-ui/)
    Own.dark(box)
    await vi.waitFor(() => expect(getComputedStyle(box).backgroundColor).toBe("rgb(124, 229, 189)")) // #7ce5bd
    expect(Own.color("--ui-background")).toBe("rgb(7, 16, 19)") // #071013
  })

  it("the console's labels:  a table's header row in the monospace, uppercase", async () => {
    await Own.use("matrix")
    const { style } = await ThemeHarness.page(
      `<table class="ui table"><thead><tr><th>Port</th></tr></thead><tbody><tr><td>48</td></tr></tbody></table>`,
      "th"
    )
    expect(style.textTransform).toBe("uppercase")
    expect(style.fontFamily).toMatch(/^ui-monospace/)
  })
})

/**
 * The least luminance ratio between a theme's page and its panels, for the step to show:  1.2:1.
 * - Studio's was 1.13:1 in light (`#e9e5ff` / `#f6f4ff`);  Merlot's is 1.32:1 light, 1.30:1 dark.
 */
const PANEL_STEP = 1.2
