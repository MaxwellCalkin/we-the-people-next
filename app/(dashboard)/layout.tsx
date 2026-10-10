import { getViewer } from "@/lib/viewer";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SkipLink from "@/components/layout/SkipLink";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <Navbar userName={viewer?.name ?? ""} userImage={viewer?.avatar} district={viewer?.district} />
      <main id="main" className="flex-1 pb-16 pt-8 sm:pt-10">
        {children}
      </main>
      <Footer state={viewer?.state} />
    </div>
  );
}
