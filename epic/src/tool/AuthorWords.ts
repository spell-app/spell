import { escapeRegExp } from "spell/util/string"

/****************
 * ### `AuthorWords`
 * The words that put a PERSON's name on what they did, in an epic page's text and its log (epic `epic-friend` P2):
 * "Ana picked B", "passed (Ana's run)", "<b>Ana:</b>  her note".
 * - ONE list:  the writers (`PlanDoc`, the inbox commands) write each phrase through it, and the rename sweep
 *   (`epic whoami --rename`, `NameSweep`) finds the name in exactly these phrases, so "Ana" in a sentence stays
 * - the name in markup (`from="Ana"`, `"by": "Ana"`) is the sweep's own:  these are the phrases in TEXT
 * - STATIC and pure:  strings in, strings out
 ****************/
export class AuthorWords {
  /** A test run's, in its result's words:  `Ana's run` (`M3 passed (Ana's run)`). */
  static run(person: string): string {
    return `${person}'s run`
  }

  /** A failed test's issue, and its status card:  `Ana's test run`. */
  static testRun(person: string): string {
    return `${person}'s test run`
  }

  /** A screenshot a person sent with a mark:  `Ana's screenshot` (its `alt`). */
  static screenshot(person: string): string {
    return `${person}'s screenshot`
  }

  /** A pick, in its log line:  `Ana picked B:  Bananas`. */
  static picked(person: string, letter: string): string {
    return `${person} picked ${letter}`
  }

  /** An item a person asked for from the page:  `Ana's new todo`. */
  static newItem(person: string, kind: string): string {
    return `${person}'s new ${kind}`
  }

  /** A drop, in its log line:  `dropped by Ana in review`. */
  static droppedBy(person: string): string {
    return `dropped by ${person} in review`
  }

  /** An urgency set from an item's id chip, in its log line:  `(Ana, from its id chip)`. */
  static fromChip(person: string): string {
    return `(${person}, from its id chip)`
  }

  /** A person's words quoted in an item's details:  `<b>Ana:</b>` (HTML;  `name` escaped by the caller). */
  static said(person: string): string {
    return `<b>${person}:</b>`
  }

  /** A person's note on an Overview sub-section, its lead:  `<b>Ana · 2026-10-29 07:12 · revisit soon:</b>`. */
  static noteLead(person: string, stamp: string, how: string): string {
    return `<b>${person} · ${stamp} · ${how}:</b>`
  }

  /**
   * `text` with `from` renamed `to` wherever one of these phrases names it (HTML or plain text alike);  and how many.
   * - the name matched whole, any case, as written (`Ana`, `ana`);  every other word kept
   */
  static rename(text: string, from: string, to: string): { text: string; count: number } {
    let count = 0
    const name = escapeRegExp(from.trim())
    let renamed = text
    for (const phrase of PHRASES) {
      const pattern = new RegExp(phrase.replace(NAME, name), "gi")
      renamed = renamed.replace(pattern, (...match: unknown[]) => {
        count++
        const groups = match.at(-1) as Record<string, string>
        return `${groups.before}${to}${groups.after}`
      })
    }
    return { text: renamed, count }
  }
}

/** The placeholder for the name in `PHRASES`. */
const NAME = "{name}"

/**
 * Every phrase above as a pattern, the name between `before` and `after` (`rename()`):  what's around it must match,
 * so the name in running text is never touched.
 */
const PHRASES: readonly string[] = [
  String.raw`(?<before>\b)${NAME}(?<after>'s (?:run|test run|screenshot|new \w+)\b)`,
  String.raw`(?<before>\b)${NAME}(?<after> picked [A-Z]\b)`,
  String.raw`(?<before>\bdropped by )${NAME}(?<after> in review\b)`,
  String.raw`(?<before>\()${NAME}(?<after>, from its id chip\))`,
  String.raw`(?<before><b>)${NAME}(?<after>:</b>)`,
  String.raw`(?<before><b>)${NAME}(?<after> · [^<]*:</b>)`
]
