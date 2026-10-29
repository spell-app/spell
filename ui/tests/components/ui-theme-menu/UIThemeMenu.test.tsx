import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { OLD_COLOR_SCHEME_KEYS } from "spell/util/persist"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UI } from "spell/ui/runtime"
import { ThemePreference } from "spell/ui/components/ui-theme-menu/ThemePreference"
import {
  THEME_KEYS,
  type SchemeChoice,
  type ShownScheme,
  type ThemeMenuChange
} from "spell/ui/components/ui-theme-menu/UIThemeMenu.types"

import "spell/ui/components/ui-theme-menu"
import "spell/ui/components/ui-button"

////////////////
// ## Fixtures
////////////////

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-theme-menu/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** The OS's scheme the tests pretend:  `osScheme()` is spied on, so the real OS never matters. */
let os: ShownScheme = "light"

////////////////
// ## Helpers
////////////////

/** Render `html` and wait for it. */
async function render(html: string) {
  const host = await ElementFixture.render<HTMLElement>(html)
  await ElementFixture.settle()
  return host
}

/** `host`'s inner part `name` (the first one). */
function part<T extends HTMLElement = HTMLElement>(host: Element, name: string) {
  return host.shadowRoot!.querySelector<T>(`[part~=${name}]`)!
}

/** The scheme `host`'s sun / moon button shows:  its `light` / `dark` class. */
function shownOf(host: Element) {
  const classes = part(host, "scheme").classList
  return classes.contains("dark") ? "dark" : classes.contains("light") ? "light" : undefined
}

/** `host`'s overlay choice for scheme `scheme` (Light | Dark | Auto). */
function choice(host: Element, scheme: SchemeChoice) {
  return host.shadowRoot!.querySelector<HTMLButtonElement>(`[role=radio][value="${scheme}"]`)!
}

/** `host`'s scheme choices:  `[value, name, aria-checked, tabindex]`. */
function choices(host: Element): [string, string, string, number][] {
  return [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>("[role=radio]")].map((each) => [
    each.value,
    each.querySelector(".name")!.textContent!,
    each.getAttribute("aria-checked")!,
    each.tabIndex
  ])
}

/** `host`'s overlay theme rows:  `[value, name]`. */
function rows(host: Element): [string, string][] {
  return [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]")].map((row) => [
    row.value,
    row.querySelector(".name")!.textContent!
  ])
}

/** `host`'s overlay row for theme `value`. */
function row(host: Element, value: string) {
  return host.shadowRoot!.querySelector<HTMLButtonElement>(`[role=menuitemradio][value="${value}"]`)!
}

/** The dropdown's option rows (`show="theme"`):  `[value, text]`. */
function dropdownRows(host: Element): [string, string][] {
  return [...part(host, "theme").querySelectorAll("ui-item:not([kind])")].map((item) => [
    item.getAttribute("value")!,
    item.textContent!.trim()
  ])
}

/** The dropdown's text (its `trigger` slot). */
function labelOf(host: Element) {
  return part(host, "theme").querySelector("[slot=trigger]")!.textContent
}

/** Pick `value` in `host`'s dropdown, as the dropdown reports a viewer's choice. */
function pick(host: Element, value: string) {
  part(host, "theme").dispatchEvent(new CustomEvent("ui-changed", { detail: { value }, bubbles: true, composed: true }))
}

/** `<html>`'s scheme:  its `ui-light` / `ui-dark` class and inline `color-scheme`. */
function htmlScheme() {
  const root = document.documentElement
  return {
    light: root.classList.contains("ui-light"),
    dark: root.classList.contains("ui-dark"),
    colorScheme: root.style.colorScheme
  }
}

/** Back to no stored theme (so the default theme, in memory), nothing applied, the system scheme. */
async function clean() {
  for (const key of [THEME_KEYS.theme, THEME_KEYS.scheme, ...OLD_COLOR_SCHEME_KEYS]) {
    localStorage.removeItem(key)
  }
  ThemePreference.reset()
  ThemePreference.applyScheme("system")
  await (await UI.load()).themes.apply(undefined)
}

beforeEach(async () => {
  os = "light"
  vi.spyOn(ThemePreference, "osScheme").mockImplementation(() => os)
  await UI.load()
  // Escape through a keyboard binding rather than `CloseWatcher`, so the test can press it
  UI.overlays.useCloseWatcher = false
  await clean()
})

afterEach(async () => {
  await clean()
  vi.restoreAllMocks()
})

////////////////
// ## Markup and overlay
////////////////

describe("<ui-theme-menu> markup", () => {
  it("renders ONE palette button, its overlay holding Light | Dark | Auto (Auto chosen) and the theme list", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    expect(part(host, "controls").className).toBe("ui themes")
    expect(part(host, "palette").localName).toBe("button")
    expect(part(host, "palette").getAttribute("aria-label")).toBe("Theme and light / dark:  Spell, Auto")
    const overlay = part(host, "overlay")
    expect(overlay.localName).toBe("ui-popup")
    expect(overlay.getAttribute("open-on")).toBe("click")
    expect(part(host, "scheme")).toBeNull()
    expect(part(host, "schemes").getAttribute("role")).toBe("radiogroup")
    expect(part(host, "schemes").getAttribute("aria-label")).toBe("Light or dark")
    expect(choices(host)).toEqual([
      ["light", "Light", "false", -1],
      ["dark", "Dark", "false", -1],
      ["system", "Auto", "true", 0]
    ])
    expect([...part(host, "schemes").querySelectorAll("ui-icon")].map((icon) => icon.getAttribute("name"))).toEqual([
      "sun outline",
      "moon",
      "adjust"
    ])
    expect([...host.shadowRoot!.querySelectorAll("[part~=tip]")].map((tip) => tip.textContent)).toEqual([
      "Theme and light / dark:  Spell, Auto"
    ])
    expect(host.matches(":state(following)")).toBe(true)
    expect(host.matches(":state(dark)")).toBe(false)
    expect(part(host, "theme")).toBeNull()
    await expectAccessible(host)
  })

  it('show="scheme":  the sun / moon button alone, showing the page\'s scheme', async () => {
    const host = await render(`<ui-theme-menu show="scheme"></ui-theme-menu>`)
    const scheme = part(host, "scheme")
    expect(scheme.className).toBe("scheme button light")
    expect(scheme.getAttribute("aria-label")).toBe("Switch to dark")
    expect([...scheme.querySelectorAll("ui-icon")].map((icon) => icon.getAttribute("name"))).toEqual([
      "sun outline",
      "moon"
    ])
    expect([...host.shadowRoot!.querySelectorAll("[part~=tip]")].map((tip) => tip.textContent)).toEqual([
      "Switch to dark"
    ])
    await expectAccessible(host)
  })

  it("follows the OS's scheme while nothing is chosen:  a moon on a dark OS", async () => {
    os = "dark"
    const host = await render(`<ui-theme-menu show="scheme"></ui-theme-menu>`)
    expect(shownOf(host)).toBe("dark")
    expect(part(host, "scheme").getAttribute("aria-label")).toBe("Switch to light")
    expect(host.matches(":state(dark)")).toBe(true)
  })

  it("switches its icon when the OS switches scheme, while following it", async () => {
    const host = await render(`<ui-theme-menu show="scheme"></ui-theme-menu>`)
    os = "dark"
    ThemePreference.osChanged()
    await ElementFixture.settle()
    expect(shownOf(host)).toBe("dark")
    expect(ThemePreference.shownScheme()).toBe("dark")
  })

  it.each([
    ["both", ["palette", "overlay", "schemes"], ["scheme", "theme"]],
    ["theme", ["theme"], ["palette", "overlay", "schemes", "scheme"]],
    ["scheme", ["scheme"], ["palette", "overlay", "schemes", "theme"]]
  ])("show=%s", async (show, present, absent) => {
    const host = await render(`<ui-theme-menu show="${show}"></ui-theme-menu>`)
    for (const name of present) expect(part(host, name), name).not.toBeNull()
    for (const name of absent) expect(part(host, name), name).toBeNull()
  })

  it("passes size and inverted on", async () => {
    const host = await render(`<ui-theme-menu size="small" inverted></ui-theme-menu>`)
    expect(part(host, "controls").className).toBe("ui small inverted themes")
    const dropdown = await render(`<ui-theme-menu size="small" inverted show="theme"></ui-theme-menu>`)
    expect(part(dropdown, "theme").getAttribute("size")).toBe("small")
    expect(part(dropdown, "theme").hasAttribute("inverted")).toBe(true)
  })

  it("renders every element example", async () => {
    for (const [path, html] of Object.entries(EXAMPLES)) {
      const wrapper = await ElementFixture.render<HTMLElement>(`<div>${html}</div>`)
      for (const host of wrapper.querySelectorAll("ui-theme-menu")) {
        expect(host.shadowRoot!.querySelector("[part~=controls]"), path).not.toBeNull()
      }
    }
  })
})

describe("<ui-theme-menu> overlay", () => {
  it("lists Spell's own themes (Spell checked), each with its description:  no Plain, no Classic, no Fomantic", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    expect(rows(host).map(([value]) => value)).toEqual([...UI.themes.own])
    expect(rows(host)).toContainEqual(["merlot", "Merlot"])
    expect(rows(host).map(([value]) => value)).not.toContain("classic")
    expect(rows(host).map(([value]) => value)).not.toContain("default")
    expect(row(host, "spell").getAttribute("aria-checked")).toBe("true")
    expect(row(host, "spell").querySelector(".description")!.textContent).toBe("The Spell brand")
    expect(row(host, "merlot").querySelector(".description")!.textContent).toBe("A wine-dark studio")
    expect(host.shadowRoot!.querySelector(".menu > .header")).toBeNull()
    // one tab stop:  the chosen theme
    expect(rows(host).filter(([value]) => row(host, value).tabIndex === 0)).toEqual([["spell", "Spell"]])
  })

  it("opens on the palette button, focuses the chosen theme;  arrows move;  Escape closes back to the button", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    const palette = part(host, "palette")
    const focused = () => host.shadowRoot!.activeElement
    palette.focus()
    await userEvent.keyboard("{Enter}")
    await vi.waitFor(() => expect(part(host, "overlay").matches(":popover-open")).toBe(true))
    await vi.waitFor(() => expect(focused()).toBe(row(host, "spell")))
    await ElementFixture.settle()
    expect(host.matches(":state(open)")).toBe(true)
    expect(host.shadowRoot!.querySelectorAll("[part~=tip]")[0]!.classList.contains("muted")).toBe(true)

    await userEvent.keyboard("{ArrowDown}")
    expect(focused()).toBe(row(host, UI.themes.own[1]!))
    await userEvent.keyboard("{ArrowUp}{ArrowUp}")
    expect(focused()).toBe(row(host, rows(host).at(-1)![0]))
    await userEvent.keyboard("{Home}")
    expect(focused()).toBe(row(host, "spell"))
    await userEvent.keyboard("{End}")
    await ElementFixture.settle()
    expect(row(host, rows(host).at(-1)![0]).tabIndex).toBe(0)

    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(part(host, "overlay").matches(":popover-open")).toBe(false))
    await ElementFixture.settle()
    expect(host.matches(":state(open)")).toBe(false)
    expect(focused()).toBe(palette)
  })

  it("a theme row picks it:  classic + the theme, on the page and in shadow roots;  one ui-changed;  stays open", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    const probe = await ElementFixture.render<HTMLElement>(`<ui-button>Probe</ui-button>`)
    const changes: ThemeMenuChange[] = []
    host.addEventListener("ui-changed", (event) => changes.push((event as CustomEvent<ThemeMenuChange>).detail))
    row(host, "merlot").click()
    await vi.waitFor(() => expect(UI.styles.has(UI.themes.slots.theme)).toBe(true))
    expect(UI.themes.current).toBe("merlot")
    const base = UI.styles.sheet(UI.themes.slots.base)!
    const theme = UI.styles.sheet(UI.themes.slots.theme)!
    expect(document.adoptedStyleSheets).toEqual(expect.arrayContaining([base, theme]))
    expect(probe.shadowRoot!.adoptedStyleSheets).toEqual(expect.arrayContaining([base, theme]))
    expect(changes).toMatchObject([{ theme: "merlot", scheme: "system", shown: "light" }])
    await ElementFixture.settle()
    expect(row(host, "merlot").getAttribute("aria-checked")).toBe("true")
    expect(row(host, "spell").getAttribute("aria-checked")).toBe("false")
    expect(part(host, "palette").getAttribute("aria-label")).toBe("Theme and light / dark:  Merlot, Auto")
    // picking it again changes nothing
    row(host, "merlot").click()
    expect(changes).toHaveLength(1)
  })
})

////////////////
// ## Scheme
////////////////

describe("<ui-theme-menu> scheme", () => {
  it('show="scheme":  a click flips the shown scheme and stores it:  ui-dark / ui-light + color-scheme on <html>', async () => {
    const host = await render(`<ui-theme-menu show="scheme"></ui-theme-menu>`)
    const changes: ThemeMenuChange[] = []
    host.addEventListener("ui-changed", (event) => changes.push((event as CustomEvent<ThemeMenuChange>).detail))
    part(host, "scheme").click()
    await ElementFixture.settle()
    expect(htmlScheme()).toEqual({ light: false, dark: true, colorScheme: "dark" })
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("dark")
    expect(shownOf(host)).toBe("dark")
    expect(part(host, "scheme").getAttribute("aria-label")).toBe("Switch to light")
    expect(host.matches(":state(dark)")).toBe(true)
    expect(host.matches(":state(following)")).toBe(false)
    part(host, "scheme").click()
    await ElementFixture.settle()
    expect(htmlScheme()).toEqual({ light: true, dark: false, colorScheme: "light" })
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("light")
    expect(changes.map(({ scheme, shown }) => [scheme, shown])).toEqual([
      ["dark", "dark"],
      ["light", "light"]
    ])
  })

  it("Dark and Light store the scheme;  Auto drops it, and the OS's shows;  one ui-changed each", async () => {
    os = "dark"
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    const changes: ThemeMenuChange[] = []
    host.addEventListener("ui-changed", (event) => changes.push((event as CustomEvent<ThemeMenuChange>).detail))
    choice(host, "light").click()
    await ElementFixture.settle()
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("light")
    expect(htmlScheme()).toEqual({ light: true, dark: false, colorScheme: "light" })
    expect(choices(host).map(([value, , checked]) => [value, checked])).toEqual([
      ["light", "true"],
      ["dark", "false"],
      ["system", "false"]
    ])
    expect(part(host, "palette").getAttribute("aria-label")).toBe("Theme and light / dark:  Spell, Light")
    choice(host, "dark").click()
    await ElementFixture.settle()
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("dark")
    expect(htmlScheme().dark).toBe(true)
    expect(host.matches(":state(dark)")).toBe(true)
    choice(host, "system").click()
    await ElementFixture.settle()
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBeNull()
    expect(htmlScheme()).toEqual({ light: false, dark: false, colorScheme: "" })
    expect(host.matches(":state(following)")).toBe(true)
    expect(host.matches(":state(dark)")).toBe(true) // the OS's
    // the chosen one again:  nothing
    choice(host, "system").click()
    expect(changes.map(({ scheme, shown }) => [scheme, shown])).toEqual([
      ["light", "light"],
      ["dark", "dark"],
      ["system", "dark"]
    ])
  })

  it("Light | Dark | Auto is a radio group:  one tab stop, the chosen one;  arrows move AND choose, wrapping", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    const focused = () => host.shadowRoot!.activeElement
    part(host, "palette").click()
    await vi.waitFor(() => expect(part(host, "overlay").matches(":popover-open")).toBe(true))
    // Shift+Tab from the theme list reaches the scheme control's one tab stop:  the chosen scheme
    await vi.waitFor(() => expect(focused()).toBe(row(host, "spell")))
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}")
    expect(focused()).toBe(choice(host, "system"))
    await userEvent.keyboard("{ArrowRight}")
    await ElementFixture.settle()
    expect(focused()).toBe(choice(host, "light"))
    expect(ThemePreference.chosen.scheme).toBe("light")
    expect(choices(host).map(([value, , , tabIndex]) => [value, tabIndex])).toEqual([
      ["light", 0],
      ["dark", -1],
      ["system", -1]
    ])
    await userEvent.keyboard("{ArrowDown}")
    await ElementFixture.settle()
    expect(focused()).toBe(choice(host, "dark"))
    expect(htmlScheme().dark).toBe(true)
    await userEvent.keyboard("{ArrowLeft}{ArrowUp}")
    await ElementFixture.settle()
    expect(focused()).toBe(choice(host, "system"))
    expect(ThemePreference.chosen.scheme).toBe("system")
  })

  it("every menu on the page follows a change made in another", async () => {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div><ui-theme-menu></ui-theme-menu><ui-theme-menu show="theme"></ui-theme-menu></div>`
    )
    const [first, second] = wrapper.querySelectorAll("ui-theme-menu")
    choice(first!, "dark").click()
    row(first!, "merlot").click()
    await vi.waitFor(() => expect(UI.themes.current).toBe("merlot"))
    await ElementFixture.settle()
    expect(part(second!, "theme").getAttribute("value")).toBe("merlot")
    expect(second!.matches(":state(dark)")).toBe(true)
  })
})

////////////////
// ## Dropdown
////////////////

describe("<ui-theme-menu> dropdown (show=theme)", () => {
  it("lists Spell's own themes, its text the chosen one's", async () => {
    const host = await render(`<ui-theme-menu show="theme"></ui-theme-menu>`)
    expect(dropdownRows(host).map(([value]) => value)).toEqual([...UI.themes.own, "theme bench"])
    expect(dropdownRows(host)).toContainEqual(["glass", "Glass"])
    expect(labelOf(host)).toBe("Spell theme")
  })

  it("a pick applies it and fires one ui-changed (the dropdown's own is stopped)", async () => {
    const host = await render(`<ui-theme-menu show="theme"></ui-theme-menu>`)
    const inner: Event[] = []
    const changes: ThemeMenuChange[] = []
    document.body.addEventListener("ui-changed", (event) => {
      if (event.target === host) changes.push((event as CustomEvent<ThemeMenuChange>).detail)
      else inner.push(event)
    })
    pick(host, "merlot")
    await vi.waitFor(() => expect(UI.themes.current).toBe("merlot"))
    expect(changes).toMatchObject([{ theme: "merlot" }])
    expect(inner).toEqual([])
    await ElementFixture.settle()
    expect(labelOf(host)).toBe("Merlot theme")
  })
})

describe("<ui-theme-menu> Theme bench", () => {
  it("the overlay's row opens the theme bench in a new window, in the theme chosen, under this page's site", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    const bench = part<HTMLAnchorElement>(host, "bench")
    expect(bench.target).toBe("_blank")
    expect(bench.getAttribute("title")).toBe("Open the theme bench in a new window, in this theme")
    expect(bench.href).toBe(`${location.origin}/components/ui/theme-bench.html?theme=spell&pages=app`)
    row(host, "merlot").click()
    await ElementFixture.settle()
    expect(part<HTMLAnchorElement>(host, "bench").href).toContain("?theme=merlot")
  })

  it("`bench` names the site it's on;  `none`:  no row", async () => {
    const host = await render(`<ui-theme-menu bench="http://127.0.0.1:4747/"></ui-theme-menu>`)
    expect(part<HTMLAnchorElement>(host, "bench").href).toBe(
      "http://127.0.0.1:4747/components/ui/theme-bench.html?theme=spell&pages=app"
    )
    const none = await render(`<ui-theme-menu bench="none"></ui-theme-menu>`)
    expect(none.shadowRoot!.querySelector("[part~=bench]")).toBeNull()
  })

  it("it opens with only the bench's page for this place:  `bench-page`, else from the page's address", async () => {
    const host = await render(`<ui-theme-menu bench-page="epic"></ui-theme-menu>`)
    expect(new URL(part<HTMLAnchorElement>(host, "bench").href).searchParams.get("pages")).toBe("epic")
    const before = location.href
    try {
      for (const [path, page] of [
        ["/epics/debut/debut.plan.html", "epic"],
        ["/components/ui/ui-button.html", "ui"],
        ["/edit/@spell/notebooks/Avatar", "notebook"],
        ["/edit/@spell/examples/Solitaire", "app"]
      ]) {
        history.replaceState(history.state, "", path)
        const menu = await render(`<ui-theme-menu></ui-theme-menu>`)
        expect(new URL(part<HTMLAnchorElement>(menu, "bench").href).searchParams.get("pages")).toBe(page)
      }
    } finally {
      history.replaceState(history.state, "", before)
    }
  })

  it("the dropdown's Theme bench opens it, and chooses no theme", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null)
    const host = await render(`<ui-theme-menu show="theme"></ui-theme-menu>`)
    pick(host, "theme bench")
    expect(open).toHaveBeenCalledWith(
      `${location.origin}/components/ui/theme-bench.html?theme=spell&pages=app`,
      "_blank",
      "noopener"
    )
    expect(ThemePreference.chosen.theme).toBe("spell")
  })
})

////////////////
// ## Persistence
////////////////

describe("<ui-theme-menu> persistence", () => {
  it("stores the theme and scheme, and restore() re-applies them on the next page", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    choice(host, "dark").click()
    row(host, "merlot").click()
    await vi.waitFor(() => expect(UI.themes.current).toBe("merlot"))
    expect(localStorage.getItem(THEME_KEYS.theme)).toBe("merlot")
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("dark")

    // "the next page":  nothing applied, nothing in memory
    ThemePreference.reset()
    ThemePreference.applyScheme("system")
    await UI.themes.apply(undefined)
    await ThemePreference.restore()
    expect(htmlScheme().dark).toBe(true)
    expect(UI.themes.current).toBe("merlot")
    const next = await render(`<ui-theme-menu></ui-theme-menu>`)
    expect(row(next, "merlot").getAttribute("aria-checked")).toBe("true")
    expect(choice(next, "dark").getAttribute("aria-checked")).toBe("true")
  })

  it("system and Spell (the default) are stored as absent keys", async () => {
    const host = await render(`<ui-theme-menu></ui-theme-menu>`)
    choice(host, "dark").click()
    await ElementFixture.settle()
    choice(host, "system").click()
    row(host, "merlot").click()
    await vi.waitFor(() => expect(UI.themes.current).toBe("merlot"))
    row(host, "spell").click()
    await vi.waitFor(() => expect(UI.themes.current).toBe("spell"))
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBeNull()
    expect(localStorage.getItem(THEME_KEYS.theme)).toBeNull()
  })

  it("works for the page when storage throws", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    try {
      const host = await render(`<ui-theme-menu></ui-theme-menu>`)
      choice(host, "dark").click()
      await ElementFixture.settle()
      expect(htmlScheme().dark).toBe(true)
      expect(ThemePreference.chosen.scheme).toBe("dark")
    } finally {
      spy.mockRestore()
    }
  })
})
