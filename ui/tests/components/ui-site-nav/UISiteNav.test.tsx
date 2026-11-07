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
