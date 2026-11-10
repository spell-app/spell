import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Chat:  every thread you can read, live")
////////////////////////////////////////////
// ## Chat:  every thread you can read, live
////////////////////////////////////////////

/** A message:  what it says, when, and which ad-hoc thread it's in;  who sent it is the space's to say, `by`. */
export class Message extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1042, end: 1063 } })
  accessor text!: string

  // - its "by" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1068, end: 1087 } })
  accessor by!: string

  // - its "sent" is a date
  @prop({ type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1092, end: 1119 } })
  accessor sent!: Date

  // - its "thread" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1125, end: 1148 } })
  accessor thread!: string

  /** The first two letters of who sent it, for the circle beside their name */
  static { this.declareProp("initials", { declaredAt: { path: "/OrgChat.spell", start: 475, end: 622 }, readsFrom: ["chat"] }) }
  get initials() {
    return core.rangeStartingAt(this.by.toLocaleUpperCase(), 0, 2)
  }

  @drawn draw() {
    return (
      <ui-stack class="message" direction="horizontal" spacing="md" align="start">
        <ui-text class="avatar">{this.initials}</ui-text>
        <ui-stack spacing="none">
          <ui-stack direction="horizontal" spacing="sm" align="center">
            <ui-text class="by" bold={true}>{this.by}</ui-text>
            <ui-text class="sent" size="small" color="grey">{core.dateAs(this.sent, "short time")}</ui-text>
            <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Delete this message" title="Delete this message:  yours, or anyone's if you manage the space" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-stack>
          <ui-text class="text">{this.text}</ui-text>
        </ui-stack>
      </ui-stack>
    )
  }

  static savedIn = {
    place: "chat",
    collection: "messages",
    times: ["created", "modified"]
  }

  // - it lives in chat
  @prop({ type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1014, end: 1030 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in chat
  @prop({ type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1014, end: 1030 } })
  accessor modified!: any /* spell: type unknown */
}

/** A thread you can read:  whose it is, which side, an ad-hoc one's own id, and the page's address showing it. */
export class Thread extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1337, end: 1358 } })
  accessor name!: string

  // - its "side" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1363, end: 1384 } })
  accessor side!: string

  // - its "topic" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1389, end: 1411 } })
  accessor topic!: string

  // - its "link" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1416, end: 1437 } })
  accessor link!: string

  // - its "current" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/OrgChat.api.spell", start: 1442, end: 1471 } })
  accessor current!: boolean

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
  @prop({ type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1303, end: 1325 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in my threads
  @prop({ type: "date", declaredAt: { path: "/OrgChat.api.spell", start: 1303, end: 1325 } })
  accessor modified!: any /* spell: type unknown */
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
  @prop({ init: () => new Message(), early: true })
  accessor newMessage!: Message

  static { this.declareProp("picked", { declaredAt: { path: "/OrgChat.spell", start: 1692, end: 1761 }, readsFrom: ["my_threads"] }) }
  get picked() { return core.waitedValue(this, "picked", async () => {
    return core.getItemAt(core.filter(await core.savedThings(Thread), (thread: Thread) => thread.current), 0)
  }) }

  /** A phone only:  the threads, open in a drawer */
  // - its "drawer open" is yes or no
  @prop({ type: "choice" })
  accessor drawerOpen!: boolean

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
  @drawn draw() {
    return (
      <ui-stack class="org-chat" spacing="none">
        <ui-toolbar class="top-bar" appearance="text" aria-label="Chat">
          <ui-button class="show-threads" slot="icon" icon="bars" appearance="transparent" aria-label="Show the threads" title="Show the threads" onClick={core.pressed(this, () => this.openTheDrawer())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          <ui-text slot="title" size="large">Chat</ui-text>
          <ui-item link="OrgFeed">Feed</ui-item>
          <ui-item link="Inbox">Inbox</ui-item>
          <ui-item link="OrgAdmin">Admin</ui-item>
          <ui-stack slot="right" direction="horizontal">{core.signInMenu()}</ui-stack>
        </ui-toolbar>
        <ui-stack class="workspace" direction="horizontal" spacing="none">
          <ui-stack class="sidebar" spacing="none">{this.drawThreadList()}</ui-stack>
          <ui-stack class="main" spacing="none" hidden={this.picked ? undefined : true}>
            <ui-stack class="thread-name">
              <ui-header size="small">{core.whileWaiting(() => this.threadName)}</ui-header>
            </ui-stack>
            <ui-stack class="messages" spacing="none">
              <ui-stack class="message-list" spacing="none">
                {core.drawRead(async () => await core.savedThings(Message, { filter: { thread: (await core.answerOf(this, "picked")).topic }, sort: [{ field: "sent" }] }, "as drawn"), (message: Message) => core.drawThing(message), {
                  waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Joining the thread"}</ui-loader>,
                  none: () => <ui-text class="none" color="grey">{"Nothing yet:  say hello."}</ui-text>,
                  failed: () => <ui-text color="red">We can't join this thread right now.</ui-text>
                })}
              </ui-stack>
            </ui-stack>
            <ui-form class="composer" prop:value={this.newMessage}>
              <ui-stack direction="horizontal" spacing="sm" align="end">
                <ui-textarea name="text" fluid={true} grow={true} max-rows={8} send-on-enter={true} placeholder={this.boxWords} aria-label="Your message" on-ui-send={async () => await this.send()} />
                <ui-button class="send" color="primary" disabled={this.newMessage.text === ""} onClick={core.pressed(this, async () => await this.send())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Send
                </ui-button>
              </ui-stack>
            </ui-form>
          </ui-stack>
        </ui-stack>
        <ui-flyout class="threads-drawer" visible={this.drawerOpen} position="left" width="thin" on-ui-closed={() => this.closeTheDrawer()}>
          {this.drawThreadList()}
        </ui-flyout>
      </ui-stack>
    )
  }

  drawThreadList() {
    return (
      <ui-menu class="threads" direction="vertical" appearance="secondary" fluid={true} aria-label="Threads" part="thread_list">
        {core.drawRead(async () => await core.savedThings(Thread, { sort: [{ field: "name" }] }, "as drawn"), (thread: Thread) => <ui-item link={thread.link} selected={thread.current} icon={thread.mark} part="thread_list">
          {thread.name}
        </ui-item>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="thread_list">{"Finding your threads"}</ui-loader>,
          none: () => <ui-text class="none" color="grey" part="thread_list">No threads you can read.</ui-text>,
          failed: () => <ui-text color="red" part="thread_list">We can't find your threads right now.</ui-text>
        })}
      </ui-menu>
    )
  }
}

/**
 * `<test-project-app>`:  a chat page, drawn in its own element, e.g. by `draw the chat page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its chat page's properties;  its methods call its chat page's.
 * - What every view's element does, e.g. drawing its chat page, is `SpellElement`'s.
 */
export class ChatPageElement extends SpellElement<ChatPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "chat page", [
    { name: "new-message", kind: "json", description: "Its newMessage." },
    { name: "drawer-open", kind: "boolean", description: "Its drawerOpen." }
  ])

  openTheDrawer() {
    return this.currentThing?.openTheDrawer()
  }

  closeTheDrawer() {
    return this.currentThing?.closeTheDrawer()
  }

  drawThreadList() {
    return this.currentThing?.drawThreadList()
  }
}
core.useElement(ChatPage, ChatPageElement)
export const chatPage = new ChatPage()
// -----------
core.installStyles(undefined, `/* Chat:  a chat app filling the window, with only its messages scrolling, light or dark. */¬.org-chat {¬  display: flex;¬  flex-direction: column;¬  height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬/* The toolbar across the top:  a rule below it, the program's links close to its name, nothing making it tall. */¬.org-chat .top-bar {¬  flex: none;¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬.org-chat .top-bar::part(menu) {¬  margin-block: 0;¬}¬.org-chat .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬/* The sign-in menu's button sits quietly in the bar. */¬.org-chat .top-bar [slot="right"] {¬  --ui-button-padding: 0.4em 0.7em;¬}¬¬/* The button that opens the threads:  only on a phone, where the side bar is gone. */¬.org-chat .show-threads {¬  display: none;¬}¬¬/* The side bar and the thread beside it, taking all the room below the toolbar. */¬.org-chat .workspace {¬  flex: 1;¬  min-height: 0;¬  align-items: stretch;¬}¬¬.org-chat .sidebar {¬  flex: none;¬  width: 260px;¬  padding: 10px 8px;¬  overflow-y: auto;¬  background: light-dark(oklch(96% 0 0), oklch(22% 0 0));¬  border-inline-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬}¬¬/* The thread:  its name, its messages (which take the room left and scroll), and the box to write in. */¬.org-chat .main {¬  flex: 1;¬  min-width: 0;¬  min-height: 0;¬}¬¬.org-chat .thread-name {¬  flex: none;¬  padding: 12px 16px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬}¬¬/* Column-reverse:  it starts at the bottom, and stays there as messages arrive. */¬.org-chat .messages {¬  flex: 1;¬  min-height: 0;¬  display: flex;¬  flex-direction: column-reverse;¬  overflow-y: auto;¬  padding: 16px;¬}¬¬/* With no messages, the words sit in the middle of the room. */¬.org-chat .messages:has(.none) {¬  justify-content: center;¬  text-align: center;¬}¬¬.org-chat .message {¬  padding-block: 4px;¬}¬¬/* Who sent it:  their initials on a circle. */¬.org-chat .avatar {¬  flex: none;¬  width: 36px;¬  height: 36px;¬  display: grid;¬  place-content: center;¬  border-radius: 50%;¬  color: white;¬  background: var(--ui-primary);¬  font-size: 13px;¬  font-weight: 600;¬}¬¬.org-chat .text {¬  white-space: pre-wrap;¬  overflow-wrap: anywhere;¬}¬¬/* Delete stays quiet until the message is pointed at, or the button has the keyboard. */¬.org-chat .remove {¬  opacity: 0;¬}¬.org-chat .message:hover .remove,¬.org-chat .remove:focus-within {¬  opacity: 1;¬}¬¬/* A phone has nothing to point with. */¬@media (hover: none) {¬  .org-chat .remove {¬    opacity: 1;¬  }¬}¬¬/* The box to write in, the full width of the thread:  its Send button at the bottom beside it. */¬.org-chat .composer {¬  flex: none;¬  padding: 0 16px 16px;¬}¬¬.org-chat .composer ui-textarea {¬  flex: 1;¬  min-width: 0;¬}¬¬/* A phone:  the side bar goes, and the bars button opens the threads in a drawer. */¬@media (max-width: 640px) {¬  .org-chat .sidebar {¬    display: none;¬  }¬  .org-chat .show-threads {¬    display: inline-block;¬  }¬  .org-chat .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) chatPage.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `ChatPageElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
