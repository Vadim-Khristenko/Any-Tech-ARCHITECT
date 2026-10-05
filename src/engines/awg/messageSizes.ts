/**
 * How long a WireGuard handshake message is before AmneziaWG pads it.
 *
 * Sizes from the kernel module's `src/messages.h`, which carries WireGuard's
 * own — obfuscation adds padding on top rather than changing the structures.
 *
 * The offsets below are what the collision rules are actually about, and they
 * are derived here rather than written down three times. They were written
 * down three times, and two of the three were wrong in the same way: the
 * response's *size* had been copied in where the *difference* belonged, so
 * the tool warned about `S3 = S2 + 92` — a pair that can never collide — and
 * said nothing about `S3 = S2 + 28`, which is a real collision and, by one
 * installer maintainer's count, comes up about once in five hundred installs.
 *
 * Reported by @bivlked in issue #7, with the arithmetic worked out in full.
 */

/** Unpadded message sizes, in bytes. */
export const WG_MESSAGE_SIZE = {
  init: 148,
  response: 92,
  cookie: 64,
} as const;

/**
 * S-padding differences that make two message types the same length.
 *
 * A padded message is its base size plus its own S value, so two of them
 * collide exactly when the S values differ by the sizes' difference:
 *
 *   148 + S1 === 92 + S2   →   S2 === S1 + 56
 *   148 + S1 === 64 + S3   →   S3 === S1 + 84
 *    92 + S2 === 64 + S3   →   S3 === S2 + 28
 */
export const INIT_TO_RESPONSE =
  WG_MESSAGE_SIZE.init - WG_MESSAGE_SIZE.response; // 56
export const INIT_TO_COOKIE =
  WG_MESSAGE_SIZE.init - WG_MESSAGE_SIZE.cookie; // 84
export const RESPONSE_TO_COOKIE =
  WG_MESSAGE_SIZE.response - WG_MESSAGE_SIZE.cookie; // 28
