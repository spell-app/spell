/**
 * The vocabulary of `<recipe-servers-bar>`:  every name the tag uses.
 * - A GUIDE-ONLY element (`guides/data/experiments/recipe-box/`):  not part of Spell UI, its site or its bundles.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `recipeServersBarVocabulary`
 * The names of `<recipe-servers-bar>`:  whether the demo's servers are running, with what starts and stops them.
 ****************/
export const recipeServersBarVocabulary = {
  tag: "recipe-servers-bar",
  topics: ["data"],
  aka: ["recipe servers"],
  noun: "recipe servers bar",
  description: "Whether the recipe box demo's servers are running, and buttons to start, stop and restart them.",
  attributes: [],
  events: [],
  slots: [],
  parts: [{ name: "status", description: "What it says about them." }],
  states: [],
  texts: [
    { key: "checking", text: "Looking for the recipe servers…", description: "Before the first answer." },
    { key: "running", text: "The recipe servers are running.", description: "They answer." },
    {
      key: "running-from",
      text: "The recipe servers are running, from {folder}.",
      description: "They answer, and were started from another checkout than this page server's."
    },
    { key: "stopped", text: "The recipe servers are stopped.", description: "Nothing's on their port." },
    {
      key: "taken",
      text: "Port {port} is taken by another process, not the recipe servers.  Free it, and press Start.",
      description: "Something else holds their port."
    },
    {
      key: "needs-restart",
      text: "These buttons need a page server restart:  this one was started before they existed.  Until then, at the kit's root:  yarn tsx scripts/recipe-servers.ts",
      description: "The page server has no such route yet."
    },
    { key: "start", text: "Start", description: "Starts them." },
    { key: "stop", text: "Stop", description: "Stops them." },
    { key: "restart", text: "Restart", description: "Stops them, and starts them with the first recipes." },
    {
      key: "start-title",
      text: "Start them, from this page server's checkout:  {checkout}",
      description: "What Start does."
    },
    {
      key: "stop-title",
      text: "Stop them.  The recipes stay, for the next start.",
      description: "What Stop does."
    },
    {
      key: "restart-title",
      text: "Start again with the first recipes:  what's been changed in the CSV file and the folder is lost.",
      description: "What Restart does."
    },
    {
      key: "where",
      text: "CSV file:  {csvFile}.  Folder:  {folder}.",
      description: "Where the recipes are, to open in VS Code."
    }
  ]
} as const satisfies E.ComponentVocabulary
