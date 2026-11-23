import { core, App, h } from "@spell/core"

core.heading("Weekend Countdown")
///////////////////////
// ## Weekend Countdown
///////////////////////
// How long until the weekend:  days, hours, minutes and seconds, ticking down every second.

export class WeekendCountdown extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** This moment:  set again every second, so the countdown redraws */
  // - its "time" is a date
  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

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
  draw() {
    return h("ui-container", { width: "32em" },
      h("ui-segment", { padding: "lg" },
        () => core.drawIf(() => this.isTheWeekend, () => [h("ui-header", "It's the weekend!")], () => [
          h("ui-text", { color: "grey" }, "Weekend starts in"),
          h("ui-statistics", { equal: true, size: "small" },
            h("ui-statistic", { value: () => core.durationPartOf(this.timeLeft, "days"), label: "Days" }),
            h("ui-statistic", { value: () => core.twoDigits(core.durationPartOf(this.timeLeft, "hours")), label: "Hr" }),
            h("ui-statistic", { value: () => core.twoDigits(core.durationPartOf(this.timeLeft, "minutes")), label: "Min" }),
            h("ui-statistic", { value: () => core.twoDigits(core.durationPartOf(this.timeLeft, "seconds")), label: "Sec" })
          )
        ])
      )
    )
  }
}
export const weekendCountdown = new WeekendCountdown()
core.addTimer(WeekendCountdown, "everySecond", { seconds: 1 })
// -----------
if (!core.isCarryingOver) weekendCountdown.start()
