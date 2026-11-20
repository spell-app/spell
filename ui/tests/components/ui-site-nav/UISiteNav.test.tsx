import { describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { PrefStore } from "spell/util/persist/PrefStore"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { UISiteNav, type SiteNavPage } from "spell/ui/components/ui-site-nav"

/** A site:  Films (Film), People (Person), and Help, which only holds pages (About). */
const PAGES: SiteNavPage[] = [
  { title: "Films", href: "/films", pages: [{ title: "Film", href: "/films/1", id: "film page" }] },
  { title: "People", href: "/people", pages: [{ title: "Person", href: "/people/1" }] },
  { title: "Help", pages: [{ title: "About", href: "/about" }] }
]

/** A site nav in the page, showing `current`, keeping its open pages under `remember` if given. */
async function siteNav({ current = "/films/1", remember }: { current?: string; remember?: string } = {}) {
  const host = (await ElementFixture.render(
    `<ui-site-nav current="${current}" ${remember ? `remember="${remember}"` : ""} style="width: 300px"></ui-site-nav>`
  )) as HTMLElement & { pages?: unknown }
  host.setAttribute("pages", JSON.stringify(PAGES))
  await ElementFixture.settle()
  return host
}

/** The row titled `title`, in the nav's shadow tree. */
function row(host: HTMLElement, title: string): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>(`ui-tree-item[label="${title}"]`)!
}

/** The titles of the rows on screen, in order. */
function onScreen(host: HTMLElement): string[] {
  return [...host.shadowRoot!.querySelectorAll<HTMLElement>("ui-tree-item")]
    .filter((item) => item.checkVisibility())
    .map((item) => item.getAttribute("label")!)
}

/** A click on `title`'s row. */
function click(host: HTMLElement, title: string) {
  const box = row(host, title).shadowRoot!.querySelector<HTMLElement>('[part~="label"]')!
  box.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
}

describe("<ui-site-nav>", () => {
  it("defines its tag", () => {
    expect(UISiteNav.describe().tag).toBe("ui-site-nav")
  })

  it("lists the pages as a tree, the shown page marked and the pages it's under open", async () => {
    const host = await siteNav()
    expect(onScreen(host)).toEqual(["Films", "Film", "People", "Help"])
    expect(row(host, "Film").hasAttribute("selected")).toBe(true)
    expect(row(host, "Film").getAttribute("aria-current")).toBe("page")
    expect(row(host, "Films").hasAttribute("selected")).toBe(false)
    expect(row(host, "Help").hasAttribute("group")).toBe(true)
    await expectAccessible(host)
  })

  it("knows the shown page by its id too", async () => {
    const host = await siteNav({ current: "film page" })
    expect(row(host, "Film").hasAttribute("selected")).toBe(true)
  })

  it("a link out to another site is never the page shown, whatever its path (old-console-redo I25)", async () => {
    const host = (await ElementFixture.render(
      `<ui-site-nav current="${location.pathname}" style="width: 300px"></ui-site-nav>`
    )) as HTMLElement
    host.setAttribute(
      "pages",
      JSON.stringify([
        { title: "Home", href: location.pathname },
        { title: "Help", href: `https://docs.example.com${location.pathname}` }
      ])
    )
    await ElementFixture.settle()
    expect(row(host, "Home").hasAttribute("selected")).toBe(true)
    expect(row(host, "Help").hasAttribute("selected")).toBe(false)
  })

  it("goes to a picked page, asking first with `ui-navigating`;  the tree's own selecting is left to `current`", async () => {
    const host = await siteNav()
    const navigating = vi.fn((event: Event) => event.preventDefault())
    host.addEventListener("ui-navigating", navigating)
    click(host, "People")
    await ElementFixture.settle()
    expect(navigating).toHaveBeenCalledOnce()
    const { detail } = navigating.mock.calls[0]![0] as CustomEvent<{ href: string; page: SiteNavPage }>
    expect(detail.href).toBe("/people")
    expect(detail.page.title).toBe("People")
    // cancelled:  the browser stays, and the shown page is still the one marked
    expect(row(host, "People").hasAttribute("selected")).toBe(false)
    expect(row(host, "Film").hasAttribute("selected")).toBe(true)
  })

  it("a page that only holds pages opens and closes, and goes nowhere", async () => {
    const host = await siteNav()
    const navigating = vi.fn((event: Event) => event.preventDefault())
    host.addEventListener("ui-navigating", navigating)
    click(host, "Help")
    await ElementFixture.settle()
    expect(navigating).not.toHaveBeenCalled()
    expect(onScreen(host)).toContain("About")
  })

  it("with `remember`, keeps the pages a person opened for next time", async () => {
    const key = `test-${Math.random().toString(36).slice(2)}`
    const first = await siteNav({ remember: key })
    row(first, "People").shadowRoot!.querySelector<HTMLElement>('[part~="toggle"]')!.click()
    await ElementFixture.settle()
    expect(onScreen(first)).toContain("Person")
    expect(PrefStore.getAt(`ui-site-nav:${key}`)).toEqual({ "/people": true })
    first.remove()
    const again = await siteNav({ remember: key })
    expect(onScreen(again)).toContain("Person")
    PrefStore.setAt(`ui-site-nav:${key}`, undefined)
  })
})

describe("<ui-site-nav> pages' extras", () => {
  /** A nav of `pages`, showing `current`, in `appearance` if given. */
  async function navOf(pages: SiteNavPage[], { current = "", appearance = "" } = {}) {
    const host = (await ElementFixture.render(
      `<ui-site-nav current="${current}" ${appearance ? `appearance="${appearance}"` : ""}></ui-site-nav>`
    )) as HTMLElement
    host.setAttribute("pages", JSON.stringify(pages))
    await ElementFixture.settle()
    return host
  }

  it("keeps a row's element across new `pages`, so its focus stays and its rows can ease", async () => {
    const pages: SiteNavPage[] = [
      { title: "Films", id: "films", open: true, pages: [{ title: "Film", href: "/film" }] }
    ]
    const host = await navOf(pages)
    const before = row(host, "Films")
    host.setAttribute("pages", JSON.stringify([{ ...pages[0]!, open: false, title: "All films" }]))
    await ElementFixture.settle()
    const after = host.shadowRoot!.querySelector('[data-page="films"]')!
    expect(after).toBe(before)
    expect(after.getAttribute("label")).toBe("All films")
    expect(after.hasAttribute("open")).toBe(false)
  })

  it("marks a `copyOf` page as shown whenever its original is, but reveals only the original", async () => {
    const host = await navOf(
      [
        { title: "Favourite", id: "favorite:films", copyOf: "films", href: "/a" },
        { title: "Films", id: "films", href: "/b" }
      ],
      { current: "films" }
    )
    expect(row(host, "Favourite").hasAttribute("selected")).toBe(true)
    expect(row(host, "Favourite").getAttribute("aria-current")).toBe("page")
    expect(row(host, "Favourite").hasAttribute("data-current")).toBe(false)
    expect(row(host, "Films").hasAttribute("data-current")).toBe(true)
  })

  it("shows a page's `slot` inside it, after its pages, and it can open with no pages yet", async () => {
    const host = await navOf([{ title: "Band", id: "band", band: "heading", open: true, slot: "notes", pages: [] }], {
      appearance: "nav"
    })
    const note = document.createElement("p")
    note.slot = "notes"
    note.textContent = "Loading"
    host.append(note)
    await ElementFixture.settle()
    const band = row(host, "Band")
    expect(band.hasAttribute("open")).toBe(true)
    const assigned = band.querySelector("slot")!.assignedElements()
    expect(assigned).toEqual([note])
    expect(note.getBoundingClientRect().height).toBeGreaterThan(0)
  })

  it("a page with an `href` is a real link, so a modified click is the browser's;  a plain one goes", async () => {
    const host = await navOf([{ title: "Films", href: "#/films" }])
    const link = row(host, "Films").querySelector<HTMLAnchorElement>(":scope > a")!
    expect(link.getAttribute("href")).toBe("#/films")
    expect(link.getAttribute("slot")).toBe("label")
    const seen = vi.fn((event: Event) => event.preventDefault())
    host.addEventListener("ui-navigating", seen)
    const box = row(host, "Films").shadowRoot!.querySelector<HTMLElement>('[part~="row"]')!
    box.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, metaKey: true }))
    expect(seen).not.toHaveBeenCalled()
    box.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it("draws `band`, `count` and `badge` on the rows, in the tree's `nav` look", async () => {
    const host = await navOf(
      [
        {
          title: "Components",
          band: "heading",
          count: 2,
          pages: [{ title: "Calendar", href: "#/calendar", badge: "in progress" }]
        }
      ],
      { appearance: "nav" }
    )
    const band = row(host, "Components")
    expect(band.getAttribute("band")).toBe("heading")
    expect(band.matches(":state(nav)")).toBe(true)
    expect(band.matches(":state(band)")).toBe(true)
    expect(band.shadowRoot!.querySelector('[part~="count"]')!.textContent).toBe("2")
    expect(getComputedStyle(band.shadowRoot!.querySelector('[part~="row"]')!).textTransform).toBe("uppercase")
    band.setAttribute("open", "")
    await ElementFixture.settle()
    expect(row(host, "Calendar").shadowRoot!.querySelector('[part~="badge"]')!.textContent).toBe("in progress")
  })

  it("a page's `open` wins;  a row opening or closing says which page, cancelably", async () => {
    const host = await navOf([{ title: "Help", open: false, pages: [{ title: "About", href: "#/about" }] }])
    expect(row(host, "Help").hasAttribute("open")).toBe(false)
    const seen: string[] = []
    host.addEventListener("ui-opening", (event) => {
      const { page, open } = (event as CustomEvent<{ page: SiteNavPage; open: boolean }>).detail
      seen.push(`${page.title} ${open}`)
      event.preventDefault()
    })
    click(host, "Help")
    await ElementFixture.settle()
    expect(seen).toEqual(["Help true"])
    expect(row(host, "Help").hasAttribute("open")).toBe(false)
  })

  it("a starred page has a star, which sends `ui-starred` and selects nothing", async () => {
    const host = await navOf([{ title: "Input", href: "#/input", starred: false }])
    const starred = vi.fn()
    const navigating = vi.fn()
    host.addEventListener("ui-starred", (event) => starred((event as CustomEvent).detail.starred))
    host.addEventListener("ui-navigating", navigating)
    await ShadowTree.settle(host)
    const star = row(host, "Input").querySelector<HTMLElement>(":scope > .star")!
    star.shadowRoot!.querySelector("button")!.click()
    expect(starred).toHaveBeenCalledWith(true)
    expect(navigating).not.toHaveBeenCalled()
    await expectAccessible(host)
  })

  /** Two groups, as a Spell site's `group` lines make them (epic `mockup` T34):  icons on all but Notes. */
  const GROUPS: SiteNavPage[] = [
    {
      title: "Design",
      band: "group",
      pages: [
        { title: "Explore", icon: "binoculars", href: "#/explore" },
        { title: "Notes", href: "#/notes" }
      ]
    },
    { title: "Run", band: "group", pages: [{ title: "Jobs", icon: "briefcase", href: "#/jobs" }] }
  ]

  it("a group opens by itself while it holds the page shown, with no arrow;  a click goes to its first page", async () => {
    const host = await navOf(GROUPS, { current: "#/explore", appearance: "nav" })
    const design = row(host, "Design")
    expect(design.hasAttribute("open")).toBe(true)
    expect(row(host, "Run").hasAttribute("open")).toBe(false)
    expect(getComputedStyle(design.shadowRoot!.querySelector('[part~="toggle"]')!).display).toBe("none")
    const went: string[] = []
    host.addEventListener("ui-navigating", (event) => {
      went.push((event as CustomEvent<{ href: string }>).detail.href)
      event.preventDefault()
    })
    // a shut group:  it opens, and goes to its first page
    click(host, "Run")
    await ElementFixture.settle()
    expect(went).toEqual(["#/jobs"])
    expect(row(host, "Run").hasAttribute("open")).toBe(true)
    // the group holding the page shown stays open, and goes to its first page
    click(host, "Design")
    await ElementFixture.settle()
    expect(went).toEqual(["#/jobs", "#/explore"])
    expect(design.hasAttribute("open")).toBe(true)
    // another open group closes:  both were open at once till then
    click(host, "Run")
    await ElementFixture.settle()
    expect(row(host, "Run").hasAttribute("open")).toBe(false)
    expect(went).toHaveLength(2)
  })

  it('`groups="headings"`:  each group a plain heading, always open, going nowhere;  no well, no icon, its pages in line (old-console-redo I35)', async () => {
    const withIcon: SiteNavPage[] = [{ ...GROUPS[0]!, icon: "palette" }, GROUPS[1]!]
    const host = await navOf(withIcon, { current: "#/explore", appearance: "nav" })
    host.setAttribute("groups", "headings")
    await ShadowTree.settle(host)
    expect(host.matches(":state(headings)")).toBe(true)
    // both open, though only Design holds the page shown
    expect(row(host, "Design").hasAttribute("open")).toBe(true)
    expect(row(host, "Run").hasAttribute("open")).toBe(true)
    expect(row(host, "Design").hasAttribute("icon")).toBe(false)
    const went = vi.fn((event: Event) => event.preventDefault())
    host.addEventListener("ui-navigating", went)
    click(host, "Run")
    await ElementFixture.settle()
    expect(went).not.toHaveBeenCalled()
    expect(row(host, "Run").hasAttribute("open")).toBe(true)
    // no well round a group, and its pages where a top row's would be
    expect(getComputedStyle(row(host, "Design")).outlineStyle).toBe("none")
    const page = getComputedStyle(row(host, "Explore").shadowRoot!.querySelector<HTMLElement>('[part~="row"]')!)
    // a top row's 0.75em at its 14px text, no step in
    expect(parseFloat(page.paddingInlineStart)).toBe(0.75 * parseFloat(page.fontSize))
  })

  it("its `start` slot above its pages, its `end` slot at its foot, each drawn only with something in it (old-console-redo I35)", async () => {
    const box = (await ElementFixture.render(
      `<div style="display: flex; flex-direction: column; height: 600px"><ui-site-nav appearance="nav"></ui-site-nav></div>`
    )) as HTMLElement
    const host = box.querySelector<HTMLElement>("ui-site-nav")!
    host.setAttribute("pages", JSON.stringify(GROUPS))
    await ShadowTree.settle(host)
    expect(host.shadowRoot!.querySelector('[part~="start"]')).toBeNull()
    expect(host.shadowRoot!.querySelector('[part~="end"]')).toBeNull()
    host.insertAdjacentHTML("afterbegin", '<b slot="start">Logo</b><b slot="end">Buttons</b>')
    await ShadowTree.settle(host)
    const start = host.shadowRoot!.querySelector<HTMLElement>('[part~="start"]')!
    const end = host.shadowRoot!.querySelector<HTMLElement>('[part~="end"]')!
    const nav = host.shadowRoot!.querySelector<HTMLElement>('[part~="nav"]')!
    expect(start.getBoundingClientRect().bottom).toBeLessThanOrEqual(nav.getBoundingClientRect().top)
    // at the bottom of the 600px box it fills
    expect(Math.round(end.getBoundingClientRect().bottom - box.getBoundingClientRect().top)).toBe(600)
  })

  it("a page with no icon beside pages with one keeps an icon's room;  `collapsed` shows its first letter", async () => {
    const host = await navOf(GROUPS, { current: "#/explore", appearance: "nav" })
    await ShadowTree.settle(host)
    const letter = row(host, "Notes").querySelector<HTMLElement>(':scope > [slot="icon"]')!
    expect(letter.textContent).toBe("N")
    expect(getComputedStyle(letter).visibility).toBe("hidden")
    expect(row(host, "Design").querySelector(':scope > [slot="icon"]')).toBeNull()
    host.setAttribute("collapsed", "")
    await ElementFixture.settle()
    expect(host.matches(":state(collapsed)")).toBe(true)
    expect(getComputedStyle(letter).visibility).toBe("visible")
    expect(row(host, "Explore").getAttribute("title")).toBe("Explore")
    const label = row(host, "Explore").shadowRoot!.querySelector('[part~="label"]')!
    expect(getComputedStyle(label).display).toBe("none")
  })

  it("a group's icon shows before its label, its pages 8px in, inside an open group's well;  `collapsed`, one column, the icons where they were, an iconless group a line (I20, I31, C1)", async () => {
    const withIcon: SiteNavPage[] = [{ ...GROUPS[0]!, icon: "palette" }, GROUPS[1]!]
    const host = await navOf(withIcon, { current: "#/explore", appearance: "nav" })
    await ShadowTree.settle(host)
    const rowOf = (title: string) => row(host, title).shadowRoot!.querySelector<HTMLElement>('[part~="row"]')!
    // where a row's icon starts, from the nav's edge
    const startOf = (title: string) =>
      rowOf(title).getBoundingClientRect().left -
      host.getBoundingClientRect().left +
      parseFloat(getComputedStyle(rowOf(title)).paddingInlineStart)
    expect(row(host, "Design").getAttribute("icon")).toBe("palette")
    // 8px in from its group's label at 16px text (Owen, I31:  "move the inset items 8px to the right"):  0.5em
    const textSize = parseFloat(getComputedStyle(host).fontSize)
    expect(startOf("Explore") - startOf("Design")).toBeCloseTo(textSize / 2, 1)
    // the open group a slight inset well round its label and its pages (Owen's A, I31);  a shut one, none
    // - its label on the bar's own fill, the well's fill only under it, round its pages (I32)
    const design = getComputedStyle(row(host, "Design"))
    expect(design.backgroundColor).toBe("rgba(0, 0, 0, 0)")
    expect(design.outlineStyle).toBe("solid")
    expect(parseFloat(design.borderTopLeftRadius)).toBeGreaterThan(0)
    expect(getComputedStyle(rowOf("Design")).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    const pages = row(host, "Design").shadowRoot!.querySelector<HTMLElement>('[part~="group"]')!
    expect(getComputedStyle(pages).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
    expect(pages.getBoundingClientRect().top).toBeCloseTo(rowOf("Design").getBoundingClientRect().bottom, 0)
    expect(getComputedStyle(row(host, "Run")).outlineStyle).toBe("none")
    // Run, with no icon, keeps an icon's room beside Design's
    expect(row(host, "Run").querySelector(':scope > [slot="icon"]')).not.toBeNull()
    /** The middle of a row's icon as drawn, from the nav's edge:  `<ui-icon>`'s own box takes no room. */
    const iconMiddle = (title: string) => {
      const iconHost =
        row(host, title).shadowRoot!.querySelector(".icon") ?? row(host, title).querySelector('[slot="icon"]')!
      const icon = (iconHost.shadowRoot?.querySelector(".icon") ?? iconHost).getBoundingClientRect()
      return icon.left + icon.width / 2 - host.getBoundingClientRect().left
    }
    const designIcon = iconMiddle("Design")
    host.setAttribute("collapsed", "")
    await ElementFixture.settle()
    // collapsed, a group's label's icon where it was with all of it shown (Owen, C1 on J161:  "keep the same left
    // padding in open and closed modes");  its pages no step in (I31)
    expect(iconMiddle("Design")).toBeCloseTo(designIcon, 1)
    // ... a page's within a pixel of it:  its text a little bigger than a label's
    expect(Math.abs(iconMiddle("Explore") - designIcon)).toBeLessThan(1)
    // ... the same room on both sides (Owen, I31), each icon at its row's start:  in a drawer as narrow as its icons,
    // the middle of its row
    for (const title of ["Design", "Explore"]) {
      const style = getComputedStyle(rowOf(title))
      expect(style.paddingInlineStart).toBe(style.paddingInlineEnd)
      const box = rowOf(title).getBoundingClientRect()
      // the icon as drawn:  `<ui-icon>`'s own box takes no room
      const iconHost =
        row(host, title).shadowRoot!.querySelector(".icon") ?? row(host, title).querySelector('[slot="icon"]')!
      const icon = (iconHost.shadowRoot?.querySelector(".icon") ?? iconHost).getBoundingClientRect()
      expect(icon.width).toBeGreaterThan(0)
      expect(icon.left - box.left).toBeCloseTo(parseFloat(style.paddingInlineStart), 0)
    }
    const runRow = row(host, "Run").shadowRoot!.querySelector('[part~="row"]')!
    expect(getComputedStyle(runRow).backgroundImage).toContain("gradient")
    expect(getComputedStyle(row(host, "Design").shadowRoot!.querySelector('[part~="row"]')!).backgroundImage).toBe(
      "none"
    )
  })

  it("a list with no icons keeps no icon's room", async () => {
    const host = await navOf([{ title: "Input", href: "#/input" }])
    expect(row(host, "Input").querySelector(':scope > [slot="icon"]')).toBeNull()
  })

  it("reveals the shown page's row in whatever scrolls it", async () => {
    const pages = Array.from({ length: 40 }, (_, index) => ({ title: `Page ${index}`, href: `#/p${index}` }))
    const box = (await ElementFixture.render(
      `<div style="height: 120px; overflow: auto"><ui-site-nav current="#/p35"></ui-site-nav></div>`
    )) as HTMLElement
    const host = box.querySelector<HTMLElement & { revealCurrent(): void }>("ui-site-nav")!
    host.setAttribute("pages", JSON.stringify(pages))
    await ShadowTree.settle(host)
    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight)
    host.revealCurrent()
    await ElementFixture.settle()
    expect(box.scrollTop).toBeGreaterThan(0)
  })
})
