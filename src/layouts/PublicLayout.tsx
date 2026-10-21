import { Suspense, lazy, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import SoundEffects from "@/components/ios/SoundEffects";
import SplashScreen, { shouldShowSplash } from "@/components/splash/SplashScreen";

// The chat widget isn't needed for first paint; load it once the page is idle.
const MessagesWidget = lazy(() => import("@/components/chat/MessagesWidget"));

/**
 * Layout route for every public page. The header, tab bar and footer stay
 * mounted while a lazily-loaded page streams in, so navigation never flashes blank.
 */
export default function PublicLayout() {
  const location = useLocation();
  const [splash, setSplash] = useState(shouldShowSplash);

  return (
    <div className="public-layout-wrapper">
      <SoundEffects />
      <Header />
      {/* pt-11 clears the 44px nav bar; `key` re-runs the iOS "push"
          transition on every route change. */}
      <main key={location.pathname} className="ios-page min-h-screen pt-11">
        <Suspense fallback={<div aria-label="Loading" className="ios-spinner" role="status" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
      <Suspense fallback={null}>
        <MessagesWidget />
      </Suspense>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
    </div>
  );
}
