import { Markup } from "spell/epic/markup"
import { PlanItem } from "spell/epic/tool/PlanItem"
import { PlanTime } from "spell/epic/tool/PlanTime"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `PicksInChoices`
 * The migration `picks-in-choices` (epic `epic-engine` I153;  Owen, 2026-10-29, on the pick's Noted card:  "seems
 * like it should be part of the collapsed 'chosen' section"):  each pick's Noted card moves into its item's Choices.
 * - before I153, recording a pick (`epic inbox apply`, `epic choose`, a revisit's pick kept) added a Noted card,
 *   `Chose B · Bananas:  recorded as the answer;  waiting for ...`, saying again what the Choices header says;
 *   since, the set holds it:  `<epic-choices chosen="B" chosen-on="2026-10-22" chosen-note="recorded ...">`
 * - which cards:  an item's own Noted card whose whole text is `Chose <letter> · ...`, the item having a set whose
 *   `chosen` is that letter (never one in its Original Discussion)
 *   - a card that was underway first (a reading AND a summary) says more than the pick:  left
 * - the set takes the card's day (`done-at`, else `at`) and what it recorded (from `recorded ...` on;  else all
 *   after the option's title);  a set that has its line already keeps it, and the card just goes
 * - each move is a note, and ONE log line names the items
 * - Runs on command (`epic migrate`), never on every edit:  it removes cards
 * - IDEMPOTENT:  a moved card is gone
 ****************/
export class PicksInChoices implements Migration {
  readonly name = "picks-in-choices"
  readonly kind = "epic"
  readonly date = "2026-10-29"
  readonly everyEdit = false
  readonly description = "each pick's Noted card (`Chose B · ...`) moves into its item's Choices (`chosen-on`, `chosen-note`)"

  /** Move every such card of `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const moved: string[] = []
    for (const item of Array.from(document.querySelectorAll("epic-item"))) {
      if (item.parentElement?.closest("epic-original")) continue
      for (const card of Array.from(item.querySelectorAll(':scope > epic-status[state="noted"]'))) {
        if (card.querySelector(':scope > [slot="summary"]')) continue
        const text = (card.textContent ?? "").replace(/\s+/g, " ").trim()
        const letter = CHOSE.exec(text)?.[1]
        const set = letter && PlanItem.choiceSets(item).find((each) => each.getAttribute("chosen") === letter)
        if (!set) continue
        if (!set.hasAttribute("chosen-note")) {
          const day = (card.getAttribute("done-at") ?? card.getAttribute("at") ?? "").slice(0, 10)
          Markup.set<"epic-choices">(set, {
            chosenOn: DAY.test(day) ? day : undefined,
            chosenNote: PicksInChoices.noteOf(text, set, letter) || undefined
          })
        }
        card.remove()
        const label = item.id.toUpperCase()
        if (!moved.includes(label)) moved.push(label)
        context.notes?.push(`picks-in-choices:  ${label}'s "${text}" moved into its Choices`)
      }
    }
    if (moved.length) PicksInChoices.log(document, `Picks' Noted cards moved into their Choices:  ${moved.join(", ")}`, context.now)
    return moved.length > 0
  }

  /**
   * What the card recorded, for `chosen-note`:  from `recorded` on;  else all after `Chose B · <its title>:`.
   * - `""` when there's nothing after the option
   */
  private static noteOf(text: string, set: Element, letter: string): string {
    const recorded = /\brecorded\b.*$/.exec(text)?.[0]
    if (recorded) return recorded
    const title = PlanItem.optionsIn(set).find((option) => option.letter === letter)?.title.replace(/\s+/g, " ").trim()
    const head = `Chose ${letter} · ${title}:`
    return title && text.startsWith(head) ? text.slice(head.length).trim() : ""
  }

  /** Add `line` to the page's log, at `now`. */
  private static log(document: Document, line: string, now: Date) {
    const log = document.querySelector('epic-page > epic-section[kind="log"]')
    if (!log) return
    const event = document.createElement("epic-event")
    event.setAttribute("at", PlanTime.isoMinutes(now))
    event.textContent = line
    log.append(event)
  }
}

/** A pick's Noted card:  `Chose B · Bananas:  recorded ...`;  the letter. */
const CHOSE = /^Chose ([A-Z]) · /

/** A day as the tool writes one:  `2026-10-29`. */
const DAY = /^\d{4}-\d{2}-\d{2}$/
