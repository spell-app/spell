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
  "epic-agents": "8bbb092dd22d1277",
  "epic-answer": "d329370c5997d6a0",
  "epic-aside": "684e830b73369ec4",
  "epic-ask": "d5de6d420cea95c5",
  "epic-away-line": "57b6dfe005fb093c",
  "epic-cards": "4704a7983a01ddfc",
  "epic-change": "f95f0c881ca1bcc5",
  "epic-choice-rows": "4221a992b408000d",
  "epic-choices": "c6db35d59e0e1ea3",
  "epic-choices-bar": "b195bd0a4ddbcc39",
  "epic-clarify": "3514ed0563f246df",
  "epic-code": "a211674ea62615f5",
  "epic-comment-pane": "23cc5ce4cf8db53d",
  "epic-commit": "8aabe3e36c4aac38",
  "epic-event": "e6f4ea421f56b5fa",
  "epic-feature-set": "a20b6e2eccb88256",
  "epic-focus": "0a620aec25c89d1d",
  "epic-item": "019aac8606dc3b4d",
  "epic-kickoff": "c322cb102e04c0b0",
  "epic-link": "f70228304e267a10",
  "epic-list": "b9e60e48e6b353a3",
  "epic-mark": "2aa4930b3a19b98d",
  "epic-net-effect": "45df4820c614961b",
  "epic-new-item": "c199f320642bfac9",
  "epic-note": "a4902938eab5ba88",
  "epic-option-form": "e923fee927422c71",
  "epic-original": "bb7622942c84943a",
  "epic-overview": "377d25fd59b1ccd2",
  "epic-page": "c3189011c88a481d",
  "epic-page-note-head": "661b1aab50f90aa6",
  "epic-phase": "19baf1a46e15861c",
  "epic-picture": "6183f7d4f146efaa",
  "epic-pills": "4899a2b119d838ad",
  "epic-prompt": "8fc8038091b5b832",
  "epic-question": "ec2ae5e448acef34",
  "epic-review": "bca60fba609f24fd",
  "epic-run": "a958535293b9f2bb",
  "epic-run-row": "9165939885690063",
  "epic-section": "ed4974cf0cc7fbd3",
  "epic-send": "ad326dcac94267e3",
  "epic-send-buttons": "b253f3e5be2629c3",
  "epic-state-filter": "fefb4acc676adaa4",
  "epic-status": "090f4f117e67dec7",
  "epic-summary": "77606f9369a2bba4",
  "epic-text-box": "da8bee76e07fac58",
  "epic-thread": "c46ea9752e22d5ce",
  "epic-update": "b0fa7286e2da081a"
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
