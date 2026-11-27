/**
 * A test component pack's SOURCE entry (`tests/components/ui-components/ComponentPacks.test.ts`):  an ES module, as
 * the kit's `ComponentPack` writes `<pack>.pack.ts` for a dev server, registering the pack as it runs.
 * - `<mod-card>`:  a plain element.
 */
const { registerPack } = (globalThis as unknown as { SpellUI: { registerPack(pack: object): void } }).SpellUI

class ModCard extends HTMLElement {}

registerPack({
  name: "mod",
  prefix: "mod-",
  catalog: { "mod-card": { folder: "mod-card" } },
  define: () => Promise.resolve().then(() => customElements.define("mod-card", ModCard))
})
