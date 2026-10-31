/**
 * The English vocabulary of `<ui-panel>`:  `<ui-section>`'s, under the panel's own tag, description and other names.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Built ON the section's:  the same attributes, slots, parts, events, states and texts,
 *   so it can't drift from what the component does,
 *   and an attribute the section gains reaches the panel with no change here.
 * - Only `color` and `fold-icon` are described again, as the panel uses them.
 *   - `color` keeps the section's value set (`hues`), so a hue a theme adds is accepted
 *     (`spell-brand`'s `accent`, named by `packages/brand/src/hues.ts`).
 * - The same noun (`section`) and `ownsParts`:  a panel nests in a section, and a section in a panel.
 * - The class words are the section's, then `panel` (and `sub` inside another panel):
 *   `<ui-panel color="violet">` => `ui violet panel section`.
 * - `appearance` gains `pane`, which only the panel draws.
 */

import type { E } from "spell/ui/core"
import { sectionVocabulary } from "spell/ui/components/ui-section/UISection.en"

// NOTE:  above the vocabulary, which reads them as it's built

/** The `appearance` word for a whole pane under one bar. */
export const PANE_APPEARANCE = "pane"

/** `color`'s description, as the panel uses it. */
const COLOR_DESCRIPTION =
  "Hue of the whole panel:  the header band, the box, the border and the sub-head bands (sub-panels follow it).  " +
  "None:  `primary`.  Any hue, including one a theme adds (`spell-brand`'s `accent`, Polished Ivory)."

/** `fold-icon`'s description, as the panel uses it:  its default is `end`. */
const FOLD_ICON_DESCRIPTION =
  "Where each band's open / close chevron sits:  `end`, at the far end of the band after any actions (the panel's " +
  "default), or `start`, before the title."

/** `appearance`'s description, as the panel uses it:  the section's words, and `pane`. */
const APPEARANCE_DESCRIPTION =
  "The look:  `pane`, a whole pane under one flat bar, with no box or padding of its own:  its title is the bar " +
  "and its content fills what's left, so it can scroll by itself.  " +
  "Put a toolbar in its `slot=\"actions\"`, and the bar's chevron, the toolbar's items and its actions read as one row.  " +
  "Closed, only the bar is left.  The section's words too:  `bordered`, `styled`, `raised`, `basic`, `drawer`."

/****************
 * ### `panelVocabulary`
 * The names of `<ui-panel>`, a property panel:  a tinted box with a full-width header band;
 * a panel inside it is a sub-head band.  Every band can fold.
 ****************/
export const panelVocabulary = {
  ...sectionVocabulary,
  tag: "ui-panel",
  topics: ["layout", "containers"],
  aka: ["inspector", "property panel", "properties", "settings panel", "fieldset", "property sheet"],
  description:
    "A panel is an inspector:  a tinted box of fields under a header band, with sub-head bands that open and close.  " +
    "It takes every `<ui-section>` attribute.",
  attributes: sectionVocabulary.attributes.map((spec) =>
    spec.name === "color"
      ? { ...spec, description: COLOR_DESCRIPTION }
      : spec.name === "fold-icon"
        ? { ...spec, description: FOLD_ICON_DESCRIPTION }
        : spec.name === "appearance"
          ? { ...spec, values: [...spec.values, PANE_APPEARANCE], description: APPEARANCE_DESCRIPTION }
          : spec
  )
} as const satisfies E.ComponentVocabulary
