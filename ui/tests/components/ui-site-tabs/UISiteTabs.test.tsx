import { describe, expect, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UISiteTabs, type SiteTabsPage } from "spell/ui/components/ui-site-tabs"

/** A site:  Button (its tabs say Usage ...), Divider with no sub-pages, a page with a parameter, a group of pages. */
const PAGES: SiteTabsPage[] = [
  {
    title: "Button",
    tab: "Usage",
    href: "/button",
    id: "button page",
    pages: [
      { title: "Examples", href: "/button/examples" },
      { title: "API", href: "/button/api", id: "button api" },
      { title: "Theming", href: "/button/theming" }
    ]
  },
  { title: "Divider", href: "/divider" },
  {
    title: "Films",
    href: "/films",
    pages: [
      { title: "Film", href: "/films/:film" },
      { title: "Stars", href: "/films/stars" }
    ]
  },
  {
    title: "Help",
    pages: [
      { title: "About", href: "/about" },
      { title: "Contact", href: "/contact" }
    ]
  },
  { title: "Lonely", pages: [{ title: "Only", href: "/only" }] }
]

/** Site tabs in the page, showing `current`, at `width` pixels wide. */
async function siteTabs({ current = "/button/api", width = 700 }: { current?: string; width?: number } = {}) {
  const host = await ElementFixture.render(
    `<ui-site-tabs current="${current}" style="width: ${width}px"></ui-site-tabs>`
  )
  host.setAttribute("pages", JSON.stringify(PAGES))
  await settleDeep(host)
  return host
}

/** The tabs' items, in order. */
function items(host: Element): HTMLElement[] {
  return [...host.shadowRoot!.querySelectorAll<HTMLElement>("ui-item")]
}

/** What each tab says. */
function words(host: Element): string[] {
  return items(host).map((item) => item.textContent!.trim())
}

/** The tab saying `word`'s link, in its shadow DOM. */
function link(host: Element, word: string): HTMLAnchorElement {
  const item = items(host).find((each) => each.textContent!.trim() === word)!
  return item.shadowRoot!.querySelector("a")!
}

/** The selected tab's word. */
function selected(host: Element): string[] {
  return items(host)
    .filter((item) => item.hasAttribute("selected"))
    .map((item) => item.textContent!.trim())
}

/** The menu's box, the row of tabs. */
function row(host: Element): HTMLElement {
  return host.shadowRoot!.querySelector("ui-menu")!.shadowRoot!.querySelector<HTMLElement>('[part~="menu"]')!
}

describe("<ui-site-tabs>", () => {
  test("defines its tag", () => {
    expect(UISiteTabs.describe().tag).toBe("ui-site-tabs")
  })

  test("draws the shown page's family as tabs:  the parent first, the shown page selected", async () => {
    const host = await siteTabs()
    expect(words(host)).toEqual(["Usage", "Examples", "API", "Theming"])
    expect(selected(host)).toEqual(["API"])
    expect(link(host, "Usage").getAttribute("href")).toBe("/button")
    expect(link(host, "API").getAttribute("aria-current")).toBe("page")
    expect(host.shadowRoot!.querySelector("ui-menu")!.getAttribute("aria-label")).toBe("Button")
    await expectAccessible(host)
  })

  test("the parent page shown draws the family too, and the shown page may be named by its `id`", async () => {
    const parent = await siteTabs({ current: "/button" })
    expect(selected(parent)).toEqual(["Usage"])
    const byId = await siteTabs({ current: "button api" })
    expect(selected(byId)).toEqual(["API"])
  })

  test("a tab says its page's `title` without a `tab`, and every page in the family is a real link", async () => {
    const host = await siteTabs({ current: "/films/stars" })
    expect(words(host)).toEqual(["Films", "Stars"])
    expect(link(host, "Stars").localName).toBe("a")
    expect(link(host, "Films").getAttribute("href")).toBe("/films")
  })

  test("draws nothing for a page with no family, and takes no room", async () => {
    const host = await siteTabs({ current: "/divider" })
    expect(items(host)).toEqual([])
    expect(host.matches(":state(empty)")).toBe(true)
    expect(getComputedStyle(host).display).toBe("none")
  })

  test("draws nothing for a page with a parameter, and leaves one out of a family", async () => {
    expect(items(await siteTabs({ current: "/films/:film" }))).toEqual([])
    expect(words(await siteTabs({ current: "/films" }))).toEqual(["Films", "Stars"])
  })

  test("a parent with no `href` has no tab;  a family left with one tab draws nothing", async () => {
    expect(words(await siteTabs({ current: "/about" }))).toEqual(["About", "Contact"])
    expect(items(await siteTabs({ current: "/only" }))).toEqual([])
  })

  test("a new `current` moves the selected tab", async () => {
    const host = await siteTabs()
    host.setAttribute("current", "/button/examples")
    await settleDeep(host)
    expect(selected(host)).toEqual(["Examples"])
  })

  test("a click asks `ui-navigating`:  cancelled, nothing moves and the link isn't followed", async () => {
    const host = await siteTabs()
    const navigating = vi.fn((event: Event) => event.preventDefault())
    const choosing = vi.fn()
    host.addEventListener("ui-navigating", navigating)
    host.addEventListener("ui-choosing", choosing)
    const click = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true })
    link(host, "Usage").dispatchEvent(click)
    await settleDeep(host)
    expect(navigating).toHaveBeenCalledOnce()
    const { detail } = navigating.mock.calls[0]![0] as CustomEvent<{ href: string; page: SiteTabsPage }>
    expect(detail.href).toBe("/button")
    expect(detail.page.title).toBe("Button")
    expect(click.defaultPrevented).toBe(true)
    // the menu's own selecting stays inside:  `current` says what's selected
    expect(choosing).not.toHaveBeenCalled()
    expect(selected(host)).toEqual(["API"])
  })

  test("`ui-navigating` not cancelled:  the browser follows the link", async () => {
    const host = await ElementFixture.render(`<ui-site-tabs current="#a" style="width: 500px"></ui-site-tabs>`)
    host.setAttribute(
      "pages",
      JSON.stringify([{ title: "A", href: "#a", pages: [{ title: "B", href: "#b" }] }] satisfies SiteTabsPage[])
    )
    await settleDeep(host)
    const navigating = vi.fn()
    host.addEventListener("ui-navigating", navigating)
    const click = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true })
    link(host, "B").dispatchEvent(click)
    expect(navigating).toHaveBeenCalledOnce()
    expect(click.defaultPrevented).toBe(false)
  })

  test("a click with Command held opens elsewhere:  no `ui-navigating`, and the link is left to the browser", async () => {
    const host = await siteTabs()
    const navigating = vi.fn()
    host.addEventListener("ui-navigating", navigating)
    const click = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, metaKey: true })
    // stops the browser opening a real tab under the test
    host.addEventListener("click", (event) => event.preventDefault(), { once: true })
    link(host, "Usage").dispatchEvent(click)
    expect(navigating).not.toHaveBeenCalled()
  })

  test("tabs that don't fit stay on ONE row and scroll sideways, the selected one scrolled into sight", async () => {
    const host = await siteTabs({ current: "/button/theming", width: 160 })
    const box = row(host)
    expect(box.scrollWidth).toBeGreaterThan(box.clientWidth)
    const tops = words(host).map((word) => Math.round(link(host, word).getBoundingClientRect().top))
    expect(new Set(tops).size).toBe(1)
    await expect.poll(() => box.scrollLeft).toBeGreaterThan(0)
    const chosen = link(host, "Theming").getBoundingClientRect()
    const view = box.getBoundingClientRect()
    expect(chosen.right).toBeLessThanOrEqual(view.right + 1)
  })

  test("takes the look of the notebook tab bars:  a segmented, equal-width menu filling its row", async () => {
    const host = await siteTabs({ width: 800 })
    const menu = host.shadowRoot!.querySelector("ui-menu")!
    expect(menu.getAttribute("appearance")).toBe("segmented")
    expect(menu.getAttribute("align")).toBe("fluid")
    expect(menu.hasAttribute("equal")).toBe(true)
    expect(row(host).getBoundingClientRect().width).toBeCloseTo(800, 0)
    const widths = words(host).map((word) => link(host, word).getBoundingClientRect().width)
    // one word's text may be wider than an equal share, never by much at this width
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(8)
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
    await Promise.all(hosts.flatMap((each) => (each as Element & { ready?: Promise<unknown> }).ready ?? []))
    await ElementFixture.settle()
  }
}
