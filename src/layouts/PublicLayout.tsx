import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import MessagesWidget from "@/components/chat/MessagesWidget";
import SoundEffects from "@/components/ios/SoundEffects";
import SplashScreen, { shouldShowSplash } from "@/components/splash/SplashScreen";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [splash, setSplash] = useState(shouldShowSplash);

  return (
    <div className="public-layout-wrapper">
      <SoundEffects />
      <Header />
      {/* pt-11 clears the 44px nav bar; the bottom padding clears the phone
          tab bar (lg:hidden). `key` re-runs the iOS "push" transition on
          every route change. */}
      <main key={location.pathname} className="ios-page min-h-screen pb-[calc(var(--ios-tab-h)+1rem)] pt-11 lg:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <MessagesWidget />
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
    </div>
  );
}
