import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Feed:  what's new across your org")
///////////////////////////////////////
// ## Feed:  what's new across your org
///////////////////////////////////////

/** A post, as its space has it:  who wrote it, what about, when, and where it's from. */
export class Post extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 627, end: 645 } })
  accessor text!: string

  // - its "topic" is text
  @prop({ type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 649, end: 668 } })
  accessor topic!: string

  // - its "posted" is text
  @prop({ type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 672, end: 692 } })
  accessor posted!: string

  // - its "by" is text
  @prop({ type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 696, end: 712 } })
  accessor by!: string

  // - its "space" is text
  @prop({ type: "text", declaredAt: { path: "/OrgFeed.api.spell", start: 716, end: 735 } })
  accessor space!: string

  /** How much of it you want:  2 more of it, 1 as it comes, 0 none */
  static { this.declareProp("weight", { declaredAt: { path: "/OrgFeed.spellml", start: 469, end: 681 }, readsFrom: ["my_feed"] }) }
  get weight() {
    if (this.by === "ana@rs" && this.topic === "art") return 2
    if (this.by === "ana@rs" && this.topic === "politics") return 0
    return 1
  }

  static { this.declareProp("isAFavourite", { declaredAt: { path: "/OrgFeed.spellml", start: 696, end: 738 }, readsFrom: ["my_feed"] }) }
  get isAFavourite() {
    return this.weight === 2
  }

  static { this.declareProp("isOrdinary", { declaredAt: { path: "/OrgFeed.spellml", start: 743, end: 782 }, readsFrom: ["my_feed"] }) }
  get isOrdinary() {
    return this.weight === 1
  }

  @drawn draw() {
    return (
      <ui-segment class="post">
        <ui-stack spacing="xs">
          <ui-stack direction="horizontal" spacing="md" align="center" wrap={true}>
            <ui-text class="by">{this.by}</ui-text>
            <ui-text class="space" color="grey">in {this.space}</ui-text>
            <ui-text class="posted" color="grey">{this.posted}</ui-text>
          </ui-stack>
          <ui-text class="text">{this.text}</ui-text>
        </ui-stack>
      </ui-segment>
    )
  }

  static savedIn = { place: "my_feed", collection: "posts" }
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

  @drawn draw() {
    return (
      <ui-container class="feed">
        <ui-stack>
          <ui-header size="large">What's new</ui-header>
          <ui-segment class="favourites">
            <ui-header size="medium">More of what you like</ui-header>
            <ui-stack class="favourite-list" spacing="sm">
              {core.drawRead(async () => core.sortedBy(core.filter(await core.savedThings(Post, {}, "looks through"), (post: Post) => post.isAFavourite), (item: Post) => core.descending(item.posted)), (post: Post) => core.drawThing(post), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading your feed"}</ui-loader>, none: () => <ui-text color="grey">Nothing yet.</ui-text> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="everything">
            <ui-header size="medium">Everything else</ui-header>
            <ui-stack class="post-list" spacing="sm">
              {core.drawRead(async () => core.sortedBy(core.filter(await core.savedThings(Post, {}, "looks through"), (post: Post) => post.isOrdinary), (item: Post) => core.descending(item.posted)), (post: Post) => core.drawThing(post), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading your feed"}</ui-loader>,
                none: () => <ui-text class="none" color="grey">Nothing new.</ui-text>,
                failed: () => <ui-text color="red">We can't read your feed right now.</ui-text>
              })}
            </ui-stack>
          </ui-segment>
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a feed page, drawn in its own element, e.g. by `draw the feed page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its feed page's properties;  its methods call its feed page's.
 * - What every view's element does, e.g. drawing its feed page, is `SpellElement`'s.
 */
export class FeedPageElement extends SpellElement<FeedPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "feed page", [])
}
core.useElement(FeedPage, FeedPageElement)
export const feedPage = new FeedPage()
// -----------
if (!core.isCarryingOver) feedPage.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `FeedPageElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
