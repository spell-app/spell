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
