import { describe, expect, test } from "vite-plus/test"

import { SiteBoard } from "spell/app/app/pages/SiteBoard"
import { SiteEdits } from "spell/app/app/pages/SiteEdits"

/** A site in plain Spell:  `lines`, indented as written, under its head. */
const site = (...lines: string[]) => ["galaxy guide is a site:", ...lines, ""].join("\n")

/** The board of `text`. */
const boardOf = (text: string) => SiteBoard.sectionsOf(SiteEdits.partsIn(text)!)

/** Each card of a section, as `name row:column`. */
const placesIn = (text: string, section: number) =>
  boardOf(text)[section]!.cards.map((card) => `${card.part.name} ${card.row}:${card.column}`)

/** Every part's name, in the file's order:  what the tree shows. */
const order = (text: string) => SiteEdits.allParts(SiteEdits.partsIn(text)!).map((part) => part.name)

const FILMS = site(
  '\tit has a films page at "/films", colored blue',
  '\t\tit has a film page at "/films/1", in row 1 column 2',
  "\t\tit has a review dialog, in row 1 column 3",
  '\t\tit has a crew page at "/films/crew", in row 2 column 2',
  '\tit has a planets page at "/planets", colored teal',
  '\t\tit has a planet page at "/planets/1", in row 1 column 2',
  "\tit has a not found page"
)

describe("SiteBoard:  sections and cards", () => {
  test("a block per top-level page, its card first;  the rest of the top level in a block with no section", () => {
    const sections = boardOf(FILMS)
    expect(sections.map((section) => section.head?.name)).toEqual(["films page", "planets page", undefined])
    expect(placesIn(FILMS, 0)).toEqual(["films page 1:1", "film page 1:2", "review dialog 1:3", "crew page 2:2"])
    expect(placesIn(FILMS, 2)).toEqual(["not found page 1:1"])
  })

  test("a card takes the colour of what it's under", () => {
    const [films, planets, loose] = boardOf(FILMS)
    expect(films!.cards.map((card) => card.color)).toEqual(["blue", "blue", "blue", "blue"])
    expect(planets!.cards[1]!.color).toBe("teal")
    expect(loose!.cards[0]!.color).toBeUndefined()
  })

  test("with no places:  cards follow each other, a page with pages starts a line, nothing is coloured", () => {
    const text = site(
      '\tit has a films page at "/films"',
      '\t\tit has a one page at "/one"',
      '\t\tit has a two page at "/two"',
      '\t\t\tit has a three page at "/three"'
    )
    expect(placesIn(text, 0)).toEqual(["films page 1:1", "one page 1:2", "two page 2:2", "three page 2:3"])
    expect(boardOf(text)[0]!.cards.every((card) => card.color === undefined)).toBe(true)
  })

  test("a line of cards with no places wraps at eight columns", () => {
    const pages = Array.from({ length: 9 }, (_, index) => `\t\tit has a p${index} page at "/p${index}"`)
    const text = site('\tit has a films page at "/films"', ...pages)
    expect(placesIn(text, 0).at(-3)).toBe("p6 page 1:8")
    expect(placesIn(text, 0).at(-2)).toBe("p7 page 2:2")
  })

  test("a place another card took goes to the next free one", () => {
    const text = site(
      '\tit has a films page at "/films"',
      '\t\tit has a one page at "/one", in row 1 column 2',
      '\t\tit has a two page at "/two", in row 1 column 2'
    )
    expect(placesIn(text, 0)).toEqual(["films page 1:1", "one page 1:2", "two page 1:3"])
  })

  test("the spots:  one more row and column, past the section's own card", () => {
    const [films] = boardOf(FILMS)
    const spots = SiteBoard.spotsOf(films!)
    expect(spots.some((spot) => spot.row === 1 && spot.column === 1)).toBe(false)
    expect(spots.find((spot) => spot.row === 3 && spot.column === 2)?.isExtraRow).toBe(true)
    expect(spots.find((spot) => spot.row === 1 && spot.column === 4)?.isExtraColumn).toBe(true)
    expect(spots.find((spot) => spot.row === 2 && spot.column === 3)?.isExtraColumn).toBe(false)
  })
})

describe("SiteBoard:  moving a card", () => {
  test("to an empty spot of its own section:  only its place changes", () => {
    const after = SiteBoard.withCardDropped(FILMS, "crew page", { section: "films page", row: 3, column: 5 })
    expect(placesIn(after, 0)).toContain("crew page 3:5")
    expect(order(after)).toEqual(order(FILMS))
  })

  test("onto a card:  that card and those touching it after go one right, and the tree follows", () => {
    const after = SiteBoard.withCardDropped(FILMS, "crew page", { section: "films page", row: 1, column: 2 })
    expect(placesIn(after, 0)).toEqual(["films page 1:1", "crew page 1:2", "film page 1:3", "review dialog 1:4"])
    expect(order(after).slice(0, 4)).toEqual(["films page", "crew page", "film page", "review dialog"])
  })

  test("into another section:  under it, so it takes its colour", () => {
    const after = SiteBoard.withCardDropped(FILMS, "review dialog", { section: "planets page", row: 1, column: 3 })
    const planets = boardOf(after)[1]!
    expect(planets.cards.map((card) => card.part.name)).toEqual(["planets page", "planet page", "review dialog"])
    expect(planets.cards[2]!.color).toBe("teal")
    expect(placesIn(after, 0)).toEqual(["films page 1:1", "film page 1:2", "crew page 2:2"])
  })

  test("first in another section", () => {
    const after = SiteBoard.withCardDropped(FILMS, "film page", { section: "planets page", row: 1, column: 2 })
    expect(order(after)).toEqual([
      "films page",
      "review dialog",
      "crew page",
      "planets page",
      "film page",
      "planet page",
      "not found page"
    ])
    expect(placesIn(after, 1)).toEqual(["planets page 1:1", "film page 1:2", "planet page 1:3"])
  })

  test("the last page out leaves its section's card on its own, its line as it was", () => {
    const after = SiteBoard.withCardDropped(FILMS, "planet page", { section: "films page", row: 3, column: 2 })
    expect(after).toContain('\tit has a planets page at "/planets", colored teal\n')
    expect(SiteEdits.partNamed(after, "planets page").parts).toEqual([])
    expect(placesIn(after, 1)).toEqual(["planets page 1:1"])
  })

  test("a page with pages goes with them", () => {
    const text = site(
      '\tit has a films page at "/films"',
      '\t\tit has a one page at "/one"',
      '\t\t\tit has a two page at "/two"',
      '\tit has a planets page at "/planets"'
    )
    const after = SiteBoard.withCardDropped(text, "one page", { section: "planets page", row: 1, column: 2 })
    expect(order(after)).toEqual(["films page", "planets page", "one page", "two page"])
  })

  test("dropped where it is, nothing changes", () => {
    expect(SiteBoard.withCardDropped(FILMS, "film page", { section: "films page", row: 1, column: 2 })).toBe(FILMS)
  })

  test("a section's card joins another section, its pages with it", () => {
    const after = SiteBoard.withCardDropped(FILMS, "planets page", { section: "films page", row: 3, column: 2 })
    expect(boardOf(after).map((section) => section.key)).toEqual(["films page", "not found page"])
    expect(placesIn(after, 0)).toContain("planets page 3:2")
    expect(placesIn(after, 0)).toContain("planet page 3:3")
    expect(order(after).indexOf("planet page")).toBe(order(after).indexOf("planets page") + 1)
  })

  test("not a section's own card in its own section, nor a card or section the site doesn't have", () => {
    expect(() => SiteBoard.withCardDropped(FILMS, "films page", { section: "films page", row: 1, column: 2 })).toThrow(
      TypeError
    )
    expect(() => SiteBoard.withCardDropped(FILMS, "no page", { section: "planets page", row: 1, column: 2 })).toThrow(
      TypeError
    )
    expect(() => SiteBoard.withCardDropped(FILMS, "film page", { section: "no page", row: 1, column: 2 })).toThrow(
      TypeError
    )
  })

  test("moving a section renumbers nothing", () => {
    const after = SiteEdits.withPartMoved(FILMS, "planets page", { where: "before", part: "films page" })
    expect(boardOf(after)[0]!.head?.name).toBe("planets page")
    expect(placesIn(after, 1)).toEqual(placesIn(FILMS, 0))
  })
})

describe("SiteEdits:  a card's place and colour", () => {
  test("read, written, changed and taken out;  kept through another change", () => {
    const text = site(
      '\tit has a films page at "/films", named "Films", colored blue',
      '\t\tit has a film page at "/films/1", in row 2 column 3',
      "\t\tit has a review dialog, in row 1 column 2"
    )
    expect(SiteEdits.partNamed(text, "films page").color).toBe("blue")
    expect(SiteEdits.partNamed(text, "film page").column).toBe(3)
    expect(SiteEdits.partNamed(text, "review dialog").row).toBe(1)
    const placed = SiteEdits.withPartPlaced(text, "review dialog", { row: 4, column: 5 })
    expect(placed).toContain("\t\tit has a review dialog, in row 4 column 5\n")
    const changed = SiteEdits.withPartChanged(text, "films page", { title: "All films" })
    expect(changed).toContain('at "/films", named "All films", colored blue\n')
    expect(SiteEdits.withPartChanged(text, "film page", { title: "Film" })).toContain(
      '\t\tit has a film page at "/films/1", named "Film", in row 2 column 3\n'
    )
    expect(SiteEdits.withPartPlaced(text, "film page", undefined)).toContain('\t\tit has a film page at "/films/1"\n')
  })

  test("a dialog can go under a page, a not found page can't", () => {
    const text = site('\tit has a films page at "/films"', "\tit has a review dialog", "\tit has a not found page")
    const moved = SiteEdits.withPartMoved(text, "review dialog", { where: "into", part: "films page" })
    expect(SiteEdits.partNamed(moved, "films page").parts[0]!.name).toBe("review dialog")
    expect(() => SiteEdits.withPartMoved(text, "not found page", { where: "into", part: "films page" })).toThrow(
      TypeError
    )
  })
})
