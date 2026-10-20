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
 * - Never fails a prompt:  any error exits 0, the prompt untouched.
 * - Its tests:  `tests/src/command/PromptGate.test.ts`, which runs this file as the hook too.
 */
import { readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  if (input.cwd) process.env.EPIC_CHECKOUT = input.cwd
  // loaded in here, so a gate that won't load never fails the prompt
  const { PromptGate } = await import("../src/command/PromptGate.ts")
  const { Window } = await import("../src/window.mjs")
  const output = PromptGate.gate(input, Window.current())
  if (output) console.log(JSON.stringify(output))
} catch (error) {
  console.error(`prompt-gate hook:  ${error.message}`)
}
