import type { LSP } from "spell/app/lsp"

/**
 * The names the editor needs in its own Spell, `SpellEditor.spell` (epic `editor` I123):
 * every type and member the editor's TypeScript reads or fills BY NAME, and what each is for.
 * - The ONE list:  each reader and writer takes its names from it, by its types (`EditorMemberName` ...),
 *   so a name written in the TypeScript that isn't here doesn't compile.
 *   - the menus' state and actions (`MenuBar.tsx`), the panes and the bar (`SpellEditor.tsx`),
 *     the file tabs (`FileTabs.tsx`), Versions (`VersionsBox.tsx`), the zones' sample words (`EditorZones.tsx`)
 * - Each type by its compiled class's name (`FileTabBar`), each member by its compiled name (`rememberAs`):
 *   what the TypeScript writes.  `words` is what the Spell writes, `remember as`.
 * - Checked twice, so renaming one in the Spell is never silent:
 *   - as the Spell is edited:  an error under the type it's missing from (`editorHostNames()`, `LSP.HostNameCheck`)
 *   - as the editor loads it:  ONE notice naming every one missing (`missingEditorNames()`, `loadEditorSpell()`)
 * - Plain data:  no imports but types, so the language service's side and the load's side share it.
 * - A new name the editor fills goes here first;  a rename here AND in the Spell, in one change.
 */
export const EDITOR_NAMES = {
  SpellEditor: {
    words: "spell editor",
    for: "the editor's app:  its views, the state its menus grey and tick by, its actions",
    members: {
      editorBar: { kind: "view", words: "editor bar", for: "the top bar, drawn over the panes" },
      editorLayout: { kind: "view", words: "editor layout", for: "the panes:  the code, the Program panel, the app" },
      fileTabBar: { kind: "view", words: "file tab bar", for: "the file tabs over the code" },
      projectMenu: { kind: "view", words: "project menu", for: "the project's menu, under its name" },
      fileMenu: { kind: "view", words: "file menu", for: "File" },
      editMenu: { kind: "view", words: "edit menu", for: "Edit" },
      viewMenu: { kind: "view", words: "view menu", for: "View" },
      runMenu: { kind: "view", words: "run menu", for: "Run" },
      homeRow: { kind: "view", words: "home row", for: "Home and About Spell, atop Spell's menu" },
      aboutBox: { kind: "view", words: "about box", for: "what About Spell… shows" },
      versionsBox: { kind: "view", words: "versions box", for: "what Versions shows" },

      canRevert: { kind: "value", words: "can revert", for: "greys Discard Changes" },
      drafted: { kind: "value", words: "drafted", for: "greys Delete Draft" },
      autoSaving: { kind: "value", words: "auto saving", for: "ticks AutoSave" },
      canPublish: { kind: "value", words: "can publish", for: "greys Publish" },
      unsaved: { kind: "value", words: "unsaved", for: "ticks Save" },
      running: { kind: "value", words: "running", for: "ticks Run or Edit" },
      codeIsShowing: { kind: "value", words: "code is showing", for: "ticks View › Code" },
      compiledCodeIsShowing: { kind: "value", words: "compiled code is showing", for: "ticks View › Compiled Code" },
      programPanelShowing: { kind: "value", words: "program panel showing", for: "ticks View › Program Panel" },
      inspectorOpen: { kind: "value", words: "inspector open", for: "ticks View › Inspector" },
      lineNumbersShowing: { kind: "value", words: "line numbers showing", for: "ticks View › Line Numbers" },
      inspecting: { kind: "value", words: "inspecting", for: "greys Inspect App and Stop Inspecting" },
      siteReady: { kind: "value", words: "site ready", for: "greys View › Site" },
      consoleEmpty: { kind: "value", words: "console empty", for: "greys Clear Console" },
      onAServer: { kind: "value", words: "on a server", for: "shows Publish, Versions and the project's settings" },
      mayCreate: { kind: "value", words: "may create", for: "shows New Spell File and New CSS File" },
      mayDesign: { kind: "value", words: "may design", for: "shows Save" },
      mayChangeProject: { kind: "value", words: "may change project", for: "shows Rename, Delete and Duplicate" },
      mayReset: { kind: "value", words: "may reset", for: "shows Reset to Saved" },
      revertWords: { kind: "value", words: "revert words", for: "Discard Changes' title" },
      renameWords: { kind: "value", words: "rename words", for: "Rename the project…'s title" },
      deleteWords: { kind: "value", words: "delete words", for: "Delete the project…'s title" },
      duplicateWords: { kind: "value", words: "duplicate words", for: "Duplicate the project's title" },

      home: { kind: "action", words: "home", for: "Home" },
      aboutSpell: { kind: "action", words: "about spell", for: "About Spell…" },
      renameProject: { kind: "action", words: "rename project", for: "renames the project" },
      deleteProject: { kind: "action", words: "delete project", for: "deletes the project" },
      duplicateProject: { kind: "action", words: "duplicate project", for: "duplicates the project" },
      resetToSaved: { kind: "action", words: "reset to saved", for: "Reset to Saved" },
      publish: { kind: "action", words: "publish", for: "Publish" },
      versions: { kind: "action", words: "versions", for: "opens Versions" },
      deleteDraft: { kind: "action", words: "delete draft", for: "Delete Draft" },
      projectSettings: { kind: "action", words: "project settings", for: "opens the project's settings" },
      exportProject: { kind: "action", words: "export project", for: "Export…" },
      importProject: { kind: "action", words: "import project", for: "Import…" },
      newSpellFile: { kind: "action", words: "new spell file", for: "New Spell File" },
      newCssFile: { kind: "action", words: "new css file", for: "New CSS File" },
      save: { kind: "action", words: "save", for: "Save" },
      autoSave: { kind: "action", words: "auto save", for: "AutoSave" },
      duplicateFile: { kind: "action", words: "duplicate file", for: "a tab's Duplicate" },
      renameFile: { kind: "action", words: "rename file", for: "a tab's Rename" },
      deleteFile: { kind: "action", words: "delete file", for: "a tab's Delete" },
      revertChanges: { kind: "action", words: "revert changes", for: "Discard Changes" },
      find: { kind: "action", words: "find", for: "Find" },
      codeSettings: { kind: "action", words: "code settings", for: "Code Editor Settings…" },
      runMode: { kind: "action", words: "run mode", for: "View › Run" },
      editMode: { kind: "action", words: "edit mode", for: "View › Edit" },
      siteView: { kind: "action", words: "site view", for: "View › Site" },
      showCode: { kind: "action", words: "show code", for: "View › Code" },
      showCompiledCode: { kind: "action", words: "show compiled code", for: "View › Compiled Code" },
      showProgramPanel: { kind: "action", words: "show program panel", for: "View › Program Panel" },
      showInspector: { kind: "action", words: "show inspector", for: "View › Inspector" },
      showLineNumbers: { kind: "action", words: "show line numbers", for: "View › Line Numbers" },
      compileAndRun: { kind: "action", words: "compile and run", for: "Compile and Run" },
      restart: { kind: "action", words: "restart", for: "Restart" },
      inspectApp: { kind: "action", words: "inspect app", for: "Inspect App" },
      stopInspecting: { kind: "action", words: "stop inspecting", for: "Stop Inspecting" },
      clearConsole: { kind: "action", words: "clear console", for: "Clear Console" }
    }
  },
  EditorPart: {
    words: "editor part",
    for: "what the editor draws in a view's place for it",
    members: {}
  },
  EditorBar: {
    words: "editor bar",
    for: "the top bar's sections",
    members: {
      spellMenu: { kind: "part", words: "spell menu", for: "Spell's menu" },
      projectMenu: { kind: "part", words: "project menu", for: "the project's menu" },
      appMenus: { kind: "part", words: "app menus", for: "File, Edit, View, Run and Help" },
      modeButtons: { kind: "part", words: "mode buttons", for: "Run and Edit" },
      tools: { kind: "part", words: "tools", for: "Add, the Inspector's menu, Restart and the theme" },
      you: { kind: "part", words: "you", for: "the person's own menu" }
    }
  },
  EditorLayout: {
    words: "editor layout",
    for: "the panes",
    members: {
      code: { kind: "part", words: "code", for: "the file tabs and the code" },
      programPanel: { kind: "part", words: "program panel", for: "the Program panel" },
      app: { kind: "part", words: "app", for: "the running program" },
      inspector: { kind: "part", words: "inspector", for: "the Inspector" },
      columns: { kind: "value", words: "columns", for: "the panes' sizes across, as last dragged" },
      codeRows: { kind: "value", words: "code rows", for: "the code's and the Program panel's sizes" },
      grows: { kind: "value", words: "grows", for: "which pane takes a change of size" },
      mode: { kind: "value", words: "mode", for: "Edit or Run:  hides the code in Run" }
    }
  },
  File: {
    words: "file",
    for: "each file tab",
    members: {
      name: { kind: "value", words: "name", for: "the tab's name" },
      icon: { kind: "value", words: "icon", for: "the tab's icon" },
      path: { kind: "value", words: "path", for: "which file the tab shows" },
      status: { kind: "value", words: "status", for: "the not-saved dot, or the draft's pen" },
      place: { kind: "value", words: "place", for: "the tab chosen" },
      draftNote: { kind: "value", words: "draft note", for: "the pen's tip" },
      discardWords: { kind: "value", words: "discard words", for: "the tip's Discard changes" },
      closeWords: { kind: "value", words: "close words", for: "the tab's ✕'s tooltip" },
      show: { kind: "action", words: "show it", for: "a click on the tab" },
      discard: { kind: "action", words: "discard it", for: "the tip's Discard changes" },
      close: { kind: "action", words: "close it", for: "the tab's ✕" }
    }
  },
  FileTabBar: {
    words: "file tab bar",
    for: "the file tabs",
    members: {
      files: { kind: "value", words: "files", for: "the tabs" },
      rememberAs: { kind: "value", words: "remember as", for: "what the open tabs are kept under" },
      hideWords: { kind: "value", words: "hide words", for: "the ✕'s tooltip, which hides the code" },
      hide: { kind: "action", words: "hide it", for: "the ✕ at the bar's far right:  hides the code" }
    }
  },
  AboutBox: {
    words: "about box",
    for: "About Spell…",
    members: {
      version: { kind: "value", words: "version", for: "the editor's version" }
    }
  },
  Version: {
    words: "version",
    for: "each row of Versions",
    members: {
      name: { kind: "value", words: "name", for: "which kept copy it is" },
      when: { kind: "value", words: "when", for: "the row's words" },
      place: { kind: "value", words: "place", for: "the row chosen" },
      choose: { kind: "action", words: "choose it", for: "a click on the row" }
    }
  },
  VersionsBox: {
    words: "versions box",
    for: "Versions",
    members: {
      versions: { kind: "value", words: "versions", for: "the rows" },
      heading: { kind: "value", words: "heading", for: "its heading" },
      message: { kind: "value", words: "message", for: "what it says" },
      emptyWords: { kind: "value", words: "empty words", for: "what it says with no versions" },
      keepWords: { kind: "value", words: "keep words", for: "Save Current Changes" },
      cancelWords: { kind: "value", words: "cancel words", for: "Cancel" },
      restoreWords: { kind: "value", words: "restore words", for: "Restore" },
      listing: { kind: "value", words: "listing", for: "greys Restore with no versions" },
      keeping: { kind: "value", words: "keeping", for: "Save Current Changes' state" },
      restore: { kind: "action", words: "restore it", for: "Restore" },
      keepTheChanges: { kind: "action", words: "keep the changes", for: "Save Current Changes" }
    }
  },
  ProjectMenu: {
    words: "project menu",
    for: "the project's menu",
    members: {
      theme: { kind: "part", words: "theme", for: "Theme ›" }
    }
  },
  BarMenu: {
    words: "bar menu",
    for: "File, Edit, View and Run",
    members: {
      title: { kind: "value", words: "title", for: "the bar's word for the menu" }
    }
  },
  EditMenu: {
    words: "edit menu",
    for: "Edit",
    members: {
      undo: { kind: "part", words: "undo", for: "Undo, its title the step" },
      redo: { kind: "part", words: "redo", for: "Redo, likewise" },
      partActions: { kind: "part", words: "part actions", for: "what can be done to the parts selected" }
    }
  }
} as const satisfies Record<string, EditorType>

/** The project the names are in:  the editor's own Spell. */
export const EDITOR_SPELL_PROJECT = "@spell/editor/spell-editor"

/**
 * The names of `exports`, the editor's compiled Spell, that it's missing:  each in the Spell's words.
 * - A type the class of is gone counts once, not each member.
 * - A member counts when its class's prototype chain doesn't have it:  every property and action is a getter
 *   or a method there.
 * - The app itself, `spellEditor`, counts as its type.
 * - NEVER throws
 */
export function missingEditorNames(exports: Readonly<Record<string, unknown>>): MissingEditorName[] {
  return Object.entries(EDITOR_NAMES).flatMap(([className, type]): MissingEditorName[] => {
    const made = exports[className]
    const isApp = className === APP_CLASS
    if (typeof made !== "function" || (isApp && typeof exports[APP_EXPORT] !== "object")) return [{ type: type.words }]
    const prototype = (made as { prototype?: object }).prototype ?? {}
    return Object.entries(type.members as Record<string, EditorMember>)
      .filter(([name]) => !(name in prototype))
      .map(([, member]) => ({ type: type.words, member: member.words }))
  })
}

/** The app's class in `EDITOR_NAMES`, whose one thing is exported as `APP_EXPORT`. */
const APP_CLASS = "SpellEditor"
/** The editor's app, as its compiled Spell exports it. */
const APP_EXPORT = "spellEditor"

/**
 * The editor's names, for the language service (`LSP.SpellLanguageService.hostNames`):
 * a name the Spell drops is an error as it's typed.
 * - `messageFor`:  what the error says, in the editor's words.
 */
export function editorHostNames(messageFor: (words: string) => string): LSP.HostNames {
  return { project: EDITOR_SPELL_PROJECT, types: EDITOR_NAMES, messageFor }
}

////////////////
// ## Types
////////////////

/** A type of the editor's Spell the editor reads or fills. */
type EditorType = LSP.HostType & { members: Readonly<Record<string, EditorMember>> }

/** A member of a type the editor reads or fills, and how it uses it. */
type EditorMember = LSP.HostMember & {
  /**
   * - `view`:  a view the editor draws
   * - `part`:  a place in a view the editor draws in itself (an editor part)
   * - `value`:  a value the editor writes, or reads
   * - `action`:  an action whose work the editor does
   */
  kind: EditorNameKind
}

/** How the editor uses a member:  see `EditorMember.kind`. */
export type EditorNameKind = "view" | "part" | "value" | "action"

/** A type of `EDITOR_NAMES`, by its compiled class's name:  `FileTabBar`. */
export type EditorTypeName = keyof typeof EDITOR_NAMES

/** The members of `Type` the editor uses as `Kind` (every kind, by default), by their compiled names. */
export type EditorMemberName<Type extends EditorTypeName, Kind extends EditorNameKind = EditorNameKind> = {
  [Name in keyof MembersOf<Type>]: MembersOf<Type>[Name] extends { kind: Kind } ? Name : never
}[keyof MembersOf<Type>] &
  string

/** Every editor part the editor fills, of any view:  what `EditorSpell.parts()` takes. */
export type EditorPartName = { [Type in EditorTypeName]: EditorMemberName<Type, "part"> }[EditorTypeName]

/**
 * A thing of the editor's Spell of type `Type`, as the editor fills it:  each listed member, and no other.
 * - `Shape` says what the editor reads back from some of them:  `{ status: "saved" | "changed" }`.
 */
export type EditorThing<
  Type extends EditorTypeName,
  Shape extends Partial<Record<EditorMemberName<Type>, unknown>> = {}
> = Omit<Record<EditorMemberName<Type>, unknown>, keyof Shape> & Shape

/** `Type`'s members in `EDITOR_NAMES`. */
type MembersOf<Type extends EditorTypeName> = (typeof EDITOR_NAMES)[Type]["members"]

/** A name `missingEditorNames()` found missing:  a type, or a member of one, in the Spell's words. */
export type MissingEditorName = {
  /** the type:  `spell editor` */
  type: string
  /** the member missing from it:  `code is showing`;  none when the whole type is */
  member?: string
}
