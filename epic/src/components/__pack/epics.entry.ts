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
  "epic-actions": "fc0feee6f8bdb069",
  "epic-agents": "c7fdd420294fd6b7",
  "epic-answer": "b6c13ba34374874a",
  "epic-aside": "fe270d5d4004f96a",
  "epic-ask": "2d08b14d037f3d16",
  "epic-away-line": "7b3ef70fecac2a76",
  "epic-cards": "b9dce188c7355a0e",
  "epic-change": "2ce8f20398746d9a",
  "epic-choice-rows": "1fc3bec3d9ef1fe0",
  "epic-choices": "aa7891ebd9fd20db",
  "epic-choices-bar": "de45356a89a0278b",
  "epic-clarify": "525ce8c8fcda726b",
  "epic-code": "c8647cdeba2655b3",
  "epic-comment-pane": "63b67f7c32535662",
  "epic-commit": "12b9771a17c9380f",
  "epic-event": "65c5a030622b5c0a",
  "epic-feature-set": "bbeb3a851c2c4e7c",
  "epic-focus": "91562b7e43c73ef8",
  "epic-item": "82eea5e119204f0d",
  "epic-kickoff": "a92eff4ad5aae3bc",
  "epic-link": "627ef850890a203a",
  "epic-list": "9262794d2e91e5d2",
  "epic-mark": "c12c725854ad88c7",
  "epic-net-effect": "295311dfa7fcb351",
  "epic-new-item": "70795aebca950512",
  "epic-note": "211044c2d6fe7003",
  "epic-option-form": "0834aec24b88b779",
  "epic-original": "c0e8bc7963838cee",
  "epic-overview": "cd9042272488012c",
  "epic-page": "091b64d646ed662e",
  "epic-page-note-head": "73f56af11ebf53b3",
  "epic-phase": "4e2f1f278f94ee27",
  "epic-picture": "20af6e38c805f859",
  "epic-pills": "60fc2fb2667e265f",
  "epic-prompt": "a47a425c4178989a",
  "epic-question": "234a8ff6baebbb30",
  "epic-review": "fb981746db9e9cec",
  "epic-run": "281cec70ffd5ba82",
  "epic-run-row": "54158ffd39e8ae1e",
  "epic-section": "a2ab9a8902a0a0c6",
  "epic-send": "9cdc3bda4b84189b",
  "epic-send-buttons": "5e1b4ea22b17b5f0",
  "epic-state-filter": "937f20052b526189",
  "epic-status": "2894ca95cd278d20",
  "epic-summary": "f98e5792a670eedb",
  "epic-text-box": "b7b3a15915f293ae",
  "epic-thread": "fd7e743bac4379e2",
  "epic-update": "5e8444f82b80cd79"
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
