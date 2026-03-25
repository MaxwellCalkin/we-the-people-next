import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { searchBills } from "@/lib/congress";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("search");
    const offset = parseInt(searchParams.get("offset") || "0", 10);

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
