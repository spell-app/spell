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
  "epic-actions": "be625a1e611562f8",
  "epic-agents": "4057fe64fecae63c",
  "epic-answer": "e99c532f04a9df57",
  "epic-aside": "87bf06672f8c4b64",
  "epic-ask": "c0f388fd197ac99b",
  "epic-away-line": "f7a3f0f0daacc932",
  "epic-cards": "b470ad849fc4d0b2",
  "epic-change": "35336b6e0f1c49ad",
  "epic-choice-rows": "de5f979264a440e5",
  "epic-choices": "b0d9def6b93b38ee",
  "epic-choices-bar": "712c3d5189d705af",
  "epic-clarify": "8eb8dbff181e72d7",
  "epic-code": "3b795230b26f8b0a",
  "epic-comment-pane": "416c3066041de4b5",
  "epic-commit": "2969e7f3fb2d38f1",
  "epic-event": "626e0239e0bc3a7b",
  "epic-feature-set": "d987df34f87ddeb5",
  "epic-focus": "b77293cb55cfe046",
  "epic-item": "0421cdc228722c31",
  "epic-kickoff": "4681a2c70842e8df",
  "epic-link": "0606a6b47b7d7e80",
  "epic-list": "1e400c0ccf67ec1b",
  "epic-mark": "56e5cf2b4aef08db",
  "epic-net-effect": "bdde7b6c1528fd72",
  "epic-new-item": "aaba8ccc077e6659",
  "epic-note": "d634a8057f3196c1",
  "epic-option-form": "1823eee44d130417",
  "epic-original": "133bbf533c2e2f7f",
  "epic-overview": "a4c3aae4f0ff66c4",
  "epic-page": "4122dcf4fcf7aafb",
  "epic-page-note-head": "ca45bdaa3ffc7edb",
  "epic-phase": "bd998b8c7df717ee",
  "epic-picture": "ee313e06dc9b4607",
  "epic-pills": "185b61d63fdff61e",
  "epic-prompt": "921c17d2c1492261",
  "epic-question": "a8f3d063024e5746",
  "epic-review": "bc72cbff22f06387",
  "epic-run": "63b377c47071e781",
  "epic-run-row": "df52e17d308a3fdd",
  "epic-section": "433a165d430b7b68",
  "epic-send": "d84a5e67d889aba5",
  "epic-send-buttons": "4a94e8b500ca71f0",
  "epic-state-filter": "86648e68030e0556",
  "epic-status": "9f52a457adf8fa19",
  "epic-step-output": "6ba80101b9b9a8d3",
  "epic-summary": "3e155111f999d094",
  "epic-text-box": "1c057ed3eefa1630",
  "epic-thread": "a4267324c00d1789",
  "epic-update": "3c876f5fdbeceb0c"
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
