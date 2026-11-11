import { core, Thing, List, App, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("GitHub:  a repository's issues, the people who wrote it, anyone by their login, and a search of people and repositories")
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ## GitHub:  a repository's issues, the people who wrote it, anyone by their login, and a search of people and repositories
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in GitHub.spell.
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
  static { this.declareProp("url", { type: "Issue", link: true, declaredAt: { path: "/GitHub.api.spell", start: 1723, end: 1744 } }) }
  get url(): Issue { return core.linked(this, "url", Issue) as Issue }
  set url(value: Issue) { this.setProp("url", value) }

  /** an address */
  // - its "repository url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1746, end: 1774 } })
  accessor repositoryUrl!: string

  /** an address */
  // - its "labels url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1791, end: 1815 } })
  accessor labelsUrl!: string

  /** an address */
  // - its "comments url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1832, end: 1858 } })
  accessor commentsUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1875, end: 1899 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1916, end: 1938 } })
  accessor htmlUrl!: string

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1955, end: 1976 } })
  accessor nodeId!: string

  // - its "number" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1978, end: 2002 } })
  accessor number!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2004, end: 2023 } })
  accessor title!: string

  // - its "user" is an issue user
  @prop({ type: "IssueUser", declaredAt: { path: "/GitHub.api.spell", start: 2025, end: 2052 } })
  accessor user!: IssueUser

  // - its "labels" is a list of labels
  @prop({ itemType: "Label", init: () => new List<Label>({ instanceType: "Label" }), declaredAt: { path: "/GitHub.api.spell", start: 2054, end: 2086 } })
  accessor labels!: List<Label>

  // - its "state" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2088, end: 2107 } })
  accessor state!: string

  // - its "locked" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2109, end: 2134 } })
  accessor locked!: boolean

  // - its "assignees" is a list of assignees
  @prop({ itemType: "Assignee", init: () => new List<Assignee>({ instanceType: "Assignee" }), declaredAt: { path: "/GitHub.api.spell", start: 2136, end: 2174 } })
  accessor assignees!: List<Assignee>

  // - its "comments" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 2176, end: 2202 } })
  accessor comments!: number

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2204, end: 2230 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2232, end: 2258 } })
  accessor updatedAt!: Date

  // - its "author association" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2260, end: 2292 } })
  accessor authorAssociation!: string

  // - its "issue field values" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 2294, end: 2336 } })
  accessor issueFieldValues!: List<string>

  // - its "sub issues summary" is a sub issues summary
  @prop({ type: "SubIssuesSummary", declaredAt: { path: "/GitHub.api.spell", start: 2338, end: 2386 } })
  accessor subIssuesSummary!: SubIssuesSummary

  // - its "issue dependencies summary" is an issue dependencies summary
  @prop({ type: "IssueDependenciesSummary", declaredAt: { path: "/GitHub.api.spell", start: 2388, end: 2453 } })
  accessor issueDependenciesSummary!: IssueDependenciesSummary

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2455, end: 2473 } })
  accessor body!: string

  // - its "reactions" is a reaction
  @prop({ type: "Reaction", declaredAt: { path: "/GitHub.api.spell", start: 2475, end: 2504 } })
  accessor reactions!: Reaction

  /** an address */
  // - its "timeline url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2506, end: 2532 } })
  accessor timelineUrl!: string

  // - its "performed via github app" is a performed via github app
  @prop({ type: "PerformedViaGithubApp", declaredAt: { path: "/GitHub.api.spell", start: 2549, end: 2609 } })
  accessor performedViaGithubApp!: PerformedViaGithubApp

  // - its "state reason" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2611, end: 2637 } })
  accessor stateReason!: string

  // - its "draft" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2639, end: 2663 } })
  accessor draft!: boolean

  // - its "pull request" is a pull request
  @prop({ type: "PullRequest", declaredAt: { path: "/GitHub.api.spell", start: 2665, end: 2701 } })
  accessor pullRequest!: PullRequest

  // - its "assignee" is an assignee
  @prop({ type: "Assignee", declaredAt: { path: "/GitHub.api.spell", start: 2703, end: 2732 } })
  accessor assignee!: Assignee

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-header>
            {this.title}
            <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
              <ui-icon name="github" />
            </ui-link>
          </ui-header>
          <ui-meta>#{this.number} · {this.state}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "github",
    collection: "issues",
    times: ["created", "modified"], select: ["htmlUrl", "number", "title", "state", "comments", "createdAt", "body", "pullRequest"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1703, end: 1721 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1703, end: 1721 } })
  accessor modified!: any /* spell: type unknown */
}

export class Contributor extends Thing {
  // - its "login" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2783, end: 2802 } })
  accessor login!: string

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2804, end: 2825 } })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2827, end: 2851 } })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2868, end: 2893 } })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2895, end: 2912 } })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2929, end: 2951 } })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2968, end: 2995 } })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3012, end: 3039 } })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3056, end: 3079 } })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3096, end: 3121 } })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3138, end: 3169 } })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3186, end: 3217 } })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3234, end: 3257 } })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3274, end: 3298 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3315, end: 3348 } })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 3365, end: 3401 } })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3403, end: 3431 } })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3433, end: 3462 } })
  accessor siteAdmin!: boolean

  // - its "contributions" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 3464, end: 3495 } })
  accessor contributions!: number

  static savedIn = {
    place: "github",
    collection: "contributors",
    times: ["created", "modified"], select: ["login", "avatarUrl", "htmlUrl", "kind"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2763, end: 2781 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2763, end: 2781 } })
  accessor modified!: any /* spell: type unknown */
}

export class User extends Thing {
  // - its "login" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3539, end: 3558 } })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/GitHub.api.spell", start: 3560, end: 3600 } })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3602, end: 3623 } })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3625, end: 3649 } })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3666, end: 3691 } })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3693, end: 3710 } })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3727, end: 3749 } })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3766, end: 3793 } })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3810, end: 3837 } })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3854, end: 3877 } })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3894, end: 3919 } })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3936, end: 3967 } })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3984, end: 4015 } })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4032, end: 4055 } })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4072, end: 4096 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4113, end: 4146 } })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 4163, end: 4199 } })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4201, end: 4229 } })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 4231, end: 4260 } })
  accessor siteAdmin!: boolean

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4262, end: 4280 } })
  accessor name!: string

  // - its "company" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4282, end: 4303 } })
  accessor company!: string

  /** an address */
  // - its "blog" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4305, end: 4323 } })
  accessor blog!: string

  // - its "location" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4340, end: 4362 } })
  accessor location!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4364, end: 4383 } })
  accessor email!: string

  // - its "twitter username" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4385, end: 4415 } })
  accessor twitterUsername!: string

  // - its "public repos" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4417, end: 4447 } })
  accessor publicRepos!: number

  // - its "public gists" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4449, end: 4479 } })
  accessor publicGists!: number

  // - its "followers" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4481, end: 4508 } })
  accessor followers!: number

  // - its "following" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4510, end: 4537 } })
  accessor following!: number

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4539, end: 4565 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4567, end: 4593 } })
  accessor updatedAt!: Date

  // - its "bio" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4595, end: 4612 } })
  accessor bio!: string

  /** Their own page, in the GitHub tab */
  async lookAtUser() {
    publicServers.github.showing = this
  }

  /** Put their page away again, with its Back button */
  async lookAwayFromUser() {
    publicServers.github.showing = undefined
  }

  @drawn draw() {
    return (
      <ui-card onClick={core.pressed(this, async () => await this.lookAtUser())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <ui-content>
          <ui-stack direction="horizontal" align="center" spacing="sm">
            <ui-image src={this.avatarUrl} alt="" size="mini" appearance="circular" />
            <ui-stack spacing="none" align="start">
              <ui-header>
                {this.login}
                <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
                  <ui-icon name="github" />
                </ui-link>
              </ui-header>
              <ui-meta>{this.kind}</ui-meta>
            </ui-stack>
          </ui-stack>
        </ui-content>
      </ui-card>
    )
  }

  drawPage() {
    return (
      <ui-stack spacing="xl" part="page">
        <ui-stack direction="horizontal" align="center" spacing="sm">
          <ui-button icon="arrow left" appearance="basic" aria-label="Back" title="Back" onClick={core.pressed(this, async () => await this.lookAwayFromUser())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          <ui-header size="large">
            {this.name ? this.name : this.login}
            <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
              <ui-icon name="github" />
            </ui-link>
          </ui-header>
        </ui-stack>
        <ui-stack direction="horizontal" wrap={true} align="start" spacing="md">
          <ui-image src={this.avatarUrl} alt="" size="small" appearance="rounded" />
          <ui-stack spacing="sm">
            <ui-text color="grey">{this.login} · {this.kind}</ui-text>
            <ui-text hidden={this.bio ? undefined : true}>{this.bio}</ui-text>
            <ui-text size="small" color="grey" hidden={core.dateShown(this.createdAt) ? undefined : true}>
              {this.publicRepos}
              {" public repositories · "}
              {this.followers}
              {" followers"}
            </ui-text>
          </ui-stack>
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">Most popular</ui-header>
          {core.drawRead(async () => await core.savedThings(Repository, { search: { "*": `user:${this.login} sort:stars` } }, "as drawn"), (repository: Repository) => core.drawThing(repository), {
            waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">{"Asking GitHub"}</ui-loader>,
            none: () => <ui-text part="page">{"Nothing public yet."}</ui-text>,
            paging: () => "pages",
            items: () => <ui-cards columns="3" doubling={true} stackable={true} part="page" />
          })}
        </ui-stack>
      </ui-stack>
    )
  }

  static savedIn = {
    place: "github",
    collection: "users",
    times: ["created", "modified"], select: ["login", "number", "avatarUrl", "htmlUrl", "kind", "name", "email", "publicRepos", "followers", "createdAt", "bio"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 3519, end: 3537 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 3519, end: 3537 } })
  accessor modified!: any /* spell: type unknown */
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

  /** an address */
  // - its "avatar url" is text
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  @prop({ type: "text" })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  @prop({ type: "text" })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  @prop({ type: "text" })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  @prop({ type: "text" })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  @prop({ type: "text" })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text" })
  accessor eventsUrl!: string

  /** an address */
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

  /** an address */
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
  /** an address */
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

  /** an address */
  // - its "external url" is text
  @prop({ type: "text" })
  accessor externalUrl!: string

  /** an address */
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

  /** an address */
  // - its "avatar url" is text
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  @prop({ type: "text" })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  @prop({ type: "text" })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  @prop({ type: "text" })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  @prop({ type: "text" })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  @prop({ type: "text" })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text" })
  accessor eventsUrl!: string

  /** an address */
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

  // - its "repository creation" is text
  @prop({ type: "text" })
  accessor repositoryCreation!: string
}

export class PullRequest extends Thing {
  /** an address */
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "diff url" is text
  @prop({ type: "text" })
  accessor diffUrl!: string

  /** an address */
  // - its "patch url" is text
  @prop({ type: "text" })
  accessor patchUrl!: string
}

export class Repository extends Thing {
  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 7931, end: 7952 } })
  accessor nodeId!: string

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 7954, end: 7972 } })
  accessor name!: string

  // - its "full name" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 7974, end: 7997 } })
  accessor fullName!: string

  // - its "private" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 7999, end: 8025 } })
  accessor private!: boolean

  // - its "owner" is an owner
  @prop({ type: "Owner", declaredAt: { path: "/GitHub.api.spell", start: 8027, end: 8050 } })
  accessor owner!: Owner

  /** an address */
  // - its "html url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8052, end: 8074 } })
  accessor htmlUrl!: string

  // - its "description" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8091, end: 8116 } })
  accessor description!: string

  // - its "fork" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 8118, end: 8141 } })
  accessor fork!: boolean

  /** an address */
  // - its "url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8143, end: 8160 } })
  accessor url!: string

  /** an address */
  // - its "forks url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8177, end: 8200 } })
  accessor forksUrl!: string

  /** an address */
  // - its "keys url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8217, end: 8239 } })
  accessor keysUrl!: string

  /** an address */
  // - its "collaborators url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8256, end: 8287 } })
  accessor collaboratorsUrl!: string

  /** an address */
  // - its "teams url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8304, end: 8327 } })
  accessor teamsUrl!: string

  /** an address */
  // - its "hooks url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8344, end: 8367 } })
  accessor hooksUrl!: string

  /** an address */
  // - its "issue events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8384, end: 8414 } })
  accessor issueEventsUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8431, end: 8455 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "assignees url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8472, end: 8499 } })
  accessor assigneesUrl!: string

  /** an address */
  // - its "branches url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8516, end: 8542 } })
  accessor branchesUrl!: string

  /** an address */
  // - its "tags url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8559, end: 8581 } })
  accessor tagsUrl!: string

  /** an address */
  // - its "blobs url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8598, end: 8621 } })
  accessor blobsUrl!: string

  /** an address */
  // - its "git tags url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8638, end: 8664 } })
  accessor gitTagsUrl!: string

  /** an address */
  // - its "git refs url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8681, end: 8707 } })
  accessor gitRefsUrl!: string

  /** an address */
  // - its "trees url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8724, end: 8747 } })
  accessor treesUrl!: string

  /** an address */
  // - its "statuses url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8764, end: 8790 } })
  accessor statusesUrl!: string

  /** an address */
  // - its "languages url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8807, end: 8834 } })
  accessor languagesUrl!: string

  /** an address */
  // - its "stargazers url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8851, end: 8879 } })
  accessor stargazersUrl!: string

  /** an address */
  // - its "contributors url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8896, end: 8926 } })
  accessor contributorsUrl!: string

  /** an address */
  // - its "subscribers url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8943, end: 8972 } })
  accessor subscribersUrl!: string

  /** an address */
  // - its "subscription url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8989, end: 9019 } })
  accessor subscriptionUrl!: string

  /** an address */
  // - its "commits url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9036, end: 9061 } })
  accessor commitsUrl!: string

  /** an address */
  // - its "git commits url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9078, end: 9107 } })
  accessor gitCommitsUrl!: string

  /** an address */
  // - its "comments url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9124, end: 9150 } })
  accessor commentsUrl!: string

  /** an address */
  // - its "issue comment url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9167, end: 9198 } })
  accessor issueCommentUrl!: string

  /** an address */
  // - its "contents url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9215, end: 9241 } })
  accessor contentsUrl!: string

  /** an address */
  // - its "compare url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9258, end: 9283 } })
  accessor compareUrl!: string

  /** an address */
  // - its "merges url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9300, end: 9324 } })
  accessor mergesUrl!: string

  /** an address */
  // - its "archive url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9341, end: 9366 } })
  accessor archiveUrl!: string

  /** an address */
  // - its "downloads url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9383, end: 9410 } })
  accessor downloadsUrl!: string

  /** an address */
  // - its "issues url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9427, end: 9451 } })
  accessor issuesUrl!: string

  /** an address */
  // - its "pulls url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9468, end: 9491 } })
  accessor pullsUrl!: string

  /** an address */
  // - its "milestones url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9508, end: 9536 } })
  accessor milestonesUrl!: string

  /** an address */
  // - its "notifications url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9553, end: 9584 } })
  accessor notificationsUrl!: string

  /** an address */
  // - its "labels url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9601, end: 9625 } })
  accessor labelsUrl!: string

  /** an address */
  // - its "releases url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9642, end: 9668 } })
  accessor releasesUrl!: string

  /** an address */
  // - its "deployments url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9685, end: 9714 } })
  accessor deploymentsUrl!: string

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 9731, end: 9757 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 9759, end: 9785 } })
  accessor updatedAt!: Date

  // - its "pushed at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 9787, end: 9812 } })
  accessor pushedAt!: Date

  // - its "git url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9814, end: 9835 } })
  accessor gitUrl!: string

  // - its "ssh url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9837, end: 9858 } })
  accessor sshUrl!: string

  /** an address */
  // - its "clone url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9860, end: 9883 } })
  accessor cloneUrl!: string

  /** an address */
  // - its "svn url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9900, end: 9921 } })
  accessor svnUrl!: string

  // - its "homepage" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9938, end: 9960 } })
  accessor homepage!: string

  // - its "size" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 9962, end: 9984 } })
  accessor size!: number

  // - its "stargazers count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 9986, end: 10020 } })
  accessor stargazersCount!: number

  // - its "watchers count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10022, end: 10054 } })
  accessor watchersCount!: number

  // - its "language" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10056, end: 10078 } })
  accessor language!: string

  // - its "issues" is yes or no, stored as "has_issues"
  @prop({ type: "choice", storedAs: "has_issues", declaredAt: { path: "/GitHub.api.spell", start: 10080, end: 10129 } })
  accessor issues!: boolean

  // - its "projects" is yes or no, stored as "has_projects"
  @prop({ type: "choice", storedAs: "has_projects", declaredAt: { path: "/GitHub.api.spell", start: 10131, end: 10184 } })
  accessor projects!: boolean

  // - its "downloads" is yes or no, stored as "has_downloads"
  @prop({ type: "choice", storedAs: "has_downloads", declaredAt: { path: "/GitHub.api.spell", start: 10186, end: 10241 } })
  accessor downloads!: boolean

  // - its "wiki" is yes or no, stored as "has_wiki"
  @prop({ type: "choice", storedAs: "has_wiki", declaredAt: { path: "/GitHub.api.spell", start: 10243, end: 10288 } })
  accessor wiki!: boolean

  // - its "pages" is yes or no, stored as "has_pages"
  @prop({ type: "choice", storedAs: "has_pages", declaredAt: { path: "/GitHub.api.spell", start: 10290, end: 10337 } })
  accessor pages!: boolean

  // - its "discussions" is yes or no, stored as "has_discussions"
  @prop({ type: "choice", storedAs: "has_discussions", declaredAt: { path: "/GitHub.api.spell", start: 10339, end: 10398 } })
  accessor discussions!: boolean

  // - its "forks count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10400, end: 10429 } })
  accessor forksCount!: number

  // - its "archived" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10431, end: 10458 } })
  accessor archived!: boolean

  // - its "disabled" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10460, end: 10487 } })
  accessor disabled!: boolean

  // - its "open issues count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10489, end: 10524 } })
  accessor openIssuesCount!: number

  // - its "license" is a license
  @prop({ type: "License", declaredAt: { path: "/GitHub.api.spell", start: 10526, end: 10552 } })
  accessor license!: License

  // - its "allow forking" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10554, end: 10586 } })
  accessor allowForking!: boolean

  // - its "template" is yes or no, stored as "is_template"
  @prop({ type: "choice", storedAs: "is_template", declaredAt: { path: "/GitHub.api.spell", start: 10588, end: 10640 } })
  accessor template!: boolean

  // - its "web commit signoff required" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10642, end: 10688 } })
  accessor webCommitSignoffRequired!: boolean

  // - its "pull requests" is yes or no, stored as "has_pull_requests"
  @prop({ type: "choice", storedAs: "has_pull_requests", declaredAt: { path: "/GitHub.api.spell", start: 10690, end: 10753 } })
  accessor pullRequests!: boolean

  // - its "pull request creation policy" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10755, end: 10797 } })
  accessor pullRequestCreationPolicy!: string

  // - its "topics" is a list of users
  static { this.declareProp("topics", { itemType: "User", init: () => new List<User>({ instanceType: "User" }), declaredAt: { path: "/GitHub.api.spell", start: 10799, end: 10830 } }) }
  get topics(): List<User> { return core.linked(this, "topics", User) as List<User> }
  set topics(value: List<User>) { this.setProp("topics", value) }

  // - its "visibility" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10832, end: 10856 } })
  accessor visibility!: string

  // - its "forks" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10858, end: 10881 } })
  accessor forks!: number

  // - its "open issues" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10883, end: 10912 } })
  accessor openIssues!: number

  // - its "watchers" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10914, end: 10940 } })
  accessor watchers!: number

  // - its "default branch" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10942, end: 10970 } })
  accessor defaultBranch!: string

  // - its "permissions" is a permission
  @prop({ type: "Permission", declaredAt: { path: "/GitHub.api.spell", start: 10972, end: 11005 } })
  accessor permissions!: Permission

  // - its "score" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 11007, end: 11030 } })
  accessor score!: number

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-header>
            {this.fullName}
            <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
              <ui-icon name="github" />
            </ui-link>
          </ui-header>
          <ui-meta>
            {"★ "}
            {this.stargazersCount}
            <span hidden={this.language ? undefined : "until-found"}> · {this.language}</span>
          </ui-meta>
          <ui-description>{this.description}</ui-description>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "github",
    collection: "repositories",
    times: ["created", "modified"], select: ["name", "fullName", "htmlUrl", "description", "createdAt", "stargazersCount", "language"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 7911, end: 7929 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 7911, end: 7929 } })
  accessor modified!: any /* spell: type unknown */
}

export class Assignee extends Thing {
  // - its "login" is text
  @prop({ type: "text" })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  @prop({ type: "text" })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  @prop({ type: "text" })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  @prop({ type: "text" })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  @prop({ type: "text" })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  @prop({ type: "text" })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  @prop({ type: "text" })
  accessor eventsUrl!: string

  /** an address */
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

export class License extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "spdx id" is text
  @prop({ type: "text" })
  accessor spdxId!: string

  /** an address */
  // - its "url" is text
  @prop({ type: "text" })
  accessor url!: string

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string
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
// with `<extend>`, so looking again at the server never touches a line of this.
// A page in a browser holds no key:  it may search 10 times a minute, so the field waits for you to stop typing.

@thing
export class GithubPage extends Thing {
  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "showing" is a user
  static { this.declareProp("showing", { type: "User", link: true }) }
  get showing(): User { return core.linked(this, "showing", User) as User }
  set showing(value: User) { this.setProp("showing", value) }

  create() {
    this.search = "solid"
  }

  async tryWords(words: string) {
    this.showing = undefined
    this.search = words
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-form value={this}>
          <ui-stack spacing="sm">
            <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
              <ui-header size="large">People and code, on GitHub</ui-header>
              <ui-search name="search" parameter="who" icon="search" placeholder="A person, an organization, a repository" aria-label="Search GitHub" />
            </ui-stack>
            <ui-toolbar appearance="secondary" size="small" aria-label="Try a search">
              <ui-text slot="title" size="small" color="grey">Try</ui-text>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("ryansolid"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                ryansolid
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("solidjs"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                solidjs
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("vite"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                vite
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("torvalds"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                torvalds
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("spreadsheet"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                spreadsheet
              </ui-item>
            </ui-toolbar>
          </ui-stack>
        </ui-form>
        {this.drawFound()}
        {this.drawIssues()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://docs.github.com/en/rest">GitHub's REST API</ui-link>
          , asked for as you look.
        </ui-text>
      </ui-stack>
    )
  }

  // Solid's newest issues and pull requests, told apart:  GitHub lists both as issues, and only a pull request has a pull request
  drawIssues() {
    return (
      <ui-stack spacing="sm" part="issues">
        <ui-header size="medium">Solid's issues</ui-header>
        {core.drawRead(async () => await core.savedThings(Issue, { filter: { pullRequest: undefined }, page: { size: 6 } }, "as drawn"), (issue: Issue) => core.drawThing(issue), {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="issues">{"Asking GitHub"}</ui-loader>,
          none: () => <ui-text part="issues">{"No open issues."}</ui-text>,
          items: () => <ui-cards columns="3" doubling={true} stackable={true} part="issues" />
        })}
        <ui-header size="medium">Solid's pull requests</ui-header>
        {core.drawRead(async () => core.firstFew(core.filter(await core.savedThings(Issue, {}, "looks through"), (issue: Issue) => issue.pullRequest !== undefined), 6), (issue: Issue) => core.drawThing(issue), {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="issues">{"Asking GitHub"}</ui-loader>,
          none: () => <ui-text part="issues">{"No open pull requests."}</ui-text>,
          items: () => <ui-cards columns="3" doubling={true} stackable={true} part="issues" />
        })}
      </ui-stack>
    )
  }

  // Someone's own page, while one is picked;  else what the search finds
  drawFound() {
    if (this.showing) return core.drawRead(async () => (await core.savedThingWithId(User, (await core.answerOf(this, "showing"))?.login!)).drawPage(), undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="found">Asking GitHub</ui-loader> })
    else {
      return (
        <ui-stack spacing="xl" part="found">
          <ui-stack spacing="sm">
            <ui-header size="medium">People and organizations</ui-header>
            {core.drawRead(async () => await core.savedThings(User, { search: { "*": this.search } }, "as drawn"), (user: User) => core.drawThing(user), {
              waiting: () => <ui-loader visible={true} inline={true} text={true} part="found">{"Asking GitHub"}</ui-loader>,
              none: () => <ui-text part="found">{"Nobody on GitHub goes by that."}</ui-text>,
              paging: () => "pages",
              items: () => <ui-cards columns="4" doubling={true} stackable={true} part="found" />
            })}
          </ui-stack>
          <ui-stack spacing="sm">
            <ui-header size="medium">Repositories</ui-header>
            {core.drawRead(async () => await core.savedThings(Repository, { search: { "*": this.search } }, "as drawn"), (repository: Repository) => core.drawThing(repository), {
              waiting: () => <ui-loader visible={true} inline={true} text={true} part="found">{"Asking GitHub"}</ui-loader>,
              none: () => <ui-text part="found">{"No repository matches that."}</ui-text>,
              paging: () => "pages",
              items: () => <ui-cards columns="3" doubling={true} stackable={true} part="found" />
            })}
          </ui-stack>
        </ui-stack>
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

// -----------
core.heading("Open Library:  books by what they're called, who wrote them, and their covers")
///////////////////////////////////////////////////////////////////////////////////
// ## Open Library:  books by what they're called, who wrote them, and their covers
///////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in OpenLibrary.spell.
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
  static { this.declareProp("authors", { itemType: "Author", storedAs: "author_key", init: () => new List<Author>({ instanceType: "Author" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1596, end: 1654 } }) }
  get authors(): List<Author> { return core.linked(this, "authors", Author) as List<Author> }
  set authors(value: List<Author>) { this.setProp("authors", value) }

  // - its "author name" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1656, end: 1691 } })
  accessor authorName!: List<string>

  // - its "cover edition" is an edition, stored as "cover_edition_key"
  static { this.declareProp("coverEdition", { type: "Edition", storedAs: "cover_edition_key", link: true, declaredAt: { path: "/OpenLibrary.api.spell", start: 1693, end: 1757 } }) }
  get coverEdition(): Edition { return core.linked(this, "coverEdition", Edition) as Edition }
  set coverEdition(value: Edition) { this.setProp("coverEdition", value) }

  // - its "cover height" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1759, end: 1789 } })
  accessor coverHeight!: number

  /** a picture's address */
  // - its "cover i" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1791, end: 1812 } })
  accessor coverI!: string

  // - its "cover width" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1838, end: 1867 } })
  accessor coverWidth!: number

  // - its "ebook access" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1869, end: 1895 } })
  accessor ebookAccess!: string

  // - its "edition count" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1897, end: 1928 } })
  accessor editionCount!: number

  // - its "first publish year" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1930, end: 1966 } })
  accessor firstPublishYear!: number

  // - its "fulltext" is yes or no, stored as "has_fulltext"
  @prop({ type: "choice", storedAs: "has_fulltext", declaredAt: { path: "/OpenLibrary.api.spell", start: 1968, end: 2021 } })
  accessor fulltext!: boolean

  // - its "ia" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2023, end: 2049 } })
  accessor ia!: List<string>

  // - its "ia collection" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2051, end: 2088 } })
  accessor iaCollection!: List<string>

  // - its "language" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2090, end: 2122 } })
  accessor language!: List<string>

  // - its "lending edition s" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2124, end: 2155 } })
  accessor lendingEditionS!: string

  // - its "lending identifier s" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2157, end: 2191 } })
  accessor lendingIdentifierS!: string

  // - its "public scan b" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/OpenLibrary.api.spell", start: 2193, end: 2225 } })
  accessor publicScanB!: boolean

  // - its "editions" is a list of editions
  static { this.declareProp("editions", { itemType: "Edition", init: () => new List<Edition>({ instanceType: "Edition" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2227, end: 2263 } }) }
  get editions(): List<Edition> { return core.linked(this, "editions", Edition) as List<Edition> }
  set editions(value: List<Edition>) { this.setProp("editions", value) }

  // - its "series key" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2265, end: 2299 } })
  accessor seriesKey!: List<string>

  // - its "series name" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2301, end: 2336 } })
  accessor seriesName!: List<string>

  // - its "series position" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2338, end: 2377 } })
  accessor seriesPosition!: List<string>

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2379, end: 2398 } })
  accessor title!: string

  // - its "subtitle" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2400, end: 2422 } })
  accessor subtitle!: string

  /** Who wrote it first:  read from Open Library's record of them, by their id */
  static { this.declareProp("writer", { declaredAt: { path: "/OpenLibrary.spell", start: 2006, end: 2051 }, readsFrom: ["open_library"] }) }
  get writer() {
    return core.getItemAt(this.authors, 0)
  }

  /** Its own page, on the library's tab */
  async open() {
    publicServers.library.showing = this
  }

  /** Back to what the search found */
  async close() {
    publicServers.library.showing = undefined
  }

  @drawn draw() {
    return (
      <ui-card class="book" onClick={core.pressed(this, async () => await this.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <ui-image src={this.coverI} alt="" aspect-ratio="2:3" crop={true} />
        <ui-content>
          <ui-header>{this.title}</ui-header>
          <ui-meta>{core.listShown(this.authorName)} · {this.firstPublishYear}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  drawPage() {
    return (
      <ui-stack spacing="xl" part="page">
        <ui-stack direction="horizontal" align="center" spacing="sm">
          <ui-button icon="arrow left" appearance="basic" aria-label="Back" title="Back" onClick={core.pressed(this, async () => await this.close())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          <ui-header size="large">{this.title}</ui-header>
        </ui-stack>
        <ui-stack direction="horizontal" wrap={true} align="start" spacing="md">
          <ui-image src={this.coverI} alt="" size="small" />
          <ui-stack spacing="sm">
            <ui-text>First published in {this.firstPublishYear} · {this.editionCount} editions</ui-text>
            {this.drawWriting()}
          </ui-stack>
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">Editions</ui-header>
          {core.drawRead(() => this.editions, (edition: Edition) => core.drawThing(edition), {
            waiting: () => <ui-loader visible={true} inline={true} text={true} part="page">
              {"Asking Open Library for its editions"}
            </ui-loader>,
            none: () => <ui-text part="page">{"No editions listed."}</ui-text>,
            paging: () => "pages",
            items: () => <ui-cards columns="4" doubling={true} stackable={true} part="page" />
          })}
        </ui-stack>
      </ui-stack>
    )
  }

  drawWriting() {
    if (this.writer) return this.writer.drawCard()
    core.readRider("waiting", () => <ui-loader visible={true} inline={true} text={true} part="writing">Asking Open Library who wrote it</ui-loader>)
    core.readRider("failed", () => <ui-text part="writing">Open Library can't say who wrote it just now.</ui-text>)
  }

  static savedIn = {
    place: "open_library",
    collection: "books",
    times: ["created", "modified"], select: ["authors", "authorName", "coverI", "editionCount", "firstPublishYear", "language", "editions", "title"] }

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 1570, end: 1594 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 1570, end: 1594 } })
  accessor modified!: any /* spell: type unknown */
}

export class Author extends Thing {
  // - its "links" is a list of links
  @prop({ itemType: "Link", init: () => new List<Link>({ instanceType: "Link" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2475, end: 2505 } })
  accessor links!: List<Link>

  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 2507, end: 2545 } })
  accessor kind!: Kind

  // - its "key" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2547, end: 2564 } })
  accessor key!: string

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2566, end: 2584 } })
  accessor name!: string

  // - its "source records" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2586, end: 2624 } })
  accessor sourceRecords!: List<string>

  // - its "birth date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2626, end: 2650 } })
  accessor birthDate!: string

  // - its "bio" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2652, end: 2669 } })
  accessor bio!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2671, end: 2690 } })
  accessor title!: string

  // - its "alternate names" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2692, end: 2731 } })
  accessor alternateNames!: List<string>

  // - its "remote ids" is a remote id
  @prop({ type: "RemoteId", declaredAt: { path: "/OpenLibrary.api.spell", start: 2733, end: 2764 } })
  accessor remoteIds!: RemoteId

  // - its "photos" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2766, end: 2799 } })
  accessor photos!: List<number>

  // - its "death date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2801, end: 2825 } })
  accessor deathDate!: string

  // - its "personal name" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2827, end: 2854 } })
  accessor personalName!: string

  // - its "latest revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2856, end: 2889 } })
  accessor latestRevision!: number

  // - its "revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2891, end: 2917 } })
  accessor revision!: number

  // - its "created" is a created
  @prop({ type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 2919, end: 2945 } })
  accessor created!: Created

  // - its "last modified" is a last modified
  @prop({ type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 2947, end: 2985 } })
  accessor lastModified!: LastModified

  drawCard() {
    return (
      <ui-card part="card">
        <ui-content>
          <ui-header>{this.name}</ui-header>
          <ui-meta>Born {this.birthDate}</ui-meta>
          <ui-description>{this.bio}</ui-description>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "open_library",
    collection: "authors",
    times: ["modified"], select: ["kind", "name", "birthDate", "bio", "title"] }

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 2449, end: 2473 } })
  accessor modified!: any /* spell: type unknown */
}

export class Edition extends Thing {
  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 3039, end: 3077 } })
  accessor kind!: Kind

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3079, end: 3098 } })
  accessor title!: string

  // - its "authors" is a list of edition authors
  @prop({ itemType: "EditionAuthor", init: () => new List<EditionAuthor>({ instanceType: "EditionAuthor" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3100, end: 3142 } })
  accessor authors!: List<EditionAuthor>

  // - its "publish date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3144, end: 3170 } })
  accessor publishDate!: string

  // - its "source records" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3172, end: 3210 } })
  accessor sourceRecords!: List<string>

  // - its "number of pages" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3212, end: 3245 } })
  accessor numberOfPages!: number

  // - its "publishers" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3247, end: 3281 } })
  accessor publishers!: List<string>

  // - its "physical format" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3283, end: 3312 } })
  accessor physicalFormat!: string

  // - its "notes" is a note
  @prop({ type: "Note", declaredAt: { path: "/OpenLibrary.api.spell", start: 3314, end: 3335 } })
  accessor notes!: Note

  // - its "full title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3337, end: 3361 } })
  accessor fullTitle!: string

  // - its "covers" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3363, end: 3396 } })
  accessor covers!: List<number>

  // - its "works" is a list of works
  @prop({ itemType: "Work", init: () => new List<Work>({ instanceType: "Work" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3398, end: 3428 } })
  accessor works!: List<Work>

  // - its "key" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3430, end: 3447 } })
  accessor key!: string

  // - its "local id" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3449, end: 3481 } })
  accessor localId!: List<string>

  // - its "latest revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3483, end: 3516 } })
  accessor latestRevision!: number

  // - its "revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3518, end: 3544 } })
  accessor revision!: number

  // - its "created" is a created
  @prop({ type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 3546, end: 3572 } })
  accessor created!: Created

  // - its "last modified" is a last modified
  @prop({ type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 3574, end: 3612 } })
  accessor lastModified!: LastModified

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-header>{this.title}</ui-header>
          <ui-meta>{this.publishDate} · {core.getItemAt(this.publishers, 0)}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "open_library",
    collection: "editions",
    times: ["modified"], select: ["kind", "title", "authors", "publishDate", "publishers"] }

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 3013, end: 3037 } })
  accessor modified!: any /* spell: type unknown */
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
// with `<extend>`, so looking again at the server never touches a line of this.
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
  static { this.declareProp("found", { declaredAt: { path: "/OpenLibrary.spell", start: 618, end: 679 }, readsFrom: ["open_library"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return core.filter(await core.savedThings(Book, { search: { title: this.search } }, "looks through"), (book: Book) => core.includes(book.title, this.search))
  }, () => [this.search]) }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-form value={this}>
          <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
            <ui-header size="large">Books, from Open Library</ui-header>
            <ui-search name="search" parameter="book" icon="search" placeholder="A book, by its title" aria-label="Search Open Library" />
          </ui-stack>
        </ui-form>
        {this.drawShelf()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://openlibrary.org/developers/api">Open Library's API</ui-link>
          {", asked for as you look;  its covers from its covers server."}
        </ui-text>
      </ui-stack>
    )
  }

  // A book's own page, while one is open;  else what the search finds
  drawShelf() {
    if (this.showing) return this.showing.drawPage()
    else return this.drawBookList()
  }

  drawBookList() {
    return core.drawRead(() => this.found, (book: Book) => core.drawThing(book), {
      waiting: () => <ui-loader visible={true} inline={true} text={true} part="book_list">{"Asking Open Library"}</ui-loader>,
      none: () => <ui-text part="book_list">{"No book is called that."}</ui-text>,
      failedSay: () => "Open Library can't be reached just now.",
      paging: () => "pages",
      items: () => <ui-cards columns="5" doubling={true} part="book_list" />
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
// A server other people run, and what it holds.  What's drawn from it is in JSONPlaceholder.spell.
// `jsonplaceholder` is what this wrote, from looking at the server:
//   spell place ingest https://jsonplaceholder.typicode.com --into JSONPlaceholder.api.spell --name jsonplaceholder
//     --no-ai --try-writes --collections "posts=/posts,comments=/comments,users=/users,todos=/todos"
// `spell place update JSONPlaceholder.api.spell` looks again, and changes only this file and JSONPlaceholder.api.json5.
// It takes adding, changing and deleting, and answers as if each was saved, but keeps nothing:
// what you add is gone when it's read again (JSONPlaceholder.api.json5, its "write").

export class Post extends Thing {
  // - its "user id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1271, end: 1296 } })
  accessor userId!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1298, end: 1317 } })
  accessor title!: string

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1319, end: 1337 } })
  accessor body!: string

  // - its "comments" is a list of comments
  static { this.declareProp("comments", { itemType: "Comment", init: () => new List<Comment>({ instanceType: "Comment" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1339, end: 1375 } }) }
  get comments(): List<Comment> { return core.linked(this, "comments", Comment) as List<Comment> }
  set comments(value: List<Comment>) { this.setProp("comments", value) }

  @drawn draw() {
    return [
      <ui-header size="small">{this.title}</ui-header>,
      <ui-text>{this.body}</ui-text>,
      core.drawRead(() => this.comments, (comment: Comment) => core.drawThing(comment), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking for its comments"}</ui-loader> })
    ]
  }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "posts",
    times: ["created", "modified"], select: ["userId", "title", "body", "comments"] }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1242, end: 1269 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1242, end: 1269 } })
  accessor modified!: any /* spell: type unknown */
}

export class Comment extends Thing {
  // - its "post id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1431, end: 1456 } })
  accessor postId!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1458, end: 1476 } })
  accessor name!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1478, end: 1497 } })
  accessor email!: string

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1499, end: 1517 } })
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

  static savedIn = {
    place: "jsonplaceholder",
    collection: "comments",
    times: ["created", "modified"], select: ["name", "email", "body"] }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1402, end: 1429 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1402, end: 1429 } })
  accessor modified!: any /* spell: type unknown */
}

export class JsonplaceholderUser extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1586, end: 1604 } })
  accessor name!: string

  // - its "username" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1606, end: 1628 } })
  accessor username!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1630, end: 1649 } })
  accessor email!: string

  // - its "address" is an address
  @prop({ type: "Address", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1651, end: 1678 } })
  accessor address!: Address

  // - its "phone" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1680, end: 1699 } })
  accessor phone!: string

  // - its "website" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1701, end: 1722 } })
  accessor website!: string

  // - its "company" is a company
  @prop({ type: "Company", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1724, end: 1750 } })
  accessor company!: Company

  // - its "posts" is a list of posts
  static { this.declareProp("posts", { itemType: "Post", init: () => new List<Post>({ instanceType: "Post" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1752, end: 1782 } }) }
  get posts(): List<Post> { return core.linked(this, "posts", Post) as List<Post> }
  set posts(value: List<Post>) { this.setProp("posts", value) }

  // - its "todos" is a list of todos
  static { this.declareProp("todos", { itemType: "Todo", init: () => new List<Todo>({ instanceType: "Todo" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1784, end: 1814 } }) }
  get todos(): List<Todo> { return core.linked(this, "todos", Todo) as List<Todo> }
  set todos(value: List<Todo>) { this.setProp("todos", value) }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "jsonplaceholder_users",
    times: ["created", "modified"], select: ["name", "email", "posts", "todos"] }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1557, end: 1584 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1557, end: 1584 } })
  accessor modified!: any /* spell: type unknown */
}

export class Todo extends Thing {
  // - its "user id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1867, end: 1892 } })
  accessor userId!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1894, end: 1913 } })
  accessor title!: string

  // - its "completed" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1915, end: 1943 } })
  accessor completed!: boolean

  @drawn draw() {
    return (
      <ui-form value={this}>
        <ui-stack direction="horizontal" align="center" justify="between" spacing="sm">
          <ui-checkbox name="completed" label={this.title} />
          <ui-button icon="close" size="mini" appearance="transparent" aria-label="Remove" title="Remove" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
        </ui-stack>
      </ui-form>
    )
  }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "todos",
    times: ["created", "modified"]
  }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1838, end: 1865 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1838, end: 1865 } })
  accessor modified!: any /* spell: type unknown */
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
// with `<extend>`, so looking again at the server never touches a line of this.
// It answers each change as if it saved it, and keeps nothing:  what you add here is gone when it's asked again.

export class JsonplaceholderPage extends Thing {
  // "new todo" is a new todo with user id = 1
  static { this.declareProp("newTodo", { init: () => new Todo({ userId: 1 }), early: true }) }
  get newTodo(): Todo { return core.linked(this, "newTodo", Todo) as Todo }
  set newTodo(value: Todo) { this.setProp("newTodo", value) }

  /** Whose todos and posts these are:  the first person it has */
  static { this.declareProp("person", { declaredAt: { path: "/JSONPlaceholder.spell", start: 588, end: 642 }, readsFrom: ["jsonplaceholder"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(JsonplaceholderUser, 1)
  }) }

  /** Theirs, from every todo */
  static { this.declareProp("todos", { declaredAt: { path: "/JSONPlaceholder.spell", start: 672, end: 720 }, readsFrom: ["jsonplaceholder"] }) }
  get todos() { return core.waitedValue(this, "todos", async () => {
    return await core.savedThings(Todo, { filter: { userId: 1 } })
  }) }

  async addTheNewTodo() {
    core.saveThing(await core.answerOf(this, "newTodo"))
    this.newTodo = new Todo({ userId: 1 })
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-stack spacing="sm">
          <ui-header size="large">Practice, on JSONPlaceholder</ui-header>
          <ui-text color="grey">
            {"Tick a todo, add one, remove one:  each goes to the server, which answers as if it saved it, and keeps nothing."}
          </ui-text>
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">Their todos</ui-header>
          {this.drawChecklist()}
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">What they wrote</ui-header>
          {this.drawPostList()}
        </ui-stack>
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://jsonplaceholder.typicode.com">JSONPlaceholder</ui-link>
          , asked for as you look.
        </ui-text>
      </ui-stack>
    )
  }

  drawChecklist() {
    return (
      <ui-stack spacing="sm" part="checklist">
        <ui-form prop:value={this.newTodo}>
          <ui-input name="title" placeholder="Water the plants" aria-label="Something to do" fluid={true} action={true}>
            <ui-button slot="action" color="primary" disabled={this.newTodo.title === ""} onClick={core.pressed(this, async () => await this.addTheNewTodo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add
            </ui-button>
          </ui-input>
        </ui-form>
        {this.drawTodoList()}
      </ui-stack>
    )
  }

  drawTodoList() {
    return core.drawRead(() => this.todos, (todo) => core.drawThing(todo), { waiting: () => <ui-loader visible={true} inline={true} text={true} part="todo_list">{"Asking JSONPlaceholder"}</ui-loader>, failedSay: () => "JSONPlaceholder can't be reached just now." })
  }

  drawPostList() {
    return core.drawRead(() => this.person?.posts, (post) => core.drawThing(post), { waiting: () => <ui-loader visible={true} inline={true} text={true} part="post_list">{"Asking JSONPlaceholder"}</ui-loader>, failedSay: () => "JSONPlaceholder can't be reached just now." })
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

// Each comment, as Spell UI draws one:  named in full, `<ui-comment>`.

// -----------
core.heading("Open-Meteo:  the weather to come, hour by hour, for anywhere on Earth")
///////////////////////////////////////////////////////////////////////////
// ## Open-Meteo:  the weather to come, hour by hour, for anywhere on Earth
///////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in OpenMeteo.spell.
// `open meteo` is what this wrote, from looking at the server:
//   spell place ingest https://api.open-meteo.com --into OpenMeteo.api.spell --name "open meteo" --no-ai
//     --collections "forecasts=/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto&forecast_days=2"
// `spell place update OpenMeteo.api.spell` looks again, and changes only this file and OpenMeteo.api.json5.
// It has no list of forecasts:  each is asked for by where it's for, `every forecast where its latitude is ... and its longitude is ...`.
// Its hours come as lists side by side, one of times and one of each measure:  each hour is read as one of each.
// Each measure is in the unit its answer names, and shows in the reader's own:  a temperature in °F in the US.

export class Forecast extends Thing {
  // - its "latitude" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1322, end: 1348 } })
  accessor latitude!: number

  // - its "longitude" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1350, end: 1377 } })
  accessor longitude!: number

  // - its "generationtime ms" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1379, end: 1414 } })
  accessor generationtimeMs!: number

  // - its "utc offset seconds" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1416, end: 1452 } })
  accessor utcOffsetSeconds!: number

  // - its "timezone" is text
  @prop({ type: "text", declaredAt: { path: "/OpenMeteo.api.spell", start: 1454, end: 1476 } })
  accessor timezone!: string

  // - its "timezone abbreviation" is text
  @prop({ type: "text", declaredAt: { path: "/OpenMeteo.api.spell", start: 1478, end: 1513 } })
  accessor timezoneAbbreviation!: string

  // - its "elevation" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1515, end: 1542 } })
  accessor elevation!: number

  // - its "hours" is a list of hours, stored as "hourly"
  @prop({ itemType: "Hour", storedAs: "hourly", init: () => new List<Hour>({ instanceType: "Hour" }), declaredAt: { path: "/OpenMeteo.api.spell", start: 1544, end: 1594 } })
  accessor hours!: List<Hour>

  drawHourTable() {
    return core.drawRead(() => this.hours, (hour: Hour) => <>
      <ui-cell data-column="Day">
        <span hidden={hour.time.getHours() === 0 ? undefined : "until-found"}>{core.dateShown(hour.time)}</span>
      </ui-cell>
      <ui-cell data-column="Hour" align="right">{hour.time.getHours()}:00</ui-cell>
      <ui-cell data-column="Temperature" align="right">
        {core.measureShown(hour.temperature, "Temperature", "celsius")}
      </ui-cell>
      <ui-cell data-column="Rain" align="right">
        {core.measureShown(hour.precipitation, "Length", "millimeter")}
      </ui-cell>
      <ui-cell data-column="Wind" align="right">
        {core.measureShown(hour.windSpeed, "Speed", "kilometerPerHour")}
      </ui-cell>
    </>, { items: () => <ui-table appearance="very-basic" padding="compact" collapsing={true} unstackable={true} part="hour_table">
      <ui-row />
    </ui-table> })
  }

  static savedIn = {
    place: "open_meteo",
    collection: "forecasts",
    times: ["created", "modified"], select: ["latitude", "longitude", "timezone", "hours"] }

  // - it lives in open meteo
  @prop({ type: "date", declaredAt: { path: "/OpenMeteo.api.spell", start: 1298, end: 1320 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in open meteo
  @prop({ type: "date", declaredAt: { path: "/OpenMeteo.api.spell", start: 1298, end: 1320 } })
  accessor modified!: any /* spell: type unknown */
}

export class Hour extends Thing {
  // - its "time" is a date
  @prop({ type: "date" })
  accessor time!: Date

  // - its "temperature" is a temperature in °C, stored as "temperature_2m"
  @prop({ type: "number", storedAs: "temperature_2m" })
  accessor temperature!: number

  // - its "precipitation" is a length in mm
  @prop({ type: "number" })
  accessor precipitation!: number

  // - its "wind speed" is a speed in km/h, stored as "wind_speed_10m"
  @prop({ type: "number", storedAs: "wind_speed_10m" })
  accessor windSpeed!: number
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
// with `<extend>`, so looking again at the server never touches a line of this.
// Open-Meteo has no list of forecasts:  each is asked for by a latitude and a longitude, so the page always says both.

@thing
export class OpenMeteoPage extends Thing {
  // - its "cities" is a list of cities
  @prop({ itemType: "City", init: () => new List<City>({ instanceType: "City" }) })
  accessor cities!: List<City>

  // - its "city" is a city
  @prop({ type: "City" })
  accessor city!: City

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
  static { this.declareProp("forecasts", { declaredAt: { path: "/OpenMeteo.spell", start: 1012, end: 1139 }, readsFrom: ["open_meteo"] }) }
  get forecasts() { return core.waitedValue(this, "forecasts", async () => {
    return await core.savedThings(Forecast, { filter: { latitude: this.city?.latitude, longitude: this.city?.longitude } })
  }, () => [this.city]) }

  /** Its one forecast:  Open-Meteo answers with one, for the nearest place it has */
  static { this.declareProp("forecast", { declaredAt: { path: "/OpenMeteo.spell", start: 1222, end: 1271 }, readsFrom: ["open_meteo"] }) }
  get forecast() {
    return core.getItemAt(this.forecasts, 0)
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-stack spacing="sm">
          <ui-header size="large">The weather, from Open-Meteo</ui-header>
          <ui-toolbar appearance="secondary" aria-label="Cities">{core.drawItems(this.cities)}</ui-toolbar>
        </ui-stack>
        {this.drawForecastTable()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://open-meteo.com/en/docs">Open-Meteo's API</ui-link>
          {", asked for as you look;  each measure in your own units."}
        </ui-text>
      </ui-stack>
    )
  }

  drawForecastTable() {
    if (this.forecast) {
      return (
        <ui-stack spacing="sm" part="forecast_table">
          <ui-text color="grey">
            {"The next two days in "}
            {core.whileWaiting(() => this.forecast.timezone)}
            , hour by hour.
          </ui-text>
          {core.whileWaiting(() => this.forecast.drawHourTable())}
        </ui-stack>
      )
    }
    core.readRider("waiting", () => <ui-loader visible={true} inline={true} text={true} part="forecast_table">Asking Open-Meteo</ui-loader>)
    core.readRider("failed", () => <ui-text part="forecast_table">Open-Meteo can't be reached just now.</ui-text>)
  }
}

core.heading("A city")
////////////
// ## A city
////////////
// Where it is on Earth:  what its forecast is asked for by.

export class City extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "latitude" is a number
  @prop({ type: "number" })
  accessor latitude!: number

  // - its "longitude" is a number
  @prop({ type: "number" })
  accessor longitude!: number

  /** The city the weather's for */
  pick() {
    publicServers.weather.city = this
  }

  @drawn draw() {
    return (
      <ui-item active={this === publicServers.weather.city} onClick={core.pressed(this, () => this.pick())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {this.name}
      </ui-item>
    )
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
// A server other people run, and what it holds.  What's drawn from it is in MetMuseum.spell.
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
  @prop({ type: "choice", storedAs: "isHighlight", declaredAt: { path: "/MetMuseum.api.spell", start: 1519, end: 1572 } })
  accessor highlight!: boolean

  // - its "accession number" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1574, end: 1604 } })
  accessor accessionNumber!: string

  // - its "accession year" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 1606, end: 1638 } })
  accessor accessionYear!: number

  // - its "public domain" is yes or no, stored as "isPublicDomain"
  @prop({ type: "choice", storedAs: "isPublicDomain", declaredAt: { path: "/MetMuseum.api.spell", start: 1640, end: 1700 } })
  accessor publicDomain!: boolean

  /** an address */
  // - its "primary image" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1702, end: 1729 } })
  accessor primaryImage!: string

  /** an address */
  // - its "primary image small" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1746, end: 1779 } })
  accessor primaryImageSmall!: string

  // - its "additional images" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/MetMuseum.api.spell", start: 1796, end: 1837 } })
  accessor additionalImages!: List<string>

  // - its "constituents" is a list of constituents
  @prop({ itemType: "Constituent", init: () => new List<Constituent>({ instanceType: "Constituent" }), declaredAt: { path: "/MetMuseum.api.spell", start: 1839, end: 1883 } })
  accessor constituents!: List<Constituent>

  // - its "department" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1885, end: 1909 } })
  accessor department!: string

  // - its "object name" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1911, end: 1936 } })
  accessor objectName!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1938, end: 1957 } })
  accessor title!: string

  // - its "culture" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1959, end: 1980 } })
  accessor culture!: string

  // - its "period" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1982, end: 2002 } })
  accessor period!: string

  // - its "dynasty" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2004, end: 2025 } })
  accessor dynasty!: string

  // - its "reign" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2027, end: 2046 } })
  accessor reign!: string

  // - its "portfolio" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2048, end: 2071 } })
  accessor portfolio!: string

  // - its "artist role" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2073, end: 2098 } })
  accessor artistRole!: string

  // - its "artist prefix" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2100, end: 2127 } })
  accessor artistPrefix!: string

  // - its "artist display name" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2129, end: 2162 } })
  accessor artistDisplayName!: string

  // - its "artist display bio" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2164, end: 2196 } })
  accessor artistDisplayBio!: string

  // - its "artist suffix" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2198, end: 2225 } })
  accessor artistSuffix!: string

  // - its "artist alpha sort" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2227, end: 2258 } })
  accessor artistAlphaSort!: string

  // - its "artist nationality" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2260, end: 2292 } })
  accessor artistNationality!: string

  // - its "artist begin date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2294, end: 2329 } })
  accessor artistBeginDate!: number

  // - its "artist end date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2331, end: 2364 } })
  accessor artistEndDate!: number

  // - its "artist gender" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2366, end: 2393 } })
  accessor artistGender!: string

  /** an address */
  // - its "artist wikidata url" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2395, end: 2428 } })
  accessor artistWikidataUrl!: string

  /** an address */
  // - its "artist ulan url" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2445, end: 2474 } })
  accessor artistUlanUrl!: string

  // - its "object date" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2491, end: 2516 } })
  accessor objectDate!: string

  // - its "object begin date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2518, end: 2553 } })
  accessor objectBeginDate!: number

  // - its "object end date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2555, end: 2588 } })
  accessor objectEndDate!: number

  // - its "medium" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2590, end: 2610 } })
  accessor medium!: string

  // - its "dimensions" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2612, end: 2636 } })
  accessor dimensions!: string

  // - its "measurements" is a list of measurements
  @prop({ itemType: "Measurement", init: () => new List<Measurement>({ instanceType: "Measurement" }), declaredAt: { path: "/MetMuseum.api.spell", start: 2638, end: 2682 } })
  accessor measurements!: List<Measurement>

  // - its "credit line" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2684, end: 2709 } })
  accessor creditLine!: string

  // - its "geography type" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2711, end: 2739 } })
  accessor geographyType!: string

  // - its "city" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2741, end: 2759 } })
  accessor city!: string

  // - its "state" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2761, end: 2780 } })
  accessor state!: string

  // - its "county" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2782, end: 2802 } })
  accessor county!: string

  // - its "country" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2804, end: 2825 } })
  accessor country!: string

  // - its "region" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2827, end: 2847 } })
  accessor region!: string

  // - its "subregion" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2849, end: 2872 } })
  accessor subregion!: string

  // - its "locale" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2874, end: 2894 } })
  accessor locale!: string

  // - its "locus" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2896, end: 2915 } })
  accessor locus!: string

  // - its "excavation" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2917, end: 2941 } })
  accessor excavation!: string

  // - its "river" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2943, end: 2962 } })
  accessor river!: string

  // - its "classification" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2964, end: 2992 } })
  accessor classification!: string

  // - its "rights and reproduction" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2994, end: 3031 } })
  accessor rightsAndReproduction!: string

  // - its "link resource" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3033, end: 3060 } })
  accessor linkResource!: string

  // - its "metadata date" is a date
  @prop({ type: "date", declaredAt: { path: "/MetMuseum.api.spell", start: 3062, end: 3091 } })
  accessor metadataDate!: Date

  // - its "repository" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3093, end: 3117 } })
  accessor repository!: string

  /** an address */
  // - its "object url" is text, stored as "objectURL"
  @prop({ type: "text", storedAs: "objectURL", declaredAt: { path: "/MetMuseum.api.spell", start: 3119, end: 3166 } })
  accessor objectUrl!: string

  // - its "tags" is a list of tags
  @prop({ itemType: "Tag", init: () => new List<Tag>({ instanceType: "Tag" }), declaredAt: { path: "/MetMuseum.api.spell", start: 3183, end: 3211 } })
  accessor tags!: List<Tag>

  /** an address */
  // - its "object wikidata url" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3213, end: 3246 } })
  accessor objectWikidataUrl!: string

  // - its "timeline work" is yes or no, stored as "isTimelineWork"
  @prop({ type: "choice", storedAs: "isTimelineWork", declaredAt: { path: "/MetMuseum.api.spell", start: 3263, end: 3323 } })
  accessor timelineWork!: boolean

  // - its "gallery number" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 3325, end: 3357 } })
  accessor galleryNumber!: number

  @drawn draw() {
    if (this.title && this.primaryImageSmall) {
      return (
        <ui-shape class="artwork" direction="over" flip-on="click" aria-label={this.title}>
          <ui-side>
            <ui-card fluid={true}>
              <ui-image src={this.primaryImageSmall} alt={this.title} />
              <ui-content>
                <ui-header>{this.title}</ui-header>
                <ui-meta>{this.artistDisplayName}</ui-meta>
              </ui-content>
            </ui-card>
          </ui-side>
          <ui-side>{this.drawAboutCard()}</ui-side>
        </ui-shape>
      )
    } else if (this.title) return <slot name="about_card">{this.drawAboutCard()}</slot>
  }

  // What the Met knows of it:  the back of a picture's card, or the whole card of one with no picture
  drawAboutCard() {
    return (
      <ui-card fluid={true} part="about_card">
        <ui-content>
          <ui-header>{this.title}</ui-header>
          <ui-meta>{this.artistDisplayName} · {this.objectDate}</ui-meta>
          <ui-description>
            <ui-text paragraph={true}>{this.medium}</ui-text>
            <ui-text paragraph={true}>{this.dimensions}</ui-text>
            <ui-text paragraph={true} color="grey">{this.department} · {this.creditLine}</ui-text>
          </ui-description>
        </ui-content>
        <ui-extra>
          <ui-link link={this.objectUrl} target="_blank">On the Met's own pages</ui-link>
        </ui-extra>
      </ui-card>
    )
  }

  static savedIn = {
    place: "met_museum",
    collection: "artworks",
    times: ["created", "modified"], select: ["primaryImageSmall", "department", "title", "artistDisplayName", "objectDate", "medium", "dimensions", "creditLine", "city", "state", "region", "objectUrl"] }

  // - it lives in met museum
  @prop({ type: "date", declaredAt: { path: "/MetMuseum.api.spell", start: 1495, end: 1517 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in met museum
  @prop({ type: "date", declaredAt: { path: "/MetMuseum.api.spell", start: 1495, end: 1517 } })
  accessor modified!: any /* spell: type unknown */
}

export class Constituent extends Thing {
  // - its "constituent id" is a number, stored as "constituentID"
  @prop({ type: "number", storedAs: "constituentID" })
  accessor constituentId!: number

  // - its "role" is text
  @prop({ type: "text" })
  accessor role!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  /** an address */
  // - its "constituent ulan url" is text
  @prop({ type: "text" })
  accessor constituentUlanUrl!: string

  /** an address */
  // - its "constituent wikidata url" is text
  @prop({ type: "text" })
  accessor constituentWikidataUrl!: string

  // - its "gender" is text
  @prop({ type: "text" })
  accessor gender!: string
}

export class Measurement extends Thing {
  // - its "element name" is text
  @prop({ type: "text" })
  accessor elementName!: string

  // - its "element description" is text
  @prop({ type: "text" })
  accessor elementDescription!: string

  // - its "element measurements" is an element measurement
  @prop({ type: "ElementMeasurement" })
  accessor elementMeasurements!: ElementMeasurement
}

export class ElementMeasurement extends Thing {
  // - its "diameter" is a number
  @prop({ type: "number" })
  accessor diameter!: number

  // - its "height" is a number
  @prop({ type: "number" })
  accessor height!: number

  // - its "width" is a number
  @prop({ type: "number" })
  accessor width!: number

  // - its "depth" is a number
  @prop({ type: "number" })
  accessor depth!: number
}

export class Tag extends Thing {
  // - its "term" is text
  @prop({ type: "text" })
  accessor term!: string

  /** an address */
  // - its "aat url" is text
  @prop({ type: "text" })
  accessor aatUrl!: string

  /** an address */
  // - its "wikidata url" is text
  @prop({ type: "text" })
  accessor wikidataUrl!: string
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
// with `<extend>`, so looking again at the server never touches a line of this.
// Its search answers only ids:  each artwork is read from its own address as it's drawn, a page at a time, and no others.

@thing
export class MetMuseumPage extends Thing {
  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  create() {
    this.search = "sunflowers"
  }

  /** What the Met finds for the search, looking at all of each artwork:  ids only, each read as it's drawn */
  static { this.declareProp("found", { declaredAt: { path: "/MetMuseum.spell", start: 627, end: 675 }, readsFrom: ["met_museum"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return await core.savedThings(Artwork, { search: { "*": this.search } })
  }, () => [this.search]) }

  async tryWords(words: string) {
    this.search = words
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-form class="find" value={this}>
          <ui-stack spacing="sm">
            <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
              <ui-header size="large">Artworks, from the Met</ui-header>
              <ui-search name="search" parameter="art" icon="search" placeholder="A title, an artist, a subject" aria-label="Search the Met" />
            </ui-stack>
            <ui-toolbar appearance="secondary" size="small" aria-label="Try a search">
              <ui-text slot="title" size="small" color="grey">Try</ui-text>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("sunflowers"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Sunflowers
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("van gogh"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Van Gogh
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("armor"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Armor
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("egypt"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Egypt
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("cats"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Cats
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("hokusai"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Hokusai
              </ui-item>
            </ui-toolbar>
          </ui-stack>
        </ui-form>
        {core.drawRead(() => this.found, (artwork: Artwork) => core.drawThing(artwork), {
          waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the Met"}</ui-loader>,
          none: () => <ui-text>{"The Met has nothing for that."}</ui-text>,
          failedSay: () => "The Met can't be reached just now.",
          paging: () => "pages",
          items: () => <ui-cards layout="mosaic" columns="4" doubling={true} />
        })}
        <ui-text class="credits" size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://metmuseum.github.io">the Met Museum's API</ui-link>
          {", each artwork asked for as it's shown.  Press a picture to turn it over."}
        </ui-text>
      </ui-stack>
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
// A server other people run, and what it holds.  What's drawn from it is in RestCountries.spell.
// `rest countries` is what this wrote, from looking at the server:
//   spell place ingest https://cdn.jsdelivr.net/gh/mledoze/countries@5.1.0 --into RestCountries.api.spell
//     --name "rest countries" --no-ai --collections "countries=/countries.json"
// `spell place update RestCountries.api.spell` looks again, and changes only this file and RestCountries.api.json5.
// It's the data restcountries.com serves, from the repository that keeps it:  every country in one answer, with no paging.
// Its money, its languages and its names come keyed by a code, `"EUR": { ... }`, `"fra": "French"`:
// each is a list of things, each with its code, `the first translation in its translations where its code is "fra"`.

export class Country extends Thing {
  // - its "name" is a name
  @prop({ type: "Name", declaredAt: { path: "/RestCountries.api.spell", start: 1132, end: 1152 } })
  accessor name!: Name

  // - its "tld" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1154, end: 1181 } })
  accessor tld!: List<string>

  // - its "cca2" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1183, end: 1201 } })
  accessor cca2!: string

  // - its "ccn3" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1203, end: 1221 } })
  accessor ccn3!: string

  // - its "cca3" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1223, end: 1241 } })
  accessor cca3!: string

  // - its "cioc" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1243, end: 1261 } })
  accessor cioc!: string

  // - its "independent" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1263, end: 1293 } })
  accessor independent!: boolean

  // - its "status" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1295, end: 1315 } })
  accessor status!: string

  // - its "un member" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1317, end: 1345 } })
  accessor unMember!: boolean

  // - its "un regional group" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1347, end: 1378 } })
  accessor unRegionalGroup!: string

  // - its "currencies" is a list of currencies
  @prop({ itemType: "Currency", init: () => new List<Currency>({ instanceType: "Currency" }), declaredAt: { path: "/RestCountries.api.spell", start: 1380, end: 1420 } })
  accessor currencies!: List<Currency>

  // - its "idd" is an idd
  @prop({ type: "Idd", declaredAt: { path: "/RestCountries.api.spell", start: 1422, end: 1441 } })
  accessor idd!: Idd

  // - its "capital" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1443, end: 1474 } })
  accessor capital!: List<string>

  // - its "alt spellings" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1476, end: 1513 } })
  accessor altSpellings!: List<string>

  // - its "region" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1515, end: 1535 } })
  accessor region!: string

  // - its "subregion" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1537, end: 1560 } })
  accessor subregion!: string

  // - its "languages" is a list of languages
  @prop({ itemType: "Language", init: () => new List<Language>({ instanceType: "Language" }), declaredAt: { path: "/RestCountries.api.spell", start: 1562, end: 1600 } })
  accessor languages!: List<Language>

  // - its "translations" is a list of translations
  @prop({ itemType: "Translation", init: () => new List<Translation>({ instanceType: "Translation" }), declaredAt: { path: "/RestCountries.api.spell", start: 1602, end: 1646 } })
  accessor translations!: List<Translation>

  // - its "latlng" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/RestCountries.api.spell", start: 1648, end: 1681 } })
  accessor latlng!: List<number>

  // - its "landlocked" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1683, end: 1712 } })
  accessor landlocked!: boolean

  // - its "borders" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1714, end: 1745 } })
  accessor borders!: List<string>

  // - its "area" is a number
  @prop({ type: "number", declaredAt: { path: "/RestCountries.api.spell", start: 1747, end: 1769 } })
  accessor area!: number

  // - its "flag" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1771, end: 1789 } })
  accessor flag!: string

  // - its "demonyms" is a demonym
  @prop({ type: "Demonym", declaredAt: { path: "/RestCountries.api.spell", start: 1791, end: 1818 } })
  accessor demonyms!: Demonym

  static savedIn = {
    place: "rest_countries",
    collection: "countries",
    times: ["created", "modified"], select: ["name", "currencies", "capital", "region", "languages", "translations", "flag"] }

  // - it lives in rest countries
  @prop({ type: "date", declaredAt: { path: "/RestCountries.api.spell", start: 1104, end: 1130 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in rest countries
  @prop({ type: "date", declaredAt: { path: "/RestCountries.api.spell", start: 1104, end: 1130 } })
  accessor modified!: any /* spell: type unknown */
}

export class Name extends Thing {
  // - its "common" is text
  @prop({ type: "text" })
  accessor common!: string

  // - its "official" is text
  @prop({ type: "text" })
  accessor official!: string

  // - its "native" is a list of natives
  @prop({ itemType: "Native", init: () => new List<Native>({ instanceType: "Native" }) })
  accessor native!: List<Native>
}

export class Native extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "official" is text
  @prop({ type: "text" })
  accessor official!: string

  // - its "common" is text
  @prop({ type: "text" })
  accessor common!: string
}

export class Currency extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "symbol" is text
  @prop({ type: "text" })
  accessor symbol!: string

  @drawn draw() {
    return (
      <ui-text>
        {this.name}
        {" ("}
        {this.symbol}
        {") "}
        <ui-text color="grey">{this.code}</ui-text>
      </ui-text>
    )
  }
}

export class Idd extends Thing {
  // - its "root" is text
  @prop({ type: "text" })
  accessor root!: string

  // - its "suffixes" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor suffixes!: List<string>
}

export class Language extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  @drawn draw() {
    return <ui-text>{this.name}</ui-text>
  }
}

export class Translation extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "official" is text
  @prop({ type: "text" })
  accessor official!: string

  // - its "common" is text
  @prop({ type: "text" })
  accessor common!: string
}

export class Demonym extends Thing {
  // - its "eng" is an eng
  @prop({ type: "Eng" })
  accessor eng!: Eng

  // - its "fra" is a fra
  @prop({ type: "Fra" })
  accessor fra!: Fra
}

export class Eng extends Thing {
  // - its "f" is text
  @prop({ type: "text" })
  accessor f!: string

  // - its "m" is text
  @prop({ type: "text" })
  accessor m!: string
}

export class Fra extends Thing {
  // - its "f" is text
  @prop({ type: "text" })
  accessor f!: string

  // - its "m" is text
  @prop({ type: "text" })
  accessor m!: string
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
// with `<extend>`, so looking again at the server never touches a line of this.
// All 250 come in one request, with no paging:  picking a region only looks through them again.

@thing
export class RestCountriesPage extends Thing {
  // - its "region" is text
  @prop({ type: "text" })
  accessor region!: string

  /** its language's code, as REST Countries keys its names:  `fra`, `spa`, `deu`, `jpn` */
  // - its "language" is text
  @prop({ type: "text" })
  accessor language!: string

  create() {
    this.region = "Europe"
    this.language = "fra"
  }

  /** The region's, looked through here:  REST Countries sends every one at once */
  static { this.declareProp("countries", { declaredAt: { path: "/RestCountries.spell", start: 776, end: 868 }, readsFrom: ["rest_countries"] }) }
  get countries() { return core.waitedValue(this, "countries", async () => {
    return core.sortedBy(await core.savedThings(Country, { filter: { region: this.region } }), (item: Country) => item.name?.common)
  }, () => [this.region]) }

  pickRegionRegion(region: string) {
    this.region = region
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-stack spacing="sm">
          <ui-form value={this}>
            <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
              <ui-header size="large">The world's countries, from REST Countries</ui-header>
              <ui-select name="language" aria-label="Names in">
                <ui-item value="fra">Français</ui-item>
                <ui-item value="spa">Español</ui-item>
                <ui-item value="deu">Deutsch</ui-item>
                <ui-item value="jpn">日本語</ui-item>
              </ui-select>
            </ui-stack>
          </ui-form>
          <ui-toolbar appearance="secondary" aria-label="Regions">
            <ui-item active={this.region === "Africa"} onClick={core.pressed(this, () => this.pickRegionRegion("Africa"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Africa
            </ui-item>
            <ui-item active={this.region === "Americas"} onClick={core.pressed(this, () => this.pickRegionRegion("Americas"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              The Americas
            </ui-item>
            <ui-item active={this.region === "Asia"} onClick={core.pressed(this, () => this.pickRegionRegion("Asia"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Asia
            </ui-item>
            <ui-item active={this.region === "Europe"} onClick={core.pressed(this, () => this.pickRegionRegion("Europe"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Europe
            </ui-item>
            <ui-item active={this.region === "Oceania"} onClick={core.pressed(this, () => this.pickRegionRegion("Oceania"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Oceania
            </ui-item>
            <ui-item active={this.region === "Antarctic"} onClick={core.pressed(this, () => this.pickRegionRegion("Antarctic"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              The Antarctic
            </ui-item>
          </ui-toolbar>
        </ui-stack>
        {this.drawCountriesTable()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://github.com/mledoze/countries">the data REST Countries serves</ui-link>
          , every country in one request.
        </ui-text>
      </ui-stack>
    )
  }

  // A row a country:  its flag and name, its name in the language picked, its capital, its money and its languages;  each of those keyed by a code, `EUR`, `fra`, a list of things with that code
  drawCountriesTable() {
    return core.drawRead(() => this.countries, (country: Country) => <>
      <ui-cell data-column="Flag" align="center">
        <ui-text size="big">{country.flag}</ui-text>
      </ui-cell>
      <ui-cell data-column="Country" header={true}>{country.name?.common}</ui-cell>
      <ui-cell data-column="Its name there">
        {core.getItemAt(core.filter(country.translations, (translation: Translation) => translation.code === publicServers.atlas.language), 0)?.common}
      </ui-cell>
      <ui-cell data-column="Capital">{core.getItemAt(country.capital, 0)}</ui-cell>
      <ui-cell data-column="Money">
        <ui-stack spacing="none">{core.drawItems(country.currencies)}</ui-stack>
      </ui-cell>
      <ui-cell data-column="Languages">
        <ui-stack direction="horizontal" wrap={true} spacing="xs">{core.drawItems(country.languages)}</ui-stack>
      </ui-cell>
    </>, {
      waiting: () => <ui-loader visible={true} inline={true} text={true} part="countries_table">{"Asking REST Countries"}</ui-loader>,
      failedSay: () => "REST Countries can't be reached just now.",
      items: () => <ui-table appearance="very-basic" padding="compact" vertical-align="top" part="countries_table">
        <ui-row />
      </ui-table>
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

@thing
export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  @prop({ type: "text" })
  accessor tab!: string

  // "github" is a new github page
  @prop({ init: () => new GithubPage(), early: true })
  accessor github!: GithubPage

  // "library" is a new open library page
  @prop({ init: () => new OpenLibraryPage(), early: true })
  accessor library!: OpenLibraryPage

  // "weather" is a new open meteo page
  @prop({ init: () => new OpenMeteoPage(), early: true })
  accessor weather!: OpenMeteoPage

  // "museum" is a new met museum page
  @prop({ init: () => new MetMuseumPage(), early: true })
  accessor museum!: MetMuseumPage

  // "atlas" is a new rest countries page
  @prop({ init: () => new RestCountriesPage(), early: true })
  accessor atlas!: RestCountriesPage

  create() {
    this.tab = "github"
  }

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack spacing="lg">
          <ui-form value={this}>
            <ui-tabs name="tab" parameter="server" appearance="secondary pointing basic" aria-label="Servers">
              <ui-tab label="GitHub" value="github" />
              <ui-tab label="Open Library" value="library" />
              <ui-tab label="JSONPlaceholder" value="jsonplaceholder" />
              <ui-tab label="Open-Meteo" value="weather" />
              <ui-tab label="The Met" value="met" />
              <ui-tab label="REST Countries" value="countries" />
            </ui-tabs>
          </ui-form>
          {this.drawServer()}
        </ui-stack>
      </ui-container>
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

/**
 * `<test-project-app>`:  a public server, drawn in its own element, e.g. by `draw the public server`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its public server's properties;  its methods call its public server's.
 * - What every view's element does, e.g. drawing its public server, is `SpellElement`'s.
 */
export class PublicServerElement extends SpellElement<PublicServer> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "public server", [
    { name: "tab", kind: "string", description: "Its tab." },
    { name: "github", kind: "json", description: "Its github." },
    { name: "library", kind: "json", description: "Its library." },
    { name: "weather", kind: "json", description: "Its weather." },
    { name: "museum", kind: "json", description: "Its museum." },
    { name: "atlas", kind: "json", description: "Its atlas." }
  ])

  create() {
    return this.currentThing?.create()
  }

  drawServer() {
    return this.currentThing?.drawServer()
  }
}
core.useElement(PublicServer, PublicServerElement)
export const publicServers = new PublicServer()
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
