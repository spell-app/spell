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
  "epic-actions": "50b69c053c1737c4",
  "epic-agents": "9eb85b03e59c8286",
  "epic-answer": "b51e4829c4ab0ab5",
  "epic-aside": "f6b3939efa32aca5",
  "epic-ask": "d63c782ec5843297",
  "epic-away-line": "fc852e2b2dcc4be2",
  "epic-cards": "ad59fde17cb91ad6",
  "epic-change": "9569e774a47599fd",
  "epic-choice-rows": "edbdcb03f203d04c",
  "epic-choices": "178b7f2bc965c7ae",
  "epic-choices-bar": "be168593ffc88d9a",
  "epic-clarify": "7a3ab6635609cc2b",
  "epic-code": "c0db9e7c91133c1b",
  "epic-comment-pane": "a755b40863851fe5",
  "epic-commit": "14498b997d4203c0",
  "epic-event": "65c3707785a34816",
  "epic-focus": "0e438264602bc082",
  "epic-item": "0fc76b98a07b825b",
  "epic-kickoff": "31c0bf7a405d5650",
  "epic-link": "eeb48d85860bee3a",
  "epic-list": "445148a1ec4022dc",
  "epic-mark": "1f035dbb8026321d",
  "epic-net-effect": "0da6691017940473",
  "epic-new-item": "79a93d75107c878a",
  "epic-note": "b5ae26930597bc65",
  "epic-option-form": "719193546452d389",
  "epic-original": "51b421758f526012",
  "epic-overview": "c189d093342ddf11",
  "epic-page": "59481abd98e18e95",
  "epic-page-note-head": "68bbfe41e5377a8a",
  "epic-phase": "6c9d3408d35b10fc",
  "epic-picture": "ca5a6e4b54d647f8",
  "epic-pills": "7e482e651c79c007",
  "epic-prompt": "80b84c3f62b3ea99",
  "epic-question": "c960376e98edbe42",
  "epic-review": "d1f126a1c53ea953",
  "epic-run": "926430570513ba31",
  "epic-run-row": "08f49e8b262666bd",
  "epic-section": "1c8a4ce7c2f9fd2c",
  "epic-send": "799c51e2ba1b0545",
  "epic-send-buttons": "bdf4d270c9375312",
  "epic-state-filter": "bab9914129820bab",
  "epic-status": "bb44d6bdb971b182",
  "epic-summary": "b72f19e3729aa0ba",
  "epic-text-box": "41392c5c6fc1e10b",
  "epic-thread": "cc4d489176f5b9bb",
  "epic-update": "a9fdc88a1703060a"
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
