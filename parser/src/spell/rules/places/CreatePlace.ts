import { proto, snakeCase } from "spell/util"
import {
  DATA_FOLDER,
  PERSONAL_FOLDERS,
  SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
  SPACE_FOLDERS_PREFIX,
  SPACE_ROOMS_PREFIX,
  airtableBaseIn,
  isPlaceServerAddress
} from "spell/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { TypeDeclaration } from "spell/parser/spell/rules/classes/TypeDeclaration"
import { OperationAt } from "./OperationAt"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import { COLLECTION_NAME, PLACE_KIND_ABILITIES, isPlaceTypeReadOnly, placeKindWords } from "./places.shared"

/** A key in an address, which anyone reading a browser program can read:  `?key=...`, `user:secret@`. */
const KEY_IN_ADDRESS = /[?&](?:api[_-]?key|key|token|secret|access[_-]?token)=|\/\/[^/@\s]+:[^/@\s]+@/i

/**
 * What each word has been found to read as, by language:  reading a word rule's word tokenizes it, and this test runs on
 * every line of a program.
 */
const WORDS_READ = new Map<string, boolean>()

/** An account's name, as the protocol has it:  a DID. */
const ACCOUNT_DID = /^did:(?:plc|web):[A-Za-z0-9._:%-]+$/

/** An AT Protocol Space's address:  `at://<its owner's DID>/space/...`. */
const ATMOSPHERE_SPACE = /^at:\/\/did:(?:plc|web):[^/\s]+\/space\/\S+$/

/** The start of a collection's name:  a domain, backwards, of two parts or more. */
const CORNER_NAME = /^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/i

/** A data folder's name alone, `"recipes"`:  no slash, dot or colon, so it's no web address. */
const FOLDER_NAME = /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u

/** A CSV file's name alone, `"tasks.csv"`:  the program's own, in its project data folder (epic `language` T65). */
const CSV_FILE_NAME = /^[\p{L}\p{N}][\p{L}\p{N} _-]*\.csv$/iu

/**
 * `create_place` rule:  a program's data lives here (epic `data` P11, Q2).
 * - e.g. `family cookbook is a web server at "https://api.example.com/v1"`:  the ONE line a different back-end changes.
 * - e.g. `family cookbook is a database on this device`, `family cookbook is an in memory database`:  a kind with no address.
 * - e.g. `family cookbook is a personal atmosphere account`:  each person brings their own, so an address is optional:
 *   given, it's the corner of each account the program's records go in (`at "com.example.cookbook"`).
 * - `at` and `from` mean the same:  never read only.
 * - e.g. `family cookbook is a supabase project at "..."`:  a kind a library adds, a type made from `place`.
 * - The lines under it say the rest (`PlaceDetail`), and name its operations.
 * - Declares a type and its one instance, the variable `family_cookbook`, as `solitaire is an app` does.
 * - e.g. `family cookbook is an atmosphere account at "did:plc:abc123"`:  one account's records, anyone's to read (epic `data` P16).
 * - e.g. `family cookbook is an atmosphere space at "at://did:plc:abc123/space/family"`:  a group's own private space,
 *   every member writing to it (epic `data` Q32).
 *   - Only the words for now:  it compiles, and reading one says Spell can't reach those yet, until epic `atmosphere` takes
 *     Spaces out of trial.
 * - e.g. `family cookbook is an airtable at "appXXXXXXXXXXXXXX"`:  a base, through a server side that holds its key (epic `data` P19).
 * - A PROJECT DATA FOLDER, a data folder in spaces, served by the page server (epic `atmosphere` P1, `folderAddressFor()`):
 *   - `family cookbook is a data folder at "owen@spell/recipes"`:  a full address, that folder in that space
 *   - `... at "recipes"`:  a name alone, the program's own folder, shared by everyone who runs it (`<project>/__data/recipes`)
 *   - `... at personal "recipes"`:  one for each person, in their own space (`owen@spell/__data/recipes`)
 *   - Any other address is a folder on a web server, as before (`"recipes/"`, `"https://..."`).
 * - A SPACE'S LIVE ROOM, a room at a Spell address (epic `atmosphere` P36, `roomAddressFor()`):
 *   `team chat is a room at "events_team@rs/messages"` is the page server's room of that space's `messages`,
 *   written as each page's person, so the space's own checks hold.
 *   - Any other room's address is a referee's, as before (`"wss://..."`, `"/api/rooms/recipes"`).
 * - A PROGRAM'S OWN CSV FILE, in its project data folder (epic `language` T65, `csvAddressFor()`):
 *   `task sheet is a sheet at "tasks.csv"`, a file's name alone, is `<project>/__data/tasks.csv`, written through the page
 *   server, so it takes writes as a sheet at a place server does.
 *   - Any other sheet's address is a file at that address, read only (`"./tasks.csv"`, `"https://..."`).
 *   - `check it every` below what its server takes (`SPACE_FOLDER_CHECKS_AT_MOST_EVERY`) is raised to it,
 *     and the line says so.
 * - What it can't do is said here, at this line:
 *   - a key in its address won't compile
 *   - a place that can't announce what changed warns, unless it says how often to ask
 *   - An atmosphere account warns of what no referee can promise, and that everything in it is public (`warnOfNoReferee()`).
 *   - An Airtable warns of the last save winning, of fields it works out, of its limits, of a missing id column or key (`warnOfAirtable()`).
 * - Compiles to its class, then `core.place()`, handed everything the lines say.
 */
export class CreatePlace extends TypeDeclaration<
  "type|aka?|kind?|superType?|personal?|address?|each_tab?|with_nested_statements?|body?",
  {
    placeKind?: string
    /** A project data folder's address on the page server, as `folderAddressFor()` worked it out. */
    folderAt?: string
  }
> {
  @proto static priority = Priority.declaration + 1
  @proto static declares: P.DeclaresSpec = { kind: "type", name: "type" }

  /**
   * Quick test:  no article first, and `is` with something after it that could say where.
   * - So an editor doesn't offer `is a ...` after just any words, e.g. `set y`.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const { lang } = SP.Language.of(scope)
    const reads = (ruleName: string, token: P.Token | undefined) => {
      if (!(token instanceof P.WordToken)) return false
      const key = `${lang}\n${ruleName}\n${token.value}`
      let answer = WORDS_READ.get(key)
      if (answer === undefined) WORDS_READ.set(key, (answer = Wording.reads(scope, ruleName, `${token.value}`)))
      return answer
    }
    if (reads("indefinite_article", tokens[start])) return false
    const is = tokens.findIndex((token, index) => index > start && reads("is_or_is_not", token))
    if (is < 0 || !tokens[is + 1]) return false
    return super.test(scope, tokens, start)
  }

  /** A kind spell knows, or a type made from `place`;  anything else isn't ours. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    return match && this.placeChecked(match)
  }

  /**
   * `match`, a line that reads as a place, checked as a place:
   * - its kind and folder noted
   * - refused for what it can't be, and warned of what it can't do
   * - `undefined`:  it isn't one of ours after all
   */
  protected placeChecked(match: P.MatchFor<this>): P.Match | undefined {
    const { scope } = match
    const { superType, address, personal } = match.groups
    if (superType) {
      const { scopeType } = superType.data as { scopeType?: unknown }
      if (!(scopeType instanceof P.TypeScope) || !scopeType.isA("Place")) return undefined
    }
    const language = SP.Language.of(scope)
    if (address && KEY_IN_ADDRESS.test(textIn(address))) {
      return SpellStatement.refuse(match, language.parserMessage("key-written"))
    }
    const placeKind = this.placeKindOf(match)
    if (placeKind) match.data.placeKind = placeKind
    // `personal` goes only with a data folder:  another reading of the words may take it (`atmosphere personal`)
    if (personal && match.data.placeKind !== "data folder") return undefined
    if (personal && !FOLDER_NAME.test(textIn(address))) {
      return SpellStatement.refuse(
        match,
        language.parserMessage("personal-folder-a-name", { address: textIn(address) })
      )
    }
    const folderAt = this.folderAddressOf(match)
    if (folderAt) match.data.folderAt = folderAt
    const refused = this.refuseTakenNames(match)
    if (refused !== match) return refused
    const notAnAddress = this.refuseAtmosphereAddress(match) ?? this.refuseAirtableAddress(match)
    if (notAnAddress) return notAnAddress
    this.warnIfItCantSay(match)
    this.warnIfCheckedTooOften(match)
    this.warnOfNoReferee(match)
    this.warnOfAirtable(match)
    return match
  }

  /** Its kind's word, as `core.place()` knows it:  what its line says, `web server`;  a type made from `place`, none. */
  protected placeKindOf(match: P.MatchFor<this>): string | undefined {
    const { kind } = match.groups
    return kind ? placeKindWords(Wording.meaningOf(kind) ?? "") : undefined
  }

  /**
   * Where a data folder keeps its things, as the page server serves them:  `folderAddressFor()`;  a room at a space,
   * `roomAddressFor()`;
   * a sheet that's the program's own CSV file, `csvAddressFor()`;  any other kind, none.
   */
  protected folderAddressOf(match: P.MatchFor<this>): string | undefined {
    const { placeKind } = match.data
    if (placeKind === "data folder") return CreatePlace.folderAddressFor(match)
    if (placeKind === "room") return CreatePlace.roomAddressFor(match)
    return placeKind === "sheet" ? CreatePlace.csvAddressFor(match) : undefined
  }

  /** An atmosphere account's address has to be what the protocol can read:  a DID, or the start of a collection's name. */
  private refuseAtmosphereAddress(match: P.MatchFor<this>): P.Match | undefined {
    const { placeKind } = match.data
    const address = textIn(match.groups.address)
    const language = SP.Language.of(match.scope)
    if (placeKind === "atmosphere account" && !ACCOUNT_DID.test(address)) {
      return SpellStatement.refuse(match, language.parserMessage("atmosphere-not-an-account", { address }))
    }
    if (placeKind === "atmosphere space" && !ATMOSPHERE_SPACE.test(address)) {
      return SpellStatement.refuse(match, language.parserMessage("atmosphere-not-a-space", { address }))
    }
    if (placeKind === "personal atmosphere account" && match.groups.address && !CORNER_NAME.test(address)) {
      return SpellStatement.refuse(match, language.parserMessage("atmosphere-not-a-corner", { address }))
    }
    return undefined
  }

  /** An Airtable's address has to name a base:  `appXXXXXXXXXXXXXX`, Airtable's address for one, or a place server that holds one. */
  private refuseAirtableAddress(match: P.MatchFor<this>): P.Match | undefined {
    if (match.data.placeKind !== "airtable") return undefined
    const address = textIn(match.groups.address)
    if (isPlaceServerAddress(address) || airtableBaseIn(address)) return undefined
    return SpellStatement.refuse(match, SP.Language.of(match.scope).parserMessage("airtable-not-a-base", { address }))
  }

  /**
   * SIDE EFFECT:  says, at this line, what an Airtable can't promise (epic `data` P19, T11, I5):
   * - two people on one field:  the last save wins, with no notice, and an edit in Airtable's own window is the same
   * - it works some fields out, and can't be asked which from here:  a write to one is refused when it runs
   * - each page of a read is a request, and plans cap them
   * - with no id column, Airtable makes the id, so a new row sent again can double;  with no key named, it can't be reached
   */
  private warnOfAirtable(match: P.MatchFor<this>): void {
    if (match.data.placeKind !== "airtable") return
    const language = SP.Language.of(match.scope)
    SP.SpellWarnings.note(match, language.parserMessage("airtable-last-save-wins"))
    SP.SpellWarnings.note(match, language.parserMessage("airtable-worked-out-fields"))
    SP.SpellWarnings.note(match, language.parserMessage("airtable-calls-count"))
    const details = () => CreatePlace.detailsOf(match)
    SP.SpellWarnings.noteIf(
      match,
      language.parserMessage("airtable-no-id-column"),
      () => details().idColumn === undefined
    )
    const isItsOwnServer = isPlaceServerAddress(textIn(match.groups.address))
    const needsKey = language.parserMessage("airtable-needs-key")
    SP.SpellWarnings.noteIf(match, needsKey, () => !isItsOwnServer && details().keyNamed === undefined)
  }

  /**
   * SIDE EFFECT:  says, at this line, what a place with no referee can't promise (Q13, T9, T10):
   * - everything in it is public, for good
   * - each person can change only their own, and `everyone here` isn't who's looking
   * - it hands out pages and nothing else, so `where` and `sorted by` happen in the browser, and it holds no decimal numbers
   * - an account named under it, or a collection's name, has to be one the protocol can read:  won't compile
   */
  private warnOfNoReferee(match: P.MatchFor<this>): void {
    const { placeKind } = match.data
    if (!placeKind || !PLACE_KIND_ABILITIES[placeKind]?.hasNoReferee) return
    const language = SP.Language.of(match.scope)
    const words = { kind: language.placeKindWord(placeKind) }
    SP.SpellWarnings.note(match, language.parserMessage("atmosphere-public", words))
    SP.SpellWarnings.note(match, language.parserMessage("atmosphere-your-own", words))
    SP.SpellWarnings.note(match, language.parserMessage("atmosphere-reads-here", words))
    SP.SpellWarnings.refuseIf(
      match,
      () => atmosphereLineProblem(match) ?? "",
      () => atmosphereLineProblem(match) !== undefined
    )
  }

  /** SIDE EFFECT:  a plain web server can't announce what changed:  say so, unless a line under it says how often to ask. */
  private warnIfItCantSay(match: P.MatchFor<this>): void {
    const { placeKind } = match.data
    const abilities = placeKind ? PLACE_KIND_ABILITIES[placeKind] : undefined
    if (!placeKind || abilities?.saysWhatChanged || abilities?.isReadOnly) return
    if (abilities?.checkedEveryByDefault !== undefined) return
    const language = SP.Language.of(match.scope)
    const message = language.parserMessage("place-cant-announce", { kind: language.placeKindWord(placeKind) })
    SP.SpellWarnings.noteIf(match, message, () => CreatePlace.detailsOf(match).checkedEvery === undefined)
  }

  /**
   * SIDE EFFECT:  a project data folder whose line checks it more often than its server takes
   * warns that it's checked only that often.
   * - The running page raises it the same way (`PlaceCapabilities.checkedAtMostEvery`).
   */
  private warnIfCheckedTooOften(match: P.MatchFor<this>): void {
    if (!match.data.folderAt || match.data.placeKind !== "data folder") return
    const seconds = SPACE_FOLDER_CHECKS_AT_MOST_EVERY
    const message = SP.Language.of(match.scope).parserMessage("checked-at-most-every", { seconds: `${seconds}` })
    SP.SpellWarnings.noteIf(match, message, () => (CreatePlace.detailsOf(match).checkedEvery ?? seconds) < seconds)
  }

  /**
   * Where a data folder's line keeps its things, as the page server serves them:  `undefined` for a web folder.
   * - A full address, `owen@spell/recipes`:  that folder (`SP.SpellLocation.isAddress()`).
   * - `personal "recipes"`:  the asker's own, `personal/recipes`, which the server reads as theirs.
   * - `"recipes"` alone:  the program's own, in its project's `__data/`;  a project with no address (a test's) has none.
   * - A lookup of the scope:  call it WHILE PARSING.
   */
  static folderAddressFor(match: P.MatchFor<CreatePlace>): string | undefined {
    const at = textIn(match.groups.address)
    const { encodeAddress, encodePart } = SP.SpellUrls
    if (match.groups.personal) return `${SPACE_FOLDERS_PREFIX}/${PERSONAL_FOLDERS}/${encodePart(at)}`
    if (SP.SpellLocation.isAddress(at)) return `${SPACE_FOLDERS_PREFIX}/${encodeAddress(at)}`
    if (!FOLDER_NAME.test(at)) return undefined
    const project = projectAddressOf(match.scope)
    return project && `${SPACE_FOLDERS_PREFIX}/${encodeAddress(project)}/${DATA_FOLDER}/${encodePart(at)}`
  }

  /**
   * Where a room's line is shared live, when it names a space's collection by its Spell address:
   * `"events_team@rs/messages"` => `/api/rooms/spaces/events_team@rs/messages`, the page server's room of it.
   * - `undefined` for any other address:  a referee's own (`"wss://..."`), as written.
   */
  static roomAddressFor(match: P.MatchFor<CreatePlace>): string | undefined {
    const at = textIn(match.groups.address)
    if (!SP.SpellLocation.isAddress(at) || !at.includes("/")) return undefined
    return `${SPACE_ROOMS_PREFIX}/${SP.SpellUrls.encodeAddress(at)}`
  }

  /**
   * Where a sheet's line keeps its rows, when it's the program's own CSV file, `"tasks.csv"`:
   * `<project>/__data/tasks.csv`, as the page server serves it.
   * - `undefined` for any other address, and for a project with no address (a test's).
   * - A lookup of the scope:  call it WHILE PARSING.
   */
  static csvAddressFor(match: P.MatchFor<CreatePlace>): string | undefined {
    const at = textIn(match.groups.address)
    if (!CSV_FILE_NAME.test(at)) return undefined
    const project = projectAddressOf(match.scope)
    const { encodeAddress, encodePart } = SP.SpellUrls
    return project && `${SPACE_FOLDERS_PREFIX}/${encodeAddress(project)}/${DATA_FOLDER}/${encodePart(at)}`
  }

  /** SIDE EFFECT:  declares our type, its one instance, and what kind of place it is. */
  mutateScope(match: P.MatchFor<this>) {
    const { superType } = match.groups
    this.declareType(match, superType ? `${superType.value}` : "place")
    const words = `${match.groups.type.value}`
    const type = match.scope.getType(words)
    const { placeKind, folderAt } = match.data
    const placeName = CreatePlace.placeNameOf(match)
    type?.declarePlace({ placeName, ...(placeKind && { placeKind }), ...(folderAt && { placeAt: folderAt }) }, match)
    match.scope.variables?.add({
      name: placeName,
      datatype: type?.name ?? words,
      kind: "only",
      declaredBy: match
    })
  }

  /** The place's name, as `core.place()` knows it, and its variable's:  `family_cookbook`. */
  static placeNameOf(match: P.Match): string {
    return snakeCase(`${(match.groups.type as P.Match).raw}`.trim())
  }

  /**
   * What place `type`'s lines say that the compiler asks about, for a project importing it (epic `data` I19):
   * `undefined` when they say none of it.
   * - Only that:  a key's name and the like stay with the project that says them.
   */
  static importedDetailsOf(type: P.TypeScope): P.ImportedPlaceDetails | undefined {
    const { declaredBy } = type
    if (!declaredBy) return undefined
    const { checkedEvery, searches, collections } = CreatePlace.detailsOf(declaredBy)
    const collectionsKept = Object.fromEntries(
      Object.entries(collections ?? {})
        .map(([name, { at, searches: own, searchedOnly, askedBy }]) => {
          const kept: P.ImportedPlaceCollection = definedProps({ at, searches: own, searchedOnly, askedBy })
          return [name, kept] as const
        })
        .filter(([, kept]) => Object.keys(kept).length)
    )
    const details: P.ImportedPlaceDetails = definedProps({
      checkedEvery,
      searches,
      readOnly: isPlaceTypeReadOnly(type) || undefined,
      collections: Object.keys(collectionsKept).length ? collectionsKept : undefined
    })
    return Object.keys(details).length ? details : undefined
  }

  /** Everything the lines under `match` say, merged. */
  static detailsOf(match: P.Match): PlaceDetailValue & { operations?: Record<string, string> } {
    const details: PlaceDetailValue & { operations?: Record<string, string> } = {}
    const seen = new Set<P.Match>()
    const visit = (each: P.Match) => {
      if (seen.has(each)) return
      seen.add(each)
      if (each.rule instanceof PlaceDetail) mergeDetail(details, each.rule.detailOf(each as never))
      if (each.rule instanceof OperationAt) {
        const operation = OperationAt.operationOf(each)
        if (operation) (details.operations ??= {})[operation.name] = operation.at
      }
      for (const item of each.matched) if (item instanceof P.Match) visit(item)
      for (const value of Object.values(each.data)) {
        for (const item of [value].flat()) if (item instanceof P.Match) visit(item)
      }
    }
    const body = (match.rule as CreatePlace).getBody(match as never)
    if (body) visit(body)
    givenOnlyToItsSearch(details)
    return details
  }

  /** What `core.place()` is handed:  its name, kind and address, then everything its lines say. */
  protected descriptionOf(match: P.MatchFor<this>): Record<string, unknown> {
    const { address } = match.groups
    const { placeKind, folderAt } = match.data
    return {
      name: CreatePlace.placeNameOf(match),
      ...(placeKind && { kind: placeKind }),
      ...((address || folderAt) && { at: folderAt ?? textIn(address) }),
      ...checkedByDefault(placeKind),
      ...CreatePlace.detailsOf(match),
      ...unclearNumbersOf(match.scope)
    }
  }

  /** Its class, then `core.place()`, as one instance:  `export const familyCookbook = core.place(new FamilyCookbook(), {...})`. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, superType } = match.groups
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const description = this.descriptionOf(match)
    const thing = new P.ASTNewInstanceExpression(match, { type: typeAST })
    const made = new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: CreatePlace.placeNameOf(match) }),
      value: new P.ASTCoreMethodInvocation(match, {
        methodName: "place",
        args: [thing, plainValueAST(match, description)]
      }),
      isNewVariable: true
    })
    const superTypeAST = superType
      ? P.matchAST<P.ASTTypeExpression>(superType)
      : new P.ASTTypeExpression(match, { name: "Place" })
    return new P.ASTStatementGroup(match, {
      statements: [new P.ASTClassDeclaration(match, { type: typeAST, superType: superTypeAST }), made]
    })
  }
}

/** What's wrong with the lines under an atmosphere account:  an account, or a collection's name, the protocol can't read. */
function atmosphereLineProblem(match: P.MatchFor<CreatePlace>): string | undefined {
  const { accounts = [], collections = {} } = CreatePlace.detailsOf(match)
  const language = SP.Language.of(match.scope)
  const account = accounts.find((did) => !ACCOUNT_DID.test(did))
  if (account) return language.parserMessage("atmosphere-not-an-account", { address: account })
  const named = Object.values(collections).find(({ at }) => at?.includes(".") && !COLLECTION_NAME.test(at))?.at
  return named ? language.parserMessage("atmosphere-not-a-collection", { address: named }) : undefined
}

/** The address of the project `scope` is in, `@spell/examples/RecipeBox`:  `undefined` for one with none, as a test's. */
function projectAddressOf(scope: P.Scope): string | undefined {
  for (let each: P.Scope | undefined = scope; each; each = each.parentScope) {
    if (each instanceof P.ProjectScope)
      return each.path && SP.SpellLocation.isAddress(each.path) ? each.path : undefined
  }
  return undefined
}

/**
 * How often a place is asked what changed, for a kind with a default of its own (the cloud).
 * - What its line says wins.
 */
function checkedByDefault(placeKind: string | undefined): { checkedEvery?: number } {
  const seconds = placeKind ? PLACE_KIND_ABILITIES[placeKind]?.checkedEveryByDefault : undefined
  return seconds === undefined ? {} : { checkedEvery: seconds }
}

/** A number its text can't settle, "1,200", read the way the program's language writes one (epic `data` P23). */
export function unclearNumbersOf(scope: P.Scope): { unclearNumbers?: string } {
  return SP.Language.of(scope).decimalMark === "," ? { unclearNumbers: "," } : {}
}

/** `from` merged into `into`:  a collection's mapping field by field. */
function mergeDetail(into: PlaceDetailValue, { collections, accounts, ...rest }: PlaceDetailValue): void {
  if (rest.listsUnder) rest.listsUnder = listsUnderMerged(into.listsUnder, rest.listsUnder)
  if (rest.projection) {
    const where = { ...into.projection?.where, ...rest.projection.where }
    rest.projection = { ...into.projection, ...rest.projection, ...(Object.keys(where).length && { where }) }
  }
  if (rest.sheet) {
    // two `at most ... for each ...` lines keep both (P31)
    const most = [into.sheet?.mostEach, rest.sheet.mostEach].flat().filter((each) => each !== undefined)
    rest.sheet = { ...into.sheet, ...rest.sheet, ...(most.length > 1 && { mostEach: most }) }
  }
  Object.assign(into, rest)
  if (accounts) (into.accounts ??= []).push(...accounts)
  for (const [name, { at, fields, searchedOnly, pictures, askedBy, searches }] of Object.entries(collections ?? {})) {
    const held = ((into.collections ??= {})[name] ??= {})
    if (searches) held.searches = searches
    if (at !== undefined) held.at = at
    if (fields) held.fields = { ...held.fields, ...fields }
    if (searchedOnly) held.searchedOnly = true
    if (pictures) held.pictures = { ...held.pictures, ...pictures }
    if (askedBy) held.askedBy = askedBy
  }
}

/**
 * SIDE EFFECT:  a collection searched at its own address, with no other line saying where it is,
 * is given only to its search, there:  GitHub's `repositories are searched with "q" at "/search/repositories"`.
 */
function givenOnlyToItsSearch({ collections = {} }: PlaceDetailValue): void {
  for (const held of Object.values(collections)) {
    if (held.at !== undefined || held.searches?.at === undefined) continue
    held.at = held.searches.at
    held.searchedOnly = true
  }
}

/** The lists under each collection's things that two lines say, together:  a post's comments, and a user's todos. */
function listsUnderMerged(
  said: PlaceDetailValue["listsUnder"],
  more: NonNullable<PlaceDetailValue["listsUnder"]>
): NonNullable<PlaceDetailValue["listsUnder"]> {
  const merged = { ...said }
  for (const [collection, lists] of Object.entries(more)) merged[collection] = { ...merged[collection], ...lists }
  return merged
}

/** `value`, plain data, as an expression. */
export function plainValueAST(match: P.Match, value: unknown): P.ASTExpression {
  if (typeof value === "number") return new P.ASTNumericLiteral(match, { value })
  if (typeof value === "boolean") return new P.ASTBooleanLiteral(match, value)
  if (typeof value === "string") return new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
  if (Array.isArray(value)) {
    return new P.ASTListExpression(match, { items: value.map((each) => plainValueAST(match, each)) })
  }
  const properties = Object.entries(value as object).map(
    ([property, each]) =>
      new P.ASTObjectLiteralProperty(match, {
        property: property as never,
        value: plainValueAST(match, each)
      })
  )
  return new P.ASTObjectLiteral(match, { properties })
}

/** `record` without its `undefined` props. */
function definedProps<T extends object>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as T
}
