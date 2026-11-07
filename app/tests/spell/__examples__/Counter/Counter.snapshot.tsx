import { core, App, View, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Counter")
/////////////
// ## Counter
/////////////
// A button that counts its clicks:  the smallest app there is.
// The Counter notebook, `@spell/notebooks/Counter`, draws its own and tries it out.

core.heading("A counter")
///////////////
// ## A counter
///////////////
// Each counter is its own element on the page.

export class Counter extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** How many times it's been clicked:  a new counter starts at 0 */
  // - its "count" is a number starting at 0
  @prop({ type: "number", init: () => 0 })
  accessor count!: number

  countUp() {
    this.count = this.count + 1
  }

  /** A button saying how many times it's been clicked:  a click counts up */
  @drawn draw() {
    return (
      <ui-button onClick={core.pressed(this, () => this.countUp())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {"Clicked "}
        {this.count}
        {" times"}
      </ui-button>
    )
  }
}

/**
 * `<test-project-counter>`:  a counter, drawn in its own element, e.g. by `draw the counter`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its counter's properties;  its methods call its counter's.
 * - What every view's element does, e.g. drawing its counter, is `SpellElement`'s.
 */
export class CounterElement extends SpellElement<Counter> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-counter", "counter", [
    { name: "count", kind: "number", description: "Its count." }
  ])

  countUp() {
    return this.currentThing?.countUp()
  }
}
core.useElement(Counter, CounterElement)

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
  @prop({ init: () => new Counter(), early: true })
  accessor counter!: Counter

  @drawn draw() {
    return <ui-container>{core.drawThing(this.counter)}</ui-container>
  }
}

/**
 * `<test-project-app>`:  a counter app, drawn in its own element, e.g. by `draw the counter app`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its counter app's properties;  its methods call its counter app's.
 * - What every view's element does, e.g. drawing its counter app, is `SpellElement`'s.
 */
export class CounterAppElement extends SpellElement<CounterApp> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "counter app", [
    { name: "counter", kind: "json", description: "Its counter." }
  ])
}
core.useElement(CounterApp, CounterAppElement)
export const counterApp = new CounterApp()
// -----------
if (!core.isCarryingOver) counterApp.start()
// -----------
if (!core.isCarryingOver) testCounting()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CounterElement` */
      "test-project-counter": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `CounterAppElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
