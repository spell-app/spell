import { readFileSync } from "node:fs"
import { join } from "node:path"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { EXIT, EpicCommandError } from "spell/epic/command/command.types"
import { ClaudePrint } from "spell/epic/command/ClaudePrint"

/****************
 * ### `VoiceCheck`
 * `epic voice check`:  a FRESH reader checks a piece of text against a voice (epic `epic-engine` T92, r76).
 * - Why:  text written by an agent reads fine to the agent, who knows everything around it.
 *   A reader with no context finds the words a newcomer would stop at.
 * - The reader:  `claude -p`, given only the checker's instructions (`voices/check/prompt.md`), the voice file and the
 *   text.  No repo, no tools, no hooks, no memory, no session saved;  it runs in the temp folder, so it finds no
 *   `CLAUDE.md` either.
 * - Its answer is structured (`VoiceVerdict`):  comprehensible, concise, clear, agent speak, each problem quoted with
 *   a rewrite, and pass or fail.
 * - The model:  Sonnet by default (`DEFAULT_MODEL`).
 *   Haiku is faster, but this is a judgement of how text reads, and its rewrites are what people copy.
 * - Testable without a model:  the reader is a constructor option (`ask`).
 ****************/
export class VoiceCheck {
  /** the reader:  `claude -p` by default */
  private readonly ask: VoiceReader
  /** reads stdin, for `-` */
  private readonly readStdin: () => string
  /** where the result is printed */
  private readonly write: (text: string) => void
  /** the repo's voices */
  private readonly config: () => EpicConfig

  constructor({
    ask = claudeReader,
    readStdin = () => readFileSync(0, "utf8"),
    write = (text) => void process.stdout.write(text),
    config = () => EpicConfig.of(process.cwd())
  }: VoiceCheckProps = {}) {
    this.ask = ask
    this.readStdin = readStdin
    this.write = write
    this.config = config
  }

  /**
   * `epic voice check [--voice novice] [<file> | - | --text "..."] [--about "..."] [--model sonnet] [--json]`;
   * `args` are those after `check`.
   * - prints the verdict;  `--json`:  the `VoiceVerdict` itself, plus the voice
   * - returns 0 on a pass, 1 on a fail
   * - throws `EpicCommandError`:  exit 2 for a usage error or a voice the repo hasn't got;  1 when the reader fails
   */
  run(args: readonly string[]): number {
    const value = (flag: string): string | undefined => {
      const at = args.indexOf(flag)
      if (at === -1) return undefined
      const given = args[at + 1]
      if (given === undefined || (given.startsWith("--") && given !== "-"))
        throw new EpicCommandError(`epic voice check ${flag}?  it needs a value`, EXIT.USAGE)
      return given
    }
    const voice = value("--voice") ?? DEFAULT_VOICE
    const about = value("--about")
    const model = value("--model") ?? DEFAULT_MODEL
    const inline = value("--text")
    const valued = new Set(["--voice", "--about", "--model", "--text"])
    const named = args.filter((arg, at) => (!arg.startsWith("--") || arg === "-") && !valued.has(args[at - 1] ?? ""))

    const config = this.config()
    const voiceFile = config.voiceFile(voice)
    if (!voiceFile)
      throw new EpicCommandError(
        `epic voice check --voice ${voice}?  no such voice here.  The voices:  ${config.voiceNames.join(", ")}`,
        EXIT.USAGE
      )
    if (named.length > 1 || (named.length && inline !== undefined))
      throw new EpicCommandError("epic voice check:  ONE text:  a file, - for stdin, or --text", EXIT.USAGE)
    const source = inline ?? named[0]
    if (source === undefined)
      throw new EpicCommandError('epic voice check:  which text?  a file, - for stdin, or --text "..."', EXIT.USAGE)
    const text = inline !== undefined ? inline : source === "-" ? this.readStdin() : readText(source)
    if (!text.trim()) throw new EpicCommandError("epic voice check:  the text is empty", EXIT.USAGE)

    const system = VoiceCheck.instructions({ voice, voiceText: readFileSync(voiceFile, "utf8"), about })
    const verdict = this.ask({ system, text, model, schema: VERDICT_SCHEMA })
    this.write(
      args.includes("--json")
        ? `${JSON.stringify({ voice, model, ...verdict }, null, 2)}\n`
        : VoiceCheck.format(voice, verdict)
    )
    return verdict.pass ? EXIT.OK : EXIT.ERRORS
  }

  /**
   * The reader's system prompt:  `voices/check/prompt.md`, below its note, filled in.
   * - `about`:  what the text is ("a dialog shown when leaving an example"), or nothing
   * - one pass over the placeholders, so a `{voice}` inside the voice file stays as it is
   */
  static instructions({ voice, voiceText, about }: { voice: string; voiceText: string; about?: string }): string {
    const prompt = readFileSync(PROMPT_FILE(), "utf8")
    const body = prompt.slice(prompt.indexOf(NOTE_END) + NOTE_END.length).trim()
    const values: Record<string, string> = {
      voice,
      voiceFile: voiceText.trim(),
      about: about ? `The text is ${about}.` : ""
    }
    return body.replace(/\{(voice|voiceFile|about)\}/g, (_whole, key: string) => values[key]!)
  }

  /** `verdict`, printed plainly:  pass or fail, the four judgements, the summary, then each problem. */
  static format(voice: string, verdict: VoiceVerdict): string {
    const yesNo = (yes: boolean) => (yes ? "yes" : "no")
    const lines = [
      `${voice} voice:  ${verdict.pass ? "PASS" : "FAIL"}`,
      `  comprehensible  ${yesNo(verdict.comprehensible)}`,
      `  concise         ${yesNo(verdict.concise)}`,
      `  clear           ${yesNo(verdict.clear)}`,
      `  agent speak     ${yesNo(verdict.agentSpeak)}`,
      "",
      verdict.summary.trim()
    ]
    verdict.problems.forEach((problem, at) => {
      lines.push("", `${at + 1}. "${problem.quote}"`, `   ${problem.why}`, `   Try:  "${problem.rewrite}"`)
    })
    return `${lines.join("\n")}\n`
  }

  /**
   * The verdict in `claude -p --output-format json`'s answer:  its `structured_output`.
   * - throws `EpicCommandError` (exit 1) when there's none, or the run said it failed
   */
  static verdictFrom(stdout: string): VoiceVerdict {
    const verdict = ClaudePrint.answerFrom(stdout, LABEL, isVerdict)
    return { ...verdict, problems: verdict.problems ?? [] }
  }
}

////////////////
// ## Types
////////////////

/** What the reader answers:  the four judgements, a summary, each problem, and pass or fail. */
export type VoiceVerdict = {
  /** a reader of the voice understands it on the first read */
  comprehensible: boolean
  /** every sentence earns its place */
  concise: boolean
  /** plain what happens, and what to do next */
  clear: boolean
  /** sounds written by a tool or a programmer for themselves:  jargon, ids, run-on sentences, insider words */
  agentSpeak: boolean
  /** one or two sentences on how it reads */
  summary: string
  /** each problem:  the words, why they trip the reader, a rewrite */
  problems: VoiceProblem[]
  /** comprehensible, concise, clear, and no agent speak */
  pass: boolean
}

/** One problem the reader found. */
export type VoiceProblem = {
  /** the exact words */
  quote: string
  /** why they trip the reader, in one sentence */
  why: string
  /** the words it suggests instead */
  rewrite: string
}

/** What the reader is given. */
export type VoiceRequest = {
  /** its instructions and the voice (`VoiceCheck.instructions()`) */
  system: string
  /** the text to check */
  text: string
  /** the model:  `sonnet`, `haiku` ... */
  model: string
  /** the answer's JSON Schema (`VERDICT_SCHEMA`) */
  schema: object
}

/** Reads `request`'s text cold and answers;  throws `EpicCommandError` when it can't. */
export type VoiceReader = (request: VoiceRequest) => VoiceVerdict

/** `VoiceCheck`'s constructor options:  each a stand-in for a test. */
export type VoiceCheckProps = {
  /** the reader;  default `claude -p` */
  ask?: VoiceReader
  /** reads stdin;  default fd 0 */
  readStdin?: () => string
  /** prints;  default stdout */
  write?: (text: string) => void
  /** the repo's settings, for its voices;  default the cwd's */
  config?: () => EpicConfig
}

////////////////
// ## Constants and the reader
////////////////

/** The voice text is checked against, by default:  Owen's standing rule (r76). */
const DEFAULT_VOICE = "novice"

/** The reader's model, by default:  a judgement of how text reads, so Sonnet over Haiku. */
const DEFAULT_MODEL = "sonnet"

/** The command, for the reader's errors. */
const LABEL = "epic voice check"

/** The longest a check may take, ms:  Sonnet took about 15s on a dialog's text (2026-11-17). */
const READ_TIMEOUT_MS = 180_000

/** The checker's instructions, beside the voices. */
const PROMPT_FILE = () => join(EngineFiles.path("voices"), "check", "prompt.md")

/** The line ending the prompt file's note to people:  nothing above it is sent. */
const NOTE_END = "\n---\n"

/** The answer's shape, as `claude -p --json-schema` takes it:  `VoiceVerdict`. */
const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    comprehensible: { type: "boolean" },
    concise: { type: "boolean" },
    clear: { type: "boolean" },
    agentSpeak: { type: "boolean" },
    summary: { type: "string" },
    problems: {
      type: "array",
      items: {
        type: "object",
        properties: { quote: { type: "string" }, why: { type: "string" }, rewrite: { type: "string" } },
        required: ["quote", "why", "rewrite"]
      }
    },
    pass: { type: "boolean" }
  },
  required: ["comprehensible", "concise", "clear", "agentSpeak", "summary", "problems", "pass"]
}

/** File `path`'s text;  throws `EpicCommandError` (exit 2) when it won't read. */
function readText(path: string): string {
  try {
    return readFileSync(path, "utf8")
  } catch (error) {
    throw new EpicCommandError(`epic voice check:  can't read ${path}:  ${(error as Error).message}`, EXIT.USAGE)
  }
}

/** Is `answer` a verdict:  it says pass or fail, at least. */
function isVerdict(answer: unknown): answer is VoiceVerdict {
  return typeof (answer as VoiceVerdict | undefined)?.pass === "boolean"
}

/**
 * The default reader:  `claude -p`, as fresh as it gets (`ClaudePrint`).
 * - `EPIC_VOICE_CHECK` set, so anything of ours that runs anyway can tell
 */
function claudeReader({ system, text, model, schema }: VoiceRequest): VoiceVerdict {
  const verdict = ClaudePrint.ask({
    system,
    text,
    model,
    schema,
    label: LABEL,
    marker: "EPIC_VOICE_CHECK",
    timeoutMs: READ_TIMEOUT_MS,
    isAnswer: isVerdict
  })
  return { ...verdict, problems: verdict.problems ?? [] }
}
