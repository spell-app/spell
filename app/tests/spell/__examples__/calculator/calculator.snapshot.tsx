import { core, App, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Calculator")
////////////////
// ## Calculator
////////////////
// A pocket calculator:  a number, an operator, another number, and the total as you type.
// Its keys are Spell UI's buttons, four a row, and each one runs one of the calculator's actions.

export class Calculator extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** The number being typed, as text, so each key can add a digit on the end */
  // - its "input" is text
  @prop({ type: "text" })
  accessor input!: string

  // - its "left" is text
  @prop({ type: "text" })
  accessor left!: string

  // - its "operator" is text
  @prop({ type: "text" })
  accessor operator!: string

  // - its "right" is text
  @prop({ type: "text" })
  accessor right!: string

  /** The sum so far, worked out each time it's read */
  get total() {
    const leftNumber = parseFloat(this.left)
    const rightNumber = parseFloat(this.right)
    if (this.operator === "+") return leftNumber + rightNumber
    if (this.operator === "–") return leftNumber - rightNumber
    if (this.operator === "×") return leftNumber * rightNumber
    return leftNumber / rightNumber
  }

  /** What the display's top line shows:  0 until a key's pressed */
  get sum() {
    const shown = !this.left ? "0" : this.left
    return `${shown} ${this.operator} ${this.right}`
  }

  /** The display's second line:  the total, once there's a right number */
  get output() {
    if (!this.right) return ""
    return `= ${this.total}`
  }

  clear() {
    this.input = ""
    this.left = ""
    this.operator = ""
    this.right = ""
  }

  /** Equals:  the total becomes the left number, ready for the next operator */
  finish() {
    if (!this.right) return
    this.left = `${this.total}`
    this.operator = ""
    this.right = ""
    this.input = ""
  }

  /** A digit, or the decimal point:  onto the number being typed, the left one until there's an operator */
  pressDigitOnCalculator(digit: string) {
    if (digit === ".") {
      if (!this.input) this.input = "0."
      else if (!this.input.includes(".")) this.input = `${this.input}.`
    } else this.input = this.input + digit
    if (!this.operator) this.left = this.input
    else this.right = this.input
  }

  /** An operator:  after a whole sum, the total carries on as the next sum's left number */
  applyKeyToCalculator(key: string) {
    if (this.right) this.finish()
    this.operator = key
    this.input = ""
  }

  /** The display, then the keypad, four keys a row:  C and 0 are two keys wide */
  @drawn draw() {
    return (
      <ui-stack align="center">
        <ui-card>
          <ui-segment appearance="secondary" align="right">
            <ui-text size="huge">{this.sum}</ui-text>
            <ui-space />
            <ui-text size="large" color="grey">{this.output}</ui-text>
          </ui-segment>
          <ui-content>
            <ui-grid columns="4" spacing="compact">
              <ui-column width="8">
                <ui-button fluid={true} color="negative" onClick={core.pressed(this, () => this.clear())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  C
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} color="secondary" onClick={core.pressed(this, () => this.finish())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  =
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} color="primary" onClick={core.pressed(this, () => this.applyKeyToCalculator("÷"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  ÷
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("7"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  7
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("8"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  8
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("9"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  9
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} color="primary" onClick={core.pressed(this, () => this.applyKeyToCalculator("×"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  ×
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("4"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  4
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("5"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  5
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("6"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  6
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} color="primary" onClick={core.pressed(this, () => this.applyKeyToCalculator("–"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  –
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("1"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  1
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("2"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  2
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("3"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  3
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} color="primary" onClick={core.pressed(this, () => this.applyKeyToCalculator("+"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  +
                </ui-button>
              </ui-column>
              <ui-column width="8">
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("0"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  0
                </ui-button>
              </ui-column>
              <ui-column>
                <ui-button fluid={true} onClick={core.pressed(this, () => this.pressDigitOnCalculator("."))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  .
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
 * `<test-project-app>`:  a calculator, drawn in its own element, e.g. by `draw the calculator`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its calculator's properties;  its methods call its calculator's.
 * - What every view's element does, e.g. drawing its calculator, is `SpellElement`'s.
 */
export class CalculatorElement extends SpellElement<Calculator> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "calculator", [
    { name: "input", kind: "string", description: "Its input." },
    { name: "left", kind: "string", description: "Its left." },
    { name: "operator", kind: "string", description: "Its operator." },
    { name: "right", kind: "string", description: "Its right." }
  ])

  clear() {
    return this.currentThing?.clear()
  }

  finish() {
    return this.currentThing?.finish()
  }

  pressDigitOnCalculator(digit: string) {
    return this.currentThing?.pressDigitOnCalculator(digit)
  }

  applyKeyToCalculator(key: string) {
    return this.currentThing?.applyKeyToCalculator(key)
  }
}
core.useElement(Calculator, CalculatorElement)
export const calculator = new Calculator()
// The sum being typed:  its left number, its operator and its right number

/** 12 + 5, then times 2:  the total carries on as the next sum's left number */
export function testTwoSumsInARow() {
  return core.test("test two sums in a row", function testTwoSumsInARow() {
    const it = new Calculator()
    core.echoTestAction(`press "1" on it`)
    it.pressDigitOnCalculator("1")
    core.echoTestAction(`press "2" on it`)
    it.pressDigitOnCalculator("2")
    core.echoTestAction(`apply "+" to it`)
    it.applyKeyToCalculator("+")
    core.echoTestAction(`press "5" on it`)
    it.pressDigitOnCalculator("5")
    core.expect(it.output, `its output`, "= 17", `"= 17"`)
    core.echoTestAction(`apply "×" to it`)
    it.applyKeyToCalculator("×")
    core.echoTestAction(`press "2" on it`)
    it.pressDigitOnCalculator("2")
    core.expect(it.output, `its output`, "= 34", `"= 34"`)
    core.echoTestAction(`finish it`)
    it.finish()
    core.expect(it.left, `its left`, "34", `"34"`)
    core.expect(it.output, `its output`, "", `""`)
  })
}
// -----------
if (!core.isCarryingOver) calculator.start()
// -----------
if (!core.isCarryingOver) testTwoSumsInARow()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CalculatorElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
