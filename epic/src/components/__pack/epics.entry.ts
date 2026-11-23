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
  "epic-actions": "1b27670b7637ed42",
  "epic-agents": "38f6abe34fb7471a",
  "epic-answer": "8cc8962b0a7fd29e",
  "epic-aside": "f575ff6f226318ae",
  "epic-ask": "14f268e1a3bdec98",
  "epic-away-line": "e2490df74b88ba62",
  "epic-cards": "ad660c82fb994b89",
  "epic-change": "a69e2e7e5c4f1486",
  "epic-choice-rows": "3a762dda43e8999c",
  "epic-choices": "71413f5cb2322db4",
  "epic-choices-bar": "67e7b07342a9f6ac",
  "epic-clarify": "29258439ffd075e0",
  "epic-code": "37bdf297a315e530",
  "epic-comment-pane": "43065f6001ccc048",
  "epic-commit": "326561d355ee9685",
  "epic-event": "ccd430eb372efb75",
  "epic-feature-set": "46c0c840971b9492",
  "epic-focus": "6e1944292d82568f",
  "epic-item": "02977aebc42ebad8",
  "epic-kickoff": "03115e174946b471",
  "epic-link": "bd673b350e5bd08a",
  "epic-list": "45c1a506f1b700c2",
  "epic-mark": "474c0b0c0ae303a8",
  "epic-net-effect": "004c9c1a7aa87299",
  "epic-new-item": "92cf9e7da2530350",
  "epic-note": "6f0aaefc19159dda",
  "epic-option-form": "a06ce6f5b93e0288",
  "epic-original": "ff4349d3379186bc",
  "epic-overview": "88f2800dd59892fb",
  "epic-page": "646be684278b2f31",
  "epic-page-note-head": "7714b5bfc13d2957",
  "epic-phase": "04e658269ad5e800",
  "epic-picture": "3362496e016a8e4f",
  "epic-pills": "ceca75c8f6059871",
  "epic-prompt": "6c40df025209e651",
  "epic-question": "6e780b884846a167",
  "epic-review": "4ee609f159d258f9",
  "epic-run": "61025086fb0f6b2f",
  "epic-run-row": "9da48e511a88f53e",
  "epic-section": "2bb673e85ec26b9c",
  "epic-send": "7f94da3a9ebfc365",
  "epic-send-buttons": "064f1aef5b24e055",
  "epic-state-filter": "8b7f7ec3f23307a3",
  "epic-status": "bb13dd46a695abbf",
  "epic-summary": "a21cda75f1a642d7",
  "epic-text-box": "032825b7bd359d95",
  "epic-thread": "28a6c1968684b3dd",
  "epic-update": "86ddc4df190f0d37"
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
