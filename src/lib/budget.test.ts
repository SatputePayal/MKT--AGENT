// Run: npx tsx src/lib/budget.test.ts
import assert from "node:assert/strict";
import { validateSpend } from "./budget";
import { findRisky, validateCopy } from "./ad-copy";
import { limited, readJson, reviewerAllowed } from "./security";
import {
  approve,
  createDraft,
  launch,
  listCampaigns,
  recordSpend,
  reject,
  submit,
  type Actor,
} from "./campaign-store";

let failed = 0;
const t = (name: string, fn: () => void) => {
  try {
    fn();
    console.log("PASS", name);
  } catch (e) {
    failed++;
    console.log("FAIL", name, "\n  ", (e as Error).message);
  }
};
const human: Actor = { kind: "human", name: "Test Reviewer" };
const agent: Actor = { kind: "agent", name: "Marketing Agent" };
const fresh = (budget = 6000) => {
  const c = createDraft(
    {
      name: "T",
      business: "B",
      channel: "Google Ads",
      requestedBudget: budget,
    },
    agent,
  );
  submit(c.id, agent);
  return c;
};
const status = (id: string) => listCampaigns().find((c) => c.id === id)?.status;

// ---- Phase 5: validateSpend ----
t("Approved ₹20,000 / Requested ₹15,000 -> allowed, ₹5,000 left", () => {
  const r = validateSpend(20000, 15000);
  assert.equal(r.allowed, true);
  assert.equal(r.remainingBudget, 5000);
});
t("Approved ₹20,000 / Requested ₹25,000 -> blocked", () => {
  const r = validateSpend(20000, 25000);
  assert.equal(r.allowed, false);
  assert.equal(r.remainingBudget, 20000);
});
t("exactly equal allowed; one paisa over blocked", () => {
  assert.equal(validateSpend(20000, 20000).allowed, true);
  assert.equal(validateSpend(20000, 20000.01).allowed, false);
});
t("invalid numbers are blocked", () => {
  for (const [a, r] of [
    [20000, 0],
    [20000, -5],
    [20000, NaN],
    [0, 100],
    [NaN, 100],
  ] as const)
    assert.equal(validateSpend(a, r).allowed, false);
});
t("already spent counts against the budget", () => {
  assert.equal(validateSpend(20000, 12000, 10000).allowed, false);
  assert.equal(validateSpend(20000, 9000, 10000).allowed, true);
});

// ---- Phase 6: approval workflow ----
t("all six statuses exist in the seed data", () => {
  const s = new Set(listCampaigns().map((c) => c.status));
  for (const x of [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "LAUNCHED",
    "BLOCKED",
  ])
    assert.ok(s.has(x as never), x);
});
t("a new paid campaign enters PENDING_APPROVAL, not LAUNCHED", () => {
  const c = fresh();
  assert.equal(c.status, "PENDING_APPROVAL");
});
t("rule 1: cannot launch directly from PENDING_APPROVAL", () => {
  const c = fresh();
  const r = launch(c.id, human);
  assert.equal(r.ok, false);
  assert.equal(status(c.id), "PENDING_APPROVAL");
});
t("rule 1: cannot launch or approve a DRAFT", () => {
  const d = createDraft(
    { name: "D", business: "B", channel: "Meta Ads", requestedBudget: 100 },
    agent,
  );
  assert.equal(launch(d.id, human).ok, false);
  assert.equal(approve(d.id, 100, human).ok, false);
  assert.equal(status(d.id), "DRAFT");
});
t("rule 3 and 7: the AI agent can never approve, reject or launch", () => {
  const c = fresh();
  const a = approve(c.id, 6000, agent);
  assert.equal(a.ok, false);
  if (!a.ok) assert.equal(a.status, 403);
  assert.equal(reject(c.id, agent).ok, false);
  assert.equal(status(c.id), "PENDING_APPROVAL");
  approve(c.id, 6000, human);
  assert.equal(launch(c.id, agent).ok, false);
  assert.equal(status(c.id), "APPROVED");
});
t(
  "rule 4: a human approval moves PENDING_APPROVAL -> APPROVED, then LAUNCHED",
  () => {
    const c = fresh();
    assert.equal(approve(c.id, 6000, human).ok, true);
    assert.equal(status(c.id), "APPROVED");
    assert.equal(launch(c.id, human).ok, true);
    assert.equal(status(c.id), "LAUNCHED");
    assert.equal(launch(c.id, human).ok, false);
  },
);
t("rule 5: reject -> REJECTED and it is final", () => {
  const c = fresh();
  assert.equal(reject(c.id, human).ok, true);
  assert.equal(status(c.id), "REJECTED");
  assert.equal(approve(c.id, 6000, human).ok, false);
});
t(
  "rule 6: approved budget below requested spend -> BLOCKED, and it stays blocked until fixed",
  () => {
    const c = fresh(25000);
    const r = approve(c.id, 20000, human);
    assert.equal(r.ok, false);
    assert.equal(status(c.id), "BLOCKED");
    assert.equal(approve(c.id, 20000, human).ok, false);
    assert.equal(status(c.id), "BLOCKED");
    assert.equal(launch(c.id, human).ok, false);
    assert.equal(status(c.id), "BLOCKED");
    assert.equal(approve(c.id, 25000, human).ok, true);
    assert.equal(status(c.id), "APPROVED");
  },
);
t("history records who did what", () => {
  const c = fresh();
  approve(c.id, 6000, human);
  const h = listCampaigns().find((x) => x.id === c.id)!.history;
  assert.deepEqual(
    h.map((e) => e.to),
    ["DRAFT", "PENDING_APPROVAL", "APPROVED"],
  );
  assert.equal(h[2].byKind, "human");
});
t("later spend cannot exceed the approved budget", () => {
  const c = fresh();
  approve(c.id, 6000, human);
  launch(c.id, human);
  assert.equal(recordSpend(c.id, 1).allowed, false);
});

// ---- Security review ----
const env = process.env as Record<string, string | undefined>;
t("approved budget above the requested budget is refused", () => {
  const c = fresh(1000);
  assert.equal(approve(c.id, 5000, human).ok, false);
  assert.equal(status(c.id), "PENDING_APPROVAL");
});
t("AI output cannot carry spend or status: extra fields are dropped", () => {
  const r = validateCopy({
    headlines: ["A", "B", "C"],
    descriptions: ["x", "y"],
    cta: "Contact us",
    budget: 999999,
    approvedBudget: 1e9,
    status: "APPROVED",
    landingBrief: { headline: "H", sections: ["a", "b", "c"], proofNeeded: [] },
  });
  assert.ok(r.copy);
  assert.deepEqual(Object.keys(r.copy!).sort(), [
    "cta",
    "descriptions",
    "headlines",
    "landingBrief",
  ]);
});
t("copy with guarantees, percentages, rankings or prices is flagged", () => {
  for (const bad of [
    "Guaranteed results",
    "Save 50% today",
    "Only ₹499 per month",
    "The best agency",
    "#1 in India",
    "Spend $500 now",
  ])
    assert.ok(findRisky(bad), bad);
  assert.equal(findRisky("Talk to our marketing team"), null);
});
t("reviewer passcode is required when set", () => {
  env.APPROVER_PASSCODE = "s3cret-pass";
  assert.equal(reviewerAllowed("wrong").ok, false);
  assert.equal(reviewerAllowed(undefined).ok, false);
  assert.equal(reviewerAllowed("s3cret-pass").ok, true);
  delete env.APPROVER_PASSCODE;
});
t("approvals fail closed in production when no passcode is configured", () => {
  delete env.APPROVER_PASSCODE;
  const old = env.NODE_ENV;
  env.NODE_ENV = "production";
  const r = reviewerAllowed("x");
  if (old === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = old;
  assert.equal(r.ok, false);
});
t("rate limiter trips after the limit", () => {
  const req = new Request("http://x/", {
    headers: { "x-forwarded-for": "9.9.9.9" },
  });
  let hit = false;
  for (let i = 0; i < 12; i++) hit = limited(req, "t", 10);
  assert.equal(hit, true);
});
(async () => {
  const mk = (body: string, type = "application/json") =>
    new Request("http://x/", {
      method: "POST",
      headers: { "content-type": type },
      body,
    });
  const ta = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log("PASS", name);
    } catch (e) {
      failed++;
      console.log("FAIL", name, "\n  ", (e as Error).message);
    }
  };
  await ta("readJson accepts a JSON object", async () =>
    assert.equal((await readJson(mk('{"a":1}'))).ok, true),
  );
  await ta(
    "readJson rejects wrong content type, arrays, bad JSON and oversized bodies",
    async () => {
      const bad = [
        mk('{"a":1}', "text/plain"),
        mk("[1]"),
        mk("nope"),
        mk('{"a":"' + "x".repeat(11000) + '"}'),
      ];
      for (const r of bad) assert.equal((await readJson(r)).ok, false);
    },
  );
  console.log(failed ? `\n${failed} test(s) failed` : "\nAll tests passed");
  process.exit(failed ? 1 : 0);
})();
