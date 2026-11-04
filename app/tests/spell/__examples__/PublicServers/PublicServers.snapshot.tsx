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
          <ui-meta>{this.state} · {this.user.login} · {this.comments} comments</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = { place: "github", collection: "issues", select: ["number", "title", "user", "state", "comments"] }
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

  static savedIn = { place: "github", collection: "users", select: ["login", "number", "avatarUrl", "name", "publicRepos", "followers"] }
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
core.heading("Public Servers")
////////////////////
// ## Public Servers
////////////////////
// Servers other people run, each read through the Spell `spell place ingest` wrote for it, untouched:  each a page of its own.
// GitHub's is first.

@thing
export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  @prop({ type: "text" })
  accessor tab!: string

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
      </ui-toolbar>,
      this.tab === "github" ? core.drawThing(new GithubPage()) : undefined
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
    { name: "tab", kind: "string", description: "Its tab." }
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
    if (this.person) return this.person.drawCard()

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
core.installStyles(undefined, `.person image {¬  aspect-ratio: 1;¬}¬`)
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
