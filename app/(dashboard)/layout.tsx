import { auth } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userState = session?.user?.state ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navbar />
      {/* pt-20 accounts for the fixed navbar height */}
      <main className="flex-1 pt-20 pb-8">{children}</main>
      <Footer state={userState} />
    </div>
  );
}
