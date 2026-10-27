import { describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { core, ViewableList, List, Thing } from "spell/parser/core"
import { SP } from "spell/parser/spell"

/**
 * `SP.BUILT_IN_TYPE_TABLE` -- spell's built-in types' members, as data.
 * - Pins each member's `readAs` template to something REAL:
 *   a `core` helper, or a javascript property or method of a sample value of its type.
 *   - Reads it off that value, to check it's what the member says.
 * - Pins each `rules` name to a live rule, and each type to the root scope's.
 */
describe("built-in type table", () => {
  test("each type is in the root scope, with the super-type `P.BUILT_IN_TYPES` gives it", () => {
    for (const entry of SP.BUILT_IN_TYPE_TABLE) {
      // a built-in template written in spell:  its type comes from its compiled declarations, NOT `P.BUILT_IN_TYPES`
      const isTemplate = SP.isBuiltInTemplate(entry.name)
      expect(Object.hasOwn(P.BUILT_IN_TYPES, entry.name), entry.name).toBe(!isTemplate)
      if (!isTemplate) expect(entry.superType, entry.name).toBe(P.BUILT_IN_TYPES[entry.name])
      const type = SP.SpellParser.rootScope.types.get(entry.name, "LOCAL_ONLY")
      expect(type, entry.name).toBeDefined()
      expect(type!.superType, entry.name).toBe(entry.superType && P.classCase(entry.superType))
      expect(SP.isBuiltInTypeScope(type)).toBe(true)
    }
  })

  test("each member's `readAs` template reads a REAL `core` helper or javascript member -- of its datatype", () => {
    const read: string[] = []
    for (const entry of SP.BUILT_IN_TYPE_TABLE) {
      for (const member of entry.members.filter((it) => it.readAs)) {
        const where = `${entry.name}'s ${member.words}:  ${member.readAs}`
        const template = SP.parseReadAsTemplate(member.readAs!)
        expect(template, where).toBeDefined()
        const sample = SAMPLES[entry.name]
        expect(sample, `${where} -- no sample ${entry.name}`).toBeDefined()
        const value = readMember(template!, sample)
        expect(isA(value, member.datatype), `${where} => ${String(value)}`).toBe(true)
        read.push(`${entry.name} ${member.words} => ${JSON.stringify(value)}`)
      }
    }
    expect(read).toMatchInlineSnapshot(`
      [
        "list length => 3",
        "list size => 3",
        "viewable list selection => []",
        "text length => 3",
        "text characters => ["A","d","a"]",
        "date year => 2026",
        "date day => 4",
      ]
    `)
  })

  test("each `rules` name is a live rule", () => {
    const names = SP.BUILT_IN_TYPE_TABLE.flatMap((entry) => [
      ...(entry.rules ?? []),
      ...entry.members.flatMap((member) => member.rules ?? [])
    ])
    expect(names.filter((name) => !SP.spellParser.rules[name])).toEqual([])
  })

  test("a member with `readAs` is in its type's scope, as a property `getMember()` finds;  one with only `rules` isn't", () => {
    const list = SP.SpellParser.rootScope.types.get("list")!
    expect(list.getMember("length")).toMatchObject({ name: "length", datatype: "number" })
    expect(list.getMember("shuffle (a list)")).toBeUndefined()
    // a sub-type finds it too, e.g. `a deck is a list of cards`
    expect(SP.SpellParser.rootScope.types.get("text")!.itemType).toBe("character")
  })

  test("a `stored` member is in its type's scope, and a REAL property of its runtime class, which keeps a set value", () => {
    const stored = SP.BUILT_IN_TYPE_TABLE.flatMap((entry) =>
      entry.members.filter((member) => member.stored).map((member) => ({ entry, member }))
    )
    expect(stored.map(({ entry, member }) => `${entry.name}'s ${member.words}`)).toEqual([
      "thing's id",
      "list's id",
      "list's name"
    ])
    const runtime: Record<string, () => Record<string, unknown>> = {
      thing: () => new Thing() as unknown as Record<string, unknown>,
      list: () => new List({}) as unknown as Record<string, unknown>
    }
    for (const { entry, member } of stored) {
      const where = `${entry.name}'s ${member.words}`
      const name = SP.builtInMemberName(member.words)
      const type = SP.SpellParser.rootScope.types.get(entry.name)!
      expect(type.getMember(name), where).toMatchObject({ name })
      expect(SP.builtInStoredMember(type, member.words), where).toMatchObject({ member, name, on: entry.name })
      const value = runtime[entry.name]!()
      value[name] = "kept"
      expect(value[name], where).toBe("kept")
    }
  })

  test("`builtInStoredMember()`:  what a type has built in, through the built-in type it comes from", () => {
    const root = SP.SpellParser.rootScope
    const project = new P.ProjectScope({ name: "test", path: "/test", parser: root.parser!, parentScope: root })
    const [pile, card, stub] = project.types!.add(
      { name: "pile", superType: "list" },
      { name: "card", superType: "thing" },
      { name: "club" }
    )
    expect(SP.builtInStoredMember(pile, "name")).toMatchObject({ name: "name", on: "list" })
    expect(SP.builtInStoredMember(pile, "id")).toMatchObject({ name: "id", on: "list" })
    // a thing has no `name`:  any type may declare one
    expect(SP.builtInStoredMember(card, "name")).toBeUndefined()
    expect(SP.builtInStoredMember(card, "id")).toMatchObject({ name: "id", on: "thing" })
    // its super-types unknown:  only what no type may declare
    expect(SP.builtInStoredMember(stub, "id")).toMatchObject({ name: "id" })
    expect(SP.builtInStoredMember(stub, "name")).toBeUndefined()
  })

  test("a `stored` member in another language's words compiles to its own name:  Spanish's `nombre` is `name`", () => {
    const list = SP.spanish.rootScope.types.get("list", "LOCAL_ONLY")!
    expect(list.getMember("nombre")).toMatchObject({ name: "nombre", output: "name", datatype: "text" })
    expect(list.getMember("id")).toMatchObject({ name: "id" })
    expect(list.getMember("id")).not.toHaveProperty("output")
  })

  test("a template that's none of the forms is refused", () => {
    expect(SP.parseReadAsTemplate("{it}.length")).toEqual({ form: "property", name: "length" })
    expect(SP.parseReadAsTemplate("{it}.getFullYear()")).toEqual({ form: "method", name: "getFullYear" })
    expect(SP.parseReadAsTemplate("core.itemCountOf({it})")).toEqual({ form: "core", name: "itemCountOf" })
    expect(SP.parseReadAsTemplate("core.getItemAt({it}, 1)")).toBeUndefined()
    expect(SP.parseReadAsTemplate("it.length")).toBeUndefined()
  })
})

/** `SP.typeName()`:  spell's words for its types, handed to the parser's language-free `P.typeName()`. */
describe("typeName()", () => {
  test("spell's own ways to write a built-in type", () => {
    expect(SP.typeName("string")).toBe("text")
    expect(SP.typeName("Yes or No")).toBe("choice")
    expect(SP.typeName("fractions")).toBe("number")
    expect(SP.typeName("array of Card")).toBe("list of cards")
    expect(SP.typeName("lists of numbers")).toBe("list of numbers")
  })

  test("the parser alone knows only each datatype's own name", () => {
    expect(P.typeName("Text")).toBe("text")
    expect(P.typeName("list of cards")).toBe("list of cards")
    expect(P.typeName("string")).toBe("String")
    expect(P.typeName("array of Card")).toBe("Array of Card")
  })

  test("anything else is a user's type, PascalCase and singular", () => {
    expect(SP.typeName("cards")).toBe("Card")
    expect(SP.typeName("playing_cards")).toBe("PlayingCard")
  })
})

/** A value of each built-in type the table has members for, to read them off. */
const SAMPLES: Record<string, unknown> = {
  text: "Ada",
  list: Object.assign(new List({}), { items: ["a", "b", "c"] }),
  "viewable list": new ViewableList({}),
  date: new Date(2026, 9, 4),
  thing: {},
  app: {}
}

/**
 * Read the member `template` names off `sample`, as compiled code would.
 * - Throws if there's no such helper, property or method.
 */
function readMember({ form, name }: SP.ReadAsTemplate, sample: unknown): unknown {
  if (form === "core") {
    const helper = (core as unknown as Record<string, unknown>)[name]
    if (typeof helper !== "function") throw new Error(`no core.${name}()`)
    return (helper as (it: unknown) => unknown).call(core, sample)
  }
  const object = Object(sample) as Record<string, unknown>
  if (!(name in object)) throw new Error(`no '${name}' on ${String(sample)}`)
  const value = object[name]
  if (form === "property") return value
  if (typeof value !== "function") throw new Error(`'${name}' of ${String(sample)} isn't a method`)
  return (value as () => unknown).call(sample)
}

/**
 * Is `value` a `datatype`, as the runtime says?
 * - A `list of ...` is any list.
 * - Unknown datatype:  anything is.
 */
function isA(value: unknown, datatype: P.Datatype | undefined): boolean {
  if (!datatype) return true
  if (P.itemTypeOf(datatype)) return core.isArrayLike(value)
  return core.isOfType(value, datatype)
}

describe("SP.docsCountingFrom()", () => {
  test("a project counting from 0:  the list's docs say so", () => {
    const list = SP.builtInTypeEntry("list")!
    expect(SP.docsCountingFrom(list.detail!, 0)).toBe("counts from 0")
    expect(SP.docsCountingFrom(list.docstring!, 0)).toContain("Counts from 0:  `card 0 of the deck` is the first.")
  })
  test("counting from 1:  as they are", () => {
    const list = SP.builtInTypeEntry("list")!
    expect(SP.docsCountingFrom(list.docstring!, 1)).toBe(list.docstring)
  })
})
