#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AmneziaWG Architect — Local Server Launcher (Linux / macOS)
#
# Serves the built site from dist/. Tries, in order:
#   1. bun    → bunx serve
#   2. npx    → npx serve
#   3. python → python3 -m http.server
#   4. nothing found → offers to install bun
#
#   ./serve.sh          # port 8080
#   ./serve.sh 3000     # port 3000
#
# The build emits a real index.html for every route in both locales, so deep
# links work on a plain static server — no SPA rewrite needed.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# --check reports what would be served and which runtime would be used, then
# exits. Useful for verifying a release archive without leaving a server behind.
CHECK_ONLY=0
if [ "${1:-}" = "--check" ]; then
    CHECK_ONLY=1
    shift
fi

PORT="${1:-${PORT:-8080}}"

# ── Colours ─────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
    RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; AMBER=$'\033[0;33m'
    CYAN=$'\033[0;36m'; DIM=$'\033[2m'; NC=$'\033[0m'
else
    RED=""; GREEN=""; AMBER=""; CYAN=""; DIM=""; NC=""
fi

info() { printf '%s[INFO]%s %s\n' "$CYAN" "$NC" "$*"; }
ok()   { printf '%s[OK]%s %s\n'   "$GREEN" "$NC" "$*"; }
warn() { printf '%s[WARN]%s %s\n' "$AMBER" "$NC" "$*"; }
fail() { printf '%s[FAIL]%s %s\n' "$RED" "$NC" "$*" >&2; exit 1; }

# ── Locate dist ─────────────────────────────────────────────────────────────
#
# This script ships in three places — the repo's scripts/, the release archive's
# scripts/, and copied into dist/ itself — so dist is found by looking rather
# than by assuming a fixed depth.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DIST_DIR=""
for candidate in \
    "$SCRIPT_DIR/dist" \
    "$SCRIPT_DIR/../dist" \
    "$SCRIPT_DIR" \
    "$PWD/dist" \
    "$PWD"
do
    if [ -f "$candidate/index.html" ]; then
        DIST_DIR="$(cd "$candidate" && pwd)"
        break
    fi
done

if [ -z "$DIST_DIR" ]; then
    fail "dist/ not found. Build it first:  bun run build"
fi

SERVE_ROOT="$(dirname "$DIST_DIR")"
SERVE_NAME="$(basename "$DIST_DIR")"

ok "Serving $DIST_DIR ($(du -sh "$DIST_DIR" 2>/dev/null | cut -f1 || echo '?'))"

if [ "$CHECK_ONLY" -eq 1 ]; then
    for runtime in bun npx python3 python; do
        if command -v "$runtime" >/dev/null 2>&1; then
            ok "runtime: $runtime"
            break
        fi
    done
    printf 'routes: '
    find "$DIST_DIR" -name index.html | wc -l | tr -d ' '
    exit 0
fi

printf '\n'
printf '  %s→%s  http://localhost:%s%s        %s(Русский)%s\n' "$GREEN" "$NC" "$PORT" "" "$DIM" "$NC"
printf '  %s→%s  http://localhost:%s/en%s     %s(English)%s\n' "$GREEN" "$NC" "$PORT" "" "$DIM" "$NC"
printf '\n'
printf '  %sNo browser? Generate a config from the shell:%s\n' "$DIM" "$NC"
printf '  %s  ./awg-gen.sh -v 3.0 --help%s\n' "$DIM" "$NC"
printf '\n'

cd "$SERVE_ROOT"

# ── 1. bun ──────────────────────────────────────────────────────────────────
if command -v bun >/dev/null 2>&1; then
    ok "bun $(bun --version)"
    exec bun x serve "$SERVE_NAME" -l "$PORT"
fi

# ── 2. npx ──────────────────────────────────────────────────────────────────
if command -v npx >/dev/null 2>&1; then
    ok "npx ($(node --version 2>/dev/null || echo node))"
    exec npx --yes serve "$SERVE_NAME" -l "$PORT"
fi

# ── 3. python ───────────────────────────────────────────────────────────────
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    if python -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' 2>/dev/null; then
        PYTHON_CMD="python"
    fi
fi

if [ -n "$PYTHON_CMD" ]; then
    ok "$PYTHON_CMD ($($PYTHON_CMD --version 2>&1))"
    # http.server has no rewrite rules, so an address that matches no file
    # 404s instead of rendering the styled not-found page. Every real route
    # resolves normally.
    warn "http.server serves files only — a mistyped URL gives a bare 404"
    exec "$PYTHON_CMD" -m http.server "$PORT" -d "$SERVE_NAME"
fi

# ── 4. Offer to install bun ─────────────────────────────────────────────────
warn "No bun, npx or python3 found."
printf '\n'
printf 'Install bun now? It downloads from https://bun.sh/install  [y/N] '
read -r reply
case "$reply" in
    [yY]*) ;;
    *) fail "Cancelled. Install bun, Node.js or Python and run this again." ;;
esac

if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://bun.sh/install | bash
elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://bun.sh/install | bash
else
    fail "curl or wget is required to install bun."
fi

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

command -v bun >/dev/null 2>&1 || fail "bun install failed. See https://bun.sh"

ok "bun installed ($(bun --version))"
exec bun x serve "$SERVE_NAME" -l "$PORT"
