import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";

interface AdminConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}

/** Destructive-action confirmation shared by Products, Categories, Orders and Bookings. */
export default function AdminConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel = "Delete" }: AdminConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent description={description} title={title}>
        <div className="ad-actions ad-actions--end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
