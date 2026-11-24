/**
 * Warnings on a program's reads of a place's field that a later look at the place couldn't find (epic `language` P68,
 * Q82):  `the "user" of the job`, where the place's Spell file says
 * `its "user" is text`, then `-- APPARENTLY DELETED as of 2026-11-19` inside it.
 * - The marks are the ingest's (`spell place update`, `mergedSpell()`), read by `PlaceWords`:
 *   here they're read off the field's own declaration, the `--` lines in its body, as parsed.
 *   No file is read again.
 * - Imports `spell/parser/parser`, `spell/parser/spell` (read at call time) and `PlaceWords`, plain text only.
 */
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { PlaceWords, type WordsMark } from "spell/parser/spell/ingest/PlaceWords"

/**
 * Notes a warning on each read of a field its place's Spell file marks gone, and finds its likely new name.
 * - A warning, never an error:  the line still compiles, and the field may still be there.
 * - On EACH read:  two lines reading it, two warnings.
 * - The likely new name:  when the same look (the same date) marked one field of the type gone and one NEW, with the
 *   same type of value.  The warning names it, and the language server offers "Change to ..." (`renameAt()`).
 * - STATIC and instance-free on purpose, as `SpellWarnings`:  what it knows is on the matches and scope records.
 */
export class PlaceFieldMarks {
  /**
   * Note on `match`, a member read, a warning under its `property` while what it reads is marked gone.
   * - Reads `match.data`'s `member`, else its `ownerType`'s member by `property`'s words:  a field declared further
   *   down, or in a later file, is found when the warnings are gathered (`SP.SpellWarnings.noteIf()`).
   * - SIDE EFFECT:  notes it on `match`.  Call it WHILE PARSING, once the read has resolved what it can.
   */
  static warnIfGone(match: P.Match, property: P.Match): void {
    const data = match.data as { member?: unknown; ownerType?: P.TypeScope }
    const found = data.member
    if (found !== undefined && !(found instanceof P.ScopeVariable)) return
    // nothing to look in:  a read of `it` with no type, or of a type no place keeps (nor may yet:  a stub)
    if (!found && !(data.ownerType && (data.ownerType.stub || data.ownerType.savedPlace()))) return
    if (found && !PlaceFieldMarks.goneMarkOf(found)) return
    const { ownerType } = data
    const words = `${property.value}`
    const member = () => {
      const now = (match.data as { member?: unknown }).member ?? ownerType?.getMember(words)
      return now instanceof P.ScopeVariable ? now : undefined
    }
    RENAMES.set(property, () => {
      const field = member()
      return field && PlaceFieldMarks.renameOf(field)
    })
    const wording = () => PlaceFieldMarks.messageFor(match.scope, member()!)
    SP.SpellWarnings.noteIf(match, wording, () => !!PlaceFieldMarks.goneMarkOf(member()), property, GONE_KEY)
  }

  /**
   * The words a warned read at `at` (its `property`) would likely read now, its field's new name -- `undefined` if none.
   * - For the language server's "Change to ..." fix:  `at` is the warning's `at` (`SP.SpellWarnings.in()`).
   * - Only while the field is still marked gone.
   */
  static renameAt(at: P.Match): string | undefined {
    const rename = RENAMES.get(at)?.()
    return rename && (rename.asWritten ?? rename.name)
  }

  /** The mark saying the ingest couldn't find `field` any more, if it has one:  the newest. */
  static goneMarkOf(field: P.ScopeVariable | undefined): WordsMark | undefined {
    return PlaceFieldMarks.marksOf(field)
      .filter((mark) => mark.is === "gone")
      .at(-1)
  }

  /**
   * `field`'s likely new name:  the one other field of its type marked NEW on the day it was marked gone,
   * with the same type of value -- `undefined` unless there's exactly one, and it's the only one gone that day.
   */
  static renameOf(field: P.ScopeVariable): P.ScopeVariable | undefined {
    const gone = PlaceFieldMarks.goneMarkOf(field)
    const type = field.scope
    if (!gone || !(type instanceof P.TypeScope)) return undefined
    const fields = type.variables.scan(() => true).filter((each) => each.datatype === field.datatype)
    const markedThatDay = (is: WordsMark["is"]) =>
      fields.filter((each) => PlaceFieldMarks.marksOf(each).some((mark) => mark.is === is && mark.date === gone.date))
    const added = markedThatDay("new")
    return added.length === 1 && markedThatDay("gone").length === 1 ? added[0] : undefined
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * The ingest's marks on `field`:  its declaration's body lines that are only a `--` mark, oldest first.
   * - Only a field declared with a body under its line, as a place's Spell file writes each one.
   */
  private static marksOf(field: P.ScopeVariable | undefined): WordsMark[] {
    const body = (field?.declaredBy?.data as { body?: unknown } | undefined)?.body
    if (!(body instanceof P.Match)) return []
    const marks: WordsMark[] = []
    for (const line of body.matched) {
      // a comment-only line, as `SP.Block.descriptionLineOf()` reads one
      const only = line instanceof P.Match && line.matched.length === 1 ? line.matched[0] : undefined
      const token = only instanceof P.Match && only.tokens.length === 1 ? only.tokens[0] : undefined
      if (!(token instanceof P.CommentToken) || token.commentSymbol !== "--") continue
      const mark = PlaceWords.markIn(`${token.value}`)
      if (mark) marks.push(mark)
    }
    return marks
  }

  /** What to say of a read of `field`, marked gone, in `scope`'s language. */
  private static messageFor(scope: P.Scope, field: P.ScopeVariable): string {
    const type = field.scope as P.TypeScope
    const saved = type.savedPlace()
    const language = SP.Language.of(scope)
    const rename = PlaceFieldMarks.renameOf(field)
    const params = {
      field: field.asWritten ?? field.name,
      aType: SP.SpellWarnings.exampleNoun(scope, type),
      place: saved?.placeType.placeName ?? saved?.place ?? type.name,
      date: PlaceFieldMarks.goneMarkOf(field)!.date
    }
    if (!rename) return language.parserMessage("place-field-gone", params)
    return language.parserMessage("place-field-renamed", { ...params, newField: rename.asWritten ?? rename.name })
  }
}

/** The key `SP.SpellWarnings.noteIf()` tells this warning apart by. */
const GONE_KEY = "place-field-gone"

/** Each warned read's `property`, to its field's likely new name:  `renameAt()`. */
const RENAMES = new WeakMap<P.Match, () => P.ScopeVariable | undefined>()
