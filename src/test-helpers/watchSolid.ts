import { SolidDiagnostics } from "spell/test-helpers/SolidDiagnostics"

/**
 * A Vitest `setupFiles` entry:  every test of the project fails if Solid warns in it
 *   (`SolidDiagnostics.watchEveryTest()`, epic `solid-2-final` P22).
 * - A project opts in by listing it, `spell/test-helpers/watchSolid.ts`:  the kit's `element`, Spell UI's, the app's
 *   browser tests.
 * - SIDE EFFECT:  registers a `beforeEach` and an `afterEach` in every test file.
 */
SolidDiagnostics.watchEveryTest()
