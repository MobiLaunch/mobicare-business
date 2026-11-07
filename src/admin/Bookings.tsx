import type { BookingRecord } from "@/types/domain";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarX,
  Check,
  CloudOff,
  Eye,
  Home,
  Pencil,
  RefreshCw,
  Store,
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

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled", "no-show"] as const;
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-accent-soft text-accent",
  completed: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
  "no-show": "bg-danger/15 text-danger",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ticketNumber(id: string | number) {
  return `MC-${String(id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase() || "BOOKING"}`;
}

function Ticket({ booking, service }: { booking: BookingRecord; service: string }) {
  const home = booking.visit_type === "home";
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="m-0 text-micro font-bold uppercase tracking-[0.18em] text-muted">Mobicare Service Ticket</p>
          <p className="m-0 mt-1 font-mono text-lg font-extrabold tracking-tight text-foreground">#{ticketNumber(booking.id)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-caption font-bold ${STATUS_STYLES[booking.status] || "bg-surface-tertiary text-foreground"}`}>{cap(booking.status || "pending")}</span>
      </div>
      <div className="mx-5 border-t border-dashed border-border" />
      <div className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
        <div><span className="block text-micro font-bold uppercase tracking-wide text-muted">Appointment</span><strong className="mt-1 block text-foreground">{booking.appt_date}</strong><span className="text-xs text-muted">{booking.appt_time}</span></div>
        <div><span className="block text-micro font-bold uppercase tracking-wide text-muted">Customer</span><strong className="mt-1 block truncate text-foreground">{booking.customer_name}</strong><span className="text-xs text-muted">{booking.customer_phone || booking.customer_email || "No contact"}</span></div>
        <div><span className="block text-micro font-bold uppercase tracking-wide text-muted">Service</span><strong className="mt-1 block truncate text-foreground">{service}</strong><span className="text-xs text-muted">{booking.device_type}</span></div>
        <div><span className="block text-micro font-bold uppercase tracking-wide text-muted">Visit</span><strong className="mt-1 flex items-center gap-1.5 text-foreground">{home ? <Home className="size-3.5 text-accent" /> : <Store className="size-3.5 text-accent" />}{home ? `Home Visit${booking.visit_location_type === "commercial" ? " (Commercial)" : booking.visit_location_type === "residential" ? " (Residential)" : ""}` : "In-Store"}</strong><span className="text-xs text-muted">{booking.device_model}</span></div>
      </div>
      {(booking.issue || home) && <div className="mx-5 mb-5 rounded-2xl bg-surface-secondary/60 p-3 text-xs text-muted"><strong className="text-foreground">{home ? "Service location" : "Issue"}</strong><p className="m-0 mt-1">{home ? (booking.home_address || "Home address on file") : booking.issue}</p></div>}
      <div className="flex items-center justify-between border-t border-dashed border-border bg-surface-secondary/30 px-5 py-3">
        <span className="font-mono text-micro tracking-[0.28em] text-muted">||||| |||| ||||| ||</span>
        <span className="text-micro text-muted">Created {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : "—"}</span>
      </div>
    </div>
  );
}

export default function Bookings() {
  const addToast = useToastStore((s) => s.add);
  const usingSupabase = useProductStore((s) => s.usingSupabase);
  const repairServices = useSiteStore((s) => s.repairServices);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookingRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<BookingRecord | null>(null);

  const load = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    const { data, error } = await sbFetchBookings();
    setLoading(false);
    setLoadError(error);
    if (data) setBookings(data);
    if (error) addToast(`Could not load appointments: ${error}`, "error");
  };
  useEffect(() => { load(); }, [usingSupabase]);

  const serviceLabel = (b: BookingRecord) => repairServices.find((s) => s.id === b.service || s.name?.toLowerCase() === b.service?.toLowerCase())?.name || b.service?.replace(/-/g, " ") || "Repair Service";
  const handleStatusChange = async (id: string | number, status: string) => {
    const previous = bookings.find((x) => x.id === id)?.status;
    setBookings((bs) => bs.map((x) => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected((s) => s ? { ...s, status } : s);
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBookingStatus(id, status);
      if (ok) addToast(`Appointment status updated to "${status}"`, "success");
      else { setBookings((bs) => bs.map((x) => x.id === id ? { ...x, status: previous || x.status } : x)); addToast("Could not update appointment status", "error"); }
    }
  };
  const startEditing = () => { if (selected) { setEditForm({ ...selected }); setIsEditing(true); } };
  const handleSaveUpdates = async () => {
    if (!editForm || !selected) return;
    if (!editForm.customer_name || !editForm.appt_date || !editForm.appt_time) { addToast("Customer Name, Appointment Date, and Time are required.", "error"); return; }
    const patch = { customer_name: editForm.customer_name, customer_phone: editForm.customer_phone, customer_email: editForm.customer_email, service: editForm.service, device_type: editForm.device_type, device_model: editForm.device_model, appt_date: editForm.appt_date, appt_time: editForm.appt_time, issue: editForm.issue || "", notes: editForm.notes || "", status: editForm.status };
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBooking(selected.id, patch);
      if (!ok) { addToast("Could not update appointment details", "error"); return; }
    }
    setBookings((bs) => bs.map((b) => b.id === selected.id ? { ...editForm } : b));
    setSelected({ ...editForm }); setIsEditing(false); addToast(isSupabaseConfigured() ? "Appointment details updated" : "Updated locally (Supabase not connected)", isSupabaseConfigured() ? "success" : "info");
  };
  const closeModal = () => { setSelected(null); setIsEditing(false); };
  const filtered = statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);
  const columns: AdminDataTableColumn<BookingRecord>[] = [
    { key: "schedule", header: "Schedule", render: (b) => <div><strong className="block text-sm text-accent">{b.appt_date}</strong><span className="text-xs text-muted">{b.appt_time}</span></div> },
    { key: "customer", header: "Customer", render: (b) => <div><strong className="block text-sm text-foreground">{b.customer_name}</strong><span className="text-xs text-muted">{b.customer_phone || b.customer_email || "No contact"}</span></div> },
    { key: "service", header: "Service", render: (b) => <div className="flex items-center gap-1.5"><Wrench className="size-4 text-accent" /><strong className="text-label capitalize">{serviceLabel(b)}</strong></div> },
    { key: "device", header: "Device", render: (b) => <div><strong className="block text-label text-foreground">{b.device_type}</strong><span className="text-xs text-muted">{b.device_model}</span></div> },
    { key: "visit", header: "Visit", render: (b) => <span className="flex items-center gap-1.5 text-xs font-semibold">{b.visit_type === "home" ? <><Home className="size-3.5 text-accent" />Home</> : <><Store className="size-3.5 text-accent" />Store</>}</span> },
    { key: "status", header: "Status", render: (b) => <Select className={`w-[132px] rounded-full text-xs font-bold ${STATUS_STYLES[b.status] || "bg-surface-tertiary"}`} selectedKey={STATUS_OPTIONS.includes(b.status as typeof STATUS_OPTIONS[number]) ? b.status : "pending"} onSelectionChange={(key) => handleStatusChange(b.id, String(key))}><Select.Trigger className="rounded-full border-0"><Select.Value /></Select.Trigger><Select.Popover><ListBox>{STATUS_OPTIONS.map((s) => <ListBox.Item key={s} id={s}>{cap(s)}</ListBox.Item>)}</ListBox></Select.Popover></Select> },
    { key: "actions", header: "", render: (b) => <Button isIconOnly aria-label="View appointment" variant="ghost" onPress={() => setSelected(b)}><Eye className="size-4" /></Button> },
  ];

  return <div>
    <AdminPageHeader description={`${bookings.length} total scheduled repair appointment${bookings.length !== 1 ? "s" : ""}${!usingSupabase ? " — Offline fallback mode" : ""}`} eyebrow="Repair Operations" title="Service Bookings" />
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {(["all", ...STATUS_OPTIONS] as const).map((status) => { const count = status === "all" ? bookings.length : bookings.filter((b) => b.status === status).length; if (status !== "all" && count === 0) return null; return <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-2xl border p-3 text-left transition-colors ${statusFilter === status ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-secondary"}`}><span className="flex items-center gap-2 text-xs font-bold text-muted"><CalendarDays className="size-3.5" />{status === "all" ? "All appointments" : cap(status)}</span><strong className="mt-1 block text-xl text-foreground">{count}</strong></button>; })}
      <Button className="min-h-0" isDisabled={loading} variant="outline" onPress={load}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /><span>Sync</span></Button>
    </div>
    {!isSupabaseConfigured() ? <div className="flex flex-col items-center gap-3 rounded-[28px] border border-border bg-surface-secondary p-14 text-center"><span className="flex size-16 items-center justify-center rounded-full bg-surface-tertiary text-muted"><CloudOff className="size-8" /></span><h4 className="m-0 text-lg font-bold text-foreground">Supabase Database Not Connected</h4><p className="m-0 max-w-[440px] text-sm text-muted">Customer repair appointments are stored in your cloud database. Connect Supabase credentials in Settings to manage live bookings.</p></div> : loadError ? <div className="flex flex-col items-center gap-3 rounded-[28px] border border-danger/30 bg-danger/5 p-14 text-center"><span className="flex size-16 items-center justify-center rounded-full bg-danger/15 text-danger"><CloudOff className="size-8" /></span><h4 className="m-0 text-lg font-bold text-foreground">Couldn&rsquo;t Load Appointments</h4><p className="m-0 max-w-[440px] text-sm text-muted">Supabase returned an error instead of your bookings. This is usually a Row Level Security policy or schema mismatch, not missing data.</p><code className="max-w-full overflow-x-auto rounded-xl bg-surface-tertiary px-3 py-2 text-xs text-danger">{loadError}</code><Button variant="outline" onPress={load}><RefreshCw className="size-4" /><span>Try Again</span></Button></div> : <><div className="mb-5 hidden flex-col gap-4 md:flex">{filtered.slice(0, 3).map((b) => <Ticket key={b.id} booking={b} service={serviceLabel(b)} />)}</div><div className="md:hidden">{filtered.slice(0, 2).map((b) => <div key={b.id} className="mb-3"><Ticket booking={b} service={serviceLabel(b)} /></div>)}</div><AdminDataTable columns={columns} data={filtered} emptyState={{ icon: CalendarX, title: "No appointments found", description: statusFilter === "all" ? "Appointments booked by customers will appear here automatically." : `No appointments currently marked as "${statusFilter}".` }} rowKey={(b) => String(b.id)} /></>}
    <Modal><Modal.Backdrop isOpen={!!selected} onOpenChange={(open) => !open && closeModal()}><Modal.Container scroll="inside" size="lg"><Modal.Dialog>{selected && <><Modal.Header><div><Chip className="mb-1.5" color="accent" size="sm" variant="soft"><Chip.Label>Service Ticket</Chip.Label></Chip><Modal.Heading>#{ticketNumber(selected.id)}</Modal.Heading></div>{!isEditing ? <Button variant="outline" onPress={startEditing}><Pencil className="size-4" />Edit Details</Button> : <div className="flex gap-2"><Button variant="outline" onPress={() => setIsEditing(false)}>Cancel</Button><Button variant="primary" onPress={handleSaveUpdates}><Check className="size-4" />Save</Button></div>}<Modal.CloseTrigger><X className="size-4" /></Modal.CloseTrigger></Modal.Header><Modal.Body className="flex flex-col gap-4">{!isEditing ? <Ticket booking={selected} service={serviceLabel(selected)} /> : editForm ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><TextField isRequired className="flex flex-col gap-1.5" value={editForm.customer_name} onChange={(v) => setEditForm((f) => f && { ...f, customer_name: v })}><Label>Customer Name *</Label><InputGroup><InputGroup.Input /></InputGroup><FieldError /></TextField><TextField className="flex flex-col gap-1.5" value={editForm.customer_phone || ""} onChange={(v) => setEditForm((f) => f && { ...f, customer_phone: v })}><Label>Customer Phone</Label><InputGroup><InputGroup.Input /></InputGroup></TextField><TextField className="flex flex-col gap-1.5 sm:col-span-2" value={editForm.customer_email || ""} onChange={(v) => setEditForm((f) => f && { ...f, customer_email: v })}><Label>Customer Email</Label><InputGroup><InputGroup.Input /></InputGroup></TextField><TextField className="flex flex-col gap-1.5" value={editForm.appt_date} onChange={(v) => setEditForm((f) => f && { ...f, appt_date: v })}><Label>Appointment Date *</Label><InputGroup><InputGroup.Input /></InputGroup></TextField><TextField className="flex flex-col gap-1.5" value={editForm.appt_time} onChange={(v) => setEditForm((f) => f && { ...f, appt_time: v })}><Label>Appointment Time *</Label><InputGroup><InputGroup.Input /></InputGroup></TextField><TextField className="flex flex-col gap-1.5" value={editForm.device_type} onChange={(v) => setEditForm((f) => f && { ...f, device_type: v })}><Label>Device Type</Label><InputGroup><InputGroup.Input /></InputGroup></TextField><TextField className="flex flex-col gap-1.5" value={editForm.device_model} onChange={(v) => setEditForm((f) => f && { ...f, device_model: v })}><Label>Device Model</Label><InputGroup><InputGroup.Input /></InputGroup></TextField><TextField className="flex flex-col gap-1.5 sm:col-span-2" value={editForm.issue || ""} onChange={(v) => setEditForm((f) => f && { ...f, issue: v })}><Label>Issue</Label><InputGroup><InputGroup.Input /></InputGroup></TextField></div> : null}</Modal.Body></> }</Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
  </div>;
}
