import { describe, expect, it } from "vite-plus/test"

import type { DOMElement } from "spell-kit/element"
import { UI } from "spell-ui/core"
import { Fixture } from "spell-kit/test-helpers/Fixture"
import { RootLoader, type UIRoot } from "spell-ui/components/ui-root"

describe("<ui-root lang>:  the page's language", () => {
  it("loads Spanish, then each Spanish tag's family on demand, as `ui-*` tags load", async () => {
    expect(customElements.get("es-tarjeta")).toBeUndefined()
    const host = Fixture.render<DOMElement>(
      `<ui-root lang="es"><es-tarjeta color="rojo"><es-encabezado>Informe</es-encabezado></es-tarjeta></ui-root>`
    )
    await host.ready
    expect(await (host.component as UIRoot).settled).toEqual([])
    expect(customElements.get("es-tarjeta")).toBeDefined()
    expect(customElements.get("ui-card")).toBeDefined()
    expect(customElements.get("ui-table")).toBeUndefined()
    const card = host.querySelector<DOMElement>("es-tarjeta")!
    expect(card.matches(":defined")).toBe(true)
    expect((card as DOMElement & { color: string }).color).toBe("red")
    expect(UI.i18n.locale).toBe("es")
    expect(UI.i18n.t("close")).toBe("Cerrar")
  })

  it("knows the languages Spell UI ships", () => {
    expect(RootLoader.hasLanguage("es-MX")).toBe(true)
    expect(RootLoader.hasLanguage("en")).toBe(false)
    expect(RootLoader.folderFor("es-boton")).toBe("ui-button")
  })
})
