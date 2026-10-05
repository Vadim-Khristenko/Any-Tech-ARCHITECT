/**
 * The lite page.
 *
 * No framework: the page is a form, a text block and a list, and a runtime
 * that re-renders them reactively would weigh more than everything else here
 * together. Each control is built once; a change reads the form back and
 * regenerates.
 */

import "./lite.css";
import { AWG_CLIENT_PROFILES, PROFILE_LABELS, clientReleases } from "@/engines/awg/generator";
import { AWG_VERSIONS } from "@/engines/awg/generator/versions";
import { engineHasTag, type CpsTag } from "@/engines/awg/generator/engines";
import { clientCaps } from "@/engines/awg/generator/clients";
import type { GeneratorInput } from "@/engines/awg/generator";
import { check, generate, liteDefaults, switchesFor } from "./form";
import { getLocale, setLocale, translate as t, type LiteLocale } from "./i18n";

declare const __BUILD_TIME__: string;
declare const __APP_VERSION__: string;

const FULL_SITE = "https://architect.vai-rice.space/";
const SOURCE = "https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/tree/lite";
const STORE = "ata-lite-form";
const REGIONS = ["any", "ru", "global", "eu", "uk", "by", "cn"] as const;

/* ── State ────────────────────────────────────────────────────────────────── */

function load(): GeneratorInput {
  const defaults = liteDefaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (saved && typeof saved === "object") return { ...defaults, ...saved, iterCount: 0 };
  } catch {
    // Private mode, file:// in some browsers, or a stale shape: start over.
  }
  return defaults;
}

function save(form: GeneratorInput): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(form));
  } catch {
    // Not being remembered is fine.
  }
}

let form = load();
let lastText = "";

/* ── Small DOM helpers ────────────────────────────────────────────────────── */

type Attrs = Record<string, string | boolean | undefined>;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "text") el.textContent = String(v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children);
  return el;
}

/** An element whose text follows the language. */
function tr<K extends keyof HTMLElementTagNameMap>(tag: K, key: string, attrs: Attrs = {}) {
  const el = h(tag, attrs);
  el.dataset.i18n = key;
  el.textContent = t(key);
  return el;
}

function select(id: string, options: [string, string][], value: string): HTMLSelectElement {
  const el = h("select", { id });
  for (const [v, label] of options) el.append(h("option", { value: v, text: label }));
  el.value = value;
  return el;
}

function field(labelKey: string, control: HTMLElement): HTMLElement {
  const label = tr("label", labelKey, { for: control.id });
  return h("div", { class: "field" }, label, control);
}

function checkbox(id: string, labelKey: string, checked: boolean): HTMLElement {
  const input = h("input", { type: "checkbox", id, checked });
  const label = h("label", { class: "check", for: id }, input, tr("span", labelKey));
  return label;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/* ── Building the page ────────────────────────────────────────────────────── */

const TOGGLES: [keyof GeneratorInput, string, "base" | "awg3" | "awg31"][] = [
  ["mimicAll", "lite.mimicAll", "base"],
  ["routerMode", "lite.routerMode", "base"],
  ["useExtremeMax", "lite.extreme", "base"],
  ["useHeaderProtection", "lite.hpk", "awg3"],
  ["useContentPadding", "lite.cpa", "awg3"],
  ["useRandomTimings", "lite.timings", "awg3"],
  ["useRandomTrailers", "lite.trailers", "awg31"],
  ["useDisableCookies", "lite.cookies", "awg31"],
  ["useNarrowH", "lite.narrowH", "awg31"],
  ["useSameS", "lite.sameS", "awg31"],
];

const TAGS: [keyof GeneratorInput, CpsTag][] = [
  ["useTagT", "t"],
  ["useTagR", "r"],
  ["useTagRC", "rc"],
  ["useTagRD", "rd"],
  ["useTagC", "c"],
];

function profileOptions(): [string, string][] {
  return Object.entries(PROFILE_LABELS).map(([id, label]) => [
    id,
    id === "random" ? t("gen.profile.random") : label,
  ]);
}

function releaseOptions(): [string, string][] {
  return clientReleases(form.clientId).map((r) => [
    r.id ?? "",
    r.id === null ? t("lite.releaseCurrent") : t(r.label, r.labelParams as Record<string, string>),
  ]);
}

function build(root: HTMLElement): void {
  const header = h(
    "header",
    { class: "top" },
    h("div", {}, tr("h1", "lite.title"), tr("p", "lite.subtitle", { class: "muted" })),
    tr("button", "lite.lang", { id: "lang", type: "button", class: "ghost" }),
  );

  const rare = h(
    "aside",
    { class: "rare", role: "note" },
    tr("span", "lite.rare"),
    " ",
    h("a", { href: FULL_SITE, rel: "noopener", text: "architect.vai-rice.space" }),
  );

  const grid = h(
    "div",
    { class: "grid" },
    field("lite.version", select("version", AWG_VERSIONS.map((v) => [v.id, v.label]), form.version)),
    field("lite.client", select("client", AWG_CLIENT_PROFILES.map((c) => [c.id, c.name]), form.clientId)),
    field("lite.release", select("release", releaseOptions(), form.clientRelease ?? "")),
    field("lite.profile", select("profile", profileOptions(), form.profile)),
    field(
      "lite.intensity",
      select(
        "intensity",
        (["low", "medium", "high"] as const).map((i) => [i, t(`lite.intensity.${i}`)]),
        form.intensity,
      ),
    ),
    field("lite.junk", h("input", { id: "junk", type: "number", min: "0", max: "15", value: String(form.junkLevel) })),
    field("lite.region", select("region", REGIONS.map((r) => [r, t(`lite.region.${r}`)]), form.hostRegion)),
    field("lite.host", h("input", { id: "host", type: "text", value: form.customHost, spellcheck: "false", autocomplete: "off" })),
    field("lite.mtu", h("input", { id: "mtu", type: "number", min: "576", max: "9000", value: String(form.mtu) })),
  );

  const toggles = h("fieldset", { class: "toggles" }, tr("legend", "lite.options"));
  for (const [key, label, group] of TOGGLES) {
    const box = checkbox(`opt-${key}`, label, Boolean(form[key]));
    box.dataset.group = group;
    toggles.append(box);
  }

  const tags = h("fieldset", { class: "toggles", id: "tags" }, tr("legend", "lite.tags"));
  for (const [key, tag] of TAGS) {
    const input = h("input", { type: "checkbox", id: `tag-${key}`, checked: Boolean(form[key]) });
    tags.append(h("label", { class: "check", for: input.id }, input, h("code", { text: `<${tag}>` })));
  }

  const actions = h(
    "div",
    { class: "actions" },
    tr("button", "lite.generate", { id: "generate", type: "button", class: "primary" }),
    tr("button", "lite.copy", { id: "copy", type: "button" }),
    tr("button", "lite.download", { id: "download", type: "button" }),
  );

  const output = h(
    "section",
    { class: "output" },
    h("pre", { id: "conf", tabindex: "0" }),
    h("div", { id: "problems", class: "list" }),
    h("div", { id: "notes", class: "list notes" }),
  );

  const checker = h(
    "section",
    { class: "checker" },
    tr("h2", "lite.check"),
    tr("p", "lite.checkHint", { class: "muted" }),
    h("textarea", { id: "paste", rows: "8", spellcheck: "false" }),
    tr("button", "lite.checkButton", { id: "check", type: "button" }),
    h("div", { id: "checked", class: "list" }),
  );

  const footer = h(
    "footer",
    { class: "muted" },
    h("span", { id: "build" }),
    " · ",
    h("a", { href: SOURCE, rel: "noopener", "data-i18n": "lite.source", text: t("lite.source") }),
    " · MIT",
  );

  root.append(header, rare, h("main", {}, grid, toggles, tags, actions, output, checker), footer);
}

/* ── Reading and showing ──────────────────────────────────────────────────── */

function readForm(): GeneratorInput {
  const next: GeneratorInput = {
    ...form,
    version: $<HTMLSelectElement>("version").value as GeneratorInput["version"],
    clientId: $<HTMLSelectElement>("client").value,
    clientRelease: $<HTMLSelectElement>("release").value || null,
    profile: $<HTMLSelectElement>("profile").value as GeneratorInput["profile"],
    intensity: $<HTMLSelectElement>("intensity").value as GeneratorInput["intensity"],
    junkLevel: clamp(Number($<HTMLInputElement>("junk").value), 0, 15, 5),
    hostRegion: $<HTMLSelectElement>("region").value as GeneratorInput["hostRegion"],
    customHost: $<HTMLInputElement>("host").value.trim(),
    mtu: clamp(Number($<HTMLInputElement>("mtu").value), 576, 9000, 1500),
  };
  for (const [key] of TOGGLES) (next as unknown as Record<string, unknown>)[key] = $<HTMLInputElement>(`opt-${key}`).checked;
  for (const [key] of TAGS) (next as unknown as Record<string, unknown>)[key] = $<HTMLInputElement>(`tag-${key}`).checked;
  return next;
}

function clamp(n: number, lo: number, hi: number, fallback: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
}

/** Hide what the version or the client does not have. */
function syncAvailability(): void {
  const on = switchesFor(form.version);
  for (const el of document.querySelectorAll<HTMLElement>("[data-group]")) {
    const group = el.dataset.group;
    el.hidden = (group === "awg3" && !on.awg3) || (group === "awg31" && !on.awg31);
  }
  $("tags").hidden = !on.cps;

  const engine = clientCaps(form.clientId, form.clientRelease).limits.engine;
  for (const [key, tag] of TAGS) {
    const input = $<HTMLInputElement>(`tag-${key}`);
    input.disabled = !engineHasTag(engine, tag);
    input.parentElement!.title = input.disabled ? engine.label : "";
  }

  const releases = releaseOptions();
  const release = $<HTMLSelectElement>("release");
  release.replaceChildren(...releases.map(([v, l]) => h("option", { value: v, text: l })));
  release.value = form.clientRelease ?? "";
  release.closest(".field")!.toggleAttribute("hidden", releases.length < 2);
}

function list(id: string, title: string, items: { level?: string; text: string }[]): void {
  const box = $(id);
  box.replaceChildren();
  if (!items.length) return;
  box.append(h("h3", { text: title }));
  const ul = h("ul");
  for (const item of items) ul.append(h("li", { class: item.level ?? "", text: item.text }));
  box.append(ul);
}

function run(): void {
  form = { ...readForm(), iterCount: form.iterCount + 1 };
  save({ ...form, iterCount: 0 });
  syncAvailability();
  try {
    const result = generate(form);
    lastText = result.text;
    $("conf").textContent = result.text;
    list("problems", t("lite.problems"), result.findings.map((text) => ({ text })));
    list("notes", t("lite.notes"), result.notes.map((text) => ({ text })));
  } catch (error) {
    lastText = "";
    $("conf").textContent = `${t("lite.error")}: ${(error as Error).message}`;
  }
}

function runCheck(): void {
  const text = $<HTMLTextAreaElement>("paste").value;
  if (!text.trim()) return;
  const lines = check(text, form.clientId, form.clientRelease ?? null);
  const box = $("checked");
  if (!lines.length) {
    box.replaceChildren(h("p", { class: "ok", text: t("lite.checkClean") }));
    return;
  }
  list("checked", t("lite.problems"), lines);
}

async function copy(): Promise<void> {
  if (!lastText) return;
  const button = $("copy");
  try {
    await navigator.clipboard.writeText(lastText);
  } catch {
    // file:// and older browsers: fall back to a selection.
    const area = h("textarea", {});
    area.value = lastText;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  button.textContent = t("lite.copied");
  setTimeout(() => (button.textContent = t("lite.copy")), 1500);
}

function download(): void {
  if (!lastText) return;
  const url = URL.createObjectURL(new Blob([lastText], { type: "text/plain" }));
  const a = h("a", { href: url, download: `awg-${form.version}-${form.profile}.conf` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function relabel(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n!);
  }
  const keep = (id: string, options: [string, string][]) => {
    const el = $<HTMLSelectElement>(id);
    const value = el.value;
    el.replaceChildren(...options.map(([v, l]) => h("option", { value: v, text: l })));
    el.value = value;
  };
  keep("profile", profileOptions());
  keep("intensity", (["low", "medium", "high"] as const).map((i) => [i, t(`lite.intensity.${i}`)]));
  keep("region", REGIONS.map((r) => [r, t(`lite.region.${r}`)]));
  $<HTMLInputElement>("host").placeholder = t("lite.hostPlaceholder");
  $("build").textContent = t("lite.build", {
    version: __APP_VERSION__,
    date: __BUILD_TIME__.slice(0, 10),
  });
}

/* ── Start ────────────────────────────────────────────────────────────────── */

function start(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(`${STORE}-lang`);
  } catch {
    // ignore
  }
  const lang: LiteLocale = saved === "en" || saved === "ru"
    ? saved
    : navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en";
  setLocale(lang);

  const root = document.getElementById("app")!;
  build(root);
  relabel();

  root.addEventListener("change", (e) => {
    const target = e.target as HTMLElement;
    if (target.id === "paste") return;
    if (target.id === "client") $<HTMLSelectElement>("release").value = "";
    run();
  });
  $("generate").addEventListener("click", run);
  $("copy").addEventListener("click", () => void copy());
  $("download").addEventListener("click", download);
  $("check").addEventListener("click", runCheck);
  $("lang").addEventListener("click", () => {
    const next: LiteLocale = getLocale() === "ru" ? "en" : "ru";
    setLocale(next);
    try {
      localStorage.setItem(`${STORE}-lang`, next);
    } catch {
      // ignore
    }
    relabel();
    run();
    runCheck();
  });

  run();
}

start();
