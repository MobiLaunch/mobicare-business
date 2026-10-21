import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { Check, ChevronLeft, ChevronRight, Home, MapPin, Shield, Store, Wrench, X } from "lucide-react";
import { Modal } from "@heroui/react";
import AppIcon, { type IconColor } from "@/components/ios/AppIcon";
import { IosChoice, IosField, IosGroup, IosNote, IosProgress, IosSegmented, IosSheetHeader, IosSummaryRow } from "@/components/ios/Forms";
import { play } from "@/lib/sound";
import { BUSINESS, getEmailJSConfig } from "@/lib/config";
import { DEVICE_KIND_ORDER, useSiteStore } from "@/lib/siteStore";
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
  deviceKind: string; deviceManufacturer: string; deviceModelText: string;
  issue: string;
  date: string; time: string; name: string; phone: string; email: string; notes: string;
  visitType: "in-store" | "home" | ""; visitLocationType: "residential" | "commercial" | "";
  homeAddress: string; homeCity: string; homeState: string; homeZip: string;
}
interface BookingWizardProps { onClose?: () => void; defaultService?: string | null; mode?: "modal" | "page"; }
function money(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

const SERVICE_COLORS: IconColor[] = ["red", "green", "teal", "orange", "purple", "pink", "blue", "yellow"];

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
    const base: BookingForm = { service: "", variant: "", deviceKind: "", deviceManufacturer: "", deviceModelText: "", issue: "", date: "", time: "", notes: "", visitType: "", visitLocationType: "", homeAddress: "", homeCity: "", homeState: "", homeZip: "", ...initialContact };
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
  // Two questions and an optional box, down from four rows of chips — the
  // last of which ran to thirty options for iPhone alone. A customer booking
  // a repair knows the type and the brand instantly; the exact generation is
  // the part they squint at the back of the phone for, and the shop can read
  // it off the IMEI at intake in one scan. So the model is a hint here, not a
  // gate: whatever is typed goes through, and nothing blocks on it.
  const deviceKinds = DEVICE_KIND_ORDER.filter((kind) =>
    deviceManufacturers.some((m) => m.categories.some((c) => c.name === kind)),
  );
  const brandsForKind = form.deviceKind
    ? deviceManufacturers.filter((m) =>
        m.categories.some((c) => c.name === form.deviceKind),
      )
    : [];
  const brandIsOther = form.deviceManufacturer === "__other__";
  const selectedManufacturer = deviceManufacturers.find((m) => m.id === form.deviceManufacturer);
  const selectedCategory = selectedManufacturer?.categories.find((c) => c.name === form.deviceKind);
  // Suggestions for the model box, from the same catalogue the shop's own
  // picker reads. A native datalist keeps them one keystroke away without
  // putting thirty chips back on the page.
  const modelSuggestions = (selectedCategory?.models || []).flatMap((m) =>
    m.generations.length ? m.generations.map((g) => `${m.name} ${g}`) : [m.name],
  );
  const isHomeAddressStep = visitType === "home" && step === 3;
  const contactStepIndex = visitType === "home" ? 4 : 3;
  const confirmStepIndex = visitType === "home" ? 5 : 4;
  const canNext = () => {
    if (step === 0) return !!form.service && (!selectedService?.variants?.length || !!form.variant);
    if (step === 1) {
      return !!form.deviceKind && !!form.deviceManufacturer;
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
  const deviceTypeLabel = brandIsOther
    ? form.deviceKind
    : [selectedManufacturer?.name, form.deviceKind].filter(Boolean).join(" ") || form.deviceKind;
  const deviceModelLabel = form.deviceModelText.trim();
  // The model is optional now, so only join when there is one — otherwise the
  // review screen reads "Samsung Phone — " with nothing after the dash.
  const deviceSummary = [deviceTypeLabel, deviceModelLabel].filter(Boolean).join(" — ");
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
    const bookingPayload = { ...form, service: serviceLabel, deviceType: deviceTypeLabel, deviceModel: deviceModelLabel, device_type: deviceTypeLabel, device_model: deviceModelLabel, visit_type: visitType, visit_location_type: visitType === "home" ? form.visitLocationType : undefined, home_address: visitType === "home" ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}` : undefined };
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
  const goBack = () => {
    if (step > 0) { setStep((s) => s - 1); return; }
    if (visitType === "home" && form.visitLocationType) { update("visitLocationType", ""); return; }
    setVisitType("");
  };

  const isPage = mode === "page";
  const title = <>{isPage ? <h2 className="m-0 inline text-[16px]">Book Appointment</h2> : <Modal.Heading className="m-0 inline text-[16px] text-white">Book Appointment</Modal.Heading>}</>;
  const cancelBtn = isPage ? undefined : (
    <button className="ios-bar-btn" type="button" onClick={onClose}><X aria-hidden="true" className="size-3.5" />Cancel</button>
  );
  const backBtn = (
    <button className="ios-bar-btn" type="button" onClick={goBack}><ChevronLeft aria-hidden="true" className="size-3.5" />Back</button>
  );
  const visitLabel = visitType === "home" ? `Home visit · ${form.visitLocationType === "commercial" ? "Commercial" : "Residential"}` : "In-store";
  const reviewRows = (
    <>
      <IosSummaryRow label="Visit" value={visitType === "home" ? `Home Visit — ${form.visitLocationType === "commercial" ? "Commercial" : "Residential"}` : "In-Store (Fairfield shop)"} />
      <IosSummaryRow label="Service" value={`${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`} />
      <IosSummaryRow label="Device" value={deviceSummary} />
      {form.issue && <IosSummaryRow label="Issue" value={form.issue} />}
      <IosSummaryRow label="When" value={`${form.date} at ${form.time}`} />
      {visitType === "home" && <IosSummaryRow label="Address" value={`${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`} />}
      <IosSummaryRow label="Name" value={form.name} />
      <IosSummaryRow label="Phone" value={form.phone} />
      <IosSummaryRow label="Email" value={form.email} />
      {form.notes && <IosSummaryRow label="Notes" value={form.notes} />}
      {visitType === "home" && <IosSummaryRow label="House call" value={`${activeHouseCallRate} (collected at service)`} />}
    </>
  );

  const content = done ? (
    <>
      <IosSheetHeader right={isPage ? undefined : <button className="ios-bar-btn ios-bar-btn--done" type="button" onClick={onClose}>Done</button>} title={title} />
      <div className="ios-sheet-body flex flex-col items-center gap-3 pt-6 text-center">
        <span className="ios-bounce"><AppIcon color="green" icon={Check} size={76} /></span>
        <h3 className="letterpress m-0 text-xl font-extrabold text-[var(--ios-ink)]">You&rsquo;re all set!</h3>
        <p className="m-0 max-w-[34ch] text-sm text-[var(--ios-slate)]">Your appointment request has been submitted. We&rsquo;ll confirm via phone or email within 2 hours during business hours.</p>
        {visitType === "home" && <IosNote><Home aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>Our technician will come to your address.</span></IosNote>}
        <IosGroup className="w-full text-left" title="Your appointment">{reviewRows}</IosGroup>
        <button className="ios-leather w-full rounded-card p-4 text-left" type="button" onClick={() => { onClose(); navigate("/protection"); }}>
          <span className="relative flex items-center gap-3">
            <AppIcon color="purple" icon={Shield} size={44} />
            <span className="min-w-0 flex-1"><strong className="block text-sm">Protect this device from future damage</strong><span className="text-xs opacity-90">AKKO device insurance from $5/mo with $29 deductibles</span></span>
            <ChevronRight aria-hidden="true" className="size-5" />
          </span>
        </button>
      </div>
      <div className="ios-sheet-footer"><button className="ios-btn ios-btn--green ios-btn--lg w-full" type="button" onClick={isPage ? resetWizard : onClose}>{isPage ? "Book another repair" : "Done"}</button></div>
    </>
  ) : visitType === "" ? (
    <>
      <IosSheetHeader left={cancelBtn} title={title} subtitle="How would you like your device serviced?" />
      <div className="ios-sheet-body grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button className="ios-bigchoice" id="visit-type-in-store" type="button" onClick={() => setVisitType("in-store")}>
          <AppIcon color="green" icon={Store} size={64} />
          <strong className="text-lg text-[var(--ios-ink)]">In-Store Visit</strong>
          <span className="text-sm leading-snug text-muted">Drop off at our Fairfield, IL shop. Most repairs done same-day while you wait.</span>
          <span className="ios-pill !normal-case !tracking-normal">Same-day · $35 bench fee · No travel fee</span>
        </button>
        <button className="ios-bigchoice" id="visit-type-home" type="button" onClick={() => setVisitType("home")}>
          <AppIcon color="blue" icon={Home} size={64} />
          <strong className="text-lg text-[var(--ios-ink)]">Home Visit</strong>
          <span className="text-sm leading-snug text-muted">We come to you. A technician visits your home or office at a time that works for you.</span>
          <span className="ios-pill !normal-case !tracking-normal">Residential &amp; commercial rates</span>
        </button>
        <p className="ios-group-footer sm:col-span-2">Home visits are available within 25 miles of Fairfield, IL. House call fees are collected at time of service.</p>
      </div>
    </>
  ) : visitType === "home" && !form.visitLocationType ? (
    <>
      <IosSheetHeader left={backBtn} right={cancelBtn} title={title} subtitle="Home Visit" />
      <div className="ios-sheet-body">
        <IosGroup footer="Flat rate for the first hour, 50% off every hour after. Collected at time of service." title="Is this a residential or commercial address?">
          <IosChoice detail={locationRateLine("residential")} id="visit-location-residential" selected={false} title="Residential" onClick={() => update("visitLocationType", "residential")} />
          <IosChoice detail={locationRateLine("commercial")} id="visit-location-commercial" selected={false} title="Commercial" onClick={() => update("visitLocationType", "commercial")} />
        </IosGroup>
      </div>
    </>
  ) : (
    <>
      <IosSheetHeader left={backBtn} right={cancelBtn} subtitle={visitLabel} title={title} />
      <IosProgress index={step} steps={STEPS} />
      <div className="ios-sheet-body flex flex-col">
        {visitType === "home" && <IosNote><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span><strong>House call rate</strong> — {activeHouseCallRate}, collected at service time.</span></IosNote>}

        {step === 0 && (
          <>
            <IosGroup footer="Select the repair you need." title="What needs fixing?">
              {repairServices.map((svc, i) => (
                <IosChoice
                  key={svc.id}
                  detail={`${svc.priceRange} · ${svc.duration}`}
                  icon={<AppIcon color={SERVICE_COLORS[i % SERVICE_COLORS.length]} icon={Wrench} size={36} />}
                  selected={form.service === svc.id}
                  title={svc.name}
                  onClick={() => { update("service", svc.id); update("variant", ""); }}
                />
              ))}
            </IosGroup>
            {selectedService?.variants && selectedService.variants.length > 0 && (
              <IosGroup title="Select part option">
                {selectedService.variants.map((v) => (
                  <IosChoice key={v.name} selected={form.variant === v.name} title={v.name} trailing={v.price} onClick={() => update("variant", v.name)} />
                ))}
              </IosGroup>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <IosGroup footer="Two quick questions — we'll confirm the exact model when we see it." title="Tell us about your device">
              <div className="p-3"><IosSegmented ariaLabel="Device type" options={deviceKinds.map((k) => ({ value: k, label: k }))} value={form.deviceKind} onChange={(kind) => { update("deviceKind", kind); update("deviceManufacturer", ""); update("deviceModelText", ""); }} /></div>
            </IosGroup>
            {form.deviceKind && (
              <IosGroup title="Brand">
                <div className="p-3"><IosSegmented ariaLabel="Brand" options={[...brandsForKind.map((m) => ({ value: m.id, label: m.name })), { value: "__other__", label: "Other…" }]} value={form.deviceManufacturer} onChange={(id) => { update("deviceManufacturer", id); update("deviceModelText", ""); }} /></div>
              </IosGroup>
            )}
            <IosGroup footer={brandIsOther ? "Whatever you know — make and model." : "Not sure? Leave the model blank and we'll identify it when you drop the device off."} title="Details">
              {form.deviceManufacturer && <IosField label={brandIsOther ? "Device" : "Model"} list="booking-model-suggestions" placeholder={brandIsOther ? "e.g. Fairphone 5" : `e.g. ${modelSuggestions[0] || "exact model"}`} value={form.deviceModelText} onChange={(v) => update("deviceModelText", v)} />}
              <IosField label="Issue" placeholder="Cracked screen, won't charge…" value={form.issue} onChange={(v) => update("issue", v)} />
            </IosGroup>
            {/* Native datalist: suggestions one keystroke away, no chip wall, and typing something not on the list is always allowed. */}
            <datalist id="booking-model-suggestions">{modelSuggestions.map((m) => <option key={m} value={m} />)}</datalist>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="ios-group-title">Pick a day</h3>
            <div aria-label="Appointment day" className="ios-days" role="radiogroup">
              {days.map((d) => {
                const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

                return (
                  <button key={label} aria-checked={form.date === label} className={`ios-day ${form.date === label ? "is-selected" : ""}`} role="radio" type="button" onClick={() => update("date", label)}>
                    <span>{d.toLocaleDateString("en-US", { month: "short" })}</span>
                    <strong>{d.getDate()}</strong>
                    <span>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  </button>
                );
              })}
            </div>
            <p className="ios-group-footer mb-3">Monday – Saturday. Sundays closed.</p>
            {form.date && (
              <>
                <h3 className="ios-group-title">Pick a time</h3>
                <div aria-label="Appointment time" className="ios-slots" role="radiogroup">
                  {TIMES.map((t) => (
                    <button key={t} aria-checked={form.time === t} className={`ios-btn ios-btn--sm ${form.time === t ? "ios-btn--green" : "ios-btn--gray"}`} role="radio" type="button" onClick={() => update("time", t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {isHomeAddressStep && (
          <>
            <IosGroup footer={<>Home visits are available within 25 miles of Fairfield, IL. The <strong>{activeHouseCallRate}</strong> house call rate is collected at time of service.</>} title="Your service address">
              <IosField autoComplete="street-address" label="Street" placeholder="123 Main St" required value={form.homeAddress} onChange={(v) => update("homeAddress", v)} />
              <IosField autoComplete="address-level2" label="City" placeholder="Fairfield" required value={form.homeCity} onChange={(v) => update("homeCity", v)} />
              <IosField autoComplete="address-level1" label="State" placeholder="IL" required value={form.homeState} onChange={(v) => update("homeState", v)} />
              <IosField autoComplete="postal-code" inputMode="numeric" label="ZIP" placeholder="62837" required value={form.homeZip} onChange={(v) => update("homeZip", v)} />
            </IosGroup>
          </>
        )}

        {step === contactStepIndex && (
          <IosGroup footer="We'll confirm your appointment and reach out with any questions." title="Your contact info">
            <IosField autoComplete="name" label="Name" placeholder="Jane Doe" required value={form.name} onChange={(v) => update("name", v)} />
            <IosField autoComplete="tel" inputMode="tel" label="Phone" placeholder="618-555-0123" required type="tel" value={form.phone} onChange={(v) => update("phone", v)} />
            <IosField autoComplete="email" inputMode="email" label="Email" placeholder="jane@example.com" required type="email" value={form.email} onChange={(v) => update("email", v)} />
            <IosField label="Notes" placeholder="Optional" value={form.notes} onChange={(v) => update("notes", v)} />
          </IosGroup>
        )}

        {step === confirmStepIndex && (
          <IosGroup footer={visitType === "home" ? "By confirming, you agree to be available at the provided address at the scheduled time. Same-day cancellations should be made by phone." : "By confirming, you agree to bring your device in at the scheduled time. Same-day cancellations should be made by phone."} title="Review your booking">
            {reviewRows}
          </IosGroup>
        )}
      </div>
      <div className="ios-sheet-footer">
        {step < STEPS.length - 1 ? (
          <button className="ios-btn ios-btn--lg w-full" disabled={!canNext()} type="button" onClick={() => setStep((s) => s + 1)}>
            <span>Continue</span><ChevronRight aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <button className="ios-btn ios-btn--green ios-btn--lg w-full" disabled={sending} type="button" onClick={() => { play("success"); void handleSubmit(); }}>
            <span>{sending ? "Sending…" : "Confirm Booking"}</span>{!sending && <Check aria-hidden="true" className="size-5" />}
          </button>
        )}
      </div>
    </>
  );

  if (isPage) {
    return (
      <div className="ios-dialog mx-auto flex w-full max-w-3xl flex-col rounded-panel border border-[#6f7686] shadow-[var(--elev-3)]">
        {content}
      </div>
    );
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen className="z-[100]" onOpenChange={(open) => !open && onClose()}>
        <Modal.Container className="pb-24 lg:pb-0" scroll="inside" size="lg">
          <Modal.Dialog className="ios-dialog flex max-h-[min(800px,calc(100dvh-1rem))] flex-col">{content}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
