/**
 * Barrel for `spike/lit/src/elements` -- the Lit spike's element core:  `UIElement`, `FormElement`, `ContentPart`,
 * the vocabulary => Lit property bridge, owner context (`PartOwners`, `OwnerController`) and the icon renderer.
 * - NOTE: no namespace (`E` is `$/elements`);  spike-only, deleted with the spike or moved into `$/elements`.
 */

export * from "./elements.types"

export * from "./VocabularyProperties"
export * from "./IconRenderer"
export * from "./PartOwners"
export * from "./OwnerController"
export * from "./UIElement"
export * from "./FormElement"
export * from "./ContentPart"
