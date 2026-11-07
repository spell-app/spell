/**
 * The `places` rule module's English:  every rule's syntax and tests, in tie-break order.
 * - `places.es.ts` registers the same classes in the same order.
 */
import type { P } from "spell/parser/parser"
import { Negatable, Synonyms, Wording } from "spell/parser/spell/rules/expressions"
import { places } from "./places.parser"
import { InOneGo } from "./InOneGo"
import { CancelAction } from "./CancelAction"
import { DiscardDraft } from "./DiscardDraft"
import { AccountIncluded } from "./AccountIncluded"
import { CheckedAt } from "./CheckedAt"
import { KeptOnDevice } from "./KeptOnDevice"
import { CheckedEvery } from "./CheckedEvery"
import { CollectionAt } from "./CollectionAt"
import { CreatePlace } from "./CreatePlace"
import { DraftOf } from "./DraftOf"
import { FieldCalled } from "./FieldCalled"
import { FirstFewWhere } from "./FirstFewWhere"
import { HelpfulWord } from "./HelpfulWord"
import { IdColumn } from "./IdColumn"
import { KeyIfSet } from "./KeyIfSet"
import { KeyIsSecret } from "./KeyIsSecret"
import { KeyWritten } from "./KeyWritten"
import { ListsUnder } from "./ListsUnder"
import { LoadThings } from "./LoadThings"
import { NumberOfThingsWhere } from "./NumberOfThingsWhere"
import { OperationAt } from "./OperationAt"
import { PictureAt } from "./PictureAt"
import { ProjectedFields } from "./ProjectedFields"
import { ProjectedInto } from "./ProjectedInto"
import { ProjectedOnlyWhere } from "./ProjectedOnlyWhere"
import { ProjectionOf } from "./ProjectionOf"
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
import { NextPageInLink } from "./NextPageInLink"
import { WritesLike } from "./WritesLike"
import { ReloadThings } from "./ReloadThings"
import { RowsIn } from "./RowsIn"
import { ListsGiveOnly } from "./ListsGiveOnly"
import { PageSizeIs } from "./PageSizeIs"
import { SaveDraft } from "./SaveDraft"
import { SavedInPlace } from "./SavedInPlace"
import { SavedInTheCloud } from "./SavedInTheCloud"
import { SearchedFields } from "./SearchedFields"
import { SearchesWith } from "./SearchesWith"
import { SearchesEverything } from "./SearchesEverything"
import { RequestsASecond } from "./RequestsASecond"
import { EveryThingMatching } from "./EveryThingMatching"
import { SearchedAt } from "./SearchedAt"
import { AskedBy } from "./AskedBy"
import { ThereAreThings } from "./ThereAreThings"
import { ThingWithId } from "./ThingWithId"
import { TotalOf } from "./TotalOf"
import { TryAgain } from "./TryAgain"
import { VersionsIn } from "./VersionsIn"

/** `there are less than 2 recipes where ...`, `there is a recipe where ...`:  see `ThereAreThings`. */
const THERE_ARE =
  "there (is|are) {compare:there_are_how_many}? ((one:one)|a|an)? {count:number}? ({type:known_type}|{list:member_words})"

/** The kinds of place spell knows, each a meaning `core.place()` knows by its words, dashes for spaces. */
const KINDS_AT = [
  "web_server",
  "graphql_server",
  "data_folder",
  "file",
  "room",
  "sheet",
  "excel_file",
  "google_sheet",
  "airtable",
  "atmosphere_account"
]

/**
 * A rule test's known type, for a list under it (`ListsUnder`).
 * - `Scope.types` is typed narrowly (`ScopeList<TypeScope>`):  the concrete `RootScope` accepts plain `TypeScopeProps` too.
 */
function addPost(scope: P.Scope) {
  ;(scope as P.RootScope).types.add({ name: "Post" })
}

/** A rule test's private sign-up sheet, in a space, for a projection of it (`ProjectionOf`). */
function addSignUpSheet(scope: P.Scope) {
  scope.compile('sign up sheet is a data folder at "@rs/picnic-private/signups"', "block")
}

/** The kinds with no address. */
const KINDS_HERE = ["database_on_this_device", "in_memory_database"]

places.addRule(Wording.specialize({ ruleName: "place_kind", meanings: KINDS_AT }), {
  syntax:
    "((web_server:web server)|(graphql_server:graphql server)|(data_folder:data folder)|(excel_file:excel/i file)|(file:file)|(room:room)|(sheet:sheet|spreadsheet)|(google_sheet:google sheet)|(airtable:airtable)|(atmosphere_account:atmosphere/i account|atmosphere/i))"
})

places.addRule(Wording.specialize({ ruleName: "place_kind_here", meanings: KINDS_HERE }), {
  syntax: "((database_on_this_device:database on this device)|(in_memory_database:in memory database))"
})

places.addRule(Wording.specialize({ ruleName: "place_kind_each_person", meanings: ["personal_atmosphere_account"] }), {
  syntax: "(personal_atmosphere_account:personal atmosphere/i account|personal atmosphere/i)"
})

places.addRule(Negatable.specialize({ ruleName: "are_or_are_not" }), { syntax: "(are|(negated:are not|aren't|arent))" })

/** `personal`, before a data folder's name:  one folder for each person, in their own space (epic `atmosphere` P1). */
places.addRule(Synonyms.specialize({ ruleName: "each_persons_own" }), { syntax: "personal" })

places.addRule(CreatePlace, {
  syntax:
    "{type:type_words} is (a|an) {kind:place_kind} (at|from) {personal:each_persons_own}? {address:text} {with_nested_statements}?",
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
        ],
        [
          'family cookbook is an excel file at "recipes.xlsx"',
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "excel file",',
            '  at: "recipes.xlsx"',
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
places.addRule(SavedInTheCloud, {
  syntax: "{type:type_words} is saved in the cloud {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "family cookbook is saved in the cloud",
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "the cloud",',
            '  at: "/api/places/spaces/personal/family-cookbook",',
            "  checkedEvery: 5",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(SavedInTheCloud, { syntax: "{type:subject_it} (is saved|lives) in the cloud" })
places.addRule(ProjectionOf, {
  syntax: "the? {type:type_words} is a projection of {source:expression} {with_nested_statements}?",
  tests: [
    {
      compileAs: "statement",
      beforeEach: (scope: P.Scope) =>
        scope.compile('film archive is a web server at "https://swapi.py4e.com/api"', "block"),
      tests: [
        {
          title: "only of a data folder in a space",
          input: "the films page is a projection of the film archive",
          js: '/* PARSE ERROR: A projection shows part of a space\'s data folder:  "the film archive" isn\'t one.  Name a place written like this:  family cookbook is a data folder at "@family/recipes" */'
        }
      ]
    },
    {
      compileAs: "block",
      beforeEach: addSignUpSheet,
      tests: [
        [
          'the published sheet is a projection of the sign up sheet\n\t- into "@rs/picnic"\n\t- showing each row\'s person and shift\n\t- only where its "status" is "confirmed"',
          [
            "export class PublishedSheet extends Place {}",
            "export const publishedSheet = core.place(new PublishedSheet(), {",
            '  name: "published_sheet",',
            '  kind: "data folder",',
            '  at: "/api/places/spaces/@rs/picnic",',
            "  projection: {",
            '    into: "@rs/picnic",',
            '    of: "/api/places/spaces/@rs/picnic-private/signups",',
            '    fields: ["person", "shift"],',
            '    where: { status: "confirmed" }',
            "  }",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(ProjectedInto, { syntax: "into {address:text}" })
places.addRule(ProjectedFields, { syntax: "showing (each|every) {thing:identifier}'s {fields:searched_fields}" })
places.addRule(ProjectedOnlyWhere, { syntax: "only where its {field:text} is {value:text}" })

places.addRule(CollectionAt, { syntax: "{collection:plural_type} live at {path:text}" })
places.addRule(CollectionAt, { syntax: "{collection:plural_type} are found at {path:text}" })
places.addRule(SearchedAt, { syntax: "{collection:plural_type} are searched at {path:text}" })
places.addRule(PictureAt, {
  syntax: "(a|an) {owner:known_type}'s {property:member_words} is a picture at {path:text}"
})
places.addRule(PictureAt, {
  syntax: "(a|an) {owner:known_type}'s {property:quoted_member} is a picture at {path:text}"
})
places.addRule(FieldCalled, { syntax: "(a|an) {owner:known_type}'s {property:member_words} is its? {name:text}" })
places.addRule(FieldCalled, { syntax: "(a|an) {owner:known_type}'s {property:quoted_member} is its? {name:text}" })
places.addRule(KeyIfSet, { syntax: "{type:subject_its} key is the secret {name:text}, if it's set" })
places.addRule(KeyIsSecret, { syntax: "{type:subject_its} key is the secret {name:text}" })
places.addRule(KeyWritten, { syntax: "{type:subject_its} key is {key:text}" })
places.addRule(Wording.specialize({ ruleName: "check_unit", meanings: ["second", "minute", "hour", "day"] }), {
  syntax: "((second:second|seconds)|(minute:minute|minutes)|(hour:hour|hours)|(day:day|days))"
})
places.addRule(CheckedEvery, { syntax: "check {type:subject_it} every {number} {unit:check_unit}?" })
places.addRule(CheckedEvery, { syntax: "check {type:subject_it} every {unit:check_unit}" })
places.addRule(Wording.specialize({ ruleName: "day_half", meanings: ["am", "pm"] }), {
  syntax: "((am:am|AM)|(pm:pm|PM))"
})
places.addRule(Wording.specialize({ ruleName: "clock_zone", meanings: ["utc", "local"] }), {
  syntax: "((utc:UTC|utc)|(local:local time))"
})
places.addRule(CheckedAt, {
  syntax:
    "check {type:subject_it} once a day (at {hour:number} (: {minute:number})? {half:day_half}? {zone:clock_zone}?)?"
})
places.addRule(CheckedAt, {
  syntax: "check {type:subject_it} every day at {hour:number} (: {minute:number})? {half:day_half}? {zone:clock_zone}?"
})
places.addRule(Wording.specialize({ ruleName: "size_unit", meanings: ["kb", "mb", "gb"] }), {
  syntax: "((kb:KB|kilobytes)|(mb:MB|megabytes)|(gb:GB|gigabytes))"
})
places.addRule(KeptOnDevice, {
  syntax: "keep a copy on this device (, up to {size:number} {unit:size_unit})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'film archive is a web server at "https://swapi.py4e.com/api"\n\t- keep a copy on this device',
          [
            "export class FilmArchive extends Place {}",
            "export const filmArchive = core.place(new FilmArchive(), {",
            '  name: "film_archive",',
            '  kind: "web server",',
            '  at: "https://swapi.py4e.com/api",',
            "  keptOnDevice: true",
            "})"
          ]
        ],
        [
          'film archive is a web server at "https://swapi.py4e.com/api"\n\t- keep a copy on this device, up to 20 MB',
          [
            "export class FilmArchive extends Place {}",
            "export const filmArchive = core.place(new FilmArchive(), {",
            '  name: "film_archive",',
            '  kind: "web server",',
            '  at: "https://swapi.py4e.com/api",',
            "  keptOnDevice: 20000000",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(VersionsIn, { syntax: "{type:subject_its} version is its? {field:text}" })
places.addRule(IdColumn, { syntax: "{type:subject_its} id is its? {column:text}" })
places.addRule(RowsIn, {
  syntax: "{type:subject_its} rows are (the {inner:text} of)? (the {outer:text} of)? its? {field:text}"
})
places.addRule(NextPageIn, {
  syntax: "{type:subject_its} next page is (the {inner:text} of)? (the {outer:text} of)? its? {field:text}"
})
places.addRule(NextPageInLink, { syntax: "{type:subject_its} next page is in its {header:text} header" })
places.addRule(ListsUnder, {
  syntax: "(a|an) {owner:known_type}'s {property:member_words} live at {path:text}",
  tests: [
    {
      compileAs: "block",
      beforeEach: addPost,
      tests: [
        [
          'typicode is a web server at "https://jsonplaceholder.typicode.com"\n\t- a post\'s comments live at "/posts/{id}/comments"',
          [
            "export class Typicode extends Place {}",
            "export const typicode = core.place(new Typicode(), {",
            '  name: "typicode",',
            '  kind: "web server",',
            '  at: "https://jsonplaceholder.typicode.com",',
            '  listsUnder: { posts: { comments: "/posts/{id}/comments" } }',
            "})"
          ]
        ],
        [
          'typicode is a web server at "https://jsonplaceholder.typicode.com"\n\t- a post\'s comments live at "/posts/{postId}/comments"',
          [
            "export class Typicode extends Place {}",
            "export const typicode = core.place(new Typicode(), {",
            '  name: "typicode",',
            '  kind: "web server",',
            '  at: "https://jsonplaceholder.typicode.com",',
            '  listsUnder: { posts: { comments: "/posts/{id}/comments" } }',
            "})"
          ]
        ]
      ]
    },
    {
      compileAs: "statement",
      beforeEach: addPost,
      tests: [
        { title: "only under a place", input: 'a post\'s comments live at "/posts/{id}/comments"', js: undefined }
      ]
    }
  ]
})
places.addRule(ListsUnder, { syntax: "(a|an) {owner:known_type}'s {property:quoted_member} live at {path:text}" })
places.addRule(ListsGiveOnly, {
  syntax: "{type:subject_its} lists give only each one's {field:text} (and {more:text})?"
})
places.addRule(PageSizeIs, { syntax: "{type:subject_it} gives up to {size:number} at a time" })
places.addRule(RequestsASecond, {
  syntax: "{type:subject_it} takes up to {most:number} requests a second",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'met museum is a web server at "https://collectionapi.metmuseum.org"\n\t- it takes up to 80 requests a second',
          [
            "export class MetMuseum extends Place {}",
            "export const metMuseum = core.place(new MetMuseum(), {",
            '  name: "met_museum",',
            '  kind: "web server",',
            '  at: "https://collectionapi.metmuseum.org",',
            "  mostPerSecond: 80",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(Wording.specialize({ ruleName: "numbers_or_names", meanings: ["numbers", "names"] }), {
  syntax: "((numbers:numbers)|(names:names))"
})
places.addRule(WritesLike, { syntax: "{type:subject_it} writes {what:numbers_or_names} like {example:text}" })
places.addRule(SearchedFields, { syntax: "[{identifier} (,|and)]" })
// before `searches_with`, which reads `everything` as a field's name too
places.addRule(SearchesEverything, {
  syntax: "{type:subject_it} searches everything with {param:text} (at {path:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'met museum is a web server at "https://collectionapi.metmuseum.org"\n\t- it searches everything with "q" at "/v1.1/search"',
          [
            "export class MetMuseum extends Place {}",
            "export const metMuseum = core.place(new MetMuseum(), {",
            '  name: "met_museum",',
            '  kind: "web server",',
            '  at: "https://collectionapi.metmuseum.org",',
            "  searches: {",
            '    param: "q",',
            "    fields: [],",
            '    at: "/v1.1/search"',
            "  }",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(SearchesWith, { syntax: "{type:subject_it} searches {fields:searched_fields} with {param:text}" })
places.addRule(AskedBy, {
  syntax: "{collection:plural_type} are asked for by (their|its)? {fields:searched_fields}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'open meteo is a web server at "https://api.open-meteo.com"\n\t- forecasts are asked for by their latitude and longitude',
          [
            "export class OpenMeteo extends Place {}",
            "export const openMeteo = core.place(new OpenMeteo(), {",
            '  name: "open_meteo",',
            '  kind: "web server",',
            '  at: "https://api.open-meteo.com",',
            '  collections: { forecasts: { askedBy: ["latitude", "longitude"] } }',
            "})"
          ]
        ]
      ]
    },
    {
      compileAs: "statement",
      tests: [
        { title: "only under a place", input: "forecasts are asked for by their latitude and longitude", js: undefined }
      ]
    }
  ]
})
places.addRule(AccountIncluded, { syntax: "{type:subject_it} includes the account {account:text}" })
places.addRule(OperationAt, { syntax: "to {signature:method_signature} is at {path:text}" })

places.addRule(SavedInPlace, { syntax: "{type:subject_it} (is saved|lives) in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "(a|an) {type:known_type} (is saved|lives) in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "{type:subject_implied} (is saved|lives) in {place:expression}" })

places.addRule(WhileWaiting, { syntax: "while (waiting|loading) :? {statement_body}?" })
places.addRule(IfThereAreNone, { syntax: "if there are none :? {statement_body}?" })
places.addRule(IfThatFailsSay, { syntax: "if that fails say {text:expression}" })
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
places.addRule(EveryThingMatching, {
  syntax: "every {type:known_type} matching {words:expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            'met museum is a web server at "https://collectionapi.metmuseum.org"',
            '\t- it searches everything with "q"',
            "an artwork is a thing",
            "\t- it lives in met museum"
          ].join("\n"),
          "block"
        )
        scope.variables?.add("search")
      },
      tests: [["every artwork matching search", 'await core.savedThings(Artwork, { search: { "*": search } })']]
    }
  ]
})
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
