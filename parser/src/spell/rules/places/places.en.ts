/**
 * The `places` rule module's English:  every rule's syntax and tests, in tie-break order.
 * - `places.es.ts` registers the same classes in the same order.
 */
import { Negatable, Wording } from "spell/parser/spell/rules/expressions"
import { places } from "./places.parser"
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
import { NextPageIn } from "./NextPageIn"
import { ReloadThings } from "./ReloadThings"
import { RowsIn } from "./RowsIn"
import { SaveDraft } from "./SaveDraft"
import { SavedInPlace } from "./SavedInPlace"
import { SavedInTheCloud } from "./SavedInTheCloud"
import { ThereAreThings } from "./ThereAreThings"
import { ThingWithId } from "./ThingWithId"
import { TotalOf } from "./TotalOf"
import { TryAgain } from "./TryAgain"
import { VersionsIn } from "./VersionsIn"

/** `there are less than 2 recipes where ...`:  see `ThereAreThings`. */
const THERE_ARE =
  "there (is|are) {compare:there_are_how_many}? (one:one)? {count:number}? ({type:known_type}|{list:member_words})"

/** The kinds of place spell knows, each a meaning `core.place()` knows by its words, dashes for spaces. */
const KINDS_AT = [
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

/** The kinds with no address. */
const KINDS_HERE = ["database_on_this_device", "in_memory_database"]

places.addRule(Wording.specialize({ ruleName: "place_kind", meanings: KINDS_AT }), {
  syntax:
    "((web_server:web server)|(graphql_server:graphql server)|(data_folder:data folder)|(file:file)|(room:room)|(sheet:sheet|spreadsheet)|(google_sheet:google sheet)|(airtable:airtable)|(atmosphere_account:atmosphere/i account|atmosphere/i))"
})

places.addRule(Wording.specialize({ ruleName: "place_kind_here", meanings: KINDS_HERE }), {
  syntax: "((database_on_this_device:database on this device)|(in_memory_database:in memory database))"
})

places.addRule(Wording.specialize({ ruleName: "place_kind_each_person", meanings: ["personal_atmosphere_account"] }), {
  syntax: "(personal_atmosphere_account:personal atmosphere/i account|personal atmosphere/i)"
})

places.addRule(Negatable.specialize({ ruleName: "are_or_are_not" }), { syntax: "(are|(negated:are not|aren't|arent))" })

places.addRule(CreatePlace, {
  syntax: "{type:type_words} is (a|an) {kind:place_kind} (at|from) {address:text} {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'family cookbook is a web server from "https://api.example.com/v1"',
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "web server",',
            '  at: "https://api.example.com/v1"',
            "})"
          ]
        ],
        [
          'family cookbook is a room at "wss://rooms.example.com/family"',
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "room",',
            '  at: "wss://rooms.example.com/family"',
            "})"
          ]
        ],
        [
          'family cookbook is a spreadsheet at "recipes.csv"',
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
  syntax: "{type:type_words} is (a|an) {superType:type} (at|from) {address:text} {with_nested_statements}?"
})
places.addRule(CreatePlace, { syntax: "{type:type_words} is (a|an) {kind:place_kind_here} {with_nested_statements}?" })
places.addRule(CreatePlace, {
  syntax:
    "{type:type_words} is (a|an) {kind:place_kind_each_person} ((at|from) {address:text})? {with_nested_statements}?"
})
places.addRule(SavedInTheCloud, { syntax: "{type:type_words} is saved in the cloud {with_nested_statements}?" })
places.addRule(SavedInTheCloud, { syntax: "{type:subject_it} (is saved|lives) in the cloud" })

places.addRule(CollectionAt, { syntax: "{collection:plural_type} live at {path:text}" })
places.addRule(FieldCalled, { syntax: "(a|an) {owner:known_type}'s {property:member_words} is its? {name:text}" })
places.addRule(FieldCalled, { syntax: "(a|an) {owner:known_type}'s {property:quoted_member} is its? {name:text}" })
places.addRule(KeyIsSecret, { syntax: "{type:subject_its} key is the secret {name:text}" })
places.addRule(KeyWritten, { syntax: "{type:subject_its} key is {key:text}" })
places.addRule(CheckedEvery, { syntax: "check {type:subject_it} every {number} (second|seconds)?" })
places.addRule(VersionsIn, { syntax: "{type:subject_its} version is its? {field:text}" })
places.addRule(IdColumn, { syntax: "{type:subject_its} id is its? {column:text}" })
places.addRule(RowsIn, {
  syntax: "{type:subject_its} rows are (the {inner:text} of)? (the {outer:text} of)? its? {field:text}"
})
places.addRule(NextPageIn, {
  syntax: "{type:subject_its} next page is (the {inner:text} of)? (the {outer:text} of)? its? {field:text}"
})
places.addRule(AccountIncluded, { syntax: "{type:subject_it} includes the account {account:text}" })
places.addRule(OperationAt, { syntax: "to {signature:method_signature} is at {path:text}" })

places.addRule(SavedInPlace, { syntax: "{type:subject_it} (is saved|lives) in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "(a|an) {type:known_type} (is saved|lives) in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "{type:subject_implied} (is saved|lives) in {place:expression}" })

places.addRule(WhileWaiting, { syntax: "while (waiting|loading) :? {statement_body}?" })
places.addRule(IfThereAreNone, { syntax: "if there are none :? {statement_body}?" })
places.addRule(IfThatFailsSay, { syntax: "the message if that fails is {text:expression}" })
places.addRule(ShowThemPaged, { syntax: "show them in pages" })
places.addRule(ShowThemAll, { syntax: "show them all" })
places.addRule(ShowThemIn, { syntax: "show them in :? {statement_body}?" })
places.addRule(ShowItAllIn, { syntax: "show it all in :? {statement_body}?" })
places.addRule(IfThatFails, { syntax: "if that fails :? {statement_body}?" })

places.addRule(InOneGo, {
  syntax: "in one go :? {statement_body}?",
  tests: [
    {
      compileAs: "statement",
      tests: [["in one go: print 1", "await core.inOneGo(() => core.console.log(1))"]]
    }
  ]
})
places.addRule(DraftOf, {
  syntax: "a draft of {thing:operand}",
  tests: [{ compileAs: "expression", tests: [["a draft of thing", undefined]] }]
})
places.addRule(SaveDraft, { syntax: "save {draft:expression}" })
places.addRule(DiscardDraft, { syntax: "discard {draft:expression}" })
places.addRule(CancelAction, { syntax: "(stop|cancel) the? {action:identifier}" })
places.addRule(ReloadThings, { syntax: "reload the {type:plural_type}" })
places.addRule(TryAgain, {
  syntax: "try again",
  tests: [{ compileAs: "statement", tests: [["try again", "core.reloadSaved()"]] }]
})

places.addRule(ThingWithId, { syntax: "the {type:known_type} whose id is {id:expression}" })
places.addRule(FirstFewWhere, { syntax: "the first {number} {type:plural_type} where {inline_expression}?" })
places.addRule(NumberOfThingsWhere, { syntax: "the number of {type:plural_type} where {inline_expression}?" })
places.addRule(
  Wording.specialize({ ruleName: "there_are_how_many", meanings: ["none", "fewer", "more", "at_least", "at_most"] }),
  { syntax: "((none:no)|(fewer:less than|fewer than)|(more:more than)|(at_least:at least)|(at_most:at most))" }
)
places.addRule(ThereAreThings, { syntax: `${THERE_ARE} where {inline_expression}?` })
places.addRule(ThereAreThings, { syntax: THERE_ARE })
places.addRule(TotalOf, {
  syntax: "the (total|sum) of {list:operand}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["the total of [1, 2]", "core.totalOf([1, 2])"],
        ["the sum of [1, 2]", "core.totalOf([1, 2])"]
      ]
    }
  ]
})

places.addRule(WhereField, { syntax: "the {property:member_words}" })
// Before its plain self:  the same words, in a `where`, are the thing's field
places.addRule(TheyAre, {
  syntax: "{operator:are_or_are_not} {expression:where_field}"
})
// `the person is the cook`, as Spanish says `la persona es el cocinero` (epic `language`, Q15)
places.addRule(TheyAre, { syntax: "{operator:is_or_is_not} {expression:where_field}" })
places.addRule(TheyAre, { syntax: "{operator:are_or_are_not} {expression:operand}" })
places.addRule(CurrentPerson, {
  syntax: "(they|them|the person)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["them", "core.currentPerson()"],
        ["they", "core.currentPerson()"],
        ["the person", "core.currentPerson()"]
      ]
    }
  ]
})
places.addRule(TheirField, {
  syntax: "their {field:member_words}",
  tests: [{ compileAs: "expression", tests: [["their name", "core.currentPerson().name"]] }]
})
places.addRule(PeopleHere, {
  syntax: "(everyone|the people) here",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["the people here", "core.peopleHere()"],
        ["everyone here", "core.peopleHere()"]
      ]
    }
  ]
})

places.addRule(LoadThings, { syntax: "(load|fetch) {value:expression}" })
places.addRule(HelpfulWord, { syntax: "(fetch|query|join)" })
places.addRule(HelpfulWord, { syntax: "connect to" })
