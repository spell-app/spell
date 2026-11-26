import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import "spell/app/app/solid/cellsBridge"
import { core, h, Page, Site, View } from "spell/parser/core"
import type { Drawing } from "spell/parser/core/drawing"
import { RunSiteHost } from "spell/app/app/run/RunSiteHost"

/**
 * The run page's site host in a real browser, its real history (epic P22):  a page's tabs in its address, and the
 * dialog open in its hash, through Back and Forward.
 * - The site under its own base, the test page's address followed by `/site`;  the address is put back after each.
 */

/** A page with sections:  its tab is its `section`, a text parameter its address may leave out. */
class AccountPage extends Page {
  static {
    this.declareProp("section", { type: "text" })
  }
  get section() {
    return this.getProp("section") as string | undefined
  }
  set section(value) {
    this.setProp("section", value)
  }
  draw(): Drawing {
    return h("h1", null, () => `Account ${this.section ?? ""}`) as unknown as Drawing
  }
}

/** A dialog's view. */
class ConfirmView extends View {
  draw(): Drawing {
    return h("p", null, "Confirm?") as unknown as Drawing
  }
}

/** The site:  the account page, its sections in its address, and a dialog. */
class Shop extends Site {
  static pages = [
    { name: "account page", page: "AccountPage", address: "/account/:section?", title: "Account", params: ["section"] }
  ]
  static dialogs = [{ name: "confirm order dialog", view: "ConfirmView" }]
}

let started: string
let base: string
let box: HTMLElement
let dispose: (() => void) | undefined
let account: AccountPage
let site: Shop

beforeEach(() => {
  started = `${location.pathname}${location.search}${location.hash}`
  base = `${location.pathname.replace(/\/+$/, "")}/site`
  core.resetRuntime()
  core.things.addClass(ConfirmView)
  account = new AccountPage()
  account.section = "profile"
  box = document.createElement("div")
  document.body.append(box)
})

afterEach(() => {
  dispose?.()
  dispose = undefined
  box.remove()
  core.siteHost = undefined
  history.replaceState(null, "", started)
})

/** Start the site at `address` under its base, as the run page does. */
async function startAt(address: string): Promise<void> {
  history.pushState(null, "", `${base}${address}`)
  const host = new RunSiteHost(base, box)
  core.siteHost = host
  site = new Shop()
  void site.showAddress(host.address(site))
  host.listen((address) => site.showAddress(address))
  dispose = render(() => core.drawThing(site) as never, box)
  await settled()
}

/** Wait for the history step, the site's answer to it, and its drawing. */
async function settled(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20))
    flush()
  }
}

/** Go back, or forward, and wait for the site to follow. */
async function step(go: () => void): Promise<void> {
  const popped = new Promise((resolve) => addEventListener("popstate", resolve, { once: true }))
  go()
  await popped
  await settled()
}

/** The site's address now, after its base, with its hash. */
function here(): string {
  return `${location.pathname.slice(base.length) || "/"}${location.hash}`
}

describe("a page's tab in its address", () => {
  test("picked:  the address changes, a step in the history;  Back and Forward pick it again", async () => {
    await startAt("/account")
    expect(box.querySelector("h1")?.textContent).toBe("Account profile")
    const drawn = box.querySelector("h1")
    account.section = "api-keys"
    await settled()
    expect(here()).toBe("/account/api-keys")
    account.section = "team"
    await settled()
    expect(here()).toBe("/account/team")
    await step(() => history.back())
    expect(account.section).toBe("api-keys")
    expect(box.querySelector("h1")?.textContent).toBe("Account api-keys")
    // the same drawing:  the page wasn't drawn again
    expect(box.querySelector("h1")).toBe(drawn)
    await step(() => history.back())
    expect(account.section).toBe("profile")
    await step(() => history.forward())
    expect(account.section).toBe("api-keys")
  })

  test("opened at a tab's address:  that tab", async () => {
    await startAt("/account/team")
    expect(account.section).toBe("team")
    expect(box.querySelector("h1")?.textContent).toBe("Account team")
  })
})

describe("a dialog in the hash", () => {
  test("opened:  its hash, a step;  Back closes it, Forward opens it;  closed:  the hash goes, no step left", async () => {
    await startAt("/account")
    core.showSitePart("confirm order dialog")
    await settled()
    expect(here()).toBe("/account#confirm-order")
    expect(box.querySelector("ui-modal")?.textContent).toBe("Confirm?")
    await step(() => history.back())
    expect(here()).toBe("/account")
    expect(box.querySelector("ui-modal")).toBeNull()
    await step(() => history.forward())
    expect(box.querySelector("ui-modal")?.textContent).toBe("Confirm?")
    // closed by the program, or its x:  its step taken back
    const length = history.length
    core.closeSitePart("confirm order dialog")
    await settled()
    expect(here()).toBe("/account")
    expect(box.querySelector("ui-modal")).toBeNull()
    expect(history.length).toBe(length)
  })

  test("a page opened at its hash opens it;  a hash naming none is left to land on", async () => {
    await startAt("/account/team#confirm-order")
    expect(account.section).toBe("team")
    expect(box.querySelector("ui-modal")?.textContent).toBe("Confirm?")
    dispose?.()
    dispose = undefined
    await startAt("/account#billing-history")
    expect(box.querySelector("ui-modal")).toBeNull()
  })
})
