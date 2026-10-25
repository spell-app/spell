/**
 * The tags Spell UI is going to have, but doesn't yet:  each with its Spanish name, the gap it fills and the phase
 * of epic `ui-gaps` that builds it.
 * - Why:  a `.spellx` drawing holds no native HTML, so a tag Spell UI lacks is a tag nobody can draw.
 *   A drawing's reader uses this list to say "coming:  tables" for a planned tag, rather than "unknown tag".
 * - A tag LEAVES this list in the change that builds it:  `components.planned.test.ts` fails on a planned tag
 *   that's already in the root catalog.
 * - Pure data, no imports:  any tool can read it, node included.
 */
// empty since epic `ui-gaps` P12:  every planned tag is built
export const PLANNED_COMPONENTS: readonly PlannedComponent[] = []

/** A tag Spell UI plans, and doesn't have yet. */
export type PlannedComponent = {
  /** Its tag, as it will be defined:  `ui-stack`;  in a drawing, the short name without `ui-`. */
  tag: string
  /** Its Spanish name, ASCII as every Spell UI name is:  `pila`, so `<es-pila>`. */
  es: string
  /** The gap it fills, in a word or two:  what "coming:  ..." says. */
  gap: string
  /** The `ui-gaps` phase that builds it, by its id without the `p-`:  `layout-stack`. */
  phase: string
  /** What it is, for people. */
  description: string
}
