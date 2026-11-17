//
//  ## Shared types for the app's dialogs:  `editor.alert()` / `confirm()` / `prompt()` / `promptForNumber()` /
//  `choose()`, and the `Actions` that show them (`DialogActionProps<AlertModalProps>` ...).
//
//  NOTE: TEXT only, no JSX:  `spell-ui`'s `UI.modals` sets every string as text.  The React modals took
//  `ReactNode`s and `SUI.ButtonProps`;  no caller passed anything but strings.
//  NOTE: no index signature:  extra keys used to pass through to `SUI.Modal`;  nothing takes them now.
//

////////////////
// ## Dialog props
////////////////

/** Props for `editor.alert()`:  a message and one OK button. */
export type AlertModalProps = {
  /** Message to show. */
  message: string
  /** Header for the dialog.  Default:  none (the message names the dialog). */
  header?: string
  /** OK button text.  Default:  `UI.i18n`'s `ok` ("OK"). */
  ok?: string
  /** OK throws something away:  its button is red (`negative`), not the primary colour. */
  danger?: boolean
}

/** Props for `editor.confirm()`:  as `alert()`'s, plus a Cancel button. */
export type ConfirmModalProps = AlertModalProps & {
  /** Cancel button text.  Default:  `UI.i18n`'s `cancel` ("Cancel"). */
  cancel?: string
}

/** Props for `editor.prompt()` / `promptForNumber()`:  as `confirm()`'s, plus one input field. */
export type PromptModalProps = ConfirmModalProps & {
  /** Start value for the field.  Default `""`. */
  defaultValue?: string
  /** `<input type>`, e.g. `"number"`.  Default `"text"`. */
  type?: string
  /**
   * More `<input>` attributes, e.g. `{ min: 10, max: 100, step: 1, placeholder: "10 to 100" }`.
   * - Strings, numbers and booleans only:  each becomes an ATTRIBUTE (`true` ~== present, `false` / `null` absent).
   * - The field's validity gates OK:  `min` / `max` / `required` / `pattern` keep the dialog open until it's valid.
   */
  inputProps?: Record<string, string | number | boolean | null | undefined>
}

/** Props for `editor.choose()`:  pick one (or several) of `options`. */
export type ChooserModalProps = ConfirmModalProps & {
  /**
   * What to choose from, as any of:
   * - array of primitive values:  each is its own text
   * - array of `{ value, text }`
   * - map of `{ value: text }`
   */
  options: ChooserOptionInput[] | Record<string, string>
  /** Chosen at first:  a value, or (with `multiple`) an array of values. */
  defaultValue?: unknown
  /** Choose any number of values (checkboxes);  default one (radios). */
  multiple?: boolean
}

/**
 * Props for `editor.askWithChoices()`:  a question with a button per answer, in a row (epic `mockup` T52),
 * when OK and Cancel aren't enough.
 * - Escape, or the close, answers none:  `undefined`.
 */
export type ChoicesModalProps<Value extends string = string> = {
  /** Message to show. */
  message: string
  /** Header for the dialog.  Default:  none (the message names the dialog). */
  header?: string
  /** The answers, a button each, left to right:  the last is the one Enter presses. */
  choices: ModalChoice<Value>[]
}

/** One answer of `ChoicesModalProps`:  a button. */
export type ModalChoice<Value extends string = string> = {
  /** what choosing it answers */
  value: Value
  /** its button's text */
  text: string
  /** its button's `color`:  `primary` for the one most people want, `negative` for one that throws something away */
  color?: "primary" | "negative"
}

////////////////
// ## `<Chooser>` options
////////////////

/** One `options` entry as callers may pass it -- before `<Chooser>` normalizes it. */
export type ChooserOptionInput = string | number | ChooserOptionObject

/** One `options` entry given as an object. */
export type ChooserOptionObject = {
  /** Value resolved when this option is chosen. */
  value?: unknown
  /** Label shown for this option.  Default:  `String(value)`. */
  text?: string
  /** Unique key.  Default:  its index. */
  key?: string | number
}

/** One `options` entry as `<Chooser>` draws it. */
export type ChooserOption = {
  /** Unique key, its index unless given:  the radio / checkbox `value`. */
  key: string
  /** Label shown. */
  text: string
  /** Value resolved when chosen:  the caller's own, so a number stays a number. */
  value: unknown
}

////////////////
// ## Versions
////////////////

/** What `openVersions()` shows, and what its buttons do:  the editor's (`editor.showVersions()`). */
export type VersionsBoxProps = {
  /** the project's versions, newest first */
  versions: VersionRow[]
  /** the version chosen at first:  its `name` */
  chosen?: string
  /** Show Save Current Changes:  you have a draft, or edits not saved. */
  canKeep: boolean
  /** Restore:  `name` becomes your draft.  NEVER throws:  it shows what went wrong. */
  restore: (name: string) => Promise<void>
  /** Save Current Changes:  keep your draft as an entry, then the list again;  throws after showing what went wrong. */
  keep: () => Promise<VersionRow[]>
}

/** One row of Versions. */
export type VersionRow = {
  /** its file's name on the server, `Solitaire.2026-11-03-091502.zip`:  what Restore restores */
  name: string
  /** when it was kept, in the page's language;  a draft you kept says so */
  when: string
}
