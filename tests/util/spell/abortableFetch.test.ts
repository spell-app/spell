import { describe, test, expect } from "vite-plus/test"

import { abortableFetch } from "spell/util/spell/abortableFetch"

describe("abortableFetch()", () => {
  test("a failed fetch rejects only the promise it returns:  nothing else goes unhandled (epic `epic-engine` I294)", async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on("unhandledRejection", onUnhandled)
    try {
      const failing = (() => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch
      await expect(abortableFetch("/api/x", {}, failing)).rejects.toThrow("Failed to fetch")
      // node reports an unhandled rejection a turn after it happens
      await new Promise((settled) => setTimeout(settled, 20))
      expect(unhandled).toEqual([])
    } finally {
      process.off("unhandledRejection", onUnhandled)
    }
  })

  test("`cancel()` after the fetch ended does nothing", async () => {
    const answering = (() => Promise.resolve(new Response("ok"))) as unknown as typeof fetch
    const promise = abortableFetch("/api/x", {}, answering)
    await promise
    expect(() => promise.cancel()).not.toThrow()
  })
})
