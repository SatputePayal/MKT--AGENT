// Realistic mock analytics for the Performance Dashboard. Deterministic (seeded), so server and browser always agree.
// Google Ads, Meta Ads and GA4 will replace this file's `rows` through the adapter layer in a later phase.
import { formatINR } from "./budget";

export type Tone = "success" | "danger" | "warning" | "info" | "neutral";
export interface PerfCampaign {
  id: string;
  name: string;
  channel: "Google Ads" | "Meta Ads";
}
export interface Row {
  date: string;
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  revenue: number;
}
export interface Totals {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpl: number;
  cvr: number;
  roas: number;
}

export const DAYS = 60;
export const END = "2026-11-19";
export const addDays = (iso: string, n: number) =>
  new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5)
    .toISOString()
    .slice(0, 10);
export const START = addDays(END, -(DAYS - 1));
export const range = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const dayLabel = (iso: string) =>
  `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

// Each profile: daily baseline + how each metric drifts over the 60 days (0.3 = ends 30% higher, -0.3 = 30% lower).
const PROFILES = [
  {
    id: "p1",
    name: "Spring Search – Brand",
    channel: "Google Ads",
    imp: 5200,
    ctr: 0.042,
    cpc: 21,
    lead: 0.09,
    qual: 0.45,
    aov: 2100,
    d: { ctr: 0.05, cpc: 0, lead: 0.1, qual: 0 },
  },
  {
    id: "p2",
    name: "Retargeting – Site Visitors",
    channel: "Meta Ads",
    imp: 21000,
    ctr: 0.011,
    cpc: 9,
    lead: 0.075,
    qual: 0.35,
    aov: 900,
    d: { ctr: 0, cpc: 0.05, lead: 0, qual: 0 },
  },
  {
    id: "p3",
    name: "Lead Gen – SaaS Trial",
    channel: "Google Ads",
    imp: 4200,
    ctr: 0.031,
    cpc: 34,
    lead: 0.06,
    qual: 0.28,
    aov: 3200,
    d: { ctr: 0, cpc: 0.05, lead: 0, qual: 0 },
  },
  {
    id: "p4",
    name: "Webinar Promo",
    channel: "Google Ads",
    imp: 4500,
    ctr: 0.03,
    cpc: 32,
    lead: 0.08,
    qual: 0.3,
    aov: 1000,
    d: { ctr: -0.3, cpc: 0.25, lead: -0.4, qual: -0.15 },
  },
  {
    id: "p5",
    name: "Lookalike – Free Trial",
    channel: "Meta Ads",
    imp: 26000,
    ctr: 0.0085,
    cpc: 11,
    lead: 0.07,
    qual: 0.33,
    aov: 1400,
    d: { ctr: 0.25, cpc: -0.05, lead: 0.3, qual: 0.1 },
  },
  {
    id: "p6",
    name: "Product Demo – Search",
    channel: "Google Ads",
    imp: 2600,
    ctr: 0.052,
    cpc: 38,
    lead: 0.11,
    qual: 0.52,
    aov: 2800,
    d: { ctr: 0, cpc: 0, lead: 0, qual: 0 },
  },
] as const;
export const perfCampaigns: PerfCampaign[] = PROFILES.map((p) => ({
  id: p.id,
  name: p.name,
  channel: p.channel,
}));
export const channelOf: Record<string, string> = Object.fromEntries(
  PROFILES.map((p) => [p.id, p.channel]),
);

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rows: Row[] = PROFILES.flatMap((p, pi) => {
  const rand = rng(1000 + pi * 77);
  return Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(START, i),
      dow = new Date(date + "T00:00:00Z").getUTCDay(),
      pr = i / (DAYS - 1);
    const wk =
      dow === 0 || dow === 6 ? (p.channel === "Google Ads" ? 0.78 : 1.08) : 1;
    const j = (spread: number) => 1 - spread / 2 + rand() * spread;
    const impressions = Math.round(p.imp * wk * j(0.22));
    const clicks = Math.round(
      impressions * p.ctr * (1 + p.d.ctr * pr) * j(0.16),
    );
    const spend = Math.round(clicks * p.cpc * (1 + p.d.cpc * pr) * j(0.14));
    const leads = Math.round(clicks * p.lead * (1 + p.d.lead * pr) * j(0.22));
    const conversions = Math.round(
      leads * p.qual * (1 + p.d.qual * pr) * j(0.3),
    );
    return {
      date,
      campaignId: p.id,
      impressions,
      clicks,
      spend,
      leads,
      conversions,
      revenue: Math.round(conversions * p.aov * j(0.2)),
    };
  });
});

const div = (a: number, b: number) => (b ? a / b : 0);
export function aggregate(rs: Row[]): Totals {
  const s = (k: keyof Row) => rs.reduce((a, r) => a + (r[k] as number), 0);
  const t = {
    impressions: s("impressions"),
    clicks: s("clicks"),
    spend: s("spend"),
    leads: s("leads"),
    conversions: s("conversions"),
    revenue: s("revenue"),
  };
  return {
    ...t,
    ctr: div(t.clicks, t.impressions),
    cpc: div(t.spend, t.clicks),
    cpl: div(t.spend, t.leads),
    cvr: div(t.conversions, t.clicks),
    roas: div(t.revenue, t.spend),
  };
}

export type MetricKey =
  | "leads"
  | "cpl"
  | "roas"
  | "ctr"
  | "cvr"
  | "spend"
  | "clicks"
  | "conversions";
export interface KpiDef {
  key: MetricKey;
  label: string;
  fmt: (n: number) => string;
  better: "up" | "down" | null;
  good?: number;
  poor?: number;
  hint?: string;
}
const pct = (n: number) => (n * 100).toFixed(2) + "%";
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-IN");
export const KPIS: KpiDef[] = [
  { key: "leads", label: "Total Leads", fmt: fmtInt, better: "up" },
  {
    key: "cpl",
    label: "Cost Per Lead",
    fmt: (n) => formatINR(Math.round(n)),
    better: "down",
    good: 300,
    poor: 600,
    hint: "Good ≤ ₹300 · Poor > ₹600",
  },
  {
    key: "roas",
    label: "ROAS",
    fmt: (n) => n.toFixed(2) + "x",
    better: "up",
    good: 3,
    poor: 1.5,
    hint: "Good ≥ 3x · Poor < 1.5x",
  },
  {
    key: "ctr",
    label: "Click-Through Rate",
    fmt: pct,
    better: "up",
    good: 0.02,
    poor: 0.01,
    hint: "Good ≥ 2% · Poor < 1%",
  },
  {
    key: "cvr",
    label: "Conversion Rate",
    fmt: pct,
    better: "up",
    good: 0.03,
    poor: 0.015,
    hint: "Good ≥ 3% · Poor < 1.5%",
  },
  {
    key: "spend",
    label: "Total Spend",
    fmt: (n) => formatINR(Math.round(n)),
    better: null,
  },
  { key: "clicks", label: "Clicks", fmt: fmtInt, better: "up" },
  { key: "conversions", label: "Conversions", fmt: fmtInt, better: "up" },
];
export const KPI = Object.fromEntries(KPIS.map((k) => [k.key, k])) as Record<
  MetricKey,
  KpiDef
>;

export type Rating = "good" | "ok" | "poor";
export function rate(k: KpiDef, v: number, hasData = true): Rating | null {
  if (k.good === undefined || k.poor === undefined || !hasData) return null;
  if (k.better === "down" && v === 0) return "poor"; // money spent but no leads
  if (k.better === "up")
    return v >= k.good ? "good" : v < k.poor ? "poor" : "ok";
  return v <= k.good ? "good" : v > k.poor ? "poor" : "ok";
}
export function change(cur: number, prev: number | null | undefined) {
  return prev ? (cur - prev) / prev : null;
}
export function trendTone(k: KpiDef, ch: number | null): Tone {
  if (ch === null || Math.abs(ch) < 0.01 || k.better === null) return "neutral";
  return ch > 0 === (k.better === "up") ? "success" : "danger";
}

export interface CampaignView {
  c: PerfCampaign;
  t: Totals;
  p: Totals | null;
  leadsDaily: number[];
}
export function buildInsights(
  camps: CampaignView[],
  cur: Totals,
  prev: Totals | null,
): { tone: Tone; text: string }[] {
  const out: { tone: Tone; text: string }[] = [];
  const live = camps
    .filter((x) => x.t.spend > 0)
    .sort((a, b) => b.t.roas - a.t.roas);
  if (live.length > 1) {
    const best = live[0],
      worst = live[live.length - 1];
    out.push({
      tone: best.t.roas >= 3 ? "success" : "info",
      text: `${best.c.name} is the top performer: ${best.t.roas.toFixed(2)}x ROAS at ${formatINR(Math.round(best.t.cpl))} per lead.`,
    });
    if (worst.t.roas < 1.5)
      out.push({
        tone: "danger",
        text: `${worst.c.name} returns only ${worst.t.roas.toFixed(2)}x on spend${worst.t.roas < 1 ? ", which is below break-even" : ""}. Review its targeting and landing page, or pause it.`,
      });
  }
  const cl = change(cur.leads, prev?.leads),
    cc = change(cur.cpl, prev?.cpl);
  if (cl !== null && cc !== null)
    out.push({
      tone: cl > 0 && cc < 0 ? "success" : cl < 0 && cc > 0 ? "danger" : "info",
      text: `Leads ${cl >= 0 ? "rose" : "fell"} ${Math.abs(cl * 100).toFixed(1)}% while cost per lead ${cc >= 0 ? "rose" : "fell"} ${Math.abs(cc * 100).toFixed(1)}% versus the previous period.`,
    });
  const drop = camps
    .map((x) => ({ x, ch: change(x.t.roas, x.p?.roas) }))
    .filter((d) => d.ch !== null && d.ch < -0.15)
    .sort((a, b) => (a.ch as number) - (b.ch as number))[0];
  if (drop)
    out.push({
      tone: "warning",
      text: `${drop.x.c.name}: ROAS fell ${Math.abs((drop.ch as number) * 100).toFixed(0)}% versus the previous period.`,
    });
  return out.slice(0, 4);
}
