import { Fragment } from "react";
import { Icon } from "@/components/icons";
import { Badge, cx, type Tone } from "@/components/ui";
import type { CampaignStatus } from "@/lib/campaign-store";

export const META: Record<CampaignStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_APPROVAL: { label: "Pending approval", tone: "info" },
  APPROVED: { label: "Approved", tone: "brand" },
  LAUNCHED: { label: "Launched", tone: "success" },
  REJECTED: { label: "Rejected", tone: "warning" },
  BLOCKED: { label: "Blocked", tone: "danger" },
};
export const ORDER: CampaignStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "LAUNCHED",
  "REJECTED",
  "BLOCKED",
];
export const StatusPill = ({ status }: { status: CampaignStatus }) => (
  <Badge tone={META[status].tone}>{META[status].label}</Badge>
);

const tint: Record<Tone, string> = {
  neutral: "bg-subtle text-ink",
  brand: "bg-brand-soft text-brand",
  success: "bg-ok-soft text-ok",
  warning: "bg-warn-soft text-warn",
  danger: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

export function ApprovalFlow({
  counts,
  active,
}: {
  counts: Record<CampaignStatus, number>;
  active?: CampaignStatus;
}) {
  const main: [CampaignStatus, string][] = [
    ["DRAFT", "Agent drafts the plan"],
    ["PENDING_APPROVAL", "Waits for a person"],
    ["APPROVED", "A person said yes"],
    ["LAUNCHED", "Budget checked again"],
  ];
  const box = (s: CampaignStatus, hint: string) => (
    <div
      className={cx(
        "rounded-xl border p-4",
        active === s ? "border-brand ring-2 ring-brand/30" : "border-line",
        tint[META[s].tone],
      )}
    >
      <p className="text-2xl font-semibold">{counts[s]}</p>
      <p className="text-sm font-semibold">{META[s].label}</p>
      <p className="mt-0.5 text-xs opacity-80">{hint}</p>
    </div>
  );
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {main.map(([s, h], i) => (
          <Fragment key={s}>
            {i > 0 && (
              <span
                className="hidden items-center text-lg text-muted sm:flex"
                aria-hidden="true"
              >
                →
              </span>
            )}
            {box(s, h)}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {box("REJECTED", "A person said no. This is final.")}
        {box(
          "BLOCKED",
          "Requested spend is above the approved budget. It stays blocked until a person fixes the budget.",
        )}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Icon name="shield" className="h-4 w-4 text-ok" />
        The AI can draft and submit a campaign. Only a person can approve,
        reject or launch it.
      </p>
    </div>
  );
}
