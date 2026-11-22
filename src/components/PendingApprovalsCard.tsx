"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, CardHeader } from "@/components/ui";
import { formatINR } from "@/lib/budget";
import type { Campaign } from "@/lib/campaign-store";

export default function PendingApprovalsCard() {
  const [items, setItems] = useState<Campaign[] | null>(null);
  useEffect(() => {
    fetch("/api/approvals")
      .then((r) => r.json())
      .then((d) =>
        setItems(
          (d.campaigns as Campaign[]).filter(
            (c) => c.status === "PENDING_APPROVAL",
          ),
        ),
      )
      .catch(() => setItems([]));
  }, []);
  return (
    <Card>
      <CardHeader
        title="Waiting for approval"
        action={items && <Badge tone="info">{items.length} pending</Badge>}
      />
      {!items ? (
        <p className="p-5 text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="p-5 text-sm text-muted">Nothing is waiting.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.slice(0, 4).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.business} · {c.channel}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink">
                {formatINR(c.requestedBudget)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line p-3">
        <Link
          href="/approvals"
          className="block rounded-lg py-1.5 text-center text-sm font-medium text-brand hover:bg-brand-soft"
        >
          Open approval queue
        </Link>
      </div>
    </Card>
  );
}
