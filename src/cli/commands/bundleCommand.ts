import { SRV } from "spell/server"
import { pageServerRoot } from "spell/server/page/settings"
import { CLI } from "spell/cli"

/**
 * `spell bundle [names...]` / `spell bundle check [names...]`:  the bundles the page server serves, BUILT on demand
 * instead of committed (the page server's settings, `"bundles"`:  `ui-site`, Spell UI's docs site, in spell-ui's
 * part;  `brand`, the brand pages, in spell-brand's).  The logic:  the server's `Bundle` (`SRV.Bundle`).
 * - And the COMMITTED generated files the page server's pages need (epic `epic-engine` P54):  `ui-root` (Spell UI's root
 *   catalog), `epics-pack`, `epic-docs` (spell-epic's docs bundle);  `SRV.BundleSpec.committed`
 *   - `--stale`, or no name:  built only in a WORKTREE;  the main checkout writes nothing, it says what to run
 *   - named:  built anywhere
 * - Whose:  the kit's page server's (`pageServerRoot()`), from anywhere in the kit.
 * - `--json`:  the report as JSON;  a build's own output goes to stderr
 * - Throws `CliError` for an unknown name.
 */

/**
 * `spell bundle [names...] [--stale]`:  build them (no name:  all);  `--stale`:  only those whose sources changed
 * since their last build.  What the page server runs when it starts.
 * - a committed one in the main checkout (`SRV.Bundle.buildsWhenStale`), unless named:  never built, only said
 *   (`ui-root is stale (its check failed):  run yarn gen:root in ui/`);  `skipped` in the report
 */
export async function buildBundles(names: string[], options: CLI.BundleOptions = {}): Promise<number> {
  const report: { built: SRV.BundleBuilt[]; current: string[]; failed: string[]; skipped: SRV.BundleCheck[] } = {
    built: [],
    current: [],
    failed: [],
    skipped: []
  }
  for (const bundle of bundlesFor(names)) {
    const isBuiltHere = names.length > 0 || bundle.buildsWhenStale
    const check = options.stale || !isBuiltHere ? bundle.check() : undefined
    if (check && !check.stale) {
      report.current.push(bundle.name)
      continue
    }
    if (check && !isBuiltHere) {
      report.skipped.push(check)
      continue
    }
    if (!options.json) CLI.err(`building ${bundle.name} (${bundle.spec.title}) ...`)
    try {
      report.built.push(bundle.build())
    } catch (error) {
      CLI.err((error as Error).message)
      report.failed.push(bundle.name)
    }
  }
  if (options.json) CLI.out(JSON.stringify(report, null, 2))
  else {
    for (const built of report.built)
      CLI.out(`built ${built.name} in ${built.seconds.toFixed(1)}s  (sources ${built.sources})`)
    for (const name of report.current) CLI.out(`${name}:  current`)
    for (const check of report.skipped) CLI.out(`${check.name} is stale (${check.stale}):  ${check.fix}`)
    for (const name of report.failed) CLI.out(`${name}:  FAILED`)
  }
  return report.failed.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** `spell bundle check [names...]`:  exits 1 when one is stale, and says why. */
export async function checkBundles(names: string[], options: CLI.BundleOptions = {}): Promise<number> {
  const checks = bundlesFor(names).map((bundle) => bundle.check())
  const stale = checks.filter((check) => check.stale)
  if (options.json) CLI.out(JSON.stringify(checks, null, 2))
  else {
    for (const check of checks) CLI.out(`${check.name}:  ${check.stale ? `STALE (${check.stale})` : "current"}`)
    if (stale.length) CLI.out(`fix:  spell bundle ${stale.map((check) => check.name).join(" ")}`)
  }
  return stale.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** The bundles `names` names (none:  every one);  an unknown name is a `CliError`. */
function bundlesFor(names: string[], root = pageServerRoot(process.cwd())): SRV.Bundle[] {
  try {
    return SRV.Bundle.all(root, names)
  } catch (error) {
    throw new CLI.CliError((error as Error).message.replace(/^Bundle\.\w+\(\):\s+/, ""))
  }
}
