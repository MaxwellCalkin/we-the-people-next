import { lookupBallot } from "@/lib/ballot-provider";
import { ballotLookupThrottle } from "@/lib/ballot-quota";
import type { BallotLookupResponse } from "@/lib/ballot-types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const MAX_BODY_BYTES = 4096;

function invalid(message: string, status = 400) {
  return Response.json({ status: "invalid_address", message } satisfies BallotLookupResponse, { status, headers: HEADERS });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return invalid("Send a registered voting address as JSON.", 415);
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return invalid("The address request is too large.", 413);
  }
  let body: unknown;
  try {
    if (!request.body) return invalid("Enter your registered voting address.");
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return invalid("The address request is too large.", 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      body = JSON.parse(text + decoder.decode());
    } finally {
      reader.releaseLock();
    }
  } catch {
    return invalid("The address request could not be read. Please try again.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return invalid("Enter your registered voting address.");
  const { address, electionId } = body as Record<string, unknown>;
  if (typeof address !== "string" || address.trim().length < 10 || address.trim().length > 300 || /[\u0000-\u001f\u007f]/.test(address)) {
    return invalid("Enter a full street address between 10 and 300 characters, including city, state, and ZIP code.");
  }
  if (electionId !== undefined && (typeof electionId !== "string" || !/^\d{1,20}$/.test(electionId) || electionId === "2000")) {
    return invalid("Choose a valid election and try again.");
  }
  // Only requests that would reach Google count toward the limits, so typos don't lock people out.
  const decision = ballotLookupThrottle.check(request.headers);
  if (!decision.allowed) {
    return Response.json(
      {
        status: "rate_limited",
        message: "Too many ballot lookups right now. Please wait a few minutes and try again, or use your election office’s official lookup.",
      } satisfies BallotLookupResponse,
      { status: 429, headers: { ...HEADERS, "Retry-After": String(decision.retryAfterSeconds) } }
    );
  }
  const result = await lookupBallot(address.trim(), electionId as string | undefined);
  return Response.json(result, { headers: HEADERS });
}
