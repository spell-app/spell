import { core, App, h } from "@spell/core"

export class WeekendCountdown extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

  everySecond() {
    this.time = core.now()
  }

  get isTheWeekend() {
    return core.isWeekendDay(this.time)
  }

  get timeLeft() {
    return core.secondsBetween(core.nextWeekend(), this.time)
  }

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
