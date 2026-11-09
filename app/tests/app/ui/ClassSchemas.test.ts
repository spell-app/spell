import { describe, expect, it } from "vite-plus/test"

import { declareProp, Observable } from "spell/util"
import { SP } from "spell/parser/spell"
import { ClassSchemas } from "spell/app/app/ui/ClassSchemas"

describe("ClassSchemas.fromClass()", () => {
  class Settings extends Observable {}
  declareProp(Settings, "title", { type: "text", default: "Untitled" })
  declareProp(Settings, "listsStartAt", { type: "number", oneOf: [1, 0], default: 1 })
  declareProp(Settings, "minify", { type: "choice" })
  declareProp(Settings, "exports", { type: "list", itemType: "text" })
  declareProp(Settings, "owner", { type: "Person" })

  class TeamSettings extends Settings {}
  declareProp(TeamSettings, "title", { type: "text", default: "Team" })
  declareProp(TeamSettings, "created", { type: "date" })

  it("reads each declared property:  its type, legal values and default", () => {
    const schema = ClassSchemas.fromClass(Settings)
    expect(schema.name).toBe("Settings")
    expect(schema.attributes.map((spec) => [spec.name, spec.type])).toEqual([
      ["title", "text"],
      ["listsStartAt", "choice"],
      ["minify", "boolean"],
      ["exports", "list"],
      ["owner", "thing"]
    ])
    expect(schema.attributes[0]).toMatchObject({ kind: "string", default: "Untitled" })
    expect(schema.attributes[1]).toMatchObject({ kind: "enum", values: ["1", "0"], default: 1 })
    expect(schema.attributes[3]!.of).toBe("text")
  })

  it("puts a superclass's properties first;  a subclass's declaration of the same name wins", () => {
    const schema = ClassSchemas.fromClass(TeamSettings)
    expect(schema.attributes.map((spec) => spec.name)).toEqual([
      "title",
      "listsStartAt",
      "minify",
      "exports",
      "owner",
      "created"
    ])
    expect(schema.attributes[0]!.default).toBe("Team")
    expect(schema.attributes[5]!.type).toBe("date")
  })
})

describe("ClassSchemas.fromClass():  rules (epic `property-editor` P9)", () => {
  class Release extends Observable {}
  declareProp(Release, "version", { type: "text", rules: [{ type: "regExp", value: "/^\\d+$/", prompt: "Digits" }] })

  it("passes a property's rules on, for the form to check", () => {
    expect(ClassSchemas.fromClass(Release).attributes[0]!.rules).toEqual([
      { type: "regExp", value: "/^\\d+$/", prompt: "Digits" }
    ])
  })
})

describe("ClassSchemas.fromClass():  a built-in template's values in its program's words (epic `language` T73)", () => {
  // the core's class, by its name:  what a Spanish program's root knows it by
  class TwoSidedView extends Observable {}
  declareProp(TwoSidedView, "direction", { type: "text", oneOf: ["up", "down"] })
  class Carta extends TwoSidedView {}
  declareProp(Carta, "rango", { type: "number" })
  const spanish = SP.Language.rootScopeFor([SP.Language.forFile("/Carta.es.spell")])

  it("names each property the class inherits from one in the language, and each of its values", () => {
    expect(ClassSchemas.templateWordsOf(Carta, spanish)).toEqual(
      new Map([["direction", { name: "dirección", values: { up: "arriba", down: "abajo" } }]])
    )
    // English's names are the class's own
    expect(ClassSchemas.templateWordsOf(Carta, SP.Language.rootScopeFor([SP.Language.default])).size).toBe(0)
  })

  it("shows its values by those words, `valueLabels`:  the values themselves stay the class's", () => {
    const direction = ClassSchemas.fromClass(Carta, spanish).attributes.find((spec) => spec.name === "direction")
    expect(direction).toMatchObject({ values: ["up", "down"], valueLabels: { up: "arriba", down: "abajo" } })
    expect(ClassSchemas.fromClass(Carta).attributes[0]!.valueLabels).toBeUndefined()
  })
})
