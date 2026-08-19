import { TriangleAlert } from "lucide-react";
import { AlertDialog, Button } from "@heroui/react";

interface AdminConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}

// Delete confirmations across Products/Categories/Orders/Bookings all
// followed the same pattern in the original — pulled into one shared
// component on HeroUI's real AlertDialog, which correctly defaults to
// non-dismissable (no accidental backdrop-click) for destructive actions.
export default function AdminConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete Permanently",
}: AdminConfirmDialogProps) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <TriangleAlert className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="m-0 text-sm text-muted">{description}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer className="justify-end gap-2">
              <Button variant="outline" onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
