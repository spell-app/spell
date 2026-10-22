import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-lang/spell"
import {
  SPELL_SYNTAX_FILE,
  purposeOf,
  spellSyntax,
  spellSyntaxFileFor,
  withoutComments
} from "spell-lang/spell/node/spellSyntax"

/** Where `yarn spell:gen:syntax` writes the spell syntax tables. */
const SYNTAX_FOLDER = resolve(import.meta.dirname, "../../../src/spell")

describe("each language's spell syntax table is up to date:  if not, run `yarn spell:gen:syntax` in spell-lang", () => {
  for (const language of SP.Language.all.values()) {
    const file = spellSyntaxFileFor(language)
    test(`${language.name}'s, ${file}`, () => {
      const written = JSON.parse(readFileSync(resolve(SYNTAX_FOLDER, file), "utf8")) as unknown
      expect(written, `${file} is out of date:  run \`yarn spell:gen:syntax\` in spell-lang`).toEqual(
        spellSyntax(language)
      )
    })
  }

  test("English's is spellSyntax.json;  Spanish's, spellSyntax.es.json", () => {
    expect(spellSyntaxFileFor(SP.english)).toBe(SPELL_SYNTAX_FILE)
    expect(spellSyntaxFileFor(SP.spanish)).toBe("spellSyntax.es.json")
  })
})

describe("the spell syntax table, spellSyntax.json", () => {
  const data = spellSyntax()
  const rows = data.modules.flatMap((module) => module.rules)

  test("lists each rule class once, every rule name under one", () => {
    const classes = rows.map((row) => row.className)
    expect(new Set(classes).size).toBe(classes.length)
    const names = rows.flatMap((row) => row.ruleNames)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(expect.arrayContaining(["is_gt_lt", "list_add_relative", "is_or_is_not", "can_or_cannot"]))
  })

  test("a rule's syntax, its example in each writer, and its aliases", () => {
    expect(rows.find((row) => row.className === "IsGtLt")).toMatchObject({
      ruleNames: ["is_gt_lt"],
      internal: false,
      file: "src/spell/rules/math/IsGtLt.ts",
      syntaxes: [
        {
          syntax: "{operator:is_greater_or_less_than} {expression:operand}",
          example: "salary is greater than expenses",
          outputs: {
            js: { code: "(salary > expenses)" },
            ts: { code: "(salary > expenses)" },
            py: { code: "(salary > expenses)" }
          }
        }
      ],
      aliases: ["expression_suffix"]
    })
  })

  test("a rule registered with several syntaxes:  each, with an example from its own tests", () => {
    const { syntaxes } = rows.find((row) => row.className === "AssignmentStatement")!
    expect(syntaxes.map(({ syntax, example }) => [syntax, example])).toEqual([
      ["(thing:{expression}|{variable}) = {value:expression}", "unknown-var = yes"],
      ["let (thing:{expression}|{variable}) = {value:expression}", 'let the name of thing = "bob"'],
      ["set (thing:{expression}|{variable}) to {value:expression}", "set unknown-var to yes"],
      ["{thing:variable} is {value:expression}", 'bob is a new person whose name is "bob"']
    ])
  })

  test("a base class nobody registers is internal, with no syntax, but its aliases", () => {
    expect(rows.find((it) => it.className === "SpellExpression")).toMatchObject({
      internal: true,
      ruleNames: [],
      syntaxes: [],
      aliases: ["expression"]
    })
  })

  test("in each module, its internal rows come first", () => {
    for (const { rules } of data.modules) {
      const firstRegistered = rules.findIndex((rule) => !rule.internal)
      expect(rules.slice(firstRegistered).some((rule) => rule.internal)).toBe(false)
    }
  })

  test("a class specialized into several rules is one row, with each rule's syntax", () => {
    const row = rows.find((it) => it.className === "Negatable")
    expect(row?.ruleNames).toEqual([
      "is_or_is_not",
      "is_or_is_not_a",
      "can_or_cannot",
      "will_or_will_not",
      "has_or_has_not",
      "is_neither",
      "is_defined_or_not",
      "exists_or_not",
      "there_is_or_is_not",
      "starts_with_or_not",
      "ends_with_or_not",
      "has_or_has_no",
      "exclusive_or_not"
    ])
    expect(row?.syntaxes[0]).toEqual({ syntax: "(is|(negated:is not|isn't|isnt))" })
  })

  test("no comments in the examples, nor in what the writers write, but in the comment rule's own", () => {
    const pile = rows.find((row) => row.className === "CreateDrawableListType")!.syntaxes[0]!.outputs!.ts
    expect("code" in pile && pile.code).toContain("class PileElement")
    const commented = rows
      .filter((row) => row.className !== "CommentLine")
      .flatMap((row) => row.syntaxes)
      .flatMap(({ example = "", outputs }) => [example, ...Object.values(outputs ?? {})])
      .map((each) => (typeof each === "string" ? each : "code" in each ? each.code : ""))
      .filter((code) => /^\s*(\/\/|#(?!#))|\/\*/m.test(code))
    expect(commented).toEqual([])
  })
})

describe("withoutComments()", () => {
  test("javascript and TypeScript:  line and block comments go, quoted text stays", () => {
    expect(
      withoutComments(
        [
          "/**",
          " * A pile.",
          " */",
          "export class Pile {",
          '  url = "http://x" // where',
          "  value: any /* spell: type unknown */ = 1",
          "}"
        ].join("\n"),
        "js"
      )
    ).toBe(["export class Pile {", '  url = "http://x"', "  value: any = 1", "}"].join("\n"))
  })

  test("Python:  `#` comments go, but not in a string", () => {
    expect(withoutComments('x = "#1"  # the first\n# done\ny = 2', "py")).toBe('x = "#1"\ny = 2')
  })

  test("spell:  an apostrophe is no quote;  a comment that's all there is stays", () => {
    expect(withoutComments("it isn't red // yet", "spell")).toBe("it isn't red")
    expect(withoutComments("// foo", "spell")).toBe("// foo")
  })
})

describe("purposeOf()", () => {
  test("the docstring's first sentence, without its rule's name", () => {
    expect(purposeOf("`is_gt_lt` rule:  `is greater than`, e.g. `a is greater than b`.\n- more")).toBe(
      "`is greater than`, e.g. `a is greater than b`."
    )
    expect(purposeOf("Base class for all spell statement rules.  Second sentence.")).toBe(
      "Base class for all spell statement rules."
    )
  })

  test("a lead ending in a colon ends in a period;  none:  blank", () => {
    expect(purposeOf("a class variable, e.g.:\n- `card suits`")).toBe("A class variable, e.g.")
    expect(purposeOf(undefined)).toBe("")
  })
})

describe("Spanish's spell syntax table, spellSyntax.es.json", () => {
  const rows = spellSyntax(SP.spanish).modules.flatMap((module) => module.rules)

  test("a rule's Spanish syntax, its example from its Spanish tests, and what that compiles to", () => {
    expect(rows.find((row) => row.className === "IsGtLt")).toMatchObject({
      ruleNames: ["is_gt_lt"],
      file: "src/spell/rules/math/IsGtLt.ts",
      syntaxes: [
        {
          syntax: "{operator:is_greater_or_less_than} {expression:operand}",
          example: "salary es mayor que expenses",
          outputs: { js: { code: "(salary > expenses)" } }
        }
      ]
    })
  })

  test("a word rule says its Spanish words", () => {
    const row = rows.find((it) => it.className === "Negatable")
    expect(row?.syntaxes[0]).toEqual({ syntax: "(es|está|esta|(negated:no es|no está|no esta))" })
  })

  test("every example compiles, in javascript", () => {
    const failed = rows
      .flatMap((row) => row.syntaxes.map((form) => ({ className: row.className, ...form })))
      .filter(({ outputs }) => outputs && "error" in outputs.js)
      .map(({ className, example }) => `${className}:  ${example}`)
    expect(failed).toEqual([])
  })
})
