#!/usr/bin/env node
/**
 * Claude Code's `UserPromptSubmit` hook (the plugin's `hooks/hooks.json`):
 * checks `/isolate`, `/epic` and `/unpark` prompts BEFORE Claude reads them.
 * Every other prompt passes untouched.
 * - The rules are the epic code's, `PromptGate` (`src/command/PromptGate.ts`):
 *   what it refuses, how it renames the session, what it saves.
 *   This hook is its thin caller (epic `epic-eject` P5).
 * - stdin `{ prompt, cwd, session_id, session_title, permission_mode, ... }`;
 *   stdout `PromptGate.gate()`'s answer, JSON, or nothing to let the prompt through.
 * - The window script works on the SESSION's checkout (`EPIC_CHECKOUT`, from `cwd`):
 *   this plugin is its own repo.
 *   - ALWAYS `cwd`, never one the session inherited:  a window could hand its sessions the checkout that opened it
 *     (epic `epic-engine` P9).
 * - Plain `node`:  `PromptGate.ts` loads with its types stripped.
 * - Then `PromptAck` (epic `epic-engine` P18):  a prompt the gate let through, sent while the session is busy, gets
 *   an "On it:  <what Owen asked>" line for him (`systemMessage`);  every prompt is logged to `epic-prompts.log` in
 *   the checkout's git folder.
 * - And the session's moves (`SessionMoves`, epic `epic-engine` P26), first:
 *   - marks the session, so `epic window handoff` / `launch --move` know its hooks run (`sawHooks()`)
 *   - a move promised last turn and never started (the end-of-turn hook didn't run):  said, to Owen and Claude,
 *     and its record cleared (`missedMove()`)
 *   - "last turn":  the session wasn't busy when the prompt came;  a busy one's record may be this turn's own
 * - Never fails a prompt:  any error exits 0, the prompt untouched.
 * - Its tests:  `tests/src/command/PromptGate.test.ts`, which runs this file as the hook too.
 */
import { readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  if (input.cwd) process.env.EPIC_CHECKOUT = input.cwd
  const missed = await sessionMoves(input)
  // loaded in here, so a gate that won't load never fails the prompt
  const { PromptGate } = await import("spell/epic/command/PromptGate.ts")
  const { Window } = await import("spell/epic/window.mjs")
  const output = PromptGate.gate(input, Window.current())
  // a prompt the gate let through, sent while the session is busy:  "On it:  ..." (epic `epic-engine` P18)
  const { PromptAck } = await import("spell/epic/command/PromptAck.ts")
  const ack = new PromptAck().answer(input, { gated: Boolean(output) })
  const { SessionMoves } = await import("spell/epic/command/SessionMoves.ts")
  const answer = SessionMoves.withMissed(output ?? ack, missed)
  if (answer) console.log(JSON.stringify(answer))
} catch (error) {
  console.error(`prompt-gate hook:  ${error.message}`)
}

/** The session's mark, then its missed move (`SessionMoves`), or `null`:  never stops the prompt. */
async function sessionMoves(input) {
  try {
    const { SessionMoves } = await import("spell/epic/command/SessionMoves.ts")
    const { PromptAck, BUSY_BEFORE_MS } = await import("spell/epic/command/PromptAck.ts")
    const moves = new SessionMoves()
    moves.sawHooks(input.session_id)
    const { status, forMs } = new PromptAck().sessionState(input.session_id)
    const turnEnded = !(status === "busy" && forMs >= BUSY_BEFORE_MS)
    return moves.missedMove(input.session_id, { turnEnded })
  } catch (error) {
    console.error(`prompt-gate hook:  moves not checked:  ${error.message}`)
    return null
  }
}
