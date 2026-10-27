import type { E } from "spell-ui/core"
import { SSR } from "spell-ui/static"

/****************
 * ### `StaticCatalog`
 * Every family the static render supports, defined:  `await StaticCatalog.define()`, once per process.
 * - WHICH:  `StaticFamilies.CLASSES`, the one table, which the visual tests read without Vite too.
 * - Each class imported from its own file, by its name (one class per file):  never a family's `index.ts`, which
 *   calls `customElements.define()`.
 * - Its callers:  `spell ssr` (`StaticDocument`), the visual tests' `--static` pages (`StaticFixture`), the `ssr` tests.
 *   Each runs under Vite, which finds the files (`import.meta.glob()`);  the publish build expands the glob too.
 * - Node only, like all of `spell-ui/static`;  NEVER imported by a component or `spell-ui`.
 *   Loading it loads no family:  `define()` does.
 * - Its own file, not a static on `StaticRender`, on purpose:  the engine stays free of family imports (it renders
 *   what it's given), and the list changes for a different reason (a family becoming server-ready) than the engine.
 ****************/
export class StaticCatalog {
  /**
   * Import every class `StaticFamilies.CLASSES` lists and `StaticRender.define()` them all;  resolves to the classes.
   * - Once per process:  every caller gets the same promise.
   * - Rejects when a listed class isn't in its file:  fix `StaticFamilies.CLASSES`.
   */
  static define(): Promise<readonly E.UIComponentClass[]> {
    return (StaticCatalog.defined ??= StaticCatalog.load())
  }

  /** `define()`'s promise, once started:  static, as defining is once per process. */
  private static defined?: Promise<readonly E.UIComponentClass[]>

  /** Import the classes and define them. */
  private static async load(): Promise<readonly E.UIComponentClass[]> {
    const classes: E.UIComponentClass[] = []
    for (const [family, names] of Object.entries(SSR.StaticFamilies.CLASSES)) {
      for (const name of names) {
        const path = `../components/${family}/${name}`
        const load = CLASS_FILES[`${path}.tsx`] ?? CLASS_FILES[`${path}.ts`]
        const Class = (await load?.())?.[name]
        if (typeof Class !== "function") {
          throw new Error(
            `StaticCatalog.define():  no class ${name} in src/components/${family};  fix StaticFamilies.CLASSES`
          )
        }
        classes.push(Class as E.UIComponentClass)
      }
    }
    SSR.StaticRender.define(...classes)
    return classes
  }
}

/** Component class files (`UIButton.tsx`), by path from here;  lazy, only `StaticFamilies`' are loaded. */
const CLASS_FILES = import.meta.glob<Record<string, unknown>>([
  "../components/*/UI*.{ts,tsx}",
  // a family's other files are named for its component too (`UIButton.types.ts`, `UIButton.en.ts`)
  "!../components/*/UI*.*.{ts,tsx}"
])
