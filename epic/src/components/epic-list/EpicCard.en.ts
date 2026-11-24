/**
 * Every name `<epic-card>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-card>`
 * One epic's card on the Epics page:  its state, linked title, saga, star and last-worked day.
 ****************/
export const epicCardVocabulary = {
  tag: "epic-card",
  topics: ["documentation", "cards"],
  aka: ["epic card", "epics list card", "favorite", "star"],
  skeleton: "header, 2 line paragraph",
  noun: "card",
  ui: false,
  description:
    "One epic's card on the Epics page (epic `epic-engine` P3), in an `<epic-list>`:  its state's mark before its " +
    "linked title, its description, its saga's label and meta line;  a star at its top right that stars or unstars " +
    "it on the page server, a `...` menu at its top right (Resume, Rename Epic..., Complete, Delete Epic...), and the " +
    "day it was last worked on at its bottom right.  Written by `epic pages index` " +
    "(`spell/epic/list/EpicCards` `epicCardHtml()`), its facts as attributes;  the page server marks it `running` " +
    "and `favorite` as it serves the page.",
  attributes: [
    {
      name: "epic",
      kind: "string",
      required: true,
      format: "epic name",
      description: "The epic's name, its folder in `epics/`:  `airplane`."
    },
    {
      name: "phases",
      kind: "string",
      description: "Its phases' statuses, in order, space-separated:  `done done active todo`.  None:  no phases yet."
    },
    {
      name: "updated",
      kind: "string",
      format: "date",
      description: "Its epic page's `updated` day:  how long since anyone worked on it (paused after 3 days)."
    },
    {
      name: "urgent",
      kind: "string",
      format: "ids",
      description: "The ids of its items that need you (red and orange chips), space-separated:  `q3 j12`."
    },
    { name: "future", kind: "boolean", description: "Written down with `/epic future`, not planned yet." },
    { name: "standing", kind: "boolean", description: "Open for good:  every phase done is NOT done." },
    {
      name: "running",
      kind: "boolean",
      description: "A Claude session is running for it:  in progress, never paused.  The page server's to set."
    },
    {
      name: "active",
      kind: "string",
      description: "The phase under way, as its mark's tooltip says it:  `P8 · Review Polish`."
    },
    {
      name: "worked",
      kind: "string",
      format: "time",
      description: "When it was last worked on, local ISO:  `2026-10-09T14:34-04:00`.  Drawn as `10/9`."
    },
    {
      name: "saga",
      kind: "string",
      format: "saga id",
      description: "The saga it serves:  `drawable-spell`.  Its label, and the list's saga chips, go by it."
    },
    { name: "saga-title", kind: "string", description: "The saga's title, its label's words:  `Drawable Spell`." },
    { name: "saga-purpose", kind: "string", description: "The saga's purpose, its label's tooltip." },
    { name: "favorite", kind: "boolean", description: "Starred:  its list shows it under Favorites, and only there." },
    {
      name: "away",
      kind: "boolean",
      description:
        'Its epic page has "0. While you were out" to read (epic `epic-engine` P62):  a red mark under its title links it.'
    }
  ],
  events: [
    {
      name: "epic-starred",
      detail: "{ epic: string, favorite: boolean, favorites: string[] }",
      description:
        "The page server starred (`favorite`) or unstarred it;  `favorites`:  every starred epic, as it answered.  " +
        "Its `<epic-list>` sets every card's star by it."
    }
  ],
  slots: [
    { name: "", description: "Its title:  a link to its epic page, `<a href>`." },
    { name: "description", description: "What the epic is, one line:  its page's description." },
    { name: "meta", description: "The meta line:  the phase under way and its page's path." }
  ],
  parts: [
    { name: "base", description: "The card, a `<ui-card>`." },
    { name: "mark", description: "Its state's mark before the title:  `3/6` in progress, or the state's icon." },
    { name: "saga", description: "Its saga's label, a `<ui-label>`." },
    { name: "away", description: '`away`:  the "While you were out" mark, a `<ui-label>` linking the section.' },
    { name: "star", description: "The star, left of its menu, a `<ui-button>`." },
    {
      name: "menu",
      description:
        "The `...` menu at its top right, a `<ui-dropdown>`:  Resume, Rename Epic..., Complete, Delete Epic..."
    },
    { name: "worked", description: "The day it was last worked on, at its bottom right, a `<time>`." }
  ],
  states: [],
  texts: [
    { key: "planning", text: "planning", description: "In progress with no phases yet:  the mark's words." },
    { key: "away", text: "While you were out", description: "`away`:  the mark's words." },
    { key: "star", text: "Star {epic}", description: "The star's name, not starred." },
    { key: "unstar", text: "Unstar {epic}", description: "The star's name, starred." },
    {
      key: "starTip",
      text: "Star:  list it under Favorites",
      description: "The star's tooltip, not starred."
    },
    {
      key: "unstarTip",
      text: "Unstar",
      description: "The star's tooltip, starred."
    },
    {
      key: "offline",
      text: "Needs the page server",
      description: "The star's and the `...` menu's tooltip where they can't act:  opened from disk, or no write token."
    },
    { key: "menu", text: "More for {epic}", description: "The `...` menu's name and tooltip." },
    { key: "resume", text: "Resume", description: "Menu:  its session, in its own VS Code window." },
    { key: "rename", text: "Rename Epic…", description: "Menu:  a new name." },
    { key: "complete", text: "Complete", description: "Menu:  mark it done." },
    { key: "delete", text: "Delete Epic…", description: "Menu:  delete its folder." },
    { key: "resumed", text: "Opening {epic} in its own VS Code window.", description: "A toast:  Resume asked." },
    { key: "renameTitle", text: "Rename {epic}", description: "Rename's dialog:  its heading." },
    {
      key: "renameAsk",
      text: "Type a new name for this epic.\nUse lowercase letters, numbers and dashes, like my-epic.",
      description: "Rename's dialog:  its message, over the name box."
    },
    { key: "renameOk", text: "Rename", description: "Rename's dialog:  its OK button." },
    { key: "renamed", text: "Renamed {epic} to {to}.", description: "A toast:  renamed." },
    { key: "cantRename", text: "You can't rename {epic} yet", description: "A dialog:  Rename refused first." },
    { key: "cantDelete", text: "You can't delete {epic} yet", description: "A dialog:  Delete refused first." },
    {
      key: "isHome",
      text: "Requests about how you work go to {epic}, so it can't be deleted.",
      description: "Delete refused:  it's the tooling home."
    },
    {
      key: "completeTitle",
      text: "Mark the epic {epic} as complete?",
      description: "Complete's dialog:  its heading."
    },
    {
      key: "completeAsk",
      text: "This marks {epic} as done.",
      description: "Complete's dialog:  its first line."
    },
    {
      key: "completePhase",
      text: "Claude won't build its 1 unfinished phase:  it will be skipped.",
      description: "Complete's dialog:  one phase left."
    },
    {
      key: "completePhases",
      text: "Claude won't build its {count} unfinished phases:  they will be skipped.",
      description: "Complete's dialog:  the phases left, when there are several."
    },
    {
      key: "completeItem",
      text: "Its 1 question waiting for you will be closed unanswered.",
      description: "Complete's dialog:  one item waiting on the person."
    },
    {
      key: "completeItems",
      text: "Its {count} questions waiting for you will be closed unanswered.",
      description: "Complete's dialog:  the items waiting on the person, when there are several."
    },
    { key: "completeOk", text: "Complete", description: "Complete's dialog:  its OK button." },
    { key: "cantComplete", text: "{epic} can't be completed", description: "A dialog:  Complete refused first." },
    {
      key: "noPhases",
      text: "It has no phases yet, so there's nothing to finish.  You can delete it instead.",
      description: "Complete refused:  no phases."
    },
    { key: "completed", text: "{epic} is complete.", description: "A toast:  completed." },
    { key: "deleteTitle", text: "Delete the epic {epic}?", description: "Delete's dialog:  its heading." },
    {
      key: "deleteAsk",
      text: "This deletes {epic}'s plan and its notes.\nIf you change your mind, ask Claude to bring {epic} back.",
      description: "Delete's dialog:  its message."
    },
    { key: "deleteOk", text: "Delete", description: "Delete's dialog:  its OK button, red." },
    { key: "deleted", text: "Deleted {epic}.", description: "A toast:  deleted." },
    { key: "ok", text: "OK", description: "A refusal's dialog:  its one button." },
    { key: "cancel", text: "Cancel", description: "A dialog's Cancel button." },
    { key: "resumeFailed", text: "Couldn't open {epic}:\n{error}", description: "A toast:  Resume failed." },
    { key: "renameFailed", text: "Couldn't rename {epic}:\n{error}", description: "A toast:  Rename failed." },
    { key: "completeFailed", text: "Couldn't complete {epic}:\n{error}", description: "A toast:  Complete failed." },
    { key: "deleteFailed", text: "Couldn't delete {epic}:\n{error}", description: "A toast:  Delete failed." },
    { key: "starFailed", text: "Couldn't star {epic}:  {error}", description: "A toast:  the server refused." },
    { key: "unstarFailed", text: "Couldn't unstar {epic}:  {error}", description: "A toast:  the server refused." }
  ],
  children: [
    { tag: "flow", description: "Its title link, `<a href>`." },
    { tag: "flow", slot: "description", description: 'Its description, `<span slot="description">`.' },
    { tag: "flow", slot: "meta", description: 'Its meta line, `<span slot="meta">`.' }
  ]
} as const satisfies EpicVocabulary
