import { describe, expect, it } from "vite-plus/test"

import { E } from "spell/ui/core"

describe("AddressParameter.textIn()", () => {
  it("reads a query parameter, or the hash, decoded;  none is `undefined`", () => {
    const url = new URL("https://example.com/run/x?s=van+gogh&server=met#second%20tab")
    expect(E.AddressParameter.textIn(url, { parameter: "s" })).toBe("van gogh")
    expect(E.AddressParameter.textIn(url, { parameter: "q" })).toBeUndefined()
    expect(E.AddressParameter.textIn(url, { hash: true })).toBe("second tab")
    expect(E.AddressParameter.textIn(new URL("https://example.com/"), { hash: true })).toBeUndefined()
  })
})

describe("AddressParameter.hrefWith()", () => {
  const url = new URL("https://example.com/run/x?server=met#top")

  it("sets its parameter, keeping the others and the hash", () => {
    expect(E.AddressParameter.hrefWith(url, { parameter: "s" }, "van gogh")).toBe(
      "https://example.com/run/x?server=met&s=van+gogh#top"
    )
  })

  it("takes its parameter out for an empty value", () => {
    expect(E.AddressParameter.hrefWith(url, { parameter: "server" }, "")).toBe("https://example.com/run/x#top")
    expect(E.AddressParameter.hrefWith(url, { parameter: "server" }, undefined)).toBe("https://example.com/run/x#top")
  })

  it("sets the hash, keeping the query", () => {
    expect(E.AddressParameter.hrefWith(url, { hash: true }, "second")).toBe(
      "https://example.com/run/x?server=met#second"
    )
  })
})
