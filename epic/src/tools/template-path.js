/**
 * `epic pages template [<name>]`:  where the page templates are, for the skills and anyone writing a page by hand
 * (epic `epic-eject` T11:  every template is the engine's, spell-epic's `templates/`, not the repo's).
 * - no `<name>`:  the engine's templates folder (`TEMPLATES`), then the repo's own (`repoTemplates`), if it has one
 * - `<name>`:  that template's file (`templateFile()`), the repo's own first:  `durable`, `review.html`,
 *   `epics/plan-doc.md` (the epic-page writing rules), `templates/goals/index.html`
 *   - none:  says so, exit 1
 */
import { REPO_TEMPLATES, TEMPLATES, templateFile } from "./pages.js"

const [name] = process.argv.slice(2)
if (!name) {
  console.log(TEMPLATES)
  if (REPO_TEMPLATES) console.log(REPO_TEMPLATES)
} else {
  const file = templateFile(name)
  if (!file) {
    console.error(
      `epic pages template:  no template ${name} (in ${[REPO_TEMPLATES, TEMPLATES].filter(Boolean).join(" or ")})`
    )
    process.exit(1)
  }
  console.log(file)
}
