import { createSignal } from "solid-js"

import { editorPrefs } from "spell/app/app/editorPrefs"

/****************
 * ### `HomeFolds`
 * What this person folded away on the home page, kept in the browser across reloads (epic `editor` T186):
 * - the hero, hidden by its ✕ and shown again by "Show the introduction" at the page's foot
 * - each section folded by its chevron, by the section's id (`examples`, `spanish`, `org-acme` ...)
 * - The editor's preferences (`editorPrefs`):  `spellEditor:homeHeroHidden`, `spellEditor:homeFolded`.
 * - Only this person's view, on this device:  never the home page's layout, which `HomeArrangement` keeps.
 * - STATIC and module-level, as `HomeArrangement` is:  ONE home page per tab.
 ****************/
export class HomeFolds {
  /** Is the hero hidden (reactive)? */
  static get isHeroHidden(): boolean {
    return heroHidden()
  }

  /** Hide the hero, or show it again;  remembered. */
  static hideHero(hidden: boolean): void {
    setHeroHidden(hidden)
    editorPrefs.set(HERO_HIDDEN_PREF, hidden)
  }

  /** Is section `id` folded (reactive)? */
  static isFolded(id: string): boolean {
    return folded().includes(id)
  }

  /** Fold section `id`, or unfold it;  remembered. */
  static fold(id: string, isFolded: boolean): void {
    if (isFolded === HomeFolds.isFolded(id)) return
    const next = [...folded().filter((each) => each !== id), ...(isFolded ? [id] : [])]
    setFolded(next)
    editorPrefs.set(FOLDED_PREF, next)
  }

  /** Forget it all:  the hero shown, every section open (the tests). */
  static reset(): void {
    HomeFolds.hideHero(false)
    setFolded([])
    editorPrefs.set(FOLDED_PREF, [])
  }
}

/** The prefs:  is the hero hidden;  the ids of the folded sections. */
const HERO_HIDDEN_PREF = "homeHeroHidden"
const FOLDED_PREF = "homeFolded"
editorPrefs.declare(HERO_HIDDEN_PREF, { type: "choice", default: false })
editorPrefs.declare(FOLDED_PREF, { type: "object", default: [] })

const [heroHidden, setHeroHidden] = createSignal(editorPrefs.get(HERO_HIDDEN_PREF) === true)
const [folded, setFolded] = createSignal<readonly string[]>(
  (editorPrefs.get(FOLDED_PREF) as string[] | undefined) ?? []
)
