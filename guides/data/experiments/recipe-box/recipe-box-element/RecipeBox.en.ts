/**
 * The vocabulary of `<recipe-box>`, the data epic's demo:  every name the tag uses.
 * - A GUIDE-ONLY element (`guides/data/experiments/recipe-box/`):  not part of Spell UI, its site or its bundles.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `recipeBoxVocabulary`
 * The names of `<recipe-box>`:  recipes kept in a place, added to and changed on the page.
 ****************/
export const recipeBoxVocabulary = {
  tag: "recipe-box",
  topics: ["data", "lists"],
  aka: ["recipes"],
  noun: "recipe box",
  description: "Recipes kept on a server, added to and changed right here.",
  attributes: [
    {
      name: "back-end",
      kind: "string",
      default: "rest",
      description:
        "Which back-end keeps them:  `rest`, `graphql`, `folder`, `room`, `sheet`, `sheet-no-id`, `device`, `google-sheet`, `atmosphere` or `atmosphere-real`.  The page's address can say too:  `?back-end=graphql`."
    },
    {
      name: "sheet",
      kind: "string",
      description:
        "The address of the CSV file `sheet` reads;  default `recipes.csv`, beside the page.  The page's address can say too:  `?sheet=...`."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "box", description: "The whole box." },
    { name: "recipe", description: "One recipe." },
    { name: "none", description: "What's said when there are no recipes." },
    { name: "note", description: "What the read said about its rows." },
    { name: "connection", description: "In a room:  whether it's connected, and its last heal." },
    { name: "sample", description: "The switch between a sample and the real place." },
    { name: "using-sample", description: "What's said while a sample is in use." },
    { name: "sign-in", description: "On a place where each person is someone:  who's signed in, and the way in and out." }
  ],
  states: [],
  texts: [
    { key: "no-recipes", text: "No recipes here yet.", description: "A read answered, with nothing in it." },
    { key: "sign-in-signed-out", text: "You aren't signed in, so you can read these, and not change them.", description: "Nobody's signed in." },
    { key: "sign-in-signing-in", text: "Signing in…", description: "On the way." },
    { key: "sign-in-signed-in", text: "Signed in as {name}.", description: "Someone's signed in." },
    {
      key: "sign-in-ended",
      text: "Your sign-in has ended:  they last two weeks at most.  Sign in again, and what you changed goes through.",
      description: "A sign-in ran out."
    },
    { key: "sign-in-failed", text: "That didn't sign you in:  {why}", description: "Signing in didn't work." },
    { key: "sign-in-who", text: "Your handle", description: "The field for who they are." },
    { key: "sign-in", text: "Sign in", description: "Signs in." },
    { key: "sign-out", text: "Sign out", description: "Signs out." },
    { key: "use-sample", text: "Use a sample", description: "Swaps in editable records, for the real place." },
    { key: "use-real", text: "Use the real place", description: "Puts the real place back." },
    {
      key: "using-sample",
      text: "Using a sample.  What you change stays in this browser, and never reaches {backEnd}.",
      description: "A sample is in use."
    },
    { key: "up", text: "Up", description: "Moves a recipe up the list, in a place that keeps an order." },
    { key: "down", text: "Down", description: "Moves a recipe down the list, in a place that keeps an order." },
    {
      key: "one-more",
      text: "One more serving",
      description: "Adds 1 to its servings, as an addition, in a room."
    },
    { key: "online", text: "Connected to the room.", description: "The room's connection is up." },
    {
      key: "offline",
      text: "Not connected:  what you change is kept here, and goes when it's back.",
      description: "The room's connection is down."
    },
    { key: "go-offline", text: "Go offline", description: "Stops talking to the room, for trying it." },
    { key: "go-online", text: "Back online", description: "Starts talking to the room again." },
    { key: "healed", text: "Last healed by {why}, in {ms} ms.", description: "How the room's last heal went." },
    {
      key: "lost",
      text: "Someone else changed {field} at the same time, and theirs stands.  Yours was:  {mine}",
      description: "Long text of yours replaced."
    },
    { key: "use-mine", text: "Use mine", description: "Puts yours back." },
    {
      key: "deleted",
      text: "Someone else deleted {title} while you were changing it.",
      description: "What you were changing is gone."
    },
    { key: "restore", text: "Restore", description: "Makes it again, with your changes." },
    { key: "title", text: "Title", description: "A recipe's title." },
    { key: "servings", text: "Servings", description: "How many it serves." },
    { key: "notes", text: "Notes", description: "A recipe's notes." },
    { key: "new-title", text: "A new recipe's title", description: "The box to name a new recipe in." },
    { key: "add", text: "Add recipe", description: "Adds the new recipe." },
    { key: "remove", text: "Remove", description: "Removes a recipe." },
    { key: "stored-in", text: "Kept in {backEnd}.", description: "Which server it's reading." },
    { key: "use-theirs", text: "Use theirs", description: "Puts their value back." },
    { key: "retry", text: "Retry", description: "Tries a refused change again." },
    { key: "dismiss", text: "Dismiss", description: "Closes a notice." },
    { key: "read-only", text: "Read only", description: "This place takes no changes." },
    { key: "serves", text: "Serves {servings}", description: "How many a recipe to read serves." },
    { key: "cant-read", text: "Can't read it:  {why}", description: "A read failed, and the place said why." },
    {
      key: "merged",
      text: "{field} also changed elsewhere.  Yours was kept;  theirs was:  {theirs}",
      description: "A merge kept this person's value."
    },
    { key: "refused", text: "Couldn't save your change:  {why}", description: "The server said no." },
    {
      key: "no-server",
      text: "Can't reach the recipe servers.  Start them:  yarn tsx scripts/recipe-servers.ts",
      description: "They aren't running."
    }
  ]
} as const satisfies E.ComponentVocabulary
