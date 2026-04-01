import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Bill from "@/models/Bill";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  await connectDB();
  const session = await auth();

  const billDoc = await Bill.findOne({ billSlug: slug })
    .select("yeas nays")
    .lean();

  const result: {
    yeas: number;
    nays: number;
    yeasByDistrict: number;
    naysByDistrict: number;
  } = {
    yeas: billDoc?.yeas ?? 0,
    nays: billDoc?.nays ?? 0,
    yeasByDistrict: 0,
    naysByDistrict: 0,
  };

  if (session?.user?.state && session?.user?.cd) {
    result.yeasByDistrict = await User.countDocuments({
      yeaBillSlugs: slug,
      state: session.user.state,
      cd: session.user.cd,
    });
    result.naysByDistrict = await User.countDocuments({
      nayBillSlugs: slug,
      state: session.user.state,
      cd: session.user.cd,
    });
  }

  return NextResponse.json(result);
}
