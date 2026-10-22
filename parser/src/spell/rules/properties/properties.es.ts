/**
 * The `properties` rules in Spanish:  each rule's syntax and its tests, registered on Spanish's own `properties` parser
 * (epic `spanish`).
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `properties.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 *   A person's own names stay as English's tests have them (`rank`, `card`, `bar`), so the javascript does too.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"

import { BodyMemberWords } from "./BodyMemberWords"
import { ItsKnownProperty } from "./ItsKnownProperty"
import { ItsOrdinal } from "./ItsOrdinal"
import { ItsProperty } from "./ItsProperty"
import { MemberWords } from "./MemberWords"
import { ObjectLiteralProperties } from "./ObjectLiteralProperties"
import { ObjectLiteralProperty, NamedObjectLiteralProperty, FlagObjectLiteralProperty } from "./ObjectLiteralProperty"
import { Property } from "./Property"
import { PropertyExpression } from "./PropertyExpression"
import { QuotedMember } from "./QuotedMember"

/** Spanish's `properties` rules. */
export const propertiesEs = new SpellParser({ module: "properties" })

propertiesEs.addRule(Property)

propertiesEs.addRule(MemberWords, {
  tests: [
    {
      tests: [
        { title: "one word", input: "rank", js: "rank" },
        { title: "several words", input: "short rank", js: "shortRank" },
        { title: "a word English's blacklist holds", input: "short", js: "short" },
        { title: "dashed", input: "short-rank", js: "shortRank" },
        { title: "a structural word", input: "de", js: undefined },
        { title: "a leading preposition", input: "con jokers", js: "conJokers" },
        { title: "a preposition after the first word ends it", input: "jokers con", js: "jokers" }
      ]
    }
  ]
})

propertiesEs.addRule(BodyMemberWords, {
  tests: [
    {
      tests: [
        { title: "a name", input: "short rank", js: "shortRank" },
        { title: "a statement's first word", input: "devolver x", js: undefined }
      ]
    }
  ]
})

propertiesEs.addRule(QuotedMember, {
  tests: [
    {
      tests: [
        { title: "one word", input: '"rank"', js: "rank" },
        { title: "several words", input: '"short rank"', js: "shortRank" },
        { title: "dashed", input: '"short-rank"', js: "shortRank" },
        { title: "a leading preposition", input: '"con jokers"', js: "conJokers" },
        { title: "a structural word", input: '"rank de"', js: undefined }
      ]
    }
  ]
})

propertiesEs.addRule(PropertyExpression, {
  syntax: "(el|la|los|las)? {property:member_words} (de|del) {expression:operand}",
  tests: [
    {
      // Spanish names here:  Spanish's inflector makes English's `suit` plural as `suites`, and `cards` a type of its own
      title: "resolved:  what the type declares",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "una carta es una cosa",
            "una carta tiene un palo como uno de tréboles, diamantes",
            "el short rank de una carta es: 1",
            "el long-name de una carta es: 2",
            "un mazo es una lista de cartas",
            "la última carta de un mazo es: su última carta",
            "la carta es una nueva carta",
            "el mazo es un nuevo mazo"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        ["el short rank de la carta", "carta.shortRank"],
        ["el short-rank de la carta", "carta.shortRank"],
        ["el long name de la carta", "carta.longName"],
        ["la última carta del mazo", "mazo.últimaCarta"],
        ["el short rank de la última carta del mazo", "mazo.últimaCarta.shortRank"],
        ["el palo de la carta", "carta.palo"],
        ["los palos de la carta", "Carta.Palos"]
      ]
    },
    {
      title: "built in:  as the type's table entry compiles it -- see `SP.BUILT_IN_TYPE_TABLE`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "name", datatype: "text" })
        scope.variables?.add({ name: "deck", datatype: "list" })
        scope.variables?.add({ name: "due", datatype: "date" })
        scope.variables?.add("bar")
      },
      tests: [
        ["el largo del name", "name.length"],
        ["la longitud del name", "name.length"],
        ["el largo del deck", "core.itemCountOf(deck)"],
        ["el año del due", "due.getFullYear()"],
        { title: "unknown type:  a loose read, as before", input: "el largo de bar", js: "bar.largo" }
      ]
    },
    {
      title: "loose:  one word, nothing need declare",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("bar")
        scope.variables?.add("baz")
      },
      tests: [
        ["el foo de bar", "bar.foo"],
        ["el foo de la bar", "bar.foo"],
        ["el foo del bar", "bar.foo"],
        ["el foo de la bar de la baz", "baz.bar.foo"],
        ["el foo-bar de la baz", "baz.fooBar"],
        // `qux`, not English's `bar`:  `bar` is a variable here, so `el foo bar de la baz` is the foo AT `bar` in baz,
        //   as Spanish says `la card n del deck`, `core.getItemAt(baz, position(bar))`
        { title: "several undeclared words:  not a property read", input: "el foo qux de la baz", js: undefined },
        { title: "a blacklisted word:  not a loose read", input: "el si de la baz", js: undefined }
      ]
    }
  ]
})

propertiesEs.addRule(ItsKnownProperty, {
  syntax: "(su|sus) {property:member_words}",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile(["una card es una cosa", "el short rank de una card es: 1"].join("\n"), "block")
      },
      tests: [
        [
          ["obtener una nueva card", "imprimir su short rank"],
          ["const it = new Card()", "core.console.log(it.shortRank)"]
        ],
        [
          ["obtener una nueva card", "imprimir su short rank + 1"],
          ["const it = new Card()", "core.console.log(it.shortRank + 1)"]
        ]
      ]
    }
  ]
})

propertiesEs.addRule(ItsProperty, {
  syntax: "(su|sus) {property}",
  tests: [
    {
      title: "tracks `it` when it var defined explicitly",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "it" })
      },
      tests: [
        ["su foo", "it.foo"],
        ["el foo de su bar", "it.bar.foo"]
      ]
    },
    {
      title: "tracks `it` when it var defined via get",
      compileAs: "block",
      tests: [
        [
          ["obtener una nueva cosa", "imprimir su foo"],
          ["const it = new Thing()", "core.console.log(it.foo)"]
        ]
      ]
    },
    {
      title: "tracks `it` when it var defined as output `other`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "other" })
      },
      tests: [
        ["su foo", "other.foo"],
        ["el foo de su bar", "other.bar.foo"]
      ]
    },
    {
      title: "maps to `this` when `it` is not defined",
      compileAs: "expression",
      tests: [
        ["su foo", "this.foo"],
        ["el foo de su bar", "this.bar.foo"]
      ]
    }
  ]
})

propertiesEs.addRule(ItsOrdinal, {
  syntax: "(su|sus) {ordinal} {arg:singular_identifier}",
  tests: [
    {
      title: "tracks `it` when it var defined explicitly",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "it" })
      },
      tests: [
        ["su tercer foo", "core.getItemAt(it, 2)"],
        ["su última card", "core.getItemAt(it, -1)"],
        ["su ultima card", "core.getItemAt(it, -1)"]
      ]
    },
    {
      title: "tracks `it` when it var defined via get",
      compileAs: "block",
      tests: [
        [
          ["obtener una nueva cosa", "imprimir su último item"],
          ["const it = new Thing()", "core.console.log(core.getItemAt(it, -1))"],
          ["const it = new Thing()", "core.console.log(core.getItemAt(it, -1)!)"]
        ]
      ]
    },
    {
      title: "tracks `it` when it var defined as output `other`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "other" })
      },
      tests: [["su tercera thing", "core.getItemAt(other, 2)"]]
    },
    {
      title: "maps to `this` when `it` is not defined",
      compileAs: "expression",
      tests: [["su tercera thing", "core.getItemAt(this, 2)"]]
    }
  ]
})

propertiesEs.addRule(ObjectLiteralProperty, {
  syntax: "(property:{member_words}|{property}) (=|es|de) {value:expression}",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        scope.variables?.add("bar")
      },
      tests: [
        [``, undefined],
        [`x = 1`, `x: 1`],
        [`b = sí`, `b: true`],
        [`c = "quoted"`, `c: "quoted"`],
        [`b = el foo de la bar`, `b: bar.foo`],

        [`length es 1`, `length: 1`],
        [`rank de "queen"`, `rank: "queen"`],
        [`short rank es 1`, "shortRank: 1"],

        // TODO: `{property}` converts to `foo_bar` before we get here
        [`foo-bar = 1`, "fooBar: 1"]
      ]
    }
  ]
})

propertiesEs.addRule(NamedObjectLiteralProperty, {
  syntax: "{property} {value:thing_name}",
  tests: [
    {
      tests: [
        [`name T1`, `name: "T1"`],
        [`name t1`, undefined]
      ]
    }
  ]
})

propertiesEs.addRule(FlagObjectLiteralProperty, {
  syntax: "{property}",
  tests: [{ tests: [[`jokers`, `jokers: true`]] }]
})

propertiesEs.addRule(ObjectLiteralProperties, {
  syntax: "[{object_literal_property} (,|y|e)]",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        scope.variables?.add("bar")
      },
      tests: [
        [``, undefined],
        [`x = 1`, `{ x: 1 }`],
        [`x = 1,`, `{ x: 1 }`],
        [`x = 1, b = sí, c = "quoted"`, [`{`, `  x: 1,`, `  b: true,`, `  c: "quoted"`, `}`]],
        [`x = 1, b = el foo de la bar`, `{ x: 1, b: bar.foo }`],
        [`x = 1 y b = 2`, `{ x: 1, b: 2 }`],

        [`length es 1, rank de "queen"`, `{ length: 1, rank: "queen" }`],

        // TODO: `{property}` converts to `foo_bar` before we get here
        [`foo-bar = 1`, "{ fooBar: 1 }"]
      ]
    }
  ]
})
