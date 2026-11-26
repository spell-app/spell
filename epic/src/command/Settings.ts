import { BellSteps } from "spell/epic/bells"
import { Bells } from "spell/epic/config/Bells"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { LayeredSettings } from "spell/epic/config/LayeredSettings"
import { EpicCheckout } from "spell/epic/command/EpicCheckout"
import { EXIT, EpicCommandError } from "spell/epic/command/command.types"

/****************
 * ### `Settings`
 * `epic settings [<key> [<value>]] [--json]`:  how the epic tooling behaves for you, its three layers merged
 * (`LayeredSettings`, epic `epic-engine` I235), and setting one of them (epic `epic-engine` P86).
 * - no key:  each value with the layer that set it, then the layers' files and what was wrong with them
 * - `<key>`:  that value alone (`epic settings away.finishedPhaseDays`), for a skill
 * - `<key> <value>`:  set in YOUR file, `~/.spell/epic_settings.json5` (`LayeredSettings.set()`)
 * - BELLS & WHISTLES (`Bells`):
 *   - `bells`:  every step, its cost, and whether it runs now, and why not
 *   - `bells.<key>`:  `on` or `off` as it runs NOW, slider and all, with why when off;  what a skill asks before a step
 *   - `bells.<key> on|off`, `bells.burn low|medium|high`:  as the dialog sets them (`Bells.set()`)
 * - `--json`:  the same, as JSON
 * - Throws `EpicCommandError`:  exit 2 for an unknown key (listing the keys) or a value that won't do
 * - static:  needs no tree
 ****************/
export class Settings {
  /** Run `epic settings` with `args`;  returns the exit code. */
  static run(args: string[]): number {
    const json = args.includes("--json")
    const [key, value] = args.filter((arg) => !arg.startsWith("--"))
    const content = EpicConfig.of(EpicCheckout.nearest({ marker: ".git" })).contentFolder
    if (key === "bells" || key?.startsWith("bells.")) return Settings.bells(key, value, { content, json })
    if (value !== undefined) {
      Settings.refuse(() => LayeredSettings.set(key!, Settings.valueOf(value), { content }))
      return Settings.run([key!, ...(json ? ["--json"] : [])])
    }
    const settings = LayeredSettings.read(content)
    const { entries, layers } = settings
    if (key !== undefined) {
      const entry = entries.find((each) => each.key === key)
      if (!entry)
        throw new EpicCommandError(
          `epic settings ${key}?  no such key.  The keys:  ${entries.map((each) => each.key).join(", ")}`
        )
      process.stdout.write(json ? `${JSON.stringify(entry.value)}\n` : `${Settings.words(entry.value)}\n`)
      return EXIT.OK
    }
    if (json) {
      process.stdout.write(`${JSON.stringify({ values: settings.values, entries, layers }, null, 2)}\n`)
      return EXIT.OK
    }
    const lines = entries.map(({ key: name, value: each, source }) => `${name}:  ${Settings.words(each)}  (${source})`)
    for (const { name, file, found, problems } of layers) {
      lines.push(`${name}:  ${file}${found ? "" : "  (none)"}`)
      lines.push(...problems.map((problem) => `  ${problem}`))
    }
    process.stdout.write(`${lines.join("\n")}\n`)
    return EXIT.OK
  }

  /** `epic settings bells[.<key>] [<value>]`:  the steps, one step as it runs now, or set one. */
  private static bells(key: string, value: string | undefined, { content, json }: { content: string; json: boolean }) {
    const step = key.slice("bells.".length)
    if (value !== undefined) Settings.refuse(() => Bells.set(step, value, { content }))
    const view = Bells.view({ content })
    if (key === "bells") {
      if (json) process.stdout.write(`${JSON.stringify(view, null, 2)}\n`)
      else process.stdout.write(`${Settings.bellsLines(view).join("\n")}\n`)
      return EXIT.OK
    }
    if (step === "burn") {
      process.stdout.write(json ? `${JSON.stringify(view.shown)}\n` : `${view.shown}\n`)
      return EXIT.OK
    }
    if (step === "burnFlips") {
      process.stdout.write(`${JSON.stringify(Bells.values({ content }).burnFlips)}\n`)
      return EXIT.OK
    }
    const found = view.steps.find((each) => each.key === step)
    if (!found)
      throw new EpicCommandError(
        `epic settings ${key}?  no such step.  The steps:  ${view.steps.map((each) => each.key).join(", ")}`
      )
    if (json) process.stdout.write(`${JSON.stringify(found)}\n`)
    else process.stdout.write(found.on ? "on\n" : `off  (${WHY_WORDS[found.why]})\n`)
    return EXIT.OK
  }

  /** `epic settings bells`' lines:  the slider, then a line per step, grouped. */
  private static bellsLines(view: ReturnType<typeof Bells.view>): string[] {
    const lines = [`Token burn:  ${view.shown}`]
    let group = ""
    for (const step of BellSteps.SETTINGS_STEPS) {
      if (step.group !== group) {
        group = step.group
        lines.push("", `${group}:`)
      }
      const state = view.steps.find((each) => each.key === step.key)!
      const why = state.on ? "" : `  (${WHY_WORDS[state.why]})`
      lines.push(
        `  ${state.on ? "on " : "off"}  ${step.key.padEnd(18)}  ${step.cost.padEnd(9)}  ${Bells.titleOf(step.key)}${why}`
      )
    }
    lines.push("", "Set one:  epic settings bells.<key> on|off   The slider:  epic settings bells.burn low|medium|high")
    return lines
  }

  /** A value typed on the command line, as data:  a number, `true` / `false`, else the text. */
  private static valueOf(text: string): unknown {
    if (text === "true" || text === "false") return text === "true"
    return text.trim() !== "" && Number.isFinite(Number(text)) ? Number(text) : text
  }

  /** A value as printed:  an object as JSON, the rest as it is. */
  private static words(value: unknown): string {
    return typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)
  }

  /** Run `set`, turning a refused value (`TypeError`) into the command's error, exit 2. */
  private static refuse(set: () => unknown): void {
    try {
      set()
    } catch (error) {
      if (error instanceof TypeError) throw new EpicCommandError(`epic settings:  ${error.message}`)
      throw error
    }
  }
}

/** Why a step is off, in words. */
const WHY_WORDS = {
  switch: "your switch",
  burn: "the Token burn slider",
  flipped: "flipped while the slider is down"
} as const
