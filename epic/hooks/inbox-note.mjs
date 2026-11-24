#!/usr/bin/env node
/**
 * Claude Code's `PostToolUse` hook (the plugin's `hooks/hooks.json`):  a Send from the epic page reaches a session
 * that is AT WORK within seconds, at its next tool call (epic `epic-engine` T163, keeping I286's promise).
 * - The epic hub's one listener (`InboxHub`) leaves the session a note when the person sends (`WakeNotes`);
 *   this hook takes it, and hands its `📬` line to the session as context for what it does next.
 * - While the session is idle, its inbox poller takes the note instead, and wakes it (`InboxPoller`):
 *   whichever comes first, the other finds none.
 * - Quick when nothing waits:  one look at the notes' folder, nothing else read.
 * - Never in a subagent's tool call (the input's `agent_id`):  the session itself takes the Send.
 * - Never in an unattended session, a scripted `claude -p` (`ClaudeSession.isUnattended()`).
 * - stdin `{ session_id, agent_id?, ... }`;  stdout `{ hookSpecificOutput:  { additionalContext } }`, or nothing.
 * - Plain `node`, node's own modules and plain JavaScript only:  it runs after every tool call.
 * - Always exits 0:  never blocks a tool.
 */
import { ClaudeSession } from "spell/epic/config/ClaudeSession.mjs"
import { WakeNotes } from "spell/epic/tool/WakeNotes.mjs"

try {
  const notes = new WakeNotes()
  if (notes.anyWaiting && !ClaudeSession.isUnattended()) {
    const input = ClaudeSession.hookInput()
    const note = input.session_id && !input.agent_id ? notes.take(input.session_id) : undefined
    if (note?.notice) {
      const additionalContext = `${note.notice}\n(It came while you were at work:  the /epic skill's "7.3 Woken", step 0.)`
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext } }))
    }
  }
} catch (error) {
  console.error(`inbox note hook:  ${error.message}`)
}
process.exit(0)
