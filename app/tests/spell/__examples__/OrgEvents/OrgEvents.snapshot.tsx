import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Org Events:  an org's events, from an idea to a quiet record")
//////////////////////////////////////////////////////////////////
// ## Org Events:  an org's events, from an idea to a quiet record
//////////////////////////////////////////////////////////////////

export class Event extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 564, end: 582 } })
  accessor name!: string

  // - its "organizers" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 586, end: 610 } })
  accessor organizers!: string

  // - its "proposed" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 614, end: 636 } })
  accessor proposed!: string

  // - its "stage" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 640, end: 659 } })
  accessor stage!: string

  // - its "stage name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 663, end: 687 } })
  accessor stageName!: string

  // - its "onward" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 691, end: 711 } })
  accessor onward!: string

  // - its "onward name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 715, end: 740 } })
  accessor onwardName!: string

  @drawn draw() {
    return (
      <ui-stack class="event" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.name}</ui-text>
        <ui-label size="tiny">{this.stageName}</ui-label>
        <ui-text color="grey">{this.organizers}</ui-text>
        <ui-button class="move" size="small" disabled={this.onward === ""} title="Move it on to its next stage" onClick={core.pressed(this, () => (this.stage = this.onward))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Move on
        </ui-button>
      </ui-stack>
    )
  }

  static savedIn = {
    place: "org_events",
    collection: "events",
    times: ["created", "modified"]
  }

  // - it lives in org events
  @prop({ type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 538, end: 560 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in org events
  @prop({ type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 538, end: 560 } })
  accessor modified!: any /* spell: type unknown */
}

export class EventStage extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 800, end: 818 } })
  accessor name!: string

  // - its "moves to" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 822, end: 844 } })
  accessor movesTo!: string

  // - its "moved by" is text
  @prop({ type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 848, end: 870 } })
  accessor movedBy!: string

  @drawn draw() {
    return (
      <ui-stack class="stage" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.name}</ui-text>
        <ui-text color="grey">{this.movedBy}</ui-text>
      </ui-stack>
    )
  }

  static savedIn = {
    place: "org_events",
    collection: "event_stages",
    times: ["created", "modified"], select: ["name", "movedBy"] }

  // - it lives in org events
  @prop({ type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 774, end: 796 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in org events
  @prop({ type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 774, end: 796 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * Anyone in the org proposes an event;  the Events Team's Managers say yes, which makes the event's project,
 * its two spaces, and its organizers its Managers;  they move it on from there.
 * The stages are the org's to change, kept beside its events in its Admin space.
 * Your org's events page names its own org on the next line:  "@rs" is the Rock Society's.
 */
export class OrgEvent extends Place {}
export const orgEvents = core.place(new OrgEvent(), {
  name: "org_events",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__admin/events",
  checkedEvery: 30, firstReads: () => [[Event], [EventStage]] })

// -----------
core.heading("Org Events")
////////////////
// ## Org Events
////////////////
// An org's events, from someone's idea to a finished, quiet record.
// Anyone in the org proposes one;  the Events Team's Managers say yes;  its organizers move it on.
// Where they're kept is in OrgEvents.api.spell, and only its first line knows.
// A move you may not make says why, and changes nothing.

core.heading("A row for each event:  where it is, and a button to move it on")
//## A row for each event:  where it is, and a button to move it on

core.heading("The page:  a form to propose one, the events, and the stages they go through")
//## The page:  a form to propose one, the events, and the stages they go through

export class EventsPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** An event proposed:  its name, and its organizers' addresses, comma-separated */
  // - its "new event" is a new event
  @prop({ init: () => new Event(), early: true })
  accessor newEvent!: Event

  proposeTheNewEvent() {
    core.saveThing(this.newEvent)
    this.newEvent = new Event()
  }

  @drawn draw() {
    return (
      <ui-stack class="org-page" spacing="none">
        <ui-toolbar class="top-bar" appearance="text" aria-label="Events">
          <ui-text slot="title" size="large">Events</ui-text>
          <ui-item link="OrgChat">Chat</ui-item>
          <ui-item link="OrgFeed">Feed</ui-item>
          <ui-item link="Inbox">Inbox</ui-item>
          <ui-item link="OrgAdmin">Admin</ui-item>
          <ui-stack slot="right" direction="horizontal">{core.signInMenu()}</ui-stack>
        </ui-toolbar>
        <ui-container class="org-events">
          <ui-stack>
            <ui-text color="grey">
              {"Propose one;  the Events Team says yes;  its organizers take it from there."}
            </ui-text>
            <ui-segment class="propose">
              <ui-header size="medium">Propose an event</ui-header>
              <ui-form prop:value={this.newEvent}>
                <ui-stack direction="horizontal" wrap={true}>
                  <ui-input name="name" placeholder="Picnic" aria-label="Its name" fluid={true} />
                  <ui-input name="organizers" placeholder="cy@rs, dee@rs" aria-label="Its organizers" />
                </ui-stack>
              </ui-form>
              <ui-button class="propose" color="primary" disabled={this.newEvent.name === ""} onClick={core.pressed(this, () => this.proposeTheNewEvent())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Propose it
              </ui-button>
            </ui-segment>
            <ui-segment class="events">
              <ui-header size="medium">Events</ui-header>
              <ui-stack class="events" spacing="sm">
                {core.drawRead(async () => await core.savedThings(Event, {}, "as drawn"), (event: Event) => core.drawThing(event), {
                  waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding the events"}</ui-loader>,
                  none: () => <ui-text class="none" color="grey">No events yet.</ui-text>,
                  failed: () => <ui-text color="red">We can't read the events right now.</ui-text>
                })}
              </ui-stack>
            </ui-segment>
            <ui-segment class="stages">
              <ui-header size="medium">Stages</ui-header>
              <ui-stack class="stages" spacing="sm">
                {core.drawRead(async () => await core.savedThings(EventStage, {}, "as drawn"), (step: EventStage) => core.drawThing(step), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding the stages"}</ui-loader> })}
              </ui-stack>
            </ui-segment>
          </ui-stack>
        </ui-container>
      </ui-stack>
    )
  }
}

/**
 * `<test-project-app>`:  an events page, drawn in its own element, e.g. by `draw the events page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its events page's properties;  its methods call its events page's.
 * - What every view's element does, e.g. drawing its events page, is `SpellElement`'s.
 */
export class EventsPageElement extends SpellElement<EventsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "events page", [
    { name: "new-event", kind: "json", description: "Its newEvent." }
  ])

  proposeTheNewEvent() {
    return this.currentThing?.proposeTheNewEvent()
  }
}
core.useElement(EventsPage, EventsPageElement)
export const eventsPage = new EventsPage()
// -----------
core.installStyles(undefined, `/* The toolbar across the top, who's signed in on its right;  the page the theme's colours, light or dark. */¬.org-page {¬  min-height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬.org-page .top-bar {¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬¬.org-page .top-bar::part(menu) {¬  margin-block: 0;¬}¬¬.org-page .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬.org-page ui-container > ui-stack {¬  padding-block: 16px;¬}¬¬/* A phone:  the links go, leaving the name and who's signed in. */¬@media (max-width: 640px) {¬  .org-page .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) eventsPage.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `EventsPageElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
