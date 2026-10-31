import { useCopy } from "@/lib/copy";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { Home, MapPin, Store } from "lucide-react";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Calendar } from "@/components/arc/calendar/calendar";
import { ChipGroup } from "@/components/arc/chip-group/chip-group";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { Input } from "@/components/arc/input/input";
import { RadioCards } from "@/components/arc/radio-cards/radio-cards";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Select } from "@/components/arc/select/select";
import { Stepper } from "@/components/arc/stepper/stepper";
import { BUSINESS, getEmailJSConfig } from "@/lib/config";
import { DEVICE_KIND_ORDER, useSiteStore } from "@/lib/siteStore";
import { useToastStore } from "@/lib/store";
import { isSupabaseConfigured, sbFetchDeviceCatalog, sbFetchRepairCatalog, sbInsertBooking, type CatalogDevice, type RepairCatalogItem } from "@/lib/supabase";
import { modelsForBrand, quotesForModel } from "@/lib/repairCatalog";
import { useAuth } from "@/lib/AuthContext";

const IN_STORE_STEPS = ["Device", "Repair", "Schedule", "Contact", "Confirm"];
const HOME_STEPS = ["Device", "Repair", "Schedule", "Address", "Contact", "Confirm"];
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
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function money(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

export default function BookingWizard({ onClose = () => {}, defaultService = null, mode = "modal" }: BookingWizardProps) {
  const c = useCopy();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const repairServices = useSiteStore((s) => s.repairServices);
  const deviceManufacturers = useSiteStore((s) => s.deviceManufacturers) || [];
  const houseCallPricing = useSiteStore((s) => s.houseCallPricing);
  const addToast = useToastStore((s) => s.add);
  const [catalog, setCatalog] = useState<RepairCatalogItem[]>([]);
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [quote, setQuote] = useState<number | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void sbFetchRepairCatalog().then((items) => items && setCatalog(items));
    void sbFetchDeviceCatalog().then((items) => items && setDevices(items));
  }, []);
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
  // Live prices from the shop's POS service list, matched on the exact model typed or picked.
  const brandName = selectedManufacturer?.name || "";
  const liveModels = catalog.length && brandName ? modelsForBrand(catalog, brandName) : [];
  const shopModels = (selectedCategory?.models || []).flatMap((m) =>
    m.generations.length ? m.generations.map((g) => `${m.name} ${g}`) : [m.name],
  );
  // Models with posted prices come first; the shop's own list fills in the rest.
  // The wizard's device types map onto the POS catalogue's broader category names.
  const KIND_CATEGORIES: Record<string, string[]> = { Phone: ["Smartphone"], Tablet: ["Tablet"], Laptop: ["Laptop"], Desktop: ["Desktop"], Watch: ["Smartwatch"], Audio: ["Audio", "Headphones"] };
  const posModels = brandName && form.deviceKind
    ? devices.filter((d) => d.brand.toLowerCase() === brandName.toLowerCase() && (KIND_CATEGORIES[form.deviceKind] || []).some((k) => d.category.startsWith(k))).map((d) => d.name)
    : [];
  const modelSuggestions = [...new Set([...liveModels, ...posModels, ...shopModels])];
  const catalogQuotes = catalog.length && !brandIsOther && brandName && form.deviceModelText.trim() ? quotesForModel(catalog, brandName, form.deviceModelText) : [];
  const catalogPick = catalogQuotes.find((q) => q.id === form.service) ?? null;
  const priceLine = catalogPick ? money(catalogPick.price) : selectedService?.priceRange || "";
  const repairLabelText = catalogPick ? `${catalogPick.repair}${catalogPick.variant ? ` (${catalogPick.variant})` : ""}` : "";
  const isHomeAddressStep = visitType === "home" && step === 3;
  const contactStepIndex = visitType === "home" ? 4 : 3;
  const confirmStepIndex = visitType === "home" ? 5 : 4;
  const canNext = () => {
    if (step === 0) return !!form.deviceKind && !!form.deviceManufacturer;
    if (step === 1) return !!form.service && (!!catalogPick || (!!selectedService && (!selectedService.variants?.length || !!form.variant)));
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
  // The shop's POS price list is the source of truth for house calls; the Site editor rates are the fallback.
  const posHouseCall = (type: "residential" | "commercial") =>
    catalog.find((c) => c.category === "House Calls" && new RegExp(type === "residential" ? "^consumer" : "^commercial", "i").test(c.name));
  const locationRateLine = (type: "residential" | "commercial") => {
    const live = posHouseCall(type);

    if (live) return `${money(live.price)} house call fee`;
    const p = houseCallPricing;
    const first = type === "residential" ? p.residentialFirstHour : p.commercialFirstHour;
    const rest = type === "residential" ? p.residentialAdditionalHourRate : p.commercialAdditionalHourRate;
    return `${money(first)} first hour, ${money(rest)}/hr after`;
  };
  const activeHouseCallRate = form.visitLocationType ? locationRateLine(form.visitLocationType) : "";
  const handleSubmit = async () => {
    setSending(true);
    const service = repairServices.find((s) => s.id === form.service);
    const serviceLabel = catalogPick ? repairLabelText : form.variant ? `${service?.name} (${form.variant})` : service?.name || form.service;
    const bookingPayload = { ...form, service: serviceLabel, service_id: catalogPick?.id, date_iso: pickedDay ? isoDay(pickedDay) : undefined, deviceType: deviceTypeLabel, deviceModel: deviceModelLabel, device_type: deviceTypeLabel, device_model: deviceModelLabel, visit_type: visitType, visit_location_type: visitType === "home" ? form.visitLocationType : undefined, home_address: visitType === "home" ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}` : undefined };
    if (!import.meta.env.DEV || isSupabaseConfigured()) {
      try { const result = await sbInsertBooking(bookingPayload as never); if (typeof result.price === "number" && result.price > 0) setQuote(result.price); }
      catch (bookingError) { addToast(bookingError instanceof Error ? bookingError.message : "Submission blocked. Please try again.", "error"); setSending(false); return; }
    }
    try {
      const emailjsConfig = getEmailJSConfig();
      if (!emailjsConfig.serviceId || !emailjsConfig.bookingTemplateId || !emailjsConfig.publicKey) {
        console.warn("[EmailJS] Missing configuration. Missing keys:", { serviceId: !emailjsConfig.serviceId, bookingTemplateId: !emailjsConfig.bookingTemplateId, publicKey: !emailjsConfig.publicKey });
      } else {
        await emailjs.send(emailjsConfig.serviceId, emailjsConfig.bookingTemplateId, { to_email: BUSINESS.email, recipient_email: BUSINESS.email, customer_name: form.name, customer_phone: form.phone, customer_email: form.email, email: form.email, reply_to: form.email, service_type: serviceLabel, quoted_price: priceLine || "TBD", device_type: deviceTypeLabel, device_model: deviceModelLabel, issue_description: form.issue || "None", appointment_date: form.date, appointment_time: form.time, special_notes: form.notes || "None", visit_type: visitType === "home" ? "Home Visit" : "In-Store", visit_location_type: visitType === "home" ? (form.visitLocationType === "commercial" ? "Commercial" : "Residential") : "N/A", home_address: visitType === "home" ? `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}` : "N/A" }, emailjsConfig.publicKey);
      }
    } catch (e) {
      console.error("[EmailJS error]:", e);
      if (!isSupabaseConfigured()) addToast("Booking submitted! (Check console for EmailJS configuration)", "info");
    }
    setSending(false); setDone(true);
  };
  const days = getNextDays();
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const pickedDay = days.find((d) => dayLabel(d) === form.date);

  const goBack = () => {
    if (step > 0) { setStep((s) => s - 1); return; }
    if (visitType === "home" && form.visitLocationType) { update("visitLocationType", ""); return; }
    setVisitType("");
  };

  const isPage = mode === "page";
  const needsVisit = visitType === "";
  const needsLocation = visitType === "home" && !form.visitLocationType;
  const lastStep = step === STEPS.length - 1;
  const visitLabel = visitType === "home" ? `Home visit, ${form.visitLocationType === "commercial" ? "commercial" : "residential"}` : "In-store visit";

  const summary = (
    <div className="mc-group">
      {[
        ["Visit", visitType === "home" ? `Home visit (${form.visitLocationType})` : "In-store, Fairfield shop"],
        ["Device", deviceSummary],
        ["Repair", catalogPick ? repairLabelText : `${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`],
        ...(priceLine ? [[catalogPick ? "Quoted price" : "Estimated price", `${priceLine}${catalogPick ? ", final price confirmed after diagnosis" : ""}`]] : []),
        ...(form.issue ? [["Issue", form.issue]] : []),
        ["When", `${form.date} at ${form.time}`],
        ...(visitType === "home" ? [["Address", `${form.homeAddress}, ${form.homeCity}, ${form.homeState} ${form.homeZip}`], ["House call rate", `${activeHouseCallRate}, collected at service`]] : []),
        ["Name", form.name],
        ["Phone", form.phone],
        ["Email", form.email],
        ...(form.notes ? [["Notes", form.notes]] : []),
      ].map(([k, v]) => (
        <div key={k} className="mc-item mc-item--between" style={{ alignItems: "start" }}>
          <span className="mc-item-label">{k}</span>
          <span className="mc-strong" style={{ textAlign: "right", overflowWrap: "anywhere" }}>{v}</span>
        </div>
      ))}
    </div>
  );

  let title = c("wizard.title");
  let description = "How would you like your device serviced?";

  if (done) { title = "You're all set"; description = "Your appointment request has been submitted."; }
  else if (needsLocation) description = "Is this a residential or commercial address?";
  else if (!needsVisit) description = `${visitLabel}. Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}.`;

  const body = done ? (
    <div className="mc-stack">
      {quote !== null && <Alert title={`Quoted ${money(quote)}`} tone="success">Your repair is saved in our shop system. The final price is confirmed after diagnosis.</Alert>}
      <p className="mc-text"><span {...c.p("wizard.after")}>{c("wizard.after")}</span>{visitType === "home" ? " Our technician will come to your address." : ""}</p>
      {summary}
      <Alert title="Protect this device from future damage" tone="info">
        AKKO device insurance starts at $5 a month with $29 deductibles.{" "}
        <a className="mc-link" href="/protection" onClick={(e) => { e.preventDefault(); onClose(); navigate("/protection"); }}>View plans</a>
      </Alert>
      <div className="mc-actions" style={{ justifyContent: "flex-end" }}>
        <Button onClick={isPage ? resetWizard : onClose}><span {...c.p(isPage ? "wizard.another" : "wizard.done")}>{c(isPage ? "wizard.another" : "wizard.done")}</span></Button>
      </div>
    </div>
  ) : (
    <div className="mc-stack">
      {!needsVisit && !needsLocation && <Stepper compact current={step} label="Booking progress" steps={STEPS.map((label) => ({ id: label, label: c(`wizard.step.${label.toLowerCase()}`) }))} />}

      {needsVisit && (
        <>
          <RadioCards
            aria-label="Visit type"
            layout="list"
            options={[
              { value: "in-store", label: "In-store visit", description: "Drop off at our Fairfield, IL shop. Most repairs are done the same day. $35 bench fee, no travel fee.", icon: <Store aria-hidden="true" size={18} strokeWidth={1.75} /> },
              { value: "home", label: "Home visit", description: "A technician comes to your home or office within 25 miles of Fairfield. House call fees are collected at service.", icon: <Home aria-hidden="true" size={18} strokeWidth={1.75} /> },
            ]}
            value={null}
            onValueChange={(v) => setVisitType(v as "in-store" | "home")}
          />
        </>
      )}

      {needsLocation && (
        <>
          <RadioCards
            aria-label="Location type"
            layout="list"
            options={[
              { value: "residential", label: "Residential", description: locationRateLine("residential") },
              { value: "commercial", label: "Commercial", description: locationRateLine("commercial") },
            ]}
            value={null}
            onValueChange={(v) => update("visitLocationType", v as "residential" | "commercial")}
          />
          <p className="mc-small">{posHouseCall("residential") ? "Collected at time of service." : "Flat rate for the first hour, 50% off every hour after. Collected at time of service."}</p>
        </>
      )}

      {!needsVisit && !needsLocation && visitType === "home" && (
        <Alert title={`House call rate: ${activeHouseCallRate}`} tone="info">Collected at service time.</Alert>
      )}

      {!needsVisit && !needsLocation && step === 0 && (
        <>
          <div className="mc-stack-sm">
            <span className="mc-gl" style={{ margin: 0 }}>Device type</span>
            <SegmentedControl
              label="Device type"
              options={deviceKinds.map((k) => ({ value: k, label: k }))}
              value={form.deviceKind}
              onValueChange={(kind) => { update("deviceKind", kind); update("deviceManufacturer", ""); update("deviceModelText", ""); }}
            />
          </div>
          {form.deviceKind && (
            <Select
              label="Brand"
              options={[...brandsForKind.map((m) => ({ value: m.id, label: m.name })), { value: "__other__", label: "Other" }]}
              placeholder="Choose a brand"
              value={form.deviceManufacturer}
              onValueChange={(id) => { update("deviceManufacturer", id); update("deviceModelText", ""); }}
            />
          )}
          {form.deviceManufacturer && (
            <Input
              description={brandIsOther ? "Whatever you know: make and model." : "Not sure? Leave it blank and we'll identify it at drop-off."}
              label={brandIsOther ? "Which device is it?" : "Model (optional)"}
              list="booking-model-suggestions"
              placeholder={brandIsOther ? "For example, Fairphone 5" : `For example, ${modelSuggestions[0] || "the exact model"}`}
              value={form.deviceModelText}
              onChange={(e) => update("deviceModelText", e.target.value)}
            />
          )}
          {/* Native datalist: suggestions one keystroke away, and typing something not on the list is always allowed. */}
          <datalist id="booking-model-suggestions">{modelSuggestions.map((m) => <option key={m} value={m} />)}</datalist>
          <Input label="What's wrong? (optional)" placeholder="Cracked screen, won't charge" value={form.issue} onChange={(e) => update("issue", e.target.value)} />
        </>
      )}

      {!needsVisit && !needsLocation && step === 1 && (
        <>
          {catalogQuotes.length > 0 ? (
            <RadioCards
              aria-label="Repair"
              layout="list"
              options={catalogQuotes.map((q) => ({ value: q.id, label: q.repair, description: q.variant || (q.minutes ? `About ${q.minutes} min` : undefined), meta: money(q.price) }))}
              value={form.service || null}
              onValueChange={(v) => { update("service", v); update("variant", ""); }}
            />
          ) : (
            <>
              {catalog.length > 0 && form.deviceModelText.trim() !== "" && !brandIsOther && (
                <Alert title="No posted price for that model yet" tone="info">Pick the closest repair and we&apos;ll confirm the exact price when you drop off.</Alert>
              )}
          <RadioCards
            aria-label="Repair service"
            layout="list"
            options={repairServices.map((svc) => ({ value: svc.id, label: svc.name, description: svc.duration, meta: svc.priceRange }))}
            value={form.service || null}
            onValueChange={(v) => { update("service", v); update("variant", ""); }}
          />
          {selectedService?.variants && selectedService.variants.length > 0 && (
            <RadioCards
              aria-label="Part option"
              layout="list"
              options={selectedService.variants.map((v) => ({ value: v.name, label: v.name, meta: v.price }))}
              value={form.variant || null}
              onValueChange={(v) => update("variant", v)}
            />
          )}
            </>
          )}
        </>
      )}

      {!needsVisit && !needsLocation && step === 2 && (
        <>
          <div className="mc-stack-sm">
            <span className="mc-gl" style={{ margin: 0 }}>Day (Monday to Saturday)</span>
            <Calendar
              disabledDates={(d) => d.getDay() === 0}
              maxDate={lastDay}
              minDate={firstDay}
              showToday={false}
              value={pickedDay}
              onChange={(d) => update("date", dayLabel(d))}
            />
          </div>
          {form.date && (
            <ChipGroup
              label="Time"
              multiple={false}
              options={TIMES.map((t) => ({ value: t, label: t }))}
              value={form.time ? [form.time] : []}
              onValueChange={(v) => update("time", v[0] ?? "")}
            />
          )}
        </>
      )}

      {!needsVisit && !needsLocation && isHomeAddressStep && (
        <>
          <Input autoComplete="street-address" label="Street address" placeholder="123 Main St" required value={form.homeAddress} onChange={(e) => update("homeAddress", e.target.value)} />
          <div className="mc-form-2">
            <Input autoComplete="address-level2" label="City" placeholder="Fairfield" required value={form.homeCity} onChange={(e) => update("homeCity", e.target.value)} />
            <Input autoComplete="address-level1" label="State" placeholder="IL" required value={form.homeState} onChange={(e) => update("homeState", e.target.value)} />
          </div>
          <Input autoComplete="postal-code" inputMode="numeric" label="ZIP code" placeholder="62837" required value={form.homeZip} onChange={(e) => update("homeZip", e.target.value)} />
          <p className="mc-small"><MapPin aria-hidden="true" size={14} strokeWidth={1.75} style={{ verticalAlign: "-2px", marginRight: 6 }} />Home visits are available within 25 miles of Fairfield, IL. The {activeHouseCallRate} rate is collected at time of service.</p>
        </>
      )}

      {!needsVisit && !needsLocation && step === contactStepIndex && (
        <>
          <Input autoComplete="name" label="Full name" required value={form.name} onChange={(e) => update("name", e.target.value)} />
          <div className="mc-form-2">
            <Input autoComplete="tel" inputMode="tel" label="Phone" required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            <Input autoComplete="email" inputMode="email" label="Email" required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <Input description="We'll confirm your appointment and reach out with any questions." label="Notes (optional)" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </>
      )}

      {!needsVisit && !needsLocation && step === confirmStepIndex && (
        <>
          {summary}
          <p className="mc-small">
            {visitType === "home"
              ? "By confirming, you agree to be available at the provided address at the scheduled time. Same-day cancellations should be made by phone."
              : "By confirming, you agree to bring your device in at the scheduled time. Same-day cancellations should be made by phone."}
          </p>
        </>
      )}

      {!needsVisit && !needsLocation && (
        <div className="mc-actions" style={{ justifyContent: "space-between" }}>
          <Button variant="secondary" onClick={goBack}><span {...c.p("wizard.back")}>{c("wizard.back")}</span></Button>
          {lastStep ? (
            <Button loading={sending} onClick={handleSubmit}><span {...c.p("wizard.confirm")}>{c("wizard.confirm")}</span></Button>
          ) : (
            <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}><span {...c.p("wizard.continue")}>{c("wizard.continue")}</span></Button>
          )}
        </div>
      )}

      {((needsVisit && !isPage) || needsLocation) && (
        <div className="mc-actions" style={{ justifyContent: "space-between" }}>
          <Button variant="secondary" onClick={needsVisit ? onClose : goBack}>{needsVisit && !isPage ? "Cancel" : "Back"}</Button>
        </div>
      )}
    </div>
  );

  if (isPage) {
    return (
      <div className="mc-card mx-auto" style={{ maxWidth: "44rem", marginInline: "auto" }}>
        <div className="mc-stack" style={{ marginBottom: "var(--space-6)", gap: "var(--space-1)" }}>
          <h2 className="mc-h3">{title}</h2>
          <p className="mc-small">{description}</p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mc-dialog" description={description} title={title}>
        {body}
      </DialogContent>
    </Dialog>
  );
}
