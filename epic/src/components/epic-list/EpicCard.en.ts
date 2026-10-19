/**
 * Every name `<epic-card>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell dev pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "$/epics/definitions"

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
    "it on the page server, and the day it was last worked on at its bottom right.  Written by `epic pages index` " +
    "(`$/epics/list/EpicCards` `epicCardHtml()`), its facts as attributes;  the page server marks it `running` " +
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
      description: "The ids of its items that need Owen (red and orange chips), space-separated:  `q3 j12`."
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
    { name: "favorite", kind: "boolean", description: "Starred:  its list shows it under Favorites, and only there." }
  ],
  events: [
    {
      name: "epic-favorite",
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
    { name: "star", description: "The star at its top right, a `<ui-button>`." },
    { name: "worked", description: "The day it was last worked on, at its bottom right, a `<time>`." }
  ],
  states: [],
  texts: [
    { key: "planning", text: "planning", description: "In progress with no phases yet:  the mark's words." },
    { key: "star", text: "Star {epic}", description: "The star's name, not starred." },
    { key: "unstar", text: "Unstar {epic}", description: "The star's name, starred." },
    {
      key: "starTip",
      text: "Star it:  listed first, under Favorites",
      description: "The star's tooltip, not starred."
    },
    {
      key: "unstarTip",
      text: "A favorite:  listed first.  Click to unstar",
      description: "The star's tooltip, starred."
    },
    {
      key: "starOffline",
      text: "Starring needs the epic server (epic hub ensure)",
      description: "The star's tooltip where it can't star:  opened from disk, or no write token."
    },
    { key: "worked", text: "Last worked on {date}", description: "The day's tooltip:  the full date and time." },
    { key: "starFailed", text: "Couldn't star {epic}:  {error}", description: "A toast:  the server refused." },
    { key: "unstarFailed", text: "Couldn't unstar {epic}:  {error}", description: "A toast:  the server refused." }
  ],
  children: [
    { tag: "flow", description: "Its title link, `<a href>`." },
    { tag: "flow", slot: "description", description: "Its description, `<span slot=\"description\">`." },
    { tag: "flow", slot: "meta", description: "Its meta line, `<span slot=\"meta\">`." }
  ]
} as const satisfies EpicVocabulary
