/* GENERATED -- do not edit:  `spell pack build epics` */
/**
 * The `epics` pack's script:  registers with the page's Spell UI, which adds the catalog, and loads its
 * families (`epics/<family>.js`, ES modules beside the script) on first use, or all at once (`define()`).
 * - `families`:  each family's sources' hash, so a page swapping in a rebuilt pack re-renders only what changed;
 *   and its module's query, so a rebuilt family is a new module, an unchanged one the same
 */
import { CATALOG } from "./epics.catalog"

/** The page's Spell UI (the docs bundle's, the site's):  `loading` until the docs bundle has run (`spell-ui.js`). */
const { SpellUI } = globalThis as unknown as {
  SpellUI?: { registerPack?(pack: object): void; loading?: Promise<unknown> }
}

/** This script's own address:  its families are beside it.  Read as it runs, while `currentScript` is set. */
const BASE = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : location.href

/** Each family folder => its sources' hash. */
const FAMILIES: Record<string, string> = {
  "epic-actions": "dbb3bf74b75b7d7f",
  "epic-agents": "5adda5fbe9d0b0e4",
  "epic-answer": "be29b442ad2e2459",
  "epic-aside": "ef5d1ed62fa93fc5",
  "epic-ask": "a60cdeae5f261945",
  "epic-away-line": "ba9d73a44c9055bb",
  "epic-cards": "1d87e8ad43930b96",
  "epic-change": "c60f91a41e2cdcee",
  "epic-choice-rows": "9dedf1ad9594bd90",
  "epic-choices": "7890a84558920780",
  "epic-choices-bar": "9093e33d9a745731",
  "epic-clarify": "5f4fe8ef182f554b",
  "epic-code": "52d436f3f06348e0",
  "epic-comment-pane": "796c8bdb24c9c68b",
  "epic-commit": "b3856c269e516b14",
  "epic-event": "827da65729a455f9",
  "epic-focus": "6cb521aa7cce5da7",
  "epic-item": "b321e7c798463f6e",
  "epic-kickoff": "3e502a304d603f24",
  "epic-link": "75c3c73865f8a678",
  "epic-list": "0c07f8b414a72037",
  "epic-mark": "393032d27b4232b7",
  "epic-net-effect": "3d6fd246a3beaafe",
  "epic-new-item": "2a45dbdd8cc98f51",
  "epic-note": "707efacd9e56f10c",
  "epic-option-form": "465b146ae64a8e8a",
  "epic-original": "192fe387d747fbc7",
  "epic-overview": "63a0d6bc5b5ba25a",
  "epic-page": "1f0f01d7fd1135ac",
  "epic-page-note-head": "4adfe47eb8cd387e",
  "epic-phase": "bec2664a13704819",
  "epic-picture": "9049e35f586bbd63",
  "epic-pills": "c4acbac73a9dfaed",
  "epic-prompt": "0711949e293e368b",
  "epic-question": "91cf6177da08667d",
  "epic-review": "6f28a9ec488663f5",
  "epic-run": "70c7c721a07bcf77",
  "epic-run-row": "4db89409f9cb3c7e",
  "epic-section": "7346d47075227e3f",
  "epic-send": "1734ba67439aaf22",
  "epic-send-buttons": "ec47486754f2007a",
  "epic-state-filter": "3edad26d6b8c426a",
  "epic-status": "622f7fcb17300e56",
  "epic-summary": "340fdff529e32336",
  "epic-text-box": "dff67f2605f39ada",
  "epic-thread": "35f3e6220e8beb76",
  "epic-update": "ea879b83af968270"
}

/** Import family `folder`'s module, which defines its tags. */
function loadFamily(folder: string): Promise<unknown> {
  const url = new URL(`./epics/${folder}.js?v=${FAMILIES[folder] ?? ""}`, BASE)
  return import(/* @vite-ignore */ url.href)
}

function register() {
  SpellUI!.registerPack!({
    name: "epics",
    prefix: "epic-",
    catalog: CATALOG,
    families: FAMILIES,
    loadFamily,
    define: () => Promise.all(Object.keys(FAMILIES).map(loadFamily)).then(() => undefined)
  })
}

if (SpellUI?.registerPack) register()
else void SpellUI?.loading?.then(register)
