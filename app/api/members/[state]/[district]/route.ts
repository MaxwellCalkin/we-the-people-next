import { NextResponse } from "next/server";
import { fetchMembers } from "@/lib/congress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ state: string; district: string }> }
) {
  try {
    const { state, district } = await params;
    const members = await fetchMembers(state, district);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
