import { describe, expect, it } from "vite-plus/test"

import { StaticCatalog, StaticFamilies, StaticRender } from "spell/ui/static"

/** The catalog `spell ssr` and the visual tests define:  every supported family, each rendering on its own. */
describe("StaticCatalog.define()", () => {
  it("defines every class StaticFamilies lists, each from its own file, once", async () => {
    const classes = await StaticCatalog.define()
    expect(await StaticCatalog.define()).toBe(classes)
    const names = Object.values(StaticFamilies.CLASSES).flat().sort()
    expect(classes.map((Class) => Class.name).sort()).toEqual(names)
    expect(StaticRender.families.size).toBe(names.length)
  })

  it("renders every tag, empty, without throwing or leaving the tag", async () => {
    await StaticCatalog.define()
    for (const tag of StaticRender.families.keys()) {
      const html = `<${tag}></${tag}>`
      await StaticRender.prepare(html)
      expect(StaticRender.fragment(html), tag).not.toContain(`<${tag}`)
    }
  })
})
