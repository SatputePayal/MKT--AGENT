"use client";
import { useMemo, useState } from "react";
import { Chart, Sparkline } from "@/components/charts";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  cx,
} from "@/components/ui";
import { formatINR } from "@/lib/budget";
import {
  END,
  KPI,
  KPIS,
  START,
  addDays,
  aggregate,
  buildInsights,
  change,
  channelOf,
  dayLabel,
  fmtInt,
  perfCampaigns,
  range,
  rate,
  rows,
  trendTone,
  type CampaignView,
  type KpiDef,
  type MetricKey,
  type Rating,
  type Tone,
  type Totals,
} from "@/lib/perf-data";

const RATING: Record<Rating, { label: string; tone: Tone }> = {
  good: { label: "Good", tone: "success" },
  ok: { label: "Okay", tone: "warning" },
  poor: { label: "Poor", tone: "danger" },
};
const COLOR: Record<Tone, string> = {
  success: "var(--ok)",
  danger: "var(--bad)",
  warning: "var(--warn)",
  info: "var(--info)",
  neutral: "var(--muted)",
};
const PRESETS = [7, 14, 30] as const;
const val = (k: KpiDef, t: Totals) =>
  k.key === "cpl" && t.leads === 0
    ? "—"
    : k.fmt(t[k.key as keyof Totals] as number);
const arrow = (ch: number | null) =>
  ch === null
    ? "—"
    : Math.abs(ch) < 0.01
      ? "● Flat"
      : `${ch > 0 ? "▲" : "▼"} ${Math.abs(ch * 100).toFixed(1)}%`;
const pct = (n: number) => (n * 100).toFixed(2) + "%";

export default function PerformancePage() {
  const [campaign, setCampaign] = useState("all");
  const [channel, setChannel] = useState("all");
  const [from, setFrom] = useState(addDays(END, -29));
  const [to, setTo] = useState(END);

  const changeChannel = (v: string) => {
    setChannel(v);
    if (v !== "all" && campaign !== "all" && channelOf[campaign] !== v)
      setCampaign("all");
  };
  const setFromSafe = (v: string) => {
    if (!v) return;
    setFrom(v);
    if (v > to) setTo(v);
  };
  const setToSafe = (v: string) => {
    if (!v) return;
    setTo(v);
    if (v < from) setFrom(v);
  };
  const reset = () => {
    setCampaign("all");
    setChannel("all");
    setFrom(addDays(END, -29));
    setTo(END);
  };

  const v = useMemo(() => {
    const dates = range(from, to),
      n = dates.length,
      prevTo = addDays(from, -1),
      prevFrom = addDays(from, -n),
      prevOk = prevFrom >= START;
    const pick = (a: string, b: string) =>
      rows.filter(
        (r) =>
          r.date >= a &&
          r.date <= b &&
          (campaign === "all" || r.campaignId === campaign) &&
          (channel === "all" || channelOf[r.campaignId] === channel),
      );
    const cur = pick(from, to),
      prev = prevOk ? pick(prevFrom, prevTo) : [];
    const byDate = (rs: typeof rows, ds: string[]) =>
      ds.map((d) => aggregate(rs.filter((r) => r.date === d)));
    const daily = byDate(cur, dates),
      prevDaily = prevOk ? byDate(prev, range(prevFrom, prevTo)) : null;
    const total = aggregate(cur),
      prevTotal = prevOk ? aggregate(prev) : null;
    const camps: CampaignView[] = perfCampaigns
      .filter(
        (c) =>
          (campaign === "all" || c.id === campaign) &&
          (channel === "all" || c.channel === channel),
      )
      .map((c) => ({
        c,
        t: aggregate(cur.filter((r) => r.campaignId === c.id)),
        p: prevOk ? aggregate(prev.filter((r) => r.campaignId === c.id)) : null,
        leadsDaily: dates.map(
          (d) =>
            aggregate(cur.filter((r) => r.campaignId === c.id && r.date === d))
              .leads,
        ),
      }));
    // Channel comparison ignores the channel filter so both channels are always visible.
    const chRows = rows.filter(
      (r) =>
        r.date >= from &&
        r.date <= to &&
        (campaign === "all" || r.campaignId === campaign),
    );
    const channels = (["Google Ads", "Meta Ads"] as const).map((name) => ({
      name,
      t: aggregate(chRows.filter((r) => channelOf[r.campaignId] === name)),
    }));
    return {
      dates,
      n,
      prevOk,
      prevFrom,
      prevTo,
      cur,
      daily,
      prevDaily,
      total,
      prevTotal,
      camps,
      channels,
      labels: dates.map(dayLabel),
    };
  }, [campaign, channel, from, to]);

  const insights = useMemo(
    () => buildInsights(v.camps, v.total, v.prevTotal),
    [v],
  );
  const series = (key: MetricKey) =>
    v.daily.map((d) => d[key as keyof Totals] as number);
  const prevSeries = (key: MetricKey) =>
    v.prevDaily?.map((d) => d[key as keyof Totals] as number);
  const prevLine = (key: MetricKey, fmt: (n: number) => string) => {
    const p = prevSeries(key);
    return p
      ? [
          {
            name: "Previous period",
            color: "var(--muted)",
            values: p,
            dashed: true,
            fmt,
          },
        ]
      : [];
  };
  const money = (n: number) => formatINR(Math.round(n));
  const campaignOptions = perfCampaigns.filter(
    (c) => channel === "all" || c.channel === channel,
  );
  const noData = v.total.spend === 0;

  return (
    <>
      <PageHeader
        title="Performance Dashboard"
        description="Campaign analytics for your ads. Sample data only, until Google Ads, Meta Ads and GA4 are connected."
        actions={<Badge tone="warning">Mock data</Badge>}
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Campaign">
            <Select
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            >
              <option value="all">All campaigns</option>
              {campaignOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Channel">
            <Select
              value={channel}
              onChange={(e) => changeChannel(e.target.value)}
            >
              <option value="all">All channels</option>
              <option>Google Ads</option>
              <option>Meta Ads</option>
            </Select>
          </Field>
          <Field label="From">
            <Input
              type="date"
              min={START}
              max={to}
              value={from}
              onChange={(e) => setFromSafe(e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              min={from}
              max={END}
              value={to}
              onChange={(e) => setToSafe(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PRESETS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={
                to === END && from === addDays(END, -(d - 1))
                  ? "primary"
                  : "secondary"
              }
              onClick={() => {
                setFrom(addDays(END, -(d - 1)));
                setTo(END);
              }}
            >
              Last {d} days
            </Button>
          ))}
          <Button size="sm" variant="secondary" onClick={reset}>
            Reset filters
          </Button>
          <p className="ml-auto text-xs text-muted">
            {v.n} days ·{" "}
            {v.prevOk
              ? `compared with ${dayLabel(v.prevFrom)} – ${dayLabel(v.prevTo)}`
              : "no earlier period to compare with"}
          </p>
        </div>
      </Card>

      {noData ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted">
          No data for these filters.
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPIS.map((k) => {
              const cur = v.total[k.key as keyof Totals] as number,
                ch = change(
                  cur,
                  v.prevTotal?.[k.key as keyof Totals] as number | undefined,
                );
              const tone = trendTone(k, ch),
                r = rate(k, cur, v.total.spend > 0);
              return (
                <Card key={k.key} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      {k.label}
                    </p>
                    {r && (
                      <span title={k.hint}>
                        <Badge tone={RATING[r].tone}>{RATING[r].label}</Badge>
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    {val(k, v.total)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div>
                      <Badge tone={tone}>{arrow(ch)}</Badge>
                      <p className="mt-1 text-xs text-muted">
                        vs previous period
                      </p>
                    </div>
                    <Sparkline values={series(k.key)} color={COLOR[tone]} />
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Leads over time"
                subtitle="Daily leads, with the previous period dashed"
              />
              <div className="p-5">
                <Chart
                  title="Leads over time"
                  labels={v.labels}
                  leftFmt={fmtInt}
                  series={[
                    {
                      name: "Leads",
                      color: "var(--brand)",
                      type: "area",
                      values: series("leads"),
                      fmt: fmtInt,
                    },
                    ...prevLine("leads", fmtInt),
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Spend over time"
                subtitle="Daily spend, with the previous period dashed"
              />
              <div className="p-5">
                <Chart
                  title="Spend over time"
                  labels={v.labels}
                  leftFmt={(n) =>
                    "₹" +
                    (n >= 1e5
                      ? +(n / 1e5).toFixed(1) + "L"
                      : n >= 1e3
                        ? +(n / 1e3).toFixed(1) + "k"
                        : n)
                  }
                  series={[
                    {
                      name: "Spend",
                      color: "var(--info)",
                      type: "bar",
                      values: series("spend"),
                      fmt: money,
                    },
                    ...prevLine("spend", money),
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Clicks and conversions"
                subtitle="Clicks on the left axis, conversions on the right"
              />
              <div className="p-5">
                <Chart
                  title="Clicks and conversions"
                  labels={v.labels}
                  leftFmt={fmtInt}
                  rightFmt={fmtInt}
                  series={[
                    {
                      name: "Clicks",
                      color: "var(--brand)",
                      type: "area",
                      values: series("clicks"),
                      fmt: fmtInt,
                    },
                    {
                      name: "Conversions",
                      color: "var(--ok)",
                      axis: "right",
                      values: series("conversions"),
                      fmt: fmtInt,
                    },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Channel performance"
                subtitle="Google Ads and Meta Ads side by side. The better value is marked ✓"
              />
              <div className="space-y-4 p-5">
                <div className="flex gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
                    Google Ads
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-info" />
                    Meta Ads
                  </span>
                </div>
                {(
                  [
                    ["Total spend", "spend", money, null],
                    ["Leads", "leads", fmtInt, "up"],
                    ["Cost per lead", "cpl", money, "down"],
                    ["ROAS", "roas", (n: number) => n.toFixed(2) + "x", "up"],
                    ["CTR", "ctr", pct, "up"],
                    ["Conversion rate", "cvr", pct, "up"],
                  ] as const
                ).map(([label, key, fmt, better]) => {
                  const g = v.channels[0].t[key as keyof Totals] as number,
                    m = v.channels[1].t[key as keyof Totals] as number,
                    max = Math.max(g, m) || 1;
                  const win =
                    better === null || !g || !m
                      ? null
                      : (better === "up" ? g >= m : g <= m)
                        ? 0
                        : 1;
                  return (
                    <div key={label}>
                      <p className="mb-1 text-xs font-medium text-muted">
                        {label}
                      </p>
                      {[
                        [g, "bg-brand", 0],
                        [m, "bg-info", 1],
                      ].map(([x, cls, i]) => (
                        <div
                          key={i as number}
                          className="mb-1 flex items-center gap-3"
                        >
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-subtle">
                            <div
                              className={cx(
                                "h-full rounded-full",
                                cls as string,
                              )}
                              style={{
                                width: `${((x as number) / max) * 100}%`,
                              }}
                            />
                          </div>
                          <span
                            className={cx(
                              "w-24 text-right text-xs",
                              win === i ? "font-semibold text-ok" : "text-ink",
                            )}
                          >
                            {x ? fmt(x as number) : "—"}
                            {win === i ? " ✓" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <CardHeader
                title="What the data says"
                subtitle="Automatic highlights for this selection"
              />
              <ul className="divide-y divide-line">
                {insights.length ? (
                  insights.map((i, k) => (
                    <li
                      key={k}
                      className="flex items-start gap-3 px-5 py-3 text-sm text-ink"
                    >
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: COLOR[i.tone] }}
                      />
                      {i.text}
                    </li>
                  ))
                ) : (
                  <li className="px-5 py-3 text-sm text-muted">
                    Not enough data yet.
                  </li>
                )}
              </ul>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader
                title="Campaign performance"
                subtitle="Colours show Good, Okay and Poor against the targets in each KPI tooltip"
              />
              <Table>
                <thead>
                  <tr>
                    <Th>Campaign</Th>
                    <Th>Spend</Th>
                    <Th>Leads</Th>
                    <Th>CPL</Th>
                    <Th>CTR</Th>
                    <Th>Conv. rate</Th>
                    <Th>ROAS</Th>
                    <Th>Leads trend</Th>
                    <Th>Overall</Th>
                  </tr>
                </thead>
                <tbody>
                  {v.camps.map(({ c, t, p, leadsDaily }) => {
                    const has = t.spend > 0,
                      rc = rate(KPI.cpl, t.cpl, has),
                      rr = rate(KPI.roas, t.roas, has),
                      rt = rate(KPI.ctr, t.ctr, has),
                      rv = rate(KPI.cvr, t.cvr, has);
                    const overall: Rating | null = !has
                      ? null
                      : rr === "poor" || rc === "poor"
                        ? "poor"
                        : rr === "good" && rc === "good"
                          ? "good"
                          : "ok";
                    const lt = trendTone(KPI.leads, change(t.leads, p?.leads));
                    const chip = (r: Rating | null, text: string) =>
                      r ? (
                        <Badge tone={RATING[r].tone}>{text}</Badge>
                      ) : (
                        <span className="text-muted">{text}</span>
                      );
                    return (
                      <tr key={c.id}>
                        <Td>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted">{c.channel}</p>
                        </Td>
                        <Td>{has ? money(t.spend) : "—"}</Td>
                        <Td>{fmtInt(t.leads)}</Td>
                        <Td>{chip(rc, val(KPI.cpl, t))}</Td>
                        <Td>{chip(rt, pct(t.ctr))}</Td>
                        <Td>{chip(rv, pct(t.cvr))}</Td>
                        <Td>{chip(rr, t.roas.toFixed(2) + "x")}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <Sparkline values={leadsDaily} color={COLOR[lt]} />
                            <span
                              className="text-xs"
                              style={{ color: COLOR[lt] }}
                            >
                              {arrow(change(t.leads, p?.leads))}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          {overall ? (
                            <Badge tone={RATING[overall].tone}>
                              {RATING[overall].label}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
