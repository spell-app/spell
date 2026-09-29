/**
 * Barrel + side-effect entry for the generic content parts:  defines all thirteen, `<ui-header>` first (it
 * owns `header` and `content`, so nested parts resolve on their first connect).
 * - NOTE: `OwnerStub` is left out:  demo / test stand-ins for owners that don't exist yet.
 */

import { PartElement } from "./PartElement"
import { UIHeader } from "./UIHeader"
import { UIContent } from "./UIContent"
import { UIDescription } from "./UIDescription"
import { UIMeta } from "./UIMeta"
import { UIExtra } from "./UIExtra"
import { UIActions } from "./UIActions"
import { UITitle } from "./UITitle"
import { UISummary } from "./UISummary"
import { UIDate } from "./UIDate"
import { UIAuthor } from "./UIAuthor"
import { UIAvatar } from "./UIAvatar"
import { UIDetail } from "./UIDetail"
import { UIValue } from "./UIValue"

export {
  PartElement,
  UIHeader,
  UIContent,
  UIDescription,
  UIMeta,
  UIExtra,
  UIActions,
  UITitle,
  UISummary,
  UIDate,
  UIAuthor,
  UIAvatar,
  UIDetail,
  UIValue
}

// SIDE EFFECT:  registration under the vocabulary tags
UIHeader.define()
UIContent.define()
UIDescription.define()
UIMeta.define()
UIExtra.define()
UIActions.define()
UITitle.define()
UISummary.define()
UIDate.define()
UIAuthor.define()
UIAvatar.define()
UIDetail.define()
UIValue.define()
