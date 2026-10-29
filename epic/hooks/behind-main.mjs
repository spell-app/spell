#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` and `PostToolUse` (`EnterWorktree`) hooks (the plugin's `hooks/hooks.json`), and
 * Codex's `SessionStart` ([codex-hooks.json](codex-hooks.json), epic `epic-friend` P11):
 * says when the session's worktree is behind `main` (epic `epic-eject` P1).
 * - `main` here is the repo's base branch:  `baseBranch` in its `.epic/config.json5` (`EpicConfig`).
 * - Why:  a worktree runs its OWN copy of the repo's code and pages, as old as its branch.
 *   Nothing told anyone, and windows sat 54-154 commits behind:  new features showed up half-done there.
 * - stdin `{ cwd, hook_event_name, tool_input, ... }`.
 *   The folder checked:  `tool_input.path` (an `EnterWorktree` by path), else `cwd` (by name, the skills' way since
 *   epic `epic-engine` P16).
 * - Only in a repo set up for epics (`EpicConfig.ofSetUp()`:  it has `.epic/config.json5`):
 *   the plugin's hooks run in every repo.
 * - On `main`, outside git, or not behind:  nothing.
 * - Behind:  a line for the person (`systemMessage`), and one for the agent (`additionalContext`):
 *   offer the merge, in its question modal if it has one, else in the chat.
 * - Then, behind or not:  starts `patch-checkout.mjs` for the checkout, DETACHED (epic `epic-engine` P17), which gives
 *   it the fixes its repo lists in `"checkoutPatches"` that it lacks (`CheckoutPatches`);  its lines go to
 *   `epic-patches.log` in the checkout's git folder, and nothing is said:  a patch is meant to go unnoticed.
 * - Always exits 0, within a few seconds:  never blocks a session.
 */
import { spawn } from "node:child_process"
import { openSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { Git } from "spell/server/Git"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  const dir = input.tool_input?.path ?? input.cwd
  // loaded in here, so a config that won't read never fails the hook
  const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
  const main = dir && EpicConfig.ofSetUp(dir)?.baseBranch
  if (main) patchInBackground(dir)
  const behind = main && behindMain(dir, main)
  if (behind) {
    const { branch, count } = behind
    const commits = count === 1 ? "1 commit" : `${count} commits`
    console.log(
      JSON.stringify({
        systemMessage: `⎇ ${branch} is ${commits} behind ${main}:  its code and pages are that old.`,
        hookSpecificOutput: {
          hookEventName: input.hook_event_name ?? "SessionStart",
          additionalContext:
            `This worktree (branch ${branch}) is ${commits} behind ${main}, so its code and pages are that old.  ` +
            `Tell the person in one line, and offer to merge ${main} in now:  \`epic worktree merge-main\`, ` +
            `"Merge ${main} now (Recommended)" / "Not now" -- in your question modal if you have one ` +
            `(Claude Code's AskUserQuestion), else in the chat.`
        }
      })
    )
  }
} catch {
  // never block a session
}
process.exit(0)

/**
 * Start `patch-checkout.mjs` for `dir`'s checkout, detached, its output appended to `epic-patches.log` in the
 * checkout's git folder.
 * - NEVER throws, never waits
 */
function patchInBackground(dir) {
  try {
    const gitDir = git(dir, "rev-parse", "--path-format=absolute", "--git-dir")
    if (!gitDir) return
    const log = openSync(join(gitDir, "epic-patches.log"), "a")
    const script = join(import.meta.dirname, "patch-checkout.mjs")
    spawn(process.execPath, [script, dir], { cwd: dir, detached: true, stdio: ["ignore", log, log] }).unref()
  } catch {
    // best effort:  the next session start tries again
  }
}

/** How far `dir`'s branch is behind branch `main`, when it's another branch and behind at all;  else `undefined`. */
function behindMain(dir, main) {
  const branch = git(dir, "rev-parse", "--abbrev-ref", "HEAD")
  if (!branch || branch === main || branch === "HEAD") return undefined
  const count = Number(git(dir, "rev-list", "--count", `HEAD..${main}`))
  return count > 0 ? { branch, count } : undefined
}

/** `git ...args` in `dir`, trimmed;  `""` on any failure, or after 3s:  a session start never waits on it. */
function git(dir, ...args) {
  return Git.out(args, dir, { timeout: 3000 }) ?? ""
}
