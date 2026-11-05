import { slug } from "spell/util/string"
import type { SignInAccounts } from "spell/server/signIn"
import { HOME_ORG } from "spell/app/spaces/models/projectGroups"
import type { Takedowns } from "spell/app/spaces/server/node/places/Takedowns"
import { PeopleStore } from "./PeopleStore"

/** How a person's folder is named in their org's:  `owen@/`. */
const PERSON_FOLDER = /^([^/@]+)@\/$/

/****************
 * ### `SpellAccounts`
 * Spell accounts, as a sign-in finds and makes them (epic `atmosphere` P3):
 * the people store's people of Spell's own org, `ana@spell`, each found by an email in their file (`Person.emails`).
 *
 * ```ts
 * new SignInCheck({ mailer, accounts: new SpellAccounts(peopleStore()) })
 * ```
 *
 * - INVITE ONLY:  `accountFor()` finds only someone with a file.
 *   - `invite()` makes one, through the people store's own first-file step (`PeopleStore.me()`):
 *     the invited email their only one.
 * - No store of its own:  a person's file is their account.
 * - An account Spell took down (`Takedowns`, epic `atmosphere` P6) can't sign in:  `isTakenDown()`.
 * - Its id from the email's name:  `ana@example.com` is `ana@spell`.
 *   - A name taken gets a number, `ana-2@spell`.
 * - Node only.
 ****************/
export class SpellAccounts implements SignInAccounts {
  /** The people and orgs. */
  private readonly people: PeopleStore
  /** The org accounts are in. */
  private readonly org: string
  /** What Spell took down:  left out, nothing is. */
  private readonly takedowns: Takedowns | undefined

  constructor(people: PeopleStore, { org = HOME_ORG, takedowns }: SpellAccountsOptions = {}) {
    this.people = people
    this.org = org
    this.takedowns = takedowns
  }

  /** Is the account `person` (`ana@spell`) taken down, so it can't sign in? */
  async isTakenDown(person: string): Promise<boolean> {
    return (await this.takedowns?.isAccountDown(person)) ?? false
  }

  /** The account with `email`:  `ana@spell`;  `undefined` for none. */
  async accountFor(email: string): Promise<string | undefined> {
    for (const id of await this.ids()) {
      const { person } = await this.people.person(id, this.org)
      if (person?.emails.items.some((each) => sameEmail(each, email))) return `${id}@${this.org}`
    }
    return undefined
  }

  /** An account for `email`, made if it has none:  its address.  - throws what the people store throws */
  async invite(email: string): Promise<string> {
    const known = await this.accountFor(email)
    if (known) return known
    const id = await this.freeIdFor(email)
    const { person } = await this.people.me(id, this.org)
    // the first file has git's name and email, this machine's person's:  theirs instead
    await this.people.change(person, { names: email.split("@")[0]!, emails: [email] })
    return `${id}@${this.org}`
  }

  /** The id of every person in the org with a folder. */
  private async ids(): Promise<string[]> {
    const names = await this.people.storage.list(`@${this.org}/`)
    return names.flatMap((name) => PERSON_FOLDER.exec(name)?.[1] ?? [])
  }

  /** An id for `email` no one has:  its name, as a slug, then `-2`, `-3` ... */
  private async freeIdFor(email: string): Promise<string> {
    const taken = new Set(await this.ids())
    const base = slug(email.split("@")[0]!, { fallback: "person" })
    let id = base
    for (let number = 2; taken.has(id); number++) id = `${base}-${number}`
    return id
  }
}

/** Options of `SpellAccounts`. */
export type SpellAccountsOptions = {
  /** The org accounts are in:  default Spell's own, `HOME_ORG`. */
  org?: string
  /** What Spell took down:  an account taken down can't sign in.  Left out:  none is. */
  takedowns?: Takedowns
}

/** Do `one` and `other` name one mailbox?  An address's case doesn't matter, in practice. */
function sameEmail(one: string, other: string): boolean {
  return one.trim().toLowerCase() === other.trim().toLowerCase()
}
