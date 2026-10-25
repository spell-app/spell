/**
 * Spell UI's `spell` commands (its `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33, Q42):
 * - `spell icon [query...]`:  find Spell UI's icons
 * - `spell ssr <pages...>`:  `ui-*` pages as plain HTML, Spell UI's server render
 * - `spell pack create | add | build | check`:  component packs, built on the kit's pack tooling
 * - `spell design build | bundle | check | pull | changed | pushed | state`:  Spell's claude.ai design system
 * - `spell ui rename [--write] <paths...>`:  old attribute names rewritten into their new ones (epic `ui-gaps` P6)
 * - Loads fast:  each action imports its command's file when it runs (`src/cli/`, `spell-ui/cli/...`).
 * - NOTE: the kit's `spell commands` reads this file's TEXT, for each `spell.command(...)` and `<group>.command(...)`
 *   call:  keep each command's name a literal at its call, and each group a `const`.
 */
import { CLI } from "spell/cli"

import type { IconsOptions, PackOptions, RenameOptions, SsrOptions } from "spell-ui/cli/cli.types"

/** The `spell` program a command list adds to:  commander's `Command`. */
type Program = Parameters<CLI.CommandList>[0]

const uiCommands: CLI.CommandList = (spell) => {
  ////////////////
  // ## Icons and pages
  ////////////////

  spell
    .command("icon")
    .description("find Spell UI's icons by name, alias or keyword -- --open shows them in a browser")
    .argument("[query...]", "words to look for, e.g. bell -- none:  every icon")
    .option("--pack <id>", "only this pack:  fa7-free, fa7-brands or fomantic")
    .option("--json", "print the icons found as JSON")
    .option("--open", "show them as pictures in a browser, until Ctrl-C")
    .action((query: string[], options: IconsOptions) =>
      CLI.runCommand(async () => (await import("spell-ui/cli/iconCommand")).iconCommand(query, options))
    )

  spell
    .command("ssr")
    .description("ui-* pages as plain HTML for crawlers and no-JS readers:  page.static.html + ui.static.css")
    .argument("<pages...>", "html pages, or folders of them -- writes each as <page>.static.html beside it")
    .option("-o, --output <path>", "write the page here -- or, for several, into this folder")
    .option("--inline-css", "put each page's stylesheet in a <style> in the page, not the folder's ui.static.css")
    .option("--css <file>", "write ONE stylesheet, for every page, here (default:  ui.static.css per folder)")
    .option("--no-minify", "leave the stylesheet readable")
    .action((pages: string[], _options, command: Program) =>
      CLI.runCommand(async () =>
        (await import("spell-ui/cli/ssrCommand")).ssrCommand(pages, command.optsWithGlobals<SsrOptions>())
      )
    )

  ////////////////
  // ## Old names
  ////////////////

  const ui = spell.command("ui").description("Spell UI's own upkeep -- rename")

  ui.command("rename")
    .description(
      'old attribute names rewritten into their new ones (primary => color="primary") -- a dry run without --write'
    )
    .argument("<paths...>", "pages, code, or folders of them")
    .option("--write", "rewrite the files;  without it, list what it would change (exit 1 when there's something)")
    .option("--quiet", "print only the total")
    .option("--markup-only", "only tags a browser draws, never escaped markup:  pages that quote old names on purpose")
    .action((paths: string[], options: RenameOptions) =>
      CLI.runCommand(async () => (await import("spell-ui/cli/renameCommand")).renameCommand(paths, options))
    )

  ////////////////
  // ## Component packs
  ////////////////

  const pack = spell
    .command("pack")
    .description(
      "component packs:  a repo's custom elements, loaded on demand by <ui-root> -- create, add, build, check"
    )

  pack
    .command("create")
    .description("make spell-<name>/, a component pack that is a repo of its own, laid out as spell-brand is")
    .argument("<name>", "the pack's name, e.g. cards:  its repo is spell-cards")
    .option("--prefix <prefix>", "every tag's prefix, e.g. card- (default the pack's own, else <name>-)")
    .option("--no-build", "write the files, don't build the pack")
    .option("--json", "print the report as JSON")
    .action((name: string, options: PackOptions) =>
      CLI.runCommand(async () => (await packCommand()).packCreate(name, options))
    )

  pack
    .command("add")
    .description("add one element to a pack:  src/components/<tag>/, its test, its line in src/components/index.ts")
    .argument("<pack>", "the pack, e.g. brand")
    .argument("<tag>", "the element's tag, starting with the pack's prefix, e.g. brand-card")
    .option("--no-build", "write the files, don't build the pack")
    .option("--json", "print the report as JSON")
    .action((name: string, tag: string, options: PackOptions) =>
      CLI.runCommand(async () => (await packCommand()).packAdd(name, tag, options))
    )

  pack
    .command("build")
    .description("build a pack's src/components/__pack/:  its catalog, its entry, the script a page loads")
    .argument("<pack>", "the pack, e.g. brand")
    .option("--json", "print the report as JSON")
    .action((name: string, options: PackOptions) =>
      CLI.runCommand(async () => (await packCommand()).packBuild(name, options))
    )

  pack
    .command("check")
    .description("say whether a pack's src/components/__pack/ is current -- exits 1 when one is stale")
    .argument("[pack]", "the pack, e.g. brand -- none:  every pack in the kit")
    .option("--json", "print the report as JSON")
    .action((name: string | undefined, options: PackOptions) =>
      CLI.runCommand(async () => (await packCommand()).packCheck(name, options))
    )

  ////////////////
  // ## The design system
  ////////////////

  const design = spell
    .command("design")
    .description("Spell's claude.ai design system:  build its files and bundle, check it, pull a board, track pushes")

  designVerb(
    design.command("build"),
    "build",
    "write the design system's files:  --out <dir> (default build/design-system/)"
  )
  designVerb(design.command("bundle"), "bundle", "write its bundle.js, spell-brand's:  --out <dir>, --skip-ui-build")
  designVerb(
    design.command("check"),
    "check",
    "prove the bundle is inlined and works on a Design board:  [bundle] [outDir]"
  )
  designVerb(design.command("pull"), "pull", "pull a Design board as a page:  <board.dc.html> <page.html>")
  designVerb(design.command("changed"), "changed", "what changed in the design system since it was last pushed")
  designVerb(design.command("pushed"), "pushed", "record that the design system was pushed to claude.ai")
  designVerb(design.command("state"), "state", "where the design system's push record stands")
}

export default uiCommands

/** `spell pack`'s work, loaded when a verb runs. */
function packCommand() {
  return import("spell-ui/cli/packCommand")
}

/**
 * Make `command` the design verb `verb`:  its arguments handed on to the tool as they're typed (`designCommand()`),
 * flags and all.
 */
function designVerb(command: Program, verb: string, description: string): void {
  command
    .description(description)
    .argument("[args...]", "the tool's own arguments")
    .allowUnknownOption()
    .allowExcessArguments()
    .helpOption(false)
    .action(() =>
      CLI.runCommand(async () =>
        (await import("spell-ui/cli/designCommand")).designCommand(verb, CLI.rawArgsAfter("design", verb))
      )
    )
}
