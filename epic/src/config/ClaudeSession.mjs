/****************
 * ### `ClaudeSession`
 * What a hook can tell about the Claude Code session that started it, from its environment (epic `epic-engine` I319).
 * - `isUnattended`:  nobody is at this session, a scripted `claude -p` (CI, a cron job, an agent harness),
 *   so a hook that waits for the person (the inbox poller, the restart wake) exits at once there
 * - Why it matters:  `claude -p` waits for EVERY `SessionStart` hook to finish before its first answer,
 *   `asyncRewake` ones too, and the inbox poller's runs for a day:  the run never started (I319)
 * - Its position:  node's own modules only, plain JavaScript, so the inbox poller and the hooks may import it.
 ****************/
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
}

/** Claude Code's flag:  `"1"` when someone is at the session, `"0"` when it runs unattended. */
const ATTENDED = "CLAUDE_CODE_SESSION_ATTENDED"
