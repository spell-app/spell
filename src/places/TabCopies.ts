import type { StorageLike } from "spell/util/persist/persist.types"

import { BrowserCopy } from "./SaveQueue"

/** What a tab's key ends with, before its name:  `<key>#tab-<name>`. */
const TAB_KEY = "#tab-"

/** The start of the name of the lock each tab holds for as long as it lives. */
const TAB_LOCK = "spell-tab:"

/** The start of the name of the lock held while closed tabs' copies are gathered:  one tab at a time, per key. */
const GATHER_LOCK = "spell-tab-gather:"

/** The browser's locks, as far as `TabCopies` uses them:  `navigator.locks`, or a test's stand-in. */
export type TabLocks = Pick<LockManager, "request" | "query">

/** This page's tab. */
type ThisTab = {
  /** A new name each time the page loads:  sorted, the oldest come first. */
  name: string
  /** Resolved once it holds its lock, or has failed to. */
  held: Promise<void>
}

/** Each page's tab, by the locks it's found with:  one per page, however many copies it keeps. */
const TABS = new WeakMap<TabLocks, ThisTab>()

/****************
 * ### `TabCopies`
 * What one program keeps in this browser, once per TAB:  `PendingChanges`' list of what's not sent yet (epic `data` I4).
 * - Two tabs of one program share `localStorage`:  under one key, whichever writes last wins,
 *   and a tab that closes before sending loses what only it held.
 *   So each tab writes under its own key, `<key>#tab-<name>`.
 * - A page takes a new name each time it loads, and holds a browser lock (`navigator.locks`) under it while it lives.
 *   So a tab that closes, crashes or reloads lets go of its lock by itself, and nothing has to say so.
 * - `gather()`, on opening:  what any tab whose lock isn't held left behind is handed over, then removed.
 *   - A reload is that too:  the new page gathers what the old one left.
 *   - What's kept under the plain `<key>`, from before tabs had keys, is gathered the same way.
 *   - One tab gathers at a time, under a lock of its own, so two opening at once can't both take the same copy.
 * - No locks (an address that isn't secure, or no browser at all):  `key` is the plain key, every tab shares it,
 *   and nothing is gathered.
 * - NOT `SaveQueue`'s job:  that keeps one value under one key.  This says which key, and which tabs are gone.
 * - Imports only `BrowserCopy` and preferences' types, by file.
 ****************/
export class TabCopies {
  /** The key this tab's copy is kept under. */
  readonly key: string
  /** The key every tab's starts with. */
  private readonly plainKey: string
  /** Finds where they're kept. */
  private readonly storage: (() => StorageLike | undefined) | undefined
  /** The browser's locks:  `undefined` where there are none. */
  private readonly locks: TabLocks | undefined
  /** This page's tab, where there are locks. */
  private readonly tab: ThisTab | undefined

  constructor({ key, storage, locks = browserLocks() }: TabCopiesProps) {
    this.plainKey = key
    this.storage = storage
    this.locks = locks
    this.tab = locks && thisTabOn(locks)
    this.key = this.tab ? `${key}${TAB_KEY}${this.tab.name}` : key
  }

  /**
   * Hand `take` what each tab that's gone left, oldest first, then forget it.
   * - No locks:  nothing happens, as nothing says which tabs are gone.
   * - NEVER throws:  a failure is logged, and what's kept stays for the next opening.
   */
  async gather<T>(take: (kept: T) => void): Promise<void> {
    const { locks, tab } = this
    if (!locks || !tab) return
    try {
      await tab.held
      await locks.request(`${GATHER_LOCK}${this.plainKey}`, async () => {
        const { held = [] } = await locks.query()
        const alive = new Set(held.map(({ name }) => name))
        for (const key of this.keysOfOtherTabs()) {
          if (alive.has(`${TAB_LOCK}${key.slice(this.plainKey.length + TAB_KEY.length)}`)) continue
          const copy = this.copyAt(key)
          const kept = copy.kept<T>()
          if (kept !== undefined) take(kept)
          copy.drop()
        }
      })
    } catch (ignored) {
      console.error("TabCopies.gather():", ignored)
    }
  }

  /** Every key kept for this copy but this tab's:  the plain one first, then the oldest tab's. */
  private keysOfOtherTabs(): string[] {
    return this.copyAt(this.plainKey)
      .keysStartingHere()
      .filter((key) => key !== this.key && (key === this.plainKey || key.startsWith(`${this.plainKey}${TAB_KEY}`)))
      .sort()
  }

  /** The browser's copy at `key`. */
  private copyAt(key: string): BrowserCopy {
    return new BrowserCopy({ key, ...(this.storage && { storage: this.storage }) })
  }
}

/** Constructor props of a `TabCopies`. */
export type TabCopiesProps = {
  /** Its key, `<store>:<key>`, with no tab in it. */
  key: string
  /** Finds where it's kept:  `BrowserCopyProps.storage`. */
  storage?: (() => StorageLike | undefined) | undefined
  /** The browser's locks.  Left out:  `navigator.locks`, in a page. */
  locks?: TabLocks | undefined
}

/** `navigator.locks`, in a page that has them. */
function browserLocks(): TabLocks | undefined {
  return typeof document === "undefined" ? undefined : navigator.locks
}

/**
 * This page's tab on `locks`.
 * - SIDE EFFECT:  the first time, takes the lock it holds until the page goes.
 */
function thisTabOn(locks: TabLocks): ThisTab {
  const known = TABS.get(locks)
  if (known) return known
  const name = `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0]!.toString(36)}`
  let markHeld!: () => void
  const tab = { name, held: new Promise<void>((resolve) => (markHeld = resolve)) }
  TABS.set(locks, tab)
  // best effort:  with no lock, this tab's copy just looks like a closed tab's to the next one to open
  void locks
    .request(`${TAB_LOCK}${name}`, () => {
      markHeld()
      // never resolves:  it's the page going that lets go of the lock
      return new Promise<void>(() => {})
    })
    .catch((ignored: unknown) => {
      console.error("TabCopies:  can't hold this tab's lock:", ignored)
      markHeld()
    })
  return tab
}
