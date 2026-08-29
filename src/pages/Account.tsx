import type { BookingRecord, Order } from "../types/domain";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, Clock, Key, LogOut, Mail, Package, Phone, RefreshCw, ShieldCheck, User, Wrench, AlertTriangle, ArrowRight } from "lucide-react";
import { Alert, Button, Card, Chip, FieldError, Form, InputGroup, Label, Spinner, Tabs, TextField } from "@heroui/react";
import { useAuth } from "../lib/AuthContext";
import { updateCustomerProfile, updateCustomerPassword, sbFetchCustomerBookings, sbFetchCustomerOrders } from "../lib/supabase";
import PageMeta from "../components/PageMeta";

type AccountTab = "profile" | "bookings" | "orders" | "settings";

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
      const [ordersRes, bookingsRes] = await Promise.all([sbFetchCustomerOrders(user.id), sbFetchCustomerBookings(user.id)]);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (bookingsRes.data) setBookings(bookingsRes.data as BookingRecord[]);
    } catch (error) { console.error("Error loading account data:", error); }
    finally { setDataLoading(false); }
  };
  useEffect(() => { if (user?.id) loadUserData(); }, [user?.id]);

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
  if (loading || !user) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  const displayName = profile?.full_name || fullName || user.email?.split("@")[0] || "Customer";
  const tabItems = [
    { id: "profile" as const, label: "Profile", description: "Contact information", icon: User },
    { id: "bookings" as const, label: "Bookings", description: "Repair appointments", count: bookings.length, icon: Wrench },
    { id: "orders" as const, label: "Orders", description: "Shopping history", count: orders.length, icon: Package },
    { id: "settings" as const, label: "Security", description: "Password & security", icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <PageMeta description="Manage your Mobicare account, view repair bookings, and track order history." title="My Account — Mobicare Device Recovery" />

      <section className="mb-5 overflow-hidden rounded-[28px] border border-border bg-surface shadow-sm sm:mb-7">
        <div className="bg-accent-soft/60 px-4 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm sm:size-14"><User className="size-6 sm:size-7" /></div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Hello, {displayName}</h1>
                  <Chip size="sm" variant="soft"><Chip.Label>Customer</Chip.Label></Chip>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
              </div>
            </div>
            <Button className="min-h-10 w-full sm:w-auto" variant="outline" onPress={handleLogout}><LogOut aria-hidden="true" className="size-4" /><span>Sign Out</span></Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border sm:grid-cols-3">
          <SummaryStat icon={<Wrench className="size-4" />} label="Bookings" value={bookings.length} />
          <SummaryStat icon={<Package className="size-4" />} label="Orders" value={orders.length} />
          <div className="col-span-2 hidden sm:col-span-1 sm:block"><SummaryStat icon={<ShieldCheck className="size-4" />} label="Account" value="Active" /></div>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3" aria-label="Account actions">
        {tabItems.map(({ id, label, description, count, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button key={id} type="button" aria-pressed={selected} onClick={() => setActiveTab(id)} className={`group min-w-0 rounded-2xl border p-3.5 text-left transition-all sm:p-4 ${selected ? "border-accent bg-accent-soft shadow-sm" : "border-border bg-surface hover:border-accent/50 hover:bg-surface-secondary"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-accent"}`}><Icon aria-hidden="true" className="size-4" /></span>
                {typeof count === "number" && <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-bold text-muted">{count}</span>}
              </div>
              <strong className="mt-3 block truncate text-sm font-bold text-foreground">{label}</strong>
              <span className="mt-0.5 block truncate text-[11px] text-muted">{description}</span>
            </button>
          );
        })}
      </div>

      <Tabs className="w-full" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key) as AccountTab)} variant="secondary">
        <Tabs.ListContainer className="sr-only">
          <Tabs.List aria-label="Account sections">
            {tabItems.map(({ id, label }) => <Tabs.Tab key={id} id={id}>{label}<Tabs.Indicator /></Tabs.Tab>)}
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="profile">
          <Card className="rounded-[24px] p-4 sm:p-7">
            <Card.Header className="pb-5"><Card.Title className="text-xl font-bold">Contact Information</Card.Title><Card.Description>Keep your contact details current for repair notifications and orders.</Card.Description></Card.Header>
            <Card.Content>
              {profileSuccess && <Alert className="mb-4" status="success"><Alert.Indicator><CheckCircle2 className="size-4" /></Alert.Indicator><Alert.Content><Alert.Description>{profileSuccess}</Alert.Description></Alert.Content></Alert>}
              {profileError && <Alert className="mb-4" status="danger"><Alert.Indicator><AlertTriangle className="size-4" /></Alert.Indicator><Alert.Content><Alert.Description>{profileError}</Alert.Description></Alert.Content></Alert>}
              <Form className="grid grid-cols-1 gap-5 sm:grid-cols-2" onSubmit={handleUpdateProfile}>
                <TextField isDisabled className="flex flex-col gap-1.5 sm:col-span-2"><Label>Email Address</Label><InputGroup><InputGroup.Prefix><Mail aria-hidden="true" className="size-4 text-muted" /></InputGroup.Prefix><InputGroup.Input value={user.email || ""} /></InputGroup><span className="text-xs text-muted">Email address cannot be changed directly.</span></TextField>
                <TextField className="flex flex-col gap-1.5" isDisabled={profileSaving} value={fullName} onChange={setFullName}><Label>Full Name</Label><InputGroup><InputGroup.Prefix><User aria-hidden="true" className="size-4" /></InputGroup.Prefix><InputGroup.Input placeholder="John Doe" /></InputGroup><FieldError /></TextField>
                <TextField className="flex flex-col gap-1.5" isDisabled={profileSaving} type="tel" value={phone} onChange={setPhone}><Label>Phone Number</Label><InputGroup><InputGroup.Prefix><Phone aria-hidden="true" className="size-4" /></InputGroup.Prefix><InputGroup.Input placeholder="(618) 555-0199" /></InputGroup><FieldError /></TextField>
                <Button className="min-h-11 w-full sm:w-auto" isDisabled={profileSaving} type="submit" variant="primary">{profileSaving ? <><Spinner size="sm" /><span>Saving...</span></> : <span>Save Changes</span>}</Button>
              </Form>
            </Card.Content>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="bookings">
          <AccountSectionHeader title="Your Repair Bookings" action="Refresh" icon={<RefreshCw className="size-3.5" />} onAction={loadUserData} />
          {dataLoading ? <LoadingCard /> : bookings.length === 0 ? <EmptyCard icon={<Wrench className="size-10" />} title="No bookings yet" description="You haven’t submitted any repair appointments yet." action="Book a Repair" onAction={() => navigate("/repairs")} /> : <div className="grid grid-cols-1 gap-4">{bookings.map((booking) => <BookingTicket key={booking.id} booking={booking} />)}</div>}
        </Tabs.Panel>

        <Tabs.Panel id="orders">
          <AccountSectionHeader title="Order History" action="Refresh" icon={<RefreshCw className="size-3.5" />} onAction={loadUserData} />
          {dataLoading ? <LoadingCard /> : orders.length === 0 ? <EmptyCard icon={<Package className="size-10" />} title="No orders yet" description="Your order history is currently empty." action="Browse Shop" onAction={() => navigate("/shop")} /> : <div className="grid grid-cols-1 gap-3">{orders.map((order) => <Card key={order.id} className="rounded-[22px] p-4 transition-shadow hover:shadow-md sm:p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3"><div><span className="text-xs font-semibold text-muted">Order ID</span><p className="font-mono text-sm font-bold text-foreground">#{order.id.slice(0, 8)}</p></div><div className="text-right"><Chip color={order.status === "delivered" ? "success" : order.status === "cancelled" || order.status === "refunded" ? "danger" : "warning"} size="sm" variant="soft"><Chip.Label className="capitalize">{order.status}</Chip.Label></Chip><p className="mt-1 text-xs text-muted">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</p></div></div><div className="flex flex-col gap-2">{order.items?.map((item, index) => <div key={index} className="flex items-start justify-between gap-4 text-sm"><span className="min-w-0 text-foreground">{item.name} <span className="text-muted">× {item.qty}</span></span><span className="shrink-0 font-semibold text-foreground">${(item.price * item.qty).toFixed(2)}</span></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm"><span className="font-bold text-foreground">Total</span><span className="text-base font-bold text-accent">${order.total?.toFixed(2) || "0.00"}</span></div></Card>)}</div>}
        </Tabs.Panel>

        <Tabs.Panel id="settings">
          <Card className="rounded-[24px] p-4 sm:p-7"><Card.Header className="pb-5"><Card.Title className="text-xl font-bold">Account Security</Card.Title><Card.Description>Change your password to keep your Mobicare account secure.</Card.Description></Card.Header><Card.Content>
            {passwordSuccess && <Alert className="mb-4" status="success"><Alert.Indicator><CheckCircle2 className="size-4" /></Alert.Indicator><Alert.Content><Alert.Description>{passwordSuccess}</Alert.Description></Alert.Content></Alert>}
            {passwordError && <Alert className="mb-4" status="danger"><Alert.Indicator><AlertTriangle className="size-4" /></Alert.Indicator><Alert.Content><Alert.Description>{passwordError}</Alert.Description></Alert.Content></Alert>}
            <Form className="grid grid-cols-1 gap-5 sm:max-w-2xl sm:grid-cols-2" onSubmit={handleChangePassword}>
              <TextField isRequired className="flex flex-col gap-1.5" isDisabled={passwordSaving} type="password" value={newPassword} onChange={setNewPassword}><Label>New Password</Label><InputGroup><InputGroup.Prefix><Key aria-hidden="true" className="size-4" /></InputGroup.Prefix><InputGroup.Input placeholder="••••••••" /></InputGroup><FieldError /></TextField>
              <TextField isRequired className="flex flex-col gap-1.5" isDisabled={passwordSaving} type="password" value={confirmPassword} onChange={setConfirmPassword}><Label>Confirm New Password</Label><InputGroup><InputGroup.Prefix><Key aria-hidden="true" className="size-4" /></InputGroup.Prefix><InputGroup.Input placeholder="••••••••" /></InputGroup><FieldError /></TextField>
              <Button className="min-h-11 w-full sm:w-auto" isDisabled={passwordSaving} type="submit" variant="primary">{passwordSaving ? <><Spinner size="sm" /><span>Updating Password...</span></> : <span>Update Password</span>}</Button>
            </Form>
          </Card.Content></Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function BookingTicket({ booking }: { booking: BookingRecord }) {
  const ticketNumber = `MC-${String(booking.id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase().padStart(8, "0")}`;
  const status = booking.status || "pending";
  const statusColor = status === "completed" ? "success" : status === "cancelled" ? "danger" : "warning";
  return (
    <Card className="relative overflow-hidden rounded-[24px] border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="pointer-events-none absolute -left-3 top-[42%] size-6 rounded-full border border-border bg-background" />
      <div className="pointer-events-none absolute -right-3 top-[42%] size-6 rounded-full border border-border bg-background" />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Mobicare • Repair Ticket</p>
            <p className="m-0 mt-1 font-mono text-xl font-black tracking-tight text-foreground">#{ticketNumber}</p>
          </div>
          <Chip color={statusColor} size="sm" variant="soft"><Chip.Label className="capitalize">{status}</Chip.Label></Chip>
        </div>

        <div className="my-4 border-t border-dashed border-border" />

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-muted">Service</p>
            <h3 className="m-0 mt-1 text-lg font-extrabold text-foreground">{booking.service}</h3>
            <p className="m-0 mt-1 text-sm font-medium text-foreground">{booking.device_type}{booking.device_model ? ` — ${booking.device_model}` : ""}</p>
            {booking.issue && <p className="m-0 mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{booking.issue}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-3 sm:min-w-[180px] sm:grid-cols-1 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0">
            <div><p className="m-0 text-[10px] font-bold uppercase tracking-wider text-muted">Date</p><p className="m-0 mt-1 text-sm font-bold text-foreground">{booking.appt_date}</p></div>
            <div><p className="m-0 text-[10px] font-bold uppercase tracking-wider text-muted">Time</p><p className="m-0 mt-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><Clock aria-hidden="true" className="size-3.5 text-accent" />{booking.appt_time}</p></div>
          </div>
        </div>

        <div className="my-4 border-t border-dashed border-border" />
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted"><Calendar aria-hidden="true" className="size-3.5" /><span>Appointment ticket</span></div>
          <div aria-hidden="true" className="flex h-7 items-end gap-px opacity-50">{Array.from({ length: 28 }, (_, i) => <span key={i} className={`w-px bg-foreground ${i % 4 === 0 ? "h-7" : i % 3 === 0 ? "h-5" : "h-3"}`} />)}</div>
        </div>
      </div>
    </Card>
  );
}

function SummaryStat({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <div className="flex items-center gap-2.5 px-4 py-3.5 sm:px-6"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">{icon}</span><div className="min-w-0"><p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p><p className="m-0 text-sm font-bold text-foreground">{value}</p></div></div>;
}

function AccountSectionHeader({ title, action, icon, onAction }: { title: string; action: string; icon: ReactNode; onAction: () => void }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2><p className="mt-0.5 text-xs text-muted">Your latest activity with Mobicare.</p></div><Button className="min-h-10 shrink-0" size="sm" variant="outline" onPress={onAction}>{icon}<span className="hidden min-[420px]:inline">{action}</span></Button></div>;
}

function LoadingCard() { return <div className="flex min-h-[220px] items-center justify-center rounded-[22px] border border-border bg-surface p-8"><Spinner /></div>; }
function EmptyCard({ icon, title, description, action, onAction }: { icon: ReactNode; title: string; description: string; action: string; onAction: () => void }) { return <Card className="rounded-[24px] p-7 text-center sm:p-10"><div aria-hidden="true" className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</div><h3 className="text-lg font-bold text-foreground">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p><Button className="mt-5 min-h-11" variant="primary" onPress={onAction}>{action}<ArrowRight aria-hidden="true" className="size-4" /></Button></Card>; }