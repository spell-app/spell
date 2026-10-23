import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { RootLoader } from "spell-ui/components/ui-root"

import "spell-ui"

describe("<ui-property-editor> in another language", () => {
  it("a Spanish editor's properties find it, and read its schema:  `<es-editor-propiedades>` (outline-spell P29)", async () => {
    await RootLoader.useLanguage("es")
    const host = await ElementFixture.render(
      `<es-editor-propiedades esquema="ui-button"><es-propiedad name="basic"></es-propiedad></es-editor-propiedades>`
    )
    ;(host as HTMLElement & { value: unknown }).value = { basic: true }
    for (let round = 0; round < 4; round++) {
      await ElementFixture.settle(host)
      await ElementFixture.tick()
    }
    // the button's `basic` is a yes / no:  a checkbox, not a plain field
    const control = host.querySelector("es-propiedad [name=basic]")!
    expect(control.localName).toBe("ui-checkbox")
    expect(host.matches(":state(property-editor)")).toBe(true)
    expect(host.querySelector("es-propiedad")!.matches(":state(property)")).toBe(true)
  })

  it("a Spanish form's checkbox shows and writes its yes / no:  `<es-casilla>`'s `seleccionado` (outline-spell P29)", async () => {
    await RootLoader.useLanguage("es")
    const task = { done: true }
    const host = await ElementFixture.render(`<es-formulario><es-casilla name="done"></es-casilla></es-formulario>`)
    ;(host as HTMLElement & { value: unknown }).value = task
    for (let round = 0; round < 4; round++) {
      await ElementFixture.settle(host)
      await ElementFixture.tick()
    }
    const box = host.querySelector("es-casilla") as HTMLElement & { seleccionado: boolean; checked: boolean }
    expect(box.seleccionado).toBe(true)
    box.click()
    await ElementFixture.settle(host)
    expect(task.done).toBe(false)
  })
})
