/**
 * `spell-kit/server/site` barrel:  browser code every page of the site shares -- the site header and the section editor.
 * - Opt-in, NOT in `spell-kit/server`'s barrel:  browser code (DOM), while the barrel is node's.
 * - Importing defines nothing:  call `defineSite()`.
 *   spell-epic's docs bundle (`spell-ui.entry.js`), Spell UI's site bundle (`site/_src/site.ts`) and the brand's do.
 */
import { SectionEditor, SiteHeader, type SiteTab } from "spell-kit/server/site"

export * from "./site.types"
export * from "./logoMark"
export * from "./favicon"

export * from "./SiteHeader"
export * from "./SectionEditor"

/**
 * Define `<spell-site-header>`, and mount the section editor on pages the page server serves.
 * - `tabs`:  the header's tabs on a page whose server names none (`SiteHeader.fallbackTabs`):  a `file://` page
 *   - a served page shows its server's (`"siteTabs"`, in its settings) instead
 *   - e.g. spell-epic's docs bundle passes the docs areas, so a doc opened from disk still links them
 * - safe to call more than once;  `tabs` given replace the last ones
 */
export function defineSite({ tabs }: { tabs?: readonly SiteTab[] } = {}): void {
  if (tabs) SiteHeader.fallbackTabs = tabs
  SiteHeader.define()
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", SectionEditor.mount, { once: true })
  else SectionEditor.mount()
}
