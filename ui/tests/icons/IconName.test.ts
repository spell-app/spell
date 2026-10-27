import { describe, expect, test } from "vite-plus/test"

import { IconName } from "spell-ui/icons/IconName"

////////////////
// ## Spelling
////////////////

describe("IconName.normalize()", () => {
  test("lowercases, turns dashes and underscores into spaces, and collapses whitespace", () => {
    expect(IconName.normalize("Address-Book")).toBe("address book")
    expect(IconName.normalize("  arrow__up   circle ")).toBe("arrow up circle")
  })
})

describe("IconName.fromKey()", () => {
  test("names an icon by its file name, without the folder", () => {
    expect(IconName.fromKey("solid/address-book")).toBe("address book")
    expect(IconName.fromKey("bell")).toBe("bell")
  })
})

describe("IconName.aliases()", () => {
  test("takes one alias or a list, normalized;  empty ones drop", () => {
    expect(IconName.aliases(undefined)).toEqual([])
    expect(IconName.aliases("Cog")).toEqual(["cog"])
    expect(IconName.aliases(["setting", "", "Gear-Wheel"])).toEqual(["setting", "gear wheel"])
  })
})

describe("IconName.split()", () => {
  test("splits at the FIRST separator only;  no separator means no prefix", () => {
    expect(IconName.split("Lucide:Arrow-Up")).toEqual({ prefix: "lucide", name: "arrow up" })
    expect(IconName.split("a:b:c")).toEqual({ prefix: "a", name: "b:c" })
    expect(IconName.split("bell")).toEqual({ name: "bell" })
  })
})

////////////////
// ## Claiming names
////////////////

describe("IconName.claim()", () => {
  test("an alias beats a name derived from a file;  otherwise the FIRST entry keeps a name", () => {
    const claimed = IconName.claim([
      ["solid/shield", undefined],
      ["solid/shield-halved", "shield"],
      ["regular/bell", undefined],
      ["solid/bell", undefined]
    ])
    expect(Object.fromEntries(claimed)).toEqual({
      shield: "solid/shield-halved",
      "shield halved": "solid/shield-halved",
      bell: "regular/bell"
    })
  })
})

////////////////
// ## Search
////////////////

/** Tiles as the docs' icon browser holds them:  names, and the Font Awesome file their terms are keyed by. */
const TILES = [
  { names: ["arrow up"], file: "arrow-up" },
  { names: ["bell", "alarm"], file: "bell" },
  { names: ["bell slash"], file: "bell-slash" },
  { names: ["brain"], file: "brain" },
  { names: ["circle arrow up"], file: "circle-arrow-up" },
  { names: ["dumbbell"], file: "dumbbell" }
]

/** Their search terms, by file. */
const TERMS: Record<string, readonly string[]> = { brain: ["cerebellum", "mind"], bell: ["buzzer"] }

/** `IconName.search()` over `TILES`:  the names found, best first. */
function found(query: string): string[] {
  return IconName.search(TILES, query, { names: (tile) => tile.names, terms: (tile) => TERMS[tile.file] ?? [] }).map(
    (tile) => tile.names[0]!
  )
}

describe("IconName.search()", () => {
  test("a name that IS the query, then names starting with it, then holding it, then a search term holding it", () => {
    expect(found("bell")).toEqual(["bell", "bell slash", "dumbbell", "brain"])
  })

  test("reads the query as an icon name:  Font Awesome's `arrow-up` finds `arrow up` (the icons page couldn't)", () => {
    expect(found("Arrow-Up")).toEqual(["arrow up", "circle arrow up"])
  })

  test("an alias is a name;  an empty query finds everything, in order", () => {
    expect(found("alarm")).toEqual(["bell"])
    expect(found("  ")).toEqual(TILES.map((tile) => tile.names[0]))
  })
})

describe("IconName.labelOf()", () => {
  test("its file's own name when the icon has it, else its first", () => {
    expect(IconName.labelOf("solid/address-book", ["contacts", "address book"])).toBe("address book")
    expect(IconName.labelOf("solid/shield-halved", ["shield"])).toBe("shield")
  })
})
