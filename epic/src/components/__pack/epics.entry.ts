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
  "epic-actions": "0b3eb53a39c7c349",
  "epic-agents": "1487c293b93eaa07",
  "epic-answer": "b672fa30212f460b",
  "epic-aside": "30bf20401a2f12f7",
  "epic-ask": "4a0d99b3b4b13442",
  "epic-away-line": "ebbc02de53356ca3",
  "epic-cards": "41826f832b2e3760",
  "epic-change": "3c6cf65f46d6f8f5",
  "epic-choice-rows": "c86de910f9a60b80",
  "epic-choices": "c57a17bf34b8dd82",
  "epic-choices-bar": "935d3b2c6d86e3b2",
  "epic-clarify": "113e049e14e03ba8",
  "epic-code": "7ebf22883dd6311d",
  "epic-comment-pane": "778b8ba2813c7432",
  "epic-commit": "ce840fad6c72a0fb",
  "epic-event": "a0e8a3803a6e4bcc",
  "epic-feature-set": "7cf9df4539e9df25",
  "epic-focus": "96050dcea8b96014",
  "epic-item": "d0bd3e9549cbd07e",
  "epic-kickoff": "f4c07b9ef9d546bf",
  "epic-link": "4cf14fd119a690b8",
  "epic-list": "bc8e6d7b81d06c78",
  "epic-mark": "d7c7535ad26d4559",
  "epic-net-effect": "3d9a15719aeac0b4",
  "epic-new-item": "a2a283a3381c0ffb",
  "epic-note": "3e266e4a1eeb7db8",
  "epic-option-form": "15d1f5b32c436bad",
  "epic-original": "d8ab45fabcbc5735",
  "epic-overview": "9496493ee2453ef2",
  "epic-page": "c866cb10d1972ebe",
  "epic-page-note-head": "f9c71e383b057e32",
  "epic-phase": "3384a8cefef30721",
  "epic-picture": "af5b3b6f2b21c517",
  "epic-pills": "dd9154777e52e847",
  "epic-prompt": "6738f1a660b024d9",
  "epic-question": "f19a4c023bee96b0",
  "epic-review": "7ed80ade4dca07ef",
  "epic-run": "a95ea35eb1252900",
  "epic-run-row": "a900b686453793dc",
  "epic-section": "42427fd6032f9ade",
  "epic-send": "104b2dd9ba1a85ba",
  "epic-send-buttons": "decdc5a70a677a9a",
  "epic-state-filter": "ec46a1d0067d489f",
  "epic-status": "9cf7d8e152b143bb",
  "epic-summary": "da3d4b7126e1c0bb",
  "epic-text-box": "61caf4fe5780180a",
  "epic-thread": "ddf687d92c346066",
  "epic-update": "2ec6d2bfb1629656"
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
