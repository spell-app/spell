/**
 * Side-effect entry for the Lit spike:  registers every element and re-exports the classes.
 * - Owners of content parts (`<ui-icons>`, `<ui-label>`, `<ui-header>`) register as their families load;
 *   `PartOwners` re-resolves connected parts when a late owner arrives, so order is only a first-paint nicety.
 */

export * from "./components/button"
export * from "./components/dropdown"
export * from "./components/icon"
export * from "./components/label"
export * from "./components/parts"
export * from "./components/divider"
export * from "./components/segment"
export * from "./components/container"
