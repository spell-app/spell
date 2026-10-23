import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { EpicTools } from "spell-epic/command/EpicTools"

/**
 * Two fake checkouts:
 * - CODE:  the running `epic`'s, its tools fake scripts that report what they got
 * - DATA:  the caller's, where the command runs from, with the same files
 * - ONE copy of the code (epic `epic-eject` P5):  every epic tool must be CODE's script, working on DATA.
 * - DATA installs a fake kit, `spell`, whose `src/server/page/cli.ts` is the page server (`SERVER`), and whose
 *   `bin/spell.mjs` is the `spell` command (`serve`'s:  `spell server start all`)
 */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "epic-tools-")))
const CODE = join(TEMP, "code")
const DATA = join(TEMP, "data")
/** A folder inside the caller's checkout, to run from. */
const INSIDE = join(DATA, "packages", "app")
/** The kit DATA's install resolves, and its `src/server/` folder:  `spell/server`. */
const KIT = join(DATA, "node_modules", "spell")
const SERVER = join(KIT, "src", "server")
/** Where each run's report goes. */
const REPORT = join(TEMP, "report.json")
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

const SCRIPT = (
  owner: string
) => `process.getBuiltinModule("node:fs").writeFileSync(process.env.REPORT, JSON.stringify({
  owner: ${JSON.stringify(owner)}, args: process.argv.slice(2), cwd: process.cwd(),
  checkout: process.env.EPIC_CHECKOUT, tsconfig: process.env.TSX_TSCONFIG_PATH
}))
process.exit(3)
`
for (const [root, owner] of [
  [CODE, "code"],
  [DATA, "data"]
] as const) {
  for (const { tool } of Object.values(EpicTools.TOOLS)) {
    mkdirSync(join(root, tool, ".."), { recursive: true })
    // plain node runs the `.ts` ones too (no types in them):  `tsx` is the loader, given by path
    writeFileSync(join(root, tool), SCRIPT(owner))
  }
  writeFileSync(join(root, "tsconfig.json"), "{}")
}
mkdirSync(join(DATA, ".git"))
writeFileSync(join(DATA, "package.json"), JSON.stringify({ name: "data", pageServer: {} }))
mkdirSync(join(SERVER, "page"), { recursive: true })
writeFileSync(
  join(KIT, "package.json"),
  JSON.stringify({
    name: "spell",
    exports: { "./server": "./src/server/index.ts", "./package.json": "./package.json" }
  })
)
mkdirSync(join(KIT, "bin"), { recursive: true })
writeFileSync(join(KIT, "bin", "spell.mjs"), SCRIPT("kit"))
writeFileSync(join(SERVER, "index.ts"), "")
writeFileSync(join(SERVER, "page", "cli.ts"), SCRIPT("server"))
writeFileSync(join(KIT, "tsconfig.node.json"), "{}")
mkdirSync(INSIDE, { recursive: true })

/** Run tool `name` from `INSIDE` with CODE as the code:  its exit code, and what the fake tool reported. */
async function run(name: Parameters<typeof EpicTools.run>[0], args: string[]) {
  rmSync(REPORT, { force: true })
  const status = await EpicTools.run(name, args, { cwd: INSIDE, codeRoot: CODE, env: { REPORT } })
  return { status, ...JSON.parse(readFileSync(REPORT, "utf8")) }
}

describe("EpicTools.run()", () => {
  test("window:  the running epic's script, args verbatim, in the caller's folder;  the caller's checkout is the data", async () => {
    const window = await run("window", ["open", "x", "--all", "--json"])
    expect(window).toMatchObject({ status: 3, owner: "code", args: ["open", "x", "--all", "--json"], checkout: DATA })
    expect(realpathSync(window.cwd)).toBe(INSIDE)
    expect(window.tsconfig).toBeUndefined()
  })

  test("details, choices:  at the caller's checkout's root", async () => {
    for (const name of ["details", "choices"] as const) {
      const tool = await run(name, ["list", "seo"])
      expect(tool).toMatchObject({ status: 3, owner: "code", args: ["list", "seo"], checkout: DATA })
      expect(realpathSync(tool.cwd)).toBe(DATA)
    }
  })

  test("notes, comments, agents, airplane:  under tsx with the CODE's config, in the caller's folder", async () => {
    for (const name of ["notes", "comments", "agents", "airplane"] as const) {
      const tool = await run(name, ["answer", "guides/x.html#n3", "--file", "reply.html"])
      expect(tool).toMatchObject({ status: 3, owner: "code", checkout: DATA })
      expect(tool.args).toEqual(["answer", "guides/x.html#n3", "--file", "reply.html"])
      expect(realpathSync(tool.cwd)).toBe(INSIDE)
      expect(tool.tsconfig).toBe(join(CODE, "tsconfig.json"))
    }
  })

  test("server:  the spell/server the CALLER's install resolves, with the kit's node config", async () => {
    const server = await run("server", ["status"])
    expect(server).toMatchObject({ status: 3, owner: "server", args: ["status"], checkout: DATA })
    expect(server.tsconfig).toBe(join(KIT, "tsconfig.node.json"))
  })

  test("serve:  the kit's spell, which the CALLER's install resolves", async () => {
    expect(await run("serve", ["server", "start", "all"])).toMatchObject({
      owner: "kit",
      args: ["server", "start", "all"]
    })
  })
})

describe("EpicTools.hasPageServer()", () => {
  test("a checkout with page server settings that installs spell/server", () => {
    expect(EpicTools.hasPageServer(INSIDE)).toBe(true)
  })

  test("not without the settings (spell-epic, a repo epic init set up), nor without the package", () => {
    const bare = join(TEMP, "bare")
    mkdirSync(join(bare, ".git"), { recursive: true })
    writeFileSync(join(bare, "package.json"), JSON.stringify({ name: "bare" }))
    expect(EpicTools.hasPageServer(bare)).toBe(false)
    writeFileSync(join(bare, "package.json"), JSON.stringify({ name: "bare", pageServer: {} }))
    expect(EpicTools.hasPageServer(bare)).toBe(false)
  })
})

describe("EpicTools.toolArgs()", () => {
  test("plain node:  just the script;  tsx:  this checkout's loader first", () => {
    expect(EpicTools.toolArgs(EpicTools.TOOLS.window, "/wt")).toEqual(["/wt/src/window.mjs"])
    expect(EpicTools.toolArgs(EpicTools.TOOLS.notes, "/wt")).toEqual([
      "--import",
      expect.stringMatching(/\/tsx\/dist\/loader\.mjs$/),
      "/wt/src/tools/notes.ts"
    ])
  })
})
