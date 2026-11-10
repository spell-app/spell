import { chmodSync, mkdirSync, mkdtempSync, realpathSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { CodeHost } from "spell/epic/config/CodeHost"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { GitHub } from "spell/epic/config/GitHub"
import { GitLab } from "spell/epic/config/GitLab"

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "code-host-")))
const GLAB = join(TEMP, "glab")
const LOG = join(TEMP, "glab.log")
const before = process.env.SPELL_EPIC_GLAB
afterAll(() => {
  if (before === undefined) delete process.env.SPELL_EPIC_GLAB
  else process.env.SPELL_EPIC_GLAB = before
  rmSync(TEMP, { recursive: true, force: true })
})

/** A stand-in `glab`:  logs its arguments, answers from a `case` of `"$*"`. */
function standIn(cases: string): void {
  writeFileSync(
    GLAB,
    `#!/bin/sh\necho "$*" >> "${LOG}"\ncase "$*" in\n${cases}\n  *) echo "stub glab:  $*" >&2;  exit 1 ;;\nesac\n`
  )
  chmodSync(GLAB, 0o755)
  process.env.SPELL_EPIC_GLAB = GLAB
}

const lab = GitLab.ofAddress("git@git.acme.com:team/sub/app.git")

beforeEach(() => rmSync(LOG, { force: true }))

describe("CodeHost:  the one chooser", () => {
  test("an address:  gitlab in its host, github.com, else GitHub by default", () => {
    expect(CodeHost.kindOfAddress("git@gitlab.com:a/b.git")).toBe("gitlab")
    expect(CodeHost.kindOfAddress("https://gitlab.acme.com/a/b/c.git")).toBe("gitlab")
    expect(CodeHost.kindOfAddress("git@github.com:a/b.git")).toBe("github")
    expect(CodeHost.kindOfAddress("git@git.acme.com:a/b.git")).toBe("github")
    expect(CodeHost.kindOfAddress(undefined)).toBe("github")
    expect(CodeHost.kindOfAddress("/tmp/gitlab/repo.git")).toBe("github")
    // the host, never the path
    expect(CodeHost.kindOfAddress("git@github.com:me/gitlab-tools.git")).toBe("github")
  })

  test("an unknown address:  a host that doesn't say;  no host, nothing to ask", () => {
    expect(CodeHost.isUnknownAddress("git@git.acme.com:a/b.git")).toBe(true)
    expect(CodeHost.isUnknownAddress("git@gitlab.com:a/b.git")).toBe(false)
    expect(CodeHost.isUnknownAddress("https://github.com/a/b")).toBe(false)
    expect(CodeHost.isUnknownAddress("/tmp/x/repo.git")).toBe(false)
    expect(CodeHost.isUnknownAddress(undefined)).toBe(false)
  })

  test("of():  GitHub's statics, or a GitLab with its host from origin;  words from one place", () => {
    const main = join(TEMP, "repo")
    mkdirSync(join(main, ".git"), { recursive: true })
    writeFileSync(
      join(main, ".git", "config"),
      '[core]\n  bare = false\n[remote "origin"]\n  url = git@git.acme.com:team/sub/app.git\n  fetch = +refs/heads/*:refs/remotes/origin/*\n'
    )
    expect(CodeHost.of({ main, codeHost: "github" })).toBe(GitHub)
    const host = CodeHost.of({ main, codeHost: "gitlab" }) as GitLab
    expect(host.host).toBe("git.acme.com")
    expect(host.repoPath).toBe("team/sub/app")
    expect(host.words.pullRequest).toBe("merge request")
    expect(GitHub.words.pullRequest).toBe("pull request")
    expect(host.words.install.join("\n")).toMatch(/glab auth login --hostname git\.acme\.com/)
    expect(host.words.install.join("\n")).toMatch(/gitlab\.com\/gitlab-org\/cli/)
  })

  test("EpicConfig:  a key left out comes from origin;  a given one wins;  a bad one throws", () => {
    const main = join(TEMP, "repo")
    expect(EpicConfig.settingsFrom("{}", "x.json5", main).codeHost).toBe("github")
    mkdirSync(join(main, ".git"), { recursive: true })
    writeFileSync(join(main, ".git", "config"), '[remote "origin"]\n  url = https://gitlab.acme.com/team/app.git\n')
    expect(EpicConfig.settingsFrom("{}", "x.json5", main).codeHost).toBe("gitlab")
    expect(EpicConfig.settingsFrom('{ "codeHost": "github" }', "x.json5", main).codeHost).toBe("github")
    expect(() => EpicConfig.settingsFrom('{ "codeHost": "bitbucket" }', "x.json5", main)).toThrow(
      /must be "github" or "gitlab"/
    )
  })
})

describe("GitLab:  addresses", () => {
  test.each([
    ["git@gitlab.com:group/p.git", "gitlab.com", "group/p", true],
    ["https://gitlab.com/group/p.git", "gitlab.com", "group/p", false],
    ["git@git.acme.com:group/sub/deep/p.git", "git.acme.com", "group/sub/deep/p", true],
    ["https://git.acme.com/group/sub/p", "git.acme.com", "group/sub/p", false],
    ["https://git.acme.com:8443/group/p.git", "git.acme.com:8443", "group/p", false],
    ["ssh://git@git.acme.com:2222/group/sub/p.git", "git.acme.com", "group/sub/p", true],
    ["https://oauth2:token@gitlab.com/group/p.git/", "gitlab.com", "group/p", false]
  ])("%s", (address, host, path, ssh) => {
    expect(GitLab.partsOf(address)).toEqual({ host, path, ssh })
  })

  test("a local path, a file address, nothing:  no host", () => {
    expect(GitLab.partsOf("/tmp/x/repo.git")).toBeUndefined()
    expect(GitLab.partsOf("file:///tmp/repo.git")).toBeUndefined()
    expect(GitLab.partsOf(undefined)).toBeUndefined()
  })

  test("ownerIn, repoIn, commitBase", () => {
    expect(lab.ownerIn("https://gitlab.com/group/sub/p")).toBe("group/sub")
    expect(lab.ownerIn("git@gitlab.com:group/p.git")).toBe("group")
    expect(lab.repoIn("git@gitlab.com:group/sub/p.git")).toBe("group/sub/p")
    expect(lab.ownerIn("/local/path")).toBeUndefined()
    expect(lab.commitBase("git@git.acme.com:team/app.git")).toBe("https://git.acme.com/team/app/-")
  })
})

describe("GitLab:  talking to glab, self-hosted", () => {
  test("status:  missing, logged out, ready, naming the host", () => {
    standIn(`  version) echo "glab 1.50" ;;
  "auth status --hostname git.acme.com") exit 1 ;;`)
    expect(lab.status()).toBe("logged-out")
    standIn(`  version) echo "glab 1.50" ;;
  "auth status --hostname git.acme.com") exit 0 ;;`)
    expect(lab.status()).toBe("ready")
    process.env.SPELL_EPIC_GLAB = join(TEMP, "no-such-glab")
    expect(lab.status()).toBe("missing")
  })

  test("login:  glab api user;  every API call names the host", () => {
    standIn(`  "api --hostname git.acme.com user") echo '{"id":7,"username":"ana"}' ;;`)
    expect(lab.login()).toBe("ana")
  })

  test("isOrganization:  groups/<path>, its slashes encoded", () => {
    standIn(`  "api --hostname git.acme.com groups/team%2Fsub") echo '{"id":42}' ;;
  "api --hostname git.acme.com groups/ana") echo "404" >&2;  exit 1 ;;`)
    expect(lab.isOrganization("team/sub")).toBe(true)
    expect(lab.isOrganization("ana")).toBe(false)
  })

  const RULES = "projects/team%2Fsub%2Fapp/protected_branches?per_page=100"
  const USER = `"api --hostname git.acme.com user") echo '{"id":7,"username":"ana"}' ;;`
  const PROJECT = (level: number) =>
    `"api --hostname git.acme.com projects/team%2Fsub%2Fapp") echo '{"permissions":{"project_access":{"access_level":${level}}}}' ;;`

  test("requiresPullRequest:  nobody may push (0)", () => {
    standIn(`  "api --hostname git.acme.com ${RULES}") echo '[{"name":"main","push_access_levels":[{"access_level":0}]}]' ;;
  ${USER}
  ${PROJECT(40)}`)
    expect(lab.requiresPullRequest("team/sub/app", "main")).toBe(true)
    expect(lab.requiresPullRequest("team/sub/app", "other")).toBe(false)
  })

  test("requiresPullRequest:  a level above the caller's, or a wildcard rule, or one they reach", () => {
    standIn(`  "api --hostname git.acme.com ${RULES}") echo '[{"name":"m*","push_access_levels":[{"access_level":40}]}]' ;;
  ${USER}
  ${PROJECT(30)}`)
    expect(lab.requiresPullRequest("team/sub/app", "main")).toBe(true)
    standIn(`  "api --hostname git.acme.com ${RULES}") echo '[{"name":"main","push_access_levels":[{"access_level":40}]}]' ;;
  ${USER}
  ${PROJECT(40)}`)
    expect(lab.requiresPullRequest("team/sub/app", "main")).toBe(false)
  })

  test("requiresPullRequest:  a user's own grant reaches;  a failing read is false, never a throw", () => {
    standIn(`  "api --hostname git.acme.com ${RULES}") echo '[{"name":"main","push_access_levels":[{"access_level":null,"user_id":7}]}]' ;;
  ${USER}
  ${PROJECT(30)}`)
    expect(lab.requiresPullRequest("team/sub/app", "main")).toBe(false)
    standIn(`  "api --hostname git.acme.com ${RULES}") exit 1 ;;`)
    expect(lab.requiresPullRequest("team/sub/app", "main")).toBe(false)
  })

  test("merged requests and open ones:  through the API, keyed by branch and base", () => {
    standIn(`  *state=merged*source_branch=feat*target_branch=main*) echo '[{"iid":8,"web_url":"https://git.acme.com/team/sub/app/-/merge_requests/8","sha":"abc"}]' ;;
  *state=opened*) echo '[]' ;;`)
    expect(lab.mergedPullRequests("feat", "main", TEMP)).toEqual([
      { number: 8, url: "https://git.acme.com/team/sub/app/-/merge_requests/8", head: "abc" }
    ])
    expect(lab.openPullRequestOf("feat", "main", TEMP)).toBeUndefined()
  })

  test("openPullRequest:  glab mr create, never asking, with its address read back", () => {
    standIn(`  *state=opened*) echo '[]' ;;
  "mr create "*) echo "!12 Title (feat)"; echo " https://git.acme.com/team/sub/app/-/merge_requests/12" ;;`)
    const url = lab.openPullRequest({ branch: "feat", base: "main", title: "T", body: "B", cwd: TEMP })
    expect(url).toBe("https://git.acme.com/team/sub/app/-/merge_requests/12")
    expect(readFileSync(LOG, "utf8")).toMatch(
      /mr create --source-branch feat --target-branch main --title T --description B --yes --repo https:\/\/git\.acme\.com\/team\/sub\/app/
    )
  })

  test("createRepo:  under a group by its id;  a person's own namespace has none;  glab's words on failure", () => {
    standIn(`  "api --hostname git.acme.com groups/team%2Fsub") echo '{"id":42}' ;;
  ${USER}
  "api --hostname git.acme.com --method POST projects "*) ;;`)
    lab.createRepo("team/sub/app.epics")
    expect(readFileSync(LOG, "utf8")).toMatch(
      /--raw-field name=app\.epics --raw-field path=app\.epics --raw-field visibility=private .*namespace_id=42/
    )
    rmSync(LOG, { force: true })
    lab.createRepo("ana/app.epics")
    expect(readFileSync(LOG, "utf8")).not.toMatch(/namespace_id/)
    standIn(`  ${USER}
  "api --hostname git.acme.com --method POST projects "*) echo "name taken" >&2;  exit 1 ;;`)
    expect(() => lab.createRepo("ana/app.epics")).toThrow(/name taken/)
  })

  test("addressOf:  SSH when the repo is, HTTPS else", () => {
    const answer = `'{"ssh_url_to_repo":"git@git.acme.com:team/a.git","http_url_to_repo":"https://git.acme.com/team/a.git"}'`
    standIn(`  *projects/team%2Fa) echo ${answer} ;;`)
    expect(lab.addressOf("team/a")).toBe("git@git.acme.com:team/a.git")
    const web = GitLab.ofAddress("https://git.acme.com/team/app.git")
    expect(web.addressOf("team/a")).toBe("https://git.acme.com/team/a.git")
  })

  test("letTeamPush:  removes the rule;  nothing protected is done;  a refusal is one line, no throw", () => {
    const LIST = "projects/team%2Fa/protected_branches?per_page=100"
    standIn(`  "api --hostname git.acme.com ${LIST}") echo '[{"name":"main"}]' ;;
  "api --hostname git.acme.com --method DELETE projects/team%2Fa/protected_branches/main") ;;`)
    expect(lab.letTeamPush("team/a", "main")).toBeUndefined()
    expect(readFileSync(LOG, "utf8")).toMatch(/--method DELETE/)
    standIn(`  "api --hostname git.acme.com ${LIST}") echo '[]' ;;`)
    expect(lab.letTeamPush("team/a", "main")).toBeUndefined()
    standIn(`  "api --hostname git.acme.com ${LIST}") echo '[{"name":"main"}]' ;;
  "api --hostname git.acme.com --method DELETE"*) echo "403 Forbidden" >&2;  exit 1 ;;`)
    expect(lab.letTeamPush("team/a", "main")).toMatch(
      /couldn't unprotect main \(403 Forbidden\).*Settings › Repository › Protected branches/
    )
    standIn(`  "api --hostname git.acme.com ${LIST}") exit 1 ;;`)
    expect(lab.letTeamPush("team/a", "main")).toMatch(/couldn't check/)
  })
})

////////////////
// ## The first push, refused;  who can read a repo (epic-engine P69)
////////////////

/** GitLab's words for a refused first push, as git printed them from the jarvis run (epic `epic-engine` P69). */
const REFUSED = `remote: GitLab:
remote: You cannot push the initial commit because the default branch is
remote: protected and your role does not allow it.
remote:
remote: To resolve this, either:
remote: - Ask a Maintainer to push the initial commit.
remote: - Contact an Owner or administrator for help.
remote:
remote: Find a Maintainer, Owner, or administrator at:
remote:
remote:   https://git.acme.com/team/sub/app.epics/-/project_members
remote:
To git.acme.com:team/sub/app.epics.git
 ! [remote rejected] HEAD -> main (pre-receive hook declined)
error: failed to push some refs to 'git.acme.com:team/sub/app.epics.git'`

describe("the first push, refused (epic-engine P69)", () => {
  test("GitLab's words, broken across remote: lines, are known;  any other failure isn't", () => {
    expect(GitLab.refusesFirstPush(REFUSED)).toBe(true)
    expect(CodeHost.refusesFirstPush(REFUSED)).toBe(true)
    expect(GitLab.refusesFirstPush("! [rejected] main -> main (fetch first)")).toBe(false)
    expect(GitLab.refusesFirstPush(undefined)).toBe(false)
  })

  test("what a Maintainer runs, filled in for the repo:  clone, an empty commit, push, the protection lifted", () => {
    const address = "git@git.acme.com:team/sub/app.epics.git"
    expect(lab.firstPushRefusal(REFUSED, { fullName: "team/sub/app.epics", address, branch: "main" })).toEqual({
      membersPage: "https://git.acme.com/team/sub/app.epics/-/project_members",
      branch: "main",
      commands: [
        `git clone ${address}`,
        "cd app.epics",
        'git commit --allow-empty -m "First commit of the epic repo"',
        "git push -u origin HEAD:main",
        "glab api --hostname git.acme.com --method DELETE projects/team%2Fsub%2Fapp.epics/protected_branches/main"
      ]
    })
    expect(lab.firstPushRefusal("network down", { fullName: "t/a", address, branch: "main" })).toBeUndefined()
    expect(GitHub.firstPushRefusal()).toBeUndefined()
  })

  test("who can read a repo:  two lines per host, naming its server;  GitLab's private one names the group", () => {
    const gitlab = GitLab.wordsOn("gitlab.psiquantum.com").canRead
    expect(Object.keys(gitlab)).toEqual(["private", "public"])
    expect(gitlab.private).toBe(
      "only people added to the project, and members of its group, can read it;  roles control access"
    )
    expect(gitlab.public).toBe(
      "anyone who can reach gitlab.psiquantum.com can read every epic page, guide and comment, without signing in;  " +
        "roles only control who can write"
    )
    expect(GitLab.wordsOn().canRead.public).toMatch(/^anyone who can reach gitlab\.com /)
    expect(GitHub.words.canRead.private).toBe("only people added to the repo can read it;  roles control access")
    expect(GitHub.words.canRead.public).toMatch(/^anyone who can reach github\.com /)
    expect(GitHub.words.server).toBe("github.com")
  })
})
