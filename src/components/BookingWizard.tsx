import { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Wrench,
} from "lucide-react";
import {
  Button,
  FieldError,
  InputGroup,
  Label,
  Modal,
  TextField,
} from "@heroui/react";

import { BUSINESS, getEmailJSConfig } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";
import { useToastStore } from "@/lib/store";
import { isSupabaseConfigured, sbInsertBooking } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const STEPS = ["Service", "Device", "Schedule", "Contact", "Confirm"];
const TIMES = [
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
  service: string;
  variant: string;
  deviceType: string;
  deviceModel: string;
  issue: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
}

interface BookingWizardProps {
  onClose: () => void;
  defaultService?: string | null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <strong className="text-right text-foreground">{value}</strong>
    </div>
  );
}

export default function BookingWizard({
  onClose,
  defaultService = null,
}: BookingWizardProps) {
  const { user, profile } = useAuth();
  const repairServices = useSiteStore((s) => s.repairServices);
  const deviceTypes = useSiteStore((s) => s.deviceTypes) || [];
  const addToast = useToastStore((s) => s.add);

  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState<BookingForm>(() => {
    const initialContact = {
      name: profile?.full_name || "",
      phone: profile?.phone || "",
      email: user?.email || "",
    };
    const base: BookingForm = {
      service: "",
      variant: "",
      deviceType: "",
      deviceModel: "",
      issue: "",
      date: "",
      time: "",
      notes: "",
      ...initialContact,
    };

    if (defaultService) {
      const match = repairServices.find(
        (s) => s.name.toLowerCase() === defaultService.toLowerCase(),
      );

      if (match) return { ...base, service: match.id };
    }

    return base;
  });

  useEffect(() => {
    if (defaultService) {
      const match = repairServices.find(
        (s) => s.name.toLowerCase() === defaultService.toLowerCase(),
      );

      if (match) setStep(1);
    }
  }, []);

  const update = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectedService = repairServices.find((s) => s.id === form.service);
  const selectedDeviceType = deviceTypes.find(
    (d) => d.name === form.deviceType || d.id === form.deviceType,
  );

  const canNext = () => {
    if (step === 0)
      return (
        !!form.service && (!selectedService?.variants?.length || !!form.variant)
      );
    if (step === 1) return !!form.deviceType && !!form.deviceModel;
    if (step === 2) return !!form.date && !!form.time;
    if (step === 3)
      return (
        !!form.name &&
        !!form.phone &&
        !!form.email &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      );

    return true;
  };

  const handleSubmit = async () => {
    setSending(true);
    const service = repairServices.find((s) => s.id === form.service);
    const serviceLabel = form.variant
      ? `${service?.name} (${form.variant})`
      : service?.name || form.service;

    if (!import.meta.env.DEV || isSupabaseConfigured()) {
      try {
        await sbInsertBooking({ ...form, service: serviceLabel });
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
        !emailjsConfig.serviceId ||
        !emailjsConfig.bookingTemplateId ||
        !emailjsConfig.publicKey
      ) {
        console.warn("[EmailJS] Missing configuration. Missing keys:", {
          serviceId: !emailjsConfig.serviceId,
          bookingTemplateId: !emailjsConfig.bookingTemplateId,
          publicKey: !emailjsConfig.publicKey,
        });
      } else {
        await emailjs.send(
          emailjsConfig.serviceId,
          emailjsConfig.bookingTemplateId,
          {
            to_email: BUSINESS.email,
            recipient_email: BUSINESS.email,
            customer_name: form.name,
            customer_phone: form.phone,
            customer_email: form.email,
            email: form.email,
            reply_to: form.email,
            service_type: serviceLabel,
            device_type: form.deviceType,
            device_model: form.deviceModel,
            issue_description: form.issue || "None",
            appointment_date: form.date,
            appointment_time: form.time,
            special_notes: form.notes || "None",
          },
          emailjsConfig.publicKey,
        );
      }
    } catch (e) {
      console.error("[EmailJS error]:", e);
      if (!isSupabaseConfigured())
        addToast(
          "Booking submitted! (Check console for EmailJS configuration)",
          "info",
        );
    }

    setSending(false);
    setDone(true);
  };

  const days = getNextDays();

  const selectableCard = (selected: boolean) =>
    `w-full cursor-pointer rounded-2xl border p-3 text-center transition-colors ${
      selected
        ? "border-accent bg-accent-soft"
        : "border-border bg-surface hover:bg-surface-secondary"
    }`;
  const chipButton = (selected: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
      selected
        ? "border-accent bg-accent text-accent-foreground"
        : "border-border bg-surface text-foreground hover:bg-surface-secondary"
    }`;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        className="z-[100]"
        onOpenChange={(open) => !open && onClose()}
      >
        <Modal.Container className="pb-24 lg:pb-0" scroll="inside" size="lg">
          <Modal.Dialog>
            {done ? (
              <>
                <Modal.Body className="flex flex-col items-center gap-3 pt-8 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Check className="size-7" />
                  </span>
                  <h2 className="m-0 text-xl font-bold text-foreground">
                    You&rsquo;re all set!
                  </h2>
                  <p className="m-0 text-sm text-muted">
                    Your appointment request has been submitted. We&rsquo;ll
                    confirm via phone or email within 2 hours during business
                    hours.
                  </p>
                  <div className="mt-2 w-full rounded-2xl border border-border p-4">
                    <DetailRow
                      label="Service"
                      value={`${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`}
                    />
                    <DetailRow
                      label="Device"
                      value={`${form.deviceType} — ${form.deviceModel}`}
                    />
                    <DetailRow
                      label="Date"
                      value={`${form.date} at ${form.time}`}
                    />
                    <DetailRow
                      label="Contact"
                      value={`${form.name} · ${form.phone}`}
                    />
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button fullWidth variant="primary" onPress={onClose}>
                    Done
                  </Button>
                </Modal.Footer>
              </>
            ) : (
              <>
                <Modal.Header>
                  <div>
                    <Modal.Heading>Book Appointment</Modal.Heading>
                    <p className="m-0 text-sm text-muted">
                      Step {step + 1} of {STEPS.length} — {STEPS[step]}
                    </p>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                {/* Step progress */}
                <div className="flex items-center gap-1 overflow-x-auto px-6 pb-2">
                  {STEPS.map((s, i) => (
                    <div
                      key={s}
                      className="flex flex-1 items-center gap-2 whitespace-nowrap"
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          i <= step
                            ? "bg-accent text-accent-foreground"
                            : "border border-border text-muted"
                        }`}
                      >
                        {i < step ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <span className="hidden text-xs text-muted sm:inline">
                        {s}
                      </span>
                    </div>
                  ))}
                </div>

                <Modal.Body className="flex flex-col gap-4">
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
                          <button
                            key={svc.id}
                            className={selectableCard(form.service === svc.id)}
                            type="button"
                            onClick={() => {
                              update("service", svc.id);
                              update("variant", "");
                            }}
                          >
                            <Wrench className="mx-auto mb-1 size-5 text-accent" />
                            <strong className="block text-sm text-foreground">
                              {svc.name}
                            </strong>
                            <span className="block text-xs text-foreground">
                              {svc.priceRange}
                            </span>
                            <span className="block text-xs text-muted">
                              {svc.duration}
                            </span>
                          </button>
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
                                <button
                                  key={v.name}
                                  className={`${selectableCard(form.variant === v.name)} flex items-center justify-between text-left`}
                                  type="button"
                                  onClick={() => update("variant", v.name)}
                                >
                                  <div>
                                    <strong className="block text-sm text-foreground">
                                      {v.name}
                                    </strong>
                                    <span className="text-xs text-muted">
                                      {v.price}
                                    </span>
                                  </div>
                                  {form.variant === v.name && (
                                    <CheckCircle2 className="size-4 shrink-0 text-accent" />
                                  )}
                                </button>
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
                          We support most phones, tablets, and gaming consoles.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {deviceTypes.map((d) => (
                          <button
                            key={d.id || d.name}
                            className={chipButton(form.deviceType === d.name)}
                            type="button"
                            onClick={() => {
                              update("deviceType", d.name);
                              update("deviceModel", "");
                            }}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>

                      {selectedDeviceType?.models &&
                        selectedDeviceType.models.length > 0 && (
                          <div>
                            <p className="m-0 mb-2 text-sm font-semibold text-foreground">
                              Select Model
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedDeviceType.models.map((m) => (
                                <button
                                  key={m}
                                  className={chipButton(form.deviceModel === m)}
                                  type="button"
                                  onClick={() => update("deviceModel", m)}
                                >
                                  {m}
                                </button>
                              ))}
                              <button
                                className={chipButton(
                                  !!form.deviceModel &&
                                    !selectedDeviceType.models.includes(
                                      form.deviceModel,
                                    ),
                                )}
                                type="button"
                                onClick={() => update("deviceModel", "")}
                              >
                                Other Model…
                              </button>
                            </div>
                          </div>
                        )}

                      {(!selectedDeviceType?.models?.length ||
                        (!!form.deviceModel &&
                          !selectedDeviceType.models.includes(
                            form.deviceModel,
                          )) ||
                        !form.deviceModel) && (
                        <TextField
                          className="flex flex-col gap-1.5"
                          value={form.deviceModel}
                          onChange={(v) => update("deviceModel", v)}
                        >
                          <Label>Exact model name</Label>
                          <InputGroup>
                            <InputGroup.Input placeholder="e.g. iPhone 15 Pro Max" />
                          </InputGroup>
                        </TextField>
                      )}

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
                          Monday – Saturday. Sundays closed.
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {days.map((d) => {
                          const label = d.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          });

                          return (
                            <button
                              key={label}
                              className={selectableCard(form.date === label)}
                              type="button"
                              onClick={() => update("date", label)}
                            >
                              <span className="block text-xs text-muted">
                                {d.toLocaleDateString("en-US", {
                                  weekday: "short",
                                })}
                              </span>
                              <strong className="block text-foreground">
                                {d.getDate()}
                              </strong>
                              <span className="block text-xs text-muted">
                                {d.toLocaleDateString("en-US", {
                                  month: "short",
                                })}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {form.date && (
                        <div className="flex flex-wrap gap-2">
                          {TIMES.map((t) => (
                            <button
                              key={t}
                              className={chipButton(form.time === t)}
                              type="button"
                              onClick={() => update("time", t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="m-0 text-base font-semibold text-foreground">
                          Your contact info
                        </h3>
                        <p className="m-0 text-sm text-muted">
                          We&rsquo;ll confirm your appointment and reach out
                          with any questions.
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

                  {step === 4 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="m-0 text-base font-semibold text-foreground">
                          Review your booking
                        </h3>
                        <p className="m-0 text-sm text-muted">
                          Everything look right?
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border p-4">
                        <DetailRow
                          label="Service"
                          value={`${selectedService?.name || ""}${form.variant ? ` (${form.variant})` : ""}`}
                        />
                        <DetailRow
                          label="Device"
                          value={`${form.deviceType} — ${form.deviceModel}`}
                        />
                        {form.issue && (
                          <DetailRow label="Issue" value={form.issue} />
                        )}
                        <DetailRow
                          label="Date & Time"
                          value={`${form.date} at ${form.time}`}
                        />
                        <DetailRow label="Name" value={form.name} />
                        <DetailRow label="Phone" value={form.phone} />
                        <DetailRow label="Email" value={form.email} />
                        {form.notes && (
                          <DetailRow label="Notes" value={form.notes} />
                        )}
                      </div>

                      <p className="m-0 text-xs text-muted">
                        By confirming, you agree to bring your device in at the
                        scheduled time. Same-day cancellations should be made by
                        phone.
                      </p>
                    </div>
                  )}
                </Modal.Body>

                <Modal.Footer className="justify-end gap-2">
                  <Button
                    variant="outline"
                    onPress={() =>
                      step === 0 ? onClose() : setStep((s) => s - 1)
                    }
                  >
                    <ChevronLeft className="size-4" />
                    <span>{step === 0 ? "Cancel" : "Back"}</span>
                  </Button>

                  {step < 4 ? (
                    <Button
                      isDisabled={!canNext()}
                      variant="primary"
                      onPress={() => setStep((s) => s + 1)}
                    >
                      <span>Continue</span>
                      <ChevronRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      isDisabled={sending}
                      variant="primary"
                      onPress={handleSubmit}
                    >
                      <span>{sending ? "Sending…" : "Confirm Booking"}</span>
                      {!sending && <Check className="size-4" />}
                    </Button>
                  )}
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
