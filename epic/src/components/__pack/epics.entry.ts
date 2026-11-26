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
  "epic-actions": "4dd99bf62e29a525",
  "epic-agents": "25915575c99978b7",
  "epic-answer": "fa01f2ed677515f1",
  "epic-aside": "864059fe5fefb3e6",
  "epic-ask": "b847e15607cf2920",
  "epic-away-line": "f4f1336b10ffebfe",
  "epic-cards": "51b9895a155dfbf0",
  "epic-change": "974381db42f6cc29",
  "epic-choice-rows": "636545c085efb5eb",
  "epic-choices": "b8b44902e97161cf",
  "epic-choices-bar": "052b808373e0cd59",
  "epic-clarify": "921ee2598793b8f8",
  "epic-code": "a48031e9b3173f82",
  "epic-comment-pane": "c2dfbf83e3823b77",
  "epic-commit": "353383055096825f",
  "epic-event": "291d2a074b8cb253",
  "epic-feature-set": "059d721080788cb5",
  "epic-focus": "aefe9b6b0b2714bb",
  "epic-item": "54564fdd8b739cb2",
  "epic-kickoff": "9c666be896a27f85",
  "epic-link": "5c757c6f7d44a1a9",
  "epic-list": "916a66229071d30d",
  "epic-mark": "3907ed2387e8cbb5",
  "epic-net-effect": "f0a3e6908610a65f",
  "epic-new-item": "5bf372d918ad330a",
  "epic-note": "3a73be1dd8153d28",
  "epic-option-form": "83b9d4322a9274f9",
  "epic-original": "267936d36b7c12a0",
  "epic-overview": "4f991d0e5ad47dd2",
  "epic-page": "556c3005451c594b",
  "epic-page-note-head": "40c50e8643874db0",
  "epic-phase": "49d9386f25d9f935",
  "epic-picture": "d56c5d99f5eb8018",
  "epic-pills": "06f55bafe6dde51a",
  "epic-prompt": "7f5b977451df1af5",
  "epic-question": "3a5def6cf36555c9",
  "epic-review": "a7985faffcffacad",
  "epic-run": "547fd8c9ca606f5d",
  "epic-run-row": "be045e15da198b00",
  "epic-section": "a8af16073e97e89b",
  "epic-send": "7f7e8bbc58a66101",
  "epic-send-buttons": "3607e55aa8f738d3",
  "epic-state-filter": "54aba92beae7b754",
  "epic-status": "3ee04dd439dc57c6",
  "epic-step-output": "501714565066b0b3",
  "epic-summary": "94b359720930b34c",
  "epic-text-box": "612585625f33df64",
  "epic-thread": "d0add2a13a21b947",
  "epic-update": "72f4816297615ce0"
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
