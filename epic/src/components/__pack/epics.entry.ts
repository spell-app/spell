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
  "epic-actions": "66bf028db99827a9",
  "epic-agents": "6a2385ecd420e990",
  "epic-answer": "73dc4d96bbb0de15",
  "epic-aside": "42e8ecfd5d21dffa",
  "epic-ask": "f7fe34e184f8ee83",
  "epic-away-line": "16c919f6071fb90e",
  "epic-cards": "25c709985beb5969",
  "epic-change": "4159ec1456224e62",
  "epic-choice-rows": "f2d2b733a323346e",
  "epic-choices": "ce3ba64c8252cc09",
  "epic-choices-bar": "978349813d441571",
  "epic-clarify": "7e306eed93bd1d12",
  "epic-code": "c178abee24fc1d57",
  "epic-comment-pane": "03e3bcdb3d05b907",
  "epic-commit": "955c2afd5c9a21c7",
  "epic-event": "b68f1e0050bdfdbc",
  "epic-feature-set": "a1377a4c7ccdb062",
  "epic-focus": "cd88a636b7814fa8",
  "epic-item": "5269c17432294979",
  "epic-kickoff": "686cc4c2b5d22c42",
  "epic-link": "83e5a929e85c567f",
  "epic-list": "0dc695c116da2082",
  "epic-mark": "336ec77c4fdeed38",
  "epic-net-effect": "26deca3be58f488b",
  "epic-new-item": "76db5d66ad35b394",
  "epic-note": "5ed8a3db858ec09e",
  "epic-option-form": "09a7f93ec01e9d7d",
  "epic-original": "4dda963652c0d83a",
  "epic-overview": "dace8b888130fa0f",
  "epic-page": "b37ea49e5dd83db1",
  "epic-page-note-head": "e7ec1817833c99a8",
  "epic-phase": "93e59837b49521db",
  "epic-picture": "34debfceeb39cec1",
  "epic-pills": "c8ec97000a35afa3",
  "epic-prompt": "b33a4759ada2e89d",
  "epic-question": "e1d501ad60e30c29",
  "epic-review": "89980248de657eb0",
  "epic-run": "1237207405cc4341",
  "epic-run-row": "f6d2299d8f2e36fd",
  "epic-section": "d4e4f88b10c3b41e",
  "epic-send": "4b18e1653d5f5ffb",
  "epic-send-buttons": "bd0928d00ae7743d",
  "epic-state-filter": "6b19341281f69a35",
  "epic-status": "fed85af99ece30da",
  "epic-summary": "f3b78e14608edf96",
  "epic-text-box": "cf61fdbd55a387f8",
  "epic-thread": "8b760cc547f1a50d",
  "epic-update": "79e19fe85a925917"
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
