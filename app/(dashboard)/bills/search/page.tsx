import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import { searchBills } from "@/lib/congress";
import User from "@/models/User";
import BillCard from "@/components/features/BillCard";
import SearchBar from "@/components/ui/SearchBar";
import StaggerReveal from "@/components/animations/StaggerReveal";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function BillSearchPage({
  searchParams,
}: SearchPageProps) {
  await connectDB();
  const session = await auth();
  const { q } = await searchParams;

  const query = q || "";
  const bills = query ? await searchBills(query) : [];

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
        Search Results for &ldquo;{query}&rdquo;
      </h1>

      <SearchBar className="max-w-md mb-8" />

      {bills.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-cream/60 text-lg">
            No bills found matching your search.
          </p>
          <p className="text-cream/40 text-sm mt-2">
            Try a different search term.
          </p>
        </div>
      ) : (
        <StaggerReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bills.map((bill) => (
            <BillCard
              key={bill.bill_id}
              bill={bill}
              userVotedSlugs={userVotedSlugs}
            />
          ))}
        </StaggerReveal>
      )}
    </div>
  );
}
