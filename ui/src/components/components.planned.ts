/**
 * The tags Spell UI is going to have, but doesn't yet:  each with its Spanish name, the gap it fills and the phase
 * of epic `ui-gaps` that builds it.
 * - Why:  a `.spellx` drawing holds no native HTML, so a tag Spell UI lacks is a tag nobody can draw.
 *   A drawing's reader uses this list to say "coming:  tables" for a planned tag, rather than "unknown tag".
 * - A tag LEAVES this list in the change that builds it:  `components.planned.test.ts` fails on a planned tag
 *   that's already in the root catalog.
 * - Pure data, no imports:  any tool can read it, node included.
 */
export const PLANNED_COMPONENTS: readonly PlannedComponent[] = [
  {
    tag: "ui-stack",
    es: "pila",
    gap: "layout",
    phase: "layout-stack",
    description: "A plain box that lays its children out in a column or a row, with spacing, and no look of its own."
  },
  { tag: "ui-link", es: "enlace", gap: "links", phase: "text-blocks", description: "A link inside running text." },
  {
    tag: "ui-keys",
    es: "teclas",
    gap: "text",
    phase: "text-blocks",
    description: "Key caps for a shortcut:  `mod+S` shows ⌘S on a Mac, Ctrl+S elsewhere."
  },
  {
    tag: "ui-quote",
    es: "cita",
    gap: "text",
    phase: "text-blocks",
    description: "A quotation:  a block, or `inline`."
  },
  {
    tag: "ui-page",
    es: "pagina",
    gap: "page frame",
    phase: "page-frame",
    description: "The whole window:  header, nav, main, aside and footer, the regions screen readers jump between."
  },
  { tag: "ui-video", es: "video", gap: "media", phase: "video-and-audio", description: "A video file, played." },
  { tag: "ui-audio", es: "audio", gap: "media", phase: "video-and-audio", description: "A sound file, played." },
  {
    tag: "ui-terms",
    es: "terminos",
    gap: "term list",
    phase: "terms-and-figures",
    description: "Terms and their values, lined up:  `Suit:  hearts`."
  },
  {
    tag: "ui-term",
    es: "termino",
    gap: "term list",
    phase: "terms-and-figures",
    description: "One term and its value."
  }
]

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
