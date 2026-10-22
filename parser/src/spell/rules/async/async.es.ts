/**
 * The `async` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `async` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `async.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 */
import { SpellParser } from "spell-lang/spell/SpellParser"
import { Negatable, Wording } from "spell-lang/spell/rules/expressions"

import { Await } from "./Await"
import { CheckProcess } from "./CheckProcess"
import { Pause, PAUSE_UNITS } from "./Pause"
import { StartProcess } from "./StartProcess"
import { StopProcess } from "./StopProcess"

/** Spanish's `async` rules. */
export const asyncEs = new SpellParser({ module: "async" })

asyncEs.addRule(Await, {
  syntax: "esperar a? :? {expression}?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["esperar", "await undefined"],
        ["esperar 1", "await 1"],
        ["esperar a 1", "await 1"],
        ["poner el result a esperar 1", "export const result = await 1"],
        ["esperar 2 es 1", "await (2 === 1)"],
        ["si esperar 2 es 1 entonces imprimir 1", "if (await 2 == 1) core.console.log(1)"]
      ]
    },
    {
      compileAs: "block",
      tests: [
        {
          input: ["para do something", "\tesperar 1"],
          js: ["export async function doSomething() {", "  await 1", "}"]
        },
        {
          input: ["para do something", "\tsi (1) esperar 1"],
          js: ["export async function doSomething() {", "  if (1) await 1", "}"]
        }
      ]
    }
  ]
})

// a pause's unit, each meaning the runtime's name for it:  `segundos` means `seconds`
asyncEs.addRule(Wording.specialize({ ruleName: "pause_units", meanings: PAUSE_UNITS }), {
  syntax:
    "((second:segundo)|(seconds:segundos)|(sec:seg)|(millisecond:milisegundo)|(milliseconds:milisegundos)|(msec:mseg|ms)|(tick:tic)|(ticks:tics))"
})

asyncEs.addRule(Pause, {
  syntax: "pausar (por|durante)? {number:expression} {units:pause_units}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`pausar 2 segundos`, 'await core.pauseFor(2, "seconds")'],
        [`pausar por 1 segundo`, 'await core.pauseFor(1, "second")'],
        [`pausar 500 mseg`, 'await core.pauseFor(500, "msec")'],
        [`pausar durante 500 milisegundos`, 'await core.pauseFor(500, "milliseconds")'],
        [`pausar 10 tics`, 'await core.pauseFor(10, "ticks")'],
        [`pausar (10 + 10) seg`, 'await core.pauseFor(10 + 10, "sec")']
      ]
    }
  ]
})

// `exclusivo`, and its negated forms, for `start_process`:  `iniciar animación no exclusiva dealing`
asyncEs.addRule(Negatable.specialize({ ruleName: "exclusive_or_not" }), {
  syntax: "(exclusivo|exclusiva|(negated:no exclusivo|no exclusiva|no-exclusivo|no-exclusiva))"
})

asyncEs.addRule(StartProcess, {
  syntax: "iniciar (el|la)? (animación|animacion|proceso) {operator:exclusive_or_not}? {name:constant}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`iniciar proceso dealing`, 'core.startProcess("dealing")'],
        [`iniciar animación dealing`, 'core.startProcess("dealing")'],
        [`iniciar la animacion dealing`, 'core.startProcess("dealing")'],
        [`iniciar animación no exclusiva dealing`, 'core.startProcess("dealing")'],
        [`iniciar proceso no-exclusivo dealing`, 'core.startProcess("dealing")'],
        [
          `iniciar proceso exclusivo dealing`,
          ['if (core.processIsRunning("dealing")) return', 'core.startProcess("dealing", "EXCLUSIVE")']
        ]
      ]
    }
  ]
})

asyncEs.addRule(StopProcess, {
  syntax: "(detener|parar|terminar|finalizar|cancelar) (el|la)? (animación|animacion|proceso) {name:constant}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`detener animación dealing`, 'core.stopProcess("dealing")'],
        [`detener el proceso dealing`, 'core.stopProcess("dealing")'],
        [`parar proceso dealing`, 'core.stopProcess("dealing")'],
        [`terminar proceso dealing`, 'core.stopProcess("dealing")'],
        [`finalizar proceso dealing`, 'core.stopProcess("dealing")'],
        [`cancelar proceso dealing`, 'core.stopProcess("dealing")']
      ]
    }
  ]
})

asyncEs.addRule(CheckProcess, {
  syntax:
    "(el|la)? (animación|animacion|proceso) {name:constant} {operator:is_or_is_not} (corriendo|activo|activa|en marcha)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`animación dealing está corriendo`, 'core.processIsRunning("dealing")'],
        [`la animación dealing no está corriendo`, '!core.processIsRunning("dealing")'],
        [`proceso dealing no esta activo`, '!core.processIsRunning("dealing")'],
        [`el proceso dealing está en marcha`, 'core.processIsRunning("dealing")']
      ]
    }
  ]
})
