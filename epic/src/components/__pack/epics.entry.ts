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
  "epic-actions": "5401874d34286144",
  "epic-agents": "17956c36d62c0d94",
  "epic-answer": "a78158f10ce9efc2",
  "epic-aside": "ab54483f972fedc4",
  "epic-ask": "f24bedc7dcb7200b",
  "epic-away-line": "a2cfddd0e48251a6",
  "epic-bells": "2abb642f438df36d",
  "epic-cards": "971302e03161decb",
  "epic-change": "2573bd1b735c243f",
  "epic-choice-rows": "82dc210cb897bca2",
  "epic-choices": "b65a197c5006c7df",
  "epic-choices-bar": "8f8880fb19bb74bd",
  "epic-clarify": "df51565f59354851",
  "epic-code": "10eb9fbf0fdd391c",
  "epic-comment-pane": "819c81cd2fa1cd9e",
  "epic-commit": "3b4ab72a674d7e65",
  "epic-event": "108234dfd9fbbb38",
  "epic-feature-set": "ab0fb83cbdc795b3",
  "epic-focus": "1f7609491b788c48",
  "epic-item": "7ada41a9a75dae20",
  "epic-kickoff": "70aef4874a227347",
  "epic-link": "bb2cb86603728d0d",
  "epic-list": "bfe9b32b67506680",
  "epic-mark": "69256595e7a2190e",
  "epic-net-effect": "26d7d9e074ae4961",
  "epic-new-item": "7ba35c9c2a341900",
  "epic-note": "4ef9675a1923c936",
  "epic-option-form": "d83775b67f745cdd",
  "epic-original": "455942eb909afc03",
  "epic-overview": "d55adf6ea5ffbe03",
  "epic-page": "fe4591d74d2aae8b",
  "epic-page-note-head": "4cf534e6b840b54a",
  "epic-phase": "2f93054c9795b7e4",
  "epic-picture": "57dd76bbf5e5bffa",
  "epic-pills": "b6677de2a98630ed",
  "epic-prompt": "dc2c3a9423cbb3a3",
  "epic-question": "91df532e9540bd45",
  "epic-review": "64cf227fb614ec12",
  "epic-run": "47111e2fabbaab2b",
  "epic-run-row": "64c26e0e019c9198",
  "epic-section": "4594cb7f8d0ca1d5",
  "epic-send": "8aa6393dd498fc45",
  "epic-send-buttons": "c8fed39a71e9bad2",
  "epic-state-filter": "3bac77ccfe3529e7",
  "epic-status": "2112ea2307d4b646",
  "epic-step-output": "d5e9be99ac571849",
  "epic-summary": "8e4bb0329e1aab17",
  "epic-text-box": "07ac318b25152282",
  "epic-thread": "d6f83c7745cd2dd5",
  "epic-update": "089201f913461594"
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
