import { describe, expect, test } from "vite-plus/test"

import { DECIMAL_NOTE, lexiconFor, nsidFor, spellTypeFor, Thing, type LexiconDocument } from "spell/parser/core"
import { runSpell } from "spell/parser/spell/test"

/**
 * A type as a Lexicon, and a Lexicon read back as a type (`lexicon.ts`, epic `atmosphere` P10).
 * - The class is what Spell compiles from:
 *
 *   ```spell
 *   a recipe is a thing:
 *   - its "title" is text, which must not be empty
 *   - its "servings" is an integer, which must be between 1 and 20
 *   - its "price" is a number
 *   - its "vegan" is yes or no
 *   - its "made on" is a date
 *   - its "tags" is a list of text
 *   - its "course" is one of starter, main or pudding
 *   - its "site" is text, which must be a url
 *   - its "cook" is a person
 *   ```
 */
class Recipe extends Thing {
  static {
    this.declareProp("title", { type: "text", rules: [{ type: "empty" }, { type: "maxLength", value: "80" }] })
    this.declareProp("servings", { type: "integer", rules: [{ type: "range", value: "1..20" }] })
    this.declareProp("price", { type: "number" })
    this.declareProp("vegan", { type: "choice" })
    this.declareProp("madeOn", { type: "date" })
    this.declareProp("tags", { itemType: "text" })
    this.declareProp("course", { oneOf: ["starter", "main", "pudding"] })
    this.declareProp("site", { type: "text", rules: [{ type: "url" }] })
    this.declareProp("cook", { type: "Person" })
  }
}

/** Statusphere's own, as Bluesky's example app publishes it (github.com/bluesky-social/statusphere-example-app). */
const STATUSPHERE: LexiconDocument = {
  lexicon: 1,
  id: "xyz.statusphere.status",
  defs: {
    main: {
      type: "record",
      key: "tid",
      record: {
        type: "object",
        required: ["status", "createdAt"],
        properties: {
          status: { type: "string", minLength: 1, maxLength: 32, maxGraphemes: 1 },
          createdAt: { type: "string", format: "datetime" }
        }
      }
    }
  }
}

describe("nsidFor()", () => {
  test("a folder's address, reversed under spell.space, then the type", () => {
    expect(nsidFor("owen@spell/recipes", "Recipe")).toBe("space.spell.owen.recipes.recipe")
    expect(nsidFor("@spell/examples/RecipeBox", "DatedEvent")).toBe("space.spell.spell.examples.recipebox.datedEvent")
    expect(nsidFor("ana@family/cook_book", "Recipe")).toBe("space.spell.family.ana.cook-book.recipe")
    expect(nsidFor("@events_team/plans", "Plan")).toBe("space.spell.events-team.plans.plan")
  })
})

describe("lexiconFor()", () => {
  const { defs } = lexiconFor(Recipe, { id: "space.spell.owen.recipes.recipe" })
  const { properties, required } = defs.main.record

  test("a record, keyed by the thing's own id, every field a person's words for it", () => {
    expect(defs.main).toMatchObject({ type: "record", key: "any", description: "recipe" })
    expect(Object.keys(properties)).toEqual([
      "title",
      "servings",
      "price",
      "vegan",
      "madeOn",
      "tags",
      "course",
      "site",
      "cook"
    ])
    expect(properties.madeOn).toEqual({ type: "string", format: "datetime", description: "made on" })
  })

  test("each kind, and its rules as Lexicon's own", () => {
    expect(properties).toEqual({
      title: { type: "string", description: "title", minLength: 1, maxGraphemes: 80 },
      servings: { type: "integer", description: "servings", minimum: 1, maximum: 20 },
      price: { type: "string", description: `price:  ${DECIMAL_NOTE}` },
      vegan: { type: "boolean", description: "vegan" },
      madeOn: { type: "string", format: "datetime", description: "made on" },
      tags: { type: "array", items: { type: "string" }, description: "tags" },
      course: { type: "string", enum: ["starter", "main", "pudding"], description: "course" },
      site: { type: "string", format: "uri", description: "site" },
      cook: { type: "unknown", description: "cook" }
    })
    expect(required).toEqual(["title"])
  })
})

describe("spellTypeFor()", () => {
  test("Statusphere's status, as Spell says it", () => {
    const { typeWords, source, notes } = spellTypeFor(STATUSPHERE)
    expect(typeWords).toBe("status")
    expect(source).toBe(
      [
        '// Read in from the Lexicon "xyz.statusphere.status" (spell space lexicon read):  its records\' shape, as Spell says it.',
        '// - "status" holds at most 32 bytes:  Spell says lengths in letters',
        'a "status" is a thing:',
        '\t- it is published as "xyz.statusphere.status"',
        '\t- its "status" is required text, with maximum length 1',
        '\t- its "created at" is a required date',
        ""
      ].join("\n")
    )
    expect(notes).toHaveLength(1)
  })

  test("`required` goes in a plain kind;  one length on the line, the other a rule line", () => {
    const fields: LexiconDocument = {
      ...STATUSPHERE,
      defs: {
        main: {
          type: "record",
          key: "tid",
          record: {
            type: "object",
            required: ["name", "mood", "count"],
            properties: {
              name: { type: "string", minGraphemes: 2, maxGraphemes: 40 },
              nick: { type: "string", minGraphemes: 2 },
              mood: { type: "string", enum: ["happy", "sad"] },
              count: { type: "integer" }
            }
          }
        }
      }
    }
    expect(spellTypeFor(fields).source.split("\n").slice(3, -1)).toEqual([
      '\t- its "name" is required text, with maximum length 40',
      '\t- its "nick" is text, with minimum length 2',
      '\t- its "mood" is one of happy or sad',
      '\t- its "count" is a required integer',
      "\t- its name must be at least 2 letters long",
      "\t- its mood must not be empty"
    ])
  })

  test("what Spell can't hold yet is left out, and said", () => {
    const blob: LexiconDocument = {
      ...STATUSPHERE,
      defs: {
        main: { type: "record", key: "tid", record: { type: "object", properties: { photo: { type: "blob" } } } }
      }
    }
    expect(spellTypeFor(blob).notes).toEqual([
      "\"photo\" is blob in the Lexicon:  Spell can't hold one yet, so it's left out"
    ])
  })

  test("only a record is a type", () => {
    expect(() => spellTypeFor({ ...STATUSPHERE, defs: { main: { type: "query" } } } as never)).toThrow(TypeError)
  })
})

describe("the round trip:  a Lexicon read in as Spell, compiled, and written again", () => {
  /** `document` read in, compiled and run:  its class's Lexicon. */
  function roundTrip(document: LexiconDocument): LexiconDocument {
    const { source } = spellTypeFor(document)
    const Class = runSpell(source.split("\n"))("Status").Status as Function & { publishedAs: unknown }
    expect(Class.publishedAs).toBe(document.id)
    return lexiconFor(Class, { id: `${Class.publishedAs as string}` })
  }

  test("Statusphere's status:  the same fields, kinds and rules, but its length in bytes", () => {
    const { main } = roundTrip(STATUSPHERE).defs
    expect(main.record.required).toEqual(["status", "createdAt"])
    expect(main.record.properties).toEqual({
      status: { type: "string", description: "status", minLength: 1, maxGraphemes: 1 },
      createdAt: { type: "string", format: "datetime", description: "created at" }
    })
  })

  test("every kind of field Spell has:  each comes back as it went", () => {
    const every = lexiconFor(Recipe, { id: "xyz.statusphere.status" })
    const { cook: _cook, ...held } = every.defs.main.record.properties
    const back = roundTrip(every).defs.main.record
    expect(back.properties).toEqual(held)
    expect(back.required).toEqual(["title"])
  })
})
