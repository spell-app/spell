/**
 * The English vocabulary of `<ui-property>`:  every name the tag uses.
 * - Its own names first, then `<ui-field>`'s, which it PASSES THROUGH (it is one), where they mean the same.
 * - The shape is `E.ComponentVocabulary`.  Pure data.
 */

import type { E } from "spell/ui/core"
import { fieldVocabulary } from "spell/ui/components/ui-form/UIField.en"
import { passThrough } from "./UIPropertyEditor.types"

/****************
 * ### `propertyVocabulary`
 * The names of `<ui-property>`:  one property of the thing a `<ui-property-editor>` edits,
 * drawn as a `<ui-field>` with the control its schema calls for.
 ****************/
export const propertyVocabulary = {
  ...fieldVocabulary,
  tag: "ui-property",
  topics: ["forms", "inputs"],
  aka: ["property", "inspector row", "setting", "schema field"],
  description:
    "A property is one field of a property editor:  its label, tip, choices and rules come from the editor's schema.",
  attributes: passThrough<E.AttributeSpec>(
    [
      {
        name: "name",
        group: "name",
        kind: "string",
        description: "The property it edits;  a dotted path reaches into a nested thing (`font.size`).  Required."
      },
      {
        name: "as",
        group: "appearance",
        kind: "string",
        description:
          "Which control (a kind `UI.propertyControls` knows):  `input`, `text`, `number`, `date`, `select`, " +
          "`buttons` (a segmented row), `radios`, `range`, `checkbox`, `toggle`, `color`, `sides`, `editor`, or one a " +
          "page added.  None:  the default for its type;  four or fewer choices, all with icons:  `buttons`."
      },
      {
        name: "default",
        group: "form",
        kind: "string",
        description:
          "Its value when nothing's been set, if the schema doesn't say:  a value other than it shows " +
          "`:state(set)`, bold under the editor's `show-defaults`."
      },
      {
        name: "options",
        group: "form",
        kind: "string",
        description:
          "Where its choices come from, when not the schema's:  a source the page added " +
          "(`UI.propertyControls.addChoices()`), or a list, `a, b, c`."
      }
    ] as const satisfies readonly E.AttributeSpec[],
    [fieldVocabulary.attributes]
  ),
  events: [
    {
      name: "ui-changed",
      detail: "{ name: string, value: unknown }",
      description: 'Its property was written (on Save, with `apply="on save"`).'
    }
  ],
  slots: passThrough<E.SlotSpec>(
    [
      { name: "", description: "Your own control, instead of the one it makes;  or nothing." }
    ] as const satisfies readonly E.SlotSpec[],
    [fieldVocabulary.slots]
  ),
  states: passThrough<E.StateSpec>(
    [
      { name: "changed", description: 'Its edit is held, not saved yet (`apply="on save"`).' },
      { name: "buttons", description: 'Its control is a row of radios, one each (`as="radios"`).' },
      { name: "compact", description: "Its editor is `compact`." },
      { name: "show-defaults", description: "Its editor bolds a value other than its default (`show-defaults`)." },
      {
        name: "half",
        description: "Half a row on its editor's grid:  its kind's width (a number, a select), or its `width`."
      },
      { name: "inline-check", description: "A yes or no in a compact editor:  the box, then its label, on one line." },
      { name: "set", description: "Its value isn't its default (`default`, else the schema's;  none:  any value)." },
      { name: "flags", description: "It heads a run of yes-or-no properties, drawn as one select of pills." },
      { name: "flag", description: "It's in a run another property heads:  hidden, its pill in that one's select." }
    ] as const satisfies readonly E.StateSpec[],
    [fieldVocabulary.states]
  ),
  texts: passThrough<E.TextSpec>(
    [
      {
        key: "flags",
        text: "Options",
        description: "The label of a run of yes-or-no properties drawn as one select of pills."
      }
    ] as const satisfies readonly E.TextSpec[],
    [fieldVocabulary.texts]
  )
} as const satisfies E.ComponentVocabulary
