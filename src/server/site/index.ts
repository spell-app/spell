/**
 * `spell/server/site` barrel:  browser code every page of the site shares --
 * the site header, the section editor and the page patcher (`PagePatch`).
 * - Opt-in, NOT in `spell/server`'s barrel:  browser code (DOM), while the barrel is node's.
 * - Importing defines nothing:  call `defineSite()`.
 *   spell-epic's docs bundle (`spell-ui.entry.js`), Spell UI's site bundle (`site/_src/site.ts`) and the brand's do.
 */
import { SectionEditor, SiteHeader } from "spell/server/site"

export * from "./site.types"
export * from "./logoMark"
export * from "./favicon"

export * from "./SiteHeader"
export * from "./SectionEditor"
export * from "./PagePatch"

/**
 * Define `<spell-site-header>`, and mount the section editor on pages the page server serves.
 * - the header's tabs are its server's (`"siteTabs"`, in its settings):  a bundle gives none of its own since epic
 *   `epic-engine` P46, which took away pages opened from disk
 * - safe to call more than once
 */
export function defineSite(): void {
  SiteHeader.define()
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", SectionEditor.mount, { once: true })
  else SectionEditor.mount()
}
