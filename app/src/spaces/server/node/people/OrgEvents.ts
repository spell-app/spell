import { cp } from "fs/promises"

import { SRV } from "spell/server"
import { ADMIN_SPACE } from "spell/app/spaces/models/spaceNames"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"
import { BY_SPELL, type OrgRoles, type RoleWhy } from "./OrgRoles"

/****************
 * ### `OrgEvents`
 * An org's EVENTS, each from someone's idea to a finished, quiet record (epic `atmosphere` P32).
 * - Anyone in the org PROPOSES one (`propose()`), naming its organizers.
 * - It then MOVES through the org's stages (`move()`), each move by whoever the stage says:
 *   - RS's, unless it says its own (`RS_EVENT_PROGRAM`):  Proposed, Approved, Planning, Open, Analysis, Quiet
 *   - the team's Managers say yes (Approved), its organizers move it on from there;  the Board and the Admins always may
 * - APPROVING it makes it a project of the org, under its team (`OrgRoles.addProject()`):
 *   its two spaces, its organizers its Project Managers (`give()`), and the org's template project copied into its
 *   shared space (`copyTemplate`).
 * - QUIET:  its spaces read only (`isQuietAt()`, which `SpaceFolders` asks before every write), and left off the feed
 *   (P33 asks the same).
 * - The PROGRAM is the org's to change (`setProgram()`, the Board and the Admins), kept in its Admin space beside the
 *   events, `@rs/__admin/events.json5`;  every move is logged in the org's log.
 * - Node only;  knows nothing of pages:  its page is the built-in program `@spell/examples/OrgEvents`, which reads it
 *   through `OrgRolesPlace` at `@rs/__admin/events`.
 ****************/
export class OrgEvents {
  /** Who manages what:  who may move an event, and the projects and terms an approval makes. */
  private readonly orgRoles: OrgRoles
  /** People, orgs and rosters;  its storage holds the events file. */
  private readonly people: PeopleStore
  /** SIDE EFFECT:  copy the template project at `template` into the space at `address`. */
  private readonly copyTemplate: OrgEventsProps["copyTemplate"]
  /** When it is:  a test's clock. */
  private readonly now: () => Date

  constructor({ orgRoles, people, copyTemplate, now = () => new Date() }: OrgEventsProps) {
    this.orgRoles = orgRoles
    this.people = people
    this.copyTemplate = copyTemplate
    this.now = now
  }

  ////////////////
  // ## Reading
  ////////////////

  /** Org `org`'s event program:  its own, else RS's (`RS_EVENT_PROGRAM`). */
  async program(org: string): Promise<EventProgram> {
    return (await this.fileOf(org)).program ?? RS_EVENT_PROGRAM
  }

  /** Org `org`'s events, oldest first:  none with no Admin space. */
  async events(org: string): Promise<OrgEvent[]> {
    return (await this.fileOf(org)).events ?? []
  }

  /**
   * Is the folder at `address` in a QUIET event's spaces, read only (`events_team@rs/picnic/sheet`)?
   * - Its project's folder is the address's second part under a team, its first under the org (`picnic@rs/...`).
   * - NEVER throws:  false for anything it can't read.
   */
  async isQuietAt(address: string): Promise<boolean> {
    const paired = await this.orgRoles.spaceAt(address).catch(() => undefined)
    if (paired?.of.kind !== "a-project") return false
    const { folder } = paired.of
    const quiet = new Set((await this.program(paired.org)).stages.filter((each) => each.quiet).map((each) => each.key))
    return (await this.events(paired.org)).some((each) => each.id === folder && quiet.has(each.stage))
  }

  ////////////////
  // ## Changing
  ////////////////

  /**
   * SIDE EFFECT:  propose an event:  `id` its folder, `name`, its `organizers` by address;  in its program's first stage.
   * - Who:  anyone in the org.
   * - throws `HttpError(403)` for anyone else;  `HttpError(409)` for an id it has;  `HttpError(400)` for one with no
   *   organizers, or one outside the org
   */
  async propose(org: string, proposal: EventProposal, why: RoleWhy): Promise<OrgEvent> {
    const { by = BY_SPELL } = why
    if (why.by !== undefined && !(await this.orgRoles.isInOrg(org, why.by))) {
      throw new SRV.HttpError(403, `${why.by} isn't in @${org}:  only its people propose events`)
    }
    const file = await this.fileOf(org)
    const events = file.events ?? []
    if (events.some((each) => each.id === proposal.id))
      throw new SRV.HttpError(409, `@${org} has ${proposal.id} already`)
    if (!proposal.organizers.length) throw new SRV.HttpError(400, `name ${proposal.name}'s organizers`)
    for (const each of proposal.organizers) {
      if (!(await this.orgRoles.isInOrg(org, each))) throw new SRV.HttpError(400, `${each} isn't in @${org}`)
    }
    const { stages } = file.program ?? RS_EVENT_PROGRAM
    const stage = stages[0]!.key
    const event: OrgEvent = { ...proposal, proposedBy: by, stage, moves: [{ stage, by, at: this.now().toISOString() }] }
    await this.save(org, { ...file, events: [...events, event] })
    await this.orgRoles.logChange(org, { action: "event", by, project: event.id, name: stage, why: why.why })
    return event
  }

  /**
   * SIDE EFFECT:  move event `id` to `stage`, one its stage moves to;  logged.
   * - Into a stage that `approves`:  the event becomes a project, the first time (see the class).
   * - Who:  as the stage it moves into says (`EventStage.movedBy`);  the Board and the Admins always.
   * - throws `HttpError(404)` for an event it hasn't;  `HttpError(400)` for a move its stage doesn't make;
   *   `HttpError(403)` for someone who may not make it
   */
  async move(org: string, id: string, stage: string, why: RoleWhy): Promise<OrgEvent> {
    const file = await this.fileOf(org)
    const program = file.program ?? RS_EVENT_PROGRAM
    const event = (file.events ?? []).find((each) => each.id === id)
    if (!event) throw new SRV.HttpError(404, `@${org} has no event ${id}`)
    const from = stageOrDie(program, event.stage)
    const to = stageOrDie(program, stage)
    if (!from.next.includes(to.key)) {
      throw new SRV.HttpError(400, `${event.name} can't go from ${from.name} to ${to.name}:  ${from.next.join(", ")}`)
    }
    await this.mayMoveOrDie(org, program, event, to, why)
    if (to.approves && !(await this.isProject(org, id))) await this.makeProject(org, program, event, why)
    event.stage = to.key
    event.moves.push({ stage: to.key, by: why.by ?? BY_SPELL, at: this.now().toISOString() })
    await this.save(org, file)
    await this.orgRoles.logChange(org, {
      action: "event",
      by: why.by ?? BY_SPELL,
      project: id,
      name: to.key,
      why: why.why
    })
    return event
  }

  /**
   * SIDE EFFECT:  set org `org`'s event program, in place of what it said;  logged.
   * - throws `HttpError(403)` for anyone but the Board and the Admins;  `HttpError(400)` for one whose moves name a stage
   *   it hasn't
   */
  async setProgram(org: string, program: EventProgram, why: RoleWhy): Promise<void> {
    if (why.by !== undefined && !(await this.orgRoles.boardAndAdmins(org)).includes(why.by)) {
      throw new SRV.HttpError(403, `${why.by} may not change @${org}'s events:  its Board and Admins may`)
    }
    for (const stage of program.stages) for (const next of stage.next) stageOrDie(program, next)
    await this.save(org, { ...(await this.fileOf(org)), program })
    await this.orgRoles.logChange(org, { action: "event program", by: why.by ?? BY_SPELL, why: why.why })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** - throws `HttpError(403)` unless `by` may move `event` into `to`:  see `EventStage.movedBy` */
  private async mayMoveOrDie(org: string, program: EventProgram, event: OrgEvent, to: EventStage, { by }: RoleWhy) {
    if (by === undefined) return
    const team = event.team ?? program.team
    const folder = to.movedBy === "its organizers" && (await this.isProject(org, event.id)) ? event.id : team
    if ((await this.orgRoles.managersOf(org, folder)).includes(by)) return
    const who = to.movedBy === "its organizers" ? `${event.name}'s organizers` : `the ${team}'s Managers`
    throw new SRV.HttpError(403, `${by} may not move ${event.name} to ${to.name}:  ${who} may`)
  }

  /** Is `id` one of org `org`'s projects yet? */
  private async isProject(org: string, id: string): Promise<boolean> {
    return !!(await this.people.roster(org))?.projects.items.some((each) => each.folder === id)
  }

  /** SIDE EFFECT:  make `event` a project under its team, its organizers its Managers, the template copied in. */
  private async makeProject(org: string, program: EventProgram, event: OrgEvent, why: RoleWhy): Promise<void> {
    const team = event.team ?? program.team
    await this.orgRoles.addProject(org, { id: event.id, name: event.name, team }, why)
    for (const person of event.organizers) {
      await this.orgRoles.give(org, { role: "project-manager", person, of: event.id }, why)
    }
    if (program.template) await this.copyTemplate(program.template, `${team}@${org}/${event.id}`)
  }

  /** Org `org`'s events file, `{}` until it's written. */
  private async fileOf(org: string): Promise<EventsFile> {
    return (await readJSON5<EventsFile>(this.people.storage, eventsFile(org)).catch(() => undefined)) ?? {}
  }

  /** SIDE EFFECT:  write org `org`'s events file. */
  private async save(org: string, file: EventsFile): Promise<void> {
    await writeJSON5(this.people.storage, eventsFile(org), file)
  }
}

/** Constructor props of `OrgEvents`. */
export type OrgEventsProps = {
  /** Who manages what, the one every folder's members ask. */
  orgRoles: OrgRoles
  /** People, orgs and rosters. */
  people: PeopleStore
  /**
   * SIDE EFFECT:  copy the template project at `template` (`@spell/examples/SignUpSheet`) into the event's shared space,
   * `address` (`events_team@rs/picnic`).  `copyFolder()` with the app's folders.
   */
  copyTemplate: (template: string, address: string) => Promise<void>
  /** When it is:  a test's clock;  the real one, by default. */
  now?: () => Date
}

/** An event proposed, `propose()`'s. */
export type EventProposal = {
  /** Its folder, the project it'll be:  `picnic`. */
  id: string
  /** What people call it:  "The Picnic". */
  name: string
  /** Who'll organize it, by address:  its Project Managers once it's approved. */
  organizers: string[]
  /** The standing team it's under, by folder:  its program's, by default (`events_team`). */
  team?: string
}

/** One of an org's events:  as proposed, and where it is now. */
export type OrgEvent = EventProposal & {
  /** Who proposed it, by address. */
  proposedBy: string
  /** Its stage now, by key:  `planning`. */
  stage: string
  /** Every move it made, its proposal first. */
  moves: { stage: string; by: string; at: string }[]
}

/** An org's EVENT PROGRAM:  its stages, in order, the team its events are under, and the template each starts from. */
export type EventProgram = {
  /** The stages, the first where a proposal starts. */
  stages: EventStage[]
  /** The standing team its events are under, by folder:  `events_team`. */
  team: string
  /** The project each new event starts as a copy of:  `@spell/examples/SignUpSheet`;  none, an empty one. */
  template?: string
}

/** One stage of an event program. */
export type EventStage = {
  /** Its key, what's saved:  `planning`. */
  key: string
  /** What people call it:  "Planning". */
  name: string
  /** The stages it moves to, by key. */
  next: string[]
  /**
   * Who moves an event INTO it:  the team's Managers, or its organizers (its Project Managers, once it's a project);
   * the Board and the Admins always may, as they manage every space.
   */
  movedBy: "the team" | "its organizers"
  /** Moving into it makes the event a project, the first time. */
  approves?: boolean
  /** Its spaces read only, and off the feed. */
  quiet?: boolean
}

/** RS's event program, every org's until it says its own:  Proposed, Approved, Planning, Open, Analysis, Quiet. */
export const RS_EVENT_PROGRAM: EventProgram = {
  team: "events_team",
  template: "@spell/examples/SignUpSheet",
  stages: [
    { key: "proposed", name: "Proposed", next: ["approved"], movedBy: "the team" },
    { key: "approved", name: "Approved", next: ["planning"], movedBy: "the team", approves: true },
    { key: "planning", name: "Planning", next: ["open"], movedBy: "its organizers" },
    { key: "open", name: "Open", next: ["analysis"], movedBy: "its organizers" },
    { key: "analysis", name: "Analysis", next: ["quiet"], movedBy: "its organizers" },
    { key: "quiet", name: "Quiet", next: [], movedBy: "its organizers", quiet: true }
  ]
}

/** What an org's events file holds. */
type EventsFile = {
  /** Its own program:  RS's until it says. */
  program?: EventProgram
  /** Its events, oldest first. */
  events?: OrgEvent[]
}

/** The events file's name, in the Admin space. */
const EVENTS_FILE = "events.json5"

/** `@rs/__admin/events.json5`:  org `org`'s event program and events. */
function eventsFile(org: string): string {
  return `@${org}/${ADMIN_SPACE}/${EVENTS_FILE}`
}

/** - throws `HttpError(400)` for a stage `program` hasn't */
function stageOrDie(program: EventProgram, key: string): EventStage {
  const stage = program.stages.find((each) => each.key === key)
  if (!stage) throw new SRV.HttpError(400, `no stage ${key}:  ${program.stages.map((each) => each.key).join(", ")}`)
  return stage
}

/** SIDE EFFECT:  copy the folder `from` into `to`, whole:  `OrgEventsProps.copyTemplate`'s, on disk. */
export async function copyFolder(from: string, to: string): Promise<void> {
  await cp(from, to, { recursive: true, errorOnExist: false })
}
