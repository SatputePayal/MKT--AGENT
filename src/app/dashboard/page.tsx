import Link from "next/link";
import {
  Badge,
  BarChart,
  ButtonLink,
  Card,
  CardHeader,
  PageHeader,
  ProgressBar,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import {
  activity,
  approvals,
  campaigns,
  dailySpend,
  fmtMoney,
  fmtNum,
  metrics,
  totals,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const live = campaigns.filter((c) => c.spent > 0);
  const t = totals(live);
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of campaign performance and pending actions · 9–15 Nov 2026"
        actions={<ButtonLink href="/campaign-planner">New campaign</ButtonLink>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total spend"
          value={fmtMoney(t.spend)}
          delta="+6.2%"
          tone="neutral"
        />
        <StatCard
          label="Conversions"
          value={fmtNum(t.conversions)}
          delta="+11.1%"
          tone="success"
        />
        <StatCard
          label="ROAS"
          value={t.roas.toFixed(2) + "x"}
          delta="+0.16"
          tone="success"
        />
        <StatCard
          label="Cost per conversion"
          value={"₹" + t.cpa.toFixed(2)}
          delta="-4.1%"
          tone="success"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Daily spend"
            subtitle="Last 7 days, all channels"
          />
          <div className="p-5">
            <BarChart data={dailySpend} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Waiting for approval"
            action={<Badge tone="info">{approvals.length} pending</Badge>}
          />
          <ul className="divide-y divide-line">
            {approvals.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-muted">
                    {a.kind} · {a.channel}
                  </p>
                </div>
                <span className="text-sm font-semibold text-ink">
                  {fmtMoney(a.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-3">
            <Link
              href="/approvals"
              className="block rounded-lg py-1.5 text-center text-sm font-medium text-brand hover:bg-brand-soft"
            >
              Open approval queue
            </Link>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Campaigns"
            subtitle="Budget use and return"
            action={
              <Link
                href="/performance"
                className="text-sm font-medium text-brand"
              >
                View all
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Campaign</Th>
                <Th>Status</Th>
                <Th>Budget used</Th>
                <Th>ROAS</Th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.channel}</p>
                  </Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td className="min-w-40">
                    <div className="mb-1 text-xs text-muted">
                      {fmtMoney(c.spent)} / {fmtMoney(c.budget)}
                    </div>
                    <ProgressBar value={(c.spent / c.budget) * 100} />
                  </Td>
                  <Td>{c.spent ? metrics(c).roas.toFixed(2) + "x" : "–"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          <ul className="divide-y divide-line">
            {activity.map((a) => (
              <li key={a.text} className="px-5 py-3">
                <p className="text-sm text-ink">{a.text}</p>
                <p className="mt-0.5 text-xs text-muted">{a.time}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
