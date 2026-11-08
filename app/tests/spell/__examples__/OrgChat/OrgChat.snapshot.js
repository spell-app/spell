import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Chat:  every thread you can read, live")
////////////////////////////////////////////
// ## Chat:  every thread you can read, live
////////////////////////////////////////////

/** A message:  what it says, when, and which ad-hoc thread it's in;  who sent it is the space's to say, `by`. */
export class Message extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1006, end: 1024 } }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  // - its "by" is text
  static { this.declareProp("by", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1028, end: 1044 } }) }
  get by() { return this.getProp("by") }
  set by(value) { this.setProp("by", value) }

  // - its "sent" is text
  static { this.declareProp("sent", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1048, end: 1066 } }) }
  get sent() { return this.getProp("sent") }
  set sent(value) { this.setProp("sent", value) }

  // - its "thread" is text
  static { this.declareProp("thread", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1070, end: 1090 } }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

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

  static savedIn = { place: "chat", collection: "messages" }
}

/** A thread you can read:  whose it is, which side, an ad-hoc one's own id, and the page's address showing it. */
export class Thread extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1255, end: 1273 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "side" is text
  static { this.declareProp("side", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1277, end: 1295 } }) }
  get side() { return this.getProp("side") }
  set side(value) { this.setProp("side", value) }

  // - its "topic" is text
  static { this.declareProp("topic", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1299, end: 1318 } }) }
  get topic() { return this.getProp("topic") }
  set topic(value) { this.setProp("topic", value) }

  // - its "link" is text
  static { this.declareProp("link", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1322, end: 1340 } }) }
  get link() { return this.getProp("link") }
  set link(value) { this.setProp("link", value) }

  // - its "current" is yes or no
  static { this.declareProp("current", { type: "choice", declaredAt: { path: "/OrgChat.api.spell", start: 1344, end: 1370 } }) }
  get current() { return this.getProp("current") }
  set current(value) { this.setProp("current", value) }

  static savedIn = { place: "my_threads", collection: "threads" }
}

/**
 * Every team, project and event has two threads:  an open one in its shared space, which everyone in the org reads
 * and writes, and its organizers' in its private one, which only its Managers reach.  The Board and the Admins start
 * ad-hoc ones in the org's shared space too.
 * A thread is live:  a message shows on everyone's open page at once.  Each is written as the person who sent it,
 * so the space's own rules hold:  everyone deletes their own messages, and its Managers anyone's.
 * Your org is named on the next two lines:  "@rs/__thread" is whichever thread the page shows, picked from the list
 * down its side, and "@rs/__threads" is that list, every thread of RS you can read.
 */
export class Chat extends Place {}
export const chat = core.place(new Chat(), {
  name: "chat",
  kind: "room",
  at: "/api/rooms/spaces/@rs/__thread"
})
export class MyThread extends Place {}
export const myThreads = core.place(new MyThread(), {
  name: "my_threads",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__threads",
  checkedEvery: 30, firstReads: () => [[Thread, { sort: [{ field: "name" }] }], [Thread]] })

// -----------
core.heading("Chat")
//////////
// ## Chat
//////////
// Every thread you can read, down the side, and the one you picked, live:  a message shows on everyone's open page at once.
// Where they're kept is in OrgChat.api.spell, and only its first two lines know.
// Everyone in the org reads and writes a team's open thread;  you delete your own messages, and the team's Managers anyone's.

core.heading("A row for each:  who sent it, when, and what it says")
//## A row for each:  who sent it, when, and what it says

core.heading("The page:  the threads down the side, the one picked, oldest first, and a line to write in")
//## The page:  the threads down the side, the one picked, oldest first, and a line to write in

export class ChatPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "new message" is a new message
  static { this.declareProp("newMessage", { init: () => new Message(), early: true }) }
  get newMessage() { return this.getProp("newMessage") }
  set newMessage(value) { this.setProp("newMessage", value) }

  static { this.declareProp("picked", { declaredAt: { path: "/OrgChat.spellml", start: 1131, end: 1200 }, readsFrom: ["my_threads"] }) }
  get picked() { return core.waitedValue(this, "picked", async () => {
    return core.getItemAt(core.filter(await core.savedThings(Thread), (thread) => thread.current), 0)
  }) }

  async send() {
    this.newMessage.sent = new Date()
    this.newMessage.thread = (await core.answerOf(this, "picked")).topic
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  draw() {
    return h("ui-container", { class: "chat" },
      h("ui-stack", { direction: "horizontal", spacing: "lg", align: "start" },
        h("ui-list", { class: "threads", appearance: "link", "aria-label": "Threads" },
          () => core.drawRead(async () => await core.savedThings(Thread, { sort: [{ field: "name" }] }, "as drawn"), (thread) => h("ui-item", { link: () => thread.link, selected: () => thread.current },
            h("ui-stack", { spacing: "none" },
              h("ui-text", { class: "name" }, () => thread.name),
              h("ui-text", { class: "side", color: "grey", size: "small" }, () => thread.side)
            )
          ), {
            waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding your threads"),
            none: () => h("ui-text", { class: "none", color: "grey" }, "No threads you can read."),
            failed: () => h("ui-text", { color: "red" }, "We can't find your threads right now.")
          })
        ),
        h("ui-stack",
          h("ui-header", { size: "large" }, () => core.whileWaiting(() => this.picked.name)),
          h("ui-stack", { class: "message-list", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Message, { filter: { thread: (await core.answerOf(this, "picked")).topic }, sort: [{ field: "sent" }] }, "as drawn"), (message) => core.drawThing(message), {
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Joining the thread"),
              none: () => h("ui-text", { class: "none", color: "grey" }, "Nothing yet:  say hello."),
              failed: () => h("ui-text", { color: "red" }, "We can't join this thread right now.")
            })
          ),
          h("ui-form", { "prop:value": () => this.newMessage },
            h("ui-input", {
              name: "text",
              placeholder: "Write to the thread",
              "aria-label": "Your message",
              fluid: true,
              action: true
            },
              h("ui-button", {
                class: "send",
                slot: "action",
                color: "primary",
                disabled: () => this.newMessage.text === "",
                onClick: core.pressed(this, async () => await this.send()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Send")
            )
          )
        )
      )
    )
  }
}
export const chatPage = new ChatPage()
// -----------
if (!core.isCarryingOver) chatPage.start()
