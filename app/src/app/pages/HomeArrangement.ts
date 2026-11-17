import { createSignal } from "solid-js"

import { $fetch, KnownFormat, PrefStore } from "spell/util"
import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { isStaticBuild } from "spell/app/app/static/staticBuild"

/****************
 * ### `HomeArrangement`
 * The home page's layout as this page shows it, and its "Rearrange Home Screen" mode (epic `mockup` T51).
 * - The layout:  everyone's (`SPACES.HOME_DEFAULTS`, then as the server says), this person's own changes over it
 *   (`SPACES.layeredHome()`).
 * - While rearranging (`isRearranging`), and only then:  cards and sections drag, and a card's title and tagline,
 *   a section's header and line, are changed where they are.
 * - Whose a change is, the server says (`setsDefaults`):  `@spell`'s people change everyone's, anyone else their own.
 *   - No server, or one that refuses (the static build, the house-network site):  their own, on this device
 *     (`DEVICE`, the browser's storage).
 * - Each change shows at once, then is saved;  a save that fails is shown (`editor.showError()`).
 * - STATIC and module-level on purpose:  ONE home page per tab, and its cards read it as they draw.
 ****************/
export class HomeArrangement {
  /** What the page shows:  everyone's layout with this person's own over it (reactive). */
  static get layout(): SPACES.HomeLayout {
    return SPACES.layeredHome(defaults(), mine())
  }

  /** Is the page being rearranged (reactive)? */
  static get isRearranging(): boolean {
    return isRearranging()
  }

  /** Turn "Rearrange Home Screen" on or off. */
  static rearrange(on: boolean): void {
    setRearranging(on)
    if (!on) setEditingText(false)
  }

  /** Does a change here change everyone's layout (reactive)?  `@spell`'s people, in Spell's own checkout. */
  static get setsDefaults(): boolean {
    return setsDefaults()
  }

  /** Has this person changed anything of their own, which "Reset to default" would forget (reactive)? */
  static get hasOwnChanges(): boolean {
    return Object.keys(mine().order).length > 0 || Object.keys(mine().texts).length > 0
  }

  /** Is some card's or section's text being typed in (reactive)?  Nothing drags meanwhile, so the mouse selects text. */
  static get isEditingText(): boolean {
    return editingText()
  }

  /** Say whether some text is being typed in:  `<EditableText>` does. */
  static editingText(on: boolean): void {
    setEditingText(on)
  }

  /** The words changed on `key` (`SPACES.homeTextKey()`), over what the page would show:  none, nothing. */
  static textFor(key: string): SPACES.HomeText {
    return HomeArrangement.layout.texts[key] ?? {}
  }

  /**
   * Ask the server, once, for both layers and whose a change is.
   * - NEVER throws:  no answer keeps this device's own, over the layout the page was built with.
   */
  static load(): void {
    if (loaded) return
    loaded = true
    if (isStaticBuild) return
    $fetch<SPACES.HomeLayoutAnswer>({ url: SPACES.HOME_LAYOUT_URL, format: KnownFormat.json })
      .then((answer) => {
        // anything else (a page served in its place) is no answer:  this device's
        if (answer?.defaults?.order && answer.mine) take(answer)
      })
      .catch(() => undefined)
  }

  /** Show group `group` (or the sections, the start cards) in the order `names`, and save it. */
  static saveOrder(group: string, names: string[]): void {
    makeChange({ order: { group, names } })
  }

  /** Show `text` on `key` (`SPACES.homeTextKey()`), and save it;  a word left empty goes back to what it was. */
  static saveText(key: string, text: SPACES.HomeText): void {
    makeChange({ text: { key, ...text } })
  }

  /** Forget this person's own changes:  "Reset to default". */
  static reset(): void {
    makeChange({ reset: true })
  }
}

/** Everyone's layout, and this person's own;  whose a change is. */
const [defaults, setDefaults] = createSignal<SPACES.HomeLayout>(SPACES.HOME_DEFAULTS)
const [mine, setMine] = createSignal<SPACES.HomeLayout>(SPACES.NO_HOME_CHANGES)
/**
 * The two layers as they are this moment:  a signal read right after it's set answers the old value
 * (Solid stages writes), and two changes in a row must build on each other.
 */
let defaultsNow = SPACES.HOME_DEFAULTS
let mineNow = SPACES.NO_HOME_CHANGES

/** Show `layout` as everyone's. */
function showDefaults(layout: SPACES.HomeLayout): void {
  defaultsNow = layout
  setDefaults(layout)
}

/** Show `layout` as this person's own. */
function showMine(layout: SPACES.HomeLayout): void {
  mineNow = layout
  setMine(layout)
}
const [setsDefaults, setSetsDefaults] = createSignal(false)
/** Are we on this device alone:  no server answered? */
let onDevice = true
/** Asked the server already? */
let loaded = false
/** The mode, and whether some text is being typed in. */
const [isRearranging, setRearranging] = createSignal(false)
const [editingText, setEditingText] = createSignal(false)

/** Where a person's own layout is kept when no server keeps it:  this browser's storage, `spell-home:layout`. */
const DEVICE = new PrefStore("spell-home")
const DEVICE_KEY = "layout"
showMine(deviceLayout())

/** This device's own layout;  none:  nothing. */
function deviceLayout(): SPACES.HomeLayout {
  const kept = DEVICE.get<Partial<SPACES.HomeLayout>>(DEVICE_KEY)
  return { order: kept?.order ?? {}, texts: kept?.texts ?? {} }
}

/** Take the server's answer:  both layers, and whose a change is. */
function take(answer: SPACES.HomeLayoutAnswer): void {
  onDevice = false
  showDefaults(answer.defaults)
  showMine(answer.mine)
  setSetsDefaults(answer.setsDefaults)
}

/**
 * Make `change`:  shown at once, on the layer it's for, then saved.
 * - On the server:  its answer then taken as the truth;  a refusal shown as an error.
 * - On this device:  kept in its storage.
 */
function makeChange(change: SPACES.HomeLayoutChange): void {
  // the order of your own apps is always your own (the server's `HomeLayouts`)
  const isOwnApps = change.order?.group === SPACES.localPerson.address
  if (setsDefaults() && !isOwnApps && !change.reset) showDefaults(SPACES.withHomeChange(defaultsNow, change))
  else showMine(SPACES.withHomeChange(mineNow, change, defaultsNow))
  if (onDevice) {
    const kept = mineNow
    const isEmpty = !Object.keys(kept.order).length && !Object.keys(kept.texts).length
    DEVICE.set(DEVICE_KEY, isEmpty ? undefined : kept)
    return
  }
  $fetch<SPACES.HomeLayoutAnswer>({
    url: SPACES.HOME_LAYOUT_URL,
    contents: change,
    requestFormat: KnownFormat.json,
    format: KnownFormat.json
  })
    .then(take)
    .catch((error) => editor.showError(error))
}
