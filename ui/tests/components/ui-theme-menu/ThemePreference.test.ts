import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { COLOR_SCHEME_KEY, OLD_COLOR_SCHEME_KEYS, ServerPlace } from "spell/util/persist"
import { UI } from "spell/ui/runtime"

import { ThemePreference } from "spell/ui/components/ui-theme-menu/ThemePreference"
import {
  DEFAULT_THEME,
  OLD_THEME_KEYS,
  SCHEME_SWITCHING,
  THEME_KEYS,
  THEME_STORE
} from "spell/ui/components/ui-theme-menu/UIThemeMenu.types"

import "spell/ui/components/ui-root"

beforeEach(async () => {
  // the real OS's scheme never matters
  vi.spyOn(ThemePreference, "osScheme").mockReturnValue("light")
  await UI.load()
  await clean()
})

afterEach(async () => {
  await clean()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("THEME_KEYS.scheme", () => {
  test("ONE scheme key for every Spell site:  the kit's `ColorScheme`'s", () => {
    expect(THEME_KEYS.scheme).toBe(COLOR_SCHEME_KEY)
  })
})

describe("ThemePreference.reset()", () => {
  test.each([["spell-ui-site:scheme", "light"]])(
    "moves an old key's scheme (%s) to the one key, once",
    (key, scheme) => {
      localStorage.setItem(key, scheme)
      ThemePreference.reset()
      expect(ThemePreference.chosen.scheme).toBe(scheme)
      expect(localStorage.getItem(THEME_KEYS.scheme)).toBe(scheme)
      for (const old of OLD_COLOR_SCHEME_KEYS) expect(localStorage.getItem(old)).toBeNull()
    }
  )

  test("an old key never overrides the one key", () => {
    localStorage.setItem(THEME_KEYS.scheme, "light")
    localStorage.setItem("spell-ui-site:scheme", "dark")
    ThemePreference.reset()
    expect(ThemePreference.chosen.scheme).toBe("light")
  })

  test.each(OLD_THEME_KEYS)("moves a place's own old theme key (%s) to the one key, once", (key) => {
    localStorage.setItem(key, "merlot")
    ThemePreference.reset()
    expect(ThemePreference.chosen.theme).toBe("merlot")
    expect(localStorage.getItem(THEME_KEYS.theme)).toBe("merlot")
    for (const old of OLD_THEME_KEYS) expect(localStorage.getItem(old)).toBeNull()
  })
})

describe("ThemePreference.keptIn", () => {
  test("the space only on a page whose server keeps prefs (`SPELL_SERVER.prefs`);  a served page without, the browser", () => {
    // the test runs in a frame, which keeps it in the browser whatever the server says:  stand in for a top page
    vi.spyOn(window, "frameElement", "get").mockReturnValue(null)
    vi.stubGlobal("SPELL_SERVER", { token: "t" })
    ThemePreference.reset()
    expect(ThemePreference.keptIn).toBe("browser")
    vi.stubGlobal("SPELL_SERVER", { token: "t", prefs: true })
    ThemePreference.reset()
    expect(ThemePreference.keptIn).toBe("space")
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    ThemePreference.reset()
  })
})

describe("ThemePreference.restore()", () => {
  test("with nothing stored, restore() applies Glass, every place's default (Q39)", async () => {
    expect(DEFAULT_THEME).toBe("glass")
    expect(ThemePreference.keptIn).toBe("browser")
    await ThemePreference.restore()
    expect(UI.themes.current).toBe("glass")
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

describe("ThemePreference:  ONE choice, kept in the person's space", () => {
  test("restore() wears the space's theme and scheme, over the browser's copy, and keeps them as the copy", async () => {
    localStorage.setItem(THEME_KEYS.theme, "merlot")
    const space = fakeSpace({ theme: "paper", scheme: "dark" })
    await ThemePreference.restore()
    expect(UI.themes.current).toBe("paper")
    expect(ThemePreference.chosen).toEqual({ theme: "paper", scheme: "dark" })
    expect(document.documentElement.classList.contains("ui-dark")).toBe(true)
    expect(localStorage.getItem(THEME_KEYS.theme)).toBe("paper")
    expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("dark")
    expect(space.saved).toEqual([])
  })

  test("a space holding nothing yet takes this browser's pick, once (an old key's too);  nothing picked, nothing saved", async () => {
    localStorage.setItem("spell-epic:theme", "merlot")
    localStorage.setItem(THEME_KEYS.scheme, "light")
    const space = fakeSpace()
    await ThemePreference.restore()
    await vi.waitFor(() => expect(space.kept).toEqual({ theme: "merlot", scheme: "light" }))
    expect(UI.themes.current).toBe("merlot")

    await clean()
    const empty = fakeSpace()
    await ThemePreference.restore()
    expect(empty.saved).toEqual([])
  })

  test("a pick is saved in the space, theme and scheme", async () => {
    const space = fakeSpace()
    await ThemePreference.restore()
    await ThemePreference.setTheme("merlot")
    ThemePreference.setScheme("dark")
    await vi.waitFor(() => expect(space.kept).toEqual({ theme: "merlot", scheme: "dark" }))
  })

  test("another page's pick, heard over the live channel, is worn at once;  another store's is not", async () => {
    fakeSpace()
    await ThemePreference.restore()
    await ThemePreference.heard({ store: THEME_STORE, key: "theme", value: "pop" })
    expect(UI.themes.current).toBe("pop")
    await ThemePreference.heard({ store: THEME_STORE, key: "scheme", value: "dark" })
    expect(ThemePreference.chosen.scheme).toBe("dark")
    await ThemePreference.heard({ store: "spellEditor", key: "theme", value: "paper" })
    expect(UI.themes.current).toBe("pop")
  })

  test("the address still wins over the space, for this visit", async () => {
    const before = location.href
    history.replaceState(null, "", `${location.pathname}?theme=glass`)
    try {
      ThemePreference.reset()
      fakeSpace({ theme: "paper" })
      await ThemePreference.restore()
      expect(UI.themes.current).toBe("glass")
      expect(localStorage.getItem(THEME_KEYS.theme)).toBe("paper")
    } finally {
      history.replaceState(null, "", before)
    }
  })

  test("a nested <ui-root theme> draws its own scheme, and never touches the person's choice", async () => {
    const space = fakeSpace({ theme: "merlot", scheme: "light" })
    await ThemePreference.restore()
    const root = document.createElement("ui-root")
    root.setAttribute("theme", "dark")
    root.innerHTML = "<p>inside</p>"
    document.body.append(root)
    try {
      await customElements.whenDefined("ui-root")
      expect(ThemePreference.chosen).toEqual({ theme: "merlot", scheme: "light" })
      expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("light")
      expect(space.saved).toEqual([])
    } finally {
      root.remove()
    }
  })
})

/**
 * This page keeps its choice in a stand-in space, `kept` (its `/api/prefs`, answered in memory):
 * returns it, and what was saved, in order.
 * - No live channel of its own:  a test hears another page's pick through `heard()`.
 */
function fakeSpace(kept: Record<string, unknown> = {}) {
  const saved: [string, unknown][] = []
  // `ServerPlace` asks with a path and, to save, a JSON body
  const fetch = vi.fn(async (input: string, init?: { body?: string }) => {
    const url = new URL(input, location.href)
    if (url.pathname.endsWith("/load")) {
      const key = url.searchParams.get("key") ?? ""
      return Response.json(key in kept ? { value: kept[key] } : {})
    }
    const { key, value } = JSON.parse(init?.body ?? "{}") as { key: string; value: unknown }
    kept[key] = value
    saved.push([key, value])
    return Response.json({ value })
  })
  vi.spyOn(ServerPlace, "shared", "get").mockReturnValue(
    new ServerPlace({ fetch: fetch as unknown as typeof globalThis.fetch })
  )
  vi.stubGlobal("WebSocket", undefined)
  ThemePreference.keepIn("space")
  return { kept, saved }
}

describe("ThemePreference:  tints (epic `debut` P23)", () => {
  test("keeps a theme and its tint as one name, `glass:pink`, and reads it back as two", () => {
    expect(ThemePreference.pickText("glass", "pink")).toBe("glass:pink")
    expect(ThemePreference.pickText("glass")).toBe("glass")
    expect(ThemePreference.pickOf("glass:pink")).toEqual({ theme: "glass", tint: "pink" })
    expect(ThemePreference.pickOf("glass:mauve")).toEqual({ theme: "glass" })
  })

  test("a stored tinted theme comes back tinted, and a new theme keeps the tint", async () => {
    localStorage.setItem(THEME_KEYS.theme, "paper:teal")
    ThemePreference.reset()
    await ThemePreference.restore()
    expect(ThemePreference.chosen).toMatchObject({ theme: "paper", tint: "teal" })
    expect(UI.styles.has(UI.themes.slots.tint)).toBe(true)
    await ThemePreference.setTheme("merlot")
    expect(localStorage.getItem(THEME_KEYS.theme)).toBe("merlot:teal")
  })

  test("another page's tinted pick, from the space, is worn", async () => {
    fakeSpace()
    await ThemePreference.restore()
    await ThemePreference.heard({ store: THEME_STORE, key: "theme", value: "pop:blue" })
    expect(ThemePreference.chosen).toMatchObject({ theme: "pop", tint: "blue" })
    expect(UI.themes.current).toBe("pop")
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
  for (const key of [THEME_KEYS.theme, THEME_KEYS.scheme, ...OLD_COLOR_SCHEME_KEYS, ...OLD_THEME_KEYS]) {
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

describe("ThemePreference:  the address's ?theme= and ?scheme=", () => {
  /** Load this page at `search`, as a page opened at an address with it, until the test ends. */
  function at(search: string) {
    const before = location.href
    history.replaceState(null, "", `${location.pathname}${search}`)
    ThemePreference.reset()
    return () => history.replaceState(null, "", before)
  }

  test("the address wins over the stored choice, and is never stored", async () => {
    localStorage.setItem(THEME_KEYS.theme, "merlot")
    localStorage.setItem(THEME_KEYS.scheme, "light")
    const back = at("?theme=glass&scheme=dark")
    try {
      expect(ThemePreference.chosen).toEqual({ theme: "glass", scheme: "dark" })
      await ThemePreference.restore()
      expect(UI.themes.current).toBe("glass")
      expect(document.documentElement.classList.contains("ui-dark")).toBe(true)
      expect(localStorage.getItem(THEME_KEYS.theme)).toBe("merlot")
      expect(localStorage.getItem(THEME_KEYS.scheme)).toBe("light")
      // a pick from the menu is stored as ever
      await ThemePreference.setTheme("paper")
      expect(localStorage.getItem(THEME_KEYS.theme)).toBe("paper")
    } finally {
      back()
    }
  })

  test("an unknown theme or scheme is ignored, with a warning:  the stored one shows, and stays stored", async () => {
    localStorage.setItem(THEME_KEYS.theme, "merlot")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const back = at("?theme=no-such-theme&scheme=sepia")
    try {
      expect(ThemePreference.chosen.scheme).toBe("system")
      await ThemePreference.restore()
      expect(UI.themes.current).toBe("merlot")
      expect(ThemePreference.chosen.theme).toBe("merlot")
      expect(localStorage.getItem(THEME_KEYS.theme)).toBe("merlot")
      expect(warn.mock.calls.flat().join(" ")).toMatch(/sepia[\s\S]*no-such-theme|no-such-theme[\s\S]*sepia/)
    } finally {
      back()
    }
  })

  test("an old theme name in the address shows as its new one, unstored", async () => {
    const back = at("?theme=studio")
    try {
      await ThemePreference.restore()
      expect(UI.themes.current).toBe("merlot")
      expect(localStorage.getItem(THEME_KEYS.theme)).toBeNull()
    } finally {
      back()
    }
  })

  test("addressWith() writes them into an address, relative or full", () => {
    expect(ThemePreference.addressWith("https://example.com/a.html?x=1", { theme: "glass", scheme: "dark" })).toBe(
      "https://example.com/a.html?x=1&theme=glass&scheme=dark"
    )
    expect(ThemePreference.addressWith("/b.html", { theme: "pop" })).toBe(`${location.origin}/b.html?theme=pop`)
  })

  test("the head script shows the address's scheme before first paint", () => {
    const back = at("?scheme=dark")
    try {
      document.documentElement.classList.remove("ui-dark", "ui-light")
      runHeadScript()
      expect(document.documentElement.classList.contains("ui-dark")).toBe(true)
    } finally {
      back()
    }
  })
})
