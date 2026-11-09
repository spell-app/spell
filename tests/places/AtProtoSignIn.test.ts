import { describe, expect, it } from "vite-plus/test"

import { handleFor } from "spell/places/AtProtoSignIn"

describe("handleFor()", () => {
  it("drops spaces and a leading @", () => {
    expect(handleFor("  @ana.bsky.social ")).toBe("ana.bsky.social")
  })

  it("turns an @ in the middle into a dot, as people type Spell's own accounts", () => {
    expect(handleFor("spell-test@bsky.social")).toBe("spell-test.bsky.social")
    expect(handleFor("@spell-test@bsky.social")).toBe("spell-test.bsky.social")
  })

  it("leaves a right handle and a DID alone", () => {
    expect(handleFor("ana.bsky.social")).toBe("ana.bsky.social")
    expect(handleFor("did:plc:b3rsxwuc42xbzhgmg7dfiyz6")).toBe("did:plc:b3rsxwuc42xbzhgmg7dfiyz6")
  })
})
