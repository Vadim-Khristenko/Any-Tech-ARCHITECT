/**
 * The one type every MergeKeys panel needs.
 *
 * Each mode is its own component and they all read the same workbench, so the
 * shape is named once here rather than restated in four `defineProps` calls
 * that would then have to be kept in step by hand.
 */

import type { useKeyWorkbench } from "@/composables/useKeyWorkbench";

export type Workbench = ReturnType<typeof useKeyWorkbench>;
