import { connection, NextResponse } from "next/server";
import {
  approve,
  launch,
  listCampaigns,
  reject,
  submit,
  type Actor,
  type Result,
} from "@/lib/campaign-store";
import { limited, readJson, reviewerAllowed } from "@/lib/security";

const err = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

export async function GET() {
  await connection();
  return NextResponse.json({ campaigns: listCampaigns() });
}

export async function POST(req: Request) {
  if (limited(req, "approvals", 40))
    return err(429, "Too many requests. Please wait a minute.");
  const parsed = await readJson(req);
  if (!parsed.ok) return err(parsed.status, parsed.error);
  const b = parsed.body;
  const id = typeof b.id === "string" ? b.id.trim() : "";
  if (
    !id ||
    id.length > 64 ||
    !["submit", "approve", "reject", "launch"].includes(b.action as string)
  )
    return err(400, "id and a valid action are required.");

  const reviewer =
    typeof b.reviewer === "string" ? b.reviewer.trim().slice(0, 60) : "";
  if (b.action !== "submit") {
    // approve, reject and launch need a named person who also knows the reviewer passcode
    if (reviewer.length < 2)
      return err(
        401,
        "Enter your reviewer name first. Approvals must come from a named person.",
      );
    const auth = reviewerAllowed(b.passcode);
    if (!auth.ok) return err(auth.status, auth.error);
  }
  let approvedBudget: number | undefined;
  if (b.approvedBudget !== undefined) {
    if (
      typeof b.approvedBudget !== "number" ||
      !Number.isFinite(b.approvedBudget) ||
      b.approvedBudget <= 0 ||
      b.approvedBudget > 1e9
    )
      return err(400, "approvedBudget must be a number above zero.");
    approvedBudget = b.approvedBudget;
  }
  const actor: Actor =
    b.action === "submit"
      ? { kind: "agent", name: "Marketing Agent" }
      : { kind: "human", name: reviewer };
  try {
    const r: Result =
      b.action === "submit"
        ? submit(id, actor)
        : b.action === "approve"
          ? approve(id, approvedBudget, actor)
          : b.action === "reject"
            ? reject(id, actor)
            : launch(id, actor);
    return r.ok
      ? NextResponse.json({ campaign: r.campaign })
      : NextResponse.json(
          { error: r.error, campaign: r.campaign },
          { status: r.status },
        );
  } catch {
    console.error("approvals: unexpected error");
    return err(500, "Something went wrong. Please try again.");
  }
}
