/**
 * Copy something, and show that it was copied.
 *
 * The pattern — copy, mark which item was copied, clear the mark after a
 * moment — existed in seven places with four different timings and, in most of
 * them, a timer that was never cleared on unmount. A component torn down
 * mid-timeout left a callback writing to a ref nobody was watching.
 *
 * One implementation, one timing, and the timer disposed with the component.
 */

import { onBeforeUnmount, ref } from "vue";
import { copyText } from "@/utils/clipboard";

/**
 * How long the confirmation stays up.
 *
 * The old call sites used 1200, 1500, 1600 and 2000 ms with no reason for the
 * difference. 1600 is the middle of what was already there: long enough to be
 * read, short enough that a second copy does not feel blocked by the first.
 */
const FEEDBACK_MS = 1600;

export interface CopyFeedback {
  /** Key of the most recently copied item, or null. */
  copied: ReturnType<typeof ref<string | null>>;
  /** Copy `text` and flag `key`. Resolves to whether the copy worked. */
  copy: (key: string, text: string) => Promise<boolean>;
  /** Whether this particular key is the one currently showing as copied. */
  isCopied: (key: string) => boolean;
  /**
   * Show the confirmation without copying anything.
   *
   * For the two cases that are the same flash of feedback but not a copy this
   * composable performed: a copy done elsewhere (the generator composable
   * copies and logs on its own), and a confirmation that is not a copy at all,
   * like "this history entry was restored".
   */
  mark: (key: string) => void;
  /** Drop the confirmation early. */
  clear: () => void;
}

export function useCopyFeedback(ms: number = FEEDBACK_MS): CopyFeedback {
  const copied = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear(): void {
    clearTimeout(timer);
    copied.value = null;
  }

  function mark(key: string): void {
    copied.value = key;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = null), ms);
  }

  async function copy(key: string, text: string): Promise<boolean> {
    const ok = await copyText(text);
    // Only confirm what actually happened. Flagging a copy the browser
    // refused is worse than showing nothing: the value is not on the
    // clipboard and the interface says it is.
    if (!ok) return false;

    mark(key);
    return true;
  }

  const isCopied = (key: string) => copied.value === key;

  // Without this, a component unmounted inside the window leaves a timer
  // writing to a ref that no longer renders anything.
  onBeforeUnmount(() => clearTimeout(timer));

  return { copied, copy, isCopied, mark, clear };
}
