import { NextResponse } from "next/server";
import { searchBills } from "@/lib/congress";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("search");
    const requested = parseInt(searchParams.get("offset") || "0", 10);
    const offset = Number.isFinite(requested) && requested > 0 ? requested : 0;

    const bills = await searchBills(query, offset);

    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}
