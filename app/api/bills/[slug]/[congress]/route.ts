import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { fetchBillDetails } from "@/lib/congress";
import Bill from "@/models/Bill";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; congress: string }> }
) {
  try {
    await connectDB();

    const { slug, congress } = await params;
    const bill = await fetchBillDetails(congress, slug);

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Look up community vote counts from our DB
    const existingBill = await Bill.findOne({ billSlug: slug });
    const communityVotes = {
      yeas: existingBill?.yeas ?? 0,
      nays: existingBill?.nays ?? 0,
    };

    return NextResponse.json({ bill, communityVotes });
  } catch (error) {
    console.error("Error fetching bill details:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill details" },
      { status: 500 }
    );
  }
}
