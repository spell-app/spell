/**
 * Barrel for `spike/lit/src/elements` -- the Lit spike's element core:  `UIElement`, `ContentPart`, the
 * vocabulary => Lit property bridge, owner context (`PartOwners`, `OwnerController`) and the icon renderer.
 * - NOTE: no namespace (`E` is `$/elements`);  spike-only, deleted with the spike or moved into `$/elements`.
 * - NOTE: `FormElement` is deliberately LEFT OUT:  it belongs to the `forms` entry (`../forms.ts`), and this
 *   barrel is re-exported by `core`.
 */

export * from "./elements.types"

export * from "./VocabularyProperties"
export * from "./IconRenderer"
export * from "./PartOwners"
export * from "./OwnerController"
export * from "./UIElement"
export * from "./ContentPart"
