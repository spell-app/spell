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
import { StoredOnThisDevice } from "./StoredOnThisDevice"
import { StoredInMemory } from "./StoredInMemory"
import { DraftOf } from "./DraftOf"
import { FieldCalled } from "./FieldCalled"
import { FirstFewWhere } from "./FirstFewWhere"
import { HelpfulWord } from "./HelpfulWord"
import { IdColumn } from "./IdColumn"
import { KeyGoesInAddress, OLD_KEY_GOES_IN_ADDRESS } from "./KeyGoesInAddress"
import { KeyGoesInHeader, OLD_KEY_GOES_IN_HEADER } from "./KeyGoesInHeader"
import { KeyIfSet, OLD_KEY_IF_SET } from "./KeyIfSet"
import { KeyIsSecret, OLD_KEY_IS_SECRET } from "./KeyIsSecret"
import { TokenFrom, OLD_TOKEN_FROM } from "./TokenFrom"
import { DataIsPrivate } from "./DataIsPrivate"
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
import { MostRowsEach } from "./MostRowsEach"
import { RowsAllowedEach } from "./RowsAllowedEach"
import { ConfirmedJoin } from "./ConfirmedJoin"
import { RowsOnlyFrom } from "./RowsOnlyFrom"
import { SignUpsFrom } from "./SignUpsFrom"
import { CurrentPerson, PeopleHere, SignInMenu, TheirField } from "./PeopleWords"
import { TheyAre } from "./TheyAre"
import { WhereField } from "./WhereField"
import {
  IfThatFails,
  IfThatFailsSay,
  IfThereAreNone,
  ShowItAllIn,
  ShowThemAll,
  ShowThemAtATime,
  ShowThemIn,
  ShowThemPaged,
  WhileWaiting,
  WhileWaitingSay
} from "./ReadRider"
import { NextPageIn } from "./NextPageIn"
import { NextPageInLink } from "./NextPageInLink"
import { NextPageByOffset } from "./NextPageByOffset"
import { NextPageByNumber } from "./NextPageByNumber"
import { NextPageByLastId } from "./NextPageByLastId"
import { FiltersBy } from "./FiltersBy"
import { SortsBy } from "./SortsBy"
import { GivesFieldsNamedIn } from "./GivesFieldsNamedIn"
import { IsReadOnly } from "./IsReadOnly"
import { WritesLike } from "./WritesLike"
import { ReloadThings } from "./ReloadThings"
import { RowsIn } from "./RowsIn"
import { ListsGiveOnly } from "./ListsGiveOnly"
import { PageSizeIs } from "./PageSizeIs"
import { PickFileFor } from "./PickFileFor"
import { SaveDraft } from "./SaveDraft"
import { KeepsNoTimes } from "./KeepsNoTimes"
import { EnabledOperations, OPERATION_MEANINGS } from "./EnabledOperations"
import { OperationName } from "./OperationName"
import { OperationNames } from "./OperationNames"
import { TypeVerified } from "./TypeVerified"
import { SavedInPlace } from "./SavedInPlace"
import { SavedInTheCloud } from "./SavedInTheCloud"
import { SearchedFields } from "./SearchedFields"
import { SearchesWith } from "./SearchesWith"
import { SearchesEverything } from "./SearchesEverything"
import { RequestsASecond } from "./RequestsASecond"
import { EveryThingMatching } from "./EveryThingMatching"
import { SearchedAt } from "./SearchedAt"
import { CollectionSearchedWith } from "./CollectionSearchedWith"
import { AskedBy } from "./AskedBy"
import { ReadOnStartup } from "./ReadOnStartup"
import { ThereAreThings } from "./ThereAreThings"
import { AnyServerCallFails } from "./AnyServerCallFails"
import { ErrorIs } from "./ErrorIs"
import { Nevermind, PassTheError } from "./FailureWords"
import { ThingById } from "./ThingById"
import { CallTheServer, WrapperAction } from "./WrapperAction"
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
  "plain_file",
  "room",
  "sheet",
  "excel_file",
  "google_sheet",
  "airtable",
  "atmosphere_space",
  "atmosphere_account"
]

/**
 * A rule test's known type, for a list under it (`ListsUnder`).
 * - `Scope.types` is typed narrowly (`ScopeList<TypeScope>`):  the concrete `RootScope` accepts plain `TypeScopeProps` too.
 */
function addPost(scope: P.Scope) {
  ;(scope as P.RootScope).types.add({ name: "Post" })
}

/** A rule test's web server, for a type's lines about what it lets be done (`EnabledOperations`, epic `data` P49). */
function addNetbox(scope: P.Scope) {
  scope.compile('netbox is a web server at "https://demo.netbox.dev"', "block")
}

/** A rule test's private sign-up sheet, in a space, for a projection of it (`ProjectionOf`). */
function addSignUpSheet(scope: P.Scope) {
  scope.compile('sign up sheet is a data folder at "@rs/picnic-private/signups"', "block")
}

/** The kinds with no address. */
const KINDS_HERE = ["database_on_this_device", "in_memory_database"]

places.addRule(Wording.specialize({ ruleName: "place_kind", meanings: KINDS_AT }), {
  syntax:
    "((web_server:web server)|(graphql_server:graphql server)|(data_folder:data folder)|(excel_file:excel/i file)|(file:json file)|(plain_file:file)|(room:room)|(sheet:sheet|spreadsheet|csv file)|(google_sheet:google sheet)|(airtable:airtable)|(atmosphere_space:atmosphere/i space)|(atmosphere_account:atmosphere/i account|atmosphere/i))"
})

places.addRule(Wording.specialize({ ruleName: "place_kind_here", meanings: KINDS_HERE }), {
  syntax: "((database_on_this_device:database on this device)|(in_memory_database:in memory database))"
})

/** How a file a person picks is said, after its kind (epic `editor` P41, Q67's B and C):  both make the same place. */
places.addRule(Wording.specialize({ ruleName: "picked_file", meanings: ["you_pick", "on_this_device"] }), {
  syntax: "((you_pick:you pick)|(on_this_device:on this device))"
})

places.addRule(Wording.specialize({ ruleName: "place_kind_each_person", meanings: ["personal_atmosphere_account"] }), {
  syntax: "(personal_atmosphere_account:personal atmosphere/i account|personal atmosphere/i)"
})

places.addRule(Negatable.specialize({ ruleName: "are_or_are_not" }), { syntax: "(are|(negated:are not|aren't|arent))" })

/** `personal`, before a data folder's name:  one folder for each person, in their own space (epic `atmosphere` P1). */
places.addRule(Synonyms.specialize({ ruleName: "each_persons_own" }), { syntax: "personal" })

places.addRule(CreatePlace, {
  roles: { band: "thing", type: "declaration" },
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
          'team chat is a room at "events_team@rs/messages"',
          [
            "export class TeamChat extends Place {}",
            "export const teamChat = core.place(new TeamChat(), {",
            '  name: "team_chat",',
            '  kind: "room",',
            '  at: "/api/rooms/spaces/events_team@rs/messages"',
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
          'family cookbook is an atmosphere space at "at://did:plc:abc123/space/family"',
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "atmosphere space",',
            '  at: "at://did:plc:abc123/space/family"',
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
places.addRule(CreatePlace, {
  syntax: "{type:type_words} is (a|an) {kind:place_kind_here} {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        // the browser's own database:  never a file a person picks, though both say "on this device" (epic `editor` P41)
        [
          "family cookbook is a database on this device",
          [
            "export class FamilyCookbook extends Place {}",
            'export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "database on this device" })'
          ]
        ]
      ]
    }
  ]
})
places.addRule(CreatePlace, {
  syntax: "{type:type_words} is (a|an) {kind:place_kind} {picked:picked_file} {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "family cookbook is a json file you pick",
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "file",',
            "  picked: true",
            "})"
          ]
        ],
        [
          "family cookbook is a json file on this device",
          [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "file",',
            "  picked: true",
            "})"
          ]
        ],
        [
          "task sheet is a csv file you pick",
          [
            "export class TaskSheet extends Place {}",
            "export const taskSheet = core.place(new TaskSheet(), {",
            '  name: "task_sheet",',
            '  kind: "sheet",',
            "  picked: true",
            "})"
          ]
        ],
        [
          "budget is an excel file on this device",
          [
            "export class Budget extends Place {}",
            "export const budget = core.place(new Budget(), {",
            '  name: "budget",',
            '  kind: "excel file",',
            "  picked: true",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(CreatePlace, {
  syntax:
    "{type:type_words} is (a|an) {kind:place_kind_each_person} ((at|from) {address:text})? {with_nested_statements}?"
})
places.addRule(StoredOnThisDevice, {
  roles: { band: "thing", type: "declaration" },
  syntax: "{type:type_words} is stored on this device (each_tab:, for each tab)? {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "settings is stored on this device",
          [
            "export class Setting extends Place {}",
            'export const settings = core.place(new Setting(), { name: "settings", kind: "database on this device" })'
          ]
        ],
        [
          "scratch is stored on this device, for each tab",
          [
            "export class Scratch extends Place {}",
            "export const scratch = core.place(new Scratch(), {",
            '  name: "scratch",',
            '  kind: "database on this device",',
            "  forEachTab: true",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(StoredInMemory, {
  syntax: "{type:type_words} is stored in memory {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "drafts is stored in memory",
          [
            "export class Draft extends Place {}",
            'export const drafts = core.place(new Draft(), { name: "drafts", kind: "in memory database" })'
          ]
        ]
      ]
    }
  ]
})
places.addRule(SavedInTheCloud, {
  roles: { band: "thing", type: "declaration" },
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
  roles: { band: "thing", type: "declaration" },
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
places.addRule(SignUpsFrom, {
  syntax: "open to (sign-ups|sign ups) from {address:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'sign up sheet is a data folder at "picnic@rs/__private/signups"\n\t- open to sign-ups from "picnic@rs/sheet"\n\t- only its attendees add rows\n\t- at most 2 rows for each shift',
          [
            "export class SignUpSheet extends Place {}",
            "export const signUpSheet = core.place(new SignUpSheet(), {",
            '  name: "sign_up_sheet",',
            '  kind: "data folder",',
            '  at: "/api/places/spaces/picnic@rs/__private/signups",',
            "  sheet: {",
            '    signUpsFrom: "picnic@rs/sheet",',
            '    onlyFrom: "attendees",',
            '    mostEach: { field: "shift", most: 2 }',
            "  }",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(RowsOnlyFrom, { syntax: "only its {list:identifier} add rows" })
places.addRule(MostRowsEach, { syntax: "at most {most:number} rows (for|per) each {field:identifier}" })
places.addRule(RowsAllowedEach, {
  syntax: "each person (asks for|adds) at most their {field:text} {collection:identifier}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'sign up sheet is a data folder at "picnic@rs/__private/signups"\n\t- only its attendees add rows\n\t- at most 2 rows for each shift\n\t- at most 40 rows for each event\n\t- each person asks for at most their "invitations" tickets\n\t- confirmed tickets join "picnic@rs/__attendees"',
          [
            "export class SignUpSheet extends Place {}",
            "export const signUpSheet = core.place(new SignUpSheet(), {",
            '  name: "sign_up_sheet",',
            '  kind: "data folder",',
            '  at: "/api/places/spaces/picnic@rs/__private/signups",',
            "  sheet: {",
            '    onlyFrom: "attendees",',
            '    mostEach: [{ field: "shift", most: 2 }, { field: "event", most: 40 }],',
            '    allowance: { collection: "tickets", field: "invitations" },',
            '    joins: { collection: "tickets", address: "picnic@rs/__attendees" }',
            "  }",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(ConfirmedJoin, { syntax: "confirmed {collection:identifier} join {address:text}" })

places.addRule(CollectionAt, { syntax: "{collection:plural_type} live at {path:text} {nested_statements}?" })
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
places.addRule(KeyIfSet, { syntax: "{type:subject_it} is optionally authenticated with the secret {name:text}" })
places.addRule(KeyIsSecret, { syntax: "{type:subject_it} is authenticated with the secret {name:text}" })
places.addRule(TokenFrom, {
  syntax: "{type:subject_it} is authenticated with a token from {address:text} ,? made with the secret {name:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'acme is a web server at "https://acme.test"\n\tit is authenticated with a token from "https://auth.acme.test/api-keys/{key id}/token", made with the secret "ACME_API_KEY"',
          [
            "export class Acme extends Place {}",
            "export const acme = core.place(new Acme(), {",
            '  name: "acme",',
            '  kind: "web server",',
            '  at: "https://acme.test",',
            '  keyNamed: "ACME_API_KEY",',
            '  tokenFrom: "https://auth.acme.test/api-keys/{key id}/token"',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(DataIsPrivate, {
  syntax: "{type:subject_its} data is private (,? located in {path:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'netbox is a web server at "https://demo.netbox.dev"\n\tits data is private, located in "~/.spell/places/netbox"',
          [
            "export class Netbox extends Place {}",
            "export const netbox = core.place(new Netbox(), {",
            '  name: "netbox",',
            '  kind: "web server",',
            '  at: "https://demo.netbox.dev",',
            '  privateDataIn: "~/.spell/places/netbox"',
            "})"
          ]
        ],
        [
          'netbox is a web server at "https://demo.netbox.dev"\n\tits data is private',
          [
            "export class Netbox extends Place {}",
            "export const netbox = core.place(new Netbox(), {",
            '  name: "netbox",',
            '  kind: "web server",',
            '  at: "https://demo.netbox.dev",',
            '  privateDataIn: ""',
            "})"
          ]
        ]
      ]
    }
  ]
})
// the old words:  each still reads, with a warning naming the new line
places.addRule(OLD_KEY_IF_SET, { syntax: "{type:subject_its} optional key is the secret {name:text}" })
places.addRule(OLD_KEY_IS_SECRET, { syntax: "{type:subject_its} key is the secret {name:text}" })
places.addRule(OLD_TOKEN_FROM, {
  syntax: "{type:subject_its} token comes from {address:text} ,? made with the secret {name:text}"
})
places.addRule(KeyWritten, { syntax: "{type:subject_it} is authenticated with {key:text}" })
places.addRule(KeyWritten, { syntax: "{type:subject_its} key is {key:text}" })
places.addRule(KeyGoesInHeader, {
  syntax: "{type:subject_its} secret goes in its {name:text} header",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'cookbook is a web server at "https://example.com"\n\t- its secret goes in its "X-Api-Key" header',
          [
            "export class Cookbook extends Place {}",
            "export const cookbook = core.place(new Cookbook(), {",
            '  name: "cookbook",',
            '  kind: "web server",',
            '  at: "https://example.com",',
            '  keyGoes: { header: "X-Api-Key" }',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(OLD_KEY_GOES_IN_HEADER, { syntax: "{type:subject_its} key goes in its {name:text} header" })
places.addRule(KeyGoesInAddress, {
  syntax: "{type:subject_its} secret goes in the address as {name:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'cookbook is a web server at "https://example.com"\n\t- its secret goes in the address as "api_key"',
          [
            "export class Cookbook extends Place {}",
            "export const cookbook = core.place(new Cookbook(), {",
            '  name: "cookbook",',
            '  kind: "web server",',
            '  at: "https://example.com",',
            '  keyGoes: { inAddress: "api_key" }',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(OLD_KEY_GOES_IN_ADDRESS, { syntax: "{type:subject_its} key goes in the address as {name:text}" })
places.addRule(CheckedEvery, { syntax: "check {type:subject_it} every {interval:measure_literal}" })
places.addRule(CheckedEvery, { syntax: "check {type:subject_it} every {number}" })
places.addRule(CheckedEvery, { syntax: "check {type:subject_it} every {unit:unit_words}" })
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
  syntax:
    "{type:subject_its} next page is (the {inner:text} of)? (the {outer:text} of)? its? {field:text} (, sent back as {param:text})?"
})
places.addRule(NextPageInLink, { syntax: "{type:subject_its} next page is in its {header:text} header" })
places.addRule(NextPageByOffset, {
  syntax: "{type:subject_its} next page is asked for with ({limit:text} and)? {offset:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'met museum is a web server at "https://collectionapi.metmuseum.org"\n\t- its next page is asked for with "limit" and "offset"',
          [
            "export class MetMuseum extends Place {}",
            "export const metMuseum = core.place(new MetMuseum(), {",
            '  name: "met_museum",',
            '  kind: "web server",',
            '  at: "https://collectionapi.metmuseum.org",',
            '  pagesByOffset: { limit: "limit", offset: "offset" }',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(NextPageByLastId, {
  syntax:
    "{type:subject_its} next page is asked for with ({limit:text} and)? the last id as {param:text} (, until (the {inner:text} of)? its {field:text} is no)?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'stripe is a web server at "https://stripe.test"\n\t- its next page is asked for with "limit" and the last id as "starting_after", until its "has_more" is no',
          [
            "export class Stripe extends Place {}",
            "export const stripe = core.place(new Stripe(), {",
            '  name: "stripe",',
            '  kind: "web server",',
            '  at: "https://stripe.test",',
            "  pagesByLastId: {",
            '    limit: "limit",',
            '    param: "starting_after",',
            '    moreIn: "has_more"',
            "  }",
            "})"
          ]
        ],
        [
          'shop is a web server at "https://shop.test"\n\t- its next page is asked for with the last id as "after", until the "more" of its "paging" is no',
          [
            "export class Shop extends Place {}",
            "export const shop = core.place(new Shop(), {",
            '  name: "shop",',
            '  kind: "web server",',
            '  at: "https://shop.test",',
            '  pagesByLastId: { param: "after", moreIn: "paging.more" }',
            "})"
          ]
        ],
        [
          'shop is a web server at "https://shop.test"\n\t- its next page is asked for with the last id as "after"',
          [
            "export class Shop extends Place {}",
            "export const shop = core.place(new Shop(), {",
            '  name: "shop",',
            '  kind: "web server",',
            '  at: "https://shop.test",',
            '  pagesByLastId: { param: "after" }',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(NextPageByNumber, {
  syntax:
    "{type:subject_its} next page is asked for by number with ({limit:text} and)? {page:text} (, counting from {first:number})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'github is a web server at "https://github.test"\n\t- its next page is asked for by number with "per_page" and "page"',
          [
            "export class Github extends Place {}",
            "export const github = core.place(new Github(), {",
            '  name: "github",',
            '  kind: "web server",',
            '  at: "https://github.test",',
            '  pagesByNumber: { limit: "per_page", page: "page" }',
            "})"
          ]
        ],
        [
          'spring is a web server at "https://spring.test"\n\t- its next page is asked for by number with "size" and "page", counting from 0',
          [
            "export class Spring extends Place {}",
            "export const spring = core.place(new Spring(), {",
            '  name: "spring",',
            '  kind: "web server",',
            '  at: "https://spring.test",',
            "  pagesByNumber: {",
            '    limit: "size",',
            '    page: "page",',
            "    first: 0",
            "  }",
            "})"
          ]
        ],
        [
          'blog is a web server at "https://blog.test"\n\t- its next page is asked for by number with "p"',
          [
            "export class Blog extends Place {}",
            "export const blog = core.place(new Blog(), {",
            '  name: "blog",',
            '  kind: "web server",',
            '  at: "https://blog.test",',
            '  pagesByNumber: { page: "p" }',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(FiltersBy, {
  syntax: "{type:subject_it} filters by every field",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'cookbook is a web server at "https://cookbook.test"\n\t- it filters by every field',
          [
            "export class Cookbook extends Place {}",
            "export const cookbook = core.place(new Cookbook(), {",
            '  name: "cookbook",',
            '  kind: "web server",',
            '  at: "https://cookbook.test",',
            '  filters: "every field"',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(FiltersBy, {
  syntax: "{type:subject_it} filters by {fields:searched_fields}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'cookbook is a web server at "https://cookbook.test"\n\t- it filters by cuisine and cook-time',
          [
            "export class Cookbook extends Place {}",
            "export const cookbook = core.place(new Cookbook(), {",
            '  name: "cookbook",',
            '  kind: "web server",',
            '  at: "https://cookbook.test",',
            '  filters: ["cuisine", "cookTime"]',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(SortsBy, { syntax: "{type:subject_it} sorts by every field (with {param:text})?" })
places.addRule(SortsBy, {
  syntax: "{type:subject_it} sorts by {fields:searched_fields} (with {param:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'cookbook is a web server at "https://cookbook.test"\n\t- it sorts by title and date with "order"',
          [
            "export class Cookbook extends Place {}",
            "export const cookbook = core.place(new Cookbook(), {",
            '  name: "cookbook",',
            '  kind: "web server",',
            '  at: "https://cookbook.test",',
            '  sorts: ["title", "date"],',
            '  sortedWith: "order"',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(GivesFieldsNamedIn, {
  syntax: "{type:subject_it} gives only the fields named in {param:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'countries is a web server at "https://countries.test"\n\t- it gives only the fields named in "response_fields"',
          [
            "export class Country extends Place {}",
            "export const countries = core.place(new Country(), {",
            '  name: "countries",',
            '  kind: "web server",',
            '  at: "https://countries.test",',
            '  fieldsNamedIn: "response_fields"',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(IsReadOnly, {
  syntax: "{type:subject_it} is (read only|read-only)",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'countries is a web server at "https://countries.test"\n\t- it is read only',
          [
            "export class Country extends Place {}",
            "export const countries = core.place(new Country(), {",
            '  name: "countries",',
            '  kind: "web server",',
            '  at: "https://countries.test",',
            "  readOnly: true",
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(ListsUnder, {
  syntax: "(a|an) {owner:known_type}'s {property:member_words} (live|lives) at {path:text}",
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
        ],
        [
          'typicode is a web server at "https://jsonplaceholder.typicode.com"\n\t- a post\'s summary lives at "/posts/{id}/summary"',
          [
            "export class Typicode extends Place {}",
            "export const typicode = core.place(new Typicode(), {",
            '  name: "typicode",',
            '  kind: "web server",',
            '  at: "https://jsonplaceholder.typicode.com",',
            '  listsUnder: { posts: { summary: "/posts/{id}/summary" } }',
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
places.addRule(ListsUnder, {
  syntax: "(a|an) {owner:known_type}'s {property:quoted_member} (live|lives) at {path:text}"
})
places.addRule(ListsGiveOnly, {
  syntax: "{type:subject_its} lists give only each one's {field:text} (and {more:text})?"
})
places.addRule(PageSizeIs, {
  syntax: "{type:subject_it} gives up to {size:number} at a time (, asked for with {param:text})?"
})
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
places.addRule(CollectionSearchedWith, {
  syntax: "{collection:plural_type} are searched with {param:text} (at {path:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'github is a web server at "https://api.github.com"\n\t- users are found at "/users/{name}"\n\t- users are searched with "q" at "/search/users"\n\t- repositories are searched with "q" at "/search/repositories"',
          [
            "export class Github extends Place {}",
            "export const github = core.place(new Github(), {",
            '  name: "github",',
            '  kind: "web server",',
            '  at: "https://api.github.com",',
            '  collections: { users: { at: "/users/{id}", searches: {',
            '    param: "q",',
            "    fields: [],",
            '    at: "/search/users"',
            "  } }, repositories: {",
            "    searches: {",
            '      param: "q",',
            "      fields: [],",
            '      at: "/search/repositories"',
            "    },",
            '    at: "/search/repositories",',
            "    searchedOnly: true",
            "  } }",
            "})"
          ]
        ]
      ]
    }
  ]
})
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
        ],
        {
          title: "fields of several words, joined, one a list of values",
          input:
            'lab is a web server at "https://lab.test"\n\t- measurements are asked for by their device-ids and instance-id',
          js: [
            "export class Lab extends Place {}",
            "export const lab = core.place(new Lab(), {",
            '  name: "lab",',
            '  kind: "web server",',
            '  at: "https://lab.test",',
            '  collections: { measurements: { askedBy: ["deviceIds", "instanceId"] } }',
            "})"
          ]
        }
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
places.addRule(ReadOnStartup, {
  syntax: "{collection:plural_type} are read on startup",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'shop is a web server at "https://shop.test"\n\t- items are read on startup\nan item is a thing',
          [
            "export class Shop extends Place {}",
            "export const shop = core.place(new Shop(), {",
            '  name: "shop",',
            '  kind: "web server",',
            '  at: "https://shop.test",',
            '  readOnStartup: ["Item"]',
            "})",
            "export class Item extends Thing {}"
          ]
        ]
      ]
    },
    {
      compileAs: "statement",
      tests: [{ title: "only under a place", input: "items are read on startup", js: undefined }]
    }
  ]
})
places.addRule(AccountIncluded, { syntax: "{type:subject_it} includes the account {account:text}" })
places.addRule(OperationAt, { syntax: "to {signature:method_signature} is at {path:text}" })

places.addRule(SavedInPlace, { syntax: "{type:subject_it} (is saved|lives) in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "(a|an) {type:known_type} (is saved|lives) in {place:expression}" })
places.addRule(SavedInPlace, { syntax: "{type:subject_implied} (is saved|lives) in {place:expression}" })

places.addRule(KeepsNoTimes, { syntax: "{type:subject_it} keeps no times" })
places.addRule(KeepsNoTimes, { syntax: "(a|an) {type:known_type} keeps no times" })

// what a place lets be done to a type's things (epic `data` P49):  `enabled operations are add, change`
places.addRule(Wording.specialize({ ruleName: "operation_word", meanings: [...OPERATION_MEANINGS] }), {
  syntax: "((read:read)|(add:add)|(change:change)|(delete:delete)|(all:all))"
})
places.addRule(OperationName, {
  tests: [
    {
      tests: [["add", "add"], { title: "a name starts lowercase", input: "Add", js: undefined }]
    }
  ]
})
places.addRule(OperationNames, { syntax: "[{operation_name} (,|and|or)]" })
places.addRule(EnabledOperations, {
  syntax: "enabled operations? are? :? {operations:operation_names}",
  tests: [
    {
      compileAs: "block",
      beforeEach: addNetbox,
      tests: [
        [
          'a "job" is a thing\n\tit lives in netbox\n\tenabled operations are add, change, complete',
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"],',
            "    operations: [",
            '      "add",',
            '      "change",',
            '      "complete"',
            "    ], select: [] }",
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}"
          ],
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"],',
            "    operations: [",
            '      "add",',
            '      "change",',
            '      "complete"',
            "    ], select: [] }",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}"
          ]
        ],
        [
          'a "job" is a thing\n\tit lives in netbox\n\tenabled: read,delete',
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"],',
            '    operations: ["read", "delete"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}"
          ],
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"],',
            '    operations: ["read", "delete"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}"
          ]
        ],
        [
          'a "job" is a thing\n\tit lives in netbox\n\tenabled operations are all',
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"],',
            '    operations: ["all"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}"
          ],
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"],',
            '    operations: ["all"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}"
          ]
        ],
        [
          'netbox is a web server at "https://demo.netbox.dev"\n\tjobs live at "/api/jobs"\n\t\tenabled operations are read, add',
          [
            "export class Netbox extends Place {}",
            "export const netbox = core.place(new Netbox(), {",
            '  name: "netbox",',
            '  kind: "web server",',
            '  at: "https://demo.netbox.dev",',
            '  collections: { jobs: { at: "/api/jobs", operations: ["read", "add"] } }',
            "})"
          ]
        ]
      ]
    }
  ]
})
places.addRule(EnabledOperations, {
  syntax: "all operations are disabled",
  tests: [
    {
      compileAs: "block",
      beforeEach: addNetbox,
      tests: [
        [
          'a "job session" is a thing\n\tit lives in netbox\n\tall operations are disabled',
          [
            "export class JobSession extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "job_sessions",',
            '    times: ["created", "modified"],',
            "    operations: [], select: [] }",
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}"
          ],
          [
            "export class JobSession extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "job_sessions",',
            '    times: ["created", "modified"],',
            "    operations: [], select: [] }",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}"
          ]
        ]
      ]
    }
  ]
})

// whether a type read from an API's description was tried against its server (epic `data` P49):  `this type is verified`
places.addRule(Wording.specialize({ ruleName: "verify_state", meanings: ["verified", "failed", "unverified"] }), {
  syntax: "((verified:verified)|(failed:failed)|(unverified:unverified))"
})
places.addRule(TypeVerified, {
  syntax: "this? type is? {state:verify_state}",
  tests: [
    {
      compileAs: "block",
      beforeEach: addNetbox,
      tests: [
        [
          'a "job" is a thing\n\tit lives in netbox\n\tthis type is verified',
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}"
          ],
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}"
          ]
        ],
        [
          'a "job" is a thing\n\tit lives in netbox\n\ttype unverified',
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in netbox",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}"
          ],
          [
            "export class Job extends Thing {",
            "  static savedIn = {",
            '    place: "netbox",',
            '    collection: "jobs",',
            '    times: ["created", "modified"], select: [] }',
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in netbox",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}"
          ]
        ]
      ]
    }
  ]
})

places.addRule(WhileWaitingSay, {
  syntax: "while (waiting|loading) say {text:expression}",
  tests: [
    {
      compileAs: "statement",
      tests: [['while waiting say "Loading Jobs..."', 'core.readRider("waitingSay", () => "Loading Jobs...")']]
    }
  ]
})
places.addRule(WhileWaiting, { syntax: "while (waiting|loading) (:|,)? {statement_body}?" })
places.addRule(IfThereAreNone, { syntax: "if there are none (:|,)? {statement_body}?" })
places.addRule(IfThatFailsSay, { syntax: "if that fails say {text:expression}" })
places.addRule(ShowThemPaged, { syntax: "show them in pages" })
places.addRule(ShowThemAll, { syntax: "show them all" })
places.addRule(ShowThemAtATime, {
  syntax: "show them {size:number} at a time",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["show them 12 at a time", 'core.readRider("pageSize", () => 12)'],
        {
          title: "a whole number, 1 or more",
          input: "show them 0 at a time",
          js: "/* PARSE ERROR: A page holds a whole number of things, 1 or more */"
        }
      ]
    }
  ]
})
places.addRule(ShowThemIn, { syntax: "show them in :? {statement_body}?" })
places.addRule(ShowItAllIn, { syntax: "show it all in :? {statement_body}?" })
places.addRule(IfThatFails, { syntax: "if that fails (:|,)? {statement_body}?" })

places.addRule(InOneGo, {
  syntax: "in one go (:|,)? {statement_body}?",
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
places.addRule(SaveDraft, {
  syntax: "save {draft:known_type}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["family cookbook is a json file you pick", "to keep it", "\tsave family cookbook"],
          js: [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "file",',
            "  picked: true",
            "})",
            "export async function keepIt() {",
            '  return core.asAction({ undoneAs: "Keep It" }, async () => {',
            '    await core.savePickedFile("family_cookbook")',
            "  })",
            "}"
          ]
        }
      ]
    }
  ]
})
places.addRule(SaveDraft, { syntax: "save {draft:expression}" })
places.addRule(PickFileFor, {
  syntax: "pick a file for {place:known_type}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["family cookbook is a json file you pick", "to open", "\tpick a file for family cookbook"],
          js: [
            "export class FamilyCookbook extends Place {}",
            "export const familyCookbook = core.place(new FamilyCookbook(), {",
            '  name: "family_cookbook",',
            '  kind: "file",',
            "  picked: true",
            "})",
            "export async function open() {",
            '  return core.asAction({ undoneAs: "Open" }, async () => {',
            '    await core.pickFileFor("family_cookbook")',
            "  })",
            "}"
          ]
        }
      ]
    }
  ]
})
places.addRule(DiscardDraft, { syntax: "discard {draft:expression}" })
places.addRule(CancelAction, { syntax: "(stop|cancel) the? {action:identifier}" })
places.addRule(ReloadThings, { syntax: "reload the {type:plural_type}" })
places.addRule(TryAgain, {
  syntax: "try again",
  tests: [{ compileAs: "statement", tests: [["try again", "core.reloadSaved()"]] }]
})

// a server's actions (epic `data` P50):  by id, wrapped, and the steps when one fails
places.addRule(ThingById, {
  syntax: "{type:known_type} {id:number}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "a job is a thing",
            'work is a web server at "https://jobs.test":',
            '\t- to complete a job is at "/jobs/{id}/complete"',
            "a job:",
            "\t- it lives in work",
            "to finish",
            "\tcomplete job 7151"
          ],
          js: [
            "export class Job extends Thing {",
            "  async complete() {",
            '    return await core.callPlace("work", "complete", this)',
            "  }",
            "",
            "  static savedIn = {",
            '    place: "work",',
            '    collection: "jobs",',
            '    times: ["created", "modified"]',
            "  }",
            "",
            "  // - it lives in work",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in work",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", callsServer: true, cantBeUndone: "keeps history" })',
            "export class Work extends Place {}",
            "export const work = core.place(new Work(), {",
            '  name: "work",',
            '  kind: "web server",',
            '  at: "https://jobs.test",',
            '  operations: { complete: "/jobs/{id}/complete" }',
            "})",
            "export async function finish() {",
            '  return core.asAction({ undoneAs: "Finish" }, async () => await (await core.savedThingOrMissing(Job, 7151)).complete())',
            "}"
          ],
          ts: [
            "export class Job extends Thing {",
            "  async complete() {",
            '    return await core.callPlace("work", "complete", this)',
            "  }",
            "",
            "  static savedIn = {",
            '    place: "work",',
            '    collection: "jobs",',
            '    times: ["created", "modified"]',
            "  }",
            "",
            "  // - it lives in work",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in work",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", callsServer: true, cantBeUndone: "keeps history" })',
            "export class Work extends Place {}",
            "export const work = core.place(new Work(), {",
            '  name: "work",',
            '  kind: "web server",',
            '  at: "https://jobs.test",',
            '  operations: { complete: "/jobs/{id}/complete" }',
            "})",
            "export async function finish() {",
            '  return core.asAction({ undoneAs: "Finish" }, async () => await (await core.savedThingOrMissing(Job, 7151)).complete())',
            "}"
          ]
        }
      ]
    }
  ]
})
places.addRule(WrapperAction, {
  roles: { band: "action", signature: "declaration" },
  syntax: "to {signature:method_signature} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "a job is a thing",
            'work is a web server at "https://jobs.test":',
            '\t- to complete a job is at "/jobs/{id}/complete"',
            "a job:",
            "\t- it lives in work",
            "to complete a job",
            '\tprint "about to"',
            "\tcall work",
            '\tprint "done"'
          ],
          js: [
            "export class Job extends Thing {",
            "  async complete() {",
            '    return await core.callPlace("work", "complete", this)',
            "  }",
            "",
            "  async aroundComplete(serverCall) {",
            '    core.console.log("about to")',
            "    await serverCall()",
            '    core.console.log("done")',
            "  }",
            "",
            "  static savedIn = {",
            '    place: "work",',
            '    collection: "jobs",',
            '    times: ["created", "modified"]',
            "  }",
            "",
            "  // - it lives in work",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in work",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", callsServer: true, cantBeUndone: "keeps history" })',
            'core.addActionHook(Job, "complete", { moment: "around", hook: "aroundComplete", level: "app" })',
            "export class Work extends Place {}",
            "export const work = core.place(new Work(), {",
            '  name: "work",',
            '  kind: "web server",',
            '  at: "https://jobs.test",',
            '  operations: { complete: "/jobs/{id}/complete" }',
            "})"
          ],
          ts: [
            "export class Job extends Thing {",
            "  async complete() {",
            '    return await core.callPlace("work", "complete", this)',
            "  }",
            "",
            "  async aroundComplete(serverCall: any /* spell: type unknown */) {",
            '    core.console.log("about to")',
            "    await serverCall()",
            '    core.console.log("done")',
            "  }",
            "",
            "  static savedIn = {",
            '    place: "work",',
            '    collection: "jobs",',
            '    times: ["created", "modified"]',
            "  }",
            "",
            "  // - it lives in work",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in work",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", callsServer: true, cantBeUndone: "keeps history" })',
            'core.addActionHook(Job, "complete", { moment: "around", hook: "aroundComplete", level: "app" })',
            "export class Work extends Place {}",
            "export const work = core.place(new Work(), {",
            '  name: "work",',
            '  kind: "web server",',
            '  at: "https://jobs.test",',
            '  operations: { complete: "/jobs/{id}/complete" }',
            "})"
          ]
        },
        {
          title: "never calling the server warns",
          input: [
            "a job is a thing",
            'work is a web server at "https://jobs.test":',
            '\t- to complete a job is at "/jobs/{id}/complete"',
            "a job:",
            "\t- it lives in work",
            "to complete a job",
            '\tprint "never sent"'
          ],
          js: [
            "export class Job extends Thing {",
            "  async complete() {",
            '    return await core.callPlace("work", "complete", this)',
            "  }",
            "",
            "  aroundComplete(serverCall) {",
            '    core.console.log("never sent")',
            "  }",
            "",
            "  static savedIn = {",
            '    place: "work",',
            '    collection: "jobs",',
            '    times: ["created", "modified"]',
            "  }",
            "",
            "  // - it lives in work",
            '  static { this.declareProp("created", { type: "date" }) }',
            '  get created() { return this.getProp("created") }',
            '  set created(value) { this.setProp("created", value) }',
            "",
            "  // - it lives in work",
            '  static { this.declareProp("modified", { type: "date" }) }',
            '  get modified() { return this.getProp("modified") }',
            '  set modified(value) { this.setProp("modified", value) }',
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", callsServer: true, cantBeUndone: "keeps history" })',
            'core.addActionHook(Job, "complete", { moment: "around", hook: "aroundComplete", level: "app" })',
            "export class Work extends Place {}",
            "export const work = core.place(new Work(), {",
            '  name: "work",',
            '  kind: "web server",',
            '  at: "https://jobs.test",',
            '  operations: { complete: "/jobs/{id}/complete" }',
            "})"
          ],
          ts: [
            "export class Job extends Thing {",
            "  async complete() {",
            '    return await core.callPlace("work", "complete", this)',
            "  }",
            "",
            "  aroundComplete(serverCall: any /* spell: type unknown */) {",
            '    core.console.log("never sent")',
            "  }",
            "",
            "  static savedIn = {",
            '    place: "work",',
            '    collection: "jobs",',
            '    times: ["created", "modified"]',
            "  }",
            "",
            "  // - it lives in work",
            '  @prop({ type: "date" })',
            "  accessor created!: any /* spell: type unknown */",
            "",
            "  // - it lives in work",
            '  @prop({ type: "date" })',
            "  accessor modified!: any /* spell: type unknown */",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", callsServer: true, cantBeUndone: "keeps history" })',
            'core.addActionHook(Job, "complete", { moment: "around", hook: "aroundComplete", level: "app" })',
            "export class Work extends Place {}",
            "export const work = core.place(new Work(), {",
            '  name: "work",',
            '  kind: "web server",',
            '  at: "https://jobs.test",',
            '  operations: { complete: "/jobs/{id}/complete" }',
            "})"
          ]
        }
      ]
    }
  ]
})
places.addRule(CallTheServer, { syntax: "call (the server|{place:identifier})" })
places.addRule(ErrorIs, { syntax: "the error is {name:text}" })
places.addRule(Nevermind, { syntax: "(nevermind|never mind)" })
places.addRule(PassTheError, { syntax: "pass the error" })
places.addRule(AnyServerCallFails, {
  syntax: "(when|if) any server call fails (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "when any server call fails",
            '\tif the error is "not authorized"',
            '\t\tprint "sign in"',
            '\totherwise if the error is "limit"',
            "\t\tpass the error",
            "\totherwise",
            "\t\tdo nothing"
          ],
          js: [
            "core.addServerFailureStep((error) => {",
            '  if (core.errorIs(error, "not authorized")) core.console.log("sign in")',
            '  else if (core.errorIs(error, "limit")) return core.passTheError()',
            "  else core.doNothing()",
            "})"
          ]
        },
        {
          title: "a last if with no otherwise passes on what it didn't catch",
          input: ["if any server call fails", '\tif the error is "not found"', "\t\tnevermind"],
          js: [
            "core.addServerFailureStep((error) => {",
            '  if (core.errorIs(error, "not found")) return',
            "  return core.passTheError()",
            "})"
          ]
        }
      ]
    }
  ]
})
places.addRule(ThingWithId, { syntax: "the {type:known_type} whose id is {id:expression}" })
places.addRule(EveryThingMatching, {
  syntax: "every {type:known_type} (matching|which matches) {words:expression}",
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
      tests: [
        ["every artwork matching search", 'await core.savedThings(Artwork, { search: { "*": search } })'],
        ["every artwork which matches search", 'await core.savedThings(Artwork, { search: { "*": search } })']
      ]
    }
  ]
})
places.addRule(EveryThingMatching, {
  syntax: "(all|the)? {type:plural_type} (matching|which match) {words:expression}",
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
      tests: [
        ["all artworks matching search", 'await core.savedThings(Artwork, { search: { "*": search } })'],
        ["artworks matching search", 'await core.savedThings(Artwork, { search: { "*": search } })'],
        ["the artworks which match search", 'await core.savedThings(Artwork, { search: { "*": search } })']
      ]
    }
  ]
})
places.addRule(FirstFewWhere, {
  syntax: "the first {number} {type:plural_type} (where:where|which|that|who) {inline_expression}?"
})
places.addRule(NumberOfThingsWhere, {
  syntax: "the number of {type:plural_type} (where:where|which|that|who) {inline_expression}?"
})
places.addRule(
  Wording.specialize({ ruleName: "there_are_how_many", meanings: ["none", "fewer", "more", "at_least", "at_most"] }),
  { syntax: "((none:no)|(fewer:less than|fewer than)|(more:more than)|(at_least:at least)|(at_most:at most))" }
)
places.addRule(ThereAreThings, { syntax: `${THERE_ARE} (where:where|which|that|who) {inline_expression}?` })
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
places.addRule(SignInMenu, {
  syntax: "the sign in menu",
  tests: [{ compileAs: "expression", tests: [["the sign in menu", "core.signInMenu()"]] }]
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
