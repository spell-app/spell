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
  "epic-actions": "1d17653a91c4d1ba",
  "epic-agents": "41bd2dae2e0b01c9",
  "epic-answer": "8d0015aa7df89ff8",
  "epic-aside": "f09331c86c5811b6",
  "epic-ask": "fb16edd71b6b7a51",
  "epic-away-line": "48f949a6bee3df46",
  "epic-bells": "9aab36baedfe8477",
  "epic-cards": "62913eb071881bc8",
  "epic-change": "df8e9ac63deea1ba",
  "epic-choice-rows": "25f14116b0c2ef53",
  "epic-choices": "ef2c7718d6a135a7",
  "epic-choices-bar": "d9e893545d4f2cda",
  "epic-clarify": "c2bd92e39a8d647c",
  "epic-code": "73abb34f0fa1e61b",
  "epic-comment-pane": "b5027f5634474ee7",
  "epic-commit": "85fb96c6d973ff6c",
  "epic-event": "be3cba3063bea37d",
  "epic-feature-set": "83d49bf3dcd53713",
  "epic-focus": "3286e6d8abd27d0f",
  "epic-item": "3d3dbdcb1ede6cfb",
  "epic-kickoff": "a0b927929e307ba5",
  "epic-link": "86c27a4bc821e622",
  "epic-list": "8d42f35679de0d5a",
  "epic-mark": "1ffada703c13ffe4",
  "epic-net-effect": "11639f42ce861aaf",
  "epic-new-item": "62b956b2c43b60aa",
  "epic-note": "994a25591db6f0f7",
  "epic-option-form": "19710aa71b4d9cbd",
  "epic-original": "72119fa1442336fa",
  "epic-overview": "ddef2e23a7206403",
  "epic-page": "9608cfc7663a87ef",
  "epic-page-note-head": "ae119089f03f08b9",
  "epic-phase": "209becdcea759bdf",
  "epic-picture": "9e6966c6beb2bf72",
  "epic-pills": "fd764c77ceb4d65f",
  "epic-prompt": "cad060b7642d0221",
  "epic-question": "7e3bc645ec7f2775",
  "epic-review": "0ef446402278575a",
  "epic-run": "25a6a6a1de6bf964",
  "epic-run-row": "a48182812e6e6b70",
  "epic-section": "f24fbc5e730a45ba",
  "epic-send": "81ce17867a6c055d",
  "epic-send-buttons": "896ebfdb57c6f108",
  "epic-state-filter": "101e484d2450c7c7",
  "epic-status": "56c7b55d4bcea07f",
  "epic-step-output": "80d17031578f1266",
  "epic-summary": "9bacb108963a6c4c",
  "epic-text-box": "c0479ab5236406ef",
  "epic-thread": "8f8bdb9846658869",
  "epic-update": "8fc6f7f6e618eb99"
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
