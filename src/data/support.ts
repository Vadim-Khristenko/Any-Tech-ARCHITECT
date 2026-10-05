/**
 * Support and portfolio data.
 *
 * Crypto addresses are checksummed constants — a typo here sends someone's
 * money to nobody, so they are kept in one place, never interpolated, and
 * rendered verbatim.
 */

import type { Locale, Localised } from "@/i18n";

/* ── Crypto ──────────────────────────────────────────────────────────────── */

export interface CryptoWallet {
  id: string;
  /** Coin or token name as its holders would write it. */
  name: string;
  /** Ticker shown next to the name. */
  ticker: string;
  /** Network, spelled out — sending on the wrong one is unrecoverable. */
  network: Localised<string>;
  address: string;
}

export const CRYPTO_WALLETS: CryptoWallet[] = [
  {
    id: "btc",
    name: "Bitcoin",
    ticker: "BTC",
    network: { ru: "Bitcoin · Native SegWit", en: "Bitcoin · Native SegWit" },
    address: "bc1qwvfpdhjuzelw8s9vxcfjj6fatnq3cltf0d48jy",
  },
  {
    id: "eth",
    name: "Ethereum",
    ticker: "ETH",
    network: { ru: "Ethereum · ERC-20", en: "Ethereum · ERC-20" },
    address: "0x277195Ff068756F09683FAB523b2cdDf8Ef35B44",
  },
  {
    id: "ton",
    name: "Toncoin",
    ticker: "TON",
    network: { ru: "The Open Network", en: "The Open Network" },
    address: "UQBVdcwKqy8lx_2plsf2YPbcBJdYbPtnKbddmFWZntqiAEME",
  },
  {
    id: "usdt-ton",
    name: "Tether USD",
    ticker: "USDT",
    network: { ru: "JETTON · TON", en: "JETTON · TON" },
    address: "UQCaNScHxNbJsCi5Wc47rJqNpJPiDASUlMJ1nRwxq-hXSGoQ",
  },
  {
    id: "trx",
    name: "Tron",
    ticker: "TRX",
    network: { ru: "Tron · TRC-20", en: "Tron · TRC-20" },
    address: "TC8dYqkDYQkuCKe7A6PWXUgDRB8Rr2Xd9f",
  },
  {
    id: "sol",
    name: "Solana",
    ticker: "SOL",
    network: { ru: "Solana", en: "Solana" },
    address: "4i2uWx82jhgVorPQyM2y47X2YvRgCVNNWPfNmVrGcCaE",
  },
];

/* ── Fiat / recurring ────────────────────────────────────────────────────── */

export interface FiatMethod {
  id: string;
  label: string;
  note: Localised<string>;
  url: string;
}

export const FIAT_METHODS: FiatMethod[] = [
  {
    id: "yoomoney",
    label: "YooMoney",
    note: { ru: "Разовый перевод", en: "One-off payment" },
    url: "https://yoomoney.ru/fundraise/1GA2JV51324.260304",
  },
  {
    id: "patreon",
    label: "Patreon",
    note: { ru: "Регулярная поддержка", en: "Recurring support" },
    url: "https://patreon.com/VAI_PROG",
  },
  {
    id: "dalink",
    label: "DaLink",
    note: { ru: "Донат-ссылка", en: "Donation link" },
    url: "https://dalink.to/vai_prog",
  },
];

/* ── Other projects ──────────────────────────────────────────────────────── */

export interface PortfolioLink {
  id: string;
  title: Localised<string>;
  desc: Localised<string>;
  url: string;
}

export const PORTFOLIO_URL = "https://vai-rice.space";

export const OTHER_PROJECTS: PortfolioLink[] = [
  {
    id: "portfolio",
    title: { ru: "vai-rice.space", en: "vai-rice.space" },
    desc: {
      ru: "Портфолио: остальные проекты, которые я делаю — инструменты, сервисы и эксперименты.",
      en: "Portfolio: the rest of what I build — tools, services and experiments.",
    },
    url: PORTFOLIO_URL,
  },
  {
    id: "vaiexia",
    title: { ru: "VAIEXIA", en: "VAIEXIA" },
    desc: {
      ru: "Веб-панель и бот для Telegram, Discord и Matrix: управление сервером или кластером откуда угодно.",
      en: "A web panel plus Telegram, Discord and Matrix bots: run a server or a cluster from anywhere.",
    },
    url: "/vaiexia",
  },
  {
    id: "mirror",
    title: { ru: "git.vai-rice.space", en: "git.vai-rice.space" },
    desc: {
      ru: "Зеркало репозиториев Amnezia для тех, у кого не открывается GitHub.",
      en: "A mirror of the Amnezia repositories for anyone who cannot reach GitHub.",
    },
    url: "https://git.vai-rice.space/amnezia-vpn",
  },
];
