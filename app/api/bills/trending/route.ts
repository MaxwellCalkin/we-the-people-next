import { NextResponse } from "next/server";
import { getTrendingBills } from "@/lib/trending";

export async function GET() {
  try {
    const bills = await getTrendingBills(50);
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error fetching trending bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending bills" },
      { status: 500 }
    );
  }
}
