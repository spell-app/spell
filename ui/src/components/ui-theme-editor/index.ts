/**
 * The theme editor family:  defines `<ui-theme-editor>`, Spell's one theme tool, and the two elements it's built of:
 * `<ui-theme-token>` (one token's row and its editing drawer) and `<ui-color-chip>` (a read-only colour);  exports
 * their components (`UIThemeEditor`, `UIThemeToken`, `UIColorChip`), with:
 * - `ThemeDraft`:  the theme being made, as a theme file, and its sheets (written by `ThemeFile`)
 * - `ThemeTokens`:  every token a theme sets, and every theme's value for it, from the theme files
 * - `TokenTree`, `TokenColor`:  the token tree, and a token's colour as its controls take it
 * - `PageBridge`:  what it does inside a page it previews in a frame
 * - `SavedTheme`:  the theme kept in the browser
 * - SIDE EFFECT:  importing it defines the tag, and the families its shadow DOM is built of:
 *   the Basics' (property editor, input, select, item, slider, menu, button), the token tree's (section, icon,
 *   code), the bar's theme menu, and the sample app's (card, parts, checkbox, label, message, progress)
 *   - Why:  a `<ui-root>` only loads what's in the page's light DOM,
 *     so a family built of other widgets imports them itself.
 * - Imported by their files, without the editor:  `SavedTheme` (the Spell editor's theme menu, `SavedTheme.restore()`)
 *   and `PageBridge` (the Spell editor app, framed, in development).
 * - Also the library's `spell-ui/ui-theme-editor` entry.
 */

import { DOMThemeEditorElement, UIThemeEditor } from "./UIThemeEditor"
import { UIThemeToken } from "./UIThemeToken"
import { UIColorChip } from "./UIColorChip"
import { PageBridge } from "./PageBridge"
import { SavedTheme } from "./SavedTheme"
import { ThemeDraft } from "./ThemeDraft"
import { ThemeTokens } from "./ThemeTokens"
import { TokenColor } from "./TokenColor"
import { TokenTree } from "./TokenTree"

import "spell-ui/components/ui-property-editor"
import "spell-ui/components/ui-input"
import "spell-ui/components/ui-select"
import "spell-ui/components/ui-item"
import "spell-ui/components/ui-slider"
import "spell-ui/components/ui-menu"
import "spell-ui/components/ui-button"
import "spell-ui/components/ui-card"
import "spell-ui/components/ui-parts"
import "spell-ui/components/ui-checkbox"
import "spell-ui/components/ui-label"
import "spell-ui/components/ui-message"
import "spell-ui/components/ui-progress"
import "spell-ui/components/ui-icon"
import "spell-ui/components/ui-section"
import "spell-ui/components/ui-code"
import "spell-ui/components/ui-theme-menu"

UIThemeEditor.define()
UIThemeToken.define()
UIColorChip.define()

export { UIThemeEditor, DOMThemeEditorElement, PageBridge, SavedTheme, ThemeDraft, ThemeTokens, TokenColor, TokenTree }
