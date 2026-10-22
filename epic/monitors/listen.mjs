#!/usr/bin/env node
/**
 * The spell-epic plugin's monitor (`monitors.json`), one beside every Claude Code session:  `InboxPoller`, which
 * keeps an epic's session listening to its epic page while it's open (epic `epic-engine` P18, P19).
 * - Plain `node`, by path:  it must stay small (`InboxPoller`'s header says why).
 */
import { InboxPoller } from "spell-epic/tool/InboxPoller.mjs"

process.exitCode = await new InboxPoller().run()
