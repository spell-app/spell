import { slug } from "spell/util/string"
import { SignInError, type LinkedAccount, type SignInAccounts } from "spell/server/signIn"
import { SP } from "spell/parser/spell"
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
 * - ITS HANDLE (epic `atmosphere` P16):  the name other AT Protocol apps look an account up by,
 *   any org's account, not only Spell's own:
 *   - `ana@rs` is `ana.rs.spell.space`, or `ana.rs.org` when the org's file names its own `domain`
 *     (`handleOf()`, `SP.SpellLocation.handleFor()`)
 *   - a look-up answers the account's AT Protocol id, its `did` (`didForHandle()`):
 *     only an account on Spell's Spaces host has one;  every other is "not found", as it should be
 * - A LINKED ATMOSPHERE ACCOUNT (epic `atmosphere` P19):  the Bluesky account a person signs in with,
 *   kept in their file as its DID and its handle (`Person.signInDid`, `signInHandle`)
 *   - found by its DID, never its handle:  a handle can change hands
 *   - one Spell account per atmosphere account:  linking one that's someone else's is refused
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

  /**
   * The account a typed name is:  `ana@spell`, or an org's name for her, `ana@rs` (`PeopleStore.memberCalled()`).
   * - `undefined` for anything else.
   */
  async accountNamed(name: string): Promise<string | undefined> {
    const org = SP.SpellLocation.accountParts(name)?.org
    if (!org || (org !== this.org && !(await this.people.hasOrg(org)))) return undefined
    const account = org === this.org ? name : await this.people.memberCalled(org, name)
    return (await this.personOf(account)) ? account : undefined
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

  /** The account the atmosphere account `did` is linked to:  `ana@spell`;  `undefined` for none. */
  async accountForDid(did: string): Promise<string | undefined> {
    for (const id of await this.ids()) {
      const { person } = await this.people.person(id, this.org)
      if (person?.signInDid === did) return `${id}@${this.org}`
    }
    return undefined
  }

  /** The atmosphere account `account` (`ana@spell`) signs in with;  `undefined` for none. */
  async linkedOf(account: string): Promise<LinkedAccount | undefined> {
    const person = await this.personOf(account)
    return person?.signInDid ? { did: person.signInDid, handle: person.signInHandle || person.signInDid } : undefined
  }

  /**
   * Link `account` (`ana@spell`) to the atmosphere account `linked`, in place of any it had.
   * - throws `SignInError` `"linked elsewhere"` when another account here is linked to it;
   *   `TypeError` for an account with no file
   */
  async link(account: string, linked: LinkedAccount): Promise<void> {
    const other = await this.accountForDid(linked.did)
    if (other && other !== account) {
      throw new SignInError(`That Bluesky account is linked to ${other} already.`, {
        cause: { kind: "linked elsewhere" }
      })
    }
    const person = await this.personOf(account)
    if (!person) throw new TypeError(`SpellAccounts.link():  ${account} has no file here`)
    person.signInDid = linked.did
    person.signInHandle = linked.handle
    await this.people.save(person)
  }

  /** `account`'s handle (`ana@rs` => `ana.rs.spell.space`, or under its org's own domain);  `undefined` if it can't have one. */
  async handleOf(account: string): Promise<string | undefined> {
    const org = SP.SpellLocation.accountParts(account)?.org
    const domain = org ? (await this.people.org(org))?.domain : undefined
    return SP.SpellLocation.handleFor(account, { domain })
  }

  /**
   * The AT Protocol id (`did:plc:...`) of the account `handle` names:  `ana.rs.spell.space` => Ana's.
   * - `undefined`:  a handle that names no account of Spell's, nobody with that file, or an account with no id yet
   * - NEVER throws:  a look-up answers "not found" rather than an error
   */
  async didForHandle(handle: string): Promise<string | undefined> {
    try {
      const account = SP.SpellLocation.accountForHandle(handle, { orgDomains: await this.orgDomains() })
      const parts = account ? SP.SpellLocation.accountParts(account) : undefined
      if (!parts) return undefined
      const { person } = await this.people.person(parts.id, parts.org)
      return person?.did || undefined
    } catch (ignored) {
      console.error("SpellAccounts.didForHandle():", ignored)
      return undefined
    }
  }

  /** Every org's own domain, to its id:  `{ "rs.org": "rs" }`, for the orgs whose file names one. */
  async orgDomains(): Promise<Record<string, string>> {
    const { orgs } = await this.people.orgs()
    return Object.fromEntries(orgs.filter((org) => org.domain).map((org) => [org.domain.toLowerCase(), org.id]))
  }

  /** The person whose account is `account` (`ana@spell`), in this org;  `undefined` for none. */
  private async personOf(account: string) {
    const parts = SP.SpellLocation.accountParts(account)
    if (!parts || parts.org !== this.org) return undefined
    return (await this.people.person(parts.id, this.org)).person
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
