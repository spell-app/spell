/**
 * The English vocabulary of `<ui-property-group>`:  every name the tag uses.
 * - Its own names first, then `<ui-section>`'s, which it PASSES THROUGH (it is one), where they mean the same.
 *   - Not passed through:  `source`, and what only works with it (`ui-loaded`, `:state(loaded)`, the load texts).
 *   - Its own `select` picks from the editor's `source` page instead.
 * - The shape is `E.ComponentVocabulary`.  Pure data.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"
import { sectionVocabulary } from "spell/ui/components/ui-section/UISection.en"
import { passThrough } from "./UIPropertyEditor.types"

/** The section's names that only work with `source`:  a group has none. */
const SOURCE_ONLY = [
  "source",
  "ui-loaded",
  "loaded",
  "sourceLoadError",
  "sourceCrossOrigin",
  "sourceFileProtocol",
  "sourceRenderError"
]

/****************
 * ### `propertyGroupVocabulary`
 * The names of `<ui-property-group>`:  a folding band of properties in a `<ui-property-editor>`.
 ****************/
export const propertyGroupVocabulary = {
  ...sectionVocabulary,
  tag: "ui-property-group",
  topics: ["forms", "layout"],
  aka: ["property group", "fieldset", "settings group", "inspector section"],
  description:
    "A property group is a band of properties that opens and closes, in a property editor.  It takes `<ui-section>`'s attributes.",
  attributes: passThrough<E.AttributeSpec>(
    [
      {
        name: "selector",
        group: "appearance",
        kind: "string",
        replaces: ["select"],
        description:
          "A CSS selector:  the group's properties are its first match in the editor's `source` page (P6).  " +
          "Its old name was `select`."
      },
      {
        name: "readonly",
        group: "form",
        kind: "boolean",
        description: "Shows every value;  nothing can be changed.  Reaches every property in it."
      },
      {
        name: "state",
        group: "form",
        kind: "valueOnly",
        values: UIT.FormStates,
        description: "Its state:  tints its title.  A property in it failing validation shows `error` on top."
      },
      {
        name: "output",
        group: "content",
        kind: "string",
        description: 'A value at the end of the title bar;  `slot="output"`.'
      },
      { name: "error", group: "form", kind: "string", description: "An error under the title, and the `error` state." },
      {
        name: "columns",
        group: "layout",
        kind: "number",
        description:
          "How many columns its properties lay out on (a short one takes one, the rest a whole row).  " +
          "None:  its editor's (2 when the editor is `compact`)."
      },
      {
        name: "flags",
        group: "appearance",
        kind: "valueOnly",
        values: ["pills", "checkboxes"],
        description:
          "Its yes-or-no properties:  `pills`, every run of them one select of pills;  `checkboxes`, never.  " +
          "None:  three or more side by side are pills, fewer stay checkboxes."
      }
    ] as const satisfies readonly E.AttributeSpec[],
    [sectionVocabulary.attributes],
    SOURCE_ONLY
  ),
  events: passThrough<E.EventSpec>(
    [
      {
        name: "ui-invalid",
        detail: "{ field: string, value: FieldValue, errors: string[], values: Record<string, FieldValue> }",
        description: "A property in the group failed validation (the editor sends it on the group too)."
      },
      {
        name: "ui-saved",
        detail: "{ values: Record<string, FieldValue>, originalEvent?: Event }",
        description: "The editor's submit or Save passed validation (sent on each group too)."
      }
    ] as const satisfies readonly E.EventSpec[],
    [sectionVocabulary.events],
    SOURCE_ONLY
  ),
  slots: passThrough<E.SlotSpec>(
    [{ name: "output", description: "Rich output (instead of `output`)." }] as const satisfies readonly E.SlotSpec[],
    [sectionVocabulary.slots]
  ),
  parts: passThrough<E.PartSpec>(
    [
      { name: "output", description: "The output." },
      { name: "error-line", description: "The group's own error, under its title." }
    ] as const satisfies readonly E.PartSpec[],
    [sectionVocabulary.parts]
  ),
  states: passThrough<E.StateSpec>(
    [
      { name: "changed", description: 'A property in it has an edit not saved yet (`apply="on save"`).' },
      { name: "readonly", description: "Nothing in it can be changed (`readonly`)." },
      { name: "error", description: "Its `error`, or a property in it failing validation." },
      { name: "compact", description: "Its editor is `compact`:  a tight band." },
      { name: "grid", description: "Its properties lay out on columns (`columns`, or its editor's)." }
    ] as const satisfies readonly E.StateSpec[],
    [sectionVocabulary.states],
    SOURCE_ONLY
  ),
  texts: passThrough<E.TextSpec>([], [sectionVocabulary.texts], SOURCE_ONLY)
} as const satisfies E.ComponentVocabulary
