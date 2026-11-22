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
  "epic-actions": "0cb628f8f241cd42",
  "epic-agents": "81e0c4f5a99ee359",
  "epic-answer": "c6e4c5a7d710064e",
  "epic-aside": "b0afd9a5330836be",
  "epic-ask": "e3add8cd6988d947",
  "epic-away-line": "9aa6230a83ec1c2a",
  "epic-cards": "dd9340c11cfd800b",
  "epic-change": "d8a32bfdf56a78af",
  "epic-choice-rows": "9632248f09873c9c",
  "epic-choices": "a58dce82efce3a61",
  "epic-choices-bar": "a29626c9b5deafbd",
  "epic-clarify": "f46029cb503841b2",
  "epic-code": "e0332dcef481e4b8",
  "epic-comment-pane": "57f8f8ea438244ce",
  "epic-commit": "9d9509688fb829e2",
  "epic-event": "198a020015c2bc23",
  "epic-focus": "2c57d3ddfadc0aa7",
  "epic-item": "6cc3e52c1c69150f",
  "epic-kickoff": "4d3383593774f7e1",
  "epic-link": "3e2161da88f05d06",
  "epic-list": "0b53175b034ecdda",
  "epic-mark": "c6491c224a93773d",
  "epic-net-effect": "63fd9dfacf516db9",
  "epic-new-item": "bcf7472a6f0d7d4a",
  "epic-note": "18659a775558b0a8",
  "epic-option-form": "a32436a6f30573d9",
  "epic-original": "c8f9dc4cc5bc36ed",
  "epic-overview": "6d0cc530b339721f",
  "epic-page": "e4cd7fb184d21952",
  "epic-page-note-head": "358a28ea061d6c10",
  "epic-phase": "fd2fbbacb2f3634d",
  "epic-picture": "6f41c588eb697726",
  "epic-pills": "6b98a29804d22605",
  "epic-prompt": "dc97eeed2fc30cf1",
  "epic-question": "e30915f27aeecd5c",
  "epic-review": "564ed09dde4a0df1",
  "epic-run": "ccfd11bc96d4ef99",
  "epic-run-row": "bdb128664b69a072",
  "epic-section": "bb7d5bad995797fa",
  "epic-send": "3d5dc7d301f5f65d",
  "epic-send-buttons": "422652179b854022",
  "epic-state-filter": "1c665dd51d1e0405",
  "epic-status": "e29e69e70d985e49",
  "epic-summary": "553d7489126413d1",
  "epic-text-box": "cdeab165c503b375",
  "epic-thread": "92f4e5bf9c950b55",
  "epic-update": "251e4b2a2b175d2c"
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
