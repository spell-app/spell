import { PrefStore } from "spell/util"

/**
 * The editor app's preferences, kept in the browser:  its mode, its tabs, its panels' sizes,
 * and the last project, file and selection it showed.
 * - Every key is under `spellEditor:`, e.g. `spellEditor:mode`.
 * - Each pref is declared where it's used (`EditorMode`, `LineNumbers` ...), with its choices and default.
 *   - A key from before `PrefStore`, with the store's name in it twice (`spellEditor:spellEditor.mode`),
 *     moves to its new one once, where it's declared (`rename()`).
 * - A module of its own, NOT `editor.ts`:  a component reading a pref as it loads needn't load the editor first,
 *   and a page of panes (`rememberedSizes()`) may have no editor at all.
 */
export const editorPrefs = new PrefStore("spellEditor")

/**
 * Is a project written for an older Spell upgraded as it opens, with no notice first (epic `language` P68)?
 * - Off unless a person turns it on:  Code Editor Settings…, "Upgrade old Spell when a project opens".
 * - Declared here, not where it's used:  the editor reads it (`editor.offerUpgrade()`) and the settings panel sets it
 *   (`CodeSettings`), and neither imports the other.
 */
export const UPGRADE_ON_OPEN_PREF = "upgradeOnOpen"
editorPrefs.declare(UPGRADE_ON_OPEN_PREF, { type: "choice", default: false })
