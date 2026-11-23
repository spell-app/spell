/**
 * HTTP-level CONTRACT tests for the app's server (`cli.ts` + `api.ts`, in spaces' `src/server/node/routes/`).
 * - Talk HTTP only:  spawn the server as a child process, never import the server framework,
 *   so the same file passes unchanged when the framework is swapped.
 * - Pins the behaviour, quirks and all (marked `QUIRK`);  a deliberate change fails here on purpose.
 * - Written against Express, kept for `spell/server`'s `SRV.Router` (unified-server P6).
 * - What changed ON PURPOSE is marked `CHANGED`:
 *   - nested `:filePath*` paths work
 *   - an unknown DELETE gets the API's 404
 *   - a `.spell` file is text
 *   - a bad body is JSON, not an HTML error page
 *   - a caller's mistake a handler throws (`SRV.HttpError`) answers its own status, e.g. a bad pref store's 400,
 *     not a 500 (epic `prefs-and-undo` P2)
 * - Files are named by URL, as spell names them (`SP.SpellUrls`, epic `people-and-orgs` P15):
 *   - read at `/spaces/<project>/<file>`
 *   - saved by `POST /api/projects/file/<project>/<file>`
 * - SIDE EFFECT:  starts a server on a free port, its folders in a temporary folder, deleted afterwards:
 *   so the repo and your spell-spaces are never written.
 *   - `SPELL_SPACES_DIR`, `SPELL_BUILTINS_DIR`, `SPELL_BUILD_DIR`
 * - Node environment (spaces' `vitest.config.ts`).
 */
import { type ChildProcess, spawn } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

// the one naming rule for what belongs to a spaces folder that isn't the kit's own:  here, the temp folder's
import { spacesTag } from "spell/server/PidFile"

/** Project used by every test, in the `owen@spell` group. */
const PROJECT = "owen@spell/Proj"
/** Its place:  your space (`SPACES.localPerson`), then its name. */
const PLACE = "owen@spell/Proj"
/** Where its files are read:  `/spaces/<project>/<file>`. */
const FILES = `/spaces/${PLACE}/`
/** Where its files are saved:  `/api/projects/file/<project>/<file>`. */
const SAVE = `/api/projects/file/${PLACE}/`
/** The repo's root:  where the server is launched from (its `tsconfig.json` gives `tsx` the settings). */
const repoDir = path.resolve(import.meta.dirname, "../../../../..")

let server: ChildProcess
let baseUrl: string
/** The temp folder:  `spaces/` (spell-spaces), `builtins/` and `build/`. */
let tempDir: string
/** The folders the server is pointed at, as env vars:  the disk reader is pointed at them too. */
let folders: Record<string, string>

/** What `request()` returns. */
type Reply = { status: number; contentType: string | null; text: string; json: () => any }

/** Ask the OS for a free TCP port. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once("error", reject)
    probe.listen(0, () => {
      const { port } = probe.address() as net.AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

/**
 * Send one request to the server.
 * - Uses `node:http`, not `fetch`:  `path` goes on the wire exactly as given.
 *   `fetch` (WHATWG URL) resolves `%2e%2e` segments before sending, which would hide the path-traversal cases.
 */
function request(
  method: string,
  path: string,
  body?: string,
  contentType?: string,
  more: Record<string, string> = {}
): Promise<Reply> {
  const { port } = new URL(baseUrl)
  return new Promise((resolve, reject) => {
    // `Content-Length` is explicit:  node sends a `DELETE` body unframed (no length, not chunked) otherwise
    const headers: Record<string, string> = { ...more }
    if (contentType) headers["content-type"] = contentType
    if (body !== undefined) headers["content-length"] = String(Buffer.byteLength(body))
    const outgoing = http.request({ host: "localhost", port, method, path, headers }, (incoming) => {
      let text = ""
      incoming.setEncoding("utf8")
      incoming.on("data", (chunk) => (text += chunk))
      incoming.on("end", () =>
        resolve({
          status: incoming.statusCode!,
          contentType: incoming.headers["content-type"] ?? null,
          text,
          json: () => JSON.parse(text)
        })
      )
    })
    outgoing.on("error", reject)
    if (body !== undefined) outgoing.write(body)
    outgoing.end()
  })
}

/**
 * Where `file` is in the temp folder:
 * - `user/...`:  your space's projects (`spaces/@spell/owen@/...`)
 * - `built/...`:  their build folders (`build/<spaces' build>/@spell/owen@/...`, `spacesBuild()`)
 */
function fixturePath(file: string): string {
  const inside = file
    .replace(/^user\//, "spaces/@spell/owen@/")
    .replace(/^built\//, `build/${spacesBuild()}/@spell/owen@/`)
  return path.join(tempDir, inside)
}

/**
 * The temp spaces' build folder, in `build/`:  not the kit's own spell.spaces, so their own,
 * `spell-spaces.<folder>-<hash>` (`spacesBuildDir()`), never the `spell-spaces/` every other spaces folder shared.
 */
function spacesBuild(): string {
  return `spell-spaces.${spacesTag(path.join(tempDir, "spaces"))}`
}

/** Write `contents` at `file` (see `fixturePath()`), making folders. */
function writeFixture(file: string, contents: string) {
  const full = fixturePath(file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, contents)
}

/** Read a file in the temp folder (see `fixturePath()`), `undefined` if absent. */
function readFixture(file: string): string | undefined {
  const full = fixturePath(file)
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : undefined
}

/**
 * Your draft of `file` in the project (epic `editor` P24):  `__draft/<name>.owen-<day><extensions>`, or `undefined`.
 * - A project's own file is saved as your draft, never its public file:  see `ProjectDrafts`.
 */
function readDraft(file: string): string | undefined {
  const parts = file.split("/")
  const name = parts.pop()!
  const dot = name.indexOf(".")
  const folder = fixturePath(["user/Proj/__draft", ...parts].join("/"))
  if (!fs.existsSync(folder)) return undefined
  const mine = new RegExp(`^${name.slice(0, dot)}\\.owen-\\d{4}-\\d{2}-\\d{2}${name.slice(dot).replace(/\./g, "\\.")}$`)
  const found = fs.readdirSync(folder).find((each) => mine.test(each))
  return found === undefined ? undefined : fs.readFileSync(path.join(folder, found), "utf8")
}

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spell-api-test-"))
  folders = {
    SPELL_SPACES_DIR: path.join(tempDir, "spaces"),
    SPELL_BUILTINS_DIR: path.join(tempDir, "builtins"),
    SPELL_BUILD_DIR: path.join(tempDir, "build")
  }
  for (const folder of Object.values(folders)) fs.mkdirSync(folder)
  writeFixture("user/Proj/project.json", JSON.stringify({ imports: [{ path: "/top.spell", active: true }] }))
  writeFixture("user/Proj/top.spell", "to do something\n")
  writeFixture("user/Proj/folder/sub/file.spell", "nested\n")
  writeFixture("built/Proj/Proj.spell.js", "export default 1\n")

  const port = await freePort()
  baseUrl = `http://localhost:${port}`
  server = spawn(process.execPath, ["--import", "tsx", "src/spaces/server/node/routes/cli.ts"], {
    cwd: repoDir,
    // a save to a built-in writes its file, as in a checkout (epic `mockup` P20)
    env: { ...process.env, PORT: String(port), ...folders, SPELL_EDITS_BUILTINS: "1" },
    stdio: "ignore"
  })
  for (let tries = 0; tries < 200; tries++) {
    try {
      await fetch(`${baseUrl}/hello`)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }
  throw new Error("server did not start")
}, 60_000)

afterAll(() => {
  server?.kill()
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
})

////////////////
// ## Liveness and canned routes
////////////////

describe("liveness and canned routes", () => {
  it("GET /hello => JSON", async () => {
    const reply = await request("GET", "/hello")
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^application\/json/)
    expect(reply.json()).toEqual({ message: "Hello from the API!" })
  })

  it("GET /api/test => 200 JSON, pretty-printed with 2 spaces", async () => {
    const reply = await request("GET", "/api/test")
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^application\/json/)
    expect(reply.text).toBe('{\n  "message": "YO!"\n}')
  })

  it("GET /api/missing => 404 with a plain string body", async () => {
    const reply = await request("GET", "/api/missing")
    expect(reply.status).toBe(404)
    // QUIRK:  `send(string)` defaults to text/html
    expect(reply.contentType).toMatch(/^text\/html/)
    expect(reply.text).toBe("Nothing to see here.")
  })

  it("GET /api/not-authorized => 403", async () => {
    const reply = await request("GET", "/api/not-authorized")
    expect(reply.status).toBe(403)
    expect(reply.contentType).toMatch(/^text\/html/)
    expect(reply.text).toBe("No can do.")
  })

  it("GET /api/error => 500", async () => {
    const reply = await request("GET", "/api/error")
    expect(reply.status).toBe(500)
    expect(reply.contentType).toMatch(/^text\/html/)
    expect(reply.text).toBe("No soup for you!")
  })

  it("unknown GET /api/nope => 404 text echoing the url (after `/api`, with query)", async () => {
    const reply = await request("GET", "/api/nope?x=1")
    expect(reply.status).toBe(404)
    expect(reply.contentType).toMatch(/^text\/html/)
    expect(reply.text).toBe("API routine not defined on server:   '/nope?x=1'")
  })

  it("unknown POST /api/nope => 404 text echoing the url", async () => {
    const reply = await request("POST", "/api/nope")
    expect(reply.status).toBe(404)
    expect(reply.text).toBe("API routine not defined on server:   '/nope'")
  })

  it("CHANGED:  unknown DELETE /api/nope => the API's 404 too (Express had no catch-all for DELETE)", async () => {
    const reply = await request("DELETE", "/api/nope")
    expect(reply.status).toBe(404)
    expect(reply.text).toBe("API routine not defined on server:   '/nope'")
  })
})

////////////////
// ## Project list and errors
////////////////

describe("projects list and sendError shape", () => {
  it("GET /api/projects/list/<group> => each project's address, and its title if it has one (Q45)", async () => {
    const reply = await request("GET", "/api/projects/list/owen@spell")
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^application\/json/)
    expect(reply.json()).toEqual([{ path: PROJECT }])
  })

  it("a group whose folder doesn't exist yet lists no projects, e.g. guides before the first one", async () => {
    const reply = await request("GET", "/api/projects/list/@spell/guides")
    expect(reply.status).toBe(200)
    expect(reply.json()).toEqual([])
  })

  it("spaces' own folders (`__members/` ...) are never projects;  a `__x__` one still is", async () => {
    writeFixture("user/__members/owen.json5", "{}")
    writeFixture("user/__mine__/project.json", JSON.stringify({ imports: [] }))
    const reply = await request("GET", "/api/projects/list/owen@spell")
    const paths = reply.json().map(({ path }: { path: string }) => path)
    expect(paths.sort()).toEqual(["owen@spell/Proj", "owen@spell/__mine__"].sort())
    fs.rmSync(fixturePath("user/__mine__"), { recursive: true })
  })

  it("sendError body is { errors: [{ message, trace }] } with status 500", async () => {
    const reply = await request("GET", "/api/projects/list/@spell/domain")
    expect(reply.status).toBe(500)
    expect(reply.contentType).toMatch(/^application\/json/)
    const body = reply.json()
    expect(Object.keys(body)).toEqual(["errors"])
    expect(body.errors).toHaveLength(1)
    expect(Object.keys(body.errors[0]).sort()).toEqual(["message", "trace"])
    expect(body.errors[0].message).toContain("no project group there")
    // trace is the error's stack, leaked to the client
    expect(body.errors[0].trace).toMatch(/^TypeError: /)
  })
})

////////////////
// ## Project files:  read at `/spaces/<project>/<file>`, saved at `/api/projects/file/<project>/<file>`
////////////////

describe("GET /spaces/<project>/<file>", () => {
  it("top-level file => 200, raw contents, content-type from the extension", async () => {
    const reply = await request("GET", `${FILES}top.spell`)
    expect(reply.status).toBe(200)
    // CHANGED:  `.spell` is text in `SRV.TYPES` (Express:  `application/octet-stream`)
    expect(reply.contentType).toBe("text/plain; charset=utf-8")
    expect(reply.text).toBe("to do something\n")
  })

  it("`.txt` file => text/plain", async () => {
    writeFixture("user/Proj/note.txt", "hello")
    const reply = await request("GET", `${FILES}note.txt`)
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^text\/plain/)
    expect(reply.text).toBe("hello")
  })

  it("`?as=javascript`:  a TypeScript code file as javascript, its types taken out (from-console I21)", async () => {
    writeFixture("user/Proj/clipboard.ts", "export function copyText(text: string): void {}\n")
    const reply = await request("GET", `${FILES}clipboard.ts?as=javascript`)
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/javascript/)
    expect(reply.text).toMatch(/function copyText\(text\) {[\s\S]*export {\s*copyText\s*}/)
  })

  it("missing file => 404 JSON { errors: [{ message, trace }] }", async () => {
    const reply = await request("GET", `${FILES}nope.spell`)
    expect(reply.status).toBe(404)
    expect(reply.contentType).toMatch(/^application\/json/)
    const body = reply.json()
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0].message).toMatch(/^File not found: '.*nope\.spell'$/)
    expect(typeof body.errors[0].trace).toBe("string")
  })

  it("a file in a folder:  everything after the project", async () => {
    const reply = await request("GET", `${FILES}folder/sub/file.spell`)
    expect(reply.status).toBe(200)
    expect(reply.text).toBe(readFixture("user/Proj/folder/sub/file.spell"))
  })

  it("a project and a file with spaces in their names:  each part encoded on its own", async () => {
    writeFixture("user/Two Words/project.json", JSON.stringify({ imports: [] }))
    writeFixture("user/Two Words/a folder/my file.spell", "spaced\n")
    const reply = await request("GET", "/spaces/owen@spell/Two%20Words/a%20folder/my%20file.spell")
    expect(reply.status).toBe(200)
    expect(reply.text).toBe("spaced\n")
  })

  it("a folder, or a name with no dot => 400:  not a file's address (decision Q41)", async () => {
    expect((await request("GET", `${FILES}folder/`)).status).toBe(400)
    expect((await request("GET", `${FILES}folder`)).status).toBe(400)
  })

  it.each([
    ["no file after the project", `/spaces/${PLACE}`, "no file after the project"],
    ["an unknown group", "/spaces/@spell/nobody/Proj/top.spell", "no project group holds"],
    ["the two slashes from before decision Q41", `/spaces/${PLACE}//top.spell`, "an empty part"]
  ])("a URL that names no project's file (%s) => 400", async (_name, url, message) => {
    const reply = await request("GET", url)
    expect(reply.status).toBe(400)
    expect(reply.json().errors[0].message).toContain(message)
  })

  it.each([
    ["encoded `..` segment", `${FILES}%2e%2e`],
    ["encoded `../x`", `${FILES}%2e%2e%2fx.spell`],
    ["encoded `..%2f`", `${FILES}..%2fx.spell`],
    ["`..` as the project", "/spaces/owen@spell/%2e%2e/x.spell"]
  ])("path traversal (%s) => 400 sendError, 'Invalid path'", async (_name, url) => {
    const reply = await request("GET", url)
    expect(reply.status).toBe(400)
    expect(reply.contentType).toMatch(/^application\/json/)
    expect(reply.json().errors[0].message).toContain("Invalid path")
  })
})

describe("POST /api/projects/file/<project>/<file>", () => {
  it("text/plain body => 200 `true`, file written, reads back at its `/spaces/` URL", async () => {
    const post = await request("POST", `${SAVE}saved.txt`, "hi there", "text/plain")
    expect(post.status).toBe(200)
    expect(post.contentType).toMatch(/^application\/json/)
    expect(post.text).toBe("true")
    expect(readFixture("user/Proj/saved.txt")).toBe("hi there")

    const get = await request("GET", `${FILES}saved.txt`)
    expect(get.status).toBe(200)
    expect(get.contentType).toMatch(/^text\/plain/)
    expect(get.text).toBe("hi there")
  })

  it("overwrites an existing file", async () => {
    await request("POST", `${SAVE}over.txt`, "one", "text/plain")
    await request("POST", `${SAVE}over.txt`, "two", "text/plain")
    expect(readFixture("user/Proj/over.txt")).toBe("two")
  })

  it("a nested path writes the nested file", async () => {
    const reply = await request("POST", `${SAVE}folder/new.txt`, "x", "text/plain")
    expect(reply.status).toBe(200)
    expect(readFixture("user/Proj/folder/new.txt")).toBe("x")
  })

  it("JSON body => 500 (body is an object, a save wants text)", async () => {
    const reply = await request("POST", `${SAVE}data.json`, '{"a":1}', "application/json")
    expect(reply.status).toBe(500)
    expect(reply.contentType).toMatch(/^application\/json/)
    expect(reply.json().errors[0].message).toContain("its contents must be text or bytes, not object")
    expect(readFixture("user/Proj/data.json")).toBeUndefined()
  })

  it("CHANGED:  text body under application/json5 that is not JSON5 => 400 JSON { error } (Express:  an HTML page)", async () => {
    const reply = await request("POST", `${SAVE}bad.txt`, "hi there", "application/json5")
    expect(reply.status).toBe(400)
    expect(reply.contentType).toMatch(/^application\/json/)
    expect(reply.json().error).toMatch(/^bad JSON body:  JSON5:/)
  })

  it("traversal in the path => 500 'Invalid path', nothing written", async () => {
    const reply = await request("POST", `${SAVE}%2e%2e`, "evil", "text/plain")
    expect(reply.status).toBe(500)
    expect(reply.json().errors[0].message).toContain("Invalid path")
  })

  it("the old URL, a project id then its file, is gone:  404", async () => {
    const reply = await request("GET", `/api/projects/file/${PROJECT}/top.spell`)
    expect(reply.status).toBe(404)
  })
})

////////////////
// ## Drafts, Publish and versions (epic `editor` P24):  see `ProjectDrafts`
////////////////

describe("drafts, Publish and versions", () => {
  const json = (body: object) => JSON.stringify(body)

  it("a project's own file saves as your draft:  its public file stays, its URL reads the draft", async () => {
    await request(
      "POST",
      "/api/projects/create/file",
      json({ projectId: PROJECT, filePath: "/d.spell", contents: "one" }),
      "application/json"
    )
    expect(readFixture("user/Proj/d.spell")).toBeUndefined()
    expect((await request("GET", `${FILES}d.spell`)).text).toBe("one")
    const save = await request("POST", `${SAVE}d.spell`, "two", "text/plain")
    expect(save.status).toBe(200)
    expect(readDraft("d.spell")).toBe("two")
    expect((await request("GET", `${FILES}d.spell`)).text).toBe("two")
  })

  it("the private folders are never served, nor written by a save", async () => {
    await request("POST", `${SAVE}p.spell`, "secret", "text/plain")
    const now = new Date()
    const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((part) => String(part).padStart(2, "0"))
      .join("-")
    expect((await request("GET", `${FILES}__draft/__drafts.json5`)).status).toBe(404)
    expect((await request("GET", `${FILES}__draft/p.owen-${day}.spell`)).status).toBe(404)
    expect((await request("GET", `${FILES}versions/x.zip`)).status).toBe(404)
    expect((await request("POST", `${SAVE}__draft/p.spell`, "x", "text/plain")).status).toBe(400)
  })

  it("Publish writes the public files, keeps a version zip, and deletes the drafts;  a restore drafts it again", async () => {
    await request("POST", `${SAVE}pub.spell`, "first", "text/plain")
    const reply = await request("POST", "/api/projects/publish", json({ projectId: PROJECT }), "application/json")
    expect(reply.status).toBe(200)
    const { published, version } = reply.json()
    expect(published).toContain("/pub.spell")
    expect(version).toMatch(/^Proj\.\d{4}-\d{2}-\d{2}-\d{6}(-\d+)?\.zip$/)
    expect(readFixture("user/Proj/pub.spell")).toBe("first")
    expect(readDraft("pub.spell")).toBeUndefined()
    expect(fs.existsSync(fixturePath(`user/Proj/versions/${version}`))).toBe(true)

    await request("POST", `${SAVE}pub.spell`, "second", "text/plain")
    await request("POST", "/api/projects/publish", json({ projectId: PROJECT }), "application/json")
    expect(readFixture("user/Proj/pub.spell")).toBe("second")
    const restored = await request(
      "POST",
      "/api/projects/restore",
      json({ projectId: PROJECT, version }),
      "application/json"
    )
    expect(restored.json()).toContain("/pub.spell")
    expect(readDraft("pub.spell")).toBe("first")
    expect(readFixture("user/Proj/pub.spell")).toBe("second")
  })

  it("Save Current Changes keeps your draft as a version of its own, never published;  a restore makes it your draft again", async () => {
    fs.writeFileSync(fixturePath("user/Proj/kd.spell"), "published")
    fs.writeFileSync(fixturePath("user/Proj/other.spell"), "other")
    await request("POST", `${SAVE}kd.spell`, "my draft", "text/plain")
    const kept = await request("POST", "/api/projects/keep-draft", json({ projectId: PROJECT }), "application/json")
    expect(kept.status).toBe(200)
    const { name, draft } = kept.json()
    expect(draft).toBe(true)
    expect(name).toMatch(/^Proj\.\d{4}-\d{2}-\d{2}-\d{6}(-\d+)?\.draft\.owen\.zip$/)
    // nothing public changed, and your draft is still your draft
    expect(readFixture("user/Proj/kd.spell")).toBe("published")
    expect(readDraft("kd.spell")).toBe("my draft")
    const { versions } = (await request("GET", `/api/projects/drafts/${PLACE}`)).json()
    expect(versions.find((each: any) => each.name === name)).toMatchObject({ draft: true })

    // a draft of another file meanwhile:  restoring the kept draft puts both files back as it held them
    await request("POST", `${SAVE}kd.spell`, "published", "text/plain")
    await request("POST", `${SAVE}other.spell`, "other, changed", "text/plain")
    const restored = await request(
      "POST",
      "/api/projects/restore",
      json({ projectId: PROJECT, version: name }),
      "application/json"
    )
    expect(restored.json()).toEqual(expect.arrayContaining(["/kd.spell", "/other.spell"]))
    expect(readDraft("kd.spell")).toBe("my draft")
    expect(readDraft("other.spell")).toBeUndefined()
  })

  it("Discard deletes your draft;  a draft the same as what's published is no draft", async () => {
    fs.writeFileSync(fixturePath("user/Proj/keep.spell"), "kept")
    await request("POST", `${SAVE}keep.spell`, "changed", "text/plain")
    expect(readDraft("keep.spell")).toBe("changed")
    await request(
      "POST",
      "/api/projects/discard",
      json({ projectId: PROJECT, filePath: "/keep.spell" }),
      "application/json"
    )
    expect(readDraft("keep.spell")).toBeUndefined()
    await request("POST", `${SAVE}keep.spell`, "kept", "text/plain")
    expect(readDraft("keep.spell")).toBeUndefined()
  })

  it("a built-in's file, in a checkout, saves to the file itself, dropping your old draft;  through the house site, a draft", async () => {
    const example = path.join(tempDir, "builtins/@spell/library/Ex")
    fs.mkdirSync(example, { recursive: true })
    fs.writeFileSync(path.join(example, "project.json"), JSON.stringify({ imports: [] }))
    fs.writeFileSync(path.join(example, "Ex.spell"), "one")
    const save = "/api/projects/file/@spell/library/Ex/Ex.spell"
    const read = "/spaces/@spell/library/Ex/Ex.spell"
    // through the house-network site:  your draft, the file as it was
    expect((await request("POST", save, "drafted", "text/plain", { "x-spell-house-site": "1" })).status).toBe(200)
    expect(fs.readFileSync(path.join(example, "Ex.spell"), "utf8")).toBe("one")
    expect((await request("GET", read)).text).toBe("drafted")
    // from this Mac:  the file itself, and the old draft gone, so the read gives the save
    expect((await request("POST", save, "two", "text/plain")).status).toBe(200)
    expect(fs.readFileSync(path.join(example, "Ex.spell"), "utf8")).toBe("two")
    expect(fs.readdirSync(path.join(example, "__draft")).filter((name) => name.endsWith(".spell"))).toEqual([])
    expect((await request("GET", read)).text).toBe("two")
  })

  it("what spell builds while you have drafts is your build:  you read it, the shared build stays;  Discard drops it", async () => {
    writeFixture("user/Mine/project.json", JSON.stringify({ imports: [] }))
    writeFixture("user/Mine/Mine.spell", "published")
    writeFixture("built/Mine/Mine.spell.js", "shared")
    const files = "/spaces/owen@spell/Mine/"
    const save = "/api/projects/file/owen@spell/Mine/"
    // no drafts:  a build is the shared one
    await request("POST", `${save}Mine.spell.js`, "shared again", "text/plain")
    expect(readFixture("built/Mine/Mine.spell.js")).toBe("shared again")
    // a draft:  what's built from it is yours
    await request("POST", `${save}Mine.spell`, "my draft", "text/plain")
    await request("POST", `${save}Mine.spell.js`, "mine", "text/plain")
    expect(readFixture("built/Mine/Mine.spell.js")).toBe("shared again")
    expect((await request("GET", `${files}Mine.spell.js`)).text).toBe("mine")
    // the draft discarded:  back on the shared build
    await request(
      "POST",
      "/api/projects/discard",
      json({ projectId: "owen@spell/Mine", filePath: "/Mine.spell" }),
      "application/json"
    )
    expect((await request("GET", `${files}Mine.spell.js`)).text).toBe("shared again")
    expect(fs.existsSync(fixturePath("user/Mine/__draft/__build.owen"))).toBe(false)
  })

  it("a published file changed since your draft began:  Publish says so (409), and publishes only when told to anyway", async () => {
    fs.writeFileSync(fixturePath("user/Proj/clash.spell"), "theirs")
    await request("POST", `${SAVE}clash.spell`, "mine", "text/plain")
    fs.writeFileSync(fixturePath("user/Proj/clash.spell"), "theirs, changed")
    const drafts = (await request("GET", `/api/projects/drafts/${PLACE}`)).json()
    expect(drafts.drafts.find((each: any) => each.filePath === "/clash.spell")).toMatchObject({
      clashes: true,
      mine: "mine",
      theirs: "theirs, changed"
    })
    const refused = await request("POST", "/api/projects/publish", json({ projectId: PROJECT }), "application/json")
    expect(refused.status).toBe(409)
    expect(readFixture("user/Proj/clash.spell")).toBe("theirs, changed")
    const anyway = await request(
      "POST",
      "/api/projects/publish",
      json({ projectId: PROJECT, anyway: true }),
      "application/json"
    )
    expect(anyway.status).toBe(200)
    expect(readFixture("user/Proj/clash.spell")).toBe("mine")
  })
})

////////////////
// ## Body parsing:  JSON, JSON5, form, text
////////////////

describe("request body parsing on POST /api/projects/create/file", () => {
  /** A create-file body as source text, so tests can write it as JSON or JSON5. */
  const strict = (filePath: string) => JSON.stringify({ projectId: PROJECT, filePath, contents: "x" })
  const json5 = (filePath: string) => `{projectId: '${PROJECT}', filePath: "${filePath}", contents: "x",}`

  it("application/json, strict JSON => 200 ProjectIndexJSON including the new file, and where it builds", async () => {
    const reply = await request("POST", "/api/projects/create/file", strict("/c.spell"), "application/json")
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^application\/json/)
    const index = reply.json()
    expect(Object.keys(index).sort()).toEqual(["buildFolder", "imports", "manifest"])
    // your space's projects build in THIS checkout's `build/`, in their spaces' own folder:  no `../` (J33)
    expect(index.buildFolder).toBe(`${spacesBuild()}/@spell/owen@/Proj`)
    expect(index.imports.map((item: any) => item.path)).toContain("/c.spell")
    expect(readDraft("c.spell")).toBe("x")
  })

  it("application/json with JSON5 syntax (unquoted keys, single quotes, trailing comma) => parsed", async () => {
    const reply = await request("POST", "/api/projects/create/file", json5("/j5-json.spell"), "application/json")
    expect(reply.status).toBe(200)
    expect(readDraft("j5-json.spell")).toBe("x")
  })

  it("application/json5 with JSON5 syntax => parsed", async () => {
    const reply = await request("POST", "/api/projects/create/file", json5("/j5-json5.spell"), "application/json5")
    expect(reply.status).toBe(200)
    expect(reply.json().imports.map((item: any) => item.path)).toContain("/j5-json5.spell")
    expect(readDraft("j5-json5.spell")).toBe("x")
  })

  it("application/x-www-form-urlencoded => parsed into body fields", async () => {
    const body = new URLSearchParams({ projectId: PROJECT, filePath: "/form.spell", contents: "x" }).toString()
    const reply = await request("POST", "/api/projects/create/file", body, "application/x-www-form-urlencoded")
    expect(reply.status).toBe(200)
    expect(readDraft("form.spell")).toBe("x")
  })

  it("text/plain JSON text is NOT parsed (body stays a string) => 500 from the missing projectId", async () => {
    const reply = await request("POST", "/api/projects/create/file", strict("/t.spell"), "text/plain")
    expect(reply.status).toBe(500)
    expect(reply.json().errors[0].message).toContain("Path must be a string")
    expect(readFixture("user/Proj/t.spell")).toBeUndefined()
  })

  it("traversal in the body's filePath => 500 'Invalid path'", async () => {
    const reply = await request("POST", "/api/projects/create/file", strict("/../evil.spell"), "application/json")
    expect(reply.status).toBe(500)
    expect(reply.json().errors[0].message).toContain("Invalid path")
    expect(readFixture("user/evil.spell")).toBeUndefined()
  })

  it("nested filePath in the BODY works (unlike the `:filePath*` url param)", async () => {
    const reply = await request("POST", "/api/projects/create/file", strict("/deep/er/ok.spell"), "application/json")
    expect(reply.status).toBe(200)
    expect(readDraft("deep/er/ok.spell")).toBe("x")
  })
})

////////////////
// ## File > Export and Import:  every file, and bytes
////////////////

describe("File > Export and Import", () => {
  /** A PNG's first bytes, a NUL among them:  never text. */
  const PICTURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe])

  it("POST /api/projects/create/file with `encoding: base64` writes the bytes, which /spaces/ reads back", async () => {
    const body = JSON.stringify({
      projectId: PROJECT,
      filePath: "/pictures/logo.png",
      contents: PICTURE.toString("base64"),
      encoding: "base64"
    })
    const reply = await request("POST", "/api/projects/create/file", body, "application/json")
    expect(reply.status).toBe(200)
    expect(fs.readFileSync(fixturePath("user/Proj/pictures/logo.png"))).toEqual(PICTURE)
    const read = await fetch(`${baseUrl}/spaces/${PROJECT}/pictures/logo.png`)
    expect(Buffer.from(await read.arrayBuffer())).toEqual(PICTURE)
  })

  it("Import's way in keeps everything as drafts:  a project of its project file alone, each source then your draft, in the file's order", async () => {
    const json = (body: object) => JSON.stringify(body)
    const projectId = "owen@spell/Imported"
    const projectFile =
      '{\n  // as the archive wrote it\n  imports: [{ path: "/B.spell", active: true }, { path: "/A.spell", active: true }]\n}\n'
    // `SPACES.SpellProjectRoot.importApp()`:  the project made of its project file, then every other file
    const made = await request(
      "POST",
      "/api/projects/create/project",
      json({ projectId, filePath: "/__project.json5", contents: projectFile }),
      "application/json"
    )
    expect(made.status).toBe(200)
    for (const name of ["A", "B"]) {
      const reply = await request(
        "POST",
        "/api/projects/create/file",
        json({ projectId, filePath: `/${name}.spell`, contents: `# ${name}\n` }),
        "application/json"
      )
      expect(reply.status).toBe(200)
    }
    const index = (await request("GET", `/api/projects/index/${projectId}`)).json()
    expect(index.imports.map(({ path, contents }: { path: string; contents: string }) => [path, contents])).toEqual([
      ["/B.spell", "# B\n"],
      ["/A.spell", "# A\n"]
    ])
    // nothing public but the project file, as written:  no file made up for a project with none listed
    expect(
      fs
        .readdirSync(fixturePath("user/Imported"))
        .filter((name) => !name.startsWith("__draft"))
        .sort()
    ).toEqual(["__project.json5"])
    expect(readFixture("user/Imported/__project.json5")).toBe(projectFile)
    expect(fs.readdirSync(fixturePath("user/Imported/__draft")).filter((name) => name.endsWith(".spell"))).toHaveLength(
      2
    )
  })

  it("GET /api/projects/files/<project> lists every file:  pictures and the project file, never what's built or drafted", async () => {
    writeFixture("user/Proj/notes.txt", "a note\n")
    writeFixture("user/Proj/Proj.declarations.json5", "{}\n")
    writeFixture("user/Proj/.DS_Store", "x")
    const reply = await request("GET", `/api/projects/files/${PROJECT}`)
    expect(reply.status).toBe(200)
    const files: string[] = reply.json()
    expect(files).toEqual(
      expect.arrayContaining([
        "/top.spell",
        "/folder/sub/file.spell",
        "/notes.txt",
        "/pictures/logo.png",
        "/__project.json5"
      ])
    )
    expect(files.filter((file) => /__draft|declarations|DS_Store|\.spell\.js$/.test(file))).toEqual([])
  })
})

////////////////
// ## DELETE with a body
////////////////

describe("POST /api/projects/settings/project", () => {
  it("writes the settings into the project file, keeping its imports;  an empty one is removed", async () => {
    const body = (settings: object) => JSON.stringify({ projectId: PROJECT, settings })
    const saved = await request(
      "POST",
      "/api/projects/settings/project",
      body({ title: "My Project", version: "1.2.0", targets: ["ts/solid"], listsStartAt: 0 }),
      "application/json"
    )
    expect(saved.status).toBe(200)
    expect(saved.json()).toEqual({ title: "My Project", version: "1.2.0", targets: ["ts/solid"], listsStartAt: 0 })
    const file = readFixture("user/Proj/__project.json5")!
    expect(file).toContain('"listsStartAt": 0')
    expect(file).toContain("/top.spell")

    const cleared = await request(
      "POST",
      "/api/projects/settings/project",
      body({ title: "", targets: [] }),
      "application/json"
    )
    expect(cleared.json()).toEqual({ version: "1.2.0", listsStartAt: 0 })
  })
})

describe("DELETE /api/projects/remove/file", () => {
  it("JSON body is parsed on DELETE => 200 ProjectIndexJSON, file gone", async () => {
    writeFixture("user/Proj/doomed.spell", "bye")
    const body = JSON.stringify({ projectId: PROJECT, filePath: "/doomed.spell" })
    const reply = await request("DELETE", "/api/projects/remove/file", body, "application/json")
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^application\/json/)
    expect(reply.json().imports.map((item: any) => item.path)).not.toContain("/doomed.spell")
    expect(readFixture("user/Proj/doomed.spell")).toBeUndefined()
  })

  it("JSON5 body is parsed on DELETE too", async () => {
    writeFixture("user/Proj/doomed5.spell", "bye")
    const body = `{projectId: "${PROJECT}", filePath: "/doomed5.spell",}`
    const reply = await request("DELETE", "/api/projects/remove/file", body, "application/json5")
    expect(reply.status).toBe(200)
    expect(readFixture("user/Proj/doomed5.spell")).toBeUndefined()
  })

  it("missing filePath => 500 sendError", async () => {
    const reply = await request(
      "DELETE",
      "/api/projects/remove/file",
      JSON.stringify({ projectId: PROJECT }),
      "application/json"
    )
    expect(reply.status).toBe(500)
    expect(reply.json().errors[0].message).toContain("You must pass a valid filePath")
  })
})

////////////////
// ## Compiled, scopes and words:  files too, at `/spaces/<project>/<file>`, found in `build/`
////////////////

describe("compiled, scopes and words files", () => {
  it("its compiled program => 200 text/javascript, from its build folder", async () => {
    const reply = await request("GET", `${FILES}Proj.spell.js`)
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^text\/javascript/)
    expect(reply.text).toBe("export default 1\n")
  })

  it("its scope pack => 200 text/javascript once the pack exists", async () => {
    writeFixture("built/Proj/Proj.scopes.js", "window.scopes = {}\n")
    const reply = await request("GET", `${FILES}Proj.scopes.js`)
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^text\/javascript/)
    expect(reply.text).toBe("window.scopes = {}\n")
  })

  it("not found, and no project to compile => 404 JSON", async () => {
    const reply = await request("GET", "/spaces/owen@spell/Nope/Nope.spell.js")
    expect(reply.status).toBe(404)
    expect(reply.contentType).toMatch(/^application\/json/)
    const body = reply.json()
    expect(body.errors[0].message).toMatch(/^File not found: '.*Nope\.spell\.js'$/)
    expect(typeof body.errors[0].trace).toBe("string")
  })

  // `ProjectBuild`:  a child `spell compile`, so it takes a few seconds
  it("a project never compiled:  compiled first, then served -- its scope pack too", async () => {
    writeFixture("user/Fresh/project.json", JSON.stringify({ imports: [{ path: "/Fresh.spell", active: true }] }))
    writeFixture("user/Fresh/Fresh.spell", 'print "fresh"\n')
    const reply = await request("GET", "/spaces/owen@spell/Fresh/Fresh.spell.js")
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^text\/javascript/)
    expect(reply.text).toContain('"fresh"')
    expect(readFixture("built/Fresh/Fresh.spell.js")).toBe(reply.text)
    const scopes = await request("GET", "/spaces/owen@spell/Fresh/Fresh.scopes.js")
    expect(scopes.status).toBe(200)
    expect(scopes.text).toBe(readFixture("built/Fresh/Fresh.scopes.js"))
  }, 60_000)

  it("its words => 200 text/javascript, its English words, from its build folder", async () => {
    writeFixture("built/Proj/Proj.en.js", 'export const words = { lang: "en", types: {} }\n')
    const reply = await request("GET", `${FILES}Proj.en.js`)
    expect(reply.status).toBe(200)
    expect(reply.contentType).toMatch(/^text\/javascript/)
    expect(reply.text).toBe('export const words = { lang: "en", types: {} }\n')
  })

  it("its declarations => 200, from its build folder", async () => {
    writeFixture("built/Proj/Proj.declarations.json5", '{ "provides": [] }\n')
    const reply = await request("GET", `${FILES}Proj.declarations.json5`)
    expect(reply.status).toBe(200)
    expect(reply.text).toBe('{ "provides": [] }\n')
  })

  it("a project's words, in any language, are NOT one of its files:  its index leaves them out", async () => {
    writeFixture("user/Proj/Proj.en.js", 'export const words = { lang: "en", types: {} }\n')
    writeFixture("user/Proj/Proj.es.js", 'export const words = { lang: "es", types: {} }\n')
    const reply = await request("GET", `/api/projects/index/${PLACE}`)
    expect(reply.status).toBe(200)
    const { manifest, imports } = reply.json() as { manifest: object; imports: Array<{ path: string }> }
    expect(Object.keys(manifest).filter((path) => /Proj\.(en|es)\.js$/.test(path))).toEqual([])
    expect(imports.map(({ path }) => path)).not.toContain("/Proj.en.js")
  })

  it("compiled output, by its names before people-and-orgs P11 too, is NOT one of its files", async () => {
    // A copy left from before the rename must never become an import of the project
    for (const file of ["Proj.compiled.js", "Proj.elements.js", "Proj.elements.spell.js", "Proj.spell.tsx"]) {
      writeFixture(`user/Proj/${file}`, "export default 2\n")
    }
    const reply = await request("GET", `/api/projects/index/${PLACE}`)
    expect(reply.status).toBe(200)
    const { manifest, imports } = reply.json() as { manifest: object; imports: Array<{ path: string }> }
    expect(Object.keys(manifest).filter((path) => /Proj\.(spell|compiled|elements)/.test(path))).toEqual([])
    expect(imports.map(({ path }) => path).filter((path) => path.startsWith("/Proj."))).toEqual([])
  })
})

////////////////
// ## Spaces' own names, and one set of URLs for the server and the disk reader
////////////////

describe("a project's file list", () => {
  it("leaves out spaces' own `__` names by spaces' list, but keeps `__init__.js` and the like (J52)", async () => {
    writeFixture("user/Proj/__init__.js", "export {}\n")
    writeFixture("user/Proj/__project.json5", JSON.stringify({ imports: [{ path: "/top.spell", active: true }] }))
    writeFixture("user/Proj/__pack.js", "export {}\n")
    const reply = await request("GET", `/api/projects/index/${PLACE}`)
    const files = Object.keys(reply.json().manifest)
    expect(files).toContain(`${PROJECT}/__init__.js`)
    expect(files).toContain(`${PROJECT}/__pack.js`)
    expect(files).not.toContain(`${PROJECT}/__project.json5`)
  })
})

describe("every URL spell builds is answered by the server and by spaces' disk reader alike", () => {
  it("a file, a file in a folder, a spaced name, the index and the group's list", async () => {
    // the disk reader, in this process, pointed at the same folders as the server
    Object.assign(process.env, folders)
    const { SP } = await import("spell/parser/spell")
    const { diskFetch } = await import("spell/app/spaces/server/node/projects/disk-fetch")
    const urls = [
      SP.SpellUrls.fileUrl(`${PROJECT}/top.spell`),
      SP.SpellUrls.fileUrl(`${PROJECT}/folder/sub/file.spell`),
      SP.SpellUrls.fileUrl("owen@spell/Two Words/a folder/my file.spell"),
      SP.SpellUrls.fileUrl(`${PROJECT}/Proj.spell.js`)
    ]
    expect(urls[0]).toBe(`${FILES}top.spell`)
    for (const url of urls) {
      const reply = await request("GET", url)
      expect(reply.status, url).toBe(200)
      expect(await diskFetch({ url }), url).toBe(reply.text)
    }
    const index = SP.SpellUrls.indexUrl(PROJECT)
    expect(index).toBe(`/api/projects/index/${PLACE}`)
    // the disk reader reads what's published:  the server's index also lists files only drafted so far (epic `editor` P24)
    const published = (await request("GET", index))
      .json()
      .imports.filter(
        (entry: { path: string }) => entry.path.includes("@") || fs.existsSync(fixturePath(`user/Proj${entry.path}`))
      )
    expect((await diskFetch({ url: index })).imports).toEqual(published)
    const list = SP.SpellUrls.listUrl("owen@spell")
    expect(await diskFetch({ url: list })).toEqual((await request("GET", list)).json())
    const saved = SP.SpellUrls.saveUrl(`${PROJECT}/both.txt`)
    expect((await request("POST", saved, "over HTTP", "text/plain")).text).toBe("true")
    expect(await diskFetch({ url: saved, contents: "from disk" })).toBe(true)
    expect(readFixture("user/Proj/both.txt")).toBe("from disk")
  })
})

////////////////
// ## People (epic `people-and-orgs` P9)
////////////////

describe("/api/changes:  a change asked for on what's selected, for a Claude session", () => {
  const ASKED = {
    projectId: PROJECT,
    filePath: "/Proj.spell",
    line: 1,
    column: 0,
    kind: "ui-button",
    excerpt: "x",
    text: "say Stop"
  }

  it("POST adds it, and answers where its file is on this machine", async () => {
    const post = await request("POST", "/api/changes", JSON.stringify(ASKED), "application/json")
    expect(post.status).toBe(200)
    const made = JSON.parse(post.text)
    expect(made).toMatchObject({ status: "waiting", listening: false, text: "say Stop" })
    expect(made.diskPath).toContain("Proj.spell")
    const get = await request("GET", `/api/changes?id=${made.id}`)
    expect(JSON.parse(get.text)).toMatchObject({ id: made.id, status: "waiting" })
  })

  it("a file you have a draft of:  the request names your draft, what the editor shows you (I152)", async () => {
    await request("POST", `${SAVE}Drafted.spell`, "Score: 0", "text/plain")
    expect(readDraft("Drafted.spell")).toBe("Score: 0")
    const asked = { ...ASKED, filePath: "/Drafted.spell" }
    const made = JSON.parse((await request("POST", "/api/changes", JSON.stringify(asked), "application/json")).text)
    expect(made.diskPath).toMatch(/\/__draft\/Drafted\.owen-\d{4}-\d{2}-\d{2}\.spell$/)
    expect(fs.readFileSync(made.diskPath, "utf8")).toBe("Score: 0")
  })

  it("no words, no request:  400;  no such request:  404", async () => {
    const noWords = await request("POST", "/api/changes", JSON.stringify({ ...ASKED, text: "  " }), "application/json")
    expect(noWords.status).toBe(400)
    expect((await request("GET", "/api/changes?id=c999")).status).toBe(404)
  })
})

describe("GET and POST /api/people/me", () => {
  it("GET:  this machine's person, their starter file written the first time;  their orgs;  no problems", async () => {
    const reply = await request("GET", "/api/people/me")
    expect(reply.status).toBe(200)
    const { person, orgs, problems } = reply.json()
    expect(person).toMatchObject({ id: "owen", address: "owen@spell", dates: [] })
    expect(orgs).toEqual([])
    expect(problems).toEqual([])
    expect(readFixture("user/__me.json5")).toContain("// You, as spell knows you")
  })

  it("POST:  their changes written, the file's comments kept;  answered as GET", async () => {
    const body = JSON.stringify({ nickname: "O", dates: [{ label: "birthday", day: "1970-01-01" }] })
    const reply = await request("POST", "/api/people/me", body, "application/json")
    expect(reply.status).toBe(200)
    expect(reply.json().person).toMatchObject({ nickname: "O", dates: [{ label: "birthday", day: "1970-01-01" }] })
    const text = readFixture("user/__me.json5")!
    expect(text).toContain("// You, as spell knows you")
    expect(text).toContain('"nickname": "O"')
  })
})

////////////////
// ## Preferences (epic `prefs-and-undo` P2)
////////////////

describe("/api/prefs:  each person's preferences, in their space", () => {
  it("POST save, then GET load:  the value, kept in `__prefs/<store>.json5` in the person's space", async () => {
    expect((await request("GET", "/api/prefs/load?store=api-test&key=mode")).json()).toEqual({})
    const body = JSON.stringify({ store: "api-test", key: "mode", value: "debug" })
    const saved = await request("POST", "/api/prefs/save", body, "application/json")
    expect(saved.status).toBe(200)
    expect(saved.json()).toEqual({ value: "debug" })
    expect((await request("GET", "/api/prefs/load?store=api-test&key=mode")).json()).toEqual({ value: "debug" })
    expect(readFixture("user/__prefs/api-test.json5")).toContain('"mode": "debug"')
  })

  it("GET keys and POST forget:  a prefix's keys listed, then forgotten", async () => {
    for (const key of ["layout/left", "layout/right", "theme"]) {
      await request("POST", "/api/prefs/save", JSON.stringify({ store: "api-keys", key, value: 1 }), "application/json")
    }
    expect((await request("GET", "/api/prefs/keys?store=api-keys&under=layout/")).json()).toEqual({
      keys: ["layout/left", "layout/right"]
    })
    const forgot = await request(
      "POST",
      "/api/prefs/forget",
      JSON.stringify({ store: "api-keys", under: "layout/" }),
      "application/json"
    )
    expect(forgot.json()).toEqual({ keys: ["theme"] })
  })

  it("CHANGED:  a store name that reaches outside the person's `__prefs/` answers 400, not 500", async () => {
    const reply = await request("GET", "/api/prefs/load?store=../__me&key=names")
    expect(reply.status).toBe(400)
    expect(reply.json().errors[0].message).toContain("can't name a store")
  })

  it("the kit's `ServerPlace` talks to it:  a `PrefStore` on the server, its declared default too", async () => {
    const { PrefStore, ServerPlace } = await import("spell/util/persist")
    const place = new ServerPlace({ url: `${baseUrl}/api/prefs` })
    const prefs = new PrefStore("@owen/solitaire", { place }).declare("theme", { oneOf: ["light", "dark"] })
    expect(await prefs.load("theme")).toBe("light")
    await prefs.save("theme", "dark")
    expect(await prefs.update<number>("games", (games) => (games ?? 0) + 1)).toBe(1)
    expect(await prefs.load("theme")).toBe("dark")
    expect((await prefs.loadKeysUnder()).sort()).toEqual(["games", "theme"])
    expect(readFixture("user/__prefs/@owen/solitaire.json5")).toContain('"theme": "dark"')
  })
})

describe("the home page's order (epic `mockup` P19, `repo-split` P28)", () => {
  it("GET /api/home/order:  both layers;  this machine's person is `@spell`'s, in Spell's own checkout, so a change is everyone's (T51)", async () => {
    const reply = await request("GET", "/api/home/order")
    expect(reply.status).toBe(200)
    const answer = reply.json() as {
      setsDefaults: boolean
      defaults: { order: Record<string, string[]> }
      mine: object
    }
    expect(answer.setsDefaults).toBe(true)
    expect(answer.defaults.order.sections).toContain("examples")
    expect(answer.mine).toEqual({ order: {}, texts: {} })
  })

  it("a change that says nothing, or words on nothing, is 400 (T51)", async () => {
    const json = "application/json"
    expect((await request("POST", "/api/home/order", '{"group":"sections","names":["start"]}', json)).status).toBe(400)
    expect((await request("POST", "/api/home/order", '{"text":{"title":"x"}}', json)).status).toBe(400)
  })

  it("a sections' order naming something that isn't a section, or a group that isn't Spell's, is 400:  nothing written", async () => {
    const json = "application/json"
    const notASection = await request(
      "POST",
      "/api/home/order",
      '{"order":{"group":"sections","names":["sidebar"]}}',
      json
    )
    expect(notASection.status).toBe(400)
    expect(notASection.json().errors[0].message).toContain("the sections are projects, start, examples")
    const notAGroup = await request("POST", "/api/home/order", '{"order":{"group":"@acme/tools","names":["a"]}}', json)
    expect(notAGroup.status).toBe(400)
  })
})

describe("a project made from a start card, not one of your apps until it changes (epic `mockup` I42)", () => {
  const JSON_TYPE = "application/json"
  const json = (body: object) => JSON.stringify(body)
  /** Make project `name` in your space as a start card does:  made, then marked untouched;  answers its list entry. */
  async function started(name: string) {
    const projectId = `owen@spell/${name}`
    const made = await request("POST", "/api/projects/create/project", json({ projectId }), JSON_TYPE)
    expect(made.status).toBe(200)
    const marked = await request(
      "POST",
      "/api/projects/unsaved/project",
      json({ projectId, unsaved: "untouched" }),
      JSON_TYPE
    )
    expect(marked.status).toBe(200)
    return projectId
  }
  /** Project `projectId`'s mark, as its group's list says now. */
  async function markOf(projectId: string) {
    const list = (await request("GET", "/api/projects/list/owen@spell")).json() as { path: string; unsaved?: string }[]
    return list.find((entry) => entry.path === projectId)?.unsaved
  }

  it("marked untouched, its list entry says so, and its project file", async () => {
    const projectId = await started("StartedA")
    expect(await markOf(projectId)).toBe("untouched")
    expect(readFixture("user/StartedA/__project.json5")).toContain('"unsaved": "untouched"')
  })

  it("its first saved edit makes it changed;  what spell builds as it compiles doesn't", async () => {
    const projectId = await started("StartedB")
    await request("POST", `/api/projects/file/${projectId}/StartedB.spell.js`, "export default 1\n", "text/plain")
    expect(await markOf(projectId)).toBe("untouched")
    await request("POST", `/api/projects/file/${projectId}/Untitled.spell`, "set x to 1\n", "text/plain")
    expect(await markOf(projectId)).toBe("changed")
  })

  it("a file made, or its settings changed, is a change too", async () => {
    const made = await started("StartedC")
    await request(
      "POST",
      "/api/projects/create/file",
      json({ projectId: made, filePath: "/More.spell", contents: "x" }),
      JSON_TYPE
    )
    expect(await markOf(made)).toBe("changed")
    const settled = await started("StartedD")
    await request(
      "POST",
      "/api/projects/settings/project",
      json({ projectId: settled, settings: { version: "1.0.0" } }),
      JSON_TYPE
    )
    expect(await markOf(settled)).toBe("changed")
  })

  it("Save Current Changes keeps it for good:  the mark gone", async () => {
    const projectId = await started("StartedE")
    await request("POST", `/api/projects/file/${projectId}/Untitled.spell`, "set x to 2\n", "text/plain")
    const kept = await request("POST", "/api/projects/keep-draft", json({ projectId }), JSON_TYPE)
    expect(kept.status).toBe(200)
    expect(await markOf(projectId)).toBeUndefined()
    expect(readFixture("user/StartedE/__project.json5")).not.toContain("unsaved")
  })

  it("kept by hand (null), the mark goes;  a copy of a marked project is never marked", async () => {
    const projectId = await started("StartedF")
    const copied = await request(
      "POST",
      "/api/projects/duplicate/project",
      json({ projectId, newProjectId: "owen@spell/StartedFCopy" }),
      JSON_TYPE
    )
    expect(copied.status).toBe(200)
    expect(await markOf("owen@spell/StartedFCopy")).toBeUndefined()
    await request("POST", "/api/projects/unsaved/project", json({ projectId, unsaved: null }), JSON_TYPE)
    expect(await markOf(projectId)).toBeUndefined()
  })

  it("an untouched one left a day ago goes when the next is made;  a changed one stays", async () => {
    const old = await started("StartedOld")
    const changed = await started("StartedOldChanged")
    await request("POST", `/api/projects/file/${changed}/Untitled.spell`, "set x to 3\n", "text/plain")
    const dayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000)
    for (const name of ["StartedOld", "StartedOldChanged"]) {
      fs.utimesSync(fixturePath(`user/${name}/__project.json5`), dayAgo, dayAgo)
    }
    await started("StartedNew")
    expect(fs.existsSync(fixturePath("user/StartedOld"))).toBe(false)
    expect(await markOf(old)).toBeUndefined()
    expect(await markOf(changed)).toBe("changed")
  })

  it("any other mark is 400", async () => {
    const reply = await request(
      "POST",
      "/api/projects/unsaved/project",
      json({ projectId: PROJECT, unsaved: "changed" }),
      JSON_TYPE
    )
    expect(reply.status).toBe(400)
  })
})

////////////////
// ## An example opened as it is (epic `mockup` T52)
////////////////

describe("an example opened as it is:  your edits are your draft of it (epic `mockup` T52)", () => {
  const JSON_TYPE = "application/json"
  const json = (body: object) => JSON.stringify(body)
  /** Make example `name` in the built-ins, its one file `<name>.spell` saying `text`;  answers its folder. */
  function example(name: string, text: string): string {
    const folder = path.join(tempDir, `builtins/@spell/examples/${name}`)
    fs.mkdirSync(folder, { recursive: true })
    fs.writeFileSync(path.join(folder, "project.json"), JSON.stringify({ imports: [{ path: `/${name}.spell` }] }))
    fs.writeFileSync(path.join(folder, `${name}.spell`), text)
    return folder
  }

  it("a save, even in a checkout, is your draft:  the example's file stays as it was", async () => {
    const folder = example("Ex2", "published")
    expect(
      (await request("POST", "/api/projects/file/@spell/examples/Ex2/Ex2.spell", "mine", "text/plain")).status
    ).toBe(200)
    expect(fs.readFileSync(path.join(folder, "Ex2.spell"), "utf8")).toBe("published")
    expect((await request("GET", "/spaces/@spell/examples/Ex2/Ex2.spell")).text).toBe("mine")
    const { drafts, mayPublish } = (await request("GET", "/api/projects/drafts/@spell/examples/Ex2")).json()
    expect(drafts.map((draft: { filePath: string }) => draft.filePath)).toEqual(["/Ex2.spell"])
    expect(mayPublish).toBe(true)
  })

  it("Save as My App:  a copy in your space with your draft in its files, no drafts or versions;  the example's draft gone", async () => {
    const folder = example("Ex3", "published")
    fs.mkdirSync(path.join(folder, "versions"), { recursive: true })
    fs.writeFileSync(path.join(folder, "versions/Ex3.2026-01-01-000000.zip"), "zip")
    await request("POST", "/api/projects/file/@spell/examples/Ex3/Ex3.spell", "my change", "text/plain")
    const copied = await request(
      "POST",
      "/api/projects/duplicate/project",
      json({ projectId: "@spell/examples/Ex3", newProjectId: "owen@spell/Ex3", withDraft: true }),
      JSON_TYPE
    )
    expect(copied.status).toBe(200)
    expect(readFixture("user/Ex3/Ex3.spell")).toBe("my change")
    expect(fs.existsSync(fixturePath("user/Ex3/__draft"))).toBe(false)
    expect(fs.existsSync(fixturePath("user/Ex3/versions"))).toBe(false)
    expect(fs.readFileSync(path.join(folder, "Ex3.spell"), "utf8")).toBe("published")
    expect((await request("GET", "/spaces/@spell/examples/Ex3/Ex3.spell")).text).toBe("published")
    expect((await request("GET", "/api/projects/drafts/@spell/examples/Ex3")).json().drafts).toEqual([])
  })

  it("Update the Example:  Publish writes your draft into the example's own files", async () => {
    const folder = example("Ex4", "published")
    await request("POST", "/api/projects/file/@spell/examples/Ex4/Ex4.spell", "for everyone", "text/plain")
    const reply = await request("POST", "/api/projects/publish", json({ projectId: "@spell/examples/Ex4" }), JSON_TYPE)
    expect(reply.status).toBe(200)
    expect(fs.readFileSync(path.join(folder, "Ex4.spell"), "utf8")).toBe("for everyone")
  })
})
