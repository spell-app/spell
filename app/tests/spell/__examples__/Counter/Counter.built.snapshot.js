import { core, App, View, h } from "@spell/core"

export class Counter extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("count", { type: "number", init: () => 0 }) }
  get count() { return this.getProp("count") }
  set count(value) { this.setProp("count", value) }

  countUp() {
    this.count = this.count + 1
    core.play("click")
  }

  draw() {
    return h("ui-button", {
      size: "huge",
      color: "primary",
      onClick: core.pressed(this, () => this.countUp()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    }, "Clicked ", () => this.count, " times")
  }
}
core.describeAction(Counter, "countUp", { title: "Count Up", undoneAs: "Count Up" })

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

export class CounterApp extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("counter", { init: () => new Counter({ id: "counter" }), early: true }) }
  get counter() { return this.getProp("counter") }
  set counter(value) { this.setProp("counter", value) }

  draw() {
    return h("ui-container", h("ui-stack", { align: "center" }, () => core.drawThing(this.counter)))
  }
}
export const counterApp = new CounterApp()
// -----------
if (!core.isCarryingOver) counterApp.start()
// -----------
if (!core.isCarryingOver) testCounting()
