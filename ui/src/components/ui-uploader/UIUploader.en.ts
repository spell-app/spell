/**
 * The English vocabulary of `<ui-uploader>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/** What every file event carries, as TypeScript (`spell/ui/jsx` reads it). */
const FILE_DETAIL =
  "{ file: File, name: string, path: string, size: number, type: string, lastModified: number, " +
  'via: "dialog" | "drop" | "zone", reason?: string, entry?: FileSystemEntry, handle?: FileSystemHandle }'

/** What every folder event carries. */
const FOLDER_DETAIL =
  '{ name: string, path: string, files: File[], via: "dialog" | "drop" | "zone", reason?: string, ' +
  "entry?: FileSystemEntry, handle?: FileSystemHandle }"

/** What a drag carries:  while it goes on, a browser shows only how many there are, and their kinds. */
const DRAG_DETAIL = '{ count: number, kinds: string[], via: "drop" | "zone" }'

/****************
 * ### `uploaderVocabulary`
 * The names of `<ui-uploader>`:  takes files someone picks or drops, then posts them, or hands them to an action.
 ****************/
export const uploaderVocabulary = {
  tag: "ui-uploader",
  icon: "cloud upload",
  snippet: '<ui-uploader extensions="json" multiple></ui-uploader>',
  topics: ["forms", "inputs", "controls", "progress"],
  aka: [
    "file upload",
    "file uploader",
    "upload",
    "dropzone",
    "drop zone",
    "file drop",
    "file picker",
    "drag and drop",
    "attachment"
  ],
  noun: "uploader",
  partOfSpeech: "action",
  description:
    "An uploader takes files someone picks or drops on it, or whole folders, " +
    "then posts them to its `destination`, or hands them to its `action`.",
  skeleton: "18 x 9",
  attributes: [
    {
      name: "appearance",
      group: "appearance",
      kind: "enum",
      values: ["hero", "button", "input", "compact"],
      default: "hero",
      description:
        "How it looks:  `hero` -- a big drop area with an icon, a line of help and a Choose files button, " +
        "a row per file under it;  `button` -- just a button, its files in a popup from it;  " +
        "`input` -- a form field with a Browse button, its files listed under it;  " +
        "`compact` -- a one-line drop area, one line of status and one progress bar.  " +
        "All four take the same attributes and send the same events."
    },
    {
      name: "destination",
      group: "behaviour",
      kind: "string",
      description:
        "A URL each file is posted to, as form data (`file`, its path as its file name), one request per file.  " +
        "`action` wins when both are set."
    },
    {
      name: "action",
      group: "behaviour",
      kind: "json",
      description:
        "A function called with the files kept, `(files: File[]) => unknown`, instead of posting them:  " +
        "in Spell, an action (`action={read the netlist}`).  Not a URL, as a form's `action` is:  that's `destination`."
    },
    {
      name: "extensions",
      group: "behaviour",
      kind: "string",
      description:
        "The kinds of file it takes, a comma list of extensions (`json, csv`);  any other is turned away.  " +
        "None:  any file."
    },
    {
      name: "multiple",
      group: "behaviour",
      kind: "boolean",
      description: "Takes more than one file at a time."
    },
    {
      name: "folder",
      group: "behaviour",
      kind: "boolean",
      description:
        "Takes folders instead of files, each with its files and their paths in it;  " +
        "its events are `ui-folder-*` for the drag and the folder itself, then `ui-file-dropped` for each file.  " +
        "A plain file dropped on it is turned away."
    },
    {
      name: "max-size",
      group: "behaviour",
      kind: "string",
      description: "The largest file it takes:  `2 MB`, `500 KB`, `1.5 GB`, or a number of bytes."
    },
    {
      name: "max-files",
      group: "behaviour",
      kind: "number",
      description: "The most files it takes in one go;  the rest are turned away."
    },
    {
      name: "drop-zone",
      group: "behaviour",
      kind: "json",
      description:
        "Where else a drop counts as a drop on it:  `page` -- anywhere on the page;  a selector (`#editor`, " +
        "`ui-section`), looked for first among the elements around it, then on the page;  " +
        "or, as a property, the element itself.  The zone shows `drop-message` while files are dragged over it."
    },
    {
      name: "message",
      group: "content",
      kind: "string",
      description:
        "Its line of help (`Drop .json files here, or`);  a `button` uploader's label.  " +
        "None:  its own, naming the kinds it takes.  The `message` slot wins over it."
    },
    {
      name: "drop-message",
      group: "content",
      kind: "string",
      description:
        "What it says while files are dragged over it:  `{count}` is how many.  None:  `Drop to add {count} files`."
    },
    {
      name: "uploading-message",
      group: "content",
      kind: "string",
      description:
        "What it says while it posts:  `{done}` is how many are done, `{count}` how many in all.  " +
        "None:  `Uploading {done} of {count}`."
    },
    {
      name: "done-message",
      group: "content",
      kind: "string",
      description: "What it says once they're all posted:  `{count}` is how many.  None:  `{count} files uploaded`."
    }
  ],
  events: [
    {
      name: "ui-file-dragged-over",
      detail: DRAG_DETAIL,
      description: "Files are dragged over it, or over its `drop-zone`:  how many, and their kinds."
    },
    {
      name: "ui-file-dragged-out",
      detail: DRAG_DETAIL,
      description: "The files dragged over it left without being dropped."
    },
    {
      name: "ui-folder-dragged-over",
      detail: DRAG_DETAIL,
      description:
        "With `folder`:  `ui-file-dragged-over`'s twin.  While dragging, a browser can't tell a folder from a file."
    },
    {
      name: "ui-folder-dragged-out",
      detail: DRAG_DETAIL,
      description: "With `folder`:  `ui-file-dragged-out`'s twin."
    },
    {
      name: "ui-file-dropping",
      cancelable: true,
      detail: FILE_DETAIL,
      description:
        "A file picked or dropped is about to be taken:  cancel it to leave it out.  " +
        "`reason` says why it'll be turned away, when it will be."
    },
    {
      name: "ui-file-dropped",
      detail: FILE_DETAIL,
      description:
        'A file was taken, kept or turned away (`reason`), the same for a pick (`via: "dialog"`) as for a drop.  ' +
        "`file.text()` reads it.  `entry` and `handle` are there when the browser gives them:  " +
        "an entry on any drop, a handle on a drop in Chrome and Edge."
    },
    {
      name: "ui-folder-dropping",
      cancelable: true,
      detail: FOLDER_DETAIL,
      description: "With `folder`:  a folder is about to be taken, with its files:  cancel it to leave it all out."
    },
    {
      name: "ui-folder-dropped",
      detail: FOLDER_DETAIL,
      description: "With `folder`:  a folder was taken;  a `ui-file-dropped` follows for each file in it."
    },
    {
      name: "ui-uploading",
      cancelable: true,
      detail: "{ files: File[] }",
      description:
        "The files kept are about to be posted to `destination`, or handed to `action`:  " +
        "cancel it to take the upload over, and nothing is posted or called."
    },
    {
      name: "ui-upload-progress",
      detail: "{ file: File, sent: number, size: number }",
      description: "While a file posts:  how many bytes have gone, of its size."
    },
    {
      name: "ui-uploaded",
      detail: "{ file: File, response: unknown }",
      description:
        "A file was posted:  `response` is the server's answer, as JSON when it says so, else text;  " +
        "with `action`, what the action returned."
    },
    {
      name: "ui-upload-failed",
      detail: "{ file: File, error: Error }",
      description: "A file couldn't be posted, or the `action` threw:  `error` says why."
    }
  ],
  slots: [
    { name: "icon", description: "Its icon, in place of its own cloud." },
    { name: "message", description: "Its line of help, in place of `message`." },
    {
      name: "button",
      description: "Its button (Choose files, Browse), in place of its own:  a click opens the file dialog."
    }
  ],
  parts: [
    { name: "drop-area", description: "The area files are dropped on:  the hero's and compact's dashed box." },
    { name: "button", description: "The button that opens the file dialog:  a `<ui-button>`." },
    { name: "input", description: 'With `appearance="input"`:  the field, a `<ui-input>`.' },
    { name: "files", description: "The list of files taken." },
    { name: "file", description: "A file's row." },
    { name: "name", description: "A file's name." },
    { name: "size", description: "A file's size." },
    { name: "progress", description: "A file's progress bar, a `<ui-progress>`;  compact's one bar for all." },
    { name: "status", description: "A file's status:  a tick, or the reason it failed;  compact's line of status." },
    { name: "remove", description: "A file's Remove button." },
    { name: "popup", description: 'With `appearance="button"`:  the popup of file rows, a `<ui-popup>`.' },
    { name: "zone", description: "The light overlay over its `drop-zone` while files are dragged over it." }
  ],
  states: [
    { name: "dragged-over", description: "Files are dragged over it, or its `drop-zone`." },
    { name: "uploading", description: "It's posting files, or its `action` is running." },
    { name: "hero", description: 'It\'s `appearance="hero"`.' },
    { name: "button", description: 'It\'s `appearance="button"`.' },
    { name: "input", description: 'It\'s `appearance="input"`.' },
    { name: "compact", description: 'It\'s `appearance="compact"`.' }
  ],
  texts: [
    {
      key: "message",
      text: "Drop {kinds} files here, or",
      description: "The hero's line of help:  `{kinds}`, `.json`."
    },
    { key: "messageAny", text: "Drop files here, or", description: "The hero's line of help, taking any file." },
    { key: "messageFolders", text: "Drop folders here, or", description: "The hero's line of help, with `folder`." },
    { key: "compactMessage", text: "Drop {kinds} files, or", description: "compact's line of help." },
    { key: "compactMessageAny", text: "Drop files, or", description: "compact's line of help, taking any file." },
    { key: "compactMessageFolders", text: "Drop folders, or", description: "compact's line of help, with `folder`." },
    { key: "buttonLabel", text: "Upload {kinds} files", description: "A `button` uploader's label." },
    { key: "buttonLabelAny", text: "Upload files", description: "A `button` uploader's label, taking any file." },
    { key: "buttonLabelFolders", text: "Upload folders", description: "A `button` uploader's label, with `folder`." },
    { key: "choose", text: "Choose files…", description: "The hero's button." },
    { key: "chooseFolders", text: "Choose folders…", description: "The hero's button, with `folder`." },
    { key: "chooseShort", text: "Choose", description: "compact's small button." },
    { key: "browse", text: "Browse…", description: "The `input` look's button." },
    { key: "noFiles", text: "No files chosen", description: "The `input` look's field, empty." },
    { key: "fileCount", text: "{count} files", description: "The `input` look's field:  how many files." },
    {
      key: "fileCountDone",
      text: "{count} files:  {done} uploaded",
      description: "The `input` look's field, once some are up."
    },
    { key: "dropMessage", text: "Drop to add {count} files", description: "While files are dragged over it." },
    { key: "dropMessageOne", text: "Drop to add 1 file", description: "While one file is dragged over it." },
    { key: "uploadingMessage", text: "Uploading {done} of {count}", description: "While it posts." },
    { key: "doneMessage", text: "{count} files uploaded", description: "Once they're all posted." },
    { key: "doneMessageOne", text: "1 file uploaded", description: "Once the one file is posted." },
    { key: "limitsFiles", text: "Up to {count} files", description: "Its limits:  the count." },
    {
      key: "limitsBoth",
      text: "Up to {count} files, {size} each",
      description: "Its limits:  the count and the size."
    },
    { key: "limitsSizeOnly", text: "Up to {size}", description: "Its limits:  the size alone." },
    { key: "turnedAway", text: "{count} turned away", description: "How many were turned away." },
    { key: "uploaded", text: "Uploaded", description: "A row's status, posted." },
    { key: "taken", text: "Done", description: "A row's status, handed to the `action`." },
    { key: "held", text: "Ready", description: "A row's status, held:  no `destination` or `action`." },
    { key: "uploading", text: "Uploading", description: "What a screen reader calls a row's progress bar." },
    { key: "failed", text: "Failed:  {reason}", description: "A row's status, failed." },
    { key: "serverError", text: "server error {status}", description: "Why a post failed:  the server's answer." },
    { key: "noConnection", text: "no connection", description: "Why a post failed:  nothing answered." },
    { key: "tooBig", text: "Too big (over {size})", description: "Why a file was turned away:  its size." },
    { key: "wrongKind", text: "Not a {kinds} file", description: "Why a file was turned away:  its kind." },
    { key: "tooMany", text: "Over {count} files", description: "Why a file was turned away:  the count." },
    {
      key: "oneOnly",
      text: "Only one at a time",
      description: "Why a second file was turned away, without `multiple`."
    },
    {
      key: "notAFolder",
      text: "Not a folder",
      description: "Why a plain file was turned away by a `folder` uploader."
    },
    { key: "aFolder", text: "A folder:  only files", description: "Why a folder was turned away by a plain uploader." },
    { key: "remove", text: "Remove", description: "A row's Remove button's name and tooltip." },
    { key: "files", text: "Files", description: "What a screen reader calls the list of files." }
  ]
} as const satisfies E.ComponentVocabulary
