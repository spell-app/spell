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
  "epic-actions": "9153c449e18e8d34",
  "epic-agents": "8758ac6ad5a1423b",
  "epic-answer": "d329370c5997d6a0",
  "epic-aside": "684e830b73369ec4",
  "epic-ask": "1825a2228cc70a9c",
  "epic-away-line": "2d4cbddbb123b756",
  "epic-cards": "4704a7983a01ddfc",
  "epic-change": "03e1f4082590fa10",
  "epic-choice-rows": "97e4c13af50ab5d8",
  "epic-choices": "682da7751d3301d0",
  "epic-choices-bar": "bbf4329f0054a4ea",
  "epic-clarify": "3514ed0563f246df",
  "epic-code": "a211674ea62615f5",
  "epic-comment-pane": "23cc5ce4cf8db53d",
  "epic-commit": "8aabe3e36c4aac38",
  "epic-event": "e6f4ea421f56b5fa",
  "epic-feature-set": "51463e025628b650",
  "epic-focus": "b9cb8b0efcd383f5",
  "epic-item": "1d9f7c69657c92f8",
  "epic-kickoff": "9cf09687fae40a21",
  "epic-link": "f70228304e267a10",
  "epic-list": "b9e60e48e6b353a3",
  "epic-mark": "2aa4930b3a19b98d",
  "epic-net-effect": "45df4820c614961b",
  "epic-new-item": "e992a76513098beb",
  "epic-note": "a4902938eab5ba88",
  "epic-option-form": "83baca796cc08d78",
  "epic-original": "bb7622942c84943a",
  "epic-overview": "d38df7306a7f5ed0",
  "epic-page": "15179ef9f29efbd6",
  "epic-page-note-head": "661b1aab50f90aa6",
  "epic-phase": "335dc72ef2ccca2d",
  "epic-picture": "6183f7d4f146efaa",
  "epic-pills": "4899a2b119d838ad",
  "epic-prompt": "8fc8038091b5b832",
  "epic-question": "ec2ae5e448acef34",
  "epic-review": "e3d0128091f7e847",
  "epic-run": "03a5f7f3fc9d6d4a",
  "epic-run-row": "aa715d61b487d357",
  "epic-section": "54f9656734cbf699",
  "epic-send": "0ed8babf25ffaa31",
  "epic-send-buttons": "b253f3e5be2629c3",
  "epic-state-filter": "fefb4acc676adaa4",
  "epic-status": "090f4f117e67dec7",
  "epic-summary": "77606f9369a2bba4",
  "epic-text-box": "b05464d829c16e2c",
  "epic-thread": "387efe8e538fe181",
  "epic-update": "7456ac2df7c0cc43"
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
