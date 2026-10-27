/**
 * `epic pages create <template> <page> [--title "Title"] [--description "One sentence."]`:  start a page from a template.
 * - `<template>`:  `durable`, `cheatsheet` or `commands` (or a path under `templates/`);  epic pages come from
 *   `epic create`
 *   - found by `templateFile()`:  the repo's own templates first (`repoTemplates`), then the engine's, spell-epic's
 *     `templates/` (epic `epic-eject` T11)
 * - `--dry-run`:  print the template and the page it would write, and write nothing
 * - SIDE EFFECT:  a template with its data beside it (`commands.json5`) copies that too, as `<page>.json5` (its old
 *   `.json` name too, until `epic migrate` renames it:  `DataFile`, epic `epic-workflow` P21)
 * - `<page>`:  where it goes, a guide by default:  `parser/parser.html` is `guides/parser/parser.html`;  a path starting
 *   with an area (`guides/`, `pages/`) is from the checkout's root
 * - Brings an older template's asset and `index.html` paths up to date (`fromTemplate()`):  its links are root paths,
 *   the same at any depth (epic `epic-engine` P46).
 * - Sets `<title>`, the `h1`, the breadcrumb's last section and the description;  drops the template's how-to
 *   comment;  refuses to overwrite.
 * - Then tidies the page and updates the home and list pages, so it's listed at once.
 */
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"

import { parseHTML } from "linkedom"

import { parseVerbArgs } from "spell/epic/command/command.types.ts"
import { DataFile } from "spell/epic/data/DataFile.ts"
import { CONTENT, GUIDES, PACKAGE, TOOLS, fromTemplate, pagePath, serialize, templateFile, tidy } from "./pages.js"

const { positional, flags } = parseVerbArgs(process.argv.slice(2), ["dryRun"])
const [templateArg, page] = positional
if (!templateArg || !page?.endsWith(".html")) {
  fail(
    `usage:  epic pages create durable|cheatsheet|commands <topic>/<topic>.html [--title "Title"] [--description "..."] [--dry-run]`
  )
}
if (/^templates\/epics\/|^plan$/.test(templateArg)) fail("epic pages:  `epic create <epic>`")
const template = templateFile(templateArg)
if (!template) fail(`no template ${templateArg}`)
const file = /^(guides|pages)\//.test(page) ? join(CONTENT, page) : join(GUIDES, page)
if (existsSync(file)) fail(`${pagePath(file)} already exists`)
if (flags.dryRun) {
  console.log(`would write ${pagePath(file)} from ${template}`)
  process.exit(0)
}

const title = flags.title ?? "Short Title"
const html = fromTemplate(readFileSync(template, "utf8"))
const { document } = parseHTML(html)
document.querySelector("title").textContent = title
document.querySelector("h1").textContent = title
const crumb = document.querySelector("ui-breadcrumb[selected]")
if (crumb) crumb.textContent = title
document.querySelector('meta[name="description"]').setAttribute("content", flags.description ?? "One sentence.")
// a data-driven template (`commands`) has its data beside it:  the page gets a copy, named after the page
const data = DataFile.found(template.replace(/\.html$/, DataFile.SUFFIX))
const pageData = file.replace(/\.html$/, DataFile.SUFFIX)
for (const code of document.querySelectorAll("ui-list.spell-meta code")) {
  if (/^short-title\.json5?$/.test(code.textContent)) code.textContent = basename(pageData)
}
mkdirSync(dirname(file), { recursive: true })
writeFileSync(file, serialize(document))
if (data) copyFileSync(data, pageData)
if (!tidy([file])) process.exit(1)
const run = spawnSync("node", [join(TOOLS, "index.js")], { cwd: PACKAGE, encoding: "utf8" })
if (run.status !== 0) process.stderr.write(run.stderr)
console.log(relative(process.cwd(), file))

/** Print `message` and exit 1. */
function fail(message) {
  console.error(`docs:new:  ${message}`)
  process.exit(1)
}
