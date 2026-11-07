import { core, App, h } from "@spell/core"

core.heading("How the Calculator works")
//////////////////////////////
// ## How the Calculator works
//////////////////////////////
// The Calculator example is a pocket calculator:  press 7, +, 5, and it shows 12.
// Every key on it does the same two things:
// - it runs an ACTION, a few lines that change what the calculator keeps
// - and the display, drawn from what it keeps, changes with it

// This guide builds a smaller one, an adding machine, on the right:  three number keys, a + key and a C key.
// Open Calculator, in the Examples, to see the whole thing with every key.

core.heading("What it keeps")
///////////////////
// ## What it keeps
///////////////////
// Each `<property>` is one thing every adding machine keeps.
// - `type="number"` makes the total a number, starting at 0.
// - The number being typed is text, so each key can add a digit on the end.

core.heading("What its keys do")
//////////////////////
// ## What its keys do
//////////////////////
// Each `<action>` is what one key does.
// - A digit key's action takes the digit:  `press (digit as text) on it`, so `press "5" on it` puts a 5 on the end.
// - "+" between two pieces of text joins them:  "1" + "2" is "12".
// - `as a number` turns the text "12" into the number 12, so it can be added up.
// - `clear` empties what it names:  a number goes back to 0, a text to "".

core.heading("How it draws")
//////////////////
// ## How it draws
//////////////////
// The display, then the keys, in a card:  Spell UI's tags, by their short names.
// - `<button>` is Spell UI's button, `<grid columns="5">` lays the keys out five a row.
// - `onClick` says what a key does when it's clicked:  one of the actions above.
// - The display shows the number being typed, or the total when nothing is.

export class AddingMachine extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "total" is a number
  static { this.declareProp("total", { type: "number" }) }
  get total() { return this.getProp("total") }
  set total(value) { this.setProp("total", value) }

  /** The number being typed */
  // - its "input" is text
  static { this.declareProp("input", { type: "text" }) }
  get input() { return this.getProp("input") }
  set input(value) { this.setProp("input", value) }

  /** A digit key:  that digit, on the end of the number being typed */
  pressDigitOnAddingMachine(digit) {
    this.input = this.input + digit
  }

  /** The + key:  the number typed, added to the total, then a fresh start for the next one */
  addUp() {
    if (!this.input) return
    const typed = parseFloat(this.input)
    this.total = this.total + typed
    this.input = ""
  }

  /** The C key:  back to nothing */
  clear() {
    this.total = 0
    this.input = ""
  }

  draw() {
    return h("ui-stack", { align: "center" },
      h("ui-card",
        h("ui-segment", { appearance: "secondary", align: "right" },
          h("ui-text", { size: "huge" }, () => !this.input ? this.total : this.input)
        ),
        h("ui-content",
          h("ui-grid", { columns: "5", spacing: "compact" },
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigitOnAddingMachine("1")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "1")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigitOnAddingMachine("2")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "2")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigitOnAddingMachine("5")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "5")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                color: "primary",
                onClick: core.pressed(this, () => this.addUp()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "+")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                color: "negative",
                onClick: core.pressed(this, () => this.clear()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "C")
            )
          )
        )
      )
    )
  }
}
export const addingMachine = new AddingMachine()

/** 12 and 5 make 17 */
export function testAddingUp() {
  return core.test("test adding up", function testAddingUp() {
    const it = new AddingMachine()
    core.echoTestAction(`press "1" on it`)
    it.pressDigitOnAddingMachine("1")
    core.echoTestAction(`press "2" on it`)
    it.pressDigitOnAddingMachine("2")
    core.echoTestAction(`add it up`)
    it.addUp()
    core.echoTestAction(`press "5" on it`)
    it.pressDigitOnAddingMachine("5")
    core.echoTestAction(`add it up`)
    it.addUp()
    core.expect(it.total, `its total`, 17, `17`)
  })
}

core.heading("Try it")
////////////
// ## Try it
////////////
// - Click 1, 2, +, 5, + on the right:  the display shows 12, then 17.
// - Add a 9 key:  copy the line with "5" in it, and change both 5s to 9s.
// Then make the grid six columns:  `columns="6"`.
// - Make + into - :  in "add it up", change the + in "the total + typed" to a -,
// then change the key's label.  The check above will turn red, because 12 take away 5 isn't 17.

// Where next:  the Calculator example, which keeps a left number, an operator and a right number,
// so it can do all four sums.
// -----------
if (!core.isCarryingOver) addingMachine.start()
// -----------
if (!core.isCarryingOver) testAddingUp()
