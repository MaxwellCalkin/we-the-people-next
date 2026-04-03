import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userState = session?.user?.state ?? "";

  let avatarUrl: string | null = null;
  if (session?.user?.id) {
    await connectDB();
    const dbUser = await User.findById(session.user.id).select("avatar").lean();
    avatarUrl = dbUser?.avatar ?? null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navbar userName={session?.user?.userName ?? session?.user?.email ?? ""} userImage={avatarUrl} />
      {/* pt-20 accounts for the fixed navbar height */}
      <main className="flex-1 pt-20 pb-8">{children}</main>
      <Footer state={userState} />
    </div>
  );
}
