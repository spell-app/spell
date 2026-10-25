import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { clockTime, compactTime, localDate, localMidnight, localMinutes, localTime } from "spell/util/time"

/**
 * Run in node, not the browser (`util:node`, the kit's `vitest.config.ts`):
 * only node lets a test set the time zone (`process.env.TZ`).
 */

/** 9pm on 2026-10-25 in California (PDT, -07:00):  already 2026-10-26 in UTC. */
const EVENING_IN_CALIFORNIA = new Date("2026-10-26T04:05:09Z")

describe("time in California, 9pm", () => {
  let zone: string | undefined
  beforeEach(() => {
    zone = process.env.TZ
    process.env.TZ = "America/Los_Angeles"
    vi.useFakeTimers()
    vi.setSystemTime(EVENING_IN_CALIFORNIA)
  })
  afterEach(() => {
    vi.useRealTimers()
    if (zone === undefined) delete process.env.TZ
    else process.env.TZ = zone
  })

  test("localDate() is today, not tomorrow", () => {
    expect(new Date().getHours()).toBe(21)
    expect(localDate()).toBe("2026-10-25")
  })

  test("the bug it replaces:  the UTC date is already tomorrow", () => {
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-10-26")
  })

  test("the clock and the stamps are local, with their offset", () => {
    expect(clockTime()).toBe("21:05")
    expect(compactTime()).toBe("20261025-2105")
    expect(localTime()).toBe("2026-10-25T21:05:09-07:00")
    expect(localMinutes()).toBe("2026-10-25T21:05-07:00")
  })

  test("localMidnight() is the start of that day, here", () => {
    expect(localMidnight("2026-10-25").toISOString()).toBe("2026-10-25T07:00:00.000Z")
  })
})

describe("time east of UTC", () => {
  test("a half-hour offset is written whole", () => {
    const zone = process.env.TZ
    process.env.TZ = "Asia/Kolkata"
    try {
      expect(localMinutes(new Date("2026-10-25T10:00:00Z"))).toBe("2026-10-25T15:30+05:30")
    } finally {
      if (zone === undefined) delete process.env.TZ
      else process.env.TZ = zone
    }
  })
})
