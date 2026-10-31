/**
 * The `places` rule module's Spanish:  the same classes as `places.en.ts`, in the same order.
 * - Each word through the glossary, `languages/es/GLOSSARY.md`.
 * - What agrees with its noun takes every form (`ninguno`, `ninguna`), and the agreement warning says which it should be.
 */
import { Wording } from "spell/parser/spell/rules/expressions"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { AllOrNothing } from "./AllOrNothing"
import { CancelAction } from "./CancelAction"
import { CancelDraft } from "./CancelDraft"
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
import { NumberOfThingsWhere } from "./NumberOfThingsWhere"
import { OperationAt } from "./OperationAt"
import { CurrentPerson, MyField, PeopleHere } from "./PeopleWords"
import { IfThatFails, IfThereAreNone, WhileWaiting } from "./ReadRider"
import { RefreshThings } from "./RefreshThings"
import { SaveDraft } from "./SaveDraft"
import { SavedInPlace } from "./SavedInPlace"
import { TotalOf } from "./TotalOf"
import { TryAgain } from "./TryAgain"
import { VersionsIn } from "./VersionsIn"

/** The Spanish of the `places` rule module. */
export const placesEs = new SpellParser({ module: "places" })

const A = "(un|una)"
const THE = "(el|la|los|las)"

placesEs.addRule(
  Wording.specialize({
    ruleName: "place_kind",
    meanings: ["web_service", "graph_service", "folder", "file", "live_room", "sheet"]
  }),
  {
    syntax:
      "((web_service:servicio web)|(graph_service:servicio de grafos)|(folder:carpeta)|(file:archivo)|(live_room:sala en vivo)|(sheet:hoja))"
  }
)

placesEs.addRule(
  Wording.specialize({ ruleName: "place_kind_here", meanings: ["this_device", "in_memory", "the_cloud"] }),
  {
    syntax: "((this_device:este dispositivo)|(in_memory:en memoria)|(the_cloud:la nube))"
  }
)

placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {kind:place_kind} en {address:text} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'recetario familiar es un servicio web en "https://api.example.com/v1"',
          [
            "export class RecetarioFamiliar extends Place {}",
            "export const recetarioFamiliar = core.place(new RecetarioFamiliar(), {",
            '  name: "recetario_familiar",',
            '  kind: "web service",',
            '  at: "https://api.example.com/v1"',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {superType:type} en {address:text} {with_nested_statements}?`
})
placesEs.addRule(CreatePlace, {
  syntax: "{type:type_words} (es|está) {kind:place_kind_here} {with_nested_statements}?"
})

placesEs.addRule(CollectionAt, { syntax: `${THE} {collection:plural_type} están en {path:text}` })
placesEs.addRule(FieldCalled, {
  syntax: `${THE} {property:member_words} de ${A} {owner:known_type} se (llama|llaman) {name:text}`
})
placesEs.addRule(KeyIsSecret, { syntax: "{type:subject_its} clave es el secreto {name:text}" })
placesEs.addRule(KeyWritten, { syntax: "{type:subject_its} clave es {key:text}" })
placesEs.addRule(CheckedEvery, { syntax: "{type:subject_implied} se revisa cada {number} segundos?" })
placesEs.addRule(VersionsIn, { syntax: "{type:subject_its} versiones están en {field:text}" })
placesEs.addRule(IdColumn, { syntax: "{type:subject_its} identificadores están en {column:text}" })
placesEs.addRule(OperationAt, { syntax: "para {signature:method_signature} está en {path:text}" })

placesEs.addRule(SavedInPlace, { syntax: "{type:subject_it} se guarda en {place:expression}" })
placesEs.addRule(SavedInPlace, { syntax: `${A} {type:known_type} se guarda en {place:expression}` })
placesEs.addRule(SavedInPlace, { syntax: "{type:subject_implied} se guarda en {place:expression}" })

placesEs.addRule(WhileWaiting, { syntax: "mientras espera :? {statement_body}?" })
placesEs.addRule(IfThereAreNone, { syntax: "si no hay (ninguno|ninguna) :? {statement_body}?" })
placesEs.addRule(IfThatFails, { syntax: "si falla :? {statement_body}?" })

placesEs.addRule(AllOrNothing, {
  syntax: "todo o nada :? {statement_body}?",
  tests: [
    {
      compileAs: "statement",
      tests: [["todo o nada: imprimir 1", "await core.allOrNothing(() => core.console.log(1))"]]
    }
  ]
})
placesEs.addRule(DraftOf, {
  syntax: "un borrador de {thing:operand}",
  tests: [{ compileAs: "expression", tests: [["un borrador de cosa", undefined]] }]
})
placesEs.addRule(SaveDraft, { syntax: "guardar {draft:expression}" })
placesEs.addRule(CancelDraft, { syntax: "cancelar {draft:expression}" })
placesEs.addRule(CancelAction, { syntax: "cancelar {action:identifier}" })
placesEs.addRule(RefreshThings, { syntax: `recargar ${THE} {type:plural_type}` })
placesEs.addRule(TryAgain, {
  syntax: "reintentar",
  tests: [{ compileAs: "statement", tests: [["reintentar", "core.refreshSaved()"]] }]
})

placesEs.addRule(FirstFewWhere, {
  syntax: `(los|las) (primeros|primeras) {number} {type:plural_type} donde {inline_expression}?`
})
placesEs.addRule(NumberOfThingsWhere, { syntax: "el número de {type:plural_type} donde {inline_expression}?" })
placesEs.addRule(TotalOf, {
  syntax: "el total de {list:operand}",
  tests: [{ compileAs: "expression", tests: [["el total de [1, 2]", "[1, 2].total"]] }]
})

placesEs.addRule(CurrentPerson, {
  syntax: "yo",
  tests: [{ compileAs: "expression", tests: [["yo", "core.currentPerson()"]] }]
})
placesEs.addRule(MyField, {
  syntax: "mi {field:member_words}",
  tests: [{ compileAs: "expression", tests: [["mi nombre", "core.currentPerson().name"]] }]
})
placesEs.addRule(PeopleHere, {
  syntax: "las personas presentes",
  tests: [{ compileAs: "expression", tests: [["las personas presentes", "core.peopleHere()"]] }]
})

placesEs.addRule(HelpfulWord, { syntax: "(traer|consultar|unir)" })
placesEs.addRule(HelpfulWord, { syntax: "conectar a" })
