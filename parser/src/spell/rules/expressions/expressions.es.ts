/**
 * The `expressions` rules in Spanish:  each rule's syntax and its tests, registered on Spanish's own `expressions` parser
 * (epic `spanish`).
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `expressions.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 * - A keyword with a written accent is accepted without it too:  `(está|esta)`, `(más|mas)`.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"

import { And } from "./And"
import { ArithmeticExpression } from "./ArithmeticExpression"
import { AsAType } from "./AsAType"
import { AsLowercase } from "./AsLowercase"
import { AsUppercase } from "./AsUppercase"
import { CompoundExpression } from "./CompoundExpression"
import { DoesNotInclude } from "./DoesNotInclude"
import { Exists } from "./Exists"
import { Includes } from "./Includes"
import { IsA } from "./IsA"
import { IsDefined } from "./IsDefined"
import { IsEmpty } from "./IsEmpty"
import { IsEqual } from "./IsEqual"
import { IsExactly } from "./IsExactly"
import { IsIn } from "./IsIn"
import { IsSameTypeAs } from "./IsSameTypeAs"
import { Synonyms } from "./Synonyms"
import { Wording } from "./Wording"
import { Negatable } from "./Negatable"
import { Or } from "./Or"
import { ParenthesizedExpression } from "./ParenthesizedExpression"
import { ThereIsA } from "./ThereIsA"
import { UnicodeCode } from "./UnicodeCode"
import { UnicodeExpression } from "./UnicodeExpression"
import { UnicodeLiteral } from "./UnicodeLiteral"

/** Spanish's `expressions` rules. */
export const expressionsEs = new SpellParser({ module: "expressions" })

////////////////
// ## Word rules:  Spanish's words for each of English's, under the same names and meanings
////////////////

// Every form of `is`, `{is_or_is_not}`:  `no` goes before the verb
expressionsEs.addRule(Negatable.specialize({ ruleName: "is_or_is_not", alias: "is" }), {
  syntax: "(es|está|esta|(negated:no es|no está|no esta))"
})

// `es un`, and the plural's `son unos`, or bare `son`:  `cartas que no son figuras`
expressionsEs.addRule(Negatable.specialize({ ruleName: "is_or_is_not_a" }), {
  syntax: "(es un|es una|son unos|son unas|son|(negated:no es un|no es una|no son unos|no son unas|no son))"
})

expressionsEs.addRule(Negatable.specialize({ ruleName: "can_or_cannot", alias: "can" }), {
  syntax: "(puede|pueden|(negated:no puede|no pueden))"
})

expressionsEs.addRule(Negatable.specialize({ ruleName: "will_or_will_not", alias: "will" }), {
  syntax: "(va a|van a|(negated:no va a|no van a))"
})

expressionsEs.addRule(Negatable.specialize({ ruleName: "has_or_has_not", alias: "has" }), {
  syntax: "(tiene|tienen|(negated:no tiene|no tienen))"
})

// The articles:  `{indefinite_article}` matches `un` / `una`, `{definite_article}` `el` / `la` / `los` / `las`
expressionsEs.addRule(Synonyms.specialize({ ruleName: "indefinite_article" }), { syntax: "(un|una|unos|unas)" })
expressionsEs.addRule(Synonyms.specialize({ ruleName: "definite_article" }), { syntax: "(el|la|los|las)" })

// `es` or `son` after a property's quoted name, its subject left out:  `- "color" es rojo`
expressionsEs.addRule(Synonyms.specialize({ ruleName: "is_or_are" }), { syntax: "(es|son)/i" })

// The verbs an outline body's line may start with, its subject left out:  `tiene un mazo`, `pertenece a un juego`
expressionsEs.addRule(Synonyms.specialize({ ruleName: "has_or_belongs" }), { syntax: "(tiene|pertenece)/i" })

// The words joining things in a list:  `comodines y nombre = "grande"`;  `e` before an i- word, `u` before an o- one
expressionsEs.addRule(Wording.specialize({ ruleName: "and_or", meanings: ["and", "or"] }), {
  syntax: "((and:y|e)|(or:o|u))"
})

// `no es ni rojo ni verde`:  only negated
expressionsEs.addRule(Negatable.specialize({ ruleName: "is_neither" }), {
  syntax: "(negated:no es ni|no está ni|no esta ni)"
})

expressionsEs.addRule(Negatable.specialize({ ruleName: "is_defined_or_not" }), {
  syntax:
    "(está definido|esta definido|está definida|esta definida|(negated:no está definido|no esta definido|no está definida|no esta definida|está indefinido|esta indefinido|está indefinida|esta indefinida|es indefinido|es indefinida))"
})

expressionsEs.addRule(Negatable.specialize({ ruleName: "exists_or_not" }), {
  syntax: "(existe|(negated:no existe))"
})

expressionsEs.addRule(Negatable.specialize({ ruleName: "there_is_or_is_not" }), {
  syntax: "(hay un|hay una|(negated:no hay un|no hay una|no hay ningún|no hay ningun|no hay ninguna))"
})

////////////////
// ## Expressions
////////////////

expressionsEs.addRule(ParenthesizedExpression, {
  syntax: "\\( {expression} \\)",
  tests: [
    {
      title: "correctly matches parenthesized expressions",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["(thing)", "(thing)"],
        ["((thing))", "(thing)"],
        ["(((thing)))", "(thing)"],
        ["(1 y sí)", "(1 && true)"]
      ]
    },
    {
      title: "correctly matches multiple parenthesis",
      compileAs: "expression",
      tests: [
        ["(1) y (sí)", "(1 && true)"],
        ["((1) y (sí))", "(1 && true)"],
        ["((1) y ((si)))", "(1 && true)"]
      ]
    },
    {
      title: "doesn't match malformed parenthesized expressions",
      tests: [
        ["(foo", undefined],
        ["(foo(bar)baz", undefined]
      ]
    }
  ]
})

expressionsEs.addRule(CompoundExpression, {
  syntax: "{lhs:operand} {rhsChain:expression_suffix}*",
  tests: [
    {
      title: "complex math expressions",
      compileAs: "expression",
      tests: [
        ["1 + 2 + 3", "(1 + 2 + 3)"],
        ["1 + 2 * 3", "(1 + 2 * 3)"],
        ["(1+1) * (2+2)", "((1 + 1) * (2 + 2))"],
        ["((1+1) * (2+2))", "((1 + 1) * (2 + 2))"]
      ]
    },
    {
      title: "complex property/etc expressions",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [[`el suit de la card es "ace"`, `(card.suit == "ace")`]]
    },
    {
      title: "postfix binds like a comparison:  after arithmetic, before `y`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("x")
        scope.variables?.add("z")
      },
      // `y` is Spanish's `and`:  English's variable `y` is `z` here
      tests: [
        ["x + z está vacío", "core.isEmpty(x + z)"],
        ["x es 1 y z está vacío", "(x == 1 && core.isEmpty(z))"]
      ]
    }
  ]
})

expressionsEs.addRule(ArithmeticExpression, {
  syntax: "{lhs:operand} {rhsChain:expression_suffix}*",
  tests: [
    {
      compileAs: "arithmetic_expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("x")
      },
      tests: [
        ["x + 1 * 2", "(x + 1 * 2)"],
        ["x", "x"]
      ]
    }
  ]
})

expressionsEs.addRule(And, {
  syntax: "(operator:y|e) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
        scope.variables?.add("yet-another")
      },
      tests: [
        ["thing y other", "(thing && other)"],
        ["thing y other y yet-another", "(thing && other && yetAnother)"],
        ["thing es 1 y other es 2", "(thing == 1 && other == 2)"]
      ]
    }
  ]
})

expressionsEs.addRule(Or, {
  syntax: "(operator:o|u) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [["thing o other", "(thing || other)"]]
    }
  ]
})

expressionsEs.addRule(IsEqual, {
  syntax: "{operator:is_or_is_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing es other", "(thing == other)"],
        ["thing no es other", "(thing != other)"],
        ["thing está other", "(thing == other)"]
      ]
    }
  ]
})

expressionsEs.addRule(IsExactly, {
  syntax: "{operator:is_or_is_not} exactamente {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing es exactamente other", "(thing === other)"],
        ["thing no es exactamente other", "(thing !== other)"]
      ]
    }
  ]
})

expressionsEs.addRule(IsA, {
  syntax: "{operator:is_or_is_not_a} {expression:known_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.types?.add("Bee")
        scope.types?.add("Animal")
      },
      tests: [
        ["thing es una Bee", "thing instanceof Bee"],
        ["thing es un Animal", "thing instanceof Animal"],
        ["thing no es una Bee", "!(thing instanceof Bee)"],
        ["thing no es un Animal", "!(thing instanceof Animal)"],
        ["thing es un número", 'typeof thing === "number"'],
        ["thing es un numero", 'typeof thing === "number"'],
        ["thing es un booleano", 'core.isOfType(thing, "choice")'],
        ["thing es una lista", 'core.isOfType(thing, "List")'],
        // an unknown type is no type:  `es una crata` doesn't parse
        ["thing es una crata", "thing"]
      ]
    }
  ]
})

expressionsEs.addRule(IsSameTypeAs, {
  syntax: "{operator:is_or_is_not} (del|el) mismo tipo que {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing es del mismo tipo que other", "core.matchesType(thing, other)"],
        ["thing no es del mismo tipo que other", "!core.matchesType(thing, other)"]
      ]
    }
  ]
})

expressionsEs.addRule(IsIn, {
  syntax:
    "{operator:is_or_is_not} (en|uno de|una de|o bien uno de|o bien una de|o bien) (expression:{operand}|{identifier_list})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("red")
        scope.constants?.add("green")
        scope.variables?.add("theList")
      },
      tests: [
        ["thing está en theList", "core.includes(theList, thing)"],
        ["thing es uno de theList", "core.includes(theList, thing)"],
        ["thing es una de theList", "core.includes(theList, thing)"],
        ["thing no está en theList", "!core.includes(theList, thing)"],
        // `no es uno` isn't a position in the list (`false == 1`):  a yes / no counts no place
        ["thing no es uno de theList", "!core.includes(theList, thing)"],
        ["thing no es una de theList", "!core.includes(theList, thing)"],
        ["thing es o bien red o green", 'core.includes([red, "green"], thing)'],
        ["thing es o bien uno de red o green", 'core.includes([red, "green"], thing)'],
        ["thing no es o bien red o green", '!core.includes([red, "green"], thing)'],
        ["thing no es o bien uno de red o green", '!core.includes([red, "green"], thing)']
      ]
    }
  ]
})

// `no es ni rojo ni verde`:  always negated
expressionsEs.addRule(IsIn, {
  syntax: "{operator:is_neither} (expression:{operand}|{identifier_list})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("red")
        scope.constants?.add("green")
      },
      tests: [["thing no es ni red ni green", '!core.includes([red, "green"], thing)']]
    }
  ]
})

// `thing es green o blue`, the values known -- see `value_choices`
expressionsEs.addRule(IsIn, {
  syntax: "{operator:is_or_is_not} (expression:{value_choices})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.constants?.add("green")
        scope.constants?.add("blue")
      },
      tests: [
        ["thing es green o blue", 'core.includes(["green", "blue"], thing)'],
        ["thing no es green o blue", '!core.includes(["green", "blue"], thing)'],
        ["thing es green o thing es blue", '(thing == "green" || thing == "blue")']
      ]
    }
  ]
})

expressionsEs.addRule(Includes, {
  syntax: "(operator:incluye|contiene) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("theList")
        scope.variables?.add("thing")
      },
      tests: [
        ["theList incluye thing", "core.includes(theList, thing)"],
        ["theList contiene thing", "core.includes(theList, thing)"]
      ]
    }
  ]
})

expressionsEs.addRule(DoesNotInclude, {
  syntax: "(operator:no (incluye|contiene)) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("theList")
        scope.variables?.add("thing")
      },
      tests: [
        ["theList no incluye thing", "!core.includes(theList, thing)"],
        ["theList no contiene thing", "!core.includes(theList, thing)"]
      ]
    }
  ]
})

expressionsEs.addRule(IsDefined, {
  syntax: "{operator:is_defined_or_not}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["thing está definido", "thing !== undefined"],
        ["thing está indefinido", "thing === undefined"],
        ["thing no está definido", "thing === undefined"],
        ["thing no esta definida", "thing === undefined"]
      ]
    }
  ]
})

expressionsEs.addRule(Exists, {
  syntax: "{operator:exists_or_not}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["thing existe", "thing !== undefined"],
        ["thing no existe", "thing === undefined"]
      ]
    }
  ]
})

expressionsEs.addRule(ThereIsA, {
  syntax: "{operator:there_is_or_is_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("animal")
      },
      tests: [
        { input: "hay una thing", js: "thing !== undefined" },
        { input: "hay un animal", js: "animal !== undefined" },
        { input: "no hay una thing", js: "thing === undefined" },
        { input: "no hay ningún animal", js: "animal === undefined" },
        // an operand:  `y` is the expression's, not the thing's (D23)
        {
          input: "hay una thing y animal",
          js: "(thing !== undefined && animal)"
        }
      ]
    }
  ]
})

expressionsEs.addRule(IsEmpty, {
  syntax: "{operator:is_or_is_not} (vacío|vacio|vacía|vacia)",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["thing está vacío", "core.isEmpty(thing)"],
        ["thing esta vacia", "core.isEmpty(thing)"],
        ["thing no está vacío", "!core.isEmpty(thing)"]
      ]
    }
  ]
})

expressionsEs.addRule(AsUppercase, {
  syntax: "(como|en) (mayúsculas|mayusculas)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`"foo" en mayúsculas`, '"foo".toLocaleUpperCase()'],
        [`1 como mayusculas`, '`${1 ?? ""}`.toLocaleUpperCase()']
      ]
    }
  ]
})

expressionsEs.addRule(AsLowercase, {
  syntax: "(como|en) (minúsculas|minusculas)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`"foo" en minúsculas`, '"foo".toLocaleLowerCase()'],
        [`1 como minusculas`, `core.lowerCase(1)`]
      ]
    }
  ]
})

// The type is read by the language's type words:  `cadena` means `text`, `fracción` `number`
expressionsEs.addRule(AsAType, {
  syntax: "como (un|una) (type:cadena|número|numero|fracción|fraccion|entero)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["1 como una cadena", "`${1}`"],
        [`"hola" como una cadena`, '`${"hola"}`'],
        ["1 como un número", "parseFloat(1)"],
        ["1.3 como una fracción", "parseFloat(1.3)"],
        ["1.4 como un entero", "parseInt(1.4)"],
        [`"foo" como un numero`, `parseFloat("foo")`]
      ]
    }
  ]
})

expressionsEs.addRule(AsAType, {
  syntax: "como (type:texto)",
  tests: [
    {
      compileAs: "expression",
      tests: [["1 como texto", "`${1}`"]]
    }
  ]
})

expressionsEs.addRule(UnicodeCode)

expressionsEs.addRule(UnicodeLiteral, {
  syntax: "unicode {code:unicode_code}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["unicode 1F0A0", '"🂠"'],
        ["unicode 2665", '"♥"'],
        ["unicode A0", '" "'],
        ["unicode 110000", "core.unicode(110000)"]
      ]
    }
  ]
})

expressionsEs.addRule(UnicodeExpression, {
  syntax: "unicode {code:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("code")
      },
      tests: [
        ["unicode code", "core.unicode(code)"],
        ["unicode (code + 1)", "core.unicode(code + 1)"]
      ]
    }
  ]
})
