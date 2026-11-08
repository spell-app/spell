import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A draft kept in a property (epic `data` T135):  a form's separate Save and Cancel actions both reach it.
 */

/** `lines`, compiled as the file at `path`:  its javascript, and its errors. */
function compiled(lines: string[], path = "/Test.spell") {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  return { js: `${file!.compiled}`, errors: file!.errors.map((error) => `${error}`) }
}

describe("a draft kept in a property", () => {
  test("`its draft` is worked out from the thing;  `save` and `discard` reach it from separate actions", () => {
    const { js, errors } = compiled([
      "a recipe is a thing",
      "a recipe editor is a view:",
      '\t- its "recipe" is a recipe',
      '\t- its "draft" is a draft of its recipe',
      "\t- to keep it:",
      "\t\tsave its draft",
      "\t- to drop it:",
      "\t\tdiscard its draft"
    ])
    expect(errors).toEqual([])
    expect(js).toContain("return core.draftOf(this.recipe)")
    expect(js).toContain("core.saveDraft(this.draft)")
    expect(js).toContain("core.discardDraft(this.draft)")
  })

  test("actions named `save` and `cancel`, as a form's buttons are, still save the draft", () => {
    const { js, errors } = compiled([
      "a recipe is a thing",
      "a recipe editor is a view:",
      '\t- its "recipe" is a recipe',
      '\t- its "draft" is a draft of its recipe',
      "\t- to save it:",
      "\t\tsave its draft",
      "\t- to cancel it:",
      "\t\tdiscard its draft"
    ])
    expect(errors).toEqual([])
    expect(js).toContain("core.saveDraft(this.draft)")
    expect(js).toContain("core.discardDraft(this.draft)")
  })

  test("in Spanish", () => {
    const { js, errors } = compiled(
      [
        "una receta es una cosa",
        "un editor es una vista:",
        '\t- su "receta" es una receta',
        '\t- su "borrador" es un borrador de su receta',
        "\t- para guardarlo:",
        "\t\tguardar su borrador",
        "\t- para soltarlo:",
        "\t\tdescartar su borrador"
      ],
      "/Test.es.spell"
    )
    expect(errors).toEqual([])
    expect(js).toContain("core.draftOf(this.receta)")
    expect(js).toContain("core.saveDraft(this.borrador)")
    expect(js).toContain("core.discardDraft(this.borrador)")
  })

  test("a program with its own type `draft` keeps it", () => {
    const { js, errors } = compiled([
      "a draft is a thing",
      "a recipe is a thing",
      "a note is a thing:",
      '\t- its "recipe" is a recipe',
      '\t- its "sketch" is a draft'
    ])
    expect(errors).toEqual([])
    expect(js).toContain('declareProp("sketch", { type: "Draft" })')
  })
})
