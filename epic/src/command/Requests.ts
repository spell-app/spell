import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { escapeHTML } from "spell/util/string"
import { localDate, localMinutes } from "spell/util/time"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { Transcript } from "spell/epic/config/Transcript"
import { DataFile } from "spell/epic/data/DataFile"
import { PhaseIds } from "spell/epic/phases"

import {
  EXIT,
  EpicCommandError,
  parseVerbArgs,
  stringFlag,
  type EpicRequest,
  type MergeOptions,
  type MergeResult,
  type PastedImage,
  type SendRequestProps,
  type SentRequest,
  type VerbArgs
} from "./command.types"
import { EpicCheckout } from "./EpicCheckout"
import { parseTarget, phaseLabel, phaseOf } from "./epicArgs"
import { EpicTools } from "./EpicTools"
import { Sessions } from "./Sessions"
import { StrayFiles } from "./StrayFiles"

/****************
 * ### `Requests`
 * REQUESTS:  what Owen asks one epic for while he's working in another session (epic `epic-workflow`),
 * and the epic-wide verbs beside them:  `epic send | requests | file | home | merge`.
 * - Each request is a folder in the epic's shared folder, `epics/<epic>/requests/r3/`:
 *   - `request.md`:  his words verbatim, who sent it, what it was looking at, and where it went
 *   - `image-1.png` ...:  the screenshots he pasted, taken from the sender's transcript
 * - Written BEFORE anyone is told, so nothing is lost if the epic's own session is closed.
 * - The epic's session (the RECEIVER) turns each into a phase, then marks it filed (`file()`).
 * - The verbs (`run()`):
 *   - `send [<epic>] --text "..." | --file f [--images N] [--context "..."]`:  write a request into `<epic>`,
 *     with the newest N screenshots pasted into this session
 *     - then print its id and the epic's running sessions to tell (`SendMessage`),
 *       or the command that opens its window when none runs
 *     - no `<epic>`:  the tooling home's
 *   - `requests <epic> [--json]`:  every request sent to `<epic>`, and where each went
 *     - one filed into a phase:  that phase's number TODAY (`shown()`), so a phase inserted ahead of it moves it along
 *   - `file <epic>#P7 <id>`:  file a request into phase P7:
 *     his words and screenshots in its Requests field (the `epic` tool's `request`), the request marked filed,
 *     `P7 · Its Title`, and the phase's stable id kept (`phase:  p-its-title`;  epic `epic-engine` I4)
 *     - `file <epic> <id> "<where>"`, no phase:  only marked filed, saying where it went (`"dropped:  done in P3"`)
 *     - `--from` and `--file` (the request as html):  taken as given rather than read from the epic's `requests/`
 *   - `home [<epic>]`:  the TOOLING HOME, the epic dev-tooling requests go to;  with `<epic>`, set it
 *   - `merge <epic> [--ditch]`:  a STANDING epic's phase onto `main` at once, fast-forward only;  run in the main
 *     checkout
 *     - a multi-repo top (epic `epic-engine` P10):  each repo whose branch `<epic>` has commits (`mergeEach()`)
 *     - stray files in a main checkout (`StrayFiles`):  generated ones moved aside by themselves;  `--ditch`, once Owen
 *       says so, the few others too
 *     - then the merged commits onto the epic page (`recordMerged()`, epic `epic-engine` I135)
 ****************/
export class Requests {
  /** the checkout it runs for:  STATIC for the object's life */
  readonly root: string

  /** `epics/` in the repo's epic folder (`EpicConfig.contentOf()`), which every checkout shares */
  readonly epics: string

  /** the sessions:  senders' transcripts, receivers */
  readonly sessions: Sessions

  /**
   * - `root`:  default the nearest checkout of a repo set up for epics (`EpicCheckout.nearest()`)
   * - `sessions`:  default `new Sessions()`
   */
  constructor({ root = EpicCheckout.nearest(), sessions = new Sessions() }: RequestsProps = {}) {
    this.root = root
    this.epics = join(EpicConfig.contentOf(root), "epics")
    this.sessions = sessions
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** Run `epic <verb> <args>` for one of this group's verbs;  resolves to the exit code. */
  async run([verb, ...args]: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["json", "ditch"])
    const [named, ...rest] = positional
    if (!verb) throw new EpicCommandError(`which verb?  ${VERBS}`)
    if (verb === "merge") {
      if (!named) throw new EpicCommandError("merge:  which epic?")
      const merged = Requests.mergeEach(named, undefined, { ditch: Boolean(flags.ditch) })
      for (const { repo, ditched, ditchedTo } of merged.filter(({ ditched }) => ditched.length)) {
        CLI.out(`${repo ? `${repo}:  ` : ""}moved ${ditched.length} stray file(s) aside, into ${ditchedTo}:`)
        for (const file of ditched) CLI.out(`  ${file}`)
      }
      if (merged.length === 1 && !merged[0]!.repo) {
        const { commits } = merged[0]!
        CLI.out(commits.length ? `main fast-forwarded to ${named}:` : `nothing to merge:  main already has ${named}`)
        for (const commit of commits) CLI.out(`  ${commit}`)
      } else {
        // a multi-repo top:  each repo whose branch has commits
        const moved = merged.filter(({ commits }) => commits.length)
        if (!moved.length) CLI.out(`nothing to merge:  every repo's main already has ${named}`)
        for (const { repo, base, commits } of moved) {
          CLI.out(`${repo}:  ${base} fast-forwarded to ${named}:`)
          for (const commit of commits) CLI.out(`  ${commit}`)
        }
      }
      await Requests.recordMerged(named, merged)
      return EXIT.OK
    }
    if (verb === "home") {
      if (named) this.setHome(named)
      CLI.out(this.home() ?? "no tooling home:  epic home <epic> sets one")
      return EXIT.OK
    }
    // no epic named:  the tooling home's (`send` only:  the other verbs say which epic)
    const epic = named ?? (verb === "send" ? this.home() : null)
    if (!epic)
      throw new EpicCommandError(`${verb}:  which epic?${verb === "send" ? "  (no tooling home is set either)" : ""}`)
    switch (verb) {
      case "send":
        return this.sendVerb(epic, flags)
      case "requests": {
        const requests = await this.shown(epic)
        if (flags.json) CLI.out(JSON.stringify(requests, null, 2))
        else if (!requests.length) CLI.out(`no requests in epic ${epic}`)
        else for (const request of requests) CLI.out(requestLine(request))
        return EXIT.OK
      }
      case "file":
        return this.fileVerb(epic, rest, flags)
      default:
        throw new EpicCommandError(`unknown verb '${verb}':  ${VERBS}`)
    }
  }

  /** `epic send`:  write the request, then say who to tell. */
  private sendVerb(epic: string, flags: VerbArgs["flags"]): number {
    const file = stringFlag(flags.file)
    const text = file !== undefined ? readFileSync(file, "utf8") : flags.text
    if (typeof text !== "string" || !text.trim())
      throw new EpicCommandError('send:  your words?  --text "..." or --file <file>')
    const images = Number(flags.images ?? 0)
    if (!Number.isInteger(images) || images < 0) throw new EpicCommandError(`send:  --images ${flags.images}?  a count`)
    const sent = this.send({
      epic,
      text,
      images,
      context: stringFlag(flags.context),
      from: stringFlag(flags.from) ?? process.env.CLAUDE_CODE_SESSION_ID
    })
    const { request, receivers } = sent
    if (flags.json) {
      CLI.out(JSON.stringify({ ...sent, receivers: receivers.map((it) => it.name ?? it.sessionId) }, null, 2))
      return EXIT.OK
    }
    CLI.out(`${request.id}  epics/${epic}/requests/${request.id}/request.md`)
    for (const image of request.images) CLI.out(`    ${image}`)
    if (receivers.length) {
      for (const receiver of receivers)
        CLI.out(`tell:  ${receiver.name ?? receiver.sessionId}  (${receiver.status ?? "running"})`)
    } else if (sent.fromEpic) {
      CLI.out(`this session is ${epic}'s own:  take ${request.id} up here (/epic request ${epic} ${request.id})`)
    } else {
      CLI.out(`no session of ${epic} is running:  open one with`)
      CLI.out(`  epic window launch ${epic} --prompt "/epic request ${epic} ${request.id}"`)
    }
    return EXIT.OK
  }

  /**
   * `epic file <epic>#P7 <id>`:  request `id` into the phase's Requests field, by the `epic` tool,
   * then marked filed there.
   * - `epic file <epic> <id> "<where>"`:  only marked filed, saying where it went
   * - `--from` and `--file`:  the request as given;  marked filed only if `requests/` has it
   * - the old order, the phase a word of its own (`file seo r3 7`):  refused, spelled right
   */
  private async fileVerb(named: string, [id, where]: string[], flags: VerbArgs["flags"]): Promise<number> {
    const { epic, ref } = parseTarget(named)
    if (ref === undefined) {
      if (!id || !where) throw new EpicCommandError(`file:  ${FILE_USAGE}`)
      const phase = phaseOf(where)
      if (phase !== undefined)
        throw new EpicCommandError(`file:  epic file ${epic}#${phaseLabel(phase)} ${id}  (the phase goes after a #)`)
      CLI.out(requestLine(this.file(epic, id, where)))
      return EXIT.OK
    }
    if (!id || where !== undefined) throw new EpicCommandError(`file:  ${FILE_USAGE}`)
    const request = this.list(epic).find((it) => it.id === id)
    let html = stringFlag(flags.file)
    let from = stringFlag(flags.from)
    if (!html || !from) {
      if (!request) throw new EpicCommandError(`no request '${id}' in epic '${epic}'`)
      html = join(mkdtempSync(join(tmpdir(), "epic-request-")), `${id}.html`)
      writeFileSync(html, Requests.html(request))
      from = request.from
    }
    // into the phase's Requests field (`P7`, `p-epic-migrate`, its name:  the tool finds it)
    const exitCode = await EpicTools.runPlanDoc(["file", named, id, "--from", from, "--file", html])
    if (exitCode !== EXIT.OK) return exitCode
    const { filed, phase } = await this.phaseFiled(epic, ref)
    CLI.out(request ? requestLine(this.file(epic, id, filed, phase)) : `${id}  into ${epic}#${filed}`)
    return EXIT.OK
  }

  /**
   * Where a request filed into the phase `ref` names went (`P7`, `7`, its id or name, as `PhaseIds.find()` takes):
   * `filed`, `P7 · Its Title`, and `phase`, its stable id;  a phase the page doesn't have:  `ref` as typed
   * (`P7` for a number), and no id.
   */
  async phaseFiled(epic: string, ref: string): Promise<{ filed: string; phase?: string }> {
    const phase = PhaseIds.find(await this.phasesOf(epic), ref)
    if (phase) return { filed: phaseTitle(phase), phase: phase.id }
    const number = phaseOf(ref)
    return { filed: number === undefined ? ref : phaseLabel(number) }
  }

  ////////////////
  // ## Sending
  ////////////////

  /**
   * Write a request into `epic`, and say who should hear about it (`SendRequestProps`).
   * - throws when `epic` has no epic page, or the transcript has fewer images than asked for
   */
  send({ epic, text, from, images = 0, context }: SendRequestProps): SentRequest {
    const epicDir = join(this.epics, epic)
    if (!existsSync(join(epicDir, `${epic}.plan.html`))) {
      throw new EpicCommandError(`no epic '${epic}':  epics/${epic}/${epic}.plan.html isn't there`)
    }
    const pictures = images > 0 ? this.pastedImages(from, images) : []
    if (pictures.length < images) {
      throw new EpicCommandError(`asked for ${images} image(s), but the sending session pasted ${pictures.length}`)
    }

    const id = Requests.nextId(join(epicDir, "requests"))
    const folder = join(epicDir, "requests", id)
    mkdirSync(folder, { recursive: true })
    const files = pictures.map((picture, at) => {
      const name = `image-${at + 1}.${EXTENSIONS[picture.mediaType] ?? "png"}`
      writeFileSync(join(folder, name), Buffer.from(picture.data, "base64"))
      return name
    })
    const sender = from ? this.senderOf(from) : "unknown session"
    const request: EpicRequest = {
      id,
      epic,
      from: sender,
      at: localMinutes(),
      status: "new",
      text,
      context,
      images: files
    }
    writeFileSync(join(folder, "request.md"), Requests.markdown(request))

    const sessions = this.sessions.ofEpic(epic)
    const receivers = sessions.filter((session) => session.sessionId !== from)
    return { request, folder, receivers, fromEpic: receivers.length < sessions.length }
  }

  /**
   * The newest `count` images Owen pasted into session `id`, oldest first.
   * - only images in his own prompts:  not a tool's (a `Read` of a picture), nor a subagent's (sidechains)
   * - a prompt he sent MID-TURN too (`promptBlocks()`):  Claude Code queues it, and writes it as an `attachment`
   *   (`queued_command`), never a `user` entry (epic `epic-engine` I50:  "couldn't be attached")
   * - `[]` when the session has no transcript
   */
  pastedImages(id: string | undefined, count: number): PastedImage[] {
    const path = id ? this.sessions.transcriptOf(id) : undefined
    if (!path) return []
    const found: PastedImage[] = []
    for (const line of readFileSync(path, "utf8").split("\n")) {
      // cheap pre-check:  most lines have no image
      if (!line.includes('"image"')) continue
      const content = Requests.promptBlocks(Transcript.parseLine(line))
      if (!content) continue
      for (const block of content) {
        const source = block?.type === "image" ? block.source : undefined
        if (source?.type === "base64" && typeof source.data === "string") {
          found.push({ mediaType: source.media_type ?? "image/png", data: source.data })
        }
      }
    }
    return found.slice(-count)
  }

  /**
   * The content blocks of transcript entry `entry` when it's a prompt Owen sent, else `undefined`:
   * - a `user` entry:  a prompt sent between turns (not a subagent's, nor a meta one Claude Code adds)
   * - an `attachment` of type `queued_command` from a human:  a prompt sent while Claude was mid-turn, which Claude
   *   Code hands over with the turn's next tool result (`attachment.prompt`, the same blocks)
   *   - not a peer's (`origin.kind` `peer`:  a subagent's hand-back)
   */
  static promptBlocks(entry: Record<string, unknown>): PromptBlock[] | undefined {
    if (entry.isSidechain || entry.isMeta) return undefined
    if (entry.type === "user") {
      const content = (entry.message as { content?: unknown } | undefined)?.content
      return Array.isArray(content) ? content : undefined
    }
    if (entry.type !== "attachment") return undefined
    const queued = entry.attachment as { type?: string; prompt?: unknown; origin?: { kind?: string } } | undefined
    if (queued?.type !== "queued_command" || (queued.origin?.kind ?? "human") !== "human") return undefined
    return Array.isArray(queued.prompt) ? queued.prompt : undefined
  }

  /** Session `id`, as a request names its sender:  its title and the start of its id, `🚧 python (83d39e12)`. */
  private senderOf(id: string): string {
    const title = this.sessions.running().get(id)?.name ?? this.sessions.title(id)
    return title ? `${title} (${id.slice(0, 8)})` : id
  }

  ////////////////
  // ## Reading and filing
  ////////////////

  /** Every request in `epic`, oldest first;  `[]` when it has none. */
  list(epic: string): EpicRequest[] {
    const dir = join(this.epics, epic, "requests")
    if (!existsSync(dir)) return []
    return readdirSync(dir)
      .filter((name) => /^r\d+$/.test(name) && existsSync(join(dir, name, "request.md")))
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
      .map((name) => Requests.parse(readFileSync(join(dir, name, "request.md"), "utf8")))
  }

  /**
   * Every request in `epic`, as `epic requests` shows it:  `list()`'s, but each one filed into a phase (`phase`, its
   * stable id) says where that phase is TODAY, `P11 · Doc Review`, however many phases went in ahead of it since
   * (`add-phase --before`;  epic `epic-engine` I4).
   * - a phase no longer on the page:  `filed` as written
   * - reads the epic page only when a request names a phase
   */
  async shown(epic: string): Promise<EpicRequest[]> {
    const requests = this.list(epic)
    if (!requests.some((request) => request.phase)) return requests
    const phases = await this.phasesOf(epic)
    return requests.map((request) => {
      const phase = request.phase ? phases.find((each) => each.id === request.phase) : undefined
      return phase ? { ...request, filed: phaseTitle(phase) } : request
    })
  }

  /**
   * Mark request `id` of `epic` filed:  `where` says where it went (`P7 · Comment Threads`, `joined P5`).
   * - `phase`:  the stable id of the phase it went into (`phaseFiled()`), kept so `shown()` finds it after an insert;
   *   none (filed elsewhere, or dropped):  any id it had goes
   * - returns the request as it now stands;  throws when there's no such request
   */
  file(epic: string, id: string, where: string, phase?: string): EpicRequest {
    const path = join(this.epics, epic, "requests", id, "request.md")
    if (!existsSync(path)) throw new EpicCommandError(`no request '${id}' in epic '${epic}'`)
    const request: EpicRequest = { ...Requests.parse(readFileSync(path, "utf8")), status: "filed", filed: where, phase }
    writeFileSync(path, Requests.markdown(request))
    return request
  }

  /**
   * `epic`'s phases, in order, from its epic page (`PhaseIds.phasesIn()`);  `[]` when it has no page.
   * - the page's skeleton is enough:  a split page keeps every `<epic-phase>`, its id and title, in its own file
   * - linkedom is loaded on first use:  the other verbs don't pay for it (as `EpicTools.planDoc()`)
   */
  private async phasesOf(epic: string): Promise<Element[]> {
    const path = join(this.epics, epic, `${epic}.plan.html`)
    if (!existsSync(path)) return []
    const { parseHTML } = await import("linkedom")
    return PhaseIds.phasesIn(parseHTML(readFileSync(path, "utf8")).document as unknown as Document)
  }

  ////////////////
  // ## The tooling home
  ////////////////

  /**
   * The TOOLING HOME's epic:  the epic every session sends dev-tooling requests to (epic `epic-workflow`, Q2 and Q7);
   * `null` when none is set (or its file won't read).
   * - Dev tooling:  how Owen works, not what a session builds (the rule:  the root `CLAUDE.md`).
   *   - the epic page, comments, the Review tab, every skill and hook, windows, worktrees, `epic` itself
   * - Kept in `epics/home.json5`, the epic repo:
   *   every checkout reads the same one, and the turn-end hook commits it.
   * - A data file (`DataFile`):  JSON5, a comment added by hand kept,
   *   its old `home.json` read while there's no `.json5`.
   * - Its shape:  `{ "epic": "epic-workflow", "set": "2026-10-11" }`
   */
  home(): string | null {
    let home: { epic?: unknown } | undefined
    try {
      home = DataFile.read<{ epic?: unknown }>(this.homeFile)
    } catch {
      return null
    }
    return typeof home?.epic === "string" && home.epic ? home.epic : null
  }

  /**
   * Make `epic` the tooling home;  throws when it has no epic page.
   * - SIDE EFFECT:  writes `epics/home.json5` (removing its old `.json`)
   */
  setHome(epic: string): void {
    if (!existsSync(join(this.epics, epic, `${epic}.plan.html`))) {
      throw new EpicCommandError(`no epic '${epic}':  epics/${epic}/${epic}.plan.html isn't there`)
    }
    const set = localDate()
    DataFile.write(this.homeFile, { epic, set })
  }

  /** Where the tooling home is kept. */
  private get homeFile(): string {
    return join(this.epics, `home${DataFile.SUFFIX}`)
  }

  ////////////////
  // ## Statics:  request.md, merging a standing epic
  ////////////////

  /**
   * A STANDING epic's phase, onto `main` at once (epic `epic-workflow`, Q8):  `epic merge <epic>`.
   * - `main`:  the repo's base branch, `baseBranch` in `.epic/config.json5` (`EpicConfig`)
   * - Run from ANYWHERE in the repo, the epic's own worktree included:  git runs in the MAIN checkout
   *   (`Git.mainRoot()`), where `main` is checked out.
   *   - Before epic `epic-engine` P12 it refused outside the main checkout, so the epic's session left its worktree
   *     (`ExitWorktree`) and came back (`EnterWorktree`):  Claude Code asked Owen to enter every time (r11).
   * - Fast-forward only, after the checks `/isolate done` makes (its "Finish", step 7):
   *   - this is the main checkout, on `main`
   *   - nothing uncommitted there (another session may work there), but for STRAY files (`StrayFiles`;  epic
   *     `epic-engine` I77):
   *     - generated ones (a test's snapshot, a repo's generated output) are moved aside
   *     - with `ditch`, up to `StrayFiles.ASK_LIMIT` others too:  only once Owen said so;  more is somebody's work
   *     - moved aside into `ditched` (`StrayFiles.folderFor()`), never deleted, and only once every check passed
   *   - branch `<epic>` holds all of `main`:  else `main` moved, and the branch merges it first
   *     (`epic worktree merge-main`, in its worktree)
   * - Returns the commits it brought onto `main`, oldest first (`[]`:  nothing to merge), and what it moved aside.
   * - throws an `EpicCommandError` saying what to do, for any check that fails:  then nothing moved, nothing merged
   * - static:  about the repo `cwd` is in, not the epics folder
   */
  static merge(
    epic: string,
    cwd = process.cwd(),
    { ditch = false, ditched = StrayFiles.folderFor(), label = "the main checkout" }: MergeOptions = {}
  ): MergeResult {
    const main = Git.mainRoot(cwd)
    const base = new EpicConfig(main).baseBranch
    const moved = Requests.mergeCheck(epic, main, { ditch, label }).ditch({ folder: ditched, ditch })
    const result: MergeResult = { base, commits: [], ditched: moved, ...(moved.length ? { ditchedTo: ditched } : {}) }
    const commits = Git.run(["log", "--reverse", "--oneline", `${base}..${epic}`], main)
      .out.split("\n")
      .filter(Boolean)
    if (!commits.length) return result
    const merged = Git.run(["merge", "--ff-only", epic], main)
    if (!merged.ok) throw new EpicCommandError(`merge:  git merge --ff-only ${epic} failed:\n${merged.err}`)
    return { ...result, commits }
  }

  /**
   * `merge()`'s checks on main checkout `main`, changing nothing:  its stray files, to move aside once all pass.
   * - throws an `EpicCommandError` naming the checkout (`label`) for a check that fails
   */
  private static mergeCheck(epic: string, main: string, { ditch, label }: { ditch: boolean; label: string }) {
    const base = new EpicConfig(main).baseBranch
    const branch = Git.run(["branch", "--show-current"], main).out
    if (branch !== base) throw new EpicCommandError(`merge:  ${label} is on '${branch}', not ${base}`)
    const stray = new StrayFiles(main)
    stray.check({ label, epic, ditch })
    if (!Git.run(["rev-parse", "--verify", "--quiet", `refs/heads/${epic}`], main).ok) {
      throw new EpicCommandError(`merge:  no branch '${epic}'`)
    }
    // an OLD-LAYOUT worktree (epic-engine's P49):  its child-repo branches' work isn't in the branch until it crosses
    const config = new EpicConfig(main)
    const worktree = config.worktreeFolder(epic)
    const said = config.leftBehindSaid(worktree, config.leftBehind(worktree))
    if (said) throw new EpicCommandError(`merge:  ${said};  nothing merged`)
    if (!Git.run(["merge-base", "--is-ancestor", base, epic], main).ok) {
      throw new EpicCommandError(
        `merge:  ${label}'s ${base} has moved since ${epic} last took it:  in its worktree, epic worktree merge-main, ` +
          "then again;  nothing merged"
      )
    }
    return stray
  }

  /**
   * `merge()` for every repo of a MULTI-REPO top (`EpicConfig.top`, epic `epic-engine` P10):  `{ repo, base, commits }`
   * each, in `repoCheckouts()` order, the top first;  a single repo:  `merge()`'s alone, no `repo`.
   * - run anywhere in the top or a child repo, their worktrees included:  each repo's own main checkout is merged into
   * - ONLY the repos whose branch `<epic>` has commits beyond their base branch:  a repo the epic never touched, or
   *   with no branch `<epic>`, is skipped
   * - EVERY repo checked before any moves (on its base branch, no stray file it may not move aside, the branch
   *   holding all of it):  one failing check throws, naming the repo, and nothing is moved aside or merged
   * - `ditch`:  `merge()`'s;  one folder of moved files for the whole run, a folder per repo in it
   */
  static mergeEach(epic: string, cwd = process.cwd(), { ditch = false }: MergeOptions = {}): MergeResult[] {
    const main = Git.mainRoot(cwd)
    const top = new EpicConfig(main).top
    if (!top) return [Requests.merge(epic, cwd, { ditch })]
    // an old-layout child checkout found inside (`found`):  `mergeCheck()` refuses it until it crosses over
    const repos = top.repoCheckouts(epic).flatMap(({ repo, main: checkout, found }) => {
      if (found) return []
      const base = new EpicConfig(checkout).baseBranch
      if (!Git.run(["rev-parse", "--verify", "--quiet", `refs/heads/${epic}`], checkout).ok) return []
      const ahead = Number(Git.run(["rev-list", "--count", `${base}..${epic}`], checkout).out || 0)
      return ahead ? [{ repo, checkout, label: `${repo}'s main checkout` }] : []
    })
    for (const { checkout, label } of repos) Requests.mergeCheck(epic, checkout, { ditch, label })
    const folder = StrayFiles.folderFor()
    return repos.map(({ repo, checkout, label }) => ({
      repo,
      ...Requests.merge(epic, checkout, { ditch, ditched: join(folder, repo), label })
    }))
  }

  /**
   * The commits `epic merge` just brought onto `main`, onto the epic's page (epic `epic-engine` I135):
   * each one whose subject names the epic or its ids (`PlanCommits.parseCommitSubject()`), under its phases and
   * items.
   * - `epic commits <epic> --backfill`, for only those commits (`--merged`):  every repo of a kit's, each
   *   `<epic-commit>` linking to its own repo's GitHub page;  one already listed isn't added again
   * - on the MAIN checkout's pages (the top's, for a kit), whose repos now hold every merged commit:  `cwd` is
   *   anywhere in it, a worktree or a child repo included
   * - nothing merged, or no epic page:  nothing to do
   * - best effort, NEVER throws:  a failure says so in one line, and the merge stands
   * - `record`:  runs the `epic` tool's command line on a checkout (default `EpicTools.runPlanDoc()`);  a test's
   *   gives its own
   */
  static async recordMerged(
    epic: string,
    merged: MergeResult[],
    { cwd = process.cwd(), record = EpicTools.runPlanDoc }: RecordMergedOptions = {}
  ): Promise<void> {
    try {
      const shas = merged.flatMap(({ commits }) => commits.map((line) => line.split(" ")[0]!)).filter(Boolean)
      if (!shas.length) return
      const main = Git.mainRoot(cwd)
      const root = new EpicConfig(main).top?.main ?? main
      if (!existsSync(join(EpicConfig.contentOf(root), "epics", epic, `${epic}.plan.html`))) return
      const exitCode = await record(["commits", epic, "--backfill", "--merged", shas.join(",")], root)
      if (exitCode !== EXIT.OK)
        CLI.out(`merged, but its commits aren't on the epic page:  epic commits ${epic} --backfill`)
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error)
      CLI.out(`merged, but its commits aren't on the epic page (${why}):  epic commits ${epic} --backfill`)
    }
  }

  /**
   * The next free request id in `dir`:  `r1`, then one more than the highest there.
   * - static:  any folder
   */
  static nextId(dir: string): string {
    if (!existsSync(dir)) return "r1"
    const numbers = readdirSync(dir)
      .map((name) => /^r(\d+)$/.exec(name)?.[1])
      .filter(Boolean)
      .map(Number)
    return `r${Math.max(0, ...numbers) + 1}`
  }

  /**
   * A request as the HTML its phase's Requests field shows (`epic file`):
   * his words quoted, the context, when it came, then each screenshot (a link to it full size).
   * - URLs are the epic page's:  `requests/r3/image-1.png`
   * - static:  pure
   */
  static html(request: EpicRequest): string {
    const folder = `requests/${request.id}`
    const paragraphs = request.text.split(/\n\s*\n/).map((it) => `<p>${escapeHTML(it.trim())}</p>`)
    const context = request.context ? [`<p>Looking at:  ${escapeHTML(request.context)}</p>`] : []
    const when = `<p>Sent ${escapeHTML(request.at.replace("T", " "))};  <a href="${folder}/request.md">request.md</a></p>`
    const images = request.images.map(
      (name, at) =>
        `<p><a href="${folder}/${name}"><img src="${folder}/${name}" alt="${request.id}, screenshot ${at + 1}" ` +
        `style="max-width: 100%" /></a></p>`
    )
    return [`<blockquote>${paragraphs.join("")}</blockquote>`, ...context, when, ...images].join("\n")
  }

  /**
   * A request as `request.md`:  a header of `key: value` lines between `---`, then the person's words, then the context.
   * - static:  pure
   *
   * ```md
   * ---
   * id: r3
   * epic: epic-workflow
   * from: 🚧 python
   * at: 2026-10-11T06:10-04:00
   * status: filed
   * filed: P7 · Comment Threads
   * phase: p-comment-threads
   * images: image-1.png
   * ---
   *
   * ## The person's words
   *
   * comment mechanism doesn't look right
   *
   * ## Context
   *
   * the epic page of epic python, P4's comment thread
   * ```
   */
  static markdown(request: EpicRequest): string {
    const header = [
      `id: ${request.id}`,
      `epic: ${request.epic}`,
      `from: ${request.from}`,
      `at: ${request.at}`,
      `status: ${request.status}`,
      ...(request.filed ? [`filed: ${request.filed}`] : []),
      ...(request.phase ? [`phase: ${request.phase}`] : []),
      ...(request.images.length ? [`images: ${request.images.join(", ")}`] : [])
    ]
    const context = request.context ? `\n## Context\n\n${request.context.trim()}\n` : ""
    return `---\n${header.join("\n")}\n---\n\n## The person's words\n\n${request.text.trim()}\n${context}`
  }

  /**
   * `markdown()`'s inverse.
   * - static:  pure
   */
  static parse(markdown: string): EpicRequest {
    const [, head = "", body = ""] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(markdown) ?? []
    const fields: Record<string, string | undefined> = Object.fromEntries(
      head.split("\n").map((line) => {
        const colon = line.indexOf(":")
        return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()]
      })
    )
    const [words = "", context] = body.split(/^## Context$/m)
    return {
      id: fields.id ?? "",
      epic: fields.epic ?? "",
      from: fields.from ?? "",
      at: fields.at ?? "",
      status: fields.status ?? "new",
      filed: fields.filed || undefined,
      phase: fields.phase || undefined,
      text: words.replace(/^\s*## (?:Owen|The person)'s words\s*/, "").trim(),
      context: context?.trim() || undefined,
      images: fields.images ? fields.images.split(/,\s*/) : []
    }
  }
}

/** What `new Requests()` takes:  see its constructor. */
export type RequestsProps = { root?: string; sessions?: Sessions }

/** `Requests.recordMerged()`'s options:  see it. */
export type RecordMergedOptions = { cwd?: string; record?: (argv: string[], root: string) => Promise<number> }

/** The verbs, for errors. */
const VERBS = "send, requests, file, home or merge"

/** How `file` is called, for its errors. */
const FILE_USAGE = 'epic file <epic>#P3 <request id>  |  epic file <epic> <request id> "where it went"'

/** A content block of a prompt, as a transcript holds it:  text, an image ... */
type PromptBlock = {
  type?: string
  source?: { type?: string; media_type?: string; data?: unknown }
}

/** File extensions for the image types a transcript holds. */
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp"
}

/** A phase as a filed request names it:  `P7 · Comment Threads`, its number its place today. */
function phaseTitle(phase: Element): string {
  return `${PhaseIds.labelOf(phase)} · ${PhaseIds.titleOf(phase)}`
}

/** One request, one line:  `r3  new    🚧 python (83d39e12)  comment mechanism doesn't look right`. */
function requestLine(request: EpicRequest): string {
  const status = request.filed ? `filed:  ${request.filed}` : request.status
  const words = request.text.replace(/\s+/g, " ")
  return `${request.id}  ${status}  ${request.from}  ${words.length > 60 ? `${words.slice(0, 59)}…` : words}`
}
