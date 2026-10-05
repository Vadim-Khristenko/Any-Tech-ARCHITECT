/**
 * Saving text to a file.
 *
 * Four call sites had grown the same six lines — blob, object URL, anchor,
 * click, revoke — and all four made the same two mistakes: the anchor was
 * never put in the document, and the URL was revoked on the line after the
 * click. Firefox ignores `click()` on a detached anchor, and revoking before
 * the browser has started reading the blob cancels the download outright, so
 * on some browsers the button simply did nothing.
 */

/** How long to keep the object URL alive after the click. */
const REVOKE_DELAY_MS = 60_000;

/**
 * Offer `text` to the user as a file. Returns whether the download could be
 * started — a caller that logs its outcome should not claim a save that the
 * environment had no way to perform.
 */
export function downloadText(
  text: string,
  filename: string,
  mime = "text/plain",
): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return false;
  }

  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Detached anchors are a no-op in Firefox; it has to be in the document.
  link.style.display = "none";
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    // Not revoked inline: the browser reads the blob asynchronously, and
    // pulling the URL out from under it cancels the save. The delay is long
    // enough for any save dialog and the memory is reclaimed either way.
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
  return true;
}

/** `prefix-<timestamp>.<ext>`, the naming the download buttons already used. */
export function timestampedName(prefix: string, ext: string): string {
  return `${prefix}-${Date.now()}.${ext}`;
}
