import type { ReactNode } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-layout-wrapper">
      <Header />
      {/* pt-16 clears the fixed header; pb-20 on mobile clears the fixed
          bottom nav (lg:hidden), matching the original's breakpoint-matched
          spacing so page content never sits under either fixed bar. */}
      <main className="min-h-screen pb-20 pt-16 lg:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}
