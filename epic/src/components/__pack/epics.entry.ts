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
  "epic-actions": "c089ac28ef31a648",
  "epic-agents": "f57fb36d652cb425",
  "epic-answer": "b6fb992feb9de265",
  "epic-aside": "82cf5014a72e97f2",
  "epic-ask": "6eb0d5563a36cf09",
  "epic-away-line": "91d0c3d35ef98446",
  "epic-bells": "c102c43a547591e4",
  "epic-cards": "067c1878bbf3be5d",
  "epic-change": "c5a0ee3e93239398",
  "epic-choice-rows": "7576110c8cd8d65f",
  "epic-choices": "364d080b4e763ea7",
  "epic-choices-bar": "b5a5b1801b7d86bd",
  "epic-clarify": "bd870c2994c902b1",
  "epic-code": "15afed685fc467fb",
  "epic-comment-pane": "f1484d01160057f4",
  "epic-commit": "b04127cdfd958015",
  "epic-event": "867806a7e1678f0f",
  "epic-feature-set": "58841262efda3849",
  "epic-focus": "79c24dfc5fa43404",
  "epic-item": "d49811d2e6b12949",
  "epic-kickoff": "88356b71a8fbc98f",
  "epic-link": "57137f05742d799c",
  "epic-list": "7b77272769e7f7af",
  "epic-mark": "1d91bbfe2f66d6c2",
  "epic-net-effect": "f8b0def77451a87c",
  "epic-new-item": "d5dde44c526e0cd8",
  "epic-note": "cca4c15bd4142f95",
  "epic-option-form": "2ef7e83b9b346007",
  "epic-original": "bb090290ad93dbb2",
  "epic-overview": "0c1bc378e33b772e",
  "epic-page": "48c8b1c037384d20",
  "epic-page-note-head": "ec9fc39a6ec9d282",
  "epic-phase": "02a990dd9efe72db",
  "epic-picture": "328e7e34e7fb5194",
  "epic-pills": "f26fb1d455187c27",
  "epic-prompt": "9851a3da705366f6",
  "epic-question": "21b786476e9f3db4",
  "epic-review": "626de011dbb46b3b",
  "epic-run": "bec350fdafcf69f7",
  "epic-run-row": "be3f038f6aef29f3",
  "epic-section": "cc8ea3ca9ab025bb",
  "epic-send": "cab97f13a11bef0d",
  "epic-send-buttons": "ccfdf79b523b5743",
  "epic-state-filter": "3ee2e536d394afef",
  "epic-status": "5992076ff2640c44",
  "epic-step-output": "5d5c079d2ee2289a",
  "epic-summary": "29cac15d0315d38e",
  "epic-text-box": "0e7c1fba72ac9eda",
  "epic-thread": "55d441f57f86640c",
  "epic-update": "b9170a74c3d451b3"
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
