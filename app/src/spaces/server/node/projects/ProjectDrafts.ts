/**
 * A project's DRAFTS, PUBLISH and VERSIONS, on disk (epic `editor` P24, in atmosphere's shapes).
 * - Your edits go into your DRAFT, never the public file:  one per person per file, every save overwriting it.
 *   - In the project's private folder, `__draft/`, at its file's place, named for you and the day
 *     (Q22, Q24):  `Deck.spell`'s is `__draft/Deck.owen-2026-11-03.spell`;  someone signed in is named by their
 *     address, `__draft/Deck.ana@rs-2026-11-07.spell`.
 *   - A draft that's the same as the published file is no draft:  saving one deletes it.
 *   - Two people drafting one file each have their own;  publishing yours shows both when it changed since.
 * - WHERE the private folders are (epic `atmosphere` P26):
 *   - a project in an org's SHARED space (`@rs/minutes/Agenda`, `events_team@rs/welcome`):  at its place in that
 *     space's PRIVATE one, which only its Managers reach (`@rs/__private/minutes/Agenda/__draft/`), so the other
 *     Managers read your draft and nobody else does (`ProjectDrafts.for()`)
 *   - any other project (a person's, the family cookbook's, a built-in):  beside it, as `__draft/` and `versions/`
 * - PUBLISH writes each of your drafts to its public file, keeps the whole project as a new VERSION,
 *   and deletes your drafts.
 *   - A version is a zip of the project, `versions/<project>.<day>-<time>.zip` (Q22).
 *   - How many are kept:  the fewer of the org's policy (`OrgRoles.policy()`, its Admin space) and the project
 *     file's cap (`versionsKept`, Q26);  neither says:  every one.
 *   - It refuses (409) when a published file changed since your draft of it started, unless told to anyway (Q25).
 * - A KEPT DRAFT (epic `mockup`, the Versions dialog's "Save Current Changes"):  your draft over the published files,
 *   zipped beside the versions as `versions/<project>.<day>-<time>.draft.<person>.zip`.
 *   - Never published, never counted against the versions kept, and listed only to you.
 *   - Restored as any version is:  it's your draft again.
 * - The private folders, `__draft/` and `versions/`, are never served:  `isPrivatePath()`, which the routes ask.
 * - WHO may draft, and publish, asked through `ProjectRoles`;  no check of its own:
 *   - draft:  a DESIGNER of the project's space (`canDesign`, T47, J117):  its managers, and anyone its org lets design it
 *   - publish:  a manager of its space (`canPublish`, epic `atmosphere` P26, closing T10)
 *   - This machine's person may, anything this machine serves.
 * - Node only:  the routes (`project-utils.ts`) are its one caller;  the editor asks through `SPACES.ProjectFiles`.
 * - Knows nothing of where a place's folder is:  its caller hands `folderFor` (`folderForPlace()`), which keeps it
 *   free of the routes' module.
 */
import { readFile } from "fs/promises"
import JSON5 from "json5"

import { SRV } from "spell/server"
// Import directly:  the places barrel would load every place into the language server, which reads projects too
import { contentHash } from "spell/server/places/contentVersion"
import { SP } from "spell/parser/spell"
import type { DraftJSON, PublishJSON, VersionJSON } from "spell/app/spaces"
import { ADMIN_SPACE, PRIVATE_SPACE } from "spell/app/spaces/models/spaceNames"
import { OrgRoles, type PairedSpace } from "spell/app/spaces/server/node/people/OrgRoles"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { thisMachinesPerson } from "spell/app/spaces/server/node/people/localPerson"
import { peopleStore } from "spell/app/spaces/server/node/people/peopleRoutes"
import { unzipped, zipped } from "spell/app/spaces/server/node/storage/zip"

import * as fileUtils from "./file-utils"
import { ProjectRoles } from "./ProjectRoles"

export class ProjectDrafts {
  /** the project's id, e.g. `@spell/examples/Counter` */
  readonly projectId: string
  /** whose drafts, by address:  `ana@rs`;  this machine's person (`owen@spell`) until sign-in */
  readonly person: string
  /** the project's folder on disk */
  private readonly projectFolder: string
  /**
   * the folder its private folders, `__draft/` and `versions/`, are in:
   * the project's own, or its place in its space's private one
   */
  private readonly privateFolder: string
  /** its org, when it's in one of an org's paired spaces:  whose policy caps its versions */
  private readonly org: string | undefined
  /** the org's roles and policies */
  private readonly orgRoles: OrgRoles
  /** who may draft and publish:  `person`'s rights over the project */
  private readonly roles: ProjectRoles
  /** people and orgs */
  private readonly people: PeopleStore

  constructor({
    projectId,
    person = thisMachinesPerson().address,
    projectFolder = SP.SpellLocation.getProjectLocation(projectId).serverPath,
    privateFolder = projectFolder,
    org,
    people = peopleStore(),
    orgRoles = new OrgRoles({ people })
  }: ProjectDraftsProps) {
    this.projectId = projectId
    this.person = person
    this.projectFolder = projectFolder
    this.privateFolder = privateFolder
    this.org = org
    this.orgRoles = orgRoles
    this.people = people
    this.roles = new ProjectRoles({ projectId, person, folder: projectFolder, people, orgRoles })
  }

  /**
   * `person`'s drafts of project `projectId`, its private folders where they belong (see the file):
   * in its space's private one when it's in an org's shared space.
   * - `folderFor`:  where an address's folder is on disk (`folderForPlace()`)
   */
  static async for(
    projectId: string,
    person: string,
    { folderFor, people = peopleStore(), orgRoles = new OrgRoles({ people }), ...props }: ProjectDraftsForProps
  ): Promise<ProjectDrafts> {
    const space = await orgRoles.spaceAt(projectId)
    const privateAddress =
      space?.side === "shared" ? privateAddressOf(space) + projectId.slice(space.address.length) : undefined
    return new ProjectDrafts({
      projectId,
      person,
      people,
      orgRoles,
      ...props,
      org: space?.org,
      privateFolder: privateAddress === undefined ? props.projectFolder : folderFor(privateAddress)
    })
  }

  /** Is `filePath` (from the project's folder) inside its private folders, `__draft/` or `versions/`? */
  static isPrivatePath(filePath: string): boolean {
    const first = filePath.replace(/^\/+/, "").split("/")[0]
    return first === DRAFT_FOLDER || first === VERSIONS_FOLDER
  }

  /** May `person` publish this project's pages?  A manager of its space (`canPublish`). */
  async mayPublish(): Promise<boolean> {
    return await this.roles.may("publish")
  }

  /** May `person` draft this project's pages?  A designer of its space (`canDesign`, T47). */
  async mayDesign(): Promise<boolean> {
    return await this.roles.may("design")
  }

  /** - throws `SRV.HttpError(403)` unless `person` may publish, naming the role it takes */
  private async mayPublishOrDie(): Promise<void> {
    await this.roles.mayOrDie("publish")
  }

  ////////////////
  // ## Drafts
  ////////////////

  /** Your draft of `filePath`'s text, or `undefined` when you have none. */
  async read(filePath: string): Promise<string | undefined> {
    const path = await this.draftPathOf(filePath)
    return path === undefined ? undefined : ((await fileUtils.loadTextFile(path, "OPTIONAL")) ?? undefined)
  }

  /**
   * Save `contents` as your draft of `filePath`.
   * - The same as the published file:  your draft goes instead.
   * - throws 403 when you may not design its space (`mayDesign()`)
   */
  async save(filePath: string, contents: string): Promise<void> {
    await this.roles.mayOrDie("design")
    const published = await fileUtils.loadTextFile(this.publicPath(filePath), "OPTIONAL")
    if (published === contents) return await this.discard(filePath)
    const old = await this.draftPathOf(filePath)
    const path = this.newDraftPath(filePath)
    await fileUtils.saveTextFile(path, contents)
    if (old && old !== path) await fileUtils.deletePath(old)
    const records = await this.records()
    records[this.person] ??= {}
    records[this.person]![filePath] ??= { startedFrom: contentHash(published ?? "") }
    await this.saveRecords(records)
  }

  /**
   * Save `contents` straight to `filePath`'s public file, and drop your draft of it:
   * no draft at all (a built-in project's file in a checkout, epic `mockup` P20, r3:  so the edit shows in git).
   * - Your draft goes too:  you were looking at its text when you saved, so nothing's lost,
   *   and the old draft can't be served over the save.
   * - throws 403 when you may not design its space (`mayDesign()`)
   */
  async saveToFile(filePath: string, contents: string): Promise<void> {
    await this.roles.mayOrDie("design")
    await fileUtils.saveTextFile(this.publicPath(filePath), contents)
    await this.discard(filePath)
  }

  /**
   * Delete your draft of `filePath`, back to what's published.  Nothing to delete:  nothing happens.
   * - Your last draft gone:  your build goes too (`dropYourBuild()`).
   */
  async discard(filePath: string): Promise<void> {
    const path = await this.draftPathOf(filePath)
    if (path) await fileUtils.deletePath(path)
    const records = await this.records()
    const mine = records[this.person]
    if (!mine || !(filePath in mine)) return
    delete mine[filePath]
    if (!Object.keys(mine).length) {
      delete records[this.person]
      await this.dropYourBuild()
    }
    await this.saveRecords(records)
  }

  /** Your drafts, each with whether its published file changed since it started (`clashes`), and both texts then. */
  async drafts(): Promise<DraftJSON[]> {
    const mine = (await this.records())[this.person] ?? {}
    const answers = await Promise.all(
      Object.entries(mine).map(async ([filePath, record]) => {
        const text = await this.read(filePath)
        if (text === undefined) return undefined
        const theirs = (await fileUtils.loadTextFile(this.publicPath(filePath), "OPTIONAL")) ?? ""
        const clashes = contentHash(theirs) !== record.startedFrom
        return { filePath, person: this.nameTag, clashes, mine: text, theirs }
      })
    )
    return answers.filter((draft) => draft !== undefined)
  }

  /** Everyone with a draft of this project, by address:  whose a Manager may publish (`publish({ of })`, T47). */
  async drafters(): Promise<string[]> {
    return Object.keys(await this.records())
  }

  /** The files you have a draft of, from the project's folder, e.g. `["/Counter.spell"]`:  the index lists new ones. */
  async draftedFiles(): Promise<string[]> {
    return Object.keys((await this.records())[this.person] ?? {})
  }

  ////////////////
  // ## Your build
  ////////////////

  /*
   * YOUR BUILD (epic `mockup` P20, J86):  what the editor compiles from your drafts, never the project's shared build.
   * - While you have drafts, what spell builds (`Solitaire.spell.js`, its words, maps) is saved here, beside your
   *   drafts:  `__draft/__build.<person>/`, private as every draft is.
   * - The file route serves it to you first;  everyone else gets the shared build, made from the published files.
   * - Your last draft published or discarded:  it goes, and you're back on the shared build.
   */

  /** Do you have any draft of this project, so what spell builds for you is your own? */
  async hasDrafts(): Promise<boolean> {
    return (await this.draftedFiles()).length > 0
  }

  /** Save `contents` of built file `filePath` (`/Solitaire.spell.js`) into your build. */
  async saveBuilt(filePath: string, contents: unknown): Promise<void> {
    await this.roles.mayOrDie("design")
    await fileUtils.saveFile(this.yourBuildPath(filePath), contents)
  }

  /** Path on disk of built file `filePath` in your build, or `undefined` when your build has none. */
  async builtPathOf(filePath: string): Promise<string | undefined> {
    const path = this.yourBuildPath(filePath)
    return (await fileUtils.pathExists(path)) ? path : undefined
  }

  /** SIDE EFFECT:  your build is gone, if you had one. */
  private async dropYourBuild(): Promise<void> {
    const folder = this.privatePath(DRAFT_FOLDER, `${BUILD_FOLDER_PREFIX}${this.nameTag}`)
    if (await fileUtils.pathExists(folder)) await fileUtils.deletePath(folder)
  }

  /** Where built file `filePath` goes in your build. */
  private yourBuildPath(filePath: string): string {
    return this.privatePath(
      DRAFT_FOLDER,
      `${BUILD_FOLDER_PREFIX}${this.nameTag}`,
      ...filePath.replace(/^\/+/, "").split("/")
    )
  }

  ////////////////
  // ## Publish
  ////////////////

  /**
   * Publish every draft:  write each to its public file, keep the project as a new version, delete the drafts.
   * - `of`:  whose drafts, by address:  yours, or a DESIGNER's (T47), whose drafts a Manager publishes for them
   * - throws 409 when a published file changed since the draft started, unless `anyway` (Q25)
   * - throws 403 unless you may publish (`mayPublish()`)
   * - Nothing drafted:  nothing written, no version.
   */
  async publish({ anyway = false, of }: { anyway?: boolean; of?: string } = {}): Promise<PublishJSON> {
    await this.mayPublishOrDie()
    return of === undefined || of === this.person
      ? await this.publishDrafts(anyway)
      : await this.draftsOf(of).publishDrafts(anyway)
  }

  /** `of`'s drafts of the same project:  for a Manager publishing a designer's. */
  private draftsOf(of: string): ProjectDrafts {
    const { projectId, projectFolder, privateFolder, org, people, orgRoles } = this
    return new ProjectDrafts({ projectId, person: of, projectFolder, privateFolder, org, people, orgRoles })
  }

  /** Publish `person`'s drafts:  see `publish()`, which checks who may. */
  private async publishDrafts(anyway: boolean): Promise<PublishJSON> {
    const drafts = await this.drafts()
    if (!drafts.length) return { published: [] }
    const clashes = drafts.filter((draft) => draft.clashes).map((draft) => draft.filePath)
    if (clashes.length && !anyway) {
      throw new SRV.HttpError(409, `changed since your draft began:  ${clashes.join(", ")}`)
    }
    for (const { filePath, mine } of drafts) {
      await fileUtils.saveTextFile(this.publicPath(filePath), mine)
      await this.discard(filePath)
    }
    const version = await this.keepVersion()
    return { published: drafts.map((draft) => draft.filePath), version }
  }

  ////////////////
  // ## Versions
  ////////////////

  /** The project's versions, and your kept drafts (`keepDraft()`), newest first. */
  async versions(): Promise<VersionJSON[]> {
    const folder = this.privatePath(VERSIONS_FOLDER)
    if (!(await fileUtils.pathExists(folder))) return []
    const names = await fileUtils.getFolderContents(folder, { namesOnly: true, pattern: /\.zip$/ })
    const versions: VersionJSON[] = []
    for (const name of names) {
      const { at, draftOf } = versionNameParts(name.slice(this.projectName.length + 1))
      if (draftOf === undefined) versions.push({ name, at })
      else if (draftOf === this.nameTag) versions.push({ name, at, draft: true })
    }
    return versions.sort((one, other) => other.at.localeCompare(one.at))
  }

  /**
   * SIDE EFFECT:  keep your draft as a version of its own, never published:
   * the Versions dialog's "Save Current Changes" (see the file).
   * - Every public file, each you have a draft of as your draft has it.
   * - throws 409 when you have no draft;  403 when you may not design the project (`mayDesign()`)
   */
  async keepDraft(): Promise<VersionJSON> {
    await this.roles.mayOrDie("design")
    const drafts = await this.drafts()
    if (!drafts.length) throw new SRV.HttpError(409, `${this.projectId}:  you have no draft to keep`)
    const mine = new Map(drafts.map(({ filePath, mine }) => [filePath, Buffer.from(mine, "utf8")]))
    const entries = await Promise.all(
      (await this.publicFiles())
        .filter((filePath) => !mine.has(filePath))
        .map(async (filePath) => [filePath, await readFile(this.publicPath(filePath))] as const)
    )
    const { name, at } = await this.newVersionName(`.${DRAFT_MARK}.${this.nameTag}`)
    await fileUtils.saveBinaryFile(this.privatePath(VERSIONS_FOLDER, name), zipped([...entries, ...mine]))
    return { name, at, draft: true }
  }

  /**
   * SIDE EFFECT:  keep version `name` for good:  no cap on versions ever drops it (epic `atmosphere` P29).
   * - A message that must never change points to it (the app's `PersonInbox`, a fixed pointer's `saved_version`).
   * - Kept in `versions/__kept.json5`, beside the versions:  never served, as the folder isn't.
   * - throws 404 when there's no such version
   */
  async keepForGood(name: string): Promise<void> {
    if (name.includes("/") || !(await fileUtils.pathExists(this.privatePath(VERSIONS_FOLDER, name)))) {
      throw new SRV.HttpError(404, `${this.projectId} has no version ${name}`)
    }
    const kept = await this.keptForGood()
    if (kept.includes(name)) return
    await fileUtils.saveTextFile(
      this.privatePath(VERSIONS_FOLDER, KEPT_FILE),
      JSON5.stringify([...kept, name], null, 2)
    )
  }

  /** The versions kept for good (`keepForGood()`), by name. */
  async keptForGood(): Promise<string[]> {
    const said = await fileUtils.loadTextFile(this.privatePath(VERSIONS_FOLDER, KEPT_FILE), "OPTIONAL")
    const names: unknown = said ? JSON5.parse(said) : []
    return Array.isArray(names) ? names.filter((each): each is string => typeof each === "string") : []
  }

  /**
   * Make a draft of every file version `name` holds that differs from what's published.
   * - Restoring is drafting, so nothing public changes until Publish.
   * - A file it holds as published:  your draft of it goes, so the project is the version's throughout.
   * - Returns the files it changed:  drafted, or your draft gone.
   * - throws 404 when there's no such version
   */
  async restore(name: string): Promise<string[]> {
    const path = this.privatePath(VERSIONS_FOLDER, name)
    if (name.includes("/") || !(await fileUtils.pathExists(path))) {
      throw new SRV.HttpError(404, `${this.projectId} has no version ${name}`)
    }
    const yours = await this.draftedFiles()
    const changed: string[] = []
    for (const [filePath, contents] of unzipped(await readFile(path))) {
      const published = await fileUtils.loadTextFile(this.publicPath(filePath), "OPTIONAL")
      if (published === contents.toString("utf8") && !yours.includes(filePath)) continue
      // the same as published:  `save()` discards your draft
      await this.save(filePath, contents.toString("utf8"))
      changed.push(filePath)
    }
    return changed
  }

  /**
   * Zip the project's public files as a new version, then drop the oldest past what's kept:  the fewer of the org's
   * policy and the project's cap (see the file).  Returns its name.
   */
  private async keepVersion(): Promise<string> {
    const files = await this.publicFiles()
    const entries = await Promise.all(
      files.map(async (filePath) => [filePath, await readFile(this.publicPath(filePath))] as const)
    )
    const { name } = await this.newVersionName()
    await fileUtils.saveBinaryFile(this.privatePath(VERSIONS_FOLDER, name), zipped(entries))
    const kept = await this.versionsKept()
    if (kept !== undefined) {
      // a version a message points to stays, past the cap:  it's never counted, never dropped;  nor is a kept draft
      const forGood = await this.keptForGood()
      const counted = (await this.versions()).filter(({ name: each, draft }) => !draft && !forGood.includes(each))
      for (const { name: old } of counted.slice(kept)) {
        await fileUtils.deletePath(this.privatePath(VERSIONS_FOLDER, old))
      }
    }
    return name
  }

  /**
   * A new version's file name, stamped now, `mark` before `.zip` (a kept draft's):  two in the same second,
   * the second gets `-2`, so no version is ever written over.
   */
  private async newVersionName(mark = ""): Promise<{ name: string; at: string }> {
    const stamp = versionStamp(new Date())
    let at = stamp
    for (
      let count = 2;
      await fileUtils.pathExists(this.privatePath(VERSIONS_FOLDER, this.versionName(at, mark)));
      count++
    ) {
      at = `${stamp}-${count}`
    }
    return { name: this.versionName(at, mark), at }
  }

  /** `Counter.2026-11-03-091502.zip`, or with `mark`, `Counter.2026-11-03-091502.draft.owen.zip` */
  private versionName(at: string, mark: string): string {
    return `${this.projectName}.${at}${mark}.zip`
  }

  /** How many versions are kept:  the fewer of the org's policy and the project file's cap;  `undefined`, every one. */
  private async versionsKept(): Promise<number | undefined> {
    const caps: number[] = []
    if (this.org) {
      const { versionsKept } = await this.orgRoles.policy(this.org)
      if (versionsKept !== undefined) caps.push(versionsKept)
    }
    const projects = (await fileUtils.loadJSONFile(this.projectPath(SP.PROJECT_FILE), "OPTIONAL"))?.versionsKept
    if (typeof projects === "number" && projects > 0) caps.push(projects)
    return caps.length ? Math.min(...caps) : undefined
  }

  /** Every public file of the project, as `/Button/Usage.spell`:  never the private folders, nor hidden files. */
  private async publicFiles(): Promise<string[]> {
    const files = await fileUtils.getFilesInside(this.projectPath(), { ignoreFolder: ProjectDrafts.isPrivatePath })
    return files.map((file) => `/${file}`).filter((filePath) => !ProjectDrafts.isPrivatePath(filePath))
  }

  ////////////////
  // ## Where things are
  ////////////////

  /** the project's folder name, e.g. `Counter` */
  get projectName(): string {
    return this.projectId.split("/").at(-1) || "project"
  }

  /** Path on disk of `parts`, inside the project's folder. */
  private projectPath(...parts: string[]): string {
    return fileUtils.joinPath(this.projectFolder, ...parts)
  }

  /** Path on disk of `parts`, inside the folder the project's private folders are in. */
  private privatePath(...parts: string[]): string {
    return fileUtils.joinPath(this.privateFolder, ...parts)
  }

  /** How a draft's name says whose it is:  this machine's person by their id (`owen`), anyone else by address. */
  private get nameTag(): string {
    const local = thisMachinesPerson()
    return this.person === local.address ? local.id : this.person
  }

  /** Path on disk of `filePath`'s public file. */
  private publicPath(filePath: string): string {
    return this.projectPath(...filePath.replace(/^\/+/, "").split("/"))
  }

  /** Where today's draft of `filePath` goes:  `__draft/<folder>/<name>.<person>-<day><extensions>` (Q24). */
  private newDraftPath(filePath: string): string {
    const { folder, stem, extensions } = partsOf(filePath)
    return this.privatePath(DRAFT_FOLDER, ...folder, `${stem}.${this.nameTag}-${dayStamp(new Date())}${extensions}`)
  }

  /**
   * Path on disk of your draft of `filePath`, whichever day it was saved, or `undefined`.
   * - What a change asked for in the editor edits, when you have one (`POST /api/changes`, epic `editor` I152)
   */
  async draftPathOf(filePath: string): Promise<string | undefined> {
    const { folder, stem, extensions } = partsOf(filePath)
    const where = this.privatePath(DRAFT_FOLDER, ...folder)
    if (!(await fileUtils.pathExists(where))) return undefined
    const mine = new RegExp(`^${escaped(stem)}\\.${escaped(this.nameTag)}-\\d{4}-\\d{2}-\\d{2}${escaped(extensions)}$`)
    const name = (await fileUtils.getFolderContents(where, { namesOnly: true })).find((each) => mine.test(each))
    return name === undefined ? undefined : fileUtils.joinPath(where, name)
  }

  /**
   * What's drafted, by person, then by file:  `__draft/__drafts.json5`.
   * - An older file, by file alone, each naming its person (`{ "/p.spell": { person: "owen", ... } }`), is read as
   *   the same.
   */
  private async records(): Promise<DraftRecords> {
    const text = await fileUtils.loadTextFile(this.privatePath(DRAFT_FOLDER, RECORDS_FILE), "OPTIONAL")
    const said: Record<string, any> = text ? JSON5.parse(text) : {}
    const records: DraftRecords = {}
    for (const [key, value] of Object.entries(said)) {
      if (typeof value?.startedFrom === "string") {
        const local = thisMachinesPerson()
        const person = value.person === local.id ? local.address : String(value.person)
        ;(records[person] ??= {})[key] = { startedFrom: value.startedFrom }
      } else records[key] = { ...records[key], ...value }
    }
    return records
  }

  private async saveRecords(records: DraftRecords): Promise<void> {
    const path = this.privatePath(DRAFT_FOLDER, RECORDS_FILE)
    if (Object.keys(records).length) await fileUtils.saveJSON5File(path, records)
    else if (await fileUtils.pathExists(path)) await fileUtils.deletePath(path)
  }
}

/** Constructor props of `ProjectDrafts`. */
export type ProjectDraftsProps = {
  /** the project's id, e.g. `@rs/minutes/Agenda` */
  projectId: string
  /** whose drafts, by address;  default this machine's person */
  person?: string
  /** the project's folder on disk;  default its location's */
  projectFolder?: string
  /** the folder its private folders are in;  default the project's own */
  privateFolder?: string
  /** its org, when it's in one of an org's paired spaces:  whose policy caps its versions */
  org?: string
  /** people and orgs;  default spell.spaces' own */
  people?: PeopleStore
  /** the org's roles and policies;  default over `people` */
  orgRoles?: OrgRoles
}

/** Props of `ProjectDrafts.for()`:  where an address's folder is, and the rest as the constructor's. */
export type ProjectDraftsForProps = Omit<ProjectDraftsProps, "projectId" | "person" | "privateFolder" | "org"> & {
  /** where an address's folder is on disk (`folderForPlace()`) */
  folderFor: (address: string) => string
}

/** Drafts' private folder in a project. */
export const DRAFT_FOLDER = "__draft"
/** Versions' private folder in a project. */
export const VERSIONS_FOLDER = "versions"
/** What marks a kept draft's file name in `versions/`, before its person:  `.draft.owen.zip` (`keepDraft()`). */
const DRAFT_MARK = "draft"
/** The versions kept for good, inside `versions/` (`keepForGood()`). */
const KEPT_FILE = "__kept.json5"
/** Your build's folder inside `__draft/`, before your name tag:  `__build.owen` (see "Your build"). */
const BUILD_FOLDER_PREFIX = "__build."
/** What's drafted, by file, inside `__draft/`. */
const RECORDS_FILE = "__drafts.json5"

/** A draft's record:  the published text's hash as it started, to see a clash. */
type DraftRecord = { startedFrom: string }

/** What's drafted:  by person's address, then by file. */
type DraftRecords = Record<string, Record<string, DraftRecord>>

/**
 * The address of the PRIVATE space paired with `space`:  `@rs/__private`, `events_team@rs/__private`;
 * the Admins' is the Admin space, `@rs/__admin`.
 */
function privateAddressOf(space: PairedSpace): string {
  if (space.of.kind === "the-admin-space") return `@${space.org}/${ADMIN_SPACE}`
  return `${space.address}/${PRIVATE_SPACE}`
}

/**
 * A version's file name after its project's:  `2026-11-03-091502.zip` => `{ at: "2026-11-03-091502" }`;
 * a kept draft's, `2026-11-03-091502.draft.owen.zip` => `{ at, draftOf: "owen" }`.
 */
function versionNameParts(rest: string): { at: string; draftOf?: string } {
  const bare = rest.slice(0, -".zip".length)
  const mark = bare.indexOf(`.${DRAFT_MARK}.`)
  return mark < 0 ? { at: bare } : { at: bare.slice(0, mark), draftOf: bare.slice(mark + DRAFT_MARK.length + 2) }
}

/** `/a/Deck.spell` => `{ folder: ["a"], stem: "Deck", extensions: ".spell" }` */
function partsOf(filePath: string): { folder: string[]; stem: string; extensions: string } {
  const parts = filePath.replace(/^\/+/, "").split("/")
  const name = parts.pop()!
  const dot = name.indexOf(".")
  return dot < 0
    ? { folder: parts, stem: name, extensions: "" }
    : { folder: parts, stem: name.slice(0, dot), extensions: name.slice(dot) }
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** `2026-11-03` */
function dayStamp(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`
}

/** `2026-11-03-091502`:  sortable, and one per second */
function versionStamp(date: Date): string {
  return `${dayStamp(date)}-${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${twoDigits(date.getSeconds())}`
}

function twoDigits(number: number): string {
  return String(number).padStart(2, "0")
}
