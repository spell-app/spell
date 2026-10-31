/**
 * The `async` rules in English:  each rule's syntax and its tests, registered on the `async` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `async.<lang>.ts` (epic `spanish`).
 */
import { Negatable, Wording } from "spell/parser/spell/rules/expressions"

import { _async } from "./async.parser"
import { AtTheSameTime } from "./AtTheSameTime"
import { Await } from "./Await"
import { CheckProcess } from "./CheckProcess"
import { Meanwhile } from "./Meanwhile"
import { Pause, PAUSE_UNITS } from "./Pause"
import { StartProcess } from "./StartProcess"
import { StopProcess } from "./StopProcess"

_async.addRule(Await, {
  syntax: "(await|wait for) :? {expression}?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["await", "await undefined"],
        ["wait for 1", "await 1"],
        ["set the result to wait for 1", "export const result = await 1"],
        ["wait for 2 is 1", "await (2 === 1)"],
        ["if wait for 2 is 1 then print 1", "if (await 2 === 1) core.console.log(1)"]
      ]
    },
    {
      compileAs: "block",
      tests: [
        {
          input: ["to do something", "\twait for 1"],
          js: ["export async function doSomething() {", "  await 1", "}"]
        },
        {
          input: ["to do something", "\tif (1) wait for 1"],
          js: ["export async function doSomething() {", "  if (1) await 1", "}"]
        }
      ]
    }
  ]
})

// a pause's unit, each meaning the runtime's name for it (`core.TIME_UNITS_MAP`):  `seconds` for `seconds`
_async.addRule(Wording.specialize({ ruleName: "pause_units", meanings: PAUSE_UNITS }), {
  syntax:
    "((second:second)|(seconds:seconds)|(sec:sec)|(millisecond:millisecond)|(milliseconds:milliseconds)|(msec:msec)|(tick:tick)|(ticks:ticks))"
})

_async.addRule(Pause, {
  syntax: "pause for {number:expression} {units:pause_units}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`pause for 2 seconds"`, 'await core.pauseFor(2, "seconds")'],
        [`pause for 500 msec"`, 'await core.pauseFor(500, "msec")'],
        [`pause for 10 ticks"`, 'await core.pauseFor(10, "ticks")'],
        [`pause for (10 + 10) sec`, 'await core.pauseFor(10 + 10, "sec")']
      ]
    }
  ]
})

_async.addRule(AtTheSameTime, {
  syntax: "at the same time :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["to do something", "\tat the same time:", "\t\tprint 1", "\t\tprint 2"],
          js: [
            "export function doSomething() {",
            "  core.together(() => core.console.log(1), () => core.console.log(2))",
            "}"
          ]
        }
      ]
    }
  ]
})

_async.addRule(Meanwhile, {
  syntax: "meanwhile :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["to do something", "\tmeanwhile print 1"],
          js: ["export function doSomething() {", "  core.meanwhile(() => core.console.log(1))", "}"]
        }
      ]
    }
  ]
})

// `exclusive`, and its negated forms, for `start_process`:  `start non-exclusive animation dealing`
_async.addRule(Negatable.specialize({ ruleName: "exclusive_or_not" }), {
  syntax: "(exclusive|(negated:non-exclusive|nonexclusive))"
})

_async.addRule(StartProcess, {
  syntax: "start {operator:exclusive_or_not}? (animation|process) {name:constant}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`start process dealing`, 'core.startProcess("dealing")'],
        [`start animation dealing`, 'core.startProcess("dealing")'],
        [`start non-exclusive animation dealing`, 'core.startProcess("dealing")'],
        [`start nonexclusive process dealing`, 'core.startProcess("dealing")'],
        [
          `start exclusive process dealing`,
          ['if (core.processIsRunning("dealing")) return', 'core.startProcess("dealing", "EXCLUSIVE")']
        ]
      ]
    }
  ]
})

_async.addRule(StopProcess, {
  syntax: "(stop|end|finish|cancel) (animation|process) {name:constant}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`stop animation dealing`, 'core.stopProcess("dealing")'],
        [`stop process dealing`, 'core.stopProcess("dealing")'],
        [`end process dealing`, 'core.stopProcess("dealing")'],
        [`finish process dealing`, 'core.stopProcess("dealing")'],
        [`cancel process dealing`, 'core.stopProcess("dealing")']
      ]
    }
  ]
})

_async.addRule(CheckProcess, {
  syntax: "(animation|process) {name:constant} {operator:is_or_is_not} (running|active)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`animation dealing is running`, 'core.processIsRunning("dealing")'],
        [`animation dealing isn't running`, '!core.processIsRunning("dealing")'],
        [`process dealing is not active`, '!core.processIsRunning("dealing")']
      ]
    }
  ]
})
