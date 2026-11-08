/****************
 * ### `PhaseStatuses`
 * A phase's STATUS (`<epic-phase status>`), and which ones count as FINISHED.
 * - `todo`:  still to do
 * - `active`:  under way
 * - `done`:  built
 * - `dropped`:  never built, and won't be (epic `epic-engine` I228;  from epic `atmosphere`'s r60, Owen, 2026-11-08:
 *   "P18 should show as 'done', or better, crossed out somehow"):  its row struck through, its Dropped field saying
 *   why (`Moved to P38`)
 *   - `epic move` won't renumber a started phase, so a phase moved after one is re-added there, and the old one dropped
 * - FINISHED (`isFinished()`):  `done` and `dropped`.  Everything that counts phases goes by it:  the next phase,
 *   `3/5 phases done`, what's left of the estimate, an epic being done, "While you were out".
 * - STATIC, pure, node-safe:  the elements, the epic tool and the lists alike read this ONE rule
 *   (`spell/epic/phases`);  only `EpicState`, which imports nothing, says it again.
 ****************/
export class PhaseStatuses {
  /** Every status, in the order a phase goes through them;  `dropped` instead of `done`. */
  static readonly ALL = ["todo", "active", "done", "dropped"] as const

  /** The statuses of a phase that's over:  built, or dropped. */
  static readonly FINISHED: readonly string[] = ["done", "dropped"]

  /** Is `status` one of `ALL`:  a command line's word, checked. */
  static isStatus(status: string | null | undefined): status is PhaseStatus {
    return (PhaseStatuses.ALL as readonly (string | null | undefined)[]).includes(status)
  }

  /** Is a phase of `status` over:  `done` or `dropped`?  Never the next phase, never counted as left. */
  static isFinished(status: string | null | undefined): boolean {
    return PhaseStatuses.FINISHED.includes(status ?? "")
  }
}

/** One of `PhaseStatuses.ALL`. */
export type PhaseStatus = (typeof PhaseStatuses.ALL)[number]
