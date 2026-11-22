import { NextResponse } from "next/server";
import {
  CHANNELS,
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseJson,
  validateCopy,
  type AdCopyInput,
} from "@/lib/ad-copy";
import { limited, readJson } from "@/lib/security";

type Msg = { role: "user" | "assistant"; content: string };
class UpstreamError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`Upstream ${status}`);
    this.status = status;
    this.detail = detail;
  }
}
const err = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

async function ask(messages: Msg[]): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!res.ok)
      throw new UpstreamError(
        res.status,
        (await res.json().catch(() => null))?.error?.message ?? "",
      );
    const data = await res.json();
    return (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
  } finally {
    clearTimeout(timer);
  }
}

function readInput(b: Record<string, unknown>): AdCopyInput | null {
  const s = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const input = {
    campaignId: s(b.campaignId, 64),
    name: s(b.name, 120),
    objective: s(b.objective, 60),
    channel: s(b.channel, 30),
    budget: typeof b.budget === "number" ? b.budget : NaN,
    audience: s(b.audience, 300),
    brief: s(b.brief, 2000),
  };
  const ok =
    input.campaignId &&
    input.name &&
    input.objective &&
    input.brief &&
    Number.isFinite(input.budget) &&
    input.budget > 0 &&
    (CHANNELS as readonly string[]).includes(input.channel);
  return ok ? input : null;
}

export async function POST(req: Request) {
  if (limited(req, "ad-copy", 10))
    return err(429, "Too many requests. Please wait a minute.");
  const parsed = await readJson(req);
  if (!parsed.ok) return err(parsed.status, parsed.error);
  const input = readInput(parsed.body);
  if (!input)
    return err(
      400,
      "Campaign name, objective, channel, budget and brief are required.",
    );
  if (!process.env.ANTHROPIC_API_KEY)
    return err(503, "The Claude API is not configured on the server.");
  try {
    const messages: Msg[] = [{ role: "user", content: buildUserPrompt(input) }];
    let text = await ask(messages),
      result = validateCopy(parseJson(text));
    if (!result.copy) {
      messages.push(
        { role: "assistant", content: text },
        {
          role: "user",
          content: `Fix these problems and return the full corrected JSON only:\n- ${result.problems.join("\n- ")}`,
        },
      );
      text = await ask(messages);
      result = validateCopy(parseJson(text));
    }
    if (!result.copy)
      return err(
        422,
        "The generated copy did not pass the claims and length checks. Please try again.",
      );
    return NextResponse.json({
      campaignId: input.campaignId,
      copy: result.copy,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      return err(504, "Claude took too long to respond. Please try again.");
    if (e instanceof UpstreamError) {
      console.error("ad-copy: Claude API error, status", e.status); // status only: never the key, the prompt or the upstream message
      if (e.status === 401 || e.status === 403)
        return err(502, "The Claude API key was rejected.");
      if (e.status === 404)
        return err(502, "The configured Claude model was not found.");
      if (e.status === 429)
        return err(
          429,
          "Claude rate limit reached. Wait a moment and try again.",
        );
      if (e.status === 400 && /credit balance/i.test(e.detail))
        return err(502, "The Claude API account has no credits left.");
      return err(502, "The Claude API returned an error. Please try again.");
    }
    console.error("ad-copy: request failed");
    return err(502, "Could not reach the Claude API.");
  }
}
