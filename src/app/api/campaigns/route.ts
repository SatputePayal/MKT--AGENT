// import { NextResponse } from 'next/server';
// import { createDraft, isChannel, submit, type Actor } from '@/lib/campaign-store';
// import { limited, readJson } from '@/lib/security';

// const err = (status: number, error: string) => NextResponse.json({ error }, { status });

// // Used by the Campaign Planner. A new campaign can only start as DRAFT or PENDING_APPROVAL, never as anything further.
// export async function POST(req: Request) {
//   if (limited(req, 'campaigns', 20)) return err(429, 'Too many requests. Please wait a minute.');
//   const parsed = await readJson(req);
//   if (!parsed.ok) return err(parsed.status, parsed.error);
//   const b = parsed.body;
//   const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
//   const name = s(b.name, 120), business = s(b.business, 120), channel = s(b.channel, 30), budget = typeof b.requestedBudget === 'number' ? b.requestedBudget : NaN;
//   if (!name || !business || !isChannel(channel) || !Number.isFinite(budget) || budget <= 0 || budget > 1e8)
//     return err(400, 'Campaign name, business, channel and a budget between 1 and 10,00,00,000 are required.');
//   try {
//     const agent: Actor = { kind: 'agent', name: 'Marketing Agent' };
//     const draft = createDraft({ name, business, channel, requestedBudget: budget }, agent);
//     const r = b.submit === true ? submit(draft.id, agent) : { ok: true as const, campaign: draft };
//     return NextResponse.json({ campaign: r.ok ? r.campaign : draft }, { status: 201 });
//   } catch {
//     console.error('campaigns: unexpected error');
//     return err(500, 'Something went wrong. Please try again.');
//   }
// }

import { NextResponse } from "next/server";
import {
  createDraft,
  isChannel,
  submit,
  type Actor,
} from "@/lib/campaign-store";
import { limited, readJson } from "@/lib/security";

const err = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

// Used by the Campaign Planner. A new campaign can only start as DRAFT or PENDING_APPROVAL, never as anything further.
export async function POST(req: Request) {
  if (limited(req, "campaigns", 20))
    return err(429, "Too many requests. Please wait a minute.");
  const parsed = await readJson(req);
  if (!parsed.ok) return err(parsed.status, parsed.error);
  const b = parsed.body;
  const s = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const name = s(b.name, 120),
    business = s(b.business, 120),
    channel = s(b.channel, 30),
    budget = typeof b.requestedBudget === "number" ? b.requestedBudget : NaN;
  if (
    !name ||
    !business ||
    !isChannel(channel) ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    budget > 1e8
  )
    return err(
      400,
      "Campaign name, business, channel and a budget between 1 and 10,00,00,000 are required.",
    );
  try {
    const agent: Actor = { kind: "agent", name: "Marketing Agent" };
    const draft = createDraft(
      { name, business, channel, requestedBudget: budget },
      agent,
    );
    const r =
      b.submit === true
        ? submit(draft.id, agent)
        : { ok: true as const, campaign: draft };
    return NextResponse.json(
      { campaign: r.ok ? r.campaign : draft },
      { status: 201 },
    );
  } catch {
    console.error("campaigns: unexpected error");
    return err(500, "Something went wrong. Please try again.");
  }
}
