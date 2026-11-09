/**
 * Tests of `epic pages publish` (`publish.ts`, epic `atmosphere` P9):
 * - what's said of a guide
 * - its head pointing back at its record
 * - the command end to end, against `FakeAtmosphere`
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { STANDARD_SITE_DOCUMENT, StandardSite } from "spell/places"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"
import { GuidePublish, run } from "spell/epic/tools/publish"
import { pagePath } from "spell/epic/tools/pages.js"

const OWEN = "did:plc:owen"
const PASSWORD = "abcd-efgh-ijkl-mnop"
const URI = `at://${OWEN}/site.standard.document/guides.server`

/** A guide's head, as the durable template writes it. */
const PAGE = [
  "<!doctype html>",
  '<html lang="en">',
  "  <head>",
  '    <meta charset="utf-8" />',
  "    <title>The Page &amp; Its Server</title>",
  "    <meta",
  '      name="description"',
  '      content="How the page server   works:  &quot;one&quot; per kit."',
  "    />",
  "  </head>",
  "  <body><p>Text</p></body>",
  "</html>"
].join("\n")

describe("GuidePublish", () => {
  test("says a guide's title, description and path, as plain text", () => {
    expect(GuidePublish.pageOf(PAGE, "guides/server.html", "https://spell.example")).toEqual({
      site: "https://spell.example",
      path: "/guides/server.html",
      title: "The Page & Its Server",
      description: 'How the page server works: "one" per kit.'
    })
    expect(() => GuidePublish.pageOf("<p>no title</p>", "x.html", "https://a.b")).toThrow(TypeError)
  })

  test("points the head back at the record, once:  a new address replaces the old", () => {
    const linked = GuidePublish.withLink(PAGE, URI)
    expect(linked).toContain(`    />\n    <link rel="site.standard.document" href="${URI}" />\n  </head>`)
    const again = GuidePublish.withLink(linked, `${URI}2`)
    expect(again.match(/site\.standard\.document"/g)).toHaveLength(1)
    expect(again).toContain(`href="${URI}2"`)
    expect(() => GuidePublish.withLink("<p>no head</p>", URI)).toThrow(TypeError)
  })
})

describe("epic pages publish", () => {
  let network: FakeAtmosphere
  let folder: string
  let file: string
  let out: string[]
  let errors: string[]
  const env = { ATMOSPHERE_APP_PASSWORD: PASSWORD, ATMOSPHERE_HANDLE: "owen.test" }

  beforeEach(async () => {
    network = await new FakeAtmosphere().start(["one"])
    network.addAccount(OWEN, { handle: "owen.test", host: "one", password: PASSWORD })
    folder = mkdtempSync(join(tmpdir(), "publish-"))
    file = join(folder, "server.html")
    writeFileSync(file, PAGE)
    out = []
    errors = []
    vi.spyOn(process.stdout, "write").mockImplementation((text) => out.push(`${text as string}`) > 0)
    vi.spyOn(process.stderr, "write").mockImplementation((text) => errors.push(`${text as string}`) > 0)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    rmSync(folder, { recursive: true, force: true })
    await network.close()
  })

  test("publishes the guide as a Standard.site document, and its head points back at it", async () => {
    const code = await run([file, "--site", "https://spell.example", "--json"], { network: network.network, env })

    expect(errors.join("")).toBe("")
    expect(code).toBe(0)
    const key = StandardSite.keyFor(pagePath(file))
    const held = network.recordsOf(OWEN, STANDARD_SITE_DOCUMENT).get(key)
    expect(held?.value).toMatchObject({ $type: STANDARD_SITE_DOCUMENT, title: "The Page & Its Server" })
    const said = JSON.parse(out.join("")) as { uri: string; isNew: boolean; linked: boolean }
    expect(said).toMatchObject({ uri: StandardSite.uriOf(OWEN, key), isNew: true, linked: true })
    expect(readFileSync(file, "utf8")).toContain(StandardSite.linkTagFor(said.uri))
  })

  test("--dry-run says the record, with no sign-in and nothing written", async () => {
    const code = await run([file, "--site", "https://spell.example", "--dry-run"], { network: network.network, env })
    expect(code).toBe(0)
    expect(out.join("")).toMatch(/would publish .*"title": "The Page & Its Server"/s)
    expect(network.asks).toEqual([])
    expect(readFileSync(file, "utf8")).toBe(PAGE)
  })

  test("--no-link leaves the page alone;  a wrong password fails, writing nothing", async () => {
    expect(await run([file, "--site", "https://a.example", "--no-link"], { network: network.network, env })).toBe(0)
    expect(readFileSync(file, "utf8")).toBe(PAGE)

    const wrong = { ...env, ATMOSPHERE_APP_PASSWORD: "wrong" }
    expect(await run([file, "--site", "https://a.example"], { network: network.network, env: wrong })).toBe(1)
    expect(errors.join("")).toMatch(/Invalid identifier or password/)
  })

  test("asks for what's missing:  the page, the site, the account, the password", async () => {
    const options = { network: network.network, env: {} }
    expect(await run([], options)).toBe(2)
    expect(await run([file], options)).toBe(2)
    expect(await run([file, "--site", "http://plain.example"], options)).toBe(2)
    expect(await run([file, "--site", "https://a.example"], options)).toBe(2)
    expect(await run([file, "--site", "https://a.example", "--as", "owen.test"], options)).toBe(2)
    expect(errors.join("")).toMatch(/ATMOSPHERE_APP_PASSWORD/)
    expect(network.asks).toEqual([])
  })
})
