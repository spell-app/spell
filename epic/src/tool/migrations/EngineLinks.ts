import { existsSync } from "node:fs"
import { isAbsolute, join, relative, resolve } from "node:path"

import type { AS } from "spell-kit/assembler"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `EngineLinks`
 * The migration `engine-links` (epic `epic-engine` I27):  an epic page's links to files that left spell-app lead to
 * where those files are now.
 *
 * ```text
 * ../../packages/epics/tools/pages.js            =>  ../../spell-epic/src/tools/pages.js
 * ../../packages/epics/src/tool/PlanDoc.ts       =>  ../../spell-epic/src/tool/PlanDoc.ts
 * ../../tests/epics/src/tool/PlanDoc.test.ts     =>  ../../spell-epic/tests/tool/PlanDoc.test.ts
 * ../../.claude/skills/epic/SKILL.md             =>  ../../spell-epic/skills/epic/SKILL.md
 * ../../packages/epics/docs/epic-item.html       =>  ../../components/epics/epic-item.html
 * <a href="../../../shared-pending/README.md"><code>shared-pending/README.md</code></a>  =>  its <code> alone
 * ```
 *
 * - Why:  epic `epic-eject` moved the engine out of spell-app into spell-epic, which spell-app's checkout links in at
 *   `spell-epic/`;  1,665 links in 35 epic pages led nowhere.  Epic-engine's own 77 were mended by hand (I22).
 * - Each move is EVIDENCE, never a guess (`MOVES`, each with where it's from):  git's renames, in spell-app and
 *   spell-epic, and the commits that say where a file went.
 * - A link changes only when it's DEAD (nothing there, as `epic check` resolves it) and its new place is there:
 *   - its `href`:  from the page, as the I22 linker writes it (`RepoList.linkRootOf()`:  the checkout the page is
 *     served under;  a component set's files at their served address, `components/epics/`);  its `#hash` kept
 *   - its `target`, when the linker made it (`src-...`, or none):  the new file's, so one file keeps one tab
 * - A file that's GONE (deleted, folded into another, or never tracked) leaves its link's words as plain text.
 * - A link ONE folder too deep (`../../../packages/x` from `epics/<name>/`, past the checkout's root;  epic
 *   `epic-engine` I34):  the same tail from the root, when that's there, or where it moved;  never a deeper miss.
 * - A dead link it knows no move for, or whose new place isn't there, is LEFT, in the notes.
 * - The log and Original Discussions too:  their links name the same files, which moved under them.
 * - Needs the page's linker (`context.linker`) and folder:  without them it changes nothing.
 * - IDEMPOTENT:  a link that leads somewhere is never touched.
 * - Runs on command (`migrate`), never on every edit:  it reads the disk for every link.
 ****************/
export class EngineLinks implements Migration {
  readonly name = "engine-links"
  readonly kind = "epic"
  readonly date = "2026-10-19"
  readonly everyEdit = false
  readonly description =
    "links to files that left spell-app (the engine, its tests, skills, hooks) lead to where they are now;  a gone file's words stay, unlinked"

  /** Point `document`'s dead links at their files' new places, IN PLACE;  did it change anything? */
  run(document: Document, context: MigrationContext): boolean {
    const { linker, folder, root } = context
    if (!linker || !folder) return false
    // where the page is served under the linker's checkout:  the content folder laid at its root
    const pageDir = root ? join(linker.root, relative(root, folder)) : linker.servedDir(folder)
    const said = new Map<string, number>()
    let changed = false
    for (const link of Array.from(document.querySelectorAll("a[href]"))) {
      const href = link.getAttribute("href")!
      if (!LOCAL.test(href)) continue
      const cut = href.indexOf("#")
      const path = cut < 0 ? href : href.slice(0, cut)
      if (!path) continue
      const fix = EngineLinks.fixFor(linker, resolve(pageDir, path), root)
      if (!fix) continue
      let note: string
      if (fix.gone) {
        link.replaceWith(...Array.from(link.childNodes))
        note = `${href}:  gone, its words left as text`
        changed = true
      } else if (!fix.there) {
        note = `${href}:  ${relative(linker.root, fix.to)} isn't there:  left for you`
      } else {
        const to = `${relative(pageDir, fix.to)}${path.endsWith("/") ? "/" : ""}${cut < 0 ? "" : href.slice(cut)}`
        link.setAttribute("href", to)
        const target = link.getAttribute("target")
        if (!target || target.startsWith("src-"))
          link.setAttribute("target", linker.targetFor(EngineLinks.real(linker, fix.to)))
        note = `${href} -> ${to}`
        changed = true
      }
      said.set(note, (said.get(note) ?? 0) + 1)
    }
    for (const [note, n] of said) context.notes?.push(`${this.name}:  ${note}${n > 1 ? ` (${n} links)` : ""}`)
    return changed
  }

  /**
   * What to do with a link to `at` (absolute, as served under `linker`'s checkout):  `undefined` while it leads
   * somewhere, or no move knows it;  else `gone`, or its new place `to` (as served) and whether that's `there`.
   * - `content`:  the page's content folder, laid at the checkout's root:  a file there is there too
   */
  private static fixFor(linker: AS.Linker, at: string, content?: string): LinkFix | undefined {
    const there = (path: string): boolean =>
      existsSync(EngineLinks.real(linker, path)) ||
      (!!content && existsSync(join(content, relative(linker.root, path))))
    let from = relative(linker.root, at)
    if (!from || isAbsolute(from)) return undefined
    if (from.startsWith("..")) {
      // ONE folder too deep (epic `epic-engine` I34):  `../../../packages/x` from `epics/<name>/` climbs past the
      // checkout, to its parent;  the same tail from the checkout's root is what it meant, when that's there (or moved)
      if (!from.startsWith("../") || from.slice(3).startsWith("..") || there(at)) return undefined
      from = from.slice(3)
      const shallower = join(linker.root, from)
      if (there(shallower)) return { to: shallower, there: true }
      at = shallower
    }
    if (there(at)) return undefined
    // a split page's part, `.htm` before Q12 of epic `epic-components`, `.html` since every doc was converted (P15)
    if (PART_HTM.test(from) && there(`${at}l`)) return { to: `${at}l`, there: true }
    const move = MOVES.find(([old]) => from === trimmed(old) || (old.endsWith("/") && from.startsWith(old)))
    if (!move) return undefined
    const [old, now] = move
    if (now === null) return { gone: true }
    // what's under a moved folder keeps its place in it:  `packages/epics/tools/x.js` -> `spell-epic/src/tools/x.js`
    const to = join(linker.root, trimmed(now) + from.slice(trimmed(old).length))
    return { to, there: there(to) }
  }

  /**
   * `path`, as served under `linker`'s checkout, as the file it is:  a component set's address folder swapped for
   * the folder it serves (`<root>/components/epics/x` => `<root>/spell-epic/src/docs/x`), the content folder's areas
   * for the content folder's;  else `path`.  `AS.Linker`'s own swap, which it keeps private.
   */
  private static real(linker: AS.Linker, path: string): string {
    for (const [address, dir] of linker.served) {
      if (path === address) return dir
      if (path.startsWith(`${address}/`)) return dir + path.slice(address.length)
    }
    return path
  }
}

/** What `fixFor()` found:  `gone`, or the link's new place `to` and whether it's `there`. */
type LinkFix = { gone: true; to?: undefined; there?: undefined } | { gone?: undefined; to: string; there: boolean }

/** `path` without its trailing `/`:  a folder's place as a link may name it either way. */
function trimmed(path: string): string {
  return path.replace(/\/$/, "")
}

/** An `href` to a file of the checkout:  not `#id`, a root path (`/_epic/...`), or a URL (`https:`, `SAGA:` ...). */
const LOCAL = /^(?![a-z][a-z0-9+.-]*:|[#/])/i

/** A split page's part as it was named before Q12:  `epics/<name>/parts/<id>.htm`. */
const PART_HTM = /(^|\/)parts\/[^/]+\.htm$/

/**
 * Each OLD place (from the checkout's root;  a folder ends `/`) => where it is now, as served under spell-app's
 * checkout;  `null`:  gone.  The first that matches wins, so the narrower come first.
 * - What a move rests on, in each group's comment.  The hashes are spell-app's (`spell-app`) or spell-epic's.
 */
const MOVES: readonly (readonly [string, string | null])[] = [
  // spell-epic's first commit (ea6e884, epic-eject P6) took spell-app's packages/epics, tests/epics, scripts/window.mjs,
  // the hooks and 17 skills, as of spell-app 79c78e58c;  spell-epic's J14 then laid them out as a plain repo:
  // `git diff -M ea6e884 HEAD` renames every one by these prefixes but the three docs files, which went into src/
  ["packages/epics/AGENTS.md", "spell-epic/src/AGENTS.md"],
  ["packages/epics/CLAUDE.md", "spell-epic/src/CLAUDE.md"],
  ["packages/epics/README.md", "spell-epic/src/README.md"],
  // the plan-doc checks' screenshots:  git-ignored there (`/src/demo/shots/`), never in a checkout but the one that ran
  ["packages/epics/demo/shots/", null],
  ["packages/epics/demo/", "spell-epic/src/demo/"],
  // Epic UI:  spell-epic's src/docs/, which spell-app's page server serves at /components/epics/ (its componentSets)
  ["packages/epics/docs/", "components/epics/"],
  ["packages/epics/tools/", "spell-epic/src/tools/"],
  ["packages/epics/components/", "spell-epic/src/components/"],
  ["packages/epics/scripts/", "spell-epic/scripts/"],
  ["packages/epics/src/", "spell-epic/src/"],
  // spell-app 0840a018b (people-and-orgs P16):  "docs and epics are one package":  the docs package's tools (63
  // renames) went into packages/epics/tools, so on to spell-epic's src/tools
  ["packages/docs/tools/", "spell-epic/src/tools/"],
  // the package itself, its package.json, tsconfig.json, vitest.config.ts:  spell-epic's root, `@spell-app/epics`
  ["packages/epics/", "spell-epic/"],
  ["tests/epics/src/", "spell-epic/tests/"],
  ["tests/epics/", "spell-epic/tests/"],
  ["scripts/window.mjs", "spell-epic/src/window.mjs"],
  ["scripts/window.test.mjs", "spell-epic/tests/window.test.mjs"],
  [".claude/skills/", "spell-epic/skills/"],
  // spell-app 6f41ed9c5 (epic-eject P5):  "its tests moved into tests/epics", as PromptGate.test.ts
  [".claude/hooks/prompt-gate.test.mjs", "spell-epic/tests/command/PromptGate.test.ts"],
  [".claude/hooks/", "spell-epic/hooks/"],
  // spell-app 6231f3f1c (epic-eject I7):  "the Review tab, docs view, Open Epic, window bridge and handoff are
  // spell-epic's";  spell-epic e899908 made its extension "from the spell language extension's DocView, DocPreview
  // and WindowBridge"
  ["packages/vscode/src/DocView.ts", "spell-epic/vscode/src/DocView.ts"],
  ["packages/vscode/src/DocPreview.ts", "spell-epic/vscode/src/DocPreview.ts"],
  ["packages/vscode/src/WindowBridge.ts", "spell-epic/vscode/src/WindowBridge.ts"],
  // spell-app 617465303 (epic-eject P6) removed the CLI's epic bin and entry;  spell-epic's are the same files, moved
  ["packages/cli/bin/epic.mjs", "spell-epic/bin/epic"],
  ["packages/cli/src/epicMain.ts", "spell-epic/src/command/epicMain.ts"],
  // spell-app 6f41ed9c5 (epic-eject P5):  "every group a class in packages/epics/src/command";  git's renames there
  // (and their tests')
  ["packages/cli/src/epic/epicArgs.ts", "spell-epic/src/command/epicArgs.ts"],
  ["packages/cli/src/epic/epicGroups.ts", "spell-epic/src/command/epicGroups.ts"],
  ["packages/cli/src/epic/requests.ts", "spell-epic/src/command/Requests.ts"],
  ["packages/cli/src/dev/mergeMain.ts", "spell-epic/src/command/MainMerge.ts"],
  ["packages/cli/src/dev/parking.ts", "spell-epic/src/command/Parking.ts"],
  ["packages/cli/src/dev/sessions.ts", "spell-epic/src/command/Sessions.ts"],
  ["packages/cli/src/dev/shared.ts", "spell-epic/src/command/Shared.ts"],
  ["packages/cli/src/dev/sharedMigrate.ts", "spell-epic/src/command/SharedMigration.ts"],
  ["packages/cli/src/dev/stock.ts", "spell-epic/src/command/Stock.ts"],
  ["packages/cli/src/dev/worktrees.ts", "spell-epic/src/command/Worktrees.ts"],
  ["tests/cli/src/dev/mergeMain.test.ts", "spell-epic/tests/command/MainMerge.test.ts"],
  ["tests/cli/src/dev/sessions.test.ts", "spell-epic/tests/command/Sessions.test.ts"],
  ["tests/cli/src/dev/shared.test.ts", "spell-epic/tests/command/Shared.test.ts"],
  ["tests/cli/src/dev/sharedMigrate.test.ts", "spell-epic/tests/command/SharedMigration.test.ts"],
  ["tests/cli/src/dev/worktrees.test.ts", "spell-epic/tests/command/Worktrees.test.ts"],
  ["tests/cli/src/epic/epicArgs.test.ts", "spell-epic/tests/command/epicArgs.test.ts"],
  ["tests/cli/src/epic/merge.test.ts", "spell-epic/tests/command/RequestsMerge.test.ts"],
  ["tests/cli/src/epic/requests.test.ts", "spell-epic/tests/command/Requests.test.ts"],
  // ... and the rest of that commit's CLI files were FOLDED into those classes, no one file their own:  gone
  ["packages/cli/src/commands/agentsCommand.ts", null],
  ["packages/cli/src/commands/airplaneCommand.ts", null],
  ["packages/cli/src/commands/notesCommand.ts", null],
  ["packages/cli/src/commands/planDocCommand.ts", null],
  ["packages/cli/src/commands/sessionCommand.ts", null],
  ["packages/cli/src/commands/sharedCommand.ts", null],
  ["packages/cli/src/dev/transcript.ts", null],
  ["packages/cli/src/epic/home.ts", null],
  // spell-app f76f78fbf (people-and-orgs P19):  "`spellCore` is `core` everywhere ... its files `core.types.ts`,
  // `core.declarations.json5`, `core.scopes.js`"
  ["packages/core/spellCore.declarations.json5", "packages/core/core.declarations.json5"],
  ["packages/core/src/spellCore.scopes.js", "packages/core/src/core.scopes.js"],
  ["packages/core/src/spellCore.types.ts", "packages/core/src/core.types.ts"],
  // spell-app 288ee9f36 (P5, "Package Goes"):  packages/solid-element/ deleted
  ["packages/solid-element/", null],
  // a scratch folder of edited copies (epic `review-review`):  never tracked, by spell-app or the content repo
  ["shared-pending/", null],
  // the parked goal sets' templates:  deleted in epic `epic-engine` P2 (T1)
  ["templates/goals/", null]
]
