import { createSignal } from "solid-js"

// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"

import { PHASE_FIELDS_KEY, PHASE_OWN_FIELDS_KEY, type PhaseFieldName } from "./EpicSection.types"

/****************
 * ### `PhaseFields`
 * Which of its fields each phase shows on this page (Files, Verify:  `PHASE_FIELDS`;  epic `epic-engine` I166).
 * - The Phases section's gear menu chooses for EVERY phase;  a phase's own gear menu, for that phase alone,
 *   and its choice wins there.
 *   - choosing for every phase forgets each phase's own choice of that field:  "Show each phase's files" shows them in
 *     each phase
 *   - a phase's choice that matches every phase's is no choice of its own:  forgotten too
 * - Remembered per page, in this browser:  every phase's under the toggles' old key (`PHASE_FIELDS_KEY`), each
 *   phase's by its id (`PHASE_OWN_FIELDS_KEY`).
 * - Its reads are TRACKED:  a section or a phase drawing from them draws again when a choice changes (one signal,
 *   bumped on every write;  the choices themselves are read from storage, the one truth).
 * - ONE per page (`phaseFields`):  the Phases section and every phase share it, whichever draws first.
 * - Plain:  no DOM, no component;  `<epic-section>` and `<epic-phase>` set their custom properties from it.
 ****************/
export class PhaseFields {
  /** Bumped on every write:  what the reads track. */
  private readonly changes = createSignal(0)

  /** Every phase's choice:  each field chosen, shown or not;  none chosen, hidden.  Tracked. */
  everyPhase(): Partial<Record<PhaseFieldName, boolean>> {
    this.changes[0]()
    return PhaseFields.saved(PHASE_FIELDS_KEY) as Partial<Record<PhaseFieldName, boolean>>
  }

  /** `phaseId`'s own choices, which win over every phase's for it;  none, `{}`.  Tracked. */
  ownOf(phaseId: string): Partial<Record<PhaseFieldName, boolean>> {
    this.changes[0]()
    const own = PhaseFields.saved(PHASE_OWN_FIELDS_KEY)[phaseId]
    return own && typeof own === "object" ? (own as Partial<Record<PhaseFieldName, boolean>>) : {}
  }

  /** Does `phaseId` show `field`?  Its own choice, else every phase's.  Tracked. */
  shows(phaseId: string, field: PhaseFieldName): boolean {
    return this.ownOf(phaseId)[field] ?? !!this.everyPhase()[field]
  }

  /**
   * Show `field` in every phase, or not, and remember it.
   * - each phase's own choice of `field` forgotten
   */
  setEveryPhase(field: PhaseFieldName, isShown: boolean) {
    PhaseFields.save(PHASE_FIELDS_KEY, { ...PhaseFields.saved(PHASE_FIELDS_KEY), [field]: isShown })
    const owns = PhaseFields.saved(PHASE_OWN_FIELDS_KEY)
    for (const id of Object.keys(owns)) owns[id] = PhaseFields.without(owns[id], field)
    PhaseFields.save(PHASE_OWN_FIELDS_KEY, PhaseFields.pruned(owns))
    this.changed()
  }

  /**
   * Show `field` in `phaseId` alone, or not, and remember it.
   * - the same as every phase's:  its own choice forgotten, so a later choice for every phase reaches it
   */
  setOwn(phaseId: string, field: PhaseFieldName, isShown: boolean) {
    const owns = PhaseFields.saved(PHASE_OWN_FIELDS_KEY)
    const own = PhaseFields.without(owns[phaseId], field)
    if (isShown !== !!(PhaseFields.saved(PHASE_FIELDS_KEY) as Record<string, unknown>)[field]) own[field] = isShown
    owns[phaseId] = own
    PhaseFields.save(PHASE_OWN_FIELDS_KEY, PhaseFields.pruned(owns))
    this.changed()
  }

  /** Tell every reader a choice changed. */
  private changed() {
    const [read, write] = this.changes
    write(read() + 1)
  }

  /** `own`, a phase's choices, without `field`'s:  a new object. */
  private static without(own: unknown, field: PhaseFieldName): Record<string, boolean> {
    const copy: Record<string, boolean> = {
      ...(own && typeof own === "object" ? (own as Record<string, boolean>) : {})
    }
    delete copy[field]
    return copy
  }

  /** `owns` without the phases that have no choice left. */
  private static pruned(owns: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(owns).filter(([, own]) => own && Object.keys(own).length))
  }

  /** This page's JSON under `prefix`;  `{}` without storage, or for bad JSON. */
  private static saved(prefix: string): Record<string, unknown> {
    const value = PrefStore.getAt(prefix + location.pathname)
    return value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {}
  }

  /** Keep `value` for this page under `prefix`;  a browser that blocks storage keeps it for the visit. */
  private static save(prefix: string, value: object) {
    PrefStore.setAt(prefix + location.pathname, value)
  }
}

/** The page's ONE `PhaseFields`:  the Phases section's and every phase's. */
export const phaseFields = new PhaseFields()
