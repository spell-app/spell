/**
 * The `lists` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `lists` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `lists.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 *   A person's own names (`thing`, `my-list`, `card`) stay as English's tests have them, so the output does too.
 * - Except a plural the Spanish inflector can't tell from a singular:  a one-syllable English word, `cards`, `words`.
 *   There the tests say `cartas`, `palabras`, so a `where`'s item is `carta`, `palabra`.
 * - Keywords with a written accent are accepted without it too:  `(posición|posicion)`, `(después|despues)`.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"
import { Negatable, Wording } from "spell-lang/spell/rules/expressions"
import { Priority } from "spell-lang/spell/rules/rules.types"

import { BracketedList } from "./BracketedList"
import { CanGiveUp } from "./CanGiveUp"
import { CanTake } from "./CanTake"
import { CopyList } from "./CopyList"
import { EndsWith } from "./EndsWith"
import { IdentifierList } from "./IdentifierList"
import { ListAdd } from "./ListAdd"
import { ListAddRelative } from "./ListAddRelative"
import { ListAppend } from "./ListAppend"
import { ListCount } from "./ListCount"
import { ListEmpty } from "./ListEmpty"
import { ListFilter } from "./ListFilter"
import { ListIteration } from "./ListIteration"
import { ListLength } from "./ListLength"
import { ListMembershipTest } from "./ListMembershipTest"
import { ListMove } from "./ListMove"
import { ListPosition } from "./ListPosition"
import { ListPrepend } from "./ListPrepend"
import { ListRangeIteration } from "./ListRangeIteration"
import { ListRemove } from "./ListRemove"
import { ListRemoveOrdinal } from "./ListRemoveOrdinal"
import { ListRemovePosition } from "./ListRemovePosition"
import { ListRemoveRange } from "./ListRemoveRange"
import { ListRemoveRangeOrdinal } from "./ListRemoveRangeOrdinal"
import { ListRemoveWhere } from "./ListRemoveWhere"
import { ListReverse } from "./ListReverse"
import { ListShuffle } from "./ListShuffle"
import { MergeLists } from "./MergeLists"
import { NumberRange } from "./NumberRange"
import { Ordinal } from "./Ordinal"
import { OrdinalPositionExpression } from "./OrdinalPositionExpression"
import { OrdinalWhereExpression } from "./OrdinalWhereExpression"
import { PositionExpression } from "./PositionExpression"
import { RandomItemExpression } from "./RandomItemExpression"
import { RandomItemsExpression } from "./RandomItemsExpression"
import { RangeBetweenExpression } from "./RangeBetweenExpression"
import { RangeCountExpression } from "./RangeCountExpression"
import { RangeStartingWithExpression } from "./RangeStartingWithExpression"
import { RepeatNTimes } from "./RepeatNTimes"
import { StartsWith } from "./StartsWith"
import { ValueChoices } from "./ValueChoices"

/** Spanish's `lists` rules. */
export const listsEs = new SpellParser({ module: "lists" })

////////////////
// ## Ordinals
////////////////

/**
 * Each Spanish ordinal's forms and the position it means:  every gender and number, with and without its accent.
 * - `primer` and `tercer` are the short forms before a masculine noun:  `el primer item`.
 * - `arriba` (top) and `abajo` (bottom) are the ends of a pile, as English's `top` and `bottom`.
 */
const ORDINAL_VALUES: Record<string, number> = {
  ...genderedForms("primer", 1),
  primer: 1,
  ...genderedForms("segund", 2),
  ...genderedForms("tercer", 3),
  tercer: 3,
  ...genderedForms("cuart", 4),
  ...genderedForms("quint", 5),
  ...genderedForms("sext", 6),
  ...genderedForms("séptim", 7),
  ...genderedForms("octav", 8),
  ...genderedForms("noven", 9),
  ...genderedForms("décim", 10),
  ...genderedForms("penúltim", -2),
  ...genderedForms("últim", -1),
  final: -1,
  finales: -1,
  arriba: 1,
  abajo: -1
}

/** `stem`'s four endings (`-o`, `-a`, `-os`, `-as`), each with and without its written accent, all meaning `value`. */
function genderedForms(stem: string, value: number): Record<string, number> {
  const forms: Record<string, number> = {}
  for (const ending of ["o", "a", "os", "as"]) {
    const word = stem + ending
    forms[word] = value
    forms[word.normalize("NFD").replace(/\p{M}/gu, "")] = value
  }
  return forms
}

/** The ordinal pattern:  exactly one of `ORDINAL_VALUES`' words. */
function ordinalPattern(): RegExp {
  return new RegExp(`^(${Object.keys(ORDINAL_VALUES).join("|")})$`, "u")
}

////////////////
// ## Word rules:  Spanish's words for each thing, and what each form means (`Wording`, `Negatable`)
////////////////

// `empieza con` and its negated forms, for `starts_with`
listsEs.addRule(Negatable.specialize({ ruleName: "starts_with_or_not" }), {
  syntax: "(empieza con|comienza con|(negated:no empieza con|no comienza con))"
})

// `termina con` and its negated forms, for `ends_with`
listsEs.addRule(Negatable.specialize({ ruleName: "ends_with_or_not" }), {
  syntax: "(termina con|acaba con|(negated:no termina con|no acaba con))"
})

// `tiene` and its negated forms, for `list_membership_test`:  `my-list no tiene items donde ...`
listsEs.addRule(Negatable.specialize({ ruleName: "has_or_has_no" }), {
  syntax: "(tiene|tienen|(negated:no tiene|no tienen))"
})

// Which end of a list, for `list_add`:  `agregar thing al principio de my-list`
listsEs.addRule(Wording.specialize({ ruleName: "list_end", meanings: ["start", "end"] }), {
  syntax: "((start:principio|comienzo|inicio|frente|arriba)|(end:final|fin|fondo|abajo))"
})

// Which side of an item, for `list_add_relative`:  `agregar thing a my-list después de other-thing`
listsEs.addRule(Wording.specialize({ ruleName: "before_or_after", meanings: ["before", "after"] }), {
  syntax: "((before:antes de|antes del)|(after:después de|despues de|después del|despues del))"
})

listsEs.addRule(IdentifierList, {
  syntax: "[({number_range}|{known_variable}|{constant}|{number}) (,|o|u|y|e|ni)]",
  tests: [
    {
      tests: [
        ["up o down", '["up", "down"]'],
        ["red y black", '["red", "black"]'],
        ["back ni forth", '["back", "forth"]'],
        ["clubs, diamonds, hearts, spades", '["clubs", "diamonds", "hearts", "spades"]'],
        ["ace, 2, 3, 4, jack, queen o king", '["ace", 2, 3, 4, "jack", "queen", "king"]'],
        ["ace, 2 ... 5, jack, queen o king", '["ace", 2, 3, 4, 5, "jack", "queen", "king"]']
      ]
    }
  ]
})

listsEs.addRule(NumberRange, {
  syntax: "{start:number} ... {end:number}",
  tests: [
    {
      tests: [
        ["2 ... 4", "[2, 3, 4]"],
        ["4 ... 2", undefined],
        ["1.5 ... 3", undefined]
      ]
    }
  ]
})

listsEs.addRule(ValueChoices, {
  syntax: "[({known_constant}|{number}) (,|(or:o|u))]",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        for (const name of ["jack", "queen", "king"]) scope.constants?.add(name)
      },
      tests: [
        ["jack o queen", '["jack", "queen"]'],
        ["jack, queen o king", '["jack", "queen", "king"]'],
        ["2 o 3", "[2, 3]"],
        ["jack, queen", undefined],
        ["jack o red", undefined]
      ]
    }
  ]
})

listsEs.addRule(BracketedList, {
  syntax: "\\[ [list:{expression} ,]? \\]",
  tests: [
    {
      title: "correctly matches literal lists",
      tests: [
        ["[]", "[]"],
        ["[1]", "[1]"],
        ["[1,]", "[1]"],
        ["[1,2,3]", "[1, 2, 3]"],
        ["[1, 2, 3]", "[1, 2, 3]"],
        ["[1,2,3,]", "[1, 2, 3]"],
        [`[sí,no,"a",1]`, `[true, false, "a", 1]`]
      ]
    },
    {
      title: "doesn't match malformed lists ",
      tests: [
        ["", undefined],
        ["[,1]", undefined]
      ]
    }
  ]
})

listsEs.addRule(CopyList, {
  syntax: "(una copia|un duplicado) de (la lista)? {expression:operand} (como (un|una) {type:known_type})?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("piles")
      },
      tests: [
        ["una copia de las piles", "core.duplicateList(piles)"],
        ["un duplicado de la lista las piles como una lista", "core.duplicateList(piles, List)"]
      ]
    }
  ]
})

listsEs.addRule(MergeLists, {
  syntax:
    "(combinar|fusionar|unir) (las listas|la lista)? {expression:operand} ((como|en) (un|una) (nuevo|nueva)? {type:known_type} (nuevo|nueva)?)?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("piles")
      },
      tests: [
        ["combinar las piles", "core.mergeLists(piles)"],
        ["combinar las piles como una lista", "core.mergeLists(piles, List)"]
      ]
    }
  ]
})

listsEs.addRule(ListLength, {
  syntax: "(el|la)? (número|numero|cantidad) de {arg:plural_identifier} (en|de|del) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("bar")
      },
      tests: [
        ["número de items en my-list", "core.itemCountOf(myList)"],
        ["el número de cosas en el foo del bar", "core.itemCountOf(bar.foo)"],
        ["la cantidad de items en [1,2,3]", "core.itemCountOf([1, 2, 3])"]
      ]
    }
  ]
})

listsEs.addRule(ListLength, {
  syntax:
    "(el|la)? (número|numero|cantidad) de {arg:plural_identifier} (en|de|del) {list:operand} donde {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      showAll: true,
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [
        [
          "el número de items en my-list donde su id > 1",
          "core.itemCountOf(core.filter(myList, (item) => item.id > 1))"
        ]
      ]
    }
  ]
})

listsEs.addRule(ListCount, {
  syntax: "(el|la)? (número|numero|cantidad) de {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          ["una card es una cosa", "una card tiene un palo como uno de tréboles, diamantes", "poner x a 1"].join("\n")
        )
      },
      tests: [
        // a type's list of values, `palos de card`:  `Card.Palos`
        ["el número de palos de card", "core.itemCountOf(Card.Palos)"],
        ["el número de [1, 2]", "core.itemCountOf([1, 2])"],
        { title: "not a list:  a property read", input: "el number de x", js: "x.number" }
      ]
    }
  ]
})

listsEs.addRule(ListPosition, {
  syntax: "la? (posición|posicion) de {thing:expression} en {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
        scope.variables?.add("bar")
      },
      tests: [
        ["posición de thing en my-list", "spellPosition(positionOf(myList, thing))"],
        ["la posición de thing en el foo del bar", "spellPosition(positionOf(bar.foo, thing))"],
        [`la posicion de "a" en ["a", "b", "c"]`, 'spellPosition(positionOf(["a", "b", "c"], "a"))']
      ]
    }
  ]
})

// ... and a kind's value, in its kind's own list:  `la posición de su rank`
listsEs.addRule(ListPosition, {
  syntax: "la? (posición|posicion) de {thing:expression}"
})

listsEs.addRule(StartsWith, {
  syntax: "{operator:starts_with_or_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        ["my-list empieza con thing", "core.startsWith(myList, thing)"],
        ["[1,2,3] comienza con 1", "core.startsWith([1, 2, 3], 1)"],
        ["[1,2,3] no empieza con 10", "!core.startsWith([1, 2, 3], 10)"],
        ["[1,2,3] no comienza con 10", "!core.startsWith([1, 2, 3], 10)"]
      ]
    }
  ]
})

listsEs.addRule(EndsWith, {
  syntax: "{operator:ends_with_or_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        ["my-list termina con thing", "core.endsWith(myList, thing)"],
        ["[1,2,3] acaba con 1", "core.endsWith([1, 2, 3], 1)"],
        ["[1,2,3] no termina con 10", "!core.endsWith([1, 2, 3], 10)"],
        ["[1,2,3] no acaba con 10", "!core.endsWith([1, 2, 3], 10)"]
      ]
    }
  ]
})

listsEs.addRule(Ordinal.specialize({ pattern: ordinalPattern(), VALUE_MAP: ORDINAL_VALUES }), {
  tests: [
    {
      tests: [
        ["primer", 1],
        ["primero", 1],
        ["primera", 1],
        ["primeros", 1],
        ["segundo", 2],
        ["segunda", 2],
        ["tercer", 3],
        ["tercera", 3],
        ["cuarto", 4],
        ["quinta", 5],
        ["sexto", 6],
        ["séptimo", 7],
        ["septima", 7],
        ["octavo", 8],
        ["novena", 9],
        ["décimo", 10],
        ["decima", 10],

        ["penúltimo", -2],
        ["penultima", -2],
        ["final", -1],
        ["último", -1],
        ["ultima", -1],
        ["últimas", -1],

        ["arriba", 1],
        ["abajo", -1]
      ]
    }
  ]
})

listsEs.addRule(PositionExpression, {
  syntax: "(el|la)? {arg:singular_identifier} {position:expression} (de|del) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
        scope.variables?.add("n")
      },
      tests: [
        ["item 1 de my-list", "core.getItemAt(myList, 0)"],
        ["card 10 de deck", "core.getItemAt(deck, 9)"],
        ["la card n de las cards del deck", "core.getItemAt(deck.cards, position(n))"]
      ]
    }
  ]
})

listsEs.addRule(OrdinalPositionExpression, {
  syntax: "(el|la) {ordinal} {arg:singular_identifier} (en|de|del) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
        scope.variables?.add("words")
      },
      tests: [
        ["el primer item de my-list", "core.getItemAt(myList, 0)"],
        ["la décima card de deck", "core.getItemAt(deck, 9)"],
        ["la penúltima word en words", "core.getItemAt(words, -2)"]
      ]
    }
  ]
})

// ... and with the end after the noun, as Spanish says a pile's ends:  `la carta de arriba del deck`
// - `Priority.specific`:  it beats the loose property read the same words also are, `deck.arriba.carta`,
//   which English's word order never meets.
listsEs.addRule(OrdinalPositionExpression.specialize({ priority: Priority.specific }), {
  syntax: "(el|la) {arg:singular_identifier} de {ordinal} (en|de|del) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
      },
      tests: [
        ["la carta de arriba del deck", "core.getItemAt(deck, 0)"],
        ["la carta de abajo de deck", "core.getItemAt(deck, -1)"]
      ]
    }
  ]
})

listsEs.addRule(OrdinalWhereExpression, {
  syntax: "(el|la) {ordinal} {arg:singular_identifier} (en|de|del) {list:expression} donde {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [
        ["el primer item en my-list donde su id > 1", "core.getItemAt(core.filter(myList, (item) => item.id > 1), 0)"]
      ]
    }
  ]
})

listsEs.addRule(RandomItemExpression, {
  syntax: "(un|una) {arg:singular_identifier} (al azar|aleatorio|aleatoria) (de|del|desde|en) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["un item al azar de my-list", "core.randomItemOf(myList)"],
        [`una word aleatoria en "some words"`, `core.randomItemOf("some words")`],
        ["una card al azar del deck", "core.randomItemOf(deck)"]
      ]
    }
  ]
})

listsEs.addRule(RandomItemsExpression, {
  syntax: "{number} {arg:plural_identifier} (al azar|aleatorios|aleatorias) (de|del|desde|en) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["2 items al azar de my-list", "core.randomItemsOf(myList, 2)"],
        [`2 palabras aleatorias en "some other words"`, `core.randomItemsOf("some other words", 2)`],
        ["3 cartas al azar de deck", "core.randomItemsOf(deck, 3)"]
      ]
    }
  ]
})

listsEs.addRule(RangeBetweenExpression, {
  syntax: "{arg:variable} {start:expression} (a|hasta) {end:expression} (de|del|en|desde) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["item 1 a 2 de my-list", "core.rangeBetween(myList, 0, 2)"],
        [`word 2 a 3 en "some other words"`, 'core.rangeBetween("some other words", 1, 3)'],
        ["card 1 hasta 3 de deck", "core.rangeBetween(deck, 0, 3)"]
      ]
    }
  ]
})

listsEs.addRule(RangeStartingWithExpression, {
  syntax:
    "(los|las)? {arg:plural_identifier} (en|de|del) {list:expression} (empezando|comenzando) (con|por) {thing:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        [
          "items en my-list empezando con thing",
          "core.rangeStartingAt(myList, position(spellPosition(positionOf(myList, thing))))"
        ],
        [
          `las palabras en "some words" comenzando por "some"`,
          'core.rangeStartingAt("some words", position(spellPosition(positionOf("some words", "some"))))'
        ]
      ]
    }
  ]
})

listsEs.addRule(RangeCountExpression, {
  syntax: "(los|las)? {ordinal} {number} {arg:plural_identifier} (de|del|en|desde) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["arriba 2 items de my-list", "core.rangeStartingAt(myList, 0, 2)"],
        [`las primeras 2 palabras en "some other words"`, 'core.rangeStartingAt("some other words", 0, 2)'],
        ["las últimas dos cartas del deck", "core.rangeStartingAt(deck, -2, 2)"],
        ["las penúltimas dos cartas de deck", "core.rangeStartingAt(deck, -3, 2)"]
      ]
    }
  ]
})

listsEs.addRule(ListFilter, {
  syntax: "(los|las)? {arg:plural_identifier} (en|de|del) {list:expression} donde {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      showAll: true,
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [
        [`palabras en "a word list" donde`, 'core.filter("a word list", () => {})'],
        [
          `palabras en "a word list" donde palabra empieza con "a"`,
          'core.filter("a word list", (palabra) => core.startsWith(palabra, "a"))',
          'core.filter("a word list", (palabra: string) => core.startsWith(palabra, "a"))'
        ],
        ["los items en my-list donde el id del item > 1", "core.filter(myList, (item) => item.id > 1)"],
        ["los items en my-list donde su id > 1", "core.filter(myList, (item) => item.id > 1)"]
      ]
    }
  ]
})

listsEs.addRule(ListMembershipTest, {
  syntax: "{operator:has_or_has_no} {arg:plural_identifier} donde {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      showAll: true,
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("bar")
      },
      tests: [
        ["my-list tiene items donde", "core.any(myList, () => {})"],
        ["my-list tiene items donde el item es 1", "core.any(myList, (item) => item == 1)"],
        ["my-list tiene items donde su foo es 1", "core.any(myList, (item) => item.foo == 1)"],
        ["my-list no tiene items donde item es 1", "!core.any(myList, (item) => item == 1)"],
        ["el foo del bar no tiene items donde item es 1", "!core.any(bar.foo, (item) => item == 1)"]
      ]
    }
  ]
})

listsEs.addRule(ListAdd, {
  syntax:
    "(agregar|añadir|anadir) {thing:expression} ((al|a la|a el) {method:list_end} (de|del)|a|al) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        ["agregar thing al principio de my-list", "core.prepend(myList, thing)"],
        ["añadir thing al frente de my-list", "core.prepend(myList, thing)"],
        ["anadir thing al inicio de my-list", "core.prepend(myList, thing)"],

        ["agregar thing a my-list", "core.append(myList, thing)"],
        ["agregar thing al final de my-list", "core.append(myList, thing)"],
        ["agregar thing al fondo de my-list", "core.append(myList, thing)"],
        ["agregar thing al fin de my-list", "core.append(myList, thing)"]
      ]
    }
  ]
})

listsEs.addRule(ListPrepend, {
  syntax: "anteponer {thing:expression} (a|al) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [["anteponer thing a my-list", "core.prepend(myList, thing)"]]
    }
  ]
})

listsEs.addRule(ListAppend, {
  syntax: "(anexar|adjuntar) {thing:expression} (a|al) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [["anexar thing a my-list", "core.append(myList, thing)"]]
    }
  ]
})

listsEs.addRule(ListAddRelative, {
  syntax:
    "(agregar|añadir|anadir) {thing:expression} (a|al) {list:expression} {operator:before_or_after} {item:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
        scope.variables?.add("other-thing")
      },
      tests: [
        ["agregar thing a my-list antes de other-thing", "core.addBefore(myList, otherThing, thing)"],
        ["agregar thing a my-list después de other-thing", "core.addAfter(myList, otherThing, thing)"]
      ]
    }
  ]
})

listsEs.addRule(ListEmpty, {
  syntax: "(vaciar|limpiar) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["vaciar my-list", "core.clear(myList)"],
        ["limpiar las cards del deck", "core.clear(deck.cards)"]
      ]
    }
  ]
})

listsEs.addRule(ListRemoveOrdinal, {
  syntax: "(quitar|eliminar) (el|la)? {position:ordinal} {arg:singular_identifier} (de|del) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
      },
      tests: [
        ["quitar última card de deck", "core.removeItemAt(deck, -1)"],
        ["eliminar la primera card del deck", "core.removeItemAt(deck, 0)"]
      ]
    }
  ]
})

listsEs.addRule(ListRemovePosition, {
  syntax: "(quitar|eliminar) (el|la)? {arg:singular_identifier} {number:expression} (de|del) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [["quitar item 4 de my-list", "core.removeItemAt(myList, 3)"]]
    }
  ]
})

listsEs.addRule(ListRemoveRange, {
  syntax:
    "(quitar|eliminar) (los|las)? {arg:plural_identifier} {start:expression} (a|hasta) {end:expression} (de|del) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [["quitar items 2 a 4 de my-list", "core.removeRangeBetween(myList, 1, 4)"]]
    }
  ]
})

// The noun comes first in Spanish, as with numbers:  `quitar las cartas primera a tercera del deck`
listsEs.addRule(ListRemoveRangeOrdinal, {
  syntax:
    "(quitar|eliminar) (los|las)? {arg:plural_identifier} {start:ordinal} (a|hasta) {end:ordinal} (de|del) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
      },
      tests: [["quitar las cartas primera a tercera del deck", "core.removeRangeBetween(deck, 0, 3)"]]
    }
  ]
})

listsEs.addRule(ListRemove, {
  syntax: "(quitar|eliminar) {thing:expression} (de|del) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("my-list")
      },
      tests: [["quitar thing de my-list", "core.remove(myList, thing)"]]
    }
  ]
})

listsEs.addRule(ListRemoveWhere, {
  syntax:
    "(quitar|eliminar) (los|las)? {arg:plural_identifier} (en|de|del|desde) {list:expression} donde {inline_expression}?",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
        scope.constants?.add("clubs")
      },
      tests: [
        ["quitar items de my-list donde", "core.removeWhere(myList, () => {})"],
        [`quitar items de my-list donde item no es "ace"`, 'core.removeWhere(myList, (item) => item != "ace")'],
        [
          "eliminar las cartas en deck donde el suit de la carta es clubs",
          'core.removeWhere(deck, (carta) => carta.suit == "clubs")'
        ],
        ["quitar cartas en deck donde su suit es clubs", 'core.removeWhere(deck, (carta) => carta.suit == "clubs")']
      ]
    }
  ]
})

listsEs.addRule(ListMove, {
  syntax: "mover {thing:expression} (a|al) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
        scope.variables?.add("tableau")
      },
      tests: [
        ["mover card a tableau", "core.move(card, tableau)"],
        ["si mover card a tableau entonces imprimir 1", "if (core.move(card, tableau)) core.console.log(1)"]
      ]
    }
  ]
})

listsEs.addRule(CanTake, {
  syntax: "{operator:can_or_cannot} (agregar|añadir|anadir|tomar|aceptar) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
        scope.variables?.add("tableau")
      },
      tests: [
        ["tableau puede tomar card", "core.canTake(tableau, card)"],
        ["tableau puede agregar card", "core.canTake(tableau, card)"],
        ["tableau no puede tomar card", "!core.canTake(tableau, card)"]
      ]
    }
  ]
})

listsEs.addRule(CanGiveUp, {
  syntax: "{operator:can_or_cannot} (soltar|liberar|quitar|ceder|renunciar a|dejar ir) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
        scope.variables?.add("stock")
      },
      tests: [
        ["stock puede ceder card", "core.canGiveUp(stock, card)"],
        ["stock puede soltar card", "core.canGiveUp(stock, card)"],
        ["stock no puede liberar card", "!core.canGiveUp(stock, card)"]
      ]
    }
  ]
})

listsEs.addRule(ListReverse, {
  syntax: "invertir ((el|la|los|las)? {arg:plural_identifier} (en|de|del))? {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
      },
      tests: [
        ["invertir las cartas del deck", "core.reverse(deck)"],
        ["invertir my-list", "core.reverse(myList)"]
      ]
    }
  ]
})

listsEs.addRule(ListShuffle, {
  syntax: "(barajar|mezclar|aleatorizar) ((el|la|los|las)? {arg:plural_identifier} (en|de|del))? {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
      },
      tests: [
        ["barajar cartas de deck", "core.randomize(deck)"],
        ["barajar las cartas del deck", "core.randomize(deck)"],
        ["mezclar my-list", "core.randomize(myList)"]
      ]
    }
  ]
})

// The count is `número` here:  `repetir 3 veces: imprimir el número`
listsEs.addRule(RepeatNTimes.specialize({ counterName: "número" }), {
  syntax: "repetir {number:expression} (vez|veces) :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "No statements",
          input: "repetir 1 vez:",
          js: "core.map(core.countTo(1), () => {})"
        },
        {
          title: "Inline statement",
          input: "repetir 3 veces: imprimir el número",
          js: "core.map(core.countTo(3), (número) => core.console.log(número))"
        },
        {
          title: "Nested block statement",
          input: ["repetir 3 veces:", "\timprimir el número"],
          js: "core.map(core.countTo(3), (número) => core.console.log(número))"
        },
        {
          title: "Error if nested block and inline statement",
          input: ["repetir 3 veces: imprimir 1", "\timprimir el número"],
          js: [
            "core.map(core.countTo(3), (número) => core.console.log(número))",
            "/* PARSE ERROR: Got both inline statement and nested block */"
          ]
        }
      ]
    }
  ]
})

listsEs.addRule(ListIteration, {
  syntax:
    "(para|por) cada? {item:singular_identifier} ((y|e|,) {position:singular_identifier})? (en|de|del) {list:expression} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
        scope.variables?.add("messages")
      },
      tests: [
        ["para cada card en deck:", "core.map(deck, () => {})"],
        ["para item, index en my-list:", "core.map(myList, () => {})"],
        [
          `para cada card en deck: poner el direction de la card a "down"`,
          'core.map(deck, (card) => (card.direction = "down"))'
        ],
        [
          "para message, index en messages: agregar message + index a messages",
          "core.map(messages, withSpellPositions((message, index) => core.append(messages, message + index)))",
          "core.map(messages, withSpellPositions((message, index: number) => core.append(messages, message + index)))"
        ],
        [
          "para message, index en messages: poner su list a messages",
          "core.map(messages, (message) => (message.list = messages))"
        ],

        [
          `por cada card en deck:\n\tponer el direction de la card a "down"`,
          'core.map(deck, (card) => (card.direction = "down"))'
        ],
        [
          [`para cada card en deck:`, `\tponer el direction de la card a "down"`, `\tponer el value de la card a 10`],
          [`core.map(deck, (card) => {`, `  card.direction = "down"`, `  card.value = 10`, `})`]
        ],
        [
          ["para message y index en messages:", "\tsi index es mayor que 2 agregar message a messages"],
          [
            "core.map(messages, withSpellPositions((message, index) => {",
            "  if (index > 2) core.append(messages, message)",
            "}))"
          ],
          [
            "core.map(messages, withSpellPositions((message, index: number) => {",
            "  if (index > 2) core.append(messages, message)",
            "}))"
          ]
        ]
      ]
    }
  ]
})

listsEs.addRule(ListRangeIteration, {
  syntax:
    "(para|por) cada? {item:singular_identifier} (de|desde) {start:expression} (hacia abajo)? (a|hasta) {end:expression} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        ["para cada number de 1 a 10:", "core.getRange(1, 10).forEach(() => {})"],
        [
          "para cada number desde 1 hasta 10: imprimir el number",
          "core.getRange(1, 10).forEach((number) => core.console.log(number))"
        ],
        [
          "para cada number de 1 a 10:\n\timprimir el number",
          "core.getRange(1, 10).forEach((number) => core.console.log(number))"
        ]
      ]
    }
  ]
})
