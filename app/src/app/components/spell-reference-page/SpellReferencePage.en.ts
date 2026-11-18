/**
 * Every name `<spell-reference-page>` uses:  tag, attributes, events, parts, texts.
 * Schema:  `E.ComponentVocabulary` (`spell/element`).
 * - Its texts are its labels, in the reader's language;  a person's words are in the file's (epic `data` Q103).
 * - Pure data:  `import type` only, so node can read it (the component pack's catalog, `vite.element.config.ts`).
 */

import type { E } from "spell/element"

/****************
 * ### `<spell-reference-page>`
 * A reference page, made from its source each time:  a place's lists, fields and how trying each went,
 * with a person's words about each, which an option-click makes clearer (epic `data` P53).
 ****************/
export const spellReferencePageVocabulary = {
  tag: "spell-reference-page",
  topics: ["data display"],
  aka: ["reference", "api reference", "place reference", "data source reference"],
  noun: "reference",
  ui: false,
  description:
    "A reference page, made from its source each time it's shown:  a place's lists by tag, each with its fields, " +
    "what it can change and how trying it went, and a person's words about each, kept in the place's Spell file " +
    "as `--` lines.  Every section starts folded.  With `editable`, an option-click on something makes its words " +
    "clearer, saved by the page around it (`spell-reference-edit`).",
  attributes: [
    {
      name: "src",
      kind: "string",
      description:
        "The description of a place, as `spell place ingest` wrote it:  `@spell/examples/StarWars/StarWars.api.json5`.  " +
        "Its words are read from its Spell file beside it, `StarWars.api.spell`."
    },
    {
      name: "editable",
      kind: "boolean",
      description:
        "An option-click on something opens its words to make them clearer;  the page saves them, " +
        "through `spell-reference-edit`."
    }
  ],
  events: [
    {
      name: "spell-reference-edit",
      detail:
        "{ file: string, key: string, words: string, editIn(text: string): { start, end, newText }, " +
        "waitUntil(saving: Promise<string>): void }",
      description:
        "A person changed some words:  the page saves them in `file`, making `editIn(text)` on the file's text, and " +
        "hands the saving to `waitUntil()`, resolving with the file's text once saved.  None does, and nothing's saved:  the element says so."
    }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The whole page:  its line, then its sections." },
    { name: "header", description: "Its line at the top:  its title, what and where it is, its counts." },
    { name: "section", description: "Each `<spell-reference-section>`:  a folded section, a tag's or a list's." },
    { name: "item", description: "Each `<spell-reference-item>`:  a field, or a change a list can make." },
    { name: "state", description: "Each `<spell-reference-state>`:  how trying something went, as a label." },
    { name: "words", description: "A person's words about something." },
    { name: "edit", description: "The box words are made clearer in." }
  ],
  states: [{ name: "editing", description: "Some words are open to be made clearer." }],
  texts: [
    { key: "loading", text: "Reading the place…", description: "While the place's description loads." },
    {
      key: "notFound",
      text:
        "Spell couldn't find a description of a data source at {path}.\n" +
        "Check the address, or run spell place ingest again to read the data source's description.",
      description: "No description at `src`."
    },
    { key: "version", text: "Version {version}", description: "The place's version, on its line." },
    { key: "looked", text: "Looked at {date}", description: "When the place was last looked at." },
    {
      key: "lists",
      text: "Lists",
      description: "How many lists the place has;  the section of a place's lists with no tag."
    },
    { key: "deployments", text: "Where it runs", description: "The section of the servers a project names for it." },
    {
      key: "deploymentsNone",
      text: "Your project names no other server for it, so Spell uses {address}.",
      description: "No deployments listed."
    },
    { key: "notes", text: "Notes", description: "What the last look found worth saying." },
    {
      key: "agentNotes",
      text: "Good to know",
      description: "What the agent that read the place said people should know."
    },
    { key: "verified", text: "Verified", description: "A state:  tried, and it worked." },
    {
      key: "verifiedWhy",
      text: "Spell tested it on the real server, and it answered as its description says.",
      description: "Why it's verified."
    },
    { key: "failed", text: "Failed", description: "A state:  tried, and it didn't work." },
    {
      key: "failedWhy",
      text: "Spell tested it on the real server, and it didn't answer as its description says.",
      description: "Why it failed."
    },
    { key: "untyped", text: "No field types", description: "A state:  its fields don't say what they hold." },
    {
      key: "untypedWhy",
      text:
        "The description doesn't say what kind of information each field holds.\n" +
        "Spell fills this in when it reads the data source.",
      description: "Why it has no field types."
    },
    { key: "disabled", text: "Turned off", description: "A state:  the Spell file turns it off." },
    {
      key: "disabledWhy",
      text: "Your Spell file switches this list off, so it's never tested.\nRemove that line to turn it back on.",
      description: "Why it's turned off."
    },
    { key: "unverified", text: "Not tried yet", description: "A state:  never tried." },
    {
      key: "unverifiedWhy",
      text:
        "Spell knows this list only from the data source's description:  it hasn't been tested on the real server yet.\n" +
        "To test it, run spell place verify in your terminal.",
      description: "Why it's not tried yet."
    },
    { key: "tried", text: "tried {date}", description: "When it was tried." },
    { key: "triedOn", text: "tried on {deployment}, {date}", description: "When and where it was tried." },
    { key: "rows", text: "{count} rows read", description: "What a verified list read." },
    {
      key: "failed401",
      text:
        "The real server asked for a key, the secret code that lets Spell in.\n" +
        "Add it beside this server in your project's __project.json5 file, then try again with spell place verify.",
      description: "A failure:  the server asked for a key."
    },
    {
      key: "failed403",
      text:
        "The real server didn't accept the key, the secret code that lets Spell in.\n" +
        "Check the key in your project's __project.json5 file, then try again with spell place verify.",
      description: "A failure:  the server refused the key."
    },
    {
      key: "failed404",
      text:
        "Spell couldn't find this list on the real server, at the address it was given.\n" +
        "Check the address in the place's description, then try again with spell place verify.",
      description: "A failure:  not there."
    },
    {
      key: "failed5xx",
      text: "Something went wrong on the real server, not in your project.\nWait a few minutes, then try again with spell place verify.",
      description: "A failure:  the server broke."
    },
    {
      key: "failedOther",
      text: "The real server's answer wasn't what Spell expected.\nHover over this line to see what it said.",
      description: "A failure of another kind."
    },
    { key: "listLeftOut", text: "Left out of the Spell:  {why}", description: "A list the Spell leaves out, and why." },
    { key: "changes", text: "What it can change", description: "A list's writes and actions." },
    { key: "fields", text: "Fields", description: "A list's fields." },
    { key: "name", text: "Name", description: "A deployment's name, a column." },
    { key: "address", text: "Address", description: "A deployment's address, a column." },
    { key: "key", text: "Key", description: "A deployment's key, a column." },
    { key: "readOnly", text: "Read only", description: "A deployment that's only read, a column." },
    { key: "yes", text: "yes", description: "A deployment that's only read." },
    { key: "takes", text: "takes {params}", description: "What a change takes." },
    { key: "calledInSpell", text: "called {words} in Spell", description: "A field's name in Spell, when it differs." },
    { key: "isId", text: "says which row is which", description: "A list's id field." },
    { key: "linksTo", text: "links to {target}", description: "A field holding another list's row." },
    { key: "required", text: "required", description: "A field every row must have." },
    { key: "setByServer", text: "set by the server", description: "A field nobody writes." },
    { key: "oneOf", text: "one of {choices}", description: "A field's choices." },
    { key: "leftOut", text: "left out of the Spell", description: "A field the Spell leaves out." },
    { key: "markNew", text: "New since {date}", description: "Something the last look found new." },
    {
      key: "markNewWhy",
      text: "This appeared in the data source when Spell last looked, on {date}.",
      description: "Why it's marked new."
    },
    { key: "markGone", text: "Gone since {date}", description: "Something the last look couldn't find." },
    {
      key: "markGoneWhy",
      text: "This is no longer in the data source (checked {date}).\nYour program still uses it, so it stays here until you remove it from your program.",
      description: "Why it's marked gone."
    },
    {
      key: "editTip",
      text: "Option-click to edit its description",
      description: "The tooltip of something whose words can be edited."
    },
    { key: "editLabel", text: "Description of {name}", description: "The edit box's name, for a screen reader." },
    { key: "save", text: "Save", description: "Saves the words." },
    { key: "cancel", text: "Cancel", description: "Closes the box, keeping the words as they were." },
    { key: "editKeys", text: "Press ⌘-Enter to save, or Esc to cancel.", description: "Under the edit box." },
    {
      key: "notSaved",
      text: "Your text wasn't saved, because this page can only be read.\nTo edit it, open this page from the Data tab in the editor, then try again.",
      description: "Nothing on the page saves words."
    },
    {
      key: "saveFailed",
      text: "Your text wasn't saved.\n{error}",
      description: "Saving the words failed."
    }
  ]
} as const satisfies E.ComponentVocabulary
