import { core, on, trigger } from "@spell/core"

core.heading("The console")
/////////////////
// ## The console
/////////////////
// One of FizzBuzz's listeners:  it prints each number as it's counted, and the word it gets.

on<{ number: number }>("fizzbuzz", ({ number }) => core.console.log(number, "fizzbuzz"))
on<{ number: number }>("fizz", ({ number }) => core.console.log(number, "fizz"))
on<{ number: number }>("buzz", ({ number }) => core.console.log(number, "buzz"))
on<{ number: number }>("plain-number", ({ number }) => core.console.log(number))

// -----------
core.heading("FizzBuzz")
//////////////
// ## FizzBuzz
//////////////
// Counting to 100:  fizz for every number 3 goes into, buzz for 5, fizzbuzz for both.
// The counting prints nothing itself:  it says what each number is, as an event, to whoever's listening.
// - `Console.spellml` listens, and prints each one.
// - `Explainer.spellml`, when it's turned on in the project, listens too, and shows them on a page.

/** each number from 1 to 100, as one of four events:  fizzbuzz, fizz, buzz, or a plain number */
export function playFizzbuzz() {
  core.getRange(1, 100).forEach((number) => {
    if (core.isOfType(number / 15, "integer")) trigger("fizzbuzz", { number: number })
    else if (core.isOfType(number / 3, "integer")) trigger("fizz", { number: number })
    else if (core.isOfType(number / 5, "integer")) trigger("buzz", { number: number })
    else trigger("plain-number", { number: number })
  })
}

playFizzbuzz()

