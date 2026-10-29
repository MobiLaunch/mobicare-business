import type { BookingRecord } from "@/types/domain";

import { useEffect, useState } from "react";
import { CalendarX, Check, CloudOff, Eye, Home, Pencil, RefreshCw, Store, Wrench } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { Input } from "@/components/arc/input/input";
import { useProductStore, useToastStore } from "@/lib/store";
import { useSiteStore } from "@/lib/siteStore";
import { isSupabaseConfigured, sbFetchBookings, sbUpdateBooking, sbUpdateBookingStatus } from "@/lib/supabase";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, { type AdminDataTableColumn } from "@/admin/components/AdminDataTable";
import StatusPill from "@/admin/components/StatusPill";
import StatusSelect from "@/admin/components/StatusSelect";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled", "no-show"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ticketNumber = (id: string | number) => `MC-${String(id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase() || "BOOKING"}`;

function Ticket({ booking, service }: { booking: BookingRecord; service: string }) {
  const home = booking.visit_type === "home";

  return (
    <div className="ad-ticket">
      <div className="ad-ticket-head">
        <div><small>Service ticket</small><strong>#{ticketNumber(booking.id)}</strong></div>
        <StatusPill status={cap(booking.status || "pending")} tone={undefined} />
      </div>
      <div className="ad-ticket-body">
        <div><small>Appointment</small><strong>{booking.appt_date}</strong><span className="ad-hint">{booking.appt_time}</span></div>
        <div><small>Customer</small><strong>{booking.customer_name}</strong><span className="ad-hint">{booking.customer_phone || booking.customer_email || "No contact"}</span></div>
        <div><small>Service</small><strong>{service}</strong><span className="ad-hint">{booking.device_type}</span></div>
        <div>
          <small>Visit</small>
          <strong>{home ? <Home aria-hidden="true" size={14} /> : <Store aria-hidden="true" size={14} />}{home ? `Home${booking.visit_location_type === "commercial" ? " (commercial)" : booking.visit_location_type === "residential" ? " (residential)" : ""}` : "In store"}</strong>
          <span className="ad-hint">{booking.device_model}</span>
        </div>
      </div>
      {(booking.issue || home) && <p className="ad-ticket-note"><strong>{home ? "Service location" : "Issue"}</strong><br />{home ? booking.home_address || "Home address on file" : booking.issue}</p>}
      <div className="ad-ticket-foot"><span>Created {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : "—"}</span></div>
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

  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingSupabase]);

  const serviceLabel = (b: BookingRecord) => repairServices.find((s) => s.id === b.service || s.name?.toLowerCase() === b.service?.toLowerCase())?.name || b.service?.replace(/-/g, " ") || "Repair service";

  const handleStatusChange = async (id: string | number, status: string) => {
    const previous = bookings.find((x) => x.id === id)?.status;

    setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status } : x)));
    if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s));
    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBookingStatus(id, status);

      if (ok) addToast(`Appointment status updated to "${status}"`, "success");
      else { setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: previous || x.status } : x))); addToast("Could not update appointment status", "error"); }
    }
  };

  const startEditing = () => { if (selected) { setEditForm({ ...selected }); setIsEditing(true); } };
  const handleSaveUpdates = async () => {
    if (!editForm || !selected) return;
    if (!editForm.customer_name || !editForm.appt_date || !editForm.appt_time) { addToast("Customer name, date and time are required.", "error"); return; }

    const patch = { customer_name: editForm.customer_name, customer_phone: editForm.customer_phone, customer_email: editForm.customer_email, service: editForm.service, device_type: editForm.device_type, device_model: editForm.device_model, appt_date: editForm.appt_date, appt_time: editForm.appt_time, issue: editForm.issue || "", notes: editForm.notes || "", status: editForm.status };

    if (isSupabaseConfigured()) {
      const ok = await sbUpdateBooking(selected.id, patch);

      if (!ok) { addToast("Could not update appointment details", "error"); return; }
    }
    setBookings((bs) => bs.map((b) => (b.id === selected.id ? { ...editForm } : b)));
    setSelected({ ...editForm });
    setIsEditing(false);
    addToast(isSupabaseConfigured() ? "Appointment details updated" : "Updated locally (Supabase not connected)", isSupabaseConfigured() ? "success" : "info");
  };
  const closeModal = () => { setSelected(null); setIsEditing(false); };
  const set = (k: keyof BookingRecord) => (e: React.ChangeEvent<HTMLInputElement>) => setEditForm((f) => f && { ...f, [k]: e.target.value });

  const filtered = statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);
  const statusControl = (b: BookingRecord) => <StatusSelect format={cap} label={`Status for ${b.customer_name}`} options={STATUS_OPTIONS} value={b.status} onChange={(v) => handleStatusChange(b.id, v)} />;
  const visitCell = (b: BookingRecord) => <span className="ad-cell-main" style={{ gap: 6 }}>{b.visit_type === "home" ? <><Home aria-hidden="true" size={14} />Home</> : <><Store aria-hidden="true" size={14} />Store</>}</span>;

  const columns: AdminDataTableColumn<BookingRecord>[] = [
    { key: "schedule", header: "Schedule", render: (b) => <div><strong style={{ fontWeight: 500, display: "block" }}>{b.appt_date}</strong><span className="ad-hint">{b.appt_time}</span></div> },
    { key: "customer", header: "Customer", render: (b) => <div><strong style={{ fontWeight: 500, display: "block" }}>{b.customer_name}</strong><span className="ad-hint">{b.customer_phone || b.customer_email || "No contact"}</span></div> },
    { key: "service", header: "Service", render: (b) => <span className="ad-cell-main" style={{ gap: 6, textTransform: "capitalize" }}><Wrench aria-hidden="true" size={14} />{serviceLabel(b)}</span> },
    { key: "device", header: "Device", render: (b) => <div><strong style={{ fontWeight: 500, display: "block" }}>{b.device_type}</strong><span className="ad-hint">{b.device_model}</span></div> },
    { key: "visit", header: "Visit", render: visitCell },
    { key: "status", header: "Status", render: statusControl },
    { key: "actions", header: "", render: (b) => <div className="ad-row-actions"><button aria-label={`View appointment for ${b.customer_name}`} className="ad-iconbtn" type="button" onClick={() => setSelected(b)}><Eye aria-hidden="true" size={16} /></button></div> },
  ];

  const empty = { icon: CalendarX, title: "No appointments found", description: statusFilter === "all" ? "Appointments booked by customers appear here automatically." : `No appointments are marked "${statusFilter}".` };

  return (
    <div className="ad-stack">
      <AdminPageHeader
        action={<Button disabled={loading} variant="secondary" onClick={load}><RefreshCw aria-hidden="true" size={16} strokeWidth={1.75} style={loading ? { animation: "mc-spin 0.8s linear infinite" } : undefined} />Sync</Button>}
        description={`${bookings.length} scheduled repair appointment${bookings.length === 1 ? "" : "s"}${!usingSupabase ? ". Offline fallback mode." : "."}`}
        title="Bookings"
      />

      {!isSupabaseConfigured() ? (
        <div className="ad-card"><EmptyState description="Repair appointments live in your cloud database. Add Supabase credentials in Settings to manage live bookings." icon={<CloudOff aria-hidden="true" size={22} />} title="Database not connected" /></div>
      ) : loadError ? (
        <div className="ad-card ad-stack-sm" style={{ justifyItems: "start" }}>
          <EmptyState description="Supabase returned an error instead of your bookings. This is usually a Row Level Security policy or a schema mismatch, not missing data." icon={<CloudOff aria-hidden="true" size={22} />} title="Couldn't load appointments" />
          <code className="ad-code" style={{ color: "var(--danger)", overflowWrap: "anywhere" }}>{loadError}</code>
          <Button variant="secondary" onClick={load}><RefreshCw aria-hidden="true" size={16} strokeWidth={1.75} />Try again</Button>
        </div>
      ) : (
        <>
          <div className="ad-grid ad-grid-4 keep2">
            {(["all", ...STATUS_OPTIONS] as const).map((status) => {
              const count = status === "all" ? bookings.length : bookings.filter((b) => b.status === status).length;

              if (status !== "all" && count === 0) return null;

              return <button key={status} aria-pressed={statusFilter === status} className="ad-filter" type="button" onClick={() => setStatusFilter(status)}><span>{status === "all" ? "All appointments" : cap(status)}</span><strong>{count}</strong></button>;
            })}
          </div>

          <div className="ad-only-narrow">
            {filtered.length === 0 ? <AdminDataTable columns={[]} data={[]} emptyState={empty} rowKey={() => ""} /> : (
              <div className="ad-cards">
                {filtered.map((b) => (
                  <article key={b.id} className="ad-mcard">
                    <div className="ad-mcard-top">
                      <div><strong style={{ fontWeight: 500 }}>{b.customer_name}</strong><span className="ad-hint" style={{ display: "block" }}>{serviceLabel(b)} · {b.device_model}</span></div>
                      <button aria-label={`View appointment for ${b.customer_name}`} className="ad-iconbtn" type="button" onClick={() => setSelected(b)}><Eye aria-hidden="true" size={16} /></button>
                    </div>
                    <div className="ad-mcard-grid"><div><small>When</small>{b.appt_date} {b.appt_time}</div><div><small>Visit</small>{visitCell(b)}</div><div style={{ gridColumn: "1 / -1" }}>{statusControl(b)}</div></div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="ad-only-wide">
            <AdminDataTable caption="Bookings" columns={columns} data={filtered} emptyState={empty} rowKey={(b) => String(b.id)} />
          </div>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="ad-dialog-wide" description={selected ? "Review or edit this appointment." : undefined} title={selected ? `Ticket #${ticketNumber(selected.id)}` : "Appointment"}>
          {selected && (
            <div className="ad-stack">
              {!isEditing ? <Ticket booking={selected} service={serviceLabel(selected)} /> : editForm && (
                <div className="ad-form-2">
                  <Input label="Customer name" required value={editForm.customer_name} onChange={set("customer_name")} />
                  <Input label="Customer phone" value={editForm.customer_phone || ""} onChange={set("customer_phone")} />
                  <div style={{ gridColumn: "1 / -1" }}><Input label="Customer email" value={editForm.customer_email || ""} onChange={set("customer_email")} /></div>
                  <Input label="Appointment date" required value={editForm.appt_date} onChange={set("appt_date")} />
                  <Input label="Appointment time" required value={editForm.appt_time} onChange={set("appt_time")} />
                  <Input label="Device type" value={editForm.device_type} onChange={set("device_type")} />
                  <Input label="Device model" value={editForm.device_model} onChange={set("device_model")} />
                  <div style={{ gridColumn: "1 / -1" }}><Input label="Issue" value={editForm.issue || ""} onChange={set("issue")} /></div>
                </div>
              )}
              <div className="ad-actions ad-actions--end">
                {!isEditing ? <Button variant="secondary" onClick={startEditing}><Pencil aria-hidden="true" size={16} strokeWidth={1.75} />Edit details</Button> : <><Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button><Button onClick={handleSaveUpdates}><Check aria-hidden="true" size={16} strokeWidth={1.75} />Save</Button></>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
