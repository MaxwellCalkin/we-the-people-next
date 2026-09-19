import { getBallotElections } from "@/lib/ballot-provider";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(await getBallotElections(), {
    headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}
