/**
 * The family barrel, which DEFINES `<recipe-box>` and `<recipe-servers-bar>`.
 * - SIDE EFFECT:  importing it defines the tags.
 */

import { RecipeBox } from "./RecipeBox"
import { RecipeServersBar } from "./RecipeServersBar"

RecipeBox.define()
RecipeServersBar.define()

export { RecipeBox, RecipeServersBar }
