/**
 * Tests of the epic server's URL helpers:
 * - the engine routes a page's old asset links become (`engineUrlFor()`, `legacyEnginePath()`)
 * - the page rewrite the asset-route migrations run (`rewriteEngineLinks()`)
 */
import { join } from "node:path"

import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { engineFileFor, linksEngineByPath, rewriteEngineLinks } from "$/epics/server/engineLinks"
import { engineUrlFor, legacyEnginePath, PACK_URL, repoPrefixFor } from "$/epics/server/server.types"

describe("engineUrlFor()", () => {
  test("an engine file by a checkout path, from any depth or the root, old folders too:  its route", () => {
    expect(engineUrlFor("../../packages/epics/tools/_assets/spell-ui.js")).toBe("/_epic/assets/spell-ui.js")
    expect(engineUrlFor("../packages/epics/tools/_assets/emoji/cldr/a.js")).toBe("/_epic/assets/emoji/cldr/a.js")
    expect(engineUrlFor("/packages/epics/tools/_assets/spell-doc.css")).toBe("/_epic/assets/spell-doc.css")
    expect(engineUrlFor("../../../packages/docs/tools/_assets/highlight.min.js")).toBe("/_epic/assets/highlight.min.js")
    expect(engineUrlFor("../../packages/epics/components/__pack/epics.pack.js")).toBe(PACK_URL)
    expect(engineUrlFor("../../packages/epics/pack/epics.pack.js")).toBe(PACK_URL)
  })

  test("anything else:  undefined (a route already, another package's pack, another site)", () => {
    expect(engineUrlFor("/_epic/assets/spell-ui.js")).toBeUndefined()
    expect(engineUrlFor("../../packages/brand/components/__pack/brand.pack.js")).toBeUndefined()
    expect(engineUrlFor("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js")).toBeUndefined()
    expect(engineUrlFor("../guides/x.html")).toBeUndefined()
  })

  test("legacyEnginePath():  an old URL path, at the root, under /r/<repo>/ or /worktrees/<w>/:  the route", () => {
    expect(legacyEnginePath("/packages/epics/tools/_assets/spell-ui.js")).toBe("/_epic/assets/spell-ui.js")
    expect(legacyEnginePath("/r/spell-app/packages/epics/components/__pack/epics.pack.js")).toBe(PACK_URL)
    expect(legacyEnginePath("/worktrees/seo/packages/epics/tools/_assets/x.css")).toBe("/_epic/assets/x.css")
    expect(legacyEnginePath("/epics/seo/seo.plan.html")).toBeUndefined()
    expect(legacyEnginePath("/packages/ui/docs/x.html")).toBeUndefined()
  })

  test("repoPrefixFor():  /r/<name>/", () => {
    expect(repoPrefixFor("spell-app")).toBe("/r/spell-app/")
  })
})

describe("rewriteEngineLinks()", () => {
  /** A page as `epic new` wrote one before the routes:  the engine by checkout paths, and a source link. */
  const OLD =
    '<html><head><link rel="stylesheet" href="../../packages/epics/tools/_assets/spell-doc.css" /></head><body>' +
    '<ui-root><ui-components source="../../packages/epics/components/__pack/epics.pack.js"></ui-components>' +
    '<p><a href="../../packages/epics/tools/_assets/spell-ui.js">the bundle</a></p></ui-root>' +
    '<script src="../../packages/epics/tools/_assets/spell-ui.js"></script></body></html>'

  test("what the page loads, to the routes;  a link for a reader kept;  a second run changes nothing", () => {
    const { document } = parseHTML(OLD)
    expect(linksEngineByPath(OLD)).toBe(true)
    expect(rewriteEngineLinks(document as unknown as Document)).toEqual([
      { from: "../../packages/epics/tools/_assets/spell-doc.css", to: "/_epic/assets/spell-doc.css" },
      { from: "../../packages/epics/tools/_assets/spell-ui.js", to: "/_epic/assets/spell-ui.js" },
      { from: "../../packages/epics/components/__pack/epics.pack.js", to: "/_epic/pack/epics.pack.js" }
    ])
    expect(document.querySelector("a")!.getAttribute("href")).toBe("../../packages/epics/tools/_assets/spell-ui.js")
    expect(rewriteEngineLinks(document as unknown as Document)).toEqual([])
    expect(linksEngineByPath('<script src="/_epic/assets/spell-ui.js"></script>')).toBe(false)
  })

  test("engineFileFor():  a route's file in the engine;  never outside its folder", () => {
    expect(engineFileFor("/_epic/assets/spell-ui.js", "/e")).toBe(
      join("/e", "packages/epics/tools/_assets/spell-ui.js")
    )
    expect(engineFileFor("/_epic/pack/epics.pack.js", "/e")).toBe(
      join("/e", "packages/epics/components/__pack/epics.pack.js")
    )
    expect(engineFileFor("/_epic/assets/%2e%2e/%2e%2e/secret", "/e")).toBeUndefined()
    expect(engineFileFor("/epics/x.html", "/e")).toBeUndefined()
  })
})
