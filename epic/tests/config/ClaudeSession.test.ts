/**
 * Tests of `ClaudeSession.isUnattended()`:  which sessions the waiting hooks stand down in (epic `epic-engine` I319).
 */
import { expect, test } from "vite-plus/test"

import { ClaudeSession } from "spell/epic/config/ClaudeSession.mjs"

test("isUnattended:  `claude -p`, the Agent SDK, a background session (Claude Code says 0)", () => {
  expect(ClaudeSession.isUnattended({ CLAUDE_CODE_SESSION_ATTENDED: "0" })).toBe(true)
})

test("isUnattended:  a terminal session, VS Code's panel, the desktop app (Claude Code says 1) are attended", () => {
  expect(ClaudeSession.isUnattended({ CLAUDE_CODE_SESSION_ATTENDED: "1" })).toBe(false)
})

test("isUnattended:  not set (an older Claude Code, a shell) counts as attended:  the poller runs as before", () => {
  expect(ClaudeSession.isUnattended({})).toBe(false)
  expect(ClaudeSession.isUnattended({ CLAUDE_CODE_SESSION_ATTENDED: "" })).toBe(false)
})
