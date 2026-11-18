import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useSiteStore } from "@/lib/siteStore";

interface PageMetaProps {
  title?: string;
  description?: string;
}

function setMetaTag(
  selector: string,
  attrName: "name" | "property",
  attrValue: string,
  content: string,
) {
  let el = document.querySelector(selector);
  if (!content) {
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function PageMeta({ title, description }: PageMetaProps) {
  const { pathname } = useLocation();
  const seo = useSiteStore((s) => s.seo);
  const meta = useSiteStore((s) => s.meta);

  useEffect(() => {
    const pageOverride = meta?.[pathname];
    const baseSiteTitle = seo?.siteTitle?.trim() || "Mobicare Device Recovery";
    const suffix = seo?.titleSuffix?.trim() || "";

    let resolvedTitle =
      pageOverride?.title?.trim() ||
      (pathname === "/" ? seo?.siteTitle?.trim() || title : title) ||
      baseSiteTitle;

    if (
      suffix &&
      pathname !== "/" &&
      !pageOverride?.title?.trim() &&
      !resolvedTitle.toLowerCase().includes("mobicare")
    ) {
      resolvedTitle = `${resolvedTitle} ${suffix}`.trim();
    }

    const resolvedDesc =
      pageOverride?.description?.trim() ||
      description?.trim() ||
      seo?.metaDescription?.trim() ||
      "";

    document.title = resolvedTitle;
    setMetaTag('meta[property="og:title"]', "property", "og:title", resolvedTitle);

    if (resolvedDesc) {
      setMetaTag('meta[name="description"]', "name", "description", resolvedDesc);
      setMetaTag(
        'meta[property="og:description"]',
        "property",
        "og:description",
        resolvedDesc,
      );
    }

    if (seo?.keywords?.trim()) {
      setMetaTag('meta[name="keywords"]', "name", "keywords", seo.keywords.trim());
    }

    if (seo?.ogImage?.trim()) {
      setMetaTag(
        'meta[property="og:image"]',
        "property",
        "og:image",
        seo.ogImage.trim(),
      );
    }
  }, [title, description, pathname, seo, meta]);

  // Google Analytics 4 injection (once per measurement ID)
  useEffect(() => {
    const gaId = seo?.googleAnalyticsId?.trim() || "";
    if (!/^(G|UA|AW|GT)-[A-Za-z0-9-]+$/.test(gaId)) return;

    const scriptId = `ga-gtag-${gaId}`;
    if (document.getElementById(scriptId)) return;

    const ext = document.createElement("script");
    ext.id = scriptId;
    ext.async = true;
    ext.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(ext);

    const w = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    w.dataLayer = w.dataLayer || [];
    w.gtag =
      w.gtag ||
      function gtag(...args: unknown[]) {
        w.dataLayer!.push(args);
      };
    w.gtag("js", new Date());
    w.gtag("config", gaId);
  }, [seo?.googleAnalyticsId]);

  // Meta / Facebook Pixel injection (once per numeric pixel ID)
  useEffect(() => {
    const pixelId = seo?.facebookPixelId?.trim() || "";
    if (!/^\d{8,20}$/.test(pixelId)) return;

    const scriptId = `fb-pixel-${pixelId}`;
    if (document.getElementById(scriptId)) return;

    const w = window as unknown as {
      fbq?: ((...args: unknown[]) => void) & {
        callMethod?: (...args: unknown[]) => void;
        queue?: unknown[];
        loaded?: boolean;
        version?: string;
        push?: (...args: unknown[]) => void;
      };
      _fbq?: unknown;
    };

    if (!w.fbq) {
      const n: NonNullable<typeof w.fbq> = function (...args: unknown[]) {
        if (n.callMethod) n.callMethod(...args);
        else n.queue!.push(args);
      };
      if (!w._fbq) w._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      w.fbq = n;

      const s = document.createElement("script");
      s.id = scriptId;
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    }

    w.fbq("init", pixelId);
    w.fbq("track", "PageView");
  }, [seo?.facebookPixelId]);

  return null;
}
