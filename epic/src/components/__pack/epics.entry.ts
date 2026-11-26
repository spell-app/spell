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
  "epic-actions": "43d3687c0cbf9443",
  "epic-agents": "5ea9570069574420",
  "epic-answer": "d12ec068452eea82",
  "epic-aside": "bab7ac25ac3ffc53",
  "epic-ask": "56dc729b023fc503",
  "epic-away-line": "8460e4096b15e328",
  "epic-bells": "a4e15e34283ff067",
  "epic-cards": "18acdff86724736b",
  "epic-change": "17a9af6d03c68460",
  "epic-choice-rows": "c16626ca4e1dfeb7",
  "epic-choices": "b781b1ec7d07aa73",
  "epic-choices-bar": "2ff7ea1ee22e2bc4",
  "epic-clarify": "40061381fa275955",
  "epic-code": "bda6798f64e5f065",
  "epic-comment-pane": "ee27ac6b19f14686",
  "epic-commit": "c0a026cd674bd356",
  "epic-event": "7f5e269f909ff2bf",
  "epic-feature-set": "84a07cd030766e69",
  "epic-focus": "07e62a28c393c387",
  "epic-item": "f7456f4241fb2d0c",
  "epic-kickoff": "37e9583e7698a7eb",
  "epic-link": "af944c7cc051c402",
  "epic-list": "92a756dedee9b37a",
  "epic-mark": "23fc50bb663d82ef",
  "epic-net-effect": "6a0494ff9d59b275",
  "epic-new-item": "877ee8ac96c25aa7",
  "epic-note": "1ba1c30b0a8b9c2e",
  "epic-option-form": "346b634fc01119a1",
  "epic-original": "d57ae85c80a61b27",
  "epic-overview": "d75533f4026e59c9",
  "epic-page": "7dd4f857434729c9",
  "epic-page-note-head": "11f923f089046db4",
  "epic-phase": "41c1fef6e02fcc64",
  "epic-picture": "017ad5d06e5145d2",
  "epic-pills": "78bacef89d551e6e",
  "epic-prompt": "749352e6e2ac5f5d",
  "epic-question": "a78b2efdcd948da1",
  "epic-review": "c0a8103778e1220f",
  "epic-run": "0b34416c24c781e2",
  "epic-run-row": "b6b7bf2ad5c4b48c",
  "epic-section": "0d9bb1894219657f",
  "epic-send": "3e1c79185a4f6e2b",
  "epic-send-buttons": "3261d247e7906784",
  "epic-state-filter": "eded8a132f734a13",
  "epic-status": "55c131bf977a5bbc",
  "epic-step-output": "0e2c7369b74ae4d6",
  "epic-summary": "c2ff7885cb783111",
  "epic-text-box": "4de8ae9c9ffa1774",
  "epic-thread": "955bb55506f33b2d",
  "epic-update": "6914d975a7a70f11"
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
