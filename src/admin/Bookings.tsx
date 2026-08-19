import type { BookingRecord } from "@/types/domain";

import { useEffect, useState } from "react";
import {
  CalendarX,
  Check,
  CloudOff,
  Eye,
  Pencil,
  RefreshCw,
  Wrench,
  X,
} from "lucide-react";
import {
  Button,
  Chip,
  FieldError,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
} from "@heroui/react";

import { useProductStore, useToastStore } from "@/lib/store";
import { useSiteStore } from "@/lib/siteStore";
import {
  isSupabaseConfigured,
  sbFetchBookings,
  sbUpdateBooking,
  sbUpdateBookingStatus,
} from "@/lib/supabase";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, {
  type AdminDataTableColumn,
} from "@/admin/components/AdminDataTable";

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
] as const;
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-accent-soft text-accent",
  completed: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
  "no-show": "bg-danger/15 text-danger",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <strong className="text-right text-foreground">{value}</strong>
    </div>
  );
}

export default function Bookings() {
  const addToast = useToastStore((s) => s.add);
  const usingSupabase = useProductStore((s) => s.usingSupabase);
  const repairServices = useSiteStore((s) => s.repairServices);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<BookingRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<BookingRecord | null>(null);

  const load = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    const data = await sbFetchBookings();

    setLoading(false);
    if (data) setBookings(data);
    else addToast("Could not load appointments from Supabase", "error");
  };

  useEffect(() => {
    load();
  }, [usingSupabase]);

  const serviceLabel = (b: BookingRecord) =>
    repairServices.find(
      (s) =>
        s.id === b.service ||
        s.name?.toLowerCase() === b.service?.toLowerCase(),
    )?.name ||
    b.service?.replace(/-/g, " ") ||
    "Repair Service";

  const handleStatusChange = async (id: string, status: string) => {
    const previousStatus = bookings.find((x) => x.id === id)?.status;

    setBookings((b) => b.map((x) => (x.id === id ? { ...x, status } : x)));
    if (selected?.id === id) {
      setSelected((s) => (s ? { ...s, status } : s));
      if (editForm?.id === id) setEditForm((f) => (f ? { ...f, status } : f));
    }
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBookingStatus(id, status);

      if (ok) {
        addToast(`Appointment status updated to "${status}"`, "success");
      } else {
        setBookings((b) =>
          b.map((x) =>
            x.id === id ? { ...x, status: previousStatus || x.status } : x,
          ),
        );
        if (selected?.id === id)
          setSelected((s) =>
            s ? { ...s, status: previousStatus || s.status } : s,
          );
        addToast("Could not update appointment status", "error");
      }
    }
  };

  const startEditing = () => {
    if (selected) {
      setEditForm({ ...selected });
      setIsEditing(true);
    }
  };

  const handleSaveUpdates = async () => {
    if (!editForm || !selected) return;
    if (!editForm.customer_name || !editForm.appt_date || !editForm.appt_time) {
      addToast(
        "Customer Name, Appointment Date, and Time are required.",
        "error",
      );

      return;
    }
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBooking(selected.id, {
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email,
        service: editForm.service,
        device_type: editForm.device_type,
        device_model: editForm.device_model,
        appt_date: editForm.appt_date,
        appt_time: editForm.appt_time,
        issue: editForm.issue || "",
        notes: editForm.notes || "",
        status: editForm.status,
      });

      if (ok) {
        setBookings((bs) =>
          bs.map((b) => (b.id === selected.id ? { ...editForm } : b)),
        );
        setSelected({ ...editForm });
        setIsEditing(false);
        addToast("Appointment details updated", "success");
      } else {
        addToast("Could not update appointment details", "error");
      }
    }
  };

  const closeModal = () => {
    setSelected(null);
    setIsEditing(false);
  };
  const filtered =
    statusFilter === "all"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  const StatusSelect = ({ booking }: { booking: BookingRecord }) => (
    <Select
      className={`w-[140px] rounded-full text-xs font-bold ${STATUS_STYLES[booking.status] || "bg-surface-tertiary"}`}
      selectedKey={booking.status}
      onSelectionChange={(key) => handleStatusChange(booking.id, String(key))}
    >
      <Select.Trigger className="rounded-full border-0">
        <Select.Value />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {STATUS_OPTIONS.map((s) => (
            <ListBox.Item key={s} id={s}>
              {cap(s)}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  const columns: AdminDataTableColumn<BookingRecord>[] = [
    {
      key: "schedule",
      header: "Schedule Time",
      render: (b) => (
        <div>
          <strong className="block text-sm text-accent">{b.appt_date}</strong>
          <span className="text-xs text-muted">{b.appt_time}</span>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer Information",
      render: (b) => (
        <div>
          <strong className="block text-sm text-foreground">
            {b.customer_name}
          </strong>
          <span className="text-xs text-muted">
            {b.customer_phone || b.customer_email || "No phone provided"}
          </span>
        </div>
      ),
    },
    {
      key: "service",
      header: "Requested Service",
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <Wrench className="size-4 text-accent" />
          <strong className="text-[13px] capitalize">{serviceLabel(b)}</strong>
        </div>
      ),
    },
    {
      key: "device",
      header: "Target Device",
      render: (b) => (
        <div>
          <strong className="block text-[13px] text-foreground">
            {b.device_type}
          </strong>
          <span className="text-xs text-muted">{b.device_model}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Fulfillment Status",
      render: (b) => <StatusSelect booking={b} />,
    },
    {
      key: "created",
      header: "Created",
      render: (b) => (
        <span className="text-xs text-muted">
          {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (b) => (
        <Button
          isIconOnly
          aria-label="View appointment inspector"
          variant="ghost"
          onPress={() => setSelected(b)}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        description={`${bookings.length} total scheduled repair appointment${bookings.length !== 1 ? "s" : ""}${!usingSupabase ? " — (Offline fallback mode)" : ""}`}
        eyebrow="Repair Telemetry"
        title="Service Bookings"
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statusFilter === "all" ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-foreground"}`}
          type="button"
          onClick={() => setStatusFilter("all")}
        >
          All ({bookings.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = bookings.filter((b) => b.status === s).length;

          if (count === 0 && statusFilter !== s) return null;

          return (
            <button
              key={s}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statusFilter === s ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-foreground"}`}
              type="button"
              onClick={() => setStatusFilter(s)}
            >
              {cap(s)} ({count})
            </button>
          );
        })}
        <Button isDisabled={loading} variant="outline" onPress={load}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          <span>Sync</span>
        </Button>
      </div>

      {!isSupabaseConfigured() ? (
        <div className="flex flex-col items-center gap-3 rounded-[28px] border border-border bg-surface-secondary p-14 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-surface-tertiary text-muted">
            <CloudOff className="size-8" />
          </span>
          <h4 className="m-0 text-lg font-bold text-foreground">
            Supabase Database Not Connected
          </h4>
          <p className="m-0 max-w-[440px] text-sm text-muted">
            Customer repair appointments are stored in your cloud database.
            Connect Supabase credentials in Settings to manage live bookings.
          </p>
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          data={filtered}
          emptyState={{
            icon: CalendarX,
            title: "No appointments found",
            description:
              statusFilter === "all"
                ? "Appointments booked by customers will appear here automatically."
                : `No appointments currently marked as "${statusFilter}".`,
          }}
          rowKey={(b) => b.id}
        />
      )}

      {/* Inspector / Editor modal */}
      <Modal>
        <Modal.Backdrop isOpen={!!selected} onOpenChange={(open) => !open && closeModal()}>
          <Modal.Container scroll="inside" size="lg">
            <Modal.Dialog>
              {selected && (
                <>
                  <Modal.Header>
                    <div>
                      <Chip
                        className="mb-1.5"
                        color="accent"
                        size="sm"
                        variant="soft"
                      >
                        <Chip.Label>Appointment Inspector</Chip.Label>
                      </Chip>
                      <Modal.Heading>
                        Booking #{selected.id.slice(0, 8).toUpperCase()}
                      </Modal.Heading>
                    </div>
                    {!isEditing ? (
                      <Button variant="outline" onPress={startEditing}>
                        <Pencil className="size-4" />
                        <span>Edit Details</span>
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onPress={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button variant="primary" onPress={handleSaveUpdates}>
                          <Check className="size-4" />
                          <span>Save</span>
                        </Button>
                      </div>
                    )}
                    <Modal.CloseTrigger>
                      <X className="size-4" />
                    </Modal.CloseTrigger>
                  </Modal.Header>

                  <Modal.Body className="flex flex-col gap-4">
                    {isEditing && editForm ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField
                          isRequired
                          className="flex flex-col gap-1.5"
                          value={editForm.customer_name}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, customer_name: v })
                          }
                        >
                          <Label>Customer Name *</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                          <FieldError />
                        </TextField>

                        <Select
                          selectedKey={editForm.status}
                          onSelectionChange={(key) =>
                            setEditForm(
                              (f) => f && { ...f, status: String(key) },
                            )
                          }
                        >
                          <Label>Status</Label>
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {STATUS_OPTIONS.map((s) => (
                                <ListBox.Item key={s} id={s}>
                                  {cap(s)}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <TextField
                          className="flex flex-col gap-1.5"
                          value={editForm.customer_phone || ""}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, customer_phone: v })
                          }
                        >
                          <Label>Customer Phone</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                        </TextField>

                        <TextField
                          className="flex flex-col gap-1.5"
                          value={editForm.customer_email || ""}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, customer_email: v })
                          }
                        >
                          <Label>Customer Email</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                        </TextField>

                        <TextField
                          isRequired
                          className="flex flex-col gap-1.5"
                          value={editForm.appt_date}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, appt_date: v })
                          }
                        >
                          <Label>Appointment Date *</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                          <FieldError />
                        </TextField>

                        <TextField
                          isRequired
                          className="flex flex-col gap-1.5"
                          value={editForm.appt_time}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, appt_time: v })
                          }
                        >
                          <Label>Appointment Time *</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                          <FieldError />
                        </TextField>

                        <TextField
                          className="flex flex-col gap-1.5"
                          value={editForm.device_type}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, device_type: v })
                          }
                        >
                          <Label>Device Category</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                        </TextField>

                        <TextField
                          className="flex flex-col gap-1.5"
                          value={editForm.device_model}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, device_model: v })
                          }
                        >
                          <Label>Device Specific Model</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                        </TextField>

                        <Select
                          className="sm:col-span-2"
                          selectedKey={editForm.service}
                          onSelectionChange={(key) =>
                            setEditForm(
                              (f) => f && { ...f, service: String(key) },
                            )
                          }
                        >
                          <Label>Service Type</Label>
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {repairServices.map((s) => (
                                <ListBox.Item key={s.id} id={s.id}>
                                  {s.name}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <TextField
                          className="flex flex-col gap-1.5 sm:col-span-2"
                          value={editForm.issue || ""}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, issue: v })
                          }
                        >
                          <Label>Customer Issue Description</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                        </TextField>

                        <TextField
                          className="flex flex-col gap-1.5 sm:col-span-2"
                          value={editForm.notes || ""}
                          onChange={(v) =>
                            setEditForm((f) => f && { ...f, notes: v })
                          }
                        >
                          <Label>Admin Technician Notes</Label>
                          <InputGroup>
                            <InputGroup.Input />
                          </InputGroup>
                        </TextField>
                      </div>
                    ) : (
                      <>
                        <div className="max-w-[240px]">
                          <StatusSelect booking={selected} />
                        </div>

                        <div>
                          <h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">
                            Appointment Schedule &amp; Device
                          </h6>
                          <div className="rounded-2xl border border-border bg-surface-secondary p-4">
                            <DetailRow
                              label="Requested Service"
                              value={serviceLabel(selected)}
                            />
                            <DetailRow
                              label="Scheduled Date"
                              value={selected.appt_date}
                            />
                            <DetailRow
                              label="Time Window"
                              value={selected.appt_time}
                            />
                            <DetailRow
                              label="Device Type"
                              value={selected.device_type}
                            />
                            <DetailRow
                              label="Device Model"
                              value={selected.device_model}
                            />
                            {selected.issue && (
                              <DetailRow
                                label="Reported Issue"
                                value={selected.issue}
                              />
                            )}
                            {selected.notes && (
                              <DetailRow
                                label="Technician Notes"
                                value={selected.notes}
                              />
                            )}
                          </div>
                        </div>

                        <div>
                          <h6 className="m-0 mb-2.5 text-sm font-extrabold text-foreground">
                            Customer Contact Details
                          </h6>
                          <div className="rounded-2xl border border-border bg-surface-secondary p-4">
                            <DetailRow
                              label="Full Name"
                              value={selected.customer_name}
                            />
                            <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm">
                              <span className="text-muted">Phone Number</span>
                              <a
                                className="font-bold text-accent"
                                href={`tel:${selected.customer_phone}`}
                              >
                                {selected.customer_phone}
                              </a>
                            </div>
                            <div className="flex items-center justify-between gap-4 py-2 text-sm">
                              <span className="text-muted">Email Address</span>
                              <a
                                className="font-bold text-accent"
                                href={`mailto:${selected.customer_email}`}
                              >
                                {selected.customer_email}
                              </a>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </Modal.Body>

                  <Modal.Footer className="justify-end">
                    <Button variant="primary" onPress={closeModal}>
                      Close
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
