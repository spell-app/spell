import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { basename, dirname, join, relative, resolve } from "node:path"

import { SRV } from "spell/server"
import { duration, parseVerbArgs, stringFlag } from "spell/epic/command/command.types"
import { WorkTime } from "spell/epic/command/WorkTime"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { DataFile } from "spell/epic/data/DataFile"
import { Markup } from "spell/epic/markup"
import { PageStages, PhaseStatuses } from "spell/epic/phases"
import { fromTemplate } from "spell/epic/tools/pages.js"
import { CloseAllRule } from "spell/epic/components/epic-section/CloseAllRule"
import {
  CardText,
  OPEN_KINDS,
  QUIET_STATES,
  PlanDocError,
  REVIEW_SECTIONS,
  ShortTitle,
  TITLE_PREFIX,
  ISSUE_ID,
  TODO_ID,
  type CommitHistory,
  type Phase,
  type PhaseTimer,
  type PlanSummary,
  type ReviewSection,
  type SummaryScope
} from "./planDoc.types"

import { BedtimeAll } from "./BedtimeAll"
import { CommentList } from "./CommentList"
import { CommitRemap } from "./CommitRemap"
import { EpicDocs, GROUPS, type EpicDecisions, type EpicDocList } from "./EpicDocs"
import { EpicOwners, type PathOwners } from "./EpicOwners"
import { EpicParts } from "./EpicParts"
import { EpicTargets } from "./EpicTargets"
import { FocusCommands } from "./FocusCommands"
import { FreshCommands } from "./FreshCommands"
import { BadgeCommands } from "./BadgeCommands"
import { CloseAll } from "./CloseAll"
import { Hush, type HushCall, type HushJudge } from "./Hush"
import { ItemJudge } from "./ItemJudge"
import { InboxCommands } from "./InboxCommands"
import { ItemPicker } from "./ItemPicker"
import { ItemPictures, type PastedReader } from "./ItemPictures"
import { MigrateCommands, type SessionFinder } from "./MigrateCommands"
import { OptionCommands } from "./OptionCommands"
import { PlanDoc } from "./PlanDoc"
import { EPIC_STATUSES, PlanDocFiles, type EpicListing } from "./PlanDocFiles"
import { PlanItem } from "./PlanItem"
import { PlanMarkup } from "./PlanMarkup"
import { PART_EXT, PART_FILE, PARTS_DIR } from "./PlanParts"
import type { PlanReader } from "./PlanReader"
import { PlanTime } from "./PlanTime"
import { ReviewBackfill } from "./ReviewBackfill"
import { ReviewInbox } from "./ReviewInbox"
import { StaleFacts, type StaleFactsOptions } from "./StaleFacts"
import { StaleUnderway } from "./StaleUnderway"
import { SagaCommands } from "./SagaCommands"
import { SagaPage } from "./SagaPage"
import { Sagas } from "./Sagas"
import { TestCommands } from "./TestCommands"
import { TitleReader } from "./TitleReader"

/****************
 * ### `PlanDocCommands`
 * `<command> <name> ...`, the `epic` tool in its own order (`epic <verb> <epic>#<id>` turns into it:  `planDocArgs()`):
 * edit the structured parts of an epic page, `epics/<name>/<name>.plan.html`.
 * Used by the `/epic` skill and its agents.
 * - what's data:  `PLAN-DOC.md` beside this;  the elements:  `spell/epic/definitions`
 * - Commands:  `create`, `add-phase`, `phase`, `rename`, `estimate`, `add`, `calm`, `failed`, `decide`, `choose`, `option`, `close`, `stale`,
 *   `cancel`, `reopen`, `commit`, `commits`, `log`, `bedtime`, `focus`, `fresh`, `prompt`, `summary`, `docs`, `decisions`,
 *   `owns`, `lint`, `open`, `migrate`, `split`, `join`, `inbox`, `details`, `summarize`, `status`, `original`
 *   (with no command, `yarn plan-doc` in spell-epic lists them:  `USAGE`).
 * - `docs`, `decisions` (`EpicDocs`, for `/docs-check`):
 *   the docs an epic wrote besides its epic page, and what its epic page settled
 * - `owns` (`EpicOwners`, for `/coherence`):  which open epics own a file, by their branch or their epic page
 * - the `<epic-*>` markup only:  every command refuses a doc still in the old markup before it writes anything
 *   (one restored from an old backup;  `PlanDocFiles.read()`):  the converter that read it went in epic `repo-split`
 *   (Q45)
 * - `saga`:  the sagas' list and each epic's saga (`SagaCommands`, epic `epic-workflow` P15)
 *   - `create --saga` sets it at birth
 * - `migrate`:  pages brought up to today's markup, by page kind (`MigrateCommands`, epic `epic-workflow` P8)
 * - `inbox`:  the marks Owen left on the doc's page, waiting in `<name>.inbox.json5` beside it (`ReviewInbox`)
 *   - printed, waited on, applied and cleared (`InboxCommands`)
 *   - `wait`:  a background command that wakes the `/epic review` session
 *   - `apply`:  the marks, into the doc
 * - `details`:  writes an agent's details or reply into one item;  `summarize`, its condensed text (the rest kept)
 * - an item's text is never dropped:  a rewrite moves it into the item's folded Original Discussion
 *   - `original` puts text recovered from git there
 * - the docs, their files and git:  `PlanDocFiles`, for ONE checkout (the caller's:  `epic` finds it)
 * - the doc itself:  `PlanDoc`, pure
 * - output goes straight to `process.stdout` / `stderr`,
 *   never `console.*`, which the `spell` CLI silences (`packages/cli/src/consoleGuard.ts`)
 *   - `run()` resolves to the exit code instead of exiting
 * - Node only:  NOT in the `spell-epic` barrel, imported by path (`spell/epic/tool/PlanDocCommands`).
 *   - Runs the docs tools' scripts as children, as their command lines run them:
 *     the docs index, `check-spell.js`, `open.js`
 *   - Imports their helpers (`tools/pages.js` `fromTemplate()`).
 * - From `src/tools/plan-doc.js`'s command line (epic `epic-components`, P7), which now forwards here.
 ****************/
export class PlanDocCommands {
  /** the checkout's epic pages:  STATIC for the object's life */
  readonly files: PlanDocFiles

  /** the `inbox` commands, on this object's files and output */
  readonly inbox: InboxCommands

  /** the `migrate` command, on this object's files and output */
  readonly migrator: MigrateCommands

  /** the `saga` commands, on this object's files and output */
  readonly sagas: SagaCommands

  /** the `test` command, and `add` / `details`' test fields, on this object's files and output */
  readonly tests: TestCommands

  /** the `option` command, `choose`, and `add`'s standing sets (epic `epic-engine` P50), on this object's files */
  readonly options: OptionCommands

  /** the `focus` command (epic `epic-engine` T93):  focus mode, and what each running epic session is told */
  readonly focus: FocusCommands
  /** the `fresh` command (epic `epic-engine` T113):  `/epic fresh all`, every running epic session handed on */
  readonly fresh: FreshCommands

  /**
   * how long Claude worked on a phase while it was active, in minutes (`phase ... done`, `phase ... took`;  epic
   * `epic-engine` P41):  STATIC for the object's life
   */
  readonly phaseTimer: PhaseTimer

  /**
   * the pictures pasted last into a session's chat, for `add --pasted <n>` (epic `epic-engine` T87):  default the
   * transcript's (`Requests.pastedImages()`);  STATIC for the object's life
   */
  readonly pastedReader: PastedReader | undefined

  /**
   * decides which settled items `hush` greys (epic `epic-engine` T122):  default `claude -p` (`Hush`);  a test's gives
   * its own;  STATIC for the object's life
   */
  readonly hushJudge: HushJudge | undefined

  /** the `badges` command (epic `epic-engine` P81):  a page's item badges */
  readonly badges: BadgeCommands

  /**
   * scores an item's care and doubt, as it's made on a page with badges and for `badges score` (epic `epic-engine` P81):
   * default `claude -p` (`ItemJudge`);  a test's gives its own;  STATIC for the object's life
   */
  readonly itemJudge: ItemJudge

  /**
   * reads a new or changed title cold, for `add` and `rename` (epic `epic-engine` T123):  default `claude -p`
   * (`TitleReader`);  a test's gives its own;  STATIC for the object's life
   */
  readonly titleReader: TitleReader

  /**
   * - `files`:  the checkout's epic pages
   * - `sessionsOf`:  an epic's running sessions, for `migrate --notify`
   *   - the `spell` CLI gives it (`epicSessions()`)
   * - `phaseTimer`:  default the transcripts' (`WorkTime.ofPhase()`);  a test's gives its own
   * - `pastedReader`:  default the transcript's;  a test's gives its own
   * - `hushJudge`:  default `claude -p`;  a test's gives its own
   * - `titleReader`:  default `claude -p`, skipped under a test runner;  a test's gives its own
   * - `itemJudge`:  the same
   */
  constructor({
    files = new PlanDocFiles(),
    sessionsOf,
    phaseTimer = (request) => new WorkTime().ofPhase(request).minutes,
    pastedReader,
    hushJudge,
    titleReader,
    itemJudge
  }: {
    files?: PlanDocFiles
    sessionsOf?: SessionFinder
    phaseTimer?: PhaseTimer
    pastedReader?: PastedReader
    hushJudge?: HushJudge
    titleReader?: TitleReader
    itemJudge?: ItemJudge
  } = {}) {
    this.files = files
    this.phaseTimer = phaseTimer
    this.pastedReader = pastedReader
    this.hushJudge = hushJudge
    this.titleReader = titleReader ?? new TitleReader({ warn: (line) => this.warn(line) })
    this.itemJudge = itemJudge ?? new ItemJudge()
    this.badges = new BadgeCommands(this)
    this.inbox = new InboxCommands(this)
    this.migrator = new MigrateCommands(this, sessionsOf)
    this.sagas = new SagaCommands(this)
    this.tests = new TestCommands(this)
    this.options = new OptionCommands(this)
    this.focus = new FocusCommands(this)
    this.fresh = new FreshCommands(this)
  }

  ////////////////
  // ## Running
  ////////////////

  /**
   * Run the command line `argv` (everything after `plan-doc`);  resolves to the exit code.
   * - a `PlanDocError` is a message, `epic:  <message>` on stderr, exit 1
   * - anything else is a bug, and throws
   * - `2`:  usage (no command, or a bad one), or `inbox wait` timing out
   * - `1`:  `lint` found problems
   */
  async run(argv: string[]): Promise<number> {
    try {
      return (await this.main(argv)) ?? 0
    } catch (error) {
      if (!(error instanceof PlanDocError)) throw error
      this.warn(`epic:  ${error.message}`)
      return 1
    }
  }

  /** Run one command;  resolves to its exit code, `undefined` for 0. */
  private async main(argv: string[]): Promise<number | void> {
    const { positional, flags, lists } = parseVerbArgs(argv, SWITCHES)
    const [command, name, ...rest] = positional
    if (command === "list") return this.printEpics(this.files.listEpics(), Boolean(flags.json))
    // `bedtime all ...` and `bedtime status`:  every epic at once, not one page (`BedtimeAll`, epic `epic-engine` T85)
    if (command === "bedtime" && (name === "all" || name === "status"))
      return this.bedtimeAll(name === "status" ? ["status", ...rest] : rest, flags)
    // `focus on | off | status | summary`:  every running epic at once (`FocusCommands`, epic `epic-engine` T93)
    if (command === "focus") return this.focus.run(positional.slice(1), flags)
    // `fresh all [--pause] | later | queued | status | drop | quiet | wait | cancel`:  every running epic session to a fresh one
    // (`FreshCommands`, epic `epic-engine` T113;  its pause round, T139)
    if (command === "fresh") return this.fresh.run(positional.slice(1), flags)
    if (command === "backfill") return this.backfill(name, flags)
    if (command === "migrate") return this.migrator.run(positional.slice(1), flags)
    // `saga page`:  a saga's page (`SagaPage`);  every other `saga` verb is the list's (`SagaCommands`)
    if (command === "saga" && name === "page") return this.sagaPage(rest, flags)
    if (command === "saga") return this.sagas.run(positional.slice(1), flags)
    if (command === "split" && flags.done) return this.splitDone(flags)
    if (command === "test" && flags.all) return this.tests.all(flags)
    // `commits remap <map...> --repo <old repo>`:  every epic page's commits, not one page's (epic-engine's P49)
    if (command === "commits" && name === "remap") return this.remapCommits(rest, flags)
    // `hush [<epic> | all]`:  this checkout's epic with no name, every open epic with `all` (epic `epic-engine` T122)
    if (command === "hush") return this.hush(name, flags)
    if (!command || !name) return this.usage()
    if (command === "summaries") return this.printSummaries(positional.slice(1), summaryScope(flags))
    if (command === "owns")
      return this.printOwners(new EpicOwners({ files: this.files }).find(positional.slice(1)), Boolean(flags.json))
    // the shared doc, by THIS checkout's path (`findDoc()`);
    // `--here` meant that before every checkout shared one copy:
    // accepted and ignored, so old callers keep working (T3 of `review-review`)
    if (flags.here) this.warn("epic:  --here is no longer needed:  every checkout edits the one shared doc")
    const file = command === "create" ? this.files.docPath(name) : this.files.findDoc(name)
    switch (command) {
      case "create":
        return this.create(name, file, flags)
      case "close-all":
        return this.closeAll(file, rest[0], flags)
      case "add-phase": {
        const { label, moved } = await this.edit(file, (plan) => {
          const before = phaseFlag(plan, flags.before, "--before")
          const after = phaseFlag(plan, flags.after, "--after")
          const was = plan.phases
          const added = plan.addPhase(need(rest[0], "a short name"), { ...flags, before, after })
          const moved = movedDown(was, plan.phases)
          plan.log(`${plan.phaseLabel(added)} added:  ${rest[0]}${moved ? `;  ${moved}` : ""}`)
          return { label: plan.phaseLabel(added), moved }
        })
        this.print(label)
        // the phases after it moved down a number:  links' words follow them (`links-agree`)
        return moved ? this.agree(file) : undefined
      }
      case "phase": {
        const phase = need(rest[0], "a phase")
        const status = need(rest[1], "a status")
        // `phase seo 3 took`:  its time worked out again, for a phase done before (epic `epic-engine` P41)
        if (status === "took") return this.tookAgain(name, file, phase, Boolean(flags.dryRun))
        // `phase seo#P20 planning [off]`:  Claude is writing its plan, on the page (epic `epic-engine` I147)
        if (status === "planning") return this.planning(file, phase, rest[2] !== "off")
        // `phase seo#P5 remove`:  never started, taken off the page (epic `epic-engine` T169)
        if (status === "remove") return this.removePhase(file, phase)
        if (flags.why !== undefined && status !== "dropped")
          throw new PlanDocError(`phase ${phase} ${status}:  --why is for dropped (why it was never built)`)
        const minutes = status === "done" ? this.minutesFor(name, file, phase) : undefined
        // done:  the branch's commits so far, into their phases and items (epic `epic-engine` I135)
        const history = status === "done" ? this.historyOrNone(file) : undefined
        const added = await this.edit(file, (plan) => {
          plan.setPhase(plan.phasePlace(phase), status, {
            done: flags.done as string | undefined,
            why: stringFlag(flags.why),
            minutes
          })
          return history ? plan.backfillCommits(history.log, history) : []
        })
        // and each into the Log (epic `epic-engine` P52)
        const logged = added.filter((entry) => entry.log).length
        const listed = added.length - logged
        if (added.length)
          this.print(`${listed} commit${listed === 1 ? "" : "s"} listed on the page, ${logged} added to the Log`)
        // finished (done or dropped, I228):  nobody works on it any more (I147)
        if (PhaseStatuses.isFinished(status)) this.inbox.setWorking(file, this.phaseIdOf(file, phase), false)
        this.files.reindex()
        // a new stage:  bring the doc forward, unless told not to.
        // No reload, nor a second one:  the edit reaches the page by the live client
        // (it updates itself in place, `spell-doc-runtime.js` `wireLiveUpdate()`),
        // and showing the page the view already has only reveals it (`packages/vscode/src/DocView.ts`)
        return flags.noOpen ? undefined : this.openInVSCode(file)
      }
      case "move":
        // epic `epic-engine` P34:  a to-do phase to another place among the to-do phases;  numbers and text follow
        return this.edit(file, (plan) => {
          const from = plan.phasePlace(need(rest[0], "a phase"))
          // its new place:  the phase there now, as people name it (`P5`, its name)
          const to = plan.phasePlace(need(rest[1], "its new place (the phase there now:  P5)"))
          const was = plan.phaseLabel(from)
          // past a started phase, it lands on the nearest to-do place (`PhaseMoves`, I480)
          this.print(`${was} -> ${plan.phaseLabel(plan.movePhase(from, to))}`)
        })
      case "phase-body": {
        const planning = await this.edit(file, (plan) => {
          const n = plan.phasePlace(need(rest[0], "a phase"))
          const set = plan.setPhaseFields(n, flags, { accepted: flags.accepted === true })
          if (!set.length)
            throw new PlanDocError(`phase-body what?  --symptom / --changes / --goal / --files / --verify / --choices`)
          plan.log(`${plan.phaseLabel(n)} ${set.join(", ")} set`)
          return PlanDocCommands.planningAfter(plan.phase(n), flags)
        })
        if (planning) this.inbox.setWorking(file, planning.id, planning.on)
        return undefined
      }
      case "updated": {
        // An answer's change shows as its change marks alone:  no block when they say it (epic `epic-engine` I159)
        const forIds =
          flags.for === undefined ? undefined : need(stringFlag(flags.for), "--for <item ids>").split(/[\s,]+/)
        const said = await this.edit(file, (plan) => {
          const n = plan.phasePlace(need(rest[0], "a phase"))
          const html = flags.file ? readFileSync(flags.file as string, "utf8") : need(rest[1], "what changed (html)")
          const ids = plan.marksSay(n, html, forIds?.filter(Boolean))
          if (ids.length) return `${plan.phaseLabel(n)}:  no Update block, the change marks say it (${ids.join(", ")})`
          // Owen's own answer carried out:  written seen, no news for him (I179)
          const given = forIds?.filter(Boolean)
          return plan.addPhaseUpdate(n, html, { summary: stringFlag(flags.summary), forIds: given }) || undefined
        })
        if (said) this.print(said)
        return undefined
      }
      case "stage":
        return this.edit(file, (plan) => {
          const stage = need(rest[0], `a stage (${PageStages.ALL.join(" | ")})`)
          if (!PageStages.isStage(stage)) throw new PlanDocError(`stage:  ${PageStages.ALL.join(", ")}, not "${stage}"`)
          if (!plan.setStage(stage)) this.print(`already ${stage}`)
          else this.print(`${name}:  ${stage}`)
        })
      case "change":
        return this.changeMarks(file, flags)
      case "branch":
        return this.edit(file, (plan) => plan.setBranch(need(rest[0], "a branch name")))
      case "standing":
        return this.edit(file, (plan) => {
          const value = rest[0] ?? "on"
          if (value !== "on" && value !== "off") throw new PlanDocError(`standing:  on or off, not "${value}"`)
          plan.setStanding(value === "on")
        })
      case "request": {
        // into a todo (epic `epic-engine` T88) or an issue (T108):  its text, its pictures copied in as the person's,
        // marked requested
        const into = need(rest[0], "a phase, a todo or an issue").toLowerCase()
        if (TODO_ID.test(into) || ISSUE_ID.test(into)) {
          const pictures = ItemPictures.fromFiles(lists.picture ?? [])
          const html = readFileSync(need(stringFlag(flags.file), "--file (the request as html)"), "utf8")
          const requestId = need(rest[1], "a request id")
          const filed = await this.edit(file, (plan) => {
            const named = pictures.length ? ItemPictures.named(file, into, pictures) : []
            // labelled on from the item's own pictures (epic `epic-engine` P75):  IMG3 after its IMG2
            const first = ItemPictures.nextNumber(plan.findItem(into))
            const title = plan.addItemRequest(into, requestId, `${html}${ItemPictures.html(named, first)}`)
            return { title, named: title === undefined ? [] : named }
          })
          ItemPictures.save(file, filed.named)
          return this.print(
            filed.title === undefined
              ? `${requestId} is in ${into.toUpperCase()} already`
              : `${requestId} filed into ${into.toUpperCase()} · ${filed.title}`
          )
        }
        return this.edit(file, (plan) =>
          plan.addPhaseRequest(
            plan.phasePlace(need(rest[0], "a phase")),
            need(rest[1], "a request id"),
            need(flags.from as string | undefined, "--from (who sent it)"),
            readFileSync(need(flags.file as string | undefined, "--file (the request as html)"), "utf8")
          )
        )
      }
      case "rename": {
        const target = need(rest[0], "a phase (P6) or an item id")
        const title = need(rest[1], "the new title")
        // at most 30 plain words (epic `epic-engine` I321, I322), and read cold by a fresh reader (T123)
        const plain = flags.html ? title.replace(/<[^>]*>/g, "") : title
        ShortTitle.check(plain)
        if (!flags.titleOk) this.titleReader.check(plain, PHASE_REF.test(target) ? "phase" : "item")
        const renamed = await this.edit(file, (plan) => plan.renameEntry(target, title, { html: !!flags.html }))
        const links = renamed.links ? `;  ${renamed.links} link${renamed.links === 1 ? "" : "s"} rewritten` : ""
        this.print(`${renamed.label} · ${renamed.title} (was "${renamed.was}"${links})`)
        return this.agree(file)
      }
      case "estimate":
        return this.edit(file, (plan) => {
          const n = plan.phasePlace(need(rest[0], "a phase"))
          plan.setEstimate(n, need(rest[1], "the estimate"))
          plan.log(`${plan.phaseLabel(n)} estimate:  ${rest[1]}`)
        })
      case "add": {
        const [kind, title] = [need(rest[0], "a kind"), need(rest[1], "a title")]
        // a standing option set, in the Choices section (epic `epic-engine` P50)
        if (kind === "choices") return this.options.addStanding(file, title, flags)
        // at most 30 plain words, the rest in its details (epic `epic-engine` I321, I322);  read cold by a fresh
        // reader (T123), unless --title-ok
        ShortTitle.check(title)
        if (!flags.titleOk) this.titleReader.check(title, kind)
        const words = stringFlag(flags.start)
        if (flags.start === true) throw new PlanDocError(`--start needs the person's words:  --start "<his words>"`)
        // the person's pictures (epic `epic-engine` T87):  `--picture <file>`, repeatable, then the ones pasted last
        const pictures = [
          ...ItemPictures.fromFiles(lists.picture ?? []),
          ...(await ItemPictures.fromPasted(
            flags.pasted,
            stringFlag(flags.from) ?? process.env.CLAUDE_CODE_SESSION_ID,
            this.pastedReader
          ))
        ]
        const added = await this.edit(file, (plan) => {
          const given = words === undefined ? flags : { ...flags, details: flags.details ?? startedBody(words, plan) }
          const item = this.tests.addItem(plan, kind, title, given, { file, pictures })
          if (words !== undefined) plan.addStatus(item.id, startedReading(flags))
          return item
        })
        const { id } = added
        this.tests.saveExample(file, added.example)
        ItemPictures.save(file, added.pictures)
        // taken up at once:  blue on the page now, never red as if it waited on him (epic `epic-engine` T78)
        if (words !== undefined) this.inbox.setWorking(file, id, true, { took: true })
        return this.print(id.toUpperCase())
      }
      case "calm": {
        if (!rest.length) need(undefined, "an item id")
        const lines = await this.edit(file, (plan) => rest.map((id) => calmItem(plan, id, !flags.loud)))
        return this.print(lines.join("\n"))
      }
      case "requested": {
        if (!rest.length) need(undefined, "an issue id")
        const lines = await this.edit(file, (plan) =>
          rest.map((id) => `${id.toUpperCase()} ${plan.setRequested(id) ?? "requested already"}`)
        )
        return this.print(lines.join("\n"))
      }
      case "failed": {
        // a manual test that failed, filed as an issue by the session (epic `epic-engine` I174);  `off` takes it off
        const test = need(rest[0], "a manual test's id")
        const issue = need(rest[1], "the issue it was filed as (I12), or off")
        const line = await this.edit(file, (plan) => failTest(plan, test, issue === "off" ? undefined : issue))
        return this.print(line)
      }
      case "decide": {
        const question = need(rest[0], "a question id")
        const id = await this.edit(file, (plan) => {
          const decided = plan.decide(question, need(rest[1], "the answer"), flags)
          plan.log(`${decided.toUpperCase()} answered:  ${rest[1]}`)
          return decided
        })
        this.inbox.stopWorking(file, [id])
        return this.print(id.toUpperCase())
      }
      case "choose":
        // several letters, a phase or a standing set too (epic `epic-engine` P50)
        return this.options.choose(file, rest, flags)
      case "option":
        return this.options.run(file, rest, flags)
      case "badges":
        return this.badges.run(name, file, rest, flags)
      case "commit":
        return this.commit(file, rest, flags)
      case "commits":
        if (!flags.backfill) throw new PlanDocError(`commits what?  --backfill  (${USAGE_HINT})`)
        return this.backfillCommits(file, flags.merged)
      case "close": {
        const closed = await this.closeItems(file, rest, flags)
        this.inbox.stopWorking(file, rest)
        return closed
      }
      case "reopen":
        return this.edit(file, (plan) => {
          const title = plan.setItem(need(rest[0], "an item id"), "open")
          plan.log(`${rest[0].toUpperCase()} reopened:  ${title}`)
        })
      case "stale":
        if (flags.underway) return this.staleUnderway(name, file, flags)
        return this.printStale(name, file, Boolean(flags.json))
      case "cancel": {
        await this.edit(file, (plan) => {
          const title = plan.setItem(need(rest[0], "an item id"), "canceled")
          plan.log(`${rest[0].toUpperCase()} canceled:  ${rest[1] ?? title}`)
        })
        return this.inbox.stopWorking(file, [rest[0]!])
      }
      case "review":
        return this.edit(file, (plan) => {
          const id = need(rest[0], "an item id")
          const title = plan.review(id)
          plan.log(`${id.toUpperCase()} reviewed:  ${rest[1] ?? title}`)
        })
      case "defer":
        return this.edit(file, (plan) => {
          const id = need(rest[0], "an item id")
          plan.log(`${id.toUpperCase()} deferred:  ${plan.defer(id)}`)
        })
      case "queue":
        return this.edit(file, (plan) => {
          const id = need(rest[0], "an item id")
          plan.queue(id, need(rest[1], "the work to do"))
          plan.log(`${id.toUpperCase()} to do:  ${rest[1]}`)
        })
      case "unqueue":
        return this.edit(file, (plan) => {
          const id = need(rest[0], "an item id")
          plan.log(`${id.toUpperCase()} off the to-do list:  ${plan.unqueue(id)}`)
        })
      case "items":
        return this.printItems(this.read(file), file, flags)
      case "log":
        // no text:  print the review lines, which the page no longer shows (epic `epic-engine` P52, Q56 C)
        if (rest[0] === undefined) return this.printLog(file, flags)
        return this.edit(file, (plan) => plan.log(rest[0]!))
      case "bedtime":
        return this.edit(file, (plan) => bedtime(plan, rest))
      case "prompt": {
        const prompt = flags.file ? readFileSync(flags.file as string, "utf8") : need(rest[0], "the prompt text")
        return this.edit(file, (plan) => plan.setPrompt(prompt))
      }
      case "split":
        return this.splitDoc(file, flags)
      case "join":
        return this.joinDoc(file)
      case "summary":
        return this.printSummary(file, summaryScope(flags), Boolean(flags.json))
      case "docs":
        return this.printDocs(new EpicDocs({ files: this.files, name }).find(), Boolean(flags.json))
      case "decisions":
        return this.printDecisions(new EpicDocs({ files: this.files, name }).decisions(), Boolean(flags.json))
      case "lint":
        if (flags.fix) {
          const fixed = await this.edit(file, (plan) => plan.finishStaleUnderway())
          for (const id of fixed) this.print(`FIXED:  ${id.toUpperCase()}:  its status card left underway finished`)
        }
        return this.lint(file, flags)
      case "open":
        return this.open(file)
      case "inbox":
        return this.inbox.run(name, file, rest, flags)
      case "details":
        return this.details(name, file, rest, flags)
      case "summarize":
        return this.summarize(name, file, rest, flags)
      case "test":
        return this.tests.run(name, file, flags)
      case "status":
        return this.status(file, rest, flags)
      case "original":
        return this.original(file, rest, flags)
      default:
        return this.usage()
    }
  }

  ////////////////
  // ## Output
  ////////////////

  /** Print `text` and a newline on stdout:  what `console.log()` printed, which the `spell` CLI silences. */
  ////////////////
  // ## Time worked (epic `epic-engine` P41)
  ////////////////

  /**
   * How long Claude has worked on phase `phase` of epic `name` (doc `file`), from its last `active` to now:  for
   * `phase ... done`.
   * - `undefined` when the log never says it went active, or nothing was found
   * - best effort, NEVER throws:  a transcript that won't read leaves the phase without a time, and says why
   */
  private minutesFor(name: string, file: string, phase: string): number | undefined {
    try {
      const plan = this.files.read(file)
      const n = plan.phasePlace(phase)
      if (plan.phase(n).getAttribute("status") === "done") return undefined
      const window = plan.activeWindow(n)
      return window && (this.phaseTimer({ epic: name, phase: plan.phaseLabel(n), window }) || undefined)
    } catch (error) {
      this.warn(`epic:  no time for ${phase}:  ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  /**
   * `phase <name> P20 planning [off]`:  Claude is writing phase P20's plan (epic `epic-engine` I147), so its page shows
   * it:  the review inbox's `working` on its stable id, which `<epic-phase>` draws as a blue spinner;  `off` ends it.
   * - `update <name>#P20 --plan` turns it off by itself, the plan written and waiting for Owen (`planningAfter()`)
   */
  private planning(file: string, phase: string, on: boolean): void {
    const id = this.phaseIdOf(file, phase)
    this.inbox.setWorking(file, id, on)
    const plan = this.read(file)
    this.print(`${plan.phaseLabel(plan.phasePlace(id))} planning:  ${on ? "on" : "off"}`)
  }

  /**
   * `phase <name> P5 remove`:  phase P5, never started, taken off the page (epic `epic-engine` T169;
   * `PlanDoc.removePhase()`, which throws for one started, with commits, or with requests filed into it);
   * the phases after it moved up a number, so links' words follow them (`links-agree`)
   */
  private async removePhase(file: string, phase: string): Promise<void> {
    const removed = await this.edit(file, (plan) => plan.removePhase(plan.phasePlace(phase)))
    const back = removed.unqueued.length
      ? `;  ${removed.unqueued.map((id) => id.toUpperCase()).join(", ")} unqueued`
      : ""
    this.print(`${removed.label} ${removed.name} removed${back}`)
    await this.agree(file)
  }

  /** The stable id (`p-one-repo`) of the phase `phase` names in the doc at `file`, as people name one (`P20`). */
  private phaseIdOf(file: string, phase: string): string {
    const plan = this.read(file)
    return plan.phase(plan.phasePlace(phase)).id
  }

  /**
   * Whether a `phase-body` edit of `phase` (`epic update <name>#P20 --goal ...`) leaves Claude writing its plan
   * (epic `epic-engine` I147):  the page's spinner on it, or off;  `undefined`:  leave it as it is.
   * - its plan written (`--plan`:  now waiting for Owen's Accept, or accepted, the doc pass):  off
   * - else still to do, and its plan not accepted yet:  on, until `--plan` comes (or `phase ... planning off`)
   * - read after the edit:  `plan` is what the edit just set
   */
  static planningAfter(phase: Element, flags: Flags): { id: string; on: boolean } | undefined {
    if (stringFlag(flags.plan)?.trim()) return { id: phase.id, on: false }
    const todo = (phase.getAttribute("status") ?? "todo") === "todo"
    if (todo && phase.getAttribute("plan") !== "accepted") return { id: phase.id, on: true }
    return undefined
  }

  /**
   * `phase <name> <N> took [--dry-run]`:  phase `N`'s time worked out again from the transcripts, for a phase done
   * before (its log's last `active` to its `done`);  written as `took`, with its `span` by the clock (epic
   * `epic-engine` I127), unless `dryRun`, and printed (`P38 took 58m`).
   * - throws when it isn't done, or the log doesn't say when it was active
   */
  private async tookAgain(name: string, file: string, phase: string, dryRun: boolean): Promise<void> {
    const plan = this.files.read(file)
    const n = plan.phasePlace(phase)
    const label = plan.phaseLabel(n)
    if (plan.phase(n).getAttribute("status") !== "done") throw new PlanDocError(`took:  ${label} isn't done yet`)
    const window = plan.activeWindow(n)
    if (!window) throw new PlanDocError(`took:  the log doesn't say when ${label} was active, and done`)
    const minutes = this.phaseTimer({ epic: name, phase: label, window })
    if (!minutes) throw new PlanDocError(`took:  no work found for ${label} in the transcripts`)
    if (!dryRun) await this.edit(file, (edited) => edited.setTook(edited.phasePlace(phase), minutes))
    this.print(`${label} took ${PlanTime.formatMinutes(minutes)}${dryRun ? "  (dry run:  not written)" : ""}`)
  }

  print(text: string): void {
    process.stdout.write(`${text}\n`)
  }

  /** Print `text` and a newline on stderr. */
  warn(text: string): void {
    process.stderr.write(`${text}\n`)
  }

  /** `value`, or a usage error naming what's missing (`need()`):  for `InboxCommands`, which can't import it back. */
  need(value: string | undefined, what: string): string {
    return need(value, what)
  }

  /** Print usage on stderr;  exit code 2. */
  private usage(): number {
    this.warn(USAGE)
    return 2
  }

  ////////////////
  // ## Reading and editing
  ////////////////

  /** The epic page at `file`, whole:  `PlanDocFiles.read()`;  refuses an old-markup doc. */
  read(file: string): PlanDoc {
    return this.files.read(file)
  }

  /**
   * Change the doc at `file` under its lock, and write it:  `PlanDocFiles.edit()`.
   * - on a page with badges, the items the change made are judged after it, the lock let go (epic `epic-engine`
   *   P81:  every way an item is created comes through here)
   *   - no page without badges is ever scored
   */
  async edit<T>(file: string, change: (plan: PlanDoc) => T, options?: { split?: boolean }): Promise<T> {
    let made: string[] = []
    let epic = ""
    const result = await this.files.edit(
      file,
      (plan) => {
        const before = plan.badges.mode && new Set(plan.allItems.map((item) => item.id))
        const changed = change(plan)
        if (before) {
          made = plan.allItems.flatMap((item) => (before.has(item.id) ? [] : item.id))
          epic = plan.page.getAttribute("epic") ?? ""
        }
        return changed
      },
      options
    )
    if (made.length) await this.badges.judgeNew(epic, file, made)
    return result
  }

  /**
   * After a rename or an insert:  the `links-agree` step on the doc at `file` (`PlanDocFiles.migrate()`),
   * so links and Owen's comments follow what moved.
   * - what it fixed or left goes on stderr (stdout holds the command's answer)
   */
  private async agree(file: string): Promise<void> {
    const { notes } = await this.files.migrate(file, { only: ["links-agree"] })
    for (const note of notes) this.warn(note)
  }

  ////////////////
  // ## Commands
  ////////////////

  /**
   * `create`:  copy the tool's template (`templates/plan.html`, `<epic-*>` markup) to `file`,
   * fill in name, title, dates, branch and worktree, then update the index.
   * - `<title>`:  `Epic: <title>` (`TITLE_PREFIX`);  `<epic-page title>` holds the title alone (it draws the h1)
   * - refuses to overwrite:  the skill asks the user whether to reuse an existing doc
   * - a future epic, now planned (`/epic <name>`):  promoted where it is, its prompt and answers kept
   * - `--saga <id>`:  the saga it serves, from the start (epic `epic-workflow` P15)
   * - every new epic starts in the OVERVIEW STAGE (`<epic-page stage="overview">`, epic `epic-engine` P29, Q15;  the
   *   default since P33, when the epic skill began planning that way):  the page shows only the Overview, Questions
   *   and Todo until its Accept Overview
   *   - `--stage <stage>`:  another to start in (`building`:  as before stages, everything shown)
   *   - a future epic promoted keeps the stage it has;  one made before stages has none, and reads as building
   *   - refused, writing nothing, for a saga not in the list
   */
  private async create(name: string, file: string, flags: Flags): Promise<void> {
    const { title = titleCase(name), prompt, promptFile, future = false, saga, stage } = flags as CreateFlags
    const { files } = this
    if (saga !== undefined)
      new Sagas(files.root).need(need(saga === true ? undefined : saga, "--saga <id>"), "create --saga")
    const nameSaga = (plan: PlanDoc) => typeof saga === "string" && plan.setSaga(saga)
    const found = PlanDocFiles.planDocIn(dirname(file), name)
    if (found && !future) {
      const branch = files.git("branch", "--show-current") || "(detached)"
      const worktree = files.checkoutRoot
      const promoted = (plan: PlanDoc) => {
        const was = plan.promote({ branch, worktree })
        if (was) nameSaga(plan)
        return was
      }
      if (await this.edit(found, promoted)) {
        files.reindex()
        return this.print(`${relative(process.cwd(), found)}:  was a future epic, now planned here`)
      }
    }
    if (found) throw new PlanDocError(`${relative(files.content, found)} already exists`)
    const now = new Date()
    const today = PlanTime.isoDate(now)
    const fill: Record<string, string> = {
      name,
      title,
      date: today,
      at: PlanTime.isoMinutes(now),
      branch: files.git("branch", "--show-current") || "(detached)",
      worktree: files.checkoutRoot
    }
    // `fromTemplate()`:  an older template's asset paths, pack and site header;  its links are root paths
    const fixed: string = fromTemplate(readFileSync(files.template, "utf8"))
    const html = fixed
      .replace(/\{\{(\w+)\}\}/g, (whole: string, key: string) =>
        key in fill ? PlanMarkup.escapeAll(fill[key]) : whole
      )
      .replace(/\n\s*<!--\s*PLAN DOC TEMPLATE\.[\s\S]*?-->/, "")
    const plan = PlanDoc.parse(html, now)
    plan.document.querySelector("title")!.textContent = `${TITLE_PREFIX}${title}`
    plan.document.querySelector('meta[name="description"]')!.setAttribute("content", `Epic page:  ${title}.`)
    // the prompt that started the plan, in the Overview's `prompt` slot;  none:  no quote
    plan.setPrompt(promptFile ? readFileSync(promptFile, "utf8") : (prompt ?? ""))
    if (future) plan.makeFuture()
    // the Overview stage (Q15 of epic `epic-engine`):  where every epic starts since P33
    const start = stage ?? "overview"
    if (!PageStages.isStage(start))
      throw new PlanDocError(`create --stage:  ${PageStages.ALL.join(", ")}, not "${start}"`)
    Markup.set(plan.page, { stage: start })
    nameSaga(plan)
    mkdirSync(dirname(file), { recursive: true })
    // split from the start (J... of `claude-design`):
    // a doc being planned is the one edited most, so it gains most
    await files.writeDoc(file, plan, true)
    files.reindex()
    this.print(relative(process.cwd(), file))
  }

  /**
   * `saga page <id> [--force]`:  saga `id`'s page from the template (`SagaPage.make()`), then the docs index.
   * - prints its path
   */
  private async sagaPage([id]: string[], { force }: Flags): Promise<void> {
    const file = await new SagaPage(this.files).make(need(id, "a saga id"), { force: Boolean(force) })
    this.files.reindex()
    this.print(relative(process.cwd(), file))
  }

  /**
   * `commit <name> <sha> --phase N | --item <id> "sentence"`:
   * list commit `sha` under a phase or an item, replacing its entry there.
   * - `sha` is resolved to its full sha in the doc's checkout, else in one of its child repos
   *   (`PlanDocFiles.repoFolders()`), whose GitHub page its link then goes to
   */
  private async commit(file: string, [sha, sentence]: string[], { phase, item }: Flags): Promise<void> {
    need(sha, "a commit sha")
    need(sentence, "a sentence:  what the commit did")
    if ((phase === undefined) === (item === undefined)) throw new PlanDocError(`commit needs --phase N or --item <id>`)
    const folders = this.files.repoFolders(file)
    const found = folders
      .map((folder) => ({
        folder,
        full: PlanDocFiles.gitIn(folder, "rev-parse", "--verify", "--quiet", `${sha}^{commit}`)
      }))
      .find(({ full }) => full)
    if (!found) throw new PlanDocError(`no commit "${sha}" in ${folders.join(", ")}`)
    const { folder, full } = found
    const base = this.files.commitBase(file)
    const repo = PlanDocFiles.commitBaseOf(folder)
    const { done, where } = await this.edit(file, (plan) => {
      const target = phase !== undefined ? { phase: plan.phasePlace(String(phase)) } : { item: String(item) }
      const where = target.phase !== undefined ? plan.phaseLabel(target.phase) : target.item!.toUpperCase()
      return { done: plan.addCommit(target, full, sentence, { base, repo }), where }
    })
    this.print(`${where}:  ${full.slice(0, 7)} ${done}`)
  }

  /**
   * `commits <name> --backfill [--merged <sha,...>]`:
   * the doc's phase and item commits into its phases' and items' commit lists (`PlanDoc.backfillCommits()`).
   * - prints what it added
   * - the doc's history:  `PlanDocFiles.epicHistory()`
   * - every commit read also gets its entry in the Log (epic `epic-engine` P52), printed as `Log`
   * - `--merged`:  only those commits, short shas or full (`epic merge`'s, just fast-forwarded onto `main`;  epic
   *   `epic-engine` I135)
   */
  private async backfillCommits(file: string, merged?: string | boolean): Promise<void> {
    const only = typeof merged === "string" ? merged.split(",").filter(Boolean) : undefined
    const history = this.files.epicHistory(file)
    const log = only
      ? history.log.filter(({ sha }) => only.some((given) => sha.startsWith(given) || given.startsWith(sha)))
      : history.log
    const added = await this.edit(file, (plan) =>
      plan
        .backfillCommits(log, history)
        .map((entry) => ({ ...entry, where: entry.phase !== undefined ? plan.phaseLabel(entry.phase) : undefined }))
    )
    for (const entry of added) {
      const where = entry.where ?? (entry.log ? LOG_LABEL : entry.item!.toUpperCase())
      this.print(`  ${where.padEnd(4)} ${entry.sha.slice(0, 7)}`)
    }
    const logged = added.filter((entry) => entry.log).length
    const listed = added.length - logged
    const count = `${listed} commit${listed === 1 ? "" : "s"} added, ${logged} to the Log`
    this.print(only ? `${count} (${only.length} merged)` : `${count} (${history.log.length} in the doc's history)`)
  }

  /**
   * `commits remap <map...> --repo <old repo>[,<old name>...] [--to <repo>] [--dry-run]`:  every `<epic-commit>` of
   * the old repo, over the WHOLE epic folder, pointed at its new id in the merged repo (`CommitRemap`;
   * epic-engine's P49, after repo-split's P20 · One Repo).
   * - several maps:  one lookup, the first map's id winning (`tools/one-repo/commit-map-ui.txt` and
   *   `commit-map-ui-elemental-spell.txt` together)
   * - `--repo`:  the old repo, and any older name of it, comma-separated (`spell-parser,spell-lang`)
   * - `--to`:  the new repo;  default this checkout's own (`git remote get-url origin`)
   * - prints each file's count, the ids not in the map, then the totals;  `--dry-run` writes nothing
   */
  private remapCommits(maps: string[], flags: Flags): void {
    // a bare `--dry-run` before a map took it as its value:  it's a map
    if (typeof flags.dryRun === "string") maps = [flags.dryRun, ...maps]
    const dryRun = Boolean(flags.dryRun)
    const repos = stringFlag(flags.repo)?.split(",").filter(Boolean) ?? []
    if (!maps.length || !repos.length)
      throw new PlanDocError("commits remap <map> [<map> ...] --repo <old repo>  [--to <repo>] [--dry-run]")
    const to = stringFlag(flags.to) ?? PlanDocFiles.commitBaseOf(this.files.root)
    if (!to) throw new PlanDocError("commits remap:  this checkout's remote has no web page:  --to <repo>")
    const remap = new CommitRemap({
      ids: CommitRemap.readMap(maps.map((map) => resolve(map))),
      from: repos,
      to,
      renamed: EpicConfig.of(this.files.root).renamedRepos
    })
    const report = remap.run(this.files.content, { dryRun })
    for (const { file, found, remapped } of report.files)
      this.print(`  ${file}  ${remapped} of ${found}${remapped < found ? `, ${found - remapped} not in the map` : ""}`)
    for (const { sha, file } of report.missing) this.print(`  not in the map:  ${sha.slice(0, 12)}  ${file}`)
    const pages = report.pages ? `;  ${report.pages} ${report.pages === 1 ? "page's" : "pages'"} own repo moved` : ""
    this.print(
      `${remap.from.join(", ")} -> ${remap.to}:  ${report.found} commits found, ${report.remapped} remapped, ` +
        `${report.missing.length} not in the map, in ${report.files.length} files${pages}` +
        (dryRun ? "  (dry run:  nothing written)" : "")
    )
  }

  /**
   * `PlanDocFiles.epicHistory()`, best effort (`phase ... done`):  NEVER throws;  a history that won't read is
   * `undefined`, and says why.
   */
  private historyOrNone(file: string): CommitHistory | undefined {
    try {
      return this.files.epicHistory(file)
    } catch (error) {
      this.warn(`epic:  no commits listed:  ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  /**
   * `details <name> <id> --file <html> [--append | --more]`:
   * an agent's details or reply into one item, under the doc's lock.
   * - a test's fields instead of, or before, the file's HTML (epic `epic-engine` P4):
   *   `--step`, `--should`, `--example`, `--if-not` (`TestCommands.fieldsOf()`)
   * - `--prepared <n>` on a test (epic `epic-engine` P51):  Start testing wrote it out for Owen, its place `n` in his
   *   order (`<epic-item prepared="2">`);  alone, it only stamps it
   * - refused while Owen called the request off on the page ("nevermind", epic `windows-and-review` P2):
   *   nothing lands
   */
  private async details(name: string, file: string, rest: string[], flags: Flags): Promise<void> {
    const id = need(rest[0], "an item id")
    const fields = this.tests.fieldsOf(id, flags)
    const prepared = this.tests.preparedOf(id, flags)
    if (prepared && !fields.html && stringFlag(flags.file) === undefined) {
      refuseCanceled(name, file, id)
      await this.edit(file, (plan) => plan.prepareTest(id, prepared))
      return
    }
    const given = stringFlag(flags.file) !== undefined || !fields.html
    const html =
      fields.html + (given ? readFileSync(need(flags.file as string | undefined, "--file <html file>"), "utf8") : "")
    refuseCanceled(name, file, id)
    if (flags.append && flags.more) throw new PlanDocError("--append or --more, not both")
    await this.edit(file, (plan) => {
      if (flags.more) plan.addMore(id, html)
      else plan.setDetails(id, html, { append: Boolean(flags.append) })
      if (prepared) plan.prepareTest(id, prepared)
      plan.log(
        `${id.toUpperCase()} ${flags.more ? "more details added" : flags.append ? "reply added" : "details rewritten"}`
      )
    })
    this.tests.saveExample(file, fields.example)
  }

  /**
   * `change <name> [--for <item id>]`:  the CHANGE MARKS (`<epic-change>`, epic `epic-engine` P30), after Claude
   * wrote them by hand into the Overview's or a phase's text (a part, or a command's HTML).
   * - stamps them, as every edit does (`PlanDoc.updateChanges()`):  each new one's id (`ch3`), time and answer
   * - `--for q13`:  first, the marks that name no item take that one;  refused for an id the doc has no item for
   *   - or a comment, `--for c2` (epic `epic-engine` T100):  refused for one the epic hasn't got
   * - then prints each, new first:  `CH3  Q13  new  "todos fold into it" (Q13)  in o2`, and how many are new (3
   *   days, orange on the page;  no approval:  Owen, 2026-10-25)
   */
  private async changeMarks(file: string, flags: Flags): Promise<void> {
    const given = flags.for
    const item = given === undefined ? undefined : need(given === true ? undefined : given, "--for <item id>")
    const named = await this.edit(file, (plan) => {
      if (!item) return 0
      const id = CommentList.isCommentId(item) ? plan.comment(item) : plan.item(item).id
      const bare = plan.changes.filter((change) => !change.getAttribute("item"))
      for (const change of bare) Markup.set<"epic-change">(change, { item: id })
      if (bare.length)
        plan.log(`${bare.length} change mark${bare.length === 1 ? "" : "s"} named for ${id.toUpperCase()}`)
      return bare.length
    })
    if (named) this.print(`${named} named for ${item!.toUpperCase()}`)
    const plan = this.read(file)
    const rows = plan.changes.map((change) => ({
      change,
      facts: plan.describeItem(change.id)!,
      host: change.parentElement?.closest("[id]")?.id ?? ""
    }))
    rows.sort((a, b) => Number(a.facts.status !== "new") - Number(b.facts.status !== "new"))
    for (const { change, facts, host } of rows) {
      const item = (change.getAttribute("item") ?? "?").toUpperCase()
      this.print(`${facts.id.padEnd(5)} ${item.padEnd(4)} ${facts.status.padEnd(8)} ${facts.title}  in ${host}`)
    }
    const fresh = rows.filter((row) => row.facts.status === "new").length
    this.print(`${fresh} new (${rows.length} marked)`)
  }

  /**
   * `summarize <name> <id> --file <html>`:  condense one item after a lot of back and forth (Owen, epic `repo-split`
   * J141):  the file's HTML, Claude's condensed text, replaces what the item shows;  everything that was there (its
   * text, replies, More Details, unpicked Choices) moves into its Original Discussion, folded (`PlanDoc.condense()`).
   * - Owen's picks, the answer, status cards, commits and his marks stay
   * - refused while Owen called the request off on the page, as `details` is
   * - logged, saying how much moved
   */
  private async summarize(name: string, file: string, rest: string[], flags: Flags): Promise<void> {
    const id = need(rest[0], "an item id")
    const html = readFileSync(need(flags.file as string | undefined, "--file <html file>"), "utf8")
    refuseCanceled(name, file, id)
    const { title, moved } = await this.edit(file, (plan) => {
      const done = plan.condense(id, html)
      plan.log(
        `${id.toUpperCase()} condensed:  ${done.moved} block${done.moved === 1 ? "" : "s"} into its Original Discussion`
      )
      return done
    })
    this.print(
      `${id.toUpperCase()} condensed:  ${title} (${moved} block${moved === 1 ? "" : "s"} into its Original Discussion)`
    )
  }

  /**
   * `status <name> <id> underway "<reading>"` / `done ["<summary>"]` / `fixed ["<what changed>"]` / `noted "<what>"`:
   * Claude's status card on an item or an Overview sub-section (P13), and the page's spinner on it.
   * - `epic update <name>#<id> underway ...` runs it (Owen, epic `repo-split` J140:  `epic status` takes stock)
   * - `underway`:  a new blue card (`PlanDoc.addStatus()`), stamped now
   *   - the spinner on (`inbox working`), so one call does both
   * - `done`:  the item's WORK is finished (an issue fixed, a todo built;  epic `epic-engine` I148)
   *   - its latest underway card turns green, the summary under its reading when given
   *   - an open issue or todo closes in the same write, as `close` does (`PlanDoc.finishWork()`);
   *     a question, judgement call or test keeps its status
   *   - the spinner off
   *   - refused on an item with no underway card
   *   - an issue or judgement call Owen asked for with Do this is never closed by it:  `fixed`, below
   *   - on an issue Claude found, it means `fixed` (epic `epic-engine` T143)
   * - `fixed`:  an issue or judgement call fixed, for Owen to review (epic `epic-engine` I232):  ORANGE, still open
   *   - light orange from his own words (T143)
   *   - an issue Claude found that he hadn't got to:  closed, grey, `FIXED - `, nothing for him (T143;  `SelfFix`)
   *   - its latest underway card turns green, the summary under it;  with no underway card, a Done card of the summary
   *   - his Accept the fix closes it;  his Revisit with a note sends it back, red (`PlanDoc.fixedForReview()`)
   *   - the spinner off
   * - `noted`:  a STEP done that doesn't finish the item:  Claude RECORDED what Owen chose (Owen, 2026-10-10), or
   *   answered, added details, condensed it, called a request off
   *   - a calm Noted card, `what` saying what was recorded and what happens next
   *     (`PlanDoc.noteStatus()`:  an underway card turns noted, else one born noted)
   *   - the spinner off
   *   - `inbox apply` writes these itself for picks, todos and new items (Q19)
   *   - `done --filed "<what>"`, the older spelling, means `noted` too:  what was filed is a record
   *   - REFUSED when it says the work is finished (`Fixed in <sha>`, `Done`, `Built`, `Merged`;  epic `epic-engine`
   *     I452):  a Noted card turned the item red with its fix waiting, and nothing ever said `fixed`;
   *     `StaleUnderway.refuseFinishedNote()` says what to run instead
   * - reading, summary:  HTML, as `updated` takes (plain text works as it is), or `--file <html>` for a long one
   *   - in short paragraphs or bullets (`CardText`, I339):  a blank line starts a paragraph, `- ` lines are bullets;
   *     a paragraph or bullet over `CardText.MOST_WORDS` words is refused
   * - `promised`:  `/epic tidy`'s:  the item waits on finished work and the promised thing never came
   *   (`PlanDoc.promiseUnkept()`):  its card starts `Promised, not delivered:`, and it's back on Owen's list
   * - `--quiet`, on a noted card:  the item's change stamp left alone (`/epic tidy`'s doubtful items)
   * - NOT logged:  the mark it answers already is (`inbox apply`, `details`)
   */
  private async status(file: string, [id, state, given]: string[], flags: Flags): Promise<void> {
    const quiet = Boolean(flags.quiet)
    if (quiet && state !== "noted") throw new PlanDocError("--quiet goes with a noted card")
    need(id, "an item id")
    const filed = flags.filed
    if (filed === true) throw new PlanDocError(`--filed needs what was filed ("Chose B · Keep one file per template")`)
    // a long card from a file (I339);  either way, in short paragraphs or bullets (`CardText`)
    const fromFile = stringFlag(flags.file)
    if (fromFile !== undefined && given !== undefined) throw new PlanDocError("the card's text, or --file:  not both")
    const text = fromFile === undefined ? given : readFileSync(fromFile, "utf8")
    for (const words of [text, typeof filed === "string" ? filed : undefined])
      if (words !== undefined) CardText.check(CardText.structured(words))
    let title: string
    let said = state
    if (state === "underway")
      title = await this.edit(file, (plan) => plan.addStatus(id, need(text, "the reading (html)")))
    else if (state === "noted" || (state === "done" && filed !== undefined)) {
      const what = state === "noted" ? need(text, "what was recorded (html)") : String(filed)
      StaleUnderway.refuseFinishedNote(id, what)
      title = await this.edit(file, (plan) => plan.noteStatus(id, what, { quiet }))
      said = "noted"
    } else if (state === "done") {
      const done = await this.edit(file, (plan) => plan.finishWork(id, text))
      title = done.title
      if (done.closed) said = done.selfFixed ? SELF_FIXED_WORDS : "done, closed"
      if (done.fixed) said = FIXED_WORDS
    } else if (state === "fixed") {
      let selfFixed = false
      title = await this.edit(file, (plan) => {
        const fixedTitle = plan.fixedForReview(id, text)
        selfFixed = plan.item(id).hasAttribute("self-fixed")
        return fixedTitle
      })
      said = selfFixed ? SELF_FIXED_WORDS : FIXED_WORDS
    } else if (state === "promised") {
      title = await this.edit(file, (plan) =>
        plan.promiseUnkept(id, need(text, "what was promised and never came (html)"))
      )
      said = "promised, not delivered:  back on Owen's list"
    } else
      throw new PlanDocError(
        `epic update <name>#${id} underway | done | fixed | noted | promised, not '${state ?? ""}'  (${USAGE_HINT})`
      )
    // a status card says Claude has the item's mark:  the page shows it taken (I190)
    this.inbox.setWorking(file, id, state === "underway", { took: true })
    this.print(`${id.toUpperCase()} ${said}:  ${title}`)
  }

  /**
   * `close <name> <id>... [--why "<text>"]`, `close <name> --why-file <file>`:  each item done (epic `epic-engine` Q69).
   * - no reason:  as ever, whatever the item
   * - `--why`:  closed as OBSOLETE (`PlanDoc.closeObsolete()`):  the reason a Done card on it and in the log
   *   - plain TEXT, a tag in it shown as typed
   *   - each id on its own:  a refused one (`closeRefusal()`) is said on stderr, the others still close;  exit 1 if any was
   * - `--why-file`:  a JSON5 file of id => reason, a reason per item, in ONE write of the page
   */
  private async closeItems(file: string, ids: string[], flags: Flags): Promise<number | undefined> {
    const reasons = flags.whyFile === undefined ? undefined : PlanDocCommands.reasonsIn(flags.whyFile, ids, flags)
    if (!reasons) need(ids[0], "an item id")
    if (flags.why === undefined && !reasons) {
      await this.edit(file, (plan) => {
        for (const id of ids) plan.log(`${id.toUpperCase()} closed:  ${plan.setItem(id, "done")}`)
      })
      return undefined
    }
    const why = stringFlag(flags.why)?.trim()
    if (!reasons && !why) throw new PlanDocError('--why needs the reason:  --why "P9 removed it (abc123)"')
    const closing = reasons ?? new Map(ids.map((id) => [id, why!]))
    const marked = PlanDocCommands.pendingMarks(file)
    const said = await this.edit(file, (plan) =>
      Array.from(closing, ([id, reason]) => {
        const refused = plan.closeRefusal(id, { marked })
        return refused ? { id, refused } : { id, title: plan.closeObsolete(id, reason, { marked }) }
      })
    )
    for (const line of said)
      if (line.refused) this.warn(`${line.id.toUpperCase()} not closed:  ${line.refused}`)
      else this.print(`${line.id.toUpperCase()} closed:  ${line.title}`)
    return said.some((line) => line.refused) ? 1 : undefined
  }

  /**
   * `--why-file`'s JSON5:  id (`J3`, `seo#J3`, any case) => reason, in file order.
   * - throws for ids given as well, `--why` as well, a file that won't read, or a reason that isn't text
   */
  private static reasonsIn(path: unknown, ids: string[], flags: Flags): Map<string, string> {
    const file = need(stringFlag(path as Flags[string]), "--why-file <json5 of id => reason>")
    if (ids.length || flags.why !== undefined)
      throw new PlanDocError("--why-file names its own ids and reasons:  no ids, no --why beside it")
    const read = DataFile.read<Record<string, unknown>>(file)
    if (!read || typeof read !== "object") throw new PlanDocError(`--why-file:  can't read ${file}`)
    return new Map(
      Object.entries(read).map(([id, reason]) => {
        if (typeof reason !== "string" || !reason.trim())
          throw new PlanDocError(`--why-file:  ${id} needs its reason, as text`)
        return [id.replace(/^.*#/, "").toLowerCase(), reason.trim()]
      })
    )
  }

  /** The item ids (lower case) holding a mark of Owen's nobody has taken yet, or taken and in hand. */
  private static pendingMarks(file: string): Set<string> {
    const inbox = ReviewInbox.read(ReviewInbox.pathFor(file))
    return new Set([...Object.keys(inbox.marks), ...Object.keys(inbox.taken)].map((id) => id.toLowerCase()))
  }

  /**
   * `stale <name> [--json]`:  the facts for judging which open items have gone stale (`StaleFacts`), decided by
   * nobody here;  in the epic's own worktree, when it has one, else the main checkout.
   * - SIDE EFFECT:  a tidy asked for from the page's gear has started (`ReviewInbox.tidyStarted()`, epic `epic-engine`
   *   T168):  this is `/epic tidy`'s first step
   */
  private printStale(name: string, file: string, json: boolean): void {
    const inboxFile = ReviewInbox.pathFor(file)
    if (ReviewInbox.read(inboxFile).tidyAsked) ReviewInbox.update(inboxFile, (inbox) => inbox.tidyStarted())
    const report = new StaleFacts(this.staleOptions(name, this.read(file), file)).report()
    this.print(json ? JSON.stringify(report, null, 2) : StaleFacts.lines(report).join("\n"))
  }

  /** What `StaleFacts` reads of epic `name`'s page `file`, read as `plan`:  its checkout, `main`, the inbox. */
  staleOptions(name: string, plan: PlanDoc, file: string): StaleFactsOptions {
    const main = this.files.mainRoot()
    const where = this.files.epicCheckout(name, main)
    return {
      plan,
      epic: name,
      checkout: where === PlanDocFiles.MAIN_CHECKOUT ? main : resolve(main, where),
      marked: PlanDocCommands.pendingMarks(file),
      main,
      file,
      epics: new Set(this.files.epicNames())
    }
  }

  /**
   * `stale <name> --underway [--apply] [--hours <n>] [--json]`:  the open items whose Underway card went stale, and
   * whether their work is on `main` (`StaleUnderway`, epic `epic-engine` T78).
   * - no `--apply`:  the report only
   * - `--apply`:  on `main` => fixed for review (an issue or call;  another kind a Noted card), else a Stale card,
   *   once;  one write of the page;  NEVER closes anything
   * - the end of every turn runs it with `--apply --quiet` (`TurnEnd`)
   */
  private async staleUnderway(name: string, file: string, flags: Flags): Promise<void> {
    const main = this.files.mainRoot()
    const hours = flags.hours === undefined ? undefined : Number(flags.hours)
    if (hours !== undefined && !(hours >= 0)) throw new PlanDocError(`--hours takes a number, not '${flags.hours}'`)
    const working = ReviewInbox.read(ReviewInbox.pathFor(file)).working
    const base = EpicConfig.of(main).baseBranch
    const tidy = (plan: PlanDoc) => new StaleUnderway({ plan, epic: name, main, base, working, hours })
    if (!flags.apply) {
      const items = tidy(this.read(file)).report()
      return this.print(flags.json ? JSON.stringify(items, null, 2) : StaleUnderway.lines(name, items).join("\n"))
    }
    const lines = await this.edit(file, (plan) => tidy(plan).apply())
    if (lines.length || !flags.quiet) this.print(lines.length ? lines.join("\n") : `${name}:  nothing stale`)
  }

  /**
   * `hush [<epic> | all] [--dryrun] [--json] [--model sonnet]` (`Hush`, epic `epic-engine` T122):  each epic's green,
   * yellow and orange items settled 3 days ago or more, judged one by one, and those Owen almost certainly doesn't
   * care about greyed, as his ✓ would.
   * - no epic:  the epic of this checkout's worktree;  `all`:  every epic in progress
   * - `--dryrun`:  the table only (id, colour, age, hush or keep, why);  nothing written
   * - else ONE write of each page with something to grey, its log saying each and `Hush:  N greyed, M kept`
   * - prints, per epic, the counts, then the table (`--dryrun`) or the kept ones with their why
   */
  private async hush(name: string | undefined, flags: Flags): Promise<void> {
    const dry = Boolean(flags.dryrun ?? flags.dryRun)
    const names = name === "all" ? this.openEpics() : [name ?? this.checkoutEpic()]
    const hush = new Hush({ judge: this.hushJudge, model: stringFlag(flags.model) })
    const report: { epic: string; calls: HushCall[]; greyed: number }[] = []
    for (const epic of names) {
      const file = this.files.findDoc(epic)
      const skip = Hush.skipsOf(file)
      const candidates = Hush.candidates(this.read(file), skip)
      const calls = candidates.length ? hush.decide(epic, candidates) : []
      const hushed = calls.filter((call) => call.hush)
      const greyed = dry || !hushed.length ? 0 : (await this.edit(file, (plan) => Hush.apply(plan, calls, skip))).greyed
      report.push({ epic, calls, greyed })
      if (flags.json) continue
      const kept = calls.filter((call) => !call.hush)
      const counts = dry
        ? `${calls.length} settled 3+ days:  ${hushed.length} to hush, ${kept.length} to keep (dry run:  nothing changed)`
        : `Hush:  ${greyed} greyed, ${calls.length - greyed} kept`
      const rows = dry ? Hush.table(calls) : Hush.table(kept)
      this.print([`${epic}:  ${counts}`, ...rows].join("\n"))
    }
    if (flags.json) this.print(JSON.stringify(dry ? report.map(({ greyed: _, ...rest }) => rest) : report, null, 2))
  }

  /**
   * `close-all <epic> <judgements | issues | todos> [--dryrun]` (`CloseAll`, epic `epic-engine` T158):  a section's Close
   * all from the command line:  every DECIDED call, FIXED issue or DONE todo still waiting for his tick, closed as his
   * ✓ would, in one write, kept for the page's Undo;  `--dryrun`:  the ids only
   */
  private async closeAll(file: string, section: string | undefined, flags: Flags): Promise<void> {
    const kind = CloseAllRule.kindOf(section)
    if (!kind) throw new PlanDocError("close-all:  which section?  judgements, issues or todos")
    const ids = CloseAll.candidates(this.read(file), kind, Hush.skipsOf(file))
    const listed = ids.map((id) => id.toUpperCase()).join(" ")
    if (flags.dryrun ?? flags.dryRun) return this.print(`${ids.length} to close${ids.length ? `:  ${listed}` : ""}`)
    const { closed, left } = ids.length
      ? await CloseAll.run(file, this.files.root, kind, ids)
      : { closed: [], left: [] }
    this.print(`Close all:  ${closed.length} closed${left.length ? `, ${left.length} left` : ""}`)
  }

  /** The epics `hush all` goes through:  every one in progress. */
  private openEpics(): string[] {
    return this.files
      .listEpics()
      .filter((epic) => epic.status === "in progress")
      .map((epic) => epic.name)
  }

  /** The epic of this checkout's worktree;  throws a `PlanDocError` when it's no epic's. */
  private checkoutEpic(): string {
    const name = EpicConfig.of(this.files.root).worktreeNameOf(this.files.root)
    if (name && this.files.epicNames().includes(name)) return name
    throw new PlanDocError("hush:  which epic?  this checkout is no epic's worktree:  epic hush <epic>, or all")
  }

  /**
   * `original <name> <id> --file <html> [--as-of "YYYY-MM-DD HH:MM"]`:
   * earlier text into an item's Original Discussion.
   */
  private async original(file: string, rest: string[], flags: Flags): Promise<void> {
    const id = need(rest[0], "an item id")
    const html = readFileSync(need(flags.file as string | undefined, "--file <html file>"), "utf8")
    const asOf = flags.asOf
    if (asOf !== undefined && !/^\d{4}-\d\d-\d\d(?: \d\d:\d\d)?$/.test(String(asOf)))
      throw new PlanDocError(`--as-of must be "YYYY-MM-DD HH:MM" (or "YYYY-MM-DD"), not "${asOf}"`)
    const result = await this.edit(file, (plan) => {
      const done = plan.restoreOriginal(id, html, { asOf: asOf as string | undefined })
      if (done === "added")
        plan.log(`${id.toUpperCase()} original discussion restored${asOf ? ` (as of ${asOf})` : ""}`)
      return done
    })
    this.print(`${id.toUpperCase()}:  ${result}`)
  }

  /**
   * `backfill`:  for epic `name` (or every epic, `--all`),
   * the items not reviewed that Owen named in a past session of it (`ReviewBackfill`).
   * - prints each with its first evidence
   * - `--apply`:  marks them reviewed, dated that day, logging the evidence
   */
  private async backfill(name: string | undefined, { all, apply }: Flags): Promise<void> {
    if (!name && !all) throw new PlanDocError(`backfill needs a name, or --all  (${USAGE_HINT})`)
    const { files } = this
    const epics = all ? files.listEpics() : [{ name: name!, file: files.findDoc(name!) }]
    const main = files.mainRoot()
    const sessionFinder = new ReviewBackfill()
    let total = 0
    for (const epic of epics) {
      const plan = this.read(epic.file)
      const ids = plan.reviewSections().flatMap((section) => section.items.map((item) => item.id))
      if (!ids.length) continue
      const sessions = sessionFinder.sessionsOf(epic.name, main)
      const evidence = ReviewBackfill.findEvidence(sessions, ids)
      const found = ids.filter((id) => evidence[id])
      this.print(
        `${epic.name}:  ${found.length} of ${ids.length} not reviewed have evidence  (${sessions.length} sessions)`
      )
      for (const id of found) {
        const [first] = evidence[id]
        const more = evidence[id].length > 1 ? `  (+${evidence[id].length - 1} more)` : ""
        this.print(`  ${id.padEnd(4)} ${first.date} ${first.kind.padEnd(7)} ${first.quote}${more}`)
      }
      total += found.length
      if (!apply || !found.length) continue
      await this.edit(epic.file, (doc) => {
        for (const id of found) {
          const [first] = evidence[id]
          doc.review(id, { date: first.date ?? doc.today })
          doc.log(
            `${id} reviewed:  backfill, ${first.kind} ${first.date} (session ${first.session.slice(0, 8)}):  ${first.quote}`
          )
        }
      })
    }
    this.print(apply ? `marked ${total} reviewed` : `dry run:  ${total} to mark;  --apply marks them`)
  }

  /**
   * `split <name> [--dry-run]`:  store the doc at `file` as a skeleton plus part files (`EpicParts`), logged.
   * - prints how many parts
   * - already split:  says so, writes nothing
   * - `dryRun`:  what it would make, nothing written
   */
  private async splitDoc(file: string, { dryRun }: Flags = {}): Promise<void> {
    const { files } = this
    const name = relative(files.content, file)
    const plan = this.read(file)
    if (plan.parts!.split) return this.print(`${name}:  already split (${plan.parts!.hosts.length} parts)`)
    const count = new EpicParts(plan.document).hosts.length
    if (dryRun) return this.print(`${name}:  would split into a skeleton and up to ${count} parts`)
    await this.edit(
      file,
      (doc) => doc.log(`split into a skeleton and parts (${PARTS_DIR}/):  bodies load when opened`),
      { split: true }
    )
    this.print(
      `${name}:  split, ${this.read(file).parts!.hosts.length} parts in ${relative(files.content, join(dirname(file), PARTS_DIR))}/`
    )
  }

  /** `join <name>`:  a split doc back into ONE file (its parts folder removed), logged:  the way back from `split`. */
  private async joinDoc(file: string): Promise<void> {
    const name = relative(this.files.content, file)
    if (!this.read(file).parts!.split) return this.print(`${name}:  one file already`)
    await this.edit(file, (doc) => doc.log("joined into one file:  every body back in the page"), { split: false })
    this.print(`${name}:  one file`)
  }

  /**
   * `split --done [--dry-run]`:  split every FINISHED epic's doc (Q12 of `claude-design`).
   * - finished:  every phase done, and no worktree of its own
   *   (`list`'s `checkout` is `main`:  a worktree may still edit it with older code)
   * - prints what it split and what it skipped, and why
   */
  private async splitDone({ dryRun }: Flags): Promise<void> {
    for (const epic of this.files.listEpics()) {
      if (epic.status !== "done") continue
      if (epic.checkout !== PlanDocFiles.MAIN_CHECKOUT) {
        this.print(`${epic.name}:  skipped, still has a worktree (${epic.checkout})`)
        continue
      }
      try {
        await this.splitDoc(epic.file, { dryRun })
      } catch (error) {
        if (!(error instanceof PlanDocError)) throw error
        this.print(`${epic.name}:  skipped, ${error.message}`)
      }
    }
  }

  /**
   * `lint`:  structural problems, then the browser check;  exit code 1 on any.
   * - a split doc is checked WHOLE (`read()` assembles it):  ids and `#id` links across skeleton and parts
   * - links:  `SRV.Linker.check()` on the whole doc, at the page's folder, so the parts' links are checked too
   *   (a part's links are root paths since epic `epic-engine` P46;  an older part's, relative to `parts/`, are rebased
   *   when assembled);  a relative one is refused (`relative:  ../x -- write /x`)
   *   - printed (`LINK:`), failing only with `--links`
   *   - and its short addresses and `<epic-link>`s:
   *     a saga, page or id that isn't there, an epic under a saga it doesn't name (`EpicTargets.problemsIn()`)
   * - a split doc's parts:
   *   - a missing one is a problem
   *   - a note:  a host with content of its own besides its part (moved into the part on the next edit),
   *     or a part file nothing loads
   * - an item finished with a status card still underway (`PlanDoc.staleUnderway()`, epic `epic-engine` I355);
   *   `--fix` finishes those first (`finishStaleUnderway()`), saved, then checks
   * - the browser check:  `src/tools/check-spell.js`, a child `node` (its stderr passed on);
   *   skipped, saying so, where Playwright isn't installed (`hasPlaywright()`)
   */
  private lint(file: string, { noBrowser, links: strictLinks }: Flags): number | void {
    const { files } = this
    const plan = this.read(file)
    const parts = plan.parts!
    const problems = plan.check()
    const html = plan.toString()
    // short addresses and `<epic-link>`s (epic `epic-workflow` P15):
    // the sagas, pages and ids they point at
    const linkProblems = [
      // routes and a test's action links are served, not files:  `problemsIn()` checks the show route's pages
      ...files.linker.check(EpicTargets.withoutServedLinks(html), dirname(file)).problems,
      ...new EpicTargets(files.root).problemsIn(html, relative(files.content, file))
    ]
    const links = linkProblems.map((problem) => `link:  ${problem}`)
    // printed, but failing only with `--links`:
    // older docs hold broken links from the docs' moves (I... of `claude-design`), which `check` never looked at before
    if (strictLinks) problems.push(...links)
    else for (const link of links) this.print(`LINK:  ${link}`)
    problems.push(...parts.missing.map((id) => `part ${PARTS_DIR}/${id}${PART_EXT} is missing`))
    for (const id of parts.inline)
      this.print(`NOTE:  #${id} has content beside its part:  the next edit moves it into the part`)
    const dir = join(dirname(file), PARTS_DIR)
    const orphans = existsSync(dir)
      ? readdirSync(dir).filter((each) => {
          const id = PART_FILE.exec(each)?.[1]
          return id !== undefined && !parts.hosts.includes(id)
        })
      : []
    for (const orphan of orphans) this.print(`NOTE:  ${PARTS_DIR}/${orphan}:  nothing loads it`)
    // one question, one choice set (I88, epic `epic-engine` P33):  said, failing nothing
    for (const asks of plan.choiceSetProblems()) this.print(`ASKS:  ${asks}`)
    // finished, yet a card still underway draws it blue (I355):  `--fix` finishes it
    const name = basename(file).replace(/\.plan\.html$/, "")
    for (const item of plan.staleUnderway())
      problems.push(
        `${item.id.toUpperCase()}:  its work is finished, but an earlier status card is still underway, so it shows blue:  ` +
          `epic lint ${name} --fix`
      )
    // run-together details (T74):  said, failing nothing
    for (const dense of plan.denseParagraphs()) this.print(`DENSE:  ${dense}`)
    for (const problem of problems) this.warn(`PROBLEM:  ${problem}`)
    if (!problems.length)
      this.print(
        `${relative(files.content, file)}:  structure ok${parts.split ? ` (${parts.hosts.length} parts)` : ""}`
      )
    let browserOk = true
    if (!noBrowser && !PlanDocCommands.hasPlaywright())
      this.print(
        "check-spell:  skipped -- the browser check needs Playwright, which the basic install leaves out " +
          "(npm install playwright, then npx playwright install chromium)"
      )
    else if (!noBrowser) {
      const run = spawnSync("node", [join(files.docsTools, "check-spell.js"), relative(files.docsPackage, file)], {
        cwd: files.docsPackage,
        encoding: "utf8",
        env: files.toolEnv
      })
      browserOk = run.status === 0
      process.stderr.write(run.stderr ?? "")
      this.print(browserOk ? "check-spell:  ok" : "check-spell:  FAILED (problems above)")
    }
    if (problems.length || !browserOk) return 1
  }

  /**
   * Can the browser check load Playwright?  An npm install of `spell` leaves it out (an optional peer):
   * `epic lint` crashed there on its first browser check (epic `epic-engine` I342).
   * - NEVER throws
   */
  static hasPlaywright(): boolean {
    try {
      createRequire(import.meta.url).resolve("playwright")
      return true
    } catch {
      return false
    }
  }

  /**
   * `open <name>`:  show the doc in VS Code's side bar's Review tab, reusing it (`openInVSCode()`)
   * - an epic page always goes there, by its kind (epic `epic-engine` P59), whatever was asked;
   *   `--docs`, Owen's 2026-10-12 rule for a third tab (gone since epic `epic-engine` Q73), is accepted and does nothing
   */
  private open(file: string): void {
    this.read(file)
    this.openInVSCode(file)
  }

  /**
   * Show `file` (an epic page) in VS Code's right side bar, in its Review tab, or Chrome when not run from VS Code.
   * - the tab:  the page's kind says (the extension's `docViewFor()`, epic `epic-engine` P59);  `--review` asks too
   * - It runs `src/tools/open.js --review <file>`,
   *   which starts the page server and asks the session's window (`pages.js` `openInVSCode()`).
   * - `hash`:  an id to land on;  `query`:  the page's query, `test=1` (a test run:  `epic test`)
   * - a child `node`, not an import:  `open.js` with this terminal attached, as its command line runs it
   * - NEVER throws, nor fails the command:  as before, a doc not shown is no error
   */
  openInVSCode(file: string, { hash, query }: OpenOptions = {}): void {
    const { files } = this
    const flag = "--review"
    const extra = [...(hash ? [`--hash=${hash}`] : []), ...(query ? [`--query=${query}`] : [])]
    spawnSync(process.execPath, [join(files.docsTools, "open.js"), flag, resolve(file), ...extra], {
      cwd: files.docsPackage,
      stdio: "inherit",
      env: files.toolEnv
    })
  }

  ////////////////
  // ## Listing
  ////////////////

  /** `list`:  every epic, grouped in progress / future / done, its worktree when it has one (or JSON). */
  /**
   * `bedtime all plan | questions <epic> --file <f> | spec [--wait <d>] [--out <f>]` and `bedtime status`:  a
   * `/bedtime all` night's steps (`BedtimeAll`;  bedtime's SKILL.md, "All epics").
   * - `plan`:  tonight's epics (the running ones, and `--include`'s), kept in tonight's folder;  `--json` as JSON
   * - `questions`:  an epic's session's up-front questions, kept beside the plan
   * - `spec`:  the one details page's spec, after waiting (`--wait`, default none) for the sessions still to send theirs;
   *   prints its path
   * - `status`:  every epic in bedtime mode and how far it is
   * - throws a `PlanDocError` for a missing argument, a bad file, or no plan yet
   */
  private async bedtimeAll([verb, ...args]: string[], flags: Flags): Promise<number | void> {
    const listings = this.files.listEpics()
    const summaryOf = (file: string) => this.read(file).summary()
    const folder = BedtimeAll.folderFor()
    const json = Boolean(flags.json)
    try {
      switch (verb) {
        case "plan": {
          const include = (stringFlag(flags.include) ?? "")
            .split(",")
            .map((one) => one.trim())
            .filter(Boolean)
          const plan = BedtimeAll.candidates({ listings, summaryOf, include })
          const file = BedtimeAll.writePlan(plan, folder)
          if (json) return this.print(JSON.stringify(plan, null, 2))
          const lines = plan.epics.map((epic) => BedtimeAll.planLine(epic))
          if (!lines.length) lines.push("no epic has a phase to do tonight")
          if (plan.idle.length) lines.push(`not running, left out (--include takes one):  ${plan.idle.join(", ")}`)
          if (plan.skipped.length) lines.push(`left out (pages that won't read):  ${plan.skipped.join(", ")}`)
          return this.print([...lines, `kept in ${file}`].join("\n"))
        }
        case "questions": {
          const epic = need(args[0], "the epic whose questions these are")
          const file = need(stringFlag(flags.file), "--file <questions.json>")
          const count = BedtimeAll.keepQuestions(folder, epic, readFileSync(resolve(file), "utf8"))
          return this.print(`bedtime all:  ${epic}'s ${count} question(s) kept for tonight's page`)
        }
        case "spec": {
          const plan = BedtimeAll.readPlan(folder)
          const wait = stringFlag(flags.wait)
          const until = Date.now() + (wait ? duration(wait) : 0)
          while (BedtimeAll.waitingFor(folder, plan).length && Date.now() < until)
            await new Promise((done) => setTimeout(done, SPEC_POLL_MS))
          const late = BedtimeAll.waitingFor(folder, plan)
          const out = resolve(stringFlag(flags.out) ?? join(folder, "spec.json"))
          writeFileSync(out, JSON.stringify(BedtimeAll.spec(folder, plan), null, 2) + "\n")
          if (late.length) this.warn(`bedtime all:  no questions from ${late.join(", ")}:  their open Q items stand in`)
          return this.print(out)
        }
        case "status": {
          const running = BedtimeAll.status({ listings, summaryOf })
          if (json) return this.print(JSON.stringify(running, null, 2))
          return this.print(
            running.length ? running.map((epic) => BedtimeAll.statusLine(epic)).join("\n") : "no epic in bedtime mode"
          )
        }
        default:
          throw new PlanDocError(`bedtime all what?  plan | questions <epic> --file <f> | spec (not '${verb ?? ""}')`)
      }
    } catch (error) {
      if (error instanceof PlanDocError) throw error
      throw new PlanDocError((error as Error).message)
    }
  }

  private printEpics(epics: EpicListing[], json: boolean): void {
    if (json) return this.print(JSON.stringify(epics, null, 2))
    const lines: string[] = []
    for (const status of EPIC_STATUSES) {
      const group = epics.filter((epic) => epic.status === status)
      if (!group.length) continue
      lines.push(`${status}:  (not reviewed / items)`)
      for (const epic of group) {
        const where = epic.checkout === PlanDocFiles.MAIN_CHECKOUT ? "" : `  (${epic.checkout})`
        lines.push(`  ${epic.name.padEnd(24)} ${String(epic.notReviewed).padStart(3)} / ${epic.total}${where}`)
      }
    }
    this.print(lines.join("\n"))
  }

  /**
   * `log <name> [--last <n>]`:  the newest `n` review lines of the log (default `LOG_LAST`), newest last,
   * `2026-10-29 08:59  Q56 answered:  ...`.
   * - the page draws only the Log's commits (epic `epic-engine` P52, Q56 C):  this is where to read when something was
   *   answered, reviewed or set active
   */
  private printLog(file: string, { last }: Flags): void {
    const count = last === undefined ? LOG_LAST : Number(stringFlag(last))
    if (!Number.isInteger(count) || count < 1) throw new PlanDocError(`log:  --last takes a count, e.g. --last 20`)
    for (const { at, text } of this.read(file).reviewLines().slice(-count)) this.print(`${at}  ${text}`)
  }

  /**
   * `summary`:  bullets for a reply (or JSON for a script).
   * - scope `open` (the default;  `--all` for `all`):  finished phases and grey items are a count line each,
   *   `84 phases done`, `27 grey items left out` (epic `epic-engine` T111)
   */
  private printSummary(file: string, scope: SummaryScope, json: boolean): void {
    const summary = this.read(file).summary(scope)
    if (json) return this.print(JSON.stringify(summary, null, 2))
    const lines = [`${summary.title}`]
    const isOpenOnly = scope === "open"
    if (isOpenOnly && summary.done)
      lines.push(`  ${summary.done} phase${summary.done === 1 ? "" : "s"} done  (--all lists them)`)
    for (const phase of summary.phases) {
      const mark = PHASE_MARKS[phase.status as keyof typeof PHASE_MARKS] ?? "[?]"
      // done and timed:  what it took, over how long by the clock, against its estimate (epic `epic-engine` P41, I127)
      const took = phase.span ? `${phase.took} / ${phase.span}` : phase.took
      const time = phase.took ? `took ${took}${phase.estimate ? `, ~${phase.estimate}` : ""}` : phase.estimate
      lines.push(`  ${mark} P${phase.number} · ${phase.name}${time ? `  (${time})` : ""}`)
    }
    if (summary.estimate) lines.push(`estimate:  ${summary.estimate}`)
    if (summary.next) lines.push(`next:  P${summary.next.number} · ${summary.next.name}`)
    // the option sets (epic `epic-engine` P50):  "choices:  2 sets open, 5 options;  P50 1 open"
    const { choices } = summary
    const standing = choices.sets
      ? `${choices.open} set${choices.open === 1 ? "" : "s"} open, ${choices.options} option${choices.options === 1 ? "" : "s"}`
      : ""
    const phases = choices.phases.map(({ phase, open }) => `${phase} ${open} open`)
    if (standing || phases.length) lines.push(`choices:  ${[standing, ...phases].filter(Boolean).join(";  ")}`)
    for (const kind of OPEN_KINDS) {
      const open = summary.open[kind]
      if (!open.length) continue
      lines.push(`open ${kind}s:`)
      for (const item of open) lines.push(`  - ${item.id.toUpperCase()}  ${item.title}`)
    }
    if (isOpenOnly && summary.quiet)
      lines.push(`${summary.quiet} grey item${summary.quiet === 1 ? "" : "s"} left out:  limits, handled  (--all)`)
    this.print(lines.join("\n"))
  }

  /**
   * `docs`:  the docs an epic wrote besides its epic page, by group, each with why it's listed;
   * its changelog entry last (or JSON for `/docs-check`).
   * - `swept` pages (`EpicDocs.groupOf()`):  counted, listed only by `--json`
   */
  private printDocs(list: EpicDocList, json: boolean): void {
    if (json) return this.print(JSON.stringify(list, null, 2))
    const { counts } = list
    const lines = [
      `${list.epic}:  ${list.docs.length - counts.swept} docs  ` +
        `(${counts.wrote} wrote, ${counts.related} related, ${counts.linked} linked;  ${counts.swept} swept:  --json)`
    ]
    for (const group of GROUPS) {
      const docs = list.docs.filter((doc) => doc.group === group)
      if (!docs.length || group === "swept") continue
      lines.push(`${group}:`)
      const width = Math.max(...docs.map((doc) => doc.path.length))
      for (const doc of docs) {
        const commits = doc.commits.length
          ? ` ${doc.commits.slice(0, 3).join(" ")}${doc.commits.length > 3 ? " ..." : ""}`
          : ""
        lines.push(`  ${doc.path.padEnd(width)}  ${doc.reasons.join(", ")}${commits}`)
      }
    }
    const { changelog } = list
    lines.push(`changelog:  ${changelog.path}#${changelog.anchor}${changelog.found ? "" : "  (no entry yet)"}`)
    this.print(lines.join("\n"))
  }

  /**
   * `decisions`:  what an epic's page settled, for checking its docs against.
   * - each phase and its Done list, then the items, their status, chosen option and answer
   * - or JSON, with every item's text, for `/docs-check`
   */
  private printDecisions(decisions: EpicDecisions, json: boolean): void {
    if (json) return this.print(JSON.stringify(decisions, null, 2))
    const lines = [`${decisions.epic}:  ${decisions.planDoc}`]
    for (const phase of decisions.phases) {
      lines.push(`P${phase.number} · ${phase.name}  [${phase.status}]`)
      if (phase.done) lines.push(`    done:  ${phase.done}`)
      for (const update of phase.updates) lines.push(`    updated ${update.at}:  ${update.text}`)
    }
    for (const item of decisions.items) {
      lines.push(`${item.id.padEnd(4)} [${item.status}]  ${item.title}`)
      if (item.chosen) lines.push(`    chose:  ${item.chosen}`)
      if (item.answer) lines.push(`    answer:  ${item.answer}`)
    }
    this.print(lines.join("\n"))
  }

  /**
   * `owns`:  a line per path and owner, `src/a.ts  epic-engine  building  branch, plan`;  `src/b.ts  --` for a path
   * no open epic owns (or JSON, for `/coherence`).
   */
  private printOwners(owned: PathOwners[], json: boolean): void {
    if (json) return this.print(JSON.stringify(owned, null, 2))
    const pathWidth = Math.max(...owned.map(({ path }) => path.length))
    const epicWidth = Math.max(0, ...owned.flatMap(({ owners }) => owners.map(({ epic }) => epic.length)))
    const lines = owned.flatMap(({ path, owners }) =>
      owners.length
        ? owners.map(
            ({ epic, stage, how }) =>
              `${path.padEnd(pathWidth)}  ${epic.padEnd(epicWidth)}  ${stage.padEnd(8)}  ${how.join(", ")}`
          )
        : [`${path.padEnd(pathWidth)}  --`]
    )
    this.print(lines.join("\n"))
  }

  /**
   * `items`:  where reviews stand, then each section with items, its counts and the items `--filter` picks.
   * - `--section <kind or label>`:  that section only
   * - `--json`:  `{ file, status, sections }`
   * - `--spec <file>`:  the review's item picker instead (`ItemPicker.spec()`), written to that file
   * - grey items (`QUIET_STATES`:  limits, handled, canceled) left out, counted in each section's `quiet`,
   *   unless `--all` (epic `epic-engine` T111);  never from the picker
   */
  private printItems(plan: PlanReader, file: string, flags: Flags): void {
    const { section, filter = "unreviewed", json, spec } = flags
    let sections = plan.reviewSections({ filter: spec ? "open" : (filter as string) })
    if (!spec && summaryScope(flags) === "open") sections = sections.map(withoutQuiet)
    if (section) {
      const wanted = String(section).toLowerCase().replace(/s$/, "")
      sections = sections.filter((s) => s.kind === wanted || s.label.toLowerCase().replace(/s$/, "") === wanted)
      if (!sections.length) {
        throw new PlanDocError(`no section "${section}":  ${REVIEW_SECTIONS.map((s) => s.label).join(", ")}`)
      }
    }
    const status = plan.reviewStatus()
    if (spec) {
      if (sections.length !== 1) throw new PlanDocError("--spec needs one --section")
      const picker = ItemPicker.spec(plan, file, sections[0], status, this.files.details)
      writeFileSync(spec as string, JSON.stringify(picker, null, 2))
      return this.print(spec as string)
    }
    if (json) return this.print(JSON.stringify({ file, status, sections }, null, 2))
    const lines = [
      status.last
        ? `last reviewed ${status.last}:  ${status.reviewedThen} item${status.reviewedThen === 1 ? "" : "s"};  ${status.deferred} deferred`
        : "never reviewed"
    ]
    if (status.queued.length) {
      lines.push("to do:")
      for (const item of status.queued) lines.push(`  - ${item.id}  ${item.work}  (${item.title})`)
    }
    for (const s of sections) {
      if (!s.total) continue
      const quiet = s.quiet ? `;  ${s.quiet} grey left out, --all` : ""
      lines.push(`${s.label} · ${s.notReviewed}/${s.total} not reviewed  (showing:  ${filter}${quiet})`)
      for (const item of s.items) {
        const mark =
          item.state === "deferred" ? `  (deferred ${item.deferred})` : item.state === "queued" ? "  (to do)" : ""
        lines.push(`  - ${item.id}  ${item.title}${mark}`)
      }
    }
    this.print(lines.join("\n"))
  }

  /**
   * `summaries`:  `summary` of each doc at `files`, as one JSON object keyed by file.
   * - by PATH, so it reads a worktree's copy too, with no `node_modules/` there
   * - one run for every epic
   * - a doc that won't read gets `{ error }`, and the rest still print
   */
  private printSummaries(files: string[], scope: SummaryScope): void {
    const found: Record<string, PlanSummary | { error: string }> = {}
    for (const file of files) {
      try {
        found[file] = this.read(resolve(file)).summary(scope)
      } catch (error) {
        if (!(error instanceof PlanDocError)) throw error
        found[file] = { error: error.message }
      }
    }
    this.print(JSON.stringify(found, null, 2))
  }
}

/** Command-line flags (`parseVerbArgs()`):  `--key value` is the value, a bare `--key` is `true`;  keys camel-cased. */
export type Flags = Record<string, string | true>

/** `openInVSCode()`'s options:  an id to land on, and the page's query (`test=1`). */
export type OpenOptions = { hash?: string; query?: string }

/** `create`'s flags. */
type CreateFlags = {
  title?: string
  prompt?: string
  promptFile?: string
  future?: boolean
  saga?: string | true
  /** the page's stage from the start;  none:  `overview` (epic `epic-engine` P33) */
  stage?: string
}

/** Usage, printed with no command or a bad one. */
export const USAGE = `usage:  yarn plan-doc <command> <name> ...    (doc:  epics/<name>/<name>.plan.html)
  The epic tool in its own order, the epic's name first:  \`epic --help\` lists the verbs (\`epic close seo#J3\` ...).
  A phase <N> is its number (3, P3) or its name ("Epic Migrate", epic-migrate, p-epic-migrate:  its stable id).
  create <name> [--title "Title"] [--prompt "text" | --prompt-file path] [--future] [--saga <id>] [--stage <stage>]
                                                   copy the template, fill it in, update the home page;
                                                   --future:  an epic not planned yet (/epic future);  create on
                                                   a future epic's doc plans it:  promoted where it is;
                                                   --saga:  the saga it serves (epic saga list);
                                                   it starts in the Overview stage (--stage:  another)
  add-phase <name> "Short Name" --symptom html --changes html [--goal html] [--files html] [--verify html]
            [--estimate 2h] [--after N | --before N]
                                                   a phase:  Symptom (one line), Changes (two or three), then
                                                   the details (goal, files, verify);  phase numbers are whole:
                                                   --after 11:  the new P12, right after P11;  --before N:  the
                                                   new PN;  either way the to-do phases after it move down a
                                                   number (their ids stay:  links and comments stay on them),
                                                   items, links and "P5 · Name" text following, then
                                                   links-agree (stderr says);  neither, with a Doc Review last:
                                                   before it, the Doc Review moving down one, back to do
  phase-body <name> <N> [--symptom html] [--changes html] [--goal html] [--plan html [--accepted]]
            [--files html] [--verify html]
                                                   set (or "" removes) a phase's body fields;  --plan waits
                                                   for Owen's Accept, unless --accepted:  he accepted it with
                                                   comments, folded in now
  updated <name> <N> "html" | --file path [--summary "..."] [--for <item ids>]
                                                   a change to phase N's plan:  an <epic-update> block at the
                                                   end of its description, "Update: <summary>" and the date
                                                   (summary:  the html's first sentence unless given);  kept;
                                                   while N isn't done, its folded title says it changed;
                                                   NOT for an answer's change:  --for q53 (or the ids the html
                                                   names, marked this pass) with change marks in the phase
                                                   writes nothing, "the change marks say it"
  rename <name> <P6 | id> "New title" [--html] [--title-ok]
                                                   retitle a phase or an item (a phase keeps its id);  links to
                                                   it that say the old title ("P6 · Old", "Old") say the new
                                                   one;  logged;  then
                                                   links-agree (stderr);  --html (last):  the title is HTML
  saga list [--json]                               the sagas in order (sagas/sagas.json5), each with its epics
                                                   and how many guides name it;  then the epics with none
  saga set <epic> <saga> | <epic> --none           the saga an epic serves (<epic-page saga>), logged
  saga create <id> "Title" --purpose "..." [--after <id>]  /  move <id> --before|--after <id>  /  title <id> "Title"
                                                   the list:  a new saga, its place, its title
  saga rename <old> <new>                          a saga's id;  its epic pages, guides' metas, folder and the
                                                   SAGA:/ addresses in the shared pages follow
  stage <name> overview|phases|building            the page's stage:  what it shows (overview:  the Overview,
                                                   Questions and Todos;  phases:  the Phases too;  building:
                                                   everything);  no stage reads as building;  logged
  change <name> [--for <item id>]                  stamp the change marks written by hand (<epic-change item>:
                                                   id, time, answer, the words replaced;  every edit does
                                                   too), list them, new first;
                                                   --for:  the item of the marks that name none
  branch <name> <branch>                           the epic's git branch, when it isn't its id (<epic-page branch>):
                                                   every verb that finds the branch asks EpicConfig.branchOf();
                                                   logged (epic update <name> --branch <branch>)
  standing <name> [on|off]                         a standing epic:  open for good, each phase merging on its own,
                                                   never done (epic epic-workflow)
  request <name> <N> <rN> --from "..." --file path a request sent from another session, into phase N's Requests
                                                   field (epic file writes it;  epic epic-workflow)
  request <name> T<n> <rN> --file path [--picture <file>]...
                                                   into todo T<n> instead:  at the end of its text, the
                                                   pictures its own, marked requested (epic-engine T88)
  estimate <name> <N> "1-2h"                       set a phase's estimate;  the Overview's total follows
  phase <name> <N> todo|active|done|dropped [--done html] [--why html] [--no-open]
                                                   set a phase's status;  done drops its UPDATE markers
                                                   (labels, prose updates;  its plan changes stay), and
                                                   --done writes its Done field (a <ul> of what was built);
                                                   done also writes the time Claude took (took, from the
                                                   transcripts:  epic epic-engine P41) and how long by the
                                                   clock (span, from the log:  I127);
                                                   dropped (never built, and won't be:  struck through,
                                                   finished as done is) drops them too, and --why writes its
                                                   Dropped field in place of Done ("Moved to P38":  the P38
                                                   becomes a link to it;  epic epic-engine I228);
                                                   brings the doc forward in VS Code (it updates itself)
  phase <name> <N> remove                          a phase never started (to do, no commits, no requests filed
                                                   into it) off the page:  its queued items unqueued, links to it
                                                   plain words, the phases after it up a number (epic-engine T169)
  phase <name> <N> took [--dry-run]                a done phase's time, worked out again from the transcripts,
                                                   and its span from the log
  phase <name> <N> planning [off]                  Claude is writing its plan:  a blue spinner on its page (off
                                                   by itself once --plan is written;  phase-body sets it too)
  move <name> <N> <place>                          a to-do phase to place <place>, among the to-do phases;
                                                   numbers, links and "P5 · Name" text follow (epic-engine P34);
                                                   a started or done phase keeps its place:  the to-do ones trade
                                                   places around it (I480);
                                                   numbers stay whole:  a phase moved is numbered by its place
  add <name> question|judgement|todo|limit|issue|test|decision "title" [--details html] [--calm] [--requested] [--loud]
      [--title-ok]                                 the title read cold first by a fresh reader (T123):  a fail is
                                                   refused with a rewrite;  --title-ok skips it
                                                   prints the new id (a decision:  a question born answered,
                                                   Q7);  --calm (last):  a judgement call or issue that
                                                   wouldn't surprise you, grey (a call) or yellow (an issue) rather than red;
                                                   --loud:  a todo red until reviewed, a reminder (T94)
  add <name> issue "title" --requested --start "<his words>" [--agent <name>]
                                                   an issue filed from the person's words and taken up at
                                                   once:  his words its body, an Underway card, the spinner
                                                   on:  blue, never red as if it waited on him (T78)
  add <name> <kind> "title" [--picture <file>]... [--pasted <n>]
                                                   with the person's pictures (T87):  each file, then the n
                                                   he pasted last into this session's chat, saved in
                                                   pictures/ beside the page, shown after its words;  each
                                                   deletable on the page
  add <name> test "title" --step html --should html [--example <png> | "text"] [--if-not html]
                                                   a test your test run steps you through:  what to do (a
                                                   Step may hold <a class="epic-test-action" href> links,
                                                   the run's buttons), what should happen, an example (a
                                                   screenshot, copied to tests/<id>.png), what to tell Claude
  test <name> [--at <id>]  /  test <name> --list [--json]
                                                   your test run:  the page in the Review tab in test mode
                                                   (?test=1), at test <id>;  --list:  its open tests, in the
                                                   run's order (deferred ones last)
  test --all [--list] [--json]                     every epic with open tests, in your saga order;  the
                                                   first opened in test mode (?test=1&all=1)
  requested <name> <id>...                         issues or todos filed from the person's own words:  light
                                                   orange once Claude closes them, until they review them
                                                   (--requested on add)
  calm <name> <id>... [--loud]                     calls / issues not urgent (yellow), as the page's
                                                   id chip does;  --loud (last):  urgent (red) again;
                                                   a todo too, red as a reminder until reviewed (T94)
  failed <name> <M id> <I id> | off                a manual test failed, filed as that issue:  "failed -> I12"
                                                   on its line, a Noted card linking it, the test left open;
                                                   off takes the mark off (closing the test does too)
  decide <name> <Q id> "answer" [--details html] [--option A]
                                                   answer a question:  the answer goes INTO it (an ivory card);
                                                   --option marks the chosen option card;  prints its id
  choose <name> <id> <letter>... ["outcome"] [--set N]
                                                   an option you settled IN CONVERSATION, on any item, as the
                                                   page's pick records it:  chosen on the item's latest card
                                                   set (--set N:  the Nth);  a question answered, a judgement
                                                   call closed, any item reviewed;  the outcome in its Choices;
                                                   several letters in a pick-any set;  a phase's set, or a
                                                   standing set (s-upgrades), as its target
  option <name> add <id> "title" ["note"] [--set N] [--image <png>]
  option <name> edit <id> <letter> [--title "..."] [--note "..."] [--set N]
  option <name> remove | close <id> [<letter>] [--set N]
                                                   an option set's options:  added (the next letter), edited
                                                   in place (the old text kept, folded), removed (kept, folded),
                                                   or the set closed (done);  on an item, a phase or a standing set
  add <name> choices "title" [--multiple] [--note "..."]
                                                   a standing option set (s-<slug>), in the Choices section
  close <name> <id>... [--why "<text>"]            close items (done);  --why closes them as obsolete:  the reason (plain
                                                   text) a Done card on each and in the log;  refused, the rest still
                                                   closed:  questions, tests, urgent, fixed, waiting on his pick or his
                                                   mark, asked for lately, promised and not delivered
  close <name> --why-file <file>                   the same, a reason per item:  a JSON5 file of id => reason, one write
  reopen <name> <id>                               open an item again
  stale <name> [--json]                            the facts for judging which open calls, issues and todos have gone
                                                   stale;  decides nothing (for /epic tidy)
  stale <name> --underway [--apply] [--hours n] [--json]
                                                   open items whose Underway card is older than n hours (3),
                                                   nobody working them:  on main => fixed;  else a
                                                   Stale card, once (--apply);  every turn's end runs it (T78)
  badges <name> [list [--json] | trial | on | off | score [ids] [--model sonnet]
      | set <ids> [--care 80] [--doubt 10] [--severe yes|no] [--your-call yes|no] [--why "..."]
      | close <ids> [--as vanished|moot|duplicate|declined] [--why "..."]]
                                                   item badges (P81):  each line starts with what happens next, from
                                                   care and doubt;  off undoes them all;  a trial closes nothing
  hush [<name> | all] [--dryrun] [--json] [--model sonnet]
                                                   grey the green, yellow and orange items settled 3+ days ago Owen
                                                   almost surely won't look at again (80%, a fresh claude -p judges
                                                   each), as his check would;  --dryrun:  the table only (T122)
  cancel <name> <id> ["why"]                       an item made moot by another decision:  struck through;
                                                   reopen undoes it
  commit <name> <sha> --phase N | --item <id> "sentence"
                                                   list a commit under a phase or an item (replaces its entry)
  commits <name> --backfill [--merged <sha,...>]   list every phase / item commit in the doc's git history
                                                   (subjects "P3:  Name -- summary", "Fix I3:  ...");
                                                   --merged:  only those (epic merge's);  phase ... done and
                                                   epic merge list them by themselves
  log <name> ["text"] [--last <n>]                timestamped review line in the log;  no text:  print the newest
  saga page <id> [--force]                         a saga's page, sagas/<id>/<id>.saga.html, from the template:
                                                   its title and purpose from sagas/sagas.json5;  --force remakes
                                                   it;  every verb above edits it as SAGA:/<id> (epic-workflow P15)
  bedtime <name> start "P3-P6"  /  done "summary"  a /bedtime run:  bedtime mode on (every change stays green
                                                   until reviewed) / off;  both logged
  focus on [--why "..."] | off | status | summary [<name>] [--since <t>] [--json]
                                                   focus mode (/focus, /back):  on and off print a TELL: line for
                                                   each running epic session;  summary:  what happened since
  fresh all [--pause] | status | drop [<session id>] | quiet | wait [--max <time>] | cancel [--json]
                                                   /epic fresh all:  every running epic session marked to go to
                                                   a fresh session at its next clear moment;  TELL: lines;
                                                   --pause:  each pauses and saves its agents first, says quiet,
                                                   and all go only once every one is;  cancel calls that off
  fresh later <epic> | queued <epic> [--json]      /epic fresh while agents run:  this session goes fresh once
                                                   they're done;  queued:  the post-fresh list
  prompt <name> "text" | --file path               set the prompt that started the plan ("" removes it)
  summary <name> [--json] [--all]                  open questions, issues, todos, limits, manual tests;  the next phase;
                                                   finished phases and grey items only counted, unless --all
  docs <name> [--json]                             the docs the epic wrote besides its epic page:  its
                                                   guide, what its commits changed (wrote), docs that name it
                                                   (related), docs it only links to (linked);  its
                                                   changelog entry;  the shared pages its turns swept up
                                                   (swept):  counted, --json lists them.  For /docs-check
  decisions <name> [--json]                        what the epic page settled:  phases (Done, Updated notes),
                                                   items (status, chosen option, answer;  --json:  their
                                                   text).  For /docs-check
  owns <path> ... [--json]                         which open epics own each path (from the checkout's root),
                                                   their stage (planning, building) and how:  their branch
                                                   changes it (branch), their page names it (plan).  For /coherence
  review <name> <id> ["outcome"]                   mark an item reviewed today;  the outcome goes in the log
  defer <name> <id>                                put an item off:  still not reviewed, dated
  queue <name> <id> "work"  /  unqueue <name> <id> work a review decided on, waiting  /  started or dropped
  items <name> [--section issues] [--filter unreviewed|open|reviewed|queued|all] [--json] [--all]
                                                   what a review walks:  sections, counts, items, the queue;
                                                   grey items (limits, handled) counted, listed with --all
  items <name> --section issues --spec <file>      the review's item picker, a details page spec:
                                                   \`epic ask create <slug> --from <file>\`
  list [--json]                                    every epic:  status, where it runs, not reviewed / all
  backfill <name> | --all [--apply]                items you already went through, from past sessions;
                                                   a dry run unless --apply (review-backfill.js)
  summaries <file.html> ... [--all]                \`summary --json\` of each doc, by path (worktrees' too):
                                                   JSON \`{ <file>: summary | { error } }\`;  for \`/epics\`
  lint <name> [--no-browser] [--links]             ids, #id links, phases, parts (a split doc whole);  its
                                                   links (doc-links, SAGA:/ and <epic-link>), failing
                                                   only with --links;  then
                                                   check-spell.js
  open <name>                                      show in VS Code's side bar's Review tab, where an epic page
                                                   always goes (--docs, --review accepted, ignored)
  migrate [<kind>] [<epic>... | --all] [--file <page>] [--step <name>] [--dry-run] [--notify] [--list]
                                                   bring pages up to today's markup:  every step of their kind,
                                                   oldest first, each page under its lock;  safe to run again.
                                                   Alone:  every kind, every page;  <kind> (epic, guide,
                                                   cheatsheet ...):  one kind, --file one page;  <epic>... or
                                                   --all:  epic pages;  --step one step;  --dry-run:  the report
                                                   only;  --list:  the steps;  --notify:  an epic whose session is
                                                   running is told (TELL lines, for SendMessage), the rest migrated
  split <name> [--dry-run]  /  split --done        store a doc as a skeleton plus part files (parts/<id>.html,
                                                   loaded when opened);  --done:  every finished epic without
                                                   a worktree.  New docs start split;  every command reads and
                                                   writes either shape
  join <name>                                      a split doc back into one file
  inbox <name> [--json]                            the marks you left on the page (<name>.inbox.json5), by
                                                   action, sent or not;  requests for now, agents at work,
                                                   the session listening
  inbox <name> watch [--session <id>]  /  ignore
                                                   a session waits on the inbox (default:  this one,
                                                   $CLAUDE_CODE_SESSION_ID) / stopped:  the page says which
  inbox wait <name> [--timeout <s>] [--json]       block (default 3300s) until there's work, print it, exit 0:
                                                   requests for now (taken;  their items marked working) and a
                                                   send not yet handed over (its marks by action);  timeout:  exit 2;
                                                   stamps the session's heartbeat every ${SRV.Heartbeat.EVERY_MS / 1000}s (silent ${SRV.Heartbeat.STALE_MS / 1000}s:  gone)
  inbox apply <name> [ids...] [--all]              apply the sent approve / pick / todo marks, and the sent
                                                   urgency (an id chip clicked:  calm or not), to the doc, clear
                                                   them;  prints each, and what it left (revisits, a pick with a
                                                   revisit:  to talk over);  --all:  sent or not (/airplane land)
  inbox working <name> <id> on|off                 the page's spinner on an item or a phase (P20, its id);  a comment (C3):  its
                                                   thread's "Claude: thinking…" (done C3 turns it off)
  inbox done <name> <id>...                        an agent finished an item:  its mark and spinner go (a mark
                                                   you changed meanwhile stays)
  inbox clear <name> <id>...                       drop marks (a revisit talked over)
  details <name> <id> --file <html> [--append | --more]  /  details <name> <V id> --step ... --should ...
                                                   replace an item's details with the file's HTML, or (--append)
                                                   add it, e.g. a reply:  between the answer card and commits;
                                                   replacing moves the old text into its Original Discussion;
                                                   --more (Add Details, Clarify):  the file's HTML REPLACES the
                                                   unclear text, in a "More Details" card that never folds;  the
                                                   old text into its Original Discussion, Owen's quoted words and
                                                   every card kept
  summarize <name> <id> --file <html>              condense an item after a lot of back and forth:  the file's
                                                   HTML replaces what it shows;  its text, replies, More Details
                                                   and unpicked Choices move into its Original Discussion
                                                   (folded);  your picks, the answer, status cards stay
  status <name> <id> underway "html"              Claude took your mark on an item (or an Overview section):
                                                   a blue "Claude • Underway" card with Claude's reading of
                                                   the task (a sentence or two, no file names);  spinner on
  status <name> <id> done ["html"]                 the item's WORK is finished (an issue fixed, a todo built):
                                                   that card turns green "Claude • Done", the reading kept, the
                                                   summary under it when there's something worth saying;  an
                                                   open issue or todo closes, as close does;  spinner off.
                                                   Refused with no underway card
  status <name> <id> fixed ["html"]                an issue or judgement call fixed, for your review:  orange (light
                                                   orange from your words), still open;  Approve closes it.  An issue
                                                   Claude found that you hadn't got to:  closed, grey, "FIXED - ...".
                                                   A Do this's done means this too, and done on an issue Claude found
  status <name> <id> promised "html"               /epic tidy:  it waits on finished work and what it promised never
                                                   came:  a "Promised, not delivered:" card, back on your list
  status <name> <id> noted "html"                  a STEP done, the item not finished:  your choice recorded,
                                                   an answer, details or a summary written, a request called
                                                   off:  a calm "Claude • Noted" card saying what was done and
                                                   what happens next ("Chose
                                                   B · ...:  recorded;  waiting for the next phase, P9 · ...");
                                                   an underway card turns noted;  spinner off.  inbox apply
                                                   writes these for picks, todos and new items itself
                                                   (done --filed "html":  the older spelling, the same)
                                                   NEVER finished work ("Fixed in <sha>", Done, Built, Merged:
                                                   refused):  merged is fixed / done, waiting is underway
  original <name> <id> --file <html> [--as-of "YYYY-MM-DD HH:MM"]
                                                   put earlier text (from git) into an item's Original
                                                   Discussion:  as first written, or dated --as-of (when it was
                                                   replaced);  prints added / unchanged / empty
Every checkout shares ONE copy of each doc (the epics link):  any checkout edits the same file.
Every command reads <epic-*> markup only, and refuses a doc in the old markup (one restored from an old backup).
--here is no longer needed:  accepted and ignored.`

/** Where `commits --backfill` says a commit's Log entry went. */
const LOG_LABEL = "Log"

/** How many review lines `log <name>` prints with no `--last`. */
const LOG_LAST = 20

/** Flags that never take a value, so `epic summary --all seo` keeps `seo` as the epic. */
const SWITCHES = ["all", "json", "dryrun", "dryRun", "titleOk", "pause"]

/** A phase as `rename` takes it:  `P6`, `6`, `p6`. */
const PHASE_REF = /^p?\d+$/i

/** `summary`'s mark for a phase's status. */
const PHASE_MARKS = { todo: "[ ]", active: "[~]", done: "[x]", dropped: "[-]" }

/** How often `bedtime all spec --wait` looks for the questions still to come. */
const SPEC_POLL_MS = 5000

/**
 * `bedtime <name> start|done ...`:  a `/bedtime` run's mode (`PlanDoc.startBedtime()`), logged.
 * - throws a `PlanDocError` for any other action
 */
function bedtime(plan: PlanDoc, [action, ...args]: string[]): void {
  switch (action) {
    case "start": {
      const phases = need(args[0], "the phases, e.g. P3-P6")
      plan.startBedtime(phases)
      return plan.log(`Bedtime started:  ${phases}`)
    }
    case "done": {
      const summary = need(args[0], "a one-line summary")
      plan.finishBedtime()
      return plan.log(`Bedtime done:  ${summary}`)
    }
    default:
      throw new PlanDocError(`bedtime what?  start | done (not '${action ?? ""}')`)
  }
}

/**
 * Refuse to write into item `id` of epic `name`'s doc at `file` while Owen called its request off on the page
 * ("nevermind", epic `windows-and-review` P2):  `details` and `summarize` write nothing then.
 * - throws a `PlanDocError` saying what to do instead
 */
function refuseCanceled(name: string, file: string, id: string): void {
  if (!ReviewInbox.read(ReviewInbox.pathFor(file)).isCanceled(id)) return
  throw new PlanDocError(
    `${id.toUpperCase()}:  the person called this request off on the page ("nevermind"):  nothing written.  ` +
      `\`epic inbox done ${name}#${id}\` and stop.`
  )
}

/**
 * `add ... --start "<his words>"`'s body:  the person's words, quoted, as plain text (epic `epic-engine` T78).
 * - Owen, 2026-11-15, on an issue filed from his words and drawn red with "What it says on the tin":  "you should
 *   start the issue and show it appropriately ... makes it look like I need to take action on it"
 */
function startedBody(words: string, plan: PlanDoc): string {
  const person = plan.person && plan.person !== "someone" ? plan.person : "Owen"
  return `<p>${PlanMarkup.text(person)}:  “${PlanMarkup.text(words.trim())}”</p>`
}

/** `add ... --start`'s underway card:  who took it up (`--agent <name>`), else that it was taken up at once. */
function startedReading(flags: Flags): string {
  const agent = stringFlag(flags.agent)
  return agent ? `Taken up at once:  agent <code>${PlanMarkup.text(agent)}</code> is on it.` : "Taken up at once."
}

/**
 * Item `id` not urgent (`calm`) or urgent again, as the page's id chip does (`PlanDoc.setCalm()`), logged.
 * - returns the line to print:  `J11 not urgent:  <title>`, or `J11 not urgent already:  <title>` (not logged)
 */
function calmItem(plan: PlanDoc, id: string, calm: boolean): string {
  const did = plan.setCalm(id, calm)
  const state = did ?? `${calm ? "not urgent" : "urgent"} already`
  const line = `${id.toUpperCase()} ${state}:  ${PlanItem.titleOf(plan.item(id))}`
  if (did) plan.log(line)
  return line
}

/**
 * Test `id` marked failed, filed as `issue` (`PlanDoc.markFailed()`), with a Noted card linking the issue, logged;
 * `issue` `undefined`:  the mark taken off.
 * - returns the line to print:  `M3 failed -> I12:  <title>`, `M3 no longer marked failed:  <title>`
 */
function failTest(plan: PlanDoc, id: string, issue: string | undefined): string {
  const filed = plan.markFailed(id, issue)
  const label = id.toUpperCase()
  const title = PlanItem.titleOf(plan.item(id))
  if (!filed) {
    const line = `${label} no longer marked failed:  ${title}`
    plan.log(line)
    return line
  }
  plan.noteStatus(id, `Failed:  filed as <a href="#${filed}">${filed.toUpperCase()}</a>.`)
  const line = `${label} failed -> ${filed.toUpperCase()}:  ${title}`
  plan.log(line)
  return line
}

/** `section` without its grey items (`QUIET_STATES`), counted in its `quiet` (`epic items` without `--all`). */
function withoutQuiet(section: ReviewSection): ReviewSection {
  const items = section.items.filter((item) => !QUIET_STATES.includes(item.docState))
  return { ...section, items, quiet: section.items.length - items.length }
}

/** `summary`, `summaries` and `items`' scope:  `--all` lists finished phases and grey items too (epic `epic-engine` T111). */
function summaryScope(flags: Flags): SummaryScope {
  return flags.all ? "all" : "open"
}

/** `value`, or a usage error naming what's missing, and where the usage is. */
function need(value: string | undefined, what: string): string {
  if (value === undefined || value === "") throw new PlanDocError(`missing ${what}  (${USAGE_HINT})`)
  return value
}

/** Where a usage error points:  the whole `USAGE` is long, and every error printing it buried the message. */
/** What `epic update ... fixed` says it did. */
const FIXED_WORDS = "fixed, for review"

/** What `epic update ... fixed` or `done` says it did to an issue Claude found (`SelfFix`, T143). */
const SELF_FIXED_WORDS = "fixed, grey, nothing for you to do"

const USAGE_HINT = "`epic <verb> --help`;  a phase is `<epic>#P3` (or its name), an item `<epic>#J3`"

/**
 * A flag's phase, as its place in `plan` (`PlanDoc.phasePlace()`):
 * `--before 3`, `--before P3`, `--after 11`, `--before epic-migrate` ...
 * - `undefined` without the flag
 * - throws a `PlanDocError` for the flag bare, or a phase the doc doesn't have
 */
function phaseFlag(plan: PlanDoc, value: string | true | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined
  if (value === true) throw new PlanDocError(`${flag} needs a phase (its number, or its name)`)
  return plan.phasePlace(value)
}

/**
 * What an insert renumbered, for the log, from the phases `before` it and `after`, by their old numbers and new:
 * `P6 · Doc Review moved down to P7`, or `P5-P6 moved down to P6-P7` for several (I6 of `skillz`);
 * `""` when none moved (the new phase went last).
 */
export function movedDown(before: Phase[], after: Phase[]): string {
  const moved = before.flatMap((phase) => {
    const now = after.find((each) => each.id === phase.id)
    return now && now.number !== phase.number ? [{ name: phase.name, was: phase.number, now: now.number }] : []
  })
  if (!moved.length) return ""
  if (moved.length === 1) return `P${moved[0]!.was} · ${moved[0]!.name} moved down to P${moved[0]!.now}`
  return `P${moved[0]!.was}-P${moved.at(-1)!.was} moved down to P${moved[0]!.now}-P${moved.at(-1)!.now}`
}

/** `kebab-name` -> `Kebab Name`. */
function titleCase(name: string): string {
  return name.replace(/(^|-)(\w)/g, (_, dash: string, letter: string) => `${dash ? " " : ""}${letter.toUpperCase()}`)
}
