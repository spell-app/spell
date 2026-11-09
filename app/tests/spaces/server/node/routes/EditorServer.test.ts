import { describe, expect, test, vi } from "vite-plus/test"

import { steadyPort } from "spell/app/spaces/server/node/routes/EditorServer"

/** A port check where `held` ports are taken. */
const freeExcept =
  (...held: number[]) =>
  (port: number) =>
    Promise.resolve(!held.includes(port))

describe("steadyPort():  the house site's editor keeps its port, so Caddy's file doesn't change (epic `atmosphere` P39)", () => {
  const noWait = () => Promise.resolve()

  test("the wanted port, when it's free, without waiting", async () => {
    const wait = vi.fn(noWait)
    expect(await steadyPort(3000, freeExcept(), wait)).toBe(3000)
    expect(wait).not.toHaveBeenCalled()
  })

  test("waits for the last editor to let go of it", async () => {
    let looks = 0
    const freeOnThirdLook = () => Promise.resolve(++looks >= 3)
    expect(await steadyPort(3000, freeOnThirdLook, noWait)).toBe(3000)
  })

  test("held for good:  the same spare port every time", async () => {
    const isFree = freeExcept(3000, 3001)
    expect(await steadyPort(3000, isFree, noWait)).toBe(3002)
    expect(await steadyPort(3000, isFree, noWait)).toBe(3002)
  })

  test("nothing free nearby:  says so", async () => {
    expect(await steadyPort(3000, () => Promise.resolve(false), noWait)).toBeUndefined()
  })
})
