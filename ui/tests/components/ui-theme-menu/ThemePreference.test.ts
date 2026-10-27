import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { COLOR_SCHEME_KEY, OLD_COLOR_SCHEME_KEYS } from "spell/util/persist"
import { UI } from "spell-ui/runtime"

import { ThemePreference } from "spell-ui/components/ui-theme-menu/ThemePreference"
import { DEFAULT_THEME, SCHEME_SWITCHING, THEME_KEYS } from "spell-ui/components/ui-theme-menu/UIThemeMenu.types"

beforeEach(async () => {
  // the real OS's scheme never matters
  vi.spyOn(ThemePreference, "osScheme").mockReturnValue("light")
  await UI.load()
  await clean()
})

afterEach(async () => {
  await clean()
  vi.restoreAllMocks()
})

describe("THEME_KEYS.scheme", () => {
  test("ONE scheme key for every Spell site:  the kit's `ColorScheme`'s", () => {
    expect(THEME_KEYS.scheme).toBe(COLOR_SCHEME_KEY)
  })
})

describe("ThemePreference.reset()", () => {
  test.each([
    ["spell-site:theme", "dark"],
    ["spell-ui-site:scheme", "light"]
  ])("moves an old key's scheme (%s) to the one key, once", (key, scheme) => {
    localStorage.setItem(key, scheme)
    ThemePreference.reset()
    expect(ThemePreference.chosen.scheme).toBe(scheme)
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBe(scheme)
    for (const old of OLD_COLOR_SCHEME_KEYS) expect(localStorage.getItem(old)).toBeNull()
  })

  test("an old key never overrides the one key", () => {
    localStorage.setItem(THEME_KEYS.scheme, "light")
    localStorage.setItem("spell-site:theme", "dark")
    ThemePreference.reset()
    expect(ThemePreference.chosen.scheme).toBe("light")
  })
})

describe("ThemePreference.restore()", () => {
  test("with nothing stored, restore() applies the Spell theme", async () => {
    expect(DEFAULT_THEME).toBe("spell")
    await ThemePreference.restore()
    expect(UI.themes.current).toBe("spell")
    expect(UI.styles.has(UI.themes.slots.theme)).toBe(true)
  })

  test("forgets a stored theme that no longer exists, for the default", async () => {
    localStorage.setItem(THEME_KEYS.theme, "no-such-theme")
    ThemePreference.reset()
    await ThemePreference.restore()
    expect(UI.themes.current).toBe(DEFAULT_THEME)
    expect(localStorage.getItem(THEME_KEYS.theme)).toBeNull()
    expect(ThemePreference.chosen.theme).toBe(DEFAULT_THEME)
  })

  test.each([
    ["classic", "Classic, no longer in the menu"],
    ["default", "Plain (stored as `default`), no longer in the menu"],
    ["github", "a Fomantic theme, archived"]
  ])("opens a stored theme no longer in the set (%s:  %s) as the default", async (stored) => {
    localStorage.setItem(THEME_KEYS.theme, stored)
    ThemePreference.reset()
    await ThemePreference.restore()
    expect(UI.themes.current).toBe(DEFAULT_THEME)
    expect(localStorage.getItem(THEME_KEYS.theme)).toBeNull()
  })

  test.each([
    ["studio", "merlot"],
    ["spell-brand", "spell"]
  ])("opens a theme stored under its old name (%s) as its new one (%s)", async (stored, now) => {
    localStorage.setItem(THEME_KEYS.theme, stored)
    ThemePreference.reset()
    await ThemePreference.restore()
    expect(UI.themes.current).toBe(now)
    expect(ThemePreference.chosen.theme).toBe(now)
    expect(localStorage.getItem(THEME_KEYS.theme)).toBe(now === DEFAULT_THEME ? null : now)
  })
})

describe("ThemePreference.site()", () => {
  afterEach(() => ThemePreference.site({ defaultTheme: DEFAULT_THEME, themeKey: THEME_KEYS.theme }))

  test("another place's own default theme and key:  the docs' theme key is left alone", async () => {
    localStorage.setItem(THEME_KEYS.theme, "merlot")
    ThemePreference.site({ defaultTheme: "fruity", themeKey: "test-site:theme" })
    ThemePreference.reset()
    await ThemePreference.restore()
    expect(UI.themes.current).toBe("fruity")

    await ThemePreference.setTheme("glass")
    expect(localStorage.getItem("test-site:theme")).toBe("glass")
    expect(localStorage.getItem(THEME_KEYS.theme)).toBe("merlot")

    // its default is stored as no key at all, as the docs' is
    await ThemePreference.setTheme("fruity")
    expect(localStorage.getItem("test-site:theme")).toBeNull()
    localStorage.removeItem("test-site:theme")
  })

  test("a pair read FIRST (a menu Spell UI defined before the place said its own) is read again, and subscribers told", () => {
    ThemePreference.reset()
    expect(ThemePreference.chosen.theme).toBe(DEFAULT_THEME)
    const heard = vi.fn()
    const unsubscribe = ThemePreference.subscribe(heard)
    localStorage.setItem("test-site:theme", "merlot")
    ThemePreference.site({ defaultTheme: "fruity", themeKey: "test-site:theme" })
    expect(ThemePreference.chosen.theme).toBe("merlot")
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ theme: "merlot" }))
    unsubscribe()
    localStorage.removeItem("test-site:theme")
  })
})

describe("ThemePreference.applyScheme()", () => {
  test("a scheme switch turns transitions off for a frame (`SCHEME_SWITCHING`)", async () => {
    const root = document.documentElement
    ThemePreference.applyScheme("dark")
    expect(root.classList.contains(SCHEME_SWITCHING)).toBe(true)
    await vi.waitFor(() => expect(root.classList.contains(SCHEME_SWITCHING)).toBe(false))
  })
})

describe("ThemePreference.HEAD_SCRIPT", () => {
  test("applies the stored scheme (or an old key's) synchronously, and never throws", () => {
    localStorage.setItem(THEME_KEYS.scheme, "dark")
    runHeadScript()
    expect(htmlScheme()).toEqual({ light: false, dark: true, colorScheme: "dark" })
    ThemePreference.applyScheme("system")
    localStorage.removeItem(THEME_KEYS.scheme)
    localStorage.setItem("spell-ui-site:scheme", "light")
    runHeadScript()
    expect(htmlScheme()).toEqual({ light: true, dark: false, colorScheme: "light" })
    ThemePreference.applyScheme("system")
    localStorage.setItem(THEME_KEYS.scheme, "<junk>")
    runHeadScript()
    expect(document.documentElement.className).not.toMatch(/ui-(light|dark)/)
  })
})

/** Back to no stored theme (so the default theme, in memory), nothing applied, the system scheme. */
async function clean() {
  for (const key of [THEME_KEYS.theme, THEME_KEYS.scheme, ...OLD_COLOR_SCHEME_KEYS]) {
    localStorage.removeItem(key)
  }
  ThemePreference.reset()
  ThemePreference.applyScheme("system")
  await UI.themes.apply(undefined)
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

/** Run `ThemePreference.HEAD_SCRIPT` as a page's inline `<head>` script:  an inline classic script runs on insert. */
function runHeadScript() {
  const script = document.createElement("script")
  script.textContent = ThemePreference.HEAD_SCRIPT
  document.head.append(script)
  script.remove()
}

describe("ThemePreference.wear()", () => {
  afterEach(() => ThemePreference.wear(undefined))

  test("the page wears one theme while its menu still chooses, and remembers, another;  undefined wears the chosen again", async () => {
    await ThemePreference.wear("glass")
    expect(UI.themes.current).toBe("glass")
    await ThemePreference.setTheme("merlot")
    expect(ThemePreference.chosen.theme).toBe("merlot")
    expect(localStorage.getItem(THEME_KEYS.theme)).toBe("merlot")
    expect(UI.themes.current).toBe("glass")
    await ThemePreference.wear(undefined)
    expect(UI.themes.current).toBe("merlot")
  })
})
