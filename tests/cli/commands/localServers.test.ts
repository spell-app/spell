import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { spellServers, stopServers } from "spell/cli/commands/localServers"

/**
 * `spellServers()` on made-up `ps` rows:  a checkout and its worktree, an older checkout elsewhere, a project's npm
 * install, and a project's own vite.  NEVER the machine's processes:  every row is handed in.
 */
const root = realpathSync(mkdtempSync(join(tmpdir(), "local-servers-")))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const kit = join(root, "spell")
const worktree = join(root, "spell.worktrees", "seo")
const old = join(root, "spell-app")
const project = join(root, "app")
for (const folder of [kit, old, project]) mkdirSync(folder, { recursive: true })
writeFileSync(join(kit, "package.json"), JSON.stringify({ name: "spell" }))
writeFileSync(join(old, "package.json"), JSON.stringify({ name: "spell" }))
writeFileSync(join(project, "package.json"), JSON.stringify({ name: "app" }))
for (const args of [
  ["init", "-q"],
  ["commit", "-q", "--allow-empty", "-m", "x"],
  ["worktree", "add", "-q", worktree]
])
  spawnSync("git", ["-c", "user.name=x", "-c", "user.email=alice@acme.test", ...args], { cwd: kit })
writeFileSync(join(worktree, "package.json"), JSON.stringify({ name: "spell" }))
spawnSync("git", ["init", "-q"], { cwd: old })

/** A `ps` row. */
const row = (pid: number, command: string, port?: number) => ({ pid, command, port })

describe("spellServers()", () => {
  test("yours:  your checkout and its worktrees;  not:  an older checkout, an npm install, a folder that's gone", () => {
    const servers = spellServers(kit, [
      row(1, `node --import tsx ${kit}/src/server/page/cli.ts serve --root ${kit} --port 4747`, 4747),
      row(2, `node ${worktree}/node_modules/vite-plus/bin/vp dev --port 3001`, 3001),
      row(3, `node ${old}/src/server/page/cli.ts serve --root ${old}`, 4747),
      row(4, `node ${project}/node_modules/spell/dist/epic/cli/epicMain.js hub serve --port 4848`, 4848),
      row(5, `node ${kit}/epic/bin/epic hub serve --port 4848`),
      row(6, `node ${project}/node_modules/vite/bin/vite.js dev`),
      row(7, `node ${join(root, "gone")}/src/server/page/cli.ts serve`),
      row(8, "node something-else.js")
    ])
    expect(servers.map(({ pid, kind, copy, isYours }) => ({ pid, kind, copy, isYours }))).toEqual([
      { pid: 1, kind: "page", copy: kit, isYours: true },
      { pid: 2, kind: "vite", copy: worktree, isYours: true },
      { pid: 3, kind: "page", copy: old, isYours: false },
      { pid: 4, kind: "epic", copy: join(project, "node_modules", "spell"), isYours: false },
      { pid: 5, kind: "epic", copy: kit, isYours: true },
      { pid: 7, kind: "page", copy: join(root, "gone"), isYours: false }
    ])
  })

  test("stopServers():  each signalled;  one gone already counts as stopped;  another failure doesn't", () => {
    const servers = spellServers(kit, [
      row(3, `node ${old}/src/server/page/cli.ts serve`),
      row(4, `node ${project}/node_modules/spell/dist/epic/cli/epicMain.js hub serve`),
      row(7, `node ${join(root, "gone")}/src/server/page/cli.ts serve`)
    ])
    const signalled: number[] = []
    const kill = (pid: number) => {
      signalled.push(pid)
      if (pid === 4) throw Object.assign(new Error("gone"), { code: "ESRCH" })
      if (pid === 7) throw Object.assign(new Error("not yours"), { code: "EPERM" })
    }
    expect(stopServers(servers, kill).map((server) => server.pid)).toEqual([3, 4])
    expect(signalled).toEqual([3, 4, 7])
  })
})
