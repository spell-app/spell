import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { basename, join, relative } from "node:path"

import { clockTime, localDate } from "spell/util/time"
import { SRV } from "spell/server"
import { Git } from "spell/server/Git"
import { RealPath } from "spell/server/RealPath"
import { CLI } from "spell/cli"
import { ClaudeHome } from "spell/epic/config/ClaudeHome"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { SessionFolders } from "spell/epic/config/SessionFolders"
import { Transcript } from "spell/epic/config/Transcript"
import { epicStateFor } from "spell/epic/list/EpicState"

import {
  ENTRYPOINT_PLACES,
  EXIT,
  EpicCommandError,
  LOCAL_ENTRYPOINTS,
  TITLE_ICONS,
  bareTitle,
  parseVerbArgs,
  type LiveSession,
  type NamedSession,
  type RunningSession,
  type SessionSummary,
  type TranscriptDigest,
  type TranscriptFacts,
  type VerbArgs
} from "./command.types"
import { Stock } from "./Stock"
import { TranscriptIndex } from "./TranscriptIndex"
import { Worktrees } from "./Worktrees"

/****************
 * ### `Sessions`
 * `epic session <verb> ...`:  Claude Code sessions -- find, open, title, digest --
 * and what every other verb group reads of them.
 * The `/session`, `/wtf` and `/worktrees` skills use it.
 * - Where they are:  Claude Code's own folder (`home`:  `ClaudeHome.home()`), read through `ClaudeHome` and `Transcript`:
 *   - running ones:  its registry, `sessions/<pid>.json`
 *   - saved ones:  their transcripts, `projects/<slug>/<id>.jsonl`
 *   - titles waiting for a session's next prompt:  `session-titles/<id>`
 *   - what the transcripts name, for `find` (`named()`):  `spell-epic/transcript-index.json` (`TranscriptIndex`)
 * - The verbs (`run()`):
 *   - `list [<words>...] [--all] [--limit N]`:  this repo's saved sessions, newest first, matching every word
 *     - the main checkout, worktrees and package folders together;  this session left out
 *     - `--all`:  every project's
 *   - `find <name>`:  sessions titled `<name>` or that worked in worktree `<name>`, any project, newest first
 *   - `open <id prefix | exact title>`:  opens it in the VS Code Claude panel,
 *     in the window it RUNS in, else this session's window (the extension's URI handler, routed by `windowId`)
 *   - `title [<title>] [--force]`:  THIS session (`CLAUDE_CODE_SESSION_ID`)
 *     - alone:  its title (`*` named by hand) and any queued one
 *     - with a title:  queues it for the next prompt, unless its tab shows it already (`shownTitle()`)
 *     - `--force`:  queues it whatever the tab seems to show:  "Continue" after a handoff, a resume
 *   - `done [<name>]`:  mark finished work's sessions `✅ <title>`
 *     - alone:  THIS session
 *     - with a name:  every session titled `<name>` or that worked in worktree `<name>`
 *     - applied on each one's next prompt or resume (a hook applies a queued title:  nothing else can)
 *     - reopening the work takes the ✅ off (`PromptGate`)
 *   - `icons [--dry-run]`:  queues, for every named session of this repo,
 *     the icon its work's state calls for (`workIcon()`)
 *   - `window [pid]`:  the VS Code window id a process runs in (default this session's)
 *   - `transcript <id prefix>`:  another session's prompts, last reply and waiting question
 *   - `listen [--json] [--monitor <pid>]`:  ONE look at THIS session's epic page for it (`InboxMonitor`):  takes the
 *     listener's place, says what's waiting;  the session's inbox poller (`InboxPoller`:  the plugin's `Stop` hook in
 *     every session, its monitor in a terminal one) runs it as files change, `--json`, its own pid as `--monitor`,
 *     which holds the place while it runs
 *   - `--json` (`list`, `find`, `transcript`):  the data instead of lines
 * - Node built-ins, the repo's config and the kit's command base:  no spell.
 * - Was `session.py` and `transcript.py`.
 ****************/
export class Sessions {
  /** Claude Code's own folder:  STATIC for the object's life;  a test that needs another builds another object */
  readonly home: string

  /** - `home`:  default `ClaudeHome.home()` */
  constructor({ home = ClaudeHome.home() }: SessionsProps = {}) {
    this.home = home
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** Run `epic session <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, SWITCHES)
    const [verb = "list", ...rest] = positional
    switch (verb) {
      case "list":
        return this.list(rest, flags)
      case "find":
        return this.find(rest.join(" "), flags)
      case "open":
        return this.open(rest.join(" ").trim())
      case "title":
        return this.titleThis(rest.join(" ").trim(), Boolean(flags.force))
      case "done":
        return this.markDone(rest.join(" ").trim())
      case "icons":
        return this.refreshIcons(Boolean(flags.dryRun))
      case "window": {
        const window = Sessions.windowOf(rest[0] ? Number(rest[0]) : Sessions.thisPid())
        CLI.out(String(window ?? "none"))
        return window === undefined ? EXIT.ERRORS : EXIT.OK
      }
      case "transcript":
        return this.showTranscript(rest[0], flags)
      case "listen": {
        // loaded here:  the epic tool's review inbox, which no other verb needs
        const { InboxMonitor } = await import("spell/epic/tool/InboxMonitor")
        const monitor = Number(flags.monitor) || undefined
        const check = new InboxMonitor({ sessions: this }).check({ monitor })
        if (flags.json) CLI.out(JSON.stringify(check))
        else
          CLI.out(
            check.notice ?? (check.epic ? `listening to ${check.epic}:  nothing waiting` : "no epic to listen to")
          )
        return EXIT.OK
      }
      default:
        throw new EpicCommandError(
          `unknown verb '${verb}':  list, find, open, title, done, icons, window, transcript or listen`
        )
    }
  }

  /** `list`:  one line per session:  id, last active, running or saved, title (`*` = named by hand), folder. */
  private list(words: string[], flags: VerbArgs["flags"]): number {
    const limit = Number(flags.limit ?? 15)
    const wanted = words.map((word) => word.toLowerCase())
    const live = this.running()
    const me = process.env.CLAUDE_CODE_SESSION_ID
    const root = Git.mainRoot()
    const shown = this.saved({ everywhere: Boolean(flags.all) })
      .filter((it) => it.id !== me)
      .filter((it) => {
        const hay = `${it.id} ${it.title} ${it.prompt}`.toLowerCase()
        return wanted.every((word) => hay.includes(word))
      })
      .slice(0, limit)
    if (flags.json) {
      const listed = shown.map((it) => ({ ...it, running: live.get(it.id) ?? null }))
      CLI.out(JSON.stringify(listed, null, 2))
      return EXIT.OK
    }
    for (const it of shown) {
      const record = live.get(it.id)
      const status = record
        ? `running (${record.status ?? "?"}, ${ENTRYPOINT_PLACES[record.entrypoint ?? ""] ?? "?"})`
        : "saved"
      const where = it.cwd ? relative(root, it.cwd) || "." : "?"
      const title = `${it.named ? "*" : " "}${it.title.slice(0, 60).padEnd(61)}`
      CLI.out(`${it.id.slice(0, 8)}  ${stamp(it.last)}  ${status.padEnd(28)}  ${title}  ${where}`)
    }
    if (!shown.length) CLI.out("no matching sessions")
    return EXIT.OK
  }

  /** `find <name>`:  the sessions titled `name` or that worked in worktree `name`. */
  private find(name: string, flags: VerbArgs["flags"]): number {
    if (!name) throw new EpicCommandError("find:  which name?")
    const found = this.named(name)
    if (flags.json) CLI.out(JSON.stringify(found, null, 2))
    else {
      for (const it of found)
        CLI.out(`${it.id.slice(0, 8)}  ${it.title.padEnd(24)}  ${it.last.slice(0, 16)}  ${it.cwd ?? ""}`)
      if (!found.length) CLI.out(`no session named or in worktree ${name}`)
    }
    return EXIT.OK
  }

  /**
   * `open <key>`:  open the one session whose id starts with `key` (else whose title is exactly `key`).
   * - one transcript copied into two project folders is one session
   * - a session running in a terminal or Desktop is refused:  the panel can't take it over
   */
  private open(key: string): number {
    if (!key) throw new EpicCommandError("open:  which session?")
    const every = this.saved({ everywhere: true })
    const byId = every.filter((it) => it.id.startsWith(key))
    const matched = byId.length ? byId : every.filter((it) => it.title === key || bareTitle(it.title) === key)
    const hits = [...new Map(matched.map((it) => [it.id, it])).values()]
    if (hits.length !== 1)
      throw new EpicCommandError(`open:  ${hits.length} sessions match '${key}';  pass more of the id`, EXIT.ERRORS)
    const [hit] = hits as [SessionSummary]
    const live = this.running().get(hit.id)
    if (live && live.entrypoint !== "claude-vscode") {
      const place = ENTRYPOINT_PLACES[live.entrypoint ?? ""] ?? "?"
      throw new EpicCommandError(`open:  ${hit.id.slice(0, 8)} is running in the ${place}, not VS Code`, EXIT.ERRORS)
    }
    const target = Sessions.windowOf(live ? live.pid : Sessions.thisPid())
    const url = `vscode://anthropic.claude-code/open?session=${hit.id}${target === undefined ? "" : `&windowId=${target}`}`
    const run = SRV.Processes.run("code", ["--open-url", url], { stdio: "inherit" })
    if (run.status !== 0) throw new EpicCommandError("open:  `code --open-url` failed", EXIT.ERRORS)
    CLI.out(`opened ${hit.id.slice(0, 8)} "${hit.title}" in window ${target ?? "?"}${live ? " (where it runs)" : ""}`)
    return EXIT.OK
  }

  /**
   * `title [<title>]`:  show THIS session's title, or queue a new one unless its tab shows it already.
   * - "shows":  `shownTitle()`, NOT its last `custom-title`:  Claude Code's own title (`ai-title`) written after it
   *   may be what the tab shows (epic `epic-engine` r2)
   * - `force`:  queue it all the same
   */
  private titleThis(title: string, force = false): number {
    const me = process.env.CLAUDE_CODE_SESSION_ID
    if (!me) throw new EpicCommandError("title:  needs CLAUDE_CODE_SESSION_ID")
    const transcript = this.transcriptOf(me)
    const summary = transcript ? this.summarize(transcript) : undefined
    const current = summary?.title ?? null
    const shown = this.shownTitle(me)
    const queued = this.queuedTitle(me)
    if (!title) {
      const tab = shown && shown !== current ? `  (its tab may show "${shown}")` : ""
      CLI.out(`${summary?.named ? "*" : " "}${current ?? "?"}${tab}${queued ? `  (queued:  ${queued})` : ""}`)
      return EXIT.OK
    }
    // so skills can call it on every resume / phase start:  "check, rename if needed" is one command
    if (!force && (queued === title || (shown === title && queued === null))) {
      CLI.out(`${me.slice(0, 8)} is already "${title}"${queued ? " (queued)" : ""}:  nothing to do`)
      return EXIT.OK
    }
    this.queueTitle(me, title)
    CLI.out(`queued "${title}" for ${me.slice(0, 8)} (was "${shown ?? current ?? "?"}"):  applied on the next prompt`)
    return EXIT.OK
  }

  /**
   * `done [<name>]`:  queue `✅ <title>` for this session, or for every session of `name` (`named()`).
   * - one whose tab shows ✅ already (`shownTitle()`), or with a ✅ queued, is left
   */
  private markDone(name: string): number {
    const me = process.env.CLAUDE_CODE_SESSION_ID
    if (!name && !me) throw new EpicCommandError("done:  needs a name, or CLAUDE_CODE_SESSION_ID")
    const targets = name
      ? this.named(name).map((it) => ({ id: it.id, title: it.title }))
      : [{ id: me!, title: this.currentTitle(me!) ?? "" }]
    if (!targets.length) CLI.out(`no session named or in worktree ${name}`)
    for (const { id, title } of targets) {
      // its work's name:  the title without its icon (🚧, 📅 or an older ✅);  the queued one first, it's newer
      const queued = this.queuedTitle(id)
      const bare = bareTitle(queued ?? title) || name
      const done = `${TITLE_ICONS.done} ${bare}`
      if ((queued ?? this.shownTitle(id)) === done) {
        CLI.out(`${id.slice(0, 8)} is already done:  "${done}"`)
        continue
      }
      this.queueTitle(id, done)
      CLI.out(`queued "${done}" for ${id.slice(0, 8)}:  applied on its next prompt or resume`)
    }
    return EXIT.OK
  }

  /**
   * `icons`:  queue the icon each named session's work calls for (`workIcon()`),
   * when the title its tab shows (`shownTitle()`), or the one queued, isn't that already.
   * - says what it did, or (`dryRun`) would do
   * - a session's work:  its title without its icon (`bareTitle()`);  sessions of one name are looked up once
   * - a name with no worktree, branch or epic page (a session titled "SVG from image") is left as it is
   */
  private refreshIcons(dryRun: boolean): number {
    const byName = new Map<string, SessionSummary[]>()
    for (const it of this.saved()) {
      if (!it.named) continue
      const name = bareTitle(this.queuedTitle(it.id) ?? it.title)
      byName.set(name, [...(byName.get(name) ?? []), it])
    }
    let queued = 0
    const live = this.running()
    for (const [name, sessions] of [...byName].sort(([a], [b]) => a.localeCompare(b))) {
      const icon = this.workIcon(
        name,
        sessions.map((it) => it.id)
      )
      if (!icon) continue
      const wanted = `${icon} ${name}`
      for (const it of sessions) {
        const now = this.queuedTitle(it.id) ?? this.shownTitle(it.id, live) ?? it.title
        if (now === wanted) continue
        if (!dryRun) this.queueTitle(it.id, wanted)
        queued++
        CLI.out(`${dryRun ? "would queue" : "queued"} "${wanted}" for ${it.id.slice(0, 8)} (now "${now}")`)
      }
    }
    CLI.out(
      queued
        ? `${queued} session${queued === 1 ? "" : "s"}${dryRun ? " to retitle" : " retitled"}:  each shows on its next prompt or resume`
        : "every named session already has its icon"
    )
    return EXIT.OK
  }

  /**
   * The icon work `name`'s state calls for (`TITLE_ICONS`),
   * from its worktree, branch and epic page (`Worktrees.nameStatus()`).
   * - `null` when `name` isn't work this repo knows
   * - with an epic page, its epic's state (`spell/epic/list/EpicState`;  a session of it running counts as touched):
   *   📅 future, 🚧 in progress, 🚨 errors (every phase done, items need Owen), ⏸️ paused (untouched for days)
   * - ✅ finished:  its branch merged into `main`, or every phase of its plan done with nothing left to merge
   * - 🚧 under way:  a worktree, a branch with commits `main` lacks, or a plan done that waits to merge
   */
  private workIcon(name: string, ids: string[]): string | null {
    const worktrees = new Worktrees({ sessions: this })
    const status = worktrees.nameStatus(name, ids)
    if (!status.worktree && !status.branch && !status.plan) return null
    const file = status.plan && worktrees.planFile(name, status.worktree ?? "")
    const plan = file ? Worktrees.planFacts(file) : null
    const state = plan && epicStateFor({ ...plan, running: status.sessions.some((it) => it.running) }).name
    if (state === "future") return TITLE_ICONS.future
    if (state === "errors") return TITLE_ICONS.errors
    if (state === "paused") return TITLE_ICONS.paused
    if (state === "progress" && plan?.phases.length) return TITLE_ICONS.active
    // a plan all done whose branch still has commits `main` lacks isn't finished:  it waits to merge
    if (status.finished && status.ahead === 0) return TITLE_ICONS.done
    return TITLE_ICONS.active
  }

  /**
   * The title session `id`'s tab shows (`SessionFolders.shownTitle()`), its registry record found in `live`;  `null`
   * for none.  Not `title()`, its name to find it by.
   */
  shownTitle(id: string, live = this.running()): string | null {
    return SessionFolders.shownTitle(id, this.home, live.get(id))
  }

  /** Session `id`'s title from its transcript, or `null`. */
  private currentTitle(id: string): string | null {
    const transcript = this.transcriptOf(id)
    return (transcript && this.summarize(transcript)?.title) ?? null
  }

  /** `transcript <id prefix>`:  the digest, as markdown (or JSON). */
  private showTranscript(id: string | undefined, flags: VerbArgs["flags"]): number {
    if (!id) throw new EpicCommandError("transcript:  which session id?")
    const digest = this.digest(id)
    if (!digest) throw new EpicCommandError(`no transcript for ${id}`, EXIT.ERRORS)
    if (flags.json) {
      CLI.out(JSON.stringify(digest, null, 2))
      return EXIT.OK
    }
    CLI.out(`transcript:  ${digest.path}\n\n## The person's prompts\n\n`)
    for (const { when, text } of digest.prompts) CLI.out(`- ${when}  ${cut(text, PROMPT_LIMIT)}`)
    CLI.out(`\n## Last reply\n\n${cut(digest.lastReply ?? "(none)", REPLY_LIMIT)}`)
    if (digest.pending?.length) {
      CLI.out("\n## Waiting for an answer\n\n")
      for (const question of digest.pending) {
        CLI.out(`- ${question.question ?? ""}`)
        for (const option of question.options ?? []) CLI.out(`  - ${option.label ?? ""}:  ${option.description ?? ""}`)
      }
    }
    return EXIT.OK
  }

  ////////////////
  // ## Running sessions
  ////////////////

  /**
   * The live sessions, by session id:  each registry record whose process is alive (`ClaudeHome.liveSessions()`).
   * - a record whose `pid` is gone is a session that ended without cleaning up:  skipped
   */
  running(): Map<string, RunningSession> {
    const live = ClaudeHome.liveSessions({ home: this.home, isAlive: SRV.isProcessAlive })
    return new Map(live.map((record) => [record.sessionId, record]))
  }

  /**
   * Every running session on the machine, as `/worktrees` sees it -- see `LiveSession`.
   * - `main`:  the repo whose sessions are `inRepo`
   */
  live(main = Git.mainRoot()): LiveSession[] {
    const mine = Sessions.ancestorPids()
    const found: LiveSession[] = []
    for (const record of this.running().values()) {
      const transcript = this.transcriptOf(record.sessionId)
      const mtime = transcript ? statSync(transcript).mtimeMs : (record.updatedAt ?? 0)
      const tail = transcript ? new Transcript(transcript).tail(512_000) : ""
      const cwd = [...tail.matchAll(/"cwd":"([^"]*)"/g)].at(-1)?.[1] || record.cwd || ""
      const silent = Math.floor((Date.now() - mtime) / 60_000)
      const state = record.status ?? "?"
      const asked = Transcript.pendingQuestion(tail)
      const place =
        cwd && existsSync(cwd) ? Worktrees.checkoutOf(cwd) : { label: "(not in git)", branch: "", inside: cwd }
      found.push({
        id: record.sessionId,
        name: this.title(record.sessionId) || record.name || record.sessionId.slice(0, 8),
        agent: record.name ?? null,
        pid: record.pid,
        cwd,
        // a session started before a move behind a compat link keeps the old spelling (epic `epic-engine` I59)
        inRepo: RealPath.isIn(cwd, main),
        where: ENTRYPOINT_PLACES[record.entrypoint ?? ""] ?? record.entrypoint ?? null,
        checkout: place.label,
        branch: place.branch,
        folder: place.inside,
        state: state === "busy" && silent >= Stock.SILENT_MINUTES ? "hung" : state,
        waitingFor: record.waitingFor ?? null,
        lastActive: Stock.iso(mtime),
        silentMin: silent,
        question: asked ? (asked.questions[0]?.question ?? "?") : null,
        questionMin: asked ? Stock.minutesSince(asked.at as string) : 0,
        this: mine.has(record.pid),
        used: !!transcript
      })
    }
    return found
  }

  /**
   * The running sessions working on `epic`:
   * titled `<epic>`, with or without its icon (`🚧 epic-workflow`), as its tab shows it.
   * - the title:  its registry `name`, or its transcript's when Claude Code made that up for a resumed session
   *   (`SessionFolders.recordTitle()`;  epic `epic-engine` I50:  `/send` told nobody, and opened a second window)
   * - their `name` is the address `SendMessage` takes
   */
  ofEpic(epic: string): RunningSession[] {
    return [...this.running().values()].filter(
      (session) => bareTitle(SessionFolders.recordTitle(session, this.home)) === epic
    )
  }

  ////////////////
  // ## Saved sessions
  ////////////////

  /**
   * The saved LOCAL sessions of the repo holding `cwd`, newest first.
   * - this repo:  transcript folders named for its main checkout (`projectSlug(mainRoot)`),
   *   or starting with that plus `-`:  worktrees and package folders share the prefix
   * - `everywhere`:  every project's sessions
   * - web, cloud and SDK sessions are left out:  only `LOCAL_ENTRYPOINTS` (or none recorded)
   */
  saved(options: { everywhere?: boolean; cwd?: string } = {}): SessionSummary[] {
    const prefix = Sessions.projectSlug(Git.mainRoot(options.cwd))
    const projects = ClaudeHome.projects(this.home)
    const found: SessionSummary[] = []
    // each real folder once:  a linked worktree's folder (epic `epic-eject` Q4) IS main's
    for (const dir of ClaudeHome.projectFolders(projects)) {
      if (!options.everywhere && dir !== prefix && !dir.startsWith(`${prefix}-`)) continue
      const folder = join(projects, dir)
      for (const name of readdirSync(folder)) {
        if (!name.endsWith(".jsonl")) continue
        const summary = this.summarize(join(folder, name))
        if (summary && (summary.entrypoint === null || LOCAL_ENTRYPOINTS.has(summary.entrypoint))) found.push(summary)
      }
    }
    return found.sort((a, b) => b.last - a.last)
  }

  /**
   * One transcript, summarized;  `undefined` when it has no prompt and no title.
   * - parses only the few lines that matter (titles, the first user entries), so 10MB transcripts stay fast
   * - `cwd`:  the last `"cwd"` in the transcript's final 256KB
   * - a `<id>/custom-title.json` sidecar beats the transcript's own `custom-title`
   */
  summarize(path: string): SessionSummary | undefined {
    let custom: string | null = null
    let ai: string | null = null
    let prompt: string | null = null
    let entrypoint: string | null = null
    let cwd: string | null = null
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (line.includes('"custom-title"') || line.includes('"ai-title"')) {
        const entry = Transcript.parseLine(line)
        custom = (entry.customTitle as string) || custom
        ai = (entry.aiTitle as string) || ai
      } else if ((entrypoint === null || prompt === null) && line.includes('"type":"user"')) {
        const entry = Transcript.parseLine(line)
        entrypoint ??= (entry.entrypoint as string) ?? null
        cwd ??= (entry.cwd as string) ?? null
        prompt ??= Sessions.entryPrompt(entry)
      }
    }
    const moved = [...new Transcript(path).tail(256_000).matchAll(/"cwd":"([^"]*)"/g)]
    if (moved.length) cwd = moved.at(-1)![1]!
    const sidecar = join(path.replace(/\.jsonl$/, ""), "custom-title.json")
    if (existsSync(sidecar)) custom = (readJSON(sidecar).customTitle as string) || custom
    if (!prompt && !custom && !ai) return undefined
    return {
      id: basename(path, ".jsonl"),
      title: custom || ai || prompt!.slice(0, 60),
      named: !!custom,
      prompt,
      entrypoint,
      cwd,
      last: statSync(path).mtimeMs
    }
  }

  /**
   * The sessions titled `name` (`/rename`) or that worked in worktree `name`, newest first.
   * - running or not, any project
   * - used by `epic session find`, and by worktree / park status
   * - a transcript that can't match isn't read:  what each one names comes from the `TranscriptIndex`, which scans a
   *   transcript again only when it has changed since the last run
   * - SIDE EFFECT:  saves the index, `<home>/spell-epic/transcript-index.json`
   */
  named(name: string): NamedSession[] {
    // a `cwd` in worktree `name`:  the worktrees folder from the repo's `.epic/config.json5`
    const config = EpicConfig.of(Git.mainRoot())
    // each distinct `cwd` asked ONCE (epic `epic-engine` I67):  the transcripts' many thousand lines name a few
    // hundred folders, and each ask resolves real paths on disk
    const worktrees = new Map<string, string | undefined>()
    const worktreeOf = (cwd: string) => {
      if (!worktrees.has(cwd)) worktrees.set(cwd, config.worktreeNameOf(cwd))
      return worktrees.get(cwd)
    }
    const index = new TranscriptIndex({ file: join(this.home, TRANSCRIPT_INDEX) })
    const found: NamedSession[] = []
    for (const path of ClaudeHome.transcripts(this.home)) {
      let title: string | null = null
      let cwd: string | null = null
      let last = ""
      let inWorktree = false
      if (!Sessions.mayBeNamed(index.factsOf(path), name, worktreeOf)) continue
      for (const line of readFileSync(path, "utf8").split("\n")) {
        // cheap pre-check:  most lines are neither
        if (!line.includes('"custom-title"') && !line.includes('"cwd"')) continue
        const entry = Transcript.parseLine(line)
        if (entry.type === "custom-title") title = (entry.customTitle as string) ?? null
        if (typeof entry.cwd === "string" && entry.cwd) {
          cwd = entry.cwd
          last = (entry.timestamp as string) ?? last
          inWorktree ||= worktreeOf(cwd) === name
        }
      }
      // titled `<name>`, with or without its icon (`🚧 <name>`, `✅ <name>`:  `bareTitle()`)
      const titled = title !== null && bareTitle(title) === name
      if (titled || inWorktree) found.push({ id: basename(path, ".jsonl"), title: title ?? "-", last, cwd })
    }
    index.save()
    return found.sort((a, b) => b.last.localeCompare(a.last) || b.id.localeCompare(a.id))
  }

  /**
   * Whether a transcript with `facts` MAY be titled `name` or have worked in its worktree (`worktreeOf()`)
   * (epic `epic-engine` I67)
   * - `false`:  `named()` skips it without reading a line;  most transcripts, and parsing them all took seconds
   * - every title and folder the transcript holds, anywhere in it:  so never `false` for one `named()` would find
   */
  static mayBeNamed(facts: TranscriptFacts, name: string, worktreeOf: (cwd: string) => string | undefined): boolean {
    return facts.titles.some((title) => bareTitle(title) === name) || facts.cwds.some((cwd) => worktreeOf(cwd) === name)
  }

  /**
   * The transcript of session `id`, in any project folder (`ClaudeHome.transcriptOf()`);  `undefined` when there's
   * none.
   * - one session's transcript can sit in two folders (copied when it moved):  the newest wins
   */
  transcriptOf(id: string): string | undefined {
    return ClaudeHome.transcriptOf(id, this.home)
  }

  /**
   * Session `id`'s title:  its last `custom-title`, else its last `ai-title` (`Transcript.titles()`);  `null` when it
   * has neither.
   * - the same rule as the handoff hook (`hooks/handoff.mjs`), which finds a session's tab by them
   * - whether its tab SHOWS a title, to title it again or not:  `shownTitle()`
   */
  title(id: string): string | null {
    const path = this.transcriptOf(id)
    if (!path) return null
    const { custom, ai } = new Transcript(path).titles()
    return custom || ai || null
  }

  /**
   * What another session has been doing, from its transcript:  for `/wtf <name>`.
   * - `idPrefix`:  a session id, or its first characters;  the newest matching transcript wins
   * - prompts:  what Owen typed, oldest first
   *   - slash commands as `/name args`
   *   - tool results, hook output and reminders dropped;  sidechains (subagents) skipped
   * - `lastReply`:  the session's last reply text
   * - `pending`:  an `AskUserQuestion` no answer has come back for yet
   * - returns `undefined` when no transcript matches
   */
  digest(idPrefix: string): TranscriptDigest | undefined {
    const paths = ClaudeHome.transcripts(this.home).filter((path) => basename(path).startsWith(idPrefix))
    if (!paths.length) return undefined
    const path = paths.reduce((newest, it) => (statSync(it).mtimeMs > statSync(newest).mtimeMs ? it : newest))
    const text = readFileSync(path, "utf8")
    // the question waiting:  any answer clears it
    const digest: TranscriptDigest = {
      path,
      prompts: [],
      lastReply: null,
      pending: Transcript.pendingQuestion(text)?.questions ?? null
    }
    for (const line of text.split("\n")) {
      const entry = Transcript.parseLine(line)
      if (entry.isSidechain || (entry.type !== "user" && entry.type !== "assistant")) continue
      for (const block of Transcript.blocksOf(entry.message)) {
        if (block.type !== "text") continue
        if (entry.type === "assistant") {
          if (String(block.text ?? "").trim()) digest.lastReply = block.text!.trim()
          continue
        }
        const prompt = Sessions.promptText(block.text ?? "")
        const when = typeof entry.timestamp === "string" ? entry.timestamp.slice(0, 16) : ""
        if (prompt) digest.prompts.push({ when, text: prompt })
      }
    }
    return digest
  }

  ////////////////
  // ## Titles
  ////////////////

  /**
   * Queue `title` for session `id`:  `session-titles/<id>` in Claude Code's folder.
   * - Claude can't run `/rename`:
   *   the `UserPromptSubmit` hook `~/.claude/hooks/session-title.mjs` returns the file as `sessionTitle`
   *   on the session's NEXT prompt, then deletes it (undocumented, found in CLI 2.1.287)
   */
  queueTitle(id: string, title: string): void {
    const titles = ClaudeHome.titlesFolder(this.home)
    mkdirSync(titles, { recursive: true })
    writeFileSync(join(titles, id), title)
  }

  /** The title queued for session `id`'s next prompt (`queueTitle()`), or `null`. */
  queuedTitle(id: string): string | null {
    const file = join(ClaudeHome.titlesFolder(this.home), id)
    return existsSync(file) ? readFileSync(file, "utf8").trim() : null
  }

  ////////////////
  // ## Statics:  processes, transcript lines
  ////////////////

  /**
   * The pids above this process, so the session that ran us can be told apart (or left out).
   * - static:  this process's, whatever the folder
   */
  static ancestorPids(): Set<number> {
    const parents = SRV.Processes.parents()
    const pids = new Set<number>()
    for (let pid = process.ppid; pid > 1 && !pids.has(pid); pid = parents.get(pid) ?? 0) pids.add(pid)
    return pids
  }

  /**
   * The VS Code window id hosting process `pid` (or an ancestor), or `undefined`.
   * - the extension host above a Claude panel session keeps log files open under `.../logs/<stamp>/window<n>/exthost/`
   * - walks up the parents until one has them (`SRV.Processes`)
   * - Windows:  a process's open files can't be told there, so `undefined`:  the URL opens in the last window
   * - static:  about processes, not Claude's folder
   */
  static windowOf(pid: number): number | undefined {
    const parents = SRV.Processes.parents()
    const seen = new Set<number>()
    for (let at = pid; at > 1 && !seen.has(at); at = parents.get(at) ?? 0) {
      seen.add(at)
      const files = SRV.Processes.openFiles(at).join("\n")
      const match = /[\\/]logs[\\/][^\\/]+[\\/]window(\d+)[\\/]exthost[\\/]/.exec(files)
      if (match) return Number(match[1])
    }
    return undefined
  }

  /**
   * This session's process, to find its window from:  `CLAUDE_PID`, else our parent.
   * - our parent may be a shell or `yarn`, not `claude`:  `windowOf()` walks up past them
   * - static:  this process's
   */
  static thisPid(): number {
    return Number(process.env.CLAUDE_PID) || process.ppid
  }

  /**
   * A folder's name under `~/.claude/projects`:  every character but a letter or digit becomes `-`.
   * - static:  pure
   */
  static projectSlug(path: string): string {
    return path.replace(/[^A-Za-z0-9]/g, "-")
  }

  /**
   * What Owen typed, from a transcript `user` entry;  `null` for tool results and harness text.
   * - `isMeta` entries are the harness's
   * - static:  pure
   */
  static entryPrompt(entry: Record<string, unknown>): string | null {
    if (entry.isMeta) return null
    let content = (entry.message as { content?: unknown } | undefined)?.content
    if (Array.isArray(content)) {
      content = content
        .filter((block) => block?.type === "text")
        .map((block) => block.text ?? "")
        .join(" ")
    }
    const text = typeof content === "string" ? Sessions.promptText(content) : null
    return text && collapse(text)
  }

  /**
   * A typed prompt from a message's text, trimmed (line breaks kept);  `null` for harness noise.
   * - a slash command counts, as `/name args`:  a session started by `/clear` + `/epic` has no other prompt
   * - reminders and IDE context (`<system-reminder>`, `<ide_selection>`, `<ide_opened_file>`) are dropped
   * - what's left starting with `<` is not a prompt, nor are the harness's own messages:
   *   - a skill's instructions ("Base directory for this skill:")
   *   - another session's message ("Another Claude session sent a message:"), e.g. a subagent's report
   * - `entryPrompt()` collapses the result to one line, for summaries
   * - static:  pure
   */
  static promptText(text: string): string | null {
    const command = /<command-name>(.*?)<\/command-name>/s.exec(text)
    if (command) {
      const args = /<command-args>(.*?)<\/command-args>/s.exec(text)
      return `${command[1]} ${args ? args[1]!.trim() : ""}`.trim() || null
    }
    const left = text.replace(/<(system-reminder|ide_selection|ide_opened_file)>.*?<\/\1>/gs, "").trim()
    if (!left || left.startsWith("<") || HARNESS_MESSAGES.some((start) => left.startsWith(start))) return null
    return left
  }
}

/** What `new Sessions()` takes. */
export type SessionsProps = {
  /** Claude Code's own folder;  default `ClaudeHome.home()` */
  home?: string
}

/** The `TranscriptIndex`'s file, in Claude Code's folder (`Sessions.home`). */
const TRANSCRIPT_INDEX = join("spell-epic", "transcript-index.json")

/** The flags of `epic session` that take no value. */
const SWITCHES = ["all", "json", "dryRun", "force"]

/** Longest prompt and reply a transcript digest prints, in characters. */
const PROMPT_LIMIT = 800
const REPLY_LIMIT = 3000

/** How the harness's own `user` messages start:  never prompts. */
const HARNESS_MESSAGES = ["Base directory for this skill:", "Another Claude session sent a message:"]

/** A JSON file, or `{}`:  `Transcript.parseLine()` of its text. */
function readJSON(path: string): Record<string, unknown> {
  try {
    return Transcript.parseLine(readFileSync(path, "utf8"))
  } catch {
    return {}
  }
}

/** `text` with every run of whitespace one space, trimmed. */
function collapse(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(" ")
}


/** `ms` as local `MM-DD HH:MM`. */
function stamp(ms: number): string {
  const date = new Date(ms)
  return `${localDate(date).slice(5)} ${clockTime(date)}`
}

/** `text` cut to `limit` characters, marked when cut. */
function cut(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)} [...]`
}
