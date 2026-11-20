/**
 * The uploader family:  defines `<ui-uploader>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, and the elements it draws with:
 *   buttons, a segment, an input, a list of items, texts, progress bars, icons and a popup.
 * - Also the library's `spell/ui/ui-uploader` entry.
 */

import { UIUploader } from "./UIUploader"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-input"
import "spell/ui/components/ui-list"
import "spell/ui/components/ui-popup"
import "spell/ui/components/ui-progress"
import "spell/ui/components/ui-segment"
import "spell/ui/components/ui-text"

UIUploader.define()

export {
  UIUploader,
  DOMUploaderElement,
  DropZones,
  type Appearance as UploaderAppearance,
  type FileRow as UploaderFileRow,
  type UploadAction,
  type UploadStatus,
  type Via as UploadVia
} from "./UIUploader"
