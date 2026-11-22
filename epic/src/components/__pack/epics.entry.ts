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
  "epic-actions": "e29b8cf8502f1817",
  "epic-agents": "7e489ecc5c320793",
  "epic-answer": "7ee6e8ffe85a9bd1",
  "epic-aside": "b110dfcd1ceb807a",
  "epic-ask": "aec5a205ec7a38e6",
  "epic-away-line": "d0ddd5eccafc16f1",
  "epic-cards": "ebb19c0a545f5155",
  "epic-change": "62b833f86ad2aaf5",
  "epic-choice-rows": "128cc4e027f45562",
  "epic-choices": "a47d89dd57fe625c",
  "epic-choices-bar": "364ebc2862d5f29e",
  "epic-clarify": "d4027603dc8a70f7",
  "epic-code": "15d31a7c99ef52d2",
  "epic-comment-pane": "f58d317e25cce97a",
  "epic-commit": "294fb1deaba031fd",
  "epic-event": "1274b815552b1604",
  "epic-feature-set": "fcd19b433384ac4e",
  "epic-focus": "0320473266b1e8cd",
  "epic-item": "aca3abb658f28a53",
  "epic-kickoff": "071909d4781ae727",
  "epic-link": "5613bf071af02a74",
  "epic-list": "099828369f503604",
  "epic-mark": "f9283f094df6701c",
  "epic-net-effect": "01c6ecd72b619a88",
  "epic-new-item": "233c018f88363ebd",
  "epic-note": "255f9fb6778a4158",
  "epic-option-form": "5d656195434f0d4d",
  "epic-original": "cf50640ccf2f54e8",
  "epic-overview": "5c60d6de69df1951",
  "epic-page": "bf2657797b190f33",
  "epic-page-note-head": "36bbb62b55750295",
  "epic-phase": "acd92b144e5506cb",
  "epic-picture": "ff121e400db830f0",
  "epic-pills": "f29467837eb2fd25",
  "epic-prompt": "12f96c828e443638",
  "epic-question": "1fd5a848300af523",
  "epic-review": "13810f52513e1a91",
  "epic-run": "fc31bcc3985d5b3c",
  "epic-run-row": "09574f35d17de028",
  "epic-section": "5fe2b768dfe87ee0",
  "epic-send": "8d95c163d8385d56",
  "epic-send-buttons": "803af64756b61b1e",
  "epic-state-filter": "4a24d6d3cbbf4e6c",
  "epic-status": "d37886dfc99c571a",
  "epic-summary": "05b1fdefb5757ed9",
  "epic-text-box": "270a49cc0c14dd73",
  "epic-thread": "dc35aa94a476473f",
  "epic-update": "22d35fffd031a11c"
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
