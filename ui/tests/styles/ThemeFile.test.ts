import { describe, expect, it } from "vite-plus/test"

import { parseJSON5 } from "spell/util/spell/json"
import { ThemeFile, type ThemeFileSet } from "spell/ui/styles/ThemeFile"
import type { ThemeData } from "spell/ui/styles/styles.types"

/*
 * `ThemeFile`, in the browser:  the same writer `yarn gen:styles` runs in node (epic `debut` P18).
 * - The committed theme sheets and schema are what it writes from the committed theme files.
 * - What a theme file can say, and the mistakes it names.
 */

/** Every theme and palette file, as written. */
const FILES = import.meta.glob<string>(["./themes/*.theme.json5", "./themes/palettes/*.palette.json5"], {
  base: "/src/styles",
  query: "?raw",
  import: "default",
  eager: true
})

/** Every sheet in the themes folder, as written. */
const SHEETS = import.meta.glob<string>(["./themes/*.css", "./themes/palettes/*.css", "./themes/theme.schema.json"], {
  base: "/src/styles",
  query: "?raw",
  import: "default",
  eager: true
})

describe("ThemeFile", () => {
  it("keeps the theme sheets current (run `yarn gen:styles`)", () => {
    const sheets = ThemeFile.sheets(committedFiles())
    expect(Object.keys(sheets).sort()).toEqual([
      "crisp.css",
      "fruity.css",
      "glass.css",
      "matrix.css",
      "merlot.css",
      "midnight.css",
      "palettes/apple.css",
      "paper.css",
      "pop.css",
      "spell.css"
    ])
    for (const [path, css] of Object.entries(sheets))
      expect(squash(SHEETS[`./themes/${path}`] ?? ""), path).toBe(squash(css))
  })

  it("keeps theme.schema.json current (run `yarn gen:styles`)", () => {
    expect(JSON.parse(SHEETS["./themes/theme.schema.json"] ?? "{}")).toEqual(ThemeFile.schema())
  })

  it("writes a pair as light-dark(), a pair leaf as its two tokens, and a pointer as var()", () => {
    const css = sheet({
      surfaces: { page: { light: "#fff", dark: "#000" }, bar: "{surfaces.page}" },
      text: { ink: { light: "#111", dark: "#eee" } },
      typography: { "line-height": { body: 1.45 } },
      components: { menu: { "segmented-radius": "calc({radii.m} - 2px)" } },
      own: { "test-blur": "blur(4px)" }
    })
    expect(css).toContain("--ui-background: light-dark(#fff, #000);")
    expect(css).toContain("--ui-bar-background: var(--ui-background);")
    expect(css).toContain("--ui-ink-on-light: #111;")
    expect(css).toContain("--ui-ink-on-dark: #eee;")
    expect(css).toContain("--ui-line-height: 1.45;")
    expect(css).toContain("--ui-menu-segmented-radius: calc(var(--ui-radius-m) - 2px);")
    expect(css).toContain("--test-blur: blur(4px);")
  })

  it("imports what it extends, its palette, then its rules sheets", () => {
    const set: ThemeFileSet = {
      themes: { base: {}, test: { extends: "base", palette: "hues", rules: ["modern"] } },
      palettes: { hues: {} }
    }
    const css = new ThemeFile({ name: "test", data: set.themes.test!, ...set }).css()
    expect(css).toMatch(
      /@import "\.\/base\.css";\s*@import "\.\/palettes\/hues\.css";\s*@import "\.\/rules\/modern\.css";/
    )
  })

  it("merges what it extends and its palette under its own values", () => {
    const set: ThemeFileSet = {
      themes: {
        base: { radii: { s: "4px", m: "6px" } },
        test: { extends: "base", palette: "hues", radii: { m: "8px" } }
      },
      palettes: { hues: { hues: { red: { base: { light: "#f00", dark: "#f66" } } } } }
    }
    const values = new ThemeFile({ name: "test", data: set.themes.test!, ...set }).values()
    expect(values.get("--ui-radius-s")).toBe("4px")
    expect(values.get("--ui-radius-m")).toBe("8px")
    expect(values.get("--ui-red-on-dark")).toBe("#f66")
  })

  it("names a value outside the tree, and the group it's in", () => {
    expect(() => sheet({ surfaces: { pgae: "#fff" } } as ThemeData)).toThrow(
      /`surfaces\.pgae` is no name in the theme tree;  `surfaces` holds:  page, panel/
    )
  })

  it("names a family token that belongs in the tree", () => {
    expect(() => sheet({ components: { bar: { background: "#fff" } } })).toThrow(
      /sets --ui-bar-background, which belongs in `surfaces\.bar`/
    )
  })

  it("refuses an own token another theme's name starts", () => {
    expect(() => sheet({ own: { "glass-blur": "none" } })).toThrow(/`own\.glass-blur` isn't the theme's/)
  })

  it("names a theme it extends that doesn't exist", () => {
    expect(() => sheet({ extends: "nothing" })).toThrow(/extends `nothing`, but no `nothing\.theme\.json5` exists/)
  })

  it("names a pointer at nothing", () => {
    expect(() => sheet({ surfaces: { bar: "{surfaces.nothing}" } })).toThrow(/points at `\{surfaces\.nothing\}`/)
  })

  it("refuses a plain rgb() colour, naming the hex to write, inside a longer value too", () => {
    expect(() => sheet({ surfaces: { panel: "rgb(255 255 255 / 0.35)" } })).toThrow(
      /`surfaces\.panel` writes `rgb\(255 255 255 \/ 0\.35\)`:  write it as hex, `#ffffff59`/
    )
    expect(() => sheet({ shadows: { subtle: "0 1px 2px rgb(0 0 0 / 0.3)" } })).toThrow(/`#0000004d`/)
    expect(() => sheet({ text: { body: "rgb(18 52 86)" } })).toThrow(/`#123456`/)
    expect(sheet({ surfaces: { panel: "oklch(from {surfaces.page} calc(l - 0.05) c h)" } })).toContain("oklch(from")
  })
})

/** Test theme `data`'s sheet, named `test`. */
function sheet(data: ThemeData): string {
  return new ThemeFile({ name: "test", data, themes: { test: data } }).css()
}

/** The committed theme and palette files, parsed, by name. */
function committedFiles(): ThemeFileSet {
  const set: { themes: Record<string, ThemeData>; palettes: Record<string, ThemeData> } = { themes: {}, palettes: {} }
  for (const [path, text] of Object.entries(FILES)) {
    const [, name, kind] = /([\w-]+)\.(theme|palette)\.json5$/.exec(path)!
    set[kind === "theme" ? "themes" : "palettes"][name!] = parseJSON5(text, path) as ThemeData
  }
  return set
}

/** `text` without comments or whitespace:  how the formatter lays a sheet out never matters. */
function squash(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "")
}
