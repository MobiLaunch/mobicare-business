import { Suspense, lazy } from "react";
import { Outlet } from "react-router-dom";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

// The chat widget isn't needed for first paint; load it once the page is idle.
const ChatWidget = lazy(() => import("@/components/chat/ChatWidget"));

/**
 * Layout route for every public page. The header and footer stay mounted
 * while a lazily-loaded page streams in, so navigation never flashes blank.
 */
export default function PublicLayout() {
  return (
    <div className="mc-app">
      <Header />
      <main className="mc-main">
        <Suspense fallback={<div aria-label="Loading" className="mc-spinner" role="status" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
