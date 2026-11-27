import { describe, expect, it } from "vite-plus/test"

import { PACK_MODULES } from "spell/element-tools/packModules"
import { PackModules, type PackModuleLoaders } from "spell/ui/components/ui-components/PackModules"

/**
 * The ONE list of the modules a page shares with its component packs:  the site's bundle
 * (`SitePacks.ts`) and spell-app's pages (`PagePacks.ts`) fill theirs from it.
 */
describe("PackModules", () => {
  it("offers every module a pack's build leaves external (`PACK_MODULES`)", () => {
    for (const specifier of PACK_MODULES) expect(Object.keys(PackModules.HOLDERS)).toContain(specifier)
  })

  it("share():  fills each key missing from its holder, each holder loaded once, keeping the ones there", async () => {
    const loads: string[] = []
    const loaders = Object.fromEntries(
      [...new Set(Object.values(PackModules.HOLDERS))].map((holder) => [
        holder,
        async () => {
          loads.push(holder)
          return { holder }
        }
      ])
    ) as PackModuleLoaders
    const eager = { name: "the page's own Solid" }
    const into: Record<string, unknown> = { "solid-js": eager }
    await PackModules.share(into, loaders)
    expect(into["solid-js"]).toBe(eager)
    expect(Object.keys(into).sort()).toEqual(Object.keys(PackModules.HOLDERS).sort())
    expect(into["spell/element"]).toBe(into["spell/ui/core"])
    expect(into["spell/ui/components/ui-graph"]).toEqual({ holder: "spell/ui" })
    expect(loads.filter((holder) => holder === "spell/ui")).toHaveLength(1)
    expect(loads).not.toContain("solid-js")
  })
})
