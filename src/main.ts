import { createApp } from "vue";
import App from "./App.vue";
import router, { prefetchRoutes } from "./router";

// Self-hosted variable fonts — bundled & served same-origin, so the UI no
// longer depends on fonts.gstatic.com being reachable (it is throttled/blocked
// for much of our RU/CIS audience). One woff2 per family, subset-gated by
// unicode-range; Vite hashes them and our _headers caches them immutably.
import "@fontsource-variable/manrope/index.css";
import "@fontsource-variable/unbounded/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";

// The token kit first: main.css reads its colours, and a sheet cannot use a
// variable that is defined after it in the cascade.
// The kit is the design: tokens, base elements, every primitive, the shell.
import "../assets/kit/index.css";
// What is left of the old stylesheet, for views not yet rewritten onto the
// kit. It shrinks with each one and eventually goes.
import "../assets/main.css";

// Tooltips render in one element on the body rather than as a pseudo-element
// on each trigger, so nothing that scrolls can clip them. See utils/tooltip.
import { installTooltips } from "./utils/tooltip";
import { initTheme } from "./composables/useTheme";

// Before the first paint: a reader who chose light should not see a dark
// frame first.
initTheme();

const app = createApp(App);
app.use(router);
app.mount("#app");
installTooltips();

// Every other page, fetched while the browser has nothing better to do, so the
// second click does not wait on a network round trip the way the first did.
prefetchRoutes();
