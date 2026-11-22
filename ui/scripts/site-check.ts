/**
 * `yarn site:check <page...> | --all [--out <dir>]`:  check the Spell UI site's pages in headless chromium,
 * as this checkout's editor runs them.
 * - The command only:  `SiteCheck` (`src/tools/SiteCheck.ts`) does the work, flags and exit code included, so the class
 *   file runs nothing when it's imported.
 */
import { SiteCheck } from "spell/ui/tools/SiteCheck"

await SiteCheck.main(process.argv.slice(2))
