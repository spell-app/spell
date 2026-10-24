import { describe, expect, it } from "vite-plus/test"

// the leaf, not the barrel:  `SiteHeader` extends `HTMLElement`, which node lacks
import {
  SCHEME_CLASSES,
  componentSet,
  docsArea,
  forcedScheme,
  litTab,
  type SiteTab
} from "spell/server/site/site.types"

/**
 * Tabs of a made-up site, as a page server's settings would name them (`"siteTabs"`):  the header names none itself.
 * - spell-app's own, and the pages they light:  its `tests/page-server/src/siteTabs.test.ts`
 */
const TABS: SiteTab[] = [
  { name: "Notes", path: "notes/index.html", areas: ["notes"] },
  { name: "Logs", path: "logs/index.html", areas: ["logs", "old-logs"] },
  { name: "Kit", path: "/components/kit/", serverOnly: true, sets: ["kit"], paths: ["/kit/docs/"] },
  { name: "Tool", path: "/tool/", serverOnly: true, ownTab: true, paths: ["^/tool(/|$)"] },
  { name: "Shop", path: "shop/index.html", areas: ["shop"], sets: ["shop"] }
]

describe("litTab():  the tab the site header lights, from its tabs' data", () => {
  it.each([
    // a docs area:  any of the tab's `areas`
    ["/notes/index.html", "Notes"],
    ["/notes/deep/page.html", "Notes"],
    ["/old-logs/2026/x.html", "Logs"],
    // the first area folder in the path wins, whatever the tabs' order
    ["/shop/notes/x.html", "Shop"],
    ["/notes/shop/x.html", "Notes"],
    // a component set:  its address, a worktree's;  and a folder its tab names (`paths`)
    ["/components/kit/", "Kit"],
    ["/components/kit", "Kit"],
    ["/components/kit/kit-card.html", "Kit"],
    ["/worktrees/w/components/kit/kit-card.html", "Kit"],
    ["/Users/me/repo/kit/docs/kit-card.html", "Kit"],
    // `sets` and `paths` before any area:  a set's folder inside a folder named like an area
    ["/notes/kit/docs/kit-card.html", "Kit"],
    // a set with no tab of its own lights the tab naming it (`sets`), beside that tab's area
    ["/components/shop/shop-cart.html", "Shop"],
    ["/shop/index.html", "Shop"],
    // a path pattern
    ["/tool/", "Tool"],
    ["/tool", "Tool"],
    ["/toolbox/x.html", undefined],
    // a set no tab names:  none, never an area under it
    ["/components/other/notes/x.html", undefined],
    // a worktree's pages:  read inside the worktree, whatever it's called
    ["/worktrees/notes/logs/x.html", "Logs"],
    ["/Users/me/repo/.claude/worktrees/notes/shop/x.html", "Shop"],
    // from disk
    ["/Users/me/repo/notes/x.html", "Notes"],
    // no area folder, or a FILE named like one:  none
    ["/home/index.html", undefined],
    ["/x/notes", undefined]
  ])("lights %s:  %s", (path, tab) => {
    expect(litTab(TABS, path)?.name).toBe(tab)
  })

  it("lights nothing with no tabs:  a page whose server and bundle name none", () => {
    expect(litTab([], "/notes/x.html")).toBeUndefined()
  })
})

describe("componentSet() and docsArea()", () => {
  it("componentSet():  the set at a page's address, `/components/<id>/`, a worktree's too", () => {
    expect(componentSet("/components/ui/ui-card.html")).toBe("ui")
    expect(componentSet("/worktrees/w/components/epics/")).toBe("epics")
    expect(componentSet("/components")).toBeUndefined()
    expect(componentSet("/x/components/ui/ui-card.html")).toBeUndefined()
  })

  it("docsArea():  the first of `areas` among the path's folders;  none in a component set", () => {
    const areas = ["epics", "templates"]
    expect(docsArea("/templates/epics/plan.html", areas)).toBe("templates")
    expect(docsArea("/epics/templates/x.html", areas)).toBe("epics")
    expect(docsArea("/guides/x.html", areas)).toBeUndefined()
    expect(docsArea("/components/epics/templates/x.html", areas)).toBeUndefined()
  })
})

/** A class list holding `names`, as `<html>`'s `classList` answers `contains()`. */
function classes(...names: string[]) {
  return { contains: (token: string) => names.includes(token) }
}

describe("forcedScheme()", () => {
  it("reads the scheme `<html>`'s classes force:  what the site header's icon shows", () => {
    expect(forcedScheme(classes(SCHEME_CLASSES.dark))).toBe("dark")
    expect(forcedScheme(classes("ui-typography", SCHEME_CLASSES.light))).toBe("light")
  })

  it("is `undefined` with neither class:  the page follows the OS", () => {
    expect(forcedScheme(classes())).toBeUndefined()
    expect(forcedScheme(classes("ui-typography"))).toBeUndefined()
  })

  it("keeps Spell UI's class names, which pages switch themselves", () => {
    expect(SCHEME_CLASSES).toEqual({ light: "ui-light", dark: "ui-dark" })
  })
})
