import { describe, expect, it } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"
import type { DOMElement } from "spell/element"
import type { UIRoot } from "spell/ui/components/ui-root"

import "spell/ui/components/ui-root"

/**
 * `<es-menu encogible>`:  `<ui-menu shrinkable>` in Spanish, its family loaded by the root, as a page loads it.
 * - Its own file:  a page that imports the menu's family first draws its texts before the root turns Spanish.
 */
describe("<es-menu encogible>", () => {
  it("fits the same, in Spanish:  its overflow button is «Más»", async () => {
    const root = Fixture.render<DOMElement>(
      `<ui-root lang="es"><div style="width: 60px"><es-menu encogible>` +
        `<es-elemento enlace="#q" icono="question">Preguntas</es-elemento>` +
        `<es-elemento enlace="#t" icono="check">Tareas pendientes</es-elemento>` +
        `</es-menu></div></ui-root>`
    )
    await root.ready
    await (root.component as UIRoot).settled
    const host = root.querySelector<DOMElement>("es-menu")!
    await host.ready
    const row = () => host.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")!
    await expect.poll(() => row().style.getPropertyValue("--_menu-fit")).toBe("overflow")
    const button = host.shadowRoot!.querySelector("[part~=overflow]")!
    expect(button.getAttribute("aria-label")).toBe("Más")
    expect(getComputedStyle(button).display).not.toBe("none")
  })
})
