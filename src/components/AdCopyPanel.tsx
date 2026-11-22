"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { LIMITS, type AdCopy, type AdCopyInput } from "@/lib/ad-copy";

interface Props {
  input: AdCopyInput;
  copy: AdCopy | null;
  onCopy: (c: AdCopy | null) => void;
}

const toText = (c: AdCopy) =>
  [
    `Headlines:\n${c.headlines.map((h) => "- " + h).join("\n")}`,
    `Descriptions:\n${c.descriptions.map((d) => "- " + d).join("\n")}`,
    `CTA: ${c.cta}`,
    `Landing page: ${c.landingBrief.headline}\n${c.landingBrief.sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nProof needed: ${c.landingBrief.proofNeeded.join("; ") || "None"}`,
  ].join("\n\n");

export default function AdCopyPanel({ input, copy, onCopy }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const mounted = useRef(true); // the parent remounts this panel (key = campaign id), so a late reply never lands on another campaign
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ad-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || `Request failed (${res.status})`);
      if (mounted.current) onCopy(data.copy as AdCopy);
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
        );
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? "" : c)), 1500);
    } catch {
      setError("Copy failed. Select the text and copy it manually.");
    }
  };
  const CopyBtn = ({ k, text }: { k: string; text: string }) => (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => copyText(k, text)}
      aria-label="Copy"
    >
      <Icon name={copied === k ? "check" : "copy"} className="h-3.5 w-3.5" />
      {copied === k ? "Copied" : "Copy"}
    </Button>
  );
  const spinner = (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );

  return (
    <section className="space-y-4" aria-live="polite">
      <Card>
        <CardHeader
          title="3. Ad copy"
          subtitle={`Written by Claude for “${input.name}”. Nothing is published.`}
          action={
            <div className="flex gap-2">
              {copy && !loading && <CopyBtn k="all" text={toText(copy)} />}
              <Button
                variant={copy ? "secondary" : "primary"}
                size="sm"
                onClick={generate}
                disabled={loading}
              >
                {loading ? (
                  spinner
                ) : copy ? (
                  <Icon name="refresh" className="h-3.5 w-3.5" />
                ) : null}
                {loading
                  ? "Generating…"
                  : copy
                    ? "Regenerate"
                    : "Generate Ad Copy"}
              </Button>
            </div>
          }
        />
        {!copy && !loading && !error && (
          <p className="p-5 text-sm text-muted">
            Generate headlines, descriptions, a call-to-action and a
            landing-page brief from this plan.
          </p>
        )}
      </Card>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bad-soft p-4 text-sm text-bad"
        >
          <span>{error}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={generate}
            disabled={loading}
          >
            Try again
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse space-y-3 p-5">
              <div className="h-4 w-1/3 rounded bg-subtle" />
              <div className="h-3 w-full rounded bg-subtle" />
              <div className="h-3 w-5/6 rounded bg-subtle" />
              <div className="h-3 w-2/3 rounded bg-subtle" />
            </Card>
          ))}
        </div>
      )}

      {copy && !loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader
              title="Headlines"
              subtitle={`3 options · up to ${LIMITS.headline} characters`}
            />
            <ul className="divide-y divide-line">
              {copy.headlines.map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{h}</p>
                    <Badge>
                      {h.length}/{LIMITS.headline}
                    </Badge>
                  </div>
                  <CopyBtn k={`h${i}`} text={h} />
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader
              title="Descriptions"
              subtitle={`2 options · up to ${LIMITS.description} characters`}
            />
            <ul className="divide-y divide-line">
              {copy.descriptions.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-sm text-ink">{d}</p>
                    <Badge>
                      {d.length}/{LIMITS.description}
                    </Badge>
                  </div>
                  <CopyBtn k={`d${i}`} text={d} />
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader
              title="Call-to-action"
              action={<CopyBtn k="cta" text={copy.cta} />}
            />
            <p className="p-5">
              <span className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
                {copy.cta}
              </span>
            </p>
          </Card>
          <Card>
            <CardHeader
              title="Landing-page brief"
              action={
                <CopyBtn
                  k="lp"
                  text={`${copy.landingBrief.headline}\n${copy.landingBrief.sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nProof needed: ${copy.landingBrief.proofNeeded.join("; ") || "None"}`}
                />
              }
            />
            <div className="space-y-3 p-5 text-sm">
              <p className="font-medium text-ink">
                {copy.landingBrief.headline}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-ink">
                {copy.landingBrief.sections.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {copy.landingBrief.proofNeeded.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    Proof needed before claiming
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {copy.landingBrief.proofNeeded.map((p, i) => (
                      <Badge key={i} tone="warning">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
