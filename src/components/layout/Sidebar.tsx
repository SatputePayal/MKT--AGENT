
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cx } from "@/components/ui";
import { useEffect, useState } from "react";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/campaign-planner", label: "Campaign Planner", icon: "planner" },
  { href: "/performance", label: "Performance Dashboard", icon: "performance" },
  { href: "/approvals", label: "Spend Approval Queue", icon: "approvals" },
  { href: "/reports", label: "Reports", icon: "reports" },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch("/api/approvals")
        .then((r) => r.json())
        .then((d) =>
          setPending(
            (d.campaigns as { status: string }[]).filter(
              (c) => c.status === "PENDING_APPROVAL",
            ).length,
          ),
        )
        .catch(() => {});
    load();
    window.addEventListener("campaigns-changed", load); // lets the planner and queue refresh this number instantly
    return () => window.removeEventListener("campaigns-changed", load);
  }, [pathname]);
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              M
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink">MarketPilot</p>
              <p className="text-xs text-muted">Executive Agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 text-muted hover:bg-subtle lg:hidden"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main">
          {items.map((i) => {
            const active =
              pathname === i.href || pathname.startsWith(i.href + "/");
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-subtle hover:text-ink",
                )}
              >
                <Icon name={i.icon} className="h-[18px] w-[18px]" />
                <span className="flex-1">{i.label}</span>
                {i.href === "/approvals" && pending > 0 && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-xl border border-line bg-subtle p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon name="shield" className="h-4 w-4 text-ok" />
            Guardrails on
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            <li>Budget cap enforced</li>
            <li>Ad claims screened</li>
            <li>Human approval to launch</li>
          </ul>
        </div>
      </aside>
    </>
  );
}
