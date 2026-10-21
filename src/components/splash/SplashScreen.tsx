import { useCallback, useEffect, useRef, useState } from "react";
import {
  BatteryFull,
  Calculator,
  Calendar,
  Camera,
  Clock,
  CloudSun,
  Compass,
  Gamepad2,
  Images,
  Mail,
  Map,
  MessageSquare,
  Music,
  Phone,
  Settings,
  Smartphone,
  StickyNote,
  Store,
  Video,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import AppIcon, { type IconColor } from "@/components/ios/AppIcon";
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
  icon: LucideIcon;
  color: IconColor;
}

// The grid is decoration — a believable home screen for the real app to live on.
const GRID: Array<Slot | "mobicare"> = [
  { label: "Messages", icon: MessageSquare, color: "green" },
  { label: "Calendar", icon: Calendar, color: "red" },
  { label: "Photos", icon: Images, color: "yellow" },
  { label: "Camera", icon: Camera, color: "gray" },
  { label: "Weather", icon: CloudSun, color: "teal" },
  "mobicare",
  { label: "Maps", icon: Map, color: "green" },
  { label: "Videos", icon: Video, color: "purple" },
  { label: "Notes", icon: StickyNote, color: "yellow" },
  { label: "Clock", icon: Clock, color: "gray" },
  { label: "Wallet", icon: Wallet, color: "orange" },
  { label: "Calculator", icon: Calculator, color: "gray" },
  { label: "Game Center", icon: Gamepad2, color: "pink" },
  { label: "App Store", icon: Store, color: "blue" },
  { label: "Compass", icon: Compass, color: "gray" },
  { label: "Settings", icon: Settings, color: "gray" },
];

const DOCK: Slot[] = [
  { label: "Phone", icon: Phone, color: "green" },
  { label: "Mail", icon: Mail, color: "blue" },
  { label: "Safari", icon: Compass, color: "blue" },
  { label: "Music", icon: Music, color: "orange" },
];

function StatusBar() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 15_000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="relative z-10 flex h-5 items-center justify-between bg-gradient-to-b from-black/70 to-black/45 px-3 text-[12px] font-bold text-white"
      style={{ textShadow: "0 -1px 0 rgba(0,0,0,.6)" }}
    >
      <span className="flex items-center gap-1">
        Mobicare <Wifi aria-hidden="true" className="size-3" />
      </span>
      <span>{time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      <span className="flex items-center gap-1">
        100% <BatteryFull aria-hidden="true" className="size-4" />
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
    <div className="flex h-full w-full flex-col" style={{ background: "inherit" }}>
      <div className="ios-navbar flex h-11 shrink-0 items-center justify-center">
        <span className="ios-navbar-title text-[17px]">Mobicare</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <AppIcon color="green" icon={Smartphone} size={84} />
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
  const [rect, setRect] = useState<{ top: number; left: number; size: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const started = useRef(false);

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
    const target = targetRef.current?.getBoundingClientRect();

    if (!screen || !target) {
      finish();

      return;
    }

    play("launch");
    setRect({ top: target.top - screen.top, left: target.left - screen.left, size: target.width });
    setPhase("opening");
    // Two frames: first paints the launch image at the icon's position, second flips it to full-bleed so the CSS transition has a start state.
    requestAnimationFrame(() => requestAnimationFrame(() => setExpanded(true)));
    window.setTimeout(() => {
      setPhase("leaving");
      play("unlock");
      window.setTimeout(finish, 520);
    }, 720);
  }, [finish]);

  // Auto-open so nobody is held hostage by the intro.
  useEffect(() => {
    const id = window.setTimeout(launch, 3200);

    return () => window.clearTimeout(id);
  }, [launch]);

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
    <div
      aria-label="Welcome to Mobicare"
      className={`fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-[#0b1530] transition-[opacity,transform] duration-500 ease-out ${phase === "leaving" ? "pointer-events-none scale-[1.35] opacity-0" : ""}`}
      role="dialog"
      onClick={launch}
    >
      {/* Desktop: a handset floating on a dark desk. Mobile: the handset *is* the screen. */}
      <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_at_50%_30%,#27407a,#0b1530_70%)] sm:block" />

      <div className="relative h-full w-full sm:h-[min(800px,94vh)] sm:w-[min(400px,92vw)] sm:rounded-[48px] sm:border-[10px] sm:border-[#15171b] sm:shadow-[0_0_0_2px_#3a3f4a,0_30px_90px_rgba(0,0,0,0.75)]">
        <div ref={screenRef} className="relative flex h-full w-full flex-col overflow-hidden bg-[#16306a] sm:rounded-[38px]">
          {/* Wallpaper */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,#6a9be0_0%,#2f5aa8_38%,#12285a_100%)]" />
          <span className="sb-bokeh -left-10 top-24 size-52" />
          <span className="sb-bokeh right-0 top-1/2 size-72" style={{ animationDelay: "-3s" }} />
          <span className="sb-bokeh bottom-24 left-1/4 size-44" style={{ animationDelay: "-6s" }} />

          <StatusBar />

          <div aria-hidden={phase !== "home"} className={`relative flex flex-1 flex-col px-4 pt-6 transition-transform duration-500 ${phase === "home" ? "" : "scale-[0.86] opacity-90"}`}>
            <div className="grid grid-cols-4 gap-x-2 gap-y-5">
              {GRID.map((slot, i) => {
                const delay = `${120 + i * 45}ms`;

                if (slot === "mobicare") {
                  return (
                    <button
                      key="mobicare"
                      ref={targetRef}
                      aria-label="Open Mobicare"
                      className="sb-icon relative flex flex-col items-center gap-1.5 !outline-none"
                      style={{ ["--d" as string]: delay }}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        launch();
                      }}
                    >
                      <span className="relative">
                        <span className="sb-target absolute inset-0 rounded-[22.5%]" />
                        <AppIcon badge={1} color="green" icon={Smartphone} size={60} />
                        <span className="sb-finger" />
                      </span>
                      <span className="text-[11px] font-bold text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,.8)" }}>
                        Mobicare
                      </span>
                    </button>
                  );
                }

                return (
                  <div key={slot.label} aria-hidden="true" className="sb-icon flex flex-col items-center gap-1.5" style={{ ["--d" as string]: delay }}>
                    <AppIcon color={slot.color} icon={slot.icon} size={60} />
                    <span className="text-[11px] font-bold text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,.8)" }}>
                      {slot.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-auto mb-3 text-center text-sm font-bold text-white/90" style={{ textShadow: "0 1px 2px rgba(0,0,0,.7)" }}>
              Tap <span className="text-[#8dff8a]">Mobicare</span> to open
            </p>

            <div className="mb-2 flex justify-center gap-2" aria-hidden="true">
              <span className="size-1.5 rounded-full bg-white" />
              <span className="size-1.5 rounded-full bg-white/40" />
              <span className="size-1.5 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Dock */}
          <div
            aria-hidden="true"
            className="relative flex h-[84px] items-center justify-around px-3"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,.08) 40%, rgba(0,0,0,.35))",
              borderTop: "1px solid rgba(255,255,255,.45)",
              boxShadow: "0 -2px 8px rgba(0,0,0,.35)",
            }}
          >
            {DOCK.map((d, i) => (
              <div key={d.label} className="sb-icon" style={{ ["--d" as string]: `${800 + i * 60}ms` }}>
                <AppIcon color={d.color} icon={d.icon} size={60} />
              </div>
            ))}
          </div>

          {/* The app opening: grows from the icon to fill the screen */}
          {rect && (
            <div
              aria-hidden="true"
              className="absolute z-20 overflow-hidden bg-[#cdd1d7]"
              style={{
                top: expanded ? 0 : rect.top,
                left: expanded ? 0 : rect.left,
                width: expanded ? "100%" : rect.size,
                height: expanded ? "100%" : rect.size,
                borderRadius: expanded ? 0 : "22.5%",
                transition: "all 0.62s cubic-bezier(0.3, 0.9, 0.25, 1)",
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,.22) 0 1px, rgba(60,70,90,.07) 1px 2px), repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, rgba(60,70,90,.07) 1px 2px)",
              }}
            >
              <div
                className="absolute left-0 top-0"
                style={{
                  width: "var(--sw)",
                  height: "var(--sh)",
                  opacity: expanded ? 1 : 0,
                  transition: "opacity 0.3s ease 0.2s",
                }}
                ref={(el) => {
                  const s = screenRef.current;

                  if (el && s) {
                    el.style.setProperty("--sw", `${s.clientWidth}px`);
                    el.style.setProperty("--sh", `${s.clientHeight}px`);
                  }
                }}
              >
                <LaunchImage />
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        className="ios-btn ios-btn--gray ios-btn--sm absolute right-4 top-4 z-30"
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
