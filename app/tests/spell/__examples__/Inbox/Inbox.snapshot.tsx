import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Inbox:  where your messages are kept")
//////////////////////////////////////////
// ## Inbox:  where your messages are kept
//////////////////////////////////////////

/** A message, or a page a Manager sent:  its title and line, worked out again when you open it. */
export class Message extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 640, end: 661 } })
  accessor text!: string

  // - its "recipients" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 666, end: 693 } })
  accessor recipients!: string

  // - its "from" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 698, end: 719 } })
  accessor from!: string

  // - its "thread" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 724, end: 747 } })
  accessor thread!: string

  // - its "sent" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 752, end: 773 } })
  accessor sent!: string

  // - its "page" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 778, end: 799 } })
  accessor page!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 804, end: 826 } })
  accessor title!: string

  // - its "line" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 831, end: 852 } })
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

  static savedIn = {
    place: "my_inbox",
    collection: "messages",
    times: ["created", "modified"]
  }

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/Inbox.api.spell", start: 608, end: 628 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/Inbox.api.spell", start: 608, end: 628 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * How you hear of your inbox by mail:  one mail per message, a daily digest, or none.  The first one counts;
 * with none, a daily digest.  Every mail has a link that stops it.
 */
export class MailChoice extends Thing {
  // - its "how" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 1123, end: 1143 } })
  accessor how!: string

  @drawn draw() {
    return (
      <ui-form class="mail-choice" value={this}>
        <ui-field label="Mail me" inline={true}>
          <ui-select name="how">
            <ui-item value="each">One mail per message</ui-item>
            <ui-item value="digest">A daily digest</ui-item>
            <ui-item value="none">No mail</ui-item>
          </ui-select>
        </ui-field>
      </ui-form>
    )
  }

  static savedIn = {
    place: "my_inbox",
    collection: "mail_choices",
    times: ["created", "modified"], select: ["how"] }

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/Inbox.api.spell", start: 1091, end: 1111 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/Inbox.api.spell", start: 1091, end: 1111 } })
  accessor modified!: any /* spell: type unknown */
}

/** A shared space of the org you follow, as "events_team@rs":  what's new there reaches your inbox as an update. */
export class Subscription extends Thing {
  // - its "space" is text
  @prop({ type: "text", declaredAt: { path: "/Inbox.api.spell", start: 1350, end: 1372 } })
  accessor space!: string

  @drawn draw() {
    return (
      <ui-stack class="subscription" direction="horizontal" spacing="md" align="center">
        <ui-text>{this.space}</ui-text>
        <ui-button class="unsubscribe" icon="close" size="mini" appearance="transparent" aria-label="Stop following it" title="Stop following it" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = {
    place: "my_inbox",
    collection: "subscriptions",
    times: ["created", "modified"]
  }

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/Inbox.api.spell", start: 1318, end: 1338 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/Inbox.api.spell", start: 1318, end: 1338 } })
  accessor modified!: any /* spell: type unknown */
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
  checkedEvery: 30, firstReads: () => [[MailChoice], [Subscription], [Message, { sort: [{ field: "sent", descending: true }] }]] })

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

core.heading("How you hear of it, by mail:  pick one")
//## How you hear of it, by mail:  pick one

core.heading("A space you follow, and a button to stop")
//## A space you follow, and a button to stop

core.heading("The page:  write one, then every message, newest first, each with a Reply")
//## The page:  write one, then every message, newest first, each with a Reply

export class InboxPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "new message" is a new message
  @prop({ init: () => new Message(), early: true })
  accessor newMessage!: Message

  // - its "new subscription" is a new subscription
  @prop({ init: () => new Subscription(), early: true })
  accessor newSubscription!: Subscription

  send() {
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  replyToWhoInConversation(who: string, conversation: string) {
    this.newMessage.recipients = who
    this.newMessage.thread = conversation
  }

  chooseHow() {
    core.saveThing(new MailChoice({ how: "digest" }))
  }

  subscribe() {
    core.saveThing(this.newSubscription)
    this.newSubscription = new Subscription()
  }

  @drawn draw() {
    return (
      <ui-stack class="org-page" spacing="none">
        <ui-toolbar class="top-bar" appearance="text" aria-label="Inbox">
          <ui-text slot="title" size="large">Inbox</ui-text>
          <ui-item link="OrgChat">Chat</ui-item>
          <ui-item link="OrgFeed">Feed</ui-item>
          <ui-item link="OrgAdmin">Admin</ui-item>
          <ui-stack slot="right" direction="horizontal">{core.signInMenu()}</ui-stack>
        </ui-toolbar>
        <ui-container class="inbox">
          <ui-stack>
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
            <ui-segment class="mail">
              <ui-header size="medium">Mail</ui-header>
              <ui-stack class="mail-choices" spacing="sm">
                {core.drawRead(async () => await core.savedThings(MailChoice, {}, "as drawn"), (choice: MailChoice) => core.drawThing(choice), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading how you hear of it"}</ui-loader>, none: () => <ui-stack direction="horizontal" spacing="md" align="center" wrap={true}>
                  <ui-text color="grey">A daily digest of what's new, each morning.</ui-text>
                  <ui-button class="choose" size="small" onClick={core.pressed(this, () => this.chooseHow())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                    Choose
                  </ui-button>
                </ui-stack> })}
              </ui-stack>
            </ui-segment>
            <ui-segment class="subscriptions">
              <ui-header size="medium">Spaces you follow</ui-header>
              <ui-form prop:value={this.newSubscription}>
                <ui-input name="space" placeholder="events_team@rs" aria-label="A shared space of the org, by its address" fluid={true} action={true}>
                  <ui-button slot="action" color="primary" disabled={this.newSubscription.space === ""} onClick={core.pressed(this, () => this.subscribe())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                    Follow
                  </ui-button>
                </ui-input>
              </ui-form>
              <ui-stack class="subscription-list" spacing="sm">
                {core.drawRead(async () => await core.savedThings(Subscription, {}, "as drawn"), (subscription: Subscription) => core.drawThing(subscription), { none: () => <ui-text color="grey">None yet.</ui-text> })}
              </ui-stack>
            </ui-segment>
            <ui-segment class="messages">
              <ui-header size="medium">Conversations</ui-header>
              <ui-stack class="message-list" spacing="sm">
                {core.drawRead(async () => await core.savedThings(Message, { sort: [{ field: "sent", descending: true }] }, "as drawn"), (message: Message) => <ui-stack class="row" spacing="xs">
                  {core.drawThing(message)}
                  <ui-button class="reply" icon="reply" size="small" appearance="basic" title="Answer in this conversation:  fills in who it's to and the conversation" onClick={core.pressed(this, () => this.replyToWhoInConversation(message.from, message.thread))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                    Reply
                  </ui-button>
                </ui-stack>, {
                  waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading your inbox"}</ui-loader>,
                  none: () => <ui-text class="none" color="grey">Nothing yet.</ui-text>,
                  failed: () => <ui-text color="red">We can't read your inbox right now.</ui-text>
                })}
              </ui-stack>
            </ui-segment>
          </ui-stack>
        </ui-container>
      </ui-stack>
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
    { name: "new-message", kind: "json", description: "Its newMessage." },
    { name: "new-subscription", kind: "json", description: "Its newSubscription." }
  ])

  replyToWhoInConversation(who: string, conversation: string) {
    return this.currentThing?.replyToWhoInConversation(who, conversation)
  }

  chooseHow() {
    return this.currentThing?.chooseHow()
  }

  subscribe() {
    return this.currentThing?.subscribe()
  }
}
core.useElement(InboxPage, InboxPageElement)
export const inboxPage = new InboxPage()
// -----------
core.installStyles(undefined, `/* The toolbar across the top, who's signed in on its right;  the page the theme's colours, light or dark. */¬.org-page {¬  min-height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬.org-page .top-bar {¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬¬.org-page .top-bar::part(menu) {¬  margin-block: 0;¬}¬¬.org-page .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬.org-page ui-container > ui-stack {¬  padding-block: 16px;¬}¬¬/* A phone:  the links go, leaving the name and who's signed in. */¬@media (max-width: 640px) {¬  .org-page .top-bar ui-item {¬    display: none;¬  }¬}¬`)
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
