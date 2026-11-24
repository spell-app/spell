import { describe, expect, test } from "vite-plus/test"

import { SiteCheck } from "spell/ui/tools/SiteCheck"

/** A site file's lines, as the Spell UI site writes them. */
const SITE_TEXT = `spell ui is a site
	it has a home page at "/", named "Spell UI", thumbnail "snapshots/home.jpg"
	it has an icons page at "/icons", named "Icons"
	it has a button usage page at "/button", named "Button", tab "Usage", tagged "Basic"
		it has a button examples page at "/button/examples", named "Examples"
`

describe("SiteCheck.addressesIn()", () => {
  test("every page's address, in the file's order", () => {
    expect(SiteCheck.addressesIn(SITE_TEXT)).toEqual(["/", "/icons", "/button", "/button/examples"])
  })
})

describe("SiteCheck.resolveAddress()", () => {
  const known = SiteCheck.addressesIn(SITE_TEXT)

  test.each([
    ["/button/examples", "/button/examples"],
    ["button/examples", "/button/examples"],
    ["ui-button", "/button"],
    ["home", "/"],
    ["/", "/"]
  ])("%s => %s", (name, address) => {
    expect(SiteCheck.resolveAddress(name, known)).toBe(address)
  })

  test("a page the site doesn't have throws, naming it", () => {
    expect(() => SiteCheck.resolveAddress("ui-nothing", known)).toThrow(/no page "ui-nothing"/)
  })
})

describe("SiteCheck.shotNameFor()", () => {
  test("the address as a file name", () => {
    expect(SiteCheck.shotNameFor("/")).toBe("home")
    expect(SiteCheck.shotNameFor("/button/examples")).toBe("button-examples")
  })
})

describe("SiteCheck.pageUrl()", () => {
  test("the page server's address of a site page, under the site's address", () => {
    expect(SiteCheck.pageUrl("http://127.0.0.1:47431", "/button/api")).toBe(
      "http://127.0.0.1:47431/components/ui/button/api"
    )
    expect(SiteCheck.pageUrl("http://127.0.0.1:47431/", "/")).toBe("http://127.0.0.1:47431/components/ui/")
  })
})

describe("SiteCheck.jobsFor()", () => {
  test("a whole number, 1 or more", () => {
    expect(SiteCheck.jobsFor("4")).toBe(4)
    expect(() => SiteCheck.jobsFor("0")).toThrow(/--jobs/)
    expect(() => SiteCheck.jobsFor("two")).toThrow(/--jobs/)
  })
})
