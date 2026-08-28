import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { Button, Modal } from "@heroui/react";

const STORE_ADDRESS = "920 Commerce Drive, Suite 3, Fairfield, IL 62837";
const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Mobicare+Fairfield+IL";
const APPLE_MAPS_URL = `https://maps.apple.com/?address=${encodeURIComponent(STORE_ADDRESS)}`;

interface LocationDirectionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LocationDirectionsDialog({
  isOpen,
  onOpenChange,
}: LocationDirectionsDialogProps) {
  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="z-[120]"
      >
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div>
                <Modal.Heading>Get Directions</Modal.Heading>
                <p className="m-0 text-sm text-muted">Mobicare Device Recovery</p>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface-secondary">
                <iframe
                  title="Mobicare Fairfield map"
                  src="https://www.google.com/maps?q=Mobicare+Fairfield+IL&output=embed"
                  className="h-56 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="rounded-2xl bg-surface-secondary p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-accent" />
                  <div>
                    <strong className="block text-sm text-foreground">
                      920 Commerce Drive, Suite 3
                    </strong>
                    <span className="text-sm text-muted">
                      Fairfield, IL 62837
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  fullWidth
                  variant="primary"
                  onPress={() => window.open(GOOGLE_MAPS_URL, "_blank", "noopener,noreferrer")}
                >
                  <Navigation className="size-4" />
                  Google Maps
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onPress={() => window.open(APPLE_MAPS_URL, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-4" />
                  Apple Maps
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
