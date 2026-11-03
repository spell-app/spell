/**
 * The `places` rule module's Spanish:  the same classes as `places.en.ts`, in the same order.
 * - Each word through the glossary, `languages/es/GLOSSARY.md`.
 * - What agrees with its noun takes every form (`ninguno`, `ninguna`), and the agreement warning says which it should be.
 */
import { Negatable, Wording } from "spell/parser/spell/rules/expressions"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { InOneGo } from "./InOneGo"
import { CancelAction } from "./CancelAction"
import { DiscardDraft } from "./DiscardDraft"
import { AccountIncluded } from "./AccountIncluded"
import { CheckedEvery } from "./CheckedEvery"
import { CollectionAt } from "./CollectionAt"
import { CreatePlace } from "./CreatePlace"
import { DraftOf } from "./DraftOf"
import { FieldCalled } from "./FieldCalled"
import { FirstFewWhere } from "./FirstFewWhere"
import { HelpfulWord } from "./HelpfulWord"
import { IdColumn } from "./IdColumn"
import { KeyIsSecret } from "./KeyIsSecret"
import { KeyWritten } from "./KeyWritten"
import { LoadThings } from "./LoadThings"
import { NumberOfThingsWhere } from "./NumberOfThingsWhere"
import { OperationAt } from "./OperationAt"
import { CurrentPerson, PeopleHere, TheirField } from "./PeopleWords"
import { TheyAre } from "./TheyAre"
import { WhereField } from "./WhereField"
import {
  IfThatFails,
  IfThatFailsSay,
  IfThereAreNone,
  ShowItAllIn,
  ShowThemAll,
  ShowThemIn,
  ShowThemPaged,
  WhileWaiting
} from "./ReadRider"
import { ReloadThings } from "./ReloadThings"
import { SaveDraft } from "./SaveDraft"
import { SavedInPlace } from "./SavedInPlace"
import { SavedInTheCloud } from "./SavedInTheCloud"
import { ThereAreThings } from "./ThereAreThings"
import { ThingWithId } from "./ThingWithId"
import { TotalOf } from "./TotalOf"
import { TryAgain } from "./TryAgain"
import { VersionsIn } from "./VersionsIn"
import { NextPageIn } from "./NextPageIn"
import { RowsIn } from "./RowsIn"
import { WritesLike } from "./WritesLike"

/** The Spanish of the `places` rule module. */
export const placesEs = new SpellParser({ module: "places" })

const A = "(un|una)"
const THE = "(el|la|los|las)"

/** `hay menos de 2 recetas donde ...`, `no hay recetas`:  see `ThereAreThings`. */
const THERE_ARE =
  "(none:no)? hay {compare:there_are_how_many}? (one:un|una|uno)? {count:number}? ({type:known_type}|{list:member_words})"

placesEs.addRule(
  Wording.specialize({
    ruleName: "place_kind",
    meanings: [
      "web_server",
      "graphql_server",
      "data_folder",
      "file",
      "room",
      "sheet",
      "google_sheet",
      "airtable",
      "atmosphere_account"
    ]
  }),
  {
    syntax:
      "((web_server:servidor web)|(graphql_server:servidor graphql)|(data_folder:carpeta de datos)|(file:archivo)|(room:sala)|(google_sheet:hoja de google)|(sheet:hoja de cálculo|hoja)|(airtable:airtable)|(atmosphere_account:cuenta de atmosphere/i|atmosphere/i))"
  }
)

placesEs.addRule(
  Wording.specialize({ ruleName: "place_kind_here", meanings: ["database_on_this_device", "in_memory_database"] }),
  {
    syntax:
      "((database_on_this_device:base de datos en este dispositivo)|(in_memory_database:base de datos en memoria))"
  }
)

placesEs.addRule(
  Wording.specialize({ ruleName: "place_kind_each_person", meanings: ["personal_atmosphere_account"] }),
  { syntax: "(personal_atmosphere_account:cuenta personal de atmosphere/i|atmosphere/i personal)" }
)

placesEs.addRule(Negatable.specialize({ ruleName: "are_or_are_not" }), { syntax: "(es|está|(negated:no es|no está))" })

placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {kind:place_kind} (en|desde) {address:text} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'recetario familiar es un servidor web en "https://api.example.com/v1"',
          [
            "export class RecetarioFamiliar extends Place {}",
            "export const recetarioFamiliar = core.place(new RecetarioFamiliar(), {",
            '  name: "recetario_familiar",',
            '  kind: "web server",',
            '  at: "https://api.example.com/v1"',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {superType:type} (en|desde) {address:text} {with_nested_statements}?`
})
placesEs.addRule(CreatePlace, { syntax: `{type:type_words} es ${A} {kind:place_kind_here} {with_nested_statements}?` })
placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {kind:place_kind_each_person} ((en|desde) {address:text})? {with_nested_statements}?`
})
placesEs.addRule(SavedInTheCloud, { syntax: "{type:type_words} se guarda en la nube {with_nested_statements}?" })
placesEs.addRule(SavedInTheCloud, { syntax: "{type:subject_it} (se guarda|vive) en la nube" })

placesEs.addRule(CollectionAt, { syntax: `${THE} {collection:plural_type} están en {path:text}` })
placesEs.addRule(FieldCalled, {
  syntax: `${THE} {property:member_words} de ${A} {owner:known_type} se (llama|llaman) {name:text}`
})
placesEs.addRule(FieldCalled, {
  syntax: `${THE} {property:quoted_member} de ${A} {owner:known_type} se (llama|llaman) {name:text}`
})
placesEs.addRule(KeyIsSecret, { syntax: "{type:subject_its} clave es el secreto {name:text}" })
placesEs.addRule(KeyWritten, { syntax: "{type:subject_its} clave es {key:text}" })
placesEs.addRule(CheckedEvery, { syntax: "{type:subject_implied} se revisa cada {number} (segundo|segundos)?" })
placesEs.addRule(VersionsIn, { syntax: "{type:subject_its} versión está en {field:text}" })
placesEs.addRule(IdColumn, { syntax: "{type:subject_its} identificador está en {column:text}" })
placesEs.addRule(RowsIn, {
  syntax: "{type:subject_its} filas están en (el {inner:text} de)? (el {outer:text} de)? su? {field:text}"
})
placesEs.addRule(NextPageIn, {
  syntax: "{type:subject_its} página siguiente está en (el {inner:text} de)? (el {outer:text} de)? su? {field:text}"
})
placesEs.addRule(Wording.specialize({ ruleName: "numbers_or_names", meanings: ["numbers", "names"] }), {
  syntax: "((numbers:los números)|(names:los nombres))"
})
placesEs.addRule(WritesLike, { syntax: "{type:subject_implied} escribe {what:numbers_or_names} como {example:text}" })
placesEs.addRule(AccountIncluded, { syntax: "{type:subject_implied} incluye la cuenta {account:text}" })
placesEs.addRule(OperationAt, { syntax: "para {signature:method_signature} está en {path:text}" })

placesEs.addRule(SavedInPlace, { syntax: "{type:subject_it} (se guarda|vive) en {place:expression}" })
placesEs.addRule(SavedInPlace, { syntax: `${A} {type:known_type} (se guarda|vive) en {place:expression}` })
placesEs.addRule(SavedInPlace, { syntax: "{type:subject_implied} (se guarda|vive) en {place:expression}" })

placesEs.addRule(WhileWaiting, { syntax: "mientras (espera|carga) :? {statement_body}?" })
placesEs.addRule(IfThereAreNone, { syntax: "si no hay (ninguno|ninguna|nada) :? {statement_body}?" })
placesEs.addRule(IfThatFailsSay, { syntax: "el mensaje si falla es {text:expression}" })
placesEs.addRule(ShowThemPaged, { syntax: "mostrarlos en (páginas|paginas)" })
placesEs.addRule(ShowThemAll, { syntax: "mostrarlos todos" })
placesEs.addRule(ShowThemIn, { syntax: "mostrarlos en :? {statement_body}?" })
placesEs.addRule(ShowItAllIn, { syntax: "mostrar todo en :? {statement_body}?" })
placesEs.addRule(IfThatFails, { syntax: "si falla :? {statement_body}?" })

placesEs.addRule(InOneGo, {
  syntax: "de una vez :? {statement_body}?",
  tests: [
    {
      compileAs: "statement",
      tests: [["de una vez: imprimir 1", "await core.inOneGo(() => core.console.log(1))"]]
    }
  ]
})
placesEs.addRule(DraftOf, {
  syntax: "un borrador de {thing:operand}",
  tests: [{ compileAs: "expression", tests: [["un borrador de cosa", undefined]] }]
})
placesEs.addRule(SaveDraft, { syntax: "guardar {draft:expression}" })
placesEs.addRule(DiscardDraft, { syntax: "descartar {draft:expression}" })
placesEs.addRule(CancelAction, { syntax: `(parar|cancelar) ${THE}? {action:identifier}` })
placesEs.addRule(ReloadThings, { syntax: `recargar ${THE} {type:plural_type}` })
placesEs.addRule(TryAgain, {
  syntax: "reintentar",
  tests: [{ compileAs: "statement", tests: [["reintentar", "core.reloadSaved()"]] }]
})

placesEs.addRule(ThingWithId, { syntax: "(el|la) {type:known_type} cuyo identificador es {id:expression}" })
placesEs.addRule(FirstFewWhere, {
  syntax: `(los|las) (primeros|primeras) {number} {type:plural_type} donde {inline_expression}?`
})
placesEs.addRule(NumberOfThingsWhere, { syntax: "el número de {type:plural_type} donde {inline_expression}?" })
placesEs.addRule(
  Wording.specialize({ ruleName: "there_are_how_many", meanings: ["none", "fewer", "more", "at_least", "at_most"] }),
  { syntax: "((fewer:menos de)|(more:más de|mas de)|(at_least:al menos)|(at_most:como mucho|como máximo|como maximo))" }
)
placesEs.addRule(ThereAreThings, { syntax: `${THERE_ARE} donde {inline_expression}?` })
placesEs.addRule(ThereAreThings, { syntax: THERE_ARE })
placesEs.addRule(TotalOf, {
  syntax: "(el total|la suma) de {list:operand}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["el total de [1, 2]", "core.totalOf([1, 2])"],
        ["la suma de [1, 2]", "core.totalOf([1, 2])"]
      ]
    }
  ]
})

placesEs.addRule(WhereField, { syntax: `${THE} {property:member_words}` })
// Before its plain self:  the same words, in a `where`, are the thing's field
placesEs.addRule(TheyAre, {
  syntax: "{operator:are_or_are_not} {expression:where_field}"
})
// `la persona no es el cocinero`, by the word every comparison reads:  as English does (epic `language`, Q15)
placesEs.addRule(TheyAre, { syntax: "{operator:is_or_is_not} {expression:where_field}" })
placesEs.addRule(TheyAre, { syntax: "{operator:are_or_are_not} {expression:operand}" })
placesEs.addRule(CurrentPerson, {
  syntax: "(esa persona|la persona)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["esa persona", "core.currentPerson()"],
        ["la persona", "core.currentPerson()"]
      ]
    }
  ]
})
placesEs.addRule(TheirField, {
  syntax: `${THE} {field:member_words} de esa persona`,
  tests: [{ compileAs: "expression", tests: [["el nombre de esa persona", "core.currentPerson().name"]] }]
})
placesEs.addRule(PeopleHere, {
  syntax: "(todos los presentes|las personas presentes)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["las personas presentes", "core.peopleHere()"],
        ["todos los presentes", "core.peopleHere()"]
      ]
    }
  ]
})

placesEs.addRule(LoadThings, { syntax: "(cargar|traer) {value:expression}" })
placesEs.addRule(HelpfulWord, { syntax: "(traer|consultar|unir)" })
placesEs.addRule(HelpfulWord, { syntax: "conectar a" })
