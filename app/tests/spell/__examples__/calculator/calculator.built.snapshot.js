import { core, App, h } from "@spell/core"

export class Calculator extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("input", { type: "text" }) }
  get input() { return this.getProp("input") }
  set input(value) { this.setProp("input", value) }

  static { this.declareProp("left", { type: "text" }) }
  get left() { return this.getProp("left") }
  set left(value) { this.setProp("left", value) }

  static { this.declareProp("operator", { type: "text" }) }
  get operator() { return this.getProp("operator") }
  set operator(value) { this.setProp("operator", value) }

  static { this.declareProp("right", { type: "text" }) }
  get right() { return this.getProp("right") }
  set right(value) { this.setProp("right", value) }

  get total() {
    const leftNumber = parseFloat(this.left)
    const rightNumber = parseFloat(this.right)
    if (this.operator === "+") return leftNumber + rightNumber
    if (this.operator === "–") return leftNumber - rightNumber
    if (this.operator === "×") return leftNumber * rightNumber
    return leftNumber / rightNumber
  }

  get sum() {
    const shown = !this.left ? "0" : this.left
    return `${shown} ${this.operator} ${this.right}`
  }

  get output() {
    if (!this.right) return ""
    return `= ${this.total}`
  }

  clear() {
    core.play("tap")
    this.input = ""
    this.left = ""
    this.operator = ""
    this.right = ""
  }

  finish() {
    core.play("tap")
    if (!this.right) return
    this.left = `${this.total}`
    this.operator = ""
    this.right = ""
    this.input = ""
  }

  pressDigit(digit) {
    core.play("tap")
    if (digit === ".") {
      if (!this.input) this.input = "0."
      else if (!this.input.includes(".")) this.input = `${this.input}.`
    } else this.input = this.input + digit
    if (!this.operator) this.left = this.input
    else this.right = this.input
  }

  applyKey(key) {
    core.play("tap")
    if (this.right) this.finish()
    this.operator = key
    this.input = ""
  }

  draw() {
    return h("ui-container", { width: "20em" },
      h("ui-card", { fluid: true },
        h("ui-segment", { appearance: "secondary", align: "right" },
          h("ui-text", { size: "huge" }, () => this.sum),
          h("ui-space"),
          h("ui-text", { size: "large", color: "grey" }, () => this.output)
        ),
        h("ui-content",
          h("ui-grid", { columns: "4", spacing: "compact" },
            h("ui-column", { width: "8" },
              h("ui-button", {
                fluid: true,
                color: "negative",
                onClick: core.pressed(this, () => this.clear()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "C")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                color: "secondary",
                onClick: core.pressed(this, () => this.finish()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "=")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                color: "primary",
                onClick: core.pressed(this, () => this.applyKey("÷")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "÷")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("7")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "7")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("8")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "8")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("9")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "9")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                color: "primary",
                onClick: core.pressed(this, () => this.applyKey("×")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "×")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("4")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "4")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("5")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "5")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("6")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "6")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                color: "primary",
                onClick: core.pressed(this, () => this.applyKey("–")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "–")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("1")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "1")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("2")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "2")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("3")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "3")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                color: "primary",
                onClick: core.pressed(this, () => this.applyKey("+")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "+")
            ),
            h("ui-column", { width: "8" },
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit("0")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "0")
            ),
            h("ui-column",
              h("ui-button", {
                fluid: true,
                onClick: core.pressed(this, () => this.pressDigit(".")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, ".")
            )
          )
        )
      )
    )
  }
}
export const calculator = new Calculator()
core.describeAction(Calculator, "clear", { title: "Clear It", undoneAs: "Clear It" })
core.describeAction(Calculator, "finish", { title: "Finish It", undoneAs: "Finish It" })
core.describeAction(Calculator, "pressDigit", { title: "Press Digit", undoneAs: "Press Digit" })
core.describeAction(Calculator, "applyKey", { title: "Apply Key", undoneAs: "Apply Key" })

export function testTwoSumsInARow() {
  return core.test("test two sums in a row", function testTwoSumsInARow() {
    const it = new Calculator()
    core.echoTestAction(`press "1"`)
    it.pressDigit("1")
    core.echoTestAction(`press "2"`)
    it.pressDigit("2")
    core.echoTestAction(`apply "+"`)
    it.applyKey("+")
    core.echoTestAction(`press "5"`)
    it.pressDigit("5")
    core.expect(it.output, `the output`, "= 17", `"= 17"`)
    core.echoTestAction(`apply "×"`)
    it.applyKey("×")
    core.echoTestAction(`press "2"`)
    it.pressDigit("2")
    core.expect(it.output, `the output`, "= 34", `"= 34"`)
    core.echoTestAction(`finish it`)
    it.finish()
    core.expect(it.left, `the left`, "34", `"34"`)
    core.expect(it.output, `the output`, "", `""`)
  })
}
// -----------
if (!core.isCarryingOver) calculator.start()
// -----------
if (!core.isCarryingOver) testTwoSumsInARow()
