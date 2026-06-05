import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleUpvote } from "@/lib/proposals";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await toggleUpvote(id, {
    id: session.user.id,
    state: session.user.state,
    cd: session.user.cd,
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}
