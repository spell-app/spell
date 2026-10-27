import type { E } from "spell/ui/core"
import { UIButton } from "spell/ui/components/ui-button/UIButton"
import { UIButtons } from "spell/ui/components/ui-button/UIButtons"
import { UIOr } from "spell/ui/components/ui-button/UIOr"
import { UISegment } from "spell/ui/components/ui-segment/UISegment"
import { UISegments } from "spell/ui/components/ui-segment/UISegments"
import { UICard } from "spell/ui/components/ui-card/UICard"
import { UICards } from "spell/ui/components/ui-card/UICards"
import { UIContent } from "spell/ui/components/ui-parts/UIContent"
import { UIHeader } from "spell/ui/components/ui-parts/UIHeader"
import { UIMeta } from "spell/ui/components/ui-parts/UIMeta"
import { UIDescription } from "spell/ui/components/ui-parts/UIDescription"
import { UIExtra } from "spell/ui/components/ui-parts/UIExtra"
import { UITitle } from "spell/ui/components/ui-parts/UITitle"
import { UIActions } from "spell/ui/components/ui-parts/UIActions"
import { UIAuthor } from "spell/ui/components/ui-parts/UIAuthor"
import { UIAvatar } from "spell/ui/components/ui-parts/UIAvatar"
import { UIDate } from "spell/ui/components/ui-parts/UIDate"
import { UIDetail } from "spell/ui/components/ui-parts/UIDetail"
import { UISummary } from "spell/ui/components/ui-parts/UISummary"
import { UIValue } from "spell/ui/components/ui-parts/UIValue"
import { UIList } from "spell/ui/components/ui-list/UIList"
import { UIItem } from "spell/ui/components/ui-item/UIItem"
import { UISection } from "spell/ui/components/ui-section/UISection"
import { UIIcon } from "spell/ui/components/ui-icon/UIIcon"
import { UIIcons } from "spell/ui/components/ui-icon/UIIcons"
import { UILabel } from "spell/ui/components/ui-label/UILabel"
import { UILabels } from "spell/ui/components/ui-label/UILabels"
import { UIDivider } from "spell/ui/components/ui-divider/UIDivider"
import { UIImage } from "spell/ui/components/ui-image/UIImage"
import { UIImages } from "spell/ui/components/ui-image/UIImages"
import { UIText } from "spell/ui/components/ui-text/UIText"
import { UIFlag } from "spell/ui/components/ui-flag/UIFlag"
import { UIEmoji } from "spell/ui/components/ui-emoji/UIEmoji"
import { UILoader } from "spell/ui/components/ui-loader/UILoader"
import { UIPlaceholder } from "spell/ui/components/ui-placeholder/UIPlaceholder"
import { UIPlaceholderHeader } from "spell/ui/components/ui-placeholder/UIPlaceholderHeader"
import { UIPlaceholderImage } from "spell/ui/components/ui-placeholder/UIPlaceholderImage"
import { UIPlaceholderLine } from "spell/ui/components/ui-placeholder/UIPlaceholderLine"
import { UIPlaceholderParagraph } from "spell/ui/components/ui-placeholder/UIPlaceholderParagraph"
import { UIRail } from "spell/ui/components/ui-rail/UIRail"
import { UIAd } from "spell/ui/components/ui-ad/UIAd"
import { UIContainer } from "spell/ui/components/ui-container/UIContainer"
import { UIGrid } from "spell/ui/components/ui-grid/UIGrid"
import { UIRow } from "spell/ui/components/ui-grid/UIRow"
import { UIColumn } from "spell/ui/components/ui-grid/UIColumn"
import { UIStatistic } from "spell/ui/components/ui-statistic/UIStatistic"
import { UIStatistics } from "spell/ui/components/ui-statistic/UIStatistics"
import { UIStep } from "spell/ui/components/ui-step/UIStep"
import { UISteps } from "spell/ui/components/ui-step/UISteps"
import { UIBreadcrumbs } from "spell/ui/components/ui-breadcrumbs/UIBreadcrumbs"
import { UIBreadcrumb } from "spell/ui/components/ui-breadcrumbs/UIBreadcrumb"
import { UIMessage } from "spell/ui/components/ui-message/UIMessage"
import { UIProgress } from "spell/ui/components/ui-progress/UIProgress"
import { UINag } from "spell/ui/components/ui-nag/UINag"
import { UIEmbed } from "spell/ui/components/ui-embed/UIEmbed"
import { UIReveal } from "spell/ui/components/ui-reveal/UIReveal"
import { UISticky } from "spell/ui/components/ui-sticky/UISticky"
import { UITransition } from "spell/ui/components/ui-transition/UITransition"
import { UIVisibility } from "spell/ui/components/ui-visibility/UIVisibility"
import { UIForm } from "spell/ui/components/ui-form/UIForm"
import { UIField } from "spell/ui/components/ui-form/UIField"
import { UIFields } from "spell/ui/components/ui-form/UIFields"
import { UIInput } from "spell/ui/components/ui-input/UIInput"
import { UITextarea } from "spell/ui/components/ui-input/UITextarea"
import { UICheckbox } from "spell/ui/components/ui-checkbox/UICheckbox"
import { UIRadio } from "spell/ui/components/ui-checkbox/UIRadio"
import { UISelect } from "spell/ui/components/ui-select/UISelect"
import { UIDropdown } from "spell/ui/components/ui-dropdown/UIDropdown"
import { UISearch } from "spell/ui/components/ui-search/UISearch"
import { UISlider } from "spell/ui/components/ui-slider/UISlider"
import { UIRating } from "spell/ui/components/ui-rating/UIRating"
import { UICalendar } from "spell/ui/components/ui-calendar/UICalendar"
import { UIItems } from "spell/ui/components/ui-items/UIItems"
import { UIFeed } from "spell/ui/components/ui-feed/UIFeed"
import { UIFeedEvent } from "spell/ui/components/ui-feed/UIFeedEvent"
import { UIComment } from "spell/ui/components/ui-comment/UIComment"
import { UIComments } from "spell/ui/components/ui-comment/UIComments"
import { UIMenu } from "spell/ui/components/ui-menu/UIMenu"
import { UITable } from "spell/ui/components/ui-table/UITable"
import { UIRoot } from "spell/ui/components/ui-root/UIRoot"
import { UIAccordion } from "spell/ui/components/ui-accordion/UIAccordion"
import { UITab } from "spell/ui/components/ui-tab/UITab"
import { UITabs } from "spell/ui/components/ui-tab/UITabs"
import { UIModal } from "spell/ui/components/ui-modal/UIModal"
import { UIFlyout } from "spell/ui/components/ui-flyout/UIFlyout"
import { UIDimmer } from "spell/ui/components/ui-dimmer/UIDimmer"
import { UIPopup } from "spell/ui/components/ui-popup/UIPopup"
import { UISidebar } from "spell/ui/components/ui-sidebar/UISidebar"
import { UIPushable } from "spell/ui/components/ui-sidebar/UIPushable"
import { UIPusher } from "spell/ui/components/ui-sidebar/UIPusher"
import { UIToast } from "spell/ui/components/ui-toast/UIToast"
import { UIShape } from "spell/ui/components/ui-shape/UIShape"
import { UISide } from "spell/ui/components/ui-shape/UISide"

/****************
 * ### `StaticCatalog`
 * Every family the static render supports, as component classes:  `StaticRender.define(...StaticCatalog.classes)`.
 * - Imported from their own files, never a family's `index.ts` (it calls `customElements.define()`).
 * - Keep in step with `src/tools/visual/StaticFamilies.ts` (the visual tests' list);  `StaticCatalog.ssr.test.ts`
 *   checks it.
 * - Node only, like all of `spell/ui/static`:  it imports every family's classes;  NEVER imported by a component or `spell-ui`.
 * - Its own file, not a static on `StaticRender`, on purpose:  the engine stays free of family imports (it renders
 *   what it's given), and the list changes for a different reason (a family becoming server-ready) than the engine.
 ****************/
export class StaticCatalog {
  /** Component classes;  `define()` order doesn't matter.  Static:  ONE supported set per build, no instances. */
  static readonly classes: readonly E.UIComponentClass[] = [
    UIButton,
    UIButtons,
    UIOr,
    UISegment,
    UISegments,
    UICard,
    UICards,
    UIContent,
    UIHeader,
    UIMeta,
    UIDescription,
    UIExtra,
    UITitle,
    UIActions,
    UIAuthor,
    UIAvatar,
    UIDate,
    UIDetail,
    UISummary,
    UIValue,
    UIList,
    UIItem,
    UISection,
    UIIcon,
    UIIcons,
    UILabel,
    UILabels,
    UIDivider,
    UIImage,
    UIImages,
    UIText,
    UIFlag,
    UIEmoji,
    UILoader,
    UIPlaceholder,
    UIPlaceholderHeader,
    UIPlaceholderImage,
    UIPlaceholderLine,
    UIPlaceholderParagraph,
    UIRail,
    UIAd,
    UIContainer,
    UIGrid,
    UIRow,
    UIColumn,
    UIStatistic,
    UIStatistics,
    UIStep,
    UISteps,
    UIBreadcrumbs,
    UIBreadcrumb,
    UIMessage,
    UIProgress,
    UINag,
    UIEmbed,
    UIReveal,
    UISticky,
    UITransition,
    UIVisibility,
    UIForm,
    UIField,
    UIFields,
    UIInput,
    UITextarea,
    UICheckbox,
    UIRadio,
    UISelect,
    UIDropdown,
    UISearch,
    UISlider,
    UIRating,
    UICalendar,
    UIItems,
    UIFeed,
    UIFeedEvent,
    UIComment,
    UIComments,
    UIMenu,
    UITable,
    UIRoot,
    UIAccordion,
    UITab,
    UITabs,
    UIModal,
    UIFlyout,
    UIDimmer,
    UIPopup,
    UISidebar,
    UIPushable,
    UIPusher,
    UIToast,
    UIShape,
    UISide
  ]
}
