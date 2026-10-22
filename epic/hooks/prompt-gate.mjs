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
 * - Never fails a prompt:  any error exits 0, the prompt untouched.
 * - Its tests:  `tests/src/command/PromptGate.test.ts`, which runs this file as the hook too.
 */
import { readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  if (input.cwd) process.env.EPIC_CHECKOUT = input.cwd
  // loaded in here, so a gate that won't load never fails the prompt
  const { PromptGate } = await import("spell-epic/command/PromptGate.ts")
  const { Window } = await import("spell-epic/window.mjs")
  const output = PromptGate.gate(input, Window.current())
  // a prompt the gate let through, sent while the session is busy:  "On it:  ..." (epic `epic-engine` P18)
  const { PromptAck } = await import("spell-epic/command/PromptAck.ts")
  const ack = new PromptAck().answer(input, { gated: Boolean(output) })
  if (output ?? ack) console.log(JSON.stringify(output ?? ack))
} catch (error) {
  console.error(`prompt-gate hook:  ${error.message}`)
}
