import { cp, readFile, readdir, stat } from "fs/promises"
import { join } from "path"

import {
  ANYONE,
  DATA_FOLDER,
  FILE_BYTES_FOLDER,
  PERSONAL_FOLDERS,
  PlaceError,
  SPACE_FILES_PREFIX,
  SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
  SPACE_FOLDERS_PREFIX,
  SPACE_LIMITS,
  SPACE_READS_PREFIX,
  SPACE_ROOMS_PREFIX,
  whoWritesFolderAt,
  type Place,
  type PlaceEvent,
  type SpaceFilesWrite,
  type ThingChange
} from "spell/places/places.types"
import type { AtProtoNetwork } from "spell/places/AtProtoPlace"
import { AtProtoPasswordSignIn } from "spell/places/AtProtoPasswordSignIn"
import type { AtProtoAccess } from "spell/places/AtProtoSignIn"
import { EVERY_FIELD, JsonChunks } from "spell/places/JsonChunks"
import { SRV } from "spell/server"
import {
  CsvPlace,
  DirectReads,
  FolderFiles,
  FolderPlace,
  PlaceServer,
  Referee,
  takenDownError,
  type FileBytes,
  type PlaceCredentialMade
} from "spell/server/places"
import { ReadCredentials, type Mailer } from "spell/server/signIn"
import { SP } from "spell/parser/spell"
import { FEED_POSTS, FEED_SPACE, INBOX_SPACE, THREADS_SPACE, isSpaceName } from "spell/app/spaces/models/spaceNames"
import environment from "spell/app/spaces/server/node/environment"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { OrgEvents, copyFolder } from "spell/app/spaces/server/node/people/OrgEvents"
import { OrgRolesPlace } from "spell/app/spaces/server/node/people/OrgRolesPlace"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import * as fileUtils from "spell/app/spaces/server/node/projects/file-utils"
import { ProjectDrafts } from "spell/app/spaces/server/node/projects/ProjectDrafts"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

import { InboxMail } from "./InboxMail"
import { MemberLists } from "./MemberLists"
import { PersonFeed } from "./PersonFeed"
import { PersonThreads } from "./PersonThreads"
import { PersonInbox } from "./PersonInbox"
import { RealSpace } from "./RealSpace"
import { SpaceExport } from "./SpaceExport"
import { SpaceMembers } from "./SpaceMembers"
import { SpaceProjections } from "./SpaceProjections"
import { SpaceSheets } from "./SpaceSheets"
import { Takedowns } from "./Takedowns"

/** Where a space is downloaded whole, as a zip of plain JSON files (`SpaceExport`):  its address after it. */
export const SPACE_EXPORTS_PREFIX = "/api/exports/spaces"

/** The most one request of a space's files may send:  the space's whole limit, in base64 when several go at once. */
const FILES_BODY_LIMIT = Math.ceil((SPACE_LIMITS.space * 4) / 3) + 64 * 1024

/** A collection's name in a room's address:  letters, digits, `-` and `_`, never one of spaces' own `__` names. */
const ROOM_COLLECTION = /^(?!__)[\w-]+$/

/**
 * A program's own CSV file in its project data folder:  `a sheet at "tasks.csv"` is `<project>/__data/tasks.csv`
 * (epic `language` T65).
 */
const CSV_FILE = /\.csv$/i

/** The column a program's own CSV file says each row's id in, until its line names another (`CsvPlace.withLines()`). */
const CSV_ID_COLUMN = "id"

/**
 * How long a space counts as CONNECTED after a page last read it direct:  its files are watched till then.
 * - A page checks a project data folder at most every 5 seconds (`SPACE_FOLDER_CHECKS_AT_MOST_EVERY`), most far less
 *   often:  2 minutes covers a page left open, and lets go soon after the last one's closed.
 */
const CONNECTED_MS = 2 * 60_000

/****************
 * ### `SpaceFolders`
 * Every project data folder in spaces, served to programs (epic `atmosphere` P1):
 * `family cookbook is a data folder at "owen@spell/recipes"` keeps its rows in `@spell/owen@/recipes/`.
 *
 * ```ts
 * new SpaceFolders().route({ router, guard })     // the app's route module does
 * ```
 *
 * - ONE route, the kit's `PlaceServer` under `/api/places/spaces/`, the folder's address after it:
 *   `POST /api/places/spaces/owen@spell/recipes/list`.
 *   - No server code per folder:  any address works.
 * - Each folder is a `FolderPlace` on the app's own storage (`DiskStorage`), made the first time it's asked for.
 *   - Its folder on disk is its address's (`folderForPlace()`):
 *     a person's in spell.spaces, the built-in projects' in the app's `spaces/`.
 * - The three ways a program names one:
 *   the compiler turns each into this route's address (spell's `CreatePlace.folderAddressFor()`)
 *   - a full address, `owen@spell/recipes`:  that folder
 *   - `"recipes"` alone:  the program's own, shared by everyone who runs it, `<project>/__data/recipes`
 *   - `personal "recipes"`:  one per person, in each person's space, `owen@spell/__data/recipes`
 *     (it reaches here as `personal/recipes`, and who's asking says whose)
 * - WHO'S ASKING:  whoever's signed in on the device, with a Spell account (epic `atmosphere` P3).
 *   - Else this machine's person (`prefsPersonFor()`), so `owen@spell` is the same person on every machine;
 *     the page says so (`identifiesBy`), offering to sign in.
 * - WHO WRITES, by its address (`whoWritesFolderAt()`):
 *   - a space's own folder (`@family/cookbook`, `owen@spell/recipes`) is WRITTEN BY ITS MEMBERS (epic `atmosphere` P4)
 *     - Every thing is the space's, as its own id (`@family`):  any member whose role writes changes any of it.
 *     - Anyone else is refused, "your role can't write" (`"role"`).
 *     - Its members:  `SpaceMembers`.
 *   - a program's own data (`__data/`, `personal`):  each row's owner is whoever made it (`owner`),
 *     and only they change it, as on an atmosphere account
 *     - except a KEEPER of the folder (`SpaceMembers.keeps()`, epic `atmosphere` P1)
 *   - either way, who wrote each thing last is `by`
 * - READ DIRECT (epic `atmosphere` P5, Q6 C):  a space's own folder's files, read straight,
 *   apart from where they're written.
 *   - At `/api/reads/spaces/<address>/` (the kit's `DirectReads`), with a credential for the whole space.
 *   - A member (a guest too) gets one from the write side's `credential` (`credentialFor()`):
 *     a cookie only that address reads.  Anyone else is refused, `"role"`.
 *   - It's signed by this server's key (`ReadCredentials`).
 *   - Each read asks the member list again, so someone who leaves reads no more.
 *   - Reading works while nothing's written, since it opens no place and writes nothing.
 *   - Something private is a space of its own:
 *     `ana@spell/recipes` lists Ana alone, so @family's credential reads none of it.
 *   - A program's own data (`__data/`, `personal`) is read through the write side, as before.
 *   - Reads through the write side are checked against the member list too (`FolderPlace`, T15).
 * - WATCHED WHILE CONNECTED (Owen, 2026-11-04, epic `atmosphere` T17):  a file edited by hand shows at once, on both
 *   read paths.
 *   - A page reading a space direct connects it, for `CONNECTED_MS` after its last read (`connect()`):
 *     its place is watched, so a changed file brings the list file into step, and tells every page watching.
 *   - The first read of a collection on a connection brings its list into step before it's answered:
 *     so an edit made while nobody was connected shows too.
 *   - A live room, or a page asking the write side what changed, watches or brings it into step already.
 *   - The last read long enough ago, it stops watching.
 *   - The watching is the storage's own, `DiskStorage.watch()`:  no watcher of its own.
 * - A PROGRAM'S OWN CSV FILE (`a sheet at "tasks.csv"`, epic `language` T65):  a file, not a folder,
 *   `<project>/__data/tasks.csv`, at the same route
 *   - the kit's `CsvPlace`:  each save changes only the lines it changes, so the file reads well in a diff, and in a sheet
 *   - a program's own data only:  a space's own folder is written by its members, which a CSV file can't say
 *   - anyone who runs the program changes any row:  a CSV file has no owner column, nor a takedown log, nor a ceiling
 *   - its first line names its columns:  ship the file with them, or the first row's fields become them
 * - Its member list is the place's own operations (`SPACE_MEMBER_OPERATIONS`), through the same route's `call`:
 *   who's in it, a member added or given a role, one removed or leaving.
 * - A folder with a `__members/` gets its person's membership written there, with the owner's role, if it's missing.
 * - TAKEDOWNS (epic `atmosphere` P6, Q7 A):  what Spell took down is refused on both sides, asked afresh for each
 *   request (`Takedowns`;  its log is each folder's `__takedowns.json5`).
 *   - a record:  left out of every read, through the write side and read direct;  a change to it refused, "taken down"
 *   - a space, the account whose space it is, or the asker's own account:
 *     every read, write and credential refused, 451, naming the abuse contact
 *   - put back (`restore`), it's read again at once:  a page following it hears it come back
 * - WHO BESIDES ITS MEMBERS (epic `atmosphere` P7, Q13):  two settings of a space, `publicRead` and `publicWrite`
 *   - Both off, until an admin turns them on (`SpaceMembers.settings()`, the `changeSettings` operation).
 *   - `publicRead`:  anyone reads it, through the write side or direct, and is given a credential, signed in or not
 *   - `publicWrite`:  anyone signed in adds things, and changes only the ones they wrote (their `by`):  a sign-up sheet
 * - LIMITS (epic `atmosphere` P7, `SPACE_LIMITS`):  a thing's file at most about 1 MB, a space's folder 100 MB
 *   - A save past either is refused, `"over the ceiling"`, and the page keeps it, saying why.
 * - LEAVING (epic `atmosphere` P7):  `GET /api/exports/spaces/<address>` downloads the space as a zip of plain JSON
 *   (`SpaceExport`), for anyone who may read it.
 *   - `spell space export` writes the same into a folder.
 * - DELETING:  an admin's `deleteSpace` operation removes the space's files for good (`SpaceMembers.deleteSpace()`)
 * - KEPT IN A REAL SPACE (epic `atmosphere` P14):  a space whose settings name an AT Protocol Space
 *   (`SpaceMembers.keptIn()`) is kept there too (`RealSpace`), as the org's account (`orgAccess`, the test org's):
 *   - writes:  the same one route and every check above, onto its folder, then into the Space through the ONE retry
 *     queue, kept on the server's disk (Q19 A)
 *   - reads:  each member's OWN Space credential, passed through to the Space's host (`DirectReads`' `hostOf`), so the
 *     host decides who reads, never Spell
 *   - its member list:  a member added with their AT Protocol account (`did`), or removed, is on the Space's list too;
 *     and a list worked out from its org's roles follows each change to them, and each day (`lists`, epic `atmosphere`
 *     P24, the one `orgRoles` every folder's members ask)
 *   - every other space stays on files alone
 * - PROJECTIONS (epic `atmosphere` P17):  part of a space's data, written into another space for its readers
 *   (`SpaceProjections`, one per space, `projectionsAt()`)
 *   - set, listed and rebuilt through the space's own operations (`SPACE_PROJECTION_OPERATIONS`), kept in its settings
 *   - each write to it follows into each target, as Spell itself, through the ONE retry queue (Q19 A)
 * - SIGN-UP SHEETS (epic `atmosphere` P27):  a space's folder whose rules say who signs up, who's on its list and how
 *   many a shift takes (`SpaceSheets`, one per folder place, handed to it as `signUpOrDie`);  set through its own
 *   operations (`SPACE_SHEET_OPERATIONS`), kept in its settings
 * - INBOXES (epic `atmosphere` P29, Q23 A):  each person in an org with an Admin space has one, `ana@rs/__inbox`
 *   (`PersonInbox`, one per inbox, `inboxAt()`):  a message added to her own inbox's `messages` is sent, a copy written
 *   into each inbox it's to, through the ONE retry queue (Q19 A);  she, the Board and the Admins read it.
 *   - `@rs/__inbox`, with no person, is whoever's asking's own:  one program reads each person's (the built-in
 *     `@spell/examples/Inbox`).
 * - AN ORG'S ROLES (epic `atmosphere` P25):  `@rs/__admin/roles` is no folder but the org's roles as a place
 *   (`OrgRolesPlace`), what its Admin page reads and writes;  each write one change through `OrgRoles`, its rules held.
 * - LIVE ROOMS (epic `atmosphere` T38):  a space's own folder, one collection at a time, shared live
 *   at `/api/rooms/spaces/<address>/<collection>` (`SPACE_ROOMS_PREFIX`), a websocket.
 *   - One `Referee` per collection, on the space's own `FolderPlace`, made as the first page joins.
 *   - Each write reaches the folder as its page's person, so every check above holds in a room:
 *     members and roles, `publicWrite`, takedowns, limits.
 *   - Joining is reading:  only someone who may read the space joins, and nobody while it's taken down.
 *   - Someone taken off the list while in the room is refused their next write;  they still hear the room
 *     until they leave.
 * - FILES (epic `atmosphere` P15):  a space's own folder keeps files too, each its bytes and one record naming it
 *   (the kit's `FolderFiles`), at `/api/files/spaces/<address>` (`SPACE_FILES_PREFIX`).
 *   - `GET ?name=poster.png`:  its bytes, with its type, for a page's `<img>`;  without a name, the list
 *   - `PUT ?name=`:  one file, its bytes the body;  `POST`:  several at once, together (`SpaceFilesWrite`)
 *   - `DELETE ?name=`:  one gone
 *   - Every check above holds, through the space's `FolderPlace`:  members, roles, `publicRead` / `publicWrite`,
 *     takedowns (a file is taken down as its record is, `__files`), and the space's 100 MB, bytes included.
 *   - The bytes are in the space's `__blobs/`, by hash;  never served, read direct or listed.
 *   - Reading takes no run token:  a page's `<img>` sends none.  Who's asking is who's signed in, else this
 *     machine's person, as everywhere here;  writing takes the token or a sign-in, as every write does.
 * - Node only;  NEVER imported by the editor's browser code.
 ****************/
export class SpaceFolders {
  /** Each folder's storage and members, by its address, made once. */
  private readonly folders = new Map<string, SpaceFolder>()
  /** Each folder's place, by its address, made once. */
  private readonly places = new Map<string, FolderPlace>()
  /** Each org's roles as a place, its Admin page's (`@rs/__admin/roles`, epic `atmosphere` P25), by its org, made once. */
  private readonly rolesPlaces = new Map<string, OrgRolesPlace>()
  /** Each program's own CSV file, by its address, made once. */
  private readonly csvFiles = new Map<string, CsvPlace>()
  /** Each space's files, by its address, made once. */
  private readonly files = new Map<string, FolderFiles>()
  /** Its files read direct. */
  private readonly reads: DirectReads
  /** Where an address's folder is on disk. */
  private readonly folderFor: (address: string) => string
  /** People and orgs:  an org's roles, for a folder with no memberships of its own. */
  private readonly people: PeopleStore
  /** Who's asking, as an address:  `owen@spell`. */
  private readonly personFor: (request: SRV.Request) => string
  /** What Spell took down, in each folder. */
  readonly takedowns: Takedowns
  /**
   * Who manages what in each org, the one every folder's members ask:  each change it makes brings the org's real
   * Spaces' lists into step (`lists`, epic `atmosphere` P24).
   */
  readonly orgRoles: OrgRoles
  /** Each space's list kept in step with its org's roles, and the audit (epic `atmosphere` P24). */
  readonly lists: MemberLists
  /** Each org's events, from proposal to quiet (epic `atmosphere` P32):  a quiet event's spaces are read only. */
  readonly events: OrgEvents
  /** How people hear of their inboxes and subscriptions by mail (epic `atmosphere` P30):  none without a mailer. */
  readonly mail: InboxMail | undefined
  /** Each space connected now, by its address:  what stops its watch, when it lets go, and the collections in step. */
  private readonly connections = new Map<string, SpaceConnection>()
  /** Each live room, by `<address>\n<collection>`, opened as its first page joins. */
  private readonly rooms = new Map<string, Promise<Referee>>()
  /** Each space's real Space, by its address, once it's been asked for:  `undefined` for one kept in none. */
  private readonly realSpaces = new Map<string, Promise<RealSpace | undefined>>()
  /** Each person's inbox, by its address, made once (epic `atmosphere` P29). */
  private readonly inboxes = new Map<string, Promise<PersonInbox | undefined>>()
  /** Each person's feed in their org, by address (`PersonFeed`, P33):  `bo@rs`'s, made once. */
  private readonly feeds = new Map<string, PersonFeed>()
  /** Each person's list of threads in their org, by address (`PersonThreads`, P37):  `bo@rs`'s, made once. */
  private readonly threadLists = new Map<string, PersonThreads>()
  /** What each space projects, by its address, made once (epic `atmosphere` P17). */
  private readonly projections = new Map<string, SpaceProjections>()
  /** The org's account, signed in, a space kept in a real Space is written as. */
  private readonly orgAccess: (uri: string) => Promise<AtProtoAccess | undefined>
  /** Where accounts' documents are, for the real Spaces. */
  private readonly network: Partial<Pick<AtProtoNetwork, "directory">> | undefined
  /** Where the writes not yet in a real Space are kept. */
  private readonly queueFile: string
  /** That file, opened as the first real Space is. */
  private queue: SRV.FileStorage | undefined

  constructor({
    folderFor = folderForPlace,
    people = new PeopleStore(new DiskStorage(environment.spellSpacesDir)),
    personFor = (request) => {
      const { id, org } = prefsPersonFor(request)
      return `${id}@${org}`
    },
    credentials = new ReadCredentials(),
    abuseContact,
    orgAccess = testOrgAccess(),
    network = environment.testOrg?.network === undefined ? undefined : spacesNetwork(environment.testOrg.network),
    queueFile = join(environment.queueDir, "space-writes.json"),
    mailer,
    address = () => ""
  }: SpaceFoldersProps = {}) {
    this.folderFor = folderFor
    this.orgAccess = orgAccess
    this.network = network
    this.queueFile = queueFile
    this.people = people
    this.personFor = personFor
    this.orgRoles = new OrgRoles({ people, onChange: (org) => this.lists.follow(org) })
    this.lists = new MemberLists({
      people,
      orgRoles: this.orgRoles,
      membersAt: (address) => this.spaceFolderAt(address)?.members,
      realSpaceAt: (address) => this.realSpaceAt(address)
    })
    this.events = new OrgEvents({
      orgRoles: this.orgRoles,
      people,
      copyTemplate: (template, address) =>
        copyFolder(this.folderFor(template), join(this.folderFor(address), template.split("/").at(-1) ?? template))
    })
    this.mail = mailer
      ? new InboxMail({
          mailer,
          people,
          placeAt: async (at) => (await this.placeFor(at, undefined)) as FolderPlace | undefined,
          inboxOf: (person, org) => this.inboxOf(person, org),
          credentials,
          address,
          queueStorage: (this.queue ??= new SRV.FileStorage(queueFile))
        })
      : undefined
    this.takedowns = new Takedowns({
      storageFor: (address) => this.folderAt(address)?.storage,
      ...(abuseContact !== undefined && { contact: abuseContact })
    })
    this.reads = new DirectReads({
      prefix: SPACE_READS_PREFIX,
      credentials,
      filesOf: (space) => this.spaceFolderAt(space)?.storage,
      mayRead: async (space, person) => !!(await this.spaceFolderAt(space)?.members.mayRead(person)),
      takenDown: (space, person) => this.takedowns.takenDownIn(space, person),
      onRead: (space, collection) => this.connect(space, collection),
      hostOf: async (space) => (await this.realSpaceAt(space))?.host()
    })
  }

  /**
   * Add its routes to `router`:
   * - the write side, behind `guard`:  this run's token or a sign-in, the server's own host and origin
   * - the read side, behind its host check, with a credential for each space
   * - with `upgrade`, the live rooms (`SPACE_ROOMS_PREFIX`), behind `guard` and `signIn`
   */
  route({ router, guard, upgrade, signIn }: SpaceFoldersRoutes): this {
    new PlaceServer({
      prefix: SPACE_FOLDERS_PREFIX,
      open: (name, identity) => this.placeFor(name, identity),
      identityOf: this.personFor,
      credentialFor: ({ placeName, identity }) => this.credentialFor(placeName, identity)
    }).route(router, guard)
    this.reads.route(router, guard)
    upgrade?.(SPACE_ROOMS_PREFIX, (raw, socket, head) => this.joinRoom({ raw, socket, head, guard, signIn }))
    router.get(`${SPACE_EXPORTS_PREFIX}/:place*`, guard.hostCheck, guard.writeCheck, async (request, reply) => {
      const out = await this.exportOf(request.params.place ?? "", this.personFor(request)).catch((error: unknown) => {
        if (!(error instanceof PlaceError)) throw error
        throw new SRV.HttpError(PlaceServer.statusOf(error), error.message)
      })
      reply
        .set("Content-Disposition", `attachment; filename="${out.fileName}"`)
        .set("Cache-Control", "no-store")
        .type("application/zip")
        .send(out.zip())
    })
    this.routeFiles(router, guard)
    this.mail?.route(router, guard)
    return this
  }

  /**
   * The space the route names `name`, exported whole as `identity` reads it (`SpaceExport`):  leaving Spell.
   * - `identity` left out:  this machine's own code, trusted (`spell space export`).
   * - throws `HttpError(404)` for no space's own folder;  `PlaceError` `"refused"` for someone who can't read it
   */
  async exportOf(name: string, identity: string | undefined): Promise<SpaceExport> {
    const address = this.addressFor(name, identity)
    const folder = address === undefined ? undefined : this.spaceFolderAt(address)
    const place = address === undefined ? undefined : await this.placeFor(address, identity)
    if (!folder || !address || !(place instanceof FolderPlace)) {
      throw new SRV.HttpError(404, `there's no space at ${name} to export`)
    }
    const files = await this.filesFor(address, identity)
    return SpaceExport.of({
      address,
      place,
      storage: folder.storage,
      members: folder.members,
      ...(files && { files }),
      ...(identity !== undefined && { identity })
    })
  }

  ////////////////
  // ## A person's own space
  ////////////////

  /**
   * What's in `person`'s own space in their org (`ana@rs`, epic `atmosphere` P28):  its folders and files by name,
   * Spell's own `__` ones left out (their person file, their memberships).
   * - `[]` for no folder yet:  it's made when first needed.
   */
  async ownSpaceContents(person: string): Promise<string[]> {
    const names = await readdir(this.folderFor(person)).catch(() => [] as string[])
    return names.filter((name) => !isSpaceName(name) && !name.startsWith("."))
  }

  /**
   * SIDE EFFECT:  copy `person`'s own space in their org into `to`, another space of theirs, as they LEAVE it (P28):
   * `ana@rs` into `ana@spell/from-rs`.  Returns what it copied.
   * - Theirs:  a person's space (`ana@spell/...`) of the same person, by their id, in any org.
   * - Never over what's there:  a name `to` already holds is refused.
   * - throws `HttpError(400)` for `to` no space of theirs, or a name it already holds
   */
  async takeOwnSpace(person: string, to: string): Promise<string[]> {
    const theirs = SP.SpellLocation.accountParts(person)
    const target = SP.SpellLocation.accountParts(to.split("/")[0] ?? "")
    if (!theirs || !target || target.id !== theirs.id || to.split("/")[0] === person) {
      throw new SRV.HttpError(
        400,
        `${to} isn't another space of ${person}'s:  name one, as ${theirs?.id ?? "ana"}@spell/from-${theirs?.org ?? "rs"}`
      )
    }
    const names = await this.ownSpaceContents(person)
    const folder = this.folderFor(to)
    const already = (await readdir(folder).catch(() => [] as string[])).filter((name) => names.includes(name))
    if (already.length) throw new SRV.HttpError(400, `${to} already holds ${already.join(", ")}:  name another space`)
    for (const name of names) await cp(join(this.folderFor(person), name), join(folder, name), { recursive: true })
    return names
  }

  /**
   * The files of the space the route names `name` (`FolderFiles`):  `undefined` for no space's own folder.
   * - Who may read or write them is the space's place's to say, as `identity` asks each call.
   */
  async filesFor(name: string, identity: string | undefined): Promise<FolderFiles | undefined> {
    const address = this.addressFor(name, identity)
    const folder = address === undefined ? undefined : this.spaceFolderAt(address)
    if (!folder || !address) return undefined
    const known = this.files.get(address)
    if (known) return known
    const place = await this.placeFor(address, identity)
    if (!(place instanceof FolderPlace)) return undefined
    const files = new FolderFiles({ place, bytes: fileBytesIn(join(folder.root, FILE_BYTES_FOLDER)) })
    this.files.set(address, files)
    return files
  }

  /** Add the files' routes (`SPACE_FILES_PREFIX`):  see the class. */
  private routeFiles(router: SRV.Router, guard: SRV.Guard): void {
    const path = `${SPACE_FILES_PREFIX}/:place*`
    const writes = [guard.hostCheck, guard.writeCheck]
    /** The space's files, and who's asking:  404 for no space's own folder. */
    const filesOf = async (request: SRV.Request) => {
      const identity = this.personFor(request)
      const files = await this.filesFor(request.params.place ?? "", identity)
      if (!files) throw new SRV.HttpError(404, `there's no space at ${request.params.place} to keep files in`)
      return { files, context: { identity }, name: request.query.name as string | undefined }
    }
    router.get(path, guard.hostCheck, async (request, reply) => {
      const { files, context, name } = await filesOf(request)
      if (name === undefined) return reply.set("Cache-Control", "no-store").json(await refusedAs(files.list(context)))
      const file = await refusedAs(files.read(name, context))
      if (!file) throw new SRV.HttpError(404, `there's no file "${name}" in ${request.params.place}`)
      reply.set("Cache-Control", "no-store").type(file.mimeType).send(Buffer.from(file.bytes))
    })
    router.put(path, ...writes, async (request, reply) => {
      const { files, context, name } = await filesOf(request)
      if (name === undefined) throw new SRV.HttpError(400, "PUT a file with its name:  ?name=poster.png")
      // a text body a parser further up already read is its text;  anything else is read here, as it came
      const bytes = request.locals.bodyRead
        ? Buffer.from(typeof request.body === "string" ? request.body : JSON.stringify(request.body))
        : await SRV.readBody(request.raw, FILES_BODY_LIMIT)
      const mimeType = request.get("content-type") || "application/octet-stream"
      reply.json(await refusedAs(files.write([{ name, mimeType, bytes }], context)))
    })
    router.post(path, ...writes, SRV.parseBodies({ limit: FILES_BODY_LIMIT }), async (request, reply) => {
      const { files, context } = await filesOf(request)
      const asked = request.body as Partial<SpaceFilesWrite>
      if (!Array.isArray(asked.files)) throw new SRV.HttpError(400, "POST { files: [{ name, mimeType, base64 }] }")
      const written = asked.files.map(({ name, mimeType, base64 }) => ({
        name,
        mimeType,
        bytes: Buffer.from(base64, "base64")
      }))
      reply.json(await refusedAs(files.write(written, context)))
    })
    router.delete(path, ...writes, async (request, reply) => {
      const { files, context, name } = await filesOf(request)
      if (name === undefined) throw new SRV.HttpError(400, "DELETE a file by its name:  ?name=poster.png")
      await refusedAs(files.remove([name], context))
      reply.json({ removed: name })
    })
  }

  /**
   * The place the route names `name`, for `identity`:  `owen@spell/recipes`, or `personal/recipes`.
   * - `undefined` for a name that's no folder's address:  the route answers 404.
   */
  async placeFor(name: string, identity: string | undefined): Promise<Place | undefined> {
    const address = this.addressFor(name, identity)
    if (!address) return undefined
    if (CSV_FILE.test(address)) return this.csvFileAt(address)
    const rolesOf = OrgRolesPlace.orgAt(address)
    if (rolesOf !== undefined) return this.rolesPlaceOf(rolesOf)
    const feedOf = PersonFeed.personAt(address)
    if (feedOf !== undefined) return this.feedOf(identity ?? feedOf, orgOfAccount(feedOf))
    const threadsOf = PersonThreads.personAt(address)
    if (threadsOf !== undefined) return this.threadsOf(identity ?? threadsOf, orgOfAccount(threadsOf))
    const known = this.places.get(address)
    if (known) return known
    const folder = this.folderAt(address)
    if (!folder) return undefined
    const { storage, members } = folder
    await members.writeOwnerMembership()
    const whoWrites = whoWritesFolderAt(address)
    const real = whoWrites === "its members" ? await this.realSpaceAt(address) : undefined
    const projections = whoWrites === "its members" ? this.projectionsAt(address) : undefined
    const inbox = whoWrites === "its members" ? await this.inboxAt(address) : undefined
    const sheets =
      whoWrites === "its members"
        ? new SpaceSheets({
            address,
            storage,
            members,
            membersAt: (at) => this.spaceFolderAt(at)?.members,
            inboxOf: (person) => this.inboxOf(person, orgOfAccount(address.split("/")[0] ?? ""))
          })
        : undefined
    // a shared space's new things reach its subscribers as updates (P30)
    const paired = whoWrites === "its members" && this.mail ? await this.orgRoles.spaceAt(address) : undefined
    const updates = paired?.side === "shared" ? this.mail!.writtenFor(address, paired) : undefined
    const onWritten = writtenTo([real?.written, projections?.written, inbox?.written, updates, sheets?.written])
    const changeOrDie = this.quietOrDie(address, inbox?.changeOrDie ?? members.changeOrDie)
    const place = new FolderPlace({
      storage,
      format: new JsonChunks({ summaries: EVERY_FIELD }),
      whoWrites,
      ...(whoWrites === "its members"
        ? {
            space: {
              id: members.spaceId,
              memberOf: members.memberOf,
              settings: members.settings,
              changeOrDie: updates ? this.mail!.checkFor(address, changeOrDie) : changeOrDie,
              signUpOrDie: sheets!.signUpOrDie
            },
            operations: { ...members.operations, ...projections?.operations, ...sheets?.operations }
          }
        : { mayChangeAnyRow: (who: string) => members.keeps(who) }),
      limits: SPACE_LIMITS,
      bytesInUse: () => bytesIn(folder.root),
      checkedAtMostEvery: SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
      identifiesBy: "this machine",
      takenDown: (asker) => this.takedowns.takenDownIn(address, asker),
      ...(onWritten && { onWritten })
    })
    this.places.set(address, place)
    return place
  }

  /**
   * A program's own CSV file at `address`, `<project>/__data/tasks.csv`, made once:  see the class.
   * - `undefined` for one in a space's own folder, or with no folder on disk:  the route answers 404.
   */
  private csvFileAt(address: string): CsvPlace | undefined {
    const known = this.csvFiles.get(address)
    if (known) return known
    if (whoWritesFolderAt(address) !== "only the owner") return undefined
    const file = this.diskFolderFor(address)
    if (!file) return undefined
    const place = new CsvPlace({ file, idColumn: CSV_ID_COLUMN })
    this.csvFiles.set(address, place)
    return place
  }

  /**
   * A credential for `identity` to read the space the route names `name` direct:  its cookie, and where it's read.
   * - `undefined` for a program's own data, which isn't read direct:  the route answers 404.
   * - Anyone's, signed in or not, for a space anyone reads (`publicRead`).
   * - throws `PlaceError` `"refused"`:
   *   `"taken down"`, for a space Spell took down;  `"role"`, for someone who isn't one of its members
   */
  async credentialFor(name: string, identity: string | undefined): Promise<PlaceCredentialMade | undefined> {
    const address = this.addressFor(name, identity)
    const folder = address === undefined ? undefined : this.spaceFolderAt(address)
    if (!folder || !address) return undefined
    const down = await this.takedowns.takenDownIn(address, identity)
    if (down.isWhole) throw takenDownError("this space", down)
    if (!(await folder.members.mayRead(identity))) {
      throw new PlaceError(`You can't read this:  you aren't a member of ${folder.members.spaceId}`, {
        cause: { kind: "refused", whyNot: "role" }
      })
    }
    return { cookie: this.reads.cookieFor(address, identity ?? ANYONE), readsAt: this.reads.readsAt(address) }
  }

  /** Stop every folder's watching:  for a test, or the page server stopping.  The next ask opens each again. */
  close(): void {
    for (const room of this.rooms.values()) void room.then((referee) => referee.close()).catch(() => {})
    this.rooms.clear()
    for (const real of this.realSpaces.values()) void real.then((space) => space?.stop()).catch(() => {})
    this.realSpaces.clear()
    for (const projections of this.projections.values()) projections.stop()
    this.projections.clear()
    for (const address of [...this.connections.keys()]) this.disconnect(address)
    for (const { storage } of this.folders.values()) storage.close()
    this.folders.clear()
    this.places.clear()
    this.csvFiles.clear()
    this.files.clear()
  }

  ////////////////
  // ## Real Spaces
  ////////////////

  /**
   * The real AT Protocol Space the space at `address` is kept in, made once:  `undefined` for one kept in none, or for
   * no space's own folder.
   * - throws `HttpError(503)` for one kept in a Space when this server has no org account to write it as
   */
  realSpaceAt(address: string): Promise<RealSpace | undefined> {
    let real = this.realSpaces.get(address)
    if (!real) {
      real = this.openRealSpace(address)
      this.realSpaces.set(address, real)
      // one that failed is tried afresh by the next ask
      real.catch(() => this.realSpaces.delete(address))
    }
    return real
  }

  /** See `realSpaceAt()`. */
  private async openRealSpace(address: string): Promise<RealSpace | undefined> {
    const uri = await this.spaceFolderAt(address)?.members.keptIn()
    if (!uri) return undefined
    const access = await this.orgAccess(uri)
    if (!access?.did) {
      throw new SRV.HttpError(
        503,
        `${address} is kept in the Space ${uri}, but this server has no org account to write it as:  ` +
          `set SPELL_TEST_ORG_HANDLE and SPELL_TEST_ORG_PASSWORD`
      )
    }
    this.queue ??= new SRV.FileStorage(this.queueFile)
    return new RealSpace({ address, uri, access, storage: this.queue, ...(this.network && { network: this.network }) })
  }

  ////////////////
  // ## Projections
  ////////////////

  /**
   * What the space at `address` projects into other spaces, made once (epic `atmosphere` P17):
   * `undefined` for no space's own folder.
   */
  projectionsAt(address: string): SpaceProjections | undefined {
    const known = this.projections.get(address)
    if (known) return known
    const folder = this.spaceFolderAt(address)
    if (!folder) return undefined
    this.queue ??= new SRV.FileStorage(this.queueFile)
    const projections = new SpaceProjections({
      address,
      storage: folder.storage,
      members: folder.members,
      placeAt: async (at) => (await this.placeFor(at, undefined)) as FolderPlace | undefined,
      membersAt: (at) => this.spaceFolderAt(at)?.members,
      queueStorage: this.queue
    })
    this.projections.set(address, projections)
    return projections
  }

  ////////////////
  // ## Inboxes
  ////////////////

  /**
   * The inbox at `address`, a person's in an org with an Admin space (`ana@rs/__inbox`), made once (epic `atmosphere`
   * P29):  `undefined` for any other address.
   */
  inboxAt(address: string): Promise<PersonInbox | undefined> {
    const known = this.inboxes.get(address)
    if (known) return known
    const made = this.makeInbox(address)
    this.inboxes.set(address, made)
    return made
  }

  /**
   * `person`'s inbox (`ana@rs`) in org `org`, default their own:  `undefined` for someone with none, outside an org
   * with an Admin space.
   */
  inboxOf(person: string, org?: string): Promise<PersonInbox | undefined> {
    return this.inboxAt(PersonInbox.addressOf(person, org))
  }

  /** The inbox at `address`, made:  see `inboxAt()`. */
  private async makeInbox(address: string): Promise<PersonInbox | undefined> {
    const owner = await this.orgRoles.inboxAt(address)
    const isTheirs = owner && address === PersonInbox.addressOf(owner.person, owner.org)
    const folder = isTheirs ? this.spaceFolderAt(address) : undefined
    if (!owner || !folder) return undefined
    this.queue ??= new SRV.FileStorage(this.queueFile)
    return new PersonInbox({
      address,
      owner,
      members: folder.members,
      people: this.people,
      orgRoles: this.orgRoles,
      placeAt: async (at) => (await this.placeFor(at, undefined)) as FolderPlace | undefined,
      keepVersion: async (page, version, by) => {
        const drafts = await ProjectDrafts.for(page, by, {
          folderFor: this.folderFor,
          projectFolder: this.folderFor(page),
          people: this.people,
          orgRoles: this.orgRoles
        })
        await drafts.keepForGood(version)
      },
      queueStorage: this.queue,
      ...(this.mail && { onArrived: this.mail.arrived })
    })
  }

  ////////////////
  // ## Live rooms
  ////////////////

  /**
   * A page asks to join the room of `<address>/<collection>`:  who's asking may read the space, and it isn't down.
   * - Refused with its reason and its status, and the socket closed;  else handed to the room's `Referee`.
   * - NEVER throws:  a failure refuses the page, and is logged
   */
  private async joinRoom({ raw, socket, head, guard, signIn }: RoomJoin): Promise<void> {
    const refuse = (status: string, why: string): void => {
      socket.end(`HTTP/1.1 ${status}\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n${why}\n`)
    }
    try {
      const request = new SRV.Request(raw)
      signIn?.putPersonOn(request)
      const rest = decodeURIComponent(request.path.slice(SPACE_ROOMS_PREFIX.length + 1))
      const address = rest.slice(0, rest.lastIndexOf("/"))
      const collection = rest.slice(rest.lastIndexOf("/") + 1)
      const folder = this.spaceFolderAt(address)
      if (!folder || !ROOM_COLLECTION.test(collection)) return refuse("404 Not Found", `there's no room at ${rest}`)
      const identity = this.personFor(request)
      const down = await this.takedowns.takenDownIn(address, identity)
      if (down.isWhole) return refuse("451 Unavailable For Legal Reasons", takenDownError("this space", down).message)
      if (!(await folder.members.mayRead(identity))) {
        return refuse("403 Forbidden", `You can't join this room:  you aren't a member of ${folder.members.spaceId}`)
      }
      const referee = await this.roomFor({ address, collection, guard, signIn })
      referee.upgrade(raw, socket, head)
    } catch (error) {
      if (!(error instanceof SRV.HttpError)) console.error("SpaceFolders:  a page couldn't join a room:", error)
      refuse(error instanceof SRV.HttpError ? `${error.status} Refused` : "500 Server Error", (error as Error).message)
    }
  }

  /** The room of `collection` in the space at `address`, opened once, on its own `FolderPlace`.  - throws what opening throws */
  private roomFor({ address, collection, guard, signIn }: RoomAsk): Promise<Referee> {
    const key = `${address}\n${collection}`
    let room = this.rooms.get(key)
    if (!room) {
      room = this.placeFor(address, undefined).then((place) =>
        new Referee({
          path: `${SPACE_ROOMS_PREFIX}/${address}/${collection}`,
          place: place!,
          collections: { [collection]: {} },
          guard,
          ...(signIn && { signIn }),
          identityOf: this.personFor
        }).open()
      )
      this.rooms.set(key, room)
      // one that failed to open is tried afresh by the next page
      room.catch(() => this.rooms.delete(key))
    }
    return room
  }

  ////////////////
  // ## Connected
  ////////////////

  /** Is the space at `address` connected now:  its files watched?  For a test. */
  isConnected(address: string): boolean {
    return this.connections.has(address)
  }

  /**
   * A page read `collection` of the space at `address` direct:  watch its files for `CONNECTED_MS` more.
   * - Its first read of `collection` waits while that list is brought into step with the folder.
   * - NEVER throws:  a failure is logged, and the read goes ahead.
   */
  private async connect(address: string, collection: string): Promise<void> {
    try {
      let connection = this.connections.get(address)
      if (connection) connection.lettingGo.refresh()
      else {
        const lettingGo = setTimeout(() => this.disconnect(address), CONNECTED_MS)
        lettingGo.unref()
        connection = { lettingGo, inStep: new Map(), place: this.placeFor(address, undefined) }
        this.connections.set(address, connection)
        const place = await connection.place
        // the place's watch hears the disk for every collection;  nobody's told anything here
        if (place instanceof FolderPlace && this.connections.get(address) === connection) {
          connection.stop = place.watch({ collection }, () => {})
        }
      }
      let inStep = connection.inStep.get(collection)
      if (!inStep) {
        const brought = connection.place.then((place) =>
          place instanceof FolderPlace ? place.keepInStep(collection) : undefined
        )
        // a failure isn't kept:  the next read tries again
        inStep = brought.catch((error: unknown) => {
          connection!.inStep.delete(collection)
          throw error
        })
        connection.inStep.set(collection, inStep)
      }
      await inStep
    } catch (ignored) {
      console.error(`SpaceFolders:  can't watch ${address} for a page reading it direct:`, ignored)
    }
  }

  /** Stop watching the space at `address`:  no page has read it for `CONNECTED_MS`. */
  private disconnect(address: string): void {
    const connection = this.connections.get(address)
    if (!connection) return
    clearTimeout(connection.lettingGo)
    connection.stop?.()
    this.connections.delete(address)
  }

  ////////////////
  // ## Folders
  ////////////////

  /** The folder at `address`, its storage and members, made once:  `undefined` for one with no folder on disk. */
  private folderAt(address: string): SpaceFolder | undefined {
    const known = this.folders.get(address)
    if (known) return known
    const root = this.diskFolderFor(address)
    if (!root) return undefined
    const storage = new DiskStorage(root)
    const onDeleted = () => this.forget(address)
    const realSpace = () => this.realSpaceAt(address)
    const members = new SpaceMembers({
      address,
      storage,
      people: this.people,
      onDeleted,
      realSpace,
      orgRoles: this.orgRoles
    })
    const folder = { root, storage, members }
    this.folders.set(address, folder)
    return folder
  }

  /** Forget the folder at `address`, and its place:  it was deleted.  The next ask opens it afresh. */
  private forget(address: string): void {
    this.folders.get(address)?.storage.close()
    this.folders.delete(address)
    this.places.delete(address)
    this.files.delete(address)
    void this.realSpaces
      .get(address)
      ?.then((real) => real?.stop())
      .catch(() => {})
    this.realSpaces.delete(address)
    this.projections.get(address)?.stop()
    this.projections.delete(address)
    void this.inboxes
      .get(address)
      ?.then((inbox) => inbox?.stop())
      .catch(() => {})
    this.inboxes.delete(address)
  }

  /** The folder at `address`, if it's a space's own, read direct:  never a program's own data, or no address at all. */
  /**
   * May `person` (`undefined`:  nobody signed in) read the space at `address`?
   * - By its own list and settings (`SpaceMembers.mayRead()`), and not while the space, or their account, is taken down.
   * - `false` for an address that's no space's.
   * - NEVER throws.
   */
  async mayReadSpace(address: string, person: string | undefined): Promise<boolean> {
    const folder = this.spaceFolderAt(address)
    if (!folder || !(await folder.members.mayRead(person))) return false
    return !(await this.takedowns.takenDownIn(address, person)).isWhole
  }

  /** Does anyone at all read the space at `address`, signed in or not?  `false` for an address that's no space's. */
  async isPublicSpace(address: string): Promise<boolean> {
    const folder = this.spaceFolderAt(address)
    return !!folder && (await folder.members.settings()).publicRead
  }

  private spaceFolderAt(address: string): SpaceFolder | undefined {
    if (!SP.SpellLocation.isAddress(address) || whoWritesFolderAt(address) !== "its members") return undefined
    return this.folderAt(address)
  }

  /**
   * `changeOrDie`, refusing every change first while the folder at `address` is in a QUIET event's spaces
   * (`OrgEvents.isQuietAt()`, epic `atmosphere` P32):  read only, its record kept.
   * - throws `PlaceError` `"refused"`, `"place"`
   */
  private quietOrDie(address: string, changeOrDie: (change: ThingChange) => Promise<void>) {
    return async (change: ThingChange): Promise<void> => {
      if (await this.events.isQuietAt(address)) {
        throw new PlaceError(`${address} is quiet:  its event is over, and it's read only`, {
          cause: { kind: "refused", whyNot: "place" }
        })
      }
      await changeOrDie(change)
    }
  }

  /**
   * `person`'s feed in org `org` (`PersonFeed`, epic `atmosphere` P33):  what's new across every space of it they may
   * read, each read as them;  made once.
   */
  private feedOf(person: string, org: string): PersonFeed {
    const key = `${person} in ${org}`
    const known = this.feeds.get(key)
    if (known) return known
    const feed = new PersonFeed({
      person,
      org,
      spacesOf: (org) => this.lists.spacesOf(org, [`${FEED_POSTS}.list.json`]),
      placeAt: (address) => this.placeFor(address, undefined),
      isQuietAt: (address) => this.events.isQuietAt(address)
    })
    this.feeds.set(key, feed)
    return feed
  }

  /**
   * `person`'s list of threads in org `org` (`PersonThreads`, epic `atmosphere` P37):  every chat thread of it they may
   * read;  made once.
   */
  private threadsOf(person: string, org: string): PersonThreads {
    const key = `${person} in ${org}`
    const known = this.threadLists.get(key)
    if (known) return known
    const roles = this.orgRoles
    const threads = new PersonThreads({
      person,
      org,
      spacesOf: (org) => roles.pairedSpacesOf(org),
      isInOrg: (org, who) => roles.isInOrg(org, who),
      managersOf: (space) => roles.managersOfSpace(space),
      placeAt: (address) => this.placeFor(address, undefined)
    })
    this.threadLists.set(key, threads)
    return threads
  }

  /**
   * Org `org`'s roles as a place (`OrgRolesPlace`):  what its Admin page reads and writes, at `@rs/__admin/roles`.
   * - `undefined` for an address with no folder on disk.
   */
  private rolesPlaceOf(org: string): OrgRolesPlace | undefined {
    const known = this.rolesPlaces.get(org)
    if (known) return known
    const orgMembers = this.folderAt(`@${org}`)?.members
    if (!orgMembers) return undefined
    const place = new OrgRolesPlace({
      org,
      orgRoles: this.orgRoles,
      events: this.events,
      people: this.people,
      orgMembers
    })
    this.rolesPlaces.set(org, place)
    return place
  }

  ////////////////
  // ## Addresses
  ////////////////

  /**
   * The full address `name` stands for, asked by `identity`:
   * - `personal/recipes` is theirs, `__data/recipes` in it
   * - `@rs/__inbox`, an org's with no person, is their own inbox there:  `ana@rs/__inbox` for `ana@rs` (P29), or
   *   `owen@rs/__inbox` for `owen@spell`, their id in that org;  nobody asking, none
   * - `@rs/__feed` likewise their own feed there (P33), and `@rs/__threads` their own list of threads (P37)
   */
  private addressFor(name: string, identity: string | undefined): string | undefined {
    const personal = `${PERSONAL_FOLDERS}/`
    const [head = "", next] = name.split("/")
    if (head.startsWith("@") && (next === INBOX_SPACE || next === FEED_SPACE || next === THREADS_SPACE)) {
      const asker = identity === undefined ? undefined : SP.SpellLocation.accountParts(identity)
      return asker && `${asker.id}@${head.slice(1)}${name.slice(head.length)}`
    }
    if (!name.startsWith(personal)) return SP.SpellLocation.isAddress(name) ? name : undefined
    if (!identity) return undefined
    return `${identity}/${DATA_FOLDER}/${name.slice(personal.length)}`
  }

  /** The folder on disk an address names;  `undefined` for one with none (`@local/...`) or that climbs out. */
  private diskFolderFor(address: string): string | undefined {
    if (address.split("/").some((part) => !part || part === "." || part === "..")) return undefined
    try {
      return this.folderFor(address)
    } catch {
      return undefined
    }
  }
}

/** The org of an account or a space's first part:  `bo@rs` => `rs`. */
function orgOfAccount(account: string): string {
  return account.slice(account.indexOf("@") + 1)
}

/** Constructor props of `SpaceFolders`:  each one's default is the app's own, so a test hands in its own. */
export type SpaceFoldersProps = {
  /** Where an address's folder is on disk;  default `folderForPlace()`. */
  folderFor?: (address: string) => string
  /** People and orgs, for an org's roles;  default spell.spaces' own. */
  people?: PeopleStore
  /** Who's asking, as an address:  default whoever's signed in, else this machine's person, `owen@spell`. */
  personFor?: (request: SRV.Request) => string
  /** Signs and checks the credentials a space is read direct with:  default a key for this run alone. */
  credentials?: ReadCredentials
  /** Where people ask about a takedown:  default the server's (`environment.abuseContact`). */
  abuseContact?: string
  /**
   * The org's account, signed in, that a space kept in the real Space `uri` is written as (epic `atmosphere` P14):
   * default the test org's (`environment.testOrg`), signed in once with its app password;  `undefined` for none.
   */
  orgAccess?: (uri: string) => Promise<AtProtoAccess | undefined>
  /** Where accounts' documents are, for the real Spaces:  default the test org's network, else the real one. */
  network?: Partial<Pick<AtProtoNetwork, "directory">>
  /** Where the writes not yet in a real Space are kept:  default `space-writes.json` in `environment.queueDir`. */
  queueFile?: string
  /**
   * Where inbox mail goes (epic `atmosphere` P30):  the local catcher, until P18's sender.
   * Left out:  nobody hears of their inbox by mail (`mail` is `undefined`).
   */
  mailer?: Mailer
  /** This server's address, as a mail's links start:  `https://spell.app`.  Default none:  links from the root. */
  address?: () => string
}

/** Each of `tellers` told of a write, in turn:  `undefined` when there are none. */
function writtenTo(
  tellers: ReadonlyArray<((written: readonly PlaceEvent[]) => void) | undefined>
): ((written: readonly PlaceEvent[]) => void) | undefined {
  const each = tellers.filter((teller) => teller !== undefined)
  if (!each.length) return undefined
  return (written) => {
    for (const teller of each) teller(written)
  }
}

/** The test org's account, signed in once, as it's first asked for:  none, without `environment.testOrg`. */
function testOrgAccess(): (uri: string) => Promise<AtProtoAccess | undefined> {
  let signedIn: Promise<AtProtoAccess> | undefined
  return async () => {
    const org = environment.testOrg
    if (!org) return undefined
    signedIn ??= (async () => {
      const network = org.network === undefined ? {} : spacesNetwork(org.network)
      const signIn = new AtProtoPasswordSignIn({ password: org.password, network })
      await signIn.signIn(org.handle)
      return signIn
    })()
    // a failed sign-in is tried again by the next ask
    return signedIn.catch((error: unknown) => {
      signedIn = undefined
      throw error
    })
  }
}

/** Where accounts' documents and handles are, on Spell's own Spaces host at `url` (as the Spaces trial's `SPACES_NETWORK`). */
function spacesNetwork(url: string): Pick<AtProtoNetwork, "directory" | "handles"> {
  return { directory: url, handles: url }
}

/** What `SpaceFolders.route()` adds its routes to. */
export type SpaceFoldersRoutes = {
  /** The server's routes. */
  router: SRV.Router
  /** Its guard:  this run's token or a sign-in, its own host and origin. */
  guard: SRV.Guard
  /** Answer websocket upgrades under a prefix (`SRV.WebServer.upgrade()`):  left out, no live rooms. */
  upgrade?: (prefix: string, handle: SRV.UpgradeHandler) => unknown
  /** The server's sign-in check, for a room's socket:  who's signed in on its device. */
  signIn?: { putPersonOn(request: SRV.Request): void }
}

/** A page asking to join a room. */
type RoomJoin = Pick<SpaceFoldersRoutes, "guard" | "signIn"> & {
  /** Its upgrade request. */
  raw: Parameters<SRV.UpgradeHandler>[0]
  /** Its socket. */
  socket: Parameters<SRV.UpgradeHandler>[1]
  /** What came after the request's headers. */
  head: Parameters<SRV.UpgradeHandler>[2]
}

/** A room asked for. */
type RoomAsk = Pick<SpaceFoldersRoutes, "guard" | "signIn"> & {
  /** Its space's address. */
  address: string
  /** Its one collection. */
  collection: string
}

/** A space a page is reading direct:  its files watched (`SpaceFolders.connect()`). */
type SpaceConnection = {
  /** Its place, opened for the watch. */
  place: Promise<Place | undefined>
  /** Stops the place's watch;  none until it's opened. */
  stop?: () => void
  /** When it lets go:  pushed back by each read. */
  lettingGo: NodeJS.Timeout
  /** Each collection brought into step on this connection, by name. */
  inStep: Map<string, Promise<void>>
}

/** One project data folder:  its files, and who's in its space. */
type SpaceFolder = {
  /** Its folder on disk. */
  root: string
  /** Its files. */
  storage: DiskStorage
  /** Its space's members. */
  members: SpaceMembers
}

/** How many bytes every file under `folder` holds:  `0` for a folder that isn't there.  - NEVER throws */
async function bytesIn(folder: string): Promise<number> {
  let total = 0
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) total += await bytesIn(path)
    else total += (await stat(path).catch(() => undefined))?.size ?? 0
  }
  return total
}

/**
 * `promise`, a place's refusal answered with its status (`PlaceServer.statusOf()`);  a bad name, 400.
 * - throws `HttpError`;  anything else as it was
 */
async function refusedAs<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error: unknown) => {
    if (error instanceof PlaceError) throw new SRV.HttpError(PlaceServer.statusOf(error), error.message)
    if (error instanceof TypeError) throw new SRV.HttpError(400, error.message)
    throw error
  })
}

/** Bytes kept by hash in `folder` (a space's `__blobs/`), each a file named by its hash, written all at once. */
function fileBytesIn(folder: string): FileBytes {
  const fileOf = (hash: string): string => {
    if (!/^[0-9a-f]{40}$/.test(hash)) throw new TypeError(`fileBytesIn():  "${hash}" isn't a hash of a file's bytes`)
    return join(folder, hash)
  }
  return {
    read: async (hash) => readFile(fileOf(hash)).catch(() => undefined),
    has: (hash) => fileUtils.pathExists(fileOf(hash)),
    write: async (hash, bytes) => void (await fileUtils.saveBinaryFile(fileOf(hash), Buffer.from(bytes))),
    remove: async (hash) => void (await fileUtils.deletePath(fileOf(hash)))
  }
}
