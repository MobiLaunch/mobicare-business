import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Map as MapIcon,
  Navigation,
  Phone,
  Star,
  Store,
} from "lucide-react";
import { Chip, Link, buttonVariants } from "@heroui/react";

import { BUSINESS, GOOGLE_MAPS_API_KEY } from "@/lib/config";

const NEARBY_TOWNS = [
  { name: "Albion", time: "15 min drive" },
  { name: "Wayne City", time: "18 min drive" },
  { name: "Mt. Vernon", time: "35 min drive" },
];

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Mobicare+Fairfield+IL";
const BUSINESS_ADDRESS = "920 Commerce Drive, Suite 3, Fairfield, IL 62837";

export default function LocationCard() {
  const [selectedTown, setSelectedTown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);

  const handleCopyAddress = () => {
    navigator.clipboard
      .writeText(BUSINESS_ADDRESS)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard API can be denied (permissions/insecure context) —
        // leave the button state unchanged instead of throwing unhandled.
        console.warn("Clipboard write was rejected by the browser.");
      });
  };

  // Load the Google Maps JavaScript API and render a real Fairfield, IL map.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) {
      if (!GOOGLE_MAPS_API_KEY) setMapError(true);

      return;
    }

    let cancelled = false;

    const initializeMap = () => {
      if (cancelled || !window.google?.maps || !mapRef.current) return;

      const fairfield = { lat: 38.378937, lng: -88.359768 };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: fairfield,
        zoom: 15,
        mapTypeId: "roadmap",
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        gestureHandling: "cooperative",
        clickableIcons: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#edf0eb" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#68736b" }] },
          {
            elementType: "labels.text.stroke",
            stylers: [{ color: "#edf0eb" }],
          },
          {
            featureType: "administrative",
            elementType: "geometry.stroke",
            stylers: [{ color: "#c8d0c7" }],
          },
          {
            featureType: "landscape.man_made",
            elementType: "geometry",
            stylers: [{ color: "#e7ebe5" }],
          },
          {
            featureType: "poi",
            elementType: "geometry",
            stylers: [{ color: "#dbe7d7" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry.fill",
            stylers: [{ color: "#cfe0ca" }],
          },
          {
            featureType: "poi.business",
            stylers: [{ visibility: "simplified" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#d6dbd4" }],
          },
          {
            featureType: "road.arterial",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#f5dca0" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#e6c979" }],
          },
          {
            featureType: "road.local",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }],
          },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
          {
            featureType: "water",
            elementType: "geometry.fill",
            stylers: [{ color: "#c9dce2" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#78919a" }],
          },
        ],
      });

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64">
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".28"/>
          </filter>
          <path filter="url(#shadow)" d="M26 2C12.7 2 2 12.7 2 26c0 17.5 24 36 24 36s24-18.5 24-36C50 12.7 39.3 2 26 2z" fill="#13522B"/>
          <circle cx="26" cy="26" r="9" fill="#fff"/>
          <circle cx="26" cy="26" r="4" fill="#13522B"/>
        </svg>
      `;

      mapMarkerRef.current = new window.google.maps.Marker({
        position: fairfield,
        map: mapInstanceRef.current,
        title: "Mobicare Device Recovery — Fairfield, IL",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`,
          scaledSize: new window.google.maps.Size(52, 64),
          anchor: new window.google.maps.Point(26, 62),
        },
        zIndex: 10,
      });

      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode(
        { address: BUSINESS_ADDRESS },
        (results: any, status: string) => {
          if (cancelled) return;
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const location = results[0].geometry.location;

            mapInstanceRef.current.setCenter(location);
            mapInstanceRef.current.setZoom(16);
            if (mapMarkerRef.current)
              mapMarkerRef.current.setPosition(location);
          } else {
            console.warn(
              "Could not geocode Mobicare business address:",
              status,
            );
          }
        },
      );

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding:4px 8px 6px;font-family:Arial,sans-serif;color:#26312b">
            <strong style="font-size:13px">Mobicare Device Recovery</strong>
            <div style="font-size:11px;margin-top:3px;color:#68736b">Fairfield, IL 62837</div>
          </div>
        `,
      });

      mapMarkerRef.current.addListener("click", () => {
        infoWindow.open({
          anchor: mapMarkerRef.current,
          map: mapInstanceRef.current,
        });
      });
    };

    if (window.google?.maps) {
      initializeMap();

      return () => {
        cancelled = true;
        if (mapMarkerRef.current) mapMarkerRef.current.setMap(null);
      };
    }

    const existingScript = document.querySelector(
      'script[data-google-maps-api="true"]',
    );

    if (existingScript) {
      // If the script already finished loading in a previous mount, its
      // "load" event will never fire again — initialize immediately.
      if (window.google?.maps) {
        initializeMap();
      } else {
        existingScript.addEventListener("load", initializeMap, { once: true });
        existingScript.addEventListener("error", () => setMapError(true), {
          once: true,
        });
      }
    } else {
      const script = document.createElement("script");

      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsApi = "true";
      script.onload = initializeMap;
      script.onerror = () => setMapError(true);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (mapMarkerRef.current) mapMarkerRef.current.setMap(null);
    };
  }, []);

  return (
    <div
      className="w-full overflow-hidden rounded-[28px] bg-surface"
      id="location-card"
    >
      {/* Map frame */}
      <div className="relative h-[210px] overflow-hidden bg-surface-secondary">
        <div
          ref={mapRef}
          aria-label="Interactive map showing Fairfield, Illinois"
          className="absolute inset-0"
        />

        {(!GOOGLE_MAPS_API_KEY || mapError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-secondary to-surface-tertiary p-6 text-center text-foreground">
            <div>
              <MapIcon className="mx-auto mb-2 size-8" />
              <strong className="block text-[13px]">Fairfield, Illinois</strong>
              <span className="mt-1 block text-[11px] opacity-75">
                Google Maps is unavailable right now.
              </span>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 z-[3]">
          <div className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-accent-foreground shadow-lg">
            <Store className="size-4" />
            Mobicare
          </div>
        </div>

        <div className="absolute right-3 top-3 z-[4]">
          <Link
            className={`${buttonVariants({ variant: "secondary", size: "sm" })} gap-1.5 rounded-full bg-white/92 text-[11px] text-foreground shadow-md backdrop-blur-md`}
            href={GOOGLE_MAPS_URL}
            target="_blank"
          >
            <ExternalLink className="size-3.5" />
            Large Map
          </Link>
        </div>

        <div className="absolute bottom-3 left-3 z-[4]">
          <Chip className="bg-white/92 text-[11px] font-bold text-accent shadow-md backdrop-blur-md">
            <Chip.Label>● Open Today · Fairfield, IL</Chip.Label>
          </Chip>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 pb-6">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="m-0 text-lg font-bold leading-tight">
              Visit Mobicare Device Recovery
            </h3>
            <span className="mt-0.5 block text-[13px] text-muted">
              Fairfield, IL 62837
            </span>
          </div>

          <div className="shrink-0 rounded-xl border border-border bg-surface-secondary px-2.5 py-1 text-right">
            <span className="flex items-center justify-end gap-1 text-[13px] font-extrabold text-warning">
              <Star className="size-3.5 fill-current" /> 5.0
            </span>
            <span className="text-[10px] font-semibold text-muted">
              Locally Owned
            </span>
          </div>
        </div>

        <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted">
          Estimated Drive Time:
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          {NEARBY_TOWNS.map((town) => {
            const isActive = selectedTown === town.name;

            return (
              <button
                key={town.name}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-accent font-bold text-accent-foreground"
                    : "border border-border bg-surface-secondary text-foreground"
                }`}
                type="button"
                onClick={() => setSelectedTown(isActive ? null : town.name)}
              >
                {town.name} ({town.time})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            className={`${buttonVariants({ variant: "primary", size: "lg", fullWidth: true })} gap-2`}
            href={GOOGLE_MAPS_URL}
            target="_blank"
          >
            <Navigation className="size-5" />
            <span>Get Directions</span>
          </Link>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              className={`${buttonVariants({ variant: "outline" })} gap-1.5 text-[13px]`}
              href={`tel:${BUSINESS.phone.replace(/[^0-9+]/g, "")}`}
            >
              <Phone className="size-[18px]" />
              <span>Call Shop</span>
            </Link>

            <button
              className={`${buttonVariants({ variant: "outline" })} gap-1.5 text-[13px]`}
              type="button"
              onClick={handleCopyAddress}
            >
              {copied ? (
                <Check className="size-[18px]" />
              ) : (
                <Copy className="size-[18px]" />
              )}
              <span>{copied ? "Copied!" : "Copy Address"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
