// Server-side source of truth for campaigns and the human approval workflow (in-memory mock; Supabase later).
// Every status change goes through move(), which only accepts the transitions in ALLOWED.
import { CHANNELS } from "./ad-copy";
import { formatINR, validateSpend, type SpendCheck } from "./budget";

export const STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "LAUNCHED",
  "BLOCKED",
] as const;
export type CampaignStatus = (typeof STATUSES)[number];
export type Actor = { kind: "human" | "agent"; name: string };
type By = { kind: "human" | "agent" | "system"; name: string };

export interface HistoryEvent {
  at: string;
  from: CampaignStatus | null;
  to: CampaignStatus;
  by: string;
  byKind: By["kind"];
  note: string;
}
export interface Campaign {
  id: string;
  name: string;
  business: string;
  channel: string;
  requestedBudget: number;
  requestedSpend: number;
  approvedBudget?: number;
  spent: number;
  status: CampaignStatus;
  createdAt: string;
  blockedReason?: string;
  externalId?: string;
  history: HistoryEvent[];
}
export type Result =
  | { ok: true; campaign: Campaign }
  | { ok: false; status: number; error: string; campaign?: Campaign };

// Rule 1: LAUNCHED can only be reached from APPROVED, and APPROVED only from PENDING_APPROVAL or BLOCKED.
const ALLOWED: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "BLOCKED"],
  BLOCKED: ["APPROVED", "REJECTED", "BLOCKED"],
  APPROVED: ["LAUNCHED", "REJECTED", "BLOCKED"],
  REJECTED: [],
  LAUNCHED: [],
};
const AGENT: By = { kind: "agent", name: "Marketing Agent" };
const SYSTEM: By = { kind: "system", name: "Budget guardrail" };
const REVIEWER: By = { kind: "human", name: "Priya (Reviewer)" };
const now = () => new Date().toISOString();

function move(
  c: Campaign,
  to: CampaignStatus,
  by: By,
  note: string,
  at = now(),
) {
  if (!ALLOWED[c.status].includes(to))
    throw new Error(`Illegal status change ${c.status} -> ${to}`);
  c.history.push({
    at,
    from: c.status,
    to,
    by: by.name,
    byKind: by.kind,
    note,
  });
  c.status = to;
}

function seed(
  id: string,
  name: string,
  business: string,
  channel: string,
  req: number,
  created: string,
  path: CampaignStatus[],
  o: Partial<Campaign> = {},
): Campaign {
  const c: Campaign = {
    id,
    name,
    business,
    channel,
    requestedBudget: req,
    requestedSpend: req,
    spent: 0,
    status: "DRAFT",
    createdAt: created,
    history: [
      {
        at: created,
        from: null,
        to: "DRAFT",
        by: AGENT.name,
        byKind: "agent",
        note: "Plan drafted by the marketing agent",
      },
    ],
    ...o,
  };
  const notes: Record<string, string> = {
    PENDING_APPROVAL: "Submitted for approval",
    APPROVED: "Approved by reviewer",
    REJECTED: "Rejected by reviewer",
    LAUNCHED: "Launched after the budget check passed",
    BLOCKED: c.blockedReason ?? "Blocked",
  };
  path
    .slice(1)
    .forEach((to, i) =>
      move(
        c,
        to,
        to === "PENDING_APPROVAL"
          ? AGENT
          : to === "BLOCKED"
            ? SYSTEM
            : REVIEWER,
        notes[to],
        new Date(Date.parse(created) + (i + 1) * 36e5).toISOString(),
      ),
    );
  return c;
}
const P: CampaignStatus[] = ["DRAFT", "PENDING_APPROVAL"];
const g = globalThis as unknown as { __campaignDb?: Campaign[] };
g.__campaignDb ??= [
  seed(
    "k1",
    "Monsoon Offer – Search",
    "Aarav Fitness Studios",
    "Google Ads",
    12000,
    "2026-11-19T09:10:00Z",
    ["DRAFT"],
  ),
  seed(
    "k2",
    "Festive Offer – Prospecting",
    "Zenith Home Decor",
    "Meta Ads",
    60000,
    "2026-11-18T10:24:00Z",
    P,
  ),
  seed(
    "k3",
    "Brand Awareness – Video",
    "Zenith Home Decor",
    "Meta Ads",
    25000,
    "2026-11-17T17:05:00Z",
    P,
  ),
  seed(
    "k4",
    "Lead Gen – SaaS Trial",
    "TaskFlow Software",
    "Google Ads",
    40000,
    "2026-11-17T09:12:00Z",
    P,
  ),
  seed(
    "k5",
    "Webinar Promo",
    "EduSpark Academy",
    "Google Ads",
    15000,
    "2026-11-14T11:00:00Z",
    [...P, "APPROVED"],
    { approvedBudget: 15000 },
  ),
  seed(
    "k6",
    "Spring Search – Brand",
    "TaskFlow Software",
    "Google Ads",
    50000,
    "2026-11-05T08:30:00Z",
    [...P, "APPROVED", "LAUNCHED"],
    { approvedBudget: 50000, spent: 50000, externalId: "mock_k6" },
  ),
  seed(
    "k7",
    "Diwali Mega Sale",
    "Zenith Home Decor",
    "Meta Ads",
    25000,
    "2026-11-12T13:45:00Z",
    [...P, "BLOCKED"],
    {
      approvedBudget: 20000,
      blockedReason: validateSpend(20000, 25000).reason,
    },
  ),
  seed(
    "k8",
    "Flash Sale – Broad Targeting",
    "Aarav Fitness Studios",
    "Meta Ads",
    40000,
    "2026-11-08T15:20:00Z",
    [...P, "REJECTED"],
  ),
];
const db = () => g.__campaignDb as Campaign[];
const find = (id: string) => db().find((c) => c.id === id);
const fail = (status: number, error: string, campaign?: Campaign): Result => ({
  ok: false,
  status,
  error,
  campaign,
});
const humanOnly = (actor: Actor, what: string) =>
  actor.kind === "human"
    ? null
    : fail(403, `Only a human reviewer can ${what}. The AI agent cannot.`);

export const listCampaigns = () =>
  [...db()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function createDraft(
  i: {
    name: string;
    business: string;
    channel: string;
    requestedBudget: number;
  },
  actor: Actor,
): Campaign {
  const at = now();
  const c: Campaign = {
    id: "c_" + Math.random().toString(36).slice(2, 8),
    name: i.name,
    business: i.business,
    channel: i.channel,
    requestedBudget: i.requestedBudget,
    requestedSpend: i.requestedBudget,
    spent: 0,
    status: "DRAFT",
    createdAt: at,
    history: [
      {
        at,
        from: null,
        to: "DRAFT",
        by: actor.name,
        byKind: actor.kind,
        note: "Campaign drafted",
      },
    ],
  };
  db().push(c);
  return c;
}
export const isChannel = (v: string) =>
  (CHANNELS as readonly string[]).includes(v);

export function submit(id: string, actor: Actor): Result {
  const c = find(id);
  if (!c) return fail(404, "Campaign not found.");
  if (c.status !== "DRAFT")
    return fail(
      409,
      `Only a DRAFT can be submitted. Current status: ${c.status}.`,
      c,
    );
  move(c, "PENDING_APPROVAL", actor, "Submitted for approval");
  return { ok: true, campaign: c };
}

export function approve(
  id: string,
  approvedBudget: number | undefined,
  actor: Actor,
): Result {
  const c = find(id);
  if (!c) return fail(404, "Campaign not found.");
  const denied = humanOnly(actor, "approve a paid campaign");
  if (denied) return denied;
  if (c.status !== "PENDING_APPROVAL" && c.status !== "BLOCKED")
    return fail(
      409,
      `Only a pending or blocked campaign can be approved. Current status: ${c.status}.`,
      c,
    );
  const budget = approvedBudget ?? c.requestedBudget;
  if (Number.isFinite(budget) && budget > c.requestedBudget)
    return fail(
      422,
      "The approved budget cannot be higher than the requested budget.",
      c,
    );
  if (Number.isFinite(budget)) c.approvedBudget = budget;
  const check = validateSpend(budget, c.requestedSpend, c.spent);
  if (!check.allowed) {
    c.blockedReason = check.reason;
    move(c, "BLOCKED", SYSTEM, check.reason);
    return fail(422, check.reason, c);
  } // Rule 6
  c.blockedReason = undefined;
  move(c, "APPROVED", actor, `Approved with a budget of ${formatINR(budget)}`);
  return { ok: true, campaign: c };
}

export function reject(id: string, actor: Actor): Result {
  const c = find(id);
  if (!c) return fail(404, "Campaign not found.");
  const denied = humanOnly(actor, "reject a campaign");
  if (denied) return denied;
  if (!ALLOWED[c.status].includes("REJECTED"))
    return fail(409, `A ${c.status} campaign cannot be rejected.`, c);
  move(c, "REJECTED", actor, "Rejected by reviewer");
  return { ok: true, campaign: c };
}

// The only function that can set LAUNCHED. Needs APPROVED status and re-checks the budget (Phase 5 guard).
export function launch(id: string, actor: Actor): Result {
  const c = find(id);
  if (!c) return fail(404, "Campaign not found.");
  const denied = humanOnly(actor, "launch a paid campaign");
  if (denied) return denied;
  if (c.status !== "APPROVED")
    return fail(
      409,
      `Only an APPROVED campaign can be launched. Current status: ${c.status}.`,
      c,
    );
  const check = validateSpend(c.approvedBudget ?? 0, c.requestedSpend, c.spent);
  if (!check.allowed) {
    c.blockedReason = check.reason;
    move(c, "BLOCKED", SYSTEM, check.reason);
    return fail(422, check.reason, c);
  }
  c.spent += c.requestedSpend;
  c.externalId = `mock_${c.id}`; // real Google/Meta launch call goes here later
  move(c, "LAUNCHED", actor, "Launched after the budget check passed");
  return { ok: true, campaign: c };
}

export function recordSpend(id: string, amount: number): SpendCheck {
  const c = find(id);
  if (!c || c.status !== "LAUNCHED" || c.approvedBudget === undefined)
    return {
      allowed: false,
      reason: "Blocked: campaign is not approved and launched.",
      remainingBudget: 0,
    };
  const check = validateSpend(c.approvedBudget, amount, c.spent);
  if (check.allowed) c.spent += amount;
  return check;
}
