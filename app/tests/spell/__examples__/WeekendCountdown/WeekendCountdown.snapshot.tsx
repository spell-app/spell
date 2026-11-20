import { core, App, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Weekend Countdown")
///////////////////////
// ## Weekend Countdown
///////////////////////
// How long until the weekend:  days, hours, minutes and seconds, ticking down every second.

export class WeekendCountdown extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** This moment:  set again every second, so the countdown redraws */
  // - its "time" is a date
  @prop({ type: "date" })
  accessor time!: Date

  everySecond() {
    this.time = core.now()
  }

  /** Saturday and Sunday in most places:  the person's region says */
  get isTheWeekend() {
    return core.isWeekendDay(this.time)
  }

  /** A duration:  2 days, 3 hours, 4 minutes and 5 seconds */
  get timeLeft() {
    return core.secondsBetween(core.nextWeekend(), this.time)
  }

  /** The days, hours, minutes and seconds left, side by side;  on the weekend, a cheer instead */
  @drawn draw() {
    return (
      <ui-container width="32em">
        <ui-segment padding="lg">
          <ui-header hidden={this.isTheWeekend ? undefined : true}>It's the weekend!</ui-header>
          <ui-text color="grey" hidden={!this.isTheWeekend ? undefined : true}>Weekend starts in</ui-text>
          <ui-statistics equal={true} size="small" hidden={!this.isTheWeekend ? undefined : true}>
            <ui-statistic value={core.durationPartOf(this.timeLeft, "days")} label="Days" />
            <ui-statistic value={core.twoDigits(core.durationPartOf(this.timeLeft, "hours"))} label="Hr" />
            <ui-statistic value={core.twoDigits(core.durationPartOf(this.timeLeft, "minutes"))} label="Min" />
            <ui-statistic value={core.twoDigits(core.durationPartOf(this.timeLeft, "seconds"))} label="Sec" />
          </ui-statistics>
        </ui-segment>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a weekend countdown, drawn in its own element, e.g. by `draw the weekend countdown`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its weekend countdown's properties;  its methods call its weekend countdown's.
 * - What every view's element does, e.g. drawing its weekend countdown, is `SpellElement`'s.
 */
export class WeekendCountdownElement extends SpellElement<WeekendCountdown> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "weekend countdown", [
    { name: "time", kind: "string", description: "Its time." }
  ])

  everySecond() {
    return this.currentThing?.everySecond()
  }
}
core.useElement(WeekendCountdown, WeekendCountdownElement)
export const weekendCountdown = new WeekendCountdown()
core.addTimer(WeekendCountdown, "everySecond", { seconds: 1 })
// -----------
if (!core.isCarryingOver) weekendCountdown.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `WeekendCountdownElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
