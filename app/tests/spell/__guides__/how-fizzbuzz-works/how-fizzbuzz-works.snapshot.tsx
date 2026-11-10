import { core, on, trigger } from "@spell/core"

core.heading("How FizzBuzz works")
////////////////////////
// ## How FizzBuzz works
////////////////////////
// FizzBuzz is a counting game for a classroom.
// Count up from 1, but say "fizz" instead of a number you can share out in threes,
// "buzz" for one you can share out in fives, and "fizzbuzz" for one you can share out both ways.

// The FizzBuzz example plays it to 100.  Here is the same program, playing to 20, with every line explained.
// It has no page of its own:  what it says appears in Program Output, below the editor.

core.heading("One algorithm, two listeners")
//////////////////////////////////
// ## One algorithm, two listeners
//////////////////////////////////
// The example is split in two halves that never name each other:
// - the ALGORITHM counts, and for each number sends an EVENT saying what it is:
// `fizz`, `buzz`, `fizzbuzz`, or `plain number`, each carrying the number
// - a LISTENER hears those events and decides what to do with them

// FizzBuzz has two listeners:
// - the console, `Console.spell`, prints each one as a line
// - the explainer, `Explainer.spell`, is a page that explains the game and its history,
// and draws each number as a label as it arrives
// - It's off in the project file, so the example runs as a plain program.
// - Turn it on, and the same counting fills the page too:  the algorithm doesn't change at all.

// This guide has the algorithm and the console's listener, in one file.

core.heading("The listener")
//////////////////
// ## The listener
//////////////////
// `on fizz with number as a number:` runs each time a `fizz` event is sent, with the number it carries.
// The listener comes first, so it's listening before the counting starts.

on<{ number: number }>("fizzbuzz", ({ number }) => core.console.log(number, "fizzbuzz"))
on<{ number: number }>("fizz", ({ number }) => core.console.log(number, "fizz"))
on<{ number: number }>("buzz", ({ number }) => core.console.log(number, "buzz"))
on<{ number: number }>("plain-number", ({ number }) => core.console.log(number))

core.heading("The algorithm")
///////////////////
// ## The algorithm
///////////////////
// The first line names something the program can do:  "play fizzbuzz".
// The indented lines under it are how to do it.
// - `for number from 1 to 20` says each number in turn:  this kind of line is called a LOOP.
// - "divided by 15 is an integer" means 15 goes into it with nothing left over.
// - 15 first, because a number that 15 goes into is one that 3 and 5 both go into.
// - `trigger fizz with number = the number` sends the event to every listener, with the number.
// The algorithm doesn't know, or care, who's listening.

export function playFizzbuzz() {
  core.getRange(1, 20).forEach((number) => {
    if (core.isOfType(number / 15, "integer")) trigger("fizzbuzz", { number: number })
    else if (core.isOfType(number / 3, "integer")) trigger("fizz", { number: number })
    else if (core.isOfType(number / 5, "integer")) trigger("buzz", { number: number })
    else trigger("plain-number", { number: number })
  })
}

// and this line does it
playFizzbuzz()

core.heading("What you'll see")
/////////////////////
// ## What you'll see
/////////////////////
// Program Output shows twenty lines, one for each number:
// 3 fizz, 5 buzz, 15 fizzbuzz, and the rest as they are.

// The four lines that start with "if" and "otherwise" are a CHOICE:
// the program tries them in order, and does only the first one that fits.
// That's why 15 says "fizzbuzz" and not "fizz":  the fizzbuzz line comes first.

core.heading("Try it")
////////////
// ## Try it
////////////
// - Play further:  change the 20 to 100, as the example does.
// - Change the game:  make it "fizz" for sevens instead of threes.  Which TWO numbers need to change?
// - Swap the order:  move the fizzbuzz line below the buzz line, and look at 15 again.
// (Keep "if" on the first of the four lines, and "otherwise if" on the others.)
// - Change what's said, not what's counted:  make the fizz listener print "FIZZ!" instead.
// The algorithm stays exactly as it is.

core.heading("A check")
/////////////
// ## A check
/////////////
// A TEST tries a line and says what should happen;  Program Output shows a green tick when it does.

export function testTheRule() {
  return core.test("test the rule", function testTheRule() {
    core.expect(core.isOfType(15 / 3, "integer"), `15 divided by 3 is an integer`, true, `yes`)
    core.expect(core.isOfType(16 / 3, "integer"), `16 divided by 3 is an integer`, false, `no`)
  })
}

core.heading("Where next")
////////////////
// ## Where next
////////////////
// - The FizzBuzz example:  turn on its explainer page, and watch the same events become labels.
// - A tour of Spell:  the four ideas that bigger programs, with pages of their own, are made of.
// - Calculator, in the Examples:  numbers again, this time on buttons you can press.
// -----------
if (!core.isCarryingOver) testTheRule()
