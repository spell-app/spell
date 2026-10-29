import { E } from "spell/element"

import type { AnswerThread } from "./AnswerThread"

/****************
 * ### `ItemLink`
 * A card's link to the `<epic-item>` it's in, for the item's `AnswerThread`:  where an answer, a reply or a status
 * card goes, and how it draws there (epic `epic-engine` P27);  and the thread's fold, which its head sets (I152).
 * - Its item:  the card's parent, when that's an `<epic-item>`;  none on an Overview sub-section, or in a test alone.
 * - Waits for the item's `ready`:  a card can connect before its item has its component (a family that loads first),
 *   so `thread()` follows the item once it's there.
 * - Knows the item only by type (`ThreadOwner`):  importing `EpicItem` here would define it with every card.
 ****************/
export class ItemLink {
  /** The item's component, once ready;  `undefined` before, or with no item. */
  @E.state private accessor owner: ThreadOwner | undefined = undefined

  constructor(private readonly domElement: HTMLElement) {}

  /** The item's thread:  tracked;  `undefined` outside an item. */
  readonly thread = (): AnswerThread | undefined => this.owner?.thread()

  /** Is the item's thread folded by its head (its first reply)?  Tracked;  `false` outside an item. */
  readonly threadFolded = (): boolean => !!this.owner?.threadFolded

  /** The thread's head was folded or opened:  the item keeps it, for the rest of the thread (page state). */
  foldThread(folded: boolean) {
    if (this.owner) this.owner.threadFolded = folded
  }

  /** Is it in an item at all (its parent an `<epic-item>`)?  Plain DOM:  not tracked. */
  get inItem(): boolean {
    return this.domElement.parentElement?.localName === ITEM_TAG
  }

  /** Follow the item it's in, while connected:  a card's `@E.whileConnected`.  Returns its stop. */
  connect(): () => void {
    const item = this.domElement.parentElement as (HTMLElement & ItemElement) | null
    if (item?.localName !== ITEM_TAG) {
      this.owner = undefined
      return () => undefined
    }
    let live = true
    // NOTE: `ready` resolves once the item has drawn;  a card moved meanwhile is told nothing
    void Promise.resolve(item.ready)
      .then(() => {
        if (live) this.owner = item.component as ThreadOwner | undefined
      })
      .catch((error) => console.error(error))
    return () => {
      live = false
    }
  }
}

/** What a card needs of its item:  `EpicItem`'s `thread()`, and whether its thread is folded. */
export type ThreadOwner = {
  thread(): AnswerThread
  /** the thread's head is folded:  the rest of the thread hides;  tracked, page state */
  threadFolded: boolean
}

/** An `<epic-item>` as a card sees it:  a DOM element with a component and a `ready` promise. */
type ItemElement = {
  ready?: Promise<void>
  component?: unknown
}

/** The item's tag. */
const ITEM_TAG = "epic-item"
