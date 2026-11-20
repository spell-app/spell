/**
 * The editor's own texts, in English:  every word the app shows people, by key (epic `spanish` P13).
 * - Read through `appTexts.text(key, params)` (`AppTexts.ts`), never written inline.
 * - `{name}` is a placeholder, filled from the params.
 *   - A project group's words are params too (see `AppTexts.groupWords()`):
 *     `{type}` (`example`), `{Type}` (`Example`), `{theType}` (`the example`)
 *   - Each language writes the sentence its own way, with the ones it needs.
 * - Other languages:  a file beside it each, `AppTexts.<lang>.ts`, with every key (its type says so).
 * - Pure data, no imports:  the editor's entry, the runner and `<spell-viewer>` all carry it.
 * - The web components' own texts (`<spell-viewer>`, `<spell-editor>`) are in their vocabularies, `Spell<Name>.en.ts`.
 */
export const APP_TEXTS = {
  ////////////////
  // ## Actions:  menu items and buttons (`Actions.tsx`)
  ////////////////

  editApp: "Edit {Type}",
  preview: "Run",
  settings: "Settings",
  home: "Home",
  help: "Help",
  you: "You",
  createApp: "New {Type}",
  duplicateApp: "Duplicate {Type}",
  renameApp: "Rename {Type}",
  deleteApp: "Delete {Type}",
  restart: "Restart",
  takesEffectOnRestart: "This takes effect on restart",
  restartNoticeClose: "Close",
  menuCode: "Code",
  emptyAppPrompt: "Drag something here from the + menu, or click one there to add it.",
  modes: "Run, edit or debug",
  runMode: "Run",
  editMode: "Edit",
  // Design mode, the top bar's fourth tab, and its picker (epic `editor` P37)
  designMode: "Design",
  designTip: "Work on One Piece of Your App by Itself",
  designingTip: "You're working on one piece of your app by itself",
  designPickerLabel: "What to design",
  designDrawing: "Its drawing",
  designPropertyEditor: "Property editor",
  designPages: "Pages",
  designViews: "Views",
  designOtherViews: "Other views",
  designWaiting: "Starting your app…",
  designNothing:
    "This file has no pieces you can work on by themselves.\nPick one from the list on the left:  it opens here, on its own.",
  // Design's gallery of samples, and its sizes (epic `editor` P38)
  designSampleStart: "A new {view}",
  designOne: "One",
  designGallery: "Gallery",
  designShowingLabel: "Show one, or the gallery side by side",
  designSaveSample: "Save Sample",
  designSaveSampleTip: "Save how the selected one looks now, as a sample you can find again in the Gallery",
  designSampleNameAsk: "Give this sample a name, to find it in the Gallery.",
  designRenameSample: "Rename Sample…",
  designDeleteSample: "Delete Sample",
  designSaveSampleStep: "Save Sample {name}",
  designRenameSampleStep: "Rename Sample {name}",
  designDeleteSampleStep: "Delete Sample {name}",
  designSamplesHeading: "{view} samples",
  designSamplesAbout: "What Design's gallery shows for a {view}:  each sample one made with its own settings.",
  designSizeLabel: "Size",
  designSizeFit: "Fit",
  designSizePhone: "Phone",
  designSizeTablet: "Tablet",
  designSizeDesktop: "Desktop",
  designWidth: "Width",
  designWidthTip: "Type a width in pixels to see how it looks at that size",
  // the top bar's tooltips:  what a click does, in the state it's in (epic `editor` I230)
  runTip: "Run the App",
  stopEditingTip: "Stop Editing",
  runningTip: "The app is running",
  editTip: "Edit the App",
  editingTip: "You're editing the app",
  siteTip: "Show the Site's Pages",
  siteShownTip: "You're looking at the site's pages",
  showCodeTip: "Show Spell Code",
  hideCodeTip: "Hide Spell Code",
  showCompiledTip: "Show Compiled {language}",
  hideCompiledTip: "Hide Compiled {language}",
  inspectTip: "Inspect the App:  click a part to select it",
  stopInspectingTip: "Stop Inspecting",
  restartTip: "Restart the app",
  youTip: "Edit Your Name and Emails",
  menuCut: "Cut",
  menuCopy: "Copy",
  menuPaste: "Paste",
  menuDuplicate: "Duplicate",
  menuDelete: "Delete",
  addPart: "Add to the app",
  paletteSearch: "Search Views",
  paletteHint: "Click or drag to add to the page",
  paletteMore: "{count} more",
  paletteAppViews: "App views",
  palettePin: "Keep this open",
  paletteUnpin: "Unpin",
  paletteAddView: "Add a View",
  paletteClearSearch: "Clear the search",
  partStepAdd: "Add {part}",
  partStepMove: "Move",
  partStepCut: "Cut",
  partStepPaste: "Paste",
  partStepDuplicate: "Duplicate",
  partStepDelete: "Delete",
  partFromLoop:
    "These all come from one line of your program, so you can't change just one of them.\nPick the part that holds them all, or change that line.",
  partNotWritten:
    "This isn't a part of its own in your program, so you can't move or remove it here.\nChange your program instead.",
  menuChangeThis: "Change This...",
  changeThisHeader: "Tell your buddy Claude:",
  changeThisPrompt: "What should change?",
  changeThisNobody:
    "Claude didn't start by itself.\nStart it with the button,\nor, in a Claude session on this machine,\nrun this in the background:",
  changeThisStarting: "Starting Claude session…",
  changeThisReadingRequest: "Reading your request…",
  changeThisReadingFile: "Reading {file}…",
  changeThisEditing: "Editing {file}…",
  changeThisFinishing: "Finishing up…",
  changeThisWorking: "Claude is working on it…",
  changeThisSeconds: "{seconds}s",
  changeThisStalled: "Claude's session didn't start on it within a minute,\nso it was stopped.\nTry Send again.",
  changeThisStart: "Start Claude",
  changeThisNoClaude: "Claude Code isn't on this machine,\nso nothing can make this change yet.",
  changeThisInstall: "Install Claude Code",
  changeThisByHand:
    "Installed somewhere I didn't look?\nIn a Claude session on this machine,\nrun this in the background:",
  changeThisSend: "Send",
  changeThisClose: "Close",
  changeThisDone: "Claude changed the code.",
  changeThisNoChange: "Claude finished, and no file changed.",
  changeThisFailed: "Claude couldn't do that:\n{summary}",
  changeThisStopped: "Claude stopped before it was done.",
  changeThisRefused: "Change This only works on the Mac running Spell.",
  changeThisPicture: "A picture sent with it",
  changeThisRemovePicture: "Take this picture out",
  menuShowInCode: "Show in Code",
  menuInspect: "Inspect {type}",
  menuInspectParts: "Pick one of the parts under the mouse",
  menuInspectOtherViews: "Inspect Other Views",
  partIsApp: "That's the app itself:\nit can't be cut, duplicated or deleted.",
  partNothingCopied: "Nothing's been copied yet.",
  partNothingSelected: "Nothing's selected.",
  partBusy: "One moment:  the app is catching up with your last change.",
  partAcrossFiles: "These are written in different files, so they can't be moved together yet.",
  partNoDrawing:
    "There's nowhere to put this part yet:  your app doesn't show anything on screen.\n" +
    'In the code on the left, add a "to draw" section under your app, saying what it shows.\n' +
    "Then pick the part again.",
  // a part added, drawn, but with nothing to see (epic `editor` P35)
  partAddedEmpty:
    "What you added is in your app, but it's empty, so you can't see it yet.\n" +
    "It's selected in the Views list on the right.\n" +
    "Give it a label, or drag another part into it.",
  partInsideItself: "Something can't go inside itself.",
  lineNumbers: "Line Numbers",
  softWrap: "Soft Wrap",
  // the code pane's settings, `<CodeSettingsPanel>` (epic `debut`)
  // Spell › About Spell (epic `editor` I94)
  aboutSpell: "About Spell…",
  // Spell › Spell UI, and the home page's footer:  Spell UI's site, in the editor (epic `mockup` T55)
  spellUI: "Spell UI",
  codeSettings: "Code Editor Settings…",
  codeSettingsHeader: "Code editor",
  codeSettingsClose: "Close the code editor's settings",
  codeHover: "Hover info",
  codeHoverWithAlt: "Only with ⌥ (Alt) held",
  codeHoverAlways: "Always",
  codeHoverNever: "Never",
  codeSuggest: "Suggest as you type",
  codeSuggestWhereItHelps: "Where it helps",
  codeSuggestEverywhere: "Everywhere",
  codeSuggestOnCtrlSpace: "Never:  only on Ctrl+Space",
  codeSuggestDetails: "Details beside suggestions",
  codeParameterHints: "Parameter hints",
  codePinnedLines: "Pinned lines above the code",
  codeCompilerWords: "Compiler details in hover",
  codeBubbly: "Bubbly look",
  codeWrapLines: "Wrap long lines",
  codePopupDelay: "Popup delay",
  codePopupDelayShort: "Short:  0.4 seconds",
  codePopupDelayStandard: "Standard:  0.8 seconds",
  codePopupDelayLong: "Long:  1.5 seconds",
  // a notebook's page, `<NotebookPage>` (epic `elemental-spell` P16)
  notebookPageLock: "Lock it:  nothing is saved while it's locked",
  notebookPageUnlock: "Unlock it:  changes are saved",
  notebookPageLocked: "Locked:  changes aren't saved",
  notebookPageContents: "On this page",
  notebookPagePick: "Switch to another notebook page",
  notebookPageShowContents: "Show contents",
  notebookPageHideContents: "Hide contents",
  resetToSaved: "Reset to Saved",
  runTests: "Run Tests",
  newProject: "New App",
  exportApp: "Export…",
  importApp: "Import…",
  importedApp: "Imported {name}.",
  notAProjectFile: "{file} isn't a project Spell exported.",
  keptInBrowser: "Your work is kept in this browser.\nClearing the site's data loses it:\nExport keeps a copy.",
  startTitle: "Make something",
  startLine: "Start from nothing, or from something that already works.",
  startBlank: "Blank",
  startBlankLine: "An empty app, and things to drag in.",
  startCounter: "Counter",
  startCounterLine: "Counters you name, count up by any step, and total.",
  startConverter: "Converter",
  startConverterLine: "Kilometers to miles, and more, as you type.",
  startTaskList: "To-do list",
  startTaskListLine: "Add tasks, check them off, make it yours.",
  newExample: "New Example",
  newGuide: "New Guide",
  newFile: "New File",
  newSpellFile: "New Spell File",
  newCssFile: "New CSS File",
  duplicateFile: "Duplicate File",
  renameFile: "Rename File",
  deleteFile: "Delete File",
  save: "Save",
  revertChanges: "Discard Changes",
  discardDraft: "Discard",
  publishDraft: "Publish",
  draft: "Draft",
  /** The top bar's pill (epic `editor` I217):  what a draft is, and what Publish and Discard each do. */
  draftTip: "Your changes are a draft.\nOnly you see them.",
  publishDraftTip: "Sends your changes out to everyone.\nKeeps a version.",
  discardDraftTip: "Throws your changes away.",
  updatedInYourDraft: "Updated in your draft.",
  discardChanges: "Discard changes",
  closeTab: "Close",
  /** The file bar's ✕ at its far right, which hides the code (epic `editor` T83). */
  hideCode: "Hide the code",
  versions: "Versions",
  deleteDraft: "Delete Draft",
  deleteDraftHeading: "Throw away your draft?",
  deleteDraftConfirm: "Every file goes back to what everyone sees now.\nUndo brings your changes back.",
  deleteDraftOk: "Throw It Away",
  draftDeletedFile: "Deleted your draft of {count} file.",
  draftDeletedFiles: "Deleted your draft of {count} files.",
  /** Leaving a project made from a start card, changed but with no version saved (epic `mockup` I42). */
  keepAppHeading: "Save your draft of {name}?",
  keepAppMessage: "It has no saved version yet.\nDon't Save Draft throws it away:  it won't be in your apps.",
  keepAppSave: "Save Draft",
  keepAppDontSave: "Don't Save Draft",
  appNotKept: "{name} wasn't saved.",
  /** Leaving an example (or Save in one) with your changes to it (epic `mockup` T52, P24):  the novice voice. */
  keepExampleHeading: "Keep your changes to {name}?",
  keepExampleMessage:
    "You changed {name}.\nFor now, only you can see your changes.\nSave in My Apps keeps them in a copy of your own.\n{name} itself stays as it was.",
  keepExampleMessageSpell:
    "You changed {name}.\nFor now, only you can see your changes.\nSave in My Apps keeps them in a copy of your own, and {name} stays as it was.\nUpdate the Example changes {name} for everyone.",
  keepExampleAsMine: "Save in My Apps",
  keepExampleDiscard: "Discard Changes",
  keepExampleUpdate: "Update the Example",
  exampleSavedAsApp: "{name} is in your apps now, with your changes.",
  exampleDraftDiscarded: "Your changes to {name} are gone.",
  discardExampleHeading: "Discard your changes to {name}?",
  discardExampleMessage: "{name} goes back to how it was.\nYou can't get your changes back.",
  discardExampleOk: "Discard",
  discardExampleKeepEditing: "Keep Editing",
  updateExampleHeading: "Change {name} for everyone?",
  updateExampleMessage: "Everyone who opens {name} will see your changes.",
  exampleUpdated: "Everyone now sees your changes to {name}.",
  saveCurrentChanges: "Save Current Changes",
  keptDraftAt: "{time}:  your draft, not published",
  publishedFile: "Published {count} file:  kept as version {version}.",
  publishedFiles: "Published {count} files:  kept as version {version}.",
  nothingToPublish: "Nothing to publish:  no file has a draft.",
  publishClashHeading: "Some files have been changed since your draft began.  Keep the changes?",
  publishClashMessage:
    "Someone has updated these files since you started your draft.\nTo accept individual changes, click the arrow for that change in the center column.",
  publishClashFiles: "Changed Files",
  publishClashTheirs: "Current Published Version",
  publishClashMine: "Your Changes",
  publishClashTake: "Use their change",
  publishClashPutBack: "Undo:  put your change back",
  publishUseTheirs: "Use Their Changes",
  publishUseTheirsHeading: "Use Their Changes?",
  publishUseTheirsConfirm: "Are you sure?\nThis drops all your changes in these files,\nand uses theirs instead.",
  publishMine: "Publish My Changes",
  noVersions: "No versions yet:  each Publish keeps one.",
  versionsMessage:
    "Each time you publish, Spell keeps a copy of your whole project.\nPick one to bring it back as your draft:\nit replaces changes you haven't published yet.\nWhat everyone sees stays the same until you click Publish, and it stays in this list.\nTo keep your changes first, click Save Current Changes:\nthey're added to the list as your draft, and only you see them.",
  restoreVersion: "Restore",
  versionRestoredFile: "Restored {count} file from {version} as your draft.",
  versionRestoredFiles: "Restored {count} files from {version} as your draft.",
  autoSave: "AutoSave",
  clearConsole: "Clear Console",
  alert: "Alert",
  confirm: "Confirm",
  prompt: "Prompt",
  promptNumber: "Prompt Number",
  choose: "Choose",
  cancel: "Cancel",

  ////////////////
  // ## The top bar's menus (`MenuBar.tsx`, epic `debut` P32)
  ////////////////

  menuFile: "File",
  menuEdit: "Edit",
  menuView: "View",
  menuRun: "Run",
  menuHelp: "Help",
  menuAll: "Menus",
  // Help › Keyboard Shortcuts, its dialog (`<ShortcutsDialog>`, epic `editor` P36):  `{words}`, what was typed
  shortcuts: "Keyboard Shortcuts",
  shortcutsSearch: "Search the shortcuts",
  shortcutsNoMatch: "No shortcut matches “{words}”.\nTry another word.",
  // between two keys that do the same thing (Delete:  ⌫ or ⌦)
  shortcutsOr: "or",
  // its headings:  where the keys work (`HOTKEY_GROUPS`)
  shortcutsFiles: "Files",
  shortcutsEditing: "Editing",
  shortcutsSelection: "What's selected in the app",
  shortcutsCode: "The code",
  shortcutsRunning: "Running the app",
  shortcutsDebugger: "The step debugger",
  // a row's note, where its key works only some of the time
  shortcutsWhilePaused: "Only while the app is paused on a line",
  shortcutsNotInCode: "Not while you're typing in the code",
  shortcutsNotTyping: "Not while you're typing in the code or a text box",
  shortcutsWhileInspecting: "Only while you're picking a part of the app",
  // its rows the menus don't name
  shortcutFind: "Find and Replace",
  shortcutShowShortcuts: "Show Keyboard Shortcuts",
  shortcutChangeThis: "Ask for a Change to What's Selected",
  shortcutFormat: "Format Document",
  shortcutExpandSelection: "Expand Selection",
  shortcutShrinkSelection: "Shrink Selection",
  shortcutToggleComment: "Comment or Uncomment Lines",
  shortcutFold: "Hide a Block's Lines (Fold)",
  shortcutUnfold: "Show a Block's Lines (Unfold)",
  shortcutMoveLineUp: "Move Line Up",
  shortcutMoveLineDown: "Move Line Down",
  shortcutAddCursor: "Type on Several Lines at Once",
  shortcutContinue: "Continue",
  shortcutStepOver: "Step Over",
  shortcutStepInto: "Step Into",
  shortcutStepOut: "Step Out",
  appMenus: "Menus",
  projectMenu: "{project}:  its menu",
  spellMenu: "{app}:  its menu",
  duplicateProject: "Duplicate Project…",
  renameProject: "Rename Project…",
  deleteProject: "Delete Project…",
  // a home page card's "..." menu, one of your projects (epic `mockup` T47)
  cardMenu: "Project actions",
  cardRunApp: "Run App in a New Tab",
  cardVersions: "Versions…",
  cardExport: "Export as .zip",
  cardSnapshot: "Update App Snapshot…",
  // its snapshot dialog, `<AppSnapshot>`:  the app in a phone's screen, then its picture cropped to the card
  snapshotHeading: "Update App Snapshot:  {title}",
  snapshotLine: "Get the app the way you want its picture,\nthen press Snapshot.",
  snapshotCropLine: "Drag the frame to choose what the card shows.\nDrag a corner to resize it.\nThen press Save.",
  snapshotTake: "Snapshot",
  snapshotSave: "Save",
  snapshotRetake: "Retake",
  snapshotTheme: "Change theme",
  snapshotLight: "Light",
  snapshotDark: "Dark",
  snapshotFrame: "The card's picture:  move it with the arrow keys, resize it with + and -",
  snapshotFrameAt: "{left}, {top}, {width} wide",
  snapshotSaved: "Snapshot saved.",
  snapshotNoCapture: "This browser can't take a snapshot of the page:\ntry Chrome, Edge or Firefox.",
  menuProjectSettings: "Project Settings",
  themeIs: "Theme:  {theme}",
  menuCompileAndRun: "Compile and Run",
  undo: "Undo",
  redo: "Redo",
  undoStep: "Undo {step}",
  redoStep: "Redo {step}",
  changeField: "Change {field}",
  changeNotebook: "Change Notebook",
  undoTextGone: "Couldn't undo {step}:  its text is no longer in the file.",
  // a running site's not found page, making the page its address names (epic `mockup` P2)
  siteCreatePage: "Create the page at {address}",
  siteNoSiteFile: "This project has no site to add a page to:\nmake one, e.g. `galaxy guide is a site:`",
  // the site editor, `/site/<project>` (epic `mockup` P4)
  siteView: "Site",
  siteEditorTitle: "{project}:  sitemap",
  siteNotASite: "{project} isn't a site:\na site's file says, e.g., `galaxy guide is a site:`",
  siteAddPage: "Add a page",
  siteNewPageTitle: "New page",
  siteAddSection: "Add a section",
  siteNewSectionTitle: "New section",
  siteRemovePart: "Delete {name}",
  siteRemoveWithPage: "Delete {name} and the page under it ({pages})?",
  siteRemoveWithPages: "Delete {name} and its {count} pages under it ({pages})?",
  siteRemoveAll: "Delete them all",
  siteRenamePart: "Rename {name} to {newName}",
  siteChangePart: "Change {name}",
  siteMovePart: "Move {name}",
  siteOpenPage: "Open in Edit",
  siteDesignPage: "Design",
  siteEditPart: "Edit {name}",
  siteBackToSite: "Back to the site",
  siteGroupTitle: "Sites",
  siteGroupLine: "Every site in this group:  open one to change its pages.",
  siteGroupNone: 'No sites here yet.  Make one by writing "galaxy guide is a site:" in a project of this group.',
  sitesHomeLine: "Every site, by the group it's in:\nopen one to change its pages.",
  siteRunSite: "Run the site",
  siteFieldName: "Name",
  siteFieldTitle: "Title",
  siteFieldAddress: "Address",
  siteFieldState: "State",
  siteFieldLive: "Live page",
  siteFieldParameters: "Parameters",
  siteNoParameters: "none",
  sitePickOne: "Pick a page to change it.",
  siteDropHere: "Move here",
  "siteKind.page": "Page",
  "siteKind.group": "Group",
  "siteKind.dialog": "Dialog",
  "siteKind.sidebar": "Sidebar",
  // a page's stories, in the site editor (epic `mockup` P6):  what it must let people do
  siteStories: "Stories",
  siteStoriesCount: "{done} of {count} stories",
  siteStoriesNone: "No stories yet:  what must this page let people do?",
  siteStoriesElsewhere: "{name} is another project's page:\nits stories are written there",
  siteAddStory: "Add a story",
  siteNewStory: "As a …, I want …, so that …\n\n\nIts description, after two blank lines",
  siteStoryDone: "Done",
  siteStoryMove: "Drag to move this story, or use the arrow keys",
  siteStoryRemove: "Delete this story.\nHold Option to delete it without being asked first.",
  siteStoryConfirmRemove: "Delete this story?",
  siteChangeStories: "Change {name}'s stories",
  // the site's data, in the site editor's Data tab (epic `mockup` P11):  a NERD, its boxes turning over to their ERD
  siteTabPages: "Pages",
  siteTabData: "Data",
  siteDataLoading: "Reading the site's places…",
  siteDataNone:
    "This site reads no place described by spell place ingest:\nits project file lists none under development.apis.",
  siteDataHint:
    "Click a box to turn it over and see everything it holds, and to change its sample rows.\nDrag a box to move it.",
  siteDataColumns: "Columns",
  siteDataErdTitle: "{box}:  every field",
  siteDataTurnBack: "Turn back",
  siteDataId: "id",
  siteDataSamples: "{box}:  sample rows",
  siteDataStartAgain: "Start again",
  siteDataReference: "Reference",
  siteDataReferenceTip: "Every list, field and change this place has, and which ones were tried",
  inspectorNotSavedCode: "Your program works this out for itself, so a change here won't be kept.",
  inspectorNotSavedRunning: "The app sets this as it runs, so this change won't be saved.",
  inspectorShowCode: "Show the code",
  inspectorNotSavedNoStart: "A change here won't be saved.",
  inspectorNotSavedTypeSets: "Every one of the {types} starts with this.\nTo change it, pick All {types} first.",
  inspectorUnsavedAuto: "Spell makes this for you, so a change here can't be kept.",
  inspectorAllFromCode: "Each {type} gets these from the code that makes it.",
  inspectorScopeThese: "These {count} {Types}",
  inspectorUnsavedSomeAuto: "Spell makes some of these for you, so those can't be changed.",
  inspectorSelectedMany: "{count} {kind}",
  inspectorSelectedParts: "{count} parts",
  inspectorNothingShared: "These have no fields in common.",
  inspectorScopeAll: "All {Types}",
  inspectorScopeLabel: "What a change applies to",
  inspectorOriginHere: "Set here",
  inspectorOriginNotSet: "Nothing in your program sets this",
  inspectorOriginDefaults: "The usual value for this kind of part, set in {file}",
  inspectorOriginType: "From {type}",
  inspectorOriginAll: "The starting value of every {type}",
  inspectorOriginLine: "Comes from the line that makes it",
  inspectorOriginCode: "Your program works this out",
  inspectorOriginNoStart: "The code gives this no starting value",
  inspectorDataReal: "Real data · {place}",
  inspectorDataSample: "Sample · {place}",
  inspectorDataReadOnly: "Read only · {place}",
  inspectorDataWorkedOut: "From {places}",
  inspectorDataFrom:
    "This is real data, kept in {place} with its other {collection}.\nA change here is saved there too.",
  inspectorDataFromSample:
    "This is made-up sample data standing in for {place}.\nA change here stays on this computer and never reaches it.",
  inspectorDataWhyNotPlace: "Read only:  {place} takes no changes.",
  inspectorDataWhyNotOwner: "Read only:  this isn't yours to change in {place}.",
  inspectorDataWhyNotField: "Read only:  {place} doesn't let this field change.",
  inspectorDataWhyNotRole: "Read only:  your role in {place} can't change this.",
  inspectorDataWhyNotTakenDown: "Read only:  Spell took this down in {place}.",
  inspectorDataWhyNotFull: "Full:  {place} has no place left for this.",
  inspectorDataWhyNotNotListed: "Read only:  only the people {place} lists sign up here.",
  inspectorDataWhyNotUsedUp: "Used up:\nyou've asked {place} for every invitation you have.",
  inspectorDataWhyNotSignedOut: "Read only:\nyou're not signed in to {place}.  Sign in to change this.",
  inspectorDataWorkedOutFrom: "Worked out from what it reads in {places}:\nchange those instead.",
  inspectorDataSourceReal: "Real data, kept in {place}:\nwhat you change here is saved there.",
  inspectorDataSourceReadOnly:
    "This is kept in {place}, which doesn't let you change it from here.\nUse a sample to try changes.",
  inspectorDataSourceSample: "Sample data for {place}:\nnothing you change here reaches it.",
  inspectorDataUseSample: "Use a sample",
  inspectorDataChanges: "Change Data",
  sampleStartOver: "Start over",
  sampleMadeUp: "Made-up records",
  sampleInUse: "Showing sample data for {places}:\nnothing you change reaches the real data.",
  useRealData: "Use the real data",
  find: "Find",
  compiledCode: "Compiled Code",
  programPanel: "Program Panel",
  inspectApp: "Inspect App",
  stopInspecting: "Stop Inspecting",
  inspectHelp:
    "Click a part of your app to see what it is.\nAlt-click picks a part inside it.\nHold Shift or ⌘ to pick several, or drag across an empty spot.\nPress Esc when you're done.",
  inspectHelpClose: "Close",
  // Anatomy (epic `editor` P34):  the running app pulled apart into layers, in 3D;  its switch, then its bar
  anatomy: "Anatomy",
  anatomyTip: "Spread the app out in 3D, each part of it on a layer of its own",
  anatomyStopTip: "Put the app back together",
  // the whole app, the breadcrumbs' first:  "Solitaire in 3D"
  anatomyWholeApp: "{app} in 3D",
  // what a click does while it shows:  plays the app, or picks a layer (T117)
  anatomyClicks: "What a click does",
  anatomyPlay: "Play",
  anatomyPlayTip:
    "Clicks and drags go to your app, so you can play it in 3D.\nDrag anywhere else to turn it.\nHold Option to pick a layer instead.",
  anatomyInspect: "Inspect",
  anatomyInspectTip: "A click picks a layer, and a drag turns it.\nHold Option to play your app instead.",
  anatomyFront: "Front",
  anatomyFrontTip: "Look at it straight on again",
  anatomySpacing: "Spacing",
  // what it shows as layers (I257, T118, T121):  your views, the same with their names, or empty frames of them
  anatomyShows: "What to show",
  anatomyViews: "Views",
  anatomyViewsTip: "A layer for each view your app draws",
  anatomyNamed: "Named",
  anatomyNamedTip: "A layer for each view your app draws, with its name",
  anatomyOutlines: "Outlines",
  anatomyOutlinesTip: "Draw each view as an empty frame instead of showing what's on it",
  // over the 3D view in the full window (I260)
  anatomyEscToClose: "Esc to close",
  anatomyFullWindow: "Full window",
  anatomyFullWindowTip: "Show the layers over the whole editor",
  anatomyClose: "Close",
  // a layer's tag, when its look cuts off what's inside it, so nothing inside comes apart from it
  anatomyFlat: "in one piece",
  anatomyFlatTip: "This part hides anything past its edges, so what's inside it can't come apart from it",
  anatomyFocusShortcut: "Show the selected layer alone",
  anatomyBackShortcut: "Go back out of Anatomy",
  shortcutsWhileAnatomy: "Only while Anatomy shows",
  anatomyHelp:
    "Anatomy pulls your app apart into layers, one for each view it draws.\nDrag to turn it. Scroll to zoom. Click a layer to pick it, or double-click to show it alone.\nHold Option to play the app as usual. Press Esc to go back.",
  notSaved: "Not saved",

  ////////////////
  // ## The editor's panes:  their menus, and what they say while empty
  ////////////////

  appMenu: "App",
  programOutput: "Output",
  spellTree: "Spell Tree",
  spellTreeHint: "Click a line of your program to see how Spell reads it.",
  loadingEditor: "Loading editor…",
  errorContext: "Context:",
  errorParams: "Params:",
  error: "Error",

  consoleCompiling: "Compiling",
  consoleCompiledTo: "Compiled to javascript:",
  consoleExecuting: "Executing {type}",
  consoleFailed: "{Type} failed with error:",
  inspectorWrittenAt: "Written in {file}, line {line}",
  inspectorWrittenAtShared: "Written in {file}, line {line}:\n{count} of these come from this one place",
  consoleExecuted: "{Type} executed without errors.",
  testResults: "Tests:  {passed} passed, {failed} failed",
  noTests: "No tests -- write one as `to test <something>:`",

  // the Spell Console's line (epic `editor` P32)
  consoleInputLabel: "A line of Spell to run in your app",
  consolePlaceholder: "Type a line of Spell, then press Return to run it in your app",
  consoleLineNotRead: "Spell can't read that line.\nCheck its words, or try a shorter line.",
  consoleLineNotRun:
    "Nothing happened.  That line doesn't ask your app to do anything.\nTry a line that changes something, or asks for a value.",

  // Explain This, on the code's right-click menu (epic `editor` P32, Q39)
  explainThis: "Explain This",
  explainThisCode: "Your code",
  explainThisWords: "What it does",
  explainThisAsking: "Asking Claude for a summary…",
  explainThisLineByLine: "Line by line",
  explainThisNoWords: "Spell has no notes for this code.",
  explainThisClose: "Close",

  ////////////////
  // ## The project chooser (`ProjectChooser.tsx`)
  ////////////////

  welcome: "Welcome to Spell!",
  openGroup: "Open {Type}",
  createNewProject: "Create a New App",
  createNewExample: "Create a New Example",
  createNewGuide: "Create a New Guide",
  loadingGroup: "Loading...",
  couldNotLoadGroup: "Couldn't load {title}",
  nothingInGroup: "No {title} yet!",

  ////////////////
  // ## The landing page (`ProjectChooser.tsx`), and the editor's top bar (`EditorTheme.tsx`)
  ////////////////

  appName: "Spell",
  notebooksAppName: "Spell Notebooks",
  tabTitle: "{project} • Spell",
  notebookTabTitle: "{project} • Spell Notebook",
  homeEyebrow: "Spell, in preview",
  homeTitle: "Programs you can read out loud.",
  homeTagline: "Plain words in.  A working app out.",
  homeIntro:
    "With Spell, an app is written in plain sentences.\nOpen an example, change a sentence, and watch the app change beside it.",
  tryAnExample: "Try an example",
  readFirstSpell: "Read your first spell",
  homeExampleCaption: "From Solitaire's Card.spell",
  homeExampleAlt:
    "A playing card, in Spell:  a card is a draggable two sided view;  its rank is one of ace, 2 ... 10, jack, queen, king;  its suit is one of clubs, diamonds, hearts or spades;  its color is red or black;  it is a face card if its rank is jack, queen or king;  it is a number card if it is not a face card",
  homeExamplesLine: "Open one, change it, make it yours.",
  homeGuidesLine: "Your idea, your pace.",
  homeLibraryLine:
    "Apps for an org:\nits Admin page, chat, feed, inbox and events.\nOpen one, change it, give it to your own org.",
  homeProjectsLine: "What you've made, and where to start the next one.",
  homeOrgLine: "For everyone at @{org}.",
  editorPieceBroken:
    "The editor's {piece} doesn't compile, so the editor runs the last one that did.\nFix it and publish again:\n{problem}",
  editorNameNeeded:
    "The editor fills `{name}` itself.\nRenaming it stops the editor from working.\nKeep this name, or ask Claude to rename it in the editor's code too.",
  editorNamesMissing:
    "The editor's Spell is missing names the editor fills itself:\n{names}\nWhat needs them won't show or work.\nPut them back in SpellEditor.spell, or ask Claude to rename them in the editor's code too.",
  editorNameOfType: "`{name}`, of `{type}`",
  editorTypeName: "`{type}`, the whole type",
  editorZonesWaiting: "Each of the editor's parts shows here, in a zone of its own, once its Spell runs.",
  editorZonesShow: "Show",
  editorZonesStandIn: "The editor's own:  {part}",
  editorZonesCancel: "Cancel",
  homeEditorLine: "The editor's own pieces, in Spell:\nchange one, publish it, and the editor you're using changes.",
  homeNoGuides: "Guides are on their way.",
  // the section of the projects written in Spanish:  in Spanish whatever the editor's language (epic `mockup` I46)
  homeSpanishTitle: "En español",
  homeSpanishLine: "Ejemplos y guías escritos en español.",
  homeSpellUILine: "The buttons, menus and other parts your apps are made of.",
  homeRearrange: "Rearrange Home Screen",
  homeRearrangeDone: "Done",
  homeRearrangeReset: "Reset to Default",
  homeRearrangeEveryone:
    "Drag cards and sections to move them;  click a title or a line to change it.\nWhat you change here, everyone sees.",
  homeRearrangeYours:
    "Drag cards and sections to move them;  click a title or a line to change it.\nOnly you see what you change here.",
  homeTextClickToChange: "Click to change it",
  homeTextTooLong: "Longer than a card shows whole:  {limit} characters",
  homeCardTitle: "Title",
  homeCardTagline: "Tagline",
  homeSectionHeader: "Header",
  homeSectionLine: "Line",
  homeSpanishExamples: "Ejemplos",
  homeSpanishGuides: "Guías",

  ////////////////
  // ## Project groups:  each group's words, by its `type` (spaces' `PROJECT_GROUPS`)
  ////////////////

  "type.project": "app",
  "Type.project": "App",
  "theType.project": "the app",
  "title.project": "Apps",
  "description.project": "Your own apps",
  "type.example": "example",
  "Type.example": "Example",
  "theType.example": "the example",
  "title.example": "Examples",
  "description.example": "Example apps",
  "type.guide": "guide",
  "Type.guide": "Guide",
  "theType.guide": "the guide",
  "title.guide": "Guides",
  "description.guide": "Step-by-step guides to Spell",
  "type.site": "site",
  "Type.site": "Site",
  "theType.site": "the site",
  "title.site": "Sites",
  "description.site": "Sites of Spell's own, mapped page by page",
  "type.library": "library",
  "Type.library": "Library",
  "theType.library": "the library",
  "title.library": "Libraries",
  "description.library":
    "Parts other apps can use, like a list of people.  An app names the ones it uses in its project file.",
  "type.piece": "piece",
  "Type.piece": "Piece",
  "theType.piece": "the piece",
  "title.piece": "The editor",
  "description.piece": "The editor's own pieces in Spell:  its panes, top bar, menus and file tabs",
  "type.fixture": "fixture",
  "Type.fixture": "Fixture",
  "theType.fixture": "the fixture",
  "title.fixture": "Test fixtures",
  "description.fixture": "Frozen apps tests run against -- edit one, then `yarn spell:test:fixtures:bless`",

  ////////////////
  // ## Notices and errors (`editor.ts`)
  ////////////////

  pathInvalid: "Path '{path}' is invalid!",
  askNewAppName: "Name for the new {type}?",
  askRenameApp: "New name for the {type}?",
  askNewFileName: "Name for the new file?",
  askRenameFile: "New name for the file?",
  confirmRemoveApp: "Really remove {type} '{name}'?",
  confirmRemoveFile: "Really remove file '{name}'?",
  createdApp: "Created {type} {name}.",
  duplicatedApp: "{Type} duplicated.",
  renamedApp: "{Type} renamed.",
  removedApp: "{Type} removed.",
  resetAppConfirm: "Forget your changes to {theType}, and show it as it was?",
  fileCreated: "File created.",
  fileDuplicated: "File duplicated.",
  fileRenamed: "File renamed.",
  fileRemoved: "File removed.",
  noTypesYet: "{Type} {name} has no templates yet:  compile it first.",
  noSuchType: "{Type} {name} has no template `{typeName}`.",
  propertyEditorHeader: "New Property Editor",
  propertyEditorMessage: "Make a property editor for which template?",
  create: "Create",

  ////////////////
  // ## The Type Explorer (`TypeExplorer.tsx`, `ScopeDetailsPane.tsx`)
  ////////////////

  scopes: "Scopes",
  refreshScopes: "Refresh the scopes",
  runToSeeScopes: "Run the app to see its scopes.",
  details: "Details",
  orderDocument: "Document order, under their headings",
  orderAlphabetical: "Alphabetical",
  loading: "Loading…",
  members: "Members",
  spell: "Spell",
  showWhereDefined: "Show the line that makes this",
  rules: "Rules",
  compiledOutput: "Compiled Output",
  clickToEdit: "Click to edit",
  addDescription: "Add a description…",
  // each group of a type's members, by its label (`LSP.SCOPE_MEMBER_GROUPS`)
  "members.Types": "Templates",
  "members.Properties": "Properties",
  "members.Actions": "Actions",
  "members.Constants": "Constants",
  "members.Functions": "Functions",
  "members.Variables": "Variables",

  ////////////////
  // ## The Thing Explorer (`ThingExplorer.tsx`)
  ////////////////

  things: "Things",
  runToSeeThings: "Run the app to see its things.",
  topLevel: "Top level",
  allThings: "All things",
  selectThing: "Select a thing to see its properties.",
  properties: "Properties",
  actions: "Actions",
  empty: "empty",
  list: "list",
  thing: "thing",
  computed: "computed",
  action: "action",
  listOf: "{type} of {count}",
  doIt: "Do it:  {action}()",
  thingsInOrderMade: "In the order they were made",
  thingsByType: "By template, sub-templates included",
  // the Program panel's tabs (`<ProgramPanel>`);  the languages' names are the compiled code's tabs (`LANGUAGE_LOOKS`)
  outputTab: "Debug Output",
  typescriptTab: "TypeScript",
  pythonTab: "Python",
  // a .spell file's code spell, the text it reads as (epic `elemental-spell` P8)
  inspector: "Inspector",
  inspectorInspect: "Inspect app",
  inspectorTip: "Click the crosshairs, then click a part of your app to see what it is and change it.",
  inspectorInspecting:
    "Click a part of your app to pick it.\nAlt-click picks a part inside it.\nHold Shift or ⌘ to pick several, or drag across an empty spot.\nPress Esc when you're done.",
  inspectorText: "Text",
  inspectorBuiltIn: "Built in",
  inspectorItems: "Its {count} items",
  // the properties card's sections, a Spell UI attribute group each (`E.ATTRIBUTE_GROUPS`)
  "inspectorGroup.name": "Name",
  "inspectorGroup.content": "Content",
  "inspectorGroup.appearance": "Appearance",
  "inspectorGroup.layout": "Layout",
  "inspectorGroup.states": "States",
  "inspectorGroup.form": "Form",
  "inspectorGroup.link": "Link",
  "inspectorGroup.behaviour": "Behaviour",
  "inspectorGroup.advanced": "Advanced",
  inspectorNone: "none",
  // the Inspector's Code card:  a part's events, abilities and actions, each with its code (`<CodeCard>`)
  inspectorCode: "Code",
  inspectorCodeNone: "No code yet.\nAdd Event or Add Action to start.",
  // a type's cards, while All Cards edits it (`TYPE_PANES`):  its events and abilities, its actions, its tests
  inspectorEvents: "Events",
  inspectorActions: "Actions",
  inspectorTests: "Tests",
  // the Tests card:  run them, and how each went
  inspectorRunTests: "Run the tests",
  inspectorTestPassed: "Passed",
  inspectorTestFailed: "Failed",
  inspectorTestsNone: "No tests yet.",
  // the theme editor's page (`<ThemeEditorPage>`), and the palette menu's way there
  editTheme: "Edit theme…",
  // the project menu's Theme ›, at its foot:  each opens in a new window
  openThemeEditor: "Edit Theme",
  openThemeBench: "Theme Bench",
  // the pages it previews while it's worked on (`BenchPages`, in development)
  "themePage.app": "App",
  "themePage.epic": "Epic page",
  "themePage.ui": "Spell UI",
  "themePage.notebook": "Notebook",
  // an event's heading over its code (Owen:  "make label `on click`")
  inspectorEventHeading: "on {event}",
  // a dimmed action's tooltip:  `{condition}` is its `enabled when`, in its own words
  inspectorActionOnlyWhen: "Only when {condition}",
  // ... its `disabled when`
  inspectorActionNotWhen: "Not when {condition}",
  inspectorActionNotNow: "Can't be done now",
  // an action's run button's tip:  `{action}` is its words, `play it`
  inspectorActionRun: "Run {action}",
  inspectorActionRename: "Rename {action}",
  renameAction: "Rename {action} to {newName}",
  renameActionEmpty: "An action needs a name:\n{action} keeps its own.",
  // a name another member has, the field's line under it (I139:  Owen's punctuation, the period inside the quotes)
  renameActionTakenByAction: 'There is already an action named "{newName}."',
  renameActionTakenByProperty: 'There is already a property named "{newName}."',
  // the line under a refused name:  `{restore}` is the link, `renameActionRestoreLink`, which puts `{oldName}` back
  renameActionRestore: '{restore} "{oldName}"',
  renameActionRestoreLink: "Restore",
  renameActionRestoreTip: "Put {oldName} back in the field",
  renameActionNotWords: "{newName} can't be an action's name:\nuse letters, numbers, spaces and dashes.",
  renameActionNotAction:
    "{action} can't be renamed here:\nonly an action of the program's own that takes nothing else.",
  renameActionCallsDiffer: "{action} is called in other words somewhere:\nrenaming it would leave that behind.",
  // the code's Rename Symbol (F2) where nothing can be renamed, and what can (I147)
  renameNothingHere:
    "Nothing here can be renamed.\nWhat can:\nan action of the program's own that takes nothing,\na property, a type or a name written the same everywhere.",
  // F2's new name refused, for a property, a type or a name
  renameRefused:
    "{oldName} can't be renamed {newName}:\nuse letters, numbers and dashes,\nand a name nothing else has.",
  inspectorExpandAll: "Expand all",
  inspectorCollapseAll: "Collapse all",
  // the phone's sheet (`<InspectorSheetBar>`)
  inspectorSheetHandle: "Drag to make it taller or shorter;  down, to put it away",
  inspectorSheetClose: "Put the Inspector away",
  // the Inspector card's Close, right of Inspect app:  hides the column (I186)
  inspectorSpellUIDocs: "Spell UI docs for <{tag}>",
  inspectorClose: "Close the Inspector",
  inspectorAddEvent: "Add Event",
  inspectorAddAction: "Add Action",
  // a Code card row's ✕ (`<RemoveEventButton>`, epic `editor` T73):  its tooltip and undo step, then what it asks
  inspectorRemoveEvent: "Remove {event}",
  inspectorRemoveEventConfirm: 'Remove "{event}"?\nIts code goes with it.\n⌥-click the ✕ to remove without asking.',
  inspectorRemoveEventOk: "Remove",
  inspectorParts: "Views",
  inspectorDivider: "Divider",
  inspectorFilter: "Filter",
  // a row of what the app holds but doesn't draw:  its tooltip (T96)
  inspectorHidden: "Not drawn:  hidden, or drawn by no tag",
  inspectorNoParts: "Run the app to see its parts.",
  // the Views card's sort (`<InspectorViews>`)
  inspectorSort: "Sort",
  inspectorSortDocument: "In document order",
  inspectorSortName: "By name",
  inspectorSortType: "By type",
  // an event's name, for people (`<EventsBand>`):  "event.<the DOM event>"
  "event.click": "click",
  "event.dblclick": "double click",
  "event.mousedown": "mouse down",
  "event.mouseup": "mouse up",
  "event.mouseenter": "mouse enter",
  "event.mouseleave": "mouse leave",
  "event.focus": "focus",
  "event.blur": "blur",
  "event.keydown": "key down",
  "event.keyup": "key up",
  closeProgram: "Close the Program panel",
  codeOutputHeader: "Compiled code",
  // the top bar's compiled-code button's tooltip, its language's (`<CompiledCodeButton>`)
  compiledJavaScript: "Compiled JavaScript",
  compiledTypeScript: "Compiled TypeScript",
  compiledPython: "Compiled Python",
  codeOutputClose: "Hide the compiled code",
  referenceTab: "Spell Reference",
  // the Reference tab (`<SpellReference>`):  what you can use
  referenceSpell: "Spell",
  referenceNothing: "Pick something to see what it is.",
  referenceShowInCode: "Show in code",
  referenceSearch: "Search the reference",
  // a thing a property holds, with no comment of its own:  `a Deck of playing cards named "deck"`,
  // `more` its type's description after its own words (`of playing cards`), or nothing
  referenceInstance: '{aType}{more} named "{name}"',
  thisApp: "This app",
  thisPage: "This page",
  paletteNewView: "View",
  paletteNewViewTip:
    "A new piece of this page, with a name of its own.\nWrite that name further down the page to show it there.",
  javascriptTab: "JavaScript",
  treeTab: "Sentence",

  ////////////////
  // ## The runners (`SpellAppRunner.tsx`, `VSCodeRunner.tsx`)
  ////////////////

  typeExplorer: "Template Explorer",
  thingExplorer: "Thing Explorer",
  console: "Console",
  debug: "Debug",
  showConsole: "Show Console",
  hideConsole: "Hide Console",

  ////////////////
  // ## `<spell-editor>`'s pane (`SpellEditorPane.tsx`, `SpellEditor.tsx`)
  ////////////////

  editedSinceSaved: "Edited since it was saved",
  editorKeys: "⌘S save · ⌘↵ run",
  editorKeysNoSave: "⌘↵ run",
  compiling: "Compiling…",
  compiled: "Compiled",
  saved: "Saved",
  parseError: "{count} parse error -- not run",
  parseErrors: "{count} parse errors -- not run",
  compileAndRun: "Compile and run",

  ////////////////
  // ## The "You" panel (`YouPanel.tsx`)
  ////////////////

  youHeader: "You:  {address}",
  fileProblems: "Your file has problems:  read anyway",
  names: "Name",
  nickname: "Nickname",
  emails: "Your email address(es), one per line",
  dates: "Dates",
  dateWhat: "What",
  dateDay: "Day",
  dateRemove: "Remove",
  datePlaceholder: "birthday",
  addDate: "Add a date",
  yourOrgs: "Your orgs",
  noneYet: "None yet.",

  ////////////////
  // ## The name page (`NamePage.tsx`):  who's at this machine, asked on its first start
  ////////////////

  nameHeading: "Welcome to Spell",
  nameLine: "Who's here?\nYour projects go in a space with your name,\nin {org}'s spaces on this machine.",
  yourName: "Your name",
  nameTaken: "{address} already has a space here:  that's you?",
  nameNeeded: "Type a name with a letter in it.",
  nameStart: "Start",

  ////////////////
  // ## A project's settings (`ProjectSettings.tsx`)
  ////////////////

  projectSettings: "{title} settings",
  projectSettingsHeading: "Project Settings",
  titleTip: "Your app's name, as people see it:\nin your list of apps, and at the top of the editor.",
  versionTip:
    "Which version of your app this is:\nthree numbers with dots, like 1.2.0.\nRaise it when you change the app, so other apps that use yours can tell which one they have.",
  targetsLabel: "Also compiles to",
  targetsTip:
    "Spell turns your app into JavaScript, the language web browsers run, every time.\nPick a language here to get a copy of your app in it too.",
  listsStartAtLabel: "Lists start at",
  listsStartAtTip:
    "How your lists number their items.\nAt 1, the first item is number 1, the way people count.\nAt 0, it's number 0, the way JavaScript and Python count.",

  ////////////////
  // ## The code editor's own words:  CodeMirror's (`CodeMirrorSetup`'s table), and its menu's
  ////////////////

  // find and replace
  cmFind: "Find",
  cmReplace: "Replace",
  cmNext: "next",
  cmPrevious: "previous",
  cmAll: "all",
  cmMatchCase: "match case",
  cmRegexp: "regexp",
  cmByWord: "by word",
  cmReplaceOne: "replace",
  cmReplaceAll: "replace all",
  cmClose: "close",
  cmCurrentMatch: "current match",
  cmOnLine: "on line",
  // `$`:  the number CodeMirror fills in
  cmReplacedMatchOnLine: "replaced match on line $",
  cmReplacedMatches: "replaced $ matches",
  // the find bar's (`CodeMirrorFind`):  `$` its key;  `$1 of $2`, the match and how many
  cmFindMatchCase: "Match Case ($)",
  cmFindWholeWord: "Match Whole Word ($)",
  cmFindRegexp: "Use Regular Expression ($)",
  cmFindPrevious: "Previous Match ($)",
  cmFindNext: "Next Match ($)",
  cmFindClose: "Close ($)",
  cmFindToggleReplace: "Toggle Replace",
  cmFindReplace: "Replace ($)",
  cmFindReplaceAll: "Replace All ($)",
  cmFindNoResults: "No results",
  cmFindCount: "$1 of $2",
  cmGoToLine: "Go to line",
  cmGo: "go",
  // folds
  cmFoldedLines: "Folded lines",
  cmUnfoldedLines: "Unfolded lines",
  cmFoldLine: "Fold line",
  cmUnfoldLine: "Unfold line",
  cmFoldedCode: "folded code",
  cmUnfold: "unfold",
  cmTo: "to",
  // suggestions and problems
  cmCompletions: "Completions",
  cmDiagnostics: "Problems",
  cmNoDiagnostics: "No problems",
  // the merge view:  its arrow takes their side's change into yours
  cmRevertChunk: "Use their version",
  cmAccept: "Accept",
  cmReject: "Reject",
  cmUnchangedLines: "$ unchanged lines",
  // the editor's own
  cmControlCharacter: "Control character",
  cmSelectionDeleted: "Selection deleted",
  // its right-click menu's rows
  cmGoToDefinition: "Go to Definition",
  cmGoToTypeDefinition: "Go to Type Definition",
  cmFindReferences: "Find All References",
  cmRenameSymbol: "Rename Symbol",
  // its list of a thing's uses:  `{file}`, a file's name;  `{line}`, a line's number
  cmReferenceAt: "{file}:{line}",
  cmNoReferences: "No uses found",
  cmReferences: "Uses",
  cmFindMenu: "Find…",
  // the peek box under the code (`CodeMirrorPeek`):  its menu rows, its head, its ✕;  `{count}`, how many uses
  cmPeekDefinition: "Peek Definition",
  cmPeekReferences: "Peek References",
  cmPeekDefinitionHead: "Definition",
  cmPeekUses: "{count} uses",
  cmPeekClose: "Close (Esc)",
  // a web address in the code, its tip on a plain hover (`CodeEditorFeatures.linkTip()`)
  codeLinkTipMac: "⌘-click to open",
  codeLinkTip: "Ctrl-click to open",

  ////////////////
  // ## The sound picker (`ValuePopups`, epic `mockup` P28):  "Pick a sound…" in `play "|"`
  ////////////////

  soundPicker: "Sounds",
  soundPickerHint: "Click ▶ to hear a sound.\nClick its name to use it.",
  soundListen: "Hear \u201c{sound}\u201d",
  soundKindInterface: "Clicks and switches",
  soundKindCards: "Cards",
  soundKindCasino: "Dice, chips and coins",
  soundKindPieces: "Board pieces",
  soundKindImpacts: "Knocks and hits",
  soundKindFootsteps: "Footsteps",
  soundKindThings: "Doors, books and things",
  soundKindDigital: "Beeps and zaps",
  soundKindJingles: "Short tunes",

  // the step debugger (`<Debugger>`, epic `editor` P33):  its bar's buttons, each said in full on hover
  debugContinue: "Continue:  run on to the next red dot",
  debugStepOver: "Step Over:  run this line, then pause on the next",
  debugStepInto: "Step Into:  go inside the action this line runs",
  debugStepOut: "Step Out:  finish this action, then pause on the line that ran it",
  debugStop: "Stop Debugging:  let the app run as usual, past the red dots",
  // what it says while the app runs, and where it's paused:  `{line}`, a line's number;  `{file}`, its file's name
  debugRunning:
    "Debugging:  the app pauses on a line with a red dot in the code's left margin.\nClick in the margin to add a dot;  click a dot to take it away.",
  debugStoppedAt: "Paused on line {line} of {file}.\nThe app waits:  press a button above to go on.",
  // its cards:  the thing the action is on, what it was given, what its lines have set, the actions that ran it
  debugThing: "The thing it's about",
  debugInputs: "What it was given",
  debugValues: "What it has set so far",
  debugCalledFrom: "How it got here",
  debugNothing: "Nothing yet",
  // a value it can't show as text:  `{type}`, its kind
  debugValueOf: "a {type}"
} as const

/** Key of one of the editor's texts, e.g. `"save"`. */
export type AppTextKey = keyof typeof APP_TEXTS

/** One language's editor texts:  EVERY key, so a missing translation is a type error. */
export type AppTextPack = Readonly<Record<AppTextKey, string>>
