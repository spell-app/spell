import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { delimiter, dirname, join } from "node:path"

import { after } from "spell/util/timing"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"

import { EXIT, EpicCommandError, STAGED_DEMO, parseVerbArgs, stringFlag } from "./command.types"
import { EpicCheckout } from "./EpicCheckout"
import { EpicTools } from "./EpicTools"
import { Worktrees } from "./Worktrees"

/****************
 * ### `StagedDemo`
 * The STAGED DEMO (epic `epic-engine` P77):  `/epic demo` drives the REAL epic page and tools from pre-written text,
 * so a room watching never waits for Claude to think.
 * - Owen, 2026-11-18:  "I want to pre-seed an epic so that I can do a 'realistic' demo without people waiting for you
 *   to think ... At the end of the demo, we'll clear the epic so we can run through it again".
 * - The text is the STEP FILES, one per step, in the epic folder (`STAGED_DEMO.folder`):  `00-paste.md` what Owen
 *   pastes, then `01-analysis.md` ... `07-while-you-were-out.md`, each with its commands and what Claude says;  and
 *   `silly-lines.txt`, the working lines shown while it "thinks".
 *   - In the epic folder, not the code:  Owen rewrites them between runs, and every checkout sees the change at once.
 * - Only the thinking is faked:  each step's commands are the real `epic` verbs (`create`, `add`, `add-phase`,
 *   `phase`, `inbox apply` ...), run in the MAIN checkout, so the demo epic is `main`'s, with no worktree.
 * - The verbs (`epic demo <verb>`):
 *   - `check`:  the step files are there, and nothing of an earlier run is left;  exit 1 naming what's wrong
 *   - `run <step>`:  a step's `sh` block, then what Claude says (its "Say" section)
 *   - `lines [n]`, `pause [seconds]`:  the working lines, and the wait between them (a foreground `sleep` is refused
 *     in Claude Code)
 *   - `wait`:  `epic inbox wait demo`, letting a pressed Accept go at once rather than after its 5 minutes, then
 *     `epic inbox apply demo`, and the step to run next
 *   - `next`:  which step comes next, read from the page
 *   - `overview <step>`:  the step file's `html` blocks become the Overview (hand-written prose, which no verb writes)
 *   - `seen`:  "0. While you were out" read, so it counts from now
 *   - `reset [--dry-run]`:  the demo epic and everything it made, gone;  never another epic's
 * - Its position:  a verb group's class (`command/`), on the `epic` tool's files (`PlanDocFiles`, `ReviewInbox`);
 *   the prompt gate knows the demo only by `STAGED_DEMO` (plain `node`), never by this file.
 ****************/
export class StagedDemo {
  /** the checkout the command runs in (a worktree, or main) */
  readonly root: string

  constructor({ root = EpicCheckout.nearest() }: { root?: string } = {}) {
    this.root = root
  }

  /** the repo's epic settings */
  get config(): EpicConfig {
    return EpicConfig.of(this.root)
  }

  /** the MAIN checkout:  where the demo epic's commands run, so it's `main`'s and makes no worktree */
  get main(): string {
    return this.config.main
  }

  /** the epic folder */
  get content(): string {
    return this.config.contentFolder
  }

  /** the step files' folder */
  get folder(): string {
    return join(this.content, STAGED_DEMO.folder)
  }

  /** the demo epic's folder:  page, parts, inbox, pictures */
  get epicFolder(): string {
    return join(this.content, "epics", STAGED_DEMO.epic)
  }

  /** the demo epic's page */
  get page(): string {
    return join(this.epicFolder, `${STAGED_DEMO.epic}.plan.html`)
  }

  /** the epic tool's files, at the main checkout */
  get files(): PlanDocFiles {
    return new PlanDocFiles({ root: this.main })
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** Run `epic demo <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, SWITCHES)
    const [verb = "check", value] = positional
    switch (verb) {
      case "check": {
        const report = this.check()
        if (flags.json) CLI.out(JSON.stringify(report, null, 2))
        else for (const line of checkLines(report)) CLI.out(line)
        return report.problems.length ? EXIT.ERRORS : EXIT.OK
      }
      case "run":
        return this.runStep(need(value, "run:  which step?  (01, 2, overview ...)"), { quiet: Boolean(flags.quiet) })
      case "lines":
        for (const line of this.lines(Number(value ?? 4))) CLI.out(line)
        return EXIT.OK
      case "pause":
        await after(Math.min(Number(value ?? DEFAULT_PAUSE_S), 30))
        return EXIT.OK
      case "wait":
        return this.wait(stringFlag(flags.timeout))
      case "next":
        CLI.out(this.next())
        return EXIT.OK
      case "overview":
        await this.writeOverview(need(value, "overview:  which step's file?  (03)"))
        CLI.out("the Overview written")
        return EXIT.OK
      case "seen":
        await this.files.edit(this.mustPage(), (plan) => plan.readAway())
        CLI.out("While you were out:  counts from now")
        return EXIT.OK
      case "reset":
        for (const line of this.reset({ dryRun: Boolean(flags.dryRun) })) CLI.out(line)
        return EXIT.OK
      default:
        throw new EpicCommandError(
          `unknown verb '${verb}':  check, run, lines, pause, wait, next, overview, seen or reset`
        )
    }
  }

  ////////////////
  // ## Steps
  ////////////////

  /** The step files, in order:  `NN-name.md`. */
  get steps(): string[] {
    if (!existsSync(this.folder)) return []
    return readdirSync(this.folder)
      .filter((name) => STEP_FILE.test(name))
      .sort()
  }

  /**
   * The step file `id` names:  its number (`3`, `03`) or a word of its name (`overview`).
   * - throws when none, or more than one, matches
   */
  stepFile(id: string): string {
    const number = /^\d+$/.test(id) ? id.padStart(2, "0") : undefined
    const found = this.steps.filter((name) => (number ? name.startsWith(`${number}-`) : name.includes(id)))
    if (found.length !== 1)
      throw new EpicCommandError(`no single step '${id}' in ${this.folder}:  ${this.steps.join(", ") || "none"}`)
    return join(this.folder, found[0]!)
  }

  /**
   * Run step `id`:  its `sh` blocks in the main checkout, stopping at the first failure, then its "Say" section.
   * - `$PROMPT_FILE` in the commands:  what Owen pasted after `/epic demo` (the prompt gate saved it), else the paste
   *   block of `00-paste.md`
   * - the commands run through `sh`:  the step files are Owen's to rewrite, and quote HTML as a shell does
   * - `epic` there is this copy's:  a worktree rehearses its own code, never the main checkout's
   * - `quiet`:  a rehearsal with nobody watching:  nothing shown in VS Code (`withoutShows()`)
   */
  async runStep(id: string, { quiet = false }: { quiet?: boolean } = {}): Promise<number> {
    const step = StagedDemo.parseStep(readFileSync(this.stepFile(id), "utf8"))
    // `epic` in the commands is THIS copy's, so a worktree rehearses its own code (an install's bin needs `node`)
    const path = EngineFiles.isBuilt ? process.env.PATH : `${dirname(EngineFiles.bin)}${delimiter}${process.env.PATH}`
    const env = { ...process.env, PATH: path, PROMPT_FILE: this.promptFile(), EPIC_CHECKOUT: this.main }
    for (const command of step.commands) {
      const block = quiet ? StagedDemo.withoutShows(command) : command
      const ran = spawnSync("/bin/sh", ["-e", "-c", block], { cwd: this.main, env, stdio: "inherit" })
      if (ran.status !== 0) return ran.status ?? EXIT.ERRORS
    }
    if (step.say) CLI.out(`\nSAY:\n${step.say}`)
    return EXIT.OK
  }

  /**
   * A step file's parts:  its title (`# ...`), its commands (every `sh` block under `## Commands`), what Claude says
   * (`## Say`, verbatim) and its Overview (`html` blocks).
   * - PURE:  text in, parts out
   */
  static parseStep(text: string): DemoStep {
    const sections = new Map<string, string>()
    let title = ""
    let current = ""
    const lines: string[] = []
    const flush = () => sections.set(current, lines.splice(0).join("\n").trim())
    let fenced = false
    for (const line of text.split("\n")) {
      if (line.startsWith("```")) fenced = !fenced
      if (!fenced && line.startsWith("# ") && !title) title = line.slice(2).trim()
      else if (!fenced && line.startsWith("## ")) {
        flush()
        current = line.slice(3).trim().toLowerCase()
      } else lines.push(line)
    }
    flush()
    const blocks = (body: string | undefined, language: string) =>
      [...(body ?? "").matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)\\n```", "g"))].map((match) => match[1]!)
    return {
      title,
      commands: blocks(sections.get("commands"), "sh"),
      say: sections.get("say") ?? "",
      html: blocks(text, "html")
    }
  }

  /** Commands `block` with each line that shows a page in VS Code (`epic open`, `--show`) left out. */
  static withoutShows(block: string): string {
    return block
      .split("\n")
      .map((line) => (/^\s*epic open\b|\s--show\b/.test(line) ? ":" : line))
      .join("\n")
  }

  /** What Owen pasted after `/epic demo`, saved by the prompt gate;  none:  `00-paste.md`'s paste block, in a file. */
  promptFile(): string {
    const saved = join(process.env.SPELL_PROMPTS_DIR || join(homedir(), ".spell", "prompts"), `${STAGED_DEMO.epic}.md`)
    if (existsSync(saved) && readFileSync(saved, "utf8").trim()) return saved
    const paste = join(this.folder, STAGED_DEMO.firstStep)
    const text = existsSync(paste) ? StagedDemo.pasteOf(readFileSync(paste, "utf8")) : ""
    const file = join(tmpdir(), "epic-demo-prompt.md")
    writeFileSync(file, `${text}\n`)
    return file
  }

  /** `00-paste.md`'s text to paste:  what's under `## Paste`, its fences dropped from the outer `text` block. */
  static pasteOf(text: string): string {
    const body = /^## Paste\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)?.[1] ?? ""
    const fenced = /^````text\n([\s\S]*?)\n````/m.exec(body)
    return (fenced ? fenced[1]! : body).trim()
  }

  /** `count` working lines from `silly-lines.txt`, picked at random, none twice. */
  lines(count: number): string[] {
    const file = join(this.folder, SILLY_LINES)
    const all = existsSync(file)
      ? readFileSync(file, "utf8")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"))
      : []
    const picked: string[] = []
    const left = [...all]
    while (picked.length < count && left.length)
      picked.push(left.splice(Math.floor(Math.random() * left.length), 1)[0]!)
    return picked
  }

  /**
   * The step files' `html` blocks as the Overview:  the first its summary (`<epic-summary>`'s inside), each next one
   * a numbered part (an `<epic-section kind="overview-part">`), in place of the parts there;  the kickoff prompt kept.
   * - the tool moves each part's body into its part file as it writes
   */
  async writeOverview(id: string): Promise<void> {
    const [summary, ...parts] = StagedDemo.parseStep(readFileSync(this.stepFile(id), "utf8")).html
    if (!summary) throw new EpicCommandError(`overview:  step '${id}' has no html block`)
    await this.files.edit(this.mustPage(), (plan) => {
      const overview = plan.page.querySelector("epic-overview")
      if (!overview) throw new EpicCommandError("overview:  the demo page has no <epic-overview>")
      const box = plan.document.createElement("div")
      box.innerHTML = summary
      const lede = overview.querySelector("epic-summary")
      if (lede) lede.innerHTML = box.querySelector("epic-summary")?.innerHTML ?? summary
      for (const old of overview.querySelectorAll(':scope > epic-section[kind="overview-part"]')) old.remove()
      for (const html of parts) {
        box.innerHTML = html
        overview.append(...Array.from(box.children))
      }
    })
  }

  /** The demo page, or a throw saying to run step 01 first. */
  mustPage(): string {
    if (!existsSync(this.page)) throw new EpicCommandError(`no demo epic yet:  epic demo run 01 makes it`)
    return this.page
  }

  ////////////////
  // ## Waiting for Owen
  ////////////////

  /**
   * `epic inbox wait demo`, a pressed Accept let go at once, then `epic inbox apply demo` and the next step.
   * - Why:  a press of Accept Overview / Accept Phases is HELD 5 minutes (`STAGE_COUNTDOWN_MS`, I181), unless Owen
   *   presses Send too;  in front of a room that's 5 minutes of nothing, so each second a held accept is released and
   *   sent, as Send does (`releaseHeld()`, `markSent()`)
   * - prints the wait's work, the apply's lines, then `NEXT:  <step>` (`next()`)
   */
  async wait(timeout = "3300"): Promise<number> {
    const inbox = ReviewInbox.pathFor(this.mustPage())
    const timer = setInterval(() => StagedDemo.releaseAccept(inbox), 1000)
    let code: number
    try {
      code = await EpicTools.runPlanDoc(["inbox", "wait", STAGED_DEMO.epic, "--timeout", timeout], this.main)
    } finally {
      clearInterval(timer)
    }
    if (code !== EXIT.OK) return code
    await EpicTools.runPlanDoc(["inbox", "apply", STAGED_DEMO.epic], this.main)
    CLI.out(`\nNEXT:  ${this.next()}`)
    return EXIT.OK
  }

  /**
   * Inbox file `file`'s held stage accept, sent now;  whether there was one.
   * - NEVER throws:  an inbox mid-write is tried again a second later
   */
  static releaseAccept(file: string): boolean {
    try {
      if (!ReviewInbox.read(file).heldMarks.some((mark) => mark.action === "accept")) return false
      ReviewInbox.update(file, (inbox) => {
        inbox.releaseHeld(new Date(Date.now() - 1).toISOString())
        inbox.markSent()
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Which step comes next, read from the page:  `run 01` ... `run 06`, `wait` (Owen's turn), or `done`.
   * - no page:  01;  in the Overview stage:  wait (for Accept Overview)
   * - Phases stage, no phases yet:  04;  with phases:  wait (for Accept Phases)
   * - building, P1 not started:  05;  P1 under way with a question open:  wait;  none open:  06;  P1 done:  done
   */
  next(): string {
    if (!existsSync(this.page)) return "run 01"
    const plan = this.files.read(this.page)
    const stage = plan.stage
    const phases = plan.phaseElements
    if (stage === "overview") return "wait"
    if (stage === "phases") return phases.length ? "wait" : "run 04"
    const first = phases[0]?.getAttribute("status") ?? "todo"
    if (first === "todo") return "run 05"
    if (first === "done") return "done"
    const asking = Array.from(plan.page.querySelectorAll('epic-item[id^="q"]')).some(
      (item) => item.getAttribute("status") === "open"
    )
    return asking ? "wait" : "run 06"
  }

  ////////////////
  // ## Reset and check
  ////////////////

  /**
   * Everything the demo epic made, gone, so it can run again;  the lines saying what went.
   * - its folder in the epic folder (page, parts, inbox, comments, pictures, details pages), then the Epics list and
   *   the docs' home page written again (`reindex()`)
   * - a worktree and branch named for it (`epic worktree remove`), its window file, the saved prompt, its star
   * - NEVER another epic's:  every path is the demo's own name
   * - `dryRun`:  only says what would go
   */
  reset({ dryRun = false }: { dryRun?: boolean } = {}): string[] {
    const lines: string[] = []
    const gone = (what: string, act: () => void) => {
      if (!dryRun) act()
      lines.push(`${dryRun ? "would remove" : "removed"}:  ${what}`)
    }
    const { epic } = STAGED_DEMO
    const worktree = this.config.worktreeFolder(epic)
    if (existsSync(worktree))
      gone(`worktree ${worktree}`, () =>
        new Worktrees({ main: this.main }).remove(epic, { force: true, branches: true })
      )
    if (this.hasBranch()) gone(`branch ${epic}`, () => EpicCheckout.mustGit(["branch", "-D", epic], this.main))
    if (existsSync(this.epicFolder))
      gone(`epics/${epic}/`, () => rmSync(this.epicFolder, { recursive: true, force: true }))
    const windowFile = this.windowFile
    if (existsSync(windowFile)) gone(`window file ${windowFile}`, () => rmSync(windowFile))
    for (const prompt of this.promptFiles) gone(`saved prompt ${prompt}`, () => rmSync(prompt))
    if (this.isStarred) gone(`its star (epics/favorites.json5)`, () => this.unstar())
    if (lines.length && !dryRun) this.files.reindex()
    if (!lines.length) lines.push("nothing to reset:  no demo epic")
    return lines
  }

  /** What `check` found:  the step files, and anything an earlier run left. */
  check(): DemoCheck {
    const problems: string[] = []
    const steps = this.steps
    if (!existsSync(this.folder)) problems.push(`no staged demo:  ${this.folder} is missing`)
    for (const step of REQUIRED_STEPS)
      if (!steps.some((name) => name.startsWith(`${step}-`))) problems.push(`step ${step} is missing`)
    for (const name of steps.filter((each) => !each.startsWith("00-"))) {
      const step = StagedDemo.parseStep(readFileSync(join(this.folder, name), "utf8"))
      if (!step.commands.length) problems.push(`${name} has no sh block under ## Commands`)
    }
    const lines = this.lines(Infinity).length
    if (lines < MIN_SILLY_LINES) problems.push(`${SILLY_LINES} has ${lines} lines;  ${MIN_SILLY_LINES} wanted`)
    const left = this.leftovers()
    problems.push(...left.map((what) => `left from an earlier run:  ${what} (epic demo reset)`))
    return { folder: this.folder, steps, sillyLines: lines, leftovers: left, problems }
  }

  /** What an earlier run left:  the demo's folder, worktree, branch, window file, star, card on the Epics list. */
  leftovers(): string[] {
    const { epic } = STAGED_DEMO
    const left: string[] = []
    if (existsSync(this.epicFolder)) left.push(`epics/${epic}/`)
    if (existsSync(this.config.worktreeFolder(epic))) left.push(`worktree ${this.config.worktreeFolder(epic)}`)
    if (this.hasBranch()) left.push(`branch ${epic}`)
    if (existsSync(this.windowFile)) left.push(`window file ${this.windowFile}`)
    if (this.isStarred) left.push("its star")
    const list = join(this.content, "epics", "index.html")
    if (existsSync(list) && new RegExp(`epic="${epic}"`).test(readFileSync(list, "utf8")))
      left.push("its card on the Epics list")
    return left
  }

  /** Is there a branch named for the demo epic, in the main checkout? */
  hasBranch(): boolean {
    return Boolean(Git.run(["branch", "--list", STAGED_DEMO.epic], this.main).out)
  }

  /** the demo epic's window file, had a session opened one */
  get windowFile(): string {
    return join(this.config.windowsFolder, EpicConfig.WORKTREE_WINDOWS, `${STAGED_DEMO.epic}.code-workspace`)
  }

  /** the prompts the prompt gate saved for `/epic demo`:  `demo.md`, and older ones it kept, `demo.<time>.md` */
  get promptFiles(): string[] {
    const dir = process.env.SPELL_PROMPTS_DIR || join(homedir(), ".spell", "prompts")
    if (!existsSync(dir)) return []
    const name = new RegExp(`^${STAGED_DEMO.epic}(\\.[\\w-]+)?\\.md$`)
    return readdirSync(dir)
      .filter((each) => name.test(each))
      .map((each) => join(dir, each))
  }

  /** the starred epics' file */
  get favoritesFile(): string {
    return join(this.content, "epics", "favorites.json5")
  }

  /** Is the demo epic starred on the Epics list? */
  get isStarred(): boolean {
    return existsSync(this.favoritesFile) && this.favorites.includes(STAGED_DEMO.epic)
  }

  /** the starred epics' names */
  get favorites(): string[] {
    try {
      const list = JSON.parse(readFileSync(this.favoritesFile, "utf8")) as unknown
      return Array.isArray(list) ? list.map(String) : []
    } catch {
      return []
    }
  }

  /** Unstar the demo epic. */
  unstar(): void {
    const list = this.favorites.filter((name) => name !== STAGED_DEMO.epic)
    writeFileSync(this.favoritesFile, `${JSON.stringify(list, null, 2)}\n`)
  }
}

/** One step file, read (`StagedDemo.parseStep()`). */
export type DemoStep = {
  /** its `# ` heading */
  title: string
  /** each `sh` block under `## Commands`, run in order */
  commands: string[]
  /** what Claude says after it, `## Say` verbatim */
  say: string
  /** every `html` block in the file:  an Overview's summary and parts (`writeOverview()`) */
  html: string[]
}

/** What `epic demo check` found. */
export type DemoCheck = {
  /** the step files' folder */
  folder: string
  /** the step files there, in order */
  steps: string[]
  /** how many working lines `silly-lines.txt` holds */
  sillyLines: number
  /** what an earlier run left */
  leftovers: string[]
  /** everything wrong:  none, and the demo is ready */
  problems: string[]
}

/** `check`'s report as lines. */
function checkLines(report: DemoCheck): string[] {
  if (!report.problems.length)
    return [
      `staged demo ready:  ${report.steps.length} step files, ${report.sillyLines} working lines`,
      `  ${report.folder}`,
      "nothing left from an earlier run"
    ]
  return report.problems.map((problem) => `demo:  ${problem}`)
}

/** `value`, or a throw saying what's missing. */
function need(value: string | undefined, message: string): string {
  if (!value) throw new EpicCommandError(message)
  return value
}

/** A step file's name:  `NN-name.md`. */
const STEP_FILE = /^\d\d-[\w-]+\.md$/

/** The steps every staged demo has:  what Owen pastes, then each step the session runs. */
const REQUIRED_STEPS = ["00", "01", "02", "03", "04", "05", "06", "07"]

/** The working lines' file, beside the step files. */
const SILLY_LINES = "silly-lines.txt"

/** Enough working lines that a run of the demo never shows the same one twice. */
const MIN_SILLY_LINES = 30

/** `pause`'s wait when it names none, seconds:  four of them, with Claude's own time between, make about 10s. */
const DEFAULT_PAUSE_S = 2

/** The verbs' switches (flags with no value). */
const SWITCHES = ["json", "dry-run", "quiet"]
