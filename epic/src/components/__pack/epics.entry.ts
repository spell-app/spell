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
  "epic-actions": "e8fc554cc6534adb",
  "epic-agents": "f24b489e171925ab",
  "epic-answer": "a791998a4065ad5f",
  "epic-aside": "8dca3ba1da150f75",
  "epic-ask": "7ee7667e1881b55f",
  "epic-away-line": "44e7f35f05152b16",
  "epic-cards": "46635e097ec325ac",
  "epic-change": "990618315798d916",
  "epic-choice-rows": "7717731f3fad99d5",
  "epic-choices": "fee1e435b669cd73",
  "epic-choices-bar": "2a3c51e9c5139e81",
  "epic-clarify": "02c038b742a75abd",
  "epic-code": "c15d4547e18d7a39",
  "epic-comment-pane": "ba69601902dc97d9",
  "epic-commit": "60fd9f41c45e2191",
  "epic-event": "40d80633f80c2d14",
  "epic-focus": "0d63f261bb57e373",
  "epic-item": "01d6ddabd11631ec",
  "epic-kickoff": "6e1cc545f3f9c0a5",
  "epic-link": "fdc969f8e321c3e5",
  "epic-list": "1e11668ce9b686af",
  "epic-mark": "49270d0ed16ef0d5",
  "epic-net-effect": "bfd771a20b094bdd",
  "epic-new-item": "bc717d7744ff13b0",
  "epic-note": "bb9f19a434acd122",
  "epic-option-form": "f9b3a3e944717786",
  "epic-original": "6326eb42044a31ee",
  "epic-overview": "45205c311e40ea1a",
  "epic-page": "8af9a5fdea0fbe0f",
  "epic-page-note-head": "c96f155db8a54aa6",
  "epic-phase": "d0027fd97c505226",
  "epic-picture": "364331a74a896d19",
  "epic-pills": "e8bb4ebd0710d6b7",
  "epic-prompt": "4e5fc0dae92d4001",
  "epic-question": "841ff14a73a73c78",
  "epic-review": "0fa13c0260426b8b",
  "epic-run": "a94e5ac35335bed0",
  "epic-run-row": "47c989f57f653c5c",
  "epic-section": "a3072d45e05cd902",
  "epic-send": "add8358064ae6d09",
  "epic-send-buttons": "7e1ff5a5771cb246",
  "epic-state-filter": "e7567c100c098103",
  "epic-status": "f9cfb57016ab8ab5",
  "epic-summary": "e4c9bef5de5e7b4b",
  "epic-text-box": "da86e90b90f29c93",
  "epic-thread": "b88925b72d71175c",
  "epic-update": "cf009eeffabceba9"
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
