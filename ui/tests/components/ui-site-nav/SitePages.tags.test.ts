import { describe, expect, test } from "vite-plus/test"

import { SitePages } from "spell/ui/components/ui-site-nav/SitePages"
import { SearchIndex } from "spell/ui/docs-components/ui-docs-search/SearchIndex"

const PAGES = [
  { title: "Home", href: "/" },
  { title: "Button", href: "/button", tags: ["Forms", "Basic"], pages: [{ title: "API", href: "/button/api" }] },
  { title: "Input", href: "/input", tags: ["Forms"] },
  { title: "New Thing", href: "/new", pages: [{ title: "API", href: "/new/api" }] }
]

describe("SitePages.groupedByTag()", () => {
  test("files a page under each tag, in the order given, the rest as first named", () => {
    const groups = SitePages.groupedByTag(PAGES, { order: ["Basic", "Empty"], untagged: "Other" })
    expect(groups.map((group) => [group.tag, group.pages.map((page) => page.title)])).toEqual([
      ["Basic", ["Button"]],
      ["Forms", ["Button", "Input"]],
      ["Other", ["New Thing"]]
    ])
  })

  test("a page with nothing under it and no tags isn't listed", () => {
    const titles = SitePages.groupedByTag(PAGES, { untagged: "Other" }).flatMap((group) => group.pages)
    expect(titles.map((page) => page.title)).not.toContain("Home")
  })
})

describe("new SearchIndex({ pages })", () => {
  const index = new SearchIndex({ pages: PAGES })

  test("a search for a tag finds every page with it", () => {
    const hits = index.search("forms").flatMap((group) => group.hits.map((hit) => hit.entry.href))
    expect(hits.sort()).toEqual(["/button", "/input"])
  })

  test("a search for a title finds it", () => {
    expect(index.search("input")[0]!.hits[0]!.entry).toMatchObject({ kind: "page", title: "Input", context: "Forms" })
  })
})
