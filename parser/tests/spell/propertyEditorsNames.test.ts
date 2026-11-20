import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"

/** A type's property editor in a file of its own (epic `editor` P25):  read by the Inspector, never compiled. */
describe("property editors files", () => {
  test("`.editor.spell` and `.editors.spell`, in any language, are property editors files, not spell source", () => {
    for (const name of ["Card.editor.spell", "/x/Solitaire.editors.spell", "Carta.editor.es.spell"]) {
      expect(SP.isPropertyEditorsName(name), name).toBe(true)
      expect(SP.isSpellSourceName(name), name).toBe(false)
    }
    for (const name of ["Card.spell", "Card.editor.html", "Editor.spell"]) {
      expect(SP.isPropertyEditorsName(name), name).toBe(false)
    }
  })
})

/** A view's samples in a file of its own (epic `editor` P38, Q61 A):  read by Design's gallery, never compiled. */
describe("samples files", () => {
  test("`.samples.spell`, in any language, is a samples file, not spell source", () => {
    for (const name of ["Card.samples.spell", "/x/Card.samples.spell", "Carta.samples.es.spell"]) {
      expect(SP.isSamplesName(name), name).toBe(true)
      expect(SP.isSpellSourceName(name), name).toBe(false)
    }
    for (const name of ["Card.spell", "Samples.spell", "Card.editor.spell"]) {
      expect(SP.isSamplesName(name), name).toBe(false)
    }
  })
})
