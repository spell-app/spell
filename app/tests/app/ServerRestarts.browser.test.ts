import { describe, expect, test } from "vite-plus/test"

import { ServerRestarts } from "spell/app/app/ServerRestarts"

/** The live channel saying the page server went away, or came back. */
const say = (event: "down" | "up") => dispatchEvent(new Event(`spell-server:${event}`))

/**
 * Whether the page server is there, as the live channel says (epic `editor` T177):
 * what AutoSave couldn't keep while Spell restarted waits for it to come back.
 */
describe("ServerRestarts", () => {
  ServerRestarts.follow()

  test("down, then back:  what waits for it goes on once it's back;  at once while it's there", async () => {
    expect(ServerRestarts.isDown).toBe(false)
    await ServerRestarts.whenBack()
    say("down")
    expect(ServerRestarts.isDown).toBe(true)
    let isBack = false
    const waiting = ServerRestarts.whenBack().then(() => (isBack = true))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(isBack).toBe(false)
    say("up")
    await waiting
    expect(ServerRestarts.isDown).toBe(false)
  })

  test("wentDown():  a request that just failed counts the socket closing a moment after", async () => {
    const going = ServerRestarts.wentDown(500)
    setTimeout(() => say("down"), 50)
    expect(await going).toBe(true)
    say("up")
    expect(await ServerRestarts.wentDown(50)).toBe(false)
  })
})
