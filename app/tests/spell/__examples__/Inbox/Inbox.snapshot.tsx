import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Inbox:  where your messages are kept")
//////////////////////////////////////////
// ## Inbox:  where your messages are kept
//////////////////////////////////////////

/** A message, or a page a Manager sent:  its title and line, worked out again when you open it. */
export class Message extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 604, end: 622 } })
  accessor text!: string

  // - its "recipients" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 626, end: 650 } })
  accessor recipients!: string

  // - its "from" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 654, end: 672 } })
  accessor from!: string

  // - its "thread" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 676, end: 696 } })
  accessor thread!: string

  // - its "sent" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 700, end: 718 } })
  accessor sent!: string

  // - its "page" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 722, end: 740 } })
  accessor page!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 744, end: 763 } })
  accessor title!: string

  // - its "line" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 767, end: 785 } })
  accessor line!: string

  @drawn draw() {
    return (
      <ui-segment class="message">
        <ui-stack spacing="sm">
          <ui-stack direction="horizontal" spacing="md" align="center" wrap={true}>
            <ui-text class="from">{this.from}</ui-text>
            <ui-text class="to" color="grey">to {this.recipients}</ui-text>
            <ui-text class="sent" color="grey">{this.sent}</ui-text>
            <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Delete your copy" title="Delete your copy:  everyone else keeps theirs" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-stack>
          <ui-text class="text">{this.text}</ui-text>
          <ui-text class="title">{this.title}</ui-text>
          <ui-text class="line" color="grey">{this.line}</ui-text>
          <ui-text class="page" color="grey">{this.page}</ui-text>
        </ui-stack>
      </ui-segment>
    )
  }

  static savedIn = { place: "my_inbox", collection: "messages" }
}

/**
 * Everyone in an org has an inbox there:  "@rs/__inbox" is yours in the Rock Society, whoever you are.
 * Sending a message is adding it to your messages:  Spell writes a copy into each inbox it's to,
 * so deleting yours leaves theirs.  A message can't be changed once it's sent.
 * Your org's inbox page names its own org on the next line.
 */
export class MyInbox extends Place {}
export const myInbox = core.place(new MyInbox(), {
  name: "my_inbox",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__inbox",
  checkedEvery: 30
})

// -----------
core.heading("Inbox")
///////////
// ## Inbox
///////////
// Your inbox in an org:  the messages people in it send you, and the pages its Managers send.
// Where it's kept is in Inbox.api.spell, and only its first line knows.
// A message lands in each inbox it's to, so deleting yours leaves theirs;  it can't be changed once it's sent.

core.heading("A row for each:  who it's from, what it says, and its conversation")
//## A row for each:  who it's from, what it says, and its conversation

core.heading("The page:  write one, then every conversation")
//## The page:  write one, then every conversation

export class InboxPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "new message" is a new message
  @prop({ init: () => new Message(), early: true })
  accessor newMessage!: Message

  send() {
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  @drawn draw() {
    return (
      <ui-container class="inbox">
        <ui-stack>
          <ui-header size="large">Your inbox</ui-header>
          <ui-text class="who-reads" color="grey">
            The org's Board and its Admins can read your inbox, as they can every space in the org.
          </ui-text>
          <ui-segment class="write">
            <ui-header size="medium">Write to someone</ui-header>
            <ui-form prop:value={this.newMessage}>
              <ui-stack spacing="sm">
                <ui-input name="recipients" placeholder="bo@rs, cy@rs" aria-label="Who it's to, by their address" fluid={true} />
                <ui-input name="text" placeholder="What you'd like to say" aria-label="Your message" fluid={true} />
                <ui-input name="thread" placeholder="A conversation to answer in, if any" aria-label="The conversation it answers" fluid={true} />
                <ui-button class="send" color="primary" disabled={this.newMessage.recipients === ""} onClick={core.pressed(this, () => this.send())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Send
                </ui-button>
              </ui-stack>
            </ui-form>
          </ui-segment>
          <ui-segment class="messages">
            <ui-header size="medium">Conversations</ui-header>
            <ui-stack class="message-list" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Message, { sort: [{ field: "thread" }] }, "as drawn"), (message: Message) => core.drawThing(message), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading your inbox"}</ui-loader>,
                none: () => <ui-text class="none" color="grey">Nothing yet.</ui-text>,
                failed: () => <ui-text color="red">We can't read your inbox right now.</ui-text>
              })}
            </ui-stack>
          </ui-segment>
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  an inbox page, drawn in its own element, e.g. by `draw the inbox page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its inbox page's properties;  its methods call its inbox page's.
 * - What every view's element does, e.g. drawing its inbox page, is `SpellElement`'s.
 */
export class InboxPageElement extends SpellElement<InboxPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "inbox page", [
    { name: "new-message", kind: "json", description: "Its newMessage." }
  ])
}
core.useElement(InboxPage, InboxPageElement)
export const inboxPage = new InboxPage()
// -----------
if (!core.isCarryingOver) inboxPage.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `InboxPageElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
