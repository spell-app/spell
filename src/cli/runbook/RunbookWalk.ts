import chalk from "chalk"
import { spawn } from "node:child_process"
import { mkdirSync } from "node:fs"

// By file:  the server's barrel would load linkedom, which a walk never needs
import { openBrowser } from "spell/server/open"
import { scrubbed, Secrets } from "spell/server/Secrets"
import { CLI } from "spell/cli"
import { outputMatches, tidyLines } from "spell/cli/commandBlocks"

import { Runbook, lapsesAt } from "./Runbook"
import { RunbookProgress } from "./RunbookProgress"
import type { RunbookAsk, RunbookRecord, RunbookRun, RunbookStep, RunbookTools } from "./runbook.types"

/****************
 * ### `RunbookWalk`
 * A walk through a runbook, in the terminal:  `spell runbook start` (epic `epic-engine` P78).
 *
 * ```ts
 * await new RunbookWalk(Runbook.read(file)).start()   // its exit code
 * ```
 *
 * - Each step in turn, from the first that isn't done:
 *   - by hand:  its words, then a pick:  done (Enter), open its link (`o`), skip (`s`), stop (`q`)
 *   - an ask:  the question;  a secret one hidden as it's typed, and kept with the secrets (`SRV.Secrets`), never
 *     with the progress;  a plain one kept with the progress
 *   - commands:  run in the runbook's folder, every value in their environment;  what they print shown as it comes,
 *     each secret replaced by its name (`SRV.scrubbed()`);  they must succeed, and print what its Output fold says
 * - A failure stops the walk there, showing the step's "If not:":  the next start tries that step again.
 * - Progress is kept after every step (`RunbookProgress`), and forgotten once the runbook's `fresh until` passes.
 * - Everything outside itself is handed in (`RunbookTools`, the streams, the stores):  its tests run it on a fake
 *   terminal, with no browser, shell or home folder.
 ****************/
export class RunbookWalk {
  /** the runbook walked */
  readonly runbook: Runbook
  /** where walks are kept */
  private readonly progress: RunbookProgress
  /** where secret values are kept */
  private readonly secrets: Secrets
  /** running commands, opening links, the time */
  private readonly tools: RunbookTools
  /** the environment the commands start from */
  private readonly environment: NodeJS.ProcessEnv
  /** the terminal's streams, and how long keys typed ahead are thrown away */
  private readonly terminal: Required<Pick<CLI.AskOptions, "input" | "output" | "typedAheadMs">>

  constructor(runbook: Runbook, props: RunbookWalkProps = {}) {
    const { progress = new RunbookProgress(), tools = shellTools(), environment = process.env } = props
    this.runbook = runbook
    this.progress = progress
    this.secrets = props.secrets ?? new Secrets({ environment })
    this.tools = tools
    this.environment = environment
    this.terminal = {
      input: props.input ?? process.stdin,
      output: props.output ?? process.stdout,
      typedAheadMs: props.typedAheadMs ?? 100
    }
  }

  ////////////////
  // ## The walk
  ////////////////

  /**
   * SIDE EFFECT:  walks the runbook from the first step not done, keeping its progress after each:  its exit code.
   * - `EXIT.OK` when it's done, or you stopped it;  `EXIT.ERRORS` when a step didn't work, or nothing was typed
   * - throws `CliError` with no terminal to ask in:  steps wait for you
   */
  async start(): Promise<number> {
    const { input, output } = this.terminal
    if (!input.isTTY || !output.isTTY) {
      throw new CLI.CliError(
        "This needs a terminal window, where you type commands, because some steps wait for your answer.\n" +
          "Open one and run the command again."
      )
    }
    const { runbook } = this
    const { record, lapsedAt } = this.current()
    const steps = runbook.steps
    const next = steps.findIndex((step) => !record.steps[step.title])
    this.say(chalk.bold(runbook.title))
    if (lapsedAt) {
      this.say(
        `Your progress from last time was cleared at ${runbook.freshUntil!.text}, so you start again from step 1.`
      )
    }
    if (next === -1) {
      this.say(`Every step is already done.\nTo go through it again:  ${chalk.cyan(this.command("reset"))}`)
      return CLI.EXIT.OK
    }
    if (next === 0 && runbook.intro) this.say(`\n${terminalText(runbook.intro)}`)
    this.say(
      next === 0
        ? `\n${steps.length} steps.  You can stop at any step, and the next start carries on from there.`
        : `\nCarrying on from step ${next + 1} of ${steps.length}, "${steps[next]!.title}".`
    )
    const env = this.environmentFor(record)
    if (runbook.folder) mkdirSync(runbook.folder, { recursive: true })
    for (const step of steps.slice(next)) {
      if (record.steps[step.title]) continue
      const ended = await this.walkStep(step, record, env)
      if (ended !== undefined) return ended
      record.steps[step.title] = this.skipped ? "skipped" : "done"
      delete record.stoppedAt
      this.progress.save(runbook.name, record)
    }
    this.say(`\n${chalk.green("✓")} All ${steps.length} steps are done.`)
    return CLI.EXIT.OK
  }

  /**
   * One step:  `undefined` when it's done (or skipped), else the walk's exit code, having said why and kept where it
   * stopped.
   */
  private async walkStep(
    step: RunbookStep,
    record: RunbookRecord,
    env: NodeJS.ProcessEnv
  ): Promise<number | undefined> {
    const count = this.runbook.steps.length
    this.skipped = false
    this.say(`\n${chalk.bold.cyan(`Step ${step.number} of ${count}:  ${step.title}`)}`)
    if (step.words) this.say(terminalText(step.words))
    if (!step.actions.length) return this.byHand(step, record)
    for (const action of step.actions) {
      const ended =
        action.kind === "ask" ? await this.asked(action, step, record, env) : await this.ran(action, step, record, env)
      if (ended !== undefined) return ended
    }
    if (step.should) this.say(`You should see:  ${terminalText(step.should)}`)
    return undefined
  }

  /** whether the step just walked was skipped */
  private skipped = false

  /** A step done by hand:  its pick, done, open its link, skip or stop. */
  private async byHand(step: RunbookStep, record: RunbookRecord): Promise<number | undefined> {
    if (step.should) this.say(`You should see:  ${terminalText(step.should)}`)
    const choices: CLI.Choice[] = [
      { value: "done", label: "Done", hint: "press Enter" },
      ...(step.link ? [{ value: "open", label: "Open the page in your browser", key: "o" }] : []),
      { value: "skip", label: "Skip this step", key: "s" },
      { value: "stop", label: "Stop for now", key: "q" }
    ]
    for (;;) {
      const picked = await CLI.choose("When you've done this step:", choices, { ...this.terminal, suggestion: "done" })
      if (picked === "open") {
        this.tools.open(step.link!)
        this.say(chalk.gray(`Opened ${step.link}`))
        continue
      }
      if (picked === "stop") return this.stop(step, record, "stopped")
      this.skipped = picked === "skip"
      return undefined
    }
  }

  /** An ask:  the value typed, kept;  nothing typed stops the walk. */
  private async asked(
    ask: RunbookAsk,
    step: RunbookStep,
    record: RunbookRecord,
    env: NodeJS.ProcessEnv
  ): Promise<number | undefined> {
    const before = ask.secret ? this.secrets.kept(ask.name) : record.values[ask.name]
    let value: string
    if (ask.secret) {
      const keep = before ? "  Press Enter to keep the value you gave last time." : ""
      this.say(chalk.gray(`What you type stays hidden, like a password.${keep}`))
      value = (await CLI.askSecret(ask.question, this.terminal)) || before || ""
    } else value = await CLI.ask(ask.question, { ...this.terminal, suggestion: before ?? "" })
    if (!value) {
      this.say(`You didn't type anything, so it stopped here.`)
      return this.stop(step, record, "stopped", CLI.EXIT.ERRORS)
    }
    if (ask.secret) this.secrets.keep(ask.name, value)
    else record.values[ask.name] = value
    env[ask.name] = value
    return undefined
  }

  /** Commands:  run, their output shown with secrets taken out, then checked.  A failure stops the walk. */
  private async ran(
    run: RunbookRun,
    step: RunbookStep,
    record: RunbookRecord,
    env: NodeJS.ProcessEnv
  ): Promise<number | undefined> {
    const { output } = this.terminal
    const secrets = this.secretValues(env)
    const shown = (text: string) => scrubbed(text, secrets, { word: "secret" })
    for (const line of tidyLines(run.commands)) this.say(chalk.gray(`$ ${shown(line)}`))
    let printed = ""
    let pending = ""
    // whole lines only, so a secret split between two pieces is still found
    const show = (text: string) => {
      const clean = shown(text)
      printed += clean
      output.write(clean)
    }
    const status = await this.tools.run(run.commands, {
      folder: this.runbook.folder ?? process.cwd(),
      env,
      onOutput: (text) => {
        pending += text
        const end = pending.lastIndexOf("\n")
        if (end === -1) return
        show(pending.slice(0, end + 1))
        pending = pending.slice(end + 1)
      }
    })
    if (pending) show(`${pending}\n`)
    if (status !== 0) {
      this.say(
        `\n${chalk.red("✗")} That step didn't work:  the command ran into a problem and stopped (status ${status}).`
      )
      return this.failed(step, record)
    }
    if (run.output !== undefined && !outputMatches(run.output, printed)) {
      this.say(`\n${chalk.red("✗")} That isn't what this step should show.  You should see:`)
      this.say(
        chalk.gray(
          tidyLines(run.output)
            .map((line) => `  ${line}`)
            .join("\n")
        )
      )
      return this.failed(step, record)
    }
    return undefined
  }

  /** A step that didn't work:  its If not, and how to try again. */
  private failed(step: RunbookStep, record: RunbookRecord): number {
    if (step.ifNot) this.say(`If it didn't work:  ${terminalText(step.ifNot)}`)
    this.say(`Fix what went wrong, then try this step again by typing:  ${chalk.cyan(this.command("start"))}`)
    return this.stop(step, record, "failed", CLI.EXIT.ERRORS, { quiet: true })
  }

  /** SIDE EFFECT:  keeps where the walk stopped, and says how to carry on:  `exitCode`. */
  private stop(
    step: RunbookStep,
    record: RunbookRecord,
    why: "failed" | "stopped",
    exitCode: number = CLI.EXIT.OK,
    { quiet = false }: { quiet?: boolean } = {}
  ): number {
    record.stoppedAt = { step: step.title, why }
    this.progress.save(this.runbook.name, record)
    if (!quiet)
      this.say(`Stopped at step ${step.number}.  To carry on later, type:  ${chalk.cyan(this.command("start"))}`)
    return exitCode
  }

  ////////////////
  // ## Its progress
  ////////////////

  /**
   * The walk as kept, or a new one:  one started before its runbook's `fresh until` passed is dropped, and when it
   * lapsed said.
   */
  current(): { record: RunbookRecord; lapsedAt?: Date } {
    const now = this.tools.now()
    const kept = this.progress.read(this.runbook.name)
    const fresh = this.runbook.freshUntil
    const lapsedAt = kept && fresh ? lapsesAt(fresh, new Date(kept.startedAt)) : undefined
    if (kept && !(lapsedAt && lapsedAt <= now)) return { record: kept }
    if (kept) this.progress.forget(this.runbook.name)
    const record: RunbookRecord = { file: this.runbook.file, startedAt: now.toISOString(), steps: {}, values: {} }
    return { record, ...(kept && lapsedAt && { lapsedAt }) }
  }

  /** `spell runbook status`'s lines:  each step with its state, and when the walk started and lapses. */
  statusLines(): string[] {
    const { runbook } = this
    const now = this.tools.now()
    const kept = this.progress.read(runbook.name)
    const fresh = runbook.freshUntil
    const lapsedAt = kept && fresh ? lapsesAt(fresh, new Date(kept.startedAt)) : undefined
    const record = kept && !(lapsedAt && lapsedAt <= now) ? kept : undefined
    const lines = [chalk.bold(runbook.title), chalk.gray(CLI.relativePath(runbook.file))]
    for (const step of runbook.steps) {
      const state = record?.steps[step.title]
      const stopped = record?.stoppedAt?.step === step.title ? record.stoppedAt.why : undefined
      const mark =
        state === "done"
          ? chalk.green("✓")
          : state === "skipped"
            ? chalk.yellow("-")
            : stopped === "failed"
              ? chalk.red("✗")
              : "·"
      const note = state === "skipped" ? "  (skipped)" : stopped === "failed" ? "  (stopped here:  it didn't work)" : ""
      lines.push(`  ${mark} ${step.number}. ${step.title}${note}`)
    }
    if (!record)
      lines.push(kept ? `Your progress was cleared at ${fresh!.text}:  not started since.` : "Not started yet.")
    else {
      const started = `Started ${new Date(record.startedAt).toLocaleString()}.`
      lines.push(lapsedAt ? `${started}  It expires ${lapsedAt.toLocaleString()} (${fresh!.text}).` : started)
    }
    return lines
  }

  /** SIDE EFFECT:  the walk is forgotten, so the next start begins at step 1;  whether there was one. */
  reset(): boolean {
    return this.progress.forget(this.runbook.name)
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The commands' environment:  the walk's own, every plain value kept, and every secret this runbook asks for. */
  private environmentFor(record: RunbookRecord): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...this.environment, ...record.values }
    for (const ask of this.asks()) {
      const value = ask.secret ? this.secrets.named(ask.name) : undefined
      if (value) env[ask.name] = value
    }
    return env
  }

  /** Every secret this runbook asks for, by its name, as the commands get it:  what's taken out of what they print. */
  private secretValues(env: NodeJS.ProcessEnv): [string, string][] {
    return this.asks()
      .filter((ask) => ask.secret && env[ask.name])
      .map((ask) => [ask.name, env[ask.name]!])
  }

  /** Every ask of every step. */
  private asks(): RunbookAsk[] {
    return this.runbook.steps.flatMap((step) => step.actions.filter((action) => action.kind === "ask"))
  }

  /** `spell runbook <verb> <name>`. */
  private command(verb: string): string {
    return `spell runbook ${verb} ${this.runbook.name}`
  }

  /** Write `text` to the terminal, on its own line. */
  private say(text: string): void {
    this.terminal.output.write(text.endsWith("\n") ? text : `${text}\n`)
  }
}

/** Constructor props of `RunbookWalk`:  each a stand-in in a test. */
export type RunbookWalkProps = {
  /** where walks are kept;  default `~/.spell/runbooks` */
  progress?: RunbookProgress
  /** where secret values are kept;  default `~/.spell/secrets` */
  secrets?: Secrets
  /** running commands, opening links, the time;  default the real ones */
  tools?: RunbookTools
  /** the environment the commands start from;  default this process's */
  environment?: NodeJS.ProcessEnv
  /** where answers are read from;  default `process.stdin` */
  input?: CLI.AskOptions["input"]
  /** where it all is written;  default `process.stdout` */
  output?: CLI.AskOptions["output"]
  /** how long keys typed before a question are thrown away, ms;  0 in a test */
  typedAheadMs?: number
}

/**
 * Markdown's marks, as a terminal shows them:  `**bold**` bold, `` `code` `` cyan, `[words](address)` the words and the
 * address after them.
 */
export function terminalText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_all, words: string, address: string) =>
      words === address ? chalk.underline(address) : `${words} (${chalk.underline(address)})`
    )
    .replace(/\*\*([^*]+)\*\*/g, (_all, words: string) => chalk.bold(words))
    .replace(/`([^`]+)`/g, (_all, code: string) => chalk.cyan(code))
}

/** The real tools:  `bash`, the default browser, the clock. */
function shellTools(): RunbookTools {
  return {
    run: (commands, { folder, env, onOutput }) =>
      new Promise((done) => {
        // one stream, as a terminal shows it;  any command failing fails the block
        const child = spawn("bash", ["-c", `exec 2>&1\nset -eo pipefail\n${commands}`], {
          cwd: folder,
          env,
          stdio: ["ignore", "pipe", "pipe"]
        })
        child.stdout.setEncoding("utf8").on("data", onOutput)
        child.on("error", (error) => {
          onOutput(`${error.message}\n`)
          done(1)
        })
        child.on("close", (status) => done(status ?? 1))
      }),
    open: (url) => void openBrowser(url),
    now: () => new Date()
  }
}
