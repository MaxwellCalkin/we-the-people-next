export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import { searchBills } from "@/lib/congress";
import User from "@/models/User";
import BillsPageTabs from "@/components/features/BillsPageTabs";

export default async function BillsPage() {
  await connectDB();
  const session = await auth();

  const newBills = await searchBills(null);

  let userVotedSlugs: string[] = [];
  if (session?.user?.id) {
    const user = await User.findById(session.user.id).lean();
    if (user) {
      userVotedSlugs = [
        ...(user.yeaBillSlugs || []),
        ...(user.nayBillSlugs || []),
      ];
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-6">
        Bills
      </h1>
      <BillsPageTabs
        initialNewBills={newBills}
        userVotedSlugs={userVotedSlugs}
      />
    </div>
  );
}
