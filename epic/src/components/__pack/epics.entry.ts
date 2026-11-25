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
  "epic-actions": "7f8a74b6cf3bfba2",
  "epic-agents": "05940e09f04d8ade",
  "epic-answer": "40dba3846607c646",
  "epic-aside": "757ca21f1ed8f838",
  "epic-ask": "f50a7f8bd9f2863a",
  "epic-away-line": "8c809cf28fcb5c8b",
  "epic-cards": "144f68cc0e9a0162",
  "epic-change": "9b5dd8c30269bf83",
  "epic-choice-rows": "c8098ee9a3acd86c",
  "epic-choices": "1f7da6aaab144574",
  "epic-choices-bar": "eaee1a7523f63e98",
  "epic-clarify": "0a16ed5f93fae840",
  "epic-code": "9579f115a3da46dc",
  "epic-comment-pane": "48c14f69415b1827",
  "epic-commit": "c120808971893924",
  "epic-event": "6274f4e34f519f12",
  "epic-feature-set": "e61e1974f5f37549",
  "epic-focus": "bd317e9daa793e0e",
  "epic-item": "8b21577c4bcc8175",
  "epic-kickoff": "af5de9d937dd3911",
  "epic-link": "c4d3b74eba44575b",
  "epic-list": "95b2e4c16a3cb6a1",
  "epic-mark": "aed26a72e1ff1e6b",
  "epic-net-effect": "21fb451428bfae12",
  "epic-new-item": "4b1341f43bcc7618",
  "epic-note": "0326b357c9713b6b",
  "epic-option-form": "c5e50990e4ac9a4d",
  "epic-original": "a20427e99e5c978f",
  "epic-overview": "f493de3065f2c5d8",
  "epic-page": "9f8861af32276914",
  "epic-page-note-head": "e0e8174a61d0ad3a",
  "epic-phase": "519d79cb519d4a54",
  "epic-picture": "8c3dd3bdea49e74c",
  "epic-pills": "2d74cd10f382691b",
  "epic-prompt": "c1ad897bfaa85d1a",
  "epic-question": "2c27dd20a35ce8f3",
  "epic-review": "b65261ffe5ccb1a7",
  "epic-run": "d83b59e253263a52",
  "epic-run-row": "77166bf8613e6c2e",
  "epic-section": "09bdd78f72ff1b66",
  "epic-send": "2772ab6dfc923425",
  "epic-send-buttons": "ebd3433b0c5624e0",
  "epic-state-filter": "2ebd9d817cd2d408",
  "epic-status": "cccb38bec658f104",
  "epic-step-output": "7ba39b6c23ceb9af",
  "epic-summary": "9b94d4ca35082cf8",
  "epic-text-box": "62f338241c8e29f6",
  "epic-thread": "ea9289b772053f91",
  "epic-update": "194b575682e10930"
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
