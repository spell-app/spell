import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"

import { EXIT, EpicCommandError } from "spell/epic/command/command.types"

/****************
 * ### `ClaudePrint`
 * A FRESH reader:  `claude -p`, as bare as it gets, asked one thing and answering in a fixed shape (`--json-schema`).
 * - its own system prompt in place of Claude Code's, no tools, no MCP servers, no skills, no settings files, no
 *   hooks, no session saved, run from the temp folder (no `CLAUDE.md` to find)
 * - the ONE runner of it:  `epic voice check` (`VoiceCheck`, epic `epic-engine` T92) and `epic hush` (`Hush`, T122)
 * - each caller hands it a `marker`, an environment variable set to `1`, so anything of ours that runs anyway can tell
 * - node only;  imported by path
 ****************/
export class ClaudePrint {
  /**
   * Ask `claude -p` `text` under `system`, answering in `schema`'s shape;  returns its `structured_output`.
   * - `label`:  the command, for its errors (`epic voice check`)
   * - `isAnswer`:  is what came back the shape asked for
   * - throws `EpicCommandError` (exit 1) when `claude` won't run, fails, or gives no answer
   */
  static ask<T>({ system, text, model, schema, label, marker, timeoutMs, isAnswer }: ClaudeAsk<T>): T {
    const args = [
      "-p",
      "--model",
      model,
      "--no-session-persistence",
      "--settings",
      '{"disableAllHooks":true}',
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--tools",
      "",
      "--exclude-dynamic-system-prompt-sections",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(schema),
      "--system-prompt",
      system
    ]
    const run = spawnSync("claude", args, {
      input: text,
      encoding: "utf8",
      cwd: tmpdir(),
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, [marker]: "1" }
    })
    if (run.error) throw new EpicCommandError(`${label}:  claude -p didn't run:  ${run.error.message}`, EXIT.ERRORS)
    if (run.status !== 0 && !run.stdout)
      throw new EpicCommandError(`${label}:  claude -p failed:  ${run.stderr.slice(0, 300)}`, EXIT.ERRORS)
    return ClaudePrint.answerFrom(run.stdout, label, isAnswer)
  }

  /**
   * The answer in `claude -p --output-format json`'s output:  its `structured_output`.
   * - throws `EpicCommandError` (exit 1) when it isn't JSON, the run said it failed, or `isAnswer` says no
   */
  static answerFrom<T>(stdout: string, label: string, isAnswer: (answer: unknown) => answer is T): T {
    let output: { is_error?: boolean; result?: string; structured_output?: unknown }
    try {
      output = JSON.parse(stdout) as typeof output
    } catch {
      throw new EpicCommandError(`${label}:  the reader's answer isn't JSON:  ${stdout.slice(0, 200)}`, EXIT.ERRORS)
    }
    const answer = output.structured_output
    if (output.is_error || !isAnswer(answer))
      throw new EpicCommandError(
        `${label}:  the reader gave no answer:  ${(output.result ?? "").slice(0, 200)}`,
        EXIT.ERRORS
      )
    return answer
  }
}

/** What `ClaudePrint.ask()` is handed. */
export type ClaudeAsk<T> = {
  /** its instructions, in place of Claude Code's */
  system: string
  /** what it reads, on its stdin */
  text: string
  /** the model:  `sonnet`, `haiku` ... */
  model: string
  /** the answer's JSON Schema */
  schema: object
  /** the command asking, for its errors:  `epic voice check` */
  label: string
  /** an environment variable set to `1` while it runs:  `EPIC_VOICE_CHECK` */
  marker: string
  /** the longest it may take, ms */
  timeoutMs: number
  /** is the answer the shape asked for */
  isAnswer: (answer: unknown) => answer is T
}
