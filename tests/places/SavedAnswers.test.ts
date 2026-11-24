import { describe, expect, test } from "vite-plus/test"

import { answerFromSaved, answerScrubber, isOffline, savedAnswerPath } from "spell/places"

/**
 * A web server's answers, saved as files, for when it can't be reached:  where each goes, how a saved list answers a
 * question, and what's scrubbed before it's written.
 */
describe("saved answers", () => {
  test("one file an address, by its path:  its question is only how it was asked", () => {
    expect(savedAnswerPath("/api/jobs?limit=20&offset=40")).toBe("api/jobs.json")
    expect(savedAnswerPath("/api/jobs/j-1")).toBe("api/jobs/j-1.json")
    expect(savedAnswerPath("/api/jobs/")).toBe("api/jobs.json")
    expect(savedAnswerPath("/api/%2e%2e/secrets")).toBeUndefined()
    expect(savedAnswerPath("/")).toBeUndefined()
  })

  test("a saved list is picked by a field its rows hold, then paged by limit and offset, so a read stops", () => {
    const rows = JSON.stringify([
      { id: 1, status: "open" },
      { id: 2, status: "shut" },
      { id: 3, status: "open" }
    ])
    const ask = (query: string) => JSON.parse(answerFromSaved(rows, new URLSearchParams(query)))
    expect(ask("status=open").map(({ id }: { id: number }) => id)).toEqual([1, 3])
    expect(ask("limit=2&offset=0").map(({ id }: { id: number }) => id)).toEqual([1, 2])
    expect(ask("limit=2&offset=2").map(({ id }: { id: number }) => id)).toEqual([3])
    expect(ask("limit=2&offset=4")).toEqual([])
    // a question no row has a field for is only how it was asked
    expect(answerFromSaved(rows, new URLSearchParams("sort=name"))).toBe(rows)
  })

  test("a list inside an object is paged in place, the rest kept", () => {
    const wrapped = JSON.stringify({ items: [{ id: 1 }, { id: 2 }], total: 2 })
    expect(JSON.parse(answerFromSaved(wrapped, new URLSearchParams("limit=1&offset=1")))).toEqual({
      items: [{ id: 2 }],
      total: 2
    })
  })

  test("offline:  every path, or the ones listed and what's under them", () => {
    expect(isOffline("/api/jobs", true)).toBe(true)
    expect(isOffline("/api/jobs", undefined)).toBe(false)
    expect(isOffline("/api/reports/r-1/lines?x=1", ["/api/reports"])).toBe(true)
    expect(isOffline("/api/reportsx", ["/api/reports"])).toBe(false)
  })

  test("scrubbed:  a field named like a secret, a JWT, a sign-in, a key, a secret sent, and each email a stand-in", () => {
    const scrub = answerScrubber(["sent-secret-1234"])
    const jwt = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.c2ln"
    const scrubbed = scrub.value({
      name: "Ada",
      api_key: "abc",
      session_id: "s-1",
      note: `Bearer abcdefgh12345678 and ${jwt} and sent-secret-1234`,
      owner: "ada@lab.test",
      reviewer: "ADA@lab.test",
      other: "bo@lab.test",
      fingerprint: "k1Q2x3Z4e5F6a1B2c3D4e5F6m1N2c3D4e5F6a1B2r3T4",
      commit: "0123456789abcdef0123456789abcdef01234567",
      rows: [{ cookie: "c=1" }]
    })
    expect(scrubbed).toEqual({
      api_key: "[scrubbed]",
      commit: "0123456789abcdef0123456789abcdef01234567",
      fingerprint: "[scrubbed]",
      name: "Ada",
      note: "Bearer [scrubbed] and [scrubbed] and [scrubbed]",
      // in the order seen, the keys sorted
      other: "person-1@example.invalid",
      owner: "person-2@example.invalid",
      reviewer: "person-2@example.invalid",
      rows: [{ cookie: "[scrubbed]" }],
      session_id: "s-1"
    })
    expect(Object.keys(scrubbed as object)).toEqual([...Object.keys(scrubbed as object)].sort())
  })
})
