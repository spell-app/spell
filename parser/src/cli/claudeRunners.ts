/**
 * The two ways `spell parser translate` asks Claude (epic `spanish` P27), each a `ClaudeRunner`:
 * - `claudeApiRunner()`:  the Claude API, straight, one `fetch` a call -- when `ANTHROPIC_API_KEY` is set
 * - `runClaude()`:  `claude -p`, signed in as the person -- otherwise
 * - `claudeRunnerFor()` picks one, and when it's `claude -p`, says how to make it faster.
 * - Both answer only JSON of the shape a pass asks for (`ClaudeOptions.schema`), and put what every call of a pass
 *   shares (`context`, the glossary) in the system prompt.
 * - Both take a pass's `tier` (`fast`, `balanced`, `best`), in no provider's terms, and ask the model and effort
 *   `CLAUDE_TIERS` has for it:  another provider's runner would bring a table of its own.
 * - Node only:  `claude -p` is a program it starts.  No SDK, no new dependency:  the API is one POST.
 */
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"

import { CLI } from "spell/cli"
import type {
  AskingPass,
  ClaudeEffort,
  ClaudeOptions,
  ClaudeRunner,
  EffortTier
} from "spell-parser/spell/translate/translate.types"

/** A Claude runner the command picked, and what the report calls it. */
export type ChosenRunner = { run: ClaudeRunner; via: string }

/**
 * The runner to ask Claude with:  the API when `env` has `ANTHROPIC_API_KEY`, else `claude -p`.
 * - `ai`:  `false` (`--no-ai`) asks nothing, so it says nothing.
 * - SIDE EFFECT:  with no key, prints ONE warning, saying how to speed it up.
 */
export function claudeRunnerFor(env: NodeJS.ProcessEnv, { ai = true }: { ai?: boolean } = {}): ChosenRunner {
  const apiKey = env.ANTHROPIC_API_KEY
  if (apiKey) return { run: claudeApiRunner({ apiKey }), via: "Claude API" }
  if (ai) CLI.err(SPEED_UP)
  return { run: runClaude, via: "claude -p" }
}

/**
 * What `claudeRunnerFor()` says when it runs `claude -p`.
 * - Its numbers, measured on Solitaire, cold (epic `spanish` P27):  a `claude -p` call spends ~2 s starting,
 *   which the API doesn't;  the names pass is one round of calls at once, ~20 s.
 */
export const SPEED_UP =
  "Set ANTHROPIC_API_KEY to speed this up (names through the API:  about 18 s instead of 20 s for Solitaire;  " +
  "no claude -p to start, about 2 s a call)"

////////////////
// ## Tiers
////////////////

/**
 * Claude's model and effort for each pass at each tier (`EffortTier`):  what `--effort fast|balanced|best` asks.
 * - Measured on Solitaire and todos, cold, through `claude -p` (epic `spanish` P27, 2026-10-23):
 *   - names:  Opus at low effort was as fast as any, and the closest to Owen's own Solitario (27-35 of 42 names);
 *     more effort was slower and no closer (medium 21-27, high 22-27), Sonnet glued words (`comodínnegro`)
 *     and was refused names more, Haiku was slowest (~33 s) and broke a test
 *   - fix-ups:  every model and effort made the same fixes, first time;
 *     Opus at low effort answered soonest (7-9 s), at high 12-17 s, Haiku 15-21 s
 * - `best` fix-ups think harder, for lines harder than Solitaire's:  untested beyond these two projects.
 * - Through the API, a model that can turns thinking off (`THINKING_OFF`), whatever its tier.
 */
export const CLAUDE_TIERS: Record<AskingPass, Record<EffortTier, ClaudeSettings>> = {
  names: {
    fast: { model: "opus", effort: "low" },
    balanced: { model: "opus", effort: "low" },
    best: { model: "opus", effort: "low" }
  },
  fixUps: {
    fast: { model: "opus", effort: "low" },
    balanced: { model: "opus", effort: "low" },
    best: { model: "opus", effort: "high" }
  }
}

/** A Claude model, as `claude --model` takes it, and its effort. */
type ClaudeSettings = { model: string; effort: ClaudeEffort }

/**
 * `options` in Claude's own terms:  a pass's `tier` as the model and effort `CLAUDE_TIERS` has for it.
 * - A `model` or `effort` already given wins:  an exact one, passed through (`--model`).
 * - No `pass` or no `tier`:  as it is.
 */
export function inClaudeTerms(options: ClaudeOptions = {}): ClaudeOptions {
  if (!options.pass || !options.tier) return options
  const settings = CLAUDE_TIERS[options.pass][options.tier]
  return { ...options, model: options.model ?? settings.model, effort: options.effort ?? settings.effort }
}

////////////////
// ## The Claude API
////////////////

/**
 * A runner that asks the Claude API, straight:  one POST to `/v1/messages` a call (`requestFor()`).
 * - `apiKey`:  the person's, `ANTHROPIC_API_KEY`
 * - `fetch`, `sleep`:  a test's fakes
 * - Its answer is the reply's text:  JSON of the pass's `schema`, through structured outputs.
 * - A 429 (too many requests), 500 or 529 (overloaded), or no answer at all:  asked again, up to 3 times,
 *   after 1, 2 and 4 s, or as long as its `retry-after` says (at most 10 s).
 * - A 400 about the refusal fallbacks (an account without them):  asked again once without, and never again.
 * - throws `ClaudeApiError` for anything else, saying what failed;  and when Claude declines (a refusal)
 * - An answer cut off at `max_tokens` is answered as it is:  the pass finds it isn't JSON, and asks again smaller.
 */
export function claudeApiRunner({
  apiKey,
  fetch = globalThis.fetch,
  sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))
}: {
  apiKey: string
  fetch?: typeof globalThis.fetch
  sleep?: (ms: number) => Promise<void>
}): ClaudeRunner {
  let fallbacks = true
  return async (prompt, asked) => {
    const options = inClaudeTerms(asked)
    const model = modelFor(options.model)
    for (let attempt = 1; ; attempt++) {
      const request = requestFor(prompt, options, { model, fallbacks })
      let response: Response
      try {
        response = await fetch(API_URL, {
          method: "POST",
          headers: headersFor(apiKey, request),
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })
      } catch (error) {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffFor(attempt))
          continue
        }
        throw new ClaudeApiError(`Claude API (${model}):  no answer -- ${messageOf(error)}`, { cause: { model } })
      }
      if (response.ok) return textOf((await response.json()) as ApiMessage, model)
      const { type, message } = await errorOf(response)
      if (RETRIED_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
        await sleep(retryAfter(response) ?? backoffFor(attempt))
        continue
      }
      if (response.status === 400 && request.fallbacks && /fallback|anthropic-beta/i.test(message)) {
        fallbacks = false
        continue
      }
      throw new ClaudeApiError(`Claude API (${model}):  ${response.status} ${type}:  ${message}`, {
        cause: { model, status: response.status, type }
      })
    }
  }
}

/**
 * What the runner POSTs for `prompt`:  the Messages API's request.
 * - `system`:  ours, then the pass's `context`, cached:  the calls after the first read it for less, and sooner
 * - `output_config.format`:  the pass's `schema`, so the answer can only be JSON of that shape
 * - `output_config.effort`:  the pass's, else the model's own
 * - `thinking`:  off, on a model that can turn it off (`THINKING_OFF`);  Opus 5.5 can't, so a pass asks it at
 *   low effort instead
 * - `fallbacks`:  should Claude decline, the API asks the model it picks for that instead, in the same call
 */
export function requestFor(
  prompt: string,
  { effort, schema, context }: ClaudeOptions,
  { model, fallbacks = true }: { model: string; fallbacks?: boolean }
): ApiRequest {
  const outputConfig = {
    ...(effort ? { effort } : {}),
    ...(schema ? { format: { type: "json_schema", schema } } : {})
  }
  return {
    model,
    max_tokens: MAX_TOKENS,
    system: [
      { type: "text" as const, text: SYSTEM_PROMPT },
      ...(context ? [{ type: "text" as const, text: context, cache_control: { type: "ephemeral" as const } }] : [])
    ],
    messages: [{ role: "user", content: prompt }],
    ...(THINKING_OFF[model] ? { thinking: THINKING_OFF[model] } : {}),
    ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
    ...(fallbacks && FALLBACK_MODELS.has(model) ? { fallbacks: "default" } : {})
  }
}

/** The headers of a request:  the key, the API's version, and the fallbacks' beta when it has them. */
function headersFor(apiKey: string, request: ApiRequest): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": API_VERSION,
    ...(request.fallbacks ? { "anthropic-beta": FALLBACKS_BETA } : {})
  }
}

/** The reply's text;  throws `ClaudeApiError` if Claude declined. */
function textOf(reply: ApiMessage, model: string): string {
  if (reply.stop_reason === "refusal") {
    const why = reply.stop_details?.explanation ?? reply.stop_details?.category ?? "no reason given"
    throw new ClaudeApiError(`Claude API (${model}):  declined -- ${why}`, { cause: { model } })
  }
  return reply.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
}

/** A failed reply's error, as the API words it:  `{ type: "invalid_request_error", message: "..." }`. */
async function errorOf(response: Response): Promise<{ type: string; message: string }> {
  const text = await response.text().catch(() => "")
  try {
    const { error } = JSON.parse(text) as { error?: { type?: string; message?: string } }
    return { type: error?.type ?? "error", message: error?.message ?? text }
  } catch {
    return { type: "error", message: text || response.statusText }
  }
}

/** How long a reply's `retry-after` says to wait, in milliseconds, at most `MAX_WAIT_MS`. */
function retryAfter(response: Response): number | undefined {
  const seconds = Number(response.headers.get("retry-after"))
  return seconds > 0 ? Math.min(seconds * 1000, MAX_WAIT_MS) : undefined
}

/** How long to wait before attempt `attempt + 1`:  1, 2, then 4 s. */
function backoffFor(attempt: number): number {
  return 1000 * 2 ** (attempt - 1)
}

/** The model's id:  `opus`, `sonnet` and `haiku` as the newest of each;  default `DEFAULT_MODEL`. */
export function modelFor(model: string | undefined): string {
  return MODEL_ALIASES[model ?? ""] ?? model ?? DEFAULT_MODEL
}

/** Thrown when the Claude API fails, or declines:  `cause` says which model, and the reply's status and type. */
export class ClaudeApiError extends Error {
  declare cause: { model: string; status?: number; type?: string } | undefined
}
ClaudeApiError.prototype.name = "ClaudeApiError"

/** The Messages API. */
const API_URL = "https://api.anthropic.com/v1/messages"

/** The API version every request names. */
const API_VERSION = "2026-10-21"

/** The beta of `fallbacks: "default"`. */
const FALLBACKS_BETA = "server-side-fallback-2026-07-01"

/** The model a pass gets when it names none. */
export const DEFAULT_MODEL = "claude-opus-5-5"

/** The short names of models, as `claude --model` takes them, and the API's ids for them. */
const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5"
}

/**
 * How to turn thinking off, on each model that can:  faster, as a translation's answers need little.
 * - Opus 5.5 can't:  it always thinks, as little as its `effort` says.
 */
const THINKING_OFF: Record<string, { type: string }> = {
  "claude-sonnet-5-5": { type: "between_tools" },
  "claude-haiku-5-5": { type: "disabled" },
  "claude-opus-5": { type: "disabled" },
  "claude-sonnet-5": { type: "disabled" }
}

/** The models `fallbacks: "default"` works on. */
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"])

/** The most an answer may be, in tokens:  a big fix-up round is a few thousand. */
const MAX_TOKENS = 16000

/** How long one call may take before it's given up on. */
const TIMEOUT_MS = 5 * 60 * 1000

/** How many times a call is tried, at most:  once, and 3 retries. */
const MAX_ATTEMPTS = 4

/** The statuses worth asking again:  too many requests, the API's own error, overloaded. */
const RETRIED_STATUSES = new Set([429, 500, 529])

/** The longest a `retry-after` is waited for. */
const MAX_WAIT_MS = 10_000

/** A Messages API request, as `requestFor()` writes it. */
export type ApiRequest = {
  model: string
  max_tokens: number
  system: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>
  messages: Array<{ role: "user"; content: string }>
  thinking?: { type: string }
  output_config?: { effort?: string; format?: { type: string; schema: unknown } }
  fallbacks?: string
}

/** A Messages API reply, as far as the runner reads it. */
type ApiMessage = {
  content: Array<{ type: string; text?: string }>
  stop_reason?: string
  stop_details?: { category?: string; explanation?: string } | null
}

////////////////
// ## claude -p
////////////////

/**
 * Run `claude -p` on `prompt`:  what it printed.
 * - As fast as its flags make it (epic `spanish` P26):
 *   - no tools, from a folder of its own:  it only answers
 *   - `--safe-mode`, `--strict-mcp-config`:  none of the person's hooks, plugins, MCP servers or `CLAUDE.md`
 *   - its own short system prompt, not Claude Code's long one, with the pass's `context` after it
 *   - `--no-session-persistence`:  no session saved
 * - `--json-schema`:  the pass's `schema`, so it prints only JSON of that shape (P27)
 * - `effort`, `model`:  `claude --effort`, `--model`, when given;  else a pass's `tier`'s (`inClaudeTerms()`).
 * - Several at once run side by side (the names pass's second stage).
 * - throws if it couldn't run, or failed
 * - SIDE EFFECT:  runs `claude`;  it must be on the `PATH`, signed in.
 */
export function runClaude(prompt: string, options?: ClaudeOptions): Promise<string> {
  const { effort, model, schema, context } = inClaudeTerms(options)
  return new Promise((done, fail) => {
    const args = [
      "-p",
      ...["--tools", "", "--safe-mode", "--strict-mcp-config", "--no-session-persistence"],
      ...["--system-prompt", context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT],
      ...(schema ? ["--json-schema", JSON.stringify(schema)] : []),
      ...(effort ? ["--effort", effort] : []),
      ...(model ? ["--model", model] : [])
    ]
    const child = spawn("claude", args, { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (data) => (stdout += data))
    child.stderr.on("data", (data) => (stderr += data))
    child.on("error", fail)
    child.on("close", (code) => (code === 0 ? done(stdout) : fail(new Error(stderr || `claude exited ${code}`))))
    child.stdin.end(prompt)
  })
}

/** What Claude is told it is, through either runner, in place of Claude Code's own system prompt. */
const SYSTEM_PROMPT =
  "You translate programs written in spell, a programming language of plain words, from one human language into " +
  "another.  Answer only with what you're asked for, in the form asked for."

/** `error`'s message. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
