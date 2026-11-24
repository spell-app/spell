import { core, Thing, App, Place, h } from "@spell/core"

export class Message extends Thing {
  static { this.declareProp("text", { type: "text" }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  static { this.declareProp("recipients", { type: "text" }) }
  get recipients() { return this.getProp("recipients") }
  set recipients(value) { this.setProp("recipients", value) }

  static { this.declareProp("from", { type: "text" }) }
  get from() { return this.getProp("from") }
  set from(value) { this.setProp("from", value) }

  static { this.declareProp("thread", { type: "text" }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  static { this.declareProp("sent", { type: "text" }) }
  get sent() { return this.getProp("sent") }
  set sent(value) { this.setProp("sent", value) }

  static { this.declareProp("page", { type: "text" }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("line", { type: "text" }) }
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

  static savedIn = {
    place: "my_inbox",
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

export class MailChoice extends Thing {
  static { this.declareProp("how", { type: "text" }) }
  get how() { return this.getProp("how") }
  set how(value) { this.setProp("how", value) }

  draw() {
    return h("ui-form", { class: "mail-choice", "prop:value": this },
      h("ui-field", { label: "Mail me", inline: true },
        h("ui-select", { name: "how" },
          h("ui-item", { value: "each" }, "One mail per message"),
          h("ui-item", { value: "digest" }, "A daily digest"),
          h("ui-item", { value: "none" }, "No mail")
        )
      )
    )
  }

  static savedIn = {
    place: "my_inbox",
    collection: "mail_choices",
    times: ["created", "modified"], select: ["how"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Subscription extends Thing {
  static { this.declareProp("space", { type: "text" }) }
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

  static savedIn = {
    place: "my_inbox",
    collection: "subscriptions",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class MyInbox extends Place {}
export const myInbox = core.place(new MyInbox(), {
  name: "my_inbox",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__inbox",
  checkedEvery: 30
})

// -----------
export class InboxPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("newMessage", { init: () => new Message(), early: true }) }
  get newMessage() { return this.getProp("newMessage") }
  set newMessage(value) { this.setProp("newMessage", value) }

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
    return h("ui-stack", { class: "org-page", spacing: "none" },
      h("ui-toolbar", { class: "top-bar", appearance: "text", "aria-label": "Inbox" },
        h("ui-text", { slot: "title", size: "large" }, "Inbox"),
        h("ui-item", { link: "OrgChat" }, "Chat"),
        h("ui-item", { link: "OrgFeed" }, "Feed"),
        h("ui-item", { link: "OrgAdmin" }, "Admin"),
        h("ui-stack", { slot: "right", direction: "horizontal" }, () => core.signInMenu())
      ),
      h("ui-container", { class: "inbox" },
        h("ui-stack",
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
              () => core.drawRead(async () => await core.savedThings(MailChoice, {}, "as drawn"), (choice) => core.drawThing(choice), { waitingSay: () => "Reading how you hear of it", none: () => h("ui-stack", { direction: "horizontal", spacing: "md", align: "center", wrap: true },
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
                waitingSay: () => "Reading your inbox",
                none: () => h("ui-text", { class: "none", color: "grey" }, "Nothing yet."),
                failed: () => h("ui-text", { color: "red" }, "We can't read your inbox right now.")
              })
            )
          )
        )
      )
    )
  }
}
export const inboxPage = new InboxPage()
core.describeAction(InboxPage, "send", { title: "Send It", undoneAs: "Send It" })
core.describeAction(InboxPage, "replyToWhoInConversation", { title: "Reply to Who in Conversation", undoneAs: "Reply to Who in Conversation" })
core.describeAction(InboxPage, "chooseHow", { title: "Choose How", undoneAs: "Choose How" })
core.describeAction(InboxPage, "subscribe", { title: "Subscribe", undoneAs: "Subscribe" })
// -----------
core.installStyles(undefined, `/* The toolbar across the top, who's signed in on its right;  the page the theme's colours, light or dark. */¬.org-page {¬  min-height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬.org-page .top-bar {¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬¬.org-page .top-bar::part(menu) {¬  margin-block: 0;¬}¬¬.org-page .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬.org-page ui-container > ui-stack {¬  padding-block: 16px;¬}¬¬/* A phone:  the links go, leaving the name and who's signed in. */¬@media (max-width: 640px) {¬  .org-page .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) inboxPage.start()
