#!/usr/bin/env node
/**
 * Claude Code's `Stop` hook (the plugin's `hooks/hooks.json`):
 * move a session to another window once its turn ends:  to a worktree's window, or back from it.
 * - `/isolate` arms it with `epic window handoff <name>` (`--back`:  no skill uses it now),
 *   which writes the move to `<registry>/handoffs/<session id>.json`.
 *   See `src/window.mjs`, "A worktree's window".
 * - stdin `{ session_id, transcript_path, cwd, ... }`.
 * - No pending move for this session (every other turn):  exits at once.
 * - A pending move:
 *   - renames the record to `<session id>.running.json`, so the next turn won't move it again
 *   - queues the session's own title (its last `custom-title`) for its next prompt, unless one is queued:
 *     resumed in the new window, its tab may show Claude Code's own title instead (epic `epic-engine` r2), and the
 *     `continue` typed there puts it back (`SessionFolders.requeueTitle()`)
 *   - starts `window.mjs resume` on it, DETACHED, its output in `<registry>/handoffs/<session id>.log`
 *   - why detached:  `resume` closes this session's old tab or window,
 *     which ends the `claude` process this hook runs under
 * - The window script works on the SESSION's checkout (`EPIC_CHECKOUT`, from `cwd`):
 *   this plugin is its own repo.
 *   - ALWAYS `cwd`, never one the session inherited:  a window could hand its sessions the checkout that opened it
 *     (epic `epic-engine` P9).
 * - Never fails the turn:  every error exits 0 (it's logged, or written to stderr).
 * - Not run at all (the plugin's hooks failing, r20):  the record waits, `<session id>.json`.
 *   `handoff` and `launch --move` check first that it will run, and the prompt hook says a record still waiting at
 *   the next prompt (`SessionMoves`, epic `epic-engine` P26).
 */
import { spawn } from "node:child_process"
import { existsSync, openSync, readFileSync, renameSync } from "node:fs"
import { dirname, join } from "node:path"

/** The window script, beside this plugin's `hooks/`. */
const SCRIPT = join(dirname(import.meta.dirname), "src", "window.mjs")

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  const { session_id: sessionId, transcript_path: transcript, cwd } = input
  if (cwd) process.env.EPIC_CHECKOUT = cwd
  // loaded in here, once `EPIC_CHECKOUT` says whose windows they are
  const { Window } = await import("spell/epic/window.mjs")
  const file = sessionId && Window.handoffFile(sessionId)
  if (file && existsSync(file)) {
    const running = join(Window.handoffs, `${sessionId}.running.json`)
    renameSync(file, running)
    await requeueTitle(sessionId)
    const args = [SCRIPT, "resume", running]
    for (const title of await sessionTitles(transcript)) args.push("--title", title)
    const log = openSync(join(Window.handoffs, `${sessionId}.log`), "a", 0o600)
    spawn(process.execPath, args, { detached: true, stdio: ["ignore", log, log], env: process.env }).unref()
  }
} catch (error) {
  console.error(`handoff hook:  ${error.message}`)
}

/** `SessionFolders.requeueTitle()`:  never stops the move. */
async function requeueTitle(sessionId) {
  try {
    const { SessionFolders } = await import("spell/epic/config/SessionFolders.ts")
    SessionFolders.requeueTitle(sessionId)
  } catch (error) {
    console.error(`handoff hook:  no title queued:  ${error.message}`)
  }
}

/**
 * The titles the session's tab may show, most likely first:  the last `/rename` (`custom-title`, which the prompt
 * hook `prompt-gate.mjs` sets on `/isolate <name>`), then Claude's own (`ai-title`);  `[]` if none
 * (`Transcript.titles()`, the one reader of a transcript's titles).
 * - both, since the tab's label may lag a rename
 * - NEVER throws:  never stops the move
 */
async function sessionTitles(transcript) {
  if (!transcript || !existsSync(transcript)) return []
  try {
    const { Transcript } = await import("spell/epic/config/Transcript.ts")
    const { custom, ai } = new Transcript(transcript).titles()
    return [...new Set([custom, ai].filter(Boolean))]
  } catch (error) {
    // never stops the move:  its old tab stays open, found by no title
    console.error(`handoff hook:  no titles read:  ${error.message}`)
    return []
  }
}
