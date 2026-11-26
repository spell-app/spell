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
  "epic-actions": "2bf083a80e804cce",
  "epic-agents": "e4f2d51cccf38c9f",
  "epic-answer": "8abcc813e8e0a30f",
  "epic-aside": "50d96c04961a71b7",
  "epic-ask": "64490fa360819e08",
  "epic-away-line": "fd43685c48410ad1",
  "epic-bells": "16ee30c2ab7d89c7",
  "epic-cards": "5ec935cc39f7fa88",
  "epic-change": "090b23c82be7fdfa",
  "epic-choice-rows": "24d3e0bcfbeddd13",
  "epic-choices": "bc9a71a1a097c4d0",
  "epic-choices-bar": "2bd345640e8d9869",
  "epic-clarify": "a53ee075cbd38bc9",
  "epic-code": "339d067e044808e8",
  "epic-comment-pane": "7ce81229662c0049",
  "epic-commit": "b20509078bb1d656",
  "epic-event": "1aaf369fdcf50676",
  "epic-feature-set": "dac05ad5f6a72c2e",
  "epic-focus": "0dc9874b55821cd9",
  "epic-item": "7b42f63efdc82f3c",
  "epic-kickoff": "884be5c25c314883",
  "epic-link": "9db8f9bab6fab5ab",
  "epic-list": "36325adc5e8ae4b4",
  "epic-mark": "5f98071ae948f9f4",
  "epic-net-effect": "a1bca1a2809c2de8",
  "epic-new-item": "8d3d25769c0c0a95",
  "epic-note": "820b37be71f2be35",
  "epic-option-form": "a14e048e8e9b7290",
  "epic-original": "f2dff21d1a15581f",
  "epic-overview": "b0d122ce9a489f14",
  "epic-page": "2cf3d5444052f647",
  "epic-page-note-head": "b39b26acfa422d89",
  "epic-phase": "1e9aa25e8615f1d4",
  "epic-picture": "25d9dacbf91114a2",
  "epic-pills": "67d4978479f13692",
  "epic-prompt": "3cfbc8cf9e9d36fd",
  "epic-question": "ef0856855f9b5b9a",
  "epic-review": "e6fe1f4ed975439e",
  "epic-run": "775a1ccf9d653b7e",
  "epic-run-row": "7482e6d84ecef761",
  "epic-section": "5be7fc3938ec255e",
  "epic-send": "2933ea291721dda8",
  "epic-send-buttons": "dfa75b6aebbd8fa9",
  "epic-state-filter": "385c361041b1f039",
  "epic-status": "841da8603ff5fce6",
  "epic-step-output": "85a3298338bccc0d",
  "epic-summary": "7f1e2fc5e438c58c",
  "epic-text-box": "bf2cdb918eb2197b",
  "epic-thread": "249cc9be3211e635",
  "epic-update": "9ec894799e1be5b0"
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
