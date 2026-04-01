import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Bill from "@/models/Bill";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "hres1146";

  const dbResult = await connectDB();

  const billDoc = await Bill.findOne({ billSlug: slug }).select("yeas nays title").lean();
  const userYeaCount = await User.countDocuments({ yeaBillSlugs: slug });
  const userNayCount = await User.countDocuments({ nayBillSlugs: slug });

  return NextResponse.json({
    slug,
    dbConnected: !!dbResult,
    mongooseState: mongoose.connection.readyState,
    billDoc: billDoc ? { title: billDoc.title, yeas: billDoc.yeas, nays: billDoc.nays } : null,
    userYeaCount,
    userNayCount,
  });
}
