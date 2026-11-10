/** A `.spell` file the editor imports:  its project's compiled javascript, as text (`compiledSpell()`, `vite.shared.ts`). */
declare module "*.spell" {
  const compiled: string
  export default compiled
}
