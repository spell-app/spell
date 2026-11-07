/**
 * The daily round (epic `atmosphere` P24):  the ONE timer for a server's daily work, each job asked in turn.
 */
import { describe, expect, test } from "vite-plus/test"

import { DailyRound } from "spell/app/spaces/server/node/routes/DailyRound"

describe("DailyRound", () => {
  test("each look runs every job in order;  one that fails is reported, and the rest still run", async () => {
    const ran: string[] = []
    const said: string[] = []
    const round = new DailyRound(
      [
        {
          name: "backup",
          run: async (report) => {
            ran.push("backup")
            report("missed a night")
          }
        },
        {
          name: "member lists",
          run: async () => {
            ran.push("member lists")
            throw new Error("the host didn't answer")
          }
        },
        { name: "digest", run: async () => void ran.push("digest") }
      ],
      { report: (text) => said.push(text) }
    )
    await round.look()
    expect(ran).toEqual(["backup", "member lists", "digest"])
    expect(said).toEqual(["missed a night", "Spell's daily member lists failed:  the host didn't answer"])
  })

  test("started, it looks at once;  stopped, it looks no more", async () => {
    let looks = 0
    const stop = new DailyRound([{ name: "count", run: async () => void looks++ }]).start()
    stop()
    await Promise.resolve()
    expect(looks).toBe(1)
  })
})
