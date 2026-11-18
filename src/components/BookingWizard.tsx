import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Shield,
  Store,
} from "lucide-react";
import {
  Button,
  FieldError,
  InputGroup,
  Label,
  Modal,
  TextField,
  ToggleButton,
} from "@heroui/react";

import { getEmailJSConfig } from "@/lib/config";
import {
  DEVICE_KIND_ORDER,
  useSiteStore,
  type DeviceManufacturer,
  type SiteRepairService,
} from "@/lib/siteStore";
import { useToastStore } from "@/lib/store";
import {
  isSupabaseConfigured,
  sbFetchLiveCatalog,
  sbInsertBooking,
  type LiveDeviceBrand,
  type LiveDeviceModel,
  type LivePosService,
} from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import CategoryIcon from "@/components/CategoryIcon";

const IN_STORE_STEPS = ["Service", "Device", "Schedule", "Contact", "Confirm"];
const HOME_STEPS = [
  "Service",
  "Device",
  "Schedule",
  "Address",
  "Contact",
  "Confirm",
];

const WEEKDAY_TIMES = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];
const SATURDAY_TIMES = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
];

// ZIP codes within ~25 miles of Fairfield, IL (62837) across Wayne, Edwards,
// White, Hamilton, Clay, Richland, Jefferson, Wabash, and Marion counties.
const FAIRFIELD_25MI_ZIPS = new Set([
  "62837", // Fairfield
  "62806", // Albion
  "62895", // Wayne City
  "62823", // Cisne
  "62843", // Geff
  "62862", // Mill Shoals
  "62886", // Sims
  "62851", // Keenes
  "62814", // Bluford
  "62864", // Mt. Vernon
  "62810", // Belle Rive
  "62872", // Opdyke
  "62828", // Dahlgren
  "62859", // McLeansboro
  "62817", // Broughton
  "62829", // Dale
  "62821", // Carmi
  "62827", // Crossville
  "62835", // Enfield
  "62869", // Norris City
  "62887", // Springerton
  "62844", // Golden Gate
  "62815", // Bone Gap
  "62818", // Browns
  "62842", // Grayville
  "62863", // Mount Erie
  "62896", // West Salem
  "62860", // Mount Carmel
  "62852", // Keensburg
  "62809", // Bellmont
  "62839", // Flora
  "62824", // Clay City
  "62858", // Louisville
  "62879", // Sailor Springs
  "62899", // Xenia
  "62849", // Iuka
  "62450", // Olney
  "62868", // Noble
  "62875", // Parkersburg
  "62419", // Calhoun
]);

export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatBookingDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (m) {
    const dt = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      12,
      0,
      0,
    );
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return dateStr;
}

function getDayOfWeekFromIso(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt.getDay();
}

function getNextDays(n = 14) {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= n + 4; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) days.push(d);
    if (days.length >= n) break;
  }
  return days;
}

function slugifyId(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferServiceIcon(name: string, category?: string): string {
  const s = `${name} ${category || ""}`.toLowerCase();
  if (s.includes("battery")) return "battery_full";
  if (s.includes("water") || s.includes("liquid")) return "water_drop";
  if (s.includes("charge") || s.includes("port")) return "ev_station";
  if (s.includes("camera") || s.includes("lens")) return "photo_camera";
  if (s.includes("data") || s.includes("recover")) return "sd_card";
  if (s.includes("ipad") || s.includes("tablet")) return "tablet_mac";
  if (s.includes("laptop") || s.includes("macbook")) return "laptop_mac";
  if (s.includes("screen") || s.includes("display") || s.includes("glass"))
    return "smartphone";
  return "build";
}

function normalizeDeviceKind(cat: string): string {
  const c = cat.trim().toLowerCase();
  if (c === "smartphone" || c === "phone" || c === "phones") return "Phone";
  if (c === "tablet" || c === "tablets" || c === "ipad") return "Tablet";
  if (c === "laptop" || c === "laptops" || c === "notebook") return "Laptop";
  if (c === "desktop" || c === "pc" || c === "computer") return "Desktop";
  if (c === "smartwatch" || c === "watch" || c === "wearable") return "Watch";
  if (c === "headphones" || c === "audio" || c === "earbuds") return "Audio";
  return "Smart Home";
}

function parseTime12h(timeStr: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeStr.trim());
  if (!m) return { hour: 10, minute: 0 };
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

function buildIcsContent(opts: {
  isoDate: string;
  timeStr: string;
  summary: string;
  description: string;
  location: string;
}): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opts.isoDate);
  const year = m ? Number(m[1]) : new Date().getFullYear();
  const month = m ? Number(m[2]) : new Date().getMonth() + 1;
  const day = m ? Number(m[3]) : new Date().getDate();
  const { hour, minute } = parseTime12h(opts.timeStr);

  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
  const endHour = Math.min(23, hour + 1);
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(minute)}00`;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const esc = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mobicare Device Recovery//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:mobicare-${Date.now()}@shopmobicare.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=America/Chicago:${dtStart}`,
    `DTEND;TZID=America/Chicago:${dtEnd}`,
    `SUMMARY:${esc(opts.summary)}`,
    `LOCATION:${esc(opts.location)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

interface BookingForm {
  service: string;
  variant: string;
  deviceKind: string;
  deviceManufacturer: string;
  deviceModelText: string;
  issue: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  visitType: "in-store" | "home" | "";
  visitLocationType: "residential" | "commercial" | "";
  homeAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
}

interface BookingWizardProps {
  onClose?: () => void;
  defaultService?: string | null;
  mode?: "modal" | "page";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <strong className="text-right text-foreground">{value}</strong>
    </div>
  );
}

function money(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

function PageHeader({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`mb-5 border-b border-border pb-4 ${className}`}>
      {children}
    </div>
  );
}
function PageBody({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}
function PageFooter({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`mt-6 flex items-center gap-2 border-t border-border pt-5 ${className}`}
    >
      {children}
    </div>
  );
}
function PageHeading({ children }: { children?: React.ReactNode }) {
  return <h2 className="m-0 text-lg font-bold text-foreground">{children}</h2>;
}

export default function BookingWizard({
  onClose = () => {},
  defaultService = null,
  mode = "modal",
}: BookingWizardProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const siteRepairServices = useSiteStore((s) => s.repairServices);
  const siteDeviceManufacturers =
    useSiteStore((s) => s.deviceManufacturers) || [];
  const houseCallPricing = useSiteStore((s) => s.houseCallPricing);
  const business = useSiteStore((s) => s.business);
  const copy = useSiteStore((s) => s.copy);
  const addToast = useToastStore((s) => s.add);

  const [liveCatalog, setLiveCatalog] = useState<{
    services: LivePosService[];
    brands: LiveDeviceBrand[];
    models: LiveDeviceModel[];
  }>({ services: [], brands: [], models: [] });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    void sbFetchLiveCatalog().then((res) => {
      if (active) setLiveCatalog(res);
    });
    return () => {
      active = false;
    };
  }, []);

  // Merge live NovaOps POS services with siteStore defaults cleanly
  const repairServices = useMemo<SiteRepairService[]>(() => {
    const base = siteRepairServices.map((s) => ({ ...s }));
    if (!liveCatalog.services.length) return base;

    for (const posSvc of liveCatalog.services) {
      if (posSvc.active === false) continue;
      const slug = slugifyId(posSvc.name);
      const formattedPrice =
        typeof posSvc.price === "number" && posSvc.price > 0
          ? money(posSvc.price)
          : undefined;
      const mins = posSvc.estimated_minutes || posSvc.duration || 0;
      const formattedDur =
        mins > 0
          ? mins >= 60
            ? `${Math.round((mins / 60) * 10) / 10} hr`
            : `${mins} min`
          : undefined;

      const existing = base.find(
        (b) =>
          b.id === slug ||
          b.name.toLowerCase() === posSvc.name.trim().toLowerCase(),
      );

      if (existing) {
        if (formattedPrice) existing.priceRange = formattedPrice;
        if (formattedDur) existing.duration = formattedDur;
        if (posSvc.description?.trim())
          existing.description = posSvc.description.trim();
      } else {
        base.push({
          id: slug || `svc-${posSvc.id}`,
          name: posSvc.name.trim(),
          icon: inferServiceIcon(posSvc.name, posSvc.category),
          duration: formattedDur || "Same Day",
          priceRange: formattedPrice || "Quote after diagnostic",
          description:
            posSvc.description?.trim() || "Professional technician service.",
        });
      }
    }
    return base;
  }, [siteRepairServices, liveCatalog.services]);

  // Merge live NovaOps device_brands & device_models with siteStore taxonomy
  const deviceManufacturers = useMemo<DeviceManufacturer[]>(() => {
    const cloned: DeviceManufacturer[] = JSON.parse(
      JSON.stringify(siteDeviceManufacturers),
    );

    for (const b of liveCatalog.brands) {
      const id = slugifyId(b.name);
      if (!cloned.some((m) => m.id === id || m.name.toLowerCase() === b.name.toLowerCase())) {
        cloned.push({ id, name: b.name.trim(), categories: [] });
      }
    }

    for (const m of liveCatalog.models) {
      const brandId = slugifyId(m.brand);
      let manu = cloned.find(
        (x) =>
          x.id === brandId ||
          x.name.toLowerCase() === m.brand.trim().toLowerCase(),
      );
      if (!manu) {
        manu = { id: brandId, name: m.brand.trim(), categories: [] };
        cloned.push(manu);
      }
      const kind = normalizeDeviceKind(m.category);
      let cat = manu.categories.find((c) => c.name === kind);
      if (!cat) {
        cat = { id: `${manu.id}-${slugifyId(kind)}`, name: kind, models: [] };
        manu.categories.push(cat);
      }
      const modelSlug = `${manu.id}-${slugifyId(m.name)}`;
      const alreadyListed = cat.models.some(
        (existing) =>
          existing.name.toLowerCase() === m.name.trim().toLowerCase() ||
          existing.generations.some(
            (g) =>
              `${existing.name} ${g}`.toLowerCase() ===
              m.name.trim().toLowerCase(),
          ),
      );
      if (!alreadyListed) {
        cat.models.unshift({
          id: modelSlug,
          name: m.name.trim(),
          generations: [],
        });
      }
    }

    return cloned;
  }, [siteDeviceManufacturers, liveCatalog.brands, liveCatalog.models]);

  const matchService = (query: string | null | undefined) => {
    if (!query) return undefined;
    const norm = query.trim().toLowerCase().replace(/^#/, "");
    if (!norm) return undefined;
    return repairServices.find(
      (s) =>
        s.id.toLowerCase() === norm ||
        slugifyId(s.name) === slugifyId(norm) ||
        s.name.toLowerCase() === norm ||
        s.id.toLowerCase().includes(norm),
    );
  };

  const [visitType, setVisitType] = useState<"in-store" | "home" | "">("");
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const STEPS = visitType === "home" ? HOME_STEPS : IN_STORE_STEPS;

  const buildInitialForm = (): BookingForm => {
    const initialContact = {
      name:
        profile?.full_name ||
        (user?.user_metadata?.full_name as string | undefined) ||
        "",
      phone:
        profile?.phone ||
        (user?.user_metadata?.phone as string | undefined) ||
        "",
      email: user?.email || "",
    };
    const matched = matchService(defaultService);
    return {
      service: matched?.id || "",
      variant: "",
      deviceKind: "",
      deviceManufacturer: "",
      deviceModelText: "",
      issue: "",
      date: "",
      time: "",
      notes: "",
      visitType: "",
      visitLocationType: "",
      homeAddress: "",
      homeCity: "",
      homeState: "IL",
      homeZip: "",
      ...initialContact,
    };
  };

  const [form, setForm] = useState<BookingForm>(buildInitialForm);

  // Sync contact details when profile/user finishes loading
  useEffect(() => {
    if (!user && !profile) return;
    setForm((prev) => ({
      ...prev,
      name:
        prev.name ||
        profile?.full_name ||
        (user?.user_metadata?.full_name as string | undefined) ||
        "",
      phone:
        prev.phone ||
        profile?.phone ||
        (user?.user_metadata?.phone as string | undefined) ||
        "",
      email: prev.email || user?.email || "",
    }));
  }, [user, profile]);

  // Pre-select service whenever defaultService prop / URL hash / query param changes
  useEffect(() => {
    if (!defaultService) return;
    const matched = matchService(defaultService);
    if (matched) {
      setForm((prev) => ({ ...prev, service: matched.id, variant: "" }));
      if (visitType && !matched.variants?.length) {
        setStep(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultService, repairServices]);

  const update = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetWizard = () => {
    setVisitType("");
    setStep(0);
    setDone(false);
    setForm(buildInitialForm());
  };

  const selectedService = repairServices.find((s) => s.id === form.service);

  const chooseVisitType = (nextType: "in-store" | "home") => {
    setVisitType(nextType);
    if (
      nextType === "in-store" &&
      form.service &&
      !selectedService?.variants?.length
    ) {
      setStep(1);
    }
  };

  const chooseHomeLocationType = (locType: "residential" | "commercial") => {
    update("visitLocationType", locType);
    if (form.service && !selectedService?.variants?.length) {
      setStep(1);
    }
  };

  const deviceKinds = DEVICE_KIND_ORDER.filter((kind) =>
    deviceManufacturers.some((m) => m.categories.some((c) => c.name === kind)),
  );
  const brandsForKind = form.deviceKind
    ? deviceManufacturers.filter((m) =>
        m.categories.some((c) => c.name === form.deviceKind),
      )
    : [];
  const brandIsOther = form.deviceManufacturer === "__other__";
  const selectedManufacturer = deviceManufacturers.find(
    (m) => m.id === form.deviceManufacturer,
  );
  const selectedCategory = selectedManufacturer?.categories.find(
    (c) => c.name === form.deviceKind,
  );
  const modelSuggestions = (selectedCategory?.models || []).flatMap((m) =>
    m.generations.length
      ? m.generations.map((g) => `${m.name} ${g}`)
      : [m.name],
  );

  // Filter time slots: Saturday 10:00 AM – 3:00 PM vs Mon–Fri 9:00 AM – 5:00 PM
  const selectedDayOfWeek = form.date ? getDayOfWeekFromIso(form.date) : null;
  const availableTimes =
    selectedDayOfWeek === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES;

  const handleDateChange = (isoDate: string) => {
    const dow = getDayOfWeekFromIso(isoDate);
    const nextTimes = dow === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES;
    setForm((prev) => ({
      ...prev,
      date: isoDate,
      time: nextTimes.includes(prev.time) ? prev.time : "",
    }));
  };

  const isHomeAddressStep = visitType === "home" && step === 3;
  const contactStepIndex = visitType === "home" ? 4 : 3;
  const confirmStepIndex = visitType === "home" ? 5 : 4;

  // Validate Fairfield 25-mile service area for Home Visits
  const cleanZip = form.homeZip.trim().slice(0, 5);
  const cleanState = form.homeState.trim().toUpperCase();
  const zipFormatValid = /^\d{5}$/.test(cleanZip);
  const stateIsIllinois =
    !cleanState || cleanState === "IL" || cleanState === "ILLINOIS";
  const isWithinServiceArea =
    zipFormatValid && stateIsIllinois && FAIRFIELD_25MI_ZIPS.has(cleanZip);
  const showZipAreaWarning =
    Boolean(form.homeZip.trim().length >= 5 || (cleanState && !stateIsIllinois)) &&
    !isWithinServiceArea;

  const canNext = () => {
    if (step === 0)
      return (
        !!form.service && (!selectedService?.variants?.length || !!form.variant)
      );
    if (step === 1) {
      return !!form.deviceKind && !!form.deviceManufacturer;
    }
    if (step === 2)
      return !!form.date && !!form.time && availableTimes.includes(form.time);
    if (isHomeAddressStep) {
      return (
        !!form.homeAddress.trim() &&
        !!form.homeCity.trim() &&
        !!form.homeState.trim() &&
        isWithinServiceArea
      );
    }
    if (step === contactStepIndex)
      return (
        !!form.name.trim() &&
        !!form.phone.trim() &&
        !!form.email.trim() &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      );
    return true;
  };

  const deviceTypeLabel = brandIsOther
    ? form.deviceKind
    : [selectedManufacturer?.name, form.deviceKind].filter(Boolean).join(" ") ||
      form.deviceKind;
  const deviceModelLabel = form.deviceModelText.trim();
  const deviceSummary = [deviceTypeLabel, deviceModelLabel]
    .filter(Boolean)
    .join(" — ");

  const locationRateLine = (type: "residential" | "commercial") => {
    const p = houseCallPricing;
    const first =
      type === "residential" ? p.residentialFirstHour : p.commercialFirstHour;
    const rest =
      type === "residential"
        ? p.residentialAdditionalHourRate
        : p.commercialAdditionalHourRate;
    return `${money(first)} first hour, ${money(rest)}/hr after`;
  };
  const activeHouseCallRate = form.visitLocationType
    ? locationRateLine(form.visitLocationType)
    : "";

  const formattedApptDate = formatBookingDate(form.date);
  const shopStreetAddress =
    business?.address && business.address !== "Fairfield, Illinois"
      ? business.address
      : "920 Commerce Drive, Suite 3, Fairfield, IL 62837";

  const handleDownloadIcs = () => {
    const serviceLabel = form.variant
      ? `${selectedService?.name || form.service} (${form.variant})`
      : selectedService?.name || form.service;
    const locationStr =
      visitType === "home"
        ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`
        : `Mobicare Device Recovery, ${shopStreetAddress}`;
    const desc = [
      `Service: ${serviceLabel}`,
      `Device: ${deviceSummary}`,
      form.issue ? `Issue: ${form.issue}` : "",
      `Phone: ${business?.phone || "618-204-1497"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const ics = buildIcsContent({
      isoDate: form.date,
      timeStr: form.time,
      summary: `Mobicare Repair: ${serviceLabel}`,
      description: desc,
      location: locationStr,
    });

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mobicare-repair-${form.date || "appointment"}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    setSending(true);
    const service = repairServices.find((s) => s.id === form.service);
    const serviceLabel = form.variant
      ? `${service?.name} (${form.variant})`
      : service?.name || form.service;
    const bookingPayload = {
      ...form,
      date: form.date, // ISO YYYY-MM-DD
      appt_date: form.date, // ISO YYYY-MM-DD
      time: form.time,
      appt_time: form.time,
      service: serviceLabel,
      deviceType: deviceTypeLabel,
      deviceModel: deviceModelLabel,
      device_type: deviceTypeLabel,
      device_model: deviceModelLabel,
      visit_type: visitType,
      visit_location_type:
        visitType === "home" ? form.visitLocationType : undefined,
      home_address:
        visitType === "home"
          ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`
          : undefined,
    };

    if (!import.meta.env.DEV || isSupabaseConfigured()) {
      try {
        await sbInsertBooking(bookingPayload as never);
      } catch (bookingError) {
        addToast(
          bookingError instanceof Error
            ? bookingError.message
            : "Submission blocked. Please try again.",
          "error",
        );
        setSending(false);
        return;
      }
    }

    try {
      const emailjsConfig = getEmailJSConfig();
      if (
        emailjsConfig.serviceId &&
        emailjsConfig.bookingTemplateId &&
        emailjsConfig.publicKey
      ) {
        await emailjs.send(
          emailjsConfig.serviceId,
          emailjsConfig.bookingTemplateId,
          {
            to_email: business?.email || "Mobicarehello@gmail.com",
            recipient_email: business?.email || "Mobicarehello@gmail.com",
            customer_name: form.name,
            customer_phone: form.phone,
            customer_email: form.email,
            email: form.email,
            reply_to: form.email,
            service_type: serviceLabel,
            device_type: deviceTypeLabel,
            device_model: deviceModelLabel,
            issue_description: form.issue || "None",
            appointment_date: `${formattedApptDate} (${form.date})`,
            appointment_time: form.time,
            special_notes: form.notes || "None",
            visit_type: visitType === "home" ? "Home Visit" : "In-Store",
            visit_location_type:
              visitType === "home"
                ? form.visitLocationType === "commercial"
                  ? "Commercial"
                  : "Residential"
                : "N/A",
            home_address:
              visitType === "home"
                ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`
                : "N/A",
          },
          emailjsConfig.publicKey,
        );
      }
    } catch (e) {
      console.error("[EmailJS error]:", e);
    }

    setSending(false);
    setDone(true);
  };

  const days = getNextDays();
  const selectableCard = (selected: boolean) =>
    `h-auto w-full cursor-pointer whitespace-normal rounded-card border p-3 text-center transition-[background-color,border-color,box-shadow] duration-200 ${selected ? "border-accent bg-accent-soft ring-1 ring-accent shadow-[var(--elev-1)]" : "border-border bg-surface hover:border-accent/35 hover:bg-surface-secondary"}`;
  const chipButton = (selected: boolean) =>
    `rounded-pill border px-3.5 py-1.5 text-label font-semibold transition-colors duration-150 ${selected ? "border-accent bg-accent text-accent-foreground shadow-[var(--elev-1)]" : "border-border bg-surface text-muted hover:border-accent/40 hover:bg-surface-secondary hover:text-foreground"}`;

  const goBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    if (visitType === "home" && form.visitLocationType) {
      update("visitLocationType", "");
      return;
    }
    setVisitType("");
  };

  const isPage = mode === "page";
  const SectionHeader = isPage ? PageHeader : Modal.Header;
  const SectionBody = isPage ? PageBody : Modal.Body;
  const SectionFooter = isPage ? PageFooter : Modal.Footer;
  const SectionHeading = isPage ? PageHeading : Modal.Heading;

  const content = done ? (
    <>
      <SectionBody className="flex flex-col items-center gap-3 pt-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Check className="size-7" />
        </span>
        <h2 className="m-0 text-xl font-bold text-foreground">
          You&rsquo;re all set!
        </h2>
        <p
          className="m-0 text-sm text-muted"
          data-edit="copy.wizard.after"
        >
          {copy?.["wizard.after"] ||
            "Your appointment request has been submitted. We'll confirm via phone or email within 2 hours during business hours."}
        </p>
        {visitType === "home" && (
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent">
            <Home className="size-4 shrink-0" />
            <span>Our technician will come to your address.</span>
          </div>
        )}
        <div className="mt-2 w-full rounded-2xl border border-border p-4">
          <DetailRow
            label="Visit Type"
            value={
              visitType === "home"
                ? `Home Visit — ${form.visitLocationType === "commercial" ? "Commercial" : "Residential"}`
                : "In-Store Visit (Fairfield Shop)"
            }
          />
          <DetailRow
            label="Service"
            value={`${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`}
          />
          <DetailRow label="Device" value={deviceSummary} />
          <DetailRow
            label="Date"
            value={`${formattedApptDate} at ${form.time}`}
          />
          {visitType === "home" && form.homeAddress && (
            <DetailRow
              label="Address"
              value={`${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`}
            />
          )}
          <DetailRow
            label="Contact"
            value={`${form.name} · ${form.phone}`}
          />
        </div>

        <Button
          fullWidth
          className="mt-1 gap-2"
          variant="outline"
          onPress={handleDownloadIcs}
        >
          <CalendarPlus className="size-4 text-accent" />
          <span>Download .ics Calendar Invite</span>
        </Button>

        <div className="mt-1 flex w-full items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-soft/50 p-3.5 text-left shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Shield className="size-4" />
            </span>
            <div>
              <strong className="block text-xs font-bold text-foreground">
                Protect this device from future damage
              </strong>
              <span className="text-caption text-muted">
                AKKO device insurance from $5/mo with $29 deductibles
              </span>
            </div>
          </div>
          <Button
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-opacity hover:opacity-90"
            variant="primary"
            onPress={() => {
              onClose();
              navigate("/protection");
            }}
          >
            View Plans
          </Button>
        </div>
      </SectionBody>
      <SectionFooter>
        <Button
          fullWidth
          variant="primary"
          onPress={isPage ? resetWizard : onClose}
        >
          {isPage
            ? copy?.["wizard.another"] || "Book another repair"
            : copy?.["wizard.done"] || "Done"}
        </Button>
      </SectionFooter>
    </>
  ) : visitType === "" ? (
    <>
      <SectionHeader>
        <div>
          <SectionHeading>
            {copy?.["wizard.title"] || "Book Appointment"}
          </SectionHeading>
          <p className="m-0 text-sm text-muted">
            {selectedService
              ? `Selected service: ${selectedService.name} — how would you like your device serviced?`
              : "How would you like your device serviced?"}
          </p>
        </div>
        {!isPage && <Modal.CloseTrigger />}
      </SectionHeader>
      <SectionBody className="flex flex-col gap-4 py-6">
        {selectedService && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/35 bg-accent-soft/60 px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <CategoryIcon
                className="size-4 text-accent"
                iconId={selectedService.icon}
              />
              <span>{selectedService.name}</span>
              <span className="text-xs text-accent">
                ({selectedService.priceRange})
              </span>
            </span>
            <button
              className="text-xs font-semibold text-muted underline hover:text-foreground"
              type="button"
              onClick={() => update("service", "")}
            >
              Change
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button
            className="group flex h-auto flex-col items-center gap-4 whitespace-normal rounded-card border border-border bg-surface p-7 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            id="visit-type-in-store"
            variant="ghost"
            onPress={() => chooseVisitType("in-store")}
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-accent shadow-sm transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Store className="size-8" />
            </span>
            <div>
              <strong className="block text-lg font-bold text-foreground">
                In-Store Visit
              </strong>
              <p className="m-0 mt-1 text-sm leading-relaxed text-muted">
                Drop off your device at our Fairfield, IL location. Most repairs
                done same-day while you wait.
              </p>
            </div>
            <div className="flex w-full flex-col gap-1.5 rounded-2xl bg-surface-secondary p-3 text-xs">
              <span className="font-semibold text-foreground">
                ✓ Same-day service
              </span>
              <span className="font-semibold text-foreground">
                ✓ $35 bench fee (credited to repair)
              </span>
              <span className="font-semibold text-foreground">
                ✓ No travel fee
              </span>
            </div>
          </Button>
          <Button
            className="group flex h-auto flex-col items-center gap-4 whitespace-normal rounded-card border border-border bg-surface p-7 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            id="visit-type-home"
            variant="ghost"
            onPress={() => chooseVisitType("home")}
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-accent shadow-sm transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Home className="size-8" />
            </span>
            <div>
              <strong className="block text-lg font-bold text-foreground">
                Home Visit
              </strong>
              <p className="m-0 mt-1 text-sm leading-relaxed text-muted">
                We come to you. Our technician visits your home or office at a
                time that works for you.
              </p>
            </div>
            <div className="flex w-full flex-col gap-1.5 rounded-2xl bg-surface-secondary p-3 text-xs">
              <span className="font-semibold text-foreground">
                ✓ We come to you
              </span>
              <span className="font-semibold text-foreground">
                ✓ 25-mile Fairfield area
              </span>
              <span className="font-bold text-accent">
                Residential &amp; commercial rates
              </span>
            </div>
          </Button>
        </div>
        <p className="m-0 text-center text-xs text-muted">
          Home visits are available within 25 miles of Fairfield, IL (62837).
          House call fees are collected at time of service.
        </p>
      </SectionBody>
      {!isPage && (
        <SectionFooter>
          <Button fullWidth variant="outline" onPress={onClose}>
            Cancel
          </Button>
        </SectionFooter>
      )}
    </>
  ) : visitType === "home" && !form.visitLocationType ? (
    <>
      <SectionHeader>
        <div>
          <SectionHeading>Home Visit</SectionHeading>
          <p className="m-0 text-sm text-muted">
            Is this a residential or commercial address?
          </p>
        </div>
        {!isPage && <Modal.CloseTrigger />}
      </SectionHeader>
      <SectionBody className="flex flex-col gap-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button
            className="flex h-auto flex-col items-center gap-3 whitespace-normal rounded-card border border-border bg-surface p-6 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40"
            id="visit-location-residential"
            variant="ghost"
            onPress={() => chooseHomeLocationType("residential")}
          >
            <strong className="block text-base font-bold text-foreground">
              Residential
            </strong>
            <span className="text-sm font-semibold text-accent">
              {locationRateLine("residential")}
            </span>
          </Button>
          <Button
            className="flex h-auto flex-col items-center gap-3 whitespace-normal rounded-card border border-border bg-surface p-6 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40"
            id="visit-location-commercial"
            variant="ghost"
            onPress={() => chooseHomeLocationType("commercial")}
          >
            <strong className="block text-base font-bold text-foreground">
              Commercial
            </strong>
            <span className="text-sm font-semibold text-accent">
              {locationRateLine("commercial")}
            </span>
          </Button>
        </div>
        <p className="m-0 text-center text-xs text-muted">
          Flat rate for the first hour, 50% off every hour after. Collected at
          time of service.
        </p>
      </SectionBody>
      <SectionFooter>
        <Button variant="outline" onPress={() => setVisitType("")}>
          <ChevronLeft className="size-4" />
          <span>{copy?.["wizard.back"] || "Back"}</span>
        </Button>
      </SectionFooter>
    </>
  ) : (
    <>
      <SectionHeader>
        <div>
          <SectionHeading>
            {copy?.["wizard.title"] || "Book Appointment"}
          </SectionHeading>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold ${visitType === "home" ? "bg-accent-soft text-accent" : "bg-surface-secondary text-muted"}`}
            >
              {visitType === "home" ? (
                <>
                  <Home className="size-3" />
                  <span>
                    Home Visit —{" "}
                    {form.visitLocationType === "commercial"
                      ? "Commercial"
                      : "Residential"}
                  </span>
                </>
              ) : (
                <>
                  <Store className="size-3" />
                  <span>In-Store</span>
                </>
              )}
            </span>
            <p className="m-0 text-sm text-muted">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
        </div>
        {!isPage && <Modal.CloseTrigger />}
      </SectionHeader>

      <div className="flex items-center gap-1 overflow-x-auto px-6 pb-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className="flex flex-1 items-center gap-2 whitespace-nowrap"
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-accent text-accent-foreground" : "border border-border text-muted"}`}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className="hidden text-xs text-muted sm:inline">{s}</span>
            {isPage && i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-border" />
            )}
          </div>
        ))}
      </div>

      <SectionBody className="flex flex-col gap-4">
        {visitType === "home" && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm">
            <MapPin className="size-4 shrink-0 text-accent" />
            <span className="text-accent">
              <strong>House Call Rate</strong> — {activeHouseCallRate},
              collected at service time.
            </span>
          </div>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-foreground">
                What needs fixing?
              </h3>
              <p className="m-0 text-sm text-muted">
                Select the repair service you need.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {repairServices.map((svc) => (
                <ToggleButton
                  key={svc.id}
                  className={`${selectableCard(form.service === svc.id)} flex flex-col`}
                  isSelected={form.service === svc.id}
                  variant="default"
                  onChange={() => {
                    update("service", svc.id);
                    update("variant", "");
                  }}
                >
                  <CategoryIcon
                    className="mx-auto mb-1 size-5 text-accent"
                    iconId={svc.icon}
                  />
                  <strong className="block text-sm text-foreground">
                    {svc.name}
                  </strong>
                  <span className="block text-xs font-semibold text-accent">
                    {svc.priceRange}
                  </span>
                  <span className="block text-xs text-muted">
                    {svc.duration}
                  </span>
                </ToggleButton>
              ))}
            </div>
            {selectedService?.variants &&
              selectedService.variants.length > 0 && (
                <div>
                  <h4 className="m-0 mb-2 text-sm font-semibold text-foreground">
                    Select Part Option
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selectedService.variants.map((v) => (
                      <ToggleButton
                        key={v.name}
                        className={`${selectableCard(form.variant === v.name)} flex items-center justify-between text-left`}
                        isSelected={form.variant === v.name}
                        variant="default"
                        onChange={() => update("variant", v.name)}
                      >
                        <div>
                          <strong className="block text-sm text-foreground">
                            {v.name}
                          </strong>
                          <span className="text-xs text-muted">{v.price}</span>
                        </div>
                        {form.variant === v.name && (
                          <CheckCircle2 className="size-4 shrink-0 text-accent" />
                        )}
                      </ToggleButton>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-foreground">
                Tell us about your device
              </h3>
              <p className="m-0 text-sm text-muted">
                Two quick questions — we&rsquo;ll confirm the exact model when
                we see it.
              </p>
            </div>
            <div>
              <p className="m-0 mb-2 text-sm font-semibold text-foreground">
                Device Type
              </p>
              <div className="flex flex-wrap gap-2">
                {deviceKinds.map((kind) => (
                  <ToggleButton
                    key={kind}
                    className={chipButton(form.deviceKind === kind)}
                    isSelected={form.deviceKind === kind}
                    variant="default"
                    onChange={() => {
                      update("deviceKind", kind);
                      update("deviceManufacturer", "");
                      update("deviceModelText", "");
                    }}
                  >
                    {kind}
                  </ToggleButton>
                ))}
              </div>
            </div>
            {form.deviceKind && (
              <div>
                <p className="m-0 mb-2 text-sm font-semibold text-foreground">
                  Brand
                </p>
                <div className="flex flex-wrap gap-2">
                  {brandsForKind.map((m) => (
                    <ToggleButton
                      key={m.id}
                      className={chipButton(form.deviceManufacturer === m.id)}
                      isSelected={form.deviceManufacturer === m.id}
                      variant="default"
                      onChange={() => {
                        update("deviceManufacturer", m.id);
                        update("deviceModelText", "");
                      }}
                    >
                      {m.name}
                    </ToggleButton>
                  ))}
                  <ToggleButton
                    className={chipButton(brandIsOther)}
                    isSelected={brandIsOther}
                    variant="default"
                    onChange={() => {
                      update("deviceManufacturer", "__other__");
                      update("deviceModelText", "");
                    }}
                  >
                    Other…
                  </ToggleButton>
                </div>
              </div>
            )}
            {form.deviceManufacturer && (
              <TextField
                className="flex flex-col gap-1.5"
                value={form.deviceModelText}
                onChange={(v) => update("deviceModelText", v)}
              >
                <Label>
                  {brandIsOther ? "Which device is it?" : "Model (optional)"}
                </Label>
                <InputGroup>
                  <InputGroup.Input
                    list="booking-model-suggestions"
                    placeholder={
                      brandIsOther
                        ? "e.g. Fairphone 5"
                        : `e.g. ${modelSuggestions[0] || "the exact model"}`
                    }
                  />
                </InputGroup>
                <p className="m-0 text-xs text-muted">
                  {brandIsOther
                    ? "Whatever you know — make and model."
                    : "Not sure? Leave it blank and we'll identify it when you drop the device off."}
                </p>
              </TextField>
            )}
            <datalist id="booking-model-suggestions">
              {modelSuggestions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <TextField
              className="flex flex-col gap-1.5"
              value={form.issue}
              onChange={(v) => update("issue", v)}
            >
              <Label>Describe the issue (optional)</Label>
              <InputGroup>
                <InputGroup.Input placeholder="Cracked screen, won't charge, etc." />
              </InputGroup>
            </TextField>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-foreground">
                Pick a date &amp; time
              </h3>
              <p className="m-0 text-sm text-muted">
                Mon–Fri 9:00 AM – 6:00 PM · Saturday 10:00 AM – 4:00 PM ·
                Sundays closed.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {days.map((d) => {
                const iso = toIsoDateLocal(d);
                return (
                  <ToggleButton
                    key={iso}
                    className={`${selectableCard(form.date === iso)} flex flex-col`}
                    isSelected={form.date === iso}
                    variant="default"
                    onChange={() => handleDateChange(iso)}
                  >
                    <span className="block text-xs text-muted">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <strong className="block text-foreground">
                      {d.getDate()}
                    </strong>
                    <span className="block text-xs text-muted">
                      {d.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </ToggleButton>
                );
              })}
            </div>
            {form.date && (
              <div>
                <p className="m-0 mb-2 text-xs font-semibold text-muted">
                  Available slots for {formattedApptDate}
                  {selectedDayOfWeek === 6 ? " (Saturday hours)" : ""}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTimes.map((t) => (
                    <ToggleButton
                      key={t}
                      className={chipButton(form.time === t)}
                      isSelected={form.time === t}
                      variant="default"
                      onChange={() => update("time", t)}
                    >
                      {t}
                    </ToggleButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isHomeAddressStep && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-foreground">
                Your service address
              </h3>
              <p className="m-0 text-sm text-muted">
                Where should our technician come to? (Within 25 miles of
                Fairfield, IL 62837)
              </p>
            </div>
            <TextField
              isRequired
              className="flex flex-col gap-1.5"
              value={form.homeAddress}
              onChange={(v) => update("homeAddress", v)}
            >
              <Label>Street address</Label>
              <InputGroup>
                <InputGroup.Input placeholder="123 Main St" />
              </InputGroup>
              <FieldError />
            </TextField>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                value={form.homeCity}
                onChange={(v) => update("homeCity", v)}
              >
                <Label>City</Label>
                <InputGroup>
                  <InputGroup.Input placeholder="Fairfield" />
                </InputGroup>
                <FieldError />
              </TextField>
              <TextField
                isRequired
                className="flex flex-col gap-1.5"
                value={form.homeState}
                onChange={(v) => update("homeState", v)}
              >
                <Label>State</Label>
                <InputGroup>
                  <InputGroup.Input maxLength={2} placeholder="IL" />
                </InputGroup>
                <FieldError />
              </TextField>
            </div>
            <TextField
              isRequired
              className="flex flex-col gap-1.5"
              value={form.homeZip}
              onChange={(v) => update("homeZip", v.replace(/[^\d-]/g, "").slice(0, 10))}
            >
              <Label>ZIP code</Label>
              <InputGroup>
                <InputGroup.Input placeholder="62837" />
              </InputGroup>
              <FieldError />
            </TextField>

            {showZipAreaWarning && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs font-medium text-danger"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Home visits are restricted to Illinois ZIP codes within 25
                  miles of Fairfield, IL (e.g. 62837, 62806, 62895, 62821,
                  62839, 62859, 62864). For locations outside this radius,
                  choose an In-Store Visit or call{" "}
                  <strong>{business?.phone || "618-204-1497"}</strong>.
                </span>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <p className="m-0">
                Home visits are available within 25 miles of Fairfield, IL. The{" "}
                <strong>{activeHouseCallRate}</strong> house call rate is
                collected at time of service.
              </p>
            </div>
          </div>
        )}

        {step === contactStepIndex && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-foreground">
                Your contact info
              </h3>
              <p className="m-0 text-sm text-muted">
                We&rsquo;ll confirm your appointment and reach out with any
                questions.
              </p>
            </div>
            <TextField
              isRequired
              className="flex flex-col gap-1.5"
              value={form.name}
              onChange={(v) => update("name", v)}
            >
              <Label>Full name</Label>
              <InputGroup>
                <InputGroup.Input />
              </InputGroup>
              <FieldError />
            </TextField>
            <TextField
              isRequired
              className="flex flex-col gap-1.5"
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
            >
              <Label>Phone number</Label>
              <InputGroup>
                <InputGroup.Input />
              </InputGroup>
              <FieldError />
            </TextField>
            <TextField
              isRequired
              className="flex flex-col gap-1.5"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
            >
              <Label>Email address</Label>
              <InputGroup>
                <InputGroup.Input />
              </InputGroup>
              <FieldError />
            </TextField>
            <TextField
              className="flex flex-col gap-1.5"
              value={form.notes}
              onChange={(v) => update("notes", v)}
            >
              <Label>Additional notes (optional)</Label>
              <InputGroup>
                <InputGroup.Input />
              </InputGroup>
            </TextField>
          </div>
        )}

        {step === confirmStepIndex && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-foreground">
                Review your booking
              </h3>
              <p className="m-0 text-sm text-muted">Everything look right?</p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <DetailRow
                label="Visit Type"
                value={
                  visitType === "home"
                    ? `Home Visit — ${form.visitLocationType === "commercial" ? "Commercial" : "Residential"}`
                    : "In-Store (920 Commerce Dr, Suite 3, Fairfield)"
                }
              />
              <DetailRow
                label="Service"
                value={`${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`}
              />
              <DetailRow label="Device" value={deviceSummary} />
              {form.issue && <DetailRow label="Issue" value={form.issue} />}
              <DetailRow
                label="Date & Time"
                value={`${formattedApptDate} at ${form.time}`}
              />
              {visitType === "home" && (
                <DetailRow
                  label="Service Address"
                  value={`${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`}
                />
              )}
              <DetailRow label="Name" value={form.name} />
              <DetailRow label="Phone" value={form.phone} />
              <DetailRow label="Email" value={form.email} />
              {form.notes && <DetailRow label="Notes" value={form.notes} />}
              {visitType === "home" && (
                <DetailRow
                  label="House Call Rate"
                  value={`${activeHouseCallRate} (collected at service)`}
                />
              )}
            </div>
            <p className="m-0 text-xs text-muted">
              {visitType === "home"
                ? "By confirming, you agree to be available at the provided address at the scheduled time. Same-day cancellations should be made by phone."
                : "By confirming, you agree to bring your device in at the scheduled time. $35 diagnostic bench fee is 100% credited toward your repair."}
            </p>
          </div>
        )}
      </SectionBody>

      <SectionFooter className="justify-end gap-2">
        <Button variant="outline" onPress={goBack}>
          <ChevronLeft className="size-4" />
          <span>{copy?.["wizard.back"] || "Back"}</span>
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            isDisabled={!canNext()}
            variant="primary"
            onPress={() => setStep((s) => s + 1)}
          >
            <span>{copy?.["wizard.continue"] || "Continue"}</span>
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button isDisabled={sending} variant="primary" onPress={handleSubmit}>
            <span>
              {sending
                ? "Sending…"
                : copy?.["wizard.confirm"] || "Confirm Booking"}
            </span>
            {!sending && <Check className="size-4" />}
          </Button>
        )}
      </SectionFooter>
    </>
  );

  if (isPage) {
    return (
      <div className="surface-raised mx-auto w-full max-w-3xl overflow-hidden rounded-panel p-6 shadow-[var(--elev-3)] sm:p-8">
        {content}
      </div>
    );
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop className="z-[100]">
        <Modal.Container className="pb-24 lg:pb-0" scroll="inside" size="lg">
          <Modal.Dialog>{content}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
