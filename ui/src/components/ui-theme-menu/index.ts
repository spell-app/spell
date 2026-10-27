/**
 * The theme menu's family:  defines `<ui-theme-menu>` and exports its component, `UIThemeMenu`,
 * its list (`ThemeMenu`) and the remembered theme and scheme (`ThemePreference`).
 * - The docs site's own widget until epic `debut` P17 made it a real element:
 *   every place shows it (the editor, the epic pages and guides, Spell UI's pages).
 * - SIDE EFFECT:  importing it defines the tag, and the widgets its shadow DOM is built of:
 *   `<ui-popup>` (the overlay and the tooltips), `<ui-icon>` (sun, moon, palette, check),
 *   `<ui-dropdown>` and `<ui-item>` (its rows, `show="theme"`).
 *   A `<ui-root>` only loads what's in the page's light DOM, so a family that is built of other widgets
 *   imports them itself.
 * - It applies themes through the runtime (`UI.themes`, in the runtime's chunk),
 *   and every theme sheet stays its own lazy chunk, fetched on `apply()`.
 * - A page that only restores the remembered theme (no menu yet) imports `ThemePreference` by its file,
 *   `spell/ui/components/ui-theme-menu/ThemePreference`:  this barrel would define the menu too.
 */

import { UIThemeMenu } from "./UIThemeMenu"
import { ThemeMenu } from "./ThemeMenu"
import { ThemePreference } from "./ThemePreference"

import "spell/ui/components/ui-dropdown"
import "spell/ui/components/ui-item"
import "spell/ui/components/ui-popup"
import "spell/ui/components/ui-icon"

UIThemeMenu.define()

export { UIThemeMenu, ThemeMenu, ThemePreference }
export type { SchemeChoice, ShownScheme, ThemeAndScheme, ThemeMenuChange } from "./UIThemeMenu.types"
