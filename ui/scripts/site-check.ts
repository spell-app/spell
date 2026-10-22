/**
 * `yarn site:check <page...> | --all [--out <dir>]`:  check the pages of Spell UI's docs site in headless chromium,
 * from this checkout's page server.
 * - The command only:  `SiteCheck` (`src/tools/SiteCheck.ts`) does the work, flags and exit code included, so the class
 *   file runs nothing when it's imported.
 */
import { SiteCheck } from "spell-ui/tools/SiteCheck"

await SiteCheck.main(process.argv.slice(2))
