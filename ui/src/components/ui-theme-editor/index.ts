/**
 * The theme editor family:  defines `<ui-theme-editor>` and exports its component, `UIThemeEditor`,
 * with `ThemeSheet` (a theme's choices as a stylesheet) and `SavedTheme` (the theme kept in the browser).
 * - SIDE EFFECT:  importing it defines the tag, and the families its shadow DOM is built of:
 *   the inspector's (panel, property editor, input, select, item, slider, menu, button)
 *   and the preview's (card, parts, checkbox, label, message, progress, icon, section, code)
 *   - Why:  a `<ui-root>` only loads what's in the page's light DOM,
 *     so a family built of other widgets imports them itself.
 * - The hook for the Spell editor's theme menu:  `SavedTheme.restore()` (`SavedTheme`'s header).
 * - Also the library's `spell/ui/ui-theme-editor` entry.
 */

import { DOMThemeEditorElement, UIThemeEditor } from "./UIThemeEditor"
import { SavedTheme } from "./SavedTheme"
import { ThemeSheet } from "./ThemeSheet"

import "spell/ui/components/ui-panel"
import "spell/ui/components/ui-property-editor"
import "spell/ui/components/ui-input"
import "spell/ui/components/ui-select"
import "spell/ui/components/ui-item"
import "spell/ui/components/ui-slider"
import "spell/ui/components/ui-menu"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-card"
import "spell/ui/components/ui-parts"
import "spell/ui/components/ui-checkbox"
import "spell/ui/components/ui-label"
import "spell/ui/components/ui-message"
import "spell/ui/components/ui-progress"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-section"
import "spell/ui/components/ui-code"

UIThemeEditor.define()

export { UIThemeEditor, DOMThemeEditorElement, ThemeSheet, SavedTheme }
