/**
 * The site's design tokens that the admin can change without code: corner radius, texture, motion and
 * loader style. Everything maps to CSS variables or data attributes on <html>, so the same tokens drive
 * the Arc components, the buttons and the page chrome. An empty value means "use the built-in look".
 */
export interface DesignTokens {
  radiusControl?: string;
  radiusSurface?: string;
  texture?: string;
  motion?: string;
  spinner?: string;
}

/** Buttons, inputs and other small controls. */
export const CONTROL_RADII: Record<string, string> = { sharp: "0px", small: "6px", medium: "12px", large: "18px", round: "24px", pill: "9999px" };
/** Cards and panels: [surface, panel]. */
export const SURFACE_RADII: Record<string, [string, string]> = { sharp: ["0px", "0px"], small: ["10px", "8px"], medium: ["18px", "14px"], large: ["28px", "22px"], round: ["40px", "30px"] };
export const TEXTURES = ["none", "grain", "dots", "grid", "lines", "paper"] as const;
export const MOTIONS = ["full", "subtle", "none"] as const;
export const SPINNERS = ["ring", "dots", "pulse", "bars"] as const;

const DURATIONS: Array<[string, number]> = [["--duration-instant", 120], ["--duration-fast", 160], ["--duration-standard", 240], ["--duration-considered", 480], ["--duration-spring", 580]];

export function applyDesign(a: DesignTokens) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const s = root.style;
  const control = a.radiusControl && CONTROL_RADII[a.radiusControl];
  const surface = a.radiusSurface && SURFACE_RADII[a.radiusSurface];

  if (control) { s.setProperty("--radius-control", control); s.setProperty("--mc-btn-radius", control); } else { s.removeProperty("--radius-control"); s.removeProperty("--mc-btn-radius"); }
  if (surface) { s.setProperty("--radius-surface", surface[0]); s.setProperty("--radius-panel", surface[1]); } else { s.removeProperty("--radius-surface"); s.removeProperty("--radius-panel"); }

  const set = (name: string, v?: string, off = "") => { if (v && v !== off) root.setAttribute(name, v); else root.removeAttribute(name); };

  set("data-texture", a.texture, "none");
  set("data-motion", a.motion, "full");
  set("data-spinner", a.spinner, "ring");

  const scale = a.motion === "none" ? 0.001 : a.motion === "subtle" ? 0.5 : 1;

  for (const [name, ms] of DURATIONS) { if (scale === 1) s.removeProperty(name); else s.setProperty(name, `${Math.max(1, Math.round(ms * scale))}ms`); }
}
