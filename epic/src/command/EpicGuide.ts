import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"

/****************
 * ### `EpicGuide`
 * `epic guide [<topic>] [--list] [--path]`:  the epic workflow in plain steps, for ANY agent (epic `epic-friend` P11):
 * find the epic, plan, build each phase, take what the person sends, end each turn, finish.
 *
 * - ONE copy of the words:  the epic skill's own [guide.md](../../skills/epic/guide.md), beside its `SKILL.md`, which
 *   links it;  this only prints it, by topic.
 * - Its topics are the file's `## <topic> -- <title>` sections;  the text before the first is its lead.
 * - No topic:  the lead, the `workflow` topic, and the list of the rest.
 * - `claude-only-tools`:  what each Claude Code tool the skills lean on is for, and the plain way any agent does it
 *   instead (Q15:  the next phase's skills point at it).
 * - Throws `EpicCommandError` for a topic the guide hasn't got, listing those it has.
 ****************/
export class EpicGuide {
  /** the guide's file */
  readonly file: string

  constructor({ file = GUIDE_FILE }: { file?: string } = {}) {
    this.file = file
  }

  /** Run `epic guide <args>`;  resolves to the exit code. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["list", "path"])
    if (flags.path) return this.print(this.file)
    if (flags.list)
      return this.print(this.topics.map(({ id, title }) => `${id.padEnd(TOPIC_WIDTH)} ${title}`).join("\n"))
    return this.print(this.text(positional[0]))
  }

  /** The guide's topics, in order:  each `## <id> -- <title>` section, its text with its heading. */
  get topics(): GuideTopic[] {
    return EpicGuide.parse(readFileSync(this.file, "utf8")).topics
  }

  /**
   * What `epic guide [<topic>]` prints:  that topic's section;  none, the lead, `workflow` and the list of topics.
   * - throws `EpicCommandError` (exit 2) for a topic it hasn't got
   */
  text(topicId?: string): string {
    const { lead, topics } = EpicGuide.parse(readFileSync(this.file, "utf8"))
    if (topicId !== undefined) {
      const topic = topics.find((each) => each.id === topicId.toLowerCase())
      if (!topic)
        throw new EpicCommandError(
          `epic guide ${topicId}?  no such topic.  The topics:  ${topics.map((each) => each.id).join(", ")}`
        )
      return topic.text
    }
    const workflow = topics.find((each) => each.id === FIRST_TOPIC)
    const rest = topics.filter((each) => each !== workflow)
    return [
      lead,
      ...(workflow ? [workflow.text] : []),
      [
        "More, by topic (epic guide <topic>):",
        ...rest.map(({ id, title }) => `  ${id.padEnd(TOPIC_WIDTH)} ${title}`)
      ].join("\n")
    ].join("\n\n")
  }

  /** `markdown`, the guide's file, as its lead (before the first topic) and its topics. */
  static parse(markdown: string): { lead: string; topics: GuideTopic[] } {
    const [lead = "", ...sections] = markdown.split(/^(?=## )/m)
    const topics = sections.flatMap((section): GuideTopic[] => {
      const match = TOPIC_HEADING.exec(section)
      return match ? [{ id: match[1]!.toLowerCase(), title: match[2]!.trim(), text: section.trim() }] : []
    })
    return { lead: lead.trim(), topics }
  }

  /** Print `text`;  0. */
  private print(text: string): number {
    process.stdout.write(`${text}\n`)
    return EXIT.OK
  }
}

/** One topic of the guide. */
export type GuideTopic = {
  /** its name on the command line:  `claude-only-tools` */
  id: string
  /** what it's about:  `What Claude Code has, and what any agent does instead` */
  title: string
  /** its section, heading and all, as written */
  text: string
}

/** The guide:  the epic skill's `guide.md`, in the plugin's `skills/epic/`. */
const GUIDE_FILE = join(dirname(dirname(import.meta.dirname)), "skills", "epic", "guide.md")

/** A topic's heading:  `## build -- Build a phase`. */
const TOPIC_HEADING = /^## ([\w-]+) -- (.+)$/m

/** The topic `epic guide` prints with its lead. */
const FIRST_TOPIC = "workflow"

/** How wide a topic's name is drawn in a list. */
const TOPIC_WIDTH = 18
