import type { BookingRecord, CustomerChatMessage, Order } from "../types/domain";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, RefreshCw } from "lucide-react";
import { Alert } from "@/components/arc/alert/alert";
import { Avatar } from "@/components/arc/avatar/avatar";
import { Badge, type BadgeTone } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { ChatComposer, ChatThread, type ChatMessage } from "@/components/arc/chat-thread/chat-thread";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { Input } from "@/components/arc/input/input";
import { PasswordField } from "@/components/arc/password-field/password-field";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Skeleton } from "@/components/arc/skeleton/skeleton";

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

  const sendChat = async (text: string) => {
    const body = text.trim();

    if (!user || !body) return;
    setChatSending(true);
    setChatError("");
    try {
      const name = profile?.full_name || fullName || user.email?.split("@")[0] || "Customer";
      const { data, error } = await sbSendCustomerChatMessage(user.id, name, user.email || "", body);

      if (error) setChatError(typeof error === "object" && error && "message" in error ? (error as { message: string }).message : "Failed to send message.");
      else if (data) setChatMessages((msgs) => [...msgs, data]);
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

  if (loading || !user) return <div aria-label="Loading" className="mc-spinner" role="status" />;

  const displayName = profile?.full_name || fullName || user.email?.split("@")[0] || "Customer";
  const tabs = [
    { value: "profile", label: "Profile" },
    { value: "bookings", label: `Bookings${bookings.length ? ` (${bookings.length})` : ""}` },
    { value: "orders", label: `Orders${orders.length ? ` (${orders.length})` : ""}` },
    { value: "messages", label: "Messages" },
    { value: "settings", label: "Security" },
  ];
  const thread: ChatMessage[] = chatMessages.map((m) => ({ id: String(m.id), authorId: m.direction === "inbound" ? "me" : "shop", text: m.body, createdAt: m.created_at, status: m.direction === "inbound" ? "delivered" : undefined }));

  return (
    <div className="mc-page mc-section mc-narrow" id="account-page" style={{ marginInline: "auto" }}>
      <PageMeta description="Manage your Mobicare account, view repair bookings, and track order history." title="My account | Mobicare Device Recovery" />

      <div className="mc-stack" style={{ gap: "var(--space-8)" }}>
        <header className="mc-profile" id="account-profile-card">
          <Avatar name={displayName} size="xl" />
          <div style={{ flex: 1, minWidth: "10rem" }}>
            <h1 className="mc-h2" style={{ overflowWrap: "anywhere" }}>{displayName}</h1>
            <p className="mc-small" style={{ overflowWrap: "anywhere" }}>{user.email}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}><LogOut aria-hidden="true" size={16} strokeWidth={1.75} />Sign out</Button>
        </header>

        <div className="mc-stats">
          <div className="mc-stat"><strong>{bookings.length}</strong><span>Bookings</span></div>
          <div className="mc-stat"><strong>{orders.length}</strong><span>Orders</span></div>
          <div className="mc-stat"><strong>{chatMessages.length}</strong><span>Messages</span></div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <SegmentedControl label="Account sections" options={tabs} value={activeTab} onValueChange={(v) => setActiveTab(v as AccountTab)} />
        </div>

        {activeTab === "profile" && (
          <form className="mc-form" onSubmit={handleUpdateProfile}>
            {profileSuccess && <Alert title={profileSuccess} tone="success" />}
            {profileError && <Alert title={profileError} tone="danger" />}
            <h2 className="mc-h3">Contact information</h2>
            <Input description="To change your email address, contact the shop." disabled label="Email" value={user.email || ""} readOnly />
            <div className="mc-form-2">
              <Input autoComplete="name" disabled={profileSaving} label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input autoComplete="tel" disabled={profileSaving} inputMode="tel" label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="mc-actions"><Button loading={profileSaving} type="submit">Save changes</Button></div>

            <h2 className="mc-h3" style={{ marginTop: "var(--space-6)" }}>Help and policies</h2>
            <div className="mc-group">
              <Link className="mc-item mc-item--between" to="/shipping">Shipping</Link>
              <Link className="mc-item mc-item--between" to="/returns">Returns and exchanges</Link>
              <Link className="mc-item mc-item--between" to="/refunds">Refunds</Link>
              <Link className="mc-item mc-item--between" to="/privacy">Privacy</Link>
            </div>
          </form>
        )}

        {activeTab === "bookings" && (
          <section aria-label="Repair bookings" className="mc-stack">
            <div className="mc-section-head--row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="mc-h3">Repair bookings</h2>
              <Button loading={dataLoading} size="sm" variant="secondary" onClick={loadUserData}><RefreshCw aria-hidden="true" size={14} strokeWidth={1.75} />Refresh</Button>
            </div>
            {dataLoading && bookings.length === 0 ? <Skeleton lines={4} /> : bookings.length === 0 ? (
              <EmptyState action={<Button onClick={() => navigate("/repairs")}>Book a repair</Button>} description="You haven't submitted any repair appointments yet." title="No bookings yet" />
            ) : bookings.map((b) => <BookingTicket key={b.id} booking={b} />)}
          </section>
        )}

        {activeTab === "orders" && (
          <section aria-label="Order history" className="mc-stack">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="mc-h3">Order history</h2>
              <Button loading={dataLoading} size="sm" variant="secondary" onClick={loadUserData}><RefreshCw aria-hidden="true" size={14} strokeWidth={1.75} />Refresh</Button>
            </div>
            {dataLoading && orders.length === 0 ? <Skeleton lines={4} /> : orders.length === 0 ? (
              <EmptyState action={<Button onClick={() => navigate("/shop")}>Browse the shop</Button>} description="Your order history is currently empty." title="No orders yet" />
            ) : (
              <>
                {orders.map((order) => <OrderCard key={order.id} order={order} />)}
                <p className="mc-small">All sales are final. Defective items may be exchanged. See <Link className="mc-link" to="/returns">returns and exchanges</Link>.</p>
              </>
            )}
          </section>
        )}

        {activeTab === "messages" && (
          <section aria-label="Messages" className="mc-stack">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="mc-h3">Messages</h2>
              <Button loading={dataLoading} size="sm" variant="secondary" onClick={loadUserData}><RefreshCw aria-hidden="true" size={14} strokeWidth={1.75} />Refresh</Button>
            </div>
            <div className="mc-card mc-card--flush" style={{ display: "flex", flexDirection: "column", height: "min(32rem, 70dvh)" }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                {thread.length === 0
                  ? <p className="mc-small" style={{ padding: "var(--space-8)", textAlign: "center" }}>No messages yet. Send one below and the shop will reply here.</p>
                  : <ChatThread composer={false} currentUserId="me" label="Conversation with the shop" messages={thread} participants={[{ id: "me", name: displayName }, { id: "shop", name: "Mobicare" }]} />}
              </div>
              {chatError && <Alert title={chatError} tone="danger" />}
              <div style={{ padding: "var(--space-3) var(--space-4) var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
                <ChatComposer allowAttachments={false} disabled={chatSending} placeholder="Message the shop" onSend={(d) => sendChat(d.text)} />
              </div>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <form className="mc-form" onSubmit={handleChangePassword} style={{ maxWidth: "28rem" }}>
            {passwordSuccess && <Alert title={passwordSuccess} tone="success" />}
            {passwordError && <Alert title={passwordError} tone="danger" />}
            <h2 className="mc-h3">Change password</h2>
            <PasswordField autoComplete="new-password" description="Use at least 6 characters." disabled={passwordSaving} label="New password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <PasswordField autoComplete="new-password" disabled={passwordSaving} label="Confirm new password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <div className="mc-actions"><Button loading={passwordSaving} type="submit">Update password</Button></div>
          </form>
        )}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, BadgeTone> = { completed: "success", delivered: "success", cancelled: "danger", refunded: "danger", payment_failed: "danger", shipped: "info", processing: "info" };

function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] || "warning"}>{status.replace(/_/g, " ")}</Badge>;
}

function OrderCard({ order }: { order: Order }) {
  return (
    <article className="mc-card mc-card--flush">
      <header className="mc-item mc-item--between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span>
          <strong className="mc-strong">Order #{order.id.slice(0, 8).toUpperCase()}</strong>
          {order.createdAt && <span className="mc-small" style={{ display: "block" }}>{new Date(order.createdAt).toLocaleDateString()}</span>}
        </span>
        <StatusBadge status={order.status} />
      </header>
      <div className="mc-group" style={{ border: 0, borderRadius: 0 }}>
        {order.items?.map((item, i) => (
          <div key={i} className="mc-item mc-item--between">
            <span>{item.name} <span className="mc-small">x {item.qty}</span></span>
            <span className="mc-num">${(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="mc-item mc-item--between"><span className="mc-strong">Total</span><span className="mc-price">${order.total?.toFixed(2) || "0.00"}</span></div>
      </div>
    </article>
  );
}

function BookingTicket({ booking }: { booking: BookingRecord }) {
  const ticketNumber = `MC-${String(booking.id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase().padStart(8, "0")}`;

  return (
    <article className="mc-ticket">
      <header className="mc-ticket-head">
        <div>
          <p className="mc-small">Repair ticket</p>
          <p className="mc-strong mc-num" style={{ margin: 0, fontSize: "var(--text-lg)" }}>#{ticketNumber}</p>
        </div>
        <StatusBadge status={booking.status || "pending"} />
      </header>
      <div>
        <h3 className="mc-h3">{booking.service}</h3>
        <p className="mc-text">{booking.device_type}{booking.device_model ? `, ${booking.device_model}` : ""}</p>
        {booking.issue && <p className="mc-small" style={{ marginTop: "var(--space-2)" }}>{booking.issue}</p>}
      </div>
      <div className="mc-ticket-meta">
        <div className="mc-kv"><small>Date</small><span>{booking.appt_date}</span></div>
        <div className="mc-kv"><small>Time</small><span>{booking.appt_time}</span></div>
        <div className="mc-kv"><small>Visit</small><span>{booking.visit_type === "home" ? "Home visit" : "In-store"}</span></div>
      </div>
    </article>
  );
}
