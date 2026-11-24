import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { headCrumbs } from "spell/epic/tools/_assets/spell-doc-helpers.js"

/** A page's breadcrumb of `crumbs`, its markup, then the page itself;  and what its head would draw. */
function head(...crumbs: string[]) {
  const { document } = parseHTML(
    `<main><ui-breadcrumbs class="spell-crumbs">\n  ${crumbs.join("\n  ")}\n  ` +
      `<ui-breadcrumb selected>Short Title</ui-breadcrumb>\n</ui-breadcrumbs></main>`
  )
  const page = document.querySelector("ui-breadcrumbs")!
  const drawn = headCrumbs(page)
  const words = (trail: Element) => Array.from(trail.children, (crumb) => crumb.textContent)
  return { drawn: drawn && words(drawn), written: words(page) }
}

// Owen, 2026-11-22 (epic `epic-engine` T148):  `Don't need to repeat "Spell Epics / ` in this header`
describe("headCrumbs():  a page header never repeats the top bar's Spell Epic", () => {
  test("only the home page before it:  no crumbs, the title alone;  the page's own markup kept", () => {
    const { drawn, written } = head(`<ui-breadcrumb link="/pages/index.html">Spell Epic</ui-breadcrumb>`)
    expect(drawn).toBeUndefined()
    expect(written).toEqual(["Spell Epic", "Short Title"])
  })

  test("as older pages write it:  Docs, a relative link, a worktree's address", () => {
    for (const link of ["../../pages/index.html", "/worktrees/seo/pages/index.html", "/pages/index.html#top"])
      expect(head(`<ui-breadcrumb link="${link}">Docs</ui-breadcrumb>`).drawn).toBeUndefined()
  })

  test("a crumb after the home page comes first now", () => {
    const { drawn } = head(
      `<ui-breadcrumb link="/pages/index.html">Spell Epic</ui-breadcrumb>`,
      `<ui-breadcrumb link="/epics/seo/seo.plan.html">seo</ui-breadcrumb>`
    )
    expect(drawn).toEqual(["seo", "Short Title"])
  })

  test("any other first crumb stays, linked or not", () => {
    expect(head(`<ui-breadcrumb>Guides</ui-breadcrumb>`).drawn).toEqual(["Guides", "Short Title"])
    expect(head(`<ui-breadcrumb link="/epics/index.html">Epics</ui-breadcrumb>`).drawn).toEqual([
      "Epics",
      "Short Title"
    ])
  })

  test("no crumb but the page itself:  none", () => {
    expect(head().drawn).toBeUndefined()
  })
})
