import { Icon } from "@/components/icons";
import { cx } from "@/components/ui";
import { formatINR, type SpendCheck } from "@/lib/budget";

export default function BudgetStatus({
  check,
  approvedBudget,
  requestedSpend,
}: {
  check: SpendCheck;
  approvedBudget: number;
  requestedSpend: number;
}) {
  const ok = check.allowed;
  const pct =
    approvedBudget > 0 && requestedSpend > 0
      ? Math.min(100, (requestedSpend / approvedBudget) * 100)
      : 0;
  const stat = (label: string, value: string) => (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold text-ink">{value}</p>
    </div>
  );
  return (
    <div
      role="status"
      className={cx(
        "rounded-xl border p-4",
        ok ? "border-ok/40 bg-ok-soft" : "border-bad/40 bg-bad-soft",
      )}
    >
      <div
        className={cx(
          "flex items-center gap-2 text-sm font-bold tracking-wide",
          ok ? "text-ok" : "text-bad",
        )}
      >
        <Icon name={ok ? "check" : "x"} className="h-4 w-4" />
        {ok ? "WITHIN BUDGET" : "OVER BUDGET · LAUNCH BLOCKED"}
      </div>
      <p className="mt-1.5 text-sm text-ink">{check.reason}</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        {stat("Approved", formatINR(approvedBudget || 0))}
        {stat("Requested", formatINR(requestedSpend || 0))}
        {stat("Remaining", formatINR(check.remainingBudget))}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
        <div
          className={cx("h-full rounded-full", ok ? "bg-ok" : "bg-bad")}
          style={{ width: `${ok ? pct : 100}%` }}
        />
      </div>
    </div>
  );
}
