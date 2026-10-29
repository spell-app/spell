// Import directly to avoid circular import:  `PlanDoc` imports the migrations;  used only inside `run()`
import { PlanDoc } from "spell/epic/tool/PlanDoc"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `LogCommits`
 * The migration `log-commits` (epic `epic-engine` P52, J151;  Owen, 2026-10-29:  "I was thinking that this would be a
 * log of what changes went in when, not when I answered a question"):  every epic page's Log gets an entry per commit
 * of its history, `<epic-commit sha at refs>`, as the backfill now writes them (`PlanDoc.backfillCommits()`).
 * - the history is handed in (`MigrationContext.history`:  `PlanDocFiles.epicHistory()`, what `commits --backfill`
 *   reads):  every repo of the kit and its peers, merge commits left out, none another epic's page lists
 * - the backfill's own rule for which commits are the epic's, and which phase a number means
 * - the Log ONLY (`logOnly`):  nothing listed under phases and items.  An older epic's lists hold its commits by
 *   their shas before epic `repo-split` P20 merged the repos (rewriting every sha;  most aren't in the kit's history
 *   any more), so its history's new shas would list each of them twice there.  Measured on the dry run:
 *   outline-spell 197, people-and-orgs 254 would have gone under phases and items.
 * - no history (a runner without git, a page outside a checkout):  nothing
 * - each page's count a note;  the runner's own log line, `migrated:  log-commits`, says it ran
 * - Runs on command (`epic migrate`), never on every edit:  it runs git
 * - IDEMPOTENT:  a commit already in the Log (same sha) is skipped
 ****************/
export class LogCommits implements Migration {
  readonly name = "log-commits"
  readonly kind = "epic"
  readonly date = "2026-10-29"
  readonly everyEdit = false
  readonly description = "the Log gets an entry per commit of the epic's history:  its change log"

  /** Fill `document`'s Log from its history, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const history = context.history?.()
    if (!history?.log.length) return false
    const plan = new PlanDoc(document, context.now)
    const logged = plan.backfillCommits(history.log, { ...history, logOnly: true }).length
    if (!logged) return false
    context.notes?.push(`log-commits:  ${logged} commit${logged === 1 ? "" : "s"} into the Log`)
    return true
  }
}
