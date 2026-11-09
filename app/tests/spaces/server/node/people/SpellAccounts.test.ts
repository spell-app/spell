import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { afterAll, expect, test } from "vite-plus/test"

import type { SRV } from "spell/server"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import * as People from "spell/app/spaces/@spell/library/people/people.lib.ts"

/** Spell accounts, as sign-in finds and makes them (epic `atmosphere` P3):  on a temporary spell-spaces. */
const root = mkdtempSync(resolve(tmpdir(), "spell-accounts-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const accounts = new SpellAccounts(people)
afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

test("invite only:  nobody's account until an invite makes one, through the people store, the email theirs", async () => {
  expect(await accounts.accountFor("ana@example.com")).toBeUndefined()
  expect(await accounts.invite("ana@example.com")).toBe("ana@spell")
  const { person } = await people.person("ana")
  expect(person?.emails.items).toEqual(["ana@example.com"])
  expect(person?.names).toBe("ana")
  // found again by its email, in any case;  invited again, the same account
  expect(await accounts.accountFor("Ana@Example.com")).toBe("ana@spell")
  expect(await accounts.invite("ana@example.com")).toBe("ana@spell")
})

test("a typed name:  the account itself, or an org's name for one of Spell's;  nobody else's (epic `atmosphere` T64)", async () => {
  await accounts.invite("cam@example.com")
  expect(await accounts.accountNamed("cam@spell")).toBe("cam@spell")
  expect(await accounts.accountNamed("nobody@spell")).toBeUndefined()
  expect(await accounts.accountNamed("cam@no-such-org")).toBeUndefined()
  expect(await accounts.accountNamed("no at sign")).toBeUndefined()
  const { person } = await people.person("cam")
  await people.save(
    new People.Org({ id: "camden", name: "Camden", members: [new People.Membership({ person, role: "manager" })] })
  )
  expect(await accounts.accountNamed("cam@camden")).toBe("cam@spell")
})

test("a name taken gets a number", async () => {
  expect(await accounts.invite("ana@elsewhere.org")).toBe("ana-2@spell")
})

test("who a request is from:  whoever's signed in, else this machine's person", () => {
  expect(prefsPersonFor({ person: "ana@spell" } as SRV.Request)).toEqual({ id: "ana", org: "spell" })
  expect(prefsPersonFor({ person: undefined } as SRV.Request)).toEqual({ id: "owen", org: "spell" })
})

test("an account's handle, and whose a handle is, with an org's own domain (epic `atmosphere` P16)", async () => {
  await people.save(new People.Org({ id: "rs", name: "Rolling Stones", domain: "rs.org" }))
  const { person } = await people.me("cy", "rs")
  await people.save(Object.assign(person, { did: "did:plc:cy" }))
  expect(await accounts.orgDomains()).toEqual({ "rs.org": "rs" })
  expect(await accounts.handleOf("cy@rs")).toBe("cy.rs.org")
  expect(await accounts.handleOf("ana@spell")).toBe("ana.spell.spell.space")
  expect(await accounts.didForHandle("cy.rs.org")).toBe("did:plc:cy")
  expect(await accounts.didForHandle("cy.rs.spell.space")).toBe("did:plc:cy")
  // an account with no AT Protocol id yet, and nobody at all
  expect(await accounts.didForHandle("ana.spell.spell.space")).toBeUndefined()
  expect(await accounts.didForHandle("zed.rs.org")).toBeUndefined()
})

test("a linked Bluesky account:  kept in the person's file, found by its DID, one Spell account each (epic `atmosphere` P19)", async () => {
  expect(await accounts.accountForDid("did:plc:ana")).toBeUndefined()
  expect(await accounts.linkedOf("ana@spell")).toBeUndefined()
  await accounts.link("ana@spell", { did: "did:plc:ana", handle: "ana.bsky.social" })
  expect(await accounts.accountForDid("did:plc:ana")).toBe("ana@spell")
  expect(await accounts.linkedOf("ana@spell")).toEqual({ did: "did:plc:ana", handle: "ana.bsky.social" })
  expect((await people.person("ana")).person?.signInHandle).toBe("ana.bsky.social")
  // linked again, a new handle;  someone else's, refused
  await accounts.link("ana@spell", { did: "did:plc:ana", handle: "ana.example.org" })
  expect((await accounts.linkedOf("ana@spell"))?.handle).toBe("ana.example.org")
  await expect(accounts.link("ana-2@spell", { did: "did:plc:ana", handle: "ana.example.org" })).rejects.toMatchObject({
    kind: "linked elsewhere"
  })
})
