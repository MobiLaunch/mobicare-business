import { MapPin, Navigation } from "lucide-react";

interface BookingLocationCardProps {
  onDirections: () => void;
}

export default function BookingLocationCard({ onDirections }: BookingLocationCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-secondary p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <MapPin aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <strong className="block text-sm text-foreground">Mobicare · Fairfield</strong>
          <span className="block truncate text-xs text-muted">920 Commerce Drive, Suite 3</span>
        </div>
      </div>
      <button
        className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        type="button"
        onClick={onDirections}
      >
        <Navigation aria-hidden="true" className="size-4" />
        Directions
      </button>
    </div>
  );
}
