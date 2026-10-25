import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { DOMFormControl } from "spell-ui/elements"
import { IconCatalog, type IconCategory, type IconChoice } from "spell-ui/components/ui-icon-picker"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell-ui/components/ui-icon-picker"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-icon-picker/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** An icon picker's DOM element, with its properties. */
type Picker = DOMFormControl & { value: string | undefined; required: boolean }

/** Render one picker;  returns the DOM element and its pieces. */
async function picker(html: string) {
  const host = await ElementFixture.render<Picker>(html)
  await ElementFixture.tick()
  return { host, ...parts(host) }
}

/** Pieces of a rendered picker. */
function parts(host: Element) {
  const root = host.shadowRoot!
  return {
    field: root.querySelector<HTMLButtonElement>("[part~=field]")!,
    text: () => root.querySelector<HTMLElement>("[part~=text]")!,
    glyph: () => root.querySelector<HTMLElement>("[part~=glyph]"),
    panel: root.querySelector<HTMLElement>("[part~=panel]")!,
    search: root.querySelector<HTMLInputElement>("[part~=search]")!,
    cells: () => [...root.querySelectorAll<HTMLElement>("[part~=cell]")],
    highlighted: () => root.querySelector<HTMLElement>(".cell.selected")?.title,
    /** the grid's headings, in order, the stuck one left out */
    headings: () => [...root.querySelectorAll<HTMLElement>(".rows > [part~=heading]")].map((it) => it.textContent)
  }
}

/** Collect `detail.value`s of `ui-changing`. */
function changes(host: Element) {
  const values: string[] = []
  host.addEventListener("ui-changing", (event) => values.push((event as CustomEvent).detail.value))
  return values
}

/**
 * Open `host`'s panel and wait for its icons (the page's packs) to fill the grid,
 * in groups once Font Awesome's categories are in.
 */
async function openGrid(field: HTMLButtonElement, cells: () => HTMLElement[]) {
  await userEvent.click(field)
  await expect.poll(() => cells().length, { timeout: 5000 }).toBeGreaterThan(10)
  const grid = field.getRootNode() as ShadowRoot
  await expect.poll(() => grid.querySelector("[part~=heading]"), { timeout: 5000 }).toBeTruthy()
}

/** Choices to drive `IconCatalog.matches()` with, without the packs. */
const CHOICES: readonly IconChoice[] = [
  { name: "bell", names: ["bell"], file: "bell" },
  { name: "envelope", names: ["envelope", "mail"], file: "envelope" },
  { name: "star", names: ["star"], file: "star" },
  { name: "star half", names: ["star half"], file: "star-half" },
  { name: "superstar", names: ["superstar"], file: "superstar" }
]

/** Categories to group `CHOICES` with:  `bell` in two, `superstar` in none, one with none of them. */
const CATEGORIES: readonly IconCategory[] = [
  { id: "alert", label: "Alert", files: ["bell", "exclamation"] },
  { id: "empty", label: "Empty", files: ["not-a-choice"] },
  { id: "shapes", label: "Shapes", files: ["star-half", "star", "bell"] },
  { id: "communication", label: "Communication", files: ["envelope"] }
]

/** A search words file to open a picker with:  two categories of the default pack's files, no terms. */
const STUB_WORDS = {
  terms: {},
  categories: [
    { id: "alert", label: "Alert", files: ["bell", "bell-slash"] },
    { id: "shapes", label: "Shapes", files: ["star", "bell"] }
  ]
}

afterEach(() => {
  vi.restoreAllMocks()
})

////////////////
// ## The field
////////////////

describe("<ui-icon-picker> field", () => {
  test("shows the chosen glyph and its name", async () => {
    const { field, text, glyph } = await picker(`<ui-icon-picker value="star" aria-label="Icon"></ui-icon-picker>`)
    expect(field.className).toBe("ui icon picker")
    expect(text().textContent).toBe("star")
    expect(field.getAttribute("aria-label")).toBe("Icon, star")
    // the glyph loads asynchronously the first time (`UI.icons`)
    await expect.poll(() => glyph()?.querySelector("svg")).toBeTruthy()
  })

  test("says `none`, as a placeholder, with no icon chosen;  `placeholder` says something else", async () => {
    const { text, glyph } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    expect(text().textContent).toBe("none")
    expect(text().classList.contains("placeholder")).toBe(true)
    expect(glyph()).toBeNull()
    const other = await picker(`<ui-icon-picker placeholder="Pick one" aria-label="Icon"></ui-icon-picker>`)
    expect(other.text().textContent).toBe("Pick one")
  })

  test.each([
    ['size="large" fluid', "ui large fluid icon picker"],
    ["readonly", "ui read-only icon picker"],
    ["disabled", "ui disabled icon picker"]
  ])("<ui-icon-picker %s>", async (attributes, classes) => {
    const { field } = await picker(`<ui-icon-picker ${attributes} aria-label="Icon"></ui-icon-picker>`)
    expect(field.className).toBe(classes)
  })

  test("readonly never opens", async () => {
    const { field, panel } = await picker(`<ui-icon-picker readonly value="bell" aria-label="Icon"></ui-icon-picker>`)
    await userEvent.click(field)
    await ElementFixture.tick()
    expect(panel.matches(":popover-open")).toBe(false)
  })
})

////////////////
// ## The panel
////////////////

describe("<ui-icon-picker> panel", () => {
  test("opens under the field with the search box focused, the chosen icon highlighted", async () => {
    const { host, field, panel, search, cells, highlighted } = await picker(
      `<ui-icon-picker value="star" aria-label="Icon"></ui-icon-picker>`
    )
    await openGrid(field, cells)
    expect(panel.matches(":popover-open")).toBe(true)
    expect(host.matches(":state(open)")).toBe(true)
    expect(host.shadowRoot!.activeElement).toBe(search)
    // its row scrolled into view (drawn) once the icons are in
    await expect.poll(() => highlighted()).toBe("star")
    expect(
      cells()
        .find((cell) => cell.title === "star")
        ?.getAttribute("aria-selected")
    ).toBe("true")
    // the panel sits below the field
    expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(field.getBoundingClientRect().bottom)
  })

  test("its first cell is `none`;  every cell's name is its tooltip", async () => {
    const { field, cells } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    const [none, first] = cells()
    expect(none!.classList.contains("none")).toBe(true)
    expect(none!.title).toBe("none")
    expect(first!.title).not.toBe("")
    await expect.poll(() => first!.querySelector("svg")).toBeTruthy()
  })

  test("draws only the rows in view, and the next as it scrolls:  ~1,800 glyphs are ~1,800 SVG files", async () => {
    const { host, field, cells } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    expect(cells().length).toBeLessThan(400)
    const first = cells()[0]!.title
    const grid = host.shadowRoot!.querySelector<HTMLElement>("[part~=grid]")!
    expect(grid.scrollHeight).toBeGreaterThan(grid.clientHeight * 10)
    grid.scrollTop = grid.scrollHeight
    await expect.poll(() => cells()[0]?.title).not.toBe(first)
    expect(cells().length).toBeLessThan(400)
  })

  test("`required` offers no `none`", async () => {
    const { field, cells } = await picker(`<ui-icon-picker required aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    expect(cells().some((cell) => cell.classList.contains("none"))).toBe(false)
  })

  test("typing filters the grid by name, best match first", async () => {
    const { field, search, cells, highlighted } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    const before = cells().length
    await userEvent.type(search, "bell")
    await expect.poll(() => cells().length).toBeLessThan(before)
    const names = cells().map((cell) => cell.title)
    expect(names[0]).toBe("none")
    expect(names[1]).toBe("bell")
    // every name holding it, before the icons found by Font Awesome's search terms
    const byName = names.slice(1).filter((name) => name.includes("bell"))
    expect(names.slice(1, 1 + byName.length)).toEqual(byName)
    expect(highlighted()).toBe("bell")
  })

  test("a search finds an icon by Font Awesome's search terms too:  `mail` finds `envelope`", async () => {
    const { field, search, cells } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    await userEvent.type(search, "mail")
    await expect.poll(() => cells().map((cell) => cell.title)).toContain("envelope")
  })

  test("a search that finds nothing says so", async () => {
    const { host, field, search, cells } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    await userEvent.type(search, "zzqqxx")
    await expect.poll(() => host.shadowRoot!.querySelector("[role=status]")?.textContent).toBe("No icons match")
  })

  test("Escape closes it, back on the field;  nothing changes", async () => {
    const { host, field, panel, cells } = await picker(
      `<ui-icon-picker value="star" aria-label="Icon"></ui-icon-picker>`
    )
    const values = changes(host)
    await openGrid(field, cells)
    await userEvent.keyboard("{Escape}")
    await ElementFixture.tick()
    expect(panel.matches(":popover-open")).toBe(false)
    expect(host.matches(":state(open)")).toBe(false)
    expect(host.shadowRoot!.activeElement).toBe(field)
    expect(values).toEqual([])
    expect(host.value).toBe("star")
  })

  test("a click outside closes it", async () => {
    const { field, panel, cells } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    await userEvent.click(document.body, { position: { x: 1, y: 1 } })
    await ElementFixture.tick()
    expect(panel.matches(":popover-open")).toBe(false)
  })
})

////////////////
// ## Groups
////////////////

describe("<ui-icon-picker> groups", () => {
  test("with no search, groups the grid by Font Awesome's categories, a glyph in EACH of its own;  then Other", async () => {
    vi.spyOn(IconCatalog, "searchWords").mockResolvedValue(STUB_WORDS)
    const { host, field, search, cells, headings } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    expect(headings()).toEqual(["Alert", "Shapes", "Other"])
    const rows = [...host.shadowRoot!.querySelectorAll<HTMLElement>(".rows > *")]
    const titles = rows.map((it) => it.title || it.textContent)
    // "none" alone, then each group under its heading:  `bell` (solid) and `bell outline` (regular) in both, A-Z
    expect(titles.slice(0, titles.indexOf("Other"))).toEqual([
      "none",
      "Alert",
      "bell",
      "bell outline",
      "bell slash",
      "bell slash outline",
      "Shapes",
      "bell",
      "bell outline",
      "star",
      "star outline"
    ])
    // a heading starts its own row, at the grid's left edge
    const grid = host.shadowRoot!.querySelector<HTMLElement>("[part~=grid]")!
    const heading = rows.find((it) => it.textContent === "Shapes")!
    expect(heading.getBoundingClientRect().left).toBe(rows[0]!.getBoundingClientRect().left)
    expect(heading.getBoundingClientRect().width).toBeGreaterThan(grid.clientWidth * 0.9)
    // a search is one list again, best match first
    await userEvent.type(search, "bell")
    await expect.poll(() => headings()).toEqual([])
    expect(cells().map((cell) => cell.title)[1]).toBe("bell")
  })

  test("the heading of the group at the grid's top stays stuck there as it scrolls", async () => {
    vi.spyOn(IconCatalog, "searchWords").mockResolvedValue(STUB_WORDS)
    const { host, field, cells } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    const root = host.shadowRoot!
    const stuck = () => root.querySelector<HTMLElement>(".heading.stuck")?.textContent
    expect(stuck()).toBeUndefined()
    const grid = root.querySelector<HTMLElement>("[part~=grid]")!
    grid.scrollTop = grid.scrollHeight / 2
    await expect.poll(() => stuck()).toBe("Other")
  })

  test("arrows move down and up a row of cells, over the headings, in the same column", async () => {
    vi.spyOn(IconCatalog, "searchWords").mockResolvedValue(STUB_WORDS)
    const { field, cells, highlighted } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    await openGrid(field, cells)
    // none => Alert's first => Shapes' first => back up
    await userEvent.keyboard("{ArrowDown}")
    expect(highlighted()).toBe("bell")
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowDown}")
    expect(highlighted()).toBe("star")
    await userEvent.keyboard("{ArrowUp}")
    expect(highlighted()).toBe("bell slash")
  })
})

////////////////
// ## Picking
////////////////

describe("<ui-icon-picker> picking", () => {
  test("a click on a glyph sets `value`, sends `ui-changing` then `ui-changed`, and closes", async () => {
    const { host, field, panel, search, cells, text } = await picker(
      `<ui-icon-picker name="icon" aria-label="Icon"></ui-icon-picker>`
    )
    const values = changes(host)
    const changed: string[] = []
    host.addEventListener("ui-changed", (event) => changed.push((event as CustomEvent).detail.value))
    await openGrid(field, cells)
    await userEvent.type(search, "bell")
    await expect.poll(() => cells()[1]?.title).toBe("bell")
    await userEvent.click(cells()[1]!)
    await ElementFixture.tick()
    expect(values).toEqual(["bell"])
    expect(changed).toEqual(["bell"])
    expect(host.value).toBe("bell")
    expect(text().textContent).toBe("bell")
    expect(panel.matches(":popover-open")).toBe(false)
    expect(host.shadowRoot!.activeElement).toBe(field)
  })

  test("arrows move through the grid and Enter picks", async () => {
    const { host, field, cells, highlighted } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    const values = changes(host)
    await openGrid(field, cells)
    expect(highlighted()).toBe("none")
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")
    const third = cells()[2]!.title
    expect(highlighted()).toBe(third)
    await userEvent.keyboard("{ArrowDown}")
    const columns = getComputedStyle(cells()[0]!.parentElement!).gridTemplateColumns.split(" ").length
    expect(highlighted()).toBe(cells()[2 + columns]!.title)
    await userEvent.keyboard("{ArrowUp}{Enter}")
    await ElementFixture.tick()
    expect(values).toEqual([third])
    expect(host.value).toBe(third)
  })

  test("the `none` cell clears the value", async () => {
    const { host, field, search, cells, text } = await picker(
      `<ui-icon-picker value="star" aria-label="Icon"></ui-icon-picker>`
    )
    const values = changes(host)
    await openGrid(field, cells)
    // a search puts the grid back at its top, "none" first
    await userEvent.type(search, "star")
    await expect.poll(() => cells()[0]?.classList.contains("none")).toBe(true)
    await userEvent.click(cells()[0]!)
    await ElementFixture.tick()
    expect(values).toEqual([""])
    expect(host.value).toBe("")
    expect(text().textContent).toBe("none")
  })

  test("a `ui-changing` handler that sets `value` again wins", async () => {
    const { host, field, cells, text } = await picker(`<ui-icon-picker aria-label="Icon"></ui-icon-picker>`)
    host.addEventListener("ui-changing", () => (host.value = "heart"))
    await openGrid(field, cells)
    await userEvent.click(cells()[1]!)
    await ElementFixture.tick()
    expect(host.value).toBe("heart")
    expect(text().textContent).toBe("heart")
  })

  test("submits the icon's name with its form", async () => {
    const root = await ElementFixture.render(
      `<form><ui-icon-picker name="icon" value="bell" aria-label="Icon"></ui-icon-picker></form>`
    )
    await ElementFixture.tick()
    expect(new FormData(root as HTMLFormElement).get("icon")).toBe("bell")
  })

  test.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await ElementFixture.tick()
    await expectAccessible(root)
  })
})

////////////////
// ## The catalog
////////////////

describe("IconCatalog.groupsOf()", () => {
  test("puts each choice in every category that lists its file, in the categories' order, A-Z within each", () => {
    const groups = IconCatalog.groupsOf(CHOICES, CATEGORIES)
    expect(groups.map((group) => [group.id, group.choices.map((choice) => choice.name)])).toEqual([
      ["alert", ["bell"]],
      ["shapes", ["bell", "star", "star half"]],
      ["communication", ["envelope"]],
      ["other", ["superstar"]]
    ])
  })

  test("leaves Other unlabelled, for the picker to word;  and out, when every choice has a category", () => {
    expect(IconCatalog.groupsOf(CHOICES, CATEGORIES).at(-1)).toEqual({ id: "other", choices: [CHOICES[4]] })
    const listed = CHOICES.slice(0, 4)
    expect(IconCatalog.groupsOf(listed, CATEGORIES).map((group) => group.id)).toEqual([
      "alert",
      "shapes",
      "communication"
    ])
  })
})

describe("IconCatalog.searchWords()", () => {
  test("loads Font Awesome's terms and categories, each category's icons back as file names", async () => {
    const words = await IconCatalog.searchWords()
    expect(words.terms.envelope).toContain("e-mail")
    const charts = words.categories.find((category) => category.id === "charts-diagrams")
    expect(charts).toMatchObject({ label: "Charts + Diagrams" })
    expect(charts!.files).toContain("chart-pie")
    expect(words.categories.find((category) => category.id === "numbers")!.files).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9"
    ])
  })
})

describe("IconCatalog.matches()", () => {
  test("ranks names that ARE the query, then start with it, then hold it;  A-Z within each", () => {
    expect(IconCatalog.matches(CHOICES, "star").map((choice) => choice.name)).toEqual([
      "star",
      "star half",
      "superstar"
    ])
  })

  test("matches any of a glyph's names, and its search terms after every name", () => {
    expect(IconCatalog.matches(CHOICES, "mail").map((choice) => choice.name)).toEqual(["envelope"])
    const terms = { bell: ["alert", "notification"] }
    expect(IconCatalog.matches(CHOICES, "alert", terms).map((choice) => choice.name)).toEqual(["bell"])
  })

  test("reads the query as an icon name;  an empty one matches everything", () => {
    expect(IconCatalog.matches(CHOICES, "Star-Half").map((choice) => choice.name)).toEqual(["star half"])
    expect(IconCatalog.matches(CHOICES, "  ")).toBe(CHOICES)
  })
})
