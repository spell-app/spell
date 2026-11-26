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
  "epic-actions": "21fe613ff1bf658f",
  "epic-agents": "7d622407d7daf41b",
  "epic-answer": "18bfe1ded7128920",
  "epic-aside": "c67ff643edc365d9",
  "epic-ask": "01682b777ebceace",
  "epic-away-line": "327418cc210c0fb6",
  "epic-bells": "892e549bd5d71f96",
  "epic-cards": "3abb6923caba7011",
  "epic-change": "bd213aa829bf1913",
  "epic-choice-rows": "8438b845e9c16c33",
  "epic-choices": "720ca7fb8efa5ac9",
  "epic-choices-bar": "bd0420db447af21a",
  "epic-clarify": "bca2338ef1907b09",
  "epic-code": "38d9c5e8b30753b9",
  "epic-comment-pane": "74d54259a0a295d5",
  "epic-commit": "3bdc902dc53b7eec",
  "epic-event": "3f4680a03bb1f49c",
  "epic-feature-set": "3fce0e66f53e3f0c",
  "epic-focus": "b0a38c7ae6937a53",
  "epic-item": "3d1f3bb213ec032b",
  "epic-kickoff": "324e81782d3d1db9",
  "epic-link": "12cf94a74599b5fc",
  "epic-list": "1d544779b95031f8",
  "epic-mark": "3525885948ccbe82",
  "epic-net-effect": "e088b24a865ee647",
  "epic-new-item": "4a34efb0ec914127",
  "epic-note": "08addd368f55474d",
  "epic-option-form": "b1140c303194c43e",
  "epic-original": "f24d28b2b59e333b",
  "epic-overview": "771cd3fdcea78d25",
  "epic-page": "1f9c33e7f0e5f8c9",
  "epic-page-note-head": "71736a483059344b",
  "epic-phase": "5ca7ee31e17bdcc8",
  "epic-picture": "3b4c223d0d6f94b0",
  "epic-pills": "81399816e494f350",
  "epic-prompt": "6a43f0e77dca3e80",
  "epic-question": "c43529081c8b388b",
  "epic-review": "fe6d1e942d3283e2",
  "epic-run": "7198b1b7b30852fa",
  "epic-run-row": "530681b6c5d8a753",
  "epic-section": "a6411073e8e7bf67",
  "epic-send": "e3c3331926619320",
  "epic-send-buttons": "060d0b3a5e7a4799",
  "epic-state-filter": "ac42815c8911164f",
  "epic-status": "7bcb7c34e6fa870f",
  "epic-step-output": "af8e42ec039343bd",
  "epic-summary": "19df7f330a20ad78",
  "epic-text-box": "73f5b97c6d84dc3e",
  "epic-thread": "cdbd5c878bf18140",
  "epic-update": "fc7c81b570e9a23f"
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
