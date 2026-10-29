import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import type { SRV } from "spell/server"
import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"
import { EpicHome } from "spell/epic/config/EpicHome"
import personRoutes from "spell/epic/tools/personRoutes"

/** `personRoutes` on a real page server, a scratch epic home (`$SPELL_EPIC_HOME`) and no git name. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "person-routes-")))
const before = { ...process.env }
process.env.SPELL_EPIC_HOME = join(TEMP, "home")
process.env.GIT_CONFIG_GLOBAL = join(TEMP, "gitconfig")
process.env.GIT_CONFIG_NOSYSTEM = "1"
writeFileSync(join(TEMP, "gitconfig"), "")
afterAll(() => {
  for (const key of ["SPELL_EPIC_HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM"])
    if (before[key] === undefined) delete process.env[key]
    else process.env[key] = before[key]
  rmSync(TEMP, { recursive: true, force: true })
})

describe("personRoutes", () => {
  test("tells every page the page server serves who is at the keyboard;  nobody:  no field", async () => {
    const root = join(TEMP, "checkout")
    mkdirSync(join(root, "docs"), { recursive: true })
    writeFileSync(join(root, "docs", "page.html"), "<!doctype html><head></head><p>page</p>\n")
    const server = new PageServer({ root })
    await personRoutes.setup(server.routeContext())
    await server.start({ port: 0, routes: false, pidFile: false })
    /** the page's `window.SPELL_SERVER`, as served */
    const config = async () => {
      const answer = await ask(server.info.port, "GET", "/docs/page.html")
      return JSON.parse(/window\.SPELL_SERVER = (.*?)<\/script>/.exec(answer.text)![1]!) as SRV.ServerConfig
    }
    const cwd = process.cwd()
    // outside any repo:  only the scratch git config could name anyone
    process.chdir(TEMP)
    try {
      expect((await config()).person).toBeUndefined()
      EpicHome.keepPerson("Ana")
      expect((await config()).person).toBe("Ana")
    } finally {
      process.chdir(cwd)
      await server.stop()
    }
  })
})
