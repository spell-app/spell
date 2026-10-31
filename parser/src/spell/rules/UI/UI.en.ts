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
import { Notify, NOTIFY_KINDS, TOAST_COLORS, TOAST_POSITIONS, TOAST_PROGRESS } from "./Notify"
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

// A toast's kind, for `notify`:  `notify success "Saved!"` means `success`
UI.addRule(Wording.specialize({ ruleName: "notify_kind", meanings: NOTIFY_KINDS }), {
  syntax: "((info:info)|(success:success)|(warning:warning)|(error:error))"
})

// A toast's colour, for `notify ... in red`:  each meaning Spell UI's hue name
UI.addRule(Wording.specialize({ ruleName: "toast_color", meanings: TOAST_COLORS }), {
  syntax:
    "((red:red)|(orange:orange)|(yellow:yellow)|(olive:olive)|(green:green)|(teal:teal)|(blue:blue)" +
    "|(violet:violet)|(purple:purple)|(pink:pink)|(brown:brown)|(grey:grey|gray)|(black:black))"
})

// Where a toast goes, for `notify ... at the top left`:  each meaning Spell UI's `position`, `_` for its space
UI.addRule(Wording.specialize({ ruleName: "toast_position", meanings: TOAST_POSITIONS }), {
  syntax:
    "((top_left:at the top left)|(top_center:at the top center|at the top centre|at the top)" +
    "|(top_right:at the top right)|(centered:in the center|in the centre|in the middle)" +
    "|(bottom_left:at the bottom left)|(bottom_center:at the bottom center|at the bottom centre|at the bottom)" +
    "|(bottom_right:at the bottom right))"
})

// A toast's progress bar, for `notify ... with a progress bar at the top`:  where it goes, `_up` when it fills up
UI.addRule(Wording.specialize({ ruleName: "toast_progress", meanings: TOAST_PROGRESS }), {
  syntax:
    "((top_up:with a progress bar filling up at the top)" +
    "|(bottom_up:with a progress bar filling up|with a progress bar filling up at the bottom)" +
    "|(top:with a progress bar at the top)|(bottom:with a progress bar|with a progress bar at the bottom))"
})

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
  syntax:
    "notify {kind:notify_kind}? {message:expression} (titled {title:expression})?" +
    " (in (inverted:inverted)? {color:toast_color})? {position:toast_position}?" +
    " ((for {time:expression} {units:pause_units})|(untilClicked:until clicked))? {progress:toast_progress}?" +
    " (sideBySide:side by side)? (keepRunning:without pausing)? (with {okButton:text})? (waits:and wait)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`notify "Yo!"`, `core.notify("Yo!")`],
        [`notify "Yo!" with "gotcha"`, `core.notify("Yo!", { button: "gotcha" })`],
        [`notify success "Saved!"`, `core.notify("Saved!", { class: "success" })`],
        [`notify "Hey look!" titled "Better?"`, `core.notify("Hey look!", { title: "Better?" })`],
        [`notify "Colourful" in inverted red`, `core.notify("Colourful", { class: "inverted red" })`],
        [`notify error "Oops" in black`, `core.notify("Oops", { class: "error black" })`],
        [`notify "Here!" at the top left`, `core.notify("Here!", { position: "top left" })`],
        [`notify "Here!" in the center`, `core.notify("Here!", { position: "centered" })`],
        [`notify "Bye" for 5 seconds`, `core.notify("Bye", { time: 5, units: "seconds" })`],
        [`notify "Stay" until clicked`, `core.notify("Stay", { time: 0 })`],
        [`notify "Look" with a progress bar`, `core.notify("Look", { showProgress: "bottom" })`],
        {
          input: `notify "Look" titled "LOOK" with a progress bar filling up at the top`,
          js: [`core.notify("Look", {`, `  title: "LOOK",`, `  showProgress: "top",`, `  progressUp: true`, `})`]
        },
        [
          `notify "Next" at the top left side by side`,
          `core.notify("Next", { position: "top left", horizontal: true })`
        ],
        [
          `notify "Busy" with a progress bar at the top without pausing`,
          `core.notify("Busy", { showProgress: "top", pauseOnHover: false })`
        ],
        [`notify "Gone soon" for 1 second and wait`, `await core.notify("Gone soon", { time: 1, units: "second" })`]
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
        [`warn "Yo!"`, 'core.warn("Yo!")'],
        [`warn "Yo!" with "yep"`, 'core.warn("Yo!", "yep")']
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
