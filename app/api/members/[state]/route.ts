import { NextResponse } from "next/server";
import { fetchMembers } from "@/lib/congress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ state: string }> }
) {
  try {
    const { state } = await params;
    const members = await fetchMembers(state);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
