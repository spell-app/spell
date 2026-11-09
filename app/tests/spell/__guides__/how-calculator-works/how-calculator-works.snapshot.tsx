import { core, App, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
// - A digit key's action takes the digit:  `press (digit as text)`, so `press "5"` puts a 5 on the end.
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
  @prop({ type: "number" })
  accessor total!: number

  /** The number being typed */
  // - its "input" is text
  @prop({ type: "text" })
  accessor input!: string

  /** A digit key:  that digit, on the end of the number being typed */
  pressDigit(digit: string) {
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

  @drawn draw() {
    return (
      <ui-stack align="center">
        <ui-card>
          <ui-segment appearance="secondary" align="right">
            <ui-text size="huge">{!this.input ? this.total : this.input}</ui-text>
          </ui-segment>
          <ui-content>
            <ui-grid columns="5" spacing="compact">
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigit("1"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  1
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigit("2"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  2
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigit("5"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  5
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} color="primary" onClick={core.pressed(this, () => this.addUp())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  +
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} color="negative" onClick={core.pressed(this, () => this.clear())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  C
                </ui-button>
              </ui-column>
            </ui-grid>
          </ui-content>
        </ui-card>
      </ui-stack>
    )
  }
}

/**
 * `<test-project-app>`:  an adding machine, drawn in its own element, e.g. by `draw the adding machine`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its adding machine's properties;  its methods call its adding machine's.
 * - What every view's element does, e.g. drawing its adding machine, is `SpellElement`'s.
 */
export class AddingMachineElement extends SpellElement<AddingMachine> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "adding machine", [
    { name: "total", kind: "number", description: "Its total." },
    { name: "input", kind: "string", description: "Its input." }
  ])

  pressDigit(digit: string) {
    return this.currentThing?.pressDigit(digit)
  }

  addUp() {
    return this.currentThing?.addUp()
  }

  clear() {
    return this.currentThing?.clear()
  }
}
core.useElement(AddingMachine, AddingMachineElement)
export const addingMachine = new AddingMachine()

/** 12 and 5 make 17 */
export function testAddingUp() {
  return core.test("test adding up", function testAddingUp() {
    const it = new AddingMachine()
    core.echoTestAction(`press "1"`)
    it.pressDigit("1")
    core.echoTestAction(`press "2"`)
    it.pressDigit("2")
    core.echoTestAction(`add it up`)
    it.addUp()
    core.echoTestAction(`press "5"`)
    it.pressDigit("5")
    core.echoTestAction(`add it up`)
    it.addUp()
    core.expect(it.total, `the total`, 17, `17`)
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

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `AddingMachineElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
