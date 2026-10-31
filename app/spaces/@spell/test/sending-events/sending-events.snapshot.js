import { core, Thing, List, send, on } from "@spell/core"

core.heading("Events sent to things, which every target must deliver alike")
//## Events sent to things, which every target must deliver alike

export class Card extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "flips" is a number
  static { this.declareProp("flips", { type: "number" }) }
  get flips() { return this.getProp("flips") }
  set flips(value) { this.setProp("flips", value) }

  // - its "locked" is a choice
  static { this.declareProp("locked", { type: "choice" }) }
  get locked() { return this.getProp("locked") }
  set locked(value) { this.setProp("locked", value) }

  create() {
    this.flips = 0
  }

  flip() {
    this.flips = this.flips + 1
    send(this, "flipped", { side: "up" }, this)
    core.console.log(`${this.name} flipped`)
  }

  /** taken here:  its pile never hears it */
  onFlipped(event) {
    const { side } = event
    core.console.log(`${this.name} heard flipped ${side}`)
  }

  /** handed on up:  its pile hears it too */
  onPicked(event) {
    core.console.log(`${this.name} heard picked`)
    return event.pass()
  }

  onFlipsChange(event) {
    core.console.log(`${this.name} has flipped ${this.flips} times`)
  }

  /** a handler that waits:  what sends it waits for it */
  async onSlowlyFlipped(event) {
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

  onClosing(event) {
    if (this.locked) {
      core.console.log(`${this.name} won't close`)
      event.cancel()
    }
  }

  get pile() {
    return Pile.ownerOf(this)
  }
}

export class Pile extends List {
  static instanceType = Card

  onPicked(event) {
    core.console.log("the pile heard picked")
    return event.pass()
  }

  onFlipped(event) {
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
