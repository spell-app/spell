import { core, App, View, h } from "@spell/core"

core.heading("Counter")
/////////////
// ## Counter
/////////////
// A button that counts its clicks:  the smallest app there is.

core.heading("A counter")
///////////////
// ## A counter
///////////////
// Each counter is its own element on the page.

export class Counter extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** How many times it's been clicked:  a new counter starts at 0 */
  // - its "count" is a number starting at 0
  static { this.declareProp("count", { type: "number", init: () => 0 }) }
  get count() { return this.getProp("count") }
  set count(value) { this.setProp("count", value) }

  countUp() {
    this.count = this.count + 1
  }

  /** A button saying how many times it's been clicked:  a click counts up */
  draw() {
    return h("ui-button", {
      onClick: core.pressed(this, () => this.countUp()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    }, "Clicked ", () => this.count, " times")
  }
}

export function testCounting() {
  return core.test("test counting", function testCounting() {
    const it = new Counter()
    core.echoTestAction(`set the counter to a new counter`)
    const counter = new Counter()
    core.expect(counter.count, `the counter's count`, 0, `0`)
    core.echoTestAction(`count up of the counter`)
    counter.countUp()
    core.echoTestAction(`count up of the counter`)
    counter.countUp()
    core.expect(counter.count, `the counter's count`, 2, `2`)
  })
}

core.heading("The app:  one counter, drawn")
//## The app:  one counter, drawn

export class CounterApp extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "counter" is a new counter
  static { this.declareProp("counter", { init: () => new Counter(), early: true }) }
  get counter() { return this.getProp("counter") }
  set counter(value) { this.setProp("counter", value) }

  draw() {
    return h("ui-container", () => core.drawThing(this.counter))
  }
}
export const counterApp = new CounterApp()
// -----------
if (!core.isCarryingOver) counterApp.start()
// -----------
if (!core.isCarryingOver) testCounting()
