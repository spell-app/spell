import { join } from "node:path"

// Import directly, not through `spell/app/cli`:  the barrel loads spell, and the tests it starts load their own
import { CLI } from "spell/cli"
import type { ContentCheckOptions } from "spell/app/cli/cli.types"

/**
 * The app folder's yarn scripts that run every content check, in one Vitest run:
 * - `spell:test:fixtures`:  the check
 * - `spell:test:fixtures:bless`:  the same, with Vitest's update flag, so every snapshot among them is rewritten
 * - The list of tests is the scripts' (the app folder's `package.json`), never a second copy here.
 */
const CHECK_SCRIPT = "spell:test:fixtures"
const BLESS_SCRIPT = "spell:test:fixtures:bless"

/**
 * `spell content check [--bless]`:  every check of the `@spell` space's content (its examples, notebooks and
 * Spell guides), in the app folder of the nearest kit checkout (a worktree's own, from inside it).
 * - What it runs, in one Vitest run:
 *   - each test project compiled against its snapshots:  javascript, TypeScript, Python, declarations, words
 *   - `tsc` and pyright on that output
 *   - each one in another language than English (Solitario ...) runs its own spell tests
 *   - the command-line contract:  each one run on every target, what it prints against its snapshot
 *   - every example converted to spellx and back, and the hand-kept twins of the examples in their other form
 *   - every notebook compiled
 *   - README-examples' table and pictures
 * - `--bless`:  rewrite every snapshot among them, then read the diff (`git diff`):  the diff is the review.
 * - Returns Vitest's exit code:  `CLI.EXIT.OK` when every check passed.
 */
export async function contentCheckCommand({ bless = false }: ContentCheckOptions = {}): Promise<number> {
  const app = join(CLI.findCheckout(CLI.KIT_MARKER), "app")
  return CLI.runChild("yarn", [bless ? BLESS_SCRIPT : CHECK_SCRIPT], { cwd: app })
}
