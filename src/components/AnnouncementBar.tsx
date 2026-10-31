import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

import { useCopy } from "@/lib/copy";
import { useSiteStore } from "@/lib/siteStore";

/** A thin banner above the header for sales, holiday hours and notices. Visitors can dismiss it for the session. */
export default function AnnouncementBar() {
  const a = useSiteStore((s) => s.announcement);
  const c = useCopy();
  const key = `mc-announce:${a?.text ?? ""}`;
  const [closed, setClosed] = useState(() => { try { return sessionStorage.getItem(key) === "1"; } catch { return false; } });

  if (!a?.enabled || !a.text?.trim() || closed) return null;
  const internal = a.link?.startsWith("/");

  return (
    <div className={`mc-announce mc-announce--${a.tone || "brand"}`} role="region" aria-label="Announcement">
      <p {...c.p("announcement.text")}>{a.text}</p>
      {a.link && a.linkLabel && (internal ? <Link to={a.link}>{a.linkLabel}</Link> : <a href={a.link} rel="noopener noreferrer">{a.linkLabel}</a>)}
      <button aria-label="Dismiss announcement" type="button" onClick={() => { try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ } setClosed(true); }}><X aria-hidden="true" size={14} /></button>
    </div>
  );
}
