#!/usr/bin/env node
/**
 * The spell-epic plugin's inbox poller, `InboxPoller`, which keeps an epic's session listening to its epic page while
 * it's open (epic `epic-engine` P18, P19, I144).
 * - `--hook`:  the plugin's `asyncRewake` `Stop` hook (`hooks/hooks.json`), in every session:  exits 2 with the line
 *   - and its `SessionStart` hook (epic `epic-engine` I219):  a session whose process just started (a window reloaded)
 *     hears a Send before its first turn ends
 *   - the hook's input names the session (`session_id`):  with the epic hub up, the poller hears the hub's note for
 *     it (`WakeNotes`, epic `epic-engine` T163) instead of looking at the inbox itself
 * - else:  the plugin's monitor (`monitors.json`), which Claude Code starts only in a terminal session
 * - Plain `node`, by path:  it must stay small (`InboxPoller`'s header says why).
 */
import { ClaudeSession } from "spell/epic/config/ClaudeSession.mjs"
import { InboxPoller } from "spell/epic/tool/InboxPoller.mjs"

const hook = process.argv.includes("--hook")
const sessionId = hook && !ClaudeSession.isUnattended() ? ClaudeSession.hookInput().session_id : undefined
process.exitCode = await new InboxPoller({ mode: hook ? "hook" : "monitor", sessionId }).run()
