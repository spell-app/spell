/**
 * `FreshHint`:  the one line suggesting `/epic fresh` once an epic's session transcript is past `freshHintMB`.
 * - A temp repo with its own `.epic/config.json5` (a 1 MB threshold) and an epic page;  the transcripts are scratch
 *   files of the size asked;  the marks go in a temp folder.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeEach, expect, test } from "vite-plus/test"

import { FreshHint } from "spell/epic/command/FreshHint"

const repo = mkdtempSync(join(tmpdir(), "fresh-hint-repo-"))
spawnSync("git", ["init", "-q", repo])
mkdirSync(join(repo, ".epic"))
writeFileSync(join(repo, ".epic", "config.json5"), JSON.stringify({ contentFolder: "content", freshHintMB: 1 }))
mkdirSync(join(repo, "content", "epics", "seo"), { recursive: true })
writeFileSync(join(repo, "content", "epics", "seo", "seo.plan.html"), "<epic-page></epic-page>\n")

const scratch = mkdtempSync(join(tmpdir(), "fresh-hint-scratch-"))
const marks = join(scratch, "marks")
const SESSION = "0a1b2c3d-0000-4000-8000-000000000001"

/** A transcript of `megabytes` MB, in the scratch folder. */
function transcript(megabytes: number): string {
  const file = join(scratch, `${megabytes}.jsonl`)
  writeFileSync(file, Buffer.alloc(Math.round(megabytes * 1024 * 1024), "x"))
  return file
}

/** The hook's input for a session titled `title`, its transcript `megabytes` MB. */
function input(megabytes: number, title = "🚧 seo") {
  return { session_id: SESSION, transcript_path: transcript(megabytes), cwd: repo, session_title: title }
}

beforeEach(() => rmSync(marks, { recursive: true, force: true }))

afterAll(() => {
  rmSync(repo, { recursive: true, force: true })
  rmSync(scratch, { recursive: true, force: true })
})

test("past the threshold, in an epic's session:  the line, to the person and to Claude, once", () => {
  const hint = new FreshHint({ marks })
  const answer = hint.answer(input(1.4), null)
  expect(answer).toMatchObject({
    systemMessage: expect.stringMatching(/conversation is 1 MB.*`\/epic fresh` hands seo to a new session/),
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: expect.stringContaining("one line") }
  })
  // once per session
  expect(hint.answer(input(2), null)).toBeNull()
})

test("no line:  under the threshold, no epic, a bad session id, or turned off", () => {
  const hint = new FreshHint({ marks })
  expect(hint.answer(input(0.5), null)).toBeNull()
  expect(hint.answer(input(2, "🚧 not-an-epic"), null)).toBeNull()
  expect(hint.answer({ ...input(2), session_id: "../nope" }, null)).toBeNull()
  writeFileSync(join(repo, ".epic", "config.json5"), JSON.stringify({ contentFolder: "content", freshHintMB: 0 }))
  try {
    expect(hint.answer(input(2), null)).toBeNull()
  } finally {
    writeFileSync(join(repo, ".epic", "config.json5"), JSON.stringify({ contentFolder: "content", freshHintMB: 1 }))
  }
})

test("added to what the hook says already;  a block stays as it is", () => {
  const hint = new FreshHint({ marks })
  const block = { decision: "block" as const, reason: "no" }
  expect(hint.answer(input(2), block)).toBe(block)
  const answer = hint.answer(input(2), { systemMessage: "On it:  something" })
  expect(answer).toMatchObject({ systemMessage: expect.stringMatching(/^On it:  something\n\nThis session's/) })
})

test("the epic:  the title's, without its icon, else the worktree's;  only one with an epic page", () => {
  expect(FreshHint.epicOf(repo, "🚧 seo")).toBe("seo")
  expect(FreshHint.epicOf(repo, "seo")).toBe("seo")
  expect(FreshHint.epicOf(repo, "something else")).toBeUndefined()
})

test("break points:  a phase done, a merge, an agent back;  nothing else", () => {
  expect(FreshHint.breakOf("epic merge", ["seo"])).toBe(true)
  expect(FreshHint.breakOf("epic agents done", ["docs"])).toBe(true)
  expect(FreshHint.breakOf("epic agents", ["done", "docs"])).toBe(true)
  expect(FreshHint.breakOf("epic phase", ["seo#P3", "done", "--done", "<ul></ul>"])).toBe(true)
  expect(FreshHint.breakOf("epic phase", ["seo#P3", "active"])).toBe(false)
  expect(FreshHint.breakOf("epic agents", ["add", "docs"])).toBe(false)
  expect(FreshHint.breakOf("epic update", ["seo#T3", "done"])).toBe(false)
})

test("again at a break point, past the threshold, at most once per half hour;  never at any other verb", () => {
  const home = join(scratch, "claude")
  const saved = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = home
  mkdirSync(join(home, "projects", "-repo"), { recursive: true })
  writeFileSync(join(home, "projects", "-repo", `${SESSION}.jsonl`), Buffer.alloc(2 * 1024 * 1024, "x"))
  const env = { CLAUDE_CODE_SESSION_ID: SESSION }
  const now = Date.now()
  const hint = new FreshHint({ marks })
  try {
    // the prompt hook's first line, then a merge right after:  nothing new to say yet
    expect(hint.answer(input(2), null)).not.toBeNull()
    expect(hint.atBreak("epic merge", ["seo"], { env, cwd: repo })).toBeNull()
    // an hour on, the phase is done:  said again, the epic from the verb's own argument
    const line = hint.atBreak("epic phase", ["seo#P3", "done"], { env, cwd: repo, now: now + 3_600_000 })
    expect(line).toMatch(/conversation is 2 MB.*hands seo to a new session.*an agent passes it on/)
    // and not again ten minutes later, nor at a verb that ends nothing
    expect(hint.atBreak("epic agents done", ["docs"], { env, cwd: repo, now: now + 4_200_000 })).toBeNull()
    expect(hint.atBreak("epic summary", ["seo"], { env, cwd: repo, now: now + 9_000_000 })).toBeNull()
    // no session:  nothing
    expect(hint.atBreak("epic merge", ["seo"], { env: {}, cwd: repo, now: now + 9_000_000 })).toBeNull()
    expect(hint.atBreak("epic merge", ["seo"], { env, cwd: repo, now: now + 9_000_000 })).not.toBeNull()
  } finally {
    if (saved === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = saved
  }
})
