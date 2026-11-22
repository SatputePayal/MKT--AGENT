import {
  Badge,
  Button,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  Table,
  Td,
  Th,
  type Tone,
} from "@/components/ui";
import {
  campaigns,
  fmtMoney,
  fmtNum,
  nextActions,
  reports,
  totals,
} from "@/lib/mock-data";

const tone: Record<string, Tone> = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

export default function ReportsPage() {
  const t = totals(campaigns.filter((c) => c.spent > 0));
  const latest = reports[0];
  return (
    <>
      <PageHeader
        title="Reports"
        description="Weekly performance reports and suggested next actions"
        actions={
          <Button
            variant="secondary"
            disabled
            title="Export arrives in a later phase"
          >
            Download PDF
          </Button>
        }
      />
      <Card>
        <CardHeader
          title={latest.title}
          subtitle={latest.period}
          action={<Badge tone="success">{latest.status}</Badge>}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Spend" value={fmtMoney(t.spend)} delta="+6.2%" />
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
        <div className="border-t border-line">
          <p className="px-5 pt-4 text-sm font-semibold text-ink">
            Suggested next actions
          </p>
          <ul className="divide-y divide-line">
            {nextActions.map((a) => (
              <li
                key={a.text}
                className="flex items-start gap-3 px-5 py-3 text-sm text-ink"
              >
                <Badge tone={tone[a.priority]}>{a.priority}</Badge>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <Card className="mt-6">
        <CardHeader title="Previous reports" />
        <Table>
          <thead>
            <tr>
              <Th>Period</Th>
              <Th>Spend</Th>
              <Th>Conversions</Th>
              <Th>ROAS</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {reports.slice(1).map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.period}</Td>
                <Td>{fmtMoney(r.spend)}</Td>
                <Td>{fmtNum(r.conversions)}</Td>
                <Td>{r.roas.toFixed(2)}x</Td>
                <Td>
                  <Badge tone="success">{r.status}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
