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
  "epic-actions": "8acda0024a536679",
  "epic-agents": "d2cc903a60961dc7",
  "epic-answer": "5f49db089a5b034b",
  "epic-aside": "79047d1a71bff34b",
  "epic-ask": "7d182dab35d69971",
  "epic-away-line": "d852282cabb551c3",
  "epic-cards": "a4d10c6df56b4fa4",
  "epic-change": "d4610cb8c4f0279e",
  "epic-choice-rows": "7b718be977359672",
  "epic-choices": "9933ee22927544a8",
  "epic-choices-bar": "7d81cd601ad1fdb0",
  "epic-clarify": "234a18052491c1e8",
  "epic-code": "2e77b5cd7fd402d1",
  "epic-comment-pane": "0221852e9e67525c",
  "epic-commit": "b1a7aa82c32954d7",
  "epic-event": "1373377f1299f78a",
  "epic-feature-set": "7bd404c431a47188",
  "epic-focus": "922d95cc993b608a",
  "epic-item": "d808cb9e99642f98",
  "epic-kickoff": "7db2fd70adc6a1d5",
  "epic-link": "13b0e2c1cd87b128",
  "epic-list": "42c79c9027ece8c8",
  "epic-mark": "e36e1ba8fd2c0b98",
  "epic-net-effect": "14a0244d969c74b5",
  "epic-new-item": "aab71b0d2dd839e9",
  "epic-note": "54a6d130b4eab25e",
  "epic-option-form": "5a07bd1cf1b769fd",
  "epic-original": "a16178948fd46982",
  "epic-overview": "8917176232af2c11",
  "epic-page": "dd08886ca7ddb2c6",
  "epic-page-note-head": "f97c76d935a6ad46",
  "epic-phase": "61f40bd3243ae77e",
  "epic-picture": "d92fd0a479c3c6cf",
  "epic-pills": "90d998160165d6dd",
  "epic-prompt": "9073f88f58295c2e",
  "epic-question": "163aafe4f11415aa",
  "epic-review": "02239f3fa4a98672",
  "epic-run": "57d5ae06b97bbdc3",
  "epic-run-row": "ced9502152b17b6a",
  "epic-section": "c9e7c14360144404",
  "epic-send": "7c2a41e55c04b885",
  "epic-send-buttons": "39ce4a16323ac307",
  "epic-state-filter": "b359741e2561bc27",
  "epic-status": "e9865a73fbb2f472",
  "epic-summary": "8ee3a55337a839d1",
  "epic-text-box": "be69bb2002e81db7",
  "epic-thread": "09c23835618e2419",
  "epic-update": "e2eda49795bc7010"
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
