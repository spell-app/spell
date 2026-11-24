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
  "epic-actions": "29164c59685da50c",
  "epic-agents": "189351310dc720b8",
  "epic-answer": "119d9b4b2475464d",
  "epic-aside": "af6c947a7eb1594e",
  "epic-ask": "ca6c03cd93780bb7",
  "epic-away-line": "c1ca5ddcab8aa46d",
  "epic-cards": "6134fce28ccc6fc8",
  "epic-change": "ecc53f255cddec72",
  "epic-choice-rows": "8a1b2b0c50b4fb46",
  "epic-choices": "bf473072f4c67feb",
  "epic-choices-bar": "60806477a16d3cf8",
  "epic-clarify": "3a9ed4febe483d2a",
  "epic-code": "087bf4b2b64bec6c",
  "epic-comment-pane": "33149b97cccc2a68",
  "epic-commit": "c107b87f1cb13961",
  "epic-event": "a4d541e2c556e72b",
  "epic-feature-set": "3095e7aa8e4cc021",
  "epic-focus": "9c212b547d924e10",
  "epic-item": "df06e6e64e38642e",
  "epic-kickoff": "4f96a3d8d8f3c036",
  "epic-link": "8df8af8359c9cc46",
  "epic-list": "fd255b4ad78937bb",
  "epic-mark": "47a1f32e6713fbbb",
  "epic-net-effect": "c831841326640709",
  "epic-new-item": "70477d699a7f1f44",
  "epic-note": "bea9308d431d40e4",
  "epic-option-form": "aa1094b1f74deade",
  "epic-original": "04bbbedd99b64485",
  "epic-overview": "c20c37e002701cf5",
  "epic-page": "a6d42c16773a5ea5",
  "epic-page-note-head": "2a54b031868a1767",
  "epic-phase": "8cc44dcf16ba28e3",
  "epic-picture": "c97f065588172436",
  "epic-pills": "beb5e32486f4d08a",
  "epic-prompt": "f6bcb3ba584cfc13",
  "epic-question": "6b8beb5a2c3a8f74",
  "epic-review": "a40cc42ed313b33b",
  "epic-run": "63a150b436e56af9",
  "epic-run-row": "733881477228936b",
  "epic-section": "a79943e8a8d760a0",
  "epic-send": "be9d60e9d2d93df5",
  "epic-send-buttons": "00a597660d0f665b",
  "epic-state-filter": "b7655403f02d5542",
  "epic-status": "2c9d4fa3f56ded75",
  "epic-summary": "6b1321a9b3890a56",
  "epic-text-box": "501de93588dd2437",
  "epic-thread": "b82648b07d6c1657",
  "epic-update": "11d2951e890e71ee"
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
