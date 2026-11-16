import { P } from "spell/parser/parser"

/**
 * Log of every change parsing makes to shared state -- scope lists and parser rules -- so we can take changes
 * back, and put them back, to re-parse part of a project without starting over.  See `P.IncrementalParse`.
 * - Recorded by whatever changes the state:  `ScopeList.add()` / `.replace()`, `Parser.addRule()`.
 *   They find us as `parser.journal`, which is `undefined` (so nothing's recorded) unless someone wants one.
 * - `mark()` notes a point to come back to, e.g. before each top-level item of a file.
 * - `rewindTo(mark)` undoes everything after `mark`, newest first, and hands it back.
 *   `replay()` puts some or all of that back -- marks included, so marks stay valid.
 * - NOTE: only changes to state which exists at the mark need recording.  Anything created after it is either
 *   thrown away (re-parsed) or brought back in the same state by `replay()`.
 * - Most changes are OPERATIONS (epic `language` P59):  `replay()` makes them again onto the state as it is now,
 *   e.g. a record added to a list goes on the end of the list's items as they are now.
 *   So after an earlier file parsed again, a later file's changes can be put back onto the earlier file's NEW records:
 *   see `P.JournalChange`, `P.IncrementalProject`.
 */
export class ParseJournal {
  /** Changes in the order they happened, with marks between them. */
  #entries: P.JournalEntry[] = []

  /** Number of entries, marks included. */
  get length() {
    return this.#entries.length
  }

  /** Record a `change` which has just been made. */
  record(change: P.JournalChange) {
    this.#entries.push(change)
  }

  /** New mark at the current point. */
  mark(): P.JournalMark {
    const mark: P.JournalMark = { isMark: true }
    this.#entries.push(mark)
    return mark
  }

  /** Entries from index `start` on, e.g. what one item's parse recorded -- `start` from `length` before it. */
  slice(start: number): P.JournalEntry[] {
    return this.#entries.slice(start)
  }

  /** Is `mark` still in the journal?  `false` once something rewound to before it. */
  has(mark: P.JournalMark) {
    return this.#entries.includes(mark)
  }

  /**
   * Undo everything after `mark`, newest first, leaving `mark` itself in place.
   * - Returns what was undone, in the order it originally happened -- pass (some of) it to `replay()`.
   * - Throws if `mark` isn't in the journal.
   */
  rewindTo(mark: P.JournalMark): P.JournalEntry[] {
    const index = this.#entries.indexOf(mark)
    if (index === -1) throw new P.ParserError({ message: "ParseJournal.rewindTo(): unknown mark", context: this })
    const undone = this.#entries.splice(index + 1)
    for (let i = undone.length - 1; i >= 0; i--) {
      const entry = undone[i]!
      if ("undo" in entry) entry.undo()
    }
    return undone
  }

  /**
   * Set `next`'s props on `target`, recording the change in `journal` (if any) so it can be taken back.
   * - For a change to a record which already EXISTS,
   *   e.g. a method's `returns` once its body has parsed.
   * - A new record goes through `ScopeList.add()`, which journals itself.
   */
  static assign<T extends object>(journal: ParseJournal | undefined, target: T, next: Partial<T>) {
    const keys = Object.keys(next) as Array<keyof T>
    const change: P.JournalChangeKind & { kind: "assign" } = {
      kind: "assign",
      target,
      next: next as Record<string, unknown>,
      previous: {}
    }
    // what was there when it was (re)done:  an earlier file parsed again may have left something else
    const apply = () => {
      change.previous = Object.fromEntries(keys.map((key) => [key, target[key]]))
      Object.assign(target, next)
    }
    apply()
    journal?.record({ undo: () => Object.assign(target, change.previous), redo: apply, change })
  }

  /** Entries from `mark` on, `mark` included:  e.g. what a file's parse recorded, from its first mark.  `[]` if it's gone. */
  entriesFrom(mark: P.JournalMark): P.JournalEntry[] {
    const index = this.#entries.indexOf(mark)
    return index === -1 ? [] : this.#entries.slice(index)
  }

  /** Redo `entries` from `rewindTo()` in order, putting them -- and their marks -- back in the journal. */
  replay(entries: P.JournalEntry[]) {
    for (const entry of entries) {
      if ("redo" in entry) entry.redo()
      this.#entries.push(entry)
    }
  }
}
