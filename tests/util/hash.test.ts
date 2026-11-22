import { describe, expect, it } from "vite-plus/test"

import { stableHash, textHash } from "spell/util/hash"

describe("textHash()", () => {
  it("is 32 hex letters, the same for the same text", () => {
    expect(textHash("flowchart LR")).toMatch(/^[0-9a-f]{32}$/)
    expect(textHash("flowchart LR")).toBe(textHash("flowchart LR"))
    expect(textHash("flowchart LR")).not.toBe(textHash("flowchart RL"))
    expect(textHash("")).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe("stableHash()", () => {
  it("hashes objects alike whatever the order of their keys", () => {
    expect(stableHash(["code", { language: "js", drawing: true }, "x"])).toBe(
      stableHash(["code", { drawing: true, language: "js" }, "x"])
    )
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }))
  })
})
