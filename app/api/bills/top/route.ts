import { NextResponse } from "next/server";
import { getTopBills } from "@/lib/trending";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "week") as "day" | "week" | "month" | "year";

    if (!["day", "week", "month", "year"].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be day, week, month, or year" },
        { status: 400 }
      );
    }

    const bills = await getTopBills(period, 50);
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error fetching top bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch top bills" },
      { status: 500 }
    );
  }
}
