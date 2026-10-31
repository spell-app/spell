/**
 * The `places` rule module's English:  every rule's syntax and tests, in tie-break order.
 * - `places.es.ts` registers the same classes in the same order.
 */
import { Wording } from "spell/parser/spell/rules/expressions"
import { places } from "./places.parser"
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

/** The kinds of place spell knows, each a meaning `core.place()` knows by its words, dashes for spaces. */
const KINDS_AT = ["web_service", "graph_service", "folder", "file", "live_room", "sheet"]

/** The kinds with no address. */
const KINDS_HERE = ["this_device", "in_memory", "the_cloud"]

places.addRule(Wording.specialize({ ruleName: "place_kind", meanings: KINDS_AT }), {
  syntax:
    "((web_service:web service)|(graph_service:graph service)|(folder:folder)|(file:file)|(live_room:live room)|(sheet:sheet))"
})

places.addRule(Wording.specialize({ ruleName: "place_kind_here", meanings: KINDS_HERE }), {
  syntax: "((this_device:this device)|(in_memory:in memory)|(the_cloud:the cloud))"
})

places.addRule(CreatePlace, {
  syntax: "{type:type_words} is (a|an) {kind:place_kind} at {address:text} {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'family cookbook is a web service at "https://api.example.com/v1"',
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "web service",',
            '  at: "https://api.example.com/v1"',
            "})"
          ]
        ],
        [
          'family cookbook is a live room at "wss://rooms.example.com/family"',
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "live room",',
            '  at: "wss://rooms.example.com/family"',
            "})"
          ]
        ],
        [
          'family cookbook is a sheet at "recipes.csv"',
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "sheet",',
            '  at: "recipes.csv"',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(CreatePlace, {
  syntax: "{type:type_words} is (a|an) {superType:type} at {address:text} {with_nested_statements}?"
})
places.addRule(CreatePlace, { syntax: "{type:type_words} is {kind:place_kind_here} {with_nested_statements}?" })

places.addRule(CollectionAt, { syntax: "{collection:plural_type} are at {path:text}" })
places.addRule(FieldCalled, { syntax: "(a|an) {owner:known_type}'s {property:member_words} is called {name:text}" })
places.addRule(KeyIsSecret, { syntax: "{type:subject_its} key is the secret {name:text}" })
places.addRule(KeyWritten, { syntax: "{type:subject_its} key is {key:text}" })
places.addRule(CheckedEvery, { syntax: "{type:subject_it} is checked every {number} seconds?" })
places.addRule(VersionsIn, { syntax: "{type:subject_its} versions are in {field:text}" })
places.addRule(IdColumn, { syntax: "{type:subject_its} ids are in {column:text}" })
places.addRule(OperationAt, { syntax: "to {signature:method_signature} is at {path:text}" })

places.addRule(SavedInPlace, { syntax: "{type:subject_it} is saved in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "(a|an) {type:known_type} is saved in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "{type:subject_implied} is saved in {place:expression}" })

places.addRule(WhileWaiting, { syntax: "while waiting :? {statement_body}?" })
places.addRule(IfThereAreNone, { syntax: "if there are none :? {statement_body}?" })
places.addRule(IfThatFails, { syntax: "if that fails :? {statement_body}?" })

places.addRule(AllOrNothing, {
  syntax: "all or nothing :? {statement_body}?",
  tests: [
    {
      compileAs: "statement",
      tests: [["all or nothing: print 1", "await core.allOrNothing(() => core.console.log(1))"]]
    }
  ]
})
places.addRule(DraftOf, {
  syntax: "a draft of {thing:operand}",
  tests: [{ compileAs: "expression", tests: [["a draft of thing", undefined]] }]
})
places.addRule(SaveDraft, { syntax: "save {draft:expression}" })
places.addRule(CancelDraft, { syntax: "cancel {draft:expression}" })
places.addRule(CancelAction, { syntax: "cancel {action:identifier}" })
places.addRule(RefreshThings, { syntax: "refresh the {type:plural_type}" })
places.addRule(TryAgain, {
  syntax: "try again",
  tests: [{ compileAs: "statement", tests: [["try again", "core.refreshSaved()"]] }]
})

places.addRule(FirstFewWhere, { syntax: "the first {number} {type:plural_type} where {inline_expression}?" })
places.addRule(NumberOfThingsWhere, { syntax: "the number of {type:plural_type} where {inline_expression}?" })
places.addRule(TotalOf, {
  syntax: "the total of {list:operand}",
  tests: [{ compileAs: "expression", tests: [["the total of [1, 2]", "[1, 2].total"]] }]
})

places.addRule(CurrentPerson, {
  syntax: "me",
  tests: [{ compileAs: "expression", tests: [["me", "core.currentPerson()"]] }]
})
places.addRule(MyField, {
  syntax: "my {field:member_words}",
  tests: [{ compileAs: "expression", tests: [["my name", "core.currentPerson().name"]] }]
})
places.addRule(PeopleHere, {
  syntax: "the people here",
  tests: [{ compileAs: "expression", tests: [["the people here", "core.peopleHere()"]] }]
})

places.addRule(HelpfulWord, { syntax: "(fetch|query|join)" })
places.addRule(HelpfulWord, { syntax: "connect to" })
