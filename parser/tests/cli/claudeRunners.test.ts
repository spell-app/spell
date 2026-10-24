import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import {
  CLAUDE_TIERS,
  claudeApiRunner,
  claudeRunnerFor,
  inClaudeTerms,
  runClaude,
  SPEED_UP,
  type ApiRequest
} from "spell-parser/cli/claudeRunners"

/**
 * The two ways `spell translate` asks Claude (epic `spanish` P27):  the Claude API, straight, and `claude -p`.
 * - The API's `fetch` is a fake:  it keeps each request, and answers from a list.
 */

const SCHEMA = {
  type: "object",
  properties: { fixes: { type: "array", items: { type: "string" } } },
  required: ["fixes"],
  additionalProperties: false
}

afterEach(() => vi.restoreAllMocks())

describe("inClaudeTerms():  a pass's tier as Claude's model and effort", () => {
  test("each pass at each tier, from CLAUDE_TIERS;  an exact model or effort wins;  no tier, as it is", () => {
    expect(inClaudeTerms({ pass: "fixUps", tier: "best" })).toMatchObject(CLAUDE_TIERS.fixUps.best)
    expect(inClaudeTerms({ pass: "names", tier: "fast" })).toMatchObject(CLAUDE_TIERS.names.fast)
    expect(inClaudeTerms({ pass: "fixUps", tier: "best", model: "sonnet" })).toMatchObject({
      model: "sonnet",
      effort: CLAUDE_TIERS.fixUps.best.effort
    })
    expect(inClaudeTerms({ effort: "low" })).toEqual({ effort: "low" })
    expect(inClaudeTerms()).toEqual({})
  })

  test("the API asks the tier's model, at its effort", async () => {
    const { run, requests } = apiRunner([reply("{}")])
    await run("a", { pass: "fixUps", tier: "best" })
    expect(requests[0]!.body.model).toBe("claude-opus-5-5")
    expect(requests[0]!.body.output_config).toEqual({ effort: CLAUDE_TIERS.fixUps.best.effort })
  })
})

describe("claudeApiRunner():  one POST to the Messages API a call", () => {
  test("the request:  model, no thinking it can turn off, low effort, the schema, the glossary cached, headers", async () => {
    const { run, requests } = apiRunner([reply('{ "fixes": [] }')])
    const answer = await run("Fix these lines", { effort: "low", model: "opus", schema: SCHEMA, context: "GLOSSARY" })
    expect(answer).toBe('{ "fixes": [] }')
    const [{ url, init, body }] = requests
    expect(url).toBe("https://api.anthropic.com/v1/messages")
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "x-api-key": "sk-test",
      "anthropic-version": "2026-10-21",
      "anthropic-beta": "server-side-fallback-2026-07-01"
    })
    expect(body.model).toBe("claude-opus-5-5")
    // Opus 5.5 always thinks:  `thinking` left out, as little as low effort says
    expect(body.thinking).toBeUndefined()
    expect(body.output_config).toEqual({ effort: "low", format: { type: "json_schema", schema: SCHEMA } })
    expect(body.system).toEqual([
      { type: "text", text: expect.stringContaining("You translate programs written in spell") },
      { type: "text", text: "GLOSSARY", cache_control: { type: "ephemeral" } }
    ])
    expect(body.messages).toEqual([{ role: "user", content: "Fix these lines" }])
    expect(body.fallbacks).toBe("default")
    expect(body.max_tokens).toBe(16000)
  })

  test("thinking off on a model that can;  no fallbacks where they don't work;  no model:  Opus 5.5", async () => {
    const { run, requests } = apiRunner([reply("{}"), reply("{}"), reply("{}")])
    await run("a", { model: "sonnet", effort: "low" })
    await run("b", { model: "claude-haiku-5-5" })
    await run("c")
    expect(requests.map(({ body }) => [body.model, body.thinking?.type, body.fallbacks])).toEqual([
      ["claude-sonnet-5-5", "between_tools", "default"],
      ["claude-haiku-5-5", "disabled", undefined],
      ["claude-opus-5-5", undefined, "default"]
    ])
    expect(requests[1]!.init.headers).not.toHaveProperty("anthropic-beta")
    expect(requests[2]!.body.output_config).toBeUndefined()
  })

  test("the answer is its text blocks, joined:  thinking blocks aside", async () => {
    const { run } = apiRunner([
      reply("", {
        content: [
          { type: "thinking", thinking: "" },
          { type: "text", text: '{ "a": ' },
          { type: "text", text: "1 }" }
        ]
      })
    ])
    expect(await run("prompt")).toBe('{ "a": 1 }')
  })

  test("an answer cut off at max_tokens comes back as it is:  the pass finds it isn't JSON, and asks again", async () => {
    const { run } = apiRunner([reply('{ "fixes": [ { "fi', { stop_reason: "max_tokens" })])
    expect(await run("prompt")).toBe('{ "fixes": [ { "fi')
  })

  test("a 429, then a 529:  asked again after a short wait, its retry-after first", async () => {
    const { run, requests, waits } = apiRunner([
      failure(429, "rate_limit_error", "Too many requests", { "retry-after": "3" }),
      failure(529, "overloaded_error", "Overloaded"),
      reply("{}")
    ])
    expect(await run("prompt")).toBe("{}")
    expect(requests).toHaveLength(3)
    expect(waits).toEqual([3000, 2000])
  })

  test("still overloaded after 3 retries:  throws, saying what failed", async () => {
    const overloaded = () => failure(529, "overloaded_error", "Overloaded")
    const { run, requests, waits } = apiRunner([overloaded(), overloaded(), overloaded(), overloaded()])
    await expect(run("prompt")).rejects.toThrow("Claude API (claude-opus-5-5):  529 overloaded_error:  Overloaded")
    expect(requests).toHaveLength(4)
    expect(waits).toEqual([1000, 2000, 4000])
  })

  test("any other error throws at once, saying what failed:  the status, the API's type and message", async () => {
    const { run, requests } = apiRunner([failure(401, "authentication_error", "invalid x-api-key")])
    await expect(run("prompt", { model: "sonnet" })).rejects.toThrow(
      "Claude API (claude-sonnet-5-5):  401 authentication_error:  invalid x-api-key"
    )
    expect(requests).toHaveLength(1)
  })

  test("no answer at all (the network):  asked again, then throws saying so", async () => {
    const down = () => Promise.reject(new TypeError("fetch failed"))
    const { run, requests } = apiRunner([down(), reply("{}")])
    expect(await run("prompt")).toBe("{}")
    expect(requests).toHaveLength(2)
  })

  test("an account without refusal fallbacks:  asked again without them, and never again", async () => {
    const { run, requests } = apiRunner([
      failure(
        400,
        "invalid_request_error",
        "Unexpected value(s) `server-side-fallback-2026-07-01` for the `anthropic-beta` header."
      ),
      reply("{}"),
      reply("{}")
    ])
    await run("a")
    await run("b")
    expect(requests.map(({ body }) => body.fallbacks)).toEqual(["default", undefined, undefined])
  })

  test("Claude declining throws, saying why", async () => {
    const { run } = apiRunner([reply("", { stop_reason: "refusal", stop_details: { category: "cyber" } })])
    await expect(run("prompt")).rejects.toThrow("Claude API (claude-opus-5-5):  declined -- cyber")
  })
})

describe("claudeRunnerFor():  the API with a key, else claude -p and one warning", () => {
  test("ANTHROPIC_API_KEY set:  the API, nothing said", () => {
    const err = vi.spyOn(CLI, "err").mockImplementation(() => {})
    const chosen = claudeRunnerFor({ ANTHROPIC_API_KEY: "sk-test" })
    expect(chosen.via).toBe("Claude API")
    expect(chosen.run).not.toBe(runClaude)
    expect(err).not.toHaveBeenCalled()
  })

  test("no key:  claude -p, and ONE warning saying how to speed it up", () => {
    const err = vi.spyOn(CLI, "err").mockImplementation(() => {})
    const chosen = claudeRunnerFor({})
    expect(chosen).toEqual({ run: runClaude, via: "claude -p" })
    expect(err.mock.calls).toEqual([[SPEED_UP]])
    expect(SPEED_UP).toMatch(/^Set ANTHROPIC_API_KEY to speed this up/)
  })

  test("no key and --no-ai:  nothing asked, so nothing said", () => {
    const err = vi.spyOn(CLI, "err").mockImplementation(() => {})
    claudeRunnerFor({}, { ai: false })
    expect(err).not.toHaveBeenCalled()
  })
})

////////////////
// ## Helpers
////////////////

/** An API runner whose `fetch` answers `responses` in turn, keeping each request;  its waits, kept, not waited. */
function apiRunner(responses: Array<Promise<Response> | Response>) {
  const requests: Array<{ url: string; init: RequestInit; body: ApiRequest }> = []
  const waits: number[] = []
  const fetch = ((url: string, init: RequestInit) => {
    requests.push({ url, init, body: JSON.parse(init.body as string) as ApiRequest })
    return Promise.resolve(responses.shift()!)
  }) as unknown as typeof globalThis.fetch
  const run = claudeApiRunner({
    apiKey: "sk-test",
    fetch,
    sleep: (ms) => {
      waits.push(ms)
      return Promise.resolve()
    }
  })
  return { run, requests, waits }
}

/** A Messages API reply of `text`, or of what `rest` says. */
function reply(text: string, rest: Record<string, unknown> = {}): Response {
  return Response.json({ content: [{ type: "text", text }], stop_reason: "end_turn", ...rest })
}

/** A failed reply, as the API words it. */
function failure(status: number, type: string, message: string, headers: Record<string, string> = {}): Response {
  return Response.json({ type: "error", error: { type, message } }, { status, headers })
}
