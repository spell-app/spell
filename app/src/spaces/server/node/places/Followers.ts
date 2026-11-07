import type { PlaceRow } from "spell/places/places.types"
import type { FolderPlace } from "spell/server/places"
import { INBOX_MAIL, INBOX_SUBSCRIPTIONS, MAIL_CHOICES, type MailChoice } from "spell/app/spaces/models/spaceNames"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"

import { PersonInbox } from "./PersonInbox"

/** How someone hears of their inbox when they never said:  a daily digest. */
export const DEFAULT_MAIL_CHOICE: MailChoice = "digest"

/****************
 * ### `Followers`
 * The ONE look-up of who follows what (epic `atmosphere` P30):  "who hears of this inbox, and how?", "who subscribes to
 * this space?";  P30's mail asks it, and P38's phone alerts will.
 *
 * ```ts
 * await followers.mailChoiceOf("bo@rs")             // "digest":  his inbox's first mail choice, else the default
 * await followers.subscribersOf("events_team@rs")   // ["cy@rs"]:  whose inbox lists it in `subscriptions`
 * ```
 *
 * - Both kept in the person's own inbox (`ana@rs/__inbox`), which only they write:  its `mail_choices` (the first
 *   counts), its `subscriptions`.  So a person in two orgs chooses for each.
 * - A thread has no followers of its own:  each copy of its messages is already in the inbox of everyone it's to.
 * - Read as Spell itself, through each inbox's place (`placeAt`):  the inbox's own rules never stop Spell reading.
 * - Node only;  knows nothing of mail:  `InboxMail` asks it.
 ****************/
export class Followers {
  /** People and orgs:  who's in an org, whose inboxes to look in. */
  private readonly people: PeopleStore
  /** A space's own place, by its address, opened as Spell. */
  private readonly placeAt: (address: string) => Promise<FolderPlace | undefined>

  constructor({ people, placeAt }: FollowersProps) {
    this.people = people
    this.placeAt = placeAt
  }

  /** How `person` (`bo@rs`) hears of their inbox by mail:  their first mail choice, else `DEFAULT_MAIL_CHOICE`. */
  async mailChoiceOf(person: string): Promise<MailChoice> {
    const [choice] = await this.mailChoicesOf(person)
    const how = choice?.how
    return (MAIL_CHOICES as readonly unknown[]).includes(how) ? (how as MailChoice) : DEFAULT_MAIL_CHOICE
  }

  /** Everyone in `space`'s org whose inbox subscribes to it (`events_team@rs`), by address. */
  async subscribersOf(space: string): Promise<string[]> {
    const org = space.split("@")[1]?.split("/")[0]
    const members = org ? ((await this.people.org(org))?.members.items ?? []) : []
    const subscribers: string[] = []
    for (const { person } of members) {
      if (!person) continue
      const address = this.people.addressOf(person)
      if ((await this.subscriptionsOf(address)).some((row) => row.space === space)) subscribers.push(address)
    }
    return subscribers
  }

  /** `person`'s mail choices, as their inbox keeps them:  each `{ how }`, with its id;  the first counts. */
  async mailChoicesOf(person: string): Promise<PlaceRow[]> {
    return this.rowsIn(person, INBOX_MAIL)
  }

  /** What `person` subscribes to, as their inbox keeps it:  each `{ space }`, with its id. */
  async subscriptionsOf(person: string): Promise<PlaceRow[]> {
    return this.rowsIn(person, INBOX_SUBSCRIPTIONS)
  }

  /** The rows of `collection` in `person`'s inbox, whole, as Spell reads them:  none for no inbox. */
  private async rowsIn(person: string, collection: string): Promise<PlaceRow[]> {
    const inbox = await this.placeAt(PersonInbox.addressOf(person))
    if (!inbox) return []
    const ids = (await inbox.list(collection, {})).rows.map(({ id }) => String(id))
    return ids.length ? inbox.getMany(collection, ids) : []
  }
}

/** Constructor props of `Followers`. */
export type FollowersProps = {
  /** People and orgs. */
  people: PeopleStore
  /** A space's own place, by its address, opened as Spell. */
  placeAt: (address: string) => Promise<FolderPlace | undefined>
}
