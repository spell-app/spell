/**
 * Every name `<epic-choice-rows>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-choice-rows>`
 * One section's table on a choice page:  its column heads, then its `<epic-choice-row>`s.
 ****************/
export const epicChoiceRowsVocabulary = {
  tag: "epic-choice-rows",
  topics: ["tables", "forms"],
  aka: ["syntax choices", "names table", "rename table", "choices table"],
  skeleton: "8 tall",
  noun: "choice rows",
  ui: false,
  description:
    "One section's table on a choice page (epic `epic-workflow` P12):  the column heads File | Purpose | " +
    "Current | Recommended | Explanation, then its rows, each an `<epic-choice-row>` whose Recommended box you " +
    "type over, with a comment box under it.  Explanation, the rows' notes, only when a row has one.  " +
    "It counts its section's rows on the section's title (`3 to change · 1 stay · 1 changed`).  With `reorder`, " +
    "you put the rows in order too (epic `epic-workflow` P15).  With `blank`, every box starts empty and you type " +
    "only what you'd change (epic `epic-engine` P13).  Under 720px it scrolls inside its own box.",
  attributes: [
    {
      name: "stacked",
      kind: "boolean",
      description: "Current and Recommended in ONE column, Syntax:  today's text over the box (`stacked: true`)."
    },
    {
      name: "no-file",
      kind: "boolean",
      description:
        "No File column (`fileColumn: false`):  for rows whose place in the code doesn't matter to the reader."
    },
    {
      name: "blank",
      kind: "boolean",
      description:
        "Boxes you type into, not recommendations (`blank: true`;  epic `epic-engine` P13, r12):  one first column, " +
        "today's text with an EMPTY box under it, then Purpose.  Blank means no change;  a click on today's text " +
        "copies it into the box.  The count says how many rows and how many you changed."
    },
    {
      name: "noun",
      kind: "string",
      description: 'What `blank`\'s count calls its rows:  `commands` reads "42 commands · 3 changed".  Default `rows`.'
    },
    {
      name: "reorder",
      kind: "boolean",
      description:
        "You put the rows in order (a section's `reorder: true`):  a first column, Order, with each row's place " +
        'and its move up / move down buttons.  The order goes with the draft and "Do it".'
    }
  ],
  events: [],
  slots: [{ name: "", description: "Its rows, `<epic-choice-row>`s, in order." }],
  parts: [
    { name: "base", description: "The box that scrolls sideways when narrow." },
    { name: "table", description: "The grid:  the heads, then the rows." },
    { name: "head", description: "The column heads' row." }
  ],
  states: [],
  texts: [
    { key: "file", text: "File", description: "The File column's head." },
    { key: "purpose", text: "Purpose", description: "The Purpose column's head." },
    { key: "current", text: "Current", description: "The Current column's head." },
    { key: "recommended", text: "Recommended", description: "The Recommended column's head." },
    { key: "syntax", text: "Syntax:  today, then yours", description: "The one column of `stacked`." },
    { key: "order", text: "Order", description: "The Order column's head, with `reorder`." },
    {
      key: "notes",
      text: "Explanation",
      description: "The last column's head, when any row has a `note` (epic `epic-engine` P58)."
    },
    { key: "blankHead", text: "Current, and yours under it", description: "The box's column with `blank`." },
    { key: "rowsNoun", text: "rows", description: "What `blank`'s count calls its rows without a `noun`." },
    {
      key: "countBlank",
      text: "{rows} {noun} · {changed} changed",
      description: "Its section's badge with `blank`:  how many rows, and how many you changed."
    },
    {
      key: "count",
      text: "{renames} to change · {stay} stay",
      description: "Its section's badge:  the rows Claude would change, and those he'd keep."
    },
    {
      key: "countOrdered",
      text: "{rows} in order",
      description: "Its section's badge with `reorder`:  how many rows there are to put in order."
    },
    {
      key: "countMoved",
      text: "{count} · moved",
      description: "Its section's badge with `reorder`, once you moved a row from the order Claude proposed."
    },
    {
      key: "countChanged",
      text: "{count} · {changed} changed",
      description: "Its section's badge, once you changed some."
    }
  ],
  children: [{ tag: "epic-choice-row", description: "Its rows." }]
} as const satisfies EpicVocabulary
