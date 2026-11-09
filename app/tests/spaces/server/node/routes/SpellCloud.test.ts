/**
 * `SpellCloud`:  Spell's server for people outside this machine (epic `atmosphere` P8).
 * - Real HTTP, a temporary spell.spaces and folder of its own, asked as a browser outside would, by its address's host.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SESSION_COOKIE } from "spell/server/signIn"
import { ask } from "spell/server/test/serve"
import { SP } from "spell/parser/spell"
import { OrgSetup } from "spell/app/spaces/server/node/people/OrgSetup"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
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
  const people = new PeopleStore(new DiskStorage(spaces))
  const folderFor = (address: string) => join(spaces, ...SP.SpellUrls.folderFor(address)!.path.split("/"))

  beforeAll(async () => {
    cloud = new SpellCloud({
      address: ADDRESS,
      dir,
      people,
      folderFor,
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

  describe("a program in an org's shared space", () => {
    /** GET `path` as a browser outside;  `cookie`:  signed in. */
    const get = (path: string, cookie = "") =>
      ask(port, "GET", path, { headers: { ...OUTSIDE, ...(cookie && { cookie }) } })
    /** Bo, invited and signed in:  nobody in RS. */
    let bosCookie = ""
    const BO = "bo@example.com"

    beforeAll(async () => {
      const folders = new SpaceFolders({ folderFor, people })
      await new OrgSetup({ people, roles: folders.orgRoles, folderFor }).create({ org: "rs", admins: [ANA] })
      folders.close()
      await ask(port, "POST", "/api/sign-in/invite", {
        body: JSON.stringify({ email: BO }),
        headers: {
          host: `127.0.0.1:${port}`,
          "content-type": "application/json",
          "x-server-token": cloud.server.guard.token
        }
      })
      await post("/api/sign-in/ask", { email: BO })
      const mail = await new MailCatcher({ folder: join(dir, "mail") }).newestTo(BO)
      const signedIn = await post("/api/sign-in/code", { email: BO, code: /^\d{6}$/m.exec(mail!.text)![0] })
      bosCookie = /spell-session=[^;]+/.exec(`${signedIn.headers["set-cookie"]}`)![0]
    })

    test("someone in the org gets its page and its files", async () => {
      const page = await get("/apps/@rs/OrgAdmin", anasCookie)
      expect(page.status).toBe(200)
      expect(page.text).toContain("<spell-viewer")
      // past the cloud's own check;  the file is read from this machine's spell.spaces, not this test's
      expect((await get("/spaces/@rs/OrgAdmin/OrgAdmin.api.spell", anasCookie)).text).not.toContain("no such file here")
    })

    test("nobody signed in, and someone not in the org, are asked to sign in:  no program, no files", async () => {
      for (const cookie of ["", bosCookie]) {
        const page = await get("/apps/@rs/OrgAdmin", cookie)
        expect(page.status).toBe(200)
        expect(page.text).toContain("Sign in to see this page")
        expect(page.text).not.toContain("<spell-viewer")
        const file = await get("/spaces/@rs/OrgAdmin/OrgAdmin.api.spell", cookie)
        expect(file.status).toBe(404)
        expect(file.text).toContain("no such file here")
      }
    })

    test("a name that isn't there answers a stranger as one that is", async () => {
      expect((await get("/apps/@rs/Nothing")).text).toContain("Sign in to see this page")
      expect((await get("/apps/@rs/Nothing", anasCookie)).status).toBe(404)
    })

    test("never a private space, the Admin space, Spell's own folders, or a way out", async () => {
      for (const path of [
        "/apps/@rs/__private/Notes",
        "/apps/@rs/__admin",
        "/apps/@rs/__admin/roles",
        "/apps/@rs/__inbox",
        "/apps/@nobody/OrgAdmin",
        "/apps/ana@spell/Mine",
        "/spaces/@rs/__admin/roster.json5",
        "/spaces/@rs/__private/Notes/__project.json5",
        "/spaces/@rs/OrgAdmin/__draft/ana/OrgAdmin.spellml",
        "/spaces/@rs/OrgAdmin/%2e%2e/__admin/roster.json5",
        "/spaces/@rs/OrgAdmin/.hidden"
      ]) {
        expect((await get(path, anasCookie)).status, path).toBe(404)
      }
      expect(existsSync(folderFor("@rs/OrgAdmin"))).toBe(true)
    })

    describe("the home pages", () => {
      /** The answer at `path` as JSON, as someone with `cookie`. */
      const json = async (path: string, cookie = "") => JSON.parse((await get(path, cookie)).text)
      /** What the spaces home lists for someone with `cookie`:  each one's address. */
      const addresses = async (cookie = "") =>
        ((await json("/api/cloud/home", cookie)).spaces as { address: string }[]).map((each) => each.address)
      const STRANGERS_PAGE = "Sign in to see this page"

      beforeAll(() => {
        const open = join(folderFor("@rs/noticeboard"), "__settings")
        mkdirSync(open, { recursive: true })
        writeFileSync(join(open, "space.json5"), JSON.stringify({ publicRead: true }))
      })

      test("/ is the one page for everyone;  what it lists is asked for", async () => {
        const page = await get("/")
        expect(page.status).toBe(200)
        expect(page.text).toContain("<ui-root")
      })

      test("someone in the org:  the org, linking to its home, and their own space", async () => {
        const answer = await json("/api/cloud/home", anasCookie)
        expect(answer.person).toBe("ana@spell")
        expect(answer.spaces).toContainEqual({ address: "@rs", name: expect.any(String), link: "/@rs" })
        expect(answer.spaces).toContainEqual({ address: "ana@spell", name: "Your space" })
      })

      test("a stranger:  only what's public and their own, never the org", async () => {
        const list = await addresses(bosCookie)
        expect(list).toContain("bo@spell")
        expect(list).toContain("@rs/noticeboard")
        expect(list).not.toContain("@rs")
        expect(list.some((each) => each.includes("__admin") || each.includes("__private"))).toBe(false)
      })

      test("nobody signed in:  only what's public", async () => {
        const answer = await json("/api/cloud/home")
        expect(answer.person).toBeUndefined()
        expect(answer.spaces.map((each: { address: string }) => each.address)).toEqual(["@rs/noticeboard"])
      })

      test("an org's home, for someone who reads it:  its programs, and its other spaces they may read", async () => {
        for (const path of ["/@rs", "/@rs/"]) {
          const page = await get(path, anasCookie)
          expect(page.status, path).toBe(200)
          expect(page.text, path).toContain("<ui-root")
        }
        const { org } = await json("/api/cloud/home/orgs/rs", anasCookie)
        expect(org.programs.map((each: { link: string }) => each.link).sort()).toEqual([
          "/apps/@rs/Inbox",
          "/apps/@rs/OrgAdmin",
          "/apps/@rs/OrgChat",
          "/apps/@rs/OrgFeed"
        ])
        const spaces = org.spaces.map((each: { address: string }) => each.address)
        expect(spaces).toContain("@rs/noticeboard")
        expect(spaces).toContain("@rs/__admin")
        expect(spaces).not.toContain("@rs")
      })

      test("an org's home, for anyone else:  the sign-in page, the same whether the org is there or not", async () => {
        const strangers = await get("/@rs", bosCookie)
        const nobodys = await get("/@rs")
        const noOrg = await get("/@nope", bosCookie)
        const badName = await get("/@%2e%2e", bosCookie)
        for (const page of [strangers, nobodys, noOrg, badName]) {
          expect(page.status).toBe(200)
          expect(page.text).toContain(STRANGERS_PAGE)
          expect(page.text).toBe(strangers.text)
        }
      })

      test("what an org's home lists, for anyone else:  not found, the same whether the org is there or not", async () => {
        for (const [path, cookie] of [
          ["/api/cloud/home/orgs/rs", bosCookie],
          ["/api/cloud/home/orgs/rs", ""],
          ["/api/cloud/home/orgs/nope", anasCookie],
          ["/api/cloud/home/orgs/%2e%2e", anasCookie]
        ] as const) {
          expect((await get(path, cookie)).status, `${path} ${cookie ? "signed in" : ""}`).toBe(404)
        }
      })

      test("a path that isn't an org's isn't taken for one", async () => {
        expect((await get("/nothing-here")).status).toBe(404)
      })
    })

    test("its copy names its org, not the built-in's", () => {
      const source = readFileSync(join(folderFor("@rs/OrgAdmin"), "OrgAdmin.api.spell"), "utf8")
      expect(source).toContain('"@rs/__admin/roles"')
    })
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
  describe("at two addresses", () => {
    const SECOND = "https://spell.space.test.example"
    const secondDir = mkdtempSync(join(tmpdir(), "spell-cloud-second-"))
    let two: SpellCloud
    const at = (address: string) => ({ host: new URL(address).host, origin: address })

    beforeAll(async () => {
      two = new SpellCloud({ address: ADDRESS, alsoAt: [SECOND], dir: secondDir, people, folderFor })
      await two.listen({ port: 0, backups: "off" })
    })

    afterAll(async () => {
      await two?.close()
      rmSync(secondDir, { recursive: true, force: true })
    })

    /** POST `path` with `body`, its `Host` and `Origin` from `headers`. */
    const askTwo = (path: string, body: object, headers: Record<string, string>) =>
      ask(two.server.port, "POST", path, {
        body: JSON.stringify(body),
        headers: { ...headers, "content-type": "application/json" }
      })

    test("both hosts answer pages;  an unknown host is refused", async () => {
      for (const address of [ADDRESS, SECOND]) {
        const page = await ask(two.server.port, "GET", "/apps/@spell/examples/RecipeBox", { headers: at(address) })
        expect(page.status, address).toBe(200)
        expect(page.text).toContain("<spell-viewer")
      }
      const unknown = await ask(two.server.port, "GET", "/hello", { headers: { host: "elsewhere.example" } })
      expect(unknown.status).toBe(403)
    })

    test("a mail's link starts with the address it was asked at", async () => {
      await askTwo("/api/sign-in/ask", { email: ANA }, at(SECOND))
      const mail = await new MailCatcher({ folder: join(secondDir, "mail") }).newestTo(ANA)
      expect(mail!.text).toContain(`${SECOND}/sign-in/confirm?key=`)
    })

    test("a forged Host picks no link:  the main address, or a refusal", async () => {
      const local = { host: `127.0.0.1:${two.server.port}`, "x-server-token": two.server.guard.token }
      expect((await askTwo("/api/sign-in/invite", { email: ANA }, local)).status).toBe(200)
      const mail = await new MailCatcher({ folder: join(secondDir, "mail") }).newestTo(ANA)
      expect(mail!.text).toContain(`${ADDRESS}/sign-in/confirm?key=`)
      const forged = { host: "evil.example", origin: "https://evil.example" }
      expect((await askTwo("/api/sign-in/ask", { email: ANA }, forged)).status).toBe(403)
    })

    test("each address is its own client to Bluesky's hosts:  its client file names it", async () => {
      for (const address of [ADDRESS, SECOND]) {
        const file = await ask(two.server.port, "GET", "/api/sign-in/atproto/client.json", { headers: at(address) })
        expect(JSON.parse(file.text)).toMatchObject({
          client_uri: address,
          redirect_uris: [`${address}/api/sign-in/atproto/back`]
        })
      }
    })
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
