/**
 * Spell's OLD FORMS:  ways of writing Spell that still work, but are on their way out, and how each is rewritten
 * the new way (epic `language` P68;  Owen, 2026-11-18:  "There should be a `version upgrade` path for spell code").
 * - ONE list, `OLD_FORMS`, each a deprecation:  the day it changed, the Spell it was deprecated in,
 *   and the Spell that will drop it (Owen's C2:  "deprecations which have a semantic version number when they will be
 *   dropped").
 *   - Dropped in the next major by default (`1.0.0` for `0.9.0`), or sooner or later where a form says (J287).
 * - Until its drop version, an old form is a WARNING:  the line still compiles and runs (Q81).
 *   From it on (Spell's own version, `OldForms.spellVersion`), the same line is an ERROR, its fix still offered (J288).
 * - Its fix just rewrites the old form as the new one, nothing fancier ("OK to just rewrite for now").
 *   - `spell lint --fix`, `spell upgrade`, the language server's "Change to ..." and "Upgrade this file", and the
 *     editor's "Fix it" all make the same edits, from `uses()` and `upgraded()`.
 * - The forms:
 *   - retired words, `it has parts "front"` => `it has slots "front"`:  each language's `retiredWords`, the form each
 *     belongs to its `oldForms`;  found by `SpellType.noteRetiredLiterals()`, reported by `BlockLine`
 *   - a note after a line's code, `x is 3  // the count` => `-- the count` on the line under it:
 *     `SP.LineEndComments` (epic `language` T166)
 * - Reported while parsing (`report()`), each problem's `data.oldForm` naming its form:
 *   so `uses()` reads a file's warnings and errors, and never looks for them again.
 * - Adding one:  "Old forms" in `PARSING.md`.
 * - Plain matches, text and edits:  static and instance-free on purpose.
 */
// semver's functions one by one:  its whole barrel is 6.7 KB brotli in the language worker (epic `solid-2-final` I64)
import gte from "semver/functions/gte"
import lt from "semver/functions/lt"
import major from "semver/functions/major"
import parse from "semver/functions/parse"
import valid from "semver/functions/valid"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly:  read while the barrel loads
import { SPELL_VERSION } from "./spell.types"

/** Which old form a problem is about:  `OLD_FORMS`' ids. */
export type OldFormId = "parts" | "animation" | "wait-for" | "line-end-comment"

/** One of Spell's old forms:  a deprecation. */
export type OldForm = {
  /** Its id, the same in every language:  `parts`. */
  id: OldFormId
  /** What changed, for people reading the list:  `a view's parts are slots`. */
  about: string
  /** The day it changed, `2026-10-27`. */
  date: string
  /** The epic and phase or item that changed it:  `elemental-spell P27`. */
  changedIn: string
  /** The Spell it was deprecated in, a semantic version:  `0.8.0`. */
  deprecatedIn: string
  /** The Spell that drops it, when not the next major after `deprecatedIn`:  `droppedIn()`. */
  droppedIn?: string
}

/**
 * Every old form, oldest first.
 * - A new one bumps `SPELL_VERSION`'s minor once, and is deprecated in that version (Q79).
 */
export const OLD_FORMS: readonly OldForm[] = [
  {
    id: "parts",
    about: "a view's parts are slots",
    date: "2026-10-27",
    changedIn: "elemental-spell P27",
    deprecatedIn: "0.8.0"
  },
  {
    id: "animation",
    about: "an animation is a method, `to`, and a process a process",
    date: "2026-10-31",
    changedIn: "language P13",
    deprecatedIn: "0.8.0"
  },
  {
    id: "wait-for",
    about: "Spell waits by itself, so `wait for` and `await` go",
    date: "2026-10-31",
    changedIn: "language P13",
    deprecatedIn: "0.8.0"
  },
  {
    id: "line-end-comment",
    about: "a note goes on the line under its code, as `--`, not after it as `//`",
    date: "2026-11-19",
    changedIn: "language T166",
    deprecatedIn: "0.9.0"
  }
]

/** An edit of a file's text:  `start` to `end` replaced by `newText`, offsets from 0. */
export type OldFormEdit = { start: number; end: number; newText: string }

/** One old form written in a file:  where, which, how it's said, and the edits putting it the new way. */
export type OldFormUse = {
  /** The form. */
  form: OldForm
  /** Where the old words are in the file's text. */
  start: number
  end: number
  /** The words as written:  `parts`, `// the count`. */
  written: string
  /** What it becomes, for a fix's title:  `slots`;  `""` for words that just go, a line-end note's `-- ...`. */
  replacement: string
  /** Is it past its drop version, an error? */
  isDropped: boolean
  /** What its warning (or error) says, in the file's language, versions and all. */
  message: string
  /** The edits rewriting it, none overlapping. */
  edits: OldFormEdit[]
}

/** What `report()` notes on a problem:  which form, and what its words become. */
export type OldFormData = {
  /** The form it is. */
  oldForm?: OldFormId
  /** Its new words:  `slots`;  `""` if they just go. */
  replacement?: string
}

export class OldForms {
  /**
   * The Spell this is:  what each form's drop version is compared to.
   * - `SPELL_VERSION`;  a test sets its own, to see a form past its drop version, then puts it back.
   */
  static spellVersion: string = SPELL_VERSION

  /** The form `id`. */
  static form(id: OldFormId): OldForm {
    return OLD_FORMS.find((form) => form.id === id)!
  }

  /** The Spell that drops `form`:  its own `droppedIn`, else the next major after it was deprecated (J287). */
  static droppedIn(form: OldForm): string {
    return form.droppedIn ?? `${major(form.deprecatedIn) + 1}.0.0`
  }

  /** Is `form` past its drop version in Spell `version` (default this one's)?  Then it's an error, not a warning. */
  static isDropped(form: OldForm, version = OldForms.spellVersion): boolean {
    return gte(version, OldForms.droppedIn(form))
  }

  /**
   * The language's words for `form`'s problem, `message` (its pack's own words for what to write instead),
   * then when it changed and the versions:  "Spell 0.8 changed this on 2026-10-27 ... an error from Spell 1.0 on",
   *   or, dropped, "... and from Spell 1.0 on it's an error".
   * - Versions said short:  `0.9`, `1.0` (`shortVersion()`).
   */
  static messageFor(scope: P.Scope, form: OldForm, message: string): string {
    const language = SP.Language.of(scope)
    const versions = {
      deprecatedIn: OldForms.shortVersion(form.deprecatedIn),
      droppedIn: OldForms.shortVersion(OldForms.droppedIn(form)),
      date: form.date
    }
    const when = OldForms.isDropped(form) ? "old-form-dropped" : "old-form-deprecated"
    return `${message}  ${language.parserMessage(when, versions)}`
  }

  /**
   * Report an old form written over `at`, found while parsing a line:  a warning, noted on `match`, until its drop
   * version;  from then on an error, returned for the line to report.
   * - `message`:  what the language's pack says to write instead;  `messageFor()` adds the versions.
   * - Either way the problem's match carries `data.oldForm` and `data.replacement`, for `uses()`.
   * - SIDE EFFECT:  notes the warning on `match` (`SP.SpellWarnings.note()`).
   */
  static report(
    match: P.Match,
    at: P.Token[],
    { id, message, replacement }: { id: OldFormId; message: string; replacement?: string }
  ): P.Match | undefined {
    const { scope } = match
    const form = OldForms.form(id)
    const problem = SP.spellParser.createParseError(scope, at, OldForms.messageFor(scope, form, message))
    Object.assign(problem.data, { oldForm: id, replacement } satisfies OldFormData)
    if (OldForms.isDropped(form)) return problem
    SP.SpellWarnings.note(match, problem.message!, problem)
    return undefined
  }

  /**
   * Every old form written in `file` (a parsed `SP.SpellFile`), in the order of its text:  each with the edits putting
   * it the new way.
   * - Read from its warnings and errors as last parsed:  each `report()`ed one.
   * - None for a file not parsed.
   */
  static uses(file: Pick<SP.SpellFile, "match" | "parseText">): OldFormUse[] {
    const { match } = file
    if (!match) return []
    const text = file.parseText
    const problems = [
      ...(SP.Block.getParseErrors(match) ?? []),
      ...SP.SpellWarnings.in(match).map(({ at }) => at)
    ].filter((problem, index, all) => (problem.data as OldFormData).oldForm && all.indexOf(problem) === index)
    return problems.flatMap((problem) => OldForms.useOf(text, problem)).sort((one, other) => one.start - other.start)
  }

  /** `text` with every one of `uses` (`uses()`'s, of the same text) rewritten the new way. */
  static upgraded(text: string, uses: readonly OldFormUse[]): string {
    const edits = uses.flatMap((use) => use.edits).sort((one, other) => other.start - one.start || other.end - one.end)
    let upgraded = text
    for (const { start, end, newText } of edits) upgraded = upgraded.slice(0, start) + newText + upgraded.slice(end)
    return upgraded
  }

  /**
   * Is a project whose file says it matches Spell `version` written for an older Spell than this one?
   * - No version:  yes, it was written before projects said.
   */
  static isOlderSpell(version: string | undefined): boolean {
    return !version || !valid(version) || lt(version, OldForms.spellVersion)
  }

  /** `version` said short, for people:  `0.9.0` => `0.9`, `1.0.0` => `1.0`;  a patch only when it has one. */
  static shortVersion(version: string): string {
    const parsed = parse(version)
    if (!parsed) return version
    return parsed.patch ? `${parsed.major}.${parsed.minor}.${parsed.patch}` : `${parsed.major}.${parsed.minor}`
  }

  ////////////////
  // ## Each form's rewrite
  ////////////////

  /** The use `problem` (a reported old form) is, in `text`, its edits worked out by its form. */
  private static useOf(text: string, problem: P.Match): OldFormUse[] {
    const { oldForm, replacement = "" } = problem.data as OldFormData
    const { start, end } = problem
    if (!oldForm || start === undefined || end === undefined) return []
    const form = OldForms.form(oldForm)
    const written = text.slice(start, end)
    const edits =
      oldForm === "line-end-comment" ? OldForms.lineEndNoteMoved(text, problem) : OldForms.wordsReplaced(text, problem)
    const message = problem.message ?? ""
    return [{ form, start, end, written, replacement, isDropped: OldForms.isDropped(form), message, edits }]
  }

  /**
   * A retired word's edit:  its new word, `parts` => `slots`.
   * - A word written with a capital keeps it:  `Parts` => `Slots`.
   * - A word that's simply gone takes its colon and spaces with it:  `wait for: deal` => `deal` (epic `language` P13).
   */
  private static wordsReplaced(text: string, problem: P.Match): OldFormEdit[] {
    const { start, end } = problem as { start: number; end: number }
    const { replacement = "" } = problem.data as OldFormData
    if (!replacement) return [{ start, end: end + /^[ \t]*:?[ \t]*/.exec(text.slice(end))![0].length, newText: "" }]
    const written = text.slice(start, end)
    const word = /^[A-ZÁÉÍÓÚÑ]/.test(written) ? replacement[0]!.toUpperCase() + replacement.slice(1) : replacement
    return [{ start, end, newText: word }]
  }

  /** A line-end note's edits, moved to the line under it:  `SP.LineEndComments.moved()`. */
  private static lineEndNoteMoved(text: string, problem: P.Match): OldFormEdit[] {
    const comment = problem.tokens[0]
    return comment instanceof P.CommentToken ? SP.LineEndComments.moved(text, comment) : []
  }
}
