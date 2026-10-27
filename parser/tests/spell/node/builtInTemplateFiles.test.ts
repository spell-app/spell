import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { BUILT_IN_TEMPLATE_DECLARATIONS } from "spell/parser/spell/builtInTemplates.generated"
import { compiledTemplates } from "spell/parser/spell/node/builtInTemplateFiles"

/** spell-parser's root, where the generated files' paths start. */
const PACKAGE_ROOT = resolve(import.meta.dirname, "../../..")

/** `text` without its whitespace:  the formatter lays a generated file out, but changes nothing else in it. */
function squeezed(text: string): string {
  return text.replace(/\s+/g, "")
}

describe("spell's built-in templates are compiled:  if not, run `yarn core:gen:templates` in spell-parser", () => {
  const { classes, declarations } = compiledTemplates()

  for (const { path, text } of classes) {
    test(`its class, ${path}`, () => {
      expect(squeezed(readFileSync(resolve(PACKAGE_ROOT, path), "utf8"))).toBe(squeezed(text))
    })
  }

  test("their declarations, builtInTemplates.generated.ts", () => {
    expect(BUILT_IN_TEMPLATE_DECLARATIONS).toEqual(declarations)
  })
})

describe("a built-in template", () => {
  test("is in every language's root, its type from its declarations, NOT a built-in type name", () => {
    for (const language of SP.Language.all.values()) {
      const type = language.rootScope.types.get("two sided view", "LOCAL_ONLY")
      expect(type?.superType, language.lang).toBe("View")
      // in the language's own words, e.g. `frente` in Spanish:  each compiles by the English name, `front`
      expect(
        type?.slots?.map((slot) => type.slotOutput(slot)),
        language.lang
      ).toEqual(["front", "back"])
      expect(SP.isBuiltInTypeScope(type)).toBe(true)
    }
  })

  test("is NOT in a bare root, where it compiles itself", () => {
    expect(SP.Language.default.bareRootScope().types.get("two sided view", "LOCAL_ONLY")).toBeUndefined()
  })

  test("another language's words name the English class's members:  Spanish's slots, property and phrases", () => {
    const spanish = SP.Language.for("es").rootScope.types.get("two sided view", "LOCAL_ONLY")!
    expect(spanish.slotOutput("frente")).toBe("front")
    expect(spanish.variables.get("dirección", "LOCAL_ONLY")?.output).toBe("direction")
  })
})
