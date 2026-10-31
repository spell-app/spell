/**
 * Fake places with the odd shapes of the back-ends built later (epic `data`, Airtable and AT Protocol),
 * so the interface can't quietly assume they're not coming.
 * - They copy the SHAPE of each back-end, and nothing about reaching it.
 */
import {
  MemoryPlace,
  type ApplyAnswer,
  type ListAnswer,
  type ListQuery,
  type MemoryPlaceProps,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceEvent,
  type WatchTarget,
  type WriteAnswer,
  type WriteQuestion
} from "spell/util/places"

/** The field an owner's name is under, in an owned row. */
const OWNER_FIELD = "owner"

/** What a person's host on AT Protocol can do:  pages by key order, and nothing else. */
const OWNED_CAPABILITIES: Partial<PlaceCapabilities> = {
  filter: "none",
  sort: "none",
  select: "none",
  page: "cursor",
  whoWrites: "only the owner",
  live: "push",
  abort: "soft"
}

/****************
 * ### `FieldRulesPlace`
 * Shaped like Airtable:  it makes its own ids, some fields are read only, and it has limits and no version check.
 ****************/
export class FieldRulesPlace extends MemoryPlace {
  /** The fields nobody can write, like Airtable's formulas. */
  static READ_ONLY_FIELDS = ["total"]

  constructor(props: MemoryPlaceProps = {}) {
    super({
      ...props,
      capabilities: {
        makesIds: true,
        atomic: false,
        versionCheck: false,
        live: "poll",
        page: "offset",
        rateLimit: { requests: 5, perSeconds: 1, changesPerRequest: 10 }
      }
    })
  }

  /** A read-only field can't be written;  everything else can. */
  canWrite({ field }: WriteQuestion): WriteAnswer {
    if (field && FieldRulesPlace.READ_ONLY_FIELDS.includes(field)) return { canWrite: false, whyNot: "field" }
    return { canWrite: true }
  }

  /** `rec...`, as Airtable's look. */
  protected newId(): string {
    return `rec${super.newId()}`
  }
}

/****************
 * ### `OwnedPlace`
 * Shaped like one person's host on AT Protocol:  anyone reads, and only a row's owner changes it.
 ****************/
export class OwnedPlace extends MemoryPlace {
  constructor(props: MemoryPlaceProps = {}) {
    super({ ...props, capabilities: OWNED_CAPABILITIES })
  }

  /** A row that exists belongs to its owner;  a new one can be made by anyone, as their own. */
  canWrite({ row, identity }: WriteQuestion): WriteAnswer {
    if (row && row[OWNER_FIELD] !== identity) return { canWrite: false, whyNot: "owner" }
    return { canWrite: true }
  }
}

/****************
 * ### `HostsPlace`
 * One place across several hosts, shaped like AT Protocol:  everyone's records, put together.
 * - A list runs through every host, its page naming which host it stopped at.
 * - A write goes to the host of whoever's asking, and no other.
 ****************/
export class HostsPlace implements Place {
  /** Each host's own place, by the host's name. */
  private readonly hosts: Map<string, OwnedPlace>
  /** Which host each person's records are on. */
  private readonly hostOf: Record<string, string>

  constructor({ hosts, hostOf }: { hosts: Record<string, OwnedPlace>; hostOf: Record<string, string> }) {
    this.hosts = new Map(Object.entries(hosts))
    this.hostOf = hostOf
  }

  /** What every host can do. */
  describe(): PlaceCapabilities {
    return [...this.hosts.values()][0]!.describe()
  }

  /** One page, of one host:  `nextPage` says which host and where, `<host>|<place on it>`. */
  async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    const names = [...this.hosts.keys()]
    const [startHost = names[0]!, at] = query.page?.at?.split("|") ?? []
    const { size } = query.page ?? {}
    const page = { ...(size !== undefined && { size }), ...(at && { at }) }
    const answer = await this.hosts.get(startHost)!.list(collection, { ...query, page }, context)
    const nextHost = names[names.indexOf(startHost) + 1]
    const nextPage = answer.nextPage ? `${startHost}|${answer.nextPage}` : nextHost
    return { rows: answer.rows, handled: answer.handled, ...(nextPage && { nextPage }) }
  }

  /** To the host of whoever's asking.  - throws `TypeError` for someone with no host */
  async apply(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    const host = this.hosts.get(this.hostOf[context.identity ?? ""] ?? "")
    if (!host) throw new TypeError(`HostsPlace.apply():  ${context.identity} has no host;  list them in \`hostOf\``)
    return host.apply(changes, context)
  }

  /** One stream, from every host. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    const stops = [...this.hosts.values()].map((host) => host.watch(target, onEvent))
    return () => stops.forEach((stop) => stop())
  }

  /** The same rule as every host's. */
  canWrite(question: WriteQuestion): WriteAnswer {
    return [...this.hosts.values()][0]!.canWrite(question)
  }
}
