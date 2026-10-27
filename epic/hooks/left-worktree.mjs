#!/usr/bin/env node
/**
 * Claude Code's `PostToolUse` hook on `ExitWorktree` (the plugin's `hooks/hooks.json`):
 * reminds the session that leaving a worktree closes out its work,
 * so its reply may end with `*You can close this tab*`.
 * - Epic `epic-eject` P10, Owen's r1:  a session left with `ExitWorktree` keep and never said it.
 * - The rule itself:  the isolate skill's "Closing line" (`skills/isolate/SKILL.md`).
 *   This hook only points at it, so a bare `ExitWorktree`, outside `/isolate done`, follows it too.
 * - stdin `{ cwd, hook_event_name, tool_input: { action }, ... }`;
 *   stdout `{ hookSpecificOutput }` JSON, or nothing.
 * - Only in a repo that uses epics (it has `.epic/config.json5`):  the plugin's hooks run in every repo.
 *   After `ExitWorktree`, `cwd` is the checkout the session went back to.
 * - Always exits 0, at once:  never blocks a session.
 * - Its tests:  `tests/src/command/LeftWorktree.test.ts`, which runs this file as the hook.
 */
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so a config that won't read never fails the hook
  const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
  const config = input.cwd && EpicConfig.of(input.cwd)
  if (config && existsSync(config.file)) {
    const skill = fileURLToPath(new URL("../skills/isolate/SKILL.md", import.meta.url))
    const kept = input.tool_input?.action !== "remove"
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: input.hook_event_name ?? "PostToolUse",
          additionalContext:
            "This session just left its worktree, which closes out its work:  close this reply as the isolate " +
            `skill's "Closing line" says (${skill}).  End it with a line of its own, \`*You can close this tab*\`, ` +
            "only when nothing is left for this session:  no uncommitted or unmerged work, no background task or " +
            "agent running, no question waiting on Owen.  Otherwise leave the line out and say what keeps the tab " +
            "open." +
            (kept
              ? "  The worktree is still on disk:  with the line, also ask (AskUserQuestion) whether to run " +
                'it:  "Run `/epic done`" (Recommended) / "Leave it" in an epic\'s session (Owen, 2026-10-24), else ' +
                '"Run `/isolate done`" (Recommended) / "Leave it".'
              : "")
        }
      })
    )
  }
} catch (error) {
  console.error(`left-worktree hook:  ${error.message}`)
}
process.exit(0)
