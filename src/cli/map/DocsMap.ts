import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, extname, join, posix } from "node:path"

import { contentFolderOf } from "spell/server/contentFolder"

import { MAP_FOLDER, MAP_ORIGIN, type MapGraph, type MapLink, type MapNode, type MappedRepo } from "./map.types"

/****************
 * ### `DocsMap`
 * The docs map:  every page people read, in ONE graph, read by STRUCTURE, with no model and no graphify:
 * so it's free, and rebuilt in seconds.
 * - Its pages:
 *   - the content folder's epic pages (with their part files), guides, saga pages and the docs' home pages
 *   - each repo's READMEs, `AGENTS.md` files, skills and `docs/` pages
 * - What it knows of each page:  its title, its headings (an epic page's sections, phases and items too), the pages it
 *   links to, and every code name it mentions (`<code>PrefStore</code>`, `` `readJSON5File()` ``).
 * - So it answers "which pages say X?" (`spell map explain X --docs`) and "which pages link here?";
 *   NOT what a page is about:  that's graphify's own reading, by a model (epic `coherence` C3).
 * - Written to the checkout's `graphify-out/docs.json`, in graphify's shape, so graphify's questions run on it.
 ****************/
export class DocsMap {
  constructor(
    readonly checkout: string,
    readonly repos: MappedRepo[],
    readonly contentFolder: string | undefined = contentFolderOf(checkout)
  ) {}

  /** The map's file, in the checkout's root. */
  get file(): string {
    return join(this.checkout, MAP_FOLDER, DOCS_FILE)
  }

  /**
   * Every page it maps:  absolute paths, each with the name it goes by in the map.
   * - The content folder's pages go by `spell.epics/...`;  a repo's by its path from the checkout's root.
   */
  get pages(): Array<{ path: string; source: string }> {
    const pages: Array<{ path: string; source: string }> = []
    if (this.contentFolder) {
      for (const file of trackedFiles(this.contentFolder))
        if (CONTENT_PAGE.test(file) && !file.includes("/parts/"))
          pages.push({ path: join(this.contentFolder, file), source: `${CONTENT_NAME}/${file}` })
    }
    for (const repo of this.repos)
      for (const file of trackedFiles(repo.root))
        if (REPO_PAGE.test(file)) pages.push({ path: join(repo.root, file), source: join(repo.folder, file) })
    return pages
  }

  /** Read every page, and write the map. */
  build(): MapGraph {
    const graph = this.read(this.pages)
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(graph))
    return graph
  }

  /**
   * `pages`, read into a map:  a node per page, heading and name;  links between them.
   * - NEVER throws for a page it can't read:  it's left out.
   */
  read(pages: Array<{ path: string; source: string }>): MapGraph {
    const nodes = new Map<string, MapNode>()
    const links: MapLink[] = []
    const bySource = new Map(pages.map((page) => [page.source, page]))
    for (const page of pages) {
      const text = readText(page.path)
      if (text === undefined) continue
      const pageNode = addNode(nodes, {
        id: `page:${page.source}`,
        label: titleOf(text, page.source),
        file_type: "document",
        source_file: page.source
      })
      for (const section of sectionsOf(text, page.path)) {
        const host = section.id
          ? addNode(nodes, {
              id: `${pageNode.id}#${section.id}`,
              label: section.title,
              file_type: "document",
              source_file: page.source,
              source_location: `#${section.id}`
            })
          : pageNode
        if (host !== pageNode) links.push(docLink(pageNode, host.id, "contains"))
        for (const name of namesIn(section.text)) {
          const nameNode = addNode(nodes, { id: `name:${name}`, label: name, file_type: "concept" })
          links.push(docLink(host, nameNode.id, "mentions"))
        }
        for (const target of linksIn(section.text, page.source, bySource))
          links.push(docLink(host, `page:${target}`, "links_to"))
      }
    }
    // a link to a page that has no node (left out, or unreadable) goes
    return { directed: true, nodes: [...nodes.values()], links: dedupe(links).filter((each) => nodes.has(each.target)) }
  }
}

/** The docs map's file name, in the checkout's `graphify-out/`. */
const DOCS_FILE = "docs.json"

/** What the content folder's pages go by in the map:  the folder's name in every checkout. */
const CONTENT_NAME = "spell.epics"

/**
 * The content folder's pages the map reads, by path in it.
 * - NOT `windows/`, nor the folders other checkouts still read (`ui/`, `goals/`, `packages/`):  they repeat pages.
 */
const CONTENT_PAGE = /^(epics|guides|sagas|pages|brand|agents)\/.*\.(html|md)$|^README\.md$/

/** A repo's pages the map reads:  READMEs, `AGENTS.md` files, skills, `docs/` pages. */
const REPO_PAGE = /(^|\/)(README[^/]*\.md|AGENTS\.md|SKILL\.md)$|^docs\/.*\.(html|md)$/

/**
 * A code name in a page:  one word, a call, a path or a tag, 2-80 characters:
 * `PrefStore`, `readJSON5File()`, `spell/util/node/json5`, `<ui-section>`.
 */
const CODE_NAME = /^<?[\w$@.:/#-]{2,80}(\(\))?>?$/

/**
 * A page's sections:  the text before its first heading, then each heading and the text under it.
 * - An epic page's sections, phases and items (an element with an `id` and a `title`) are headings too, their text
 *   their part file's (`source="parts/p2.html"`).
 */
function sectionsOf(text: string, path: string): Array<{ id?: string; title: string; text: string }> {
  const marks: Array<{ at: number; id: string; title: string; part?: string }> = []
  for (const match of text.matchAll(HTML_HEADING))
    marks.push({ at: match.index!, id: attribute(match[0], "id") ?? slug(plain(match[2]!)), title: plain(match[2]!) })
  for (const match of text.matchAll(MD_HEADING))
    marks.push({ at: match.index!, id: slug(match[2]!), title: match[2]!.trim() })
  for (const match of text.matchAll(TITLED_ELEMENT)) {
    const id = attribute(match[0], "id")
    const title = attribute(match[0], "title") ?? attribute(match[0], "header")
    if (id && title) marks.push({ at: match.index!, id, title: plain(title), part: attribute(match[0], "source") })
  }
  marks.sort((a, b) => a.at - b.at)
  const sections: Array<{ id?: string; title: string; text: string }> = [
    { title: "", text: text.slice(0, marks[0]?.at ?? text.length) }
  ]
  marks.forEach((mark, index) => {
    const own = text.slice(mark.at, marks[index + 1]?.at ?? text.length)
    const part = mark.part && readText(join(dirname(path), mark.part))
    sections.push({ id: mark.id, title: mark.title, text: part ? `${own}\n${part}` : own })
  })
  return sections
}

/** `<h1>` to `<h4>`, with what's inside. */
const HTML_HEADING = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/g

/** `#` to `####` at a line's start. */
const MD_HEADING = /^(#{1,4})\s+(.+)$/gm

/** An element with an `id` and a `title` or `header` (an epic page's sections, `<ui-section header>`). */
const TITLED_ELEMENT = /<(?:epic|ui)-[a-z-]+\b[^>]*\bid="[^"]+"[^>]*>/g

/** The code names `text` mentions, bare:  `readJSON5File()` => `readJSON5File`. */
function namesIn(text: string): string[] {
  const found = new Set<string>()
  const add = (raw: string) => {
    const name = plain(raw).trim()
    if (CODE_NAME.test(name)) found.add(name.replace(/\(\)$/, ""))
  }
  for (const match of text.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)) add(match[1]!)
  for (const match of text.matchAll(/`([^`\n]+)`/g)) add(match[1]!)
  return [...found]
}

/**
 * The pages `text` links to, as each goes by in the map:  `href`s, Markdown links and `<epic-link epic>`s, from
 * page `from`.
 * - Only links to pages the map has (`bySource`);  a web address, or a link within the page, is left out.
 */
function linksIn(text: string, from: string, bySource: Map<string, unknown>): string[] {
  const found = new Set<string>()
  const add = (href: string) => {
    if (/^(\w+:|#|\/)/.test(href)) return
    const target = posix.normalize(posix.join(posix.dirname(from), href.replace(/[#?].*$/, "")))
    if (bySource.has(target)) found.add(target)
  }
  for (const match of text.matchAll(/\bhref="([^"]+)"/g)) add(match[1]!)
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) add(match[1]!)
  for (const match of text.matchAll(/<epic-link\b[^>]*\bepic="([\w-]+)"/g)) {
    const epic = `${CONTENT_NAME}/epics/${match[1]}/${match[1]}.plan.html`
    if (bySource.has(epic)) found.add(epic)
  }
  return [...found]
}

/** A page's title:  its `<title>`, else its first `#` heading, else its file name. */
function titleOf(text: string, source: string): string {
  const title = /<title>([\s\S]*?)<\/title>/.exec(text)?.[1] ?? /^#\s+(.+)$/m.exec(text)?.[1]
  return title ? plain(title).trim() : posix.basename(source)
}

/** `node`, added to `nodes` once;  the one already there when its id is taken. */
function addNode(nodes: Map<string, MapNode>, node: MapNode): MapNode {
  const there = nodes.get(node.id)
  if (there) return there
  nodes.set(node.id, { ...node, _origin: MAP_ORIGIN })
  return nodes.get(node.id)!
}

/** A docs-map link, from `from` to the node `to` names. */
function docLink(from: MapNode, to: string, relation: string): MapLink {
  return {
    source: from.id,
    target: to,
    relation,
    confidence: "EXTRACTED",
    source_file: from.source_file,
    _origin: MAP_ORIGIN
  }
}

/** `links`, each source, target and relation once. */
function dedupe(links: MapLink[]): MapLink[] {
  const seen = new Set<string>()
  return links.filter((each) => {
    const key = `${each.source}\0${each.target}\0${each.relation}`
    return seen.has(key) ? false : (seen.add(key), true)
  })
}

/** An attribute's value in a start tag;  `undefined` when it has none. */
function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1]
}

/** `html` as plain text:  tags gone, the common entities read. */
function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
}

/** A heading's anchor, from its text:  `How it works` => `how-it-works`. */
function slug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** The files git tracks in the repo at `root`, from its root;  none when it isn't one. */
function trackedFiles(root: string): string[] {
  if (!existsSync(root)) return []
  try {
    return execFileSync("git", ["-C", root, "ls-files"], { encoding: "utf8", maxBuffer: 1 << 28 })
      .split("\n")
      .filter((file) => file && [".html", ".md"].includes(extname(file)))
  } catch {
    return []
  }
}

/** A file's text;  `undefined` when it can't be read. */
function readText(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return undefined
  }
}
