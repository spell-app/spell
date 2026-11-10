import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Feed:  what's new across your org")
///////////////////////////////////////
// ## Feed:  what's new across your org
///////////////////////////////////////

/** A post, as its space has it:  who wrote it, what about, when, and where it's from. */
export class Post extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 627, end: 645 } }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  // - its "topic" is text
  static { this.declareProp("topic", { type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 649, end: 668 } }) }
  get topic() { return this.getProp("topic") }
  set topic(value) { this.setProp("topic", value) }

  // - its "posted" is text
  static { this.declareProp("posted", { type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 672, end: 692 } }) }
  get posted() { return this.getProp("posted") }
  set posted(value) { this.setProp("posted", value) }

  // - its "by" is text
  static { this.declareProp("by", { type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 696, end: 712 } }) }
  get by() { return this.getProp("by") }
  set by(value) { this.setProp("by", value) }

  // - its "space" is text
  static { this.declareProp("space", { type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 716, end: 735 } }) }
  get space() { return this.getProp("space") }
  set space(value) { this.setProp("space", value) }

  /** How much of it you want:  2 more of it, 1 as it comes, 0 none */
  static { this.declareProp("weight", { declaredAt: { path: "/OrgFeed.spell", start: 469, end: 681 }, readsFrom: ["my_feed"] }) }
  get weight() {
    if (this.by === "ana@rs" && this.topic === "art") return 2
    if (this.by === "ana@rs" && this.topic === "politics") return 0
    return 1
  }

  static { this.declareProp("isAFavourite", { declaredAt: { path: "/OrgFeed.spell", start: 696, end: 738 }, readsFrom: ["my_feed"] }) }
  get isAFavourite() {
    return this.weight === 2
  }

  static { this.declareProp("isOrdinary", { declaredAt: { path: "/OrgFeed.spell", start: 743, end: 782 }, readsFrom: ["my_feed"] }) }
  get isOrdinary() {
    return this.weight === 1
  }

  draw() {
    return h("ui-segment", { class: "post" },
      h("ui-stack", { spacing: "xs" },
        h("ui-stack", { direction: "horizontal", spacing: "md", align: "center", wrap: true },
          h("ui-text", { class: "by" }, () => this.by),
          h("ui-text", { class: "space", color: "grey" }, "in ", () => this.space),
          h("ui-text", { class: "posted", color: "grey" }, () => this.posted)
        ),
        h("ui-text", { class: "text" }, () => this.text)
      )
    )
  }

  static savedIn = {
    place: "my_feed",
    collection: "posts",
    times: ["created", "modified"], select: ["text", "topic", "posted", "by", "space"] }

  // - it lives in my feed
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgFeed.api.spell", start: 604, end: 623 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in my feed
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgFeed.api.spell", start: 604, end: 623 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/**
 * Everyone in an org has a feed there:  "@rs/__feed" is yours in the Rock Society, whoever you are.
 * It's every post in every space of RS you may read, each read as you;  a quiet event's are left out.
 * Your org's feed page names its own org on the next line.
 * Kept on this device:  opening it again, and each check, asks only for what's new since.
 */
export class MyFeed extends Place {}
export const myFeed = core.place(new MyFeed(), {
  name: "my_feed",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__feed",
  checkedEvery: 30,
  keptOnDevice: true
})

// -----------
core.heading("Feed")
//////////
// ## Feed
//////////
// What's new across your org:  every post in every space of it you may read.
// Where it's read from is in OrgFeed.api.spell, and only its first line knows.
// What you see more of, and none of, is the ranking below:  it's yours to change, in your own copy of this program.

core.heading("The ranking:  how much of each post you want")
//////////////////////////////////////////////////
// ## The ranking:  how much of each post you want
//////////////////////////////////////////////////
// 2:  more of it, at the top;  1:  as it comes;  0:  none of it.
// Bo's own:  more of Ana's art, none of her politics.

core.heading("The page:  your favourites first, then the rest, newest first")
//## The page:  your favourites first, then the rest, newest first

export class FeedPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  draw() {
    return h("ui-stack", { class: "org-page", spacing: "none" },
      h("ui-toolbar", { class: "top-bar", appearance: "text", "aria-label": "Feed" },
        h("ui-text", { slot: "title", size: "large" }, "Feed"),
        h("ui-item", { link: "OrgChat" }, "Chat"),
        h("ui-item", { link: "Inbox" }, "Inbox"),
        h("ui-item", { link: "OrgAdmin" }, "Admin"),
        h("ui-stack", { slot: "right", direction: "horizontal" }, () => core.signInMenu())
      ),
      h("ui-container", { class: "feed" },
        h("ui-stack",
          h("ui-header", { size: "large" }, "What's new"),
          h("ui-segment", { class: "favourites" },
            h("ui-header", { size: "medium" }, "More of what you like"),
            h("ui-stack", { class: "favourite-list", spacing: "sm" },
              () => core.drawRead(async () => core.sortedBy(core.filter(await core.savedThings(Post, {}, "looks through"), (post) => post.isAFavourite), (item) => core.descending(item.posted)), (post) => core.drawThing(post), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading your feed"), none: () => h("ui-text", { color: "grey" }, "Nothing yet.") })
            )
          ),
          h("ui-segment", { class: "everything" },
            h("ui-header", { size: "medium" }, "Everything else"),
            h("ui-stack", { class: "post-list", spacing: "sm" },
              () => core.drawRead(async () => core.sortedBy(core.filter(await core.savedThings(Post, {}, "looks through"), (post) => post.isOrdinary), (item) => core.descending(item.posted)), (post) => core.drawThing(post), {
                waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading your feed"),
                none: () => h("ui-text", { class: "none", color: "grey" }, "Nothing new."),
                failed: () => h("ui-text", { color: "red" }, "We can't read your feed right now.")
              })
            )
          )
        )
      )
    )
  }
}
export const feedPage = new FeedPage()
// -----------
core.installStyles(undefined, `/* The toolbar across the top, who's signed in on its right;  the page the theme's colours, light or dark. */¬.org-page {¬  min-height: 100dvh;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬.org-page .top-bar {¬  padding: 6px 12px;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬¬.org-page .top-bar::part(menu) {¬  margin-block: 0;¬}¬¬.org-page .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬.org-page ui-container > ui-stack {¬  padding-block: 16px;¬}¬¬/* A phone:  the links go, leaving the name and who's signed in. */¬@media (max-width: 640px) {¬  .org-page .top-bar ui-item {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) feedPage.start()
