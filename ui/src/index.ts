/**
 * Entry point for `spell-ui` -- everything:
 * every component family, registered, plus the foundation pages reach for (`spell-ui/util`, the runtime, styles, icons).
 * - SIDE EFFECT:  each family's barrel (`spell-ui/components/ui-<name>`) calls `define()` for its tags.
 * - So a page can load one family alone, there are more lib entries (see `vite.config.ts`):
 *   - one per family (`spell-ui/ui-button` ...)
 *   - two for the shared code (`spell-ui/core`, `spell-ui/forms`)
 * - FLAT:  `UI` is the runtime instance (see `spell-ui/runtime`).
 *   `spell-ui/styles`, `spell-ui/icons` and the component classes carry their own suffixes or prefixes
 *   (`tokensCSS`, `IconName`, `UIButton`).
 * - NOTE: ONE namespace here, `UIT` (the shared constants and types of `spell-ui/components/components.types`).
 *   - `E` (element core) and `V` (vocabulary) live in the `api` entry (`src/api.ts`, `spell-ui/api`).
 *   - Why:  `export * as` here moved Rolldown's runtime helpers into a chunk every page loaded.
 *   - The element core is also flat in `spell-ui/core`.
 */

// Spell UI's settings for `spell/element` (a side effect), here too:  `core`'s import of it is dropped by a bundler
// that finds nothing of `core` itself used (`SpellUISettings`)
import "spell-ui/elements/SpellUISettings"

export * from "spell-ui/util"
export * from "spell-ui/runtime"
export * from "spell-ui/styles"
export * from "spell-ui/icons"
export * as UIT from "spell-ui/components/components.types"

export * from "spell-ui/components/ui-button"
export * from "spell-ui/components/ui-dropdown"
export * from "spell-ui/components/ui-icon"
export * from "spell-ui/components/ui-label"
export * from "spell-ui/components/ui-parts"
export * from "spell-ui/components/ui-divider"
export * from "spell-ui/components/ui-segment"
export * from "spell-ui/components/ui-container"
export * from "spell-ui/components/ui-grid"
export * from "spell-ui/components/ui-image"
export * from "spell-ui/components/ui-text"
export * from "spell-ui/components/ui-flag"
export * from "spell-ui/components/ui-loader"
export * from "spell-ui/components/ui-placeholder"
export * from "spell-ui/components/ui-message"
export * from "spell-ui/components/ui-breadcrumbs"
export * from "spell-ui/components/ui-input"
export * from "spell-ui/components/ui-checkbox"
export * from "spell-ui/components/ui-form"
export * from "spell-ui/components/ui-item"
export * from "spell-ui/components/ui-list"
export * from "spell-ui/components/ui-menu"
export * from "spell-ui/components/ui-table"
export * from "spell-ui/components/ui-popup"
export * from "spell-ui/components/ui-modal"
export * from "spell-ui/components/ui-transition"
export * from "spell-ui/components/ui-dimmer"
export * from "spell-ui/components/ui-flyout"
export * from "spell-ui/components/ui-sidebar"
export * from "spell-ui/components/ui-shape"
export * from "spell-ui/components/ui-card"
export * from "spell-ui/components/ui-items"
export * from "spell-ui/components/ui-feed"
export * from "spell-ui/components/ui-comment"
export * from "spell-ui/components/ui-stack"
export * from "spell-ui/components/ui-quote"
export * from "spell-ui/components/ui-keys"
export * from "spell-ui/components/ui-page"
export * from "spell-ui/components/ui-video"
export * from "spell-ui/components/ui-terms"
export * from "spell-ui/components/ui-statistic"
export * from "spell-ui/components/ui-step"
export * from "spell-ui/components/ui-rail"
export * from "spell-ui/components/ui-root"
export * from "spell-ui/components/ui-components"
export * from "spell-ui/components/ui-reveal"
export * from "spell-ui/components/ui-ad"
export * from "spell-ui/components/ui-emoji"
export * from "spell-ui/components/ui-select"
export * from "spell-ui/components/ui-search"
export * from "spell-ui/components/ui-progress"
export * from "spell-ui/components/ui-rating"
export * from "spell-ui/components/ui-icon-picker"
export * from "spell-ui/components/ui-slider"
export * from "spell-ui/components/ui-accordion"
export * from "spell-ui/components/ui-tab"
export * from "spell-ui/components/ui-toast"
export * from "spell-ui/components/ui-nag"
export * from "spell-ui/components/ui-sticky"
export * from "spell-ui/components/ui-visibility"
export * from "spell-ui/components/ui-embed"
export * from "spell-ui/components/ui-calendar"
export * from "spell-ui/components/ui-section"
export * from "spell-ui/components/ui-panel"
export * from "spell-ui/components/ui-toolbar"
export * from "spell-ui/components/ui-action"
export * from "spell-ui/components/ui-property-editor"
export * from "spell-ui/components/ui-markdown"
export * from "spell-ui/components/ui-code"
export * from "spell-ui/components/ui-include"
export * from "spell-ui/components/ui-tree-diagram"
export * from "spell-ui/components/ui-theme-editor"
export * from "spell-ui/components/ui-theme-menu"
