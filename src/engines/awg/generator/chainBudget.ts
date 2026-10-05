/**
 * How much of an I1–I5 chain the Linux kernel module can carry.
 *
 * amneziawg-go reads the chain over its text UAPI and has no budget to speak
 * of. The kernel module is configured over generic netlink, and there the
 * whole device travels in one message of one page:
 *
 *   - amneziawg-tools `src/ipc-linux.h`, `kernel_set_device`, writes every
 *     device attribute (I1–I5 included) with the unchecked `mnl_attr_put_strz`
 *     into a buffer of `mnl_ideal_socket_buffer_size()` bytes, which is the
 *     page size capped at 8192. Peers get `_check` variants and spill into a
 *     second message; device attributes do not.
 *   - amneziawg-linux-kernel-module `src/netlink.c`, `wg_get_device_dump`,
 *     puts the same attributes into the first skb of the dump. When they do
 *     not fit it returns `-EMSGSIZE`, and `awg show` prints "Unable to access
 *     interface: Message too long" while awg-quick goes on bringing the
 *     interface up. The tunnel looks configured and carries nothing.
 *
 * That first skb is `NLMSG_GOODSIZE`, 3776 bytes on 4 KiB pages. The rest of
 * the device takes about 344 of them: the netlink and genl headers, port,
 * fwmark, ifindex and name, Jc/Jmin/Jmax and S1–S4, four 64-bit H ranges, the
 * six 3.x numbers and two flags, HeaderProtectionKey and both device keys, and
 * the start of the peer nest. What is left for I1–I5 is about 3432 bytes, and
 * the budget below keeps a margin under it for the attributes a later release
 * will add.
 *
 * Issue #17 is this limit: the five SIP REGISTER chains in it came to 3820
 * bytes, and the generator's own full-form SIP reached 4.3 KB.
 */

/** Netlink bytes the I1–I5 attributes may take together. */
export const KMOD_CHAIN_BUDGET = 3200;

/**
 * What one chain costs on the wire: a 4-byte attribute header, the string with
 * its terminating NUL, and padding up to the next 4-byte boundary
 * (`NLA_ALIGN`). An empty chain is not sent at all.
 */
export function chainAttrBytes(chain: string): number {
  if (!chain) return 0;
  return 4 + Math.ceil((chain.length + 1) / 4) * 4;
}

/** What a whole I1–I5 set costs. */
export function chainBytes(chains: readonly string[]): number {
  return chains.reduce((total, chain) => total + chainAttrBytes(chain), 0);
}

/**
 * Bring a chain set under the budget, giving up as little as possible.
 *
 * I1 is the packet the profile exists for, so it is never touched. From I5
 * downwards each slot is first swapped for the replacement `fallback` builds
 * (an entropy packet, a fraction of the size of a text protocol), and only
 * when that is still not enough is the slot dropped. Dropping one is not an
 * error: the device sends the chains it has and skips the empty ones.
 */
export function fitChainBudget(
  chains: readonly string[],
  fallback: (slot: number) => string,
  budget = KMOD_CHAIN_BUDGET,
): string[] {
  const out = [...chains];

  for (let slot = out.length - 1; slot >= 1 && chainBytes(out) > budget; slot--) {
    if (!out[slot]) continue;
    const replacement = fallback(slot);
    if (chainAttrBytes(replacement) < chainAttrBytes(out[slot]!)) {
      out[slot] = replacement;
    }
  }

  for (let slot = out.length - 1; slot >= 1 && chainBytes(out) > budget; slot--) {
    out[slot] = "";
  }

  return out;
}
