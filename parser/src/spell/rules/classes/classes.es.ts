/**
 * The `classes` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `classes` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `classes.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 *   A person's own names (`card`, `deck`, `player`) stay as English's tests have them, so the output does too.
 * - Except where Spanish's inflector turns a name into another word:  there the tests say it in Spanish.
 *   - a plural it can't make singular:  `cards` (one syllable), `piles` (`pil`), `people`;  `cartas`, `pilas`, `persons`
 *   - a singular it makes plural its own way, `suit` (`suites`):  `palo`
 *   - Then the output follows the Spanish word:  `Card.Palos`, `Pila`, `Carta`.
 * - A person can't name a thing `a`:  it's Spanish's `to`, never a name (the blacklist), so `con x = 1` for `with a = 1`.
 * - Keywords with a written accent are accepted without it too:  `(versión|version)`, `(vacío|vacio)`.
 * - The Spanish verbs of a property's rule all start with `debe` (must), so `no debe estar vacío` reads as Spanish
 *   says it, the `no` before the verb:  `su title no debe estar vacío`, `, que debe ser un email`.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"
import { Wording } from "spell-lang/spell/rules/expressions"

import { BelongsToOne } from "./BelongsToOne"
import { CanBelongToMany } from "./CanBelongToMany"
import { ClassMember } from "./ClassMember"
import { CreateDrawableListType } from "./CreateDrawableListType"
import { CreateListType } from "./CreateListType"
import { CreateOneOfAKind } from "./CreateOneOfAKind"
import { CreateThing } from "./CreateThing"
import { CreateType } from "./CreateType"
import { CSSBlock } from "./CSSBlock"
import { DefinePropertyHas } from "./DefinePropertyHas"
import { DrawIt } from "./DrawIt"
import { EveryThing } from "./EveryThing"
import { ItsQuotedProperty } from "./ItsQuotedProperty"
import { KindValues } from "./KindValues"
import { ListGuard } from "./ListGuard"
import { MarkdownDescription } from "./MarkdownDescription"
import { MustRule } from "./MustRule"
import { NamedThing } from "./NamedThing"
import { NewList } from "./NewList"
import { NewThing } from "./NewThing"
import { OutlineSpecifierDatatype } from "./OutlineSpecifierDatatype"
import { OutlineSpecifierEnum } from "./OutlineSpecifierEnum"
import { OutlineSpecifierInstance } from "./OutlineSpecifierInstance"
import { OutlineSpecifierList } from "./OutlineSpecifierList"
import { OutlineSpecifierTextKind } from "./OutlineSpecifierTextKind"
import { OutlineSpecifierYesOrNo } from "./OutlineSpecifierYesOrNo"
import { PatternText } from "./PatternText"
import { PropertyBodyMust } from "./PropertyBodyMust"
import { PropertyMust } from "./PropertyMust"
import { PropertyValueEither } from "./PropertyValueEither"
import { PropertyValueGetter } from "./PropertyValueGetter"
import { QuotedPropertyFormula } from "./QuotedPropertyFormula"
import { RandomKindValue } from "./RandomKindValue"
import { ReopenType } from "./ReopenType"
import { RuleSuggestion } from "./RuleSuggestion"
import { SavedInFile } from "./SavedInFile"
import { DragAndDrop } from "./DragAndDrop"
import { DragHandler } from "./DragHandler"
import { SavedInline } from "./SavedInline"
import { ThePropertyOfAThing } from "./ThePropertyOfAThing"
import { TheThings } from "./TheThings"
import { ThingAtPlace } from "./ThingAtPlace"
import { ThingName } from "./ThingName"
import { TypeSpecifierDatatype } from "./TypeSpecifierDatatype"
import { TypeSpecifierEnum } from "./TypeSpecifierEnum"
import { TypeSpecifierInstance } from "./TypeSpecifierInstance"
import { TypeSpecifierTextKind } from "./TypeSpecifierTextKind"
import { TypeSpecifierYesOrNo } from "./TypeSpecifierYesOrNo"
import { UpgradeMethod } from "./UpgradeMethod"
import { ValueKind } from "./ValueKind"
import { VersionStep } from "./VersionStep"
import { WithNestedStatements } from "./WithNestedStatements"

/** Spanish's `classes` rules. */
export const classesEs = new SpellParser({ module: "classes" })

/** What may follow a property's declaration:  its rules, `, que debe ...` -- English's `RULES`. */
const RULES = "(,? que {rule:must_rule})? {nested_statements}?"

/** What a list takes or gives up, after its subject:  `puede tomar una carta si: ...` -- English's `CAN_MOVE`. */
const CAN_MOVE = "(puede|pueden) {verb:take_or_give_up} (un|una) {item:type} si :? {expression_body}?"

/** What a list never takes or gives up:  `nunca puede soltar una carta` -- English's `CAN_NEVER_MOVE`. */
const CAN_NEVER_MOVE =
  "(never:nunca puede|nunca pueden|no puede nunca|no pueden nunca) {verb:take_or_give_up} (un|una) {item:type}"

/** `a`:  either gender. */
const A = "(un|una)"

/** `the`:  either gender, either number. */
const THE = "(el|la|los|las)"

/** `of`, and `of the`. */
const OF = "(de|del)"

/** `is`, and `are`, in an outline body:  `- "palo" es ...`, `- fundaciones son ...`, `- sus "comodines" son ...`. */
const IS_OR_ARE = "(es|son)"

/** What a drawable type's element writes, after its class:  see English's `create_type` tests. */
function drawableElement(type: string, tag: string, setup: string[] = []): string[] {
  return [
    "",
    "/**",
    ` * \`<test-classes-${tag}>\`:  a ${tag}, drawn in its own element, e.g. by \`draw the ${tag}\`.`,
    " * - The page defines its tag with this class:  `core.useElement()`, below.",
    ` * - Its attributes are its ${tag}'s properties;  its methods call its ${tag}'s.`,
    ` * - What every drawable thing's element does, e.g. drawing its ${tag}, is \`SpellElement\`'s.`,
    " */",
    `export class ${type}Element extends SpellElement<${type}> {`,
    `  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-${tag}", "${tag}", [])`,
    ...setup,
    "}",
    `core.useElement(${type}, ${type}Element)`
  ]
}

/** A drawable type's class, `class Card extends Drawable` with its element tag;  `members` inside it. */
function drawableClass(type: string, superType: string, members: string[] = []): string[] {
  return [
    `export class ${type} extends ${superType} {`,
    ...members,
    '  static elementTag = core.defineElement(this, "test_classes")',
    "}"
  ]
}

////////////////
// ## Word rules:  Spanish's words for each thing, and what each form means (`Wording`)
////////////////

// Which way a list's item moves, for `list_guard`:  `una pila puede soltar una carta si: ...` means `give_up`
classesEs.addRule(Wording.specialize({ ruleName: "take_or_give_up", meanings: ["take", "give_up"] }), {
  syntax: "((take:agregar|añadir|anadir|tomar)|(give_up:soltar|quitar|eliminar|ceder))"
})

// What a type's things may be, for `drag_and_drop`:  `se puede arrastrar`, `se puede soltar encima`
classesEs.addRule(Wording.specialize({ ruleName: "drag_or_drop", meanings: ["dragged", "dropped_on", "selected"] }), {
  syntax: "((dragged:arrastrar)|(dropped_on:soltar encima)|(selected:seleccionar))"
})

// When a list's drag handler runs, for `drag_handler`:  `cuando una carta se suelta sobre ella`
classesEs.addRule(
  Wording.specialize({ ruleName: "drag_moment", meanings: ["dragged_over", "dragged_out_of", "dropped_on"] }),
  { syntax: "((dragged_over:arrastra sobre)|(dragged_out_of:arrastra fuera de)|(dropped_on:suelta sobre))" }
)

// The same, as adjectives:  `es arrastrable`, `no es soltable`
classesEs.addRule(
  Wording.specialize({ ruleName: "draggable_or_droppable", meanings: ["dragged", "dropped_on", "selected"] }),
  {
    syntax: "((dragged:arrastrable)|(dropped_on:soltable)|(selected:seleccionable))"
  }
)

// Which bound, for `must_rule`:  `debe tener al menos 3 letras`
classesEs.addRule(Wording.specialize({ ruleName: "at_least_or_at_most", meanings: ["at_least", "at_most"] }), {
  syntax: "((at_least:al menos|como mínimo|como minimo)|(at_most:como mucho|a lo sumo|como máximo|como maximo))"
})

// Which kind of text, for `must_rule` and `type_specifier_text_kind`:  `como una url`, `debe ser un email`
classesEs.addRule(Wording.specialize({ ruleName: "url_or_email", meanings: ["url", "email"] }), {
  syntax: "((url:url)|(email:email|correo electrónico|correo electronico|correo))"
})

// Which drawing a type writes, for `draw_it`:  `para dibujarlo` is `draw`, a list's `para dibujar cada elemento` is
// `draw_each_item`, and its `para dibujar su marcador`, what it shows while it's empty, `draw_its_placeholder` --
// Spanish fuses `it` into its verb, `dibujarlo` (`dibujarla` for a feminine type)
classesEs.addRule(
  Wording.specialize({ ruleName: "draw_method", meanings: ["draw", "draw_each_item", "draw_its_placeholder"] }),
  {
    syntax:
      "((draw:dibujarlo|dibujarla|dibujar (eso|ello))|(draw_each_item:dibujar cada elemento)|" +
      "(draw_its_placeholder:dibujar su marcador))"
  }
)

classesEs.addRule(WithNestedStatements, {
  syntax: "(donde|con)? :",
  tests: [
    {
      // matched only:  its statement compiles, never this
      compileAs: "with_nested_statements",
      tests: [
        ["donde:", "donde :"],
        ["con:", "con :"],
        [":", ":"]
      ]
    }
  ]
})

// ... and `donde` with no colon (P10)
classesEs.addRule(WithNestedStatements, {
  syntax: "donde",
  tests: [{ compileAs: "with_nested_statements", tests: [["donde", "donde"]] }]
})

classesEs.addRule(CreateType, {
  syntax: `${A} {type:type_words} (alias {aka:singular_type})? es ${A} {superType:type} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["una card es una cosa", "export class Card extends Thing {}"],
        ["un deck es una lista", "export class Deck extends List {}"],
        ["una bank account es una cosa", "export class BankAccount extends Thing {}"],
        ["una bank account alias account es una cosa", "export class BankAccount extends Thing {}"],
        [
          "una card es una cosa dibujable",
          drawableClass("Card", "Drawable"),
          [...drawableClass("Card", "Drawable"), ...drawableElement("Card", "card")]
        ],
        // a Spanish name:  its element is named from it, `<test-classes-carta>`, as English's `<test-classes-card>`
        [
          "una carta es una cosa dibujable",
          drawableClass("Carta", "Drawable"),
          [...drawableClass("Carta", "Drawable"), ...drawableElement("Carta", "carta")]
        ],
        [
          "una card es un dibujable",
          drawableClass("Card", "Drawable"),
          [...drawableClass("Card", "Drawable"), ...drawableElement("Card", "card")]
        ],
        [
          "una pile es una lista dibujable",
          drawableClass("Pile", "DrawableList"),
          [...drawableClass("Pile", "DrawableList"), ...drawableElement("Pile", "pile")]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        ["una card es una cosa donde:", "export class Card extends Thing {}"],
        ["una card es una cosa:", "export class Card extends Thing {}"],
        [
          ["una card es una cosa con:", "\t- tiene un rank como un número"],
          [
            "export class Card extends Thing {",
            "  // tiene un rank como un número",
            '  static { this.declareProp("rank", { type: "number" }) }',
            '  get rank() { return this.getProp("rank") }',
            '  set rank(value) { this.setProp("rank", value) }',
            "}"
          ],
          [
            "export class Card extends Thing {",
            "  // tiene un rank como un número",
            '  @prop({ type: "number" })',
            "  accessor rank!: number",
            "}"
          ]
        ]
      ]
    }
  ]
})

classesEs.addRule(CreateType, {
  syntax: `${A} {type:quoted_type} es ${A} {superType:type} {with_nested_statements}?`,
  tests: [
    { compileAs: "statement", tests: [['una "card" es una cosa', "export class Card extends Thing {}"]] },
    { compileAs: "block", tests: [['una "card" es una cosa donde:', "export class Card extends Thing {}"]] }
  ]
})

classesEs.addRule(CreateOneOfAKind, {
  syntax: `{type:type_words} es ${A} {superType:type} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          "solitaire es una aplicación",
          ["export class Solitaire extends App {}", "export const solitaire = new Solitaire()"]
        ],
        ["solitaire es una cosa", undefined]
      ]
    }
  ]
})

classesEs.addRule(CreateListType, {
  syntax: `crear un tipo (llamado|llamada|nombrado) {type} como ${A} lista ${OF} {instanceType:type}`,
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          "crear un tipo llamado hand como una lista de cartas",
          ["export class Hand extends List {", "  static instanceType = Carta", "}"],
          ["export class Hand extends List<Carta> {", "  static instanceType = Carta", "}"]
        ]
      ]
    }
  ]
})

classesEs.addRule(CreateListType, {
  syntax: `${A} {type:type_words} (alias {aka:singular_type})? es ${A} lista ${OF} {instanceType:type} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          "un deck es una lista de cartas",
          ["export class Deck extends List {", "  static instanceType = Carta", "}"],
          ["export class Deck extends List<Carta> {", "  static instanceType = Carta", "}"]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        [
          "un deck es una lista de cartas con:",
          ["export class Deck extends List {", "  static instanceType = Carta", "}"],
          ["export class Deck extends List<Carta> {", "  static instanceType = Carta", "}"]
        ]
      ]
    }
  ]
})

classesEs.addRule(CreateListType, {
  syntax: `${A} {type:quoted_type} es ${A} lista ${OF} {instanceType:type} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          'un "deck" es una lista de cartas',
          ["export class Deck extends List {", "  static instanceType = Carta", "}"],
          ["export class Deck extends List<Carta> {", "  static instanceType = Carta", "}"]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        [
          'un "deck" es una lista de cartas con:',
          ["export class Deck extends List {", "  static instanceType = Carta", "}"],
          ["export class Deck extends List<Carta> {", "  static instanceType = Carta", "}"]
        ]
      ]
    }
  ]
})

classesEs.addRule(ReopenType, {
  syntax: `${A} {type} {with_nested_statements}`
})

classesEs.addRule(CreateDrawableListType, {
  syntax: `${A} {type:type_words} (alias {aka:singular_type})? es ${A} lista dibujable ${OF} {instanceType:type} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          "una pile es una lista dibujable de cartas",
          drawableClass("Pile", "DrawableList", ["  static instanceType = Carta"]),
          [
            ...drawableClass("Pile", "DrawableList<Carta>", ["  static instanceType = Carta"]),
            ...drawableElement("Pile", "pile")
          ]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        [
          "una pile es una lista dibujable de cartas con:",
          drawableClass("Pile", "DrawableList", ["  static instanceType = Carta"]),
          [
            ...drawableClass("Pile", "DrawableList<Carta>", ["  static instanceType = Carta"]),
            ...drawableElement("Pile", "pile")
          ]
        ]
      ]
    }
  ]
})

// ... with its name quoted, as an outline names it:  `una "pila" es una lista dibujable de cartas donde:`
classesEs.addRule(CreateDrawableListType, {
  syntax: `${A} {type:quoted_type} es ${A} lista dibujable ${OF} {instanceType:type} {with_nested_statements}?`
})

classesEs.addRule(CSSBlock, {
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          ["una card es una cosa dibujable:", "\t<css>", "\t\t.red { color: crimson }", "\t</css>"],
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "",
            "  static css = css`",
            "    .red { color: crimson }",
            "  `",
            "}"
          ],
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "",
            "  static css = css`",
            "    .red { color: crimson }",
            "  `",
            "}",
            "",
            "/**",
            " * `<test-classes-card>`:  a card, drawn in its own element, e.g. by `draw the card`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its card's properties;  its methods call its card's.",
            " * - What every drawable thing's element does, e.g. drawing its card, is `SpellElement`'s.",
            " */",
            "export class CardElement extends SpellElement<Card> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-card", "card", [])',
            "  @E.protoMerged static elementSetup = {",
            '    styleSheets: { "test-classes-card": Card.css }',
            "  } satisfies Partial<E.ElementSetup>",
            "}",
            "core.useElement(Card, CardElement)"
          ]
        ]
      ]
    }
  ]
})

classesEs.addRule(MarkdownDescription, {
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          ["una card es una cosa:", "\t<markdown>", "\t\tUna carta:  **{rank}** de *suit*.", "\t</markdown>"],
          ["export class Card extends Thing {", '  static description = "Una carta:  **{rank}** de *suit*."', "}"]
        ],
        // not in an outline:  says where it goes
        [
          ["<markdown>", "\tHola", "</markdown>"],
          "/* PARSE ERROR: Un bloque <markdown> va en el esquema de un tipo, como su descripción, o en un dibujo:  devolver <markdown>...</markdown> */"
        ]
      ]
    }
  ]
})

classesEs.addRule(BelongsToOne, {
  syntax: `${A} {type} pertenece a ${A} {list:type}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(
          ["una carta es una cosa", "una pile es una lista de cartas", "un bag es una lista de things"].join("\n"),
          "block"
        )
      },
      tests: [
        [
          "una carta pertenece a una pile",
          [
            "Pile.exclusive = true",
            'Object.defineProperty(Carta.prototype, "pile", {',
            "  get() {",
            "    return Pile.ownerOf(this)",
            "  },",
            "  configurable: true",
            "})"
          ],
          [
            "Pile.exclusive = true",
            "export interface Carta { readonly pile: Pile }",
            'Object.defineProperty(Carta.prototype, "pile", {',
            "  get(this: Carta) {",
            "    return Pile.ownerOf(this)!",
            "  },",
            "  configurable: true",
            "})"
          ]
        ],
        {
          title: "a built-in item type:  no member, it'd go on a type every project shares",
          input: "una cosa pertenece a un bag",
          js: "Bag.exclusive = true"
        },
        {
          title: "both types MUST be declared above",
          input: "una carta pertenece a una hand",
          js: '/* PARSE ERROR: Todavía no se puede decir "una carta pertenece a una hand":  declara "un hand es una lista de cartas" antes */'
        },
        {
          title: "the list type MUST be a list of the project's",
          input: ["una carta pertenece a una lista", "una carta pertenece a una carta"],
          js: [
            '/* PARSE ERROR: No se puede decir "una carta pertenece a una lista":  cada lista tendría una carta una sola vez */',
            '/* PARSE ERROR: No se puede decir "una carta pertenece a una carta":  una carta no es una lista */'
          ]
        }
      ]
    }
  ]
})

// in an outline body:  `- él pertenece a un mazo` -- Spanish leaves `it` out, so `subject_it` matches nothing
classesEs.addRule(BelongsToOne, { syntax: `{type:subject_it} pertenece a ${A} {list:type}` })

// ... and with the subject left out (P8):  `- pertenece a una pila`
classesEs.addRule(BelongsToOne, { syntax: `{type:subject_implied} pertenece a ${A} {list:type}` })

classesEs.addRule(CanBelongToMany, {
  syntax: `${A} {type:known_type} puede pertenecer a (muchos|muchas) {list:known_type}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["una card es una cosa", "una pila es una lista de cards"].join("\n"), "block")
      },
      tests: [["una card puede pertenecer a muchas pilas", ""]]
    }
  ]
})

// `una carta se puede arrastrar`, `una pila se puede soltar encima`:  English's `can be dragged`, `can be dropped on`
classesEs.addRule(DragAndDrop, {
  syntax: `${A} {type:known_type} se puede {what:drag_or_drop}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(
          ["una carta es una cosa dibujable", "una pila es una lista dibujable de cartas"].join("\n"),
          "block"
        )
      },
      tests: [
        ["una carta se puede arrastrar", "Carta.canBeDragged = true"],
        ["una pila se puede soltar encima", "Pila.canBeDroppedOn = true"],
        ["una carta se puede seleccionar", "Carta.canBeSelected = true"]
      ]
    }
  ]
})

classesEs.addRule(DragAndDrop, {
  syntax: `${A} {type:known_type} {is:is_or_is_not} {what:draggable_or_droppable}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(
          ["una carta es una cosa dibujable", "una pila es una lista dibujable de cartas"].join("\n"),
          "block"
        )
      },
      tests: [
        ["una carta es arrastrable", "Carta.canBeDragged = true"],
        ["una pila no es soltable", "Pila.canBeDroppedOn = false"]
      ]
    }
  ]
})

// in a list type's outline body:  `- cuando una carta se suelta sobre ella:`
classesEs.addRule(DragHandler, {
  syntax: "cuando (un|una) {item:type} se {moment:drag_moment} (él|ella|ello) :? {statement_body}?"
})
classesEs.addRule(DragHandler, { syntax: "cuando algo se {moment:drag_moment} (él|ella|ello) :? {statement_body}?" })
classesEs.addRule(DragHandler, {
  syntax: "mientras (un|una) {item:type} se arrastra sobre (él|ella|ello) :? {statement_body}?"
})
classesEs.addRule(DragHandler, { syntax: "mientras algo se arrastra sobre (él|ella|ello) :? {statement_body}?" })

for (const subject of ["subject_it", "subject_implied"]) {
  classesEs.addRule(DragAndDrop, { syntax: `{type:${subject}} se puede {what:drag_or_drop}` })
  classesEs.addRule(DragAndDrop, { syntax: `{type:${subject}} {is:is_or_is_not} {what:draggable_or_droppable}` })
}

classesEs.addRule(SavedInline, {
  syntax: `${A} {type:known_type} se guarda dentro`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["un dated-event es una cosa", "una card es una cosa dibujable"].join("\n"), "block")
      },
      tests: [
        ["un dated-event se guarda dentro", "DatedEvent.savedInline = true"],
        {
          title: "a drawable thing too:  saved inside, as every thing is by default",
          input: "una card se guarda dentro",
          js: "Card.savedInline = true"
        },
        {
          title: "not a built-in type:  every project shares it",
          input: "una cosa se guarda dentro",
          js: "/* PARSE ERROR: No se puede guardar el tipo cosa dentro:  viene incorporado, y todos los proyectos lo comparten */"
        }
      ]
    }
  ]
})

// in an outline body:  `- se guarda dentro`
classesEs.addRule(SavedInline, { syntax: "{type:subject_it} se guarda dentro" })

classesEs.addRule(SavedInline, { syntax: "{type:subject_implied} se guarda dentro" })

classesEs.addRule(SavedInFile, {
  syntax: `${A} {type:known_type} se guarda en su propio archivo`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse("una person es una cosa", "block")
      },
      tests: [
        ["una person se guarda en su propio archivo", "Person.savedInFile = true"],
        {
          title: "not a built-in type:  every project shares it",
          input: "una cosa se guarda en su propio archivo",
          js: "/* PARSE ERROR: No se puede guardar el tipo cosa en su propio archivo:  viene incorporado, y todos los proyectos lo comparten */"
        }
      ]
    }
  ]
})

// in an outline body:  `- se guarda en su propio archivo`
classesEs.addRule(SavedInFile, { syntax: "{type:subject_it} se guarda en su propio archivo" })

classesEs.addRule(SavedInFile, { syntax: "{type:subject_implied} se guarda en su propio archivo" })

classesEs.addRule(VersionStep, {
  syntax: `${A} {type:known_type} (versión|version) {version:number} renombra {from:identifier} (a|como) {to:identifier}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse("una person es una cosa", "block")
      },
      tests: [
        ["una person versión 2 renombra name a names", 'Person.v2RenamesName = "names"'],
        ["una person version 4 renombra nick-name a nickname", 'Person.v4RenamesNickName = "nickname"'],
        {
          title: "a version step starts at version 2",
          input: "una person versión 1 renombra name a names",
          js: "/* PARSE ERROR: Un paso de versión empieza en la versión 2:  un archivo sin versión es la versión 1 */"
        }
      ]
    }
  ]
})

classesEs.addRule(VersionStep, {
  syntax: `${A} {type:known_type} (versión|version) {version:number} (drops:quita|elimina|descarta) {from:identifier}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse("una person es una cosa", "block")
      },
      tests: [["una person versión 3 quita nickname", "Person.v3DropsNickname = true"]]
    }
  ]
})

classesEs.addRule(UpgradeMethod, {
  syntax: `para actualizar \\( ${A} {type:known_type} \\) a la? (versión|version) {version:number} :? {statement_body}?`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["una person es una cosa", "una person tiene un name como texto"].join("\n"), "block")
      },
      tests: [
        [
          'para actualizar (una person) a la versión 4: poner su name a "x"',
          ["Person.prototype.upgradeToVersion4 = function () {", '  this.name = "x"', "}"],
          [
            "export interface Person { upgradeToVersion4(): undefined }",
            "Person.prototype.upgradeToVersion4 = function (this: Person) {",
            '  this.name = "x"',
            "}"
          ]
        ],
        {
          title: "an upgrade starts at version 2",
          input: 'para actualizar (una person) a la versión 1: poner su name a "x"',
          js: "/* PARSE ERROR: Una actualización empieza en la versión 2:  un archivo sin versión es la versión 1 */"
        }
      ]
    }
  ]
})

classesEs.addRule(ListGuard, {
  syntax: `${A} {type:known_type} ${CAN_MOVE}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["una carta es una cosa", "una pile es una lista de cartas"].join("\n"), "block")
      },
      tests: [
        [
          "una pile puede tomar una carta si: la pile está vacía",
          ["Pile.prototype.canTake = function (carta) {", "  return this.isEmpty", "}"],
          [
            "export interface Pile { canTake(carta: Carta): boolean }",
            "Pile.prototype.canTake = function (this: Pile, carta: Carta) {",
            "  return this.isEmpty",
            "}"
          ]
        ],
        {
          title: "an indented body, `la pile` and `la carta`",
          input: [
            "una pile puede agregar una carta si:",
            "\tsi la pile está vacía devolver sí",
            "\tdevolver la carta no es la última carta de la pile"
          ],
          js: [
            "Pile.prototype.canTake = function (carta) {",
            "  if (this.isEmpty) return true",
            "  return carta !== this.lastItem",
            "}"
          ],
          ts: [
            "export interface Pile { canTake(carta: Carta): boolean }",
            "Pile.prototype.canTake = function (this: Pile, carta: Carta) {",
            "  if (this.isEmpty) return true",
            "  return carta !== this.lastItem",
            "}"
          ]
        },
        [
          "una pile puede agregar una carta si: no",
          ["Pile.prototype.canTake = function (carta) {", "  return false", "}"],
          [
            "export interface Pile { canTake(carta: Carta): boolean }",
            "Pile.prototype.canTake = function (this: Pile, carta: Carta) {",
            "  return false",
            "}"
          ]
        ],
        [
          "una pile puede ceder una carta si: la carta es su última carta",
          ["Pile.prototype.canGiveUp = function (carta) {", "  return carta === this.lastItem", "}"],
          [
            "export interface Pile { canGiveUp(carta: Carta): boolean }",
            "Pile.prototype.canGiveUp = function (this: Pile, carta: Carta) {",
            "  return carta === this.lastItem",
            "}"
          ]
        ],
        [
          "una pile puede soltar una carta si: sí",
          ["Pile.prototype.canGiveUp = function (carta) {", "  return true", "}"],
          [
            "export interface Pile { canGiveUp(carta: Carta): boolean }",
            "Pile.prototype.canGiveUp = function (this: Pile, carta: Carta) {",
            "  return true",
            "}"
          ]
        ]
      ]
    }
  ]
})

classesEs.addRule(ListGuard, {
  syntax: `${A} {type:known_type} ${CAN_NEVER_MOVE}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["una carta es una cosa", "una pile es una lista de cartas"].join("\n"), "block")
      },
      tests: [
        [
          "una pile nunca puede soltar una carta",
          ["Pile.prototype.canGiveUp = function (carta) {", "  return false", "}"],
          [
            "export interface Pile { canGiveUp(carta: Carta): boolean }",
            "Pile.prototype.canGiveUp = function (this: Pile, carta: Carta) {",
            "  return false",
            "}"
          ]
        ],
        [
          "una pile no puede nunca tomar una carta",
          ["Pile.prototype.canTake = function (carta) {", "  return false", "}"],
          [
            "export interface Pile { canTake(carta: Carta): boolean }",
            "Pile.prototype.canTake = function (this: Pile, carta: Carta) {",
            "  return false",
            "}"
          ]
        ]
      ]
    }
  ]
})

// in a list type's outline body:  `- puede tomar una carta si: ...`, `- nunca puede soltar una carta`
for (const subject of ["subject_it", "subject_implied"]) {
  for (const guard of [CAN_MOVE, CAN_NEVER_MOVE]) {
    classesEs.addRule(ListGuard, { syntax: `{type:${subject}} ${guard}` })
  }
}

classesEs.addRule(NewThing, {
  syntax: `${A} (nuevo|nueva) {type:known_type} ((con|donde|cuyo|cuya|cuyos|cuyas) {props:object_literal_properties})?`,
  tests: [
    {
      title: "creates normal types",
      compileAs: "expression",
      tests: [
        [`una nueva cosa`, `new Thing()`],
        [`una nueva Thing con x = 1, b = sí`, `new Thing({ x: 1, b: true })`]
      ]
    },
    {
      title: "creates base types",
      compileAs: "expression",
      tests: [
        ["un nuevo Object", "new Object()"],
        ["un nuevo object con x = 1, b = sí", "new Object({ x: 1, b: true })"]
      ]
    }
  ]
})

classesEs.addRule(NewList, {
  syntax: `${A} (nuevo|nueva) (lista|List) ${OF} {instanceType:type}?`,
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`una nueva lista`, `new List()`],
        [`una nueva List`, `new List()`],
        [
          `una nueva lista de objects`,
          `new List({ instanceType: "Object" })`,
          'new List<Object>({ instanceType: "Object" })'
        ],
        [
          `una nueva lista de números`,
          `new List({ instanceType: "number" })`,
          'new List<number>({ instanceType: "number" })'
        ],
        [`una nueva lista de Todos`, `new List({ instanceType: "Todo" })`, 'new List<Todo>({ instanceType: "Todo" })']
      ]
    }
  ]
})

classesEs.addRule(CreateThing, {
  syntax: `crear ${A} {type:known_type} ((con|donde|cuyo|cuya|cuyos|cuyas) {props:object_literal_properties})?`,
  tests: [
    {
      title: "creates normal objects properly",
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.types?.add("Thing")
      },
      tests: [
        [`crear una Thing`, `new Thing()`],
        [`crear una Thing con x = 1, b = sí`, `new Thing({ x: 1, b: true })`]
      ]
    },
    {
      title: "creates base types",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.types?.add("Object")
        scope.types?.add("List")
      },
      tests: [
        ["crear un object", "new Object()"],
        ["crear un object con x = 1, b = sí", "new Object({ x: 1, b: true })"],
        ["crear una List", "new List()"],
        ["crear una lista", "new List()"]
      ]
    }
  ]
})

classesEs.addRule(TypeSpecifierEnum, {
  syntax: "como (o bien|uno de|una de) {enumeration:identifier_list}",
  tests: [
    {
      tests: [
        ["como o bien red o black", '["red", "black"]'],
        ["como uno de clubs, diamonds, hearts, spades", '["clubs", "diamonds", "hearts", "spades"]']
      ]
    }
  ]
})

classesEs.addRule(TypeSpecifierDatatype, {
  syntax: `como ${A}? {datatype:singular_type}`,
  tests: [
    {
      tests: [
        ["como un número", "number"],
        ["como un automobile", "Automobile"]
      ]
    }
  ]
})

classesEs.addRule(TypeSpecifierInstance, {
  syntax: "como ({new_list}|{new_thing})",
  tests: [
    {
      tests: [
        ["como una nueva cosa", "new Thing()"],
        ["como una nueva cosa con x=1, b = verdadero", "new Thing({ x: 1, b: true })"],
        [
          "como una nueva lista de números",
          'new List({ instanceType: "number" })',
          'new List<number>({ instanceType: "number" })'
        ]
      ]
    }
  ]
})

classesEs.addRule(TypeSpecifierYesOrNo, {
  syntax: "como (o bien)? ((sí|si) o no|verdadero o falso)",
  tests: [{ tests: [["como sí o no", "choice"]] }]
})

// Spanish's own:  the values alone, `como arriba o abajo` -- English always says `as either` or `as one of`.
// After `type_specifier_datatype`, so one word, `como texto`, ties and stays a type.
classesEs.addRule(TypeSpecifierEnum, {
  syntax: "como {enumeration:identifier_list}",
  tests: [{ tests: [["como up o down", '["up", "down"]']] }]
})

classesEs.addRule(ClassMember, {
  syntax: `{member:member_words} ${OF} {type:known_type}`,
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "una card es una cosa",
            "una card tiene un palo como uno de tréboles, diamantes",
            "una cuenta-bancaria es una cosa",
            "una cuenta-bancaria tiene un tipo-de-cuenta como uno de ahorro, corriente"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        ["palos de card", "Card.Palos"],
        ["Palos de Card", "Card.Palos"],
        // Spanish words, which Spanish's inflector makes plural:  `tipo-de-cuenta` => `tipos-de-cuenta`
        ["tipos-de-cuenta de cuenta-bancaria", "CuentaBancaria.TiposDeCuenta"],
        { title: "not a class variable", input: "rangos de card", js: undefined }
      ]
    }
  ]
})

classesEs.addRule(DefinePropertyHas, {
  syntax: `${A} {type:singular_type} tiene (un|una|una propiedad)? {property:member_words} {specifier:type_specifier}? ${RULES}`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "un player tiene un name como texto",
          [
            "// un player tiene un name como texto",
            'Player.declareProp("name", { type: "text" })',
            'Object.defineProperty(Player.prototype, "name", {',
            '  get() { return this.getProp("name") },',
            '  set(value) { this.setProp("name", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Player { name: string }",
            "// un player tiene un name como texto",
            'Player.declareProp("name", { type: "text" })',
            'Object.defineProperty(Player.prototype, "name", {',
            '  get(this: Player): string { return this.getProp("name") as string },',
            '  set(this: Player, value: string) { this.setProp("name", value) },',
            "  configurable: true",
            "})"
          ]
        ]
      ]
    },
    {
      title: "declares type's enumeration and property",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "una card es una cosa",
            "una card tiene un palo como uno de tréboles, diamantes, corazones o espadas",
            "card = una nueva card"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "statement",
      tests: [
        // every way to reach an enumeration names its class variable
        ["imprimir Palos de Card", "core.console.log(Card.Palos)"],
        ["imprimir palos de card", "core.console.log(Card.Palos)"],
        ["imprimir el palo de la card está en palos de card", "core.console.log(core.includes(Card.Palos, card.palo))"],
        ["imprimir el palo de la card", "core.console.log(card.palo)"],
        ["imprimir los palos de la card", "core.console.log(Card.Palos)"],
        // a card is one thing, not a list:  so not how many `palos` it holds, but how many it can be
        ["imprimir el número de palos de card", "core.console.log(core.itemCountOf(Card.Palos))"]
      ]
    },
    {
      title: "an enumeration through `sus`, and on a dashed type",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "una card es una cosa",
            "una card tiene un palo como uno de tréboles, diamantes, corazones o espadas",
            "una cuenta-bancaria es una cosa",
            "una cuenta-bancaria tiene un tipo-de-cuenta como uno de ahorro o corriente"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "block",
      tests: [
        [
          ["obtener una nueva card", "imprimir sus palos"],
          ["const it = new Card()", "core.console.log(Card.Palos)"]
        ],
        ["imprimir tipos-de-cuenta de cuenta-bancaria", "core.console.log(CuentaBancaria.TiposDeCuenta)"]
      ]
    },
    {
      title: "every thing has an `id`, built in:  no type declares its own (epic `people-and-orgs`, Q9)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile(["una person es una cosa", "un club es una lista de persons"].join("\n"), "block")
      },
      tests: [
        {
          input: "una person tiene un id como texto",
          js: '/* PARSE ERROR: No se puede añadir "id" al tipo Person:  cada cosa ya tiene uno, incorporado */'
        },
        {
          input: "un club tiene un id",
          js: '/* PARSE ERROR: No se puede añadir "id" al tipo Club:  cada cosa ya tiene uno, incorporado */'
        },
        {
          input: ["person = una nueva person", "imprimir el id de la person"],
          js: ["export const person = new Person()", "core.console.log(person.id)"]
        },
        {
          input: ["person = una nueva person", 'poner el id de la person a "owen"'],
          js: ["export const person = new Person()", 'person.id = "owen"']
        },
        {
          input: ["club = un nuevo club", "imprimir el id del club"],
          js: ["export const club = new Club()", "core.console.log(club.id)"]
        }
      ]
    },
    {
      title: "every list has a `name`, built in, which a type may still declare, as text (epic `spanish` P15)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile(["una carta es una cosa", "una pila es una lista de cartas"].join("\n"), "block")
      },
      tests: [
        {
          input: ["pila = una nueva pila", "imprimir el nombre de la pila"],
          js: ["export const pila = new Pila()", "core.console.log(pila.name)"]
        },
        {
          input: ["pila = una nueva pila", 'poner el nombre de la pila a "mazo"'],
          js: ["export const pila = new Pila()", 'pila.name = "mazo"']
        },
        {
          input: 'pila = una nueva pila con nombre = "mazo"',
          js: 'export const pila = new Pila({ name: "mazo" })'
        },
        {
          input: ["pila = una nueva pila", "el título de una pila es: su nombre"],
          js: [
            "export const pila = new Pila()",
            'Object.defineProperty(Pila.prototype, "título", {',
            "  get() {",
            "    return this.name",
            "  },",
            "  configurable: true",
            "})"
          ],
          ts: [
            "export const pila = new Pila()",
            "export interface Pila { readonly título: string }",
            'Object.defineProperty(Pila.prototype, "título", {',
            "  get(this: Pila) {",
            "    return this.name",
            "  },",
            "  configurable: true",
            "})"
          ]
        },
        {
          input: "una pila tiene un nombre como texto",
          js: [
            "// una pila tiene un nombre como texto",
            'Pila.declareProp("name", { type: "text" })',
            'Object.defineProperty(Pila.prototype, "name", {',
            '  get() { return this.getProp("name") },',
            '  set(value) { this.setProp("name", value) },',
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface Pila { name: string }",
            "// una pila tiene un nombre como texto",
            'Pila.declareProp("name", { type: "text" })',
            'Object.defineProperty(Pila.prototype, "name", {',
            '  get(this: Pila): string { return this.getProp("name") as string },',
            '  set(this: Pila, value: string) { this.setProp("name", value) },',
            "  configurable: true",
            "})"
          ]
        },
        {
          input: "una pila tiene un nombre como número",
          js: '/* PARSE ERROR: No se puede añadir "nombre" al tipo Pila como número:  cada lista ya tiene uno, incorporado, como texto */'
        },
        {
          title: "a thing has no `name` built in:  any type will do",
          input: "una carta tiene un nombre como número",
          js: [
            "// una carta tiene un nombre como número",
            'Carta.declareProp("nombre", { type: "number" })',
            'Object.defineProperty(Carta.prototype, "nombre", {',
            '  get() { return this.getProp("nombre") },',
            '  set(value) { this.setProp("nombre", value) },',
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface Carta { nombre: number }",
            "// una carta tiene un nombre como número",
            'Carta.declareProp("nombre", { type: "number" })',
            'Object.defineProperty(Carta.prototype, "nombre", {',
            '  get(this: Carta): number { return this.getProp("nombre") as number },',
            '  set(this: Carta, value: number) { this.setProp("nombre", value) },',
            "  configurable: true",
            "})"
          ]
        }
      ]
    },
    {
      title: "a list says what it holds, so saving knows before it holds any",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile("una friend-list es una cosa", "block")
      },
      tests: [
        {
          input: "una friend-list tiene persons como una nueva lista de persons",
          js: [
            "// una friend-list tiene persons como una nueva lista de persons",
            'FriendList.declareProp("persons", { itemType: "Person", init: () => new List({ instanceType: "Person" }) })',
            'Object.defineProperty(FriendList.prototype, "persons", {',
            '  get() { return this.getProp("persons") },',
            '  set(value) { this.setProp("persons", value) },',
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface FriendList { persons: List<Person> }",
            "// una friend-list tiene persons como una nueva lista de persons",
            'FriendList.declareProp("persons", { itemType: "Person", init: () => new List<Person>({ instanceType: "Person" }) })',
            'Object.defineProperty(FriendList.prototype, "persons", {',
            '  get(this: FriendList): List<Person> { return this.getProp("persons") as List<Person> },',
            '  set(this: FriendList, value: List<Person>) { this.setProp("persons", value) },',
            "  configurable: true",
            "})"
          ]
        }
      ]
    },
    {
      title: "a name of several words, blacklisted ones too -- the article is optional",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile("una card es una cosa", "block")
      },
      tests: [
        [
          "una card tiene short rank como texto",
          [
            "// una card tiene short rank como texto",
            'Card.declareProp("shortRank", { type: "text" })',
            'Object.defineProperty(Card.prototype, "shortRank", {',
            '  get() { return this.getProp("shortRank") },',
            '  set(value) { this.setProp("shortRank", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Card { shortRank: string }",
            "// una card tiene short rank como texto",
            'Card.declareProp("shortRank", { type: "text" })',
            'Object.defineProperty(Card.prototype, "shortRank", {',
            '  get(this: Card): string { return this.getProp("shortRank") as string },',
            '  set(this: Card, value: string) { this.setProp("shortRank", value) },',
            "  configurable: true",
            "})"
          ]
        ]
      ]
    }
  ]
})

classesEs.addRule(DefinePropertyHas, {
  syntax: `(los|las)? {type:plural_type} tienen (un|una|una propiedad)? {property:member_words} {specifier:type_specifier}? ${RULES}`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "las cartas tienen una dirección como o bien up o down",
          [
            "// las cartas tienen una dirección como o bien up o down",
            'Carta.Direcciones = ["up", "down"]',
            'Carta.declareProp("dirección", { oneOf: Carta.Direcciones })',
            'Object.defineProperty(Carta.prototype, "dirección", {',
            '  get() { return this.getProp("dirección") },',
            '  set(value) { this.setProp("dirección", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "// las cartas tienen una dirección como o bien up o down",
            'Carta.Direcciones = ["up", "down"]',
            "export interface Carta { dirección: (typeof Carta.Direcciones)[number] }",
            'Carta.declareProp("dirección", { oneOf: Carta.Direcciones })',
            'Object.defineProperty(Carta.prototype, "dirección", {',
            '  get(this: Carta): (typeof Carta.Direcciones)[number] { return this.getProp("dirección") as (typeof Carta.Direcciones)[number] },',
            '  set(this: Carta, value: (typeof Carta.Direcciones)[number]) { this.setProp("dirección", value) },',
            "  configurable: true",
            "})"
          ]
        ],
        [
          "los todos tienen un title como texto",
          [
            "// los todos tienen un title como texto",
            'Todo.declareProp("title", { type: "text" })',
            'Object.defineProperty(Todo.prototype, "title", {',
            '  get() { return this.getProp("title") },',
            '  set(value) { this.setProp("title", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Todo { title: string }",
            "// los todos tienen un title como texto",
            'Todo.declareProp("title", { type: "text" })',
            'Object.defineProperty(Todo.prototype, "title", {',
            '  get(this: Todo): string { return this.getProp("title") as string },',
            '  set(this: Todo, value: string) { this.setProp("title", value) },',
            "  configurable: true",
            "})"
          ]
        ],
        [
          "todos tienen una propiedad completed como sí o no",
          [
            "// todos tienen una propiedad completed como sí o no",
            'Todo.declareProp("completed", { type: "choice" })',
            'Object.defineProperty(Todo.prototype, "completed", {',
            '  get() { return this.getProp("completed") },',
            '  set(value) { this.setProp("completed", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Todo { completed: boolean }",
            "// todos tienen una propiedad completed como sí o no",
            'Todo.declareProp("completed", { type: "choice" })',
            'Object.defineProperty(Todo.prototype, "completed", {',
            '  get(this: Todo): boolean { return this.getProp("completed") as boolean },',
            '  set(this: Todo, value: boolean) { this.setProp("completed", value) },',
            "  configurable: true",
            "})"
          ]
        ],
        [
          "los todos tienen una propiedad tags como una nueva lista",
          [
            "// los todos tienen una propiedad tags como una nueva lista",
            'Todo.declareProp("tags", { init: () => new List() })',
            'Object.defineProperty(Todo.prototype, "tags", {',
            '  get() { return this.getProp("tags") },',
            '  set(value) { this.setProp("tags", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Todo { tags: any /* spell: type unknown */ }",
            "// los todos tienen una propiedad tags como una nueva lista",
            'Todo.declareProp("tags", { init: () => new List() })',
            'Object.defineProperty(Todo.prototype, "tags", {',
            '  get(this: Todo): any /* spell: type unknown */ { return this.getProp("tags") },',
            '  set(this: Todo, value: any /* spell: type unknown */) { this.setProp("tags", value) },',
            "  configurable: true",
            "})"
          ]
        ]
      ]
    }
  ]
})

// a quoted name in the sentence style:  `una carta tiene un "palo" como uno de ...`
classesEs.addRule(DefinePropertyHas, {
  syntax: `${A} {type:singular_type} tiene (un|una|una propiedad)? {property:quoted_member} {specifier:type_specifier}? ${RULES}`
})

classesEs.addRule(DefinePropertyHas, {
  syntax: `(los|las)? {type:plural_type} tienen (un|una|una propiedad)? {property:quoted_member} {specifier:type_specifier}? ${RULES}`
})

// in an outline body:  `- su "palo" es uno de tréboles, diamantes, corazones o espadas`, `- su "rango" es un número`;
// a plural name says `sus ... son`:  `- sus "comodines" son sí o no` (epic `spanish` I10)
classesEs.addRule(DefinePropertyHas, {
  syntax: `{type:subject_it} tiene (un|una|una propiedad)? {property:member_words} {specifier:type_specifier}? ${RULES}`
})

classesEs.addRule(DefinePropertyHas, {
  syntax: `{type:subject_its} {property:quoted_member} ${IS_OR_ARE} {specifier:outline_specifier} ${RULES}`
})

// ... and with the subject left out (P8):  `- tiene un mazo`, `- "palo" es uno de tréboles, diamantes ...`
classesEs.addRule(DefinePropertyHas, {
  syntax: `{type:subject_implied} tiene (un|una|una propiedad)? {property:member_words} {specifier:type_specifier}? ${RULES}`
})

classesEs.addRule(DefinePropertyHas, {
  syntax: `{type:subject_implied} {property:quoted_member} ${IS_OR_ARE} {specifier:outline_specifier} ${RULES}`
})

// ... and a bare name (P9):  `- palo es un palo de su mazo`, `- fundaciones son una lista de pilas`
classesEs.addRule(DefinePropertyHas, {
  syntax: `{type:subject_implied} {property:body_member_words} ${IS_OR_ARE} {specifier:outline_specifier} ${RULES}`
})

// ... and the quotes are optional:  `- su rango es un número`
classesEs.addRule(DefinePropertyHas, {
  syntax: `{type:subject_its} {property:member_words} ${IS_OR_ARE} {specifier:outline_specifier} ${RULES}`
})

classesEs.addRule(OutlineSpecifierEnum, {
  syntax: "(o bien|uno de|una de) {enumeration:identifier_list}",
  tests: [
    {
      tests: [["uno de clubs, diamonds, hearts, spades", '["clubs", "diamonds", "hearts", "spades"]']]
    }
  ]
})

classesEs.addRule(OutlineSpecifierEnum, {
  syntax: "{enumeration:identifier_list}",
  tests: [
    {
      tests: [
        ["up o down", '["up", "down"]'],
        ["up", undefined],
        ["up, down", undefined]
      ]
    }
  ]
})

classesEs.addRule(OutlineSpecifierDatatype, {
  syntax: `${A} {datatype:singular_type}`,
  tests: [{ tests: [["un número", "number"]] }]
})

// `un palo de su mazo`:  a value kind, saying where its list is kept -- for the reader;  the kind says it already
classesEs.addRule(OutlineSpecifierDatatype, {
  syntax: `${A} {datatype:singular_type} ${OF} (su|sus) {owner:member_words}`,
  tests: [{ tests: [["un suit de su deck", "Suit"]] }]
})

// without the article, only a KNOWN type:  `su "name" es texto`, but `su "x" es total` stays a getter
classesEs.addRule(OutlineSpecifierDatatype, {
  syntax: "{datatype:known_type}",
  tests: [
    {
      tests: [
        ["texto", "text"],
        ["total", undefined]
      ]
    }
  ]
})

classesEs.addRule(OutlineSpecifierYesOrNo, {
  syntax: "(o bien)? ((sí|si) o no|verdadero o falso)",
  tests: [{ tests: [["sí o no", "choice"]] }]
})

classesEs.addRule(OutlineSpecifierList, {
  syntax: `${A} (nuevo|nueva)? (lista|List) ${OF} {instanceType:type}`,
  tests: [
    {
      tests: [
        [
          "una lista de persons",
          'new List({ instanceType: "Person" })',
          'new List<Person>({ instanceType: "Person" })'
        ],
        [
          "una nueva lista de persons",
          'new List({ instanceType: "Person" })',
          'new List<Person>({ instanceType: "Person" })'
        ]
      ]
    }
  ]
})

classesEs.addRule(OutlineSpecifierInstance, {
  syntax: "({new_list}|{new_thing})",
  tests: [
    {
      tests: [
        ["una nueva cosa", "new Thing()"],
        ["una nueva cosa con x=1, b = verdadero", "new Thing({ x: 1, b: true })"]
      ]
    }
  ]
})

// quoted only:  unquoted, `{values:member_words}` matches any words at a line's start
classesEs.addRule(ValueKind, {
  syntax: "{values:quoted_member} {specifier:type_specifier}"
})

classesEs.addRule(ThePropertyOfAThing, {
  syntax: `${THE} {property:member_words} ${OF} ${A} {type}`
})

// a quoted name, "quotes teach a new word":  `el "color" de una carta es rojo si ...`
classesEs.addRule(ThePropertyOfAThing, {
  syntax: `${THE} {property:quoted_member} ${OF} ${A} {type}`
})

// NOTE:  no `a_things_property`:  English's `a cards color` has no Spanish,
// which says `el color de una carta`
// packs: none AThingsProperty -- Spanish has no "a card's color"

classesEs.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_its} {property:quoted_member}"
})

classesEs.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_its} {property:member_words}"
})

// ... and with the subject left out (P8):  `- "color" es rojo si ...`
classesEs.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_implied} {property:quoted_member}"
})

// ... and a bare name (P9):  `- color es rojo si ...`
classesEs.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_implied} {property:body_member_words}"
})

classesEs.addRule(PropertyValueEither, {
  syntax: "{type_property} es {inline_value_if}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.constants?.add("diamonds", "hearts", "clubs", "spades")
      },
      tests: [
        [
          "el color de una card es red si su suit es o bien diamonds o hearts",
          [
            'Object.defineProperty(Card.prototype, "color", {',
            "  get() {",
            '    if (core.includes(["diamonds", "hearts"], this.suit)) return "red"',
            "  },",
            "  configurable: true",
            "})"
          ],
          [
            "export interface Card { readonly color: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "color", {',
            "  get(this: Card) {",
            '    if (core.includes(["diamonds", "hearts"], this.suit)) return "red"',
            "  },",
            "  configurable: true",
            "})"
          ]
        ],
        [
          "el color de una card es black si su suit es o bien clubs o spades de lo contrario es red",
          [
            'Object.defineProperty(Card.prototype, "color", {',
            "  get() {",
            '    if (core.includes(["clubs", "spades"], this.suit)) return "black"',
            '    return "red"',
            "  },",
            "  configurable: true",
            "})"
          ],
          [
            "export interface Card { readonly color: string }",
            'Object.defineProperty(Card.prototype, "color", {',
            "  get(this: Card) {",
            '    if (core.includes(["clubs", "spades"], this.suit)) return "black"',
            '    return "red"',
            "  },",
            "  configurable: true",
            "})"
          ]
        ]
      ]
    }
  ]
})

classesEs.addRule(PropertyValueGetter, {
  syntax: `${THE} {property:member_words} ${OF} ${A} {type:known_type} es :? {expression_body}?`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile("una card es una cosa\nuna pile es una lista de cards")
      },
      tests: [
        {
          input: "el value de una card es:",
          js: ['Object.defineProperty(Card.prototype, "value", {', "  get() {},", "  configurable: true", "})"],
          ts: [
            "export interface Card { readonly value: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "value", {',
            "  get(this: Card) {},",
            "  configurable: true",
            "})"
          ]
        },
        {
          input: "el value de una card es su name",
          js: [
            'Object.defineProperty(Card.prototype, "value", {',
            "  get() {",
            "    return this.name",
            "  },",
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface Card { readonly value: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "value", {',
            "  get(this: Card) {",
            "    return this.name",
            "  },",
            "  configurable: true",
            "})"
          ]
        },
        {
          input: ["el short-name de una card es:", "\tdevolver la primera word del name de la card"],
          js: [
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get() {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface Card { readonly shortName: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get(this: Card) {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})"
          ]
        },
        {
          title: "Show error if both nestedBlock and inlineStatement",
          input: ["el short-name de una card es su name", "\tdevolver la primera word del name de la card"],
          js: [
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get() {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ],
          ts: [
            "export interface Card { readonly shortName: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get(this: Card) {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ]
        }
      ]
    }
  ]
})

// in an outline body:  `- su "color" es el color de su palo`, `- sus "nombres" son ...`
classesEs.addRule(PropertyValueGetter, {
  syntax: `{type:subject_its} {property:quoted_member} ${IS_OR_ARE} :? {expression_body}?`
})

classesEs.addRule(PropertyValueGetter, {
  syntax: `{type:subject_its} {property:member_words} ${IS_OR_ARE} :? {expression_body}?`
})

// ... and with the subject left out (P8):  `- "color" es el color de su palo`
classesEs.addRule(PropertyValueGetter, {
  syntax: `{type:subject_implied} {property:quoted_member} ${IS_OR_ARE} :? {expression_body}?`
})

// ... and a bare name (P9):  `- estado es:` + a block, `- nombre es: su rango + " de " + su palo`
classesEs.addRule(PropertyValueGetter, {
  syntax: `{type:subject_implied} {property:body_member_words} ${IS_OR_ARE} :? {expression_body}?`
})

// a quoted name in the sentence style:  `el "nombre corto" de una carta es: ...`
classesEs.addRule(PropertyValueGetter, {
  syntax: `${THE} {property:quoted_member} ${OF} ${A} {type:known_type} es :? {expression_body}?`
})

// quoted:  its body is markup, which IS the drawing -- `- para "dibujarla": <div>[rango]</div>`
classesEs.addRule(DrawIt, {
  syntax: "para {alias:text} :? ({inline_expression}|{nested_expression})?"
})

// unquoted:  a method's body, which returns it -- `- para dibujar cada elemento:` + `devolver <div>...</div>`
classesEs.addRule(DrawIt, {
  syntax: "para {phrase:draw_method} :? {statement_body}?"
})

classesEs.addRule(QuotedPropertyFormula, {
  syntax: `${A} {type} {alias:text} para [sources:((su|sus) {property:member_words}) y]`,
  tests: [
    {
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "una card es una cosa",
            "una card tiene un rango como uno de as, 2, 3, 4, 5, 6, 7, 8, 9, 10, jota, reina, rey",
            "una card tiene un palo como uno de tréboles, diamantes, corazones, espadas"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "block",
      tests: [
        [
          'una card "es un (rango)" para sus rangos',
          ["Card.prototype.esUnRango = function (rango) {", "  return this.rango === rango", "}"],
          [
            "export interface Card { esUnRango(rango: any /* spell: type unknown */): boolean }",
            "Card.prototype.esUnRango = function (this: Card, rango: any /* spell: type unknown */) {",
            "  return this.rango === rango",
            "}"
          ]
        ],
        [
          'una card "es el (rango) de (palos)" para sus rangos y sus palos',
          [
            "Card.prototype.esElRangoDePalos = function (rango, palo) {",
            "  return this.rango === rango && this.palo === palo",
            "}"
          ],
          [
            "export interface Card { esElRangoDePalos(rango: any /* spell: type unknown */, palo: any /* spell: type unknown */): boolean }",
            "Card.prototype.esElRangoDePalos = function (this: Card, rango: any /* spell: type unknown */, palo: any /* spell: type unknown */) {",
            "  return this.rango === rango && this.palo === palo",
            "}"
          ]
        ]
      ]
    },
    {
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "una card es una cosa",
            "una card tiene un rango como uno de as, 2, 3, 4, 5, 6, 7, 8, 9, 10, jota, reina, rey",
            "una card tiene un palo como uno de tréboles, diamantes, corazones, espadas",
            'una card "es un (palo)" para sus palos',
            'una card "es el (rango) de (palos)" para sus rangos y sus palos',
            "card = una nueva card"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "statement",
      tests: [
        ["imprimir card es un trébol", 'core.console.log(card.esUnPalo("tréboles"))'],
        ["imprimir card es el 2 de corazones", 'core.console.log(card.esElRangoDePalos(2, "corazones"))']
      ]
    },
    // a blank takes its values singular or plural, numbers too:  `(palo)` reads `tréboles`, `(rango)` reads `2`
    // -- and a sub-type's phrase is its type's static method, which checks the type:  safe on any card
    {
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "una card es una cosa",
            "una card tiene un rango como uno de as, 2, 3, 4, 5, 6, 7, 8, 9, 10, jota, reina, rey",
            "una card tiene un palo como uno de tréboles, diamantes, corazones, espadas",
            'una card "es el (rango) de (palo)" para sus rangos y sus palos',
            "un joker es una card",
            "un joker tiene un color como uno de rojo, negro",
            "card = una nueva card"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "block",
      tests: [
        [
          'un joker "es el joker (color)" para sus colores',
          [
            "Joker.esElJokerColor = function (card, color) {",
            "  return card instanceof Joker && card.color === color",
            "}"
          ],
          [
            "Joker.esElJokerColor = function (card: Card, color: any /* spell: type unknown */) {",
            "  return card instanceof Joker && card.color === color",
            "}"
          ]
        ],
        [
          'un joker "es el joker (color)" para sus colores\nimprimir card es el joker rojo',
          [
            "Joker.esElJokerColor = function (card, color) {",
            "  return card instanceof Joker && card.color === color",
            "}",
            'core.console.log(Joker.esElJokerColor(card, "rojo"))'
          ],
          [
            "Joker.esElJokerColor = function (card: Card, color: any /* spell: type unknown */) {",
            "  return card instanceof Joker && card.color === color",
            "}",
            'core.console.log(Joker.esElJokerColor(card, "rojo"))'
          ]
        ],
        ["imprimir card es el 2 de tréboles", 'core.console.log(card.esElRangoDePalo(2, "tréboles"))'],
        ["imprimir card es la reina de espada", 'core.console.log(card.esElRangoDePalo("reina", "espadas"))']
      ]
    }
  ]
})

// in an outline body:  Spanish leaves `it` out, so `subject_it` matches nothing
classesEs.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_it} {alias:text} para [sources:((su|sus) {property:member_words}) y]"
})

// ... and with the placeholders inferred (P3)
classesEs.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_it} {alias:text}"
})

// ... and with the subject left out (P8):  `- "es un (palo)"`, `- "es un (palo)" para sus palos`
classesEs.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_implied} {alias:text} para [sources:((su|sus) {property:member_words}) y]"
})

classesEs.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_implied} {alias:text}"
})

classesEs.addRule(ThingName, {
  tests: [
    {
      tests: [
        ["T1", '"T1"'],
        ["North-Pile", '"North-Pile"'],
        { title: "lowercase:  quote it instead", input: "stock", js: undefined }
      ]
    }
  ]
})

classesEs.addRule(NamedThing, {
  syntax: "{type:known_type} {name:thing_name}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["una pile es una lista de things", "un tableau es una pile"].join("\n"), "block")
      },
      tests: [
        ["tableau T1", 'core.thingNamed(Tableau, "T1")'],
        ["pile T1", 'core.thingNamed(Pile, "T1")'],
        { title: "a name in lowercase is quoted", input: "tableau stock", js: undefined }
      ]
    }
  ]
})

// a name in quotes:  any text, e.g. a lowercase one
classesEs.addRule(NamedThing, {
  syntax: "{type:known_type} {name:text}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["una pile es una lista de things", "una foundation es una pile"].join("\n"), "block")
      },
      tests: [['foundation "clubs"', 'core.thingNamed(Foundation, "clubs")']]
    }
  ]
})

classesEs.addRule(ThingAtPlace, {
  syntax: `${THE} {ordinal} {type:known_type}`,
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["una pile es una lista de things", "un tableau es una pile"].join("\n"), "block")
      },
      tests: [
        ["el primer tableau", "core.thingAtPlace(Tableau, 1)"],
        ["el segundo tableau", "core.thingAtPlace(Tableau, 2)"],
        ["el último tableau", "core.thingAtPlace(Tableau, -1)"]
      ]
    }
  ]
})

classesEs.addRule(EveryThing, {
  syntax: "(cada|todo|toda) {type:known_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["una pile es una lista de things", "un tableau es una pile"].join("\n"), "block")
      },
      tests: [
        ["cada pile", "core.everyThing(Pile)"],
        ["cada tableau", "core.everyThing(Tableau)"]
      ]
    },
    {
      // cada valor de un tipo de valores:  su lista (epic `spanish` P22)
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          ["una carta es una cosa", "una carta tiene un palo como uno de tréboles, diamantes"].join("\n"),
          "block"
        )
      },
      tests: [["cada palo de carta", "Carta.Palos"]]
    }
  ]
})

classesEs.addRule(TheThings, {
  syntax: "(los|las) {type:plural_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          ["una pila es una lista de things", "un tableau es una pila", "una base es una pila"].join("\n"),
          "block"
        )
        scope.variables?.add("cards")
      },
      tests: [
        ["las pilas", "core.everyThing(Pila)"],
        ["los tableaus", "core.everyThing(Tableau)"],
        // a plural in -ses:  `base`, not `bas` (epic `spanish` I9)
        ["las bases", "core.everyThing(Base)"],
        ["el tableau", undefined],
        // a variable keeps its meaning
        ["las cards", "cards"],
        ["los gizmos", undefined]
      ]
    }
  ]
})

classesEs.addRule(KindValues, {
  syntax: "{type:plural_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "una carta es una cosa",
            "una carta tiene un palo como uno de tréboles, diamantes",
            "una pila de descartes es una cosa",
            "una pila de descartes tiene un lado como uno de izquierda, derecha"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        ["palos de carta", "Carta.Palos"],
        ["lados de pila de descartes", "PilaDeDescartes.Lados"],
        // un tipo que no es de valores
        ["cartas", undefined]
      ]
    }
  ]
})

classesEs.addRule(RandomKindValue, {
  syntax: "(un|una) {type:known_type} (al azar|aleatorio|aleatoria)",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          ["una carta es una cosa", "una carta tiene un palo como uno de tréboles, diamantes"].join("\n"),
          "block"
        )
      },
      tests: [
        ["un palo de carta al azar", "core.randomItemOf(Carta.Palos)"],
        ["un palo de carta aleatorio", "core.randomItemOf(Carta.Palos)"],
        ["una carta al azar", undefined]
      ]
    }
  ]
})

classesEs.addRule(PatternText, {
  tests: [
    {
      tests: [
        ['"^\\d+$"', '"^\\\\d+$"'],
        ['"^[a-z]+$"', '"^[a-z]+$"']
      ]
    }
  ]
})

classesEs.addRule(RuleSuggestion, {
  syntax: ",? (con sugerencia|con la sugerencia|diciendo) {prompt:text}",
  tests: [
    {
      tests: [
        ['con sugerencia "Escríbelo como 1.2.3"', '"Escríbelo como 1.2.3"'],
        [', diciendo "Demasiado largo"', '"Demasiado largo"']
      ]
    }
  ]
})

classesEs.addRule(MustRule, {
  syntax:
    "(empty:no debe estar vacío|no debe estar vacio|no debe estar vacía|no debe estar vacia) {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ["no debe estar vacío", '{ type: "empty" }'],
        ['no debe estar vacía, con sugerencia "Dale un nombre"', '{ type: "empty", prompt: "Dale un nombre" }']
      ]
    }
  ]
})

classesEs.addRule(MustRule, {
  syntax: "debe coincidir con {pattern:pattern_text} {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ['debe coincidir con "^\\d+$"', '{ type: "regExp", value: "/^\\\\d+$/" }'],
        [
          'debe coincidir con "^[a-z]+$" diciendo "Solo minúsculas"',
          '{ type: "regExp", value: "/^[a-z]+$/", prompt: "Solo minúsculas" }'
        ]
      ]
    }
  ]
})

classesEs.addRule(MustRule, {
  syntax:
    "debe tener {bound:at_least_or_at_most} {count:number} (letras|caracteres) (de largo)? {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ["debe tener al menos 3 letras", '{ type: "minLength", value: "3" }'],
        ["debe tener como mucho 140 caracteres de largo", '{ type: "maxLength", value: "140" }']
      ]
    }
  ]
})

classesEs.addRule(MustRule, {
  syntax: "debe estar entre {min:number} y {max:number} {suggestion:rule_suggestion}?",
  tests: [{ tests: [["debe estar entre 1 y 5", '{ type: "range", value: "1..5" }']] }]
})

classesEs.addRule(MustRule, {
  syntax: "debe ser {bound:at_least_or_at_most} {limit:number} {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ["debe ser al menos 18", '{ type: "minValue", value: "18" }'],
        ["debe ser a lo sumo 120", '{ type: "maxValue", value: "120" }']
      ]
    }
  ]
})

classesEs.addRule(MustRule, {
  syntax: `debe ser ${A} {kind:url_or_email} {suggestion:rule_suggestion}?`,
  tests: [
    {
      tests: [
        ["debe ser un email", '{ type: "email" }'],
        ["debe ser una url", '{ type: "url" }']
      ]
    }
  ]
})

// `must` is the rule's own first word in Spanish (`debe ...`, `no debe ...`):  see the file's docstring
classesEs.addRule(PropertyMust, {
  syntax: "{type:subject_its} {property:member_words} {rule:must_rule}"
})

classesEs.addRule(PropertyMust, {
  syntax: "{type:subject_its} {property:quoted_member} {rule:must_rule}"
})

classesEs.addRule(PropertyMust, {
  syntax: "{type:subject_implied} {property:body_member_words} {rule:must_rule}"
})

// under a property:  `- no debe estar vacío`, `- debe tener como mucho 40 letras`
classesEs.addRule(PropertyBodyMust, {
  syntax: "{rule:must_rule}"
})

classesEs.addRule(TypeSpecifierTextKind, {
  syntax: `como ${A} {kind:url_or_email}`,
  tests: [
    {
      tests: [
        ["como una url", "text"],
        ["como un email", "text"]
      ]
    }
  ]
})

classesEs.addRule(OutlineSpecifierTextKind, {
  syntax: `${A} {kind:url_or_email}`,
  tests: [{ tests: [["una url", "text"]] }]
})
