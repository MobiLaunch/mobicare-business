import { BatteryFull, Camera, Droplets, HardDrive, PlugZap, Smartphone, Wrench, type LucideIcon } from "lucide-react";

import { useSiteStore } from "@/lib/siteStore";
import AppIcon, { type IconColor } from "@/components/ios/AppIcon";
import Reveal from "@/components/ios/Reveal";

// Service icons are stored as admin-editable Material-style names.
const ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  battery_full: BatteryFull,
  water_drop: Droplets,
  ev_station: PlugZap,
  photo_camera: Camera,
  storage: HardDrive,
};
const COLORS: IconColor[] = ["red", "green", "teal", "orange", "purple", "pink", "blue", "yellow"];

interface ServiceGridProps {
  onSelect: (serviceId: string) => void;
}

/**
 * "Springboard" of repairs. Each icon opens the booking wizard already on
 * that service, which collapses the usual see-services → click-book → pick
 * service funnel into a single tap.
 */
export default function ServiceGrid({ onSelect }: ServiceGridProps) {
  const services = useSiteStore((s) => s.repairServices);

  if (!services.length) return null;

  return (
    <section className="py-6" id="services-section">
      <Reveal className="mb-5 px-1">
        <p className="type-eyebrow m-0">What can we fix?</p>
        <h2 className="ios-section-title">Tap what&rsquo;s broken</h2>
        <div className="ios-rainbow mt-2 w-24" />
      </Reveal>

      <div className="ios-card-gloss surface-raised rounded-panel p-[clamp(14px,3vw,28px)]">
        <ul className="m-0 grid list-none grid-cols-3 gap-x-2 gap-y-6 p-0 sm:grid-cols-4 lg:grid-cols-6">
          {services.map((s, i) => (
            <li key={s.id}>
              <Reveal delay={i * 60}>
                <button
                  aria-label={`Book ${s.name}, ${s.priceRange}`}
                  className="ios-icon-tile w-full"
                  type="button"
                  onClick={() => onSelect(s.id)}
                >
                  <AppIcon color={COLORS[i % COLORS.length]} icon={ICONS[s.icon] ?? Wrench} size={68} />
                  <span className="ios-icon-label leading-tight">{s.name}</span>
                  <span className="ios-pill !px-2 !py-0.5 !text-[10px] !normal-case">{s.priceRange}</span>
                </button>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
