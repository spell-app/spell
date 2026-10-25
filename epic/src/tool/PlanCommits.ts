import type { ParsedCommit } from "./planDoc.types"

/****************
 * ### `PlanCommits`
 * Commits as an epic page lists them:  what a commit subject says it did (`P3:  Name -- summary`, `Fix I3:  ...`), the
 * repo's GitHub page, and finding a listed one (`<epic-commit sha>`).
 * - STATIC and instance-free on purpose:  pure functions of their arguments;  never runs git (the command line does,
 *   and hands the log in).
 * - From `src/tools/plan-doc.js` (epic `epic-components`, P7).
 ****************/
export class PlanCommits {
  /**
   * What a commit subject says it did:  `{ epic, phases, items, title, sentence }`, or `null` when it names neither.
   * - `epic`:  the epic it names first (`outline-spell P28:`), else `null`
   * - `phases`:  numbers, as people say them (`P6a` -> `6`, `P11.1` -> `11.1`, epic `epic-engine` P39);  `items`:  ids, lower case (`i3`), a range spelled out (`J110-J112`)
   * - phases and items mix:  `spanish P22, J110-J135:`
   * - `title`:  the subject after the colon, up to ` -- `:  the phase's name, in a phase commit
   * - `sentence`:  the subject after ` -- ` (`P3:  Name -- what it did`), else after the colon
   */
  static parseCommitSubject(subject: string): ParsedCommit | null {
    const match = subject.match(PlanCommits.SUBJECT)
    if (!match) return null
    const [, prefix, list, rest] = match
    const ids = list!.split(/\s*[+,]\s*/)
    const tail = rest!.trim()
    const dash = tail.indexOf(" -- ")
    return {
      epic: prefix && !/^fix$/i.test(prefix) ? prefix : null,
      phases: ids.filter((id) => id.startsWith("P")).map((id) => id.match(/\d+(?:\.\d+)?/)![0]),
      items: ids.filter((id) => !id.startsWith("P")).flatMap(PlanCommits.itemRange),
      title: (dash >= 0 ? tail.slice(0, dash) : tail).trim(),
      sentence: (dash >= 0 ? tail.slice(dash + 4) : tail).trim()
    }
  }

  /**
   * Whether a commit's `title` names phase `name`:  holds it, any case (`P4 + P5:  One + Two` names both).
   * - static:  a pure test
   */
  static titleNames(title: string, name: string): boolean {
    return Boolean(name) && title.toLowerCase().includes(name.toLowerCase())
  }

  /**
   * The GitHub page of a repo, from its remote's URL (`git remote get-url origin`);  `null` when it isn't GitHub.
   * - `https://github.com/o/r.git`, `git@github.com:o/r.git`, `ssh://git@github.com/o/r` -> `https://github.com/o/r`
   */
  static githubBase(remote: string | null | undefined): string | null {
    const match = String(remote ?? "")
      .trim()
      .match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/)
    return match ? `https://github.com/${match[1]}/${match[2]}` : null
  }

  /**
   * The `<epic-commit>` for commit `sha` among `host`'s children (a phase, an item), if any:  by its `sha`, either one
   * a prefix of the other (a short sha given, or listed).
   */
  static findCommit(host: Element, sha: string): Element | undefined {
    return Array.from(host.querySelectorAll(":scope > epic-commit")).find((commit) => {
      const listed = commit.getAttribute("sha") ?? ""
      return Boolean(listed) && (listed === sha || sha.startsWith(listed) || listed.startsWith(sha))
    })
  }

  ////////////////
  // ## Subjects
  ////////////////

  /**
   * An item id, or a range of them (`J110-J112`, `J110-112`), as lower-case ids;  a range of more than
   * `MAX_RANGE` is its two ends.
   * - static:  pure
   */
  private static itemRange(id: string): string[] {
    const [, kind, from, to] = id.match(/^([A-Z])(\d+)(?:-[A-Z]?(\d+))?$/)!
    const [first, last] = [Number(from), Number(to ?? from)]
    const kindLower = kind!.toLowerCase()
    if (last < first || last - first > PlanCommits.MAX_RANGE)
      return [...new Set([first, last])].map((n) => kindLower + n)
    return Array.from({ length: last - first + 1 }, (_, index) => kindLower + (first + index))
  }

  /** The longest item range spelled out (`J110-J135`, 26 ids):  a longer one is a typo's two ends. */
  private static readonly MAX_RANGE = 200

  /**
   * A commit's subject that names phases or items:  `P3:`, `P4 + P5:`, `WIP P3:`, `P6a:` (phase 6), `P11.1:` (a
   * decimal phase), `P1 follow-up:`,
   * `Fix I3:`, `<epic> I3:`, `<epic> P5, T1, J7:`, `<epic> P22, J110-J135:`.
   * - the epic's name first, when it's there (`<epic> `);  `Fix` is never one
   * - `P052 fonts` isn't one:  a phase number has no leading 0, and the colon follows at once
   * - static:  every subject is read against the same pattern
   */
  private static readonly SUBJECT =
    /^(?:WIP\s+)?(?:([a-z][a-z0-9-]*)\s+)?(?:[Ff]ix\s+)?((?:P[1-9]\d*(?:\.[1-9]\d*)?[a-z]?|[QCITVJD]\d+(?:-[QCITVJD]?\d+)?)(?:\s*[+,]\s*(?:P[1-9]\d*(?:\.[1-9]\d*)?[a-z]?|[QCITVJD]\d+(?:-[QCITVJD]?\d+)?))*)(?:\s+follow-up)?\s*:\s*(.*)$/
}
