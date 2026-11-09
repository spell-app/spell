/**
 * A Python program keeps a note in each kind of place it can, and finds them again after a restart (epic `data` P40).
 * - The program:  the frozen test project `@spell/test/kept-in-places`, compiled to Python into a folder the test keeps,
 *   so its database on this device, a file beside it, is still there for the second run.
 *   (`spell run` couldn't:  it compiles into a temporary folder each time.)
 * - Its data folder and CSV file:  on a page server's place routes the test starts (`SpaceFolders`), in a temporary
 *   spell.spaces, reached with the server's write token, as `spell run --target py` hands them over.
 * - Task List keeps its tasks in all four kinds of place, the Atmosphere too, on a fake AT Protocol host (epic `data` P46),
 *   signed in with the handle and the app password `spell run --target py` hands on from the environment.
 */
import { spawn } from "child_process"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"
import { SP } from "spell/parser/spell"
import { compiledFixture } from "spell/app/spaces/test"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The page server's write token, here. */
const TOKEN = "python-places-token"

/** The test project. */
const PROJECT = "kept-in-places"

/** `spell_core`'s uv project, which runs the program. */
const SPELL_CORE = resolve(import.meta.dirname, "../../../parser/src/py/core")

/**
 * Runs the program once, then keeps the note it's handed in each place (with `keep <text>`), then counts each place's:
 * its last line, as JSON.
 */
const DRIVER = `
import asyncio, json, sys
from spell_core.run import run_program

names = run_program(sys.argv[1], seed=1, pauses=False)
keeper = names["note_keeper"]
if sys.argv[2] == "keep":
    keeper.draft = sys.argv[3]
    keeper.keep_the_draft()
asyncio.run(keeper.count_the_notes())
print(json.dumps({"device": keeper.device_count, "folder": keeper.folder_count, "sheet": keeper.sheet_count}))
`

/** Task List, as a test project. */
const TASK_LIST = "@spell/examples/TaskList"

/**
 * Each of Task List's keepers in turn, as the person picks where to keep them:  each fills the checklist from its place,
 * adding its starting tasks when it holds none.  Its last line, as JSON:  each keeper's task titles.
 */
const TASK_LIST_DRIVER = `
import asyncio, json, sys
from spell_core.run import run_program

names = run_program(sys.argv[1], seed=1, pauses=False)
app = names["task_list"]

async def main():
    titles = {}
    for keeper in ("BrowserKeeper", "ServerKeeper", "SheetKeeper", "SkyKeeper"):
        app.keeper = names[keeper]()
        await app.fill_the_checklist()
        titles[keeper] = [task.title for task in app.checklist]
    print(json.dumps(titles))

asyncio.run(main())
`

/** The org file:  owen, this machine's person, is in Spell's org. */
const SPELL_ORG = JSON.stringify({
  $type: "Org",
  id: "spell",
  name: "Spell",
  members: [{ $type: "Membership", person: { $ref: "Person#owen@spell" }, role: "member" }]
})

describe("a Python program's places, over a restart", () => {
  let spaces: string
  let kept: string
  let folders: SpaceFolders
  let storage: DiskStorage
  let server: ReturnType<typeof createServer>
  let port: number

  beforeAll(async () => {
    spaces = mkdtempSync(join(tmpdir(), "spell-python-places-spaces-"))
    kept = mkdtempSync(join(tmpdir(), "spell-python-places-program-"))
    mkdirSync(join(spaces, "@spell", "owen@"), { recursive: true })
    writeFileSync(join(spaces, "@spell", "__org.json5"), SPELL_ORG)
    writeFileSync(join(spaces, "@spell", "owen@", "__me.json5"), JSON.stringify({ $type: "Person", id: "owen" }))
    storage = new DiskStorage(spaces)
    folders = new SpaceFolders({
      folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
      people: new PeopleStore(storage),
      personFor: () => "owen@spell"
    })
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: TOKEN })
    folders.route({ router, guard, upgrade: () => {} })
    server = createServer(SRV.toListener(router.handle))
    port = await SRV.listenPreferred(server)
    guard.allowPort(port)
  }, 60_000)

  afterAll(async () => {
    folders?.close()
    storage?.close()
    await new Promise<void>((done) => {
      server?.closeAllConnections()
      server?.close(() => done())
    })
    for (const folder of [spaces, kept]) if (folder) rmSync(folder, { recursive: true, force: true })
  })

  /**
   * Run the program kept in `kept` with the driver, with `env`:  its exit status and what it printed.
   * - Not `spawnSync()`:  the page server answering it runs in this process, so this one must keep running.
   */
  function driven(
    args: string[],
    env: Record<string, string>,
    program = join(kept, "KeptInPlaces.spell.py"),
    driver = DRIVER
  ): Promise<{ status: number | null; out: string; err: string }> {
    const child = spawn("uv", ["run", "--quiet", "--project", SPELL_CORE, "python", "-c", driver, program, ...args], {
      env: { ...process.env, ...env }
    })
    let out = ""
    let err = ""
    child.stdout.on("data", (data: Buffer) => (out += data))
    child.stderr.on("data", (data: Buffer) => (err += data))
    return new Promise((done) => child.on("close", (status) => done({ status, out, err })))
  }

  /** Run the program kept in `kept`, with the page server's address and token:  what it counted. */
  async function run(...args: string[]): Promise<{ device: number; folder: number; sheet: number }> {
    const { status, out, err } = await driven(args, {
      SPELL_SERVER_URL: `http://127.0.0.1:${port}`,
      SPELL_SERVER_TOKEN: TOKEN
    })
    expect(status, `${out}\n${err}`).toBe(0)
    return JSON.parse(out.trim().split("\n").at(-1)!)
  }

  test("a note kept on this device, in a data folder and in a CSV file is there after a restart", async () => {
    writeFileSync(join(kept, "KeptInPlaces.spell.py"), compiledFixture(PROJECT, "py"))
    // each run keeps one more note on this device as it starts:  "a run"
    expect(await run("keep", "oat milk")).toEqual({ device: 2, folder: 1, sheet: 1 })
    expect(await run("count")).toEqual({ device: 3, folder: 1, sheet: 1 })

    // the device file is beside the program
    expect(readFileSync(join(kept, "KeptInPlaces.device.json"), "utf8")).toContain('"text": "oat milk"')
    // the data folder:  a file per note, in the project's own data
    const data = join(spaces, ...SP.SpellUrls.folderFor(`@spell/test/${PROJECT}/__data/notes`)!.path.split("/"))
    const notes = readdirSync(data).filter((name) => name.endsWith(".json") && !name.startsWith("."))
    expect(notes.map((name) => readFileSync(join(data, name), "utf8")).join("\n")).toContain("oat milk")
    // the CSV file:  a row
    const sheet = join(spaces, ...SP.SpellUrls.folderFor(`@spell/test/${PROJECT}/__data/notes.csv`)!.path.split("/"))
    expect(existsSync(sheet) && readFileSync(sheet, "utf8")).toMatch(/oat milk/)
  }, 120_000)

  test("with no write token, a read of the server's places says why", async () => {
    writeFileSync(join(kept, "KeptInPlaces.spell.py"), compiledFixture(PROJECT, "py"))
    const { status, err } = await driven(["count"], { SPELL_SERVER_URL: "", SPELL_SERVER_TOKEN: "" })
    expect(status).not.toBe(0)
    expect(err).toMatch(/spell run --target py/)
  }, 60_000)

  describe("Task List in Python", () => {
    /** The account it signs in as, on the fake host. */
    const DID = "did:plc:ana"

    /** Task List's atmosphere collection. */
    const TASKS = "spaces.spell.examples.tasklist.task"

    /** The tasks a checklist starts with, as the program's first run adds them. */
    const STARTING_TASKS = [
      "Write the Task List example",
      "Teach it to draw",
      "Select some tasks, then edit them together",
      "Drag tasks to reorder them"
    ]

    let atmosphere: FakeAtmosphere

    beforeAll(async () => {
      atmosphere = await new FakeAtmosphere().start(["host-1"])
      atmosphere.addAccount(DID, { handle: "ana.test", host: "host-1", password: "an-app-password" })
      writeFileSync(join(kept, "TaskList.spell.py"), compiledFixture(TASK_LIST, "py"))
    })

    afterAll(() => atmosphere?.close())

    /** Task List's driver, run with `env`:  its exit status and what it printed. */
    function ranTaskList(env: Record<string, string>): Promise<{ status: number | null; out: string; err: string }> {
      return driven([], env, join(kept, "TaskList.spell.py"), TASK_LIST_DRIVER)
    }

    test("signed in, its tasks are kept in all four places, the atmosphere account's after a restart too", async () => {
      const env = {
        SPELL_SERVER_URL: `http://127.0.0.1:${port}`,
        SPELL_SERVER_TOKEN: TOKEN,
        SPELL_ATMOSPHERE: JSON.stringify(atmosphere.network),
        ATMOSPHERE_HANDLE: "ana.test",
        ATMOSPHERE_APP_PASSWORD: "an-app-password"
      }
      const first = await ranTaskList(env)
      expect(first.status, `${first.out}\n${first.err}`).toBe(0)
      const shown = JSON.parse(first.out.trim().split("\n").at(-1)!) as Record<string, string[]>
      for (const keeper of ["BrowserKeeper", "ServerKeeper", "SheetKeeper", "SkyKeeper"]) {
        expect(shown[keeper]).toEqual(STARTING_TASKS)
      }
      expect([...atmosphere.recordsOf(DID, TASKS).values()].map(({ value }) => value.title)).toContain(
        "Teach it to draw"
      )

      // the tasks are read back:  in order, and not added again
      const second = await ranTaskList(env)
      expect(second.status, `${second.out}\n${second.err}`).toBe(0)
      expect(JSON.parse(second.out.trim().split("\n").at(-1)!)).toEqual(shown)
      expect(atmosphere.recordsOf(DID, TASKS).size).toBe(STARTING_TASKS.length)
    }, 120_000)

    test("with no sign-in, its read says how to", async () => {
      const { status, err } = await ranTaskList({
        SPELL_SERVER_URL: `http://127.0.0.1:${port}`,
        SPELL_SERVER_TOKEN: TOKEN,
        SPELL_ATMOSPHERE: JSON.stringify(atmosphere.network),
        ATMOSPHERE_HANDLE: "",
        ATMOSPHERE_APP_PASSWORD: ""
      })
      expect(status).not.toBe(0)
      expect(err).toMatch(/ATMOSPHERE_HANDLE and ATMOSPHERE_APP_PASSWORD/)
    }, 60_000)
  })
})
