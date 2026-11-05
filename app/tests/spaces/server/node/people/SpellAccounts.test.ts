import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { afterAll, expect, test } from "vite-plus/test"

import type { SRV } from "spell/server"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

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

test("a name taken gets a number", async () => {
  expect(await accounts.invite("ana@elsewhere.org")).toBe("ana-2@spell")
})

test("who a request is from:  whoever's signed in, else this machine's person", () => {
  expect(prefsPersonFor({ person: "ana@spell" } as SRV.Request)).toEqual({ id: "ana", org: "spell" })
  expect(prefsPersonFor({ person: undefined } as SRV.Request)).toEqual({ id: "owen", org: "spell" })
})
