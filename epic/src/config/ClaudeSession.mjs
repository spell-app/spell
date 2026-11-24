/****************
 * ### `ClaudeSession`
 * What a hook can tell about the Claude Code session that started it, from its environment (epic `epic-engine` I319).
 * - `isUnattended`:  nobody is at this session, a scripted `claude -p` (CI, a cron job, an agent harness),
 *   so a hook that waits for the person (the inbox poller, the restart wake) exits at once there
 * - Why it matters:  `claude -p` waits for EVERY `SessionStart` hook to finish before its first answer,
 *   `asyncRewake` ones too, and the inbox poller's runs for a day:  the run never started (I319)
 * - `hookInput`:  the JSON Claude Code hands a hook on stdin (its `session_id`, a subagent's `agent_id` ...)
 * - `recordOf`:  a running session's record in Claude Code's registry, found by its id (epic `epic-engine` T163)
 * - Its position:  node's own modules only, plain JavaScript, so the inbox poller and the hooks may import it.
 ****************/
import { readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export class ClaudeSession {
  /**
   * Is nobody at this session?  Claude Code's own word for it, `CLAUDE_CODE_SESSION_ATTENDED` `"0"`.
   * - Claude Code sets it in every process it starts, a hook's included:
   *   - `"1"`:  a terminal session, VS Code's panel, the desktop app
   *   - `"0"`:  `claude -p`, the Agent SDK, a background session
   * - Not set (a Claude Code from before it, a shell outside Claude):  attended, so the poller runs as before.
   * - NOT documented (Claude Code 2.1.319, 2026-11-16):  read from the program itself, and checked in a real
   *   `claude -p` and VS Code's panel;  the hook's input JSON and stdin say nothing about it.
   */
  static isUnattended(env = process.env) {
    return env[ATTENDED] === "0"
  }

  /**
   * The JSON Claude Code handed this hook on stdin;  `{}` when there's none, or it won't parse.
   * - reads stdin to its end:  only for a hook, whose stdin Claude Code closes once written
   */
  static hookInput() {
    try {
      return JSON.parse(readFileSync(0, "utf8") || "{}")
    } catch {
      return {}
    }
  }

  /**
   * Session `sessionId`'s record in Claude Code's registry (`<home>/sessions/<pid>.json`:  its `pid`, `cwd`, `status`
   * `"idle"` or `"busy"` ...), and the record's file;  `undefined` when none names it.
   * - `home`:  Claude Code's folder, `$CLAUDE_CONFIG_DIR` else `~/.claude` (as `ClaudeHome` reads it)
   * - NEVER throws
   */
  static recordOf(sessionId, home = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude")) {
    if (!sessionId) return undefined
    const folder = join(home, "sessions")
    let files = []
    try {
      files = readdirSync(folder).filter((file) => file.endsWith(".json"))
    } catch {
      return undefined
    }
    for (const name of files) {
      try {
        const file = join(folder, name)
        const record = JSON.parse(readFileSync(file, "utf8"))
        if (record.sessionId === sessionId && Number.isInteger(record.pid)) return { ...record, file }
      } catch {
        // half-written, or not a session's:  skip it
      }
    }
    return undefined
  }
}

/** Claude Code's flag:  `"1"` when someone is at the session, `"0"` when it runs unattended. */
const ATTENDED = "CLAUDE_CODE_SESSION_ATTENDED"
