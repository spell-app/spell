#!/usr/bin/env node
/**
 * The spell-epic plugin's inbox poller, `InboxPoller`, which keeps an epic's session listening to its epic page while
 * it's open (epic `epic-engine` P18, P19, I144).
 * - `--hook`:  the plugin's `asyncRewake` `Stop` hook (`hooks/hooks.json`), in every session:  exits 2 with the line
 * - else:  the plugin's monitor (`monitors.json`), which Claude Code starts only in a terminal session
 * - Plain `node`, by path:  it must stay small (`InboxPoller`'s header says why).
 */
import { InboxPoller } from "spell-epic/tool/InboxPoller.mjs"

process.exitCode = await new InboxPoller({ mode: process.argv.includes("--hook") ? "hook" : "monitor" }).run()
