/**
 * `yarn tokens:alias <family> [--write]`:  the codemod of `notes/theming.md` "Converting a family".
 * - Rewrites every sheet of `components/ui-<family>/` so it never DECLARES a public `--ui-<family>-*` token:
 *   the first declaration becomes the private alias `--_ui-x: var(--ui-x, <default>)`, later ones (variations)
 *   write the alias, and every read in the family's sheets reads the alias.  See `ComponentTokens.convert()`.
 * - Without `--write` it only prints:  the notes to review, and every OTHER file still naming a converted token
 *   (other sheets' reads, tests, examples, docs) -- those need a human, see the recipe.
 * - NOTE: imports the leaf file, not the `spell-ui/styles` barrel (whose `?inline` imports only Vite understands).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"

import { ComponentTokens } from "spell-ui/styles/ComponentTokens"
import { Terminal } from "spell/element-tools/Terminal"
import type { GeneratedOutput } from "spell/element-tools/generatedFiles"
import { SITE_PAGES, SPELL_UI_ROOT } from "spell-ui/tools/tools.types"

import { formatted } from "spell-ui/tools/generatedFiles"

/****************
 * ### `AliasTokensCommand`
 * Converts one family's sheets to private token aliases, and lists what's left for a person to fix.
 ****************/
class AliasTokensCommand {
  /**
   * Convert, report.
   * - SIDE EFFECT:  with `write`, overwrites the family's sheets that changed, formatted as `yarn format` would.
   */
  async run({ family, write }: AliasTokensOptions) {
    const tokens = new ComponentTokens({
      vocabularies: this.read(this.files("src/components", ENGLISH_VOCABULARY)),
      foundation: Object.values(this.read(this.files("src/styles", /\.css$/)))
    })
    const sheets = this.read(this.files(`src/components/${family}`, /\.css$/))
    const declared = new Set(
      Object.values(sheets).flatMap((css) =>
        tokens
          .publicDeclarations(css)
          .filter(({ name }) => tokens.owner(name)?.family === family)
          .map(({ name }) => name)
      )
    )
    Terminal.out(`${family}:  ${declared.size} public tokens declared`)

    const converted: GeneratedOutput[] = []
    for (const [path, css] of Object.entries(sheets)) {
      const { css: sheet, notes } = tokens.convert(family, css, declared)
      Terminal.out(`\n${path}${sheet === css ? "  (unchanged)" : ""}`)
      for (const note of notes) Terminal.out(`  - ${note}`)
      if (sheet !== css) converted.push([join(SPELL_UI_ROOT, path), sheet])
    }
    // formatted so `yarn format` is a no-op afterwards
    if (write) for (const [file, sheet] of await formatted(converted)) writeFileSync(file, sheet)

    Terminal.out("\nOther files naming a converted token (reads of the PUBLIC name, not through the alias):")
    const own = new Set(Object.keys(sheets))
    const pattern = new RegExp(`(?<!var\\(--_ui-[a-z0-9-]+, var\\()(${[...declared].join("|")})(?![a-z0-9-])`, "g")
    // the site's pages too (`SITE_PAGES`)
    // not the notes:  they're the content repo's since epic `repo-split` P9 (`guides/ui/notes/`), and reading the
    // folder they left threw
    for (const directory of ["src", "tests", "site", SITE_PAGES]) {
      for (const path of this.files(directory, /\.(css|ts|tsx|html|md)$/)) {
        if (own.has(path) || GENERATED_SITE.test(path) || declared.size === 0) continue
        const lines = readFileSync(join(SPELL_UI_ROOT, path), "utf8").split("\n")
        lines.forEach((line, index) => {
          if (line.match(pattern)) Terminal.out(`  ${path}:${index + 1}:  ${line.trim().slice(0, 140)}`)
        })
      }
    }
  }

  /** Repo-relative paths under `directory` (recursive) whose name matches `pattern`. */
  private files(directory: string, pattern: RegExp): string[] {
    return (readdirSync(join(SPELL_UI_ROOT, directory), { recursive: true }) as string[])
      .filter((file) => pattern.test(file) && !file.includes("node_modules"))
      .map((file) => `${directory}/${file}`)
      .sort()
  }

  /** path => text of each repo-relative path. */
  private read(paths: string[]): Record<string, string> {
    return Object.fromEntries(paths.map((path) => [path, readFileSync(join(SPELL_UI_ROOT, path), "utf8")]))
  }
}

/** What `AliasTokensCommand.run()` converts, and whether it writes. */
type AliasTokensOptions = {
  /** the family's folder, e.g. `ui-button` */
  family: string
  /** overwrite the sheets;  else only print */
  write: boolean
}

/** The site's generated files:  the minified bundle and its data, never hand-edited. */
const GENERATED_SITE = /^site\/_(assets|data)\//

/** A family's English vocabulary, `<family>/UIButton.en.ts` (`VocabularyFiles.languageOf()`'s rule). */
const ENGLISH_VOCABULARY = /\/[A-Z]\w*\.en\.ts$/

/** Printed when the family is missing. */
const USAGE = "usage:  yarn tokens:alias <family> [--write]"

const { values, positionals } = parseArgs({
  options: { write: { type: "boolean", default: false } },
  allowPositionals: true
})
const [family] = positionals
if (!family) {
  Terminal.err(USAGE)
  process.exit(2)
}
await new AliasTokensCommand().run({ family, write: values.write })
