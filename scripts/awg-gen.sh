#!/usr/bin/env bash
#
# awg-gen.sh — standalone AmneziaWG obfuscation parameter generator.
#
# The same rules as the web generator, with no browser and no network. Written
# for people who need a config on a box that has a shell and nothing else.
#
#   ./awg-gen.sh                        # AWG 2.0, QUIC profile
#   ./awg-gen.sh -v 3.0                 # AWG 3.0 with header protection
#   ./awg-gen.sh -v 3.0 -p tls -o wg0.conf
#   ./awg-gen.sh -v 3.0 -n 5 -d out/    # five configs into a directory
#   ./awg-gen.sh -v 3.1 --random-trailers  # AWG 3.1 with packet trailers
#
# Randomness comes from /dev/urandom. This matters: parameters drawn from a
# predictable source are a fingerprint of their own.
#
# Licence: MIT, same as the project.

set -euo pipefail

VERSION_TAG="1.0.0"
PROJECT_URL="https://architect.vai-rice.space"

# ── Defaults ────────────────────────────────────────────────────────────────

AWG_VERSION="2.0"
PROFILE="quic"
INTENSITY="medium"
COUNT=1
OUT_FILE=""
OUT_DIR=""
ROUTER_MODE=0
NO_HEADER_PROTECTION=0
NO_CONTENT_PADDING=0
NO_RANDOM_TIMERS=0
RANDOM_TRAILERS=0
DISABLE_COOKIES=0

# ── Constants, taken from the protocol implementation ───────────────────────

# device/noise-types.go: HeaderCipherNonceSize.
readonly NONCE_SIZE=12
# The transport padding S4 is capped at 32 bytes by the protocol.
readonly S4_MAX=32

die() {
    printf 'awg-gen: %s\n' "$1" >&2
    exit 1
}

usage() {
    cat <<EOF
awg-gen.sh ${VERSION_TAG} — AmneziaWG obfuscation parameter generator

USAGE
    awg-gen.sh [options]

OPTIONS
    -v, --version VER    AWG version: 1.0 | 1.5 | 2.0 | 3.0 | 3.1   (default: 2.0)
    -p, --profile NAME   Mimicry profile for the CPS chain:
                         quic | tls | dtls | dtls13 | sip | dns | noise  (default: quic)
    -i, --intensity LVL  low | medium | high                   (default: medium)
    -n, --count N        Generate N independent configs        (default: 1)
    -o, --out FILE       Write to FILE instead of stdout
    -d, --dir DIR        Write N configs into DIR as awg-1.conf ...
    -r, --router         Router mode: minimal noise for weak hardware
        --no-hpk         3.0: omit HeaderProtectionKey
        --no-padding     3.0: omit ContentPaddingAddition
        --no-timers      3.0: omit the randomised timers
        --random-trailers  3.1: append a random tail to every packet (default off)
        --disable-cookies  3.1: never send cookie replies (default off)
    -h, --help           This text

NOTES
    Only the obfuscation parameters are produced. Add your own PrivateKey,
    Address, DNS and [Peer] section - this script never touches key material.

    With a HeaderProtectionKey the S values are floored at ${NONCE_SIZE}: the cipher
    nonce is read from the first ${NONCE_SIZE} bytes of that padding, so shorter
    padding silently weakens it.

    ${PROJECT_URL}
EOF
}

# ── Randomness ──────────────────────────────────────────────────────────────
#
# Values come from /dev/urandom in blocks rather than one process per number.
#
# Every helper here assigns to a variable instead of printing, and callers use
# plain assignment rather than $( ). That is not a style choice: command
# substitution runs in a subshell, so the pool cursor advances in the child and
# resets in the parent. Do it the other way and successive draws return the
# same value — which for an obfuscation generator means emitting identical
# headers and identical CPS chains, the exact fingerprint it exists to avoid.

RAND_POOL=()
RAND_IDX=0

_rand_refill() {
    local raw v
    raw=$(od -An -N4096 -tu4 -v < /dev/urandom | tr -s ' ' '\n') \
        || die "cannot read /dev/urandom"

    RAND_POOL=()
    for v in $raw; do
        RAND_POOL+=("$v")
    done

    RAND_IDX=0
    [ "${#RAND_POOL[@]}" -gt 0 ] || die "empty entropy pool"
}

# _rand_u32 -> REPLY: one uniform 32-bit value.
_rand_u32() {
    if [ "$RAND_IDX" -ge "${#RAND_POOL[@]}" ]; then
        _rand_refill
    fi
    REPLY=${RAND_POOL[$RAND_IDX]}
    RAND_IDX=$((RAND_IDX + 1))
}

# rand_int LO HI -> REPLY: uniform integer in [LO, HI].
#
# Rejection sampling, so the modulo does not skew the low end of the range.
rand_int() {
    local lo=$1 hi=$2 span limit
    span=$((hi - lo + 1))
    [ "$span" -gt 0 ] || die "rand_int: empty range ${lo}..${hi}"

    # Largest multiple of span that fits in 2^32, minus one.
    limit=$(( (4294967296 / span) * span - 1 ))

    while :; do
        _rand_u32
        if [ "$REPLY" -le "$limit" ]; then
            REPLY=$(( lo + REPLY % span ))
            return
        fi
    done
}

# rand_hex N -> RAND_HEX: N random bytes as lowercase hex.
RAND_HEX=""
rand_hex() {
    local n=$1 i byte
    RAND_HEX=""
    for (( i = 0; i < n; i++ )); do
        rand_int 0 255
        printf -v byte '%02x' "$REPLY"
        RAND_HEX="${RAND_HEX}${byte}"
    done
}

# rand_b64_32 -> RAND_B64: 32 random bytes, base64 with padding — the encoding
# `.conf` uses for keys.
RAND_B64=""
rand_b64_32() {
    local i byte bin=""

    # Built from the same pool as everything else, then encoded by whichever
    # tool is present. Falling back to `openssl rand` would be fine too, but
    # keeping one entropy source makes the script easier to reason about.
    for (( i = 0; i < 32; i++ )); do
        rand_int 0 255
        printf -v byte '\\x%02x' "$REPLY"
        bin="${bin}${byte}"
    done

    if command -v base64 >/dev/null 2>&1; then
        RAND_B64=$(printf '%b' "$bin" | base64 | tr -d '\n')
    elif command -v openssl >/dev/null 2>&1; then
        RAND_B64=$(printf '%b' "$bin" | openssl base64 | tr -d '\n')
    else
        die "need base64 or openssl to encode a HeaderProtectionKey"
    fi
}

# ── Mimicry signatures ──────────────────────────────────────────────────────
#
# Tag reference (device/obf.go): <b hex> static bytes, <t> 32-bit timestamp,
# <r N> random bytes, <rc N> random letters, <rd N> random digits.

# cps_chain PROFILE IV -> CHAIN
CHAIN=""
cps_chain() {
    local profile=$1 iv=$2 a b pad

    case "$profile" in
        quic)
            # QUIC long header: type byte with the fixed bit set, version 1,
            # then a connection ID.
            rand_hex 8
            rand_int 8 20; a=$REPLY
            CHAIN="<b 0xc00000000108${RAND_HEX}><rc ${a}><t>"
            ;;
        tls)
            # TLS record header wrapping a ClientHello handshake byte.
            rand_hex 2
            rand_int 24 48; a=$REPLY
            CHAIN="<b 0x160303${RAND_HEX}01><r ${a}><t>"
            ;;
        dtls)
            # DTLS 1.2 handshake record.
            rand_hex 6
            rand_int 20 40; a=$REPLY
            CHAIN="<b 0x16fefd${RAND_HEX}><r ${a}><t>"
            ;;
        dtls13)
            # DTLS 1.3 handshake record (RFC 9147 5.3): same framing as 1.2,
            # the version signal lives in supported_versions (0xfefc).
            # Shell stubs are approximate by design; the TS generator is exact.
            rand_hex 32
            rand_int 20 40; a=$REPLY
            CHAIN="<b 0x16fefd000000000000000000430100003700000000000000037fefd${RAND_HEX}0000000613011302130301000009002b000302fefc><r ${a}><t>"
            ;;
        sip)
            # Printable preamble: "OPTIONS sip:" in ASCII.
            rand_int 10 18; a=$REPLY
            rand_int 4 8;   b=$REPLY
            CHAIN="<b 0x4f5054494f4e53207369703a><rc ${a}><rd ${b}><t>"
            ;;
        dns)
            # DNS query header: transaction id, standard-query flags, then
            # QDCOUNT=1 with the remaining counts zeroed.
            rand_hex 2
            rand_int 6 14; a=$REPLY
            rand_int 2 4;  b=$REPLY
            CHAIN="<b 0x${RAND_HEX}01000001000000000000><rc ${a}><rd ${b}>"
            ;;
        noise)
            rand_int 40 90; a=$REPLY
            CHAIN="<r ${a}><t>"
            ;;
        *)
            die "unknown profile: ${profile}"
            ;;
    esac

    rand_int $((20 * iv)) $((60 * iv)); pad=$REPLY
    if [ "$pad" -gt 1000 ]; then pad=1000; fi
    CHAIN="${CHAIN}<r ${pad}>"
}

# entropy_chain IV -> CHAIN: filler for I2..I5.
entropy_chain() {
    local iv=$1 a b c hexlen

    rand_int 6 16;  a=$REPLY
    rand_int 3 10;  hexlen=$REPLY
    rand_hex "$hexlen"
    rand_int 20 $((60 * iv)); b=$REPLY
    rand_int 3 8;   c=$REPLY

    CHAIN="<rc ${a}><b 0x${RAND_HEX}><t><r ${b}><rd ${c}>"
}

# ── Argument parsing ────────────────────────────────────────────────────────

while [ $# -gt 0 ]; do
    case "$1" in
        -v|--version)   AWG_VERSION="${2:-}"; shift 2 ;;
        -p|--profile)   PROFILE="${2:-}"; shift 2 ;;
        -i|--intensity) INTENSITY="${2:-}"; shift 2 ;;
        -n|--count)     COUNT="${2:-}"; shift 2 ;;
        -o|--out)       OUT_FILE="${2:-}"; shift 2 ;;
        -d|--dir)       OUT_DIR="${2:-}"; shift 2 ;;
        -r|--router)    ROUTER_MODE=1; shift ;;
        --no-hpk)       NO_HEADER_PROTECTION=1; shift ;;
        --no-padding)   NO_CONTENT_PADDING=1; shift ;;
        --no-timers)    NO_RANDOM_TIMERS=1; shift ;;
        --random-trailers) RANDOM_TRAILERS=1; shift ;;
        --disable-cookies) DISABLE_COOKIES=1; shift ;;
        -h|--help)      usage; exit 0 ;;
        *)              die "unknown option: $1  (try --help)" ;;
    esac
done

case "$AWG_VERSION" in
    1.0|1.5|2.0|3.0|3.1) ;;
    *) die "unsupported version: ${AWG_VERSION}  (1.0, 1.5, 2.0, 3.0, 3.1)" ;;
esac

# A 3.0 device refuses the 3.1 keys at parse, so fail loud rather than
# writing a config its version cannot read.
if [ "$AWG_VERSION" != "3.1" ] && { [ "$RANDOM_TRAILERS" -eq 1 ] || [ "$DISABLE_COOKIES" -eq 1 ]; }; then
    die "--random-trailers/--disable-cookies need -v 3.1"
fi

case "$PROFILE" in
    quic|tls|dtls|dtls13|sip|dns|noise) ;;
    *) die "unknown profile: ${PROFILE}  (quic, tls, dtls, dtls13, sip, dns, noise)" ;;
esac

case "$INTENSITY" in
    low|medium|high) ;;
    *) die "unknown intensity: ${INTENSITY}  (low, medium, high)" ;;
esac

case "$COUNT" in
    ''|*[!0-9]*) die "count must be a positive integer" ;;
    *) [ "$COUNT" -ge 1 ] || die "count must be at least 1" ;;
esac

[ -r /dev/urandom ] || die "/dev/urandom is not readable"

_rand_refill

# ── Generation ──────────────────────────────────────────────────────────────

generate_config() {
    local iv jc jmin jmax s1 s2 s3 s4 spread
    local h1_lo h1_hi h2_lo h2_hi h3_lo h3_hi h4_lo h4_hi
    local floored=0

    case "$INTENSITY" in
        low)    iv=1 ;;
        medium) iv=2 ;;
        high)   iv=3 ;;
    esac

    # ── Junk train ─────────────────────────────────────────────────────────
    case "$INTENSITY" in
        low)    rand_int 64 256;  jmin=$REPLY; rand_int 256 512;  jmax=$REPLY ;;
        medium) rand_int 128 512; jmin=$REPLY; rand_int 512 1024; jmax=$REPLY ;;
        high)   rand_int 256 768; jmin=$REPLY; rand_int 768 1280; jmax=$REPLY ;;
    esac

    # Keep a real spread between the bounds, or the "random" length is not.
    if [ "$jmax" -le $((jmin + 64)) ]; then
        rand_int 64 256
        jmax=$((jmin + 64 + REPLY))
    fi

    if [ "$ROUTER_MODE" -eq 1 ]; then
        rand_int 2 3; jc=$REPLY
        if [ "$jmin" -gt 40 ];  then jmin=40; fi
        if [ "$jmax" -gt 128 ]; then jmax=128; fi
    else
        rand_int 3 7; jc=$REPLY
    fi

    # AWG 1.0 needs Jc >= 4 and Jmax > 81 for the official client.
    if [ "$AWG_VERSION" = "1.0" ]; then
        if [ "$jc" -lt 4 ]; then jc=4; fi
        if [ "$jmax" -le 81 ]; then
            rand_int 50 200
            jmax=$((82 + REPLY))
        fi
    fi

    # ── S padding ──────────────────────────────────────────────────────────
    if [ "$ROUTER_MODE" -eq 1 ]; then
        rand_int 1 20; s1=$REPLY
        rand_int 1 20; s2=$REPLY
    else
        rand_int 1 150; s1=$REPLY
        rand_int 1 150; s2=$REPLY
    fi
    rand_int 1 64; s3=$REPLY
    rand_int 1 "$S4_MAX"; s4=$REPLY

    # 3.0 header protection reads its cipher nonce from this padding, so it
    # has to be at least as long as the nonce.
    if { [ "$AWG_VERSION" = "3.0" ] || [ "$AWG_VERSION" = "3.1" ]; } && [ "$NO_HEADER_PROTECTION" -eq 0 ]; then
        floored=1
        if [ "$s1" -lt "$NONCE_SIZE" ]; then s1=$NONCE_SIZE; fi
        if [ "$s2" -lt "$NONCE_SIZE" ]; then s2=$NONCE_SIZE; fi
        if [ "$s3" -lt "$NONCE_SIZE" ]; then s3=$NONCE_SIZE; fi
        if [ "$s4" -lt "$NONCE_SIZE" ]; then s4=$NONCE_SIZE; fi
    fi

    # len(init) = 148 + S1 and len(resp) = 92 + S2. Equal sizes would hand the
    # fingerprint straight back.
    if [ "$s2" -eq $((s1 + 56)) ]; then s2=$((s2 + 1)); fi
    if [ "$s3" -eq $((s1 + 56)) ]; then s3=$((s3 + 1)); fi
    if [ "$s3" -eq $((s2 + 92)) ]; then s3=$((s3 + 1)); fi
    if [ "$s4" -gt "$S4_MAX" ]; then s4=$S4_MAX; fi

    # ── Magic headers ──────────────────────────────────────────────────────
    # Four non-overlapping zones, all clear of 1-4, which upstream WireGuard
    # reserves for its own message types. Each bound is drawn separately, so
    # the four ranges do not share a shape.
    rand_int 100000000 900000000;   h1_lo=$REPLY
    rand_int 1000 50000;            h1_hi=$((h1_lo + REPLY))
    rand_int 1200000000 2000000000; h2_lo=$REPLY
    rand_int 1000 50000;            h2_hi=$((h2_lo + REPLY))
    rand_int 2400000000 3200000000; h3_lo=$REPLY
    rand_int 1000 50000;            h3_hi=$((h3_lo + REPLY))
    rand_int 3600000000 4000000000; h4_lo=$REPLY
    rand_int 1000 50000;            h4_hi=$((h4_lo + REPLY))

    # ── Emit ───────────────────────────────────────────────────────────────
    printf '# AmneziaWG %s - generated by awg-gen.sh %s\n' "$AWG_VERSION" "$VERSION_TAG"
    printf '# %s\n' "$PROJECT_URL"
    printf '#\n'
    printf '# Add your own PrivateKey, Address, DNS and [Peer] section.\n'
    printf '# H1-H4, S1-S4 and HeaderProtectionKey must match on BOTH ends.\n'
    printf '# Jc, Jmin, Jmax, I1-I5 and ContentPaddingAddition are sender-side\n'
    printf '# only - each device may use its own, and varied values are better.\n'
    printf '\n'
    printf '[Interface]\n'
    printf '# PrivateKey = <your private key>\n'
    printf '# Address = 10.0.0.2/32\n'
    printf '\n'

    if [ "$AWG_VERSION" = "2.0" ] || [ "$AWG_VERSION" = "3.0" ] || [ "$AWG_VERSION" = "3.1" ]; then
        printf 'H1 = %s-%s\n' "$h1_lo" "$h1_hi"
        printf 'H2 = %s-%s\n' "$h2_lo" "$h2_hi"
        printf 'H3 = %s-%s\n' "$h3_lo" "$h3_hi"
        printf 'H4 = %s-%s\n' "$h4_lo" "$h4_hi"
        printf 'S1 = %s\nS2 = %s\nS3 = %s\nS4 = %s\n' "$s1" "$s2" "$s3" "$s4"
    else
        printf 'H1 = %s\n' "$h1_lo"
        printf 'H2 = %s\n' "$h2_lo"
        printf 'H3 = %s\n' "$h3_lo"
        printf 'H4 = %s\n' "$h4_lo"
        printf 'S1 = %s\nS2 = %s\n' "$s1" "$s2"
    fi

    printf 'Jc = %s\nJmin = %s\nJmax = %s\n' "$jc" "$jmin" "$jmax"

    if [ "$AWG_VERSION" = "1.0" ]; then
        printf '\n# I1-I5 are not supported in AWG 1.0\n'
    else
        printf '\n'
        if [ "$AWG_VERSION" = "1.5" ]; then
            printf '# I1-I5 are client-side only in AWG 1.5\n'
        fi
        cps_chain "$PROFILE" "$iv"; printf 'I1 = %s\n' "$CHAIN"
        if [ "$ROUTER_MODE" -eq 0 ]; then
            entropy_chain "$iv"; printf 'I2 = %s\n' "$CHAIN"
            entropy_chain "$iv"; printf 'I3 = %s\n' "$CHAIN"
            entropy_chain "$iv"; printf 'I4 = %s\n' "$CHAIN"
            entropy_chain "$iv"; printf 'I5 = %s\n' "$CHAIN"
        fi
    fi

    if [ "$AWG_VERSION" = "3.0" ] || [ "$AWG_VERSION" = "3.1" ]; then
        local emitted=0

        if [ "$NO_HEADER_PROTECTION" -eq 0 ]; then
            rand_b64_32
            printf '\n# Shared header protection key - identical on both ends\n'
            printf 'HeaderProtectionKey = %s\n' "$RAND_B64"
            emitted=1
        fi

        if [ "$NO_CONTENT_PADDING" -eq 0 ]; then
            local cpa_lo cpa_hi
            if [ "$ROUTER_MODE" -eq 1 ]; then
                rand_int 4 16;  cpa_lo=$REPLY
                rand_int 8 24;  cpa_hi=$((cpa_lo + REPLY))
            else
                rand_int 16 64;  cpa_lo=$REPLY
                rand_int 16 120; cpa_hi=$((cpa_lo + REPLY))
            fi
            printf '\n# Random transport packet padding\n'
            printf 'ContentPaddingAddition = %s-%s\n' "$cpa_lo" "$cpa_hi"
            emitted=1
        fi

        if [ "$NO_RANDOM_TIMERS" -eq 0 ]; then
            local rt_lo rt_hi ka_lo ka_hi ra_lo ra_hi rj_lo rj_hi at_lo at_hi

            rand_int 4 6;     rt_lo=$REPLY
            rand_int 1 4;     rt_hi=$((rt_lo + REPLY))
            rand_int 8 14;    ka_lo=$REPLY
            rand_int 2 8;     ka_hi=$((ka_lo + REPLY))
            rand_int 100 120; ra_lo=$REPLY
            rand_int 10 30;   ra_hi=$((ra_lo + REPLY))

            # RejectAfterTime must clear RekeyAfterTime plus the keepalive and
            # rekey windows. Below that the receiving side stops refreshing its
            # keys and the session dies when the deadline passes.
            rj_lo=$((ra_hi + ka_hi + rt_hi + 15))
            if [ "$rj_lo" -lt 170 ]; then rj_lo=170; fi
            rand_int 10 30;   rj_hi=$((rj_lo + REPLY))

            rand_int 12 18;   at_lo=$REPLY
            rand_int 2 10;    at_hi=$((at_lo + REPLY))

            printf '\n# Randomised protocol timers (seconds)\n'
            printf 'RekeyAfterTime = %s-%s\n' "$ra_lo" "$ra_hi"
            printf 'RekeyTimeout = %s-%s\n' "$rt_lo" "$rt_hi"
            printf 'RejectAfterTime = %s-%s\n' "$rj_lo" "$rj_hi"
            printf 'KeepaliveTimeout = %s-%s\n' "$ka_lo" "$ka_hi"
            printf 'MaxHandshakeAttempts = %s-%s\n' "$at_lo" "$at_hi"
            emitted=1
        fi

        if [ "$AWG_VERSION" = "3.1" ]; then
            if [ "$RANDOM_TRAILERS" -eq 1 ]; then
                printf '\n# A random-length trailer on every packet the device sends\n'
                printf 'RandomTrailers = true\n'
                emitted=1
            fi
            if [ "$DISABLE_COOKIES" -eq 1 ]; then
                printf '\n# Never send cookie replies (breaks NAT keepalive under load)\n'
                printf 'DisableCookies = true\n'
                emitted=1
            fi
        fi

        if [ "$emitted" -eq 1 ]; then
            if [ "$AWG_VERSION" = "3.1" ] && { [ "$RANDOM_TRAILERS" -eq 1 ] || [ "$DISABLE_COOKIES" -eq 1 ]; }; then
                printf '\n# Requires amneziawg-go >= 3.1 and amneziawg-tools with 3.1 support.\n'
            else
                printf '\n# Requires amneziawg-go >= 3.0.1 and amneziawg-tools with 3.0 support.\n'
            fi
        fi
        if [ "$floored" -eq 1 ]; then
            printf '# S1-S4 are floored at %s: the cipher nonce comes from that padding.\n' "$NONCE_SIZE"
        fi
    fi
}

# ── Output ──────────────────────────────────────────────────────────────────
#
# generate_config writes to stdout and must not run in a subshell, or the
# entropy cursor resets between configs. Redirect the whole call instead.

i=1
if [ -n "$OUT_DIR" ]; then
    mkdir -p "$OUT_DIR"
    while [ "$i" -le "$COUNT" ]; do
        generate_config > "${OUT_DIR%/}/awg-${i}.conf"
        printf 'wrote %s/awg-%s.conf\n' "${OUT_DIR%/}" "$i" >&2
        i=$((i + 1))
    done
elif [ -n "$OUT_FILE" ]; then
    [ "$COUNT" -eq 1 ] || die "--out takes a single config; use --dir for several"
    generate_config > "$OUT_FILE"
    printf 'wrote %s\n' "$OUT_FILE" >&2
else
    while [ "$i" -le "$COUNT" ]; do
        if [ "$i" -gt 1 ]; then
            printf '\n========================================\n\n'
        fi
        generate_config
        i=$((i + 1))
    done
fi
