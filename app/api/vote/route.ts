import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Bill from "@/models/Bill";
import BillVoteEvent from "@/models/BillVoteEvent";
import { cacheVotesAndRecomputeScores } from "@/lib/member-votes";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, billSlug, congress, title, summary } = body;

    if (!action || !billSlug || !congress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action !== "yea" && action !== "nay") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'yea' or 'nay'" },
        { status: 400 }
      );
    }

    // Atomic check-and-update to prevent race conditions
    const result = await User.findOneAndUpdate(
      {
        _id: session.user.id,
        yeaBillSlugs: { $ne: billSlug },
        nayBillSlugs: { $ne: billSlug },
      },
      { $push: { [action === "yea" ? "yeaBillSlugs" : "nayBillSlugs"]: billSlug } },
      { new: true }
    );
    if (!result) {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }

    // Update or create the Bill document (non-blocking — user vote is already saved)
    const voteField = action === "yea" ? "yeas" : "nays";
    try {
      const billExists = await Bill.exists({ billSlug });

      if (!billExists) {
        await Bill.create({
          title: title || "",
          billSlug,
          congress,
          image: "/imgs/wtp.png",
          cloudinaryId: "",
          givenSummary: summary || "",
          nays: action === "nay" ? 1 : 0,
          yeas: action === "yea" ? 1 : 0,
        });
      } else {
        await Bill.findOneAndUpdate({ billSlug }, { $inc: { [voteField]: 1 } });
      }
    } catch (billErr) {
      console.error("Bill create/update failed:", billErr instanceof Error ? billErr.message : billErr);
    }

    // Create vote event for trending/top calculations (non-blocking)
    try {
      await BillVoteEvent.create({ billSlug, congress, votedAt: new Date() });
    } catch (eventErr) {
      console.error("BillVoteEvent create failed:", eventErr instanceof Error ? eventErr.message : eventErr);
    }

    // Async: cache member votes and recompute alignment scores (non-blocking)
    cacheVotesAndRecomputeScores(billSlug, congress).catch((err) =>
      console.log("Async vote caching error:", err instanceof Error ? err.message : err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      { error: "Failed to process vote" },
      { status: 500 }
    );
  }
}
