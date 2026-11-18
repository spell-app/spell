import { spawn } from "node:child_process"
import { tmpdir } from "node:os"

import type { SPACES } from "spell/app/spaces"
import { ClaudeStarter, claudeEnv } from "./ClaudeStarter"

/****************
 * ### `ClaudeExplainer`
 * Explains a piece of Spell in plain words, for the code's right-click Explain This (epic `editor` P32, Q39):
 * Claude Code on this machine, asked once, answering in text.
 * - Nothing runs:  the code is only read.
 * - `claude` in print mode, with NO tools at all (`--tools ""`), so it can read and change nothing on this machine;
 *   without this machine's hooks and MCP servers, as `ClaudeStarter`'s sessions are;  no session kept.
 * - Started in the system's temporary folder:  it needs no project.
 * - A fast model (`MODEL`):  a person waits on it, in a modal.
 * - Node only;  the browser asks through `POST /api/explain` (`changesRoutes.ts`).
 ****************/
export class ClaudeExplainer {
  constructor(readonly options: ExplainerOptions = {}) {}

  /** Is Claude Code installed here? */
  get hasClaude(): boolean {
    return !!this.claude
  }

  /** Claude Code's command, as found (`ClaudeStarter.find()`) or as handed in. */
  get claude(): string | undefined {
    return "claude" in this.options ? this.options.claude : ClaudeStarter.find()
  }

  /** The arguments `claude` is started with:  see the class's docs for what they allow. */
  static argsFor(language: string): string[] {
    return [
      "--print",
      "--model",
      MODEL,
      "--system-prompt",
      systemPromptFor(language),
      "--tools",
      "",
      "--output-format",
      "text",
      "--no-session-persistence",
      "--settings",
      JSON.stringify({ disableAllHooks: true }),
      "--strict-mcp-config"
    ]
  }

  /**
   * What `asked.code` does, in plain words, in `asked.language`.
   * - throws `TypeError` when Claude Code isn't installed here, or there's no code
   * - throws an `Error` saying why, when Claude ends without an answer, or takes longer than `ANSWER_WITHIN_MS`
   */
  async explain(asked: SPACES.ExplainAsked): Promise<string> {
    const { claude } = this
    if (!claude) throw new TypeError("ClaudeExplainer.explain():  Claude Code isn't installed on this machine")
    if (!asked.code.trim()) throw new TypeError("ClaudeExplainer.explain():  there's no code to explain")
    const child = (this.options.spawn ?? spawn)(claude, ClaudeExplainer.argsFor(asked.language), {
      cwd: tmpdir(),
      env: claudeEnv(),
      stdio: ["pipe", "pipe", "pipe"]
    })
    let answer = ""
    let problem = ""
    child.stdout?.on("data", (chunk: Buffer) => (answer += chunk.toString()))
    child.stderr?.on("data", (chunk: Buffer) => (problem += chunk.toString()))
    child.stdin?.end(promptFor(asked))
    const code = await new Promise<number | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error(`Claude took longer than ${ANSWER_WITHIN_MS / 1000} seconds`))
      }, this.options.answerWithinMs ?? ANSWER_WITHIN_MS)
      child.once("error", (error) => {
        clearTimeout(timer)
        reject(error)
      })
      child.once("close", (exitCode: number | null) => {
        clearTimeout(timer)
        resolve(exitCode)
      })
    })
    if (code !== 0 || !answer.trim()) throw new Error(problem.trim() || answer.trim() || `Claude ended (${code})`)
    return answer.trim()
  }
}

/** What an explainer can be handed:  a test's stand-ins. */
export type ExplainerOptions = {
  /** Claude Code's command;  `undefined`:  not installed.  Left out:  `ClaudeStarter.find()` */
  claude?: string
  /** starts the process:  node's `spawn()` */
  spawn?: typeof spawn
  /** how long Claude has to answer, in msec:  `ANSWER_WITHIN_MS` */
  answerWithinMs?: number
}

/** What Claude is asked:  the code, and where it's from. */
function promptFor(asked: SPACES.ExplainAsked): string {
  const from = asked.projectId ? `It's from the program ${asked.projectId}.\n` : ""
  return `${from}Explain what this Spell code does:\n\n${asked.code}\n`
}

/** Who Claude is for this:  the reader, the voice, the length, and the language to answer in. */
function systemPromptFor(language: string): string {
  return [
    "You explain code written in Spell, a programming language that reads like plain English, to someone new to programming.",
    "Say what the code does when it runs, step by step, in plain everyday words:  no jargon, no code terms they wouldn't know.",
    "Start with one sentence saying what it's for.  Then a short bulleted list of what happens, in order.",
    "Name things as the code names them.  Don't suggest changes, and don't repeat the code back.",
    "Keep it under 150 words.  Answer in Markdown.",
    `Answer in ${LANGUAGE_NAMES[language] ?? "English"}${language === "es" ? ", where Spell is called Encanto" : ""}.`
  ].join("\n")
}

/** The languages the editor speaks, by their code, as the prompt names them. */
const LANGUAGE_NAMES: Record<string, string> = { en: "English", es: "Spanish" }

/** The model asked:  a fast one, as a person waits on it in a modal (about 2 seconds a line, measured). */
const MODEL = "haiku"

/** How long Claude has to answer, in msec, before it's stopped. */
const ANSWER_WITHIN_MS = 60_000
