import { describe, expect, it } from "vite-plus/test"

import { E, F, V } from "spell-ui/api"
import * as core from "spell-ui/core"
import * as forms from "spell-ui/forms"
import * as vocabulary from "spell-ui/vocabulary"

/**
 * `spell-ui/api`:  `E` / `F` MUST be the very namespaces component files import from `spell-ui/core` / `spell-ui/forms`,
 * and `V` the whole `spell-ui/vocabulary` surface, although it goes through `vocabulary.api.ts` (see `api.ts`);  all three
 * survive the circular barrels (`AGENTS.md`:  `barrel.test.ts`).
 */
describe("spell-ui/api", () => {
  it("E is spell-ui/core's own namespace:  element core and foundation", () => {
    expect(E).toBe(core.E)
    expect(E).toMatchObject({
      UIComponent: core.UIComponent,
      ClassBuilder: expect.any(Function),
      proto: expect.any(Function)
    })
  })

  it("F is spell-ui/forms' own namespace:  the form bases", () => {
    expect(F).toBe(forms.F)
    expect(F.FormComponent).toBe(forms.FormComponent)
    expect(F.MenuOptions).toBeTypeOf("function")
  })

  it("V ~== the spell-ui/vocabulary barrel", () => {
    expect(Object.keys(V).sort()).toEqual(Object.keys(vocabulary).sort())
    expect(V.Vocabulary).toBe(vocabulary.Vocabulary)
    expect(V.Converters).toBeDefined()
  })
})
