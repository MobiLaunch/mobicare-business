import { useCallback, useEffect, useRef, useState } from "react";

import RealIcon, { type RealIconName } from "@/components/ios/RealIcons";
import { play } from "@/lib/sound";

const SEEN_KEY = "mobicare:splash-seen";

/** Show once per browser session, only on the homepage, never for reduced-motion. */
export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.pathname !== "/") return false;
  if (new URLSearchParams(window.location.search).has("nosplash")) return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

interface Slot {
  label: string;
  icon: RealIconName;
  extra?: boolean;
}

// 4×4 on short screens, a fifth row on tall ones — like the iPhone 4S → 5 jump.
const GRID: Slot[] = [
  { label: "Messages", icon: "messages" },
  { label: "Calendar", icon: "calendar" },
  { label: "Photos", icon: "photos" },
  { label: "Camera", icon: "camera" },
  { label: "Weather", icon: "weather" },
  { label: "Mobicare", icon: "mobicare" },
  { label: "Maps", icon: "maps" },
  { label: "Clock", icon: "clock" },
  { label: "Notes", icon: "notes" },
  { label: "Stocks", icon: "stocks" },
  { label: "Game Center", icon: "gamecenter" },
  { label: "Passbook", icon: "passbook" },
  { label: "Calculator", icon: "calculator" },
  { label: "Compass", icon: "compass" },
  { label: "App Store", icon: "appstore" },
  { label: "Settings", icon: "settings" },
  { label: "Videos", icon: "videos", extra: true },
  { label: "Reminders", icon: "reminders", extra: true },
  { label: "FaceTime", icon: "facetime", extra: true },
  { label: "Contacts", icon: "contacts", extra: true },
];

const DOCK: Slot[] = [
  { label: "Phone", icon: "phone" },
  { label: "Mail", icon: "mail" },
  { label: "Safari", icon: "safari" },
  { label: "Music", icon: "music" },
];

const ICON = "17.5cqw";

function SignalBars() {
  return (
    <svg aria-hidden="true" height="11" viewBox="0 0 22 11" width="22">
      {[3, 5, 7, 9, 11].map((h, i) => (
        <rect key={i} fill="#fff" height={h} rx=".6" width="3" x={i * 4.4} y={11 - h} />
      ))}
    </svg>
  );
}

function Wifi() {
  return (
    <svg aria-hidden="true" height="11" viewBox="0 0 16 11" width="16">
      <path d="M1 4 Q8 -1.5 15 4" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M3.6 6.6 Q8 3.2 12.4 6.6" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M6 9 Q8 7.4 10 9" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function Battery() {
  return (
    <svg aria-hidden="true" height="11" viewBox="0 0 27 11" width="27">
      <rect fill="none" height="10" rx="2.6" stroke="#fff" strokeOpacity=".9" width="23" x=".5" y=".5" />
      <rect fill="#fff" height="7" rx="1.2" width="19" x="2.5" y="2" />
      <rect fill="#fff" height="4" rx="1" width="2" x="24" y="3.5" />
    </svg>
  );
}

/** iOS 6 status bar: glossy black, signal bars + carrier + Wi-Fi, centred time, battery. */
function StatusBar() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 15_000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="sb-statusbar">
      <span className="flex items-center gap-1.5">
        <SignalBars />
        <span>Mobicare</span>
        <Wifi />
      </span>
      <span className="absolute left-1/2 -translate-x-1/2">
        {time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </span>
      <span className="flex items-center gap-1.5">
        <span>100%</span>
        <Battery />
      </span>
    </div>
  );
}

/**
 * Launch image — iOS apps showed a static screenshot of their UI while
 * loading. Ours matches the real site's nav bar so the zoom lands seamlessly.
 */
function LaunchImage() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="sb-statusbar" />
      <div className="ios-navbar flex h-11 shrink-0 items-center justify-center">
        <span className="ios-navbar-title text-[17px]">Mobicare</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <RealIcon name="mobicare" size={96} />
        <div className="letterpress text-2xl font-extrabold text-[#1f2430]">Mobicare</div>
        <div className="letterpress text-sm font-bold text-[#4c566c]">Device Recovery</div>
      </div>
    </div>
  );
}

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<"home" | "opening" | "leaving">("home");
  const [rect, setRect] = useState<{ top: number; left: number; size: number; w: number; h: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const started = useRef(false);
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    document.documentElement.classList.add("app-entering");
    window.setTimeout(() => document.documentElement.classList.remove("app-entering"), 800);
    onDone();
  }, [onDone]);

  const launch = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const screen = screenRef.current?.getBoundingClientRect();
    const target = targetRef.current?.querySelector("[data-icon]")?.getBoundingClientRect();

    if (!screen || !target) {
      finish();

      return;
    }

    play("launch");
    setRect({ top: target.top - screen.top, left: target.left - screen.left, size: target.width, w: screen.width, h: screen.height });
    setPhase("opening");
    // Two frames: first paints the launch image at the icon's position, second flips it to full-bleed so the CSS transition has a start state.
    requestAnimationFrame(() => requestAnimationFrame(() => setExpanded(true)));
    timers.current.push(
      window.setTimeout(() => {
        setPhase("leaving");
        play("unlock");
        timers.current.push(window.setTimeout(finish, 520));
      }, 720),
    );
  }, [finish]);

  // Auto-open so nobody is held hostage by the intro.
  useEffect(() => {
    const id = window.setTimeout(launch, 3400);

    return () => window.clearTimeout(id);
  }, [launch]);

  useEffect(() => {
    const pending = timers.current;

    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Lock page scroll while the splash is up; focus the app so keyboard users can launch it.
  useEffect(() => {
    const prev = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    targetRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    // Tapping anywhere launches the app; Skip and the icon are the keyboard paths.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div aria-label="Welcome to Mobicare" className={`sb-stage ${phase === "leaving" ? "is-leaving" : ""}`} role="dialog" onClick={launch}>
      <div className="sb-desk hidden sm:block" />

      <div className="sb-phone">
        <div ref={screenRef} className="sb-screen">
          {/* Wallpaper */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_12%,#7aa6e8_0%,#3463b3_36%,#142c63_72%,#0a1636_100%)]" />
          <span className="sb-bokeh -left-10 top-24 size-52" />
          <span className="sb-bokeh right-0 top-1/2 size-72" style={{ animationDelay: "-3s" }} />
          <span className="sb-bokeh bottom-24 left-1/4 size-44" style={{ animationDelay: "-6s" }} />

          <StatusBar />

          <div aria-hidden={phase !== "home"} className={`relative flex min-h-0 flex-1 flex-col transition-transform duration-500 ${phase === "home" ? "" : "scale-[0.86] opacity-90"}`}>
            <div className="sb-grid">
              {GRID.map((slot, i) => {
                const delay = `${120 + i * 40}ms`;
                const cls = `sb-icon sb-slot ${slot.extra ? "sb-extra" : ""}`;

                if (slot.icon === "mobicare") {
                  return (
                    <button
                      key="mobicare"
                      ref={targetRef}
                      aria-label="Open Mobicare"
                      className={`${cls} relative !outline-none`}
                      style={{ ["--d" as string]: delay }}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        launch();
                      }}
                    >
                      <span className="relative" data-icon>
                        <span className="sb-target absolute inset-0 rounded-[22.5%]" />
                        <RealIcon badge={1} name="mobicare" size={ICON} />
                        <span className="sb-finger" />
                      </span>
                      <span>Mobicare</span>
                    </button>
                  );
                }

                return (
                  <div key={slot.label} aria-hidden="true" className={cls} style={{ ["--d" as string]: delay }}>
                    <RealIcon name={slot.icon} size={ICON} />
                    <span>{slot.label}</span>
                  </div>
                );
              })}
            </div>

            <p className="m-0 mb-2 mt-1 text-center text-[13px] font-bold text-white/90" style={{ textShadow: "0 1px 2px rgba(0,0,0,.7)" }}>
              Tap <span className="text-[#8dff8a]">Mobicare</span> to open
            </p>

            <div aria-hidden="true" className="mb-2 flex items-center justify-center gap-2">
              <svg height="8" viewBox="0 0 8 8" width="8"><circle cx="3.5" cy="3.5" fill="none" r="2.5" stroke="#fff" strokeWidth="1.3" /><path d="M5.5 5.5 L7.5 7.5" stroke="#fff" strokeLinecap="round" strokeWidth="1.3" /></svg>
              <span className="size-1.5 rounded-full bg-white" />
              <span className="size-1.5 rounded-full bg-white/40" />
              <span className="size-1.5 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Dock */}
          <div aria-hidden="true" className="sb-dock">
            {DOCK.map((d, i) => (
              <div key={d.label} className="sb-icon" style={{ ["--d" as string]: `${800 + i * 60}ms` }}>
                <RealIcon name={d.icon} size={ICON} />
              </div>
            ))}
          </div>

          {/* The app opening: a full-screen layer that starts scaled down onto
              the icon and animates to identity. Transform-only, so it stays
              on the compositor instead of re-laying-out every frame. */}
          {rect && (
            <div
              aria-hidden="true"
              className="absolute left-0 top-0 z-20 overflow-hidden bg-[#cdd1d7] will-change-transform"
              style={{
                width: rect.w,
                height: rect.h,
                transformOrigin: "0 0",
                transform: expanded ? "none" : `translate(${rect.left}px, ${rect.top}px) scale(${rect.size / rect.w}, ${rect.size / rect.h})`,
                borderRadius: expanded ? 0 : rect.w * 0.225,
                transition: "transform 0.62s cubic-bezier(0.3, 0.9, 0.25, 1), border-radius 0.62s ease",
                backgroundImage: "var(--ios-linen, none)",
              }}
            >
              <div style={{ opacity: expanded ? 1 : 0, transition: "opacity 0.3s ease 0.2s", height: "100%" }}>
                <LaunchImage />
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        className="ios-btn ios-btn--gray ios-btn--sm !absolute right-3 z-30"
        style={{ top: "calc(env(safe-area-inset-top) + 28px)" }}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          started.current = true;
          finish();
        }}
      >
        Skip
      </button>
    </div>
  );
}
