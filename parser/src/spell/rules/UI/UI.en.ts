/**
 * The `UI` rules in English:  each rule's syntax and its tests, registered on the `UI` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `UI.<lang>.ts` (epic `spanish`).
 */
import { Wording } from "spell/parser/spell/rules/expressions"

import { UI } from "./UI.parser"
import { Alert } from "./Alert"
import { Confirm } from "./Confirm"
import { CSSStyles } from "./CSSStyles"
import { EndPrintGroup } from "./EndPrintGroup"
import { Notify } from "./Notify"
import { Print } from "./Print"
import { Prompt } from "./Prompt"
import { Warn } from "./Warn"

////////////////
// ## Word rules:  each language's words for one thing, and what each form means (`Wording`)
////////////////

// Which kind of message, for `print`:  `print warning "Yo!"` means `warning`
UI.addRule(
  Wording.specialize({ ruleName: "print_kind", meanings: ["info", "warning", "error", "group", "collapsed_group"] }),
  {
    syntax: "((info:info)|(warning:warning)|(error:error)|(group:group)|(collapsed_group:collapsed group))"
  }
)

////////////////
// ## Statements
////////////////

UI.addRule(Print, {
  syntax: "print {operator:print_kind}? [expressions:{expression} ,]",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`print "Yo!"`, `core.console.log("Yo!")`],
        [`print warning "Yo!"`, `core.console.warn("Yo!")`],
        [`print error "Yo!"`, `core.console.error("Yo!")`],
        [`print group "Yo!"`, `core.console.group("Yo!")`],
        [`print collapsed group "Yo!"`, `core.console.groupCollapsed("Yo!")`]
      ]
    }
  ]
})

UI.addRule(EndPrintGroup, {
  syntax: "end print group",
  tests: [
    {
      compileAs: "statement",
      tests: [[`end print group"`, `core.console.groupEnd()`]]
    }
  ]
})

UI.addRule(Notify, {
  syntax: "notify {message:expression} (with {okButton:text})?", // TODO: "with close" ?
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`notify "Yo!"`, `core.notify("Yo!")`],
        [`notify "Yo!" with "gotcha"`, `core.notify("Yo!", "gotcha")`]
      ]
    }
  ]
})

UI.addRule(Alert, {
  syntax: "alert {message:expression} (with {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`alert "Yo!"`, `await core.alert("Yo!")`],
        [`alert "Yo!" with "yep"`, `await core.alert("Yo!", "yep")`]
      ]
    }
  ]
})

UI.addRule(Warn, {
  syntax: "warn {message:expression} (with {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`warn "Yo!"`, `await core.warn("Yo!")`],
        [`warn "Yo!" with "yep"`, `await core.warn("Yo!", "yep")`]
      ]
    }
  ]
})

UI.addRule(Confirm, {
  syntax: "confirm {message:expression} (with {okButton:text} ((and|or) {cancelButton:text})?)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`confirm "Yo!"`, `await core.confirm("Yo!")`],
        [`confirm "Yo!" with "yep"`, `await core.confirm("Yo!", "yep")`],
        [`confirm "Yo!" with "yep" and "nope"`, `await core.confirm("Yo!", "yep", "nope")`]
      ]
    }
  ]
})

UI.addRule(Prompt, {
  syntax: "prompt {message:expression} (with {defaultValue:expression})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`prompt "Name for the new baby?"`, `await core.prompt("Name for the new baby?")`],
        [`prompt "File name:" with "Untitled"`, `await core.prompt("File name:", "Untitled")`]
      ]
    }
  ]
})

UI.addRule(CSSStyles, {
  tests: [
    {
      title: "correctly matches css",
      tests: [
        [`""`, `core.installStyles(undefined, \`""\`)`],
        [`".Card {\\n\\theight:30px;\\n}\\n"`, `core.installStyles(undefined, \`".Card {\\n\\theight:30px;\\n}\\n"\`)`]
      ]
    }
  ]
})
