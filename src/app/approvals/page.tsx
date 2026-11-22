"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import BudgetStatus from "@/components/BudgetStatus";
import {
  ApprovalFlow,
  META,
  ORDER,
  StatusPill,
} from "@/components/approval-ui";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Table,
  Td,
  Th,
  cx,
} from "@/components/ui";
import { formatINR, validateSpend } from "@/lib/budget";
import type { Campaign, CampaignStatus } from "@/lib/campaign-store";

type Action = "submit" | "approve" | "reject" | "launch";
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

export default function ApprovalsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<"ALL" | CampaignStatus>("ALL");
  const [reviewer, setReviewer] = useState("Demo Reviewer");
  const [passcode, setPasscode] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [approved, setApproved] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [tA, setTA] = useState("20000");
  const [tR, setTR] = useState("15000");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/approvals");
      setCampaigns((await r.json()).campaigns);
      setLoadError("");
    } catch {
      setLoadError("Could not load campaigns.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<
      CampaignStatus,
      number
    >;
    (campaigns ?? []).forEach((x) => {
      c[x.status]++;
    });
    return c;
  }, [campaigns]);
  const rows = (campaigns ?? []).filter(
    (c) => filter === "ALL" || c.status === filter,
  );
  const sel = campaigns?.find((c) => c.id === selected) ?? null;
  const value = (c: Campaign) =>
    approved[c.id] ??
    String(
      c.status === "BLOCKED"
        ? c.requestedBudget
        : (c.approvedBudget ?? c.requestedBudget),
    );
  const canAct = reviewer.trim().length >= 2;

  const act = async (c: Campaign, action: Action) => {
    setBusy(c.id);
    setNotice(null);
    try {
      const body: Record<string, unknown> = { id: c.id, action };
      if (action !== "submit") {
        body.reviewer = reviewer;
        body.passcode = passcode;
      }
      if (action === "approve") body.approvedBudget = Number(value(c));
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      const ok: Record<Action, string> = {
        submit: "is now pending approval.",
        approve: "was approved. It can now be launched.",
        reject: "was rejected.",
        launch: "was launched (mock).",
      };
      setNotice(
        res.ok
          ? { tone: "success", text: `"${c.name}" ${ok[action]}` }
          : { tone: "danger", text: data.error || "Request failed." },
      );
      await load();
    } catch {
      setNotice({ tone: "danger", text: "Could not reach the server." });
    } finally {
      setBusy("");
    }
  };

  const buttons = (c: Campaign, size: "sm" | "md", details: boolean) => {
    const off = busy === c.id;
    return (
      <div className="flex flex-wrap gap-2">
        {c.status === "DRAFT" && (
          <Button
            size={size}
            variant="secondary"
            disabled={off}
            onClick={() => act(c, "submit")}
          >
            Submit for approval
          </Button>
        )}
        {(c.status === "PENDING_APPROVAL" || c.status === "BLOCKED") && (
          <>
            <Button
              size={size}
              disabled={off || !canAct}
              onClick={() => act(c, "approve")}
            >
              Approve
            </Button>
            <Button
              size={size}
              variant="danger"
              disabled={off || !canAct}
              onClick={() => act(c, "reject")}
            >
              Reject
            </Button>
          </>
        )}
        {c.status === "APPROVED" && (
          <Button
            size={size}
            variant="success"
            disabled={off || !canAct}
            onClick={() => act(c, "launch")}
          >
            Launch
          </Button>
        )}
        {details && (
          <Button
            size={size}
            variant="secondary"
            onClick={() => setSelected(c.id)}
          >
            View Details
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Spend Approval Queue"
        description="Every new paid campaign waits here. Only a person can approve, reject or launch it."
      />
      <Card className="p-5">
        <ApprovalFlow counts={counts} active={sel?.status} />
      </Card>

      <Card className="mt-6">
        <div className="grid gap-4 p-5 md:grid-cols-[1fr_2fr] md:items-end">
          <div className="space-y-3">
            <Field
              label="Reviewing as"
              hint="Approvals are recorded under this name."
            >
              <Input
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
              />
            </Field>
            <Field
              label="Reviewer passcode"
              hint="Required when the server has APPROVER_PASSCODE set."
            >
              <Input
                type="password"
                autoComplete="off"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist">
            {(["ALL", ...ORDER] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={filter === s}
                onClick={() => setFilter(s)}
                className={cx(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  filter === s
                    ? "border-brand bg-brand text-white"
                    : "border-line text-muted hover:text-ink",
                )}
              >
                {s === "ALL" ? "All" : META[s].label} ·{" "}
                {s === "ALL" ? (campaigns?.length ?? 0) : counts[s]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {notice && (
        <p
          role={notice.tone === "danger" ? "alert" : "status"}
          className={cx(
            "mt-4 rounded-lg p-3 text-sm",
            notice.tone === "danger"
              ? "bg-bad-soft text-bad"
              : "bg-ok-soft text-ok",
          )}
        >
          {notice.text}
        </p>
      )}
      {loadError && (
        <p role="alert" className="mt-4 text-sm text-bad">
          {loadError}
        </p>
      )}

      <Card className="mt-4">
        <Table>
          <thead>
            <tr>
              <Th>Campaign</Th>
              <Th>Business</Th>
              <Th>Channel</Th>
              <Th>Requested budget</Th>
              <Th>Approved budget</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.name}</Td>
                <Td>{c.business}</Td>
                <Td>{c.channel}</Td>
                <Td>{formatINR(c.requestedBudget)}</Td>
                <Td>
                  {c.approvedBudget !== undefined
                    ? formatINR(c.approvedBudget)
                    : "—"}
                </Td>
                <Td>
                  <StatusPill status={c.status} />
                </Td>
                <Td>{date(c.createdAt)}</Td>
                <Td>{buttons(c, "sm", true)}</Td>
              </tr>
            ))}
            {campaigns && rows.length === 0 && (
              <tr>
                <Td className="text-muted">No campaigns in this status.</Td>
              </tr>
            )}
            {!campaigns && !loadError && (
              <tr>
                <Td className="text-muted">Loading…</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Budget guardrail check"
          subtitle="Try any amounts. Approvals and launches run this same check on the server."
        />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Approved budget (₹)">
              <Input
                type="number"
                min="0"
                value={tA}
                onChange={(e) => setTA(e.target.value)}
              />
            </Field>
            <Field label="Requested spend (₹)">
              <Input
                type="number"
                min="0"
                value={tR}
                onChange={(e) => setTR(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTA("20000");
                  setTR("15000");
                }}
              >
                ₹20,000 / ₹15,000
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTA("20000");
                  setTR("25000");
                }}
              >
                ₹20,000 / ₹25,000
              </Button>
            </div>
          </div>
          <BudgetStatus
            check={validateSpend(Number(tA), Number(tR))}
            approvedBudget={Number(tA)}
            requestedSpend={Number(tR)}
          />
        </div>
      </Card>

      {sel && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Campaign details"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelected(null)}
          />
          <div className="relative flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-line bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{sel.name}</h2>
                <p className="text-sm text-muted">
                  {sel.business} · {sel.channel}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                Close
              </Button>
            </div>
            <StatusPill status={sel.status} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Requested budget</dt>
                <dd className="font-semibold text-ink">
                  {formatINR(sel.requestedBudget)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Approved budget</dt>
                <dd className="font-semibold text-ink">
                  {sel.approvedBudget !== undefined
                    ? formatINR(sel.approvedBudget)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Spent</dt>
                <dd className="font-semibold text-ink">
                  {formatINR(sel.spent)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Created</dt>
                <dd className="font-semibold text-ink">
                  {date(sel.createdAt)}
                </dd>
              </div>
            </dl>
            {sel.status === "BLOCKED" && sel.blockedReason && (
              <p
                role="alert"
                className="rounded-lg bg-bad-soft p-3 text-sm text-bad"
              >
                {sel.blockedReason}
              </p>
            )}
            {(sel.status === "PENDING_APPROVAL" ||
              sel.status === "BLOCKED") && (
              <div className="space-y-3">
                <Field
                  label="Approved budget (₹)"
                  hint="Approving with less than the requested spend blocks the campaign."
                >
                  <Input
                    type="number"
                    min="0"
                    value={value(sel)}
                    onChange={(e) =>
                      setApproved((a) => ({ ...a, [sel.id]: e.target.value }))
                    }
                  />
                </Field>
                <BudgetStatus
                  check={validateSpend(
                    Number(value(sel)),
                    sel.requestedSpend,
                    sel.spent,
                  )}
                  approvedBudget={Number(value(sel))}
                  requestedSpend={sel.requestedSpend}
                />
              </div>
            )}
            {buttons(sel, "md", false)}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                History
              </p>
              <ol>
                {sel.history.map((h, i) => (
                  <li
                    key={i}
                    className="relative border-l border-line pb-4 pl-4"
                  >
                    <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-brand" />
                    <p className="text-sm font-medium text-ink">
                      {META[h.to].label}{" "}
                      <span className="font-normal text-muted">
                        · {h.by} ({h.byKind})
                      </span>
                    </p>
                    <p className="text-xs text-muted">{h.note}</p>
                    <p className="text-xs text-muted">{dateTime(h.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
