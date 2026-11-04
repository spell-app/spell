import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import {
  COLOR_SCHEME_CLASSES,
  COLOR_SCHEME_KEY,
  ColorScheme,
  OLD_COLOR_SCHEME_KEYS,
  type ColorSchemeChange
} from "spell/util/persist"

beforeEach(clean)

afterEach(() => {
  clean()
  vi.restoreAllMocks()
})

////////////////
// ## Keeping it
////////////////

describe("ColorScheme.choose()", () => {
  test("keeps the scheme under the one key, as plain text a `<head>` script reads", () => {
    expect(COLOR_SCHEME_KEY).toBe("spell-site:scheme")
    ColorScheme.choose("dark")
    expect(localStorage.getItem(COLOR_SCHEME_KEY)).toBe("dark")
    expect(ColorScheme.chosen()).toBe("dark")
  })

  test("`undefined` forgets it:  the page follows the OS again", () => {
    ColorScheme.choose("light")
    ColorScheme.choose(undefined)
    expect(localStorage.getItem(COLOR_SCHEME_KEY)).toBeNull()
    expect(ColorScheme.chosen()).toBeUndefined()
    expect(htmlScheme()).toEqual({ light: false, dark: false, colorScheme: "" })
  })

  test("shows it on `<html>`:  its class and the same inline `color-scheme`", () => {
    ColorScheme.choose("dark")
    expect(htmlScheme()).toEqual({ light: false, dark: true, colorScheme: "dark" })
    ColorScheme.choose("light")
    expect(htmlScheme()).toEqual({ light: true, dark: false, colorScheme: "light" })
  })
})

describe("ColorScheme.chosen()", () => {
  test.each([["spell-ui-site:scheme", "light"]])(
    "moves an old key's scheme (%s) to the one key, once",
    (key, scheme) => {
      localStorage.setItem(key, scheme)
      expect(ColorScheme.chosen()).toBe(scheme)
      expect(localStorage.getItem(COLOR_SCHEME_KEY)).toBe(scheme)
      for (const old of OLD_COLOR_SCHEME_KEYS) expect(localStorage.getItem(old)).toBeNull()
    }
  )

  test("an old key never overrides the one key", () => {
    localStorage.setItem(COLOR_SCHEME_KEY, "light")
    localStorage.setItem("spell-ui-site:scheme", "dark")
    expect(ColorScheme.chosen()).toBe("light")
  })

  test("the theme's key (`spell-site:theme`, the site header's scheme before 2026-10-04) is left alone", () => {
    localStorage.setItem("spell-site:theme", "glass")
    expect(ColorScheme.chosen()).toBeUndefined()
    expect(localStorage.getItem("spell-site:theme")).toBe("glass")
  })

  test("anything but `light` or `dark` is nothing chosen", () => {
    localStorage.setItem(COLOR_SCHEME_KEY, "<junk>")
    expect(ColorScheme.chosen()).toBeUndefined()
  })
})

////////////////
// ## Showing it
////////////////

describe("ColorScheme:  the address's ?scheme=", () => {
  /** Run `check` with this page at `search`, as a page opened at an address with it. */
  function at(search: string, check: () => void) {
    const before = location.href
    history.replaceState(null, "", `${location.pathname}${search}`)
    ColorScheme.rereadAddress()
    try {
      check()
    } finally {
      history.replaceState(null, "", before)
      ColorScheme.rereadAddress()
    }
  }

  test("wins over the one kept, for this visit, and is never kept;  choosing drops it", () => {
    localStorage.setItem(COLOR_SCHEME_KEY, "light")
    at("?scheme=dark", () => {
      expect(ColorScheme.chosen()).toBe("dark")
      expect(localStorage.getItem(COLOR_SCHEME_KEY)).toBe("light")
      ColorScheme.choose("light")
      expect(ColorScheme.chosen()).toBe("light")
    })
  })

  test("any other value is ignored, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    at("?scheme=sepia", () => {
      expect(ColorScheme.chosen()).toBeUndefined()
      expect(String(warn.mock.calls[0]?.[0])).toContain("sepia")
    })
  })
})

describe("ColorScheme.forcedBy()", () => {
  test("reads the scheme `<html>`'s classes force:  what the site header's icon shows", () => {
    expect(ColorScheme.forcedBy(classes(COLOR_SCHEME_CLASSES.dark))).toBe("dark")
    expect(ColorScheme.forcedBy(classes("ui-typography", COLOR_SCHEME_CLASSES.light))).toBe("light")
  })

  test("is `undefined` with neither class:  the page follows the OS", () => {
    expect(ColorScheme.forcedBy(classes())).toBeUndefined()
    expect(ColorScheme.forcedBy(classes("ui-typography"))).toBeUndefined()
  })

  test("keeps Spell UI's class names, which pages switch themselves", () => {
    expect(COLOR_SCHEME_CLASSES).toEqual({ light: "ui-light", dark: "ui-dark" })
  })
})

describe("ColorScheme.shown()", () => {
  test("`<html>`'s class, else the one chosen, else the OS's", () => {
    vi.spyOn(ColorScheme, "osScheme").mockReturnValue("dark")
    expect(ColorScheme.shown()).toBe("dark")
    localStorage.setItem(COLOR_SCHEME_KEY, "light")
    expect(ColorScheme.shown()).toBe("light")
    document.documentElement.classList.add(COLOR_SCHEME_CLASSES.dark)
    expect(ColorScheme.shown()).toBe("dark")
  })
})

////////////////
// ## Following it
////////////////

describe("ColorScheme.watch()", () => {
  test("hears another tab's choice, applied here first", () => {
    const heard: ColorSchemeChange[] = []
    const stop = ColorScheme.watch((change) => {
      heard.push(change)
      expect(htmlScheme().dark).toBe(true)
    })
    localStorage.setItem(COLOR_SCHEME_KEY, "dark")
    window.dispatchEvent(new StorageEvent("storage", { key: COLOR_SCHEME_KEY }))
    expect(heard).toEqual(["chosen"])

    // another key:  nothing
    window.dispatchEvent(new StorageEvent("storage", { key: "spell-site:edit" }))
    expect(heard).toEqual(["chosen"])

    stop()
    window.dispatchEvent(new StorageEvent("storage", { key: COLOR_SCHEME_KEY }))
    expect(heard).toEqual(["chosen"])
  })
})

/** Nothing kept, nothing shown. */
function clean() {
  for (const key of [COLOR_SCHEME_KEY, ...OLD_COLOR_SCHEME_KEYS]) localStorage.removeItem(key)
  ColorScheme.apply(undefined)
}

/** A class list holding `names`, as `<html>`'s `classList` answers `contains()`. */
function classes(...names: string[]) {
  return { contains: (token: string) => names.includes(token) }
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
