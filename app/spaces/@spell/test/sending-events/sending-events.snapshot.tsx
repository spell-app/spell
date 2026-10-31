import { core, Thing, List, prop, thing, send, on, type SentEvent } from "@spell/core"

core.heading("Events sent to things, which every target must deliver alike")
//## Events sent to things, which every target must deliver alike

@thing
export class Card extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "flips" is a number
  @prop({ type: "number" })
  accessor flips!: number

  // - its "locked" is a choice
  @prop({ type: "choice" })
  accessor locked!: boolean

  create() {
    this.flips = 0
  }

  flip() {
    this.flips = this.flips + 1
    send(this, "flipped", { side: "up" }, this)
    core.console.log(`${this.name} flipped`)
  }

  /** taken here:  its pile never hears it */
  onFlipped(event: { side?: string }) {
    const { side } = event
    core.console.log(`${this.name} heard flipped ${side}`)
  }

  /** handed on up:  its pile hears it too */
  onPicked(event: PickedEvent) {
    core.console.log(`${this.name} heard picked`)
    return event.pass()
  }

  onFlipsChange(event: FlipsChangeEvent) {
    core.console.log(`${this.name} has flipped ${this.flips} times`)
  }

  /** a handler that waits:  what sends it waits for it */
  async onSlowlyFlipped(event: SlowlyFlippedEvent) {
    await core.pauseFor(10, "msec")
    core.console.log(`${this.name} slowly flipped`)
  }

  async flipSlowly() {
    await send(this, "slowly-flipped", {}, this)
    core.console.log(`${this.name} done slowly`)
  }

  /** an event still happening can be canceled:  the step after it doesn't run */
  async close() {
    if ((await send(this, "closing", {}, this)).canceled) return
    core.console.log(`${this.name} closed`)
  }

  onClosing(event: ClosingEvent) {
    if (this.locked) {
      core.console.log(`${this.name} won't close`)
      event.cancel()
    }
  }

  get pile() {
    return Pile.ownerOf(this)!
  }
}

export class Pile extends List<Card> {
  static instanceType = Card

  onPicked(event: PickedEvent) {
    core.console.log("the pile heard picked")
    return event.pass()
  }

  onFlipped(event: { side?: string }) {
    const { side } = event
    core.console.log("the pile heard flipped")
  }

  static exclusive = true
}

// - it sends "flipped" with side as a text
core.describeEvent(Card, "flipped", { params: { side: "text" } })


on("picked", () => core.console.log("the program heard picked"))

on("lonely", () => core.console.log("the program heard lonely"))

export async function playTheStory() {
  const it = new Pile()
  const pile = it
  const it2 = new Card({ name: "ace" })
  const ace = it2
  pile.append(it2)
  const it3 = new Card({ name: "king", locked: true })
  const king = it3

  await ace.close()
  await king.close()
  send(ace, "picked")
  send(ace, "lonely")
  send(ace, "nobody-listens")
  ace.flip()
  await ace.flipSlowly()
  core.console.log("the end")
}

core.holdWhile(() => playTheStory())

// what each event this program hears holds
export type FlippedEvent = SentEvent & { side: string }
export type PickedEvent = SentEvent
export type FlipsChangeEvent = SentEvent & { value: number; was: number }
export type SlowlyFlippedEvent = SentEvent
export type ClosingEvent = SentEvent

