import { every } from "spell/util/timing"
import { SpaceBackups } from "spell/app/spaces/server/node/places/SpaceBackups"
import type { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"

/** How often the round looks whether any of its work is due, s:  every hour. */
const LOOK_EVERY_SECONDS = 60 * 60

/****************
 * ### `DailyRound`
 * The ONE timer for the work a server does each day (epic `atmosphere` P24):  each job looks every hour whether it's
 * due, and does it.
 *
 * ```ts
 * onStop(spacesDailyRound(folders).start())        // the app's route module, and the cloud
 * ```
 *
 * - Its jobs, as the servers start it (the app's route module, from the main checkout alone, and the cloud):
 *   - the nightly backups (`SpaceBackups.backUpIfDue()`):  one if the last is a day old
 *   - each real Space's member list, in step with its org's roles (`MemberLists.followAll()`):
 *     a term that ends on its date tells nobody, so the round catches it, within the hour
 *   - the digest of what's new, mailed each day (P30), once it's built
 * - Each job decides whether it's due:  the round only asks, now and then every hour after.
 * - One at a time, in order;  a job that fails is reported, and the next look tries it again.
 * - On `every()`, the ONE way to repeat something:  no timer of its own.
 * - Node only;  the round knows nothing of what its jobs do:  `spacesDailyRound()` names the spaces' own.
 ****************/
export class DailyRound {
  /** Its jobs, in the order each look runs them. */
  readonly jobs: readonly DailyJob[]
  /** Where a failure, or what a job says, goes:  the server's log. */
  private readonly report: (text: string) => void

  constructor(jobs: readonly DailyJob[], { report = (text) => console.warn(text) }: DailyRoundOptions = {}) {
    this.jobs = jobs
    this.report = report
  }

  /** Look now, then every hour, until stopped.  Returns what stops it. */
  start(): () => void {
    void this.look()
    return every(LOOK_EVERY_SECONDS, () => void this.look())
  }

  /**
   * Run each job once, in order:  each says for itself whether it's due.
   * - NEVER throws:  a job that fails is reported, and the rest still run
   */
  async look(): Promise<void> {
    for (const { name, run } of this.jobs) {
      try {
        await run(this.report)
      } catch (error) {
        this.report(`Spell's daily ${name} failed:  ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
}

/**
 * The spaces' daily round, for a server serving `folders`:  the nightly backups, then each real Space's member list.
 * - `backups`:  `"off"` for a server that makes none (a test's cloud)
 */
export function spacesDailyRound(
  folders: Pick<SpaceFolders, "lists">,
  { backups = "nightly" }: { backups?: "nightly" | "off" } = {}
): DailyRound {
  const jobs: DailyJob[] = [{ name: "member lists", run: () => folders.lists.followAll() }]
  if (backups === "nightly") {
    const nightly = new SpaceBackups()
    jobs.unshift({ name: "backup", run: (report) => nightly.backUpIfDue(report) })
  }
  return new DailyRound(jobs)
}

/** One piece of a server's daily work. */
export type DailyJob = {
  /** What it is, for a failure's report:  `backups`. */
  name: string
  /** Do it if it's due:  each look asks.  `report` takes what it has to say, a missed night's backup. */
  run: (report: (text: string) => void) => Promise<unknown>
}

/** Options of a `DailyRound`. */
export type DailyRoundOptions = {
  /** Where a failure, or what a job says, goes:  default `console.warn()`, the server's log. */
  report?: (text: string) => void
}
