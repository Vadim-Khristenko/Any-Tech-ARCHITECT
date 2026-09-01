import { describe, it, expect } from "vitest";

import { awgEngine } from "../index";
import { linesToText } from "@/types/engine";

/**
 * Third-party configs must parse.
 *
 * awg-toolza3.0 — an independent AWG 3.0 manager — exports client configs in
 * the standard .conf shape with its own comments, a PersistentKeepalive
 * written as a range (22-30, which amneziawg-go v3.x accepts), and peer
 * fields this engine has no opinion about. Its users are exactly the people
 * MergeKeys and the containers should serve, so the parse must stay clean:
 * the obfuscation block extracted, the peer section ignored, nothing thrown.
 *
 * The text below mirrors that export format faithfully — including the
 * Russian section comments — so a formatting change upstream surfaces here
 * instead of at some user's MergeKeys paste.
 */

const TOOLZA_CLIENT_CONF = `[Interface]
PrivateKey = 6H0wxkPaLQnBcfAMukllLLTQVbUQhOoC4hbDrB1lLWk=
Address = 10.99.0.2/32
DNS = 1.1.1.1, 1.0.0.1
MTU = 1320

# Обфускация AWG 2.0 — должна совпадать с сервером
Jc = 5
Jmin = 62
Jmax = 511
S1 = 44
S2 = 51
S3 = 19
S4 = 22
H1 = 412345678
H2 = 1547852963
H3 = 2684123795
H4 = 3812456782

# CPS: junk-пакеты под видом настоящего протокола
I1 = <b 0xc3000000010f9c405122ae076498f66b735f33f7aa10e51d65f150d4bb9781dde96cddeaf72c0035fe22b5><rc 18><t><r 132>
I2 = <t><b 0xf8849c57d53fbed8eaaf14e8c434><r 442><rc 9><rd 4>
I3 = <t><b 0x9e27c547470159b446><r 500><rc 9><rd 8>
I4 = <r 500><rc 12><b 0xbecb8dcea8fd><t><rd 4>
I5 = <t><b 0xea7bc6e3fdd31e3eabca1183><r 10><rc 12><rd 7>

# AWG 3.0
HeaderProtectionKey = MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
ContentPaddingAddition = 12-40
RekeyAfterTime = 110-130
RekeyTimeout = 1-3
RejectAfterTime = 170-190
KeepaliveTimeout = 14-18
MaxHandshakeAttempts = 4-6

[Peer]
PublicKey = kF9sR2pQ7vXwJ3mN8hL5dT1cY0aZ6bG4uE2iO9pS7xQ=
PresharedKey = 8j4Nk2R7tW5qX1zC9vB3mL6pH0sD8fG1jK4nT7rY2uE=
AllowedIPs = 0.0.0.0/0
Endpoint = 203.0.113.9:51820
PersistentKeepalive = 22-30
`;

describe("third-party configs: awg-toolza3.0 client export", () => {
  const result = awgEngine.parse(TOOLZA_CLIENT_CONF);

  it("parses cleanly", () => {
    expect(result.ok).toBe(true);
    expect(result.config).not.toBeNull();
  });

  it("extracts the obfuscation block, peer fields included or ignored", () => {
    const cfg = result.config!;
    expect(cfg.version).toBe("3.0");
    expect(cfg.jc).toBe(5);
    expect(cfg.s1).toBe(44);
    expect(cfg.h1).toBe("412345678");
    expect(cfg.i1).toContain("<b 0xc3000000");
    // The 3.x block rides along with its ranges intact.
    expect(cfg.awg3?.headerProtectionKey).toBe(
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    expect(cfg.awg3?.contentPaddingAddition).toBe("12-40");
    expect(cfg.awg3?.rekeyAfterTime).toBe("110-130");
  });

  it("re-renders a parameter set a server would accept", () => {
    const cfg = result.config!;
    const text = linesToText(awgEngine.render(cfg));
    expect(text).toContain("Jc = 5");
    expect(text).toContain("HeaderProtectionKey");
    // The peer section is not this engine's business: the render is a
    // parameter set, and the peer's keys belong to whoever manages them.
    expect(text).not.toContain("PersistentKeepalive");
  });
});
