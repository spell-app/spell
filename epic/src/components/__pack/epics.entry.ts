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
  "epic-actions": "8aae42cf8ca8aee6",
  "epic-agents": "11dd982e8335f6af",
  "epic-answer": "a750c9e49e7bd25b",
  "epic-aside": "593ed6437f3f4db7",
  "epic-ask": "2abc5d45284575ad",
  "epic-away-line": "e87dd068dbacb3ce",
  "epic-cards": "71af13dd5870c868",
  "epic-change": "8218808212619dac",
  "epic-choice-rows": "15366463a32bdfc1",
  "epic-choices": "ddc1256c4ac161ee",
  "epic-choices-bar": "ec41745ab85aad3f",
  "epic-clarify": "da90418fffa7ad5b",
  "epic-code": "6ff2ad43ddf8654d",
  "epic-comment-pane": "a7794daf9ad9664a",
  "epic-commit": "b3c5da3588d7cbdd",
  "epic-event": "e25a2eaf545ce66a",
  "epic-focus": "cc341f829c294dbc",
  "epic-item": "8c27d23527f69351",
  "epic-kickoff": "e7ad620a02da404d",
  "epic-link": "b9d715fb37dcc932",
  "epic-list": "bf620c28c7c0c528",
  "epic-mark": "6817fafac744d8ca",
  "epic-net-effect": "878d59471e513dfd",
  "epic-new-item": "1013ed04d11d1b3a",
  "epic-note": "7b65f2b9dc02e611",
  "epic-option-form": "0480fd2e9e89ec75",
  "epic-original": "0b55cb8891302c6f",
  "epic-overview": "85349723e45c6592",
  "epic-page": "f5096555228a3a00",
  "epic-page-note-head": "9039e7d9fa4d3ff2",
  "epic-phase": "7b0b43188fca1935",
  "epic-picture": "a421d2f29e4fbe75",
  "epic-pills": "2c0c7a43594c7369",
  "epic-prompt": "a17e69c00ce9b230",
  "epic-question": "c3decbf8ba739b1a",
  "epic-review": "f3cbf582bd695311",
  "epic-run": "be6b3244163b9d8a",
  "epic-run-row": "d87e80fc45db23cd",
  "epic-section": "2c0dfea2ebb981c6",
  "epic-send": "02a34a0528e6651b",
  "epic-send-buttons": "f7c1602a43bfb172",
  "epic-state-filter": "f75f75bda9c96bf9",
  "epic-status": "f05a1b92510230a6",
  "epic-summary": "2e9f71115a5b9e24",
  "epic-text-box": "240b594271e89117",
  "epic-thread": "3b4de720f93696c2",
  "epic-update": "491917f772544e0b"
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
