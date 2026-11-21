/**
 * The language server's words, in English:
 * the labels around what a hover, a completion or the Template Explorer shows (epic `spanish` P13).
 * - Read through `LspTexts.of(scope).text(key, params)` (`LspTexts.ts`):
 *   the PROJECT's language, not the editor's -- a Spanish program reads Spanish in an English editor.
 * - `{name}` is a placeholder, filled from the params.
 * - Spell's own words (rule names, syntax, types, members) come from the program and its language pack, not here.
 * - Other languages:  `LspTexts.<lang>.ts` beside it, with every key (its type says so).
 */
export const LSP_TEXTS = {
  ////////////////
  // ## Hover (`SpellLanguageService.hover()`)
  ////////////////

  readsAs: "Reads as",
  waits: "It takes time:  whatever calls it waits for it to finish.",
  forExample: "e.g.",
  builtIn: "built in:  **{words}** of {type}",
  variable: "variable",
  as: "as",
  alias: "alias",
  type: "template",
  isA: " is a {superType}",
  stub: "(stub)",
  properties: "properties",
  enumerations: "enumerations",
  constant: "constant",
  method: "action",
  function: "function",
  matches: "matches",
  or: "or",
  compilesTo: "compiles to",
  property: "property",
  ofType: " of {type}",
  aDatatype: "a {datatype}",
  autoDeclared: "declared where it's first set",
  exclusive: "the {datatype} holding it, read-only:  it belongs to one at a time",
  declaredIn: "declared in {where}",

  ////////////////
  // ## Completion (`SpellLanguageService.completion()`)
  ////////////////

  statement: "statement",
  next: "next",
  spellWordFor: "spell's word for <{tag}>",
  actionTag: 'a button for one of the program\'s actions:  <action "auto play" />',
  contextMenuTag: "the right-click menu of the element it's in",
  dividerTag: "a line between a context menu's groups",
  actionOf: "action of {type}",
  componentTag: "a component",
  attributeOf: "attribute of <{tag}>",
  appAction: "the app's own action",
  typeNamed: "template {name}",
  propertyOf: "property of {types}",

  ////////////////
  // ## Quick fixes (`SpellLanguageService.codeActions()`)
  ////////////////

  define: "Define `{signature}`",

  // an attribute's value switched between text and code (`LSP.CodeOrText`, epic `editor` T74)
  makeItCode: "Make it code",
  makeItText: "Make it text",

  // a note after a line's code, `// ...`, moved to the line under it, `-- ...` (`SP.LineEndComments`, epic `language` T166)
  moveLineEndNote: 'Move the note below, changing "//" to "--"',

  // Spell's old forms, rewritten the new way (`SP.OldForms`, epic `language` P68):  one, or every one in the file
  changeOldForm: 'Change "{written}" to "{replacement}"',
  takeOutOldForm: 'Take out "{written}"',
  upgradeFile: "Upgrade this file to Spell {version}",
  // the link on an old form's hover, in VS Code:  its fix, in one click (Owen's C3)
  fixIt: "Fix it",
  // the notice as a project written for an older Spell opens, and after it's upgraded (`SpellLanguageServer.offerUpgrade()`)
  upgradeNotice:
    "This project was written for an older version of Spell.  Some of its lines use old wording, which still works for now.  Upgrade it to change those lines to the new wording.",
  upgrade: "Upgrade",
  upgraded:
    "Your project is up to date with Spell {version}.  {count} lines used old wording, and now use the new wording instead.  They still do the same thing, so there's nothing else to do.",
  upgradedOne:
    "Your project is up to date with Spell {version}.  1 line used old wording, and now uses the new wording instead.  It still does the same thing, so there's nothing else to do.",

  // a read of a place's field marked gone, changed to its likely new name (`SP.PlaceFieldMarks`, epic `language` P68)
  changeToNewField: 'Change to "{name}"',

  ////////////////
  // ## The Template Explorer's tree (`ScopeExplorer`)
  ////////////////

  imported: "imported",
  notParsed: "not parsed",
  typeIsA: "is a {superType}",

  ////////////////
  // ## Picking a value (epic `editor` T61)
  ////////////////

  pickColor: "Pick a color…",
  pickIcon: "Pick an icon…",
  pickSound: "Pick a sound…",
  builtInSound: "a built-in sound"
} as const

/** Key of one of the language server's texts, e.g. `"declaredIn"`. */
export type LspTextKey = keyof typeof LSP_TEXTS

/** One language's language-server texts:  EVERY key, so a missing translation is a type error. */
export type LspTextPack = Readonly<Record<LspTextKey, string>>
