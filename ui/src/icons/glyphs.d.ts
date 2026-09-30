/**
 * Types for statically imported glyph modules, e.g. `import user from "$/icons/glyphs/solid/user.js"`.
 * - Ambient (no imports / exports) so it applies without being imported.
 * - Consumers of the built package need the same declaration for `@spell/ui/icons/glyphs/*` -- see `docs/icons.md`.
 */
declare module "$/icons/glyphs/*.js" {
  const data: readonly [width: number, height: number, path: string]
  export default data
}
