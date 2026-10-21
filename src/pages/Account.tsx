import type { BookingRecord, CustomerChatMessage, Order } from "../types/domain";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, LogOut, MessageCircle, Package, RefreshCw, Send, Wrench, type LucideIcon } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import {
  updateCustomerProfile,
  updateCustomerPassword,
  sbFetchCustomerBookings,
  sbFetchCustomerOrders,
  sbFetchCustomerChat,
  sbSendCustomerChatMessage,
} from "../lib/supabase";
import PageMeta from "../components/PageMeta";
import AppIcon, { type IconColor } from "../components/ios/AppIcon";
import { IosField, IosGroup, IosNote, IosSummaryRow } from "../components/ios/Forms";
import Reveal from "../components/ios/Reveal";
import { play } from "../lib/sound";

type AccountTab = "profile" | "bookings" | "orders" | "messages" | "settings";

export default function Account() {
  const { user, profile, loading, reloadProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<CustomerChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => { if (!loading && !user) navigate("/login", { replace: true }); }, [loading, user, navigate]);
  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setPhone(profile.phone || ""); }
    else if (user?.user_metadata) { setFullName(user.user_metadata.full_name || ""); setPhone(user.user_metadata.phone || ""); }
  }, [profile, user]);

  const loadUserData = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [ordersRes, bookingsRes, chatRes] = await Promise.all([
        sbFetchCustomerOrders(user.id),
        sbFetchCustomerBookings(user.id),
        sbFetchCustomerChat(user.id),
      ]);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (bookingsRes.data) setBookings(bookingsRes.data as BookingRecord[]);
      if (chatRes.data) setChatMessages(chatRes.data);
    } catch (error) { console.error("Error loading account data:", error); }
    finally { setDataLoading(false); }
  };
  useEffect(() => { if (user?.id) loadUserData(); }, [user?.id]);

  const handleSendChat = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !chatDraft.trim()) return;
    setChatSending(true);
    setChatError("");
    try {
      const name = profile?.full_name || fullName || user.email?.split("@")[0] || "Customer";
      const { data, error } = await sbSendCustomerChatMessage(user.id, name, user.email || "", chatDraft.trim());

      if (error) setChatError(typeof error === "object" && error && "message" in error ? (error as { message: string }).message : "Failed to send message.");
      else if (data) { setChatMessages((msgs) => [...msgs, data]); setChatDraft(""); }
    } catch { setChatError("Failed to send message."); }
    finally { setChatSending(false); }
  };

  const handleUpdateProfile = async (event: FormEvent) => {
    event.preventDefault(); if (!user) return;
    setProfileSaving(true); setProfileSuccess(""); setProfileError("");
    try {
      const { error } = await updateCustomerProfile(user.id, { full_name: fullName, phone });
      if (error) setProfileError(typeof error === "object" && error && "message" in error ? (error as { message: string }).message : "Failed to update profile.");
      else { await reloadProfile(); setProfileSuccess("Profile updated successfully!"); }
    } catch { setProfileError("An unexpected error occurred."); }
    finally { setProfileSaving(false); }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault(); setPasswordSuccess(""); setPasswordError("");
    if (newPassword.length < 6) return setPasswordError("Password must be at least 6 characters long.");
    if (newPassword !== confirmPassword) return setPasswordError("Passwords do not match.");
    setPasswordSaving(true);
    try {
      const { error } = await updateCustomerPassword(newPassword);
      if (error) setPasswordError(typeof error === "object" && error && "message" in error ? (error as { message: string }).message : "Unable to update password.");
      else { setPasswordSuccess("Password updated successfully!"); setNewPassword(""); setConfirmPassword(""); }
    } catch { setPasswordError("Failed to update password."); }
    finally { setPasswordSaving(false); }
  };

  const handleLogout = async () => { await logout(); navigate("/", { replace: true }); };
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "messages") logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [activeTab, chatMessages.length, dataLoading]);

  if (loading || !user) return <div aria-label="Loading" className="ios-spinner" role="status" />;

  const displayName = profile?.full_name || fullName || user.email?.split("@")[0] || "Customer";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "C";
  const tabItems: Array<{ id: AccountTab; label: string; count?: number }> = [
    { id: "profile", label: "Profile" },
    { id: "bookings", label: "Bookings", count: bookings.length },
    { id: "orders", label: "Orders", count: orders.length },
    { id: "messages", label: "Messages" },
    { id: "settings", label: "Security" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-3 pb-12 pt-4 sm:px-6 sm:pt-8">
      <PageMeta description="Manage your Mobicare account, view repair bookings, and track order history." title="My Account — Mobicare Device Recovery" />

      <Reveal>
        <section className="ios-leather mb-5 rounded-panel" id="account-profile-card">
          <div className="relative flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-4">
              <span aria-hidden="true" className="ios-avatar">{initials}</span>
              <div className="min-w-[9rem] flex-1">
                <h1 className="m-0 truncate text-2xl font-extrabold" style={{ textShadow: "0 -1px 0 rgba(0,0,0,.6)" }}>{displayName}</h1>
                <p className="m-0 truncate text-sm opacity-90">{user.email}</p>
                <span className="ios-pill mt-2 !text-[var(--ios-slate)]">Customer</span>
              </div>
              <button className="ios-btn ios-btn--red ios-btn--sm max-sm:w-full" type="button" onClick={handleLogout}><LogOut aria-hidden="true" className="size-4" />Sign out</button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile icon={Wrench} label="Bookings" value={bookings.length} />
              <StatTile icon={Package} label="Orders" value={orders.length} />
              <StatTile icon={MessageCircle} label="Messages" value={chatMessages.length} />
            </div>
          </div>
        </section>
      </Reveal>

      <div aria-label="Account sections" className="ios-segmented ios-segmented--scroll mb-5" role="tablist">
        {tabItems.map(({ id, label, count }) => (
          <button key={id} aria-controls={`account-panel-${id}`} aria-selected={activeTab === id} className={activeTab === id ? "is-selected" : ""} id={`account-tab-${id}`} role="tab" type="button" onClick={() => setActiveTab(id)}>
            {label}{typeof count === "number" && count > 0 ? ` (${count})` : ""}
          </button>
        ))}
      </div>

      <div aria-labelledby={`account-tab-${activeTab}`} id={`account-panel-${activeTab}`} key={activeTab} className="ios-page" role="tabpanel">
        {activeTab === "profile" && (
          <form onSubmit={handleUpdateProfile}>
            {profileSuccess && <IosNote><span>{profileSuccess}</span></IosNote>}
            {profileError && <div role="alert"><IosNote tone="warn"><span>{profileError}</span></IosNote></div>}
            <IosGroup footer="Keep your contact details current for repair notifications and orders. To change your email address, contact the shop." title="Contact information">
              <IosField disabled label="Email" value={user.email || ""} onChange={() => undefined} />
              <IosField autoComplete="name" disabled={profileSaving} label="Name" placeholder="Jane Doe" value={fullName} onChange={setFullName} />
              <IosField autoComplete="tel" disabled={profileSaving} inputMode="tel" label="Phone" placeholder="(618) 555-0199" type="tel" value={phone} onChange={setPhone} />
            </IosGroup>
            <button className="ios-btn ios-btn--green ios-btn--lg w-full sm:w-auto" disabled={profileSaving} type="submit">{profileSaving ? "Saving…" : "Save changes"}</button>

            <IosGroup className="mt-6" title="Help & policies">
              <Link className="ios-row ios-chevron" to="/shipping">Shipping</Link>
              <Link className="ios-row ios-chevron" to="/returns">Returns &amp; Exchanges</Link>
              <Link className="ios-row ios-chevron" to="/refunds">Refunds</Link>
              <Link className="ios-row ios-chevron" to="/privacy">Privacy</Link>
            </IosGroup>
          </form>
        )}

        {activeTab === "bookings" && (
          <>
            <SectionBar action={<RefreshButton busy={dataLoading} onClick={loadUserData} />} title="Repair bookings" />
            {dataLoading && bookings.length === 0 ? <LoadingBlock /> : bookings.length === 0 ? (
              <EmptyBlock action="Book a repair" color="red" description="You haven’t submitted any repair appointments yet." icon={Wrench} title="No bookings yet" onAction={() => navigate("/repairs")} />
            ) : (
              <div className="grid gap-4">{bookings.map((b) => <BookingTicket key={b.id} booking={b} />)}</div>
            )}
          </>
        )}

        {activeTab === "orders" && (
          <>
            <SectionBar action={<RefreshButton busy={dataLoading} onClick={loadUserData} />} title="Order history" />
            {dataLoading && orders.length === 0 ? <LoadingBlock /> : orders.length === 0 ? (
              <EmptyBlock action="Browse shop" color="orange" description="Your order history is currently empty." icon={Package} title="No orders yet" onAction={() => navigate("/shop")} />
            ) : (
              <>
                {orders.map((order) => <OrderCard key={order.id} order={order} />)}
                <p className="ios-group-footer">All sales are final. Defective items may be exchanged — see <Link className="underline" to="/returns">Returns &amp; Exchanges</Link>.</p>
              </>
            )}
          </>
        )}

        {activeTab === "messages" && (
          <>
            <SectionBar action={<RefreshButton busy={dataLoading} onClick={loadUserData} />} title="Messages" />
            <div className="overflow-hidden rounded-panel border border-[#6f7686] shadow-[var(--elev-2)]">
              <div ref={logRef} aria-live="polite" className="msgs-bg flex max-h-[460px] min-h-[260px] flex-col gap-2 overflow-y-auto px-2 py-3" role="log">
                {chatMessages.length === 0 ? (
                  <p className="m-auto max-w-[30ch] text-center text-sm font-bold text-[var(--ios-slate)]" style={{ textShadow: "0 1px 0 #fff" }}>No messages yet — send one below and the shop will reply here.</p>
                ) : chatMessages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.direction === "inbound" ? "items-end" : "items-start"}`}>
                    <div className={`msg ${m.direction === "inbound" ? "msg--me" : "msg--them"}`}>{m.body}</div>
                    <span className="mx-3 mt-0.5 text-[10px] font-bold text-[#6b7487]" style={{ textShadow: "0 1px 0 #fff" }}>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {chatError && <div className="bg-[#fbe9b8] px-3 py-2 text-sm font-bold text-[#6a4608]" role="alert">{chatError}</div>}
              <form className="msgs-input flex items-center gap-2 px-2 py-2" onSubmit={(e) => { play("send"); handleSendChat(e); }}>
                <input aria-label="Message the shop" className="msgs-field" disabled={chatSending} placeholder="Message" value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} />
                <button aria-label="Send" className="ios-btn ios-btn--sm !min-h-8 !rounded-full" data-silent disabled={chatSending || !chatDraft.trim()} type="submit"><Send aria-hidden="true" className="size-3.5" />Send</button>
              </form>
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <form onSubmit={handleChangePassword}>
            {passwordSuccess && <IosNote><span>{passwordSuccess}</span></IosNote>}
            {passwordError && <div role="alert"><IosNote tone="warn"><span>{passwordError}</span></IosNote></div>}
            <IosGroup footer="Use at least 6 characters. Choose something unique to Mobicare." title="Change password">
              <IosField autoComplete="new-password" disabled={passwordSaving} label="New" placeholder="Required" required type="password" value={newPassword} onChange={setNewPassword} />
              <IosField autoComplete="new-password" disabled={passwordSaving} label="Confirm" placeholder="Required" required type="password" value={confirmPassword} onChange={setConfirmPassword} />
            </IosGroup>
            <button className="ios-btn ios-btn--lg w-full sm:w-auto" disabled={passwordSaving} type="submit">{passwordSaving ? "Updating…" : "Update password"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="ios-stat">
      <Icon aria-hidden="true" className="size-4" />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SectionBar({ title, action }: { title: string; action: ReactNode }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><h2 className="ios-section-title !text-xl">{title}</h2>{action}</div>;
}

function RefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return <button className="ios-btn ios-btn--gray ios-btn--sm" disabled={busy} type="button" onClick={onClick}><RefreshCw aria-hidden="true" className={`size-3.5 ${busy ? "animate-spin" : ""}`} />Refresh</button>;
}

function LoadingBlock() { return <div aria-label="Loading" className="ios-spinner !mt-12" role="status" />; }

function EmptyBlock({ icon, color, title, description, action, onAction }: { icon: LucideIcon; color: IconColor; title: string; description: string; action: string; onAction: () => void }) {
  return (
    <div className="ios-card-gloss surface-raised flex flex-col items-center gap-3 rounded-panel p-8 text-center">
      <AppIcon color={color} icon={icon} size={72} />
      <h3 className="letterpress m-0 text-lg font-extrabold text-[var(--ios-ink)]">{title}</h3>
      <p className="m-0 max-w-xs text-sm text-muted">{description}</p>
      <button className="ios-btn ios-btn--green" type="button" onClick={onAction}>{action}</button>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = { completed: "green", delivered: "green", cancelled: "red", refunded: "red", payment_failed: "red", shipped: "blue", processing: "blue" };

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] || "orange";

  return <span className={`ios-status ios-status--${tone}`}>{status.replace(/_/g, " ")}</span>;
}

function OrderCard({ order }: { order: Order }) {
  return (
    <IosGroup className="!mb-4" title={`Order #${order.id.slice(0, 8).toUpperCase()}${order.createdAt ? ` · ${new Date(order.createdAt).toLocaleDateString()}` : ""}`}>
      <div className="ios-row justify-between"><span className="text-sm font-bold text-[var(--ios-slate)]">Status</span><StatusBadge status={order.status} /></div>
      {order.items?.map((item, i) => (
        <div key={i} className="ios-row justify-between gap-4 !py-2.5 text-[14px]">
          <span className="min-w-0">{item.name} <span className="text-muted">× {item.qty}</span></span>
          <strong className="shrink-0">${(item.price * item.qty).toFixed(2)}</strong>
        </div>
      ))}
      <IosSummaryRow label="Total" value={<span className="text-base text-[var(--ios-blue-dark)]">${order.total?.toFixed(2) || "0.00"}</span>} />
    </IosGroup>
  );
}

function BookingTicket({ booking }: { booking: BookingRecord }) {
  const ticketNumber = `MC-${String(booking.id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase().padStart(8, "0")}`;
  const status = booking.status || "pending";

  return (
    <article className="ios-ticket">
      <header className="ios-ticket-head">
        <div>
          <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Mobicare • Repair Ticket</p>
          <p className="m-0 mt-0.5 font-mono text-lg font-black tracking-tight">#{ticketNumber}</p>
        </div>
        <StatusBadge status={status} />
      </header>
      <div className="ios-ticket-body">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Service</p>
          <h3 className="m-0 mt-0.5 text-lg font-extrabold text-[var(--ios-ink)]">{booking.service}</h3>
          <p className="m-0 mt-0.5 text-sm font-semibold">{booking.device_type}{booking.device_model ? ` — ${booking.device_model}` : ""}</p>
          {booking.issue && <p className="m-0 mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{booking.issue}</p>}
        </div>
        <div className="ios-ticket-when">
          <div><p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Date</p><p className="m-0 mt-0.5 text-sm font-extrabold">{booking.appt_date}</p></div>
          <div><p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Time</p><p className="m-0 mt-0.5 flex items-center gap-1 text-sm font-extrabold"><Clock aria-hidden="true" className="size-3.5 text-[var(--ios-blue)]" />{booking.appt_time}</p></div>
        </div>
      </div>
      <footer className="ios-ticket-foot">
        <span className="text-xs font-bold text-muted">{booking.visit_type === "home" ? "Home visit" : "In-store"} appointment</span>
        <div aria-hidden="true" className="flex h-6 items-end gap-px opacity-60">{Array.from({ length: 30 }, (_, i) => <span key={i} className={`w-px bg-[#1f2430] ${i % 4 === 0 ? "h-6" : i % 3 === 0 ? "h-4" : "h-3"}`} />)}</div>
      </footer>
    </article>
  );
}
