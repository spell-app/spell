#!/usr/bin/env node
/**
 * The `PreToolUse` hook on Bash (the plugin's `hooks/hooks.json`;  Codex's `hooks/codex-hooks.json`):  the COMMAND GUARD
 * (epic `epic-engine` P84).  A command an agent is about to run that would start, stop, restart or kill a MAIN
 * checkout's server is refused, saying what to run instead (`epic servers ...`).
 * - The rules are the epic code's, `ServerGuard` (`src/server/ServerGuard.ts`);  this hook is its thin caller.
 * - Only the agent's own commands reach it:  the person's `!` commands are typed into the chat and run there, never as
 *   a tool call (a transcript keeps them as `<bash-input>`), and their own terminal is no agent's.
 * - While the server keeper's HANDS-OFF switch is on, everything goes through, with one line saying so.
 * - QUICK:  a command naming none of the words a guarded one needs (`QUICK_WORDS`) is let through before anything loads.
 * - stdin `{ tool_name, tool_input: { command }, cwd, ... }`;  stdout, refused:
 *   `{ hookSpecificOutput:  { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason } }`
 *   (Claude Code's and Codex's shape alike);  let through:  nothing
 * - `--codex-plugin`:  run from the Codex plugin's own hooks file;  stands down while `~/.codex/hooks.json` runs it
 *   (`CodexHome.skipPluginHook()`)
 * - FAILS OPEN:  any error lets the command through.  Always exits 0.
 * - Its test:  `tests/server/ServerGuard.test.ts`, which runs this file as the hook too.
 */
import { readFileSync } from "node:fs"

/** A guarded command names one of these;  anything else is let through at once. */
const QUICK_WORDS = /\b(server|servers|vite|vp|kill|pkill|killall|hub|start|dev|serve)\b/

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  const command = input.tool_input?.command
  if (typeof command === "string" && QUICK_WORDS.test(command) && !(await standsDown())) {
    // loaded in here, so a guard that won't load never fails the hook
    const { ServerGuard } = await import("spell/epic/server/ServerGuard.ts")
    const guard = ServerGuard.forMachine()
    if (guard.isHandsOff) {
      const probe = new ServerGuard({ mains: guard.mains }).check(command, input.cwd || process.cwd())
      if (probe) {
        const additionalContext = `Hands off is on (the Servers tab):  the server guard let this through:  ${probe.command}`
        console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext } }))
      }
    } else {
      const refused = guard.check(command, input.cwd || process.cwd())
      if (refused) {
        const permissionDecisionReason = ServerGuard.message(refused)
        console.log(
          JSON.stringify({
            hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason }
          })
        )
      }
    }
  }
} catch (error) {
  console.error(`server-guard hook:  ${error.message}`)
}
process.exit(0)

/** Codex's plugin copy, while Codex's own hooks file runs this one */
async function standsDown() {
  if (!process.argv.includes("--codex-plugin")) return false
  const { CodexHome } = await import("spell/epic/config/CodexHome.ts")
  return CodexHome.skipPluginHook()
}
