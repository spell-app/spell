import { describe, expect, test } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"
import type { DOMElement } from "spell/element"
import type { UIRoot } from "spell/ui/components/ui-root"
import type { DOMTourElement } from "spell/ui/components/ui-tour"

import "spell/ui/components/ui-root"

/**
 * `<es-recorrido>`:  `<ui-tour>` in Spanish, its family loaded by the root, as a page loads it.
 */
describe("<es-recorrido>", () => {
  test("speaks Spanish:  its steps by their Spanish tag and attributes, its words and its events' names", async () => {
    const root = Fixture.render<DOMElement>(
      `<ui-root lang="es"><es-recorrido name="Primera partida" oscurecer>` +
        `<es-paso-del-recorrido name="uno">Uno</es-paso-del-recorrido>` +
        `<es-paso-del-recorrido oscurecer="false">Dos</es-paso-del-recorrido>` +
        `</es-recorrido></ui-root>`
    )
    await root.ready
    await (root.component as UIRoot).settled
    const tour = root.querySelector<DOMTourElement>("es-recorrido")!
    await tour.ready
    const names: string[] = []
    tour.addEventListener("es-terminado", (event) => names.push(event.type))
    expect(tour.stepCount).toBe(2)
    expect(tour.start()).toBe(true)
    await expect.poll(() => tour.shadowRoot!.textContent).toContain("Siguiente")
    expect(tour.shadowRoot!.querySelector(".ring")!.classList.contains("dim")).toBe(true)
    tour.next()
    await expect.poll(() => tour.shadowRoot!.textContent).toContain("Listo")
    expect(tour.shadowRoot!.querySelector(".ring")!.classList.contains("dim")).toBe(false)
    tour.stop()
    expect(tour.running).toBe(false)
  })
})
