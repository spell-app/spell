import { describe, expect, test } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { UISiteBreadcrumbs, type SiteBreadcrumbsPage } from "spell/ui/components/ui-site-breadcrumbs"

/** A site:  a group of pages, a page with a parameter, a page with no `href`, a favourite (a copy). */
const PAGES: SiteBreadcrumbsPage[] = [
  {
    title: "Favourites",
    id: "group:Favourites",
    band: "group",
    pages: [{ title: "Systems", href: "/systems", id: "fav", copyOf: "/systems" }]
  },
  {
    title: "Hardware",
    id: "group:Hardware",
    band: "group",
    pages: [{ title: "Machines", href: "/machines", pages: [{ title: "Systems", href: "/systems" }] }]
  },
  {
    title: "Films",
    href: "/films",
    pages: [{ title: "Film", href: "/films/:film", pages: [{ title: "Cast", href: "/cast" }] }]
  },
  { title: "Help", pages: [{ title: "About", href: "/about" }] }
]

/** Site breadcrumbs in the page, showing `current`. */
async function siteBreadcrumbs(current: string) {
  const host = await ElementFixture.render(`<ui-site-breadcrumbs current="${current}"></ui-site-breadcrumbs>`)
  host.setAttribute("pages", JSON.stringify(PAGES))
  await ShadowTree.settle(host)
  return host
}

/** Each crumb:  what it says, its `link`, and whether it's the page shown. */
function crumbs(host: Element): { title: string; link?: string; shown?: true }[] {
  return [...host.shadowRoot!.querySelectorAll("ui-breadcrumb")].map((crumb) => ({
    title: crumb.textContent!.trim(),
    ...(crumb.hasAttribute("link") && { link: crumb.getAttribute("link")! }),
    ...(crumb.hasAttribute("selected") && { shown: true as const })
  }))
}

describe("<ui-site-breadcrumbs>", () => {
  test("defines its tag", () => {
    expect(UISiteBreadcrumbs.describe().tag).toBe("ui-site-breadcrumbs")
  })

  test("draws the way to the page shown:  the group's name, each page above a link, the page shown selected", async () => {
    const host = await siteBreadcrumbs("/systems")
    expect(crumbs(host)).toEqual([
      { title: "Hardware" },
      { title: "Machines", link: "/machines" },
      { title: "Systems", shown: true }
    ])
    const machines = host.shadowRoot!.querySelectorAll("ui-breadcrumb")[1]!
    expect(machines.shadowRoot!.querySelector("a")!.getAttribute("href")).toBe("/machines")
    expect(host.shadowRoot!.querySelector("ui-breadcrumbs")!.getAttribute("aria-label")).toBe("Where you are")
    await expectAccessible(host)
  })

  test("a page above with a parameter, or with no `href`, is only its name", async () => {
    expect(crumbs(await siteBreadcrumbs("/cast"))).toEqual([
      { title: "Films", link: "/films" },
      { title: "Film" },
      { title: "Cast", shown: true }
    ])
    expect(crumbs(await siteBreadcrumbs("/about"))).toEqual([{ title: "Help" }, { title: "About", shown: true }])
  })

  test("a page not among the pages draws nothing, and takes no room", async () => {
    const host = await siteBreadcrumbs("/missing")
    expect(crumbs(host)).toEqual([])
    expect(host.matches(":state(empty)")).toBe(true)
    expect(getComputedStyle(host).display).toBe("none")
  })

  test("without `pages`, follows the site navigation around it, as it changes", async () => {
    const site = await ElementFixture.render(
      `<div><ui-site-nav current="/systems"></ui-site-nav><header><ui-site-breadcrumbs></ui-site-breadcrumbs></header></div>`
    )
    const nav = site.querySelector("ui-site-nav")!
    nav.setAttribute("pages", JSON.stringify(PAGES))
    const host = site.querySelector("ui-site-breadcrumbs")!
    await ShadowTree.settle(host)
    expect(crumbs(host).map((crumb) => crumb.title)).toEqual(["Hardware", "Machines", "Systems"])
    nav.setAttribute("current", "/films")
    await ShadowTree.settle(host)
    expect(crumbs(host)).toEqual([{ title: "Films", shown: true }])
  })

  test("`label` names the trail", async () => {
    const host = await siteBreadcrumbs("/films")
    host.setAttribute("label", "Breadcrumb")
    await ShadowTree.settle(host)
    expect(host.shadowRoot!.querySelector("ui-breadcrumbs")!.getAttribute("aria-label")).toBe("Breadcrumb")
  })
})
