/**
 * The `expressions` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `expressions` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `expressions.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 * - A keyword with a written accent is accepted without it too:  `(está|esta)`, `(más|mas)`.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"

import { And } from "./And"
import { ArithmeticExpression } from "./ArithmeticExpression"
import { AsAType } from "./AsAType"
import { AsFileContents, FILE_READINGS } from "./AsFileContents"
import { AsLowercase } from "./AsLowercase"
import { AsTitleCase } from "./AsTitleCase"
import { WithCommas } from "./WithCommas"
import { Joined } from "./Joined"
import { Now } from "./Now"
import { AsADate } from "./AsADate"
import { AsADuration } from "./AsADuration"
import { AsTwoDigits } from "./AsTwoDigits"
import { DaysInTheMonth } from "./DaysInTheMonth"
import { DaysUntil } from "./DaysUntil"
import { DurationPart } from "./DurationPart"
import { IsBeforeOrAfter } from "./IsBeforeOrAfter"
import { IsDayFromToday } from "./IsDayFromToday"
import { IsDayPart } from "./IsDayPart"
import { IsMeridiem } from "./IsMeridiem"
import { IsSameDayAs } from "./IsSameDayAs"
import { IsWeekendDay } from "./IsWeekendDay"
import { NextWeekend } from "./NextWeekend"
import { StartOfTheDay } from "./StartOfTheDay"
import { TheDate } from "./TheDate"
import { TimeLiteral } from "./TimeLiteral"
import { TimeOfDay } from "./TimeOfDay"
import { AsUppercase } from "./AsUppercase"
import { CompoundExpression } from "./CompoundExpression"
import { DoesNotInclude } from "./DoesNotInclude"
import { Exists } from "./Exists"
import { Includes } from "./Includes"
import { IsA } from "./IsA"
import { IsDefined } from "./IsDefined"
import { IsEmpty } from "./IsEmpty"
import { IsEqual } from "./IsEqual"
import { IsListedValue } from "./IsListedValue"
import { IsExactly } from "./IsExactly"
import { IsIn } from "./IsIn"
import { IsInAType } from "./IsInAType"
import { IsSameTypeAs } from "./IsSameTypeAs"
import { Synonyms } from "./Synonyms"
import { Wording } from "./Wording"
import { Negatable } from "./Negatable"
import { Or } from "./Or"
import { ParenthesizedExpression } from "./ParenthesizedExpression"
import { ThereIsA } from "./ThereIsA"
import { HexDigits } from "./HexDigits"
import { HexLiteral } from "./HexLiteral"
import { UnicodeCode } from "./UnicodeCode"
import { UnicodeExpression } from "./UnicodeExpression"
import { UnicodeLiteral } from "./UnicodeLiteral"
import { UnicodeOffset } from "./UnicodeOffset"
import { UnitWords } from "./UnitWords"
import { MeasureLiteral } from "./MeasureLiteral"
import { MeasureIn } from "./MeasureIn"

/** Spanish's `expressions` rules. */
export const expressionsEs = new SpellParser({ module: "expressions" })

////////////////
// ## Word rules:  Spanish's words for each of English's, under the same names and meanings
////////////////

// Every form of `is`, `{is_or_is_not}`:  `no` goes before the verb;
// and its plural, `son` / `están`, which English's `is` has no need of:  `las cartas están vacías`
expressionsEs.addRule(Negatable.specialize({ ruleName: "is_or_is_not", alias: "is" }), {
  syntax: "(es|está|esta|son|están|estan|(negated:no es|no está|no esta|no son|no están|no estan))"
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

// The word before a list's condition (epic `language` T133):  `las cartas del mazo donde está boca arriba`;
// `que` too, its subject left out as after `donde`:  `las cartas del mazo que están boca arriba`
// - Each rule writes the words out, `(where:donde|que)`;  this says which one means `which` (`Wording.reads()`)
expressionsEs.addRule(Wording.specialize({ ruleName: "where_or_which", meanings: ["which"] }), {
  syntax: "(donde|(which:que))"
})

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
      tests: [[`el suit de la card es "ace"`, '(card.suit === "ace")']]
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
        ["x es 1 y z está vacío", "(x === 1 && core.isEmpty(z))"]
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
        ["thing es 1 y other es 2", "(thing === 1 && other === 2)"]
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

// two values equal, said in full (epic `language` P55, Q51):  `if column is the same as row`
expressionsEs.addRule(IsEqual, {
  syntax: "{operator:is_or_is_not} igual (a|que) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing es igual a other", "(thing === other)"],
        ["thing no es igual a other", "(thing !== other)"]
      ]
    }
  ]
})

// ... or both said first:  `if row and column are the same`, an `and` of its own
expressionsEs.addRule(IsEqual, {
  syntax: "(y|e) {expression:operand} {operator:is_or_is_not} iguales",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing y other son iguales", "(thing === other)"],
        ["thing y other no son iguales", "(thing !== other)"]
      ]
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
        ["thing es other", "(thing === other)"],
        ["thing no es other", "(thing !== other)"],
        ["thing está other", "(thing === other)"]
      ]
    },
    // a thing compared to one of the values its type lists:  the property that lists it
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "una card es una cosa",
            "una card tiene un palo como uno de tréboles, diamantes, corazones, espadas",
            "card = una nueva card"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        ["card es tréboles", '(card.palo === "tréboles")'],
        ["card no es corazones", '(card.palo !== "corazones")']
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

// después de `is_a`, para que un tipo conocido gane:  `es una reina` con un tipo llamado `reina`
expressionsEs.addRule(IsListedValue, { syntax: "{operator:is_or_is_not_a} {expression:constant}" })
// ... a number of its list too (epic `language` P55):  `it is a 2`
expressionsEs.addRule(IsListedValue, {
  syntax: "{operator:is_or_is_not_a} {expression:number}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "una carta es una cosa",
            "una carta tiene un rango como uno de as, 2, 3, rey",
            "carta = una nueva carta"
          ].join("\n"),
          "block"
        )
      },
      tests: [["carta es un 2", "(carta.rango === 2)"]]
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

// in any list of a type (epic `language` P55):  `the card is in a column`
expressionsEs.addRule(IsInAType, {
  syntax: "{operator:is_or_is_not} en (un|una) (expression:{known_type})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile("una columna es una lista", "block")
        scope.variables?.add("thing")
      },
      tests: [
        ["thing está en una columna", "core.isInA(thing, Columna)"],
        ["thing no está en una columna", "!core.isInA(thing, Columna)"]
      ]
    },
    {
      // una carta que pertenece a una sola pila:  su pila lo dice, sin buscar (epic `language` J148)
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          "una carta es una cosa\nuna pila es una lista de cartas\nuna columna es una pila\nuna carta pertenece a una pila",
          "block"
        )
        scope.variables?.add({ name: "carta", datatype: "Carta" })
        scope.variables?.add({ name: "reserva", datatype: "Pila" })
      },
      tests: [
        ["carta está en una columna", "carta.pila instanceof Columna"],
        ["carta no está en una columna", "!(carta.pila instanceof Columna)"],
        ["carta está en reserva", "(carta.pila === reserva)"]
      ]
    }
  ]
})

// `está en` toma UNA lista, nunca una dicha en línea:  `está en mi-lista y es 1` son dos condiciones (epic `language` J185)
expressionsEs.addRule(IsIn, {
  syntax: "{operator:is_or_is_not} en (expression:{operand})"
})

expressionsEs.addRule(IsIn, {
  syntax:
    "{operator:is_or_is_not} (uno de|una de|o bien uno de|o bien una de|o bien) (expression:{operand}|{identifier_list})",
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
        ["thing no es o bien uno de red o green", '!core.includes([red, "green"], thing)'],
        // `está en` toma una lista:  la `y` empieza otra condición (epic `language` J185)
        ["thing está en theList y thing es red", "(core.includes(theList, thing) && thing === red)"]
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
        ["thing es green o thing es blue", '(thing === "green" || thing === "blue")']
      ]
    }
  ]
})

expressionsEs.addRule(Includes, {
  syntax: "(operator:incluye|contiene) (exactly:exactamente)? {expression:operand}",
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
  syntax: "(operator:no (incluye|contiene)) (exactly:exactamente)? {expression:operand}",
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
  // each gender and number:  `el mazo está vacío`, `la pila está vacía`, `las pilas están vacías`
  syntax: "{operator:is_or_is_not} (vacío|vacio|vacía|vacia|vacíos|vacios|vacías|vacias)",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("things")
      },
      tests: [
        ["thing está vacío", "core.isEmpty(thing)"],
        ["thing esta vacia", "core.isEmpty(thing)"],
        ["thing no está vacío", "!core.isEmpty(thing)"],
        ["things están vacíos", "core.isEmpty(things)"],
        ["things estan vacias", "core.isEmpty(things)"],
        ["things no están vacías", "!core.isEmpty(things)"],
        ["things son vacíos", "core.isEmpty(things)"]
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

// Unir en texto:  `&` tal cual, `&&` con un espacio
expressionsEs.addRule(Wording.specialize({ ruleName: "join_mark", meanings: ["spaced"] }), {
  syntax: "((spaced:&&)|&)"
})
expressionsEs.addRule(Joined, {
  syntax: "{operator:join_mark} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("precio")
      },
      tests: [['"Total:" && precio', 'core.joined("Total:", precio, " ")']]
    }
  ]
})

// Hoy, como lo dice HyperTalk:  `la fecha`, `la hora larga`
expressionsEs.addRule(Wording.specialize({ ruleName: "date_form", meanings: ["short", "long", "abbreviated"] }), {
  syntax: "((short:corta)|(long:larga)|(abbreviated:abreviada))"
})
expressionsEs.addRule(
  Wording.specialize({ ruleName: "date_or_time", meanings: ["date", "time", "timestamp", "time_zone"] }),
  { syntax: "((date:fecha)|(time:hora)|(timestamp:marca de tiempo)|(time_zone:zona horaria))" }
)
expressionsEs.addRule(TheDate, {
  syntax: "la {what:date_or_time} {form:date_form}?",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["la fecha", "core.shortDate(core.now())"],
        ["la hora larga", "core.longTime(core.now())"],
        ["la zona horaria", 'core.timeZone("city")'],
        ["la zona horaria corta", 'core.timeZone("short")']
      ]
    }
  ]
})
// Una fecha dicha de un modo:  `su hora como fecha corta`
expressionsEs.addRule(
  Wording.specialize({
    ruleName: "date_style",
    meanings: ["short", "long", "abbreviated", "short_time", "long_time", "date_and_time", "timestamp"]
  }),
  {
    syntax:
      "((short:fecha corta)|(long:fecha larga)|(abbreviated:fecha abreviada)|(short_time:hora corta)|(long_time:hora larga)|(date_and_time:fecha y hora)|(timestamp:marca de tiempo))"
  }
)
expressionsEs.addRule(AsADate, {
  syntax: "como (una|un)? {style:date_style}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "due", datatype: "date" })
      },
      tests: [
        ["due como fecha corta", 'core.dateAs(due, "short")'],
        ["due como fecha y hora", 'core.dateAs(due, "date and time")']
      ]
    }
  ]
})
expressionsEs.addRule(Now, {
  syntax: "ahora",
  tests: [{ compileAs: "expression", tests: [["ahora", "core.now()"]] }]
})

////////////////
// ## Las palabras de fechas y horas (épica `language` P63)
////////////////

/** Una fecha `due`, en el ámbito de una prueba de las palabras de fechas. */
function addDue(scope: P.Scope) {
  scope.variables?.add({ name: "due", datatype: "date" })
}

expressionsEs.addRule(AsTwoDigits, {
  syntax: "(como dos (dígitos|digitos)|con un cero delante)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["el minuto de ahora como dos dígitos", "core.twoDigits(core.minuteOf(core.now()))"],
        ["5 con un cero delante", "core.twoDigits(5)"]
      ]
    }
  ]
})
expressionsEs.addRule(IsMeridiem, {
  syntax: "{operator:is_or_is_not} ((am:am|AM|Am)|(pm:pm|PM|Pm))",
  tests: [{ compileAs: "expression", tests: [["ahora es pm", "core.isPM(core.now())"]] }]
})
// Cómo se dice una duración:  `como duración corta`
expressionsEs.addRule(Wording.specialize({ ruleName: "duration_style", meanings: ["short", "long"] }), {
  syntax: "((short:corta)|(long:larga))"
})
// Una unidad en que se dice una duración:  `como duración en meses y días` (J253)
expressionsEs.addRule(
  Wording.specialize({
    ruleName: "duration_unit",
    meanings: ["year", "month", "week", "day", "hour", "minute", "second"]
  }),
  {
    syntax:
      "((year:años|año|anos|ano)|(month:meses|mes)|(week:semanas|semana)|(day:días|dias|día|dia)|(hour:horas|hora)|(minute:minutos|minuto)|(second:segundos|segundo))"
  }
)
expressionsEs.addRule(AsADuration, {
  syntax: "como (una)? (duración|duracion) {style:duration_style}? (en [units:{unit:duration_unit} (,|y)])?",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due como duración", "core.timeFromNow(due)"],
        ["due como una duración corta", 'core.timeFromNow(due, "short")'],
        ["due como duración en días", 'core.timeFromNow(due, "normal", "day")'],
        ["due como duración en días y meses", 'core.timeFromNow(due, "normal", ["month", "day"])']
      ]
    }
  ]
})
// Una parte de una duración:  `las horas de su tiempo restante`
expressionsEs.addRule(
  Wording.specialize({ ruleName: "duration_part_name", meanings: ["days", "hours", "minutes", "seconds"] }),
  { syntax: "((days:días|dias)|(hours:horas)|(minutes:minutos)|(seconds:segundos))" }
)
expressionsEs.addRule(DurationPart, {
  syntax: "(los|las) {part:duration_part_name} (de|del) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      tests: [["las horas de 5400 segundos", 'core.durationPartOf(5400, "hours")']]
    }
  ]
})
expressionsEs.addRule(IsWeekendDay, {
  syntax: "{operator:is_or_is_not} (un (día|dia) de)? fin de semana",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["ahora es fin de semana", "core.isWeekendDay(core.now())"],
        ["ahora es un día de fin de semana", "core.isWeekendDay(core.now())"]
      ]
    }
  ]
})
expressionsEs.addRule(NextWeekend, {
  syntax: "el (próximo|proximo) fin de semana",
  tests: [{ compileAs: "expression", tests: [["el próximo fin de semana", "core.nextWeekend()"]] }]
})
expressionsEs.addRule(IsBeforeOrAfter, {
  syntax: "{operator:is_or_is_not} ((before:antes)|(after:después|despues)) (de|del) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due es antes de ahora", "core.isBefore(due, core.now())"],
        ["due es después de ahora", "core.isAfter(due, core.now())"]
      ]
    }
  ]
})
expressionsEs.addRule(IsSameDayAs, {
  syntax: "{operator:is_or_is_not} el mismo (día|dia) que {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [["due es el mismo día que ahora", "core.isSameDay(due, core.now())"]]
    }
  ]
})
// `es mañana` is tomorrow;  `es la mañana`, `es por la mañana`, the morning (`is_day_part`, Owen's J252)
expressionsEs.addRule(IsDayFromToday, {
  syntax: "{operator:is_or_is_not} ((today:hoy)|(tomorrow:mañana|manana)|(yesterday:ayer))",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due es hoy", "core.isDaysFromToday(due, 0)"],
        ["due es mañana", "core.isDaysFromToday(due, 1)"],
        ["due es ayer", "core.isDaysFromToday(due, -1)"]
      ]
    }
  ]
})
// El mediodía y la medianoche de hoy, y una hora escrita como se escribe (J252)
expressionsEs.addRule(TimeOfDay, {
  syntax: "(el|la)? ((noon:mediodía|mediodia)|(midnight:medianoche))",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["mediodía", "core.todayAt(12)"],
        ["la medianoche", "core.todayAt(0)"],
        ["ahora es antes del mediodía", "core.isBefore(core.now(), core.todayAt(12))"]
      ]
    }
  ]
})
expressionsEs.addRule(TimeLiteral.specialize({ ruleName: "time_literal", clock24: true }), {
  // its own `parse()` reads it:  this is for people, and the syntax files
  syntax: "{number} (: {number})? (am|pm)?",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["9am", "core.todayAt(9)"],
        ["9:30 pm", "core.todayAt(21, 30)"],
        ["21:30", "core.todayAt(21, 30)"],
        ["ahora es después de 9:05", "core.isAfter(core.now(), core.todayAt(9, 5))"]
      ]
    }
  ]
})
// Una parte del día:  `si ahora es por la mañana`;  la parte lleva su `la`, que `es mañana` es mañana
expressionsEs.addRule(
  Wording.specialize({
    ruleName: "day_part",
    meanings: ["morning", "afternoon", "earlyEvening", "evening", "lateEvening", "night"]
  }),
  {
    syntax:
      "((morning:mañana|manana)|(afternoon:tarde)|(earlyEvening:atardecer)|(evening:anochecer)|(lateEvening:primera hora de la noche)|(night:noche))"
  }
)
expressionsEs.addRule(IsDayPart, {
  syntax: "{operator:is_or_is_not} ((today:esta|este)|(por|en|de|a) (la|el)?|la|el|al) {part:day_part}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due es la mañana", 'core.isDayPart(due, "morning")'],
        ["due es por la tarde", 'core.isDayPart(due, "afternoon")'],
        ["due es de noche", 'core.isDayPart(due, "night")'],
        ["due es al atardecer", 'core.isDayPart(due, "earlyEvening")'],
        ["due es a primera hora de la noche", 'core.isDayPart(due, "lateEvening")'],
        ["due es esta mañana", 'core.isDayPart(due, "morning", "today")']
      ]
    }
  ]
})
expressionsEs.addRule(DaysUntil, {
  syntax: "los (días|dias) ((until:hasta)|(since:desde)) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["los días hasta due", "core.daysUntil(due)"],
        ["los días desde due", "core.daysSince(due)"]
      ]
    }
  ]
})
expressionsEs.addRule(StartOfTheDay, {
  syntax: "el ((start:inicio|comienzo)|(end:fin)) del (día|dia) (de|del) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["el inicio del día de ahora", "core.startOfDay(core.now())"],
        ["el fin del día de ahora", "core.endOfDay(core.now())"]
      ]
    }
  ]
})
expressionsEs.addRule(DaysInTheMonth, {
  syntax: "los (días|dias) del mes (de|del) {expression:operand}",
  tests: [{ compileAs: "expression", tests: [["los días del mes de ahora", "core.daysInMonth(core.now())"]] }]
})

expressionsEs.addRule(WithCommas, {
  syntax: "con comas",
  tests: [{ compileAs: "expression", tests: [["1000 con comas", "core.withCommas(1000)"]] }]
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
// "con mayúsculas iniciales":  each word's first letter a capital
expressionsEs.addRule(AsTitleCase, {
  syntax: "(con|en) (mayúsculas|mayusculas) iniciales",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`"as de picas" con mayúsculas iniciales`, 'core.titleCase("as de picas")'],
        [`1 en mayusculas iniciales`, `core.titleCase(1)`]
      ]
    }
  ]
})

// The type is read by the language's type words:  `cadena` means `text`, `fracción` `number`
expressionsEs.addRule(AsAType, {
  syntax: "como (un|una)? (type:cadena|número|numero|fracción|fraccion|entero|fecha)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["1 como una cadena", "`${1}`"],
        [`"hola" como una cadena`, '`${"hola"}`'],
        ["1 como un número", "parseFloat(1)"],
        ["1.3 como una fracción", "parseFloat(1.3)"],
        ["1.4 como un entero", "parseInt(1.4)"],
        [`"2026-12-25" como fecha`, `core.dateFrom("2026-12-25")`],
        [`"foo" como un numero`, `parseFloat("foo")`]
      ]
    }
  ]
})

// un archivo leído, `el archivo como json` (épica `language` P67)
expressionsEs.addRule(Wording.specialize({ ruleName: "file_reading", meanings: FILE_READINGS }), {
  syntax: "((json:json)|(binary:binario))"
})
expressionsEs.addRule(AsFileContents, { syntax: "como {kind:file_reading}" })

expressionsEs.addRule(AsAType, {
  syntax: "como (type:texto)",
  tests: [
    {
      compileAs: "expression",
      tests: [["1 como texto", "`${1}`"]]
    }
  ]
})

expressionsEs.addRule(HexDigits)

expressionsEs.addRule(HexLiteral, {
  syntax: "(hex|hexadecimal) {digits:hex_digits}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["hex 1F0A0", "0x1F0A0"],
        ["hexadecimal 1F0A0", "0x1F0A0"],
        ["hex ff", "0xff"],
        ["hex 10", "0x10"]
      ]
    }
  ]
})

expressionsEs.addRule(UnicodeCode)

expressionsEs.addRule(UnicodeOffset, {
  syntax: "unicode {code:unicode_code} (más|mas|+) {offset:arithmetic_expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("column")
      },
      tests: [
        ["unicode 1F0A0 + 1", "core.unicode(0x1F0A0 + 1)"],
        ["unicode 1F0A0 más column", "core.unicode(0x1F0A0 + column)"],
        ["unicode 1F0A0 + column * 2", "core.unicode(0x1F0A0 + column * 2)"]
      ]
    }
  ]
})

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

////////////////
// ## Measures:  numbers with units (epic `language` P23) -- their tests:  `tests/spell/Dimensions.test.ts`
////////////////

// one unit of a dimension the scope knows, by its name, an `aka` or a plural:  `cm`, `feet`, `°F`
expressionsEs.addRule(UnitWords)

// a measure as people write it:  `172 cm`, `5 ft 8 in`, `2' 3 1/2"`
expressionsEs.addRule(MeasureLiteral, {
  syntax: "{number} {unit:unit_words}"
})

// a measure in other units:  `its height in feet`, `su altura en pies y pulgadas`
expressionsEs.addRule(MeasureIn, {
  syntax: "en [units:{unit:unit_words} (,|y)]"
})
