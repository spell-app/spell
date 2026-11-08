import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Chat:  a team's open thread, live")
///////////////////////////////////////
// ## Chat:  a team's open thread, live
///////////////////////////////////////

/** A message:  what it says, and when;  who sent it is the space's to say, `by`. */
export class Message extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 767, end: 785 } })
  accessor text!: string

  // - its "by" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 789, end: 805 } })
  accessor by!: string

  // - its "sent" is text
  @prop({ type: "text", declaredAt: { path: "/OrgChat.api.spell", start: 809, end: 827 } })
  accessor sent!: string

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
  @prop({ init: () => new Message(), early: true })
  accessor newMessage!: Message

  send() {
    this.newMessage.sent = new Date()
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  @drawn draw() {
    return (
      <ui-container class="chat">
        <ui-stack>
          <ui-header size="large">Team chat</ui-header>
          <ui-stack class="message-list" spacing="sm">
            {core.drawRead(async () => await core.savedThings(Message, { sort: [{ field: "sent" }] }, "as drawn"), (message: Message) => core.drawThing(message), {
              waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Joining the thread"}</ui-loader>,
              none: () => <ui-text class="none" color="grey">{"Nothing yet:  say hello."}</ui-text>,
              failed: () => <ui-text color="red">We can't join this thread right now.</ui-text>
            })}
          </ui-stack>
          <ui-form prop:value={this.newMessage}>
            <ui-input name="text" placeholder="Write to the team" aria-label="Your message" fluid={true} action={true}>
              <ui-button class="send" slot="action" color="primary" disabled={this.newMessage.text === ""} onClick={core.pressed(this, () => this.send())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Send
              </ui-button>
            </ui-input>
          </ui-form>
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
