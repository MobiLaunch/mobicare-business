import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useSiteStore } from "@/lib/siteStore";

interface PageMetaProps {
  title?: string;
  description?: string;
}

interface FbqFn {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: FbqFn;
  loaded?: boolean;
  version?: string;
}

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: FbqFn;
  _fbq?: FbqFn;
  __mcGaId?: string;
  __mcPixelId?: string;
}

function createFbqStub(win: AnalyticsWindow): FbqFn {
  const stub: FbqFn = (...args: unknown[]) => {
    if (stub.callMethod) {
      stub.callMethod(...args);
    } else if (stub.queue) {
      stub.queue.push(args);
    }
  };

  stub.push = stub;
  stub.loaded = true;
  stub.version = "2.0";
  stub.queue = [];
  win.fbq = stub;
  if (!win._fbq) win._fbq = stub;

  return stub;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

const GA_ID_RE = /^(G-[A-Z0-9]+|UA-\d+-\d+)$/i;
const PIXEL_ID_RE = /^\d{8,20}$/;

/** Sets the tab title, SEO/OpenGraph tags, and optional GA4 / Facebook Pixel tracking configured in Site Editor. */
export default function PageMeta({
  title: defaultTitle,
  description: defaultDescription,
}: PageMetaProps) {
  const { pathname, search } = useLocation();
  const override = useSiteStore((s) => s.meta)?.[pathname];
  const seo = useSiteStore((s) => s.seo);

  const rawTitle =
    override?.title?.trim() ||
    defaultTitle?.trim() ||
    seo?.siteTitle?.trim() ||
    "Mobicare Device Recovery";
  const suffix = seo?.titleSuffix?.trim() || "";
  const resolvedTitle =
    pathname === "/" && !override?.title?.trim() && seo?.siteTitle?.trim()
      ? seo.siteTitle.trim()
      : suffix &&
          !rawTitle.toLowerCase().includes("mobicare") &&
          !rawTitle.includes(suffix)
        ? `${rawTitle} ${suffix}`
        : rawTitle;

  const resolvedDescription =
    override?.description?.trim() ||
    defaultDescription?.trim() ||
    seo?.metaDescription?.trim() ||
    "";
  const keywords = seo?.keywords?.trim() || "";
  const ogImage = seo?.ogImage?.trim() || "";
  const gaId = seo?.googleAnalyticsId?.trim() || "";
  const pixelId = seo?.facebookPixelId?.trim() || "";

  useEffect(() => {
    if (resolvedTitle) {
      document.title = resolvedTitle;
      upsertMeta("property", "og:title", resolvedTitle);
    }
    if (resolvedDescription) {
      upsertMeta("name", "description", resolvedDescription);
      upsertMeta("property", "og:description", resolvedDescription);
    }
    if (keywords) {
      upsertMeta("name", "keywords", keywords);
    }
    if (ogImage) {
      upsertMeta("property", "og:image", ogImage);
      upsertMeta("name", "twitter:card", "summary_large_image");
    }
  }, [resolvedTitle, resolvedDescription, keywords, ogImage]);

  // Google Analytics (GA4 / UA)
  useEffect(() => {
    if (!gaId || !GA_ID_RE.test(gaId)) return;
    const win = window as AnalyticsWindow;

    if (win.__mcGaId !== gaId) {
      win.__mcGaId = gaId;
      win.dataLayer = win.dataLayer || [];
      win.gtag = (...args: unknown[]) => {
        win.dataLayer?.push(args);
      };
      win.gtag("js", new Date());
      win.gtag("config", gaId, { send_page_view: false });

      if (!document.querySelector(`script[data-mc-ga="${gaId}"]`)) {
        const script = document.createElement("script");

        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        script.dataset.mcGa = gaId;
        document.head.appendChild(script);
      }
    }

    win.gtag?.("event", "page_view", {
      page_path: `${pathname}${search}`,
      page_title: document.title,
    });
  }, [gaId, pathname, search]);

  // Meta / Facebook Pixel
  useEffect(() => {
    if (!pixelId || !PIXEL_ID_RE.test(pixelId)) return;
    const win = window as AnalyticsWindow;
    const fbq = win.fbq ?? createFbqStub(win);

    if (win.__mcPixelId !== pixelId) {
      win.__mcPixelId = pixelId;
      if (!document.querySelector('script[data-mc-fbpixel="true"]')) {
        const script = document.createElement("script");

        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        script.dataset.mcFbpixel = "true";
        document.head.appendChild(script);
      }
      fbq("init", pixelId);
    }

    fbq("track", "PageView");
  }, [pixelId, pathname, search]);

  return null;
}
