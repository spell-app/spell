/**
 * The types of a PLACE:  where data lives, Spell's word for a back-end (epic `data`).
 * - The bottom of this folder:  it imports nothing, and every file here imports it.
 * - Knows nothing of Things, Spell's words or how a place reaches its data.
 * - NOT preferences' `PrefPlace`:
 *   - that one never throws, because a failed read just means the default
 *   - a `Place` throws when it fails, because data has to say so
 *   - `DevicePlace` joins the two
 */

////////////////
// ## Rows
////////////////

/** What a source writes for a number it hasn't got. */
export const NO_NUMBER = /^\s*(?:|unknown|none|n\/a|na|null|-)\s*$/i

/** Which mark a source writes between a number's whole part and its fraction:  `1,200.5` or `1.200,5`. */
export type DecimalMark = "." | ","

/** A space between digit groups, `1 200`:  a plain one, or either of the ones that don't break. */
const GROUP_SPACE = /(\d)[   ](?=\d{3}(?:\D|$))/g

/** What's left of a number written as text once its group spaces go:  a sign, digits, dots and commas. */
const DIGITS_AND_MARKS = /^[+-]?(?=[\d.,]*\d)[\d.,]+$/

/** Whole groups of three after the first:  `1,200,000` by commas, `1.200.000` by dots. */
const GROUPED = { ",": /^\d{1,3}(?:,\d{3})+$/, ".": /^\d{1,3}(?:\.\d{3})+$/ }

/**
 * The number `text` writes, or `undefined` if it isn't one:  `"172"`, `"-1.5"`, `"1,200"`, `"1 200"`, `"1.200,5"`.
 * - Which mark is the fraction's:  `decimalMark`, what the source is known to write;  else the text says, when it can;
 *   else `unclear`, how the program's language writes one (a comma in Spanish);  else a dot:
 *   - both marks:  the last one, `1,200.5`, `1.200,5`
 *   - one comma, every group after it 3 digits:  thousands, `1,200` is 1200;  else the fraction, `1,5` is 1.5
 *   - dots:  the fraction, unless there's more than one, `1.200.000`
 * - A mark between groups must have 3 digits after it, every time:  `1,20,0` isn't a number.
 * - NEVER throws.
 */
export function numberInText(text: string, decimalMark?: DecimalMark, unclear?: DecimalMark): number | undefined {
  const written = text.trim().replace(GROUP_SPACE, "$1")
  if (!DIGITS_AND_MARKS.test(written)) return undefined
  const mark = decimalMark ?? decimalMarkOf(written) ?? unclear ?? "."
  const group = mark === "." ? "," : "."
  const [whole = "", fraction, extra] = written.replace(/^[+-]/, "").split(mark)
  if (extra !== undefined || (fraction !== undefined && !/^\d+$/.test(fraction))) return undefined
  if (whole.includes(group) && !GROUPED[group].test(whole)) return undefined
  if (!whole && fraction === undefined) return undefined
  const sign = written.startsWith("-") ? "-" : ""
  const number = Number(`${sign}${whole.replaceAll(group, "") || "0"}.${fraction ?? "0"}`)
  return Number.isNaN(number) ? undefined : number
}

/**
 * Which mark is the fraction's, as `texts` show it:  `undefined` when none of them says.
 * - a comma:  `1,5`, `3,75`, `1.200,5`
 * - a dot:  `1.5`, `1,200.5`
 * - nothing:  `1,200` or `172` alone
 * - Some say one and some the other:  a dot, the usual.
 */
export function decimalMarkIn(texts: readonly string[]): DecimalMark | undefined {
  const said = new Set<DecimalMark>()
  for (const text of texts) {
    const written = text.trim().replace(GROUP_SPACE, "$1")
    const mark = DIGITS_AND_MARKS.test(written) ? decimalMarkOf(written) : undefined
    if (mark) said.add(mark)
  }
  if (said.size > 1) return "."
  return [...said][0]
}

/** The fraction's mark, if `written` alone shows it. */
function decimalMarkOf(written: string): DecimalMark | undefined {
  const comma = written.lastIndexOf(",")
  const dot = written.lastIndexOf(".")
  const unsigned = written.replace(/^[+-]/, "")
  if (comma >= 0 && dot >= 0) return comma > dot ? "," : "."
  if (comma >= 0) return GROUPED[","].test(unsigned) ? undefined : ","
  if (dot >= 0) return GROUPED["."].test(unsigned) && unsigned.split(".").length > 2 ? "," : "."
  return undefined
}

/** How long a text is before losing it is worth a notice, in characters:  a title just flips once, a paragraph is kept (J1). */
const LONG_TEXT_CHARS = 40

/** Is `value` long text:  several words someone would miss, or several lines? */
export function isLongText(value: unknown): boolean {
  return typeof value === "string" && (value.length >= LONG_TEXT_CHARS || value.includes("\n"))
}

/** One saved thing, as a place holds it:  plain fields by name. */
export type PlaceRow = Record<string, unknown>

/**
 * `row`'s id, as text, under the field `idField`:  `undefined` when there's no such field, or no value in it.
 * - A place's own ids may be numbers (`12`), but everything above a place speaks text (`"12"`).
 */
export function idOfRow(row: PlaceRow, idField: string | undefined): string | undefined {
  const id = idField === undefined ? undefined : row[idField]
  return id === undefined || id === null ? undefined : `${id as string | number}`
}

////////////////
// ## What a place can do
////////////////

/** Every way a place can page through a list. */
export const PageKinds = ["none", "offset", "cursor", "range"] as const
/** How a place pages through a list:  see `PageKinds`. */
export type PageKind = (typeof PageKinds)[number]

/** Every kind of write there is. */
export const WriteKinds = ["insert", "update", "delete"] as const
/** One kind of write:  see `WriteKinds`. */
export type WriteKind = (typeof WriteKinds)[number]

/** Every way a place can tell us that something changed:  `"none"` means the engine polls. */
export const LiveKinds = ["none", "poll", "notify", "push"] as const
/** How a place tells us that something changed:  see `LiveKinds`. */
export type LiveKind = (typeof LiveKinds)[number]

/** Every way aborting a request can work. */
export const AbortKinds = ["hard", "soft"] as const
/**
 * What aborting a request does:
 * - `"hard"`:  the request really stops
 * - `"soft"`:  it runs on, and we only ignore its answer
 */
export type AbortKind = (typeof AbortKinds)[number]

/** What a place does itself for each field:  all of them, none, or the fields named. */
export type FieldAbility = "every field" | "none" | readonly string[]

/**
 * Can a place with `ability` do this for every one of `fields`?
 * - No fields:  there's nothing to do, so yes.
 */
export function canDoAll(ability: FieldAbility, fields: readonly string[]): boolean {
  if (ability === "every field") return true
  if (ability === "none") return !fields.length
  return fields.every((field) => ability.includes(field))
}

/**
 * How much the engine will load in the browser, for what a place can't do itself.
 * - Filtering a 2 GB file in the browser looks exactly like asking a server, so it stops here, with an error.
 */
export type PlaceCeiling = {
  /** The most rows it will look at. */
  rows: number
  /** About the most bytes:  the length of those rows, as JSON. */
  bytes: number
}

/** The request limit a place lives under, e.g. Airtable's 5 requests a second, 10 records in each. */
export type RateLimit = {
  /** How many requests it takes ... */
  requests: number
  /** ... in this many seconds. */
  perSeconds: number
  /** How many changes one request can hold. */
  changesPerRequest?: number
  /** How long a limit hit lasts, in seconds, for a service whose answer doesn't say:  Airtable's is 30. */
  waitAfterHitSeconds?: number
}

/**
 * What a place says it can do:  its answer to `describe()`.
 * - What's missing, the engine does instead, the same way for every place.
 */
export type PlaceCapabilities = {
  /**
   * What sort of place it is, in words for people, e.g. `"web server"`:  what the side bar says beside its name.
   * - Words only, never a thing to branch on:  branch on what it can do.
   * - Left out:  nobody said.
   */
  kind?: string
  /** Is it a sample, standing in while designing (`SamplePlace`)?  Left out:  no. */
  isSample?: boolean
  /** The field holding a row's id.  Left out:  rows share no identity, and stay inside their list. */
  idOf?: string
  /** Is the id made by the place, as Airtable's are?  Left out:  whoever inserts a row names its id. */
  makesIds?: boolean
  /** Which fields it filters by itself. */
  filter: FieldAbility
  /** Which fields it searches by itself, for text they hold (`ListQuery.search`).  Left out:  none. */
  search?: FieldAbility
  /** Which fields it sorts by itself. */
  sort: FieldAbility
  /** Which fields it can leave out of an answer. */
  select: FieldAbility
  /** How it pages through a list. */
  page: PageKind
  /** The kinds of write it ever takes.  Per thing and per field:  `Place.canWrite()`. */
  write: "none" | readonly WriteKind[]
  /**
   * Who may write, by who's asking (`WhoWrites`).
   * - Left out:  who's asking makes no difference.
   * - Lets the compiler know, with no thing in hand;  `Place.canWrite()` answers for one thing.
   */
  whoWrites?: WhoWrites
  /** Does it apply many changes all or nothing? */
  atomic: boolean
  /** Does it refuse a change whose `version` is out of date?  Airtable doesn't. */
  versionCheck?: boolean
  /**
   * Does it take a change that says what happened, not only the value after it:  an addition (`PlaceChange.adds`), and items
   * added to or moved in a list (`PlaceChange.list`)?  A room does, so two at once both count.
   * - Left out:  `PendingChanges` works out the whole value, and sends that, so the last save wins.
   */
  edits?: boolean
  /** How it tells us that something changed. */
  live: LiveKind
  /** The limit it lives under, if it has one. */
  rateLimit?: RateLimit
  /**
   * The least time between two asks of what changed, in seconds, that the place's server will take
   * (epic `atmosphere` P1):  a program's `check it every` below it is raised to it.
   * - Left out:  as often as the program says.
   */
  checkedAtMostEvery?: number
  /**
   * Who it takes the person asking to be, when nobody's signed in:  `"this machine"`'s one person, called the same on
   * every machine until sign-in (`owen@spell`), and the page says so (epic `atmosphere` P1).
   * - `"a sign-in"`:  nobody, until someone signs in (the cloud, epic `atmosphere` P8):  a `RemotePlace` then asks its
   *   server nothing, shows none of its rows, and keeps what's changed in this browser, pending, until someone signs in;
   *   then it goes up, through the save queue, as any pending change does
   * - Left out:  it knows, or it doesn't care.
   */
  identifiesBy?: "this machine" | "a sign-in"
  /** What aborting one of its requests does. */
  abort: AbortKind
  /** How much the engine will load for what this place can't do, over the usual `DEFAULT_CEILING`. */
  ceiling?: Partial<PlaceCeiling>
}

////////////////
// ## Asking a place
////////////////

/** The field a row says who owns it in:  an atmosphere account's (where a record came from), a project data folder's. */
export const OWNER_FIELD = "owner"

/**
 * The field a row says who last wrote it in:  a person's address, `ana@spell` (epic `atmosphere` P4, Q6).
 * - A project data folder writes it on every thing it makes or changes, from who's asking:  a change can't claim it.
 * - In a space written by its members, `owner` is the space's own id (`@family`), so this is who did it.
 * - Like `owner`, it's the place's to say:  a program's own type doesn't declare it, and `PlaceCopy` leaves it out.
 * - The word list's word for who wrote something, in data (`agents/coherence/words.md`, "from / by").
 */
export const BY_FIELD = "by"

/**
 * Who may write a place, by who's asking:
 * - `"only the owner"`:  each thing can be changed by whoever owns it, and nobody else, as on AT Protocol
 * - `"its members"`:  every thing is the space's own (`owner` is its id, `@family`), and any member whose role writes
 *   may change any of it, as in an AT Protocol Space (epic `atmosphere` P4, Q1);  who did is `by`
 */
export type WhoWrites = "only the owner" | "its members"

/**
 * One member of a space, and what their role lets them do (epic `atmosphere` P4, T6).
 * - The shape of AT Protocol's lists (proposal 0001), as a Spaces member list has it:  each member a read flag and a
 *   write flag;  a list's managers manage it.
 * - Joining, leaving and becoming a manager are a membership added, removed, or given the manager role
 *   (`SPACE_MEMBER_OPERATIONS`).
 */
export type SpaceMember = {
  /** Who, by their address:  `ana@spell`.  0001's `subject`. */
  person: string
  /** Their role in the space:  viewer, editor or manager (the app's `SPACE_ROLES`;  epic `atmosphere` P20). */
  role: string
  /** May they read the space?  Every member may. */
  canRead: boolean
  /** May they write it?  Not a viewer. */
  canWrite: boolean
  /** May they add, remove and change its members?  A manager. */
  canManage: boolean
}

/**
 * What a space written by its members answers, as a place's operations (`Place.call()`, through `PlaceServer`'s `call`):
 * - `members`:  no input;  every `SpaceMember`, for anyone who's one
 * - `addMember`:  `{ person, role }`;  a membership added, or its role changed:  for its managers
 * - `removeMember`:  `{ person }`;  a membership removed:  for its managers, or the member leaving
 * - `settings`:  no input;  the space's `SpaceSettings`, for anyone who may read it (epic `atmosphere` P7, Q13)
 * - `changeSettings`:  part of a `SpaceSettings`;  the settings after it:  for its managers
 * - `deleteSpace`:  no input;  every thing in it, its members and settings removed, for good:  for its managers
 */
export const SPACE_MEMBER_OPERATIONS = {
  members: "members",
  add: "addMember",
  remove: "removeMember",
  settings: "settings",
  changeSettings: "changeSettings",
  deleteSpace: "deleteSpace"
} as const

/**
 * A space's projections, as its own operations, through the same route's `call` (epic `atmosphere` P17):
 * - `projections`:  what it projects, by name (a member's read)
 * - `setProjection`:  `{ name, ...Projection }`, kept and rebuilt (a manager of both spaces)
 * - `rebuildProjection`:  `{ name }`, written again from nothing (a manager)
 */
export const SPACE_PROJECTION_OPERATIONS = {
  projections: "projections",
  set: "setProjection",
  rebuild: "rebuildProjection"
} as const

/**
 * Part of a space's data, written into another space where its readers can see it (epic `atmosphere` P17):
 * what a program's `... is a projection of ...` line compiles to, and what the source space keeps.
 * - Only the fields named are shown:  a field added later stays private until someone names it.
 * - Rebuilt from the source whenever asked, so nothing is lost.
 */
export type Projection = {
  /** The space it's written into, by its address:  `@rs/picnic`. */
  into: string
  /** The fields shown, by name:  `["person", "shift"]`. */
  fields: string[]
  /** Only things whose field has this text, by field:  `{ status: "confirmed" }`.  Left out:  every thing. */
  where?: Record<string, string>
}

/** `projection`, given, keeps `row`:  its every `where` field has that text. */
export function isInProjection(projection: Pick<Projection, "where">, row: PlaceRow): boolean {
  return Object.entries(projection.where ?? {}).every(([field, text]) => {
    const value = row[field]
    return (typeof value === "string" || typeof value === "number" || typeof value === "boolean") && `${value}` === text
  })
}

/**
 * What `projection` shows of `row`:  its id and the fields named, those it has;  `undefined` for a row it leaves out.
 * - Its owner and who wrote it are the target's to say, as `PlaceCopy` leaves them.
 */
export function projectedRow(projection: Projection, row: PlaceRow): PlaceRow | undefined {
  if (!isInProjection(projection, row)) return undefined
  const shown: PlaceRow = {}
  for (const field of projection.fields) if (row[field] !== undefined) shown[field] = row[field]
  return shown
}

/**
 * Who besides its members may read and write a space:  both off unless a manager turns them on, as an AT Protocol
 * Space's member space has them (epic `atmosphere` P7, Q13).
 * - a family cookbook:  both off
 * - a club's events page:  `publicRead`
 * - a sign-up sheet:  both
 */
export type SpaceSettings = {
  /** Anyone, signed in or not, reads it, and is given a credential to read it direct:  not only its members. */
  publicRead: boolean
  /**
   * Anyone signed in adds things of their own, and changes or removes only those:  the ones whose `by` is them.
   * - Its members still change every thing, as before.
   */
  publicWrite: boolean
  /**
   * Its viewers post and comment, and change or remove their own posts and comments (epic `atmosphere` P23, Q21 D).
   * - On unless a manager turns it off:  everyone in an org may post in its shared spaces, as the Spaces guide has it.
   * - Left out (an older file, a real Space's policy):  on.
   */
  viewersPost?: boolean
}

/** A space's settings when nobody has changed them:  members only, and its viewers post. */
export const SPACE_SETTINGS_DEFAULT: SpaceSettings = { publicRead: false, publicWrite: false, viewersPost: true }

/** Who a credential to read a space direct is for, when nobody's signed in:  a space anyone reads (`publicRead`). */
export const ANYONE = "anyone"

/** What every request carries. */
export type PlaceContext = {
  /** Aborted when nobody wants the answer any more. */
  signal?: AbortSignal
  /** Who's asking, as the place knows them:  it decides what they own. */
  identity?: string
  /** The page is going away:  the request has to outlive it, as `fetch`'s `keepalive` does. */
  keepalive?: boolean
}

/** `PlaceContext`, plus which fields the answer needs. */
export type SelectingContext = Prettify<
  PlaceContext & {
    /** The fields wanted:  a place that can't leave any out answers with them all. */
    select?: readonly string[]
  }
>

/** One field to sort by. */
export type SortField = {
  /** The field's name. */
  field: string
  /** Largest first?  Left out:  smallest first. */
  descending?: boolean
}

/** Which page of a list to answer with. */
export type PageAsk = {
  /** How many rows, at most. */
  size?: number
  /**
   * Where to start:  the last answer's `nextPage`.  Left out:  the first page.
   * - It means what that answer meant:  the place's own cursor, or a place in the list when the engine did the filtering
   *   (`PlaceQuery`).  Hand it back as it is, and it comes out right either way.
   */
  at?: string
}

/**
 * The field a search names for text anywhere in a row (`ListQuery.search`;  epic `data` P34):
 * the Met Museum's `?q=sunflowers` looks in every field of each object, its tags too.
 */
export const ANY_FIELD = "*"

/** What to list. */
export type ListQuery = {
  /**
   * Only the rows with these ids:  each an id, or a whole address on a server whose rows name themselves.
   * - What following a link reads (`core.linked()`):  a place with `getMany()` asks for just those.
   * - One it doesn't hold is left out.
   */
  ids?: readonly string[]
  /**
   * The rows a list under one thing holds, at its own address there (epic `data` P30):
   * a post's comments, `/posts/1/comments`.
   * - A web server's path under its address, or a whole address.
   * - Only a place with lists under its things is handed one:  a web server's `- a post's comments live at "..."`.
   */
  under?: string
  /** Only rows whose field holds this value, for every field named. */
  filter?: Record<string, unknown>
  /**
   * Only rows whose field holds this text, capitals aside, for every field named:  a search, `its name includes "sky"`.
   * - A place that searches (`PlaceCapabilities.search`) may match more loosely than that, so a program checks what it gets.
   * - `ANY_FIELD` for a field:  the text anywhere in the row, as a server that searches all of each thing does
   *   (`every object matching "sunflowers"`;  epic `data` P34).
   */
  search?: Record<string, string>
  /** The order, the first field first. */
  sort?: readonly SortField[]
  /** The fields wanted. */
  select?: readonly string[]
  /** Which page. */
  page?: PageAsk
}

/** One list of `Place.listMany()`. */
export type ListAsk = {
  /** The collection. */
  collection: string
  /** What to list. */
  query: ListQuery
}

/** Which parts of a `ListQuery` the place did itself:  each one left out is the engine's to do. */
export type ListHandled = {
  /** It filtered. */
  filter?: boolean
  /** It searched. */
  search?: boolean
  /** It sorted. */
  sort?: boolean
  /** It left out the fields nobody selected. */
  select?: boolean
}

/**
 * What a program's lines say about a place on a server side, sent with every request:  the program is the one source of them.
 * - Never a key:  only the NAME of one the server side already holds, which it checks.
 * - They rename and choose within what the server side already serves, so they can't reach anything further.
 */
export type PlaceLines = {
  /** Each collection's name there, and its fields' names there, by what the program calls them. */
  collections?: Record<string, { at?: string; fields?: Record<string, string> }>
  /** The column holding a row's id. */
  idColumn?: string
  /** The NAME of the key the program says it needs. */
  keyNamed?: string
  /** How often it's asked what changed, in seconds. */
  checkedEvery?: number
}

/** A place's answer to `list()`. */
export type ListAnswer = {
  /** The rows. */
  rows: PlaceRow[]
  /** What to ask for next, as `PageAsk.at`:  to a reader, it means nothing else.  Left out:  this is the last page. */
  nextPage?: string
  /** Where the place stood when it answered:  for `changesSince()`, and a change's `version`. */
  version?: string
  /** Which parts of the query it did itself. */
  handled: ListHandled
  /**
   * What it wants known about these rows, in words for whoever keeps the data:  a row left out, and why.
   * - The answer still stands:  what's wrong with ONE row of a sheet someone keeps by hand shouldn't blank the page.
   * - `PlaceResult.notes` shows them;  `PlaceQuery` adds one of its own for rows that share no identity.
   */
  notes?: string[]
  /**
   * The fields that read, and take no write, as far as the place knows:  Airtable's formulas, lookups and rollups.
   * - For a place behind a server side, whose `canWrite()` a browser can't call:  `RemotePlace` keeps them, and answers from them.
   */
  readOnlyFields?: string[]
}

/** One change to one thing. */
export type PlaceChange = {
  /** What it does. */
  kind: WriteKind
  /** The collection it's in. */
  collection: string
  /** The thing's id.  Left out only on an insert into a place that makes its own. */
  id?: string
  /** The fields written. */
  fields?: PlaceRow
  /** An update's additions, by field:  `{ servings: 1 }` adds 1 to what's there, whoever else is adding.  See `edits`. */
  adds?: Record<string, number>
  /** An update's changes to list fields, one item at a time, by field.  See `edits`. */
  list?: Record<string, ListEdit[]>
  /**
   * The version this change was made from (`Place.versionOf()`):  a place with `versionCheck` refuses it, `"out of date"`,
   * if the thing has moved on;  a room lets it win, and says who it overwrote.
   * Only an update carries one:  a delete wins over what someone's editing.
   */
  version?: string
  /**
   * Names this one change:  sent again with no answer, it has the same one, so a place that remembers them makes it once.
   * - A place that doesn't remember:  writing the same field again is harmless, and an insert with its id replaces
   *   what the first made;  an insert into a place that `makesIds` is the one that can double.
   */
  changeId?: string
}

/**
 * One item of a list field added, moved or gone, without saying anything about the others:  what `PlaceChange.list` holds.
 * - So two people adding at once both stay, and a move can't double or lose an item.
 */
export type ListEdit = {
  /** Names the item in its list:  `listItemKeys()`. */
  key: string
  /** Its position:  `positionBetween()`.  Left out:  it's gone. */
  at?: string
  /** The item, as JSON, when it's added. */
  item?: unknown
}

/** A place's answer to `apply()`. */
export type ApplyAnswer = {
  /** Each row inserted or updated, as it's now kept:  with any id the place made. */
  rows: PlaceRow[]
  /** Where the place stands now. */
  version?: string
  /** What the place wants known about the save:  an Excel file's, that its cell colours and fonts are gone (`ExcelPlace`). */
  notes?: string[]
}

/** Who someone is, as a place knows them. */
export type PlacePerson = {
  /** What tells them apart from other people, across visits. */
  id: string
  /** What they're called. */
  name: string
}

/** One person, at one page:  two windows of one person are two of these. */
export type PersonHere = PlacePerson & {
  /** Which page:  what the place calls it, new with each visit. */
  page: string
}

/** Every place a sign-in can stand. */
export const SignInStatuses = ["signed out", "signing in", "waiting for a code", "signed in", "ended"] as const
/**
 * Where a person's sign-in stands:
 * - `"signed out"`:  nobody is
 * - `"signing in"`:  on the way
 * - `"waiting for a code"`:  an email went out with a link and a code (epic `atmosphere` P3, Q11):
 *   the page waits for the link to be opened on any device, or for the code to be typed here (`enterCode()`)
 * - `"signed in"`
 * - `"ended"`:  they were, and it ran out or was taken back:  what they changed is still kept, for when they're back
 */
export type SignInStatus = (typeof SignInStatuses)[number]

/** The kinds of account a person signs in with, each named apart on the sign-in bar. */
export const SignInAccounts = ["Spell account", "atmosphere account"] as const
/**
 * Which kind of account a sign-in is:
 * - `"Spell account"`:  `ana@spell`, signed in by email (`SpellSignIn`)
 * - `"atmosphere account"`:  a Bluesky one (`AtProtoSignIn`)
 */
export type SignInAccount = (typeof SignInAccounts)[number]

/** A person signing in to a place, and out.  Who they are is the place's:  `Place.currentPerson()`. */
export type PlaceSignIn = {
  /** Where it stands. */
  readonly status: SignInStatus
  /** Which kind of account it is.  Left out:  an atmosphere account, the first kind. */
  readonly account?: SignInAccount
  /** Why the last try failed, in words for people. */
  readonly problem?: string | undefined
  /**
   * Sign in as `who`, in the place's own way of naming people.  May leave the page, and come back.  - throws if it can't
   * - A Spell account's `who` is an email:  the sign-in then waits for a code (`"waiting for a code"`).
   */
  signIn(who: string): Promise<void>
  /**
   * Type the code an email carried, while `"waiting for a code"`.  Left out:  a sign-in with no code step.
   * - A wrong one says so (`problem`), and stays waiting.  NEVER throws.
   */
  enterCode?(code: string): Promise<void>
  /** Where the code went, while `"waiting for a code"`. */
  readonly sentTo?: string | undefined
  /** Where to report abuse, the host's abuse contact, which the bar shows (epic `atmosphere` P6).  Left out:  none said. */
  readonly abuseContact?: string | undefined
  /**
   * Who's signed in, for a sign-in that knows by itself (a Spell account's);  `undefined` for nobody.
   * - Left out:  the place says, `Place.currentPerson()`.
   */
  readonly person?: PersonHere | undefined
  /** Done once it knows who's signed in already, as the page opens.  Left out:  it knows at once. */
  readonly ready?: Promise<void>
  /** Sign out.  NEVER throws. */
  signOut(): Promise<void>
  /** Hear `status` changing.  Returns what stops it. */
  onChange(listener: () => void): () => void
  /**
   * Does it also sign in with a Bluesky (atmosphere) account linked to a Spell account (epic `atmosphere` P19)?
   * Left out:  no.
   */
  readonly offersAtProto?: boolean
  /** Sign in with a linked Bluesky account, a handle as typed:  the page leaves, and comes back.  NEVER throws. */
  signInAtProto?(who?: string): Promise<void>
  /** Link a Bluesky account to the one signed in:  the page leaves, and comes back.  NEVER throws. */
  linkAtProto?(who?: string): Promise<void>
  /** The handle of the Bluesky account linked to the one signed in;  `undefined` for none. */
  readonly linkedHandle?: string | undefined
  /** Why coming back from a Bluesky account's host didn't sign in, for the bar to say in the page's language. */
  readonly refused?: AtProtoRefusal | undefined
}

/**
 * Why coming back from signing in with a Bluesky (atmosphere) account didn't sign in (epic `atmosphere` P19):
 * - `"not linked"`:  no Spell account here is linked to it;  the server is invite only
 * - `"taken down"`:  the Spell account it's linked to was taken down by Spell
 * - `"linked elsewhere"`:  linking one another Spell account here is linked to already
 */
export type AtProtoRefusal = "not linked" | "taken down" | "linked elsewhere"

/** What to watch:  a collection, or one thing in it. */
export type WatchTarget = {
  /** The collection. */
  collection: string
  /** The one thing.  Left out:  the whole collection. */
  id?: string
}

/** One change a watching place tells us about. */
export type PlaceEvent = {
  /** The collection it's in. */
  collection: string
  /** The thing's id. */
  id: string
  /** The row as it's now kept.  Left out:  the thing was removed. */
  row?: PlaceRow
  /** The thing was removed:  the row as it was, for putting back. */
  was?: PlaceRow
  /** What of mine this change replaced, without having seen it:  mine lost.  A room says. */
  lost?: ReplacedValue[]
  /** What I replaced with a change made while I was offline:  theirs lost.  A room says. */
  overwrote?: ReplacedValue[]
  /** This page made it, and it's only coming back:  a place that can tell says.  Left out:  someone else did, as far as anyone knows. */
  isMine?: boolean
}

/** A field's value replaced by someone who hadn't seen it:  last wins, and the other value is kept here. */
export type ReplacedValue = {
  /** The field. */
  field: string
  /** The value from this person. */
  mine: unknown
  /** The value from the other person. */
  theirs: unknown
}

/** A place's answer to `changesSince()`. */
export type ChangesAnswer = {
  /** Each row changed since then. */
  rows: PlaceRow[]
  /** The id of each row removed since then. */
  removed: string[]
  /** What to ask from next. */
  token: string
}

/** What's being asked about one write:  each part left out means "any". */
export type WriteQuestion = {
  /** The collection. */
  collection: string
  /** The kind of write. */
  kind?: WriteKind
  /** The thing's row, when it's a thing we hold. */
  row?: PlaceRow
  /** The one field. */
  field?: string
  /** Who's asking. */
  identity?: string
}

/** Every reason a write isn't allowed. */
export const WhyNotWritables = ["place", "owner", "field", "role", "taken down"] as const
/**
 * Why a write isn't allowed:
 * - `"place"`:  this place doesn't take this write from anyone
 * - `"owner"`:  it isn't yours
 * - `"field"`:  this field can't be written, as with Airtable's formulas
 * - `"role"`:  your role can't write:  you're a guest of the space, or not one of its members (epic `atmosphere` P4)
 * - `"taken down"`:  Spell took it down (a thing, a space or an account), so it's neither read nor written;
 *   its message says where to ask about it (epic `atmosphere` P6)
 */
export type WhyNotWritable = (typeof WhyNotWritables)[number]

/** The answer to a `WriteQuestion`:  a hint, since a place can still refuse. */
export type WriteAnswer = {
  /** Would it take the write, as far as we know? */
  canWrite: boolean
  /** Why not. */
  whyNot?: WhyNotWritable
}

////////////////
// ## A place
////////////////

/**
 * Where data lives.
 * - A place MUST say what it can do, and list a collection.
 * - The rest is optional:  the engine does without, the same way for every place.
 * - Every method that fails THROWS:  a `PlaceError`, or whatever the back-end threw.
 */
export type Place = {
  /** What it can do. */
  describe(): PlaceCapabilities
  /**
   * This place, as a program's lines describe it:  for a place behind a server side, which takes them from each request (`PlaceServer`).
   * - Left out:  its lines are its own, and a program's make no difference.
   * - throws `PlaceError` for lines it can't honour
   */
  withLines?(lines: PlaceLines): Place
  /** The rows of `collection` that `query` asks for. */
  list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer>
  /**
   * Several lists in ONE request, each answer at its ask's place:  for a place whose way of asking allows it (`PlaceBatch`).
   * - Left out:  each list is a request of its own.
   * - All or nothing:  one failing throws for them all.
   */
  listMany?(asks: readonly ListAsk[], context: PlaceContext): Promise<ListAnswer[]>
  /** The rows of `collection` with these ids, in no promised order;  an id it doesn't hold is left out. */
  getMany?(collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]>
  /** Make these changes.  All or none, if it's `atomic`. */
  apply?(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer>
  /**
   * Run the operation it calls `name`, e.g. a GraphQL mutation.
   * - `collection`:  what `input` is a row of, so it can be sent in the server's own names.
   */
  call?(name: string, input: unknown, context: SelectingContext, collection?: string): Promise<unknown>
  /**
   * The version of this thing as this place last showed it:  what a change made now is made from.
   * - Left out, or `undefined` for a thing it hasn't shown:  the change says nothing, and the last write wins.
   */
  versionOf?(collection: string, id: string): string | undefined
  /** Tell `onEvent` of each change to `target`.  Returns what stops it. */
  watch?(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void
  /**
   * The row as this place holds it right now, if it can say at once:  a room's copy.
   * - What a list's changes are worked out from, as they have to be made straight away.
   */
  rowKnown?(collection: string, id: string): PlaceRow | undefined
  /** Hear each time the connection comes back:  what's waiting can go now.  Returns what stops it. */
  onBack?(listener: () => void): () => void
  /** Who this place knows the person at this page as:  a place that has people says (epic `data` P13). */
  currentPerson?(): PersonHere
  /** Everyone here now, this page included, in the order they came:  one for each page. */
  peopleHere?(): readonly PersonHere[]
  /** Hear `peopleHere()` changing.  Returns what stops it. */
  onPeopleHere?(listener: (people: readonly PersonHere[]) => void): () => void
  /** How a person signs in here, for a place where each person is someone:  what shows says who, and offers it (epic `data` P16). */
  readonly signIn?: PlaceSignIn
  /** What changed in `collection` since `token`:  a `version`, or an earlier answer's `token`. */
  changesSince?(collection: string, token: string, context: PlaceContext): Promise<ChangesAnswer>
  /**
   * Would it take this write?  For a place where it depends on the thing or the field.
   * - Left out:  `describe().write` is the whole answer.
   * - Ask through `writeAnswerFor()`, which checks that first.
   */
  canWrite?(question: WriteQuestion): WriteAnswer
}

/**
 * Versions moving on inside one `apply()`:  each change after the first to a thing was made from the version the batch
 * started at, so it follows on from what the batch just wrote.
 * - So one edit to two fields is one conflict at most.
 */
export class MovedVersions {
  /** Where each thing's version went, by collection and id. */
  private readonly moved = new Map<string, { from: string | undefined; to: string | undefined }>()

  /** The version `change` should say. */
  versionFor(change: PlaceChange): string | undefined {
    const before = this.moved.get(`${change.collection}\n${change.id}`)
    return before && before.from === change.version ? before.to : change.version
  }

  /** `change` was sent as `from`, and its thing is now at `to`. */
  note(change: PlaceChange, from: string | undefined, to: string | undefined): void {
    if (change.id !== undefined) this.moved.set(`${change.collection}\n${change.id}`, { from, to })
  }
}

/**
 * Would `place` take this write, as far as we know?
 * - First what it says of itself (`describe().write`), then what it says of this thing and this field (`canWrite()`).
 * - A hint, not a promise:  the place can still refuse.
 */
export function writeAnswerFor(place: Place, question: WriteQuestion): WriteAnswer {
  const { write } = place.describe()
  if (write === "none") return { canWrite: false, whyNot: "place" }
  if (question.kind && !write.includes(question.kind)) return { canWrite: false, whyNot: "place" }
  return place.canWrite?.(question) ?? { canWrite: true }
}

////////////////
// ## Where a place is served
////////////////

/** Where a `PlaceServer` listens, unless it's told otherwise:  each place by its name under this. */
export const PLACES_PREFIX = "/api/places"

/**
 * Where the page server serves every project data folder in spaces, by its address (epic `atmosphere` P1):
 * `family cookbook is a data folder at "owen@spell/recipes"` is `/api/places/spaces/owen@spell/recipes`.
 */
export const SPACE_FOLDERS_PREFIX = `${PLACES_PREFIX}/spaces`

/** What stands for the asker's own space, in a project data folder's address:  `personal "recipes"` is `personal/recipes`. */
export const PERSONAL_FOLDERS = "personal"

/**
 * How much a space's folder holds, in bytes (epic `atmosphere` P7):  a save past either is refused, `"over the ceiling"`,
 * and the page keeps it, saying why.
 * - `thing`:  one thing's file, about 1 MB, as an AT Protocol record
 * - `space`:  every file of one space's folder
 */
export const SPACE_LIMITS = { thing: 1024 * 1024, space: 100 * 1024 * 1024 } as const

/**
 * An org's roles, the place its Admin page reads and writes (epic `atmosphere` P25):  `@rs/__admin/roles`, its org's id
 * the first part.
 * - No folder, but the app's `OrgRolesPlace`:  read and written through Spell's server alone, never read direct.
 */
export const ORG_ROLES_ADDRESS = /^@([a-z0-9][a-z0-9_-]*)\/__admin\/roles$/i

/** The folder of a space or a project that holds its data:  `owen@spell/__data/recipes`, a reserved name in spaces. */
export const DATA_FOLDER = "__data"

/**
 * The least time between two asks of a project data folder, in seconds:  each ask looks at the folder on disk.
 * - `check it every` below it is raised to it, and its line says so.
 */
export const SPACE_FOLDER_CHECKS_AT_MOST_EVERY = 5

/**
 * What a project data folder on the page server can do, past a plain server side's:  what a program's place says of it.
 * - Who writes it is its address's:  `spaceFolderCapabilities()`.
 */
export const SPACE_FOLDER_CAPABILITIES = {
  kind: "data folder",
  checkedAtMostEvery: SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
  identifiesBy: "this machine"
} as const satisfies Partial<PlaceCapabilities>

/**
 * The cloud's word, as a program says it and the side bar shows it (epic `atmosphere` P8):
 * `family cookbook is saved in the cloud` is a project data folder in the signed-in person's own space on Spell's
 * server, `personal "family-cookbook"`, kept in the browser until someone signs in.
 */
export const CLOUD_KIND = "the cloud"

/**
 * What the cloud can do:  a project data folder's, under its own word, that takes nobody to be this machine's person
 * (`identifiesBy: "a sign-in"`).
 */
export function cloudCapabilities(address: string): Partial<PlaceCapabilities> {
  return { ...spaceFolderCapabilities(address), kind: CLOUD_KIND, identifiesBy: "a sign-in" }
}

/** What the project data folder at `address` can do:  `SPACE_FOLDER_CAPABILITIES`, and who writes it. */
export function spaceFolderCapabilities(address: string): Partial<PlaceCapabilities> {
  return { ...SPACE_FOLDER_CAPABILITIES, whoWrites: whoWritesFolderAt(address) }
}

/**
 * Who writes the project data folder at `address`, a full address or its route's (epic `atmosphere` P4):
 * - a program's own data (`<project>/__data/recipes`) or a person's (`personal "recipes"`):
 *   `"only the owner"`, each row its maker's, so everyone who runs the program keeps their own
 * - any other folder of a space (`@family/cookbook`, `owen@spell/recipes`):  `"its members"`, the space's own
 */
export function whoWritesFolderAt(address: string): WhoWrites {
  const [path = ""] = address.split(/[?#]/)
  const prefix = `${SPACE_FOLDERS_PREFIX}/`
  const name = path.includes(prefix) ? path.slice(path.indexOf(prefix) + prefix.length) : path
  const isProgramsOwn = name.startsWith(`${PERSONAL_FOLDERS}/`) || name.split("/").includes(DATA_FOLDER)
  return isProgramsOwn ? "only the owner" : "its members"
}

/** Is `address` a project data folder's, on the page server:  under `SPACE_FOLDERS_PREFIX`? */
export function isSpaceFolderAddress(address: string): boolean {
  return address.split(/[?#]/)[0]!.includes(`${SPACE_FOLDERS_PREFIX}/`)
}

/**
 * Where a space's own folder is READ, straight from its files, apart from where it's written (epic `atmosphere` P5, Q6 C):
 * `/api/reads/spaces/@family/cookbook/recipes.list.json`.
 * - A plain `GET` of each file, with a credential for the whole space:  so reading works while Spell's server can't write.
 */
export const SPACE_READS_PREFIX = "/api/reads/spaces"

/**
 * Where a space's own folder is shared LIVE, a room per collection (`Referee`, epic `atmosphere` T38):
 * `/api/rooms/spaces/<address>/<collection>`, a websocket.
 * - Written as each page's person, so a space's member, role, takedown and limit checks hold in a room too.
 */
export const SPACE_ROOMS_PREFIX = "/api/rooms/spaces"

////////////////
// ## Files in a space
////////////////

/**
 * Where a space's FILES are served (epic `atmosphere` P15):  `/api/files/spaces/@family/events?name=poster.png`.
 * - `GET` with `?name=`:  the file's bytes;  without, the list of its files, as JSON
 * - `PUT` with `?name=`:  one file, its bytes the body;  `POST`:  several at once (`SpaceFilesWrite`)
 * - `DELETE` with `?name=`:  one file gone
 */
export const SPACE_FILES_PREFIX = "/api/files/spaces"

/**
 * The collection a space's file records are in:  one record per file, its name, type, size and the hash of its bytes.
 * - One of spaces' own `__` names:  never read direct, listed or exported as a collection;  read through `SpaceFiles`.
 */
export const FILES_COLLECTION = "__files"

/** The folder of a space that keeps its files' bytes, each by its hash:  never served, listed or read direct. */
export const FILE_BYTES_FOLDER = "__blobs"

////////////////
// ## Kinds of thing in a space
////////////////

/**
 * What a thing in a space is, by its collection (epic `atmosphere` P23):  what a role may do to it depends on this.
 * - `"post"`:  someone's own words, a post, a comment or a message:  only its writer ever changes it
 * - `"row"`:  a row of a sheet, a program's data:  `recipes`, `signups`
 * - `"file"`:  a page, a sheet or any other file (`FILES_COLLECTION`)
 * - `"app"`:  an app installed in the space (`APPS_COLLECTION`)
 */
export type ThingKind = "post" | "row" | "file" | "app"

/**
 * The collections whose things are people's own words:  `"post"`s.
 * - As AT Protocol names them in a Space:  `space.spell.post`, kept here as `posts`.
 */
export const POST_COLLECTIONS = ["posts", "comments", "messages"] as const

/**
 * The collection a space's installed apps are in:  one record each, `{ name, version }`
 * (`@spell/sign-up-sheet`, `1.2.0`).
 * - One of spaces' own `__` names, as `FILES_COLLECTION` is.
 */
export const APPS_COLLECTION = "__apps"

/** What a thing in `collection` is:  `"posts"` => `"post"`, `"__files"` => `"file"`, `"recipes"` => `"row"`. */
export function thingKindOf(collection: string): ThingKind {
  if ((POST_COLLECTIONS as readonly string[]).includes(collection)) return "post"
  if (collection === FILES_COLLECTION) return "file"
  if (collection === APPS_COLLECTION) return "app"
  return "row"
}

/**
 * One change to one thing in a space, as its write check is asked it (`FolderSpace.changeOrDie()`, epic `atmosphere`
 * P23):  who, what kind of thing, and whether it's made, changed or removed.
 */
export type ThingChange = {
  /** Who's asking, by address:  `bo@rs`. */
  identity: string
  /** Their membership, with their role:  `undefined` for someone who isn't a member (a `publicWrite` space). */
  member: SpaceMember | undefined
  /** Its collection:  `posts`, `__files`. */
  collection: string
  /** What it is, by its collection (`thingKindOf()`). */
  kind: ThingKind
  /** Made new, changed, or removed:  a new thing with the id of one already there is a change to it. */
  action: "make" | "change" | "remove"
  /** Who wrote it last, for one already there:  for a post, its writer, as nobody else changes one. */
  by?: string
  /** Its fields, as sent:  an app's `name` and `version`.  None for a remove. */
  fields?: PlaceRow
}

/** The longest name a file in a space may have. */
const MOST_FILE_NAME = 200

/** What a key may hold as it is:  AT Protocol's record key characters, but `~`, which starts an escape. */
const PLAIN_IN_A_KEY = /^[A-Za-z0-9._:-]$/

/** A file in a space, as it's listed:  never the hash its bytes are kept under. */
export type SpaceFileInfo = {
  /** Its name, as people give it:  `poster.png`, `Ana's photo.jpg`. */
  name: string
  /** Its type:  `image/png`. */
  mimeType: string
  /** Its size, in bytes. */
  size: number
}

/** A file in a space, with its bytes. */
export type SpaceFileBytes = SpaceFileInfo & {
  /** What it holds. */
  bytes: Uint8Array
}

/** A file to write:  new, or a replacement of the one with its name. */
export type SpaceFileWrite = Omit<SpaceFileBytes, "size">

/** What `POST` to a space's files sends (`SPACE_FILES_PREFIX`):  several files, each one's bytes in base64. */
export type SpaceFilesWrite = {
  /** The files, new or replacing the ones with their names. */
  files: Array<Omit<SpaceFileWrite, "bytes"> & { base64: string }>
}

/**
 * A space's FILES (epic `atmosphere` P15):  each its bytes and ONE record naming it, as an AT Protocol Space keeps one.
 * - Spell's own server (`FolderFiles`, in `spell/server/places`) and a real Space (`AtProtoSpaceFiles`) answer the same
 *   calls, so a space can move between them and its programs never notice.
 * - A file is known by its NAME;  replacing one is writing its name again.
 * - Several at once:  every file's bytes are kept first, then their records change together, so nobody sees half.
 * - Bytes no record points to any more are let go.
 */
export interface SpaceFiles {
  /** Every file, by name.  - throws `PlaceError` `"refused"` for someone who can't read the space */
  list(context?: PlaceContext): Promise<SpaceFileInfo[]>
  /** The file named `name`, with its bytes:  `undefined` for none, or one taken down.  - throws as `list()` */
  read(name: string, context?: PlaceContext): Promise<SpaceFileBytes | undefined>
  /**
   * Write `files`, new or replacing the ones with their names, all together.
   * - throws `PlaceError`:  `"refused"` for someone whose role can't write;  `"over the ceiling"` for a space too full;
   *   `TypeError` for a name no file may have (`fileKeyFor()`)
   */
  write(files: readonly SpaceFileWrite[], context?: PlaceContext): Promise<SpaceFileInfo[]>
  /** Remove the files named `names`;  a name with no file is skipped.  - throws as `write()` */
  remove(names: readonly string[], context?: PlaceContext): Promise<void>
}

/**
 * The key a file named `name` is kept under:  its record's id in a folder, its record key in a real Space.
 * - Letters, digits, `.`, `_`, `:` and `-` stay as they are;  every other character is `~` and its UTF-8 bytes in hex:
 *   `Ana's photo.jpg` => `Ana~27s~20photo.jpg`, so any name is a record key AT Protocol takes.
 * - A name starting with a dot starts `~2E`, so its file is never a dot file.
 * - throws `TypeError` for an empty name, or one longer than 200 characters
 */
export function fileKeyFor(name: string): string {
  if (!name || name.length > MOST_FILE_NAME) {
    throw new TypeError(`fileKeyFor():  a file's name has 1 to ${MOST_FILE_NAME} characters, not ${name.length}`)
  }
  let key = ""
  for (const character of name) {
    if (PLAIN_IN_A_KEY.test(character) && !(key === "" && character === ".")) key += character
    else
      for (const byte of new TextEncoder().encode(character))
        key += `~${byte.toString(16).toUpperCase().padStart(2, "0")}`
  }
  return key
}

/**
 * What a `PlaceServer` with credentials answers, for reading a place direct:  `POST <place>/credential`.
 * - Its answer sets a cookie only the place's read address gets, and says that address:  `{ readsAt }`.
 */
export const PLACE_CREDENTIAL = "credential"

/**
 * Where the project data folder written at `address` is read directly:  `undefined` for one that's no space's own.
 * - Only a space's own folder (`"its members"`, `whoWritesFolderAt()`):  a program's own data stays read through
 *   Spell's server, which shows each person what's theirs.
 * - `/api/places/spaces/@family/cookbook` => `/api/reads/spaces/@family/cookbook`, its origin kept.
 */
export function spaceReadAddressFor(address: string): string | undefined {
  if (!isSpaceFolderAddress(address) || whoWritesFolderAt(address) !== "its members") return undefined
  const [path = ""] = address.split(/[?#]/)
  if (ORG_ROLES_ADDRESS.test(path.slice(path.indexOf(`${SPACE_FOLDERS_PREFIX}/`) + SPACE_FOLDERS_PREFIX.length + 1))) {
    return undefined
  }
  return path.replace(`${SPACE_FOLDERS_PREFIX}/`, `${SPACE_READS_PREFIX}/`)
}

/**
 * Does `address` name a place on a `PlaceServer`, rather than a file anyone can fetch?
 * - How a program says a sheet has a server in front, with no word for it:  `family cookbook is a sheet at "/api/places/recipes"`.
 * - Only its path counts:  a file's address may hold anything in its query.
 */
export function isPlaceServerAddress(address: string): boolean {
  return address.split(/[?#]/)[0]!.includes(`${PLACES_PREFIX}/`)
}

/** The id in a Google Sheet's address. */
const GOOGLE_SHEET_ID = /\/spreadsheets\/d\/([\w-]+)/

/**
 * The address a Google Sheet's first tab is read from as CSV, from the address a browser shows for it.
 * - throws `TypeError` for an address that isn't a Google Sheet's.
 */
export function googleSheetCsvAddress(address: string): string {
  const id = GOOGLE_SHEET_ID.exec(address)?.[1]
  if (!id) throw new TypeError(`"${address}" isn't a Google Sheet's address:  it has no /spreadsheets/d/<id>`)
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`
}

/** An Airtable base's id, alone or in an address someone copied from their browser. */
const AIRTABLE_BASE = /(?:^|\/)(app[A-Za-z0-9]+)(?:$|[/?#])/

/** The base `address` names:  `appXXXXXXXXXXXXXX`, or Airtable's address for it.  `undefined` if it names none. */
export function airtableBaseIn(address: string): string | undefined {
  return AIRTABLE_BASE.exec(address)?.[1]
}

////////////////
// ## Errors
////////////////

/** Every reason a `PlaceError` is thrown. */
export const PlaceErrorKinds = ["refused", "not found", "out of date", "no such place", "over the ceiling"] as const
/**
 * Why a `PlaceError` was thrown:
 * - `"refused"`:  the place won't take this write
 * - `"not found"`:  it holds no such thing
 * - `"out of date"`:  the thing has moved on since the change's `version`
 * - `"no such place"`:  no place goes by that name
 * - `"over the ceiling"`:  doing what the place can't would load too much into the browser;  or a save is over what
 *   the place holds (a thing or a space's size, `SPACE_LIMITS`), so it's refused and kept on the page
 */
export type PlaceErrorKind = (typeof PlaceErrorKinds)[number]

/** What a `PlaceError` knows, under `cause`. */
export type PlaceErrorCause = {
  /** Why it was thrown. */
  kind: PlaceErrorKind
  /** Why it's not writable, when it's `"refused"`. */
  whyNot?: WhyNotWritable
  /**
   * The role it would take, refused `"role"` (epic `atmosphere` P23):  `"editor"`, `"manager"`.
   * - So a page says which, in its own language;  the message says it in English.
   */
  needs?: string
}

/** Thrown when a place, or the list of places, can't do what was asked;  `cause.kind` says why. */
export class PlaceError extends Error {
  declare cause: PlaceErrorCause | undefined
  /** Why it was thrown. */
  get kind() {
    return this.cause?.kind
  }
}
PlaceError.prototype.name = "PlaceError"
