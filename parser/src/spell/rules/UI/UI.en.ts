/**
 * The `UI` rules in English:  each rule's syntax and its tests, registered on the `UI` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `UI.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

import { UI } from "./UI.parser"
import { Alert } from "./Alert"
import { AnswerWord } from "./AnswerWord"
import { Confirm } from "./Confirm"
import { CSSStyles } from "./CSSStyles"
import { UIDefaults } from "./UIDefaults"
import { EndPrintGroup } from "./EndPrintGroup"
import { Notify, NOTIFY_KINDS, TOAST_COLORS, TOAST_POSITIONS, TOAST_PROGRESS } from "./Notify"
import { Print } from "./Print"
import { ScrollToTop } from "./ScrollToTop"
import { OpenPrinting } from "./OpenPrinting"
import { ShowDatesAs } from "./ShowDatesAs"
import { ShowDrawn, ShowDrawnWith } from "./ShowDrawn"
import { TheResult } from "./TheResult"
import { WithoutClosing } from "./WithoutClosing"
import { PlaySound, MEDIA_PLACES } from "./PlaySound"
import { StopSound } from "./StopSound"
import { LoadSound } from "./LoadSound"
import { DefineMedia } from "./DefineMedia"
import { MediaCall } from "./MediaCall"
import { MediaIs } from "./MediaIs"
import { MediaLength } from "./MediaLength"
import { MediaNamed } from "./MediaNamed"
import { MediaNameWords } from "./MediaNameWords"
import { MediaSpeed } from "./MediaSpeed"
import { MediaTime } from "./MediaTime"
import { MediaVolume } from "./MediaVolume"
import { StopAllMedia } from "./StopAllMedia"
import { Prompt } from "./Prompt"
import { MEDIA_KINDS, TEXT_SIZES } from "./UI.shared"
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

// A dialog's text size, for `alert ... in big text`:  each meaning Spell UI's size word
UI.addRule(Wording.specialize({ ruleName: "text_size", meanings: TEXT_SIZES }), {
  syntax: "((small:small)|(big:big)|(huge:huge))"
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

// How the program shows its dates (HyperTalk's short, long and abbreviated)
UI.addRule(
  Wording.specialize({
    ruleName: "shown_dates",
    meanings: ["short", "long", "abbreviated", "date_and_time", "timestamp", "plain", "reader"]
  }),
  {
    syntax:
      "((short:short dates)|(long:long dates)|(abbreviated:(abbreviated|abbrev|abbr) dates)|(date_and_time:dates and times)|(timestamp:timestamps)|(plain:plain dates)|(reader:the reader's))"
  }
)
UI.addRule(ShowDatesAs, {
  syntax: "dates are shown as {style:shown_dates}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["dates are shown as short dates", 'core.showDatesAs("short")'],
        ["dates are shown as dates and times", 'core.showDatesAs("date and time")'],
        ["dates are shown as the reader's", 'core.showDatesAs("reader")']
      ]
    }
  ]
})

UI.addRule(ScrollToTop, {
  syntax: "scroll to the top",
  tests: [{ compileAs: "statement", tests: [["scroll to the top", "core.scrollToTop()"]] }]
})

UI.addRule(ShowDrawn, {
  syntax: "(show|(hide:hide)) {name:text}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`show "you won"`, `await core.showDrawn("you won")`],
        [`hide "you won"`, `core.hideDrawn("you won")`]
      ]
    }
  ]
})

UI.addRule(ShowDrawnWith, {
  syntax: "show {name:text} with {thing:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        ;(scope as P.RootScope).variables.add("card")
      },
      tests: [[`show "edit card" with card`, [`const it = card`, `await core.showDrawn("edit card", it)`]]]
    }
  ]
})

UI.addRule(WithoutClosing, {
  syntax: "{call:statement} without closing",
  tests: [{ compileAs: "statement", tests: [[`print 1 without closing`, ["core.keepOpen()", "core.console.log(1)"]]] }]
})

UI.addRule(WithoutClosing, {
  syntax: "{call:statement} without closing the modal",
  tests: [
    {
      compileAs: "statement",
      tests: [[`print 1 without closing the modal`, ["core.keepOpen()", "core.console.log(1)"]]]
    }
  ]
})

UI.addRule(TheResult, {
  syntax: "the result",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`the result`, `core.result()`],
        [`the result is ok`, `(core.resultIs("ok"))`],
        [`the result is not cancel`, `(!core.resultIs("cancel"))`],
        [`the result is "Save the Thing"`, `(core.resultIs("Save the Thing"))`],
        [`the result is discard`, `(core.resultIs("discard"))`]
      ]
    }
  ]
})

UI.addRule(AnswerWord, {
  roles: { match: "written value" },
  tests: [{ compileAs: "expression", tests: [[`the result is not discard`, `(!core.resultIs("discard"))`]] }]
})

UI.addRule(OpenPrinting, {
  syntax: "open printing",
  tests: [{ compileAs: "statement", tests: [["open printing", "core.openPrinting()"]] }]
})

////////////////
// ## Sounds and videos (epic `data` T145;  named, played many ways, and asked about, epic `language` P65)
////////////////

// What a program plays:  `sound`, and `video`, the same as `movie`
UI.addRule(Wording.specialize({ ruleName: "media_kind", meanings: MEDIA_KINDS }), {
  syntax: "((sound:sound)|(video:video|movie))"
})
// ... and several:  `stop all sounds`
UI.addRule(Wording.specialize({ ruleName: "media_kinds", meanings: MEDIA_KINDS }), {
  syntax: "((sound:sounds)|(video:videos|movies))"
})
// How fast, in words:  `at half speed`
UI.addRule(Wording.specialize({ ruleName: "media_speed_word", meanings: ["half", "normal", "double"] }), {
  syntax: "((half:half speed)|(normal:normal speed)|(double:double speed|twice the speed))"
})
// Starting again each time it ends:  `over and over`
UI.addRule(Wording.specialize({ ruleName: "media_loop", meanings: ["loop"] }), {
  syntax: "((loop:over and over|looping))"
})
// Where a video plays:  `in a new window`, `full screen`
UI.addRule(Wording.specialize({ ruleName: "media_place", meanings: MEDIA_PLACES }), {
  syntax: "((window:in a new window)|(full_screen:full screen|in full screen))"
})

// a name without quotes, one the program gave:  its own `parse()` reads it
UI.addRule(MediaNameWords, { syntax: "{identifier}" })

UI.addRule(MediaNamed, {
  syntax: "{kind:media_kind} {name:text}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`sound "card slide"`, `core.mediaNamed("card slide", "sound")`],
        [`movie "intro"`, `core.mediaNamed("intro", "video")`]
      ]
    }
  ]
})
UI.addRule(MediaNamed, {
  syntax: "the {name:text} {kind:media_kind}",
  tests: [{ compileAs: "expression", tests: [[`the "intro" video`, `core.mediaNamed("intro", "video")`]] }]
})
UI.addRule(MediaNamed, { syntax: "the {name:media_name_words} {kind:media_kind}" })
UI.addRule(MediaNamed, { syntax: "{kind:media_kind} {name:media_name_words}" })

UI.addRule(MediaTime, {
  syntax: "{number} : {number}",
  tests: [{ tests: [["1:05", 65]] }]
})
UI.addRule(MediaSpeed, {
  syntax: "at ({speed:number} x|{word:media_speed_word})",
  tests: [
    {
      tests: [
        ["at 1.5x", 1.5],
        ["at half speed", 0.5],
        ["at twice the speed", 2]
      ]
    }
  ]
})
UI.addRule(MediaVolume, { syntax: "((at {volume:measure_literal} volume)|(quiet:quietly)|(muted:muted))" })

// a page's or an app's sound or video, by its name:  `sound "card slide" is at "sounds/slide.mp3"`
UI.addRule(DefineMedia, {
  roles: { band: "property", property: "declaration" },
  syntax: "{type:subject_implied} {kind:media_kind} {property:quoted_member} is at {path:text}"
})
// ... the other way round, `its "card slide" is a sound at "..."`:  `outline_specifier_media`, the `classes` module's

UI.addRule(PlaySound, {
  syntax:
    "play {sound:expression} {speed:media_speed}? (from {from:media_time})? {volume:media_volume}?" +
    " {loop:media_loop}? {place:media_place}? (wait:and wait)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`play "cry.ogg"`, `core.play("cry.ogg")`],
        [`play sound "card slide"`, `core.play(core.mediaNamed("card slide", "sound"))`],
        {
          input: `play the "intro" video at 1.5x from 0:30 in a new window`,
          js: [
            `core.play(core.mediaNamed("intro", "video"), {`,
            `  speed: 1.5,`,
            `  from: 30,`,
            `  where: "window"`,
            `})`
          ]
        },
        [`play "ding" at 50% volume and wait`, `await core.play("ding", { volume: 0.5 })`],
        [`play "theme" quietly over and over`, `core.play("theme", { volume: 0.3, loop: true })`],
        [`play "intro" muted full screen`, `core.play("intro", { muted: true, where: "full screen" })`]
      ]
    }
  ]
})

UI.addRule(StopSound, {
  syntax: "stop {sound:expression}",
  tests: [{ compileAs: "statement", tests: [[`stop "cry.ogg"`, `core.stop("cry.ogg")`]] }]
})

UI.addRule(StopAllMedia, {
  syntax: "stop all {kind:media_kinds}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`stop all sounds`, `core.stopAll("sound")`],
        [`stop all movies`, `core.stopAll("video")`]
      ]
    }
  ]
})

UI.addRule(MediaCall.specialize({ methodName: "pause" }), {
  syntax: "pause {media:media_named}",
  tests: [{ compileAs: "statement", tests: [[`pause video "intro"`, `core.pause(core.mediaNamed("intro", "video"))`]] }]
})
UI.addRule(MediaCall.specialize({ methodName: "resume" }), {
  syntax: "resume {media:media_named}",
  tests: [
    { compileAs: "statement", tests: [[`resume video "intro"`, `core.resume(core.mediaNamed("intro", "video"))`]] }
  ]
})

UI.addRule(MediaIs, {
  roles: { match: "question" },
  syntax: "{media:media_named} {operator:is_or_is_not} ((playing:playing)|(done:done|finished))",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`the "intro" video is playing`, `core.isPlaying(core.mediaNamed("intro", "video"))`],
        [`sound "card slide" is not done`, `!core.isDone(core.mediaNamed("card slide", "sound"))`]
      ]
    }
  ]
})

UI.addRule(MediaLength, {
  syntax: "the (length|duration) of {media:media_named}",
  tests: [
    {
      compileAs: "expression",
      tests: [[`the length of the "intro" video`, `core.mediaLength(core.mediaNamed("intro", "video"))`]]
    }
  ]
})

UI.addRule(LoadSound, {
  syntax: "(load|preload) {sound:expression}",
  tests: [{ compileAs: "statement", tests: [[`load "cry.ogg"`, `core.loadSound("cry.ogg")`]] }]
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
    " ((for ({time:measure_literal}|{time:expression} {unit:unit_words}))|(untilClicked:until clicked))? {progress:toast_progress}?" +
    " (sideBySide:side by side)? (keepRunning:without pausing)? (with {okButton:text})? (wait:and wait)?",
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
        [`notify "Bye" for 5 seconds and wait`, `await core.notify("Bye", { time: 5, units: "seconds" })`],
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
        {
          input: `notify "Got it?" for 5 seconds with "Yes"`,
          js: [`core.notify("Got it?", {`, `  time: 5,`, `  units: "seconds",`, `  button: "Yes"`, `})`]
        }
      ]
    }
  ]
})

UI.addRule(Alert, {
  syntax: "alert {message:expression} (titled {title:expression})? (in {size:text_size} text)? (with {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`alert "Yo!"`, `await core.alert("Yo!")`],
        [`alert "Yo!" with "yep"`, `await core.alert("Yo!", "yep")`],
        [`alert "You won!" titled "Solitaire"`, `await core.alert("You won!", { title: "Solitaire" })`],
        [`alert "You won!" in big text`, `await core.alert("You won!", { size: "big" })`],
        [`alert "Tiny" in small text`, `await core.alert("Tiny", { size: "small" })`],
        {
          input: `alert "You won!" titled "Solitaire" in huge text with "New game"`,
          js: [
            `await core.alert("You won!", {`,
            `  title: "Solitaire",`,
            `  size: "huge",`,
            `  okText: "New game"`,
            `})`
          ]
        },
        [`alert "You **won**!" in big text`, `await core.alert("You **won**!", { size: "big" })`]
      ]
    }
  ]
})

UI.addRule(Warn, {
  syntax: "warn {message:expression} (titled {title:expression})? (in {size:text_size} text)? (with {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`warn "Yo!"`, 'await core.warn("Yo!")'],
        [`warn "Yo!" with "yep"`, 'await core.warn("Yo!", "yep")'],
        [`warn "Careful!" titled "Deleting"`, 'await core.warn("Careful!", { title: "Deleting" })'],
        [`warn "Careful!" in big text with "OK"`, 'await core.warn("Careful!", { size: "big", okText: "OK" })']
      ]
    }
  ]
})

UI.addRule(Confirm, {
  syntax:
    "confirm {message:expression} (titled {title:expression})? (in {size:text_size} text)?" +
    " (with {okButton:text} ((and|or) {cancelButton:text})?)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`confirm "Yo!"`, `await core.confirm("Yo!")`],
        [`confirm "Yo!" with "yep"`, `await core.confirm("Yo!", "yep")`],
        [`confirm "Yo!" with "yep" and "nope"`, `await core.confirm("Yo!", "yep", "nope")`],
        [`confirm "Deal again?" titled "Solitaire"`, `await core.confirm("Deal again?", { title: "Solitaire" })`],
        {
          input: `confirm "Deal again?" titled "Solitaire" in big text with "Deal" or "Not now"`,
          js: [
            `await core.confirm("Deal again?", {`,
            `  title: "Solitaire",`,
            `  size: "big",`,
            `  okText: "Deal",`,
            `  cancelText: "Not now"`,
            `})`
          ]
        }
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
        [`prompt "Name for the new baby?"`, `const it = await core.prompt("Name for the new baby?")`],
        [`prompt "File name:" with "Untitled"`, `const it = await core.prompt("File name:", "Untitled")`]
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
        // a backtick in a comment, or `${`, mustn't end the template it's written in
        ['"/* `a` ${b} */"', 'core.installStyles(undefined, `"/* \\`a\\` \\${b} */"`)'],
        [`".Card {\\n\\theight:30px;\\n}\\n"`, `core.installStyles(undefined, \`".Card {\\n\\theight:30px;\\n}\\n"\`)`]
      ]
    }
  ]
})

UI.addRule(UIDefaults, {
  tests: [
    {
      title: "An app's widget defaults:  a sample tag per widget, each attribute a default",
      compileAs: "statement",
      tests: [
        [
          [
            "<ui-defaults>",
            '\t<ui-button appearance="pill"/>',
            '\t<ui-segment appearance="raised" padded/>',
            "</ui-defaults>"
          ],
          'core.useDefaults("", {\n  "ui-button": { appearance: "pill" },\n  "ui-segment": { appearance: "raised", padded: true }\n})'
        ]
      ]
    }
  ]
})
