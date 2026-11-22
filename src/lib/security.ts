// Small server-side helpers shared by the API routes. No framework imports, so they are easy to test.
import { timingSafeEqual } from "node:crypto";

export const MAX_BODY = 10_000; // bytes of JSON we will accept

export async function readJson(
  req: Request,
): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return {
      ok: false,
      status: 415,
      error: "Content-Type must be application/json.",
    };
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY)
    return { ok: false, status: 413, error: "Request is too large." };
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY)
    return { ok: false, status: 413, error: "Request is too large." };
  try {
    const v: unknown = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v))
      return { ok: true, body: v as Record<string, unknown> };
  } catch {
    /* fall through */
  }
  return {
    ok: false,
    status: 400,
    error: "Request body must be a JSON object.",
  };
}

// A person must prove they are the reviewer. A typed name alone is not proof.
export function reviewerAllowed(
  passcode: unknown,
): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.APPROVER_PASSCODE;
  if (!expected)
    return process.env.NODE_ENV === "production"
      ? {
          ok: false,
          status: 503,
          error:
            "Approvals are disabled until APPROVER_PASSCODE is set on the server.",
        } // fail closed
      : { ok: true }; // local demo only
  const a = Buffer.from(typeof passcode === "string" ? passcode : ""),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, status: 401, error: "Wrong reviewer passcode." };
}

// Basic per-IP limiter (in memory). Slows passcode guessing and stops anyone burning Claude API credits.
const hits = new Map<string, number[]>();
export function limited(
  req: Request,
  name: string,
  max: number,
  windowMs = 60_000,
): boolean {
  const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local",
    key = `${name}:${ip}`,
    now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}
