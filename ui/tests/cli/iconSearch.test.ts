import { existsSync } from "node:fs"
import { beforeAll, describe, test, expect } from "vite-plus/test"

import { type IconInfo, loadIcons, searchIcons } from "spell/ui/cli/iconSearch"

let icons: IconInfo[]
beforeAll(async () => {
  icons = await loadIcons()
})

describe("loadIcons()", () => {
  test("every built-in pack, by the names the runtime knows them by", () => {
    expect(new Set(icons.map((icon) => icon.pack))).toEqual(new Set(["fa7-free", "fa7-brands", "fomantic"]))
    const bell = icons.find((icon) => icon.pack === "fomantic" && icon.name === "bell")!
    expect(bell.aliases).toContain("alarm")
    expect(bell.keywords).toContain("buzzer")
    expect(existsSync(bell.svg)).toBe(true)
  })

  test("an unknown pack", async () => {
    await expect(loadIcons(["nope"])).rejects.toThrow("No icon pack 'nope'")
  })
})

describe("searchIcons()", () => {
  test("the exact name first, then names starting with it, then the rest", () => {
    const names = searchIcons(icons, "bell").map((icon) => icon.name)
    expect(names.slice(0, 2)).toEqual(["bell", "bell"])
    expect(names).toContain("bell slash")
    expect(names).toContain("dumbbell")
  })

  test("a search term finds an icon wherever it holds the query, after every name:  as the picker and the page", () => {
    expect(searchIcons(icons, "buzzer").map((icon) => icon.name)).toContain("bell")
    // `brain`'s term `cerebellum` (epic `coherence` P25:  the command missed it, the picker found it)
    const names = searchIcons(icons, "bell").map((icon) => icon.name)
    expect(names).toContain("brain")
    expect(names.indexOf("brain")).toBeGreaterThan(names.indexOf("dumbbell"))
  })

  test("the whole query, as an icon name:  `-` ~== space", () => {
    expect(searchIcons(icons, "arrow-up")[0]!.name).toBe("arrow up")
    const names = searchIcons(icons, "address-book outline").map((icon) => icon.name)
    expect(new Set(names)).toEqual(new Set(["address book outline"]))
  })
})
