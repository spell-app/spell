/**
 * Entry for the whole spike (`index` lib entry):  every component, registered (side effect), plus both shared
 * entries.
 * - NOTE: the core's classes are exported by name (`UIElement`, `ElementDefinition` ...), no namespace:  the spike
 *   is deleted once Milestone 0 decides.
 * - NOTE: `StubOwner` / `SpikeFixture` are left out:  test and demo scaffolding.
 * - SIDE EFFECT:  `./identity` sets the Solid 2 host page's identity hook.
 */

import "./identity"

export * from "./core"
export * from "./forms"

export * from "$spike/components/button"
export * from "$spike/components/dropdown"
export * from "$spike/components/icon"
export * from "$spike/components/label"
export * from "$spike/components/parts"
export * from "$spike/components/divider"
export * from "$spike/components/segment"
export * from "$spike/components/container"
