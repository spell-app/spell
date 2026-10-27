/**
 * spell-epic's VS Code extension (epic `epic-eject` P7):  the epic tooling's side of VS Code,
 * out of the spell language extension, built and installed from spell-epic's one checkout.
 * - the doc views, in the right side bar (`DocView`):
 *   "Review" (the page being reviewed, "Open Epic...") and "Epic Docs"
 *   - shown by URI or through the bridge (`DocPreview`)
 *   - live from spell-epic's one page server per machine (`epic hub`) when it runs
 * - the window bridge (`WindowBridge`):  a Claude Code session reaches ITS window
 *   (add a worktree folder, show a doc, the handoff to a worktree's window)
 * - Its ids are all `spellEpic.*` (`spell-app.spell-epic`),
 *   so it runs beside the spell language extension, whose language server, compiled views and runner stay there.
 * - Activates at startup (`onStartupFinished`), in EVERY window, for the bridge;  and on its `vscode://` URI.
 * - No Sessions view:
 *   reopening a session from another window is a worktree-entry fix (I3 of epic `epic-eject`), not a view.
 */
import type * as vscode from "vscode"

import { DocPreview } from "./DocPreview"
import { WindowBridge } from "./WindowBridge"

/** Set up the doc views and their URI handler, and the window bridge. */
export function activate(context: vscode.ExtensionContext): void {
  DocPreview.register(context)
  WindowBridge.register(context)
}

/** Nothing to stop by hand:  every server and view is in `context.subscriptions`. */
export function deactivate(): void {}
