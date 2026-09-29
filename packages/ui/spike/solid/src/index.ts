/**
 * Entry for the whole spike:  every component, registered (side effect), plus the element core.
 * - NOTE: the core's classes are exported by name (`UIElement`, `ElementDefinition` ...), no namespace:
 *   the spike is deleted once Milestone 0 decides.
 */

export * from "./spike.types"

export * from "./Cell"
export * from "./ElementDefinition"
export * from "./UIHost"
export * from "./FormHost"
export * from "./UIElement"
export * from "./FormElement"
export * from "./Controlled"
export * from "./SlotContent"

export * from "$spike/components/button"
export * from "$spike/components/dropdown"
