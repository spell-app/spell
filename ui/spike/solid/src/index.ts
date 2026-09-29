/**
 * Entry for the whole spike:  every component, registered (side effect), plus the element core.
 * - NOTE: the core's classes are exported by name (`UIElement`, `ElementDefinition` ...), no namespace:
 *   the spike is deleted once Milestone 0 decides.
 * - NOTE: `StubOwner` / `SpikeFixture` are left out:  test and demo scaffolding.
 */

export * from "./spike.types"

export * from "./Cell"
export * from "./ElementDefinition"
export * from "./UIHost"
export * from "./FormHost"
export * from "./PartContext"
export * from "./UIElement"
export * from "./FormElement"
export * from "./ContentPart"
export * from "./Controlled"
export * from "./SlotContent"
export * from "./HostAttribute"
export * from "./IconGlyph"

export * from "$spike/components/button"
export * from "$spike/components/dropdown"
export * from "$spike/components/icon"
export * from "$spike/components/label"
export * from "$spike/components/parts"
export * from "$spike/components/divider"
export * from "$spike/components/segment"
export * from "$spike/components/container"
