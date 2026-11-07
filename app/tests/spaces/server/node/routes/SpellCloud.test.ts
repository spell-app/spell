/**
 * `SpellCloud`:  Spell's server for people outside this machine (epic `atmosphere` P8).
 * - Real HTTP, a temporary spell.spaces and folder of its own, asked as a browser outside would, by its address's host.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SESSION_COOKIE } from "spell/server/signIn"
import { ask } from "spell/server/test/serve"
import { SP } from "spell/parser/spell"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { HANDLE_LOOKUP_PATH, SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { MailCatcher } from "spell/server/signIn"

/** Where people reach it, here. */
const ADDRESS = "https://cloud.test.example"

/** What a browser outside sends:  its address's host, and origin for a write. */
const OUTSIDE = { host: "cloud.test.example", origin: ADDRESS }

/** Ana's email. */
const ANA = "ana@example.com"

describe("Spell's cloud", () => {
  const spaces = mkdtempSync(join(tmpdir(), "spell-cloud-spaces-"))
  const dir = mkdtempSync(join(tmpdir(), "spell-cloud-"))
  let cloud: SpellCloud
  let port: number
  /** Ana's session cookie, once she's signed in. */
  let anasCookie = ""

  beforeAll(async () => {
    cloud = new SpellCloud({
      address: ADDRESS,
      dir,
      people: new PeopleStore(new DiskStorage(spaces)),
      folderFor: (address) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
      abuseContact: "abuse@test.example"
    })
    await cloud.listen({ port: 0, backups: "off" })
    port = cloud.server.port
  })

  afterAll(async () => {
    await cloud?.close()
    rmSync(spaces, { recursive: true, force: true })
    rmSync(dir, { recursive: true, force: true })
  })

  /** POST `path` with `body`, as a browser outside;  `cookie`:  signed in. */
  const post = (path: string, body: object, cookie = "") =>
    ask(port, "POST", path, {
      body: JSON.stringify(body),
      headers: { ...OUTSIDE, "content-type": "application/json", ...(cookie && { cookie }) }
    })

  test("its record:  its port and token, readable by this machine's person only", () => {
    const record = SpellCloud.record(dir)!
    expect(record).toMatchObject({ pid: process.pid, port, address: ADDRESS })
    expect(record.token).toBe(cloud.server.guard.token)
    expect(statSync(join(dir, "cloud.json")).mode & 0o777).toBe(0o600)
  })

  test("its address's host is let in;  any other host is refused", async () => {
    expect((await ask(port, "GET", "/hello", { headers: OUTSIDE })).status).toBe(200)
    expect((await ask(port, "GET", "/hello", { headers: { host: "elsewhere.example" } })).status).toBe(403)
  })

  test("what the mail catcher caught is never served:  it would hand anyone everyone's codes", async () => {
    expect((await ask(port, "GET", "/sign-in/mail", { headers: OUTSIDE })).status).toBe(404)
    expect((await ask(port, "GET", "/api/sign-in/mail", { headers: OUTSIDE })).status).toBe(404)
    expect((await ask(port, "GET", "/sign-in/confirm", { headers: OUTSIDE })).status).toBe(200)
  })

  test("nobody signed in writes nothing:  nobody outside is this machine's person", async () => {
    const answer = await post("/api/places/spaces/personal/family-cookbook/apply", {
      changes: [{ changeId: "c-1", kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Soup" } }]
    })
    expect(answer.status).toBe(403)
    expect(existsSync(join(spaces, "@spell", "ana@"))).toBe(false)
  })

  test("invited, by this machine's own token;  signed in by the mailed code, her cookie Secure", async () => {
    const refused = await post("/api/sign-in/invite", { email: ANA })
    expect(refused.status).toBe(403)
    const invited = await ask(port, "POST", "/api/sign-in/invite", {
      body: JSON.stringify({ email: ANA }),
      headers: {
        host: `127.0.0.1:${port}`,
        "content-type": "application/json",
        "x-server-token": cloud.server.guard.token
      }
    })
    expect(invited.status).toBe(200)
    expect(JSON.parse(invited.text)).toEqual({ person: "ana@spell" })

    expect((await post("/api/sign-in/ask", { email: ANA })).status).toBe(200)
    const mail = await new MailCatcher({ folder: join(dir, "mail") }).newestTo(ANA)
    // its link is where people reach it, not this machine's address
    expect(mail!.text).toContain(`${ADDRESS}/sign-in/confirm?key=`)
    const code = /^\d{6}$/m.exec(mail!.text)![0]
    const signedIn = await post("/api/sign-in/code", { email: ANA, code })
    expect(signedIn.status).toBe(200)
    const setCookie = `${signedIn.headers["set-cookie"]}`
    expect(setCookie).toMatch(/HttpOnly; SameSite=Strict.*; Secure/)
    anasCookie = /spell-session=[^;]+/.exec(setCookie)![0]
    expect(anasCookie).toContain(SESSION_COOKIE)
  })

  test("signed in, her cloud is her own space's folder:  ana@spell/__data/family-cookbook", async () => {
    const answer = await post(
      "/api/places/spaces/personal/family-cookbook/apply",
      { changes: [{ changeId: "c-2", kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Soup" } }] },
      anasCookie
    )
    expect(answer.status).toBe(200)
    const list = join(spaces, "@spell", "ana@", "__data", "family-cookbook", "recipes.list.json")
    expect(readFileSync(list, "utf8")).toContain("Soup")
    expect(readFileSync(list, "utf8")).toContain("ana@spell")
  })

  test("a built-in program's page, and its files;  nobody's own projects", async () => {
    const page = await ask(port, "GET", "/apps/@spell/examples/RecipeBox", { headers: OUTSIDE })
    expect(page.status).toBe(200)
    expect(page.text).toContain("<spell-viewer")
    expect(page.text).not.toContain("SPELL_SERVER")
    expect((await ask(port, "GET", "/apps/owen@spell/errors", { headers: OUTSIDE })).status).toBe(404)
    const source = await ask(port, "GET", "/spaces/@spell/examples/RecipeBox/RecipeBox.api.spell", { headers: OUTSIDE })
    expect(source.status).toBe(200)
    expect((await ask(port, "GET", "/spaces/owen@spell/errors/errors.spell", { headers: OUTSIDE })).status).toBe(404)
    expect((await ask(port, "GET", "/terms", { headers: OUTSIDE })).status).toBe(200)
  })
  test("AT Protocol's handle look-up, on a handle's own host:  the account's DID, as text (epic `atmosphere` P16)", async () => {
    const people = new PeopleStore(new DiskStorage(spaces))
    const { person } = await people.me("cy", "rs")
    await people.save(Object.assign(person, { did: "did:plc:cy-test" }))
    await people.me("bo", "rs")
    const lookUp = (host: string, path = HANDLE_LOOKUP_PATH, method = "GET") =>
      ask(port, method, path, { headers: { host } })

    const cy = await lookUp("cy.rs.spell.space")
    expect(cy.status).toBe(200)
    expect(cy.text).toBe("did:plc:cy-test")
    expect((await lookUp("CY.rs.spell.space:443")).text).toBe("did:plc:cy-test")
    // an account with no id yet, and nobody at all:  not found
    expect((await lookUp("bo.rs.spell.space")).status).toBe(404)
    expect((await lookUp("zed.rs.spell.space")).status).toBe(404)
    // a handle's host answers nothing else
    expect((await lookUp("cy.rs.spell.space", "/hello")).status).toBe(404)
    expect((await lookUp("cy.rs.spell.space", "/terms")).status).toBe(404)
    // anyone else's name is still refused
    expect((await lookUp("cy.rs.bsky.social")).status).toBe(403)
    expect((await lookUp("ana.spell.space")).status).toBe(403)
  })
})
