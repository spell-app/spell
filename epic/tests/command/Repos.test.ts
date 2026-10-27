/**
 * Tests of `epic repo` (`Repos`) and of `epic hub`'s checks before it starts anything (`Hub`), in a temp home folder.
 * - no server is started here (the server itself:  `EpicServer.test.ts`);  a port taken:  a plain web server's
 */
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { EpicCommandError } from "spell-epic/command/command.types"
import { Hub } from "spell-epic/command/Hub"
import { Repos } from "spell-epic/command/Repos"
import { RepoList } from "spell-epic/server/RepoList"

const top = realpathSync(mkdtempSync(join(tmpdir(), "epic-repo-cmd-")))
afterAll(() => rmSync(top, { recursive: true, force: true }))

/** A scratch repo checkout whose content is its `docs/`. */
function repo(name: string): string {
  const checkout = join(top, name)
  mkdirSync(join(checkout, ".epic"), { recursive: true })
  mkdirSync(join(checkout, "docs", "epics"), { recursive: true })
  writeFileSync(join(checkout, ".epic", "config.json5"), '{ "contentFolder": "docs" }\n')
  return checkout
}

let printed: string[] = []
beforeEach(() => {
  printed = []
  vi.spyOn(process.stdout, "write").mockImplementation((text) => {
    printed.push(String(text))
    return true
  })
})
afterEach(() => vi.restoreAllMocks())

describe("epic repo", () => {
  test("add, list (and --json), default, remove", async () => {
    const list = new RepoList({ home: join(top, "home1") })
    const repos = new Repos({ list })
    const [one, two] = [repo("one"), repo("two")]
    expect(await repos.run(["add", one])).toBe(0)
    expect(await repos.run(["add", two, "--name", "second"])).toBe(0)
    expect(printed.join("")).toBe(
      `added one  /r/one/ (and /)  ${one}  content ${join(one, "docs")}\n` +
        `added second  /r/second/  ${two}  content ${join(two, "docs")}\n`
    )
    expect(await repos.run(["default", "second"])).toBe(0)
    printed = []
    expect(await repos.run(["list", "--json"])).toBe(0)
    expect(
      JSON.parse(printed.join("")).map((each: { name: string; isDefault: boolean }) => [each.name, each.isDefault])
    ).toEqual([
      ["one", false],
      ["second", true]
    ])
    expect(await repos.run(["remove", "one"])).toBe(0)
    expect(list.repos().map((each) => each.name)).toEqual(["second"])
  })

  test("refused, saying why:  an unknown verb, a missing name, a repo not there, a name taken", async () => {
    const repos = new Repos({ list: new RepoList({ home: join(top, "home2") }) })
    await expect(repos.run(["bogus"])).rejects.toThrow(/unknown verb 'bogus'/)
    await expect(repos.run(["remove"])).rejects.toThrow(/which repo/)
    await expect(repos.run(["remove", "nope"])).rejects.toThrow(EpicCommandError)
    await repos.run(["add", repo("three"), "--name", "x"])
    await expect(repos.run(["add", repo("four"), "--name", "x"])).rejects.toThrow(/is .* already/)
    printed = []
    expect(await new Repos({ list: new RepoList({ home: join(top, "empty") }) }).run(["list"])).toBe(0)
    expect(printed.join("")).toMatch(/no repos yet/)
  })
})

describe("epic hub, before it starts anything", () => {
  test("no repos:  refused;  a file in no repo's content:  refused;  a bad verb:  refused", async () => {
    const hub = new Hub({ home: join(top, "home3") })
    await expect(hub.run(["ensure"])).rejects.toThrow(/no repos to serve yet/)
    await expect(hub.urlOf(join(top, "elsewhere.html"))).rejects.toThrow(/in no registered repo's content/)
    await expect(hub.run(["url"])).rejects.toThrow(/which file/)
    await expect(hub.run(["bogus"])).rejects.toThrow(/unknown verb 'bogus'/)
  })

  test("status with no server:  'not running', exit 1", async () => {
    expect(await new Hub({ home: join(top, "home4") }).run(["status"])).toBe(1)
    expect(printed.join("")).toBe("not running\n")
  })
  // epic `epic-engine` I69:  it took any free port instead, and every restart moved open pages to a dead address
  test("its port taken by another program:  refused on one line, saying so, nothing started elsewhere", async () => {
    const home = join(top, "home5")
    await new Repos({ list: new RepoList({ home }) }).run(["add", repo("five")])
    const other = createServer((_request, reply) => reply.writeHead(404).end())
    await new Promise<void>((done) => other.listen(0, "127.0.0.1", done))
    const { port } = other.address() as AddressInfo
    try {
      const refused = new Hub({ home }).run(["ensure", "--port", String(port)])
      await expect(refused).rejects.toThrow(EpicCommandError)
      await expect(refused).rejects.toThrow(`epic server:  port ${port} is taken, by another program`)
      expect(existsSync(join(home, "server.json"))).toBe(false)
    } finally {
      other.closeAllConnections()
      await new Promise((done) => other.close(done))
    }
  })
})
