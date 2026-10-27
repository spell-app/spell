/**
 * The English vocabulary of `<ui-docs-theme-bench>`:  every name the tag uses.
 * - Its tag, parts and texts.  The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A DOC-ONLY element (`src/docs-components/`):  filed under the `documentation` topic,
 *   left out of the component list, and loaded by `<ui-root>` like any family.
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `docsThemeBenchVocabulary`
 * The names of `<ui-docs-theme-bench>`:  the theme editor full width, previewing Spell's real pages
 * (the editor, an epic page, Spell UI's docs, a notebook).
 ****************/
export const docsThemeBenchVocabulary = {
  tag: "ui-docs-theme-bench",
  topics: ["documentation", "forms", "views"],
  aka: ["theme bench", "theme workbench", "look tuner", "token tuner", "theme playground", "design tokens"],
  skeleton: "40 tall",
  noun: "theme bench",
  description:
    "A theme bench shows the theme editor full width, previewing Spell's real pages side by side in the theme being " +
    "made:  the editor, an epic page, Spell UI's docs and a notebook.",
  attributes: [],
  events: [],
  slots: [],
  parts: [{ name: "editor", description: "The theme editor it shows (`<ui-theme-editor>`)." }],
  states: [],
  texts: [
    { key: "epic", text: "Epic page", description: "The epic page's title." },
    { key: "ui", text: "Spell UI", description: "Spell UI's docs page's title." },
    { key: "notebook", text: "Notebook", description: "The notebook's title." },
    { key: "editor", text: "Editor", description: "The editor's title." },
    {
      key: "noEditor",
      text: "The editor isn't running:  it starts with the page server.",
      description: "Shown in an editor page's frame when the editor app can't be reached."
    }
  ]
} as const satisfies E.ComponentVocabulary
