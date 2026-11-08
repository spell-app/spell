import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Chat:  a team's open thread, live")
///////////////////////////////////////
// ## Chat:  a team's open thread, live
///////////////////////////////////////

/** A message:  what it says, and when;  who sent it is the space's to say, `by`. */
export class Message extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 767, end: 785 } }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  // - its "by" is text
  static { this.declareProp("by", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 789, end: 805 } }) }
  get by() { return this.getProp("by") }
  set by(value) { this.setProp("by", value) }

  // - its "sent" is text
  static { this.declareProp("sent", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 809, end: 827 } }) }
  get sent() { return this.getProp("sent") }
  set sent(value) { this.setProp("sent", value) }

  draw() {
    return h("ui-segment", { class: "message" },
      h("ui-stack", { spacing: "xs" },
        h("ui-stack", { direction: "horizontal", spacing: "md", align: "center", wrap: true },
          h("ui-text", { class: "by" }, () => this.by),
          h("ui-text", { class: "sent", color: "grey" }, () => this.sent),
          h("ui-button", {
            class: "remove",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Delete this message",
            title: "Delete this message:  yours, or anyone's if you manage the space",
            onClick: core.pressed(this, () => core.removeSaved(this)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        ),
        h("ui-text", { class: "text" }, () => this.text)
      )
    )
  }

  static savedIn = { place: "team_chat", collection: "messages" }
}

/**
 * Every team, project and event has two threads:  an open one in its shared space, which everyone in the org reads
 * and writes, and its organizers' in its private one, which only its Managers reach.
 * A thread is live:  a message shows on everyone's open page at once.  Each is written as the person who sent it,
 * so the space's own rules hold:  everyone deletes their own messages, and its Managers anyone's.
 * Your thread's page names its own space on the next line.  The organizers' thread is at
 * "events_team@rs/__private/messages"
 */
export class TeamChat extends Place {}
export const teamChat = core.place(new TeamChat(), {
  name: "team_chat",
  kind: "room",
  at: "/api/rooms/spaces/events_team@rs/messages"
})

// -----------
core.heading("Chat")
//////////
// ## Chat
//////////
// A team's open thread, live:  a message shows on everyone's open page at once.
// Where it's kept is in OrgChat.api.spell, and only its first line knows.
// Everyone in the org reads and writes it;  you delete your own messages, and the team's Managers anyone's.

core.heading("A row for each:  who sent it, when, and what it says")
//## A row for each:  who sent it, when, and what it says

core.heading("The page:  the thread, oldest first, and a line to write in")
//## The page:  the thread, oldest first, and a line to write in

export class ChatPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "new message" is a new message
  static { this.declareProp("newMessage", { init: () => new Message(), early: true }) }
  get newMessage() { return this.getProp("newMessage") }
  set newMessage(value) { this.setProp("newMessage", value) }

  send() {
    this.newMessage.sent = new Date()
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  draw() {
    return h("ui-container", { class: "chat" },
      h("ui-stack",
        h("ui-header", { size: "large" }, "Team chat"),
        h("ui-stack", { class: "message-list", spacing: "sm" },
          () => core.drawRead(async () => await core.savedThings(Message, { sort: [{ field: "sent" }] }, "as drawn"), (message) => core.drawThing(message), {
            waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Joining the thread"),
            none: () => h("ui-text", { class: "none", color: "grey" }, "Nothing yet:  say hello."),
            failed: () => h("ui-text", { color: "red" }, "We can't join this thread right now.")
          })
        ),
        h("ui-form", { "prop:value": () => this.newMessage },
          h("ui-input", {
            name: "text",
            placeholder: "Write to the team",
            "aria-label": "Your message",
            fluid: true,
            action: true
          },
            h("ui-button", {
              class: "send",
              slot: "action",
              color: "primary",
              disabled: () => this.newMessage.text === "",
              onClick: core.pressed(this, () => this.send()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Send")
          )
        )
      )
    )
  }
}
export const chatPage = new ChatPage()
// -----------
if (!core.isCarryingOver) chatPage.start()
