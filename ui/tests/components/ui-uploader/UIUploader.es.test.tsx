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
})
