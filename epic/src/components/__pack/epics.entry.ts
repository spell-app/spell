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
  "epic-agents": "13e15a2ed3362844",
  "epic-answer": "d329370c5997d6a0",
  "epic-aside": "684e830b73369ec4",
  "epic-ask": "227c1b791af860e2",
  "epic-away-line": "10d63ffc33adc695",
  "epic-cards": "62264f5b037a1547",
  "epic-change": "bf616dabc149736e",
  "epic-choice-rows": "97e4c13af50ab5d8",
  "epic-choices": "a5930401c6cc2753",
  "epic-choices-bar": "68447f05e6accd69",
  "epic-clarify": "3514ed0563f246df",
  "epic-code": "a211674ea62615f5",
  "epic-comment-pane": "23cc5ce4cf8db53d",
  "epic-commit": "8aabe3e36c4aac38",
  "epic-event": "e6f4ea421f56b5fa",
  "epic-feature-set": "9761c456f574fb1a",
  "epic-focus": "b22b3051b3731272",
  "epic-item": "7f73aa1effe8b6f9",
  "epic-kickoff": "dc0e0f0c103d3261",
  "epic-link": "f70228304e267a10",
  "epic-list": "58434e650b4141e9",
  "epic-mark": "2aa4930b3a19b98d",
  "epic-net-effect": "45df4820c614961b",
  "epic-new-item": "40b41a4c5aca5691",
  "epic-note": "a4902938eab5ba88",
  "epic-option-form": "f1c192917182dd43",
  "epic-original": "bb7622942c84943a",
  "epic-overview": "14d540e366c67318",
  "epic-page": "e840922a329e694b",
  "epic-page-note-head": "661b1aab50f90aa6",
  "epic-phase": "0ab82590d826727b",
  "epic-picture": "386e120928524601",
  "epic-pills": "4899a2b119d838ad",
  "epic-prompt": "8fc8038091b5b832",
  "epic-question": "ec2ae5e448acef34",
  "epic-review": "433d65a5e9f8fea9",
  "epic-run": "03a5f7f3fc9d6d4a",
  "epic-run-row": "aa715d61b487d357",
  "epic-section": "da46c49e8b3ab355",
  "epic-send": "0ed8babf25ffaa31",
  "epic-send-buttons": "b253f3e5be2629c3",
  "epic-state-filter": "fefb4acc676adaa4",
  "epic-status": "090f4f117e67dec7",
  "epic-summary": "77606f9369a2bba4",
  "epic-text-box": "6c016493e29bc1bb",
  "epic-thread": "26867ea6c4813d81",
  "epic-update": "8e3e996bf39f769f"
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
