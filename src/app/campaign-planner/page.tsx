
"use client";
import { useState } from "react";
import { StatusPill } from "@/components/approval-ui";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import type { CampaignStatus } from "@/lib/campaign-store";
import { fmtMoney } from "@/lib/mock-data";

const empty = {
  name: "",
  business: "",
  objective: "Lead generation",
  channel: "Google Ads",
  budget: "3000",
  audience: "",
  brief: "",
};

export default function CampaignPlannerPage() {
  const [f, setF] = useState(empty);
  const [plan, setPlan] = useState<typeof empty | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<CampaignStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const budget = Number(f.budget);

  const makePlan = () => {
    if (
      !f.name.trim() ||
      !f.business.trim() ||
      !f.brief.trim() ||
      !(budget > 0)
    ) {
      setError(
        "Enter a campaign name, business, brief and a budget above zero.",
      );
      return;
    }
    setError("");
    setSaved(null);
    setSaveError("");
    setPlan({ ...f });
  };
  // A new paid campaign is saved as DRAFT or sent to PENDING_APPROVAL. It can never start as launched.
  const send = async (submit: boolean) => {
    if (!plan) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plan.name,
          business: plan.business,
          channel: plan.channel,
          requestedBudget: Number(plan.budget),
          submit,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Could not save the campaign.");
      setSaved(data.campaign.status as CampaignStatus);
      window.dispatchEvent(new Event("campaigns-changed"));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };
  const split: [string, number][] = plan
    ? plan.channel === "Both channels"
      ? [
          ["Google Ads", 0.6],
          ["Meta Ads", 0.4],
        ]
      : [[plan.channel, 1]]
    : [];
  const planBudget = plan ? Number(plan.budget) : 0;

  return (
    <>
      <PageHeader
        title="Campaign Planner"
        description="Turn a marketing brief into a campaign plan, then send it for human approval."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="1. Brief"
            subtitle="Describe what you want to achieve"
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Campaign name">
                <Input
                  value={f.name}
                  onChange={set("name")}
                  placeholder="e.g. Diwali Offer – Prospecting"
                />
              </Field>
              <Field label="Business">
                <Input
                  value={f.business}
                  onChange={set("business")}
                  placeholder="e.g. Zenith Home Decor"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Objective">
                <Select value={f.objective} onChange={set("objective")}>
                  <option>Lead generation</option>
                  <option>Sales</option>
                  <option>Brand awareness</option>
                  <option>Website traffic</option>
                </Select>
              </Field>
              <Field label="Channel">
                <Select value={f.channel} onChange={set("channel")}>
                  <option>Google Ads</option>
                  <option>Meta Ads</option>
                  <option>Both channels</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Budget cap (INR)"
                hint="Spend will never exceed the approved budget."
              >
                <Input
                  type="number"
                  min="0"
                  value={f.budget}
                  onChange={set("budget")}
                />
              </Field>
              <Field label="Target audience">
                <Input
                  value={f.audience}
                  onChange={set("audience")}
                  placeholder="e.g. Small business owners"
                />
              </Field>
            </div>
            <Field label="Brief">
              <Textarea
                rows={5}
                value={f.brief}
                onChange={set("brief")}
                placeholder="Describe the product, offer and goal…"
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            )}
            <Button onClick={makePlan}>Generate plan</Button>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="2. Plan"
            action={<Badge tone="warning">Sample template</Badge>}
          />
          {!plan ? (
            <p className="p-5 text-sm text-muted">
              Fill in the brief and generate a plan to see it here.
            </p>
          ) : (
            <div className="space-y-5 p-5 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Objective
                </p>
                <p className="mt-1 text-ink">
                  {plan.objective} · {plan.name} ({plan.business})
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Audience
                </p>
                <p className="mt-1 text-ink">
                  {plan.audience || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Budget allocation
                </p>
                <ul className="mt-1 space-y-1">
                  {split.map(([ch, p]) => (
                    <li key={ch} className="flex justify-between text-ink">
                      <span>{ch}</span>
                      <span className="font-medium">
                        {fmtMoney(planBudget * p)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  KPI targets
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge tone="brand">CTR ≥ 1.5%</Badge>
                  <Badge tone="brand">CPA ≤ {fmtMoney(planBudget / 60)}</Badge>
                  <Badge tone="brand">ROAS ≥ 2.0x</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                {saved ? (
                  <>
                    <StatusPill status={saved} />
                    <ButtonLink href="/approvals" variant="secondary" size="sm">
                      Open approval queue
                    </ButtonLink>
                  </>
                ) : (
                  <>
                    <Button
                      variant="success"
                      onClick={() => send(true)}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Submit for approval"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => send(false)}
                      disabled={saving}
                    >
                      Save as draft
                    </Button>
                  </>
                )}
              </div>
              {saveError && (
                <p role="alert" className="text-sm text-bad">
                  {saveError}
                </p>
              )}
              <p className="text-xs text-muted">
                Submitting only adds the campaign to the approval queue as
                PENDING_APPROVAL. Nothing launches until a person approves and
                launches it.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
