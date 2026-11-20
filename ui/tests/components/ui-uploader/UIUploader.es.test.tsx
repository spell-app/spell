import { describe, expect, it } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"
import type { DOMElement } from "spell/element"
import type { UIRoot } from "spell/ui/components/ui-root"

import "spell/ui/components/ui-root"

/**
 * `<es-cargador-archivos>`:  `<ui-uploader>` in Spanish, its family loaded by the root, as a page loads it.
 * - Its own file:  a page that imports the uploader's family first draws its texts before the root turns Spanish.
 */
describe("<es-cargador-archivos>", () => {
  it("speaks Spanish:  its words, its look's name and its events' names", async () => {
    const root = Fixture.render<DOMElement>(
      `<ui-root lang="es"><es-cargador-archivos apariencia="compacto" extensiones="json" multiple></es-cargador-archivos></ui-root>`
    )
    await root.ready
    await (root.component as UIRoot).settled
    const uploader = root.querySelector<DOMElement>("es-cargador-archivos")!
    await uploader.ready
    await expect.poll(() => uploader.shadowRoot!.textContent).toContain("Suelta archivos .json, o")
    expect(uploader.matches(":state(compact)")).toBe(true)

    const names: string[] = []
    uploader.addEventListener("es-archivo-soltado", (event) => names.push(event.type))
    const input = uploader.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!
    const transfer = new DataTransfer()
    transfer.items.add(new File(["{}"], "a.json", { type: "application/json" }))
    input.files = transfer.files
    input.dispatchEvent(new Event("change", { bubbles: true }))
    await expect.poll(() => names).toEqual(["es-archivo-soltado"])
  })

  it("takes its slots and its messages by their Spanish names", async () => {
    const root = Fixture.render<DOMElement>(
      `<ui-root lang="es"><es-cargador-archivos mensaje-soltar="Suelta para traer {count}">` +
        `<span slot="mensaje">Trae tus netlists</span><ui-button slot="boton">Elegir netlists</ui-button>` +
        `</es-cargador-archivos><es-cargador-archivos apariencia="botón" mensaje="Subir netlists"></es-cargador-archivos></ui-root>`
    )
    await root.ready
    await (root.component as UIRoot).settled
    const [slotted, button] = [...root.querySelectorAll<DOMElement>("es-cargador-archivos")]
    await slotted!.ready
    await button!.ready
    expect(slotted!.querySelector('[slot="mensaje"]')!.assignedSlot).not.toBeNull()
    expect(slotted!.querySelector('[slot="boton"]')!.assignedSlot).not.toBeNull()
    await expect.poll(() => button!.shadowRoot!.textContent).toContain("Subir netlists")

    const transfer = new DataTransfer()
    transfer.items.add(new File(["{}"], "a.json", { type: "application/json" }))
    transfer.items.add(new File(["{}"], "b.json", { type: "application/json" }))
    slotted!.dispatchEvent(
      new DragEvent("dragover", { dataTransfer: transfer, bubbles: true, cancelable: true, composed: true })
    )
    await expect.poll(() => slotted!.shadowRoot!.textContent).toContain("Suelta para traer 2")
  })
})
