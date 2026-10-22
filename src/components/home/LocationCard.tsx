import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Phone } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { BUSINESS, GOOGLE_MAPS_API_KEY } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";

const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Mobicare+Fairfield+IL";
const ADDRESS = "920 Commerce Drive, Suite 3, Fairfield, IL 62837";
const FAIRFIELD = { lat: 38.378937, lng: -88.359768 };

/** Visit panel: map when a Google Maps key is configured, otherwise the address and hours alone. */
export default function LocationCard() {
  const business = useSiteStore((s) => s.business);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const phone = business?.phone || BUSINESS.phone;
  const hours = business?.hours?.length ? business.hours : BUSINESS.hours;

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) return;

    let cancelled = false;
    const init = () => {
      if (cancelled || !window.google?.maps || !mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: FAIRFIELD,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        clickableIcons: false,
      });

      new window.google.maps.Marker({ position: FAIRFIELD, map, title: "Mobicare Device Recovery" });
      setMapReady(true);
    };

    if (window.google?.maps) {
      init();

      return () => { cancelled = true; };
    }

    let script = document.querySelector<HTMLScriptElement>('script[data-google-maps-api="true"]');

    if (!script) {
      script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsApi = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", init, { once: true });

    return () => { cancelled = true; };
  }, []);

  return (
    <section aria-label="Visit the shop" className="mc-card mc-card--flush" id="location-card">
      {GOOGLE_MAPS_API_KEY && (
        <div ref={mapRef} aria-label="Map of the Mobicare shop in Fairfield, Illinois" style={{ height: "12rem", background: "var(--surface-muted)", opacity: mapReady ? 1 : 0.6 }} />
      )}
      <div className="mc-stack" style={{ padding: "var(--space-6)", gap: "var(--space-4)" }}>
        <div className="mc-stack-sm">
          <h2 className="mc-h3">Visit the shop</h2>
          <p className="mc-text" style={{ display: "flex", gap: "var(--space-2)", alignItems: "start" }}>
            <MapPin aria-hidden="true" size={18} strokeWidth={1.75} style={{ marginTop: 3, flexShrink: 0 }} />
            {ADDRESS}
          </p>
        </div>
        <div className="mc-footer-hours">
          {hours.map((h) => (
            <span key={h.days} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)" }}>
              <span>{h.days}</span>
              <span className="mc-strong">{h.hours}</span>
            </span>
          ))}
        </div>
        <div className="mc-actions">
          <a href={GOOGLE_MAPS_URL} rel="noopener noreferrer" style={{ textDecoration: "none" }} target="_blank">
            <Button tabIndex={-1} variant="primary"><Navigation aria-hidden="true" size={16} strokeWidth={1.75} />Directions</Button>
          </a>
          <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} style={{ textDecoration: "none" }}>
            <Button tabIndex={-1} variant="secondary"><Phone aria-hidden="true" size={16} strokeWidth={1.75} />Call</Button>
          </a>
          <CopyButton label="Copy address" value={ADDRESS} />
        </div>
      </div>
    </section>
  );
}
