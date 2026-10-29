import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { parseHTML } from "linkedom"

import { RealPath } from "spell/server/RealPath"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicRepo } from "spell/epic/config/EpicRepo"
import { DataFile, type DataFileMove } from "spell/epic/data/DataFile"
import { RepoList } from "spell/epic/server/RepoList"
import { SRV } from "spell/server"

import { planDocIn } from "spell/epic/tools/pages.js"
import { PlanDocError, type CommitLogEntry, type PlanDocOptions, type PlanDocParts } from "./planDoc.types"

import { EpicParts } from "./EpicParts"
import { Migrations, type AnchorMove, type InboxView, type Migration, type MigrationContext } from "./migrations"
import { PlanCommits } from "./PlanCommits"
import { PlanDoc } from "./PlanDoc"
import { PlanMarkup } from "./PlanMarkup"
import { PART_SOURCE, PARTS_DIR, PlanParts } from "./PlanParts"
import { ReviewInbox } from "./ReviewInbox"
import { SagaPage } from "./SagaPage"
import { epicNamed } from "./SeeAlso"
import { ServedFolders } from "./ServedFolders"

/****************
 * ### `PlanDocFiles`
 * The epic pages of ONE spell-app checkout, on disk.
 * - where each epic's doc is, reading it whole, editing it under its lock, writing it back tidy
 * - and the git facts the tool needs about it
 *
 * - the doc is the checkout's `epics/<name>/`:  a link to the one shared copy every checkout edits (`findDoc()`)
 * - a doc is FOUND under either name (`planDocIn()`):
 *   `<name>.plan.html` since 2026-10-04, else the old `<name>.html`, which worktrees cut before then still have
 * - the `<epic-*>` markup only (a `PlanDoc`):
 *   - a doc still in the old `ui-*` markup (one restored from an old backup) is REFUSED by every command,
 *     reading or editing, writing nothing
 *   - the tool read such a doc until every doc was converted (epic `epic-components`, P12);  no more since P15
 *   - the converter itself went in epic `repo-split` (Q45):  such a doc is upgraded from git history by hand
 * - every edit (`edit()`), in order:
 *   - takes the doc's lock:  parallel agents queue instead of clobbering each other
 *   - parses it, and changes it through `PlanDoc`
 *   - recolours every item (`updateStates()`), and stamps "updated"
 *   - checks it against the definitions:  an edit that breaks the markup is refused
 *   - tidies it in memory (link targets, oxfmt), and writes each file once, atomically (`writeDoc()`)
 * - a doc may be SPLIT:  a skeleton plus part files, `parts/<id>.html` (`EpicParts`).
 *   - reading assembles it into one document;  `writeDoc()` splits it again
 *   - so every command works on either shape
 *   - a part file is written only when its body changed
 * - Node only (`node:fs`, git, `spell/server`'s lock, linker and formatter):
 *   NOT in the `spell-epic` barrel, imported by path.
 * - Knows nothing of the command line (`PlanDocCommands`).
 *   It rebuilds the docs index by running its tool, `tools/index.js`, as the command line does (`reindex()`).
 ****************/
export class PlanDocFiles {
  /**
   * the checkout's root:  its repo's content folder (`content`) and docs tools
   * - STATIC for the object's life
   * - the command line makes one for the checkout it runs in (a worktree's, while the code may be main's)
   */
  readonly root: string

  /**
   * the repo's content folder (`EpicConfig.contentOf()`):  its `epics/`, `pages/`, `sagas/` (epic `epic-eject` P12),
   * never through a link at the checkout's root
   */
  readonly content: string

  /** `epics/`:  epic pages, `epics/<name>/<name>.plan.html`, their inboxes and details pages */
  readonly epics: string

  /**
   * the template `new` copies:  the tool's OWN, in `<epic-*>` markup (`templates/plan.html` beside this)
   * - tracked with the code that writes it (the shared `templates/epics/plan.html` retired at the switch, P12)
   */
  readonly template: string

  /** `pages/details/`:  scratch details pages (`epic ask create`), where the item picker's page lives */
  readonly details: string

  /**
   * where the docs tools run (`index.js`, `check-spell.js`, `open.js`):  the root of THIS code's checkout, spell-epic,
   * the package `docsTools` is in
   * - spell-app's `packages/epics` before epic `epic-eject`'s switch-over:  no checkout has one since
   */
  readonly docsPackage: string

  /**
   * `src/tools` beside THIS code:  the docs tools this runs as children, never imports.
   * - ONE copy of the code (epic `epic-eject` P5):  the running `epic`'s own tools, whichever checkout `root` is
   * - they work on `root` through `toolEnv`'s `EPIC_CHECKOUT`
   */
  readonly docsTools: string

  /** link targets for the checkout's pages:  its bare-name index is built once per process */
  readonly linker: SRV.Linker

  /**
   * - `content`:  the content folder, when it isn't the checkout's (`EpicConfig.contentOf()`):  a demo check's scratch
   *   copies (`src/demo/shots/`), which sit inside a checkout whose config names the real one
   */
  constructor({
    root = CHECKOUT,
    template = TEMPLATE,
    content = EpicConfig.contentOf(root)
  }: { root?: string; template?: string; content?: string } = {}) {
    this.root = root
    this.content = content
    this.epics = join(this.content, "epics")
    this.template = template
    this.details = join(this.content, "pages", "details")
    this.docsPackage = resolve(DOCS_TOOLS, "..", "..")
    this.docsTools = DOCS_TOOLS
    // under the checkout the content is served in, which isn't this one for spell-epic's own epics (I22);  told its
    // served addresses, so `components/epics/` and `templates/` check as the folders they serve (I27)
    const linkRoot = new RepoList().linkRootOf(root, content)
    this.linker = new SRV.Linker(linkRoot, { served: ServedFolders.under(linkRoot) })
  }

  /** The environment the docs tools run in:  this process's, with `root` as the checkout they work on. */
  get toolEnv(): NodeJS.ProcessEnv {
    return { ...process.env, EPIC_CHECKOUT: this.root }
  }

  ////////////////
  // ## Finding docs
  ////////////////

  /**
   * The doc `new` makes for plan `name`, in this checkout:  `epics/<name>/<name>.plan.html`.
   * - names are lower-kebab-case, as the folder
   */
  docPath(name: string): string {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new PlanDocError(`name "${name}" must be lower-kebab-case`)
    return join(this.epics, name, `${name}.plan.html`)
  }

  /**
   * The doc of epic `name`:  THIS checkout's `epics/<name>/`, either name (`planDocIn()`);  throws when there's none.
   * - a saga page's short address (`SAGA:/drawable-spell`):  that saga's page (`findSagaPage()`)
   * - an epic's old name, when no epic of that name is there:  today's (`epicNamed()`:  `guide-changes` is
   *   `feedback`, epic `epic-engine` T9)
   * - this checkout's path, not another's:  tidying and the URLs stay inside it
   *   (a path through another worktree, made relative here, starts `../../.claude/...`, which oxfmt refuses)
   */
  findDoc(name: string): string {
    const saga = SagaPage.idOf(name)
    if (saga) return this.findSagaPage(saga)
    this.docPath(name)
    const today = epicNamed(name)
    const found =
      PlanDocFiles.planDocIn(join(this.epics, name), name) ??
      (today === name ? undefined : PlanDocFiles.planDocIn(join(this.epics, today), today))
    if (!found)
      throw new PlanDocError(`no epic page for "${name}" (${relative(this.content, join(this.epics, name))}/)`)
    return found
  }

  /**
   * Saga `id`'s page (`SAGA:/<id>` to `findDoc()`, epic `epic-workflow` P15):  `sagas/<id>/<id>.saga.html`.
   * - an epic page of kind "saga", so the verbs that edit an epic page edit it too
   * - throws when there's none
   */
  findSagaPage(id: string): string {
    const file = new SagaPage(this).fileOf(id)
    if (!existsSync(file)) throw new PlanDocError(`no saga page for "${id}" (epic saga page ${id} makes it)`)
    return file
  }

  /**
   * Epic `name`'s epic page in folder `dir` (`epics/<name>/`):  `<name>.plan.html`, else `<name>.html`.
   * - `<name>.html` only when that is an epic page (`<body class="... plan-doc">`, or an `<epic-page>`)
   * - `undefined` when there's neither
   * - why both names:  epic pages were renamed `<name>.plan.html` on 2026-10-04 (`review-review` P4),
   *   and a worktree cut before then still has `<name>.html` until it merges `main`
   * - STATIC:  a folder's answer, whichever checkout it's in
   * - the docs tools' rule (`tools/pages.js` `planDocIn()`), which the docs index finds plan docs by too
   */
  static planDocIn(dir: string, name: string): string | undefined {
    return planDocIn(dir, name)
  }

  /**
   * Every epic, once each:  `{ name, title, status, checkout, saga, notReviewed, total, file }`.
   * - in progress first, then future, then done;  most not reviewed first in each
   * - `status`:
   *   - `in progress` while any phase isn't done (or there are none yet)
   *   - `future` for an epic not planned yet
   *   - else `done`
   * - `checkout`:  `main`, or `.claude/worktrees/<name>`:  where it runs (`epicCheckout()`)
   * - `repo`:  for an epic worked in ANOTHER repo only (`EpicRepo`, epic `epic-engine` I47):  that repo's main
   *   checkout;  its `checkout` is then that repo's worktree, `../spell-epic.worktrees/epic-engine`, else that repo's
   *   main checkout, both from this one;  never a worktree of this repo
   * - SIDE EFFECT:  a doc that won't read (in the old markup:  `read()`) is left out, and named on stderr
   */
  listEpics(): EpicListing[] {
    const main = this.mainRoot()
    const origins = new Map<string, string | null>()
    const dir = this.epics
    const names = existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && PlanDocFiles.planDocIn(join(dir, entry.name), entry.name))
          .map((entry) => entry.name)
      : []
    const epics = names.flatMap((name): EpicListing[] => {
      const file = this.findDoc(name)
      let plan: PlanDoc
      try {
        plan = this.read(file)
      } catch (error) {
        if (!(error instanceof PlanDocError)) throw error
        process.stderr.write(`epic:  ${name} left out:  ${error.message}\n`)
        return []
      }
      const sections = plan.reviewSections()
      const phases = plan.phases
      const page = plan.document.querySelector("epic-page")
      const attribute = (key: string) => page?.getAttribute(key)?.trim() || null
      const home = EpicRepo.homeOf(
        name,
        file,
        { worktree: attribute("worktree"), repo: attribute("repo") },
        main,
        origins
      )
      const elsewhere = home && !home.own && home.checkout ? home.checkout : null
      const there = elsewhere && (home!.made ? home!.worktree! : elsewhere)
      return [
        {
          name,
          title: plan.title || name,
          status: plan.future
            ? "future"
            : !plan.standing && phases.length && phases.every((phase) => phase.status === "done")
              ? "done"
              : "in progress",
          checkout: there ? relative(main, there) : this.epicCheckout(name, main),
          ...(elsewhere && { repo: elsewhere }),
          saga: plan.saga,
          notReviewed: sections.reduce((sum, section) => sum + section.notReviewed, 0),
          total: sections.reduce((sum, section) => sum + section.total, 0),
          file
        }
      ]
    })
    // in progress, then future, then done
    const rank = { "in progress": 0, future: 1, done: 2 }
    return epics.sort(
      (a, b) => rank[a.status] - rank[b.status] || b.notReviewed - a.notReviewed || a.name.localeCompare(b.name)
    )
  }

  ////////////////
  // ## Reading and writing
  ////////////////

  /**
   * The epic page at `file`, parsed:  a `PlanDoc`.  `options` as its constructor's.
   * - a SPLIT doc comes back WHOLE:  every part read into its host;  `plan.parts` says how it was stored
   * - throws a `PlanDocError` for a doc in the old markup
   * - SIDE EFFECT:  names each missing part on stderr
   */
  read(file: string, options?: PlanDocOptions): PlanDoc {
    if (!existsSync(file))
      throw new PlanDocError(`no epic page ${relative(this.content, file)}:  \`epic create\` first`)
    const html = readFileSync(file, "utf8")
    if (!isEpicMarkup(html)) throw this.oldMarkup(file)
    const plan = PlanDoc.parse(html, undefined, options)
    plan.parts = assembleEpic(plan.document, file)
    for (const id of plan.parts.missing)
      process.stderr.write(
        `epic:  ${relative(this.content, PlanParts.partFile(file, id))} is missing:  #${id} has no body\n`
      )
    return plan
  }

  /**
   * Refuse the doc at `file` unless it's in the `<epic-*>` markup:
   * what an editing command checks before it touches anything (the inbox, say) besides the doc.
   * - reads only the skeleton's text
   */
  requireNewMarkup(file: string): void {
    if (existsSync(file) && !isEpicMarkup(readFileSync(file, "utf8"))) throw this.oldMarkup(file)
  }

  /**
   * Change the doc at `file` with `change(plan)`, under its lock;  resolves with what `change` returned.
   * - the lock (`SRV.FileLock`):  parallel agents, and the page server's page edits, take turns
   * - first the MIGRATIONS (`plan.migrate()`, `Migrations`):
   *   - an older doc comes up to today's markup on its first edit, logged
   *   - a migration that would break the doc refuses the edit, as any change does
   * - then the whole-doc pass (`updateStates()`),
   *   with the page's `recent-since` from the doc's checkout (`recentSince()`), and its earlier versions for the words a
   *   new change mark replaced (`earlierVersions()`)
   * - then it stamps "updated", and writes it (`writeDoc()`)
   * - REFUSES, writing nothing:
   *   - a doc in the old markup (`read()`)
   *   - an edit after which `Markup.validate()` finds a problem the doc didn't have before
   * - `split`:  how to store it:  `true` a skeleton and parts, `false` one file;  default as it was
   */
  edit<T>(file: string, change: (plan: PlanDoc) => T, { split }: { split?: boolean } = {}): Promise<T> {
    return SRV.FileLock.runAsync(file, async () => {
      const plan = this.read(file, { recentSince: this.recentSince(file) })
      plan.earlierVersions = PlanDocFiles.earlierVersions(file)
      const before = new Set(plan.check())
      plan.migrate()
      const result = change(plan)
      plan.updateStates()
      plan.touch()
      const broken = plan.check().filter((problem) => !before.has(problem))
      if (broken.length)
        throw new PlanDocError(
          `${relative(this.content, file)}:  nothing written:  the edit would break the doc:\n  ${broken.join("\n  ")}`
        )
      await this.writeDoc(file, plan, split ?? plan.parts!.split)
      return result
    })
  }

  /**
   * Run the epic page MIGRATIONS on the doc at `file`, under its lock, as an edit is.
   * - `Migrations`:  every step, or those named in `only`
   * - resolves with what they did:  `{ ran, notes, moves, renames, written }`
   * - `ran`:  the steps that changed the page
   * - `notes`:  what they fixed or found, a line each
   * - `moves`:  comments whose block moved, written into the page's review inbox after the page (`links-agree`)
   * - `renames`:  ids the page changed (`stable-phase-ids`),
   *   its inbox rekeyed after the moves (`ReviewInbox.renameIds()`)
   * - writes only when something changed:
   *   logged (`migrated:  links-agree`), the items recoloured (`updateStates()`)
   *   - NOT stamped "updated":  nobody worked on the epic
   * - `dryRun`:  the same report, nothing written
   * - REFUSES, writing nothing, as `edit()` does:  a doc in the old markup;  a migration that would break the doc
   * - `epic migrate` (`MigrateCommands`), and `rename` / `add-phase --before` for `links-agree`
   */
  async migrate(
    file: string,
    { only, dryRun = false, now = new Date() }: { only?: readonly string[]; dryRun?: boolean; now?: Date } = {}
  ): Promise<MigrateResult> {
    const inboxFile = ReviewInbox.pathFor(file)
    const result = await SRV.FileLock.runAsync(file, async (): Promise<MigrateResult> => {
      const plan = this.read(file, { recentSince: this.recentSince(file) })
      const context: MigrationContext = {
        now,
        epic: basename(file).replace(/(\.plan)?\.html$/, ""),
        folder: dirname(file),
        root: this.content,
        inbox: inboxView(ReviewInbox.read(inboxFile)),
        rootLinks: (html) => this.linker.rootLinks(html, dirname(file), { mend: true }).changes,
        notes: [],
        moves: []
      }
      const before = new Set(plan.check())
      const ran = Migrations.run(plan.document, context, only)
      const done = {
        ran,
        notes: context.notes!,
        moves: context.moves!,
        renames: context.renames ?? {},
        files: context.files ?? [],
        written: false
      }
      if (!ran.length || dryRun) return done
      plan.log(`migrated:  ${ran.join(", ")}`)
      plan.updateStates()
      // a step may renumber phases (`whole-phase-numbers`):  the Overview's total names them by number
      plan.updateEstimate()
      const broken = plan.check().filter((problem) => !before.has(problem))
      if (broken.length)
        throw new PlanDocError(
          `${relative(this.content, file)}:  nothing written:  migrating would break the doc:\n  ${broken.join("\n  ")}`
        )
      await this.writeDoc(file, plan, plan.parts!.split)
      return { ...done, written: true }
    })
    if (dryRun) return result
    let written = result.written
    if (result.moves.length || Object.keys(result.renames).length) {
      // after the page, under the inbox's own lock:  never both locks at once
      await ReviewInbox.updateAsync(inboxFile, (inbox) => {
        for (const move of result.moves) {
          const comment = inbox.comments[move.id]
          if (comment?.anchor === move.from) comment.anchor = move.to
        }
        inbox.renameIds(result.renames)
      })
      written = true
    }
    // last, each under its new name's lock, the one its writers take:  an inbox the step above rewrote is renamed by it
    for (const move of result.files)
      if (await SRV.FileLock.runAsync(move.to, async () => DataFile.rename(move))) written = true
    return { ...result, written }
  }

  /** The migration steps `migrate()` can run, oldest first:  for listings and checking `--step`. */
  static get migrations(): readonly Migration[] {
    return Migrations.all
  }

  /**
   * Write `plan` to `file`, tidied as a page must be (link targets, oxfmt), each file ONCE and atomically.
   * - links and formatting happen in memory (`SRV.Linker.link()`, `PlanParts.formatHTML()`)
   * - `split`:  a skeleton plus part files (`EpicParts.split()`)
   *   - parts first, then the skeleton, so a page that sees the new skeleton finds its new parts
   *   - only files whose text changed are written (`PlanParts.writeChanged()`)
   *   - so an edit to one item rewrites its part (if its details changed) and the skeleton,
   *     and the page re-fetches that part alone
   * - a part file the doc was read from and no longer writes goes (a phase's, once its id became stable)
   * - one file:  as is, plus the parts folder of a doc that was split gone (`join`)
   * - links are made against the whole doc, at the page's folder (`SRV.Linker.link()`):  every relative URL a ROOT PATH
   *   (epic `epic-engine` P46), so a part holds the same text as its page;  the few left (the page's own folder's)
   *   are made root paths in a part as it's split
   * - a link handed over as an older part held it (`../../../x`, one `../` too many for the page) is the part's
   *   first (`rootPartLinks()`)
   */
  async writeDoc(file: string, plan: PlanDoc, split: boolean): Promise<void> {
    if (split) this.rootPartLinks(plan, file)
    const linked = this.linker.link(plan.toString(), dirname(file)).text
    if (!split) {
      PlanParts.writeChanged([[file, await PlanParts.formatHTML(file, linked)]])
      if (plan.parts?.split) rmSync(join(dirname(file), PARTS_DIR), { recursive: true, force: true })
      return
    }
    const { document } = parseHTML(linked)
    // linkedom writes `&`, `<` and `>` in attribute values bare (I2, I126):  escaped in this throwaway copy,
    // since the parts are serialized inside `split()`
    PlanMarkup.escapeAttributes(document as unknown as Document)
    const folder = this.linker.rootPathFor("./", dirname(file))
    const parts = new EpicParts(document as unknown as Document).split({ docName: basename(file), folder })
    const outputs = await Promise.all(
      [...parts].map(async ([id, html]): Promise<[string, string]> => {
        const part = PlanParts.partFile(file, id)
        return [part, await PlanParts.formatHTML(part, html)]
      })
    )
    outputs.push([file, await PlanParts.formatHTML(file, PlanMarkup.serialize(document as unknown as Document))])
    PlanParts.writeChanged(outputs)
    // a part the doc was read from but no longer writes:  nothing loads it any more
    // (its host's id changed, `stable-phase-ids`;  or its body emptied)
    for (const id of plan.parts?.hosts ?? []) if (!parts.has(id)) rmSync(PlanParts.partFile(file, id), { force: true })
  }

  /**
   * Make `plan`'s links that were written as from a PART FILE (`../../../ui/x.ts`) the root paths of what they
   * reach from there (`/spell-ui/x.ts`), so they land as the part held them (epic `epic-engine` I134, P46).
   * - why:  HTML a command is handed (`update --plan`, `details --file`) is read as the PAGE's;
   *   an agent copying from a part file written before P46 hands over the part's, one `../` too many for the page
   *   - debut wrote 50 so, and `epic lint` called each missing
   *   - NOT a worktree's doing:  main and a worktree wrote the same `../../../../`
   * - only a link that's MISSING as the page's and THERE as the part's;  any other is left for the linker, which
   *   writes it as the page's root path
   * - so it's idempotent, and an older page's links broken this way are mended at its next write
   * - SIDE EFFECT:  changes `plan`'s document
   */
  private rootPartLinks(plan: PlanDoc, file: string): void {
    const pageDir = dirname(file)
    const partsDir = join(pageDir, PARTS_DIR)
    const isThere = (url: string, dir: string) => existsSync(this.linker.fileFor(decodedPath(url), dir))
    const root = plan.document.documentElement as unknown as Element
    PlanParts.rebase(root, (url) => {
      if (!url.startsWith("../") || isThere(url, pageDir) || !isThere(url, partsDir)) return url
      return this.linker.rootPathFor(url, partsDir) ?? url
    })
  }

  /**
   * Rewrite the docs index:  a plan's status badge follows its phases.
   * - by running the docs index's script, `src/tools/index.js`, as a child `node`,
   *   as `epic pages index` runs it
   * - shared content (a content folder of its own, `content`):  ONE `pages/index.html` for every checkout, not
   *   tracked by spell-app, so a worktree rewrites it too:  nothing to conflict on merge
   * - a checkout holding its own pages (its own tracked home) in a worktree:
   *   left alone, or two epics' worktrees would conflict on merge
   * - SIDE EFFECT:  says on stderr when it failed
   */
  reindex(): void {
    const shared = this.content !== resolve(this.root)
    if (!shared && EpicConfig.of(this.root).worktreeNameOf(join(this.content, "pages"))) return
    const run = spawnSync("node", [join(this.docsTools, "index.js")], {
      cwd: this.docsPackage,
      encoding: "utf8",
      env: this.toolEnv
    })
    if (run.status !== 0) process.stderr.write(`epic:  docs index not updated\n${run.stdout}${run.stderr}`)
  }

  /** The error every command gives for a doc in the old markup (one restored from an old backup). */
  private oldMarkup(file: string): PlanDocError {
    return new PlanDocError(
      `${relative(this.content, file)} is in the old markup (from before epic \`epic-components\`), ` +
        `which the tool no longer reads`
    )
  }

  ////////////////
  // ## Git
  ////////////////

  /**
   * The doc at `file` as it was, newest first, each read and assembled only when asked for:  where a new change mark's
   * replaced words are looked for (`PlanDoc.updateChanges()`, `ChangeOriginals`;  epic `epic-engine` I160).
   * - first the files on disk, before this edit writes them:  a command handed new markup (`--changes`) changes only
   *   the doc in memory
   * - then its last `EARLIER_COMMITS` commits in the git repo holding it (the shared content repo:  its turn-end commits),
   *   for marks written by hand into a part file, which the disk already holds
   * - git only READS there (`log`, `ls-tree`, `cat-file`):  never a commit, never the index
   * - STATIC;  NEVER throws:  a version that can't be read is left out
   */
  static earlierVersions(file: string): Iterable<Document> {
    const sources: (() => Document | undefined)[] = [() => PlanDocFiles.versionOnDisk(file)]
    let commits: string[] | undefined
    const folder = dirname(file)
    const top = () => SRV.Git.out(["rev-parse", "--show-toplevel"], folder)
    for (let n = 0; n < EARLIER_COMMITS; n++)
      sources.push(() => {
        const root = top()
        if (!root) return undefined
        commits ??= SRV.Git.lines(["log", `-${EARLIER_COMMITS}`, "--format=%H", "--", folder], folder)
        const commit = commits[n]
        return commit ? PlanDocFiles.versionAt(file, root, commit) : undefined
      })
    const read: (Document | undefined | null)[] = []
    return {
      *[Symbol.iterator]() {
        for (const [index, source] of sources.entries()) {
          if (read[index] === undefined) {
            try {
              read[index] = source() ?? null
            } catch {
              read[index] = null
            }
          }
          if (read[index]) yield read[index]!
        }
      }
    }
  }

  /** The doc at `file` as the disk holds it, its parts read in;  `undefined` without one. */
  private static versionOnDisk(file: string): Document | undefined {
    if (!existsSync(file)) return undefined
    const { document } = parseHTML(readFileSync(file, "utf8"))
    new EpicParts(document as unknown as Document).assemble(PlanParts.reader(file))
    return document as unknown as Document
  }

  /**
   * The doc at `file` as commit `commit` of the repo at `root` held it, its parts read in:  every file of its folder in
   * ONE `git cat-file --batch`;  `undefined` when the commit has no such doc.
   */
  private static versionAt(_file: string, root: string, commit: string): Document | undefined {
    // by its real path, as git names the repo's root (a temp folder's `/var` is `/private/var`)
    const file = RealPath.of(_file)
    const path = (absolute: string) => relative(RealPath.of(root), absolute).split(sep).join("/")
    const names = SRV.Git.lines(["ls-tree", "-r", "--name-only", commit, "--", path(dirname(file))], root).filter(
      (name) => name === path(file) || name.startsWith(`${path(join(dirname(file), PARTS_DIR))}/`)
    )
    if (!names.includes(path(file))) return undefined
    const run = SRV.Git.run(["cat-file", "--batch"], root, {
      input: names.map((name) => `${commit}:${name}`).join("\n") + "\n",
      trim: false
    })
    if (!run.ok) return undefined
    const texts = new Map<string, string>()
    const out = Buffer.from(run.out, "utf8")
    let at = 0
    for (const name of names) {
      const end = out.indexOf(0x0a, at)
      if (end < 0) break
      const size = Number(/ blob (\d+)$/.exec(out.subarray(at, end).toString("utf8"))?.[1])
      if (!Number.isFinite(size)) return undefined
      texts.set(name, out.subarray(end + 1, end + 1 + size).toString("utf8"))
      at = end + 1 + size + 1
    }
    const skeleton = texts.get(path(file))
    if (skeleton === undefined) return undefined
    const { document } = parseHTML(skeleton)
    new EpicParts(document as unknown as Document).assemble((id) => texts.get(path(PlanParts.partFile(file, id))))
    return document as unknown as Document
  }

  /**
   * `git <args>` in this checkout, trimmed stdout ("" on failure).
   * - NEVER in a content folder (`epics/` ...):
   *   each is a link into the shared content repo, and git run there sees THAT repo, not spell-app
   */
  git(...args: string[]): string {
    return PlanDocFiles.gitIn(this.root, ...args)
  }

  /**
   * `git <args>` in folder `cwd` (a checkout:  the doc's own, which may be another worktree),
   * trimmed stdout ("" on failure).
   * - STATIC:  any checkout's
   */
  static gitIn(cwd: string, ...args: string[]): string {
    return SRV.Git.out(args, cwd) ?? ""
  }

  /** The main checkout's root:  the parent of git's common dir (`.git`), the same from any worktree. */
  mainRoot(): string {
    return SRV.Git.mainRoot(this.root)
  }

  /**
   * The git checkout `root` is in, its real path (what `git rev-parse --show-toplevel` says, with no git run);
   * `root` itself outside git.
   */
  get checkoutRoot(): string {
    return RealPath.of(SRV.checkoutOf(this.root)?.root ?? this.root)
  }

  /**
   * Where epic `name` runs:  `.claude/worktrees/<name>` while that worktree exists, else `main` (`MAIN_CHECKOUT`).
   * - the worktree's folder:  the repo's `worktreesFolder`, from the main checkout
   * - `list`'s `checkout`, which `/epics` reads;  the doc itself is the shared one either way (`findDoc()`)
   */
  epicCheckout(name: string, main = this.mainRoot()): string {
    const own = new EpicConfig(main).worktreeFolder(name)
    return existsSync(own) ? relative(main, own) : PlanDocFiles.MAIN_CHECKOUT
  }

  /** An epic's `checkout` when it runs in the main checkout (`epicCheckout()`):  the checkout's name, not a branch. */
  static readonly MAIN_CHECKOUT = "main"

  /**
   * The spell-app checkout a doc belongs to:  this one for a doc in the content folder (a repo of its own);  else its
   * path up to `/epics/<name>/`, else this one.
   * - another worktree's, maybe;  or an old one's `/epics/`
   * - git for a doc runs there, never in the doc's folder (`git()`)
   */
  checkoutOf(file: string): string {
    const shared = this.content !== resolve(this.root)
    if (shared && RealPath.isIn(file, this.content)) return this.root
    const m = /^(.+?)[\\/](?:packages[\\/]docs[\\/](?:content[\\/])?)?epics[\\/][^\\/]+[\\/][^\\/]+$/.exec(file)
    return m ? m[1]! : this.root
  }

  /**
   * When "recent" starts for the doc at `file` (D2):  the commit time of `HEAD~2` in its checkout, ISO with offset.
   * - `null` without one (no git, or a history that short)
   * - so green means changed in this commit or the last:  everything since the commit before those
   */
  recentSince(file: string): string | null {
    return PlanDocFiles.gitIn(this.checkoutOf(file), "log", "-1", "--format=%cI", "HEAD~2") || null
  }

  /** The GitHub page of the doc's repo (`PlanCommits.githubBase()` of `origin`), or `null`. */
  commitBase(file: string): string | null {
    return PlanCommits.githubBase(PlanDocFiles.gitIn(this.checkoutOf(file), "remote", "get-url", "origin"))
  }

  /**
   * The repos a doc's commits can be in, the doc's checkout first:  it, then each of its child repos that's there
   * (`EpicConfig.repos`:  a multi-repo top's, `spell-parser` ...;  none for a single repo).
   * - every repo's work counts toward an epic (epic `epic-engine` r17):  outline-spell's phases are mostly
   *   spell-parser's, spell-ui's and spell-app's commits
   */
  repoFolders(file: string): string[] {
    const checkout = this.checkoutOf(file)
    const children = EpicConfig.of(checkout).repos.map((name) => join(checkout, name))
    return [checkout, ...children.filter((folder) => existsSync(join(folder, ".git")))]
  }

  /**
   * The doc's commits, newest first:  its git history when the checkout tracks it, else `sharedDocLog()`.
   * - a doc spell-app tracks:  `git log --follow` (every phase commit touches the epic page), on the doc as HEAD has it
   *   - a rename to `<name>.plan.html` not committed yet has no history of its own, so follow the old name
   *   - once committed, `--follow` goes through the rename
   * - a SHARED doc (`epics` a link into the shared content repo):  spell-app has no history of it
   */
  docLog(file: string): CommitLogEntry[] {
    const checkout = this.checkoutOf(file)
    const path = relative(checkout, file).split(sep).join("/")
    const names = [path, path.replace(/\.plan\.html$/, ".html")]
    const tracked = names.find((name) => SRV.Git.run(["cat-file", "-e", `HEAD:${name}`], checkout).ok)
    return tracked
      ? PlanDocFiles.parseLog(PlanDocFiles.gitIn(checkout, "log", "--follow", "--format=%H%x09%s", "--", tracked))
      : PlanDocFiles.sharedDocLog(file, this.repoFolders(file))
  }

  /**
   * A shared doc's commits, newest first:
   * the commits of `checkouts` (one repo's, or every repo of a kit's) since the doc was started whose subject names
   * THIS epic's work.
   * - the start:  `<epic-page started>`
   * - `<epic> ...` (`shared-content P3:`, `shared-content I3:`)
   * - `P3:  <P3's name> -- ...`, no epic named:  the phase name must be its title, since other epics have a P3 too
   *   (`P7:  Fussbudget -- ... every epic's Doc Review ...` isn't a P7 called Doc Review)
   * - a commit naming another epic first, or a bare `Fix I3:` (any epic's), is left out (write `<epic> I3:`)
   * - each commit carries its repo's GitHub page (`repo`), and the repos' commits are merged by time
   * - STATIC:  any checkout's, for any doc in `<epic-*>` markup
   */
  static sharedDocLog(file: string, checkouts: string | string[]): CommitLogEntry[] {
    const html = readFileSync(file, "utf8")
    const name = basename(file).replace(/(\.plan)?\.html$/, "")
    const since = /<epic-page\b[^>]*\bstarted="(\d{4}-\d\d-\d\d)"/.exec(html)?.[1]
    const phases = PlanDoc.parse(html).phases
    const timed: (CommitLogEntry & { time: number })[] = []
    for (const checkout of [checkouts].flat()) {
      const repo = PlanCommits.githubBase(PlanDocFiles.gitIn(checkout, "remote", "get-url", "origin"))
      // a bare date means that day at the CURRENT time to git:  midnight, so the start day's commits count
      const raw = PlanDocFiles.gitIn(
        checkout,
        "log",
        "--format=%ct%x09%H%x09%s",
        ...(since ? [`--since=${since} 00:00`] : [])
      )
      for (const { sha: time, subject: rest } of PlanDocFiles.parseLog(raw)) {
        const [sha, ...subject] = rest.split("\t")
        timed.push({ sha: sha!, subject: subject.join("\t"), repo, time: Number(time) })
      }
    }
    const seen = new Set<string>()
    return timed
      .sort((a, b) => b.time - a.time)
      .filter(({ sha }) => !seen.has(sha) && Boolean(seen.add(sha)))
      .filter(({ subject }) => {
        const parsed = PlanCommits.parseCommitSubject(subject)
        if (parsed?.epic) return parsed.epic === name
        if (subject.startsWith(`${name} `)) return true
        return Boolean(
          parsed?.phases.length &&
          parsed.phases.every((number) => {
            const phase = phases.find((each) => each.number === number)
            return phase && PlanCommits.titleNames(parsed.title, phase.name)
          })
        )
      })
      .map(({ sha, subject, repo }) => ({ sha, subject, repo }))
  }

  /** `git log --format=%H%x09%s` output as `{ sha, subject }`s, newest first.  STATIC:  pure. */
  static parseLog(raw: string): CommitLogEntry[] {
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, ...subject] = line.split("\t")
        return { sha: sha!, subject: subject.join("\t") }
      })
  }
}

/** What `PlanDocFiles.migrate()` did to one doc (or, a dry run, would do). */
export type MigrateResult = {
  /** the steps that changed the page, in order */
  ran: string[]
  /** what the steps fixed or found, one line each (`links-agree:  ...`) */
  notes: string[]
  /** comments moved to where their block is now (`links-agree`) */
  moves: AnchorMove[]
  /** ids the page changed, old => new, which its inbox follows (`stable-phase-ids`) */
  renames: Record<string, string>
  /** data files beside the page to rename, `.json` => `.json5` (`json5-data-files`);  a clash is left */
  files: DataFileMove[]
  /** was anything written:  the page, or its inbox */
  written: boolean
}

/**
 * What a migration reads of `inbox` (`InboxView`):  everything keyed by an item id, and each comment's place.
 * - `now` (a list) by its requests' ids
 */
function inboxView(inbox: ReviewInbox): InboxView {
  const now = Object.fromEntries(inbox.now.map((request) => [request.id, request]))
  return {
    keyed: {
      mark: inbox.marks,
      draft: inbox.drafts,
      urgency: inbox.urgency,
      "agent at work": inbox.working,
      "called-off request": inbox.canceled,
      "request for now": now
    },
    comments: Object.fromEntries(
      Object.entries(inbox.comments).map(([id, comment]) => [id, { anchor: comment.anchor, excerpt: comment.excerpt }])
    )
  }
}

/** One epic, as `PlanDocFiles.listEpics()` lists it (and `list --json` prints it, for `/epics`). */
export type EpicListing = {
  /** its name, the folder's:  `seo` */
  name: string
  /** its title, without `Epic: ` */
  title: string
  /** `in progress`, `future` or `done` */
  status: EpicStatus
  /** where it runs:  `main`, or `.claude/worktrees/<name>`;  another repo's epic:  that repo's worktree or checkout */
  checkout: string
  /** an epic worked in ANOTHER repo only:  that repo's main checkout (`EpicRepo`, epic `epic-engine` I47) */
  repo?: string
  /** the saga it serves, its id (`<epic-page saga>`);  `null` for none */
  saga: string | null
  /** how many of its items aren't reviewed */
  notReviewed: number
  /** how many items it has in all */
  total: number
  /** its doc */
  file: string
}

/** Where an epic stands, as `list` groups it, in order. */
export const EPIC_STATUSES = ["in progress", "future", "done"] as const
/** One of `EPIC_STATUSES`. */
export type EpicStatus = (typeof EPIC_STATUSES)[number]

/** The checkout this file is in (`src/tool/` is two folders down):  the default root. */
const CHECKOUT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")

/** The docs tools beside this code:  `src/tools`. */
const DOCS_TOOLS = fileURLToPath(new URL("../tools", import.meta.url))

/** The tool's own template, in `<epic-*>` markup:  `templates/plan.html` beside this file. */
const TEMPLATE = fileURLToPath(new URL("templates/plan.html", import.meta.url))

/** `url`'s path, its `?query` dropped and decoded (`%20` => space);  as it is when it won't decode. */
function decodedPath(url: string): string {
  const path = url.split("?")[0]!
  try {
    return decodeURI(path)
  } catch {
    return path
  }
}

/** Is epic-page text `html` in the `<epic-*>` markup:  does it have an `<epic-page>`? */
function isEpicMarkup(html: string): boolean {
  return /<epic-page\b/.test(html)
}

/**
 * Put a split `<epic-*>` doc's parts back (`EpicParts.assemble()`), reading them beside `file`.
 * - returns what was there:  `{ split, hosts, missing, inline }`
 * - `inline`:  a host holding a body of its own beside its `source` (a hand edit in the skeleton)
 *   - kept, the part's after it
 *   - the next write moves both into the part
 */
function assembleEpic(document: Document, file: string): PlanDocParts {
  const hosts = Array.from(document.querySelectorAll("[source]")).filter(
    (host) => host.localName.startsWith("epic-") && PART_SOURCE.test(host.getAttribute("source") ?? "")
  )
  const ids = hosts.map((host) => PART_SOURCE.exec(host.getAttribute("source")!)![1]!)
  const inline = hosts
    .filter((host) =>
      Array.from(host.childNodes).some(
        (node) =>
          (node.nodeType === 1 && !(node as Element).hasAttribute("slot")) ||
          (node.nodeType === 3 && Boolean(node.textContent?.trim()))
      )
    )
    .map((host) => host.id)
  const missing = new EpicParts(document).assemble(PlanParts.reader(file))
  return { split: hosts.length > 0, hosts: ids, missing, inline }
}

/** How many of an epic folder's last commits are looked through for a change mark's replaced words (`earlierVersions()`). */
const EARLIER_COMMITS = 3
