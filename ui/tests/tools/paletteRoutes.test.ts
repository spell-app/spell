import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"
import { PALETTE_GROUPS_API } from "spell/ui/docs-components/docs-components.types"
import { paletteRoutesFor, paletteTableOrDie } from "spell/ui/tools/paletteRoutes"

/** A table as the palette groups page saves it. */
const TABLE = {
  groups: [
    { topic: "buttons", icon: "hand pointer", tags: ["ui-buttons", "ui-button"] },
    { title: "Mine", tags: ["ui-card"] }
  ],
  hidden: ["ui-ad"]
}

describe("the palette groups route (epic `editor` T81)", () => {
  const folder = mkdtempSync(join(tmpdir(), "palette-groups-"))
  const file = join(folder, "paletteGroups.json")
  let server: PageServer
  let port: number

  beforeAll(async () => {
    writeFileSync(file, `${JSON.stringify({ groups: [{ topic: "layout", tags: ["ui-grid"] }] })}\n`)
    server = new PageServer({ root: folder })
    await paletteRoutesFor(file).setup(server.routeContext())
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => {
    await server.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  /** PUT `body` from a page this server served (its token, its origin);  the status and the answer */
  async function save(body: unknown, token = server.web.guard.token) {
    const answer = await ask(port, "PUT", PALETTE_GROUPS_API, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "x-server-token": token, origin: `http://127.0.0.1:${port}` }
    })
    return { status: answer.status, body: JSON.parse(answer.text) as unknown }
  }

  test("reads the table as it is", async () => {
    const answer = await ask(port, "GET", PALETTE_GROUPS_API)
    expect(answer.status).toBe(200)
    expect(JSON.parse(answer.text)).toEqual({ groups: [{ topic: "layout", tags: ["ui-grid"] }] })
  })

  test("writes the table whole, formatted as `yarn format` does, and reads it back", async () => {
    expect(await save(TABLE)).toEqual({ status: 200, body: { ok: true } })
    expect(readFileSync(file, "utf8")).toBe(await SRV.formatHTML(file, JSON.stringify(TABLE, null, 2)))
    expect(JSON.parse((await ask(port, "GET", PALETTE_GROUPS_API)).text)).toEqual(TABLE)
  })

  test("refuses a write without the page's token, and a body that isn't a table", async () => {
    expect((await save(TABLE, "wrong")).status).toBe(403)
    expect(await save({ groups: [{ topic: "layout" }] })).toEqual({
      status: 400,
      body: { error: `PUT ${PALETTE_GROUPS_API}:  group 1 needs \`tags\`, a list of tags` }
    })
    // what was there stays
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(TABLE)
  })
})

describe("paletteTableOrDie()", () => {
  test("keeps only the fields a table has, `hidden` empty when left out", () => {
    expect(paletteTableOrDie({ groups: [{ title: "A", tags: [], extra: 1 }], other: true })).toEqual({
      groups: [{ title: "A", tags: [] }],
      hidden: []
    })
  })

  test("keeps a group's icon, which must be text (epic `editor` T86)", () => {
    expect(paletteTableOrDie({ groups: [{ title: "A", icon: "star", tags: [] }] }).groups).toEqual([
      { title: "A", icon: "star", tags: [] }
    ])
    expect(() => paletteTableOrDie({ groups: [{ title: "A", icon: 3, tags: [] }] })).toThrow(
      /group 1.s `icon` isn.t text/
    )
  })

  test("a group needs a topic or a title", () => {
    expect(() => paletteTableOrDie({ groups: [{ tags: [] }] })).toThrow(/group 1 needs a `topic` or a `title`/)
    expect(() => paletteTableOrDie({ groups: "no" })).toThrow(/send `\{ groups: \[...\] \}`/)
  })
})
