/**
 * `tools/readme-check.ts`:  the README check, the one Markdown check every repo's pages get
 * (`yarn readme:check` at the kit's root;  epic `readme` P8).
 * - oxfmt skips Markdown (the toolchain's `fmtConfig` ignores `**\/*.md`), so this is what keeps the pages true.
 * - Node 24 runs it as is (its types stripped):  `node tools/repos.ts`'s rules, so node's own modules only
 *   (and util's standalone `spell/util/string.ts`), `import type` for types, no `enum` or parameter property.
 *
 * ```sh
 * yarn readme:check               # every page:  the kit's README.md, README-*.md and README/*.md, and each big folder's
 * yarn readme:check README.md     # only those pages (paths from the kit's root)
 * ```
 *
 * - What it reports, one line each, `page:line  rule  message`:  `ReadmeCheck.RULES`.
 * - Exit status 1 on any finding, 0 when clean.
 */
import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"

import { kitFolders } from "spell/server/kitFolders"
import { slug } from "spell/util/string.ts"

/****************
 * ### `ReadmeCheck`
 * The README check over the pages of the kit and its folders.
 * - Each page is read line by line:  fenced code blocks, `<details>` folds and Mermaid blocks tracked as it goes.
 * - Links are checked against the disk:  the file, and its heading (GitHub's slugs) for a `#anchor`.
 * - Words are checked too:  the stale and banned names, and the house's rules about Spell's own name:
 *   - `brand`:  spell-brand is internal, so no page names it, in code spans, links and Mermaid blocks too
 *   - `capital`:  "Spell" is capitalised in prose;  a lowercase `spell` is for code and names (`spell-parser`)
 * - A See also lists curated links, not a line of every page beside it (`siblings`).
 * - spell-brand's README is left out:  it stays outside the set of pages (epic `readme`, the map).
 ****************/
export class ReadmeCheck {
  /** what each rule's finding means */
  static readonly RULES = {
    link: "a relative link to a file or folder that isn't there",
    "cross-repo":
      "a relative link into another repo:  it works in a checkout, but each repo stands alone on GitHub, so write its GitHub URL",
    anchor: "a link to a heading the page hasn't got (GitHub's slugs)",
    "content-folder": "a link into the epic folder, spell.epics:  name the guide by its served path instead",
    caption: "a Mermaid block (or a picture standing in for one) with no italic caption line right after it",
    unstyled: "a Mermaid block without the Spell look:  run `yarn mermaid:pretty`",
    summary: "a `<details>` whose `<summary>` line isn't followed by a blank line:  Markdown won't render inside",
    until: "a fold for today's spelling not worded `Until repo-split P13 lands` (or P14, or `P13 and P14 land`)",
    word: "a stale or banned name",
    owner: "the owner's name, outside WWOD's expansion and the sample address",
    example: "a deleted example project",
    "deleted-readme": "the path of an in-folder README that was folded into a page and deleted",
    brand: "the word brand in any form, anywhere (code, links, Mermaid too):  spell-brand is internal, so leave it out",
    capital: "a lowercase `spell` in prose:  write Spell;  lowercase is for code, paths and names like `spell-parser`",
    siblings: "a See also line that opens `Also beside it`:  a See also lists curated links, not every sibling",
    picture:
      "an `html example` block without its picture under it, or with one older than its markup:  run `spell readme pictures`",
    output:
      "an sh block ending in `#` lines after its command:  its output, which goes in an Output fold after the block, so `yarn readme:test` runs it",
    "root-page":
      "a topic page at the kit's root:  only README.md, README-epics.md and README-vscode.md stay there;  the rest go in README/ (README/cli.md)"
  } as const

  /**
   * the folders whose root pages are checked, from the kit's root:  `.` (the kit), then its folders (`workspaces`:
   * `parser`, `ui`, `epic`, `app`), ONE repo since epic `repo-split` P20
   */
  readonly folders: string[]

  /** the kit's root:  this file is in its `tools/` */
  readonly root: string

  constructor(root = resolve(import.meta.dirname, "..")) {
    this.root = root
    this.folders = [".", ...kitFolders(root).map((dir) => relative(root, dir))]
  }

  /**
   * Every page, sorted:
   * - `README.md` and `README-*.md` at the root of the kit and each of its folders
   * - the kit's topic pages, in its `README/` folder (`README/cli.md`;  epic `epic-friend` P8)
   */
  pages(): string[] {
    const pages: string[] = []
    for (const repo of this.folders) {
      const folder = join(this.root, repo)
      if (!existsSync(folder)) continue
      for (const name of readdir(folder)) if (PAGE_NAME.test(name)) pages.push(join(folder, name))
    }
    const topics = join(this.root, TOPIC_FOLDER)
    if (existsSync(topics)) for (const name of readdir(topics)) if (name.endsWith(".md")) pages.push(join(topics, name))
    return pages.sort()
  }

  /** The findings for the page at `path` (absolute);  `text` its content, read from disk when not given. */
  checkPage(path: string, text = readFileSync(path, "utf8")): Finding[] {
    const page = relative(this.root, path) || path
    const findings: Finding[] = []
    const add = (line: number, rule: Rule, message: string) => findings.push({ page, line, rule, message })
    const lines = text.split("\n")
    if (dirname(path) === this.root && PAGE_NAME.test(basename(path)) && !ROOT_PAGES.includes(basename(path)))
      add(
        1,
        "root-page",
        `${basename(path)} is a topic page:  move it to ${TOPIC_FOLDER}/${topicOf(basename(path))}.md`
      )

    //////
    // Line by line:  folds, fences, captions, See also, words
    //////
    const folds: Fold[] = []
    let fence: { marker: string; language: string; start: number } | undefined
    lines.forEach((line, index) => {
      const lineNumber = index + 1
      const trimmed = line.trim()
      if (fence) {
        if (trimmed.startsWith(fence.marker) && trimmed.replace(/[`~]/g, "") === "") {
          if (fence.language === "mermaid") {
            const first = lines.slice(fence.start, index).find((each) => each.trim())
            if (!first?.trim().startsWith("%%{init:")) add(fence.start, "unstyled", "this Mermaid block isn't styled")
            const asText = folds.some((fold) => AS_TEXT.test(fold.summary))
            if (!asText && !hasCaption(lines, index + 1))
              add(fence.start, "caption", "this Mermaid block has no caption")
          }
          if (fence.language === "sh" && endsInOutput(lines.slice(fence.start, index)))
            add(fence.start, "output", "this block's output is written as # lines:  move it to an Output fold")
          fence = undefined
        } else this.checkWords(line, lineNumber, folds, add)
        return
      }
      const opening = /^\s*(`{3,}|~{3,})\s*([\w-]*)/.exec(line)
      if (opening) {
        fence = { marker: opening[1], language: opening[2], start: lineNumber }
        this.checkWords(line, lineNumber, folds, add)
        return
      }
      if (/<details\b/i.test(line)) folds.push({ summary: "" })
      const summary = /<summary>(.*?)<\/summary>/i.exec(line)
      if (summary) {
        if (folds.length) folds[folds.length - 1].summary = summary[1]
        if (/^Until repo-split/i.test(summary[1]) && !UNTIL_WORDING.test(summary[1]))
          add(lineNumber, "until", `"${summary[1]}":  word it "Until repo-split P13 lands", optionally ":  <what>"`)
        if ((lines[index + 1] ?? "").trim() !== "")
          add(lineNumber, "summary", `"${summary[1]}" needs a blank line after it`)
      }
      // a drawn picture standing in for a Mermaid block (its source folded under it, "As text") needs a caption too
      if (HERO_IMAGE.test(trimmed) && !hasCaption(lines, index + 1))
        add(lineNumber, "caption", "this picture has no caption")
      if (SIBLINGS.test(line)) add(lineNumber, "siblings", "a See also lists curated links, not every sibling")
      this.checkWords(line, lineNumber, folds, add)
      if (/<\/details>/i.test(line)) folds.pop()
    })

    //////
    // Examples' pictures:  each `html example` block drawn, under it, from its markup as it is now
    //////
    for (const example of ReadmeCheck.examples(text)) {
      const { picture } = example
      if (!picture) add(example.start, "picture", "this example has no picture:  run `spell readme pictures`")
      else if (picture.hash !== example.hash)
        add(picture.line, "picture", "this picture is older than its example:  run `spell readme pictures`")
      else if (![picture.src, picture.dark].every((src) => existsSync(join(dirname(path), src))))
        add(picture.line, "picture", `${picture.src} (or its dark one) isn't there:  run \`spell readme pictures\``)
    }

    //////
    // Links, over the prose:  code blanked out, so a link's text may run over two lines
    //////
    const prose = proseOf(lines)
    for (const { target, offset } of linksIn(prose)) {
      this.checkLink(path, text, target, lineAt(prose, offset), add)
    }

    //////
    // Spell's name, in two views of the page:  "brand" anywhere in its text, a lowercase "spell" only in its prose
    //////
    for (const line of linesMatching(text, BRAND))
      add(line, "brand", "spell-brand is internal:  leave it out of the docs")
    for (const line of linesMatching(runningTextOf(prose), LOWERCASE_SPELL))
      add(line, "capital", `write "Spell" in prose;  lowercase only in code`)
    return findings.sort((a, b) => a.line - b.line)
  }

  /** The folder (an entry of `folders`, `.` for the kit's own) that holds `path`, absolute. */
  repoOf(path: string): string {
    const first = relative(this.root, path).split(/[\\/]/)[0]
    return this.folders.includes(first) ? first : "."
  }

  /** The findings for a link `target` on the page at `path` (its `text`), found at `line`. */
  checkLink(path: string, text: string, target: string, line: number, add: Add, viaGitHub = false): void {
    // a GitHub URL into the repo (`spell-app/spell`, its folders inside it since epic `repo-split` P20):  checked
    // against the checkout;  another repo's (spell-brand, or one of the four merged in) isn't checked
    const ours = OUR_GITHUB.exec(target)
    if (ours) {
      const [, repo, rest] = ours
      if (repo !== "spell") return
      const [inRepo, anchor] = splitAnchor(rest)
      return this.checkLink(
        path,
        text,
        relative(dirname(path), join(this.root, inRepo)) + (anchor ? `#${anchor}` : ""),
        line,
        add,
        true
      )
    }
    if (/^[a-z][\w+.-]*:/i.test(target) || target.startsWith("//")) return
    const [file, anchor] = splitAnchor(target)
    const resolved = file ? resolve(dirname(path), file) : path
    if (resolved.split(/[\\/]/).some((part) => part === CONTENT_FOLDER)) {
      add(line, "content-folder", `${target} points into the epic folder`)
      return
    }
    // a link out of the repo (a project beside it):  a GitHub URL, as the page is read on GitHub and npm
    if (file && !viaGitHub && relative(this.root, resolved).startsWith("..")) {
      add(line, "cross-repo", `${target}:  leaves the repo;  write its GitHub URL`)
      return
    }
    if (!existsSync(resolved)) {
      add(line, "link", `${target}:  no ${relative(this.root, resolved)}`)
      return
    }
    if (!anchor || !/\.md$/i.test(resolved) || statSync(resolved).isDirectory()) return
    const anchors = anchorsOf(resolved === path ? text : readFileSync(resolved, "utf8"))
    if (!anchors.has(anchor.toLowerCase())) add(line, "anchor", `${target}:  no heading #${anchor} there`)
  }

  /** The findings for the banned and stale words in `line` (line `lineNumber`), inside `folds`. */
  checkWords(line: string, lineNumber: number, folds: Fold[], add: Add): void {
    for (const { pattern, rule, message } of WORDS) {
      const match = pattern.exec(line)
      if (!match) continue
      if (pattern === ALIAS && folds.some((fold) => UNTIL.test(fold.summary))) continue
      add(lineNumber, rule, `${message}:  "${match[0]}"`)
    }
    const withoutAllowed = line.replace(/What Would Owen Do\?/g, "").replace(/\bowen@spell\b|@spell\/owen@/g, "")
    const owner = /\bOwen\b/i.exec(withoutAllowed)
    if (owner) add(lineNumber, "owner", `"${owner[0]}":  write "the owner", or leave it out`)
  }

  /** The command line:  `node tools/readme-check.ts [page ...]`;  the exit status. */
  main(names: string[]): number {
    const pages = names.length ? names.map((name) => resolve(process.cwd(), name)) : this.pages()
    const findings = pages.flatMap((page) => this.checkPage(page))
    for (const { page, line, rule, message } of findings) console.log(`${page}:${line}  ${rule}  ${message}`)
    console.log(
      findings.length
        ? `\n${findings.length} finding${findings.length === 1 ? "" : "s"} in ${new Set(findings.map((f) => f.page)).size} of ${pages.length} pages`
        : `${pages.length} pages:  clean`
    )
    return findings.length ? 1 : 0
  }

  ////////////////
  // ## Examples and their pictures
  ////////////////

  /**
   * A page's EXAMPLES:  its `html example` blocks, markup a browser draws, and the picture of each under it.
   * - GitHub runs no custom elements, so a README shows an example's picture instead (epic `ui-gaps` P14, from
   *   epic `epic-engine` Q28):  `spell readme pictures` (`tools/readme-pictures.ts`) takes it, headlessly.
   * - The picture is the block's next line but blank ones:  `<picture>` (its dark source, its light `<img>`), then
   *   `<!-- picture of the example above: <hash> -->`, the markup's `hash` when it was taken.
   * - Static:  pure, of the page's text.
   */
  static examples(text: string): ReadmeExample[] {
    const lines = text.split("\n")
    const examples: ReadmeExample[] = []
    for (let index = 0; index < lines.length; index++) {
      const opening = EXAMPLE_FENCE.exec(lines[index]!)
      if (!opening) continue
      const marker = opening[1]!
      let end = index + 1
      while (
        end < lines.length &&
        !(lines[end]!.trim().startsWith(marker) && lines[end]!.trim().replace(/[`~]/g, "") === "")
      )
        end++
      const markup = lines.slice(index + 1, end).join("\n")
      let next = end + 1
      while (next < lines.length && !lines[next]!.trim()) next++
      const tag = PICTURE_LINE.exec(lines[next] ?? "")
      const stamp = PICTURE_STAMP.exec(lines[next + 1] ?? "")
      examples.push({
        start: index + 1,
        end: end + 1,
        markup,
        hash: ReadmeCheck.hashOf(markup),
        ...(tag && {
          picture: {
            line: next + 1,
            lines: stamp ? 2 : 1,
            dark: tag[1]!,
            src: tag[2]!,
            alt: tag[3]!,
            hash: stamp?.[1]
          }
        })
      })
      index = end
    }
    return examples
  }

  /** `markup`'s fingerprint:  its lines, trailing spaces ignored, hashed (SHA-256, the first 12 hex digits). */
  static hashOf(markup: string): string {
    const text = markup
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim()
    return createHash("sha256").update(text).digest("hex").slice(0, 12)
  }
}

////////////////
// ## Types
////////////////

/** One thing wrong on a page. */
/** One example of a page (`ReadmeCheck.examples()`). */
export type ReadmeExample = {
  /** line of its opening fence, from 1 */
  start: number
  /** line of its closing fence */
  end: number
  /** the markup between the fences */
  markup: string
  /** the markup's fingerprint now (`hashOf()`) */
  hash: string
  /** its picture, when the page has one under it */
  picture?: {
    /** its `<picture>` line, from 1 */
    line: number
    /** how many lines it takes:  `<picture>`, and its stamp when there is one */
    lines: number
    /** the dark picture, from the page's folder */
    dark: string
    /** the light one */
    src: string
    /** its alt text, kept as the page's author wrote it */
    alt: string
    /** the markup's fingerprint when it was taken;  none without its stamp */
    hash?: string
  }
}

export type Finding = {
  /** the page, from the kit's root:  `ui/README.md` */
  page: string
  /** its line, from 1 */
  line: number
  /** which rule:  a key of `ReadmeCheck.RULES` */
  rule: Rule
  /** what's wrong, in a line */
  message: string
}

/** A rule's name. */
export type Rule = keyof typeof ReadmeCheck.RULES

/** Adds a finding at `line`. */
type Add = (line: number, rule: Rule, message: string) => void

/** An open `<details>` fold. */
type Fold = {
  /** its `<summary>` text;  empty until its summary line */
  summary: string
}

////////////////
// ## Rules
////////////////

/** a page's file name at a folder's root:  `README.md`, `README-epics.md` */
const PAGE_NAME = /^README(-[\w-]+)?\.md$/

/** the kit's folder of topic pages:  `README/cli.md` ... */
const TOPIC_FOLDER = "README"

/**
 * the pages that stay at the kit's root;  every other topic page is in `README/` (`root-page`)
 * - the front page, and the two a reader outside Spell comes for:  epics in their own repo, and the VS Code extension
 */
const ROOT_PAGES = ["README.md", "README-epics.md", "README-vscode.md"]

/** An example's opening fence:  ```` ```html example ````. */
const EXAMPLE_FENCE = /^\s*(`{3,}|~{3,})\s*html\s+example\s*$/

/** An example's picture, on one line:  its dark source, its light `<img>` and that one's alt text. */
const PICTURE_LINE =
  /^<picture><source media="\(prefers-color-scheme: dark\)" srcset="([^"]+)"><img src="([^"]+)"[^>]*? alt="([^"]*)"><\/picture>$/

/** The stamp under it:  the markup's fingerprint when the picture was taken. */
const PICTURE_STAMP = /^<!-- picture of the example above: ([0-9a-f]+) -->$/

/** the epic folder's name:  never linked (Q3) */
const CONTENT_FOLDER = "spell.epics"

/** a fold that holds a hero picture's Mermaid source:  its block needs no caption of its own */
const AS_TEXT = /^As text\b/i

/** a fold for today's spelling, before repo-split's last phases:  the one place an alias may show */
const UNTIL = /^Until repo-split P1[34]\b/

/** the wording of a fold for today's spelling, the same on every page:  what follows a `:  ` is free */
const UNTIL_WORDING = /^Until repo-split (P13 lands|P14 lands|P13 and P14 land)(:  \S.*)?$/

/** a drawn hero picture on a line of its own:  an image in a repo's `docs/images/`, an SVG */
const HERO_IMAGE = /^!\[[^\]]*\]\([^)]*docs\/images\/[^)]*\.svg\)$/

/** a See also's dump of every page beside it:  a line that opens `Also beside it`, after any list marker */
const SIBLINGS = /^\s*(?:(?:[-*+]|\d+[.)])\s+)?Also beside it\b/i

/**
 * the word `brand`, in any form (`brands`, `branded`, `branding`):  spell-brand is internal, so no page names it
 * - a whole word, but a hyphen or an underscore doesn't join it to its neighbours:  `spell-brand` and `/_brand/` match
 * - NOT the phrase "brand new" or "brand-new" (its space may be a line break)
 * - NOT Font Awesome's icon pack `fa7-brands` (the company logos):  a real pack, nothing to do with the repo
 */
const BRAND = /(?<![a-z\d])(?<!fa\d+-)(?:brand(?!(?:-|\s+)new(?![a-z\d]))|brands|branded|branding)(?![a-z\d])/gi

/**
 * a lowercase `spell` standing as a word:  prose writes the name `Spell`
 * - not an identifier:  a `spell` touching `-`, `_`, `/`, `@` or `#`, after a `.`, or before a `.` and a letter
 *   (`spell-parser`, `spell_core`, `@spell/core`, `.spell`, `spell.epics`)
 */
const LOWERCASE_SPELL = /(?<![\w@#/.-])spell(?![\w@#/-]|\.[A-Za-z])/g

/**
 * what a reader doesn't take for words, blanked out of a page's prose by `runningTextOf()`
 * - an HTML comment, which may run over lines, and HTML's own code (`<code>`, `<pre>`)
 * - an HTML tag with its attributes, and an autolink (`<https://...>`)
 * - a link or image target, a bare URL, and a reference link's definition and label
 */
const NOT_RUNNING_TEXT = new RegExp(
  [
    String.raw`<!--[\s\S]*?-->`,
    String.raw`<(code|pre)\b[^>]*>[\s\S]*?</\1\s*>`,
    String.raw`</?[A-Za-z][\w:-]*(?:\s+[\w:.@-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>]+))?)*\s*/?>`,
    String.raw`<[A-Za-z][\w+.-]*:[^\s<>]*>`,
    String.raw`\]\([^)]*\)`,
    String.raw`\b(?:(?:https?|ftp|file)://|mailto:|www\.)[^\s<>]+`,
    String.raw`^ {0,3}\[(?!\^)[^\]]+\]:.*`,
    String.raw`\]\[[^\]]*\]`
  ].join("|"),
  "gim"
)

/**
 * a link to a file or folder of one of our repos on GitHub's `main`:  `[1]` the repo, `[2]` the path (and anchor)
 * - a page links ANOTHER repo's file this way, since each repo stands alone on GitHub
 */
const OUR_GITHUB = /^https:\/\/github\.com\/spell-app\/([\w.-]+)\/(?:blob|tree|raw)\/main\/(.+)$/

/** an import alias, `$/name`:  the end state has none (repo-split P14) */
const ALIAS = /\$\/[a-z]/i

/** The banned and stale words, each with its rule and message. */
const WORDS: Array<{ pattern: RegExp; rule: Rule; message: string }> = [
  { pattern: /\bpackages\//, rule: "word", message: "the old monorepo folder" },
  { pattern: /@spell-app\//, rule: "word", message: "an old scoped package name" },
  { pattern: /\bmonorepo\b/i, rule: "word", message: "Spell is six repos now" },
  { pattern: /\bplan docs?\b/i, rule: "word", message: `write "epic page"` },
  { pattern: /\bFomantic(?: UI)? reborn\b/i, rule: "word", message: "Spell UI's old lede" },
  { pattern: /\bthe fork\b/i, rule: "word", message: "name the thing by what it is" },
  { pattern: /\bspell-hub\b/, rule: "word", message: "an old repo name" },
  { pattern: /\bspell-spaces\b/, rule: "word", message: "an old repo name" },
  { pattern: /\.compiled\.js\b/, rule: "word", message: "compiled output is `.output.js`" },
  { pattern: ALIAS, rule: "word", message: "an import alias outside an 'Until repo-split' fold" },
  // what repo-split P14's last step deletes:  the finished layout has none of them
  {
    pattern: /\bUntil repo-split\b/i,
    rule: "word",
    message: "repo-split is finished:  describe the finished layout, no 'Until' fold"
  },
  {
    pattern: /\bspell-folders\b|\bspellFolders\b/,
    rule: "word",
    message: "deleted with repo-split P14: one tsconfig, one Vitest config of projects"
  },
  {
    pattern: /toolchain\/aliases\b|\balias hook\b|\brun-time alias\b/i,
    rule: "word",
    message: "the run-time alias hook is deleted: every import is a package name"
  },
  { pattern: /\bno-cross-(?:repo-alias|package-import)\b/, rule: "word", message: "the alias lint rules are deleted" },
  { pattern: /\bpackModuleKey\b/, rule: "word", message: "gone: a pack's module key is its npm name (spell/ui/core)" },
  { pattern: /\bspell dev\b/, rule: "word", message: "the command is gone (repo-split P13)" },
  { pattern: /\bsix (?:git )?repos\b/i, rule: "word", message: "five public repos" },
  {
    pattern: /\bepic (?:new|check|stock)\b|\bepic inbox (?:listen|unlisten)\b|\bepic window stay-check\b/,
    rule: "word",
    message: "renamed in repo-split P13: epic create / lint / status, inbox watch / ignore, window should-stay"
  },
  { pattern: /@spell\/examples\/todos(?![-\w])/, rule: "example", message: "deleted:  todos-form-based" },
  {
    pattern: /examples\/solitaire(?![-\w])/,
    rule: "example",
    message: "deleted:  now Solitaire, with a capital S"
  },
  {
    pattern: /examples\/(?:drawable|outline)-solitaire\b/,
    rule: "example",
    message: "deleted (epic spanish P11):  one example now, Solitaire, and its Spanish twin, Solitario"
  },
  {
    pattern: /@spell\/test\/(?:cards-from-zero|card-table|klondike|drawable-solitaire|outline-solitaire)(?![-\w])/,
    rule: "example",
    message: "deleted (epic spanish P11):  Solitaire, tested as it is, holds their cards"
  },
  {
    pattern: /@spell\/test\/cards(?![-\w])/,
    rule: "example",
    message:
      "deleted (epic spanish J105):  the import tests' pair is @spell/test/counter, which @spell/test/counter-app imports"
  },
  // the fixture page names a bare `@spell/test/solitaire` beside a stale example:  match its GitHub path form
  {
    pattern: /@spell\/library\/cards\b|@spell\/test\/cartas\b|spaces\/@spell\/test\/solitaire\b|<cards-card\b/,
    rule: "example",
    message: "deleted (epic spanish P21):  the cards are Solitaire's own files;  the examples are tested as they are"
  },
  { pattern: /\bsolitaire-import\b/, rule: "example", message: "deleted" },
  {
    pattern: /\b(?:util|assembler|element|spell|docs|site|tools|src|vscode|cli)\/readme\.md\b/i,
    rule: "deleted-readme",
    message: "folded into a README-<folder>.md page and deleted"
  }
]

////////////////
// ## Helpers
////////////////

/** A root page's topic:  `README-cli.md` => `cli`. */
function topicOf(name: string): string {
  return name.replace(/^README-|\.md$/g, "")
}

/** The names in `folder`;  none when it isn't a folder. */
function readdir(folder: string): string[] {
  return statSync(folder).isDirectory() ? readdirSync(folder) : []
}

/**
 * Does an `sh` block's text (`body`, its lines between the fences) end in output written as `#` lines:  its last line
 * a `#` line, after a command?
 * - a block of commented commands (`# build`, then `yarn build`) ends in a command, so it isn't flagged
 * - a command's trailing comment (`yarn clone spell-ui   # spell-ui alone`) isn't a `#` line
 */
function endsInOutput(body: string[]): boolean {
  const lines = body.map((line) => line.trim()).filter(Boolean)
  const last = lines.at(-1)
  return !!last && last.startsWith("#") && lines.some((line) => !line.startsWith("#"))
}

/** Is the next paragraph after `start` an italic caption (`_..._` or `*...*`), on one line or two? */
function hasCaption(lines: string[], start: number): boolean {
  let index = start
  while (index < lines.length && lines[index].trim() === "") index++
  // the caption's paragraph:  it may run over two lines
  const paragraph: string[] = []
  while (index < lines.length && lines[index].trim() !== "") paragraph.push(lines[index++].trim())
  const caption = paragraph.join(" ")
  return /^_[^_].*_$/.test(caption) || /^\*[^*].*\*$/.test(caption)
}

/** `lines` with fenced code blocks emptied and inline code blanked:  the text links are read from. */
function proseOf(lines: string[]): string {
  let fence: string | undefined
  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (fence) {
        if (trimmed.startsWith(fence) && trimmed.replace(/[`~]/g, "") === "") fence = undefined
        return ""
      }
      const opening = /^\s*(`{3,}|~{3,})/.exec(line)
      if (opening) {
        fence = opening[1]
        return ""
      }
      // an inline code span:  a run of backticks, closed by a run just as long (`` `x` `` holds single ones)
      return line.replace(/(?<!`)(`+)(?!`)(.*?[^`])\1(?!`)/g, (code) => " ".repeat(code.length))
    })
    .join("\n")
}

/**
 * `prose` (from `proseOf()`) with what isn't running text blanked as well:  the text a reader takes for words.
 * - Blanks `NOT_RUNNING_TEXT`, each character to a space and each newline kept:  a line is the same line after.
 */
function runningTextOf(prose: string): string {
  return prose.replace(NOT_RUNNING_TEXT, (part) => part.replace(/[^\n]/g, " "))
}

/** The line (from 1) that `offset` falls on in `text`. */
function lineAt(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length
}

/** The lines (from 1) of `text` where `pattern` (global) matches, each once. */
function linesMatching(text: string, pattern: RegExp): number[] {
  return [...new Set([...text.matchAll(pattern)].map((match) => lineAt(text, match.index)))]
}

/** Every link target in `prose`, with its offset:  Markdown links and images, reference definitions, `href` / `src`. */
function linksIn(prose: string): Array<{ target: string; offset: number }> {
  const links: Array<{ target: string; offset: number }> = []
  const patterns = [
    /!?\[(?:[^\][]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g,
    /^ {0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/gm,
    /\b(?:href|src)="([^"]+)"/g
  ]
  for (const pattern of patterns) {
    for (const match of prose.matchAll(pattern)) links.push({ target: match[1], offset: match.index })
  }
  return links.sort((a, b) => a.offset - b.offset)
}

/** `target` split at its `#`:  the file (empty for the page itself) and the anchor, decoded. */
function splitAnchor(target: string): [string, string | undefined] {
  const hash = target.indexOf("#")
  const file = hash < 0 ? target : target.slice(0, hash)
  const anchor = hash < 0 ? undefined : target.slice(hash + 1)
  return [decodeURIComponent(file), anchor === undefined ? undefined : decodeURIComponent(anchor)]
}

/**
 * Every anchor a page offers:  its headings' slugs, as GitHub makes them, and any `id` / `name` in its HTML.
 * - GitHub's slug:  the heading's text, lower-cased, everything but letters, digits, `_`, `-` and spaces dropped,
 *   spaces made `-`;  a repeat gets `-1`, `-2` ...
 */
export function anchorsOf(text: string): Set<string> {
  const anchors = new Set<string>()
  const counts = new Map<string, number>()
  let fence: string | undefined
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (fence) {
      if (trimmed.startsWith(fence) && trimmed.replace(/[`~]/g, "") === "") fence = undefined
      continue
    }
    const opening = /^\s*(`{3,}|~{3,})/.exec(line)
    if (opening) {
      fence = opening[1]
      continue
    }
    for (const match of line.matchAll(/\b(?:id|name)="([^"]+)"/g)) anchors.add(match[1].toLowerCase())
    const heading = /^ {0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line)
    if (!heading) continue
    const slug = slugFor(heading[1])
    const count = counts.get(slug) ?? 0
    counts.set(slug, count + 1)
    anchors.add(count ? `${slug}-${count}` : slug)
  }
  return anchors
}

/** A heading's GitHub slug:  `"🌱 Coming:  npm"` => `"-coming--npm"`. */
export function slugFor(heading: string): string {
  // code spans keep their text (`<ui-root>` => "ui-root");  HTML tags and emphasis outside them go
  const text = heading
    .split(/(`+[^`]*?`+)/)
    .map((part) =>
      part.startsWith("`")
        ? part
        : part
            .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/<[^>]+>/g, "")
            .replace(/(^|[^\w])_(.+?)_(?=[^\w]|$)/g, "$1$2")
    )
    .join("")
  return slug(text, { as: "github" })
}

if (import.meta.main) process.exitCode = new ReadmeCheck().main(process.argv.slice(2))
