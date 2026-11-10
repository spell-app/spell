import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Chat:  every thread you can read, live")
////////////////////////////////////////////
// ## Chat:  every thread you can read, live
////////////////////////////////////////////

/** A message:  what it says, when, and which ad-hoc thread it's in;  who sent it is the space's to say, `by`. */
export class Message extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1042, end: 1063 } }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  // - its "by" is text
  static { this.declareProp("by", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1068, end: 1087 } }) }
  get by() { return this.getProp("by") }
  set by(value) { this.setProp("by", value) }

  // - its "sent" is a date
  static { this.declareProp("sent", { type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1092, end: 1119 } }) }
  get sent() { return this.getProp("sent") }
  set sent(value) { this.setProp("sent", value) }

  // - its "thread" is text
  static { this.declareProp("thread", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1125, end: 1148 } }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  /** The first two letters of who sent it, for the circle beside their name */
  static { this.declareProp("initials", { declaredAt: { path: "/OrgChat.spell", start: 475, end: 622 }, readsFrom: ["chat"] }) }
  get initials() {
    return core.rangeStartingAt(this.by.toLocaleUpperCase(), 0, 2)
  }

  draw() {
    return h("ui-stack", { class: "message", direction: "horizontal", spacing: "md", align: "start" },
      h("ui-text", { class: "avatar" }, () => this.initials),
      h("ui-stack", { spacing: "none" },
        h("ui-stack", { direction: "horizontal", spacing: "sm", align: "center" },
          h("ui-text", { class: "by", bold: true }, () => this.by),
          h("ui-text", { class: "sent", size: "small", color: "grey" },
            () => core.dateAs(this.sent, "short time")
          ),
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

  static savedIn = {
    place: "chat",
    collection: "messages",
    times: ["created", "modified"]
  }

  // - it lives in chat
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1014, end: 1030 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in chat
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1014, end: 1030 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/** A thread you can read:  whose it is, which side, an ad-hoc one's own id, and the page's address showing it. */
export class Thread extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1337, end: 1358 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "side" is text
  static { this.declareProp("side", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1363, end: 1384 } }) }
  get side() { return this.getProp("side") }
  set side(value) { this.setProp("side", value) }

  // - its "topic" is text
  static { this.declareProp("topic", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1389, end: 1411 } }) }
  get topic() { return this.getProp("topic") }
  set topic(value) { this.setProp("topic", value) }

  // - its "link" is text
  static { this.declareProp("link", { type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1416, end: 1437 } }) }
  get link() { return this.getProp("link") }
  set link(value) { this.setProp("link", value) }

  // - its "current" is yes or no
  static { this.declareProp("current", { type: "choice", declaredAt: { path: "/OrgChat.api.spell", start: 1442, end: 1471 } }) }
  get current() { return this.getProp("current") }
  set current(value) { this.setProp("current", value) }

  /** Its icon:  a lock on the private ones */
  static { this.declareProp("mark", { declaredAt: { path: "/OrgChat.spell", start: 1368, end: 1493 }, readsFrom: ["my_threads"] }) }
  get mark() {
    if (this.side === "private") return "lock"
    return "hashtag"
  }

  static savedIn = {
    place: "my_threads",
    collection: "threads",
    times: ["created", "modified"], select: ["name", "side", "topic", "link", "current"] }

  // - it lives in my threads
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1303, end: 1325 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in my threads
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1303, end: 1325 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
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
  checkedEvery: 30, firstReads: () => [[Thread], [Thread, { sort: [{ field: "name" }] }]] })

// -----------
core.heading("Chat")
//////////
// ## Chat
//////////
// A chat app for your org:  a toolbar with who's signed in, every thread you can read down the side, and the one you picked, live.
// A message shows on everyone's open page at once.
// Where they're kept is in OrgChat.api.spell, and only its first two lines know.
// Everyone in the org reads and writes a team's open thread;  you delete your own messages, and the team's Managers anyone's.

core.heading("A row for each message:  who sent it, when, and what it says")
//## A row for each message:  who sent it, when, and what it says

core.heading("A thread in the list:  a lock on the private ones")
//## A thread in the list:  a lock on the private ones

core.heading("The page:  the toolbar, the threads down the side, and the one picked, oldest first, with a box to write in")
//## The page:  the toolbar, the threads down the side, and the one picked, oldest first, with a box to write in

export class ChatPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "new message" is a new message
  static { this.declareProp("newMessage", { init: () => new Message(), early: true }) }
  get newMessage() { return this.getProp("newMessage") }
  set newMessage(value) { this.setProp("newMessage", value) }

  static { this.declareProp("picked", { declaredAt: { path: "/OrgChat.spell", start: 1692, end: 1761 }, readsFrom: ["my_threads"] }) }
  get picked() { return core.waitedValue(this, "picked", async () => {
    return core.getItemAt(core.filter(await core.savedThings(Thread), (thread) => thread.current), 0)
  }) }

  /** A phone only:  the threads, open in a drawer */
  // - its "drawer open" is yes or no
  static { this.declareProp("drawerOpen", { type: "choice" }) }
  get drawerOpen() { return this.getProp("drawerOpen") }
  set drawerOpen(value) { this.setProp("drawerOpen", value) }

  /** The picked thread's name:  nothing until one is picked, as when signed out */
  static { this.declareProp("threadName", { declaredAt: { path: "/OrgChat.spell", start: 1863, end: 2030 }, readsFrom: ["my_threads"] }) }
  get threadName() {
    if (this.picked) return this.picked.name
    return ""
  }

  /** What the box says, until something is typed */
  static { this.declareProp("boxWords", { declaredAt: { path: "/OrgChat.spell", start: 2045, end: 2153 }, readsFrom: ["my_threads"] }) }
  get boxWords() {
    return `Message ${this.threadName}`
  }

  openTheDrawer() {
    this.drawerOpen = true
  }

  closeTheDrawer() {
    this.drawerOpen = false
  }

  async send() {
    this.newMessage.sent = new Date()
    this.newMessage.thread = (await core.answerOf(this, "picked")).topic
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  static drawsWaiting = true
  draw() {
    return h("ui-stack", { class: "org-chat", spacing: "none" },
      h("ui-toolbar", { class: "top-bar", appearance: "text", "aria-label": "Chat" },
        h("ui-button", {
          class: "show-threads",
          slot: "icon",
          icon: "bars",
          appearance: "transparent",
          "aria-label": "Show the threads",
          title: "Show the threads",
          onClick: core.pressed(this, () => this.openTheDrawer()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }),
        h("ui-text", { slot: "title", size: "large" }, "Chat"),
        h("ui-item", { link: "OrgFeed" }, "Feed"),
        h("ui-item", { link: "Inbox" }, "Inbox"),
        h("ui-item", { link: "OrgAdmin" }, "Admin"),
        h("ui-stack", { slot: "right", direction: "horizontal" }, () => core.signInMenu())
      ),
      h("ui-stack", { class: "workspace", direction: "horizontal", spacing: "none" },
        h("ui-stack", { class: "sidebar", spacing: "none" }, () => this.drawThreadList()),
        h("ui-stack", { class: "main", spacing: "none", hidden: () => this.picked ? undefined : true },
          h("ui-stack", { class: "thread-name" },
            h("ui-header", { size: "small" }, () => core.whileWaiting(() => this.threadName))
          ),
          h("ui-stack", { class: "messages", spacing: "none" },
            h("ui-stack", { class: "message-list", spacing: "none" },
              () => core.drawRead(async () => await core.savedThings(Message, { filter: { thread: (await core.answerOf(this, "picked")).topic }, sort: [{ field: "sent" }] }, "as drawn"), (message) => core.drawThing(message), {
                waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Joining the thread"),
                none: () => h("ui-text", { class: "none", color: "grey" }, "Nothing yet:  say hello."),
                failed: () => h("ui-text", { color: "red" }, "We can't join this thread right now.")
              })
            )
          ),
          h("ui-form", { class: "composer", "prop:value": () => this.newMessage },
            h("ui-stack", { direction: "horizontal", spacing: "sm", align: "end" },
              h("ui-textarea", {
                name: "text",
                fluid: true,
                grow: true,
                "max-rows": 8,
                "send-on-enter": true,
                placeholder: () => this.boxWords,
                "aria-label": "Your message",
                "on-ui-send": () => async () => await this.send()
              }),
              h("ui-button", {
                class: "send",
                color: "primary",
                disabled: () => this.newMessage.text === "",
                onClick: core.pressed(this, async () => await this.send()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Send")
            )
          )
        )
      ),
      h("ui-flyout", {
        class: "threads-drawer",
        visible: () => this.drawerOpen,
        position: "left",
        width: "thin",
        "on-ui-closed": () => () => this.closeTheDrawer()
      }, () => this.drawThreadList())
    )
  }

  drawThreadList() {
    return h("ui-menu", {
      class: "threads",
      direction: "vertical",
      appearance: "secondary",
      fluid: true,
      "aria-label": "Threads",
      part: "thread_list"
    },
      () => core.drawRead(async () => await core.savedThings(Thread, { sort: [{ field: "name" }] }, "as drawn"), (thread) => h("ui-item", {
        link: () => thread.link,
        selected: () => thread.current,
        icon: () => thread.mark,
        part: "thread_list"
      }, () => thread.name), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "thread_list" },
          "Finding your threads"
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "thread_list" }, "No threads you can read."),
        failed: () => h("ui-text", { color: "red", part: "thread_list" }, "We can't find your threads right now.")
      })
    )
  }
}
export const chatPage = new ChatPage()
// -----------
core.installStyles(undefined, `/* Chat:  a chat app filling the window, with only its messages scrolling, light or dark. */¬.org-chat {¬  display: flex;¬  flex-direction: column;¬  height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬/* The toolbar across the top:  a rule below it, the program's links close to its name, nothing making it tall. */¬.org-chat .top-bar {¬  flex: none;¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬.org-chat .top-bar::part(menu) {¬  margin-block: 0;¬}¬.org-chat .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬/* The sign-in menu's button sits quietly in the bar. */¬.org-chat .top-bar [slot="right"] {¬  --ui-button-padding: 0.4em 0.7em;¬}¬¬/* The button that opens the threads:  only on a phone, where the side bar is gone. */¬.org-chat .show-threads {¬  display: none;¬}¬¬/* The side bar and the thread beside it, taking all the room below the toolbar. */¬.org-chat .workspace {¬  flex: 1;¬  min-height: 0;¬  align-items: stretch;¬}¬¬.org-chat .sidebar {¬  flex: none;¬  width: 260px;¬  padding: 10px 8px;¬  overflow-y: auto;¬  background: light-dark(oklch(96% 0 0), oklch(22% 0 0));¬  border-inline-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬}¬¬/* The thread:  its name, its messages (which take the room left and scroll), and the box to write in. */¬.org-chat .main {¬  flex: 1;¬  min-width: 0;¬  min-height: 0;¬}¬¬.org-chat .thread-name {¬  flex: none;¬  padding: 12px 16px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬}¬¬/* Column-reverse:  it starts at the bottom, and stays there as messages arrive. */¬.org-chat .messages {¬  flex: 1;¬  min-height: 0;¬  display: flex;¬  flex-direction: column-reverse;¬  overflow-y: auto;¬  padding: 16px;¬}¬¬/* With no messages, the words sit in the middle of the room. */¬.org-chat .messages:has(.none) {¬  justify-content: center;¬  text-align: center;¬}¬¬.org-chat .message {¬  padding-block: 4px;¬}¬¬/* Who sent it:  their initials on a circle. */¬.org-chat .avatar {¬  flex: none;¬  width: 36px;¬  height: 36px;¬  display: grid;¬  place-content: center;¬  border-radius: 50%;¬  color: white;¬  background: var(--ui-primary);¬  font-size: 13px;¬  font-weight: 600;¬}¬¬.org-chat .text {¬  white-space: pre-wrap;¬  overflow-wrap: anywhere;¬}¬¬/* Delete stays quiet until the message is pointed at, or the button has the keyboard. */¬.org-chat .remove {¬  opacity: 0;¬}¬.org-chat .message:hover .remove,¬.org-chat .remove:focus-within {¬  opacity: 1;¬}¬¬/* A phone has nothing to point with. */¬@media (hover: none) {¬  .org-chat .remove {¬    opacity: 1;¬  }¬}¬¬/* The box to write in, the full width of the thread:  its Send button at the bottom beside it. */¬.org-chat .composer {¬  flex: none;¬  padding: 0 16px 16px;¬}¬¬.org-chat .composer ui-textarea {¬  flex: 1;¬  min-width: 0;¬}¬¬/* A phone:  the side bar goes, and the bars button opens the threads in a drawer. */¬@media (max-width: 640px) {¬  .org-chat .sidebar {¬    display: none;¬  }¬  .org-chat .show-threads {¬    display: inline-block;¬  }¬  .org-chat .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) chatPage.start()
