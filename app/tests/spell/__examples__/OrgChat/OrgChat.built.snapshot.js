import { core, Thing, App, Place, h } from "@spell/core"

export class Message extends Thing {
  static { this.declareProp("text", { type: "text" }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  static { this.declareProp("by", { type: "text" }) }
  get by() { return this.getProp("by") }
  set by(value) { this.setProp("by", value) }

  static { this.declareProp("sent", { type: "date" }) }
  get sent() { return this.getProp("sent") }
  set sent(value) { this.setProp("sent", value) }

  static { this.declareProp("thread", { type: "text" }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  static { this.declareProp("initials", { readsFrom: ["chat"] }) }
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

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Thread extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("side", { type: "text" }) }
  get side() { return this.getProp("side") }
  set side(value) { this.setProp("side", value) }

  static { this.declareProp("topic", { type: "text" }) }
  get topic() { return this.getProp("topic") }
  set topic(value) { this.setProp("topic", value) }

  static { this.declareProp("link", { type: "text" }) }
  get link() { return this.getProp("link") }
  set link(value) { this.setProp("link", value) }

  static { this.declareProp("current", { type: "choice" }) }
  get current() { return this.getProp("current") }
  set current(value) { this.setProp("current", value) }

  static { this.declareProp("mark", { readsFrom: ["my_threads"] }) }
  get mark() {
    if (this.side === "private") return "lock"
    return "hashtag"
  }

  static savedIn = {
    place: "my_threads",
    collection: "threads",
    times: ["created", "modified"], select: ["name", "side", "topic", "link", "current"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

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
  checkedEvery: 30
})

// -----------
export class ChatPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("newMessage", { init: () => new Message(), early: true }) }
  get newMessage() { return this.getProp("newMessage") }
  set newMessage(value) { this.setProp("newMessage", value) }

  static { this.declareProp("picked", { readsFrom: ["my_threads"] }) }
  get picked() { return core.waitedValue(this, "picked", async () => {
    return core.getItemAt(core.filter(await core.savedThings(Thread), (thread) => thread.current), 0)
  }) }

  static { this.declareProp("drawerOpen", { type: "choice" }) }
  get drawerOpen() { return this.getProp("drawerOpen") }
  set drawerOpen(value) { this.setProp("drawerOpen", value) }

  static { this.declareProp("threadName", { readsFrom: ["my_threads"] }) }
  get threadName() {
    if (this.picked) return this.picked.name
    return ""
  }

  static { this.declareProp("boxWords", { readsFrom: ["my_threads"] }) }
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
        () => core.drawWaiting(() => core.drawIf(() => this.picked, () => [
          h("ui-stack", { class: "main", spacing: "none" },
            h("ui-stack", { class: "thread-name" },
              h("ui-header", { size: "small" }, () => core.whileWaiting(() => this.threadName))
            ),
            h("ui-stack", { class: "messages", spacing: "none" },
              h("ui-stack", { class: "message-list", spacing: "none" },
                () => core.drawRead(async () => await core.savedThings(Message, { filter: { thread: (await core.answerOf(this, "picked")).topic }, sort: [{ field: "sent" }] }, "as drawn"), (message) => core.drawThing(message), {
                  waitingSay: () => "Joining the thread",
                  none: () => h("ui-text", { class: "none", color: "grey" }, "Nothing yet:  say hello."),
                  failed: () => h("ui-text", { color: "red" }, "We can't join this thread right now.")
                })
              )
            ),
            h("ui-form", { class: "composer", "prop:value": () => this.newMessage },
              h("ui-stack", { direction: "horizontal", spacing: "sm", align: "end" },
                () => core.drawWaiting(() => h("ui-textarea", {
                  name: "text",
                  fluid: true,
                  grow: true,
                  "max-rows": 8,
                  "send-on-enter": true,
                  placeholder: () => this.boxWords,
                  "aria-label": "Your message",
                  "on-ui-send": () => async () => await this.send()
                }), "ui-textarea"),
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
        ]))
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
        waitingSay: () => "Finding your threads",
        none: () => h("ui-text", { class: "none", color: "grey", part: "thread_list" }, "No threads you can read."),
        failed: () => h("ui-text", { color: "red", part: "thread_list" }, "We can't find your threads right now.")
      })
    )
  }
}
export const chatPage = new ChatPage()
core.describeAction(ChatPage, "openTheDrawer", { title: "Open the Drawer", undoneAs: "Open the Drawer" })
core.describeAction(ChatPage, "closeTheDrawer", { title: "Close the Drawer", undoneAs: "Close the Drawer" })
core.describeAction(ChatPage, "send", { title: "Send It", undoneAs: "Send It" })
// -----------
core.installStyles(undefined, `/* Chat:  a chat app filling the window, with only its messages scrolling, light or dark. */¬.org-chat {¬  display: flex;¬  flex-direction: column;¬  height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬/* The toolbar across the top:  a rule below it, the program's links close to its name, nothing making it tall. */¬.org-chat .top-bar {¬  flex: none;¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬.org-chat .top-bar::part(menu) {¬  margin-block: 0;¬}¬.org-chat .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬/* The sign-in menu's button sits quietly in the bar. */¬.org-chat .top-bar [slot="right"] {¬  --ui-button-padding: 0.4em 0.7em;¬}¬¬/* The button that opens the threads:  only on a phone, where the side bar is gone. */¬.org-chat .show-threads {¬  display: none;¬}¬¬/* The side bar and the thread beside it, taking all the room below the toolbar. */¬.org-chat .workspace {¬  flex: 1;¬  min-height: 0;¬  align-items: stretch;¬}¬¬.org-chat .sidebar {¬  flex: none;¬  width: 260px;¬  padding: 10px 8px;¬  overflow-y: auto;¬  background: light-dark(oklch(96% 0 0), oklch(22% 0 0));¬  border-inline-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬}¬¬/* The thread:  its name, its messages (which take the room left and scroll), and the box to write in. */¬.org-chat .main {¬  flex: 1;¬  min-width: 0;¬  min-height: 0;¬}¬¬.org-chat .thread-name {¬  flex: none;¬  padding: 12px 16px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬}¬¬/* Column-reverse:  it starts at the bottom, and stays there as messages arrive. */¬.org-chat .messages {¬  flex: 1;¬  min-height: 0;¬  display: flex;¬  flex-direction: column-reverse;¬  overflow-y: auto;¬  padding: 16px;¬}¬¬/* With no messages, the words sit in the middle of the room. */¬.org-chat .messages:has(.none) {¬  justify-content: center;¬  text-align: center;¬}¬¬.org-chat .message {¬  padding-block: 4px;¬}¬¬/* Who sent it:  their initials on a circle. */¬.org-chat .avatar {¬  flex: none;¬  width: 36px;¬  height: 36px;¬  display: grid;¬  place-content: center;¬  border-radius: 50%;¬  color: white;¬  background: var(--ui-primary);¬  font-size: 13px;¬  font-weight: 600;¬}¬¬.org-chat .text {¬  white-space: pre-wrap;¬  overflow-wrap: anywhere;¬}¬¬/* Delete stays quiet until the message is pointed at, or the button has the keyboard. */¬.org-chat .remove {¬  opacity: 0;¬}¬.org-chat .message:hover .remove,¬.org-chat .remove:focus-within {¬  opacity: 1;¬}¬¬/* A phone has nothing to point with. */¬@media (hover: none) {¬  .org-chat .remove {¬    opacity: 1;¬  }¬}¬¬/* The box to write in, the full width of the thread:  its Send button at the bottom beside it. */¬.org-chat .composer {¬  flex: none;¬  padding: 0 16px 16px;¬}¬¬.org-chat .composer ui-textarea {¬  flex: 1;¬  min-width: 0;¬}¬¬/* A phone:  the side bar goes, and the bars button opens the threads in a drawer. */¬@media (max-width: 640px) {¬  .org-chat .sidebar {¬    display: none;¬  }¬  .org-chat .show-threads {¬    display: inline-block;¬  }¬  .org-chat .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) chatPage.start()
