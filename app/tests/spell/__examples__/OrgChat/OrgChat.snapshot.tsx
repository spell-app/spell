import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Chat:  every thread you can read, live")
////////////////////////////////////////////
// ## Chat:  every thread you can read, live
////////////////////////////////////////////

/** A message:  what it says, when, and which ad-hoc thread it's in;  who sent it is the space's to say, `by`. */
export class Message extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1006, end: 1024 } })
  accessor text!: string

  // - its "by" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1028, end: 1044 } })
  accessor by!: string

  // - its "sent" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1048, end: 1066 } })
  accessor sent!: string

  // - its "thread" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1070, end: 1090 } })
  accessor thread!: string

  @drawn draw() {
    return (
      <ui-segment class="message">
        <ui-stack spacing="xs">
          <ui-stack direction="horizontal" spacing="md" align="center" wrap={true}>
            <ui-text class="by">{this.by}</ui-text>
            <ui-text class="sent" color="grey">{this.sent}</ui-text>
            <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Delete this message" title="Delete this message:  yours, or anyone's if you manage the space" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-stack>
          <ui-text class="text">{this.text}</ui-text>
        </ui-stack>
      </ui-segment>
    )
  }

  static savedIn = { place: "chat", collection: "messages" }
}

/** A thread you can read:  whose it is, which side, an ad-hoc one's own id, and the page's address showing it. */
export class Thread extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1255, end: 1273 } })
  accessor name!: string

  // - its "side" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1277, end: 1295 } })
  accessor side!: string

  // - its "topic" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1299, end: 1318 } })
  accessor topic!: string

  // - its "link" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 1322, end: 1340 } })
  accessor link!: string

  // - its "current" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/OrgChat.api.spell", start: 1344, end: 1370 } })
  accessor current!: boolean

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
  @prop({ init: () => new Message(), early: true })
  accessor newMessage!: Message

  static { this.declareProp("picked", { declaredAt: { path: "/OrgChat.spellml", start: 1131, end: 1200 }, readsFrom: ["my_threads"] }) }
  get picked() { return core.waitedValue(this, "picked", async () => {
    return core.getItemAt(core.filter(await core.savedThings(Thread), (thread: Thread) => thread.current), 0)
  }) }

  async send() {
    this.newMessage.sent = new Date()
    this.newMessage.thread = (await core.answerOf(this, "picked")).topic
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  @drawn draw() {
    return (
      <ui-container class="chat">
        <ui-stack direction="horizontal" spacing="lg" align="start">
          <ui-list class="threads" appearance="link" aria-label="Threads">
            {core.drawRead(async () => await core.savedThings(Thread, { sort: [{ field: "name" }] }, "as drawn"), (thread: Thread) => <ui-item link={thread.link} selected={thread.current}>
              <ui-stack spacing="none">
                <ui-text class="name">{thread.name}</ui-text>
                <ui-text class="side" color="grey" size="small">{thread.side}</ui-text>
              </ui-stack>
            </ui-item>, {
              waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding your threads"}</ui-loader>,
              none: () => <ui-text class="none" color="grey">No threads you can read.</ui-text>,
              failed: () => <ui-text color="red">We can't find your threads right now.</ui-text>
            })}
          </ui-list>
          <ui-stack>
            <ui-header size="large">{core.whileWaiting(() => this.picked.name)}</ui-header>
            <ui-stack class="message-list" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Message, { filter: { thread: (await core.answerOf(this, "picked")).topic }, sort: [{ field: "sent" }] }, "as drawn"), (message: Message) => core.drawThing(message), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Joining the thread"}</ui-loader>,
                none: () => <ui-text class="none" color="grey">{"Nothing yet:  say hello."}</ui-text>,
                failed: () => <ui-text color="red">We can't join this thread right now.</ui-text>
              })}
            </ui-stack>
            <ui-form prop:value={this.newMessage}>
              <ui-input name="text" placeholder="Write to the thread" aria-label="Your message" fluid={true} action={true}>
                <ui-button class="send" slot="action" color="primary" disabled={this.newMessage.text === ""} onClick={core.pressed(this, async () => await this.send())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Send
                </ui-button>
              </ui-input>
            </ui-form>
          </ui-stack>
        </ui-stack>
      </ui-container>
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
    { name: "new-message", kind: "json", description: "Its newMessage." }
  ])
}
core.useElement(ChatPage, ChatPageElement)
export const chatPage = new ChatPage()
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
