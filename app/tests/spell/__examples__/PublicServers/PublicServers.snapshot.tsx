import { core, Thing, List, App, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("GitHub:  a repository's issues, the people who wrote it, and anyone by their login")
////////////////////////////////////////////////////////////////////////////////////////
// ## GitHub:  a repository's issues, the people who wrote it, and anyone by their login
////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in GitHub.spellml.
// `github` is what this wrote, from looking at the server:
//   spell place ingest https://api.github.com --into GitHub.api.spell --name github --no-ai --key-secret GITHUB_TOKEN
//     --collections "issues=/repos/solidjs/solid/issues,contributors=/repos/solidjs/solid/contributors,users=/users/{name}"
//     --samples ryansolid,octocat
// `spell place update GitHub.api.spell` looks again, and changes only this file and GitHub.api.json5.
// Its key is your own, named GITHUB_TOKEN, read from the environment and never written here (`gh auth token` gives one).
// Without it, GitHub answers 60 requests an hour;  with it, 5000.  A page in a browser always goes without.

export class Issue extends Thing {
  // - its "url" is an issue
  static { this.declareProp("url", { type: "Issue", link: true, declaredAt: { path: "/GitHub.api.spell", start: 1294, end: 1315 } }) }
  get url(): Issue { return core.linked(this, "url", Issue) as Issue }
  set url(value: Issue) { this.setProp("url", value) }

  /** an address */
  // - its "repository url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1319, end: 1347 } })
  accessor repositoryUrl!: string

  /** an address */
  // - its "labels url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1366, end: 1390 } })
  accessor labelsUrl!: string

  /** an address */
  // - its "comments url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1409, end: 1435 } })
  accessor commentsUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1454, end: 1478 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1497, end: 1519 } })
  accessor htmlUrl!: string

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1538, end: 1559 } })
  accessor nodeId!: string

  // - its "number" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1563, end: 1587 } })
  accessor number!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1591, end: 1610 } })
  accessor title!: string

  // - its "user" is an issue user
  @prop({ type: "IssueUser", declaredAt: { path: "/GitHub.api.spell", start: 1614, end: 1641 } })
  accessor user!: IssueUser

  // - its "labels" is a list of labels
  @prop({ itemType: "Label", init: () => new List<Label>({ instanceType: "Label" }), declaredAt: { path: "/GitHub.api.spell", start: 1645, end: 1677 } })
  accessor labels!: List<Label>

  // - its "state" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1681, end: 1700 } })
  accessor state!: string

  // - its "locked" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 1704, end: 1729 } })
  accessor locked!: boolean

  // - its "assignees" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 1733, end: 1766 } })
  accessor assignees!: List<string>

  // - its "comments" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1770, end: 1796 } })
  accessor comments!: number

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1800, end: 1826 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1830, end: 1856 } })
  accessor updatedAt!: Date

  // - its "author association" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1860, end: 1892 } })
  accessor authorAssociation!: string

  // - its "issue field values" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 1896, end: 1938 } })
  accessor issueFieldValues!: List<string>

  // - its "sub issues summary" is a sub issues summary
  @prop({ type: "SubIssuesSummary", declaredAt: { path: "/GitHub.api.spell", start: 1942, end: 1990 } })
  accessor subIssuesSummary!: SubIssuesSummary

  // - its "issue dependencies summary" is an issue dependencies summary
  @prop({ type: "IssueDependenciesSummary", declaredAt: { path: "/GitHub.api.spell", start: 1994, end: 2059 } })
  accessor issueDependenciesSummary!: IssueDependenciesSummary

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2063, end: 2081 } })
  accessor body!: string

  // - its "reactions" is a reaction
  @prop({ type: "Reaction", declaredAt: { path: "/GitHub.api.spell", start: 2085, end: 2114 } })
  accessor reactions!: Reaction

  /** an address */
  // - its "timeline url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2118, end: 2144 } })
  accessor timelineUrl!: string

  // - its "performed via github app" is a performed via github app
  @prop({ type: "PerformedViaGithubApp", declaredAt: { path: "/GitHub.api.spell", start: 2163, end: 2223 } })
  accessor performedViaGithubApp!: PerformedViaGithubApp

  // - its "state reason" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2227, end: 2253 } })
  accessor stateReason!: string

  // - its "draft" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2257, end: 2281 } })
  accessor draft!: boolean

  // - its "pull request" is a pull request
  @prop({ type: "PullRequest", declaredAt: { path: "/GitHub.api.spell", start: 2285, end: 2321 } })
  accessor pullRequest!: PullRequest

  @drawn draw() {
    return (
      <ui-card class="issue">
        <ui-content>
          <ui-header>#{this.number}{this.title}</ui-header>
          <ui-meta>{this.state} · {this.user?.login} · {core.whileWaiting(() => this.comments)} comments</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = { place: "github", collection: "issues", select: ["number", "title", "user", "state", "comments", "body"] }
}

export class Contributor extends Thing {
  // - its "login" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2376, end: 2395 } })
  accessor login!: string

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2399, end: 2420 } })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2424, end: 2448 } })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2467, end: 2492 } })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2496, end: 2513 } })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2532, end: 2554 } })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2573, end: 2600 } })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2619, end: 2646 } })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2665, end: 2688 } })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2707, end: 2732 } })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2751, end: 2782 } })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2801, end: 2832 } })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2851, end: 2874 } })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2893, end: 2917 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2936, end: 2969 } })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 2988, end: 3024 } })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3028, end: 3056 } })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3060, end: 3089 } })
  accessor siteAdmin!: boolean

  // - its "contributions" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 3093, end: 3124 } })
  accessor contributions!: number

  @drawn draw() {
    return (
      <ui-card class="person">
        <ui-image src={this.avatarUrl} alt="" />
        <ui-content>
          <ui-header>{this.login}</ui-header>
          <ui-meta>{this.contributions} contributions</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = { place: "github", collection: "contributors", select: ["login", "avatarUrl", "contributions"] }
}

export class User extends Thing {
  // - its "login" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3172, end: 3191 } })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/GitHub.api.spell", start: 3195, end: 3235 } })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3239, end: 3260 } })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3264, end: 3288 } })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3307, end: 3332 } })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3336, end: 3353 } })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3372, end: 3394 } })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3413, end: 3440 } })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3459, end: 3486 } })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3505, end: 3528 } })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3547, end: 3572 } })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3591, end: 3622 } })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3641, end: 3672 } })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3691, end: 3714 } })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3733, end: 3757 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3776, end: 3809 } })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 3828, end: 3864 } })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3868, end: 3896 } })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3900, end: 3929 } })
  accessor siteAdmin!: boolean

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3933, end: 3951 } })
  accessor name!: string

  // - its "company" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3955, end: 3976 } })
  accessor company!: string

  /** an address */
  // - its "blog" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3980, end: 3998 } })
  accessor blog!: string

  // - its "location" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4017, end: 4039 } })
  accessor location!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4043, end: 4062 } })
  accessor email!: string

  // - its "twitter username" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4066, end: 4096 } })
  accessor twitterUsername!: string

  // - its "public repos" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4100, end: 4130 } })
  accessor publicRepos!: number

  // - its "public gists" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4134, end: 4164 } })
  accessor publicGists!: number

  // - its "followers" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4168, end: 4195 } })
  accessor followers!: number

  // - its "following" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4199, end: 4226 } })
  accessor following!: number

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4230, end: 4256 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4260, end: 4286 } })
  accessor updatedAt!: Date

  drawCard() {
    return (
      <ui-card class="person" part="card">
        <ui-image src={this.avatarUrl} alt="" />
        <ui-content>
          <ui-header>{this.name}</ui-header>
          <ui-meta>{this.login}</ui-meta>
        </ui-content>
        <ui-extra>{this.publicRepos} public repositories · {this.followers} followers</ui-extra>
      </ui-card>
    )
  }

  static savedIn = { place: "github", collection: "users", select: ["login", "number", "avatarUrl", "name", "email", "publicRepos", "followers"] }
}

export class IssueUser extends Thing {
  // - its "login" is text
  @prop({ type: "text" })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  // - its "avatar url" is text
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  // - its "followers url" is text
  @prop({ type: "text" })
  accessor followersUrl!: string

  // - its "following url" is text
  @prop({ type: "text" })
  accessor followingUrl!: string

  // - its "gists url" is text
  @prop({ type: "text" })
  accessor gistsUrl!: string

  // - its "starred url" is text
  @prop({ type: "text" })
  accessor starredUrl!: string

  // - its "subscriptions url" is text
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  // - its "organizations url" is text
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  // - its "repos url" is text
  @prop({ type: "text" })
  accessor reposUrl!: string

  // - its "events url" is text
  @prop({ type: "text" })
  accessor eventsUrl!: string

  // - its "received events url" is text
  @prop({ type: "text" })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text" })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice" })
  accessor siteAdmin!: boolean
}

export class Label extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "color" is text
  @prop({ type: "text" })
  accessor color!: string

  // - its "default" is yes or no
  @prop({ type: "choice" })
  accessor default!: boolean

  // - its "description" is text
  @prop({ type: "text" })
  accessor description!: string
}

export class SubIssuesSummary extends Thing {
  // - its "total" is a number
  @prop({ type: "number" })
  accessor total!: number

  // - its "completed" is a number
  @prop({ type: "number" })
  accessor completed!: number

  // - its "percent completed" is a number
  @prop({ type: "number" })
  accessor percentCompleted!: number
}

export class IssueDependenciesSummary extends Thing {
  // - its "blocked by" is a number
  @prop({ type: "number" })
  accessor blockedBy!: number

  // - its "total blocked by" is a number
  @prop({ type: "number" })
  accessor totalBlockedBy!: number

  // - its "blocking" is a number
  @prop({ type: "number" })
  accessor blocking!: number

  // - its "total blocking" is a number
  @prop({ type: "number" })
  accessor totalBlocking!: number
}

export class Reaction extends Thing {
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  // - its "total count" is a number
  @prop({ type: "number" })
  accessor totalCount!: number

  // - its "laugh" is a number
  @prop({ type: "number" })
  accessor laugh!: number

  // - its "hooray" is a number
  @prop({ type: "number" })
  accessor hooray!: number

  // - its "confused" is a number
  @prop({ type: "number" })
  accessor confused!: number

  // - its "heart" is a number
  @prop({ type: "number" })
  accessor heart!: number

  // - its "rocket" is a number
  @prop({ type: "number" })
  accessor rocket!: number

  // - its "eyes" is a number
  @prop({ type: "number" })
  accessor eyes!: number
}

export class PerformedViaGithubApp extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "client id" is text
  @prop({ type: "text" })
  accessor clientId!: string

  // - its "slug" is text
  @prop({ type: "text" })
  accessor slug!: string

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  // - its "owner" is an owner
  @prop({ type: "Owner" })
  accessor owner!: Owner

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "description" is text
  @prop({ type: "text" })
  accessor description!: string

  // - its "external url" is text
  @prop({ type: "text" })
  accessor externalUrl!: string

  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  // - its "created at" is a date
  @prop({ type: "date" })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date" })
  accessor updatedAt!: Date

  // - its "permissions" is a permission
  @prop({ type: "Permission" })
  accessor permissions!: Permission

  // - its "events" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor events!: List<string>
}

export class Owner extends Thing {
  // - its "login" is text
  @prop({ type: "text" })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  // - its "avatar url" is text
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  // - its "followers url" is text
  @prop({ type: "text" })
  accessor followersUrl!: string

  // - its "following url" is text
  @prop({ type: "text" })
  accessor followingUrl!: string

  // - its "gists url" is text
  @prop({ type: "text" })
  accessor gistsUrl!: string

  // - its "starred url" is text
  @prop({ type: "text" })
  accessor starredUrl!: string

  // - its "subscriptions url" is text
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  // - its "organizations url" is text
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  // - its "repos url" is text
  @prop({ type: "text" })
  accessor reposUrl!: string

  // - its "events url" is text
  @prop({ type: "text" })
  accessor eventsUrl!: string

  // - its "received events url" is text
  @prop({ type: "text" })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text" })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice" })
  accessor siteAdmin!: boolean
}

export class Permission extends Thing {
  // - its "actions" is text
  @prop({ type: "text" })
  accessor actions!: string

  // - its "administration" is text
  @prop({ type: "text" })
  accessor administration!: string

  // - its "checks" is text
  @prop({ type: "text" })
  accessor checks!: string

  // - its "contents" is text
  @prop({ type: "text" })
  accessor contents!: string

  // - its "discussions" is text
  @prop({ type: "text" })
  accessor discussions!: string

  // - its "issues" is text
  @prop({ type: "text" })
  accessor issues!: string

  // - its "members" is text
  @prop({ type: "text" })
  accessor members!: string

  // - its "merge queues" is text
  @prop({ type: "text" })
  accessor mergeQueues!: string

  // - its "metadata" is text
  @prop({ type: "text" })
  accessor metadata!: string

  // - its "pull requests" is text
  @prop({ type: "text" })
  accessor pullRequests!: string

  // - its "repository hooks" is text
  @prop({ type: "text" })
  accessor repositoryHooks!: string

  // - its "statuses" is text
  @prop({ type: "text" })
  accessor statuses!: string

  // - its "workflows" is text
  @prop({ type: "text" })
  accessor workflows!: string
}

export class PullRequest extends Thing {
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  // - its "diff url" is text
  @prop({ type: "text" })
  accessor diffUrl!: string

  // - its "patch url" is text
  @prop({ type: "text" })
  accessor patchUrl!: string
}

export class Github extends Place {}
export const github = core.place(new Github(), {
  name: "github",
  kind: "web server",
  at: "https://api.github.com",
  keyNamed: "GITHUB_TOKEN",
  keyIfSet: true,
  nextPageInLink: true,
  checkedEvery: 1800,
  namesLike: "repository_url",
  collections: {
    issues: { at: "/repos/solidjs/solid/issues" },
    contributors: { at: "/repos/solidjs/solid/contributors" },
    users: { at: "/users/{id}", fields: { id: "login" } }
  }, firstReads: () => [[Contributor], [Issue]] })

// -----------
core.heading("Open Library:  books by what they're called, who wrote them, and their covers")
///////////////////////////////////////////////////////////////////////////////////
// ## Open Library:  books by what they're called, who wrote them, and their covers
///////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in OpenLibrary.spellml.
// `open library` is what this wrote, from looking at the server:
//   spell place ingest https://openlibrary.org --into OpenLibrary.api.spell --name "open library" --no-ai
//     --collections "books=/search.json?q=dune,authors=/authors/{name}.json,editions=/books/{name}.json"
//     --samples authors=OL79034A,editions=OL32848840M --pictures "cover_i=https://covers.openlibrary.org/b/id/{id}-M.jpg"
// `spell place update OpenLibrary.api.spell` looks again, and changes only this file and OpenLibrary.api.json5.
// It has no list of every book:  a program searches it, `every book where its title includes ...`.
// Each book's authors are their ids, each read from the author's own record when something reads it;
// its cover is a picture on another server, covers.openlibrary.org, its address built from the book's cover id.

export class Book extends Thing {
  // - its "authors" is a list of authors, stored as "author_key"
  static { this.declareProp("authors", { itemType: "Author", storedAs: "author_key", init: () => new List<Author>({ instanceType: "Author" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1489, end: 1547 } }) }
  get authors(): List<Author> { return core.linked(this, "authors", Author) as List<Author> }
  set authors(value: List<Author>) { this.setProp("authors", value) }

  // - its "author name" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1551, end: 1586 } })
  accessor authorName!: List<string>

  // - its "cover edition" is an edition, stored as "cover_edition_key"
  static { this.declareProp("coverEdition", { type: "Edition", storedAs: "cover_edition_key", link: true, declaredAt: { path: "/OpenLibrary.api.spell", start: 1590, end: 1654 } }) }
  get coverEdition(): Edition { return core.linked(this, "coverEdition", Edition) as Edition }
  set coverEdition(value: Edition) { this.setProp("coverEdition", value) }

  // - its "cover height" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1658, end: 1688 } })
  accessor coverHeight!: number

  /** a picture's address */
  // - its "cover i" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1692, end: 1713 } })
  accessor coverI!: string

  // - its "cover width" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1741, end: 1770 } })
  accessor coverWidth!: number

  // - its "ebook access" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1774, end: 1800 } })
  accessor ebookAccess!: string

  // - its "edition count" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1804, end: 1835 } })
  accessor editionCount!: number

  // - its "first publish year" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1839, end: 1875 } })
  accessor firstPublishYear!: number

  // - its "fulltext" is yes or no, stored as "has_fulltext"
  @prop({ type: "choice", storedAs: "has_fulltext", declaredAt: { path: "/OpenLibrary.api.spell", start: 1879, end: 1932 } })
  accessor fulltext!: boolean

  // - its "ia" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1936, end: 1962 } })
  accessor ia!: List<string>

  // - its "ia collection" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1966, end: 2003 } })
  accessor iaCollection!: List<string>

  // - its "language" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2007, end: 2039 } })
  accessor language!: List<string>

  // - its "lending edition s" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2043, end: 2074 } })
  accessor lendingEditionS!: string

  // - its "lending identifier s" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2078, end: 2112 } })
  accessor lendingIdentifierS!: string

  // - its "public scan b" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/OpenLibrary.api.spell", start: 2116, end: 2148 } })
  accessor publicScanB!: boolean

  // - its "series key" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2152, end: 2186 } })
  accessor seriesKey!: List<string>

  // - its "series name" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2190, end: 2225 } })
  accessor seriesName!: List<string>

  // - its "series position" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2229, end: 2268 } })
  accessor seriesPosition!: List<string>

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2272, end: 2291 } })
  accessor title!: string

  // - its "subtitle" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2295, end: 2317 } })
  accessor subtitle!: string

  /** Who wrote it first:  read from Open Library's record of them, by their id */
  static { this.declareProp("writer", { declaredAt: { path: "/OpenLibrary.spellml", start: 1714, end: 1850 }, readsFrom: ["open_library"] }) }
  get writer() {
    return core.getItemAt(this.authors, 0)
  }

  @drawn draw() {
    return (
      <ui-card class="book" onClick={core.pressed(this, async () => await this.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <ui-image src={this.coverI} alt="" />
        <ui-content>
          <ui-header>{this.title}</ui-header>
          <ui-meta>{core.getItemAt(this.authorName, 0)} · {this.firstPublishYear}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  drawPage() {
    return (
      <ui-stack class="book-page" direction="horizontal" wrap={true} align="start" part="page">
        <ui-image class="cover" src={this.coverI} alt="" />
        <ui-stack>
          <ui-header size="large">{this.title}</ui-header>
          <ui-text>First published in {this.firstPublishYear} · {this.editionCount} editions</ui-text>
          {this.drawWriting()}
        </ui-stack>
      </ui-stack>
    )
  }

  drawWriting() {
    if (this.writer) return this.writer.drawCard()

    core.readRider("waiting", () => <ui-loader visible={true} inline={true} text={true} part="writing">Asking Open Library who wrote it</ui-loader>)
    core.readRider("failed", () => <ui-text part="writing">Open Library can't say who wrote it just now.</ui-text>)
  }

  ///////////////////////////////////////
  // ## What a book can do, from anywhere
  ///////////////////////////////////////
  // Only this file can name the public servers:  so its other files ask this.

  async open() {
    publicServers.library.showing = this
  }

  static savedIn = { place: "open_library", collection: "books", select: ["authors", "authorName", "coverI", "editionCount", "firstPublishYear", "title"] }
}

export class Author extends Thing {
  // - its "links" is a list of links
  @prop({ itemType: "Link", init: () => new List<Link>({ instanceType: "Link" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2374, end: 2404 } })
  accessor links!: List<Link>

  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 2408, end: 2446 } })
  accessor kind!: Kind

  // - its "key" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2450, end: 2467 } })
  accessor key!: string

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2471, end: 2489 } })
  accessor name!: string

  // - its "source records" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2493, end: 2531 } })
  accessor sourceRecords!: List<string>

  // - its "birth date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2535, end: 2559 } })
  accessor birthDate!: string

  // - its "bio" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2563, end: 2580 } })
  accessor bio!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2584, end: 2603 } })
  accessor title!: string

  // - its "alternate names" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2607, end: 2646 } })
  accessor alternateNames!: List<string>

  // - its "remote ids" is a remote id
  @prop({ type: "RemoteId", declaredAt: { path: "/OpenLibrary.api.spell", start: 2650, end: 2681 } })
  accessor remoteIds!: RemoteId

  // - its "photos" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2685, end: 2718 } })
  accessor photos!: List<number>

  // - its "death date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2722, end: 2746 } })
  accessor deathDate!: string

  // - its "personal name" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2750, end: 2777 } })
  accessor personalName!: string

  // - its "latest revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2781, end: 2814 } })
  accessor latestRevision!: number

  // - its "revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2818, end: 2844 } })
  accessor revision!: number

  // - its "created" is a created
  @prop({ type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 2848, end: 2874 } })
  accessor created!: Created

  // - its "last modified" is a last modified
  @prop({ type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 2878, end: 2916 } })
  accessor lastModified!: LastModified

  drawCard() {
    return (
      <ui-card class="author" part="card">
        <ui-content>
          <ui-header>{this.name}</ui-header>
          <ui-meta>Born {this.birthDate}</ui-meta>
          <ui-description>{this.bio}</ui-description>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = { place: "open_library", collection: "authors", select: ["name", "birthDate", "bio", "title"] }
}

export class Edition extends Thing {
  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 2974, end: 3012 } })
  accessor kind!: Kind

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3016, end: 3035 } })
  accessor title!: string

  // - its "authors" is a list of edition authors
  @prop({ itemType: "EditionAuthor", init: () => new List<EditionAuthor>({ instanceType: "EditionAuthor" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3039, end: 3081 } })
  accessor authors!: List<EditionAuthor>

  // - its "publish date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3085, end: 3111 } })
  accessor publishDate!: string

  // - its "source records" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3115, end: 3153 } })
  accessor sourceRecords!: List<string>

  // - its "number of pages" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3157, end: 3190 } })
  accessor numberOfPages!: number

  // - its "publishers" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3194, end: 3228 } })
  accessor publishers!: List<string>

  // - its "physical format" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3232, end: 3261 } })
  accessor physicalFormat!: string

  // - its "notes" is a note
  @prop({ type: "Note", declaredAt: { path: "/OpenLibrary.api.spell", start: 3265, end: 3286 } })
  accessor notes!: Note

  // - its "full title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3290, end: 3314 } })
  accessor fullTitle!: string

  // - its "covers" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3318, end: 3351 } })
  accessor covers!: List<number>

  // - its "works" is a list of works
  @prop({ itemType: "Work", init: () => new List<Work>({ instanceType: "Work" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3355, end: 3385 } })
  accessor works!: List<Work>

  // - its "key" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3389, end: 3406 } })
  accessor key!: string

  // - its "local id" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3410, end: 3442 } })
  accessor localId!: List<string>

  // - its "latest revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3446, end: 3479 } })
  accessor latestRevision!: number

  // - its "revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3483, end: 3509 } })
  accessor revision!: number

  // - its "created" is a created
  @prop({ type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 3513, end: 3539 } })
  accessor created!: Created

  // - its "last modified" is a last modified
  @prop({ type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 3543, end: 3581 } })
  accessor lastModified!: LastModified

  static savedIn = { place: "open_library", collection: "editions", select: ["title", "authors"] }
}

export class Link extends Thing {
  // - its "title" is text
  @prop({ type: "text" })
  accessor title!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type" })
  accessor kind!: Kind
}

export class Kind extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string
}

export class RemoteId extends Thing {
  // - its "viaf" is a number
  @prop({ type: "number" })
  accessor viaf!: number

  // - its "wikidata" is text
  @prop({ type: "text" })
  accessor wikidata!: string

  // - its "isni" is a number
  @prop({ type: "number" })
  accessor isni!: number

  // - its "amazon" is text
  @prop({ type: "text" })
  accessor amazon!: string

  // - its "bookbrainz" is text
  @prop({ type: "text" })
  accessor bookbrainz!: string

  // - its "goodreads" is a number
  @prop({ type: "number" })
  accessor goodreads!: number

  // - its "gnd" is a number
  @prop({ type: "number" })
  accessor gnd!: number

  // - its "imdb" is text
  @prop({ type: "text" })
  accessor imdb!: string

  // - its "lc naf" is text
  @prop({ type: "text" })
  accessor lcNaf!: string

  // - its "librarything" is text
  @prop({ type: "text" })
  accessor librarything!: string

  // - its "musicbrainz" is text
  @prop({ type: "text" })
  accessor musicbrainz!: string

  // - its "storygraph" is text
  @prop({ type: "text" })
  accessor storygraph!: string

  // - its "inventaire" is text
  @prop({ type: "text" })
  accessor inventaire!: string

  // - its "librivox" is a number
  @prop({ type: "number" })
  accessor librivox!: number

  // - its "project gutenberg" is a number
  @prop({ type: "number" })
  accessor projectGutenberg!: number

  // - its "opac sbn" is text
  @prop({ type: "text" })
  accessor opacSbn!: string
}

export class Created extends Thing {
  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "value" is a date
  @prop({ type: "date" })
  accessor value!: Date
}

export class LastModified extends Thing {
  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "value" is a date
  @prop({ type: "date" })
  accessor value!: Date
}

export class EditionAuthor extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string
}

export class Note extends Thing {
  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "value" is text
  @prop({ type: "text" })
  accessor value!: string
}

export class Work extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string
}

export class OpenLibrary extends Place {}
export const openLibrary = core.place(new OpenLibrary(), {
  name: "open_library",
  kind: "web server",
  at: "https://openlibrary.org",
  idColumn: "key",
  rowsIn: "docs",
  checkedEvery: 30,
  namesLike: "author_key",
  searches: { param: "q", fields: ["titles"] },
  collections: {
    books: {
      at: "/search.json",
      searchedOnly: true,
      pictures: { coverI: "https://covers.openlibrary.org/b/id/{id}-M.jpg" }
    },
    authors: { at: "/authors/{id}.json" },
    editions: { at: "/books/{id}.json" }
  }
})

// -----------
core.heading("Open Library")
//////////////////
// ## Open Library
//////////////////
// Books by what they're called, who wrote them, and their covers.
// Every thing it shows is in OpenLibrary.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// Open Library has no list of every book, only a search:  so the page always searches, for what's typed.

@thing
export class OpenLibraryPage extends Thing {
  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "showing" is a book
  static { this.declareProp("showing", { type: "Book", link: true }) }
  get showing(): Book { return core.linked(this, "showing", Book) as Book }
  set showing(value: Book) { this.setProp("showing", value) }

  create() {
    this.search = "dune"
  }

  /** What the search finds:  Open Library looks, by the title, and gives back the first hundred */
  static { this.declareProp("found", { declaredAt: { path: "/OpenLibrary.spellml", start: 546, end: 715 }, readsFrom: ["open_library"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return core.filter(await core.savedThings(Book, { search: { title: this.search } }, "looks through"), (book: Book) => core.includes(book.title, this.search))
  }, () => [this.search]) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      <ui-header size="large">Books, from Open Library</ui-header>,
      <ui-form class="find" value={this}>
        <ui-field label="A book, by its title">
          <ui-input name="search" icon="search" placeholder="Dune" />
        </ui-field>
      </ui-form>,
      this.showing ? [
        <ui-button class="back" appearance="basic" icon="arrow left" onClick={core.pressed(this, async () => (this.showing = undefined))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Back
        </ui-button>,
        this.showing?.drawPage()
      ] : core.drawRead(() => this.found, (book: Book) => core.drawThing(book), {
        waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking Open Library"}</ui-loader>,
        none: () => <ui-text>{"No book is called that."}</ui-text>,
        failedSay: () => "Open Library can't be reached just now.",
        paging: () => "pages",
        items: () => <ui-cards columns="5" doubling={true} />
      }),
      <ui-text class="credits" size="small">
        {"From "}
        <ui-link link="https://openlibrary.org/developers/api">Open Library's API</ui-link>
        , asked for as you look;  its covers from its covers server.
      </ui-text>
    ]
  }
}

core.heading("A book")
////////////
// ## A book
////////////
// Its cover, its title and who wrote it:  on its card, the first name the search gave;  on its own page, its first author, read from their own record.

core.heading("Who wrote it")
//# Who wrote it

// -----------
core.heading("Public Servers")
////////////////////
// ## Public Servers
////////////////////
// Servers other people run, each read through the Spell `spell place ingest` wrote for it, untouched:  each a page of its own.
// GitHub's is first, then Open Library's, then JSONPlaceholder's, which takes writes.

@thing
export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  @prop({ type: "text" })
  accessor tab!: string

  // - its "library" is a new open library page
  @prop({ init: () => new OpenLibraryPage(), early: true })
  accessor library!: OpenLibraryPage

  create() {
    this.tab = "github"
  }

  showServer(server: string) {
    this.tab = server
  }

  @drawn draw() {
    return [
      <ui-toolbar class="tabs" appearance="secondary pointing" aria-label="Servers">
        <ui-item active={this.tab === "github"} onClick={core.pressed(this, () => this.showServer("github"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          GitHub
        </ui-item>
        <ui-item active={this.tab === "open library"} onClick={core.pressed(this, () => this.showServer("open library"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Open Library
        </ui-item>
        <ui-item active={this.tab === "jsonplaceholder"} onClick={core.pressed(this, () => this.showServer("jsonplaceholder"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          JSONPlaceholder
        </ui-item>
      </ui-toolbar>,
      this.tab === "github" ? core.drawThing(new GithubPage()) : this.tab === "open library" ? core.drawThing(this.library) : this.tab === "jsonplaceholder" ? core.drawThing(new JsonplaceholderPage()) : undefined
    ]
  }
}

/**
 * `<test-project-app>`:  a public server, drawn in its own element, e.g. by `draw the public server`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its public server's properties;  its methods call its public server's.
 * - What every view's element does, e.g. drawing its public server, is `SpellElement`'s.
 */
export class PublicServerElement extends SpellElement<PublicServer> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "public server", [
    { name: "tab", kind: "string", description: "Its tab." },
    { name: "library", kind: "json", description: "Its library." }
  ])

  create() {
    return this.currentThing?.create()
  }

  showServer(server: string) {
    return this.currentThing?.showServer(server)
  }
}
core.useElement(PublicServer, PublicServerElement)
export const publicServers = new PublicServer()

core.heading("What a book can do, from anywhere")
// -----------
core.heading("GitHub")
////////////
// ## GitHub
////////////
// Who wrote Solid, its issues, and anyone on GitHub by their login.
// Every thing it shows is in GitHub.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// A page in a browser holds no key:  it asks as anyone does, 60 times an hour, so it checks for changes every half hour.

@thing
export class GithubPage extends Thing {
  // - its "login" is text
  @prop({ type: "text" })
  accessor login!: string

  create() {
    this.login = "ryansolid"
  }

  /** Whoever has that login:  GitHub finds them by it, with no list of everyone */
  static { this.declareProp("person", { declaredAt: { path: "/GitHub.spellml", start: 522, end: 660 }, readsFrom: ["github"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(User, this.login)
  }, () => [this.login]) }

  @drawn draw() {
    return [
      <ui-header size="large">Solid, on GitHub</ui-header>,
      <ui-form class="find" value={this}>
        <ui-field label="Anyone on GitHub, by their login">
          <ui-input name="login" icon="search" placeholder="ryansolid" />
        </ui-field>
      </ui-form>,
      <slot name="profile">{this.drawProfile()}</slot>,
      <ui-header size="medium">Who wrote it</ui-header>,
      core.drawRead(async () => await core.savedThings(Contributor, {}, "as drawn"), (contributor: Contributor) => core.drawThing(contributor), {
        waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking GitHub"}</ui-loader>,
        failedSay: () => "GitHub can't be reached just now.",
        items: () => <ui-cards columns="5" doubling={true} />
      }),
      <ui-header size="medium">Its issues</ui-header>,
      core.drawRead(async () => await core.savedThings(Issue, {}, "as drawn"), (issue: Issue) => core.drawThing(issue), {
        waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking GitHub"}</ui-loader>,
        failedSay: () => "GitHub can't be reached just now.",
        items: () => <ui-cards columns="2" doubling={true} />
      }),
      <ui-text class="credits" size="small">
        {"From "}
        <ui-link link="https://docs.github.com/en/rest">GitHub's REST API</ui-link>
        , asked for as you look.
      </ui-text>
    ]
  }

  drawProfile() {
    if (this.person) return this.person?.drawCard()

    core.readRider("waiting", () => <ui-loader visible={true} inline={true} text={true} part="profile">Asking GitHub</ui-loader>)
    core.readRider("failed", () => <ui-text part="profile">Nobody on GitHub has that login.</ui-text>)
  }
}

core.heading("Someone on GitHub")
///////////////////////
// ## Someone on GitHub
///////////////////////
// Their picture, their name, and what they've made public.

core.heading("An issue")
//////////////
// ## An issue
//////////////
// Its number, its title, whose it is, and how much it's been talked about.

// -----------
core.heading("JSONPlaceholder:  posts and their comments, people, and their todos, on a server for practice")
///////////////////////////////////////////////////////////////////////////////////////////////////
// ## JSONPlaceholder:  posts and their comments, people, and their todos, on a server for practice
///////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in JSONPlaceholder.spellml.
// `jsonplaceholder` is what this wrote, from looking at the server:
//   spell place ingest https://jsonplaceholder.typicode.com --into JSONPlaceholder.api.spell --name jsonplaceholder
//     --no-ai --try-writes --collections "posts=/posts,comments=/comments,users=/users,todos=/todos"
// `spell place update JSONPlaceholder.api.spell` looks again, and changes only this file and JSONPlaceholder.api.json5.
// It takes adding, changing and deleting, and answers as if each was saved, but keeps nothing:
// what you add is gone when it's read again (JSONPlaceholder.api.json5, its "write").

export class Post extends Thing {
  // - its "user id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1295, end: 1320 } })
  accessor userId!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1324, end: 1343 } })
  accessor title!: string

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1347, end: 1365 } })
  accessor body!: string

  // - its "comments" is a list of comments
  static { this.declareProp("comments", { itemType: "Comment", init: () => new List<Comment>({ instanceType: "Comment" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1369, end: 1405 } }) }
  get comments(): List<Comment> { return core.linked(this, "comments", Comment) as List<Comment> }
  set comments(value: List<Comment>) { this.setProp("comments", value) }

  @drawn draw() {
    return [
      <ui-header size="small">{this.title}</ui-header>,
      <ui-text>{this.body}</ui-text>,
      core.drawRead(() => this.comments, (comment: Comment) => core.drawThing(comment), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking for its comments"}</ui-loader> })
    ]
  }

  static savedIn = { place: "jsonplaceholder", collection: "posts" }
}

export class Comment extends Thing {
  // - its "post id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1465, end: 1490 } })
  accessor postId!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1494, end: 1512 } })
  accessor name!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1516, end: 1535 } })
  accessor email!: string

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1539, end: 1557 } })
  accessor body!: string

  @drawn draw() {
    return (
      <ui-comment>
        <ui-content>
          <ui-author>{this.email}</ui-author>
          <ui-description>{this.body}</ui-description>
        </ui-content>
      </ui-comment>
    )
  }

  static savedIn = { place: "jsonplaceholder", collection: "comments", select: ["name", "email", "body"] }
}

export class JsonplaceholderUser extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1630, end: 1648 } })
  accessor name!: string

  // - its "username" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1652, end: 1674 } })
  accessor username!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1678, end: 1697 } })
  accessor email!: string

  // - its "address" is an address
  @prop({ type: "Address", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1701, end: 1728 } })
  accessor address!: Address

  // - its "phone" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1732, end: 1751 } })
  accessor phone!: string

  // - its "website" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1755, end: 1776 } })
  accessor website!: string

  // - its "company" is a company
  @prop({ type: "Company", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1780, end: 1806 } })
  accessor company!: Company

  // - its "posts" is a list of posts
  static { this.declareProp("posts", { itemType: "Post", init: () => new List<Post>({ instanceType: "Post" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1810, end: 1840 } }) }
  get posts(): List<Post> { return core.linked(this, "posts", Post) as List<Post> }
  set posts(value: List<Post>) { this.setProp("posts", value) }

  // - its "todos" is a list of todos
  static { this.declareProp("todos", { itemType: "Todo", init: () => new List<Todo>({ instanceType: "Todo" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1844, end: 1874 } }) }
  get todos(): List<Todo> { return core.linked(this, "todos", Todo) as List<Todo> }
  set todos(value: List<Todo>) { this.setProp("todos", value) }

  static savedIn = { place: "jsonplaceholder", collection: "jsonplaceholder_users", select: ["name", "email", "posts", "todos"] }
}

export class Todo extends Thing {
  // - its "user id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1931, end: 1956 } })
  accessor userId!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1960, end: 1979 } })
  accessor title!: string

  // - its "completed" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1983, end: 2011 } })
  accessor completed!: boolean

  @drawn draw() {
    return (
      <ui-form class="todo" value={this}>
        <ui-stack direction="horizontal" align="center">
          <ui-checkbox name="completed" label={this.title} />
          <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Remove" title="Remove" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
        </ui-stack>
      </ui-form>
    )
  }

  static savedIn = { place: "jsonplaceholder", collection: "todos" }
}

export class Address extends Thing {
  // - its "street" is text
  @prop({ type: "text" })
  accessor street!: string

  // - its "suite" is text
  @prop({ type: "text" })
  accessor suite!: string

  // - its "city" is text
  @prop({ type: "text" })
  accessor city!: string

  // - its "zipcode" is text
  @prop({ type: "text" })
  accessor zipcode!: string

  // - its "geo" is a geo
  @prop({ type: "Geo" })
  accessor geo!: Geo
}

export class Geo extends Thing {
  // - its "lat" is a number
  @prop({ type: "number" })
  accessor lat!: number

  // - its "lng" is a number
  @prop({ type: "number" })
  accessor lng!: number
}

export class Company extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "catch phrase" is text
  @prop({ type: "text" })
  accessor catchPhrase!: string

  // - its "bs" is text
  @prop({ type: "text" })
  accessor bs!: string
}

export class Jsonplaceholder extends Place {}
export const jsonplaceholder = core.place(new Jsonplaceholder(), {
  name: "jsonplaceholder",
  kind: "web server",
  at: "https://jsonplaceholder.typicode.com",
  checkedEvery: 30,
  searches: { param: "q", fields: ["names", "titles"] },
  collections: {
    posts: { at: "/posts" },
    comments: { at: "/comments" },
    jsonplaceholderUsers: { at: "/users" },
    todos: { at: "/todos" }
  },
  listsUnder: { posts: { comments: "/posts/{id}/comments" }, jsonplaceholderUsers: { posts: "/users/{id}/posts", todos: "/users/{id}/todos" } }
})

// -----------
core.heading("JSONPlaceholder")
/////////////////////
// ## JSONPlaceholder
/////////////////////
// A server for practice:  someone's todos to tick, add and remove, and posts with their comments.
// Every thing it shows is in JSONPlaceholder.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// It answers each change as if it saved it, and keeps nothing:  what you add here is gone when it's asked again.

export class JsonplaceholderPage extends Thing {
  // - its "new todo" is a new todo with user id = 1
  static { this.declareProp("newTodo", { init: () => new Todo({ userId: 1 }), early: true }) }
  get newTodo(): Todo { return core.linked(this, "newTodo", Todo) as Todo }
  set newTodo(value: Todo) { this.setProp("newTodo", value) }

  /** Whose todos and posts these are:  the first person it has */
  static { this.declareProp("person", { declaredAt: { path: "/JSONPlaceholder.spellml", start: 547, end: 676 }, readsFrom: ["jsonplaceholder"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(JsonplaceholderUser, 1)
  }) }

  /** Theirs, from every todo */
  static { this.declareProp("todos", { declaredAt: { path: "/JSONPlaceholder.spellml", start: 689, end: 778 }, readsFrom: ["jsonplaceholder"] }) }
  get todos() { return core.waitedValue(this, "todos", async () => {
    return await core.savedThings(Todo, { filter: { userId: 1 } })
  }) }

  async addTheNewTodo() {
    core.saveThing(await core.answerOf(this, "newTodo"))
    this.newTodo = new Todo({ userId: 1 })
  }

  @drawn draw() {
    return [
      <ui-header size="large">Practice, on JSONPlaceholder</ui-header>,
      <ui-text color="grey">
        Tick a todo, add one, remove one:  each goes to the server, which answers as if it saved it, and keeps nothing.
      </ui-text>,
      <ui-header size="medium">Their todos</ui-header>,
      <slot name="checklist">{this.drawChecklist()}</slot>,
      <ui-header size="medium">What they wrote</ui-header>,
      core.drawRead(() => this.person?.posts, (post: Post) => core.drawThing(post), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking JSONPlaceholder"}</ui-loader>, failedSay: () => "JSONPlaceholder can't be reached just now." }),
      <ui-text class="credits" size="small">
        {"From "}
        <ui-link link="https://jsonplaceholder.typicode.com">JSONPlaceholder</ui-link>
        , asked for as you look.
      </ui-text>
    ]
  }

  drawChecklist() {
    return [
      <ui-form class="new-todo" prop:value={this.newTodo}>
        <ui-field label="Something to do">
          <ui-input name="title" placeholder="Water the plants" />
        </ui-field>
      </ui-form>,
      <ui-button class="add" size="small" color="primary" disabled={this.newTodo.title === ""} onClick={core.pressed(this, async () => await this.addTheNewTodo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        Add
      </ui-button>,
      core.drawRead(() => this.todos, (todo: Todo) => core.drawThing(todo), { waiting: () => <ui-loader visible={true} inline={true} text={true} part="checklist">{"Asking JSONPlaceholder"}</ui-loader>, failedSay: () => "JSONPlaceholder can't be reached just now." })
    ]
  }
}

core.heading("A todo")
////////////
// ## A todo
////////////
// Ticked as it's done;  each tick, and each removal, goes to the server at once.

core.heading("A post")
////////////
// ## A post
////////////
// Its title, what it says, and its comments:  read from the post's own address, the first time it's drawn.

// Each comment, as Spell UI draws one:  named in full, `<ui-comment>`, as `<comment>` is a comment in spellml.

// -----------
core.installStyles(undefined, `.person image {¬  aspect-ratio: 1;¬}¬¬.book image {¬  aspect-ratio: 2 / 3;¬  object-fit: cover;¬}¬¬.book-page .cover {¬  max-width: 16rem;¬}¬`)
// -----------
if (!core.isCarryingOver) publicServers.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `PublicServerElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
