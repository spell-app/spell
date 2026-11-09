import { core, Thing, List, App, Place, h } from "@spell/core"

core.heading("GitHub:  a repository's issues, the people who wrote it, anyone by their login, and a search of people and repositories")
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ## GitHub:  a repository's issues, the people who wrote it, anyone by their login, and a search of people and repositories
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in GitHub.spellml.
// `github` is what this wrote, from looking at the server:
//   spell place ingest https://api.github.com --into GitHub.api.spell --name github --no-ai --key-secret GITHUB_TOKEN
//     --collections "issues=/repos/solidjs/solid/issues,contributors=/repos/solidjs/solid/contributors,users=/users/{name},
//       users=/search/users?q=ryansolid,repositories=/search/repositories?q=solid"
//     --samples ryansolid,solidjs,octocat
// `spell place update GitHub.api.spell` looks again, and changes only this file and GitHub.api.json5.
// Its key is your own, named GITHUB_TOKEN, read from the environment and never written here (`gh auth token` gives one).
// Without it, GitHub answers 60 requests an hour;  with it, 5000.  A page in a browser always goes without.
// Its searches have a limit of their own:  10 a minute without a key, 30 with one.
// People and organizations are both users here:  their "kind" says which.

export class Issue extends Thing {
  // - its "url" is an issue
  static { this.declareProp("url", { type: "Issue", link: true, declaredAt: { path: "/GitHub.api.spell", start: 1751, end: 1772 } }) }
  get url() { return core.linked(this, "url", Issue) }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "repository url" is text
  static { this.declareProp("repositoryUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1776, end: 1804 } }) }
  get repositoryUrl() { return this.getProp("repositoryUrl") }
  set repositoryUrl(value) { this.setProp("repositoryUrl", value) }

  /** an address */
  // - its "labels url" is text
  static { this.declareProp("labelsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1823, end: 1847 } }) }
  get labelsUrl() { return this.getProp("labelsUrl") }
  set labelsUrl(value) { this.setProp("labelsUrl", value) }

  /** an address */
  // - its "comments url" is text
  static { this.declareProp("commentsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1866, end: 1892 } }) }
  get commentsUrl() { return this.getProp("commentsUrl") }
  set commentsUrl(value) { this.setProp("commentsUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1911, end: 1935 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1954, end: 1976 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1995, end: 2016 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "number" is a number
  static { this.declareProp("number", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 2020, end: 2044 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2048, end: 2067 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "user" is an issue user
  static { this.declareProp("user", { type: "IssueUser", declaredAt: { path: "/GitHub.api.spell", start: 2071, end: 2098 } }) }
  get user() { return this.getProp("user") }
  set user(value) { this.setProp("user", value) }

  // - its "labels" is a list of labels
  static { this.declareProp("labels", { itemType: "Label", init: () => new List({ instanceType: "Label" }), declaredAt: { path: "/GitHub.api.spell", start: 2102, end: 2134 } }) }
  get labels() { return this.getProp("labels") }
  set labels(value) { this.setProp("labels", value) }

  // - its "state" is text
  static { this.declareProp("state", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2138, end: 2157 } }) }
  get state() { return this.getProp("state") }
  set state(value) { this.setProp("state", value) }

  // - its "locked" is yes or no
  static { this.declareProp("locked", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2161, end: 2186 } }) }
  get locked() { return this.getProp("locked") }
  set locked(value) { this.setProp("locked", value) }

  // - its "assignees" is a list of assignees
  static { this.declareProp("assignees", { itemType: "Assignee", init: () => new List({ instanceType: "Assignee" }), declaredAt: { path: "/GitHub.api.spell", start: 2190, end: 2228 } }) }
  get assignees() { return this.getProp("assignees") }
  set assignees(value) { this.setProp("assignees", value) }

  // - its "comments" is a number
  static { this.declareProp("comments", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 2232, end: 2258 } }) }
  get comments() { return this.getProp("comments") }
  set comments(value) { this.setProp("comments", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2262, end: 2288 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2292, end: 2318 } }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  // - its "author association" is text
  static { this.declareProp("authorAssociation", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2322, end: 2354 } }) }
  get authorAssociation() { return this.getProp("authorAssociation") }
  set authorAssociation(value) { this.setProp("authorAssociation", value) }

  // - its "issue field values" is a list of text
  static { this.declareProp("issueFieldValues", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 2358, end: 2400 } }) }
  get issueFieldValues() { return this.getProp("issueFieldValues") }
  set issueFieldValues(value) { this.setProp("issueFieldValues", value) }

  // - its "sub issues summary" is a sub issues summary
  static { this.declareProp("subIssuesSummary", { type: "SubIssuesSummary", declaredAt: { path: "/GitHub.api.spell", start: 2404, end: 2452 } }) }
  get subIssuesSummary() { return this.getProp("subIssuesSummary") }
  set subIssuesSummary(value) { this.setProp("subIssuesSummary", value) }

  // - its "issue dependencies summary" is an issue dependencies summary
  static { this.declareProp("issueDependenciesSummary", { type: "IssueDependenciesSummary", declaredAt: { path: "/GitHub.api.spell", start: 2456, end: 2521 } }) }
  get issueDependenciesSummary() { return this.getProp("issueDependenciesSummary") }
  set issueDependenciesSummary(value) { this.setProp("issueDependenciesSummary", value) }

  // - its "body" is text
  static { this.declareProp("body", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2525, end: 2543 } }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  // - its "reactions" is a reaction
  static { this.declareProp("reactions", { type: "Reaction", declaredAt: { path: "/GitHub.api.spell", start: 2547, end: 2576 } }) }
  get reactions() { return this.getProp("reactions") }
  set reactions(value) { this.setProp("reactions", value) }

  /** an address */
  // - its "timeline url" is text
  static { this.declareProp("timelineUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2580, end: 2606 } }) }
  get timelineUrl() { return this.getProp("timelineUrl") }
  set timelineUrl(value) { this.setProp("timelineUrl", value) }

  // - its "performed via github app" is a performed via github app
  static { this.declareProp("performedViaGithubApp", { type: "PerformedViaGithubApp", declaredAt: { path: "/GitHub.api.spell", start: 2625, end: 2685 } }) }
  get performedViaGithubApp() { return this.getProp("performedViaGithubApp") }
  set performedViaGithubApp(value) { this.setProp("performedViaGithubApp", value) }

  // - its "state reason" is text
  static { this.declareProp("stateReason", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2689, end: 2715 } }) }
  get stateReason() { return this.getProp("stateReason") }
  set stateReason(value) { this.setProp("stateReason", value) }

  // - its "draft" is yes or no
  static { this.declareProp("draft", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2719, end: 2743 } }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  // - its "pull request" is a pull request
  static { this.declareProp("pullRequest", { type: "PullRequest", declaredAt: { path: "/GitHub.api.spell", start: 2747, end: 2783 } }) }
  get pullRequest() { return this.getProp("pullRequest") }
  set pullRequest(value) { this.setProp("pullRequest", value) }

  // - its "assignee" is an assignee
  static { this.declareProp("assignee", { type: "Assignee", declaredAt: { path: "/GitHub.api.spell", start: 2787, end: 2816 } }) }
  get assignee() { return this.getProp("assignee") }
  set assignee(value) { this.setProp("assignee", value) }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-header",
          () => this.title,
          h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
            h("ui-icon", { name: "github" })
          )
        ),
        h("ui-meta", "#", () => this.number, " · ", () => this.state)
      )
    )
  }

  static savedIn = { place: "github", collection: "issues", select: ["htmlUrl", "number", "title", "state", "comments", "createdAt", "body", "pullRequest"] }
}

export class Contributor extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2871, end: 2890 } }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2894, end: 2915 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2919, end: 2943 } }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2962, end: 2987 } }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2991, end: 3008 } }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3027, end: 3049 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3068, end: 3095 } }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3114, end: 3141 } }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3160, end: 3183 } }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3202, end: 3227 } }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3246, end: 3277 } }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3296, end: 3327 } }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3346, end: 3369 } }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3388, end: 3412 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3431, end: 3464 } }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 3483, end: 3519 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3523, end: 3551 } }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3555, end: 3584 } }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  // - its "contributions" is a number
  static { this.declareProp("contributions", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 3588, end: 3619 } }) }
  get contributions() { return this.getProp("contributions") }
  set contributions(value) { this.setProp("contributions", value) }

  static savedIn = { place: "github", collection: "contributors", select: ["login", "avatarUrl", "htmlUrl", "kind"] }
}

export class User extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3667, end: 3686 } }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/GitHub.api.spell", start: 3690, end: 3730 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3734, end: 3755 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3759, end: 3783 } }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3802, end: 3827 } }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3831, end: 3848 } }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3867, end: 3889 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3908, end: 3935 } }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3954, end: 3981 } }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4000, end: 4023 } }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4042, end: 4067 } }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4086, end: 4117 } }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4136, end: 4167 } }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4186, end: 4209 } }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4228, end: 4252 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4271, end: 4304 } }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 4323, end: 4359 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4363, end: 4391 } }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 4395, end: 4424 } }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4428, end: 4446 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "company" is text
  static { this.declareProp("company", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4450, end: 4471 } }) }
  get company() { return this.getProp("company") }
  set company(value) { this.setProp("company", value) }

  /** an address */
  // - its "blog" is text
  static { this.declareProp("blog", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4475, end: 4493 } }) }
  get blog() { return this.getProp("blog") }
  set blog(value) { this.setProp("blog", value) }

  // - its "location" is text
  static { this.declareProp("location", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4512, end: 4534 } }) }
  get location() { return this.getProp("location") }
  set location(value) { this.setProp("location", value) }

  // - its "email" is text
  static { this.declareProp("email", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4538, end: 4557 } }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  // - its "twitter username" is text
  static { this.declareProp("twitterUsername", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4561, end: 4591 } }) }
  get twitterUsername() { return this.getProp("twitterUsername") }
  set twitterUsername(value) { this.setProp("twitterUsername", value) }

  // - its "public repos" is a number
  static { this.declareProp("publicRepos", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4595, end: 4625 } }) }
  get publicRepos() { return this.getProp("publicRepos") }
  set publicRepos(value) { this.setProp("publicRepos", value) }

  // - its "public gists" is a number
  static { this.declareProp("publicGists", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4629, end: 4659 } }) }
  get publicGists() { return this.getProp("publicGists") }
  set publicGists(value) { this.setProp("publicGists", value) }

  // - its "followers" is a number
  static { this.declareProp("followers", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4663, end: 4690 } }) }
  get followers() { return this.getProp("followers") }
  set followers(value) { this.setProp("followers", value) }

  // - its "following" is a number
  static { this.declareProp("following", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4694, end: 4721 } }) }
  get following() { return this.getProp("following") }
  set following(value) { this.setProp("following", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4725, end: 4751 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4755, end: 4781 } }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  // - its "bio" is text
  static { this.declareProp("bio", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4785, end: 4802 } }) }
  get bio() { return this.getProp("bio") }
  set bio(value) { this.setProp("bio", value) }

  draw() {
    return h("ui-card", {
      onClick: core.pressed(this, async () => await this.lookAtUser()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-content",
        h("ui-stack", { direction: "horizontal", align: "center", spacing: "sm" },
          h("ui-image", { src: () => this.avatarUrl, alt: "", size: "mini", appearance: "circular" }),
          h("ui-stack", { spacing: "none", align: "start" },
            h("ui-header",
              () => this.login,
              h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
                h("ui-icon", { name: "github" })
              )
            ),
            h("ui-meta", () => this.kind)
          )
        )
      )
    )
  }

  drawPage() {
    return h("ui-stack", { spacing: "xl", part: "page" },
      h("ui-stack", { direction: "horizontal", align: "center", spacing: "sm" },
        h("ui-button", {
          icon: "arrow left",
          appearance: "basic",
          "aria-label": "Back",
          title: "Back",
          onClick: core.pressed(this, async () => await this.lookAwayFromUser()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }),
        h("ui-header", { size: "large" },
          () => this.name ? this.name : this.login,
          h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
            h("ui-icon", { name: "github" })
          )
        )
      ),
      h("ui-stack", { direction: "horizontal", wrap: true, align: "start", spacing: "md" },
        h("ui-image", { src: () => this.avatarUrl, alt: "", size: "small", appearance: "rounded" }),
        h("ui-stack", { spacing: "sm" },
          h("ui-text", { color: "grey" }, () => this.login, " · ", () => this.kind),
          h("ui-text", { hidden: () => this.bio ? undefined : true }, () => this.bio),
          h("ui-text", { size: "small", color: "grey", hidden: () => core.dateShown(this.createdAt) ? undefined : true },
            () => this.publicRepos,
            " public repositories · ",
            () => this.followers,
            " followers"
          )
        )
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "Most popular"),
        () => core.drawRead(async () => await core.savedThings(Repository, { search: { "*": `user:${this.login} sort:stars` } }, "as drawn"), (repository) => core.drawThing(repository), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" }, "Asking GitHub"),
          none: () => h("ui-text", { part: "page" }, "Nothing public yet."),
          paging: () => "pages",
          items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "page" })
        })
      )
    )
  }

  //////////////////////////////////////////////////
  // ## What someone on GitHub can do, from anywhere
  //////////////////////////////////////////////////
  // Shown on their own page, and put away again by its Back button, in the GitHub tab of the public servers.

  async lookAtUser() {
    publicServers.github.showing = this
  }

  async lookAwayFromUser() {
    publicServers.github.showing = undefined
  }

  static savedIn = { place: "github", collection: "users", select: ["login", "number", "avatarUrl", "htmlUrl", "kind", "name", "email", "publicRepos", "followers", "createdAt", "bio"] }
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

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
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

  /** an address */
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
  /** an address */
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

  /** an address */
  // - its "external url" is text
  static { this.declareProp("externalUrl", { type: "text" }) }
  get externalUrl() { return this.getProp("externalUrl") }
  set externalUrl(value) { this.setProp("externalUrl", value) }

  /** an address */
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

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
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

  // - its "repository creation" is text
  static { this.declareProp("repositoryCreation", { type: "text" }) }
  get repositoryCreation() { return this.getProp("repositoryCreation") }
  set repositoryCreation(value) { this.setProp("repositoryCreation", value) }
}

export class PullRequest extends Thing {
  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "diff url" is text
  static { this.declareProp("diffUrl", { type: "text" }) }
  get diffUrl() { return this.getProp("diffUrl") }
  set diffUrl(value) { this.setProp("diffUrl", value) }

  /** an address */
  // - its "patch url" is text
  static { this.declareProp("patchUrl", { type: "text" }) }
  get patchUrl() { return this.getProp("patchUrl") }
  set patchUrl(value) { this.setProp("patchUrl", value) }
}

export class Repository extends Thing {
  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8307, end: 8328 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8332, end: 8350 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "full name" is text
  static { this.declareProp("fullName", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8354, end: 8377 } }) }
  get fullName() { return this.getProp("fullName") }
  set fullName(value) { this.setProp("fullName", value) }

  // - its "private" is yes or no
  static { this.declareProp("private", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 8381, end: 8407 } }) }
  get private() { return this.getProp("private") }
  set private(value) { this.setProp("private", value) }

  // - its "owner" is an owner
  static { this.declareProp("owner", { type: "Owner", declaredAt: { path: "/GitHub.api.spell", start: 8411, end: 8434 } }) }
  get owner() { return this.getProp("owner") }
  set owner(value) { this.setProp("owner", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8438, end: 8460 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "description" is text
  static { this.declareProp("description", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8479, end: 8504 } }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }

  // - its "fork" is yes or no
  static { this.declareProp("fork", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 8508, end: 8531 } }) }
  get fork() { return this.getProp("fork") }
  set fork(value) { this.setProp("fork", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8535, end: 8552 } }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "forks url" is text
  static { this.declareProp("forksUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8571, end: 8594 } }) }
  get forksUrl() { return this.getProp("forksUrl") }
  set forksUrl(value) { this.setProp("forksUrl", value) }

  /** an address */
  // - its "keys url" is text
  static { this.declareProp("keysUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8613, end: 8635 } }) }
  get keysUrl() { return this.getProp("keysUrl") }
  set keysUrl(value) { this.setProp("keysUrl", value) }

  /** an address */
  // - its "collaborators url" is text
  static { this.declareProp("collaboratorsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8654, end: 8685 } }) }
  get collaboratorsUrl() { return this.getProp("collaboratorsUrl") }
  set collaboratorsUrl(value) { this.setProp("collaboratorsUrl", value) }

  /** an address */
  // - its "teams url" is text
  static { this.declareProp("teamsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8704, end: 8727 } }) }
  get teamsUrl() { return this.getProp("teamsUrl") }
  set teamsUrl(value) { this.setProp("teamsUrl", value) }

  /** an address */
  // - its "hooks url" is text
  static { this.declareProp("hooksUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8746, end: 8769 } }) }
  get hooksUrl() { return this.getProp("hooksUrl") }
  set hooksUrl(value) { this.setProp("hooksUrl", value) }

  /** an address */
  // - its "issue events url" is text
  static { this.declareProp("issueEventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8788, end: 8818 } }) }
  get issueEventsUrl() { return this.getProp("issueEventsUrl") }
  set issueEventsUrl(value) { this.setProp("issueEventsUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8837, end: 8861 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "assignees url" is text
  static { this.declareProp("assigneesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8880, end: 8907 } }) }
  get assigneesUrl() { return this.getProp("assigneesUrl") }
  set assigneesUrl(value) { this.setProp("assigneesUrl", value) }

  /** an address */
  // - its "branches url" is text
  static { this.declareProp("branchesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8926, end: 8952 } }) }
  get branchesUrl() { return this.getProp("branchesUrl") }
  set branchesUrl(value) { this.setProp("branchesUrl", value) }

  /** an address */
  // - its "tags url" is text
  static { this.declareProp("tagsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8971, end: 8993 } }) }
  get tagsUrl() { return this.getProp("tagsUrl") }
  set tagsUrl(value) { this.setProp("tagsUrl", value) }

  /** an address */
  // - its "blobs url" is text
  static { this.declareProp("blobsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9012, end: 9035 } }) }
  get blobsUrl() { return this.getProp("blobsUrl") }
  set blobsUrl(value) { this.setProp("blobsUrl", value) }

  /** an address */
  // - its "git tags url" is text
  static { this.declareProp("gitTagsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9054, end: 9080 } }) }
  get gitTagsUrl() { return this.getProp("gitTagsUrl") }
  set gitTagsUrl(value) { this.setProp("gitTagsUrl", value) }

  /** an address */
  // - its "git refs url" is text
  static { this.declareProp("gitRefsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9099, end: 9125 } }) }
  get gitRefsUrl() { return this.getProp("gitRefsUrl") }
  set gitRefsUrl(value) { this.setProp("gitRefsUrl", value) }

  /** an address */
  // - its "trees url" is text
  static { this.declareProp("treesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9144, end: 9167 } }) }
  get treesUrl() { return this.getProp("treesUrl") }
  set treesUrl(value) { this.setProp("treesUrl", value) }

  /** an address */
  // - its "statuses url" is text
  static { this.declareProp("statusesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9186, end: 9212 } }) }
  get statusesUrl() { return this.getProp("statusesUrl") }
  set statusesUrl(value) { this.setProp("statusesUrl", value) }

  /** an address */
  // - its "languages url" is text
  static { this.declareProp("languagesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9231, end: 9258 } }) }
  get languagesUrl() { return this.getProp("languagesUrl") }
  set languagesUrl(value) { this.setProp("languagesUrl", value) }

  /** an address */
  // - its "stargazers url" is text
  static { this.declareProp("stargazersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9277, end: 9305 } }) }
  get stargazersUrl() { return this.getProp("stargazersUrl") }
  set stargazersUrl(value) { this.setProp("stargazersUrl", value) }

  /** an address */
  // - its "contributors url" is text
  static { this.declareProp("contributorsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9324, end: 9354 } }) }
  get contributorsUrl() { return this.getProp("contributorsUrl") }
  set contributorsUrl(value) { this.setProp("contributorsUrl", value) }

  /** an address */
  // - its "subscribers url" is text
  static { this.declareProp("subscribersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9373, end: 9402 } }) }
  get subscribersUrl() { return this.getProp("subscribersUrl") }
  set subscribersUrl(value) { this.setProp("subscribersUrl", value) }

  /** an address */
  // - its "subscription url" is text
  static { this.declareProp("subscriptionUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9421, end: 9451 } }) }
  get subscriptionUrl() { return this.getProp("subscriptionUrl") }
  set subscriptionUrl(value) { this.setProp("subscriptionUrl", value) }

  /** an address */
  // - its "commits url" is text
  static { this.declareProp("commitsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9470, end: 9495 } }) }
  get commitsUrl() { return this.getProp("commitsUrl") }
  set commitsUrl(value) { this.setProp("commitsUrl", value) }

  /** an address */
  // - its "git commits url" is text
  static { this.declareProp("gitCommitsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9514, end: 9543 } }) }
  get gitCommitsUrl() { return this.getProp("gitCommitsUrl") }
  set gitCommitsUrl(value) { this.setProp("gitCommitsUrl", value) }

  /** an address */
  // - its "comments url" is text
  static { this.declareProp("commentsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9562, end: 9588 } }) }
  get commentsUrl() { return this.getProp("commentsUrl") }
  set commentsUrl(value) { this.setProp("commentsUrl", value) }

  /** an address */
  // - its "issue comment url" is text
  static { this.declareProp("issueCommentUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9607, end: 9638 } }) }
  get issueCommentUrl() { return this.getProp("issueCommentUrl") }
  set issueCommentUrl(value) { this.setProp("issueCommentUrl", value) }

  /** an address */
  // - its "contents url" is text
  static { this.declareProp("contentsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9657, end: 9683 } }) }
  get contentsUrl() { return this.getProp("contentsUrl") }
  set contentsUrl(value) { this.setProp("contentsUrl", value) }

  /** an address */
  // - its "compare url" is text
  static { this.declareProp("compareUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9702, end: 9727 } }) }
  get compareUrl() { return this.getProp("compareUrl") }
  set compareUrl(value) { this.setProp("compareUrl", value) }

  /** an address */
  // - its "merges url" is text
  static { this.declareProp("mergesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9746, end: 9770 } }) }
  get mergesUrl() { return this.getProp("mergesUrl") }
  set mergesUrl(value) { this.setProp("mergesUrl", value) }

  /** an address */
  // - its "archive url" is text
  static { this.declareProp("archiveUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9789, end: 9814 } }) }
  get archiveUrl() { return this.getProp("archiveUrl") }
  set archiveUrl(value) { this.setProp("archiveUrl", value) }

  /** an address */
  // - its "downloads url" is text
  static { this.declareProp("downloadsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9833, end: 9860 } }) }
  get downloadsUrl() { return this.getProp("downloadsUrl") }
  set downloadsUrl(value) { this.setProp("downloadsUrl", value) }

  /** an address */
  // - its "issues url" is text
  static { this.declareProp("issuesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9879, end: 9903 } }) }
  get issuesUrl() { return this.getProp("issuesUrl") }
  set issuesUrl(value) { this.setProp("issuesUrl", value) }

  /** an address */
  // - its "pulls url" is text
  static { this.declareProp("pullsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9922, end: 9945 } }) }
  get pullsUrl() { return this.getProp("pullsUrl") }
  set pullsUrl(value) { this.setProp("pullsUrl", value) }

  /** an address */
  // - its "milestones url" is text
  static { this.declareProp("milestonesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9964, end: 9992 } }) }
  get milestonesUrl() { return this.getProp("milestonesUrl") }
  set milestonesUrl(value) { this.setProp("milestonesUrl", value) }

  /** an address */
  // - its "notifications url" is text
  static { this.declareProp("notificationsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10011, end: 10042 } }) }
  get notificationsUrl() { return this.getProp("notificationsUrl") }
  set notificationsUrl(value) { this.setProp("notificationsUrl", value) }

  /** an address */
  // - its "labels url" is text
  static { this.declareProp("labelsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10061, end: 10085 } }) }
  get labelsUrl() { return this.getProp("labelsUrl") }
  set labelsUrl(value) { this.setProp("labelsUrl", value) }

  /** an address */
  // - its "releases url" is text
  static { this.declareProp("releasesUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10104, end: 10130 } }) }
  get releasesUrl() { return this.getProp("releasesUrl") }
  set releasesUrl(value) { this.setProp("releasesUrl", value) }

  /** an address */
  // - its "deployments url" is text
  static { this.declareProp("deploymentsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10149, end: 10178 } }) }
  get deploymentsUrl() { return this.getProp("deploymentsUrl") }
  set deploymentsUrl(value) { this.setProp("deploymentsUrl", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 10197, end: 10223 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 10227, end: 10253 } }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  // - its "pushed at" is a date
  static { this.declareProp("pushedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 10257, end: 10282 } }) }
  get pushedAt() { return this.getProp("pushedAt") }
  set pushedAt(value) { this.setProp("pushedAt", value) }

  // - its "git url" is text
  static { this.declareProp("gitUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10286, end: 10307 } }) }
  get gitUrl() { return this.getProp("gitUrl") }
  set gitUrl(value) { this.setProp("gitUrl", value) }

  // - its "ssh url" is text
  static { this.declareProp("sshUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10311, end: 10332 } }) }
  get sshUrl() { return this.getProp("sshUrl") }
  set sshUrl(value) { this.setProp("sshUrl", value) }

  /** an address */
  // - its "clone url" is text
  static { this.declareProp("cloneUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10336, end: 10359 } }) }
  get cloneUrl() { return this.getProp("cloneUrl") }
  set cloneUrl(value) { this.setProp("cloneUrl", value) }

  /** an address */
  // - its "svn url" is text
  static { this.declareProp("svnUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10378, end: 10399 } }) }
  get svnUrl() { return this.getProp("svnUrl") }
  set svnUrl(value) { this.setProp("svnUrl", value) }

  // - its "homepage" is text
  static { this.declareProp("homepage", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10418, end: 10440 } }) }
  get homepage() { return this.getProp("homepage") }
  set homepage(value) { this.setProp("homepage", value) }

  // - its "size" is a number
  static { this.declareProp("size", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10444, end: 10466 } }) }
  get size() { return this.getProp("size") }
  set size(value) { this.setProp("size", value) }

  // - its "stargazers count" is a number
  static { this.declareProp("stargazersCount", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10470, end: 10504 } }) }
  get stargazersCount() { return this.getProp("stargazersCount") }
  set stargazersCount(value) { this.setProp("stargazersCount", value) }

  // - its "watchers count" is a number
  static { this.declareProp("watchersCount", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10508, end: 10540 } }) }
  get watchersCount() { return this.getProp("watchersCount") }
  set watchersCount(value) { this.setProp("watchersCount", value) }

  // - its "language" is text
  static { this.declareProp("language", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10544, end: 10566 } }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "issues" is yes or no, stored as "has_issues"
  static { this.declareProp("issues", { type: "choice", storedAs: "has_issues", declaredAt: { path: "/GitHub.api.spell", start: 10570, end: 10619 } }) }
  get issues() { return this.getProp("issues") }
  set issues(value) { this.setProp("issues", value) }

  // - its "projects" is yes or no, stored as "has_projects"
  static { this.declareProp("projects", { type: "choice", storedAs: "has_projects", declaredAt: { path: "/GitHub.api.spell", start: 10623, end: 10676 } }) }
  get projects() { return this.getProp("projects") }
  set projects(value) { this.setProp("projects", value) }

  // - its "downloads" is yes or no, stored as "has_downloads"
  static { this.declareProp("downloads", { type: "choice", storedAs: "has_downloads", declaredAt: { path: "/GitHub.api.spell", start: 10680, end: 10735 } }) }
  get downloads() { return this.getProp("downloads") }
  set downloads(value) { this.setProp("downloads", value) }

  // - its "wiki" is yes or no, stored as "has_wiki"
  static { this.declareProp("wiki", { type: "choice", storedAs: "has_wiki", declaredAt: { path: "/GitHub.api.spell", start: 10739, end: 10784 } }) }
  get wiki() { return this.getProp("wiki") }
  set wiki(value) { this.setProp("wiki", value) }

  // - its "pages" is yes or no, stored as "has_pages"
  static { this.declareProp("pages", { type: "choice", storedAs: "has_pages", declaredAt: { path: "/GitHub.api.spell", start: 10788, end: 10835 } }) }
  get pages() { return this.getProp("pages") }
  set pages(value) { this.setProp("pages", value) }

  // - its "discussions" is yes or no, stored as "has_discussions"
  static { this.declareProp("discussions", { type: "choice", storedAs: "has_discussions", declaredAt: { path: "/GitHub.api.spell", start: 10839, end: 10898 } }) }
  get discussions() { return this.getProp("discussions") }
  set discussions(value) { this.setProp("discussions", value) }

  // - its "forks count" is a number
  static { this.declareProp("forksCount", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10902, end: 10931 } }) }
  get forksCount() { return this.getProp("forksCount") }
  set forksCount(value) { this.setProp("forksCount", value) }

  // - its "archived" is yes or no
  static { this.declareProp("archived", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10935, end: 10962 } }) }
  get archived() { return this.getProp("archived") }
  set archived(value) { this.setProp("archived", value) }

  // - its "disabled" is yes or no
  static { this.declareProp("disabled", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10966, end: 10993 } }) }
  get disabled() { return this.getProp("disabled") }
  set disabled(value) { this.setProp("disabled", value) }

  // - its "open issues count" is a number
  static { this.declareProp("openIssuesCount", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10997, end: 11032 } }) }
  get openIssuesCount() { return this.getProp("openIssuesCount") }
  set openIssuesCount(value) { this.setProp("openIssuesCount", value) }

  // - its "license" is a license
  static { this.declareProp("license", { type: "License", declaredAt: { path: "/GitHub.api.spell", start: 11036, end: 11062 } }) }
  get license() { return this.getProp("license") }
  set license(value) { this.setProp("license", value) }

  // - its "allow forking" is yes or no
  static { this.declareProp("allowForking", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 11066, end: 11098 } }) }
  get allowForking() { return this.getProp("allowForking") }
  set allowForking(value) { this.setProp("allowForking", value) }

  // - its "template" is yes or no, stored as "is_template"
  static { this.declareProp("template", { type: "choice", storedAs: "is_template", declaredAt: { path: "/GitHub.api.spell", start: 11102, end: 11154 } }) }
  get template() { return this.getProp("template") }
  set template(value) { this.setProp("template", value) }

  // - its "web commit signoff required" is yes or no
  static { this.declareProp("webCommitSignoffRequired", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 11158, end: 11204 } }) }
  get webCommitSignoffRequired() { return this.getProp("webCommitSignoffRequired") }
  set webCommitSignoffRequired(value) { this.setProp("webCommitSignoffRequired", value) }

  // - its "pull requests" is yes or no, stored as "has_pull_requests"
  static { this.declareProp("pullRequests", { type: "choice", storedAs: "has_pull_requests", declaredAt: { path: "/GitHub.api.spell", start: 11208, end: 11271 } }) }
  get pullRequests() { return this.getProp("pullRequests") }
  set pullRequests(value) { this.setProp("pullRequests", value) }

  // - its "pull request creation policy" is text
  static { this.declareProp("pullRequestCreationPolicy", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 11275, end: 11317 } }) }
  get pullRequestCreationPolicy() { return this.getProp("pullRequestCreationPolicy") }
  set pullRequestCreationPolicy(value) { this.setProp("pullRequestCreationPolicy", value) }

  // - its "topics" is a list of users
  static { this.declareProp("topics", { itemType: "User", init: () => new List({ instanceType: "User" }), declaredAt: { path: "/GitHub.api.spell", start: 11321, end: 11352 } }) }
  get topics() { return core.linked(this, "topics", User) }
  set topics(value) { this.setProp("topics", value) }

  // - its "visibility" is text
  static { this.declareProp("visibility", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 11356, end: 11380 } }) }
  get visibility() { return this.getProp("visibility") }
  set visibility(value) { this.setProp("visibility", value) }

  // - its "forks" is a number
  static { this.declareProp("forks", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 11384, end: 11407 } }) }
  get forks() { return this.getProp("forks") }
  set forks(value) { this.setProp("forks", value) }

  // - its "open issues" is a number
  static { this.declareProp("openIssues", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 11411, end: 11440 } }) }
  get openIssues() { return this.getProp("openIssues") }
  set openIssues(value) { this.setProp("openIssues", value) }

  // - its "watchers" is a number
  static { this.declareProp("watchers", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 11444, end: 11470 } }) }
  get watchers() { return this.getProp("watchers") }
  set watchers(value) { this.setProp("watchers", value) }

  // - its "default branch" is text
  static { this.declareProp("defaultBranch", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 11474, end: 11502 } }) }
  get defaultBranch() { return this.getProp("defaultBranch") }
  set defaultBranch(value) { this.setProp("defaultBranch", value) }

  // - its "permissions" is a permission
  static { this.declareProp("permissions", { type: "Permission", declaredAt: { path: "/GitHub.api.spell", start: 11506, end: 11539 } }) }
  get permissions() { return this.getProp("permissions") }
  set permissions(value) { this.setProp("permissions", value) }

  // - its "score" is a number
  static { this.declareProp("score", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 11543, end: 11566 } }) }
  get score() { return this.getProp("score") }
  set score(value) { this.setProp("score", value) }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-header",
          () => this.fullName,
          h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
            h("ui-icon", { name: "github" })
          )
        ),
        h("ui-meta",
          "★ ",
          () => this.stargazersCount,
          h("span", { hidden: () => this.language ? undefined : "until-found" }, " · ", () => this.language)
        ),
        h("ui-description", () => this.description)
      )
    )
  }

  static savedIn = { place: "github", collection: "repositories", select: ["name", "fullName", "htmlUrl", "description", "createdAt", "stargazersCount", "language"] }
}

export class Assignee extends Thing {
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

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
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

export class License extends Thing {
  // - its "key" is text
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "spdx id" is text
  static { this.declareProp("spdxId", { type: "text" }) }
  get spdxId() { return this.getProp("spdxId") }
  set spdxId(value) { this.setProp("spdxId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }
}

export class Github extends Place {}
export const github = core.place(new Github(), {
  name: "github",
  kind: "web server",
  at: "https://api.github.com",
  keyNamed: "GITHUB_TOKEN",
  keyIfSet: true,
  nextPageInLink: true,
  pageSize: 100,
  pageSizeAskedWith: "per_page",
  checkedEvery: 2400,
  namesLike: "repository_url",
  collections: {
    issues: { at: "/repos/solidjs/solid/issues" },
    contributors: { at: "/repos/solidjs/solid/contributors" },
    users: {
      at: "/users/{id}",
      fields: { id: "login" },
      searches: {
        param: "q",
        fields: [],
        at: "/search/users"
      }
    },
    repositories: {
      searches: {
        param: "q",
        fields: [],
        at: "/search/repositories"
      },
      at: "/search/repositories",
      searchedOnly: true
    }
  }, firstReads: () => [[Issue, { filter: { pullRequest: undefined }, page: { size: 6 } }], [Issue]] })

// -----------
core.heading("GitHub")
////////////
// ## GitHub
////////////
// Anyone on GitHub, a person or an organization, and any repository, found by what you type.
// Every thing it shows is in GitHub.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// A page in a browser holds no key:  it may search 10 times a minute, so the field waits for you to stop typing.

export class GithubPage extends Thing {
  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  // - its "showing" is a user
  static { this.declareProp("showing", { type: "User", link: true }) }
  get showing() { return core.linked(this, "showing", User) }
  set showing(value) { this.setProp("showing", value) }

  create() {
    this.search = "solid"
  }

  async tryWords(words) {
    this.showing = undefined
    this.search = words
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-form", { value: this },
        h("ui-stack", { spacing: "sm" },
          h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
            h("ui-header", { size: "large" }, "People and code, on GitHub"),
            h("ui-search", {
              name: "search",
              parameter: "who",
              icon: "search",
              placeholder: "A person, an organization, a repository",
              "aria-label": "Search GitHub"
            })
          ),
          h("ui-toolbar", { appearance: "secondary", size: "small", "aria-label": "Try a search" },
            h("ui-text", { slot: "title", size: "small", color: "grey" }, "Try"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("ryansolid")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "ryansolid"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("solidjs")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "solidjs"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("vite")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "vite"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("torvalds")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "torvalds"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("spreadsheet")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "spreadsheet")
          )
        )
      ),
      () => this.drawFound(),
      () => this.drawIssues(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://docs.github.com/en/rest" }, "GitHub's REST API"),
        ", asked for as you look."
      )
    )
  }

  // Solid's newest issues and pull requests, told apart:  GitHub lists both as issues, and only a pull request has a pull request
  drawIssues() {
    return h("ui-stack", { spacing: "sm", part: "issues" },
      h("ui-header", { size: "medium" }, "Solid's issues"),
      () => core.drawRead(async () => await core.savedThings(Issue, { filter: { pullRequest: undefined }, page: { size: 6 } }, "as drawn"), (issue) => core.drawThing(issue), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "issues" }, "Asking GitHub"),
        none: () => h("ui-text", { part: "issues" }, "No open issues."),
        items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "issues" })
      }),
      h("ui-header", { size: "medium" }, "Solid's pull requests"),
      () => core.drawRead(async () => core.firstFew(core.filter(await core.savedThings(Issue, {}, "looks through"), (issue) => issue.pullRequest !== undefined), 6), (issue) => core.drawThing(issue), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "issues" }, "Asking GitHub"),
        none: () => h("ui-text", { part: "issues" }, "No open pull requests."),
        items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "issues" })
      })
    )
  }

  // Someone's own page, while one is picked;  else what the search finds
  static drawsWaiting = true
  drawFound() {
    if (this.showing) return core.drawRead(async () => (await core.savedThingWithId(User, (await core.answerOf(this, "showing"))?.login)).drawPage(), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "found" }, "Asking GitHub") })
    else {
      return h("ui-stack", { spacing: "xl", part: "found" },
        h("ui-stack", { spacing: "sm" },
          h("ui-header", { size: "medium" }, "People and organizations"),
          () => core.drawRead(async () => await core.savedThings(User, { search: { "*": this.search } }, "as drawn"), (user) => core.drawThing(user), {
            waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "found" }, "Asking GitHub"),
            none: () => h("ui-text", { part: "found" }, "Nobody on GitHub goes by that."),
            paging: () => "pages",
            items: () => h("ui-cards", { columns: "4", doubling: true, stackable: true, part: "found" })
          })
        ),
        h("ui-stack", { spacing: "sm" },
          h("ui-header", { size: "medium" }, "Repositories"),
          () => core.drawRead(async () => await core.savedThings(Repository, { search: { "*": this.search } }, "as drawn"), (repository) => core.drawThing(repository), {
            waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "found" }, "Asking GitHub"),
            none: () => h("ui-text", { part: "found" }, "No repository matches that."),
            paging: () => "pages",
            items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "found" })
          })
        )
      )
    }
  }
}

core.heading("Someone on GitHub")
///////////////////////
// ## Someone on GitHub
///////////////////////
// A person or an organization:  a card in a search, and a page of their own, with their bio and their most popular repositories.
// A search gives only a little of each:  their page reads them whole, by their login.

core.heading("An issue")
//////////////
// ## An issue
//////////////
// GitHub lists a pull request among a repository's issues:  this page tells them apart by its "pull request".

core.heading("A repository")
//////////////////
// ## A repository
//////////////////
// Its name, what it's for, and how many people starred it;  its GitHub icon opens it on GitHub, in a new window.

core.heading("What someone on GitHub can do, from anywhere")
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
// A book's editions are read from its own list of them, when its page shows them.
// Each book's authors are their ids, each read from the author's own record when something reads it;
// its cover is a picture on another server, covers.openlibrary.org, its address built from the book's cover id.

export class Book extends Thing {
  // - its "authors" is a list of authors, stored as "author_key"
  static { this.declareProp("authors", { itemType: "Author", storedAs: "author_key", init: () => new List({ instanceType: "Author" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1622, end: 1680 } }) }
  get authors() { return core.linked(this, "authors", Author) }
  set authors(value) { this.setProp("authors", value) }

  // - its "author name" is a list of text
  static { this.declareProp("authorName", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1684, end: 1719 } }) }
  get authorName() { return this.getProp("authorName") }
  set authorName(value) { this.setProp("authorName", value) }

  // - its "cover edition" is an edition, stored as "cover_edition_key"
  static { this.declareProp("coverEdition", { type: "Edition", storedAs: "cover_edition_key", link: true, declaredAt: { path: "/OpenLibrary.api.spell", start: 1723, end: 1787 } }) }
  get coverEdition() { return core.linked(this, "coverEdition", Edition) }
  set coverEdition(value) { this.setProp("coverEdition", value) }

  // - its "cover height" is a number
  static { this.declareProp("coverHeight", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1791, end: 1821 } }) }
  get coverHeight() { return this.getProp("coverHeight") }
  set coverHeight(value) { this.setProp("coverHeight", value) }

  /** a picture's address */
  // - its "cover i" is text
  static { this.declareProp("coverI", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1825, end: 1846 } }) }
  get coverI() { return this.getProp("coverI") }
  set coverI(value) { this.setProp("coverI", value) }

  // - its "cover width" is a number
  static { this.declareProp("coverWidth", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1874, end: 1903 } }) }
  get coverWidth() { return this.getProp("coverWidth") }
  set coverWidth(value) { this.setProp("coverWidth", value) }

  // - its "ebook access" is text
  static { this.declareProp("ebookAccess", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1907, end: 1933 } }) }
  get ebookAccess() { return this.getProp("ebookAccess") }
  set ebookAccess(value) { this.setProp("ebookAccess", value) }

  // - its "edition count" is a number
  static { this.declareProp("editionCount", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1937, end: 1968 } }) }
  get editionCount() { return this.getProp("editionCount") }
  set editionCount(value) { this.setProp("editionCount", value) }

  // - its "first publish year" is a number
  static { this.declareProp("firstPublishYear", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1972, end: 2008 } }) }
  get firstPublishYear() { return this.getProp("firstPublishYear") }
  set firstPublishYear(value) { this.setProp("firstPublishYear", value) }

  // - its "fulltext" is yes or no, stored as "has_fulltext"
  static { this.declareProp("fulltext", { type: "choice", storedAs: "has_fulltext", declaredAt: { path: "/OpenLibrary.api.spell", start: 2012, end: 2065 } }) }
  get fulltext() { return this.getProp("fulltext") }
  set fulltext(value) { this.setProp("fulltext", value) }

  // - its "ia" is a list of text
  static { this.declareProp("ia", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2069, end: 2095 } }) }
  get ia() { return this.getProp("ia") }
  set ia(value) { this.setProp("ia", value) }

  // - its "ia collection" is a list of text
  static { this.declareProp("iaCollection", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2099, end: 2136 } }) }
  get iaCollection() { return this.getProp("iaCollection") }
  set iaCollection(value) { this.setProp("iaCollection", value) }

  // - its "language" is a list of text
  static { this.declareProp("language", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2140, end: 2172 } }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "lending edition s" is text
  static { this.declareProp("lendingEditionS", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2176, end: 2207 } }) }
  get lendingEditionS() { return this.getProp("lendingEditionS") }
  set lendingEditionS(value) { this.setProp("lendingEditionS", value) }

  // - its "lending identifier s" is text
  static { this.declareProp("lendingIdentifierS", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2211, end: 2245 } }) }
  get lendingIdentifierS() { return this.getProp("lendingIdentifierS") }
  set lendingIdentifierS(value) { this.setProp("lendingIdentifierS", value) }

  // - its "public scan b" is yes or no
  static { this.declareProp("publicScanB", { type: "choice", declaredAt: { path: "/OpenLibrary.api.spell", start: 2249, end: 2281 } }) }
  get publicScanB() { return this.getProp("publicScanB") }
  set publicScanB(value) { this.setProp("publicScanB", value) }

  // - its "editions" is a list of editions
  static { this.declareProp("editions", { itemType: "Edition", init: () => new List({ instanceType: "Edition" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2285, end: 2321 } }) }
  get editions() { return core.linked(this, "editions", Edition) }
  set editions(value) { this.setProp("editions", value) }

  // - its "series key" is a list of text
  static { this.declareProp("seriesKey", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2325, end: 2359 } }) }
  get seriesKey() { return this.getProp("seriesKey") }
  set seriesKey(value) { this.setProp("seriesKey", value) }

  // - its "series name" is a list of text
  static { this.declareProp("seriesName", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2363, end: 2398 } }) }
  get seriesName() { return this.getProp("seriesName") }
  set seriesName(value) { this.setProp("seriesName", value) }

  // - its "series position" is a list of text
  static { this.declareProp("seriesPosition", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2402, end: 2441 } }) }
  get seriesPosition() { return this.getProp("seriesPosition") }
  set seriesPosition(value) { this.setProp("seriesPosition", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2445, end: 2464 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "subtitle" is text
  static { this.declareProp("subtitle", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2468, end: 2490 } }) }
  get subtitle() { return this.getProp("subtitle") }
  set subtitle(value) { this.setProp("subtitle", value) }

  /** Who wrote it first:  read from Open Library's record of them, by their id */
  static { this.declareProp("writer", { declaredAt: { path: "/OpenLibrary.spellml", start: 1923, end: 2059 }, readsFrom: ["open_library"] }) }
  get writer() {
    return core.getItemAt(this.authors, 0)
  }

  draw() {
    return h("ui-card", {
      class: "book",
      onClick: core.pressed(this, async () => await this.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-image", { src: () => this.coverI, alt: "", "aspect-ratio": "2:3", crop: true }),
      h("ui-content",
        h("ui-header", () => this.title),
        h("ui-meta", () => core.listShown(this.authorName), " · ", () => this.firstPublishYear)
      )
    )
  }

  drawPage() {
    return h("ui-stack", { spacing: "xl", part: "page" },
      h("ui-stack", { direction: "horizontal", align: "center", spacing: "sm" },
        h("ui-button", {
          icon: "arrow left",
          appearance: "basic",
          "aria-label": "Back",
          title: "Back",
          onClick: core.pressed(this, async () => await this.close()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }),
        h("ui-header", { size: "large" }, () => this.title)
      ),
      h("ui-stack", { direction: "horizontal", wrap: true, align: "start", spacing: "md" },
        h("ui-image", { src: () => this.coverI, alt: "", size: "small" }),
        h("ui-stack", { spacing: "sm" },
          h("ui-text",
            "First published in ",
            () => this.firstPublishYear,
            " · ",
            () => this.editionCount,
            " editions"
          ),
          () => this.drawWriting()
        )
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "Editions"),
        () => core.drawRead(() => this.editions, (edition) => core.drawThing(edition), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "page" },
            "Asking Open Library for its editions"
          ),
          none: () => h("ui-text", { part: "page" }, "No editions listed."),
          paging: () => "pages",
          items: () => h("ui-cards", { columns: "4", doubling: true, stackable: true, part: "page" })
        })
      )
    )
  }

  static drawsWaiting = true
  drawWriting() {
    if (this.writer) return this.writer.drawCard()

    core.readRider("waiting", () => h("ui-loader", { visible: true, inline: true, text: true, part: "writing" },
      "Asking Open Library who wrote it"
    ))
    core.readRider("failed", () => h("ui-text", { part: "writing" }, "Open Library can't say who wrote it just now."))
  }

  //////////////////////////////////////////////////
  // ## What a book and a city can do, from anywhere
  //////////////////////////////////////////////////
  // Only this file can name the public servers:  so its other files ask this.

  async open() {
    publicServers.library.showing = this
  }

  async close() {
    publicServers.library.showing = undefined
  }

  static savedIn = { place: "open_library", collection: "books", select: ["authors", "authorName", "coverI", "editionCount", "firstPublishYear", "language", "editions", "title"] }
}

export class Author extends Thing {
  // - its "links" is a list of links
  static { this.declareProp("links", { itemType: "Link", init: () => new List({ instanceType: "Link" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2547, end: 2577 } }) }
  get links() { return this.getProp("links") }
  set links(value) { this.setProp("links", value) }

  // - its "kind" is a kind, stored as "type"
  static { this.declareProp("kind", { type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 2581, end: 2619 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "key" is text
  static { this.declareProp("key", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2623, end: 2640 } }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2644, end: 2662 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "source records" is a list of text
  static { this.declareProp("sourceRecords", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2666, end: 2704 } }) }
  get sourceRecords() { return this.getProp("sourceRecords") }
  set sourceRecords(value) { this.setProp("sourceRecords", value) }

  // - its "birth date" is text
  static { this.declareProp("birthDate", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2708, end: 2732 } }) }
  get birthDate() { return this.getProp("birthDate") }
  set birthDate(value) { this.setProp("birthDate", value) }

  // - its "bio" is text
  static { this.declareProp("bio", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2736, end: 2753 } }) }
  get bio() { return this.getProp("bio") }
  set bio(value) { this.setProp("bio", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2757, end: 2776 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "alternate names" is a list of text
  static { this.declareProp("alternateNames", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2780, end: 2819 } }) }
  get alternateNames() { return this.getProp("alternateNames") }
  set alternateNames(value) { this.setProp("alternateNames", value) }

  // - its "remote ids" is a remote id
  static { this.declareProp("remoteIds", { type: "RemoteId", declaredAt: { path: "/OpenLibrary.api.spell", start: 2823, end: 2854 } }) }
  get remoteIds() { return this.getProp("remoteIds") }
  set remoteIds(value) { this.setProp("remoteIds", value) }

  // - its "photos" is a list of numbers
  static { this.declareProp("photos", { itemType: "number", init: () => new List({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2858, end: 2891 } }) }
  get photos() { return this.getProp("photos") }
  set photos(value) { this.setProp("photos", value) }

  // - its "death date" is text
  static { this.declareProp("deathDate", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2895, end: 2919 } }) }
  get deathDate() { return this.getProp("deathDate") }
  set deathDate(value) { this.setProp("deathDate", value) }

  // - its "personal name" is text
  static { this.declareProp("personalName", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2923, end: 2950 } }) }
  get personalName() { return this.getProp("personalName") }
  set personalName(value) { this.setProp("personalName", value) }

  // - its "latest revision" is a number
  static { this.declareProp("latestRevision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2954, end: 2987 } }) }
  get latestRevision() { return this.getProp("latestRevision") }
  set latestRevision(value) { this.setProp("latestRevision", value) }

  // - its "revision" is a number
  static { this.declareProp("revision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2991, end: 3017 } }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  // - its "created" is a created
  static { this.declareProp("created", { type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 3021, end: 3047 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "last modified" is a last modified
  static { this.declareProp("lastModified", { type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 3051, end: 3089 } }) }
  get lastModified() { return this.getProp("lastModified") }
  set lastModified(value) { this.setProp("lastModified", value) }

  drawCard() {
    return h("ui-card", { part: "card" },
      h("ui-content",
        h("ui-header", () => this.name),
        h("ui-meta", "Born ", () => this.birthDate),
        h("ui-description", () => this.bio)
      )
    )
  }

  static savedIn = { place: "open_library", collection: "authors", select: ["kind", "name", "birthDate", "bio", "title"] }
}

export class Edition extends Thing {
  // - its "kind" is a kind, stored as "type"
  static { this.declareProp("kind", { type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 3147, end: 3185 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3189, end: 3208 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "authors" is a list of edition authors
  static { this.declareProp("authors", { itemType: "EditionAuthor", init: () => new List({ instanceType: "EditionAuthor" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3212, end: 3254 } }) }
  get authors() { return this.getProp("authors") }
  set authors(value) { this.setProp("authors", value) }

  // - its "publish date" is text
  static { this.declareProp("publishDate", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3258, end: 3284 } }) }
  get publishDate() { return this.getProp("publishDate") }
  set publishDate(value) { this.setProp("publishDate", value) }

  // - its "source records" is a list of text
  static { this.declareProp("sourceRecords", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3288, end: 3326 } }) }
  get sourceRecords() { return this.getProp("sourceRecords") }
  set sourceRecords(value) { this.setProp("sourceRecords", value) }

  // - its "number of pages" is a number
  static { this.declareProp("numberOfPages", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3330, end: 3363 } }) }
  get numberOfPages() { return this.getProp("numberOfPages") }
  set numberOfPages(value) { this.setProp("numberOfPages", value) }

  // - its "publishers" is a list of text
  static { this.declareProp("publishers", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3367, end: 3401 } }) }
  get publishers() { return this.getProp("publishers") }
  set publishers(value) { this.setProp("publishers", value) }

  // - its "physical format" is text
  static { this.declareProp("physicalFormat", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3405, end: 3434 } }) }
  get physicalFormat() { return this.getProp("physicalFormat") }
  set physicalFormat(value) { this.setProp("physicalFormat", value) }

  // - its "notes" is a note
  static { this.declareProp("notes", { type: "Note", declaredAt: { path: "/OpenLibrary.api.spell", start: 3438, end: 3459 } }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  // - its "full title" is text
  static { this.declareProp("fullTitle", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3463, end: 3487 } }) }
  get fullTitle() { return this.getProp("fullTitle") }
  set fullTitle(value) { this.setProp("fullTitle", value) }

  // - its "covers" is a list of numbers
  static { this.declareProp("covers", { itemType: "number", init: () => new List({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3491, end: 3524 } }) }
  get covers() { return this.getProp("covers") }
  set covers(value) { this.setProp("covers", value) }

  // - its "works" is a list of works
  static { this.declareProp("works", { itemType: "Work", init: () => new List({ instanceType: "Work" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3528, end: 3558 } }) }
  get works() { return this.getProp("works") }
  set works(value) { this.setProp("works", value) }

  // - its "key" is text
  static { this.declareProp("key", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3562, end: 3579 } }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  // - its "local id" is a list of text
  static { this.declareProp("localId", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3583, end: 3615 } }) }
  get localId() { return this.getProp("localId") }
  set localId(value) { this.setProp("localId", value) }

  // - its "latest revision" is a number
  static { this.declareProp("latestRevision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3619, end: 3652 } }) }
  get latestRevision() { return this.getProp("latestRevision") }
  set latestRevision(value) { this.setProp("latestRevision", value) }

  // - its "revision" is a number
  static { this.declareProp("revision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3656, end: 3682 } }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  // - its "created" is a created
  static { this.declareProp("created", { type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 3686, end: 3712 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "last modified" is a last modified
  static { this.declareProp("lastModified", { type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 3716, end: 3754 } }) }
  get lastModified() { return this.getProp("lastModified") }
  set lastModified(value) { this.setProp("lastModified", value) }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-header", () => this.title),
        h("ui-meta", () => this.publishDate, " · ", () => core.getItemAt(this.publishers, 0))
      )
    )
  }

  static savedIn = { place: "open_library", collection: "editions", select: ["kind", "title", "authors", "publishDate", "publishers"] }
}

export class Link extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "kind" is a kind, stored as "type"
  static { this.declareProp("kind", { type: "Kind", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }
}

export class Kind extends Thing {
  // - its "key" is text
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
}

export class RemoteId extends Thing {
  // - its "viaf" is a number
  static { this.declareProp("viaf", { type: "number" }) }
  get viaf() { return this.getProp("viaf") }
  set viaf(value) { this.setProp("viaf", value) }

  // - its "wikidata" is text
  static { this.declareProp("wikidata", { type: "text" }) }
  get wikidata() { return this.getProp("wikidata") }
  set wikidata(value) { this.setProp("wikidata", value) }

  // - its "isni" is a number
  static { this.declareProp("isni", { type: "number" }) }
  get isni() { return this.getProp("isni") }
  set isni(value) { this.setProp("isni", value) }

  // - its "amazon" is text
  static { this.declareProp("amazon", { type: "text" }) }
  get amazon() { return this.getProp("amazon") }
  set amazon(value) { this.setProp("amazon", value) }

  // - its "bookbrainz" is text
  static { this.declareProp("bookbrainz", { type: "text" }) }
  get bookbrainz() { return this.getProp("bookbrainz") }
  set bookbrainz(value) { this.setProp("bookbrainz", value) }

  // - its "goodreads" is a number
  static { this.declareProp("goodreads", { type: "number" }) }
  get goodreads() { return this.getProp("goodreads") }
  set goodreads(value) { this.setProp("goodreads", value) }

  // - its "gnd" is a number
  static { this.declareProp("gnd", { type: "number" }) }
  get gnd() { return this.getProp("gnd") }
  set gnd(value) { this.setProp("gnd", value) }

  // - its "imdb" is text
  static { this.declareProp("imdb", { type: "text" }) }
  get imdb() { return this.getProp("imdb") }
  set imdb(value) { this.setProp("imdb", value) }

  // - its "lc naf" is text
  static { this.declareProp("lcNaf", { type: "text" }) }
  get lcNaf() { return this.getProp("lcNaf") }
  set lcNaf(value) { this.setProp("lcNaf", value) }

  // - its "librarything" is text
  static { this.declareProp("librarything", { type: "text" }) }
  get librarything() { return this.getProp("librarything") }
  set librarything(value) { this.setProp("librarything", value) }

  // - its "musicbrainz" is text
  static { this.declareProp("musicbrainz", { type: "text" }) }
  get musicbrainz() { return this.getProp("musicbrainz") }
  set musicbrainz(value) { this.setProp("musicbrainz", value) }

  // - its "storygraph" is text
  static { this.declareProp("storygraph", { type: "text" }) }
  get storygraph() { return this.getProp("storygraph") }
  set storygraph(value) { this.setProp("storygraph", value) }

  // - its "inventaire" is text
  static { this.declareProp("inventaire", { type: "text" }) }
  get inventaire() { return this.getProp("inventaire") }
  set inventaire(value) { this.setProp("inventaire", value) }

  // - its "librivox" is a number
  static { this.declareProp("librivox", { type: "number" }) }
  get librivox() { return this.getProp("librivox") }
  set librivox(value) { this.setProp("librivox", value) }

  // - its "project gutenberg" is a number
  static { this.declareProp("projectGutenberg", { type: "number" }) }
  get projectGutenberg() { return this.getProp("projectGutenberg") }
  set projectGutenberg(value) { this.setProp("projectGutenberg", value) }

  // - its "opac sbn" is text
  static { this.declareProp("opacSbn", { type: "text" }) }
  get opacSbn() { return this.getProp("opacSbn") }
  set opacSbn(value) { this.setProp("opacSbn", value) }
}

export class Created extends Thing {
  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "value" is a date
  static { this.declareProp("value", { type: "date" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class LastModified extends Thing {
  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "value" is a date
  static { this.declareProp("value", { type: "date" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class EditionAuthor extends Thing {
  // - its "key" is text
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
}

export class Note extends Thing {
  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "value" is text
  static { this.declareProp("value", { type: "text" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class Work extends Thing {
  // - its "key" is text
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
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
  },
  listsUnder: { books: { editions: "{id}/editions.json" } }
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

export class OpenLibraryPage extends Thing {
  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  // - its "showing" is a book
  static { this.declareProp("showing", { type: "Book", link: true }) }
  get showing() { return core.linked(this, "showing", Book) }
  set showing(value) { this.setProp("showing", value) }

  create() {
    this.search = "dune"
  }

  /** What the search finds:  Open Library looks, by the title, and gives back the first hundred */
  static { this.declareProp("found", { declaredAt: { path: "/OpenLibrary.spellml", start: 546, end: 715 }, readsFrom: ["open_library"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return core.filter(await core.savedThings(Book, { search: { title: this.search } }, "looks through"), (book) => core.includes(book.title, this.search))
  }, () => [this.search]) }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-form", { value: this },
        h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
          h("ui-header", { size: "large" }, "Books, from Open Library"),
          h("ui-search", {
            name: "search",
            parameter: "book",
            icon: "search",
            placeholder: "A book, by its title",
            "aria-label": "Search Open Library"
          })
        )
      ),
      () => this.drawShelf(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://openlibrary.org/developers/api" }, "Open Library's API"),
        ", asked for as you look;  its covers from its covers server."
      )
    )
  }

  // A book's own page, while one is open;  else what the search finds
  static drawsWaiting = true
  drawShelf() {
    if (this.showing) return this.showing.drawPage()
    else return this.drawBookList()
  }

  drawBookList() {
    return core.drawRead(() => this.found, (book) => core.drawThing(book), {
      waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "book_list" }, "Asking Open Library"),
      none: () => h("ui-text", { part: "book_list" }, "No book is called that."),
      failedSay: () => "Open Library can't be reached just now.",
      paging: () => "pages",
      items: () => h("ui-cards", { columns: "5", doubling: true, part: "book_list" })
    })
  }
}

core.heading("A book")
////////////
// ## A book
////////////
// Its cover, its title and who wrote it:  on its card, every name the search gave;  on its own page, its first author, read from their own record.

core.heading("An edition")
////////////////
// ## An edition
////////////////
// One printing of a book:  read from the book's own list of editions, when its page is open.

core.heading("Who wrote it")
//# Who wrote it

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
  static { this.declareProp("userId", { type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1295, end: 1320 } }) }
  get userId() { return this.getProp("userId") }
  set userId(value) { this.setProp("userId", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1324, end: 1343 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "body" is text
  static { this.declareProp("body", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1347, end: 1365 } }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  // - its "comments" is a list of comments
  static { this.declareProp("comments", { itemType: "Comment", init: () => new List({ instanceType: "Comment" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1369, end: 1405 } }) }
  get comments() { return core.linked(this, "comments", Comment) }
  set comments(value) { this.setProp("comments", value) }

  draw() {
    return [
      h("ui-header", { size: "small" }, () => this.title),
      h("ui-text", () => this.body),
      core.drawRead(() => this.comments, (comment) => core.drawThing(comment), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking for its comments") })
    ]
  }

  static savedIn = { place: "jsonplaceholder", collection: "posts" }
}

export class Comment extends Thing {
  // - its "post id" is a number
  static { this.declareProp("postId", { type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1465, end: 1490 } }) }
  get postId() { return this.getProp("postId") }
  set postId(value) { this.setProp("postId", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1494, end: 1512 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "email" is text
  static { this.declareProp("email", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1516, end: 1535 } }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  // - its "body" is text
  static { this.declareProp("body", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1539, end: 1557 } }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  draw() {
    return h("ui-comment",
      h("ui-content",
        h("ui-author", () => this.email),
        h("ui-description", () => this.body)
      )
    )
  }

  static savedIn = { place: "jsonplaceholder", collection: "comments", select: ["name", "email", "body"] }
}

export class JsonplaceholderUser extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1630, end: 1648 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "username" is text
  static { this.declareProp("username", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1652, end: 1674 } }) }
  get username() { return this.getProp("username") }
  set username(value) { this.setProp("username", value) }

  // - its "email" is text
  static { this.declareProp("email", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1678, end: 1697 } }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  // - its "address" is an address
  static { this.declareProp("address", { type: "Address", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1701, end: 1728 } }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }

  // - its "phone" is text
  static { this.declareProp("phone", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1732, end: 1751 } }) }
  get phone() { return this.getProp("phone") }
  set phone(value) { this.setProp("phone", value) }

  // - its "website" is text
  static { this.declareProp("website", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1755, end: 1776 } }) }
  get website() { return this.getProp("website") }
  set website(value) { this.setProp("website", value) }

  // - its "company" is a company
  static { this.declareProp("company", { type: "Company", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1780, end: 1806 } }) }
  get company() { return this.getProp("company") }
  set company(value) { this.setProp("company", value) }

  // - its "posts" is a list of posts
  static { this.declareProp("posts", { itemType: "Post", init: () => new List({ instanceType: "Post" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1810, end: 1840 } }) }
  get posts() { return core.linked(this, "posts", Post) }
  set posts(value) { this.setProp("posts", value) }

  // - its "todos" is a list of todos
  static { this.declareProp("todos", { itemType: "Todo", init: () => new List({ instanceType: "Todo" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1844, end: 1874 } }) }
  get todos() { return core.linked(this, "todos", Todo) }
  set todos(value) { this.setProp("todos", value) }

  static savedIn = { place: "jsonplaceholder", collection: "jsonplaceholder_users", select: ["name", "email", "posts", "todos"] }
}

export class Todo extends Thing {
  // - its "user id" is a number
  static { this.declareProp("userId", { type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1931, end: 1956 } }) }
  get userId() { return this.getProp("userId") }
  set userId(value) { this.setProp("userId", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1960, end: 1979 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "completed" is yes or no
  static { this.declareProp("completed", { type: "choice", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1983, end: 2011 } }) }
  get completed() { return this.getProp("completed") }
  set completed(value) { this.setProp("completed", value) }

  draw() {
    return h("ui-form", { value: this },
      h("ui-stack", { direction: "horizontal", align: "center", justify: "between", spacing: "sm" },
        h("ui-checkbox", { name: "completed", label: () => this.title }),
        h("ui-button", {
          icon: "close",
          size: "mini",
          appearance: "transparent",
          "aria-label": "Remove",
          title: "Remove",
          onClick: core.pressed(this, () => core.removeSaved(this)),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        })
      )
    )
  }

  static savedIn = { place: "jsonplaceholder", collection: "todos" }
}

export class Address extends Thing {
  // - its "street" is text
  static { this.declareProp("street", { type: "text" }) }
  get street() { return this.getProp("street") }
  set street(value) { this.setProp("street", value) }

  // - its "suite" is text
  static { this.declareProp("suite", { type: "text" }) }
  get suite() { return this.getProp("suite") }
  set suite(value) { this.setProp("suite", value) }

  // - its "city" is text
  static { this.declareProp("city", { type: "text" }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  // - its "zipcode" is text
  static { this.declareProp("zipcode", { type: "text" }) }
  get zipcode() { return this.getProp("zipcode") }
  set zipcode(value) { this.setProp("zipcode", value) }

  // - its "geo" is a geo
  static { this.declareProp("geo", { type: "Geo" }) }
  get geo() { return this.getProp("geo") }
  set geo(value) { this.setProp("geo", value) }
}

export class Geo extends Thing {
  // - its "lat" is a number
  static { this.declareProp("lat", { type: "number" }) }
  get lat() { return this.getProp("lat") }
  set lat(value) { this.setProp("lat", value) }

  // - its "lng" is a number
  static { this.declareProp("lng", { type: "number" }) }
  get lng() { return this.getProp("lng") }
  set lng(value) { this.setProp("lng", value) }
}

export class Company extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "catch phrase" is text
  static { this.declareProp("catchPhrase", { type: "text" }) }
  get catchPhrase() { return this.getProp("catchPhrase") }
  set catchPhrase(value) { this.setProp("catchPhrase", value) }

  // - its "bs" is text
  static { this.declareProp("bs", { type: "text" }) }
  get bs() { return this.getProp("bs") }
  set bs(value) { this.setProp("bs", value) }
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
  get newTodo() { return core.linked(this, "newTodo", Todo) }
  set newTodo(value) { this.setProp("newTodo", value) }

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

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "large" }, "Practice, on JSONPlaceholder"),
        h("ui-text", { color: "grey" },
          "Tick a todo, add one, remove one:  each goes to the server, which answers as if it saved it, and keeps nothing."
        )
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "Their todos"),
        () => this.drawChecklist()
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "What they wrote"),
        () => this.drawPostList()
      ),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://jsonplaceholder.typicode.com" }, "JSONPlaceholder"),
        ", asked for as you look."
      )
    )
  }

  static drawsWaiting = true
  drawChecklist() {
    return h("ui-stack", { spacing: "sm", part: "checklist" },
      h("ui-form", { "prop:value": () => this.newTodo },
        h("ui-input", {
          name: "title",
          placeholder: "Water the plants",
          "aria-label": "Something to do",
          fluid: true,
          action: true
        },
          h("ui-button", {
            slot: "action",
            color: "primary",
            disabled: () => this.newTodo.title === "",
            onClick: core.pressed(this, async () => await this.addTheNewTodo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add")
        )
      ),
      () => this.drawTodoList()
    )
  }

  drawTodoList() {
    return core.drawRead(() => this.todos, (todo) => core.drawThing(todo), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "todo_list" },
      "Asking JSONPlaceholder"
    ), failedSay: () => "JSONPlaceholder can't be reached just now." })
  }

  drawPostList() {
    return core.drawRead(() => this.person?.posts, (post) => core.drawThing(post), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "post_list" },
      "Asking JSONPlaceholder"
    ), failedSay: () => "JSONPlaceholder can't be reached just now." })
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
core.heading("Open-Meteo:  the weather to come, hour by hour, for anywhere on Earth")
///////////////////////////////////////////////////////////////////////////
// ## Open-Meteo:  the weather to come, hour by hour, for anywhere on Earth
///////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in OpenMeteo.spellml.
// `open meteo` is what this wrote, from looking at the server:
//   spell place ingest https://api.open-meteo.com --into OpenMeteo.api.spell --name "open meteo" --no-ai
//     --collections "forecasts=/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto&forecast_days=2"
// `spell place update OpenMeteo.api.spell` looks again, and changes only this file and OpenMeteo.api.json5.
// It has no list of forecasts:  each is asked for by where it's for, `every forecast where its latitude is ... and its longitude is ...`.
// Its hours come as lists side by side, one of times and one of each measure:  each hour is read as one of each.
// Each measure is in the unit its answer names, and shows in the reader's own:  a temperature in °F in the US.

export class Forecast extends Thing {
  // - its "latitude" is a number
  static { this.declareProp("latitude", { type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1336, end: 1362 } }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  // - its "longitude" is a number
  static { this.declareProp("longitude", { type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1366, end: 1393 } }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }

  // - its "generationtime ms" is a number
  static { this.declareProp("generationtimeMs", { type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1397, end: 1432 } }) }
  get generationtimeMs() { return this.getProp("generationtimeMs") }
  set generationtimeMs(value) { this.setProp("generationtimeMs", value) }

  // - its "utc offset seconds" is a number
  static { this.declareProp("utcOffsetSeconds", { type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1436, end: 1472 } }) }
  get utcOffsetSeconds() { return this.getProp("utcOffsetSeconds") }
  set utcOffsetSeconds(value) { this.setProp("utcOffsetSeconds", value) }

  // - its "timezone" is text
  static { this.declareProp("timezone", { type: "text", declaredAt: { path: "/OpenMeteo.api.spell", start: 1476, end: 1498 } }) }
  get timezone() { return this.getProp("timezone") }
  set timezone(value) { this.setProp("timezone", value) }

  // - its "timezone abbreviation" is text
  static { this.declareProp("timezoneAbbreviation", { type: "text", declaredAt: { path: "/OpenMeteo.api.spell", start: 1502, end: 1537 } }) }
  get timezoneAbbreviation() { return this.getProp("timezoneAbbreviation") }
  set timezoneAbbreviation(value) { this.setProp("timezoneAbbreviation", value) }

  // - its "elevation" is a number
  static { this.declareProp("elevation", { type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1541, end: 1568 } }) }
  get elevation() { return this.getProp("elevation") }
  set elevation(value) { this.setProp("elevation", value) }

  // - its "hours" is a list of hours, stored as "hourly"
  static { this.declareProp("hours", { itemType: "Hour", storedAs: "hourly", init: () => new List({ instanceType: "Hour" }), declaredAt: { path: "/OpenMeteo.api.spell", start: 1572, end: 1622 } }) }
  get hours() { return this.getProp("hours") }
  set hours(value) { this.setProp("hours", value) }

  drawHourTable() {
    return core.drawRead(() => this.hours, (hour) => [
      h("ui-cell", { "data-column": "Day" },
        h("span", { hidden: () => hour.time.getHours() === 0 ? undefined : "until-found" },
          () => core.dateShown(hour.time)
        )
      ),
      h("ui-cell", { "data-column": "Hour", align: "right" }, () => hour.time.getHours(), ":00"),
      h("ui-cell", { "data-column": "Temperature", align: "right" },
        () => core.measureShown(hour.temperature, "Temperature", "celsius")
      ),
      h("ui-cell", { "data-column": "Rain", align: "right" },
        () => core.measureShown(hour.precipitation, "Length", "millimeter")
      ),
      h("ui-cell", { "data-column": "Wind", align: "right" },
        () => core.measureShown(hour.windSpeed, "Speed", "kilometerPerHour")
      )
    ], { items: () => h("ui-table", {
      appearance: "very-basic",
      padding: "compact",
      collapsing: true,
      unstackable: true,
      part: "hour_table"
    }, h("ui-row")) })
  }

  static savedIn = { place: "open_meteo", collection: "forecasts", select: ["latitude", "longitude", "timezone", "hours"] }
}

export class Hour extends Thing {
  // - its "time" is a date
  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

  // - its "temperature" is a temperature in °C, stored as "temperature_2m"
  static { this.declareProp("temperature", { type: "number", storedAs: "temperature_2m" }) }
  get temperature() { return this.getProp("temperature") }
  set temperature(value) { this.setProp("temperature", value) }

  // - its "precipitation" is a length in mm
  static { this.declareProp("precipitation", { type: "number" }) }
  get precipitation() { return this.getProp("precipitation") }
  set precipitation(value) { this.setProp("precipitation", value) }

  // - its "wind speed" is a speed in km/h, stored as "wind_speed_10m"
  static { this.declareProp("windSpeed", { type: "number", storedAs: "wind_speed_10m" }) }
  get windSpeed() { return this.getProp("windSpeed") }
  set windSpeed(value) { this.setProp("windSpeed", value) }
}

export class OpenMeteo extends Place {}
export const openMeteo = core.place(new OpenMeteo(), {
  name: "open_meteo",
  kind: "web server",
  at: "https://api.open-meteo.com",
  checkedEvery: 30,
  namesLike: "generationtime_ms",
  collections: { forecasts: { at: "/v1/forecast?hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto&forecast_days=2", askedBy: ["latitude", "longitude"] } }
})

// -----------
core.heading("Open-Meteo")
////////////////
// ## Open-Meteo
////////////////
// The weather to come, hour by hour, today and tomorrow, for a few cities.
// Every thing it shows is in OpenMeteo.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// Open-Meteo has no list of forecasts:  each is asked for by a latitude and a longitude, so the page always says both.

export class OpenMeteoPage extends Thing {
  // - its "cities" is a list of cities
  static { this.declareProp("cities", { itemType: "City", init: () => new List({ instanceType: "City" }) }) }
  get cities() { return this.getProp("cities") }
  set cities(value) { this.setProp("cities", value) }

  // - its "city" is a city
  static { this.declareProp("city", { type: "City" }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  create() {
    core.append(this.cities, new City({
      name: "Berlin",
      latitude: 52.52,
      longitude: 13.41
    }))
    core.append(this.cities, new City({
      name: "New York",
      latitude: 40.71,
      longitude: -74.01
    }))
    core.append(this.cities, new City({
      name: "Tokyo",
      latitude: 35.68,
      longitude: 139.69
    }))
    core.append(this.cities, new City({
      name: "Buenos Aires",
      latitude: -34.6,
      longitude: -58.38
    }))
    this.city = core.getItemAt(this.cities, 0)
  }

  /** The city's, from Open-Meteo:  asked for by where it is, with no list of them all */
  static { this.declareProp("forecasts", { declaredAt: { path: "/OpenMeteo.spellml", start: 962, end: 1187 }, readsFrom: ["open_meteo"] }) }
  get forecasts() { return core.waitedValue(this, "forecasts", async () => {
    return await core.savedThings(Forecast, { filter: { latitude: this.city?.latitude, longitude: this.city?.longitude } })
  }, () => [this.city]) }

  /** Its one forecast:  Open-Meteo answers with one, for the nearest place it has */
  static { this.declareProp("forecast", { declaredAt: { path: "/OpenMeteo.spellml", start: 1200, end: 1343 }, readsFrom: ["open_meteo"] }) }
  get forecast() {
    return core.getItemAt(this.forecasts, 0)
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "large" }, "The weather, from Open-Meteo"),
        h("ui-toolbar", { appearance: "secondary", "aria-label": "Cities" },
          () => core.drawItems(this.cities)
        )
      ),
      () => this.drawForecastTable(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://open-meteo.com/en/docs" }, "Open-Meteo's API"),
        ", asked for as you look;  each measure in your own units."
      )
    )
  }

  static drawsWaiting = true
  drawForecastTable() {
    if (this.forecast) {
      return h("ui-stack", { spacing: "sm", part: "forecast_table" },
        h("ui-text", { color: "grey" },
          "The next two days in ",
          () => core.whileWaiting(() => this.forecast.timezone),
          ", hour by hour."
        ),
        () => core.whileWaiting(() => this.forecast.drawHourTable())
      )
    }

    core.readRider("waiting", () => h("ui-loader", { visible: true, inline: true, text: true, part: "forecast_table" },
      "Asking Open-Meteo"
    ))
    core.readRider("failed", () => h("ui-text", { part: "forecast_table" }, "Open-Meteo can't be reached just now."))
  }
}

core.heading("A city")
////////////
// ## A city
////////////
// Where it is on Earth:  what its forecast is asked for by.

export class City extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "latitude" is a number
  static { this.declareProp("latitude", { type: "number" }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  // - its "longitude" is a number
  static { this.declareProp("longitude", { type: "number" }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }

  draw() {
    return h("ui-item", {
      active: () => this === publicServers.weather.city,
      onClick: core.pressed(this, () => this.pick()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    }, () => this.name)
  }

  pick() {
    publicServers.weather.city = this
  }
}

core.heading("Its hours")
///////////////
// ## Its hours
///////////////
// A row an hour:  the day at midnight, the hour, and each measure, in the units the reader's region reads, °F and inches in the US.

// -----------
core.heading("The Met Museum:  every artwork in its collection, and a search of all of it")
/////////////////////////////////////////////////////////////////////////////////
// ## The Met Museum:  every artwork in its collection, and a search of all of it
/////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in MetMuseum.spellml.
// `met museum` is what this wrote, from looking at the server:
//   spell place ingest https://collectionapi.metmuseum.org/public/collection --kind "web server" --docs https://metmuseum.github.io
//     --into MetMuseum.api.spell --name "met museum" --no-ai --collections "artworks=/v1/objects,artworks=/v1.1/search?q=sunflowers"
// `spell place update MetMuseum.api.spell` looks again, and changes only this file and MetMuseum.api.json5.
// Its list is only ids, over 500,000 of them:  each artwork is read whole from its own address, only when something reads it.
// Its search finds ids too, looking at all of each artwork, its tags too:  `every artwork matching ...`.
// It asks for 80 requests a second at most, in its docs:  a program keeps to that.
// Its search pages by "limit" and "offset", up to 500 at a time;  its list of every id takes neither, and comes whole.

export class Artwork extends Thing {
  // - its "highlight" is yes or no, stored as "isHighlight"
  static { this.declareProp("highlight", { type: "choice", storedAs: "isHighlight", declaredAt: { path: "/MetMuseum.api.spell", start: 1543, end: 1596 } }) }
  get highlight() { return this.getProp("highlight") }
  set highlight(value) { this.setProp("highlight", value) }

  // - its "accession number" is text
  static { this.declareProp("accessionNumber", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1600, end: 1630 } }) }
  get accessionNumber() { return this.getProp("accessionNumber") }
  set accessionNumber(value) { this.setProp("accessionNumber", value) }

  // - its "accession year" is a number
  static { this.declareProp("accessionYear", { type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 1634, end: 1666 } }) }
  get accessionYear() { return this.getProp("accessionYear") }
  set accessionYear(value) { this.setProp("accessionYear", value) }

  // - its "public domain" is yes or no, stored as "isPublicDomain"
  static { this.declareProp("publicDomain", { type: "choice", storedAs: "isPublicDomain", declaredAt: { path: "/MetMuseum.api.spell", start: 1670, end: 1730 } }) }
  get publicDomain() { return this.getProp("publicDomain") }
  set publicDomain(value) { this.setProp("publicDomain", value) }

  /** an address */
  // - its "primary image" is text
  static { this.declareProp("primaryImage", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1734, end: 1761 } }) }
  get primaryImage() { return this.getProp("primaryImage") }
  set primaryImage(value) { this.setProp("primaryImage", value) }

  /** an address */
  // - its "primary image small" is text
  static { this.declareProp("primaryImageSmall", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1780, end: 1813 } }) }
  get primaryImageSmall() { return this.getProp("primaryImageSmall") }
  set primaryImageSmall(value) { this.setProp("primaryImageSmall", value) }

  // - its "additional images" is a list of text
  static { this.declareProp("additionalImages", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/MetMuseum.api.spell", start: 1832, end: 1873 } }) }
  get additionalImages() { return this.getProp("additionalImages") }
  set additionalImages(value) { this.setProp("additionalImages", value) }

  // - its "constituents" is a list of constituents
  static { this.declareProp("constituents", { itemType: "Constituent", init: () => new List({ instanceType: "Constituent" }), declaredAt: { path: "/MetMuseum.api.spell", start: 1877, end: 1921 } }) }
  get constituents() { return this.getProp("constituents") }
  set constituents(value) { this.setProp("constituents", value) }

  // - its "department" is text
  static { this.declareProp("department", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1925, end: 1949 } }) }
  get department() { return this.getProp("department") }
  set department(value) { this.setProp("department", value) }

  // - its "object name" is text
  static { this.declareProp("objectName", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1953, end: 1978 } }) }
  get objectName() { return this.getProp("objectName") }
  set objectName(value) { this.setProp("objectName", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1982, end: 2001 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "culture" is text
  static { this.declareProp("culture", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2005, end: 2026 } }) }
  get culture() { return this.getProp("culture") }
  set culture(value) { this.setProp("culture", value) }

  // - its "period" is text
  static { this.declareProp("period", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2030, end: 2050 } }) }
  get period() { return this.getProp("period") }
  set period(value) { this.setProp("period", value) }

  // - its "dynasty" is text
  static { this.declareProp("dynasty", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2054, end: 2075 } }) }
  get dynasty() { return this.getProp("dynasty") }
  set dynasty(value) { this.setProp("dynasty", value) }

  // - its "reign" is text
  static { this.declareProp("reign", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2079, end: 2098 } }) }
  get reign() { return this.getProp("reign") }
  set reign(value) { this.setProp("reign", value) }

  // - its "portfolio" is text
  static { this.declareProp("portfolio", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2102, end: 2125 } }) }
  get portfolio() { return this.getProp("portfolio") }
  set portfolio(value) { this.setProp("portfolio", value) }

  // - its "artist role" is text
  static { this.declareProp("artistRole", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2129, end: 2154 } }) }
  get artistRole() { return this.getProp("artistRole") }
  set artistRole(value) { this.setProp("artistRole", value) }

  // - its "artist prefix" is text
  static { this.declareProp("artistPrefix", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2158, end: 2185 } }) }
  get artistPrefix() { return this.getProp("artistPrefix") }
  set artistPrefix(value) { this.setProp("artistPrefix", value) }

  // - its "artist display name" is text
  static { this.declareProp("artistDisplayName", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2189, end: 2222 } }) }
  get artistDisplayName() { return this.getProp("artistDisplayName") }
  set artistDisplayName(value) { this.setProp("artistDisplayName", value) }

  // - its "artist display bio" is text
  static { this.declareProp("artistDisplayBio", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2226, end: 2258 } }) }
  get artistDisplayBio() { return this.getProp("artistDisplayBio") }
  set artistDisplayBio(value) { this.setProp("artistDisplayBio", value) }

  // - its "artist suffix" is text
  static { this.declareProp("artistSuffix", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2262, end: 2289 } }) }
  get artistSuffix() { return this.getProp("artistSuffix") }
  set artistSuffix(value) { this.setProp("artistSuffix", value) }

  // - its "artist alpha sort" is text
  static { this.declareProp("artistAlphaSort", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2293, end: 2324 } }) }
  get artistAlphaSort() { return this.getProp("artistAlphaSort") }
  set artistAlphaSort(value) { this.setProp("artistAlphaSort", value) }

  // - its "artist nationality" is text
  static { this.declareProp("artistNationality", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2328, end: 2360 } }) }
  get artistNationality() { return this.getProp("artistNationality") }
  set artistNationality(value) { this.setProp("artistNationality", value) }

  // - its "artist begin date" is a number
  static { this.declareProp("artistBeginDate", { type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2364, end: 2399 } }) }
  get artistBeginDate() { return this.getProp("artistBeginDate") }
  set artistBeginDate(value) { this.setProp("artistBeginDate", value) }

  // - its "artist end date" is a number
  static { this.declareProp("artistEndDate", { type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2403, end: 2436 } }) }
  get artistEndDate() { return this.getProp("artistEndDate") }
  set artistEndDate(value) { this.setProp("artistEndDate", value) }

  // - its "artist gender" is text
  static { this.declareProp("artistGender", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2440, end: 2467 } }) }
  get artistGender() { return this.getProp("artistGender") }
  set artistGender(value) { this.setProp("artistGender", value) }

  /** an address */
  // - its "artist wikidata url" is text
  static { this.declareProp("artistWikidataUrl", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2471, end: 2504 } }) }
  get artistWikidataUrl() { return this.getProp("artistWikidataUrl") }
  set artistWikidataUrl(value) { this.setProp("artistWikidataUrl", value) }

  /** an address */
  // - its "artist ulan url" is text
  static { this.declareProp("artistUlanUrl", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2523, end: 2552 } }) }
  get artistUlanUrl() { return this.getProp("artistUlanUrl") }
  set artistUlanUrl(value) { this.setProp("artistUlanUrl", value) }

  // - its "object date" is text
  static { this.declareProp("objectDate", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2571, end: 2596 } }) }
  get objectDate() { return this.getProp("objectDate") }
  set objectDate(value) { this.setProp("objectDate", value) }

  // - its "object begin date" is a number
  static { this.declareProp("objectBeginDate", { type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2600, end: 2635 } }) }
  get objectBeginDate() { return this.getProp("objectBeginDate") }
  set objectBeginDate(value) { this.setProp("objectBeginDate", value) }

  // - its "object end date" is a number
  static { this.declareProp("objectEndDate", { type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2639, end: 2672 } }) }
  get objectEndDate() { return this.getProp("objectEndDate") }
  set objectEndDate(value) { this.setProp("objectEndDate", value) }

  // - its "medium" is text
  static { this.declareProp("medium", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2676, end: 2696 } }) }
  get medium() { return this.getProp("medium") }
  set medium(value) { this.setProp("medium", value) }

  // - its "dimensions" is text
  static { this.declareProp("dimensions", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2700, end: 2724 } }) }
  get dimensions() { return this.getProp("dimensions") }
  set dimensions(value) { this.setProp("dimensions", value) }

  // - its "measurements" is a list of measurements
  static { this.declareProp("measurements", { itemType: "Measurement", init: () => new List({ instanceType: "Measurement" }), declaredAt: { path: "/MetMuseum.api.spell", start: 2728, end: 2772 } }) }
  get measurements() { return this.getProp("measurements") }
  set measurements(value) { this.setProp("measurements", value) }

  // - its "credit line" is text
  static { this.declareProp("creditLine", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2776, end: 2801 } }) }
  get creditLine() { return this.getProp("creditLine") }
  set creditLine(value) { this.setProp("creditLine", value) }

  // - its "geography type" is text
  static { this.declareProp("geographyType", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2805, end: 2833 } }) }
  get geographyType() { return this.getProp("geographyType") }
  set geographyType(value) { this.setProp("geographyType", value) }

  // - its "city" is text
  static { this.declareProp("city", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2837, end: 2855 } }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  // - its "state" is text
  static { this.declareProp("state", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2859, end: 2878 } }) }
  get state() { return this.getProp("state") }
  set state(value) { this.setProp("state", value) }

  // - its "county" is text
  static { this.declareProp("county", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2882, end: 2902 } }) }
  get county() { return this.getProp("county") }
  set county(value) { this.setProp("county", value) }

  // - its "country" is text
  static { this.declareProp("country", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2906, end: 2927 } }) }
  get country() { return this.getProp("country") }
  set country(value) { this.setProp("country", value) }

  // - its "region" is text
  static { this.declareProp("region", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2931, end: 2951 } }) }
  get region() { return this.getProp("region") }
  set region(value) { this.setProp("region", value) }

  // - its "subregion" is text
  static { this.declareProp("subregion", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2955, end: 2978 } }) }
  get subregion() { return this.getProp("subregion") }
  set subregion(value) { this.setProp("subregion", value) }

  // - its "locale" is text
  static { this.declareProp("locale", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2982, end: 3002 } }) }
  get locale() { return this.getProp("locale") }
  set locale(value) { this.setProp("locale", value) }

  // - its "locus" is text
  static { this.declareProp("locus", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3006, end: 3025 } }) }
  get locus() { return this.getProp("locus") }
  set locus(value) { this.setProp("locus", value) }

  // - its "excavation" is text
  static { this.declareProp("excavation", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3029, end: 3053 } }) }
  get excavation() { return this.getProp("excavation") }
  set excavation(value) { this.setProp("excavation", value) }

  // - its "river" is text
  static { this.declareProp("river", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3057, end: 3076 } }) }
  get river() { return this.getProp("river") }
  set river(value) { this.setProp("river", value) }

  // - its "classification" is text
  static { this.declareProp("classification", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3080, end: 3108 } }) }
  get classification() { return this.getProp("classification") }
  set classification(value) { this.setProp("classification", value) }

  // - its "rights and reproduction" is text
  static { this.declareProp("rightsAndReproduction", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3112, end: 3149 } }) }
  get rightsAndReproduction() { return this.getProp("rightsAndReproduction") }
  set rightsAndReproduction(value) { this.setProp("rightsAndReproduction", value) }

  // - its "link resource" is text
  static { this.declareProp("linkResource", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3153, end: 3180 } }) }
  get linkResource() { return this.getProp("linkResource") }
  set linkResource(value) { this.setProp("linkResource", value) }

  // - its "metadata date" is a date
  static { this.declareProp("metadataDate", { type: "date", declaredAt: { path: "/MetMuseum.api.spell", start: 3184, end: 3213 } }) }
  get metadataDate() { return this.getProp("metadataDate") }
  set metadataDate(value) { this.setProp("metadataDate", value) }

  // - its "repository" is text
  static { this.declareProp("repository", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3217, end: 3241 } }) }
  get repository() { return this.getProp("repository") }
  set repository(value) { this.setProp("repository", value) }

  /** an address */
  // - its "object url" is text, stored as "objectURL"
  static { this.declareProp("objectUrl", { type: "text", storedAs: "objectURL", declaredAt: { path: "/MetMuseum.api.spell", start: 3245, end: 3292 } }) }
  get objectUrl() { return this.getProp("objectUrl") }
  set objectUrl(value) { this.setProp("objectUrl", value) }

  // - its "tags" is a list of tags
  static { this.declareProp("tags", { itemType: "Tag", init: () => new List({ instanceType: "Tag" }), declaredAt: { path: "/MetMuseum.api.spell", start: 3311, end: 3339 } }) }
  get tags() { return this.getProp("tags") }
  set tags(value) { this.setProp("tags", value) }

  /** an address */
  // - its "object wikidata url" is text
  static { this.declareProp("objectWikidataUrl", { type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3343, end: 3376 } }) }
  get objectWikidataUrl() { return this.getProp("objectWikidataUrl") }
  set objectWikidataUrl(value) { this.setProp("objectWikidataUrl", value) }

  // - its "timeline work" is yes or no, stored as "isTimelineWork"
  static { this.declareProp("timelineWork", { type: "choice", storedAs: "isTimelineWork", declaredAt: { path: "/MetMuseum.api.spell", start: 3395, end: 3455 } }) }
  get timelineWork() { return this.getProp("timelineWork") }
  set timelineWork(value) { this.setProp("timelineWork", value) }

  // - its "gallery number" is a number
  static { this.declareProp("galleryNumber", { type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 3459, end: 3491 } }) }
  get galleryNumber() { return this.getProp("galleryNumber") }
  set galleryNumber(value) { this.setProp("galleryNumber", value) }

  draw() {
    if (this.title && this.primaryImageSmall) {
      return h("ui-shape", { class: "artwork", direction: "over", "flip-on": "click", "aria-label": () => this.title },
        h("ui-side",
          h("ui-card", { fluid: true },
            h("ui-image", { src: () => this.primaryImageSmall, alt: () => this.title }),
            h("ui-content",
              h("ui-header", () => this.title),
              h("ui-meta", () => this.artistDisplayName)
            )
          )
        ),
        h("ui-side", () => this.drawAboutCard())
      )
    } else if (this.title) return h("slot", { name: "about_card" }, () => this.drawAboutCard())
  }

  // What the Met knows of it:  the back of a picture's card, or the whole card of one with no picture
  drawAboutCard() {
    return h("ui-card", { fluid: true, part: "about_card" },
      h("ui-content",
        h("ui-header", () => this.title),
        h("ui-meta", () => this.artistDisplayName, " · ", () => this.objectDate),
        h("ui-description",
          h("ui-text", { paragraph: true }, () => this.medium),
          h("ui-text", { paragraph: true }, () => this.dimensions),
          h("ui-text", { paragraph: true, color: "grey" }, () => this.department, " · ", () => this.creditLine)
        )
      ),
      h("ui-extra",
        h("ui-link", { link: () => this.objectUrl, target: "_blank" }, "On the Met's own pages")
      )
    )
  }

  static savedIn = { place: "met_museum", collection: "artworks", select: ["primaryImageSmall", "department", "title", "artistDisplayName", "objectDate", "medium", "dimensions", "creditLine", "city", "state", "region", "objectUrl"] }
}

export class Constituent extends Thing {
  // - its "constituent id" is a number, stored as "constituentID"
  static { this.declareProp("constituentId", { type: "number", storedAs: "constituentID" }) }
  get constituentId() { return this.getProp("constituentId") }
  set constituentId(value) { this.setProp("constituentId", value) }

  // - its "role" is text
  static { this.declareProp("role", { type: "text" }) }
  get role() { return this.getProp("role") }
  set role(value) { this.setProp("role", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** an address */
  // - its "constituent ulan url" is text
  static { this.declareProp("constituentUlanUrl", { type: "text" }) }
  get constituentUlanUrl() { return this.getProp("constituentUlanUrl") }
  set constituentUlanUrl(value) { this.setProp("constituentUlanUrl", value) }

  /** an address */
  // - its "constituent wikidata url" is text
  static { this.declareProp("constituentWikidataUrl", { type: "text" }) }
  get constituentWikidataUrl() { return this.getProp("constituentWikidataUrl") }
  set constituentWikidataUrl(value) { this.setProp("constituentWikidataUrl", value) }

  // - its "gender" is text
  static { this.declareProp("gender", { type: "text" }) }
  get gender() { return this.getProp("gender") }
  set gender(value) { this.setProp("gender", value) }
}

export class Measurement extends Thing {
  // - its "element name" is text
  static { this.declareProp("elementName", { type: "text" }) }
  get elementName() { return this.getProp("elementName") }
  set elementName(value) { this.setProp("elementName", value) }

  // - its "element description" is text
  static { this.declareProp("elementDescription", { type: "text" }) }
  get elementDescription() { return this.getProp("elementDescription") }
  set elementDescription(value) { this.setProp("elementDescription", value) }

  // - its "element measurements" is an element measurement
  static { this.declareProp("elementMeasurements", { type: "ElementMeasurement" }) }
  get elementMeasurements() { return this.getProp("elementMeasurements") }
  set elementMeasurements(value) { this.setProp("elementMeasurements", value) }
}

export class ElementMeasurement extends Thing {
  // - its "diameter" is a number
  static { this.declareProp("diameter", { type: "number" }) }
  get diameter() { return this.getProp("diameter") }
  set diameter(value) { this.setProp("diameter", value) }

  // - its "height" is a number
  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  // - its "width" is a number
  static { this.declareProp("width", { type: "number" }) }
  get width() { return this.getProp("width") }
  set width(value) { this.setProp("width", value) }

  // - its "depth" is a number
  static { this.declareProp("depth", { type: "number" }) }
  get depth() { return this.getProp("depth") }
  set depth(value) { this.setProp("depth", value) }
}

export class Tag extends Thing {
  // - its "term" is text
  static { this.declareProp("term", { type: "text" }) }
  get term() { return this.getProp("term") }
  set term(value) { this.setProp("term", value) }

  /** an address */
  // - its "aat url" is text
  static { this.declareProp("aatUrl", { type: "text" }) }
  get aatUrl() { return this.getProp("aatUrl") }
  set aatUrl(value) { this.setProp("aatUrl", value) }

  /** an address */
  // - its "wikidata url" is text
  static { this.declareProp("wikidataUrl", { type: "text" }) }
  get wikidataUrl() { return this.getProp("wikidataUrl") }
  set wikidataUrl(value) { this.setProp("wikidataUrl", value) }
}

export class MetMuseum extends Place {}
export const metMuseum = core.place(new MetMuseum(), {
  name: "met_museum",
  kind: "web server",
  at: "https://collectionapi.metmuseum.org/public/collection",
  idColumn: "objectID",
  rowsIn: "objectIDs",
  listsGive: ["objectID"],
  pagesByOffset: { limit: "limit", offset: "offset" },
  pageSize: 500,
  checkedEvery: 30,
  mostPerSecond: 80,
  searches: {
    param: "q",
    fields: [],
    at: "/v1.1/search"
  },
  collections: { artworks: { at: "/v1/objects" } }
})

// -----------
core.heading("The Met Museum")
////////////////////
// ## The Met Museum
////////////////////
// Artworks of the Metropolitan Museum of Art, found by what you type.
// Every thing it shows is in MetMuseum.api.spell, as `spell place ingest` wrote it;  the type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// Its search answers only ids:  each artwork is read from its own address as it's drawn, a page at a time, and no others.

export class MetMuseumPage extends Thing {
  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  create() {
    this.search = "sunflowers"
  }

  /** What the Met finds for the search, looking at all of each artwork:  ids only, each read as it's drawn */
  static { this.declareProp("found", { declaredAt: { path: "/MetMuseum.spellml", start: 542, end: 709 }, readsFrom: ["met_museum"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return await core.savedThings(Artwork, { search: { "*": this.search } })
  }, () => [this.search]) }

  async tryWords(words) {
    this.search = words
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-form", { class: "find", value: this },
        h("ui-stack", { spacing: "sm" },
          h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
            h("ui-header", { size: "large" }, "Artworks, from the Met"),
            h("ui-search", {
              name: "search",
              parameter: "art",
              icon: "search",
              placeholder: "A title, an artist, a subject",
              "aria-label": "Search the Met"
            })
          ),
          h("ui-toolbar", { appearance: "secondary", size: "small", "aria-label": "Try a search" },
            h("ui-text", { slot: "title", size: "small", color: "grey" }, "Try"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("sunflowers")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Sunflowers"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("van gogh")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Van Gogh"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("armor")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Armor"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("egypt")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Egypt"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("cats")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Cats"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("hokusai")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Hokusai")
          )
        )
      ),
      () => core.drawRead(() => this.found, (artwork) => core.drawThing(artwork), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the Met"),
        none: () => h("ui-text", "The Met has nothing for that."),
        failedSay: () => "The Met can't be reached just now.",
        paging: () => "pages",
        items: () => h("ui-cards", { layout: "mosaic", columns: "4", doubling: true })
      }),
      h("ui-text", { class: "credits", size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://metmuseum.github.io" }, "the Met Museum's API"),
        ", each artwork asked for as it's shown.  Press a picture to turn it over."
      )
    )
  }
}

core.heading("An artwork")
////////////////
// ## An artwork
////////////////
// A card that turns over:  its picture on the front, what the Met knows of it on the back.
// Each is read from its own address the first time it's drawn;  one the Met won't give is left out.
// Only what's in the public domain has a picture:  the rest show what the Met knows of them, with nothing to turn over.

// -----------
core.heading("REST Countries:  every country in the world, its flag, its capital, its money, its languages and its names")
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ## REST Countries:  every country in the world, its flag, its capital, its money, its languages and its names
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in RestCountries.spellml.
// `rest countries` is what this wrote, from looking at the server:
//   spell place ingest https://cdn.jsdelivr.net/gh/mledoze/countries@5.1.0 --into RestCountries.api.spell
//     --name "rest countries" --no-ai --collections "countries=/countries.json"
// `spell place update RestCountries.api.spell` looks again, and changes only this file and RestCountries.api.json5.
// It's the data restcountries.com serves, from the repository that keeps it:  every country in one answer, with no paging.
// Its money, its languages and its names come keyed by a code, `"EUR": { ... }`, `"fra": "French"`:
// each is a list of things, each with its code, `the first translation in its translations where its code is "fra"`.

export class Country extends Thing {
  // - its "name" is a name
  static { this.declareProp("name", { type: "Name", declaredAt: { path: "/RestCountries.api.spell", start: 1142, end: 1162 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "tld" is a list of text
  static { this.declareProp("tld", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1166, end: 1193 } }) }
  get tld() { return this.getProp("tld") }
  set tld(value) { this.setProp("tld", value) }

  // - its "cca2" is text
  static { this.declareProp("cca2", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1197, end: 1215 } }) }
  get cca2() { return this.getProp("cca2") }
  set cca2(value) { this.setProp("cca2", value) }

  // - its "ccn3" is text
  static { this.declareProp("ccn3", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1219, end: 1237 } }) }
  get ccn3() { return this.getProp("ccn3") }
  set ccn3(value) { this.setProp("ccn3", value) }

  // - its "cca3" is text
  static { this.declareProp("cca3", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1241, end: 1259 } }) }
  get cca3() { return this.getProp("cca3") }
  set cca3(value) { this.setProp("cca3", value) }

  // - its "cioc" is text
  static { this.declareProp("cioc", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1263, end: 1281 } }) }
  get cioc() { return this.getProp("cioc") }
  set cioc(value) { this.setProp("cioc", value) }

  // - its "independent" is yes or no
  static { this.declareProp("independent", { type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1285, end: 1315 } }) }
  get independent() { return this.getProp("independent") }
  set independent(value) { this.setProp("independent", value) }

  // - its "status" is text
  static { this.declareProp("status", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1319, end: 1339 } }) }
  get status() { return this.getProp("status") }
  set status(value) { this.setProp("status", value) }

  // - its "un member" is yes or no
  static { this.declareProp("unMember", { type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1343, end: 1371 } }) }
  get unMember() { return this.getProp("unMember") }
  set unMember(value) { this.setProp("unMember", value) }

  // - its "un regional group" is text
  static { this.declareProp("unRegionalGroup", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1375, end: 1406 } }) }
  get unRegionalGroup() { return this.getProp("unRegionalGroup") }
  set unRegionalGroup(value) { this.setProp("unRegionalGroup", value) }

  // - its "currencies" is a list of currencies
  static { this.declareProp("currencies", { itemType: "Currency", init: () => new List({ instanceType: "Currency" }), declaredAt: { path: "/RestCountries.api.spell", start: 1410, end: 1450 } }) }
  get currencies() { return this.getProp("currencies") }
  set currencies(value) { this.setProp("currencies", value) }

  // - its "idd" is an idd
  static { this.declareProp("idd", { type: "Idd", declaredAt: { path: "/RestCountries.api.spell", start: 1454, end: 1473 } }) }
  get idd() { return this.getProp("idd") }
  set idd(value) { this.setProp("idd", value) }

  // - its "capital" is a list of text
  static { this.declareProp("capital", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1477, end: 1508 } }) }
  get capital() { return this.getProp("capital") }
  set capital(value) { this.setProp("capital", value) }

  // - its "alt spellings" is a list of text
  static { this.declareProp("altSpellings", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1512, end: 1549 } }) }
  get altSpellings() { return this.getProp("altSpellings") }
  set altSpellings(value) { this.setProp("altSpellings", value) }

  // - its "region" is text
  static { this.declareProp("region", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1553, end: 1573 } }) }
  get region() { return this.getProp("region") }
  set region(value) { this.setProp("region", value) }

  // - its "subregion" is text
  static { this.declareProp("subregion", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1577, end: 1600 } }) }
  get subregion() { return this.getProp("subregion") }
  set subregion(value) { this.setProp("subregion", value) }

  // - its "languages" is a list of languages
  static { this.declareProp("languages", { itemType: "Language", init: () => new List({ instanceType: "Language" }), declaredAt: { path: "/RestCountries.api.spell", start: 1604, end: 1642 } }) }
  get languages() { return this.getProp("languages") }
  set languages(value) { this.setProp("languages", value) }

  // - its "translations" is a list of translations
  static { this.declareProp("translations", { itemType: "Translation", init: () => new List({ instanceType: "Translation" }), declaredAt: { path: "/RestCountries.api.spell", start: 1646, end: 1690 } }) }
  get translations() { return this.getProp("translations") }
  set translations(value) { this.setProp("translations", value) }

  // - its "latlng" is a list of numbers
  static { this.declareProp("latlng", { itemType: "number", init: () => new List({ instanceType: "number" }), declaredAt: { path: "/RestCountries.api.spell", start: 1694, end: 1727 } }) }
  get latlng() { return this.getProp("latlng") }
  set latlng(value) { this.setProp("latlng", value) }

  // - its "landlocked" is yes or no
  static { this.declareProp("landlocked", { type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1731, end: 1760 } }) }
  get landlocked() { return this.getProp("landlocked") }
  set landlocked(value) { this.setProp("landlocked", value) }

  // - its "borders" is a list of text
  static { this.declareProp("borders", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1764, end: 1795 } }) }
  get borders() { return this.getProp("borders") }
  set borders(value) { this.setProp("borders", value) }

  // - its "area" is a number
  static { this.declareProp("area", { type: "number", declaredAt: { path: "/RestCountries.api.spell", start: 1799, end: 1821 } }) }
  get area() { return this.getProp("area") }
  set area(value) { this.setProp("area", value) }

  // - its "flag" is text
  static { this.declareProp("flag", { type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1825, end: 1843 } }) }
  get flag() { return this.getProp("flag") }
  set flag(value) { this.setProp("flag", value) }

  // - its "demonyms" is a demonym
  static { this.declareProp("demonyms", { type: "Demonym", declaredAt: { path: "/RestCountries.api.spell", start: 1847, end: 1874 } }) }
  get demonyms() { return this.getProp("demonyms") }
  set demonyms(value) { this.setProp("demonyms", value) }

  static savedIn = { place: "rest_countries", collection: "countries", select: ["name", "currencies", "capital", "region", "languages", "translations", "flag"] }
}

export class Name extends Thing {
  // - its "common" is text
  static { this.declareProp("common", { type: "text" }) }
  get common() { return this.getProp("common") }
  set common(value) { this.setProp("common", value) }

  // - its "official" is text
  static { this.declareProp("official", { type: "text" }) }
  get official() { return this.getProp("official") }
  set official(value) { this.setProp("official", value) }

  // - its "native" is a list of natives
  static { this.declareProp("native", { itemType: "Native", init: () => new List({ instanceType: "Native" }) }) }
  get native() { return this.getProp("native") }
  set native(value) { this.setProp("native", value) }
}

export class Native extends Thing {
  // - its "code" is text
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  // - its "official" is text
  static { this.declareProp("official", { type: "text" }) }
  get official() { return this.getProp("official") }
  set official(value) { this.setProp("official", value) }

  // - its "common" is text
  static { this.declareProp("common", { type: "text" }) }
  get common() { return this.getProp("common") }
  set common(value) { this.setProp("common", value) }
}

export class Currency extends Thing {
  // - its "code" is text
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "symbol" is text
  static { this.declareProp("symbol", { type: "text" }) }
  get symbol() { return this.getProp("symbol") }
  set symbol(value) { this.setProp("symbol", value) }

  draw() {
    return h("ui-text",
      () => this.name,
      " (",
      () => this.symbol,
      ") ",
      h("ui-text", { color: "grey" }, () => this.code)
    )
  }
}

export class Idd extends Thing {
  // - its "root" is text
  static { this.declareProp("root", { type: "text" }) }
  get root() { return this.getProp("root") }
  set root(value) { this.setProp("root", value) }

  // - its "suffixes" is a list of text
  static { this.declareProp("suffixes", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get suffixes() { return this.getProp("suffixes") }
  set suffixes(value) { this.setProp("suffixes", value) }
}

export class Language extends Thing {
  // - its "code" is text
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  draw() {
    return h("ui-text", () => this.name)
  }
}

export class Translation extends Thing {
  // - its "code" is text
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  // - its "official" is text
  static { this.declareProp("official", { type: "text" }) }
  get official() { return this.getProp("official") }
  set official(value) { this.setProp("official", value) }

  // - its "common" is text
  static { this.declareProp("common", { type: "text" }) }
  get common() { return this.getProp("common") }
  set common(value) { this.setProp("common", value) }
}

export class Demonym extends Thing {
  // - its "eng" is an eng
  static { this.declareProp("eng", { type: "Eng" }) }
  get eng() { return this.getProp("eng") }
  set eng(value) { this.setProp("eng", value) }

  // - its "fra" is a fra
  static { this.declareProp("fra", { type: "Fra" }) }
  get fra() { return this.getProp("fra") }
  set fra(value) { this.setProp("fra", value) }
}

export class Eng extends Thing {
  // - its "f" is text
  static { this.declareProp("f", { type: "text" }) }
  get f() { return this.getProp("f") }
  set f(value) { this.setProp("f", value) }

  // - its "m" is text
  static { this.declareProp("m", { type: "text" }) }
  get m() { return this.getProp("m") }
  set m(value) { this.setProp("m", value) }
}

export class Fra extends Thing {
  // - its "f" is text
  static { this.declareProp("f", { type: "text" }) }
  get f() { return this.getProp("f") }
  set f(value) { this.setProp("f", value) }

  // - its "m" is text
  static { this.declareProp("m", { type: "text" }) }
  get m() { return this.getProp("m") }
  set m(value) { this.setProp("m", value) }
}

export class RestCountry extends Place {}
export const restCountries = core.place(new RestCountry(), {
  name: "rest_countries",
  kind: "web server",
  at: "https://cdn.jsdelivr.net/gh/mledoze/countries@5.1.0",
  checkedEvery: 30,
  collections: { countries: { at: "/countries.json" } }
})

// -----------
core.heading("REST Countries")
////////////////////
// ## REST Countries
////////////////////
// Every country in the world, by region:  its flag, its capital, its money and its languages, and its name in another language.
// Every thing it shows is in RestCountries.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// All 250 come in one request, with no paging:  picking a region only looks through them again.

export class RestCountriesPage extends Thing {
  // - its "region" is text
  static { this.declareProp("region", { type: "text" }) }
  get region() { return this.getProp("region") }
  set region(value) { this.setProp("region", value) }

  /** its language's code, as REST Countries keys its names:  `fra`, `spa`, `deu`, `jpn` */
  // - its "language" is text
  static { this.declareProp("language", { type: "text" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  create() {
    this.region = "Europe"
    this.language = "fra"
  }

  /** The region's, looked through here:  REST Countries sends every one at once */
  static { this.declareProp("countries", { declaredAt: { path: "/RestCountries.spellml", start: 722, end: 906 }, readsFrom: ["rest_countries"] }) }
  get countries() { return core.waitedValue(this, "countries", async () => {
    return core.sortedBy(await core.savedThings(Country, { filter: { region: this.region } }), (item) => item.name?.common)
  }, () => [this.region]) }

  pickRegionRegion(region) {
    this.region = region
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-stack", { spacing: "sm" },
        h("ui-form", { value: this },
          h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
            h("ui-header", { size: "large" }, "The world's countries, from REST Countries"),
            h("ui-select", { name: "language", "aria-label": "Names in" },
              h("ui-item", { value: "fra" }, "Français"),
              h("ui-item", { value: "spa" }, "Español"),
              h("ui-item", { value: "deu" }, "Deutsch"),
              h("ui-item", { value: "jpn" }, "日本語")
            )
          )
        ),
        h("ui-toolbar", { appearance: "secondary", "aria-label": "Regions" },
          h("ui-item", {
            active: () => this.region === "Africa",
            onClick: core.pressed(this, () => this.pickRegionRegion("Africa")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Africa"),
          h("ui-item", {
            active: () => this.region === "Americas",
            onClick: core.pressed(this, () => this.pickRegionRegion("Americas")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "The Americas"),
          h("ui-item", {
            active: () => this.region === "Asia",
            onClick: core.pressed(this, () => this.pickRegionRegion("Asia")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Asia"),
          h("ui-item", {
            active: () => this.region === "Europe",
            onClick: core.pressed(this, () => this.pickRegionRegion("Europe")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Europe"),
          h("ui-item", {
            active: () => this.region === "Oceania",
            onClick: core.pressed(this, () => this.pickRegionRegion("Oceania")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Oceania"),
          h("ui-item", {
            active: () => this.region === "Antarctic",
            onClick: core.pressed(this, () => this.pickRegionRegion("Antarctic")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "The Antarctic")
        )
      ),
      () => this.drawCountriesTable(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://github.com/mledoze/countries" }, "the data REST Countries serves"),
        ", every country in one request."
      )
    )
  }

  // A row a country:  its flag and name, its name in the language picked, its capital, its money and its languages;  each of those keyed by a code, `EUR`, `fra`, a list of things with that code
  drawCountriesTable() {
    return core.drawRead(() => this.countries, (country) => [
      h("ui-cell", { "data-column": "Flag", align: "center" },
        h("ui-text", { size: "big" }, () => country.flag)
      ),
      h("ui-cell", { "data-column": "Country", header: true }, () => country.name?.common),
      h("ui-cell", { "data-column": "Its name there" },
        () => core.getItemAt(core.filter(country.translations, (translation) => translation.code === publicServers.atlas.language), 0)?.common
      ),
      h("ui-cell", { "data-column": "Capital" }, () => core.getItemAt(country.capital, 0)),
      h("ui-cell", { "data-column": "Money" },
        h("ui-stack", { spacing: "none" }, () => core.drawItems(country.currencies))
      ),
      h("ui-cell", { "data-column": "Languages" },
        h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" },
          () => core.drawItems(country.languages)
        )
      )
    ], {
      waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "countries_table" },
        "Asking REST Countries"
      ),
      failedSay: () => "REST Countries can't be reached just now.",
      items: () => h("ui-table", { appearance: "very-basic", padding: "compact", "vertical-align": "top", part: "countries_table" },
        h("ui-row")
      )
    })
  }
}

core.heading("Its money")
///////////////
// ## Its money
///////////////
// Its name, its symbol and its code:  `Euro`, `€`, `EUR`.

core.heading("A language")
////////////////
// ## A language
////////////////
// Its name in English, keyed by its code:  `French`, `fra`.

// -----------
core.heading("Public Servers")
////////////////////
// ## Public Servers
////////////////////
// Servers other people run, each read through the Spell `spell place ingest` wrote for it, untouched:  each a page of its own, on a tab, in one centred column.
// The tab chosen, and each page's search, are kept in the page's address (`?server=met&art=van+gogh`), so Back steps through them.
// GitHub's is first, then Open Library's, then JSONPlaceholder's, which takes writes, then Open-Meteo's, the weather, then the Met Museum's artworks, then REST Countries', every country.

export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  // - its "github" is a new github page
  static { this.declareProp("github", { init: () => new GithubPage(), early: true }) }
  get github() { return this.getProp("github") }
  set github(value) { this.setProp("github", value) }

  // - its "library" is a new open library page
  static { this.declareProp("library", { init: () => new OpenLibraryPage(), early: true }) }
  get library() { return this.getProp("library") }
  set library(value) { this.setProp("library", value) }

  // - its "weather" is a new open meteo page
  static { this.declareProp("weather", { init: () => new OpenMeteoPage(), early: true }) }
  get weather() { return this.getProp("weather") }
  set weather(value) { this.setProp("weather", value) }

  // - its "museum" is a new met museum page
  static { this.declareProp("museum", { init: () => new MetMuseumPage(), early: true }) }
  get museum() { return this.getProp("museum") }
  set museum(value) { this.setProp("museum", value) }

  // - its "atlas" is a new rest countries page
  static { this.declareProp("atlas", { init: () => new RestCountriesPage(), early: true }) }
  get atlas() { return this.getProp("atlas") }
  set atlas(value) { this.setProp("atlas", value) }

  create() {
    this.tab = "github"
  }

  draw() {
    return h("ui-container",
      h("ui-stack", { spacing: "lg" },
        h("ui-form", { value: this },
          h("ui-tabs", { name: "tab", parameter: "server", appearance: "secondary pointing basic", "aria-label": "Servers" },
            h("ui-tab", { label: "GitHub", value: "github" }),
            h("ui-tab", { label: "Open Library", value: "library" }),
            h("ui-tab", { label: "JSONPlaceholder", value: "jsonplaceholder" }),
            h("ui-tab", { label: "Open-Meteo", value: "weather" }),
            h("ui-tab", { label: "The Met", value: "met" }),
            h("ui-tab", { label: "REST Countries", value: "countries" })
          )
        ),
        () => this.drawServer()
      )
    )
  }

  // The tab's page:  its own drawing, so its `if` picks just one, and only that one asks its server
  drawServer() {
    if (this.tab === "github") return core.drawThing(this.github)
    else if (this.tab === "library") return core.drawThing(this.library)
    else if (this.tab === "jsonplaceholder") return core.drawThing(new JsonplaceholderPage())
    else if (this.tab === "weather") return core.drawThing(this.weather)
    else if (this.tab === "met") return core.drawThing(this.museum)
    else if (this.tab === "countries") return core.drawThing(this.atlas)
  }
}
export const publicServers = new PublicServer()

core.heading("What a book and a city can do, from anywhere")
// -----------
if (!core.isCarryingOver) publicServers.start()
