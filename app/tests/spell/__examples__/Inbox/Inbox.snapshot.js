import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Inbox:  where your messages are kept")
//////////////////////////////////////////
// ## Inbox:  where your messages are kept
//////////////////////////////////////////

/** A message, or a page a Manager sent:  its title and line, worked out again when you open it. */
export class Message extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 604, end: 622 } }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  // - its "recipients" is text
  static { this.declareProp("recipients", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 626, end: 650 } }) }
  get recipients() { return this.getProp("recipients") }
  set recipients(value) { this.setProp("recipients", value) }

  // - its "from" is text
  static { this.declareProp("from", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 654, end: 672 } }) }
  get from() { return this.getProp("from") }
  set from(value) { this.setProp("from", value) }

  // - its "thread" is text
  static { this.declareProp("thread", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 676, end: 696 } }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  // - its "sent" is text
  static { this.declareProp("sent", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 700, end: 718 } }) }
  get sent() { return this.getProp("sent") }
  set sent(value) { this.setProp("sent", value) }

  // - its "page" is text
  static { this.declareProp("page", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 722, end: 740 } }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 744, end: 763 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "line" is text
  static { this.declareProp("line", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 767, end: 785 } }) }
  get line() { return this.getProp("line") }
  set line(value) { this.setProp("line", value) }

  draw() {
    return h("ui-segment", { class: "message" },
      h("ui-stack", { spacing: "sm" },
        h("ui-stack", { direction: "horizontal", spacing: "md", align: "center", wrap: true },
          h("ui-text", { class: "from" }, () => this.from),
          h("ui-text", { class: "to", color: "grey" }, "to ", () => this.recipients),
          h("ui-text", { class: "sent", color: "grey" }, () => this.sent),
          h("ui-button", {
            class: "remove",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Delete your copy",
            title: "Delete your copy:  everyone else keeps theirs",
            onClick: core.pressed(this, () => core.removeSaved(this)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        ),
        h("ui-text", { class: "text" }, () => this.text),
        h("ui-text", { class: "title" }, () => this.title),
        h("ui-text", { class: "line", color: "grey" }, () => this.line),
        h("ui-text", { class: "page", color: "grey" }, () => this.page)
      )
    )
  }

  static savedIn = { place: "my_inbox", collection: "messages" }
}

/**
 * How you hear of your inbox by mail:  one mail per message, a daily digest, or none.  The first one counts;
 * with none, a daily digest.  Every mail has a link that stops it.
 */
export class MailChoice extends Thing {
  // - its "how" is text
  static { this.declareProp("how", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 1020, end: 1037 } }) }
  get how() { return this.getProp("how") }
  set how(value) { this.setProp("how", value) }

  draw() {
    return h("ui-form", { class: "mail-choice", value: this },
      h("ui-field", { label: "Mail me", inline: true },
        h("ui-select", { name: "how" },
          h("ui-item", { value: "each" }, "One mail per message"),
          h("ui-item", { value: "digest" }, "A daily digest"),
          h("ui-item", { value: "none" }, "No mail")
        )
      )
    )
  }

  static savedIn = { place: "my_inbox", collection: "mail_choices" }
}

/** A shared space of the org you follow, as "events_team@rs":  what's new there reaches your inbox as an update. */
export class Subscription extends Thing {
  // - its "space" is text
  static { this.declareProp("space", { type: "text", declaredAt: { path: "/Inbox.api.spell", start: 1208, end: 1227 } }) }
  get space() { return this.getProp("space") }
  set space(value) { this.setProp("space", value) }

  draw() {
    return h("ui-stack", { class: "subscription", direction: "horizontal", spacing: "md", align: "center" },
      h("ui-text", () => this.space),
      h("ui-button", {
        class: "unsubscribe",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Stop following it",
        title: "Stop following it",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "my_inbox", collection: "subscriptions" }
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
  static { this.declareProp("newMessage", { init: () => new Message(), early: true }) }
  get newMessage() { return this.getProp("newMessage") }
  set newMessage(value) { this.setProp("newMessage", value) }

  // - its "new subscription" is a new subscription
  static { this.declareProp("newSubscription", { init: () => new Subscription(), early: true }) }
  get newSubscription() { return this.getProp("newSubscription") }
  set newSubscription(value) { this.setProp("newSubscription", value) }

  send() {
    core.saveThing(this.newMessage)
    this.newMessage = new Message()
  }

  replyToWhoInConversation(who, conversation) {
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

  draw() {
    return h("ui-container", { class: "inbox" },
      h("ui-stack",
        h("ui-header", { size: "large" }, "Your inbox"),
        h("ui-text", { class: "who-reads", color: "grey" },
          "The org's Board and its Admins can read your inbox, as they can every space in the org."
        ),
        h("ui-segment", { class: "write" },
          h("ui-header", { size: "medium" }, "Write to someone"),
          h("ui-form", { "prop:value": () => this.newMessage },
            h("ui-stack", { spacing: "sm" },
              h("ui-input", {
                name: "recipients",
                placeholder: "bo@rs, cy@rs",
                "aria-label": "Who it's to, by their address",
                fluid: true
              }),
              h("ui-input", { name: "text", placeholder: "What you'd like to say", "aria-label": "Your message", fluid: true }),
              h("ui-input", {
                name: "thread",
                placeholder: "A conversation to answer in, if any",
                "aria-label": "The conversation it answers",
                fluid: true
              }),
              h("ui-button", {
                class: "send",
                color: "primary",
                disabled: () => this.newMessage.recipients === "",
                onClick: core.pressed(this, () => this.send()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Send")
            )
          )
        ),
        h("ui-segment", { class: "mail" },
          h("ui-header", { size: "medium" }, "Mail"),
          h("ui-stack", { class: "mail-choices", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(MailChoice, {}, "as drawn"), (choice) => core.drawThing(choice), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading how you hear of it"), none: () => h("ui-stack", { direction: "horizontal", spacing: "md", align: "center", wrap: true },
              h("ui-text", { color: "grey" }, "A daily digest of what's new, each morning."),
              h("ui-button", {
                class: "choose",
                size: "small",
                onClick: core.pressed(this, () => this.chooseHow()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Choose")
            ) })
          )
        ),
        h("ui-segment", { class: "subscriptions" },
          h("ui-header", { size: "medium" }, "Spaces you follow"),
          h("ui-form", { "prop:value": () => this.newSubscription },
            h("ui-input", {
              name: "space",
              placeholder: "events_team@rs",
              "aria-label": "A shared space of the org, by its address",
              fluid: true,
              action: true
            },
              h("ui-button", {
                slot: "action",
                color: "primary",
                disabled: () => this.newSubscription.space === "",
                onClick: core.pressed(this, () => this.subscribe()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Follow")
            )
          ),
          h("ui-stack", { class: "subscription-list", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Subscription, {}, "as drawn"), (subscription) => core.drawThing(subscription), { none: () => h("ui-text", { color: "grey" }, "None yet.") })
          )
        ),
        h("ui-segment", { class: "messages" },
          h("ui-header", { size: "medium" }, "Conversations"),
          h("ui-stack", { class: "message-list", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Message, { sort: [{ field: "sent", descending: true }] }, "as drawn"), (message) => h("ui-stack", { class: "row", spacing: "xs" },
              () => core.drawThing(message),
              h("ui-button", {
                class: "reply",
                icon: "reply",
                size: "small",
                appearance: "basic",
                title: "Answer in this conversation:  fills in who it's to and the conversation",
                onClick: core.pressed(this, () => this.replyToWhoInConversation(message.from, message.thread)),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Reply")
            ), {
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading your inbox"),
              none: () => h("ui-text", { class: "none", color: "grey" }, "Nothing yet."),
              failed: () => h("ui-text", { color: "red" }, "We can't read your inbox right now.")
            })
          )
        )
      )
    )
  }
}
export const inboxPage = new InboxPage()
// -----------
if (!core.isCarryingOver) inboxPage.start()
