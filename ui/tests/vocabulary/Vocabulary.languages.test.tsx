import { describe, expect, it } from "vite-plus/test"

import type { DOMElement } from "spell-kit/element"
import { UI } from "spell-ui/core"
import { UIButton } from "spell-ui/components/ui-button"
import { es } from "spell-ui/components/components.es"
import { ElementFixture } from "spell-kit/test-helpers/ElementFixture"

/** The page's runtime, with Spanish defined:  once for the file (a page picks its language once). */
const ui = await UI.load()
ui.vocabulary.defineComponents({ prefix: "es", dictionary: es })

/** The class words `tag`'s shadow `<button>` draws. */
function buttonClasses(host: DOMElement) {
  return host.shadowRoot!.querySelector("button")!.className
}

describe("UI.vocabulary.defineComponents({ prefix, dictionary })", () => {
  it("defines every component the page has already, in the language", async () => {
    expect(UIButton.describe().tag).toBe("ui-button")
    expect(customElements.get("es-boton")).toBeDefined()
    expect(customElements.get("es-botones")).toBeDefined()
    const spanish = await ElementFixture.render<DOMElement>(
      `<es-boton primario color="rojo" tamano="pequeño">Guardar</es-boton>`
    )
    const english = await ElementFixture.render<DOMElement>(
      `<ui-button primary color="red" size="small">Save</ui-button>`
    )
    expect(buttonClasses(spanish)).toBe(buttonClasses(english))
    expect(buttonClasses(spanish)).toBe("ui small red primary button")
  })

  it("dispatches Spanish events, and takes Spanish shared attributes", async () => {
    const host = await ElementFixture.render<DOMElement>(`<es-boton alternable desactivado>Votar</es-boton>`)
    expect(host.matches(":state(disabled)")).toBe(true)
    host.removeAttribute("desactivado")
    await ElementFixture.tick()
    const toggles: unknown[] = []
    host.addEventListener("es-alternar", (event) => toggles.push((event as CustomEvent).detail.active))
    host.shadowRoot!.querySelector("button")!.click()
    expect(toggles).toEqual([true])
  })

  it("names a Spanish tag's properties in Spanish:  `discontinuo` is `dashed`, by attribute and by property", async () => {
    await import("spell-ui/components/ui-card")
    const cardRoot = (host: DOMElement) => host.shadowRoot!.querySelector("[part~=card]")!
    const byAttribute = await ElementFixture.render<DOMElement>(`<es-tarjeta discontinuo></es-tarjeta>`)
    expect(cardRoot(byAttribute).className).toBe("ui dashed card")
    // what spell's JSX writes for a value that can change, `prop:discontinuo`:  the element's own property
    const byProperty = await ElementFixture.render<DOMElement & Record<string, unknown>>(`<es-tarjeta></es-tarjeta>`)
    expect("discontinuo" in byProperty).toBe(true)
    expect("dashed" in byProperty).toBe(false)
    byProperty.discontinuo = true
    await ElementFixture.tick()
    expect(byProperty.discontinuo).toBe(true)
    expect(byProperty.hasAttribute("discontinuo")).toBe(true)
    expect(cardRoot(byProperty).className).toBe("ui dashed card")
    // a dashed name's property is camelCase, as English's:  `sin-relleno` => `sinRelleno`
    const button = await ElementFixture.render<DOMElement & Record<string, unknown>>(`<es-boton>Guardar</es-boton>`)
    button.sinRelleno = true
    button.primario = true
    await ElementFixture.tick()
    expect(buttonClasses(button)).toBe("ui primary unpadded button")
  })

  it("defines a family loaded afterwards as it's defined", async () => {
    expect(customElements.get("es-etiqueta")).toBeUndefined()
    await import("spell-ui/components/ui-label")
    expect(customElements.get("es-etiqueta")).toBeDefined()
  })

  it("does nothing the second time, and refuses a prefix another dictionary has", () => {
    expect(() => ui.vocabulary.defineComponents({ prefix: "es", dictionary: es })).not.toThrow()
    expect(() => ui.vocabulary.defineComponents({ prefix: "es", dictionary: { lang: "es" } })).toThrow(/taken/)
    expect(() => ui.vocabulary.defineComponents({ prefix: "ui", dictionary: { lang: "fr" } })).toThrow(/taken/)
  })

  it("refuses a dictionary that gives two components one tag", () => {
    const twice = { lang: "xx", tags: { "ui-button": "uno", "ui-label": "uno" } }
    expect(() => ui.vocabulary.defineComponents({ prefix: "xx", dictionary: twice })).toThrow(/xx-uno/)
  })

  it("answers which component a Spanish tag stands for, before its family loads", () => {
    expect(ui.vocabulary.canonicalTagFor("es-tarjeta")).toBe("ui-card")
    expect(ui.vocabulary.canonicalTagFor("ui-card")).toBe("ui-card")
    expect(ui.vocabulary.canonicalTagFor("es-nada")).toBeUndefined()
  })
})

describe("UI.i18n.registerDictionary()", () => {
  it("says the shared texts and each component's in the language", () => {
    const { i18n } = ui
    const locale = i18n.locale
    i18n.registerDictionary(es)
    i18n.locale = "es-ES"
    try {
      expect(i18n.t("close")).toBe("Cerrar")
      expect(i18n.t("loading", undefined, "ui-button")).toBe("Cargando…")
    } finally {
      i18n.locale = locale
    }
    expect(i18n.t("close")).toBe("Close")
  })
})
