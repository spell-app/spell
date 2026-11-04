import { core, Thing, List, App, Place, h } from "@spell/core"

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
  get url() { return core.linked(this, "url", Issue) }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "repository url" is text
  static { this.declareProp("repositoryUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1319, end: 1347 } }) }
  get repositoryUrl() { return this.getProp("repositoryUrl") }
  set repositoryUrl(value) { this.setProp("repositoryUrl", value) }

  /** an address */
  // - its "labels url" is text
  static { this.declareProp("labelsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1366, end: 1390 } }) }
  get labelsUrl() { return this.getProp("labelsUrl") }
  set labelsUrl(value) { this.setProp("labelsUrl", value) }

  /** an address */
  // - its "comments url" is text
  static { this.declareProp("commentsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1409, end: 1435 } }) }
  get commentsUrl() { return this.getProp("commentsUrl") }
  set commentsUrl(value) { this.setProp("commentsUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1454, end: 1478 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1497, end: 1519 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1538, end: 1559 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "number" is a number
  static { this.declareProp("number", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1563, end: 1587 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1591, end: 1610 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "user" is an issue user
  static { this.declareProp("user", { type: "IssueUser", declaredAt: { path: "/GitHub.api.spell", start: 1614, end: 1641 } }) }
  get user() { return this.getProp("user") }
  set user(value) { this.setProp("user", value) }

  // - its "labels" is a list of labels
  static { this.declareProp("labels", { itemType: "Label", init: () => new List({ instanceType: "Label" }), declaredAt: { path: "/GitHub.api.spell", start: 1645, end: 1677 } }) }
  get labels() { return this.getProp("labels") }
  set labels(value) { this.setProp("labels", value) }

  // - its "state" is text
  static { this.declareProp("state", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1681, end: 1700 } }) }
  get state() { return this.getProp("state") }
  set state(value) { this.setProp("state", value) }

  // - its "locked" is yes or no
  static { this.declareProp("locked", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 1704, end: 1729 } }) }
  get locked() { return this.getProp("locked") }
  set locked(value) { this.setProp("locked", value) }

  // - its "assignees" is a list of text
  static { this.declareProp("assignees", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 1733, end: 1766 } }) }
  get assignees() { return this.getProp("assignees") }
  set assignees(value) { this.setProp("assignees", value) }

  // - its "comments" is a number
  static { this.declareProp("comments", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1770, end: 1796 } }) }
  get comments() { return this.getProp("comments") }
  set comments(value) { this.setProp("comments", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1800, end: 1826 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1830, end: 1856 } }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  // - its "author association" is text
  static { this.declareProp("authorAssociation", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1860, end: 1892 } }) }
  get authorAssociation() { return this.getProp("authorAssociation") }
  set authorAssociation(value) { this.setProp("authorAssociation", value) }

  // - its "issue field values" is a list of text
  static { this.declareProp("issueFieldValues", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 1896, end: 1938 } }) }
  get issueFieldValues() { return this.getProp("issueFieldValues") }
  set issueFieldValues(value) { this.setProp("issueFieldValues", value) }

  // - its "sub issues summary" is a sub issues summary
  static { this.declareProp("subIssuesSummary", { type: "SubIssuesSummary", declaredAt: { path: "/GitHub.api.spell", start: 1942, end: 1990 } }) }
  get subIssuesSummary() { return this.getProp("subIssuesSummary") }
  set subIssuesSummary(value) { this.setProp("subIssuesSummary", value) }

  // - its "issue dependencies summary" is an issue dependencies summary
  static { this.declareProp("issueDependenciesSummary", { type: "IssueDependenciesSummary", declaredAt: { path: "/GitHub.api.spell", start: 1994, end: 2059 } }) }
  get issueDependenciesSummary() { return this.getProp("issueDependenciesSummary") }
  set issueDependenciesSummary(value) { this.setProp("issueDependenciesSummary", value) }

  // - its "body" is text
  static { this.declareProp("body", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2063, end: 2081 } }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  // - its "reactions" is a reaction
  static { this.declareProp("reactions", { type: "Reaction", declaredAt: { path: "/GitHub.api.spell", start: 2085, end: 2114 } }) }
  get reactions() { return this.getProp("reactions") }
  set reactions(value) { this.setProp("reactions", value) }

  /** an address */
  // - its "timeline url" is text
  static { this.declareProp("timelineUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2118, end: 2144 } }) }
  get timelineUrl() { return this.getProp("timelineUrl") }
  set timelineUrl(value) { this.setProp("timelineUrl", value) }

  // - its "performed via github app" is a performed via github app
  static { this.declareProp("performedViaGithubApp", { type: "PerformedViaGithubApp", declaredAt: { path: "/GitHub.api.spell", start: 2163, end: 2223 } }) }
  get performedViaGithubApp() { return this.getProp("performedViaGithubApp") }
  set performedViaGithubApp(value) { this.setProp("performedViaGithubApp", value) }

  // - its "state reason" is text
  static { this.declareProp("stateReason", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2227, end: 2253 } }) }
  get stateReason() { return this.getProp("stateReason") }
  set stateReason(value) { this.setProp("stateReason", value) }

  // - its "draft" is yes or no
  static { this.declareProp("draft", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2257, end: 2281 } }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  // - its "pull request" is a pull request
  static { this.declareProp("pullRequest", { type: "PullRequest", declaredAt: { path: "/GitHub.api.spell", start: 2285, end: 2321 } }) }
  get pullRequest() { return this.getProp("pullRequest") }
  set pullRequest(value) { this.setProp("pullRequest", value) }

  draw() {
    return h("ui-card", { class: "issue" },
      h("ui-content",
        h("ui-header", "#", () => this.number, () => this.title),
        h("ui-meta", () => this.state, " · ", () => this.user.login, " · ", () => this.comments, " comments")
      )
    )
  }

  static savedIn = { place: "github", collection: "issues", select: ["number", "title", "user", "state", "comments"] }
}

export class Contributor extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2376, end: 2395 } }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2399, end: 2420 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2424, end: 2448 } }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2467, end: 2492 } }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2496, end: 2513 } }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2532, end: 2554 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2573, end: 2600 } }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2619, end: 2646 } }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2665, end: 2688 } }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2707, end: 2732 } }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2751, end: 2782 } }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2801, end: 2832 } }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2851, end: 2874 } }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2893, end: 2917 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2936, end: 2969 } }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 2988, end: 3024 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3028, end: 3056 } }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3060, end: 3089 } }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  // - its "contributions" is a number
  static { this.declareProp("contributions", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 3093, end: 3124 } }) }
  get contributions() { return this.getProp("contributions") }
  set contributions(value) { this.setProp("contributions", value) }

  draw() {
    return h("ui-card", { class: "person" },
      h("ui-image", { src: () => this.avatarUrl, alt: "" }),
      h("ui-content",
        h("ui-header", () => this.login),
        h("ui-meta", () => this.contributions, " contributions")
      )
    )
  }

  static savedIn = { place: "github", collection: "contributors", select: ["login", "avatarUrl", "contributions"] }
}

export class User extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3172, end: 3191 } }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/GitHub.api.spell", start: 3195, end: 3235 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3239, end: 3260 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3264, end: 3288 } }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3307, end: 3332 } }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3336, end: 3353 } }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3372, end: 3394 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3413, end: 3440 } }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3459, end: 3486 } }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3505, end: 3528 } }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3547, end: 3572 } }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3591, end: 3622 } }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3641, end: 3672 } }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3691, end: 3714 } }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3733, end: 3757 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3776, end: 3809 } }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 3828, end: 3864 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3868, end: 3896 } }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3900, end: 3929 } }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3933, end: 3951 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "company" is text
  static { this.declareProp("company", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3955, end: 3976 } }) }
  get company() { return this.getProp("company") }
  set company(value) { this.setProp("company", value) }

  /** an address */
  // - its "blog" is text
  static { this.declareProp("blog", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3980, end: 3998 } }) }
  get blog() { return this.getProp("blog") }
  set blog(value) { this.setProp("blog", value) }

  // - its "location" is text
  static { this.declareProp("location", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4017, end: 4039 } }) }
  get location() { return this.getProp("location") }
  set location(value) { this.setProp("location", value) }

  // - its "email" is text
  static { this.declareProp("email", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4043, end: 4062 } }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  // - its "twitter username" is text
  static { this.declareProp("twitterUsername", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4066, end: 4096 } }) }
  get twitterUsername() { return this.getProp("twitterUsername") }
  set twitterUsername(value) { this.setProp("twitterUsername", value) }

  // - its "public repos" is a number
  static { this.declareProp("publicRepos", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4100, end: 4130 } }) }
  get publicRepos() { return this.getProp("publicRepos") }
  set publicRepos(value) { this.setProp("publicRepos", value) }

  // - its "public gists" is a number
  static { this.declareProp("publicGists", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4134, end: 4164 } }) }
  get publicGists() { return this.getProp("publicGists") }
  set publicGists(value) { this.setProp("publicGists", value) }

  // - its "followers" is a number
  static { this.declareProp("followers", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4168, end: 4195 } }) }
  get followers() { return this.getProp("followers") }
  set followers(value) { this.setProp("followers", value) }

  // - its "following" is a number
  static { this.declareProp("following", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4199, end: 4226 } }) }
  get following() { return this.getProp("following") }
  set following(value) { this.setProp("following", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4230, end: 4256 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4260, end: 4286 } }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  drawCard() {
    return h("ui-card", { class: "person", part: "card" },
      h("ui-image", { src: () => this.avatarUrl, alt: "" }),
      h("ui-content",
        h("ui-header", () => this.name),
        h("ui-meta", () => this.login)
      ),
      h("ui-extra", () => this.publicRepos, " public repositories · ", () => this.followers, " followers")
    )
  }

  static savedIn = { place: "github", collection: "users", select: ["login", "number", "avatarUrl", "name", "publicRepos", "followers"] }
}

export class IssueUser extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }
}

export class Label extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "color" is text
  static { this.declareProp("color", { type: "text" }) }
  get color() { return this.getProp("color") }
  set color(value) { this.setProp("color", value) }

  // - its "default" is yes or no
  static { this.declareProp("default", { type: "choice" }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  // - its "description" is text
  static { this.declareProp("description", { type: "text" }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }
}

export class SubIssuesSummary extends Thing {
  // - its "total" is a number
  static { this.declareProp("total", { type: "number" }) }
  get total() { return this.getProp("total") }
  set total(value) { this.setProp("total", value) }

  // - its "completed" is a number
  static { this.declareProp("completed", { type: "number" }) }
  get completed() { return this.getProp("completed") }
  set completed(value) { this.setProp("completed", value) }

  // - its "percent completed" is a number
  static { this.declareProp("percentCompleted", { type: "number" }) }
  get percentCompleted() { return this.getProp("percentCompleted") }
  set percentCompleted(value) { this.setProp("percentCompleted", value) }
}

export class IssueDependenciesSummary extends Thing {
  // - its "blocked by" is a number
  static { this.declareProp("blockedBy", { type: "number" }) }
  get blockedBy() { return this.getProp("blockedBy") }
  set blockedBy(value) { this.setProp("blockedBy", value) }

  // - its "total blocked by" is a number
  static { this.declareProp("totalBlockedBy", { type: "number" }) }
  get totalBlockedBy() { return this.getProp("totalBlockedBy") }
  set totalBlockedBy(value) { this.setProp("totalBlockedBy", value) }

  // - its "blocking" is a number
  static { this.declareProp("blocking", { type: "number" }) }
  get blocking() { return this.getProp("blocking") }
  set blocking(value) { this.setProp("blocking", value) }

  // - its "total blocking" is a number
  static { this.declareProp("totalBlocking", { type: "number" }) }
  get totalBlocking() { return this.getProp("totalBlocking") }
  set totalBlocking(value) { this.setProp("totalBlocking", value) }
}

export class Reaction extends Thing {
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "total count" is a number
  static { this.declareProp("totalCount", { type: "number" }) }
  get totalCount() { return this.getProp("totalCount") }
  set totalCount(value) { this.setProp("totalCount", value) }

  // - its "laugh" is a number
  static { this.declareProp("laugh", { type: "number" }) }
  get laugh() { return this.getProp("laugh") }
  set laugh(value) { this.setProp("laugh", value) }

  // - its "hooray" is a number
  static { this.declareProp("hooray", { type: "number" }) }
  get hooray() { return this.getProp("hooray") }
  set hooray(value) { this.setProp("hooray", value) }

  // - its "confused" is a number
  static { this.declareProp("confused", { type: "number" }) }
  get confused() { return this.getProp("confused") }
  set confused(value) { this.setProp("confused", value) }

  // - its "heart" is a number
  static { this.declareProp("heart", { type: "number" }) }
  get heart() { return this.getProp("heart") }
  set heart(value) { this.setProp("heart", value) }

  // - its "rocket" is a number
  static { this.declareProp("rocket", { type: "number" }) }
  get rocket() { return this.getProp("rocket") }
  set rocket(value) { this.setProp("rocket", value) }

  // - its "eyes" is a number
  static { this.declareProp("eyes", { type: "number" }) }
  get eyes() { return this.getProp("eyes") }
  set eyes(value) { this.setProp("eyes", value) }
}

export class PerformedViaGithubApp extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "client id" is text
  static { this.declareProp("clientId", { type: "text" }) }
  get clientId() { return this.getProp("clientId") }
  set clientId(value) { this.setProp("clientId", value) }

  // - its "slug" is text
  static { this.declareProp("slug", { type: "text" }) }
  get slug() { return this.getProp("slug") }
  set slug(value) { this.setProp("slug", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "owner" is an owner
  static { this.declareProp("owner", { type: "Owner" }) }
  get owner() { return this.getProp("owner") }
  set owner(value) { this.setProp("owner", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "description" is text
  static { this.declareProp("description", { type: "text" }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }

  // - its "external url" is text
  static { this.declareProp("externalUrl", { type: "text" }) }
  get externalUrl() { return this.getProp("externalUrl") }
  set externalUrl(value) { this.setProp("externalUrl", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date" }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date" }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  // - its "permissions" is a permission
  static { this.declareProp("permissions", { type: "Permission" }) }
  get permissions() { return this.getProp("permissions") }
  set permissions(value) { this.setProp("permissions", value) }

  // - its "events" is a list of text
  static { this.declareProp("events", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get events() { return this.getProp("events") }
  set events(value) { this.setProp("events", value) }
}

export class Owner extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }
}

export class Permission extends Thing {
  // - its "actions" is text
  static { this.declareProp("actions", { type: "text" }) }
  get actions() { return this.getProp("actions") }
  set actions(value) { this.setProp("actions", value) }

  // - its "administration" is text
  static { this.declareProp("administration", { type: "text" }) }
  get administration() { return this.getProp("administration") }
  set administration(value) { this.setProp("administration", value) }

  // - its "checks" is text
  static { this.declareProp("checks", { type: "text" }) }
  get checks() { return this.getProp("checks") }
  set checks(value) { this.setProp("checks", value) }

  // - its "contents" is text
  static { this.declareProp("contents", { type: "text" }) }
  get contents() { return this.getProp("contents") }
  set contents(value) { this.setProp("contents", value) }

  // - its "discussions" is text
  static { this.declareProp("discussions", { type: "text" }) }
  get discussions() { return this.getProp("discussions") }
  set discussions(value) { this.setProp("discussions", value) }

  // - its "issues" is text
  static { this.declareProp("issues", { type: "text" }) }
  get issues() { return this.getProp("issues") }
  set issues(value) { this.setProp("issues", value) }

  // - its "members" is text
  static { this.declareProp("members", { type: "text" }) }
  get members() { return this.getProp("members") }
  set members(value) { this.setProp("members", value) }

  // - its "merge queues" is text
  static { this.declareProp("mergeQueues", { type: "text" }) }
  get mergeQueues() { return this.getProp("mergeQueues") }
  set mergeQueues(value) { this.setProp("mergeQueues", value) }

  // - its "metadata" is text
  static { this.declareProp("metadata", { type: "text" }) }
  get metadata() { return this.getProp("metadata") }
  set metadata(value) { this.setProp("metadata", value) }

  // - its "pull requests" is text
  static { this.declareProp("pullRequests", { type: "text" }) }
  get pullRequests() { return this.getProp("pullRequests") }
  set pullRequests(value) { this.setProp("pullRequests", value) }

  // - its "repository hooks" is text
  static { this.declareProp("repositoryHooks", { type: "text" }) }
  get repositoryHooks() { return this.getProp("repositoryHooks") }
  set repositoryHooks(value) { this.setProp("repositoryHooks", value) }

  // - its "statuses" is text
  static { this.declareProp("statuses", { type: "text" }) }
  get statuses() { return this.getProp("statuses") }
  set statuses(value) { this.setProp("statuses", value) }

  // - its "workflows" is text
  static { this.declareProp("workflows", { type: "text" }) }
  get workflows() { return this.getProp("workflows") }
  set workflows(value) { this.setProp("workflows", value) }
}

export class PullRequest extends Thing {
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "diff url" is text
  static { this.declareProp("diffUrl", { type: "text" }) }
  get diffUrl() { return this.getProp("diffUrl") }
  set diffUrl(value) { this.setProp("diffUrl", value) }

  // - its "patch url" is text
  static { this.declareProp("patchUrl", { type: "text" }) }
  get patchUrl() { return this.getProp("patchUrl") }
  set patchUrl(value) { this.setProp("patchUrl", value) }
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

export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  create() {
    this.tab = "github"
  }

  showServer(server) {
    this.tab = server
  }

  draw() {
    return [
      h("ui-toolbar", { class: "tabs", appearance: "secondary pointing", "aria-label": "Servers" },
        h("ui-item", {
          active: () => this.tab === "github",
          onClick: core.pressed(this, () => this.showServer("github")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "GitHub")
      ),
      this.tab === "github" ? core.drawThing(new GithubPage()) : undefined
    ]
  }
}
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

export class GithubPage extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  create() {
    this.login = "ryansolid"
  }

  /** Whoever has that login:  GitHub finds them by it, with no list of everyone */
  static { this.declareProp("person", { declaredAt: { path: "/GitHub.spellml", start: 522, end: 660 }, readsFrom: ["github"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(User, this.login)
  }, () => [this.login]) }

  draw() {
    return [
      h("ui-header", { size: "large" }, "Solid, on GitHub"),
      h("ui-form", { class: "find", value: this },
        h("ui-field", { label: "Anyone on GitHub, by their login" },
          h("ui-input", { name: "login", icon: "search", placeholder: "ryansolid" })
        )
      ),
      h("slot", { name: "profile" }, () => this.drawProfile()),
      h("ui-header", { size: "medium" }, "Who wrote it"),
      core.drawRead(async () => await core.savedThings(Contributor, {}, "as drawn"), (contributor) => core.drawThing(contributor), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking GitHub"),
        failedSay: () => "GitHub can't be reached just now.",
        items: () => h("ui-cards", { columns: "5", doubling: true })
      }),
      h("ui-header", { size: "medium" }, "Its issues"),
      core.drawRead(async () => await core.savedThings(Issue, {}, "as drawn"), (issue) => core.drawThing(issue), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking GitHub"),
        failedSay: () => "GitHub can't be reached just now.",
        items: () => h("ui-cards", { columns: "2", doubling: true })
      }),
      h("ui-text", { class: "credits", size: "small" },
        "From ",
        h("ui-link", { link: "https://docs.github.com/en/rest" }, "GitHub's REST API"),
        ", asked for as you look."
      )
    ]
  }

  static drawsWaiting = true
  drawProfile() {
    if (this.person) return this.person.drawCard()

    core.readRider("waiting", () => h("ui-loader", { visible: true, inline: true, text: true, part: "profile" }, "Asking GitHub"))
    core.readRider("failed", () => h("ui-text", { part: "profile" }, "Nobody on GitHub has that login."))
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
