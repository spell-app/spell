/**
 * `tools/mermaid-pretty.ts`:  gives every Mermaid picture in the READMEs the Spell look, in place
 * (`yarn mermaid:pretty` at the kit's root;  epic `readme` T1).
 * - Writers draw a PLAIN diagram;  this adds the look, so every page's pictures match:
 *   - a `%%{init: ...}%%` directive on the block's first line:  the Spell theme (`THEMES`)
 *   - for a flowchart, `classDef` lines for the five kinds of node (`KINDS`), and a `class` line putting each node
 *     in its kind, by what its id or label names (`kindFor()`)
 * - Idempotent:  a block it already styled is restyled, never styled twice;  everything it adds sits on the
 *   directive line and below the `%% the Spell look` line, which it drops and writes again.
 * - Node 24 runs it as is (its types stripped):  node's own modules only, as `tools/repos.ts`.
 *
 * ```sh
 * yarn mermaid:pretty                  # every page the README check walks
 * yarn mermaid:pretty README.md ...    # only those files (paths from the kit's root)
 * yarn mermaid:pretty --dark ...       # the dark variant of the theme, for a page that's only ever shown dark
 * yarn mermaid:pretty --check          # change nothing;  exit 1 if a block isn't styled as it would be
 * ```
 */
import { readFileSync, writeFileSync } from "node:fs"
import { relative, resolve } from "node:path"

import { ReadmeCheck } from "./readme-check.ts"

/****************
 * ### `MermaidPretty`
 * Restyles the Mermaid blocks of a Markdown page.
 * - Only what's inside a ```` ```mermaid ```` fence changes;  the rest of the page is left byte for byte.
 ****************/
export class MermaidPretty {
  /** which theme it writes */
  readonly theme: ThemeName

  constructor(theme: ThemeName = "light") {
    this.theme = theme
  }

  /** `text`, a Markdown page, with every Mermaid block restyled. */
  page(text: string): string {
    return text.replace(MERMAID_BLOCK, (_block, open: string, body: string, close: string) => {
      return `${open}${this.block(body)}${close}`
    })
  }

  /** One block's source (between its fences, with its newlines), restyled. */
  block(body: string): string {
    const lines = plainLines(body)
    const kind =
      lines
        .find((line) => line.trim())
        ?.trim()
        .split(/\s+/)[0] ?? ""
    const styled = [directiveFor(this.theme, kind), ...lines]
    if (FLOWCHART.test(kind)) styled.push(...this.classLines(lines))
    return `${styled.join("\n")}\n`
  }

  /** The `classDef` and `class` lines for a flowchart's `lines`:  only the kinds it uses. */
  classLines(lines: string[]): string[] {
    const byKind = new Map<Kind, string[]>()
    for (const [id, label] of nodesIn(lines)) {
      const kind = kindFor(id, label)
      if (kind) byKind.set(kind, [...(byKind.get(kind) ?? []), id])
    }
    const colors = THEMES[this.theme]
    const out = [LOOK_MARKER, `  classDef default ${colors.node}`]
    for (const kind of KIND_NAMES) {
      if (byKind.has(kind)) out.push(`  classDef ${kind} ${colors.kinds[kind]}`)
    }
    for (const kind of KIND_NAMES) {
      const ids = byKind.get(kind)
      if (ids) out.push(`  class ${ids.join(",")} ${kind}`)
    }
    return out
  }

  /** The command line:  `node tools/mermaid-pretty.ts [--dark] [--check] [file ...]`;  the exit status. */
  static main(args: string[]): number {
    const pretty = new MermaidPretty(args.includes("--dark") ? "dark" : "light")
    const check = args.includes("--check")
    const names = args.filter((arg) => !arg.startsWith("--"))
    const files = names.length ? names.map((name) => resolve(process.cwd(), name)) : new ReadmeCheck().pages()
    const changed: string[] = []
    for (const file of files) {
      const text = readFileSync(file, "utf8")
      const styled = pretty.page(text)
      if (styled === text) continue
      changed.push(file)
      if (!check) writeFileSync(file, styled)
    }
    for (const file of changed) console.log(`${check ? "not styled" : "styled"}  ${relative(process.cwd(), file)}`)
    console.log(`${files.length} files, ${changed.length} ${check ? "not styled" : "restyled"}`)
    return check && changed.length ? 1 : 0
  }
}

////////////////
// ## The look
////////////////

/** A theme's name:  `light` reads on GitHub's light AND dark pages (light boxes, mid-tone lines);  `dark` is darker */
export type ThemeName = "light" | "dark"

/** The kinds of node a flowchart's nodes are sorted into, each with its own colours. */
export type Kind = "repo" | "folder" | "step" | "data" | "coming"

/** the kinds, in the order their lines are written */
const KIND_NAMES: Kind[] = ["repo", "folder", "step", "data", "coming"]

/** Spell Purple, the brand's seed (spell-brand's palette), and its ink */
const PURPLE = "#6550CA"
const INK = "#1A1C27"

/** the system's sans-serif:  no quotes, so the directive stays plain JSON */
const FONT = "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif"

/**
 * The two themes:  Mermaid's `base` theme's variables, a flowchart's default node style and each kind's.
 * - `light`, the default:  every text sits on a light box (nodes, edge labels, notes, subgraphs), and what sits on the
 *   page itself (lines, a sequence diagram's messages) is a mid-tone purple, so it reads on light and dark pages.
 */
const THEMES: Record<ThemeName, { variables: Record<string, string>; node: string; kinds: Record<Kind, string> }> = {
  light: {
    variables: {
      fontFamily: FONT,
      fontSize: "15px",
      primaryColor: "#EFECFB",
      primaryBorderColor: PURPLE,
      primaryTextColor: INK,
      secondaryColor: "#F4F1E9",
      tertiaryColor: "#F7F6FC",
      lineColor: "#7F6FD6",
      textColor: "#7F6FD6",
      clusterBkg: "#F7F6FC",
      clusterBorder: "#B9B0E8",
      titleColor: INK,
      edgeLabelBackground: "#F7F6FC",
      actorBkg: "#EFECFB",
      actorBorder: PURPLE,
      actorTextColor: INK,
      actorLineColor: "#9C90DE",
      signalColor: "#7F6FD6",
      signalTextColor: "#7F6FD6",
      labelBoxBkgColor: "#EFECFB",
      labelBoxBorderColor: PURPLE,
      labelTextColor: INK,
      loopTextColor: "#7F6FD6",
      noteBkgColor: "#F1E7D4",
      noteBorderColor: "#C9B48A",
      noteTextColor: INK,
      activationBkgColor: "#DCD6F7",
      activationBorderColor: PURPLE,
      sequenceNumberColor: "#FFFFFF"
    },
    node: `fill:#EFECFB,stroke:${PURPLE},stroke-width:1.5px,color:${INK},rx:8px,ry:8px`,
    kinds: {
      repo: `fill:${PURPLE},stroke:#4A3AA0,stroke-width:2px,color:#FFFFFF,rx:10px,ry:10px,font-weight:600`,
      folder: `fill:#E6EAF5,stroke:#8E96B5,stroke-width:1.5px,color:${INK},rx:4px,ry:4px`,
      step: `fill:#EFECFB,stroke:${PURPLE},stroke-width:1.5px,color:${INK},rx:16px,ry:16px`,
      data: `fill:#F1E7D4,stroke:#C9B48A,stroke-width:1.5px,color:${INK},rx:2px,ry:2px`,
      coming: `fill:#F2F7EE,stroke:#7BA05B,stroke-width:1.5px,stroke-dasharray:5 4,color:#3D5A2A,rx:8px,ry:8px`
    }
  },
  dark: {
    variables: {
      fontFamily: FONT,
      fontSize: "15px",
      darkMode: "true",
      background: "#16141F",
      primaryColor: "#2B2550",
      primaryBorderColor: "#9C8EF0",
      primaryTextColor: "#EEEBFA",
      secondaryColor: "#2E2A22",
      tertiaryColor: "#1F1C2E",
      lineColor: "#9C8EF0",
      textColor: "#D9D3F7",
      clusterBkg: "#1F1C2E",
      clusterBorder: "#5A4FA0",
      titleColor: "#EEEBFA",
      edgeLabelBackground: "#1F1C2E",
      actorBkg: "#2B2550",
      actorBorder: "#9C8EF0",
      actorTextColor: "#EEEBFA",
      actorLineColor: "#6F63C0",
      signalColor: "#9C8EF0",
      signalTextColor: "#D9D3F7",
      labelBoxBkgColor: "#2B2550",
      labelBoxBorderColor: "#9C8EF0",
      labelTextColor: "#EEEBFA",
      loopTextColor: "#D9D3F7",
      noteBkgColor: "#3A3326",
      noteBorderColor: "#8A7A58",
      noteTextColor: "#F1E7D4",
      activationBkgColor: "#3A3270",
      activationBorderColor: "#9C8EF0",
      sequenceNumberColor: "#16141F"
    },
    node: `fill:#2B2550,stroke:#9C8EF0,stroke-width:1.5px,color:#EEEBFA,rx:8px,ry:8px`,
    kinds: {
      repo: `fill:${PURPLE},stroke:#B7ADF5,stroke-width:2px,color:#FFFFFF,rx:10px,ry:10px,font-weight:600`,
      folder: `fill:#252A3A,stroke:#8E96B5,stroke-width:1.5px,color:#E6EAF5,rx:4px,ry:4px`,
      step: `fill:#2B2550,stroke:#9C8EF0,stroke-width:1.5px,color:#EEEBFA,rx:16px,ry:16px`,
      data: `fill:#3A3326,stroke:#8A7A58,stroke-width:1.5px,color:#F1E7D4,rx:2px,ry:2px`,
      coming: `fill:#1F2A1A,stroke:#7BA05B,stroke-width:1.5px,stroke-dasharray:5 4,color:#CFE3BF,rx:8px,ry:8px`
    }
  }
}

/** The `%%{init: ...}%%` line for `theme`, for a diagram of `kind` (`flowchart`, `sequenceDiagram` ...). */
function directiveFor(theme: ThemeName, kind: string): string {
  const config: Record<string, unknown> = { theme: "base", themeVariables: THEMES[theme].variables }
  if (FLOWCHART.test(kind)) config.flowchart = { curve: "basis", padding: 12, nodeSpacing: 40, rankSpacing: 44 }
  if (kind === "sequenceDiagram") config.sequence = { mirrorActors: false, messageAlign: "left", noteAlign: "left" }
  return `%%{init: ${JSON.stringify(config)}}%%`
}

/**
 * The kind of node `id`, labelled `label`, is:  by what it names.
 * - `repo`:  its label starts with a repo's name (`spell-lang: ...`, `spell-kit<br/>...`, "the kit"), or its id is one
 * - `coming`:  its label starts with 🌱, or ends with "coming"
 * - `step`:  its label starts with a step's number (`1 · ...`, `2. ...`)
 * - `folder`:  its label's first word is a folder (`docs/`, `~/www/spell`)
 * - `data`:  its label's first word is a file (`.epic/config.json5`, `AGENTS.md`)
 * - none of these:  the default look
 */
export function kindFor(id: string, label: string): Kind | undefined {
  const text = label.replace(/<br\s*\/?>/gi, " ").trim()
  if (/^🌱/u.test(text) || /\bcoming\W*$/i.test(text)) return "coming"
  if (REPO_LABEL.test(text) || REPO_IDS.has(text)) return "repo"
  if (/^\d+\s*(·|\.|\))\s/.test(text)) return "step"
  const first = text.split(/[\s:]/)[0]
  if (/^(~|\.?[\w@-]+)(\/[\w@.-]*)*\/$/.test(first) || /^~\//.test(first)) return "folder"
  if (/^[\w.@/-]*\.(json5?|md|js|ts|tsx|css|html|spell|py|txt)$/i.test(first)) return "data"
  return id === "data" ? "data" : undefined
}

/** a label that starts with a repo's name, not one of its packages (`spell-lang/core` isn't a repo) */
const REPO_LABEL = /^(spell-(kit|lang|ui|brand|epic|app)|the kit)(?![/\w'’-])/i

/** the repos' names as a whole label */
const REPO_IDS = new Set(["spell-kit", "spell-lang", "spell-ui", "spell-brand", "spell-epic", "spell-app"])

////////////////
// ## Parsing
////////////////

/** a Mermaid block:  its opening fence line, its body, its closing fence */
const MERMAID_BLOCK = /^(\s*```mermaid[^\n]*\n)([\s\S]*?)(^\s*```\s*$)/gm

/** a flowchart's first word */
const FLOWCHART = /^(flowchart|graph)$/

/** the line above what this tool adds to a flowchart:  everything below it is dropped and written again */
const LOOK_MARKER = "  %% the Spell look:  yarn mermaid:pretty"

/** A block's own lines:  without the directive and the look this tool added before. */
function plainLines(body: string): string[] {
  const lines = body.replace(/\n$/, "").split("\n")
  const marker = lines.findIndex((line) => line.trim() === LOOK_MARKER.trim())
  const own = marker < 0 ? lines : lines.slice(0, marker)
  return own.filter((line) => !/^\s*%%\{\s*init\s*:/.test(line))
}

/** Every node a flowchart's `lines` define, with its label (the first one given):  `id[label]`, `id((label))` ... */
function nodesIn(lines: string[]): Map<string, string> {
  const nodes = new Map<string, string>()
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^(subgraph|end|classDef|class|style|linkStyle|click|%%|flowchart|graph|direction)\b/.test(trimmed)) continue
    for (const match of trimmed.matchAll(NODE)) {
      const id = match[1]
      const label = (match[3] ?? match[4] ?? "").trim()
      if (!nodes.has(id)) nodes.set(id, label)
    }
  }
  return nodes
}

/** a node with a label:  its id, its opening bracket, then the label, quoted or not */
const NODE = /(?:^|[\s&>|-])([A-Za-z_][\w]*)\s*(\(\(|\[\[|\[\(|\{\{|[[({>])\s*(?:"([^"]*)"|([^\])}"]*))/g

if (import.meta.main) process.exitCode = MermaidPretty.main(process.argv.slice(2))
