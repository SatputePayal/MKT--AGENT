// Single source of truth for the budget guardrail. Pure and dependency-free, so the same code runs in the browser and on the server.
export interface SpendCheck {
  allowed: boolean;
  reason: string;
  remainingBudget: number;
}

export const formatINR = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const minor = (n: number) => Math.round(n * 100); // compare in paise so 0.1 + 0.2 style rounding cannot slip through
const invalid = (n: number) => !Number.isFinite(n);

/**
 * validateSpend(approvedBudget, requestedSpend)
 * Allowed only when requestedSpend <= approvedBudget. `alreadySpent` is optional: when a campaign has spent
 * money before, the request is checked against what is left (approvedBudget - alreadySpent).
 * remainingBudget = what is left AFTER this request if allowed, or the untouched available budget if blocked.
 */
export function validateSpend(
  approvedBudget: number,
  requestedSpend: number,
  alreadySpent = 0,
): SpendCheck {
  if (invalid(approvedBudget) || approvedBudget <= 0)
    return {
      allowed: false,
      reason:
        "Blocked: there is no valid approved budget. A person must approve a budget above zero first.",
      remainingBudget: 0,
    };
  if (invalid(alreadySpent) || alreadySpent < 0)
    return {
      allowed: false,
      reason: "Blocked: the spend recorded so far is not valid.",
      remainingBudget: 0,
    };
  const available = Math.max(minor(approvedBudget) - minor(alreadySpent), 0);
  if (invalid(requestedSpend) || requestedSpend <= 0)
    return {
      allowed: false,
      reason: "Blocked: requested spend must be a number above zero.",
      remainingBudget: available / 100,
    };
  const left = available - minor(requestedSpend);
  if (left < 0) {
    const over = formatINR(-left / 100);
    const base =
      alreadySpent > 0
        ? `the remaining budget of ${formatINR(available / 100)} (${formatINR(approvedBudget)} approved, ${formatINR(alreadySpent)} already spent)`
        : `the approved budget of ${formatINR(approvedBudget)}`;
    return {
      allowed: false,
      reason: `Blocked: requested ${formatINR(requestedSpend)} exceeds ${base} by ${over}.`,
      remainingBudget: available / 100,
    };
  }
  return {
    allowed: true,
    reason: `Within budget: ${formatINR(requestedSpend)} of ${formatINR(approvedBudget)} approved. ${formatINR(left / 100)} remains.`,
    remainingBudget: left / 100,
  };
}
