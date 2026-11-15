import { SRV } from "spell/server"

import { DataFile } from "spell/epic/data/DataFile"

import type { PlanDoc } from "./PlanDoc"
import { PlanDocFiles } from "./PlanDocFiles"
import { PlanItem } from "./PlanItem"

/****************
 * ### `InstantUndo`
 * What each instant mark the page server applied changed on its item (`InstantMarks`), so Owen's Cmd-Z, or a second
 * click on the still-grey item, puts it back exactly as it was (epic `epic-engine` T80;  Owen, 2026-11-15:
 * "Cmd-z to undo the mark on the hidden thing?").
 * - an instant ✓ or x changes only its item's attributes (status, fixed, wanted, reviewed ...) and its UPDATE label
 *   (`PlanDoc.applyAction()`, `reviewedAs()`):  so what's kept is those, before and after
 * - kept in a file beside the page's inbox, `<epic>.instant-undo.json5` (`DataFile`), the last `KEPT` of them, newest last
 * - put back only while the item still stands as the mark left it:  changed since (Claude reopened it, a later mark),
 *   the undo is refused, saying so
 * - an open question's ✓ answers it with its recommended option, which changes its text:  not undone here (Revisit)
 * - node only:  the review routes load it lazily, as `InstantMarks`
 ****************/
export class InstantUndo {
  /**
   * What `item` stands as now, as an undo keeps it.
   */
  static snapshotOf(item: Element): ItemSnapshot {
    const label = PlanItem.updateLabelOf(item)
    return { attributes: attributesOf(item), label: label ? attributesOf(label) : null }
  }

  /**
   * SIDE EFFECT:  `applied` (an instant mark on `id`, applied to page `file`) kept, so it can be undone.
   * - `undoable`:  false for one that changed more than attributes (an open question answered)
   */
  static keep(file: string, applied: UndoRecord): void {
    const path = InstantUndo.pathFor(file)
    SRV.FileLock.run(path, () => {
      const records = InstantUndo.read(path).filter((each) => each.id !== applied.id)
      records.push(applied)
      DataFile.write(path, records.slice(-KEPT))
    })
  }

  /**
   * SIDE EFFECT:  the last instant mark applied to item `id` on page `file` undone:  the item put back as it was
   * before it, a log line saying so;  what was done.
   * - `root`:  the checkout the page server serves (`PlanDocFiles`)
   * - throws `SRV.HttpError`:  404 when there's nothing to undo for `id`, 409 when it can't be (changed since, or a
   *   question answered)
   */
  static async undo(file: string, root: string, id: string): Promise<string> {
    const path = InstantUndo.pathFor(file)
    const record = InstantUndo.read(path).find((each) => each.id === id)
    if (!record) throw new SRV.HttpError(404, `${id.toUpperCase()}:  nothing to undo`)
    if (!record.undoable)
      throw new SRV.HttpError(409, `${id.toUpperCase()}:  its answer changed its text;  use Revisit to open it again`)
    const did = await new PlanDocFiles({ root }).edit(file, (plan) => InstantUndo.restore(plan, record))
    SRV.FileLock.run(path, () => {
      DataFile.write(
        path,
        InstantUndo.read(path).filter((each) => each.id !== id)
      )
    })
    return did
  }

  /** Where page `file`'s undo records are kept:  beside its inbox. */
  static pathFor(file: string): string {
    return file.replace(/(\.plan|\.saga)?\.html$/, `.instant-undo${DataFile.SUFFIX}`)
  }

  /** `record`'s item on `plan` put back;  what was done.  Throws a 409 when it changed since. */
  private static restore(plan: PlanDoc, record: UndoRecord): string {
    const item = plan.findItem(record.id)
    const label = record.id.toUpperCase()
    if (!item) throw new SRV.HttpError(404, `${label}:  no longer on the page`)
    const now = attributesOf(item)
    const changed = WATCHED.some((name) => (now[name] ?? null) !== (record.after.attributes[name] ?? null))
    if (changed) throw new SRV.HttpError(409, `${label} has changed since:  use Revisit to open it again`)
    for (const name of Object.keys(now)) if (!(name in record.before.attributes)) item.removeAttribute(name)
    for (const [name, value] of Object.entries(record.before.attributes)) item.setAttribute(name, value)
    PlanItem.dropUpdateLabel(item)
    if (record.before.label) {
      plan.markUpdate(item)
      const restored = PlanItem.updateLabelOf(item)!
      for (const name of restored.getAttributeNames()) restored.removeAttribute(name)
      for (const [name, value] of Object.entries(record.before.label)) restored.setAttribute(name, value)
    }
    plan.log(`${label} undone:  ${record.did} taken back, as it was before`)
    return `${record.did} taken back`
  }

  /** The records in `path`;  none when there's no file, or it doesn't read. */
  private static read(path: string): UndoRecord[] {
    try {
      const records = DataFile.read<unknown>(path)
      return Array.isArray(records) ? (records as UndoRecord[]) : []
    } catch {
      return []
    }
  }
}

/** How many applied instant marks a page keeps for undo. */
const KEPT = 20

/** The attributes that say an item still stands as an instant mark left it:  any other change refuses an undo. */
const WATCHED = ["status", "fixed", "urgent", "review-as"] as const

/** `element`'s attributes, name -> value. */
function attributesOf(element: Element): Record<string, string> {
  return Object.fromEntries(element.getAttributeNames().map((name) => [name, element.getAttribute(name) ?? ""]))
}

/** An item as an undo keeps it:  its attributes, and its UPDATE label's (`null`:  none). */
export type ItemSnapshot = {
  /** the item element's attributes */
  attributes: Record<string, string>
  /** its `<epic-update>` label's attributes;  `null`:  it had none */
  label: Record<string, string> | null
}

/** One applied instant mark, kept for undo. */
export type UndoRecord = {
  /** the item's id (`i57`) */
  id: string
  /** the mark's action (`approve`, `drop`, `skip`) */
  action: string
  /** what applying it did, `inbox apply`'s words (`canceled:  dropped by Owen`) */
  did: string
  /** when it was applied (ISO) */
  at: string
  /** may it be undone:  false when it changed more than the item's attributes (an open question answered) */
  undoable: boolean
  /** the item before the mark */
  before: ItemSnapshot
  /** the item after it */
  after: ItemSnapshot
}
