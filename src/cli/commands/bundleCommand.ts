import { SRV } from "spell-kit/server"
import { pageServerRoot } from "spell-kit/server/page/settings"
import { CLI } from "spell-kit/cli"

/**
 * `spell bundle [names...]` / `spell bundle check [names...]`:  the bundles the page server serves, BUILT on demand
 * instead of committed (the page server's settings, `"bundles"`:  `ui-site`, Spell UI's docs site, in spell-ui's
 * part;  `brand`, the brand pages, in spell-brand's).  The logic:  the server's `Bundle` (`SRV.Bundle`).
 * - Whose:  the kit's page server's (`pageServerRoot()`), from anywhere in the kit.
 * - `--json`:  the report as JSON;  a build's own output goes to stderr
 * - Throws `CliError` for an unknown name.
 */

/**
 * `spell bundle [names...] [--stale]`:  build them (no name:  all);  `--stale`:  only those whose sources changed
 * since their last build.  What the page server runs when it starts.
 */
export async function buildBundles(names: string[], options: CLI.BundleOptions = {}): Promise<number> {
  const report: { built: SRV.BundleBuilt[]; current: string[]; failed: string[] } = {
    built: [],
    current: [],
    failed: []
  }
  for (const bundle of bundlesFor(names)) {
    if (options.stale && !bundle.isStale) {
      report.current.push(bundle.name)
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
