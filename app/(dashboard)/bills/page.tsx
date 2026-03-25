import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import { searchBills } from "@/lib/congress";
import User from "@/models/User";
import BillsInfiniteList from "@/components/features/BillsInfiniteList";
import SearchBar from "@/components/ui/SearchBar";

export default async function BillsPage() {
  await connectDB();
  const session = await auth();

  const bills = await searchBills(null);

  // Get user's voted bill slugs
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-brand text-3xl sm:text-4xl text-gradient mb-6">
        Latest Bills
      </h1>

      <SearchBar className="max-w-md mb-8" />

      {bills.length === 0 ? (
        <p className="text-cream/60">No bills available at this time.</p>
      ) : (
        <BillsInfiniteList
          initialBills={bills}
          userVotedSlugs={userVotedSlugs}
        />
      )}
    </div>
  );
}
