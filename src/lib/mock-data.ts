import { formatINR } from "./budget";
export type Channel = "Google Ads" | "Meta Ads";
export type Status = "Active" | "Paused" | "Pending approval" | "Draft";
export interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  status: Status;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}
export const campaigns: Campaign[] = [
  {
    id: "c1",
    name: "Spring Search – Brand",
    channel: "Google Ads",
    status: "Active",
    budget: 5000,
    spent: 3180,
    impressions: 182400,
    clicks: 6210,
    conversions: 412,
    revenue: 14420,
  },
  {
    id: "c2",
    name: "Retargeting – Site Visitors",
    channel: "Meta Ads",
    status: "Active",
    budget: 3000,
    spent: 2740,
    impressions: 96200,
    clicks: 2310,
    conversions: 198,
    revenue: 5940,
  },
  {
    id: "c3",
    name: "Lead Gen – SaaS Trial",
    channel: "Google Ads",
    status: "Active",
    budget: 4000,
    spent: 1510,
    impressions: 74800,
    clicks: 1980,
    conversions: 121,
    revenue: 2420,
  },
  {
    id: "c4",
    name: "Webinar Promo",
    channel: "Google Ads",
    status: "Paused",
    budget: 1500,
    spent: 1320,
    impressions: 41200,
    clicks: 780,
    conversions: 36,
    revenue: 720,
  },
  {
    id: "c5",
    name: "Festive Offer – Prospecting",
    channel: "Meta Ads",
    status: "Pending approval",
    budget: 6000,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
  },
  {
    id: "c6",
    name: "Brand Awareness – Video",
    channel: "Meta Ads",
    status: "Pending approval",
    budget: 2500,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
  },
];
export const fmtMoney = (n: number) => formatINR(Math.round(n));
export const fmtNum = (n: number) => n.toLocaleString("en-US");
export const fmtPct = (n: number) => (n * 100).toFixed(2) + "%";
const div = (a: number, b: number) => (b ? a / b : 0);
export const metrics = (c: Campaign) => ({
  ctr: div(c.clicks, c.impressions),
  cpc: div(c.spent, c.clicks),
  cpa: div(c.spent, c.conversions),
  roas: div(c.revenue, c.spent),
});
export function totals(cs: Campaign[]) {
  const s = (k: keyof Campaign) => cs.reduce((a, c) => a + (c[k] as number), 0);
  const spend = s("spent"),
    impressions = s("impressions"),
    clicks = s("clicks"),
    conversions = s("conversions"),
    revenue = s("revenue");
  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    ctr: div(clicks, impressions),
    cpa: div(spend, conversions),
    roas: div(revenue, spend),
  };
}
export const dailySpend = [
  { label: "Mon", value: 1180 },
  { label: "Tue", value: 1320 },
  { label: "Wed", value: 1260 },
  { label: "Thu", value: 1410 },
  { label: "Fri", value: 1290 },
  { label: "Sat", value: 1100 },
  { label: "Sun", value: 1190 },
];
export interface Approval {
  id: string;
  title: string;
  kind: "New campaign" | "Budget increase";
  channel: Channel;
  amount: number;
  submitted: string;
  ads: number;
  blocked: number;
  summary: string;
}
export const approvals: (Approval & { status: "pending" })[] = [
  {
    id: "a1",
    title: "Festive Offer – Prospecting",
    kind: "New campaign",
    channel: "Meta Ads",
    amount: 6000,
    submitted: "Today, 10:24",
    ads: 4,
    blocked: 2,
    summary:
      "Prospecting audiences with 4 ad variants. 2 variants were blocked for unverified claims.",
    status: "pending",
  },
  {
    id: "a2",
    title: "Brand Awareness – Video",
    kind: "New campaign",
    channel: "Meta Ads",
    amount: 2500,
    submitted: "Yesterday, 17:05",
    ads: 3,
    blocked: 0,
    summary:
      "Video reach campaign with 3 ad variants. All copy passed the claims check.",
    status: "pending",
  },
  {
    id: "a3",
    title: "Spring Search – Brand",
    kind: "Budget increase",
    channel: "Google Ads",
    amount: 1500,
    submitted: "Mon, 09:12",
    ads: 0,
    blocked: 0,
    summary:
      "ROAS is above target. The agent proposes adding budget to the best performer.",
    status: "pending",
  },
];
export const approvalHistory = [
  {
    id: "h1",
    title: "Retargeting – Site Visitors",
    amount: 3000,
    decision: "Approved",
    when: "2 Nov, 11:40",
  },
  {
    id: "h2",
    title: "Webinar Promo",
    amount: 1500,
    decision: "Approved",
    when: "28 Oct, 15:02",
  },
  {
    id: "h3",
    title: "Flash Sale – Broad",
    amount: 4000,
    decision: "Rejected",
    when: "24 Oct, 10:18",
  },
];
export const activity = [
  { text: "Weekly report generated for 9–15 Nov", time: "2h ago" },
  {
    text: "Festive Offer – Prospecting submitted for approval",
    time: "4h ago",
  },
  { text: "Webinar Promo paused: ROAS below break-even", time: "Yesterday" },
  {
    text: "Retargeting – Site Visitors reached 91% of budget",
    time: "Yesterday",
  },
  { text: "2 ad variants blocked by the claims check", time: "Mon" },
];
export const insights = [
  "Webinar Promo has a ROAS of 0.55. Consider keeping it paused and revising the landing page.",
  "Spring Search – Brand has the best ROAS. A budget increase is waiting in the approval queue.",
  "Retargeting – Site Visitors is at 91% of its budget. Spend will stop at the approved cap.",
];
export const reports = [
  {
    id: "r1",
    title: "Weekly performance report",
    period: "9–15 Nov 2026",
    status: "Ready",
    spend: 8750,
    roas: 2.14,
    conversions: 767,
  },
  {
    id: "r2",
    title: "Weekly performance report",
    period: "2–8 Nov 2026",
    status: "Ready",
    spend: 8240,
    roas: 1.98,
    conversions: 690,
  },
  {
    id: "r3",
    title: "Weekly performance report",
    period: "26 Oct–1 Nov 2026",
    status: "Ready",
    spend: 7910,
    roas: 1.84,
    conversions: 655,
  },
  {
    id: "r4",
    title: "Weekly performance report",
    period: "19–25 Oct 2026",
    status: "Ready",
    spend: 7320,
    roas: 1.71,
    conversions: 602,
  },
];
export const nextActions = [
  {
    priority: "High",
    text: "Keep Webinar Promo paused and rework the landing page before restarting.",
  },
  {
    priority: "High",
    text: "Review the +₹1,500 budget request for Spring Search – Brand.",
  },
  {
    priority: "Medium",
    text: "Test two new headlines on Lead Gen – SaaS Trial to lift CTR.",
  },
  {
    priority: "Low",
    text: "Collect customer testimonials so more ad claims can be verified.",
  },
];
