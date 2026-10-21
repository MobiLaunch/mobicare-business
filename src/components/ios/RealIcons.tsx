import type { ReactNode } from "react";

/**
 * Hand-drawn SVG homages to the 2012-era Springboard icons. These are original
 * vector artwork written for this site (shapes, gradients and glyphs drawn
 * from scratch), not Apple's artwork files.
 */

export type RealIconName =
  | "messages" | "phone" | "mail" | "safari" | "photos" | "camera" | "calendar" | "clock"
  | "maps" | "weather" | "notes" | "settings" | "appstore" | "music" | "gamecenter"
  | "passbook" | "videos" | "calculator" | "compass" | "stocks" | "reminders"
  | "facetime" | "contacts" | "mobicare";

const GLOSS = "M0 27 Q0 0 27 0 H93 Q120 0 120 27 V52 Q60 70 0 52 Z";

function Shell({ id, from, to, children }: { id: string; from: string; to: string; children: ReactNode }) {
  return (
    <svg aria-hidden="true" height="100%" viewBox="0 0 120 120" width="100%">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${id}-gl`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".78" />
          <stop offset="1" stopColor="#fff" stopOpacity=".12" />
        </linearGradient>
        <filter id={`${id}-sh`} x="-20%" y="-20%" height="150%" width="140%">
          <feDropShadow dx="0" dy="2" floodColor="#000" floodOpacity=".35" stdDeviation="1.6" />
        </filter>
      </defs>
      <rect fill={`url(#${id}-bg)`} height="120" rx="26" width="120" />
      {children}
      <path d={GLOSS} fill={`url(#${id}-gl)`} />
      <rect fill="none" height="119" rx="25.5" stroke="#000" strokeOpacity=".28" width="119" x=".5" y=".5" />
    </svg>
  );
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Messages() {
  return (
    <Shell from="#86e476" id="msg" to="#27a024">
      <g filter="url(#msg-sh)">
        <ellipse cx="60" cy="54" fill="#fff" rx="37" ry="29" />
        <path d="M34 72 C34 80 28 88 21 91 C32 92 42 88 49 80 Z" fill="#fff" />
      </g>
      <ellipse cx="60" cy="54" fill="#eceff1" opacity=".55" rx="37" ry="29" transform="translate(0 4)" />
      <ellipse cx="60" cy="52" fill="#fff" rx="37" ry="28" />
    </Shell>
  );
}

function Phone() {
  return (
    <Shell from="#86e476" id="ph" to="#27a024">
      <g fill="#fff" filter="url(#ph-sh)" transform="translate(17 17) scale(3.5)">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </g>
    </Shell>
  );
}

function Mail() {
  return (
    <Shell from="#78bdff" id="ml" to="#1c63cf">
      <g filter="url(#ml-sh)">
        <rect fill="#fff" height="54" rx="7" width="80" x="20" y="34" />
        <path d="M22 40 L60 70 L98 40" fill="none" stroke="#9db4cf" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <path d="M22 86 L48 60 M98 86 L72 60" fill="none" stroke="#c4d2e3" strokeLinecap="round" strokeWidth="3" />
      </g>
    </Shell>
  );
}

function Safari() {
  const ticks = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Shell from="#8fd0ff" id="sf" to="#2a6fd6">
      <defs>
        <radialGradient id="sf-face" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#bfd6ee" />
        </radialGradient>
        <linearGradient id="sf-ring" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f4f7fb" />
          <stop offset="1" stopColor="#7d8ea6" />
        </linearGradient>
      </defs>
      <g filter="url(#sf-sh)">
        <circle cx="60" cy="60" fill="url(#sf-ring)" r="45" />
        <circle cx="60" cy="60" fill="url(#sf-face)" r="38" />
        {ticks.map((i) => (
          <line key={i} stroke="#6b7f99" strokeWidth={i % 6 === 0 ? 2.4 : 1.2} transform={`rotate(${i * 15} 60 60)`} x1="60" x2="60" y1="24" y2={i % 6 === 0 ? 31 : 28} />
        ))}
        <g transform="rotate(45 60 60)">
          <path d="M60 28 L68 60 L52 60 Z" fill="#e53b2f" />
          <path d="M60 92 L68 60 L52 60 Z" fill="#fafafa" stroke="#9aa6b5" strokeWidth=".8" />
        </g>
        <circle cx="60" cy="60" fill="#fff" r="3.4" stroke="#7d8ea6" strokeWidth="1" />
      </g>
    </Shell>
  );
}

function Photos() {
  const petals = ["#f8d21c", "#f59b1f", "#e9452d", "#c23a8e", "#7048c7", "#3b8ee0", "#35c08a", "#98d23a"];

  return (
    <Shell from="#ffffff" id="ph2" to="#dfe3e8">
      <g style={{ mixBlendMode: "multiply" }}>
        {petals.map((c, i) => (
          <ellipse key={c} cx="60" cy="38" fill={c} opacity=".88" rx="12.5" ry="24" transform={`rotate(${i * 45} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" fill="#fff" opacity=".85" r="9" />
    </Shell>
  );
}

function Camera() {
  return (
    <Shell from="#c7ccd4" id="cm" to="#5b616b">
      <g filter="url(#cm-sh)">
        <path d="M40 32 H80 L84 40 H98 Q104 40 104 46 V86 Q104 92 98 92 H22 Q16 92 16 86 V46 Q16 40 22 40 H36 Z" fill="#23262b" />
        <rect fill="#3a3e45" height="8" rx="3" width="14" x="22" y="46" />
        <circle cx="60" cy="64" fill="#8e949d" r="22" />
        <circle cx="60" cy="64" fill="#15171a" r="17" />
        <radialGradient id="cm-lens" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#6f8cc0" />
          <stop offset=".5" stopColor="#1d2a47" />
          <stop offset="1" stopColor="#0a0d14" />
        </radialGradient>
        <circle cx="60" cy="64" fill="url(#cm-lens)" r="13" />
        <ellipse cx="54" cy="58" fill="#fff" opacity=".7" rx="4" ry="2.4" />
      </g>
    </Shell>
  );
}

function Calendar() {
  const d = new Date();

  return (
    <Shell from="#ffffff" id="cal" to="#e9ebee">
      <path d="M0 26 Q0 0 26 0 H94 Q120 0 120 26 V34 H0 Z" fill="#d6322a" />
      <rect fill="#b22119" height="2" width="120" y="34" />
      <text fill="#fff" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontSize="15" fontWeight="700" textAnchor="middle" x="60" y="25">
        {DAYS[d.getDay()]}
      </text>
      <text fill="#2a2d33" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontSize="68" fontWeight="300" textAnchor="middle" x="60" y="102">
        {d.getDate()}
      </text>
    </Shell>
  );
}

function Clock() {
  const d = new Date();
  const h = ((d.getHours() % 12) + d.getMinutes() / 60) * 30;
  const m = d.getMinutes() * 6;

  return (
    <Shell from="#3a3d42" id="ck" to="#0c0d0f">
      <g filter="url(#ck-sh)">
        <circle cx="60" cy="62" fill="#fff" r="46" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} stroke="#23262b" strokeLinecap="round" strokeWidth={i % 3 === 0 ? 3.2 : 1.6} transform={`rotate(${i * 30} 60 62)`} x1="60" x2="60" y1="21" y2={i % 3 === 0 ? 30 : 27} />
        ))}
        <line stroke="#23262b" strokeLinecap="round" strokeWidth="5" transform={`rotate(${h} 60 62)`} x1="60" x2="60" y1="62" y2="38" />
        <line stroke="#23262b" strokeLinecap="round" strokeWidth="3.4" transform={`rotate(${m} 60 62)`} x1="60" x2="60" y1="62" y2="28" />
        <line stroke="#e53b2f" strokeLinecap="round" strokeWidth="1.6" transform="rotate(130 60 62)" x1="60" x2="60" y1="72" y2="26" />
        <circle cx="60" cy="62" fill="#e53b2f" r="3" />
      </g>
    </Shell>
  );
}

function Maps() {
  return (
    <Shell from="#efe9d6" id="mp" to="#d8d0b4">
      <rect fill="#a8d58a" height="40" rx="6" width="46" x="8" y="64" />
      <rect fill="#8cc4ee" height="32" rx="6" width="40" x="72" y="10" />
      <path d="M-4 88 L124 36" fill="none" stroke="#fff" strokeWidth="14" />
      <path d="M-4 88 L124 36" fill="none" stroke="#f1c84b" strokeDasharray="8 6" strokeWidth="2" />
      <path d="M30 -4 L56 124" fill="none" stroke="#fff" strokeWidth="9" />
      <g filter="url(#mp-sh)">
        <path d="M78 34 C66 34 60 43 60 52 C60 66 78 84 78 84 C78 84 96 66 96 52 C96 43 90 34 78 34 Z" fill="#e53b2f" />
        <circle cx="78" cy="52" fill="#fff" r="7" />
      </g>
      <g filter="url(#mp-sh)">
        <path d="M14 22 H38 L34 40 H18 Z" fill="#2f6bc9" />
        <text fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="12" fontWeight="700" textAnchor="middle" x="26" y="35">280</text>
      </g>
    </Shell>
  );
}

function Weather() {
  return (
    <Shell from="#5eb4ff" id="wx" to="#1a5fc4">
      <radialGradient id="wx-sun" cx=".4" cy=".35" r=".8">
        <stop offset="0" stopColor="#fff6a8" />
        <stop offset="1" stopColor="#f7b324" />
      </radialGradient>
      <circle cx="40" cy="38" fill="url(#wx-sun)" r="19" />
      <g filter="url(#wx-sh)" fill="#fff">
        <ellipse cx="74" cy="52" rx="22" ry="14" />
        <ellipse cx="56" cy="56" rx="18" ry="12" />
        <ellipse cx="90" cy="58" rx="14" ry="9" />
      </g>
      <text fill="#fff" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontSize="34" fontWeight="300" textAnchor="middle" x="60" y="100">72°</text>
    </Shell>
  );
}

function Notes() {
  return (
    <Shell from="#fff9c4" id="nt" to="#f4e68a">
      <rect fill="#f2c43a" height="30" width="120" />
      <rect fill="#c99a1c" height="2" width="120" y="30" />
      {[44, 58, 72, 86, 100].map((y) => (
        <line key={y} stroke="#9bb7d8" strokeWidth="1.4" x1="0" x2="120" y1={y} y2={y} />
      ))}
      <line stroke="#e07a73" strokeWidth="1.6" x1="22" x2="22" y1="31" y2="120" />
    </Shell>
  );
}

function Settings() {
  return (
    <Shell from="#d3d8df" id="st" to="#6a717d">
      <g filter="url(#st-sh)">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} fill="#3e444d" height="18" rx="3" transform={`rotate(${i * 45} 60 60)`} width="14" x="53" y="16" />
        ))}
        <circle cx="60" cy="60" fill="#3e444d" r="33" />
        <circle cx="60" cy="60" fill="#c3c8d0" r="14" />
        <circle cx="60" cy="60" fill="#8a919c" r="10" />
      </g>
    </Shell>
  );
}

function AppStore() {
  return (
    <Shell from="#7fc2ff" id="as" to="#1e63d1">
      <g fill="none" filter="url(#as-sh)" stroke="#fff" strokeLinecap="round" strokeWidth="9">
        <path d="M48 90 L72 30" />
        <path d="M44 56 L76 80" />
        <path d="M34 78 H52" />
        <path d="M70 76 H88" />
      </g>
    </Shell>
  );
}

function Music() {
  return (
    <Shell from="#ffc36b" id="mu" to="#e66f00">
      <g fill="#fff" filter="url(#mu-sh)">
        <ellipse cx="44" cy="86" rx="14" ry="10" transform="rotate(-20 44 86)" />
        <ellipse cx="82" cy="78" rx="14" ry="10" transform="rotate(-20 82 78)" />
        <rect height="52" width="6" x="52" y="34" />
        <rect height="52" width="6" x="90" y="26" />
        <path d="M52 34 L96 24 V38 L52 48 Z" />
      </g>
    </Shell>
  );
}

function GameCenter() {
  const bubbles: Array<[number, number, number, string, string]> = [
    [40, 42, 22, "#8fc5ff", "#1d5fc9"],
    [80, 40, 17, "#a5f08f", "#2a9a2a"],
    [82, 82, 22, "#ffb17a", "#d8461a"],
    [38, 84, 16, "#f2a0e8", "#9a2bb2"],
  ];

  return (
    <Shell from="#8d9a86" id="gc" to="#2f3a2c">
      {bubbles.map(([x, y, r, a, b], i) => (
        <g key={i}>
          <radialGradient id={`gc-b${i}`} cx=".35" cy=".3" r=".85">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </radialGradient>
          <circle cx={x} cy={y} fill={`url(#gc-b${i})`} r={r} stroke="#fff" strokeOpacity=".5" />
          <ellipse cx={x - r * 0.3} cy={y - r * 0.45} fill="#fff" opacity=".65" rx={r * 0.5} ry={r * 0.26} />
        </g>
      ))}
    </Shell>
  );
}

function Passbook() {
  return (
    <Shell from="#53575e" id="pb" to="#17191c">
      <g filter="url(#pb-sh)">
        <rect fill="#f08a2a" height="30" rx="5" transform="rotate(-6 60 40)" width="76" x="22" y="26" />
        <rect fill="#3fae4a" height="30" rx="5" transform="rotate(3 60 56)" width="76" x="22" y="42" />
        <rect fill="#3b82d9" height="34" rx="5" transform="rotate(-2 60 78)" width="76" x="22" y="62" />
        <rect fill="#fff" height="5" opacity=".7" rx="2" width="28" x="30" y="72" />
      </g>
    </Shell>
  );
}

function Videos() {
  return (
    <Shell from="#6b6f77" id="vd" to="#16181b">
      <g filter="url(#vd-sh)">
        <rect fill="#2c2f34" height="44" rx="5" width="76" x="22" y="54" />
        <g transform="rotate(-12 22 54)">
          <rect fill="#f4f4f4" height="16" rx="3" width="76" x="22" y="38" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${30 + i * 15} 38 h8 l-7 16 h-8 z`} fill="#26292e" />
          ))}
        </g>
        <path d="M56 66 L74 76 L56 86 Z" fill="#fff" />
      </g>
    </Shell>
  );
}

function Calculator() {
  const keys = [0, 1, 2, 3].flatMap((c) => [0, 1, 2].map((r) => ({ c, r })));

  return (
    <Shell from="#6e737c" id="ca" to="#1d2024">
      <rect fill="#c1cbb4" height="22" rx="3" width="84" x="18" y="16" />
      <text fill="#2a3326" fontFamily="Helvetica, Arial, sans-serif" fontSize="17" textAnchor="end" x="98" y="34">0</text>
      {keys.map(({ c, r }) => (
        <rect key={`${c}${r}`} fill={c === 3 ? "#f4a12a" : "#a7adb6"} height="16" rx="3" stroke="#000" strokeOpacity=".4" width="18" x={18 + c * 22} y={46 + r * 22} />
      ))}
    </Shell>
  );
}

function Compass() {
  return (
    <Shell from="#43474e" id="cp" to="#0f1114">
      <g filter="url(#cp-sh)">
        <circle cx="60" cy="60" fill="#e8ecef" r="44" />
        <circle cx="60" cy="60" fill="#15181c" r="38" />
        <text fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="13" fontWeight="700" textAnchor="middle" x="60" y="34">N</text>
        <g transform="rotate(30 60 60)">
          <path d="M60 30 L68 60 L52 60 Z" fill="#e53b2f" />
          <path d="M60 90 L68 60 L52 60 Z" fill="#e8ecef" />
        </g>
        <circle cx="60" cy="60" fill="#fff" r="3" />
      </g>
    </Shell>
  );
}

function Stocks() {
  return (
    <Shell from="#3a3d42" id="sk" to="#0b0c0e">
      {[34, 54, 74, 94].map((y) => (
        <line key={y} stroke="#fff" strokeOpacity=".14" x1="12" x2="108" y1={y} y2={y} />
      ))}
      <polyline fill="none" filter="url(#sk-sh)" points="14,88 34,70 50,78 70,48 88,56 106,28" stroke="#4cd964" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
    </Shell>
  );
}

function Reminders() {
  return (
    <Shell from="#ffffff" id="rm" to="#e6e8ec">
      <rect fill="#e9ecf0" height="14" width="120" />
      {[34, 56, 78, 100].map((y, i) => (
        <g key={y}>
          <circle cx="24" cy={y} fill="none" r="6.5" stroke={i === 0 ? "#3fae4a" : "#8a93a0"} strokeWidth="2" />
          {i === 0 && <path d="M20.5 34 l3 3 5-7" fill="none" stroke="#3fae4a" strokeLinecap="round" strokeWidth="2.6" />}
          <line stroke="#b9c2cf" strokeWidth="1.6" x1="38" x2="106" y1={y + 6} y2={y + 6} />
        </g>
      ))}
    </Shell>
  );
}

function FaceTime() {
  return (
    <Shell from="#86e476" id="ft" to="#27a024">
      <g fill="#fff" filter="url(#ft-sh)">
        <rect height="42" rx="9" width="58" x="16" y="39" />
        <path d="M78 52 L104 36 V84 L78 68 Z" />
      </g>
    </Shell>
  );
}

function Contacts() {
  return (
    <Shell from="#c9a778" id="ct" to="#7a5a34">
      <rect fill="#f4ecd8" height="84" rx="6" width="70" x="26" y="18" />
      <g fill="#8b93a1" filter="url(#ct-sh)">
        <circle cx="61" cy="52" r="14" />
        <path d="M34 98 C34 76 88 76 88 98 Z" />
      </g>
    </Shell>
  );
}

/** The shop's own app icon. */
function Mobicare() {
  return (
    <Shell from="#74dc66" id="mb" to="#1f8f2e">
      <g filter="url(#mb-sh)">
        <rect fill="#f4f6f8" height="76" rx="10" width="46" x="29" y="22" />
        <rect fill="#1c3f7a" height="52" rx="3" width="38" x="33" y="30" />
        <rect fill="#4a86e0" height="26" opacity=".55" width="38" x="33" y="30" />
        <circle cx="61" cy="90" fill="#cfd5dc" r="4" />
        <path d="M45 40 L60 54 L52 66" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".8" strokeWidth="1.6" />
      </g>
      <g filter="url(#mb-sh)" transform="translate(54 50) scale(2.7)">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="#ffb02e" stroke="#7a4a00" strokeLinejoin="round" strokeWidth=".6" />
      </g>
    </Shell>
  );
}

const ICONS: Record<RealIconName, () => ReactNode> = {
  messages: Messages, phone: Phone, mail: Mail, safari: Safari, photos: Photos, camera: Camera,
  calendar: Calendar, clock: Clock, maps: Maps, weather: Weather, notes: Notes, settings: Settings,
  appstore: AppStore, music: Music, gamecenter: GameCenter, passbook: Passbook, videos: Videos,
  calculator: Calculator, compass: Compass, stocks: Stocks, reminders: Reminders, facetime: FaceTime,
  contacts: Contacts, mobicare: Mobicare,
};

interface RealIconProps {
  name: RealIconName;
  /** px number, or any CSS length (e.g. container-query units). */
  size?: number | string;
  className?: string;
  /** Red notification badge, like an unread count on the Springboard. */
  badge?: number | string;
  /** Skip SVG drop-shadow filters — for icons that stay on screen while the page scrolls. */
  plain?: boolean;
}

export default function RealIcon({ name, size = 60, className = "", badge, plain }: RealIconProps) {
  const Art = ICONS[name];

  return (
    <span
      className={`relative inline-block shrink-0 ${plain ? "real-icon--plain" : ""} ${className}`}
      style={{ width: size, height: size, aspectRatio: "1", borderRadius: "22.5%", boxShadow: "0 2px 4px rgba(0,0,0,.45)" }}
    >
      <Art />
      {badge !== undefined && badge !== 0 && (
        <span className="ios-badge absolute -right-2 -top-2 z-10" style={{ animation: "ios-pop 0.4s var(--ios-ease) both" }}>
          {badge}
        </span>
      )}
    </span>
  );
}
