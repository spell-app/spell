import { Markup } from "spell/epic/markup"
import { PlanAnchors } from "spell/epic/tool/PlanAnchors"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `ChangesAfterGoal`
 * The migration `changes-after-goal` (epic `epic-engine` P45;  Owen, 2026-10-25:  "Move `changes` below `goal` so
 * it's next to the plan"):  a phase's Changes field after its Goal, where `<epic-phase>`'s content model lists it now.
 * - Symptom, Requests, Goal, Changes, then the plan changes and Claude's plan;  before:  Symptom, Changes, ... Goal
 * - moved to its place as the tool places a new field (`Markup.place()`), every word kept;  a phase already in that
 *   order is left as it is
 * - Owen's comments on the phase's fields follow them:  a field's anchor is its place (`p3#field-2`), so each one
 *   whose field's place changed is re-anchored (`context.moves`, written into the inbox after the page)
 * - IDEMPOTENT:  a moved field is in its place, where nothing moves again
 * - Cheap markup:  every edit runs it too (`everyEdit`)
 ****************/
export class ChangesAfterGoal implements Migration {
  readonly name = "changes-after-goal"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = true
  readonly description = "a phase's Changes field after its Goal, next to Claude's plan"

  /** Put every phase's Changes field in `document` in its place, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    let changed = false
    for (const field of Array.from(document.querySelectorAll(CHANGES))) {
      const phase = field.parentElement!
      const before = field.previousElementSibling
      const anchors = ChangesAfterGoal.fieldAnchors(phase)
      field.remove()
      Markup.place(phase, field)
      if (field.previousElementSibling === before) continue
      ChangesAfterGoal.followComments(anchors, context)
      // whitespace the field sat in stays put;  the formatter tidies it
      context.notes?.push(
        `changes-after-goal:  ${phase.id}:  Changes moved after ${ChangesAfterGoal.nameOf(field.previousElementSibling)}`
      )
      changed = true
    }
    return changed
  }

  /** Each field of `phase` and its anchor now (`p3#field-2`), before a move. */
  private static fieldAnchors(phase: Element): Map<Element, string> {
    const fields = Array.from(phase.querySelectorAll(":scope > epic-field"))
    return new Map(fields.map((field) => [field, PlanAnchors.anchorOf(field)]))
  }

  /** The inbox's comments on a field whose anchor changed in the move:  each a move, `from` its old anchor. */
  private static followComments(anchors: Map<Element, string>, context: MigrationContext) {
    const comments = Object.entries(context.inbox?.comments ?? {})
    if (!comments.length) return
    for (const [field, from] of anchors) {
      const to = PlanAnchors.anchorOf(field)
      if (to === from) continue
      for (const [id, comment] of comments) if (comment.anchor === from) context.moves?.push({ id, from, to })
    }
  }

  /** What `element` is, as the note says it:  `Goal`, `<epic-reply>`. */
  private static nameOf(element: Element | null): string {
    const name = element?.getAttribute("name")
    return name ? `${name[0]!.toUpperCase()}${name.slice(1)}` : `<${element?.localName ?? "?"}>`
  }
}

/** A phase's Changes field. */
const CHANGES = 'epic-phase > epic-field[name="changes"]'
