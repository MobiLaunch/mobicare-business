import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Home, MapPin, Shield, Store, Wrench } from "lucide-react";
import { Button, FieldError, InputGroup, Label, Modal, TextField, ToggleButton } from "@heroui/react";
import { BUSINESS, getEmailJSConfig } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";
import { useToastStore } from "@/lib/store";
import { isSupabaseConfigured, sbInsertBooking } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const IN_STORE_STEPS = ["Service", "Device", "Schedule", "Contact", "Confirm"];
const HOME_STEPS = ["Service", "Device", "Schedule", "Address", "Contact", "Confirm"];
const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

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

interface BookingForm {
  service: string; variant: string;
  deviceManufacturer: string; deviceCategory: string; deviceModel: string; deviceGeneration: string;
  issue: string;
  date: string; time: string; name: string; phone: string; email: string; notes: string;
  visitType: "in-store" | "home" | ""; visitLocationType: "residential" | "commercial" | "";
  homeAddress: string; homeCity: string; homeState: string; homeZip: string;
}
interface BookingWizardProps { onClose?: () => void; defaultService?: string | null; mode?: "modal" | "page"; }
function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"><span className="text-muted">{label}</span><strong className="text-right text-foreground">{value}</strong></div>;
}
function money(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

// Page-mode replacements for the Modal.* chrome. HeroUI's Modal.Dialog grabs
// focus on mount and sets role="dialog" regardless of context, and
// Modal.Backdrop/Container supply a focus trap + fixed floating-surface CSS
// that don't belong on a plain page — so page mode drops those entirely
// rather than reusing them, keeping only equivalent plain markup for the
// header/body/footer/heading slots the step content already renders into.
function PageHeader({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`mb-5 border-b border-border pb-4 ${className}`}>{children}</div>;
}
function PageBody({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}
function PageFooter({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`mt-6 flex items-center gap-2 border-t border-border pt-5 ${className}`}>{children}</div>;
}
function PageHeading({ children }: { children?: React.ReactNode }) {
  return <h2 className="m-0 text-lg font-bold text-foreground">{children}</h2>;
}

export default function BookingWizard({ onClose = () => {}, defaultService = null, mode = "modal" }: BookingWizardProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const repairServices = useSiteStore((s) => s.repairServices);
  const deviceManufacturers = useSiteStore((s) => s.deviceManufacturers) || [];
  const houseCallPricing = useSiteStore((s) => s.houseCallPricing);
  const addToast = useToastStore((s) => s.add);
  const [visitType, setVisitType] = useState<"in-store" | "home" | "">("");
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const STEPS = visitType === "home" ? HOME_STEPS : IN_STORE_STEPS;
  const buildInitialForm = (): BookingForm => {
    const initialContact = { name: profile?.full_name || "", phone: profile?.phone || "", email: user?.email || "" };
    const base: BookingForm = { service: "", variant: "", deviceManufacturer: "", deviceCategory: "", deviceModel: "", deviceGeneration: "", issue: "", date: "", time: "", notes: "", visitType: "", visitLocationType: "", homeAddress: "", homeCity: "", homeState: "", homeZip: "", ...initialContact };
    if (defaultService) {
      const match = repairServices.find((s) => s.name.toLowerCase() === defaultService.toLowerCase());
      if (match) return { ...base, service: match.id };
    }
    return base;
  };
  const [form, setForm] = useState<BookingForm>(buildInitialForm);
  useEffect(() => {
    if (defaultService) {
      const match = repairServices.find((s) => s.name.toLowerCase() === defaultService.toLowerCase());
      if (match) setStep(1);
    }
  }, []);
  const update = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const resetWizard = () => {
    setVisitType("");
    setStep(0);
    setDone(false);
    setForm(buildInitialForm());
  };
  const selectedService = repairServices.find((s) => s.id === form.service);
  const selectedManufacturer = deviceManufacturers.find((m) => m.id === form.deviceManufacturer);
  const selectedCategory = selectedManufacturer?.categories.find((c) => c.id === form.deviceCategory);
  const selectedModelObj = selectedCategory?.models.find((m) => m.id === form.deviceModel);
  const modelIsOther = form.deviceModel === "__other__";
  const needsGeneration = !!selectedModelObj && selectedModelObj.generations.length > 0;
  const isHomeAddressStep = visitType === "home" && step === 3;
  const contactStepIndex = visitType === "home" ? 4 : 3;
  const confirmStepIndex = visitType === "home" ? 5 : 4;
  const canNext = () => {
    if (step === 0) return !!form.service && (!selectedService?.variants?.length || !!form.variant);
    if (step === 1) {
      if (modelIsOther) return !!form.deviceCategory && !!form.deviceModel;
      return !!form.deviceCategory && !!form.deviceModel && (!needsGeneration || !!form.deviceGeneration);
    }
    if (step === 2) return !!form.date && !!form.time;
    if (isHomeAddressStep) return !!form.homeAddress && !!form.homeCity && !!form.homeState && !!form.homeZip;
    if (step === contactStepIndex) return !!form.name && !!form.phone && !!form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    return true;
  };
  // Composed for display, the booking payload's device_type/device_model
  // columns, and EmailJS — keeps the two existing text columns compatible
  // with the older flat device-type/model data instead of needing a schema
  // change for the new manufacturer/category/model/generation levels.
  const deviceTypeLabel = [selectedManufacturer?.name, selectedCategory?.name].filter(Boolean).join(" ") || form.deviceCategory;
  const deviceModelLabel = modelIsOther
    ? form.deviceModel === "__other__" ? "" : form.deviceModel
    : [selectedModelObj?.name, form.deviceGeneration].filter(Boolean).join(" ");
  const locationRateLine = (type: "residential" | "commercial") => {
    const p = houseCallPricing;
    const first = type === "residential" ? p.residentialFirstHour : p.commercialFirstHour;
    const rest = type === "residential" ? p.residentialAdditionalHourRate : p.commercialAdditionalHourRate;
    return `${money(first)} first hour, ${money(rest)}/hr after`;
  };
  const activeHouseCallRate = form.visitLocationType ? locationRateLine(form.visitLocationType) : "";
  const handleSubmit = async () => {
    setSending(true);
    const service = repairServices.find((s) => s.id === form.service);
    const serviceLabel = form.variant ? `${service?.name} (${form.variant})` : service?.name || form.service;
    const bookingPayload = { ...form, service: serviceLabel, device_type: deviceTypeLabel, device_model: deviceModelLabel, visit_type: visitType, visit_location_type: visitType === "home" ? form.visitLocationType : undefined, home_address: visitType === "home" ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}` : undefined };
    if (!import.meta.env.DEV || isSupabaseConfigured()) {
      try { await sbInsertBooking(bookingPayload as never); }
      catch (bookingError) { addToast(bookingError instanceof Error ? bookingError.message : "Submission blocked. Please try again.", "error"); setSending(false); return; }
    }
    try {
      const emailjsConfig = getEmailJSConfig();
      if (!emailjsConfig.serviceId || !emailjsConfig.bookingTemplateId || !emailjsConfig.publicKey) {
        console.warn("[EmailJS] Missing configuration. Missing keys:", { serviceId: !emailjsConfig.serviceId, bookingTemplateId: !emailjsConfig.bookingTemplateId, publicKey: !emailjsConfig.publicKey });
      } else {
        await emailjs.send(emailjsConfig.serviceId, emailjsConfig.bookingTemplateId, { to_email: BUSINESS.email, recipient_email: BUSINESS.email, customer_name: form.name, customer_phone: form.phone, customer_email: form.email, email: form.email, reply_to: form.email, service_type: serviceLabel, device_type: deviceTypeLabel, device_model: deviceModelLabel, issue_description: form.issue || "None", appointment_date: form.date, appointment_time: form.time, special_notes: form.notes || "None", visit_type: visitType === "home" ? "Home Visit" : "In-Store", visit_location_type: visitType === "home" ? (form.visitLocationType === "commercial" ? "Commercial" : "Residential") : "N/A", home_address: visitType === "home" ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}` : "N/A" }, emailjsConfig.publicKey);
      }
    } catch (e) {
      console.error("[EmailJS error]:", e);
      if (!isSupabaseConfigured()) addToast("Booking submitted! (Check console for EmailJS configuration)", "info");
    }
    setSending(false); setDone(true);
  };
  const days = getNextDays();
  // h-auto + whitespace-normal override HeroUI's base .toggle-button chrome
  // (fixed h-10/h-9 height, whitespace-nowrap) — without them, this
  // multi-line stacked content gets squeezed into a ~40px pill.
  const selectableCard = (selected: boolean) => `h-auto w-full cursor-pointer whitespace-normal rounded-2xl border p-3 text-center transition-colors ${selected ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-secondary"}`;
  const chipButton = (selected: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${selected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:bg-surface-secondary"}`;
  const goBack = () => {
    if (step > 0) { setStep((s) => s - 1); return; }
    if (visitType === "home" && form.visitLocationType) { update("visitLocationType", ""); return; }
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
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent"><Check className="size-7" /></span>
        <h2 className="m-0 text-xl font-bold text-foreground">You&rsquo;re all set!</h2>
        <p className="m-0 text-sm text-muted">Your appointment request has been submitted. We&rsquo;ll confirm via phone or email within 2 hours during business hours.</p>
        {visitType === "home" && <div className="mt-1 flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"><Home className="size-4 shrink-0" /><span>Our technician will come to your address.</span></div>}
        <div className="mt-2 w-full rounded-2xl border border-border p-4">
          <DetailRow label="Visit Type" value={visitType === "home" ? `Home Visit — ${form.visitLocationType === "commercial" ? "Commercial" : "Residential"}` : "In-Store Visit (Fairfield Shop)"} />
          <DetailRow label="Service" value={`${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`} />
          <DetailRow label="Device" value={`${deviceTypeLabel} — ${deviceModelLabel}`} />
          <DetailRow label="Date" value={`${form.date} at ${form.time}`} />
          {visitType === "home" && form.homeAddress && <DetailRow label="Address" value={`${form.homeAddress}, ${form.homeCity}`} />}
          <DetailRow label="Contact" value={`${form.name} · ${form.phone}`} />
        </div>
        <div className="mt-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-soft/50 p-3.5 text-left shadow-sm">
          <div className="flex items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Shield className="size-4" /></span><div><strong className="block text-xs font-bold text-foreground">Protect this device from future damage</strong><span className="text-caption text-muted">AKKO device insurance from $5/mo with $29 deductibles</span></div></div>
          <Button className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-opacity hover:opacity-90" variant="primary" onPress={() => { onClose(); navigate("/protection"); }}>View Plans</Button>
        </div>
      </SectionBody>
      <SectionFooter><Button fullWidth variant="primary" onPress={isPage ? resetWizard : onClose}>{isPage ? "Book another repair" : "Done"}</Button></SectionFooter>
    </>
  ) : visitType === "" ? (
    <>
      <SectionHeader><div><SectionHeading>Book Appointment</SectionHeading><p className="m-0 text-sm text-muted">How would you like your device serviced?</p></div>{!isPage && <Modal.CloseTrigger />}</SectionHeader>
      <SectionBody className="flex flex-col gap-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button className="group flex h-auto flex-col items-center gap-4 whitespace-normal rounded-[24px] border-2 border-border bg-surface p-7 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]" id="visit-type-in-store" variant="ghost" onPress={() => setVisitType("in-store")}><span className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-accent shadow-sm transition-colors group-hover:bg-accent group-hover:text-accent-foreground"><Store className="size-8" /></span><div><strong className="block text-lg font-bold text-foreground">In-Store Visit</strong><p className="m-0 mt-1 text-sm leading-relaxed text-muted">Drop off your device at our Fairfield, IL location. Most repairs done same-day while you wait.</p></div><div className="flex w-full flex-col gap-1.5 rounded-2xl bg-surface-secondary p-3 text-xs"><span className="font-semibold text-foreground">✓ Same-day service</span><span className="font-semibold text-foreground">✓ $35 bench fee</span><span className="font-semibold text-foreground">✓ No travel fee</span></div></Button>
          <Button className="group flex h-auto flex-col items-center gap-4 whitespace-normal rounded-[24px] border-2 border-border bg-surface p-7 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]" id="visit-type-home" variant="ghost" onPress={() => setVisitType("home")}><span className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-accent shadow-sm transition-colors group-hover:bg-accent group-hover:text-accent-foreground"><Home className="size-8" /></span><div><strong className="block text-lg font-bold text-foreground">Home Visit</strong><p className="m-0 mt-1 text-sm leading-relaxed text-muted">We come to you. Our technician visits your home or office at a time that works for you.</p></div><div className="flex w-full flex-col gap-1.5 rounded-2xl bg-surface-secondary p-3 text-xs"><span className="font-semibold text-foreground">✓ We come to you</span><span className="font-semibold text-foreground">✓ Flexible scheduling</span><span className="font-bold text-accent">Residential &amp; commercial rates</span></div></Button>
        </div>
        <p className="m-0 text-center text-xs text-muted">Home visits are available within 25 miles of Fairfield, IL. House call fees are collected at time of service.</p>
      </SectionBody>
      {!isPage && <SectionFooter><Button fullWidth variant="outline" onPress={onClose}>Cancel</Button></SectionFooter>}
    </>
  ) : visitType === "home" && !form.visitLocationType ? (
    <>
      <SectionHeader><div><SectionHeading>Home Visit</SectionHeading><p className="m-0 text-sm text-muted">Is this a residential or commercial address?</p></div>{!isPage && <Modal.CloseTrigger />}</SectionHeader>
      <SectionBody className="flex flex-col gap-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button className="flex h-auto flex-col items-center gap-3 whitespace-normal rounded-[24px] border-2 border-border bg-surface p-6 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40" id="visit-location-residential" variant="ghost" onPress={() => update("visitLocationType", "residential")}><strong className="block text-base font-bold text-foreground">Residential</strong><span className="text-sm font-semibold text-accent">{locationRateLine("residential")}</span></Button>
          <Button className="flex h-auto flex-col items-center gap-3 whitespace-normal rounded-[24px] border-2 border-border bg-surface p-6 text-center transition-all duration-200 hover:border-accent hover:bg-accent-soft/40" id="visit-location-commercial" variant="ghost" onPress={() => update("visitLocationType", "commercial")}><strong className="block text-base font-bold text-foreground">Commercial</strong><span className="text-sm font-semibold text-accent">{locationRateLine("commercial")}</span></Button>
        </div>
        <p className="m-0 text-center text-xs text-muted">Flat rate for the first hour, 50% off every hour after. Collected at time of service.</p>
      </SectionBody>
      <SectionFooter><Button variant="outline" onPress={() => setVisitType("")}><ChevronLeft className="size-4" /><span>Back</span></Button></SectionFooter>
    </>
  ) : (
    <>
      <SectionHeader><div><SectionHeading>Book Appointment</SectionHeading><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold ${visitType === "home" ? "bg-accent-soft text-accent" : "bg-surface-secondary text-muted"}`}>{visitType === "home" ? <><Home className="size-3" /><span>Home Visit — {form.visitLocationType === "commercial" ? "Commercial" : "Residential"}</span></> : <><Store className="size-3" /><span>In-Store</span></>}</span><p className="m-0 text-sm text-muted">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p></div></div>{!isPage && <Modal.CloseTrigger />}</SectionHeader>
      <div className="flex items-center gap-1 overflow-x-auto px-6 pb-2">{STEPS.map((s, i) => <div key={s} className="flex flex-1 items-center gap-2 whitespace-nowrap"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-accent text-accent-foreground" : "border border-border text-muted"}`}>{i < step ? <Check className="size-3.5" /> : i + 1}</span><span className="hidden text-xs text-muted sm:inline">{s}</span>{isPage && i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}</div>)}</div>
      <SectionBody className="flex flex-col gap-4">
        {visitType === "home" && <div className="flex items-center gap-2.5 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm"><MapPin className="size-4 shrink-0 text-accent" /><span className="text-accent"><strong>House Call Rate</strong> — {activeHouseCallRate}, collected at service time.</span></div>}
        {step === 0 && <div className="flex flex-col gap-4"><div><h3 className="m-0 text-base font-semibold text-foreground">What needs fixing?</h3><p className="m-0 text-sm text-muted">Select the repair service you need.</p></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{repairServices.map((svc) => <ToggleButton key={svc.id} isSelected={form.service === svc.id} className={`${selectableCard(form.service === svc.id)} flex flex-col`} variant="default" onChange={() => { update("service", svc.id); update("variant", ""); }}><Wrench className="mx-auto mb-1 size-5 text-accent" /><strong className="block text-sm text-foreground">{svc.name}</strong><span className="block text-xs text-foreground">{svc.priceRange}</span><span className="block text-xs text-muted">{svc.duration}</span></ToggleButton>)}</div>{selectedService?.variants && selectedService.variants.length > 0 && <div><h4 className="m-0 mb-2 text-sm font-semibold text-foreground">Select Part Option</h4><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{selectedService.variants.map((v) => <ToggleButton key={v.name} isSelected={form.variant === v.name} className={`${selectableCard(form.variant === v.name)} flex items-center justify-between text-left`} variant="default" onChange={() => update("variant", v.name)}><div><strong className="block text-sm text-foreground">{v.name}</strong><span className="text-xs text-muted">{v.price}</span></div>{form.variant === v.name && <CheckCircle2 className="size-4 shrink-0 text-accent" />}</ToggleButton>)}</div></div>}</div>}
        {step === 1 && <div className="flex flex-col gap-4">
          <div><h3 className="m-0 text-base font-semibold text-foreground">Tell us about your device</h3><p className="m-0 text-sm text-muted">Pick the manufacturer, then narrow down to your exact model.</p></div>
          <div><p className="m-0 mb-2 text-sm font-semibold text-foreground">Manufacturer</p><div className="flex flex-wrap gap-2">{deviceManufacturers.map((m) => <ToggleButton key={m.id} isSelected={form.deviceManufacturer === m.id} className={chipButton(form.deviceManufacturer === m.id)} variant="default" onChange={() => { update("deviceManufacturer", m.id); update("deviceCategory", ""); update("deviceModel", ""); update("deviceGeneration", ""); }}>{m.name}</ToggleButton>)}</div></div>
          {selectedManufacturer && selectedManufacturer.categories.length > 0 && <div><p className="m-0 mb-2 text-sm font-semibold text-foreground">Device Type</p><div className="flex flex-wrap gap-2">{selectedManufacturer.categories.map((c) => <ToggleButton key={c.id} isSelected={form.deviceCategory === c.id} className={chipButton(form.deviceCategory === c.id)} variant="default" onChange={() => { update("deviceCategory", c.id); update("deviceModel", ""); update("deviceGeneration", ""); }}>{c.name}</ToggleButton>)}</div></div>}
          {selectedCategory && <div><p className="m-0 mb-2 text-sm font-semibold text-foreground">Model</p><div className="flex flex-wrap gap-2">{selectedCategory.models.map((m) => <ToggleButton key={m.id} isSelected={form.deviceModel === m.id} className={chipButton(form.deviceModel === m.id)} variant="default" onChange={() => { update("deviceModel", m.id); update("deviceGeneration", ""); }}>{m.name}</ToggleButton>)}<ToggleButton isSelected={modelIsOther} className={chipButton(modelIsOther)} variant="default" onChange={() => { update("deviceModel", "__other__"); update("deviceGeneration", ""); }}>Other Model…</ToggleButton></div></div>}
          {needsGeneration && <div><p className="m-0 mb-2 text-sm font-semibold text-foreground">Generation</p><div className="flex flex-wrap gap-2">{selectedModelObj!.generations.map((g) => <ToggleButton key={g} isSelected={form.deviceGeneration === g} className={chipButton(form.deviceGeneration === g)} variant="default" onChange={() => update("deviceGeneration", g)}>{g}</ToggleButton>)}</div></div>}
          {modelIsOther && <TextField className="flex flex-col gap-1.5" value={form.deviceModel === "__other__" ? "" : form.deviceModel} onChange={(v) => update("deviceModel", v)}><Label>Exact model name</Label><InputGroup><InputGroup.Input placeholder="e.g. iPhone 15 Pro Max" /></InputGroup></TextField>}
          <TextField className="flex flex-col gap-1.5" value={form.issue} onChange={(v) => update("issue", v)}><Label>Describe the issue (optional)</Label><InputGroup><InputGroup.Input placeholder="Cracked screen, won't charge, etc." /></InputGroup></TextField>
        </div>}
        {step === 2 && <div className="flex flex-col gap-4"><div><h3 className="m-0 text-base font-semibold text-foreground">Pick a date &amp; time</h3><p className="m-0 text-sm text-muted">Monday – Saturday. Sundays closed.</p></div><div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{days.map((d) => { const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); return <ToggleButton key={label} isSelected={form.date === label} className={`${selectableCard(form.date === label)} flex flex-col`} variant="default" onChange={() => update("date", label)}><span className="block text-xs text-muted">{d.toLocaleDateString("en-US", { weekday: "short" })}</span><strong className="block text-foreground">{d.getDate()}</strong><span className="block text-xs text-muted">{d.toLocaleDateString("en-US", { month: "short" })}</span></ToggleButton>; })}</div>{form.date && <div className="flex flex-wrap gap-2">{TIMES.map((t) => <ToggleButton key={t} isSelected={form.time === t} className={chipButton(form.time === t)} variant="default" onChange={() => update("time", t)}>{t}</ToggleButton>)}</div>}</div>}
        {isHomeAddressStep && <div className="flex flex-col gap-4"><div><h3 className="m-0 text-base font-semibold text-foreground">Your service address</h3><p className="m-0 text-sm text-muted">Where should our technician come to?</p></div><TextField isRequired className="flex flex-col gap-1.5" value={form.homeAddress} onChange={(v) => update("homeAddress", v)}><Label>Street address</Label><InputGroup><InputGroup.Input placeholder="123 Main St" /></InputGroup><FieldError /></TextField><div className="grid grid-cols-2 gap-3"><TextField isRequired className="flex flex-col gap-1.5" value={form.homeCity} onChange={(v) => update("homeCity", v)}><Label>City</Label><InputGroup><InputGroup.Input placeholder="Fairfield" /></InputGroup><FieldError /></TextField><TextField isRequired className="flex flex-col gap-1.5" value={form.homeState} onChange={(v) => update("homeState", v)}><Label>State</Label><InputGroup><InputGroup.Input placeholder="IL" /></InputGroup><FieldError /></TextField></div><TextField isRequired className="flex flex-col gap-1.5" value={form.homeZip} onChange={(v) => update("homeZip", v)}><Label>ZIP code</Label><InputGroup><InputGroup.Input placeholder="62837" /></InputGroup><FieldError /></TextField><div className="flex items-start gap-2.5 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent"><MapPin className="mt-0.5 size-4 shrink-0" /><p className="m-0">Home visits are available within 25 miles of Fairfield, IL. The <strong>{activeHouseCallRate}</strong> house call rate is collected at time of service.</p></div></div>}
        {step === contactStepIndex && <div className="flex flex-col gap-4"><div><h3 className="m-0 text-base font-semibold text-foreground">Your contact info</h3><p className="m-0 text-sm text-muted">We&rsquo;ll confirm your appointment and reach out with any questions.</p></div><TextField isRequired className="flex flex-col gap-1.5" value={form.name} onChange={(v) => update("name", v)}><Label>Full name</Label><InputGroup><InputGroup.Input /></InputGroup><FieldError /></TextField><TextField isRequired className="flex flex-col gap-1.5" type="tel" value={form.phone} onChange={(v) => update("phone", v)}><Label>Phone number</Label><InputGroup><InputGroup.Input /></InputGroup><FieldError /></TextField><TextField isRequired className="flex flex-col gap-1.5" type="email" value={form.email} onChange={(v) => update("email", v)}><Label>Email address</Label><InputGroup><InputGroup.Input /></InputGroup><FieldError /></TextField><TextField className="flex flex-col gap-1.5" value={form.notes} onChange={(v) => update("notes", v)}><Label>Additional notes (optional)</Label><InputGroup><InputGroup.Input /></InputGroup></TextField></div>}
        {step === confirmStepIndex && <div className="flex flex-col gap-4"><div><h3 className="m-0 text-base font-semibold text-foreground">Review your booking</h3><p className="m-0 text-sm text-muted">Everything look right?</p></div><div className="rounded-2xl border border-border p-4"><DetailRow label="Visit Type" value={visitType === "home" ? `🏠 Home Visit — ${form.visitLocationType === "commercial" ? "Commercial" : "Residential"}` : "🏪 In-Store"} /><DetailRow label="Service" value={`${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`} /><DetailRow label="Device" value={`${deviceTypeLabel} — ${deviceModelLabel}`} />{form.issue && <DetailRow label="Issue" value={form.issue} />}<DetailRow label="Date & Time" value={`${form.date} at ${form.time}`} />{visitType === "home" && <DetailRow label="Service Address" value={`${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`} />}<DetailRow label="Name" value={form.name} /><DetailRow label="Phone" value={form.phone} /><DetailRow label="Email" value={form.email} />{form.notes && <DetailRow label="Notes" value={form.notes} />}{visitType === "home" && <DetailRow label="House Call Rate" value={`${activeHouseCallRate} (collected at service)`} />}</div><p className="m-0 text-xs text-muted">{visitType === "home" ? "By confirming, you agree to be available at the provided address at the scheduled time. Same-day cancellations should be made by phone." : "By confirming, you agree to bring your device in at the scheduled time. Same-day cancellations should be made by phone."}</p></div>}
      </SectionBody>
      <SectionFooter className="justify-end gap-2"><Button variant="outline" onPress={goBack}><ChevronLeft className="size-4" /><span>Back</span></Button>{step < STEPS.length - 1 ? <Button isDisabled={!canNext()} variant="primary" onPress={() => setStep((s) => s + 1)}><span>Continue</span><ChevronRight className="size-4" /></Button> : <Button isDisabled={sending} variant="primary" onPress={handleSubmit}><span>{sending ? "Sending…" : "Confirm Booking"}</span>{!sending && <Check className="size-4" />}</Button>}</SectionFooter>
    </>
  );

  if (isPage) {
    return (
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-surface p-6 shadow-sm sm:p-8">
        {content}
      </div>
    );
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen className="z-[100]" onOpenChange={(open) => !open && onClose()}>
        <Modal.Container className="pb-24 lg:pb-0" scroll="inside" size="lg">
          <Modal.Dialog>{content}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
