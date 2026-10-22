/**
 * Tests of the epic server's URL helpers:
 * - the engine routes a page's old asset links become (`engineUrlFor()`, `legacyEnginePath()`)
 * - the engine's file behind a route (`engineFileFor()`)
 */
import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { engineFileFor } from "spell-epic/server/engineLinks"
import { engineUrlFor, legacyEnginePath, PACK_URL, repoPrefixFor } from "spell-epic/server/server.types"

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

describe("engineFileFor()", () => {
  test("engineFileFor():  a route's file in the engine;  never outside its folder", () => {
    expect(engineFileFor("/_epic/assets/spell-ui.js", "/e")).toBe(join("/e", "src/tools/_assets/spell-ui.js"))
    expect(engineFileFor("/_epic/pack/epics.pack.js", "/e")).toBe(join("/e", "src/components/__pack/epics.pack.js"))
    expect(engineFileFor("/_epic/assets/%2e%2e/%2e%2e/secret", "/e")).toBeUndefined()
    expect(engineFileFor("/epics/x.html", "/e")).toBeUndefined()
  })
})
