import { untrack } from "solid-js"
import { render } from "@solidjs/web"

import { UI as SpellUI } from "spell/ui"
import type { V } from "spell/ui/api"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { uiReady } from "spell/app/app/solid/loadUI"

/****************
 * ### `<ProjectSettings>`
 * A project's settings, in a dialog.
 * - It's a `<ui-property-editor>` on `projectSettingsSchema()` (epic `property-editor` P5, its first real use).
 * - Two to a row:  title and version, then where lists start and the other languages.
 * - In the page's language:  its title, labels and tips are `appTexts`'.
 * - What it edits:  the project file's `title`, `version`, `targets` and `listsStartAt`,
 *   a copy of what the project's index says (`settingsOf()`).
 * - What it shows, read only, under them:  the Spell it's written for, "Written for Spell 0.9" (`writtenFor()`;
 *   epic `language` P68), which `spell upgrade` and the editor's Upgrade write, never a person.
 * - `apply="on save"`:  the editor holds every edit until Save, which validates first.
 *   - Save:  the project's group writes them into the project file (`SPACES.SpellProjectRoot.saveSettings()`),
 *     and the dialog closes.
 *   - A server error shows, and the dialog stays.
 *   - Cancel, or Escape:  the dialog closes, nothing written.
 * - Show it with `openProjectSettings()`, which mounts it and cleans up after.
 *   `editor.showProjectSettings()` calls it.
 ****************/
export function ProjectSettings(props: ProjectSettingsProps) {
  let modal: HTMLElement | undefined
  const settings = settingsOf(props.project)
  // read once, as it opens:  a new schema would start the editor afresh
  const schema = untrack(projectSettingsSchema)
  return (
    <ui-modal
      class="ProjectSettings"
      size="tiny"
      heading={appTexts.text("projectSettingsHeading")}
      closedby="closerequest"
      closable=""
      aria-label={appTexts.text("projectSettings", { title: props.project.title })}
      visible=""
      ref={(element: HTMLElement) => {
        modal = element
        modal.addEventListener("ui-closed", () => props.onDone(), { once: true })
      }}
    >
      <ui-content>
        <ui-property-editor
          apply="on save"
          columns="2"
          schema={schema}
          value={settings}
          ref={(editor: HTMLElement) => {
            editor.addEventListener("ui-applied", () => void save())
            editor.addEventListener("ui-cancelled", () => hide())
          }}
        >
          <ui-property name="title" width="1/2"></ui-property>
          <ui-property name="version" width="1/2" apply="on leave"></ui-property>
          <ui-property name="listsStartAt" width="1/2" as="buttons"></ui-property>
          <ui-property name="targets" width="1/2" as={CHOICES}></ui-property>
        </ui-property-editor>
        {/* the Spell it's written for:  read only, as no person edits it (epic `language` P68) */}
        <ui-text class="ProjectSettingsSpell" paragraph="" size="small" color="grey">
          {writtenFor(props.project)}
        </ui-text>
      </ui-content>
    </ui-modal>
  )

  /** Save:  write the settings into the project file, then close;  a server error shows, and the dialog stays. */
  async function save() {
    try {
      await props.root.saveSettings(props.project, settings)
      hide()
    } catch (error) {
      props.onError(error)
    }
  }

  /** Close the dialog, by setting its `visible` false:  its `ui-closed` event then calls `onDone()`. */
  function hide() {
    if (modal) (modal as HTMLElement & { visible: boolean }).visible = false
  }
}

/** Props for `<ProjectSettings>`. */
export type ProjectSettingsProps = {
  /** The project whose settings it edits. */
  project: SP.SpellProject
  /** The project's group (`SpellProjectRoot`), which saves its settings. */
  root: SPACES.SpellProjectRoot
  /** Called once the dialog has closed. */
  onDone: () => void
  /** Called with a server error saving them. */
  onError: (error: unknown) => void
}

/**
 * Show a `<ProjectSettings>` for `project` in `root`;  resolves once it has closed.
 * - SIDE EFFECT:  a `<div class="ProjectSettingsRoot">` in `<body>` holding the dialog, until it has closed.
 * - Waits for `uiReady`:  `<ui-modal>` and the editor must be defined before it opens.
 */
export async function openProjectSettings(
  project: SP.SpellProject,
  root: SPACES.SpellProjectRoot,
  onError: (error: unknown) => void
): Promise<void> {
  await uiReady
  SpellUI.propertyControls.add(CHOICES, {
    tag: "ui-dropdown",
    attributes: { multiple: "", selection: "", fluid: "" },
    choices: "items"
  })
  const host = document.createElement("div")
  host.className = "ProjectSettingsRoot"
  document.body.append(host)
  return new Promise((resolve) => {
    const dispose = render(
      () => <ProjectSettings project={project} root={root} onDone={finish} onError={onError} />,
      host
    )

    /** Unmount, then resolve. */
    function finish() {
      dispose()
      host.remove()
      resolve()
    }
  })
}

/** What `<ProjectSettings>` edits:  a copy of the project file's settings, as its index says them. */
function settingsOf(project: SP.SpellProject): SPACES.ProjectSettings {
  const contents = project.contents
  return {
    title: contents?.title ?? "",
    version: contents?.version ?? "",
    targets: (contents?.targets ?? []).filter((name) => name !== SP.RUNNING_TARGET),
    listsStartAt: contents?.listsStartAt ?? 1
  }
}

/**
 * The Spell `project` is written for, in the page's words:  "Written for Spell 0.9" (its file's `spellVersion`),
 * or "Written for an older version of Spell" when its file names none.
 */
export function writtenFor(project: SP.SpellProject): string {
  const version = project.contents?.spellVersion
  return version
    ? appTexts.text("writtenForSpell", { version: SP.OldForms.shortVersion(version) })
    : appTexts.text("writtenForOlderSpell")
}

/** The control kind for picking several choices:  a multiple-selection dropdown, as wide as its column. */
const CHOICES = "choices"

/**
 * A project's settings, as `<ui-property-editor>` reads them, labelled in the page's language.
 * - Its targets:  every one spell has but `js/solid`, which it always compiles to.
 */
function projectSettingsSchema(): V.PropertySchema {
  return {
    name: "ProjectSettings",
    attributes: [
      {
        name: "title",
        kind: "string",
        type: "text",
        description: "",
        tip: appTexts.text("titleTip")
      },
      {
        name: "version",
        kind: "string",
        type: "text",
        description: "",
        pattern: "^(\\d+\\.\\d+\\.\\d+)?$",
        tip: appTexts.text("versionTip")
      },
      {
        name: "targets",
        kind: "json",
        type: "list",
        of: "choice",
        values: Object.keys(SP.TARGETS).filter((name) => name !== SP.RUNNING_TARGET),
        description: "",
        label: appTexts.text("targetsLabel"),
        tip: appTexts.text("targetsTip")
      },
      {
        name: "listsStartAt",
        kind: "enum",
        type: "choice",
        values: ["1", "0"],
        description: "",
        label: appTexts.text("listsStartAtLabel"),
        tip: appTexts.text("listsStartAtTip")
      }
    ]
  }
}
