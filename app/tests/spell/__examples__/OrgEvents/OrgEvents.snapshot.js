import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Org Events:  an org's events, from an idea to a quiet record")
//////////////////////////////////////////////////////////////////
// ## Org Events:  an org's events, from an idea to a quiet record
//////////////////////////////////////////////////////////////////

export class Event extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 564, end: 582 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "organizers" is text
  static { this.declareProp("organizers", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 586, end: 610 } }) }
  get organizers() { return this.getProp("organizers") }
  set organizers(value) { this.setProp("organizers", value) }

  // - its "proposed" is text
  static { this.declareProp("proposed", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 614, end: 636 } }) }
  get proposed() { return this.getProp("proposed") }
  set proposed(value) { this.setProp("proposed", value) }

  // - its "stage" is text
  static { this.declareProp("stage", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 640, end: 659 } }) }
  get stage() { return this.getProp("stage") }
  set stage(value) { this.setProp("stage", value) }

  // - its "stage name" is text
  static { this.declareProp("stageName", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 663, end: 687 } }) }
  get stageName() { return this.getProp("stageName") }
  set stageName(value) { this.setProp("stageName", value) }

  // - its "onward" is text
  static { this.declareProp("onward", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 691, end: 711 } }) }
  get onward() { return this.getProp("onward") }
  set onward(value) { this.setProp("onward", value) }

  // - its "onward name" is text
  static { this.declareProp("onwardName", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 715, end: 740 } }) }
  get onwardName() { return this.getProp("onwardName") }
  set onwardName(value) { this.setProp("onwardName", value) }

  draw() {
    return h("ui-stack", { class: "event", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.name),
      h("ui-label", { size: "tiny" }, () => this.stageName),
      h("ui-text", { color: "grey" }, () => this.organizers),
      h("ui-button", {
        class: "move",
        size: "small",
        disabled: () => this.onward === "",
        title: "Move it on to its next stage",
        onClick: core.pressed(this, () => (this.stage = this.onward)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Move on")
    )
  }

  static savedIn = {
    place: "org_events",
    collection: "events",
    times: ["created", "modified"]
  }

  // - it lives in org events
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 538, end: 560 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in org events
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 538, end: 560 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class EventStage extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 800, end: 818 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "moves to" is text
  static { this.declareProp("movesTo", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 822, end: 844 } }) }
  get movesTo() { return this.getProp("movesTo") }
  set movesTo(value) { this.setProp("movesTo", value) }

  // - its "moved by" is text
  static { this.declareProp("movedBy", { type: "text", declaredAt: { path: "/OrgEvents.api.spell", start: 848, end: 870 } }) }
  get movedBy() { return this.getProp("movedBy") }
  set movedBy(value) { this.setProp("movedBy", value) }

  draw() {
    return h("ui-stack", { class: "stage", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.name),
      h("ui-text", { color: "grey" }, () => this.movedBy)
    )
  }

  static savedIn = {
    place: "org_events",
    collection: "event_stages",
    times: ["created", "modified"], select: ["name", "movedBy"] }

  // - it lives in org events
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 774, end: 796 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in org events
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgEvents.api.spell", start: 774, end: 796 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
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
  static { this.declareProp("newEvent", { init: () => new Event(), early: true }) }
  get newEvent() { return this.getProp("newEvent") }
  set newEvent(value) { this.setProp("newEvent", value) }

  proposeTheNewEvent() {
    core.saveThing(this.newEvent)
    this.newEvent = new Event()
  }

  draw() {
    return h("ui-stack", { class: "org-page", spacing: "none" },
      h("ui-toolbar", { class: "top-bar", appearance: "text", "aria-label": "Events" },
        h("ui-text", { slot: "title", size: "large" }, "Events"),
        h("ui-item", { link: "OrgChat" }, "Chat"),
        h("ui-item", { link: "OrgFeed" }, "Feed"),
        h("ui-item", { link: "Inbox" }, "Inbox"),
        h("ui-item", { link: "OrgAdmin" }, "Admin"),
        h("ui-stack", { slot: "right", direction: "horizontal" }, () => core.signInMenu())
      ),
      h("ui-container", { class: "org-events" },
        h("ui-stack",
          h("ui-text", { color: "grey" },
            "Propose one;  the Events Team says yes;  its organizers take it from there."
          ),
          h("ui-segment", { class: "propose" },
            h("ui-header", { size: "medium" }, "Propose an event"),
            h("ui-form", { "prop:value": () => this.newEvent },
              h("ui-stack", { direction: "horizontal", wrap: true },
                h("ui-input", { name: "name", placeholder: "Picnic", "aria-label": "Its name", fluid: true }),
                h("ui-input", { name: "organizers", placeholder: "cy@rs, dee@rs", "aria-label": "Its organizers" })
              )
            ),
            h("ui-button", {
              class: "propose",
              color: "primary",
              disabled: () => this.newEvent.name === "",
              onClick: core.pressed(this, () => this.proposeTheNewEvent()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Propose it")
          ),
          h("ui-segment", { class: "events" },
            h("ui-header", { size: "medium" }, "Events"),
            h("ui-stack", { class: "events", spacing: "sm" },
              () => core.drawRead(async () => await core.savedThings(Event, {}, "as drawn"), (event) => core.drawThing(event), {
                waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding the events"),
                none: () => h("ui-text", { class: "none", color: "grey" }, "No events yet."),
                failed: () => h("ui-text", { color: "red" }, "We can't read the events right now.")
              })
            )
          ),
          h("ui-segment", { class: "stages" },
            h("ui-header", { size: "medium" }, "Stages"),
            h("ui-stack", { class: "stages", spacing: "sm" },
              () => core.drawRead(async () => await core.savedThings(EventStage, {}, "as drawn"), (step) => core.drawThing(step), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding the stages") })
            )
          )
        )
      )
    )
  }
}
export const eventsPage = new EventsPage()
// -----------
core.installStyles(undefined, `/* The toolbar across the top, who's signed in on its right;  the page the theme's colours, light or dark. */¬.org-page {¬  min-height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬.org-page .top-bar {¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬¬.org-page .top-bar::part(menu) {¬  margin-block: 0;¬}¬¬.org-page .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬.org-page ui-container > ui-stack {¬  padding-block: 16px;¬}¬¬/* A phone:  the links go, leaving the name and who's signed in. */¬@media (max-width: 640px) {¬  .org-page .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) eventsPage.start()
