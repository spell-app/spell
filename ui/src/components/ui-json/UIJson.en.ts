/**
 * The English vocabulary of `<ui-json>`:  every name the tag uses.
 * - Its tag, attributes, events and states.  The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Ours, not Fomantic's (epic `elemental-spell` P31).
 * - The source pieces (`source`, `load`, `ui-loaded` ... `ui-error`, the states) are shared with `<ui-code>` and
 *   `<ui-markdown>`:  `UIT.Source*`, which `LoadableComponent` reads.
 *   - Its `ui-changed` is its own, with the parsed `value`.
 *   - No loader or error parts, and no error texts:  it draws nothing.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

const [LOADED, , SAVING, SAVED, ERROR] = UIT.SourceEvents

/****************
 * ### `jsonVocabulary`
 * The names of `<ui-json>`, JSON data held in a page:  as its text, or from a file with `source`.
 ****************/
export const jsonVocabulary = {
  tag: "ui-json",
  icon: "code",
  topics: ["data display", "modules"],
  aka: ["data", "data island", "json script", "application/json", "data block", "datos"],
  noun: "JSON data",
  description:
    "JSON data holds data in a page, as its text or from a file with `source`.  It draws nothing:  `value` is the " +
    "parsed data, `ui-changed` says when it changed, and an element it sits inside may read it.",
  attributes: [...UIT.SourceAttributes],
  events: [
    LOADED,
    {
      name: "ui-changed",
      detail: "{ value: unknown, content: string }",
      description:
        "The data changed:  loaded from `source`, set through `value` or `content`, or its text edited.  `value` is " +
        "`undefined` when the text is empty or isn't JSON."
    },
    SAVING,
    SAVED,
    ERROR
  ],
  slots: [],
  parts: [],
  states: [...UIT.SourceStates],
  texts: []
} as const satisfies E.ComponentVocabulary
