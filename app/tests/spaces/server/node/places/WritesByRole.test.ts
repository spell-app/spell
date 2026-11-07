/**
 * Writes by role (epic `atmosphere` P23, Q21 D):  what each role in a space may write, by its kind of thing.
 * - A small RS:  Ana is the Board (every space's manager), Ada an Admin, Cy an editor and Bo a viewer of RS's shared
 *   spaces;  Zed isn't in RS.
 * - The table first (`SpaceMembers.changeOrDie()`, a row of the role table each), then over the page server's route,
 *   as a page writes:  the refusal says the role it takes, which the page names in its own language.
 */
import { mkdtempSync, rmSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { RemotePlace } from "spell/places"
import { SPACE_MEMBER_OPERATIONS, thingKindOf, type PlaceChange, type ThingChange } from "spell/places/places.types"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "writes-by-role-token"

/** RS's people, each with a file, and their role in its org file:  Zed has a file, and no place in RS. */
const RS: Record<string, string> = { ana: "editor", ada: "editor", cy: "editor", bo: "viewer" }

/** RS's shared space for the picnic:  a folder of the org's shared space. */
const PICNIC = "@rs/picnic"

/** An app RS's Admins approve, and the version they approve. */
const SIGN_UP_SHEET = { name: "@spell/sign-up-sheet", version: "1.2.0" }

const root = mkdtempSync(join(tmpdir(), "spell-writes-by-role-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const roles = new OrgRoles({ people })
const members = new SpaceMembers({ address: PICNIC, storage, people, orgRoles: roles })

beforeAll(async () => {
  for (const id of [...Object.keys(RS), "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const memberships = Object.entries(RS).map(([id, role]) => ({
    $type: "Membership",
    person: { $ref: `Person#${id}@rs` },
    role
  }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members: memberships }))
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.give("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
})

afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

/**
 * What `changeOrDie()` says when `who` does `action` to a thing in `collection`, written last by `by`:
 * `"yes"`, or the refusal's reason and the role it takes (`"role editor"`, `"owner"`).
 */
async function verdict(
  who: string,
  collection: string,
  action: ThingChange["action"],
  by?: string,
  fields?: ThingChange["fields"]
): Promise<string> {
  const identity = `${who}@rs`
  const change: ThingChange = {
    identity,
    member: await members.memberOf(identity),
    collection,
    kind: thingKindOf(collection),
    action,
    ...(by && { by: `${by}@rs` }),
    ...(fields && { fields })
  }
  return members.changeOrDie(change).then(
    () => "yes",
    (error: { cause?: { whyNot?: string; needs?: string } }) =>
      [error.cause?.whyNot, error.cause?.needs].filter(Boolean).join(" ")
  )
}

describe("writes by role:  the table", () => {
  test("Bo, a viewer:  posts and comments, and changes or removes only his own;  makes no row, page or app", async () => {
    expect(await verdict("bo", "posts", "make")).toBe("yes")
    expect(await verdict("bo", "comments", "make")).toBe("yes")
    expect(await verdict("bo", "posts", "change", "bo")).toBe("yes")
    expect(await verdict("bo", "posts", "remove", "bo")).toBe("yes")
    expect(await verdict("bo", "posts", "change", "cy")).toBe("owner")
    expect(await verdict("bo", "posts", "remove", "cy")).toBe("role manager")
    expect(await verdict("bo", "signups", "make")).toBe("role editor")
    expect(await verdict("bo", "signups", "change", "cy")).toBe("role editor")
    expect(await verdict("bo", "__files", "make")).toBe("role editor")
    expect(await verdict("bo", "__apps", "make", undefined, SIGN_UP_SHEET)).toBe("role manager")
  })

  test("Cy, an editor:  changes any existing row or file, adds rows and files;  removes only his own;  no app", async () => {
    expect(await verdict("cy", "signups", "make")).toBe("yes")
    expect(await verdict("cy", "signups", "change", "ana")).toBe("yes")
    expect(await verdict("cy", "__files", "change", "ana")).toBe("yes")
    expect(await verdict("cy", "signups", "remove", "cy")).toBe("yes")
    expect(await verdict("cy", "signups", "remove", "ana")).toBe("role manager")
    expect(await verdict("cy", "__files", "remove", "ana")).toBe("role manager")
    expect(await verdict("cy", "posts", "change", "bo")).toBe("owner")
    expect(await verdict("cy", "__apps", "make", undefined, SIGN_UP_SHEET)).toBe("role manager")
  })

  test("Ana, a manager:  removes anyone's post but never changes it;  removes anything;  installs an app", async () => {
    await roles.approveApp("rs", SIGN_UP_SHEET, { by: "ada@rs" })
    expect(await verdict("ana", "posts", "remove", "bo")).toBe("yes")
    expect(await verdict("ana", "posts", "change", "bo")).toBe("owner")
    expect(await verdict("ana", "signups", "remove", "cy")).toBe("yes")
    expect(await verdict("ana", "__files", "remove", "cy")).toBe("yes")
    expect(await verdict("ana", "__apps", "make", undefined, SIGN_UP_SHEET)).toBe("yes")
  })

  test("a space whose manager turned off viewers' posts:  Bo's post takes an editor", async () => {
    await members.changeSettings({ viewersPost: false })
    expect(await verdict("bo", "posts", "make")).toBe("role editor")
    expect(await verdict("cy", "posts", "make")).toBe("yes")
    await members.changeSettings({ viewersPost: true })
    expect(await verdict("bo", "posts", "make")).toBe("yes")
  })
})

describe("writes by role:  approved apps", () => {
  test("only an app the Admins approved, at the version approved;  only the Board and Admins approve, logged", async () => {
    await roles.approveApp("rs", SIGN_UP_SHEET, { by: "ada@rs", why: "for the picnic" })
    expect(await roles.approvedApps("rs")).toEqual([SIGN_UP_SHEET])
    expect(await verdict("ana", "__apps", "make", undefined, { ...SIGN_UP_SHEET, version: "2.0.0" })).toBe("place")
    expect(await verdict("ana", "__apps", "make", undefined, { name: "@spell/raffle", version: "1.0.0" })).toBe("place")
    await expect(roles.approveApp("rs", { name: "@spell/raffle", version: "1.0.0" }, { by: "bo@rs" })).rejects.toThrow(
      /may not approve apps/
    )
    // a new version approved takes the old one's place
    await roles.approveApp("rs", { ...SIGN_UP_SHEET, version: "2.0.0" }, { by: "ana@rs" })
    expect(await roles.approvedApps("rs")).toEqual([{ ...SIGN_UP_SHEET, version: "2.0.0" }])
    expect(await verdict("ana", "__apps", "make", undefined, SIGN_UP_SHEET)).toBe("place")
    await roles.unapproveApp("rs", SIGN_UP_SHEET.name, { by: "ada@rs" })
    expect(await roles.approvedApps("rs")).toEqual([])
    const logged = (await roles.log("rs")).filter(({ action }) => action.endsWith("approve app"))
    expect(logged.map(({ action, by, name, version }) => `${action} ${by} ${name} ${version ?? ""}`.trim())).toEqual([
      "approve app ada@rs @spell/sign-up-sheet 1.2.0",
      "approve app ada@rs @spell/sign-up-sheet 1.2.0",
      "approve app ana@rs @spell/sign-up-sheet 2.0.0",
      "unapprove app ada@rs @spell/sign-up-sheet"
    ])
  })
})

describe("writes by role:  over the page server's route", () => {
  let folders: SpaceFolders
  let server: ReturnType<typeof createServer>
  let port: number

  beforeAll(async () => {
    folders = new SpaceFolders({
      folderFor: (address) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
      people,
      personFor: (request) => request.get("x-person") ?? "nobody@rs"
    })
    const router = new SRV.Router()
    const guard = new SRV.Guard({ token: TOKEN })
    folders.route({ router, guard })
    server = createServer(SRV.toListener(router.handle))
    port = await SRV.listenPreferred(server)
    guard.allowPort(port)
  })

  afterAll(async () => {
    folders.close()
    await new Promise<void>((done) => {
      server.closeAllConnections()
      server.close(() => done())
    })
  })

  /** A browser's place on the picnic's folder, asking as `who`. */
  function placeAs(who: string): RemotePlace {
    const remote = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/spaces/${PICNIC}`, token: TOKEN })
    const answerTo = (remote as unknown as { answerTo: (ask: { headers?: object }, context: object) => unknown })
      .answerTo
    ;(remote as unknown as { answerTo: typeof answerTo }).answerTo = function (ask, context) {
      return answerTo.call(this, { ...ask, headers: { ...ask.headers, "x-person": `${who}@rs` } }, context)
    }
    return remote
  }

  /** A change to thing `id` of `collection`:  made, its text changed, or removed. */
  const changeOf = (kind: PlaceChange["kind"], collection: string, id: string, text?: string): PlaceChange => ({
    changeId: `${kind}-${collection}-${id}-${text ?? ""}`,
    kind,
    collection,
    id,
    ...(text !== undefined && { fields: { text } })
  })

  test("Bo posts;  Ana can't change his post, and removes it;  Bo's own changes go through", async () => {
    await placeAs("bo").apply([changeOf("insert", "posts", "p-1", "Who's bringing chairs?")], {})
    await expect(placeAs("ana").apply([changeOf("update", "posts", "p-1", "Edited")], {})).rejects.toMatchObject({
      cause: { whyNot: "owner" }
    })
    await placeAs("bo").apply([changeOf("update", "posts", "p-1", "Who's bringing folding chairs?")], {})
    const posts = await placeAs("cy").list("posts", {}, {})
    expect(posts.rows.map(({ text, by }) => `${String(text)} ${String(by)}`)).toEqual([
      "Who's bringing folding chairs? bo@rs"
    ])
    await placeAs("ana").apply([changeOf("delete", "posts", "p-1")], {})
    expect((await placeAs("cy").list("posts", {}, {})).rows).toEqual([])
  })

  test("a refusal crosses to the page with the role it takes, so the page names it in its own language", async () => {
    await expect(placeAs("bo").apply([changeOf("insert", "signups", "s-1", "Bo")], {})).rejects.toMatchObject({
      kind: "refused",
      cause: { whyNot: "role", needs: "editor" },
      message: "Your role can't make rows here:  you're a viewer of @rs, and it takes an editor"
    })
    await placeAs("cy").apply([changeOf("insert", "signups", "s-1", "Cy brings bread")], {})
    await expect(placeAs("cy").apply([changeOf("delete", "signups", "s-1")], {})).resolves.toBeDefined()
    await placeAs("ana").apply([changeOf("insert", "signups", "s-2", "Ana brings plates")], {})
    await expect(placeAs("cy").apply([changeOf("delete", "signups", "s-2")], {})).rejects.toMatchObject({
      cause: { whyNot: "role", needs: "manager" }
    })
  })

  test("Zed, outside RS, is refused as before:  no member", async () => {
    await expect(placeAs("zed").apply([changeOf("insert", "posts", "p-9", "Hi")], {})).rejects.toMatchObject({
      cause: { whyNot: "role" },
      message: expect.stringContaining("aren't a member")
    })
  })

  test("the settings say whether viewers post, and only a manager changes it", async () => {
    await expect(
      placeAs("cy").call(SPACE_MEMBER_OPERATIONS.changeSettings, { viewersPost: false }, {})
    ).rejects.toMatchObject({ message: expect.stringContaining("Your role can't change its settings") })
    expect(await placeAs("ana").call(SPACE_MEMBER_OPERATIONS.changeSettings, { viewersPost: false }, {})).toMatchObject(
      { viewersPost: false }
    )
    await expect(placeAs("bo").apply([changeOf("insert", "posts", "p-2", "Hi")], {})).rejects.toMatchObject({
      cause: { whyNot: "role", needs: "editor" }
    })
  })
})
