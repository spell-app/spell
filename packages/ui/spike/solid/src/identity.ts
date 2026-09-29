/**
 * The identity hook the shared Solid 2 host page reads (`spike/shared/README.md`):  sets
 * `globalThis.__uiSolidIdentity` so the app can PROVE it shares one `solid-js` / `@solidjs/web` with the components
 * and that its context reaches them.
 * - `context`:  `UIElement.AppContext`, which every controller reads as `app`;  `read(el)` returns what it saw.
 * - Loaded by the `index` entry (`@spell/ui`, what the host page imports), NOT by `core`:  the `import * as`
 *   namespaces keep every export of both packages alive, so a bundler that includes this file can't tree-shake
 *   Solid -- harmless when Solid is a shared peer, but it would inflate the standalone (library bundled) numbers.
 * - SIDE EFFECT:  that global.  Spike-only;  not part of the element core.
 */

import * as SolidJs from "solid-js"
import * as Web from "@solidjs/web"

import type { SolidIdentityHook } from "$shared/shared.types.ts"

import { UIElement, type UIHost } from "./core"

;(globalThis as { __uiSolidIdentity?: SolidIdentityHook }).__uiSolidIdentity = {
  solidJs: SolidJs,
  web: Web,
  context: UIElement.AppContext,
  read: (element) => (element as UIHost).controller?.app
}
