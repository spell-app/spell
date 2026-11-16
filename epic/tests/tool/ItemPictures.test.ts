/**
 * Tests of `ItemPictures` (epic `epic-engine` T87) on a scratch checkout:
 * - `add <epic> <kind> --picture <file>` and `--pasted <n>`, through the command line (`PlanDocCommands`)
 * - the review routes' `POST delete-picture`, on a real page server, over HTTP
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"

import type { PastedImage } from "spell/epic/command/command.types"
import { ItemPictures } from "spell/epic/tool/ItemPictures"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import reviewRoutes from "spell/epic/tool/reviewRoutes"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "item-pictures-"))
const FILES = new PlanDocFiles({ root })
const file = join(root, "epics", "x", "x.plan.html")
const folder = join(root, "epics", "x")

/** A picture's bytes:  a PNG's first eight, then `tag`. */
function png(tag: string): Buffer {
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(tag)])
}

/** What the commands printed. */
let printed: string[]

/** The pictures "pasted into the chat", newest last, as the transcript reader would give them. */
let pasted: PastedImage[]

/** The commands, on the scratch checkout, their output caught, the chat's pictures `pasted`. */
function commands() {
  const owner = new PlanDocCommands({
    files: FILES,
    pastedReader: async (_session, count) => pasted.slice(-count)
  })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
  vi.spyOn(owner, "warn").mockImplementation((text) => void printed.push(text))
  return owner
}

/** The `<img src>`s item `id` shows in `<epic-picture>`s. */
function picturesOf(id: string): string[] {
  const item = FILES.read(file).findItem(id)!
  return Array.from(item.querySelectorAll("epic-picture > img"), (img) => img.getAttribute("src")!)
}

beforeEach(() => {
  printed = []
  pasted = []
  rmSync(join(root, "epics"), { recursive: true, force: true })
  mkdirSync(folder, { recursive: true })
  writeFileSync(file, PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8")).toString())
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("add with the person's pictures", () => {
  test("--picture, twice:  each copied into pictures/ beside the page, shown after the item's words", async () => {
    writeFileSync(join(root, "one.png"), png("one"))
    writeFileSync(join(root, "two.JPEG"), png("two"))
    const argv = ["add", "x", "issue", "The menu covers the title", "--details", "<p>It does.</p>"]
    argv.push("--picture", join(root, "one.png"), "--picture", join(root, "two.JPEG"))
    expect(await commands().run(argv)).toBe(0)
    expect(printed).toEqual(["I1"])
    const shown = picturesOf("i1")
    expect(shown).toHaveLength(2)
    expect(shown[0]).toMatch(/^pictures\/i1-\d{8}-\d{4}\.png$/)
    expect(shown[1]).toMatch(/^pictures\/i1-\d{8}-\d{4}\.jpg$/)
    expect(readFileSync(join(folder, shown[0]!))).toEqual(png("one"))
    expect(readFileSync(join(folder, shown[1]!))).toEqual(png("two"))
    // after the words, never instead of them
    const item = FILES.read(file).findItem("i1")!
    expect(item.querySelector(":scope > p")?.textContent).toBe("It does.")
    expect(item.querySelector("epic-picture img")?.getAttribute("alt")).toBe("one.png")
  })

  test("--pasted 2:  the two pictures pasted LAST, oldest first;  with --start, after the person's words", async () => {
    pasted = [
      { mediaType: "image/png", data: png("old").toString("base64") },
      { mediaType: "image/png", data: png("a").toString("base64") },
      { mediaType: "image/webp", data: png("b").toString("base64") }
    ]
    const argv = ["add", "x", "todo", "Show the picture", "--start", "include the picture", "--pasted", "2"]
    expect(await commands().run(argv)).toBe(0)
    const shown = picturesOf("t1")
    expect(shown.map((src) => src.replace(/\d{8}-\d{4}/, "<time>"))).toEqual([
      "pictures/t1-<time>.png",
      "pictures/t1-<time>.webp"
    ])
    expect(readFileSync(join(folder, shown[0]!))).toEqual(png("a"))
    expect(readFileSync(join(folder, shown[1]!))).toEqual(png("b"))
    const item = FILES.read(file).findItem("t1")!
    expect(item.textContent).toMatch(/include the picture/)
    expect(item.querySelector("epic-picture img")?.getAttribute("alt")).toBe("Picture pasted in the chat")
  })

  test("refused, and nothing written:  a missing file, a file that isn't a picture, more pasted than there are", async () => {
    writeFileSync(join(root, "notes.txt"), "words")
    pasted = [{ mediaType: "image/png", data: png("only").toString("base64") }]
    for (const extra of [
      ["--picture", join(root, "nope.png")],
      ["--picture", join(root, "notes.txt")],
      ["--pasted", "2"],
      ["--pasted", "0"]
    ]) {
      expect(await commands().run(["add", "x", "issue", "Broken", ...extra])).toBe(1)
    }
    expect(FILES.read(file).findItem("i1")).toBeNull()
    expect(existsSync(join(folder, "pictures"))).toBe(false)
  })

  test("named():  a name taken on disk, or earlier in the list, gets -2, -3 ...", () => {
    const now = new Date(2026, 10, 16, 13, 2)
    mkdirSync(join(folder, "pictures"))
    writeFileSync(join(folder, "pictures", "t3-20261116-1302.png"), "")
    const given = { bytes: png("x"), ext: "png", alt: "x" }
    expect(ItemPictures.named(file, "T3", [given, given], now).map((each) => each.path)).toEqual([
      "pictures/t3-20261116-1302-2.png",
      "pictures/t3-20261116-1302-3.png"
    ])
  })
})

describe("POST delete-picture", () => {
  let server: PageServer
  let port: number

  beforeAll(async () => {
    mkdirSync(join(root, ".git"), { recursive: true })
    server = new PageServer({ root })
    await reviewRoutes.setup(server.routeContext())
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => {
    await server.stop()
  })

  /** POST `body` to the route;  its status and answer. */
  async function post(body: unknown) {
    const answer = await ask(port, "POST", "/api/epics/review/delete-picture", {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-server-token": server.web.guard.token,
        origin: `http://127.0.0.1:${port}`
      }
    })
    return { status: answer.status, body: JSON.parse(answer.text) }
  }

  /** Item I1 with two pictures, its page split into parts as a real page is;  their `src`s as the page has them. */
  async function issueWithPictures(): Promise<string[]> {
    writeFileSync(join(root, "one.png"), png("one"))
    writeFileSync(join(root, "two.png"), png("two"))
    const argv = ["add", "x", "issue", "Broken", "--picture", join(root, "one.png"), "--picture", join(root, "two.png")]
    await commands().run(argv)
    await FILES.writeDoc(file, FILES.read(file), true)
    return picturesOf("i1")
  }

  test("takes the picture out of the item, logs it, and deletes its file;  the other stays", async () => {
    const [first, second] = await issueWithPictures()
    // a split page's part holds them as root paths (epic `epic-engine` P46)
    expect(first).toMatch(/^\/epics\/x\/pictures\/i1-.*\.png$/)
    const answer = await post({ page: "/epics/x/x.plan.html", id: "I1", src: first })
    expect(answer.status).toBe(200)
    expect(answer.body.deleted).toBe(first!.replace("/epics/x/", ""))
    expect(picturesOf("i1")).toEqual([second])
    expect(existsSync(join(folder, answer.body.deleted))).toBe(false)
    expect(existsSync(join(root, second!))).toBe(true)
    expect(FILES.read(file).section("log").textContent).toMatch(/I1: +picture deleted from the page, pictures\/i1-/)
  })

  test("refused:  a src outside pictures/ (400), a picture the item doesn't show (404), no token (403)", async () => {
    const [first] = await issueWithPictures()
    const page = "/epics/x/x.plan.html"
    expect((await post({ page, id: "i1", src: "/epics/x/x.plan.html" })).status).toBe(400)
    expect((await post({ page, id: "i1", src: "/epics/x/pictures/../x.plan.html" })).status).toBe(400)
    expect((await post({ page, id: "i1", src: "/epics/x/pictures/i1-nope.png" })).status).toBe(404)
    const refused = await ask(port, "POST", "/api/epics/review/delete-picture", {
      body: JSON.stringify({ page, id: "i1", src: first }),
      headers: { "content-type": "application/json", origin: `http://127.0.0.1:${port}` }
    })
    expect(refused.status).toBe(403)
    expect(picturesOf("i1")).toHaveLength(2)
  })
})
