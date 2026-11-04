/** A `.spellml` file the editor imports:  its project's compiled javascript, as text (`compiledSpell()`, `vite.shared.ts`). */
declare module "*.spellml" {
  const compiled: string
  export default compiled
}
