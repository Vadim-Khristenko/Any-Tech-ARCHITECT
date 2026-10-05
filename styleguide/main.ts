/**
 * The kit's own entry point.
 *
 * Deliberately separate from `src/main.ts`: this loads the tokens and the kit
 * and nothing else — no router, no i18n, no engines. If a primitive needs the
 * application to be running before it looks right, that is a defect in the
 * primitive, and keeping the styleguide this thin is what surfaces it.
 */

import { createApp } from "vue";

import "@fontsource-variable/manrope/index.css";
import "@fontsource-variable/unbounded/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";

// Only the kit. If a primitive needs the old stylesheet to look right, that
// is a defect in the primitive, and importing nothing else is what shows it.
import "../assets/kit/index.css";

import KitView from "./KitView.vue";

createApp(KitView).mount("#kit");
