import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Bill from "@/models/Bill";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  const slug = "hr8029";

  const billExists = await Bill.findOne({ billSlug: slug }).lean();
  const yeaCount = await User.countDocuments({ yeaBillSlugs: slug });
  const nayCount = await User.countDocuments({ nayBillSlugs: slug });

  // Also check what users have this slug
  const usersWithSlug = await User.find({
    $or: [{ yeaBillSlugs: slug }, { nayBillSlugs: slug }],
  })
    .select("userName yeaBillSlugs nayBillSlugs")
    .lean();

  return NextResponse.json({
    slug,
    billExists: !!billExists,
    billTitle: billExists?.title || null,
    yeaCount,
    nayCount,
    usersWithSlug: usersWithSlug.map((u) => ({
      userName: u.userName,
      hasYea: u.yeaBillSlugs?.includes(slug),
      hasNay: u.nayBillSlugs?.includes(slug),
    })),
  });
}
