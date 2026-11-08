import { describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { PrefStore } from "spell/util/persist/PrefStore"
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

/** Wait for every element in `host`'s shadow tree, all the way down. */
async function settleDeep(host: Element) {
  for (let round = 0; round < 4; round++) {
    const hosts: Element[] = []
    const walk = (root: ShadowRoot | null) => {
      for (const element of root?.querySelectorAll("*") ?? []) {
        hosts.push(element)
        walk(element.shadowRoot)
      }
    }
    walk(host.shadowRoot)
    const ready = hosts.flatMap((each) => {
      const waited = (each as Element & { ready?: Promise<unknown> }).ready
      return waited ? [waited] : []
    })
    await Promise.all(ready)
    await ElementFixture.settle()
  }
}

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
    await settleDeep(host)
    const star = row(host, "Input").querySelector<HTMLElement>(":scope > .star")!
    star.shadowRoot!.querySelector("button")!.click()
    expect(starred).toHaveBeenCalledWith(true)
    expect(navigating).not.toHaveBeenCalled()
    await expectAccessible(host)
  })

  it("reveals the shown page's row in whatever scrolls it", async () => {
    const pages = Array.from({ length: 40 }, (_, index) => ({ title: `Page ${index}`, href: `#/p${index}` }))
    const box = (await ElementFixture.render(
      `<div style="height: 120px; overflow: auto"><ui-site-nav current="#/p35"></ui-site-nav></div>`
    )) as HTMLElement
    const host = box.querySelector<HTMLElement & { revealCurrent(): void }>("ui-site-nav")!
    host.setAttribute("pages", JSON.stringify(pages))
    await settleDeep(host)
    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight)
    host.revealCurrent()
    await ElementFixture.settle()
    expect(box.scrollTop).toBeGreaterThan(0)
  })
})
