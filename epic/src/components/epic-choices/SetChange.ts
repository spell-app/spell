import { hasSetChange, pickOf, pickedLetters, type AddedOption, type PickFields } from "spell/epic/review"

/****************
 * ### `SetChange`
 * What Owen changes in ONE option set before he sends it (epic `epic-engine` P50):  its picks, the pick-one / pick-any
 * flip, the options he adds, edits and removes -- the fields of the set's ONE mark (`PickFields`), worked out here.
 * - Pure:  each step takes the set as the page shows it (`SetState`) and the mark's fields as they stand, and returns
 *   the fields to save (`ReviewClient.changeSet()`);  `{}` when nothing is left to send.
 * - A mark for ANOTHER set of the same holder (`choices` differs) is set aside:  one mark per holder, the newest set's.
 * - STATIC and instance-free on purpose:  `<epic-choices>` and `<epic-option>` both call it, and its tests need no page.
 * - Position in the import graph:  the review types only;  NEVER Solid or Spell UI.
 ****************/
export class SetChange {
  /** The fields `mark` holds for the set at `state.index`;  `{}` when it holds none, or another set's. */
  static fieldsFor(mark: PickFields | null | undefined, state: SetState): PickFields {
    const fields = pickOf(mark)
    if (!hasSetChange(fields)) return {}
    return (fields.choices ?? 0) === state.index ? fields : {}
  }

  /** Is the set pick any, the mark's flip counted? */
  static isMultiple(fields: PickFields, state: SetState): boolean {
    return fields.multiple ?? state.multiple
  }

  /**
   * The letters (and added keys) picked, as the page should show them:  the mark's list when it has one, else a pick-any
   * set's `chosen` (so a pick adds to what was chosen), else none.
   */
  static picksOf(fields: PickFields, state: SetState): string[] {
    if (fields.pick !== undefined) return pickedLetters(fields.pick)
    return SetChange.isMultiple(fields, state) ? [...state.chosen] : []
  }

  /**
   * A Choose pill clicked on `letter` (or an added option's key, `+1`):
   * - pick one:  it becomes the pick;  again, the pick goes
   * - pick any:  it's added to the picks;  again, it's taken off
   */
  static toggle(fields: PickFields, state: SetState, letter: string): PickFields {
    const picks = SetChange.picksOf(fields, state)
    const on = picks.includes(letter)
    if (!SetChange.isMultiple(fields, state)) return SetChange.with(fields, state, { pick: on ? [] : [letter] })
    return SetChange.with(fields, state, { pick: on ? picks.filter((each) => each !== letter) : [...picks, letter] })
  }

  /**
   * The heading's switch flipped:  pick one <=> pick any.
   * - to pick one with several picked:  the newest pick stays (the last one picked), the others go
   * - back to what the set says:  no flip in the mark
   */
  static flip(fields: PickFields, state: SetState): PickFields {
    const multiple = !SetChange.isMultiple(fields, state)
    const picks = SetChange.picksOf(fields, state)
    const pick = multiple ? picks : picks.slice(-1)
    return SetChange.with(fields, state, { multiple, pick })
  }

  /**
   * An option Owen added (Add choice), under the next free key (`+1`, `+2` ...):  counted as picked, as the plan says
   * (pick one:  it becomes the pick).
   */
  static add(fields: PickFields, state: SetState, option: Omit<AddedOption, "key">): PickFields {
    const added = fields.added ?? []
    const key = `+${Math.max(0, ...added.map((each) => Number(each.key.slice(1)) || 0)) + 1}`
    const next = SetChange.with(fields, state, { added: [...added, { key, ...option }] })
    return SetChange.toggle(next, state, key)
  }

  /** An added option (`key`) changed before it was sent. */
  static editAdded(fields: PickFields, state: SetState, key: string, option: Omit<AddedOption, "key">): PickFields {
    const added = (fields.added ?? []).map((each) => (each.key === key ? { key, ...option } : each))
    return SetChange.with(fields, state, { added })
  }

  /** An added option (`key`) dropped before it was sent:  out of the picks too. */
  static dropAdded(fields: PickFields, state: SetState, key: string): PickFields {
    const added = (fields.added ?? []).filter((each) => each.key !== key)
    const pick = SetChange.picksOf(fields, state).filter((each) => each !== key)
    return SetChange.with(fields, state, { added, pick })
  }

  /** Option `letter` edited in place:  its new title and note (none:  its text unchanged). */
  static edit(fields: PickFields, state: SetState, letter: string, title: string, note?: string): PickFields {
    const edited = (fields.edited ?? []).filter((each) => each.letter !== letter)
    return SetChange.with(fields, state, { edited: [...edited, { letter, title, ...(note && { note }) }] })
  }

  /** Option `letter`'s edit undone, before it was sent. */
  static undoEdit(fields: PickFields, state: SetState, letter: string): PickFields {
    return SetChange.with(fields, state, { edited: (fields.edited ?? []).filter((each) => each.letter !== letter) })
  }

  /** Option `letter` removed:  out of the picks too (and its edit, if any). */
  static remove(fields: PickFields, state: SetState, letter: string): PickFields {
    const removed = (fields.removed ?? []).filter((each) => each !== letter)
    const pick = SetChange.picksOf(fields, state).filter((each) => each !== letter)
    const edited = (fields.edited ?? []).filter((each) => each.letter !== letter)
    return SetChange.with(fields, state, { removed: [...removed, letter], pick, edited })
  }

  /** Option `letter`'s removal undone, before it was sent. */
  static undoRemove(fields: PickFields, state: SetState, letter: string): PickFields {
    return SetChange.with(fields, state, { removed: (fields.removed ?? []).filter((each) => each !== letter) })
  }

  /**
   * `fields` with `changes` laid over them, tidied:  the set's index (always:  a mark without one means the holder's
   * OWN set, I8), the picks as one string, nothing empty, no flip
   * back to what the set says;  `{}` when nothing is left.
   * - a pick-any set's list that's just its `chosen` again is no pick to send
   * - `NOTE:` every chosen option of a pick-any set un-picked sends nothing:  an empty `pick` can't say "none"
   */
  private static with(
    fields: PickFields,
    state: SetState,
    changes: { pick?: string[]; multiple?: boolean } & Omit<PickFields, "pick" | "multiple">
  ): PickFields {
    const multiple = "multiple" in changes ? changes.multiple : fields.multiple
    const picks = changes.pick ?? (fields.pick !== undefined ? pickedLetters(fields.pick) : undefined)
    const added = changes.added ?? fields.added
    const edited = changes.edited ?? fields.edited
    const removed = changes.removed ?? fields.removed
    const flips = multiple !== undefined && multiple !== state.multiple
    const isMultiple = flips ? !!multiple : state.multiple
    const unchanged = isMultiple && picks !== undefined && sameLetters(picks, state.chosen)
    const next: PickFields = {
      ...(picks?.length && !unchanged && { pick: picks.join(" ") }),
      ...(flips && { multiple }),
      ...(added?.length && { added }),
      ...(edited?.length && { edited }),
      ...(removed?.length && { removed })
    }
    if (!hasSetChange(next)) return {}
    return { ...next, choices: state.index }
  }
}

/**
 * An option set as the page shows it, for `SetChange`:
 * - `index`:  its position among its holder's sets (`EpicChoices.setOf()`)
 * - `multiple`:  its own `multiple`, before any flip
 * - `chosen`:  its `chosen` letters, applied already
 */
export type SetState = { index: number; multiple: boolean; chosen: readonly string[] }

/** Do `a` and `b` name the same letters, in any order? */
function sameLetters(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((each) => b.includes(each))
}
