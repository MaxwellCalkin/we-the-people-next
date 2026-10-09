import { ballotElectionsCache } from "@/lib/ballot-quota";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(await ballotElectionsCache.get(), {
    headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}
