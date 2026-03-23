import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Bill from "@/models/Bill";

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

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "yea") {
      // Only add if user hasn't already voted yea on this bill
      if (!user.yeaBillSlugs.includes(billSlug)) {
        await User.findByIdAndUpdate(user._id, {
          $push: { yeaBillSlugs: billSlug },
        });

        const billExists = await Bill.exists({ billSlug });

        if (!billExists) {
          await Bill.create({
            title: title || "",
            billSlug,
            congress,
            image: "/imgs/wtp.png",
            cloudinaryId: "",
            givenSummary: summary || "",
            nays: 0,
            yeas: 1,
          });
        } else {
          await Bill.findOneAndUpdate({ billSlug }, { $inc: { yeas: 1 } });
        }
      }
    } else if (action === "nay") {
      // Only add if user hasn't already voted nay on this bill
      if (!user.nayBillSlugs.includes(billSlug)) {
        await User.findByIdAndUpdate(user._id, {
          $push: { nayBillSlugs: billSlug },
        });

        const billExists = await Bill.exists({ billSlug });

        if (!billExists) {
          await Bill.create({
            title: title || "",
            billSlug,
            congress,
            image: "/imgs/wtp.png",
            cloudinaryId: "",
            givenSummary: summary || "",
            nays: 1,
            yeas: 0,
          });
        } else {
          await Bill.findOneAndUpdate({ billSlug }, { $inc: { nays: 1 } });
        }
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'yea' or 'nay'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      { error: "Failed to process vote" },
      { status: 500 }
    );
  }
}
