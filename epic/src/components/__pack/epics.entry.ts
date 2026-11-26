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
  "epic-actions": "2674ed21eb37d275",
  "epic-agents": "5df58d96830ca093",
  "epic-answer": "c4139cd4ccc05c5a",
  "epic-aside": "775bd09491404003",
  "epic-ask": "4c095345361bf16b",
  "epic-away-line": "4b5373d63aa4d9a5",
  "epic-cards": "bd9bea1d226f1b3b",
  "epic-change": "5ce5ea35b33b4cb3",
  "epic-choice-rows": "cdd099b6e41efeeb",
  "epic-choices": "2475b919f2cbcb89",
  "epic-choices-bar": "dc3ed945de3a9e00",
  "epic-clarify": "863a2ff2f4522029",
  "epic-code": "3a029c8769911410",
  "epic-comment-pane": "2d4e42663d7ae740",
  "epic-commit": "37af69a8d78c94f9",
  "epic-event": "e214c7fa80f419fa",
  "epic-feature-set": "4fb687bccf530e95",
  "epic-focus": "c071687d754a5f3c",
  "epic-item": "508840203509c974",
  "epic-kickoff": "868df78973f36d3a",
  "epic-link": "8da8e50f35c9ba93",
  "epic-list": "31c345280397d6a8",
  "epic-mark": "78cb6167a84cbfae",
  "epic-net-effect": "2f91324c6624e166",
  "epic-new-item": "d7ac4c273a1abba4",
  "epic-note": "ca2f56321805345c",
  "epic-option-form": "62f6c896bcf0b8c5",
  "epic-original": "6e6df801ab6130c5",
  "epic-overview": "4b0e57b3244c34c7",
  "epic-page": "cbc081542c8f1519",
  "epic-page-note-head": "78a17507d6b2fd7d",
  "epic-phase": "e0738e396422f10c",
  "epic-picture": "03843e5003a07244",
  "epic-pills": "3b9ff5f12d55354a",
  "epic-prompt": "4203dde59067f020",
  "epic-question": "ff5cd2e8c47196f4",
  "epic-review": "91dd763cfe1a99b3",
  "epic-run": "c6e1a165757a740d",
  "epic-run-row": "4b0644071289fbdb",
  "epic-section": "e9cf634be1cc00f7",
  "epic-send": "557b2edcd2715ae2",
  "epic-send-buttons": "408d2f564d1ce10f",
  "epic-state-filter": "d11fc12ff6424a32",
  "epic-status": "1791410746ce7323",
  "epic-step-output": "01143d04c757ae61",
  "epic-summary": "271890b6dc28d225",
  "epic-text-box": "1f8a901158f0d961",
  "epic-thread": "4c93e4bd08f77325",
  "epic-update": "8f4b70547d242620"
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
