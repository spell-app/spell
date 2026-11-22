import { core, Thing, App, Place, h } from "@spell/core"

export class Event extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("organizers", { type: "text" }) }
  get organizers() { return this.getProp("organizers") }
  set organizers(value) { this.setProp("organizers", value) }

  static { this.declareProp("proposed", { type: "text" }) }
  get proposed() { return this.getProp("proposed") }
  set proposed(value) { this.setProp("proposed", value) }

  static { this.declareProp("stage", { type: "text" }) }
  get stage() { return this.getProp("stage") }
  set stage(value) { this.setProp("stage", value) }

  static { this.declareProp("stageName", { type: "text" }) }
  get stageName() { return this.getProp("stageName") }
  set stageName(value) { this.setProp("stageName", value) }

  static { this.declareProp("onward", { type: "text" }) }
  get onward() { return this.getProp("onward") }
  set onward(value) { this.setProp("onward", value) }

  static { this.declareProp("onwardName", { type: "text" }) }
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

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class EventStage extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("movesTo", { type: "text" }) }
  get movesTo() { return this.getProp("movesTo") }
  set movesTo(value) { this.setProp("movesTo", value) }

  static { this.declareProp("movedBy", { type: "text" }) }
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

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class OrgEvent extends Place {}
export const orgEvents = core.place(new OrgEvent(), {
  name: "org_events",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__admin/events",
  checkedEvery: 30, firstReads: () => [[Event], [EventStage]] })

// -----------
export class EventsPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

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
core.describeAction(EventsPage, "proposeTheNewEvent", { title: "Propose the New Event", undoneAs: "Propose the New Event" })
// -----------
core.installStyles(undefined, `/* The toolbar across the top, who's signed in on its right;  the page the theme's colours, light or dark. */¬.org-page {¬  min-height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬.org-page .top-bar {¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬¬.org-page .top-bar::part(menu) {¬  margin-block: 0;¬}¬¬.org-page .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬.org-page ui-container > ui-stack {¬  padding-block: 16px;¬}¬¬/* A phone:  the links go, leaving the name and who's signed in. */¬@media (max-width: 640px) {¬  .org-page .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) eventsPage.start()
