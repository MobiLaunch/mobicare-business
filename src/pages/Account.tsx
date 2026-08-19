import type { BookingRecord, Order } from "../types/domain";

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Key,
  LogOut,
  Mail,
  Package,
  Phone,
  ShieldCheck,
  User,
  Wrench,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  FieldError,
  Form,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";

import { useAuth } from "../lib/AuthContext";
import {
  updateCustomerProfile,
  updateCustomerPassword,
  sbFetchCustomerBookings,
  sbFetchCustomerOrders,
} from "../lib/supabase";
import PageMeta from "../components/PageMeta";

export default function Account() {
  const { user, profile, loading, reloadProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "profile" | "orders" | "bookings" | "settings"
  >("profile");

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Orders & Bookings state
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  // Sync profile fields
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    } else if (user?.user_metadata) {
      setFullName(user.user_metadata.full_name || "");
      setPhone(user.user_metadata.phone || "");
    }
  }, [profile, user]);

  // Fetch orders and bookings
  const loadUserData = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [ordersRes, bookingsRes] = await Promise.all([
        sbFetchCustomerOrders(user.id),
        sbFetchCustomerBookings(user.id),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (bookingsRes.data) setBookings(bookingsRes.data as BookingRecord[]);
    } catch (err) {
      console.error("Error loading account data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      const { error } = await updateCustomerProfile(user.id, {
        full_name: fullName,
        phone,
      });

      if (error) {
        setProfileError(
          typeof error === "object" && error && "message" in error
            ? (error as { message: string }).message
            : "Failed to update profile.",
        );
      } else {
        await reloadProfile();
        setProfileSuccess("Profile updated successfully!");
      }
    } catch {
      setProfileError("An unexpected error occurred.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");

      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");

      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await updateCustomerPassword(newPassword);

      if (error) {
        setPasswordError(
          typeof error === "object" && error && "message" in error
            ? (error as { message: string }).message
            : "Unable to update password.",
        );
      } else {
        setPasswordSuccess("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordError("Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const displayName =
    profile?.full_name || fullName || user.email?.split("@")[0] || "Customer";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        description="Manage your Mobicare account, view repair bookings, and track order history."
        title="My Account — Mobicare Device Recovery"
      />

      {/* Header Banner */}
      <Card className="mb-8 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <User className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Hello, {displayName}
                </h1>
                <Chip size="sm" variant="soft">
                  <Chip.Label>Customer</Chip.Label>
                </Chip>
              </div>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>

          <Button variant="outline" onPress={handleLogout}>
            <LogOut className="size-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="mb-8 flex overflow-x-auto border-b border-border">
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "profile"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          type="button"
          onClick={() => setActiveTab("profile")}
        >
          <User className="size-4" />
          <span>Profile Details</span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "bookings"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          type="button"
          onClick={() => setActiveTab("bookings")}
        >
          <Wrench className="size-4" />
          <span>My Bookings ({bookings.length})</span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "orders"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          type="button"
          onClick={() => setActiveTab("orders")}
        >
          <Package className="size-4" />
          <span>Order History ({orders.length})</span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "settings"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          type="button"
          onClick={() => setActiveTab("settings")}
        >
          <ShieldCheck className="size-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* TAB CONTENT: PROFILE */}
      {activeTab === "profile" && (
        <Card className="p-6 sm:p-8">
          <Card.Header className="pb-4">
            <Card.Title className="text-xl">Contact Information</Card.Title>
            <Card.Description>
              Update your personal contact details for repair notifications and
              orders.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {profileSuccess && (
              <Alert className="mb-4" status="success">
                <Alert.Indicator>
                  <CheckCircle2 className="size-4" />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>{profileSuccess}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {profileError && (
              <Alert className="mb-4" status="danger">
                <Alert.Indicator>
                  <AlertTriangle className="size-4" />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>{profileError}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Form
              className="flex flex-col gap-5"
              onSubmit={handleUpdateProfile}
            >
              <TextField isDisabled className="flex flex-col gap-1.5">
                <Label>Email Address</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <Mail className="size-4 text-muted" />
                  </InputGroup.Prefix>
                  <InputGroup.Input value={user.email || ""} />
                </InputGroup>
                <span className="text-xs text-muted">
                  Email address cannot be changed directly.
                </span>
              </TextField>

              <TextField
                className="flex flex-col gap-1.5"
                isDisabled={profileSaving}
                value={fullName}
                onChange={setFullName}
              >
                <Label>Full Name</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <User className="size-4" />
                  </InputGroup.Prefix>
                  <InputGroup.Input placeholder="John Doe" />
                </InputGroup>
                <FieldError />
              </TextField>

              <TextField
                className="flex flex-col gap-1.5"
                isDisabled={profileSaving}
                type="tel"
                value={phone}
                onChange={setPhone}
              >
                <Label>Phone Number</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <Phone className="size-4" />
                  </InputGroup.Prefix>
                  <InputGroup.Input placeholder="(618) 555-0199" />
                </InputGroup>
                <FieldError />
              </TextField>

              <div className="pt-2">
                <Button
                  isDisabled={profileSaving}
                  type="submit"
                  variant="primary"
                >
                  {profileSaving ? (
                    <>
                      <Spinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </Button>
              </div>
            </Form>
          </Card.Content>
        </Card>
      )}

      {/* TAB CONTENT: BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              Your Repair Bookings
            </h2>
            <Button size="sm" variant="outline" onPress={loadUserData}>
              <RefreshCw className="size-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          {dataLoading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-surface p-8">
              <Spinner />
            </div>
          ) : bookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Wrench className="mx-auto mb-3 size-10 text-muted" />
              <h3 className="text-lg font-semibold text-foreground">
                No bookings found
              </h3>
              <p className="mt-1 text-sm text-muted">
                You haven&rsquo;t submitted any repair appointments yet.
              </p>
              <div className="mt-4">
                <Button variant="primary" onPress={() => navigate("/repairs")}>
                  Book a Repair
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Wrench className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground">
                            {booking.service}
                          </h3>
                          <Chip
                            color={
                              booking.status === "completed"
                                ? "success"
                                : booking.status === "cancelled"
                                  ? "danger"
                                  : "warning"
                            }
                            size="sm"
                            variant="soft"
                          >
                            <Chip.Label className="capitalize">
                              {booking.status || "Pending"}
                            </Chip.Label>
                          </Chip>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {booking.device_type}{" "}
                          {booking.device_model
                            ? `— ${booking.device_model}`
                            : ""}
                        </p>
                        {booking.issue && (
                          <p className="mt-1 text-xs text-muted">
                            Issue: {booking.issue}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-border pt-3 text-right sm:border-t-0 sm:pt-0">
                      <div className="flex items-center justify-end gap-1.5 text-xs text-muted">
                        <Calendar className="size-3.5" />
                        <span>{booking.appt_date}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-xs text-muted">
                        <Clock className="size-3.5" />
                        <span>{booking.appt_time}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === "orders" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Order History</h2>
            <Button size="sm" variant="outline" onPress={loadUserData}>
              <RefreshCw className="size-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          {dataLoading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-surface p-8">
              <Spinner />
            </div>
          ) : orders.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="mx-auto mb-3 size-10 text-muted" />
              <h3 className="text-lg font-semibold text-foreground">
                No orders yet
              </h3>
              <p className="mt-1 text-sm text-muted">
                Your order history is currently empty.
              </p>
              <div className="mt-4">
                <Button variant="primary" onPress={() => navigate("/shop")}>
                  Browse Shop
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => (
                <Card key={order.id} className="p-5">
                  <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="text-xs font-semibold text-muted">
                        Order ID
                      </span>
                      <p className="font-mono text-sm font-bold text-foreground">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Chip
                        color={
                          order.status === "completed" ? "success" : "default"
                        }
                        size="sm"
                        variant="soft"
                      >
                        <Chip.Label className="capitalize">
                          {order.status}
                        </Chip.Label>
                      </Chip>
                      <p className="mt-1 text-xs text-muted">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {item.name}{" "}
                          <span className="text-muted">× {item.qty}</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="text-base font-bold text-accent">
                      ${order.total?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SECURITY */}
      {activeTab === "settings" && (
        <Card className="p-6 sm:p-8">
          <Card.Header className="pb-4">
            <Card.Title className="text-xl">Change Password</Card.Title>
            <Card.Description>
              Ensure your account is using a strong password.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {passwordSuccess && (
              <Alert className="mb-4" status="success">
                <Alert.Indicator>
                  <CheckCircle2 className="size-4" />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>{passwordSuccess}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {passwordError && (
              <Alert className="mb-4" status="danger">
                <Alert.Indicator>
                  <AlertTriangle className="size-4" />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>{passwordError}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Form
              className="flex flex-col gap-5"
              onSubmit={handleChangePassword}
            >
              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                isDisabled={passwordSaving}
                type="password"
                value={newPassword}
                onChange={setNewPassword}
              >
                <Label>New Password</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <Key className="size-4" />
                  </InputGroup.Prefix>
                  <InputGroup.Input placeholder="••••••••" />
                </InputGroup>
                <FieldError />
              </TextField>

              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                isDisabled={passwordSaving}
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              >
                <Label>Confirm New Password</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <Key className="size-4" />
                  </InputGroup.Prefix>
                  <InputGroup.Input placeholder="••••••••" />
                </InputGroup>
                <FieldError />
              </TextField>

              <div className="pt-2">
                <Button
                  isDisabled={passwordSaving}
                  type="submit"
                  variant="primary"
                >
                  {passwordSaving ? (
                    <>
                      <Spinner size="sm" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </Button>
              </div>
            </Form>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
