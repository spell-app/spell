import { describe, expect, test } from "vite-plus/test"

import { es } from "spell-ui/components/components.es"
import { PLANNED_COMPONENTS } from "spell-ui/components/components.planned"
import { ROOT_CATALOG } from "spell-ui/components/ui-root/UIRoot.catalog"

/** A name an author types:  ASCII, lowercase, kebab-case. */
const ASCII_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

describe("PLANNED_COMPONENTS", () => {
  test("holds ONLY tags not built yet:  a tag leaves the list in the change that builds it", () => {
    expect(PLANNED_COMPONENTS.map(({ tag }) => tag).filter((tag) => tag in ROOT_CATALOG)).toEqual([])
  })

  test("names each tag and each Spanish name once, and no Spanish name a built tag already has", () => {
    const tags = PLANNED_COMPONENTS.map(({ tag }) => tag)
    const spanish = PLANNED_COMPONENTS.map((it) => it.es)
    const builtSpanish = new Set(Object.values(es.tags ?? {}))
    expect(new Set(tags).size).toBe(tags.length)
    expect(new Set(spanish).size).toBe(spanish.length)
    expect(spanish.filter((name) => builtSpanish.has(name))).toEqual([])
  })

  test("gives every tag a `ui-` name and an ASCII Spanish one", () => {
    expect(PLANNED_COMPONENTS.filter(({ tag }) => !/^ui-[a-z]/.test(tag) || !ASCII_NAME.test(tag))).toEqual([])
    expect(PLANNED_COMPONENTS.filter((it) => !ASCII_NAME.test(it.es))).toEqual([])
  })
})
