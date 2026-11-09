import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { Page } from "playwright"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { BrowserPage } from "spell/element-tools/BrowserPage"
import { CLI } from "spell/cli"
import { placeIngest, placeUpdate } from "spell/parser/cli/placeIngest"
import { placeReadPage, placeSignIn, samplesFileFor } from "spell/parser/cli/placeSignIn"
import { FAKE_SESSION_SECRET, FakeSignedInSite } from "spell/parser/spell/test/FakeSignedInSite"

/**
 * `spell place sign-in`, reading as you, and rows off a page, against a made-up site that wants a cookie (epic `mockup` P12).
 * - The window is really a browser, scripted and headless here;  a person's is `BrowserPage.launchVisible()`.
 */

let site: FakeSignedInSite
let folder: string
let said: string[]

beforeAll(async () => {
  site = await new FakeSignedInSite().start()
})
afterAll(() => site.stop())

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "place-sign-in-"))
  vi.stubEnv("SPELL_PLACE_SESSIONS_DIR", join(folder, "sessions"))
  said = []
  vi.spyOn(CLI, "out").mockImplementation((line: string) => void said.push(line))
  vi.spyOn(CLI, "err").mockImplementation((line: string) => void said.push(line))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  rmSync(folder, { recursive: true, force: true })
})

/** Sign in to the fake site, as a person would in the window. */
async function signIn(): Promise<void> {
  const finished = async (page: Page) => {
    await page.click("#sign-in")
    await page.waitForURL(`${site.address}/`)
  }
  await placeSignIn("fake", `${site.address}/login`, { launch: () => BrowserPage.launch(), finished })
}

/** Every file this test wrote, outside the session's own folder:  none may hold the session. */
function writtenFiles(): string[] {
  return readdirSync(folder)
    .filter((name) => name !== "sessions")
    .map((name) => join(folder, name))
}

describe("signing in", () => {
  test("keeps the session privately, and never says what it is", async () => {
    await signIn()
    const file = join(folder, "sessions", "fake.json")
    expect(statSync(file).mode & 0o777).toBe(0o600)
    expect(readFileSync(file, "utf8")).toContain(FAKE_SESSION_SECRET)
    expect(said.join("\n")).toContain("Signed in to fake")
    expect(said.join("\n")).not.toContain(FAKE_SESSION_SECRET)
  }, 60_000)

  test("signing in again needs no address;  with no address ever, it asks for one", async () => {
    await expect(placeSignIn("never")).rejects.toThrow("spell place sign-in never <address>")
  })

  test("nothing set, nothing kept", async () => {
    await expect(
      placeSignIn("fake", `${site.address}/login`, { launch: () => BrowserPage.launch(), finished: async () => {} })
    ).rejects.toThrow("No sign-in to keep")
  }, 60_000)
})

describe("reading as you", () => {
  const ingest = (into: string) =>
    placeIngest(`${site.address}/api`, {
      into,
      kind: "web server",
      collections: "racks=/racks",
      signedIn: "fake",
      name: "racks place",
      ai: false
    })

  test("writes what it read, the session taken out, and says it was signed in;  a session that's over says so", async () => {
    await signIn()
    const into = join(folder, "Racks.api.spell")
    await ingest(into)
    for (const file of writtenFiles()) expect(readFileSync(file, "utf8")).not.toContain(FAKE_SESSION_SECRET)
    expect(said.join("\n")).not.toContain(FAKE_SESSION_SECRET)
    const description = readFileSync(join(folder, "Racks.api.json5"), "utf8")
    expect(description).toContain('"signedIn": "fake"')
    expect(description).toContain("no session of its own")
    // looking again reads as the same session
    await placeUpdate(into, { ai: false })
    site.endSessions()
    await expect(placeUpdate(into, { ai: false })).rejects.toThrow(
      "the session for fake has ended:  sign in again, spell place sign-in fake"
    )
    site = await restarted()
  }, 90_000)

  test("never signed in:  says how", async () => {
    await expect(ingest(join(folder, "No.api.spell"))).rejects.toThrow("fake hasn't been signed in to")
  })
})

/** The site again, its sessions good, on a new port. */
async function restarted(): Promise<FakeSignedInSite> {
  await site.stop()
  return new FakeSignedInSite().start()
}

describe("rows off a page", () => {
  test("a table's rows by its headings, kept beside the place with the session taken out", async () => {
    await signIn()
    const into = join(folder, "Racks.api.spell")
    await placeReadPage(`${site.address}/racks`, { signedIn: "fake", select: "#racks", as: "racks", into })
    const file = samplesFileFor(into, "racks")
    expect(file).toBe(join(folder, "Racks.racks.samples.json"))
    const text = readFileSync(file, "utf8")
    expect(text).not.toContain(FAKE_SESSION_SECRET)
    expect(JSON.parse(text).rows).toEqual([
      { Name: "North", "Seen as": "[its session]" },
      { Name: "South", "Seen as": "nobody" }
    ])
  }, 60_000)

  test("a list:  a row for each element, printed when it's put nowhere", async () => {
    await signIn()
    await placeReadPage(`${site.address}/notes`, { signedIn: "fake", select: "li.note" })
    expect(JSON.parse(said.at(-1)!).rows).toEqual([{ text: "One note" }, { text: "Another" }])
  }, 60_000)

  test("what matches nothing says so;  a session that's over says so", async () => {
    await signIn()
    await expect(placeReadPage(`${site.address}/notes`, { signedIn: "fake", select: "#nope" })).rejects.toThrow(
      "matches #nope"
    )
    site.endSessions()
    await expect(placeReadPage(`${site.address}/notes`, { signedIn: "fake", select: "li" })).rejects.toThrow(
      "the session for fake has ended"
    )
    site = await restarted()
  }, 90_000)
})
