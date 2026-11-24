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
  "epic-actions": "f38dfe5283677711",
  "epic-agents": "6422ae3d9eae128b",
  "epic-answer": "cb23b7323e1d3799",
  "epic-aside": "4def50580b8837f7",
  "epic-ask": "1dc1e060bd03ee1f",
  "epic-away-line": "5b58ecbd53431599",
  "epic-cards": "132ac820237e29bc",
  "epic-change": "7beaedea0774c2f8",
  "epic-choice-rows": "e569828992e728bf",
  "epic-choices": "3521df39e7735d4f",
  "epic-choices-bar": "72a711da5d7b14d5",
  "epic-clarify": "30c92bcd9568a15c",
  "epic-code": "b0c0ff3f46f7ff51",
  "epic-comment-pane": "6015a58b6740aa00",
  "epic-commit": "2e2cef719649c47f",
  "epic-event": "659dd0e6c9cf88b8",
  "epic-feature-set": "de7e0d6cdc1663b2",
  "epic-focus": "1db3151878b2ca6e",
  "epic-item": "2e1adb2b6d46a8fe",
  "epic-kickoff": "4dda41720280a22a",
  "epic-link": "87a84cda89a2e5cc",
  "epic-list": "2c1562a6b9339db1",
  "epic-mark": "a277f9ee3b253dce",
  "epic-net-effect": "6be469a8b1bf6885",
  "epic-new-item": "c15db96a0dbaab14",
  "epic-note": "8c8aa1eeca0ef5fc",
  "epic-option-form": "8fac8e375131b23d",
  "epic-original": "95a607979c8e49f7",
  "epic-overview": "cce80d8a1fbd9026",
  "epic-page": "41d9d124a916b5d5",
  "epic-page-note-head": "abe4b62148aa94ff",
  "epic-phase": "9043b8116bdcf240",
  "epic-picture": "7b99010827bf884a",
  "epic-pills": "af9b5b0ef077b137",
  "epic-prompt": "d2ee69188f1a6a0c",
  "epic-question": "45d33739eb1eab20",
  "epic-review": "802892d89ae172d5",
  "epic-run": "fd28d1fceeb8428c",
  "epic-run-row": "1e298d8de8826243",
  "epic-section": "d3deb9bebf5a66f2",
  "epic-send": "748f3034b0f91a34",
  "epic-send-buttons": "17fc8fc1478e2290",
  "epic-state-filter": "92b23c65f4f7c2fa",
  "epic-status": "cc5a6b8cecd85d4e",
  "epic-step-output": "2b8d113ee246634d",
  "epic-summary": "646ae1405648e122",
  "epic-text-box": "67ff5990d24fc897",
  "epic-thread": "5fd12f841175515e",
  "epic-update": "fb7dd700697f2d0b"
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
