/**
 * `PromptAck`:  the "On it:  ..." line for a message sent while the session is busy, and its log.
 * - Claude Code's folder is a temp one with a made-up session registry;  the summary is a stub, never `claude -p`.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeEach, expect, test } from "vite-plus/test"

import { BUSY_BEFORE_MS, PromptAck } from "spell/epic/command/PromptAck"

const home = mkdtempSync(join(tmpdir(), "prompt-ack-home-"))
const repo = mkdtempSync(join(tmpdir(), "prompt-ack-repo-"))
spawnSync("git", ["init", "-q", repo])

const NOW = Date.parse("2026-10-22T12:00:00Z")
const MESSAGE = "can each epic session keep listening to its review page while it's open?"

/** Session `s1` in the registry, `status` since `since`. */
function record(status: string, since: number): void {
  mkdirSync(join(home, "sessions"), { recursive: true })
  writeFileSync(join(home, "sessions", "1.json"), JSON.stringify({ sessionId: "s1", status, statusUpdatedAt: since }))
}

/** A `PromptAck` on the temp folder, its summary a stub that says what it was given. */
function ack(): PromptAck {
  return new PromptAck({ home, summarize: (text) => `Asks ${text.length} characters' worth.` })
}

beforeEach(() => rmSync(join(home, "sessions"), { recursive: true, force: true }))

afterAll(() => {
  rmSync(home, { recursive: true, force: true })
  rmSync(repo, { recursive: true, force: true })
})

test("a real message, sent while the session was busy:  On it, with the summary", () => {
  record("busy", NOW - 60_000)
  const answer = ack().answer({ prompt: MESSAGE, cwd: repo, session_id: "s1" }, { now: NOW })
  expect(answer).toEqual({ systemMessage: `On it:  Asks ${MESSAGE.length} characters' worth.` })
})

test("no line:  idle, busy only since the message, short, a slash command, gated", () => {
  const input = { prompt: MESSAGE, cwd: repo, session_id: "s1" }
  record("idle", NOW - 60_000)
  expect(ack().answer(input, { now: NOW })).toBeNull()
  // its own turn made it busy:  that's not busy BEFORE
  record("busy", NOW - BUSY_BEFORE_MS / 2)
  expect(ack().answer(input, { now: NOW })).toBeNull()
  record("busy", NOW - 60_000)
  expect(ack().answer({ ...input, prompt: "yes, go on" }, { now: NOW })).toBeNull()
  expect(ack().answer({ ...input, prompt: `/epic review ${MESSAGE}` }, { now: NOW })).toBeNull()
  expect(ack().answer(input, { now: NOW, gated: true })).toBeNull()
  // no record of the session
  expect(ack().answer({ ...input, session_id: "s2" }, { now: NOW })).toBeNull()
})

test("every prompt is logged in the checkout's git folder:  the session's state, the length, what it did", () => {
  record("busy", NOW - 60_000)
  ack().answer({ prompt: MESSAGE, cwd: repo, session_id: "s1" }, { now: NOW })
  ack().answer({ prompt: "ok", cwd: repo, session_id: "s1" }, { now: NOW })
  const log = readFileSync(join(repo, ".git", "epic-prompts.log"), "utf8")
    .trim()
    .split("\n")
  expect(log.at(-2)).toMatch(new RegExp(`^2026-10-22T12:00:00.000Z  s1  busy for 60s  ${MESSAGE.length} chars  ack in`))
  expect(log.at(-1)).toContain("2 chars  no ack:  short")
})

test("a failing summary:  no line, and the prompt goes on", () => {
  record("busy", NOW - 60_000)
  const failing = new PromptAck({ home, summarize: () => null })
  expect(failing.answer({ prompt: MESSAGE, cwd: repo, session_id: "s1" }, { now: NOW })).toBeNull()
  const throwing = new PromptAck({
    home,
    summarize: () => {
      throw new Error("boom")
    }
  })
  expect(throwing.answer({ prompt: MESSAGE, cwd: repo, session_id: "s1" }, { now: NOW })).toBeNull()
})
