import { flush } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Fixture } from "spell/test-helpers/Fixture"
import type { DOMElement } from "spell/element"
import { SiteData, type SiteDataFile, type SiteTag } from "spell/ui/docs-components"

import { STORAGE_KEYS } from "spell/ui/docs-components/ui-docs-nav/UIDocsNav.types"
import type { DOMDocsNavElement } from "spell/ui/docs-components/ui-docs-nav/UIDocsNav"

import "spell/ui/docs-components/ui-docs-nav"

////////////////
// ## Fixtures
////////////////

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/docs-components/ui-docs-nav/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A tag of the test data. */
function tag(name: string, tagName: string, topics: string[], extra: Partial<SiteTag> = {}): SiteTag {
  const folder = extra.folder ?? tagName
  return {
    tag: tagName,
    name,
    folder,
    mainTag: folder,
    main: folder === tagName,
    page: folder === tagName,
    href: folder === tagName ? `components/${folder}.html` : `components/${folder}.html#${tagName}`,
    topics,
    aka: [],
    noun: name.toLowerCase(),
    attributes: [],
    slots: [],
    events: [],
    parts: [],
    states: [],
    texts: [],
    ...extra
  }
}

/** A family of the test data. */
function family(folder: string, status: "done" | "in-progress" | "planned" = "done") {
  return { folder, mainTag: folder, title: folder, summary: "", status, docs: false, tags: [folder], tokens: [] }
}

/** The test data:  5 components (one a sub-tag, one in progress), a docs tag, 4 topics (one unused). */
const DATA: SiteDataFile = {
  $comment: "test",
  version: 1,
  topics: [
    { id: "buttons", title: "Buttons" },
    { id: "forms", title: "Forms" },
    { id: "date & time", title: "Date & time" },
    { id: "unused", title: "Unused" }
  ],
  components: [
    tag("Button", "ui-button", ["buttons"]),
    tag("Buttons", "ui-buttons", ["buttons"], { folder: "ui-button" }),
    tag("Calendar", "ui-calendar", ["forms", "date & time"], { aka: ["date picker"] }),
    tag("Input", "ui-input", ["forms"], { aka: ["text field"] }),
    tag("Checkbox", "ui-checkbox", ["forms", "buttons"])
  ],
  docs: [tag("Docs example", "ui-example", ["documentation"])],
  families: {
    "ui-button": family("ui-button"),
    "ui-calendar": family("ui-calendar", "in-progress"),
    "ui-input": family("ui-input"),
    "ui-checkbox": family("ui-checkbox")
  },
  foundation: []
}

/** A blob URL serving `data` as the site's data file. */
function serve(data: unknown): string {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }))
  onTestFinished(() => URL.revokeObjectURL(url))
  return url
}

beforeEach(() => {
  localStorage.clear()
  // most cases read the A-Z list;  the default (Topics) has its own case
  localStorage.setItem(STORAGE_KEYS.view, "az")
  SiteData.url = serve(DATA)
})

afterEach(() => {
  localStorage.clear()
  SiteData.url = undefined
})

////////////////
// ## Helpers
////////////////

/** Render a nav (links under `#/`, so following one only changes the hash), wait for its list. */
async function render(attributes = "", html?: string) {
  const nav = await ElementFixture.render<DOMDocsNavElement>(
    html ?? `<ui-docs-nav base="#/" ${attributes}></ui-docs-nav>`
  )
  await nav.listed
  await settle(nav)
  return nav
}

/** Every element in `root`'s shadow root, and in theirs, all the way down. */
function deepElements(root: Element): Element[] {
  const found: Element[] = []
  const walk = (shadow: ShadowRoot | null) => {
    for (const element of shadow?.querySelectorAll("*") ?? []) {
      found.push(element)
      walk(element.shadowRoot)
    }
  }
  walk(root.shadowRoot)
  return found
}

/** Wait for every element in `nav`'s shadow root (its site nav's and rows' too), then flush. */
async function settle(nav: Element) {
  for (let round = 0; round < 4; round++) {
    const hosts = deepElements(nav).filter((element): element is DOMElement => "ready" in element)
    await Promise.all(hosts.map((host) => host.ready))
    await ElementFixture.tick()
  }
  flush()
}

/** The site nav that draws `nav`'s list. */
function siteNav(nav: Element): HTMLElement {
  return find(nav, "ui-site-nav")
}

/** The list's row whose page is `id` (a tag, a page's id, `group:start`, `topic:forms`, `favorite:ui-input`). */
function row(nav: Element, id: string): HTMLElement {
  const found = siteNav(nav).shadowRoot!.querySelector<HTMLElement>(`ui-tree-item[data-page="${CSS.escape(id)}"]`)
  if (!found) throw new Error(`no row ${id}`)
  return found
}

/** `row`'s link (its title as an `<a>`). */
function link(nav: Element, id: string): HTMLAnchorElement {
  const found = row(nav, id).querySelector<HTMLAnchorElement>(":scope > a")
  if (!found) throw new Error(`no link ${id}`)
  return found
}

/** Is `item` on screen:  every row it's inside is open. */
function isShown(item: Element): boolean {
  for (let at = item.parentElement; at?.localName === "ui-tree-item"; at = at.parentElement) {
    if (!at.hasAttribute("open")) return false
  }
  return true
}

/**
 * The SHOWN links (none inside a shut row), by tag or page id, in order.
 * - `scope`:  only those inside this row (`group:components`, `group:favorites`), or under any topic (`topic:`).
 */
function links(nav: Element, scope = ""): string[] {
  const items = [...siteNav(nav).shadowRoot!.querySelectorAll<HTMLElement>("ui-tree-item")]
  return items
    .filter((item) => item.querySelector(":scope > a") && isShown(item))
    .filter((item) => {
      if (!scope) return true
      const inside = (at: Element | null): boolean =>
        at?.localName === "ui-tree-item" &&
        (at.getAttribute("data-page")!.startsWith(scope) || inside(at.parentElement))
      return inside(item.parentElement)
    })
    .map((item) => item.getAttribute("data-page")!.replace(/^favorite:/, ""))
}

/** The heading bands' titles, each with its count. */
function bands(nav: Element): string[] {
  return [...siteNav(nav).shadowRoot!.querySelectorAll('ui-tree-item[band="heading"]')].map(
    (band) => band.getAttribute("label")! + (band.getAttribute("count") ?? "")
  )
}

/** The topics' rows (subheading bands), in order. */
function topics(nav: Element): HTMLElement[] {
  return [...siteNav(nav).shadowRoot!.querySelectorAll<HTMLElement>('ui-tree-item[band="subheading"]')]
}

/** The element in `nav`'s shadow root matching `selector`. */
function find<T extends Element = HTMLElement>(nav: Element, selector: string): T {
  const element = nav.shadowRoot!.querySelector<T>(selector)
  if (!element) throw new Error(`no ${selector}`)
  return element
}

/** Type `text` into the search box. */
async function search(nav: Element, text: string) {
  const input = find(nav, "[part~=search]")
  const control = input.shadowRoot!.querySelector("input")!
  control.value = text
  control.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
  await settle(nav)
}

/** Click `nav`'s element matching `selector` (a button's `<button>`). */
async function click(nav: Element, selector: string) {
  const element = find(nav, selector)
  const target = element.shadowRoot?.querySelector<HTMLElement>("[part~=button]") ?? element
  target.click()
  await settle(nav)
}

/** Click the row of page `id`:  a band opens or closes, a link is followed. */
async function clickRow(nav: Element, id: string) {
  row(nav, id).shadowRoot!.querySelector<HTMLElement>("[part~=row]")!.click()
  await settle(nav)
}

/** Click the star of page `id`. */
async function star(nav: Element, id: string) {
  starOf(nav, id).shadowRoot!.querySelector<HTMLElement>("button")!.click()
  await settle(nav)
}

/** The star of page `id`. */
function starOf(nav: Element, id: string): HTMLElement {
  const found = row(nav, id).querySelector<HTMLElement>(":scope > .star")
  if (!found) throw new Error(`no star ${id}`)
  return found
}

////////////////
// ## Lists, topics and folds
////////////////

describe("<ui-docs-nav> lists", () => {
  it("lists the top links, every component A-Z (no docs tags), then Foundation", async () => {
    const nav = await render()
    expect(links(nav)).toEqual([
      "index",
      "getting-started",
      "grammar",
      "components",
      "ui-button",
      "ui-buttons",
      "ui-calendar",
      "ui-checkbox",
      "ui-input",
      "theming",
      "utilities",
      "icons",
      "kitchen-sink"
    ])
    expect(siteNav(nav).getAttribute("label")).toBe("Documentation")
    expect(siteNav(nav).getAttribute("appearance")).toBe("nav")
    expect(bands(nav)).toEqual(["Get started", "Components5", "Foundation"])
  })

  it("is a panel:  the header band (slot, search, view switch) above the scrolling list", async () => {
    const nav = await render("", `<ui-docs-nav base="#/"><b slot="header">Spell UI</b></ui-docs-nav>`)
    const panel = find(nav, "[part~=nav]")
    expect([...panel.children].map((child) => child.getAttribute("part"))).toEqual(["header", "menu"])
    const header = find(nav, "[part~=header]")
    expect(header.querySelector("slot")!.assignedElements()[0]!.textContent).toBe("Spell UI")
    expect(header.querySelector("[part~=search]")).not.toBeNull()
    expect(header.querySelector("[part~=views]")).not.toBeNull()
    expect(getComputedStyle(find(nav, "[part~=menu]")).overflowY).toBe("auto")
  })

  it("links relative to `base`:  a sub-tag to its heading on its family's page", async () => {
    const nav = await render()
    expect(link(nav, "index").getAttribute("href")).toBe("#/index.html")
    expect(link(nav, "ui-button").getAttribute("href")).toBe("#/components/ui-button.html")
    expect(link(nav, "ui-buttons").getAttribute("href")).toBe("#/components/ui-button.html#ui-buttons")
  })

  it("badges a family that isn't done", async () => {
    const nav = await render()
    expect(row(nav, "ui-calendar").getAttribute("badge")).toBe("in progress")
    expect(row(nav, "ui-input").hasAttribute("badge")).toBe(false)
  })

  it("marks the current components page:  `aria-current=page`, only its main tag;  moves with `current`", async () => {
    const nav = await render(`current="ui-button"`)
    expect(row(nav, "ui-button").getAttribute("aria-current")).toBe("page")
    expect(row(nav, "ui-buttons").hasAttribute("aria-current")).toBe(false)
    expect(row(nav, "index").hasAttribute("aria-current")).toBe(false)
    nav.setAttribute("current", "ui-input")
    await settle(nav)
    expect(row(nav, "ui-button").hasAttribute("aria-current")).toBe(false)
    expect(row(nav, "ui-input").getAttribute("aria-current")).toBe("page")
  })

  it("links a sub-tag with its own page there, and marks it current;  a sub-tag on its family page never", async () => {
    const radio = tag("Radio", "ui-radio", ["forms"], {
      folder: "ui-checkbox",
      page: true,
      href: "components/ui-radio.html"
    })
    const pages = { "ui-radio": { title: "Radio", summary: "", status: "planned" as const } }
    SiteData.url = serve({
      ...DATA,
      components: [...DATA.components, radio],
      families: { ...DATA.families, "ui-checkbox": { ...family("ui-checkbox"), pages } }
    })
    const nav = await render(`current="ui-radio"`)
    expect(link(nav, "ui-radio").getAttribute("href")).toBe("#/components/ui-radio.html")
    expect(row(nav, "ui-radio").getAttribute("aria-current")).toBe("page")
    // its own page's status, not its family's
    expect(row(nav, "ui-radio").getAttribute("badge")).toBe("planned")
    nav.setAttribute("current", "ui-buttons")
    await settle(nav)
    expect(row(nav, "ui-buttons").hasAttribute("aria-current")).toBe(false)
  })

  it("marks a hand-written page, and shows a load error", async () => {
    const nav = await render(`current="getting-started"`)
    expect(row(nav, "getting-started").getAttribute("aria-current")).toBe("page")

    SiteData.url = "/no-such-folder/__data/components.json5"
    const broken = await render()
    expect(find(broken, "ui-message").getAttribute("heading")).toBe("The component list didn't load")
    expect(broken.matches(":state(listed)")).toBe(true)
    expect(links(broken)).toContain("theming")
  })
})

describe("<ui-docs-nav> on another site", () => {
  /** The test data as a component set's (Epic UI's):  its own links and band titles, no Foundation pages. */
  const SET: SiteDataFile = {
    ...DATA,
    nav: {
      start: [{ id: "index", file: "index.html", label: "The Epic Elements", icon: "house" }],
      foundation: [],
      titles: { components: "Elements" }
    }
  }

  it("lists the site's own links and band titles from its data, and no empty Foundation band", async () => {
    SiteData.url = serve(SET)
    const nav = await render(`current="index"`)
    expect(links(nav)).toEqual(["index", "ui-button", "ui-buttons", "ui-calendar", "ui-checkbox", "ui-input"])
    expect(link(nav, "index").textContent).toBe("The Epic Elements")
    expect(row(nav, "index").getAttribute("aria-current")).toBe("page")
    expect(bands(nav)).toEqual(["Get started", "Elements5"])
  })

  it("keeps stored favourites it doesn't list when one is starred:  the sites share the key", async () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(["ui-elsewhere"]))
    const nav = await render()
    await star(nav, "ui-input")
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)!)).toEqual(["ui-input", "ui-elsewhere"])
  })
})

describe("<ui-docs-nav> topics", () => {
  it("starts on Topics when neither the page nor the viewer chose a view", async () => {
    localStorage.removeItem(STORAGE_KEYS.view)
    const nav = await render()
    expect(topics(nav)).toHaveLength(3)
  })

  it("groups by topic:  a band per used topic with its count, a tag under each of its topics", async () => {
    const nav = await render(`view="topics"`)
    const bands = topics(nav)
    expect(bands.map((band) => band.getAttribute("data-page"))).toEqual([
      "topic:buttons",
      "topic:forms",
      "topic:date & time"
    ])
    expect(bands.map((band) => band.getAttribute("count"))).toEqual(["3", "3", "1"])
    expect(bands[0]!.hasAttribute("open")).toBe(false)
    expect(links(nav, "topic:")).toEqual([])
  })

  it("opens and closes a topic, remembered", async () => {
    const nav = await render(`view="topics"`)
    await clickRow(nav, "topic:forms")
    expect(links(nav, "topic:")).toEqual(["ui-calendar", "ui-checkbox", "ui-input"])
    expect(row(nav, "topic:forms").hasAttribute("open")).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.openTopics)!)).toEqual(["forms"])

    const again = await render(`view="topics"`)
    expect(links(again, "topic:")).toEqual(["ui-calendar", "ui-checkbox", "ui-input"])
    await clickRow(again, "topic:forms")
    expect(links(again, "topic:")).toEqual([])
    expect(localStorage.getItem(STORAGE_KEYS.openTopics)).toBeNull()
  })

  it("opens the current page's first topic, unremembered;  closing it sticks", async () => {
    const nav = await render(`view="topics" current="ui-calendar"`)
    expect(links(nav, "topic:")).toEqual(["ui-calendar", "ui-checkbox", "ui-input"])
    expect(localStorage.getItem(STORAGE_KEYS.openTopics)).toBeNull()
    await clickRow(nav, "topic:forms")
    expect(links(nav, "topic:")).toEqual([])
  })

  it("switches views with the A-Z / Topics buttons:  `ui-changed`, reflected, remembered", async () => {
    const nav = await render()
    const views: string[] = []
    nav.addEventListener("ui-changed", (event) => views.push((event as CustomEvent<{ view: string }>).detail.view))
    const az = find(nav, '[data-nav-view="az"]')
    expect(az.shadowRoot!.querySelector("button")!.getAttribute("aria-pressed")).toBe("true")

    await click(nav, '[data-nav-view="topics"]')
    expect(views).toEqual(["topics"])
    expect(nav.getAttribute("view")).toBe("topics")
    expect(localStorage.getItem(STORAGE_KEYS.view)).toBe("topics")
    expect(topics(nav)).toHaveLength(3)
    expect(az.shadowRoot!.querySelector("button")!.getAttribute("aria-pressed")).toBe("false")

    // the pressed button stays pressed
    await click(nav, '[data-nav-view="topics"]')
    expect(views).toEqual(["topics"])
    const topicsButton = find(nav, '[data-nav-view="topics"]')
    expect(topicsButton.shadowRoot!.querySelector("button")!.getAttribute("aria-pressed")).toBe("true")

    nav.remove()
    const again = await render()
    expect(topics(again)).toHaveLength(3)
  })
})

describe("<ui-docs-nav> folding groups", () => {
  it("folds a group away from its band, remembered", async () => {
    const nav = await render()
    expect(row(nav, "group:start").hasAttribute("open")).toBe(true)
    await clickRow(nav, "group:start")
    expect(row(nav, "group:start").hasAttribute("open")).toBe(false)
    expect(links(nav)).not.toContain("getting-started")
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.closedGroups)!)).toEqual(["start"])

    const again = await render()
    expect(row(again, "group:start").hasAttribute("open")).toBe(false)
    await clickRow(again, "group:start")
    expect(links(again)).toContain("getting-started")
    expect(localStorage.getItem(STORAGE_KEYS.closedGroups)).toBeNull()
  })

  it("opens a folded Components group while searching, unremembered;  clearing folds it again", async () => {
    localStorage.setItem(STORAGE_KEYS.closedGroups, JSON.stringify(["components"]))
    const nav = await render()
    expect(links(nav, "group:components")).toEqual([])
    await search(nav, "inp")
    expect(links(nav, "group:components")).toEqual(["ui-input"])
    await clickRow(nav, "group:components")
    expect(links(nav, "group:components")).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.closedGroups)!)).toEqual(["components"])
    await search(nav, "")
    expect(links(nav, "group:components")).toEqual([])
  })

  it("is `settled` once the list is ready and the current page revealed", async () => {
    const nav = await render(`current="ui-input"`)
    expect(nav.matches(":state(settled)")).toBe(true)
  })
})

////////////////
// ## Search and favourites
////////////////

describe("<ui-docs-nav> search", () => {
  it.each([
    ["butt", ["ui-button", "ui-buttons", "ui-checkbox"]],
    ["UI-INPUT", ["ui-input"]],
    ["text field", ["ui-input"]],
    ["date time", ["ui-calendar"]],
    ["Date & Time", ["ui-calendar"]]
  ])("matches name, tag, other names and topics:  %j", async (text, tags) => {
    const nav = await render()
    await search(nav, text)
    expect(links(nav, "group:components")).toEqual(tags)
    expect(row(nav, "group:components").getAttribute("count")).toBe(String(tags.length))
    expect(nav.matches(":state(searching)")).toBe(true)
    expect(find(nav, "[role=status]").textContent).toBe(
      tags.length === 1 ? "1 component matches" : `${tags.length} components match`
    )
  })

  it("says when nothing matches, and restores everything when cleared", async () => {
    const nav = await render()
    await search(nav, "zzz")
    expect(links(nav, "group:components")).toEqual([])
    expect(nav.matches(":state(empty)")).toBe(true)
    expect(find(nav, ".empty").textContent).toBe("No components match")
    await search(nav, "")
    expect(links(nav, "group:components")).toHaveLength(5)
    expect(nav.matches(":state(searching)")).toBe(false)
    expect(find(nav, "[role=status]").textContent).toBe("")
  })

  it("opens every topic with a match while searching;  a toggle closes one for this search only", async () => {
    const nav = await render(`view="topics"`)
    await search(nav, "cal")
    expect(topics(nav).map((topic) => topic.getAttribute("data-page"))).toEqual(["topic:forms", "topic:date & time"])
    expect(links(nav, "topic:")).toEqual(["ui-calendar", "ui-calendar"])
    await clickRow(nav, "topic:forms")
    expect(links(nav, "topic:")).toEqual(["ui-calendar"])
    expect(localStorage.getItem(STORAGE_KEYS.openTopics)).toBeNull()
    await search(nav, "")
    expect(links(nav, "topic:")).toEqual([])
  })

  it("focuses the search box on `/`, unless typing in a field", async () => {
    const nav = await render()
    const field = Fixture.render<HTMLInputElement>(`<input type="text">`)
    field.focus()
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, composed: true }))
    expect(document.activeElement).toBe(field)
    field.blur()
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }))
    expect(nav.shadowRoot!.activeElement).toBe(find(nav, "[part~=search]"))
  })
})

describe("<ui-docs-nav> favourites", () => {
  it("stars a component:  Favourites on top, remembered, `ui-starred`, the star pressed", async () => {
    const nav = await render()
    const events: unknown[] = []
    nav.addEventListener("ui-starred", (event) => {
      const { tag, favorite, favorites } = (event as CustomEvent).detail
      events.push({ tag, favorite, favorites })
    })
    await star(nav, "ui-input")
    expect(links(nav, "group:favorites")).toEqual(["ui-input"])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)!)).toEqual(["ui-input"])
    expect(events).toEqual([{ tag: "ui-input", favorite: true, favorites: ["ui-input"] }])
    expect(nav.favorites).toEqual(["ui-input"])
    const button = starOf(nav, "ui-input").shadowRoot!.querySelector("button")!
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(button.getAttribute("aria-label")).toBe("Remove Input from favourites")

    // un-starred from Favourites:  its band goes, the star below is off again
    await star(nav, "favorite:ui-input")
    expect(bands(nav)).not.toContain("Favourites")
    expect(localStorage.getItem(STORAGE_KEYS.favorites)).toBeNull()
    expect(starOf(nav, "ui-input").shadowRoot!.querySelector("button")!.getAttribute("aria-pressed")).toBe("false")
  })

  it("restores stored favourites, dropping unknown tags;  search filters them too", async () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(["ui-input", "ui-gone", "ui-button"]))
    const nav = await render()
    expect(links(nav, "group:favorites")).toEqual(["ui-button", "ui-input"])
    await search(nav, "inp")
    expect(links(nav, "group:favorites")).toEqual(["ui-input"])
  })

  it("works without storage:  nothing persists, nothing throws", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied")
    })
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied")
    })
    onTestFinished(() => {
      getItem.mockRestore()
      setItem.mockRestore()
    })
    const nav = await render(`view="az"`)
    await star(nav, "ui-input")
    expect(links(nav, "group:favorites")).toEqual(["ui-input"])
  })
})

////////////////
// ## Navigation and scrolling
////////////////

describe("<ui-docs-nav> navigation and scrolling", () => {
  it("fires a cancelable `ui-navigating` for a plain click on a link, and only its own", async () => {
    const nav = await render()
    const seen: string[] = []
    const outside: unknown[] = []
    nav.addEventListener("ui-navigating", (event) => {
      const { page, href } = (event as CustomEvent<{ page: string; href: string }>).detail
      seen.push(`${page} ${new URL(href, location.href).hash}`)
      event.preventDefault()
    })
    document.addEventListener("ui-navigating", (event) => outside.push(event.target), { once: true })
    const before = location.href
    await clickRow(nav, "ui-input")
    expect(seen).toEqual(["ui-input #/components/ui-input.html"])
    expect(outside).toEqual([nav])
    expect(location.href).toBe(before)
  })

  it("scrolls the current page's row into view inside the panel's list, never the page", async () => {
    const page = window.scrollY
    const nav = await render(
      "",
      `<ui-docs-nav base="#/" current="ui-input" style="--ui-docs-nav-height: 260px"></ui-docs-nav>`
    )
    expect(find(nav, "[part~=nav]").getBoundingClientRect().height).toBe(260)
    const box = find(nav, "[part~=menu]")
    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight)
    nav.revealCurrent()
    await settle(nav)
    const item = row(nav, "ui-input").getBoundingClientRect()
    const port = box.getBoundingClientRect()
    expect(item.top).toBeGreaterThanOrEqual(port.top)
    expect(item.top).toBeLessThanOrEqual(port.bottom)
    expect(box.scrollTop).toBeGreaterThan(0)
    expect(window.scrollY).toBe(page)
  })

  it("puts slotted header / footer content in boxes of their own", async () => {
    const nav = await render(
      "",
      `<ui-docs-nav base="#/"><b slot="header">Spell UI</b><i slot="footer">v1</i></ui-docs-nav>`
    )
    const slots = [...nav.shadowRoot!.querySelectorAll<HTMLSlotElement>(".slotted slot")]
    expect(slots.map((slot) => slot.assignedElements()[0]!.textContent)).toEqual(["Spell UI", "v1"])
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-docs-nav> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    for (const nav of root.querySelectorAll<DOMDocsNavElement>("ui-docs-nav")) {
      await nav.listed
      await settle(nav)
    }
    await expectAccessible(root)
  })

  it("axe passes on the topics view, searching, with a favourite", async () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(["ui-input"]))
    const nav = await render(`view="topics" current="ui-input"`)
    await search(nav, "in")
    await expectAccessible(nav)
  })
})
