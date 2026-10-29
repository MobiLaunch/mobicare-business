import type { ChangeEvent, FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import type {
  Appearance,
  DeviceManufacturer,
  Social,
  SiteRepairService,
} from "@/lib/siteStore";

import { useRef, useState } from "react";
import {
  BatteryFull,
  BookOpen,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Droplet,
  FileText,
  Gamepad2,
  Globe,
  HardDrive,
  Headphones,
  Laptop,
  Layers,
  MemoryStick,
  Palette,
  PanelBottom,
  Pencil,
  Plug,
  Plus,
  RotateCcw,
  Save,
  Search,
  Share2,
  Shield,
  Smartphone,
  Tablet,
  Trash2,
  Tv,
  Type as TypeIcon,
  Upload,
  Volume2,
  Watch,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { Input, type InputProps } from "@/components/arc/input/input";
import { Select } from "@/components/arc/select/select";
import { Switch } from "@/components/arc/switch/switch";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Textarea, type TextareaProps } from "@/components/arc/textarea/textarea";

import {
  DEFAULT_SITE_CONTENT,
  FONT_PRESETS,
  useSiteStore,
} from "@/lib/siteStore";
import { useToastStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";

// Each tab edits a local copy of its slice of the site store and commits it
// with a single save, so one click is one Supabase sync. Controls are Arc
// components styled by the shared `ad-*` admin system (see styles/admin.css).

// ─── Shared tab metadata ─────────────────────────────────────────────────
interface TabMeta {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabMeta[] = [
  { id: "brand", label: "Brand", icon: Globe },
  { id: "hero", label: "Hero Section", icon: TypeIcon },
  { id: "trust", label: "Trust Bar", icon: Layers },
  { id: "cta", label: "CTA Strip", icon: FileText },
  { id: "services", label: "Services", icon: Wrench },
  { id: "devices", label: "Devices & Models", icon: Smartphone },
  { id: "about", label: "About Page", icon: BookOpen },
  { id: "business", label: "Business Info", icon: Building2 },
  { id: "footer", label: "Footer", icon: PanelBottom },
  { id: "social", label: "Social Links", icon: Share2 },
  { id: "seo", label: "SEO & Analytics", icon: Search },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const SERVICE_ICONS: { id: string; icon: LucideIcon }[] = [
  { id: "smartphone", icon: Smartphone },
  { id: "tablet_mac", icon: Tablet },
  { id: "laptop_mac", icon: Laptop },
  { id: "tv", icon: Tv },
  { id: "watch", icon: Watch },
  { id: "sports_esports", icon: Gamepad2 },
  { id: "headphones", icon: Headphones },
  { id: "speaker", icon: Volume2 },
  { id: "photo_camera", icon: Camera },
  { id: "battery_full", icon: BatteryFull },
  { id: "ev_station", icon: Plug },
  { id: "water_drop", icon: Droplet },
  { id: "sd_card", icon: HardDrive },
  { id: "shield", icon: Shield },
  { id: "bolt", icon: Zap },
  { id: "build", icon: Wrench },
  { id: "memory", icon: MemoryStick },
];
const serviceIconFor = (id: string) =>
  SERVICE_ICONS.find((o) => o.id === id)?.icon || Wrench;

// ─── Small shared building blocks ──────────────────────────────────────────
const LOGO_TYPES = [
  { value: "icon", label: "Default icon + text" },
  { value: "image", label: "Custom image" },
];

type FieldProps = Omit<InputProps, "onChange"> & {
  onChange: (value: string) => void;
  span?: boolean;
};

function Field({ span, onChange, ...props }: FieldProps) {
  return (
    <div className={span ? "ad-span" : undefined}>
      <Input {...props} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({ span, ...props }: TextareaProps & { span?: boolean }) {
  return (
    <div className={span ? "ad-span" : undefined}>
      <Textarea {...props} />
    </div>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

function ColorRow({ label, description, value, onCommit }: { label: string; description: string; value: string; onCommit: (hex: string) => void }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);

  // Follow outside changes (reset to defaults, swatch picks) without fighting typing.
  if (prev !== value) {
    setPrev(value);
    setText(value);
  }

  return (
    <div className="ad-colorrow">
      <input
        aria-label={`${label} swatch`}
        type="color"
        value={HEX.test(value) ? value : "#000000"}
        onChange={(e) => onCommit(e.target.value)}
      />
      <Input
        description={description}
        label={label}
        maxLength={7}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (HEX.test(e.target.value)) onCommit(e.target.value.toLowerCase());
        }}
      />
    </div>
  );
}

function TabIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="ad-tabintro">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <h3 className="ad-sectionlabel">{children}</h3>;
}

function Divider() {
  return <hr className="ad-divider" />;
}

function SaveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="ad-savebar-inline">
      <Button onClick={onClick}>
        <Save aria-hidden="true" size={16} strokeWidth={1.75} />
        {label}
      </Button>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="ad-iconpick ad-iconpick--compact">
      {SERVICE_ICONS.map(({ id, icon: OptIcon }) => (
        <button key={id} aria-label={id.replace(/_/g, " ")} aria-pressed={value === id} type="button" onClick={() => onChange(id)}>
          <OptIcon aria-hidden="true" size={18} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

// ─── Brand Tab ──────────────────────────────────────────────────────────
function BrandTab() {
  const brand = useSiteStore((s) => s.brand);
  const appearance = useSiteStore((s) => s.appearance);
  const updateBrand = useSiteStore((s) => s.updateBrand);
  const updateAppearance = useSiteStore((s) => s.updateAppearance);
  const addToast = useToastStore((s) => s.add);

  const [lb, setLb] = useState({ ...brand });
  const [la, setLa] = useState({ ...appearance });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast("Logo must be under 2MB", "error");

      return;
    }
    const reader = new FileReader();

    reader.onload = (ev) => {
      setLa((a) => ({ ...a, logoUrl: String(ev.target?.result || "") }));
      addToast("Logo loaded", "info");
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    updateBrand(lb);
    updateAppearance(la);
    addToast("Brand & logo saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Business name, tagline, and logo shown in the header and footer."
        title="Brand Identity"
      />

      <div className="ad-form-2">
        <Field value={lb.name} onChange={(v) => setLb((b) => ({ ...b, name: v }))} label="Business Name" description="Shown in the header and page titles." />
        <Field value={lb.subLabel} onChange={(v) => setLb((b) => ({ ...b, subLabel: v }))} label="Sub Label" description="Small text under the logo (e.g. “Device Recovery”)." />
        <Field value={lb.tagline} onChange={(v) => setLb((b) => ({ ...b, tagline: v }))} span label="Tagline / Slogan" description="Short slogan used in meta and SEO contexts." />
      </div>

      <SectionLabel>Logo</SectionLabel>

      <div className="ad-mb">
        <SegmentedControl
          label="Logo type"
          options={LOGO_TYPES}
          value={la.logoType}
          onValueChange={(t) => setLa((a) => ({ ...a, logoType: t as typeof a.logoType }))}
        />
      </div>

      {la.logoType === "image" && (
        <div className="ad-form-2">
          <div className="ad-stack-sm ad-span">
            <p className="ad-label">Upload Logo File</p>
            <div className="ad-inline">
              <input
                ref={fileInputRef}
                accept="image/*"
                className="ad-hidden"
                type="file"
                onChange={handleLogoUpload}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} aria-hidden="true" />
                <span>Choose File</span>
              </Button>
              {la.logoUrl && (
                <span className="ad-ok">
                  Image loaded ✓
                </span>
              )}
            </div>
            <p className="ad-hint">
              PNG or SVG with transparency recommended. Max 2 MB.
            </p>
          </div>

          <Field value={la.logoUrl} onChange={(v) => setLa((a) => ({ ...a, logoUrl: v }))} label="Or Paste Image URL" description="Direct URL to a hosted image." placeholder="https://..." />

          <Field value={la.logoAlt} onChange={(v) => setLa((a) => ({ ...a, logoAlt: v }))} label="Alt Text" description="For screen readers and SEO." />

          {la.logoUrl && (
            <div className="ad-span">
              <p className="ad-label">Preview</p>
              <div className="ad-logoprev ad-mt-xs">
                <img
                  alt="Logo preview"
                  className="ad-contain"
                  src={la.logoUrl}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <SaveButton label="Save Brand" onClick={save} />
    </div>
  );
}

// ─── Hero Tab ───────────────────────────────────────────────────────────
function HeroTab() {
  const hero = useSiteStore((s) => s.hero);
  const updateHero = useSiteStore((s) => s.updateHero);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({ ...hero });
  const set = <K extends keyof typeof l>(k: K, v: (typeof l)[K]) =>
    setL((p) => ({ ...p, [k]: v }));
  const save = () => {
    updateHero(l);
    addToast("Hero section saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="The large banner at the top of your homepage."
        title="Hero Section"
      />
      <div className="ad-form-2">
        <Field value={l.badgeText} onChange={(v) => set("badgeText", v)} span label="Badge Text" description="Pill above the headline — e.g. “Fairfield, IL · Est. 2019”" />
        <Field value={l.headlineLine1} onChange={(v) => set("headlineLine1", v)} label="Headline Line 1" />
        <Field value={l.headlineAccent} onChange={(v) => set("headlineAccent", v)} label="Headline Accent Word" description="Shown in your accent colour." />
        <Area span label="Description" id="hero-description" rows={4} value={l.description} onChange={(e) => set("description", e.target.value)} />
        <Field value={l.primaryCta} onChange={(v) => set("primaryCta", v)} label="Primary CTA Label" description="Main button — links to /shop." />
        <Field value={l.secondaryCta} onChange={(v) => set("secondaryCta", v)} label="Secondary CTA Label" description="Second button — e.g. “Call 618-204-1497”." />
      </div>
      <SaveButton label="Save Hero" onClick={save} />
    </div>
  );
}

// ─── Trust Bar Tab ──────────────────────────────────────────────────────
function TrustTab() {
  const trustItems = useSiteStore((s) => s.trustItems);
  const addToast = useToastStore((s) => s.add);
  const [ls, setLs] = useState(trustItems.map((t) => ({ ...t })));
  const set = (i: number, k: "label" | "desc", v: string) =>
    setLs((a) => a.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const save = () => {
    // Write the whole array once instead of one update per item — each
    // updateTrustItem call fires its own Supabase sync. The no-op merge on
    // item 0 afterwards just reuses the granular updater's Supabase sync.
    useSiteStore.setState({ trustItems: ls.map((t) => ({ ...t })) });
    useSiteStore.getState().updateTrustItem(0, {});
    addToast("Trust bar saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Four highlights shown below the hero on the homepage."
        title="Trust Bar"
      />
      <div className="ad-form-2">
        {ls.map((item, i) => (
          <div
            key={i}
            className="ad-panel"
          >
            <span className="ad-numdot ad-mb-sm">
              {i + 1}
            </span>
            <div className="ad-stack-sm">
              <Field value={item.label} onChange={(v) => set(i, "label", v)} label="Label" />
              <Field value={item.desc} onChange={(v) => set(i, "desc", v)} label="Description" />
            </div>
          </div>
        ))}
      </div>
      <SaveButton label="Save Trust Bar" onClick={save} />
    </div>
  );
}

// ─── CTA Strip Tab ──────────────────────────────────────────────────────
function CtaTab() {
  const ctaStrip =
    useSiteStore((s) => s.ctaStrip) || DEFAULT_SITE_CONTENT.ctaStrip;
  const updateCtaStrip = useSiteStore((s) => s.updateCtaStrip);
  const repairBanner = useSiteStore((s) => s.repairBanner);
  const updateRepairBanner = useSiteStore((s) => s.updateRepairBanner);
  const addToast = useToastStore((s) => s.add);
  const [lc, setLc] = useState({
    ...DEFAULT_SITE_CONTENT.ctaStrip,
    ...ctaStrip,
  });
  const [lr, setLr] = useState({ ...repairBanner });
  const save = () => {
    updateCtaStrip(lc);
    updateRepairBanner(lr);
    addToast("CTA & Repair Banner saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="The call-to-action strip at the bottom of the homepage, and the repair section banner."
        title="CTA Strip & Repair Banner"
      />

      <SectionLabel>Bottom CTA Strip</SectionLabel>
      <div className="ad-form-2">
        <Field value={lc.headline} onChange={(v) => setLc((c) => ({ ...c, headline: v }))} label="Headline" />
        <Field value={lc.subtext} onChange={(v) => setLc((c) => ({ ...c, subtext: v }))} label="Subtext" />
        <Field value={lc.primaryCta} onChange={(v) => setLc((c) => ({ ...c, primaryCta: v }))} label="Primary Button Label" />
        <Field value={lc.secondaryCta} onChange={(v) => setLc((c) => ({ ...c, secondaryCta: v }))} label="Secondary Button Label" />
      </div>

      <SectionLabel>Repair Banner (Homepage Mid-section)</SectionLabel>
      <div className="ad-form-2">
        <Field value={lr.eyebrow} onChange={(v) => setLr((r) => ({ ...r, eyebrow: v }))} label="Eyebrow" description="Small label above the headline." />
        <Field value={lr.headline} onChange={(v) => setLr((r) => ({ ...r, headline: v }))} label="Headline" />
        <Area span label="Description" id="repair-banner-description" rows={3} value={lr.description} onChange={(e) => setLr((r) => ({ ...r, description: e.target.value })) } />
        <Field value={lr.primaryCta} onChange={(v) => setLr((r) => ({ ...r, primaryCta: v }))} label="Primary CTA Label" />
        <Field value={lr.secondaryCta} onChange={(v) => setLr((r) => ({ ...r, secondaryCta: v }))} label="Secondary CTA Label" />
      </div>

      <SaveButton label="Save CTA & Banner" onClick={save} />
    </div>
  );
}

// ─── Services Tab ───────────────────────────────────────────────────────
interface NewServiceForm {
  name: string;
  price: string;
  duration: string;
  icon: string;
  desc: string;
}
const EMPTY_NEW_SERVICE: NewServiceForm = {
  name: "",
  price: "",
  duration: "",
  icon: "smartphone",
  desc: "",
};

function ServicesTab() {
  const repairServices = useSiteStore((s) => s.repairServices);
  const setRepairServices = useSiteStore((s) => s.setRepairServices);
  const addToast = useToastStore((s) => s.add);
  const [ls, setLs] = useState(repairServices.map((s) => ({ ...s })));
  const [newSvc, setNewSvc] = useState<NewServiceForm>({
    ...EMPTY_NEW_SERVICE,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const set = (id: string, k: keyof SiteRepairService, v: string) =>
    setLs((a) => a.map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const updateVariant = (
    sid: string,
    vi: number,
    f: "name" | "price",
    v: string,
  ) =>
    setLs((a) =>
      a.map((l) => {
        if (l.id !== sid) return l;
        const vars = [...(l.variants || [])];

        vars[vi] = { ...vars[vi], [f]: v };

        return { ...l, variants: vars };
      }),
    );
  const deleteVariant = (sid: string, vi: number) =>
    setLs((a) =>
      a.map((l) =>
        l.id !== sid
          ? l
          : { ...l, variants: (l.variants || []).filter((_, i) => i !== vi) },
      ),
    );
  const addVariant = (sid: string) =>
    setLs((a) =>
      a.map((l) =>
        l.id !== sid
          ? l
          : {
              ...l,
              variants: [...(l.variants || []), { name: "", price: "" }],
            },
      ),
    );

  const handleDelete = (id: string) => {
    setLs((a) => a.filter((l) => l.id !== id));
    addToast("Service removed — save to persist", "info");
  };

  const handleAdd = () => {
    if (!newSvc.name) {
      addToast("Enter a service name", "error");

      return;
    }
    const slug = newSvc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (ls.some((l) => l.id === slug)) {
      addToast("Service already exists", "error");

      return;
    }
    setLs((a) => [
      ...a,
      {
        id: slug,
        name: newSvc.name,
        priceRange: newSvc.price || "$49 – $99",
        duration: newSvc.duration || "1 hour",
        icon: newSvc.icon,
        description: newSvc.desc || "Service description.",
      },
    ]);
    setNewSvc({ ...EMPTY_NEW_SERVICE });
    addToast("Service added — save to persist", "success");
  };

  const save = () => {
    setRepairServices(ls);
    addToast("Services saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Manage services shown on the Repairs page and Booking Wizard."
        title="Repair Services"
      />

      <div className="ad-form">
        {ls.map((svc) => {
          const SvcIcon = serviceIconFor(svc.icon);

          return (
            <div
              key={svc.id}
              className="ad-panel ad-panel--lg"
            >
              <div className="ad-actions ad-mb">
                <span className="ad-numdot ad-numdot--lg">
                  <SvcIcon size={20} aria-hidden="true" />
                </span>
                <h3 className="ad-h4">
                  {svc.name}
                </h3>
                <span className="ad-pill" data-tone="neutral">{svc.id}</span>
                <div className="ad-grow" />
                <Button variant="ghost" onClick={() => setDeleteId(svc.id)}>
                  <Trash2 size={16} aria-hidden="true" className="ad-text-danger" />
                  <span className="ad-text-danger">Delete</span>
                </Button>
              </div>

              <div className="ad-form-2">
                <Field value={svc.name} onChange={(v) => set(svc.id, "name", v)} label="Service Name" />
                <Field value={svc.priceRange} onChange={(v) => set(svc.id, "priceRange", v)} label="Price Range" description="e.g. “$49 – $249”" />
                <Field value={svc.duration} onChange={(v) => set(svc.id, "duration", v)} label="Duration" description="e.g. “1–2 hours”" />
                <div>
                  <p className="ad-label">Icon</p>
                  <div className="ad-mt-xs">
                    <IconPicker
                      value={svc.icon}
                      onChange={(id) => set(svc.id, "icon", id)}
                    />
                  </div>
                </div>
                <Area span label="Description" id={`svc-desc-${svc.id}`} rows={3} value={svc.description} onChange={(e) => set(svc.id, "description", e.target.value)} />
              </div>

              <div className="ad-topline">
                <h4 className="ad-h4">
                  Price Tiers / Part Variants
                </h4>
                <p className="ad-hint ad-mb-sm">
                  Overrides the price range in the Booking Wizard if set.
                </p>
                <div className="ad-stack-sm">
                  {(svc.variants || []).map((v, vi) => (
                    <div key={vi} className="ad-inline">
                      <Field value={v.name} onChange={(val) =>
                          updateVariant(svc.id, vi, "name", val)
                        } label="e.g. OEM Premium" placeholder="e.g. OEM Premium" />
                      <Field value={v.price} onChange={(val) =>
                          updateVariant(svc.id, vi, "price", val)
                        } label="e.g. $149" placeholder="e.g. $149" />
                      <button aria-label="Remove tier" className="ad-iconbtn" type="button" onClick={() => deleteVariant(svc.id, vi)}>
                        <Trash2 size={16} aria-hidden="true" className="ad-text-danger" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" onClick={() => addVariant(svc.id)} style={{ marginTop: "var(--space-3)" }}>
                  <Plus size={14} aria-hidden="true" />
                  <span>Add Tier</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ad-panel ad-panel--lg ad-panel--dashed ad-mt-lg">
        <h3 className="ad-h4 ad-inline ad-mb">
          <Plus size={16} aria-hidden="true" /> Add New Service
        </h3>
        <div className="ad-form-2">
          <Field value={newSvc.name} onChange={(v) => setNewSvc((f) => ({ ...f, name: v }))} label="Service Name" placeholder="e.g. Back Glass Replacement" />
          <Field value={newSvc.price} onChange={(v) => setNewSvc((f) => ({ ...f, price: v }))} label="Price Range" placeholder="e.g. $79 – $129" />
          <Field value={newSvc.duration} onChange={(v) => setNewSvc((f) => ({ ...f, duration: v }))} label="Duration" placeholder="e.g. 1–2 hours" />
          <div>
            <p className="ad-label">Icon</p>
            <div className="ad-mt-xs">
              <IconPicker
                value={newSvc.icon}
                onChange={(id) => setNewSvc((f) => ({ ...f, icon: id }))}
              />
            </div>
          </div>
          <Area span label="Description" id="new-svc-desc" rows={2} value={newSvc.desc} onChange={(e) => setNewSvc((f) => ({ ...f, desc: e.target.value })) } />
        </div>
        <Button variant="secondary" onClick={handleAdd} style={{ marginTop: "var(--space-4)" }}>
          <Plus size={16} aria-hidden="true" />
          <span>Add to List</span>
        </Button>
      </div>

      <SaveButton label="Save All Services" onClick={save} />

      <AdminConfirmDialog
        description="This removes the service from the Repairs page and Booking Wizard list. Save afterward to persist the change."
        isOpen={!!deleteId}
        title="Delete This Service?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />
    </div>
  );
}

// ─── About Tab ──────────────────────────────────────────────────────────
function AboutTab() {
  const about = useSiteStore((s) => s.about);
  const updateAbout = useSiteStore((s) => s.updateAbout);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({ ...about, story: [...about.story] });
  const set = (k: "eyebrow" | "headline" | "lead", v: string) =>
    setL((p) => ({ ...p, [k]: v }));
  const setStory = (i: number, v: string) =>
    setL((p) => {
      const s = [...p.story];

      s[i] = v;

      return { ...p, story: s };
    });
  const addPara = () => setL((p) => ({ ...p, story: [...p.story, ""] }));
  const delPara = (i: number) =>
    setL((p) => ({ ...p, story: p.story.filter((_, idx) => idx !== i) }));
  const save = () => {
    updateAbout(l);
    addToast("About page saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Edit headline, lead text, and story paragraphs shown on /about."
        title="About Page"
      />
      <div className="ad-form-2">
        <Field value={l.eyebrow} onChange={(v) => set("eyebrow", v)} label="Eyebrow" description="Small all-caps label above the headline." placeholder="Describe the repair..." />
        <Field value={l.headline} onChange={(v) => set("headline", v)} label="Page Headline" />
        <Area span label="Lead Paragraph" id="about-lead" rows={3} value={l.lead} onChange={(e) => set("lead", e.target.value)} />
      </div>

      <SectionLabel>Story Paragraphs</SectionLabel>
      <div className="ad-stack-sm">
        {l.story.map((para, i) => (
          <div key={i} className="ad-inline ad-start">
            <div className="ad-grow">
              <Area id={`about-para-${i}`} label={`Paragraph ${i + 1}`} rows={4} value={para} onChange={(e) => setStory(i, e.target.value)} />
            </div>
            <button aria-label="Remove paragraph" className="ad-iconbtn" style={{ marginTop: "var(--space-6)" }} type="button" onClick={() => delPara(i)}>
              <Trash2 size={16} aria-hidden="true" className="ad-text-danger" />
            </button>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={addPara} style={{ marginTop: "var(--space-3)" }}>
        <Plus size={16} aria-hidden="true" />
        <span>Add Paragraph</span>
      </Button>

      <Divider />
      <SaveButton label="Save About Page" onClick={save} />
    </div>
  );
}

// ─── Business Info Tab ──────────────────────────────────────────────────
function BusinessTab() {
  const business = useSiteStore((s) => s.business);
  const updateBusiness = useSiteStore((s) => s.updateBusiness);
  const houseCallPricing = useSiteStore((s) => s.houseCallPricing);
  const updateHouseCallPricing = useSiteStore((s) => s.updateHouseCallPricing);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({
    ...business,
    hours: business.hours.map((h) => ({ ...h })),
  });
  const [hcp, setHcp] = useState({ ...houseCallPricing });
  const setHcpField = (k: keyof typeof hcp, v: string) =>
    setHcp((p) => ({ ...p, [k]: Number(v) || 0 }));
  const saveHouseCallPricing = () => {
    updateHouseCallPricing(hcp);
    addToast("House call pricing saved", "success");
  };
  const set = (k: "name" | "phone" | "email" | "address" | "city", v: string) =>
    setL((p) => ({ ...p, [k]: v }));
  const setHour = (i: number, k: "days" | "hours", v: string) =>
    setL((p) => {
      const h = [...p.hours];

      h[i] = { ...h[i], [k]: v };

      return { ...p, hours: h };
    });
  const addHourRow = () =>
    setL((p) => ({ ...p, hours: [...p.hours, { days: "", hours: "" }] }));
  const delHourRow = (i: number) =>
    setL((p) => ({ ...p, hours: p.hours.filter((_, idx) => idx !== i) }));
  const save = () => {
    // updateBusiness replaces the whole business object (including hours) in
    // one call — calling updateBusinessHour afterward would re-sync each row
    // individually and trigger redundant Supabase writes.
    updateBusiness({ ...l, hours: l.hours });
    addToast("Business info saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Contact details and hours shown in the header, footer, and about/repair pages."
        title="Business Information"
      />
      <div className="ad-form-2">
        <Field value={l.name} onChange={(v) => set("name", v)} label="Business Name" />
        <Field type="tel" value={l.phone} onChange={(v) => set("phone", v)} label="Phone Number" description="Include area code, e.g. 618-204-1497" />
        <Field type="email" value={l.email} onChange={(v) => set("email", v)} label="Email Address" />
        <Field value={l.address} onChange={(v) => set("address", v)} label="Street Address" />
        <Field value={l.city} onChange={(v) => set("city", v)} span label="City + ZIP" />
      </div>

      <div className="ad-panel ad-panel--lg ad-mt-lg">
        <div className="ad-between ad-mb">
          <h3 className="ad-h4">
            Business Hours
          </h3>
          <Button variant="secondary" onClick={addHourRow}>
            <Plus size={14} aria-hidden="true" />
            <span>Add Row</span>
          </Button>
        </div>
        <div className="ad-stack-sm">
          {l.hours.map((h, i) => (
            <div key={i} className="ad-rowfields">
              <Field value={h.days} onChange={(v) => setHour(i, "days", v)} label="Days" placeholder="e.g. Monday – Friday" />
              <Field value={h.hours} onChange={(v) => setHour(i, "hours", v)} label="Hours" placeholder="e.g. 9:00 AM – 6:00 PM" />
              <button aria-label="Remove row" className="ad-iconbtn" type="button" onClick={() => delHourRow(i)}>
                <Trash2 size={16} aria-hidden="true" className="ad-text-danger" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <SaveButton label="Save Business Info" onClick={save} />

      <div className="ad-panel ad-panel--lg ad-mt-lg">
        <h3 className="ad-h4">
          House Call Pricing
        </h3>
        <p className="ad-hint ad-mb">
          Flat rate for the first hour, then an hourly rate after — shown to
          customers in the Booking Wizard when they choose a Home Visit.
        </p>
        <div className="ad-form-2">
          <Field type="number" value={String(hcp.residentialFirstHour)} onChange={(v) => setHcpField("residentialFirstHour", v)} label="Residential — First Hour ($)" min={0} step="0.01" />
          <Field type="number" value={String(hcp.residentialAdditionalHourRate)} onChange={(v) => setHcpField("residentialAdditionalHourRate", v)} label="Residential — Additional Hour ($)" min={0} step="0.01" />
          <Field type="number" value={String(hcp.commercialFirstHour)} onChange={(v) => setHcpField("commercialFirstHour", v)} label="Commercial — First Hour ($)" min={0} step="0.01" />
          <Field type="number" value={String(hcp.commercialAdditionalHourRate)} onChange={(v) => setHcpField("commercialAdditionalHourRate", v)} label="Commercial — Additional Hour ($)" min={0} step="0.01" />
        </div>
        <SaveButton label="Save House Call Pricing" onClick={saveHouseCallPricing} />
      </div>
    </div>
  );
}

// ─── Footer Tab ─────────────────────────────────────────────────────────
function FooterTab() {
  const footer = useSiteStore((s) => s.footer) || DEFAULT_SITE_CONTENT.footer;
  const updateFooter = useSiteStore((s) => s.updateFooter);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({ ...DEFAULT_SITE_CONTENT.footer, ...footer });
  const set = <K extends keyof typeof l>(k: K, v: (typeof l)[K]) =>
    setL((p) => ({ ...p, [k]: v }));
  const setLink = (i: number, k: "label" | "href", v: string) =>
    setL((p) => {
      const el = [...p.extraLinks];

      el[i] = { ...el[i], [k]: v };

      return { ...p, extraLinks: el };
    });
  const addLink = () =>
    setL((p) => ({
      ...p,
      extraLinks: [...p.extraLinks, { label: "", href: "" }],
    }));
  const delLink = (i: number) =>
    setL((p) => ({
      ...p,
      extraLinks: p.extraLinks.filter((_, idx) => idx !== i),
    }));
  const save = () => {
    updateFooter(l);
    addToast("Footer saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Tagline, copyright name, visibility toggles, and extra links in the site footer."
        title="Footer"
      />
      <div className="ad-form-2">
        <Field value={l.tagline} onChange={(v) => set("tagline", v)} span label="Footer Tagline" description="Short line shown under the logo in the footer." />
        <Field value={l.copyrightName} onChange={(v) => set("copyrightName", v)} label="Copyright Name" description="e.g. “Mobicare Device Recovery”" />
      </div>

      <div className="ad-form ad-mt-lg">
        <div className="ad-cell-main">
          <Switch aria-label="Show Business Hours" checked={l.showHours} onCheckedChange={(v) => set("showHours", v)} />
          <div>
            <strong style={{ display: "block", fontWeight: 500 }}>Show Business Hours</strong>
            <span className="ad-hint">Display opening hours in the footer</span>
          </div>
        </div>
        <div className="ad-cell-main">
          <Switch aria-label="Show Social Icons" checked={l.showSocial} onCheckedChange={(v) => set("showSocial", v)} />
          <div>
            <strong style={{ display: "block", fontWeight: 500 }}>Show Social Icons</strong>
            <span className="ad-hint">Display social media links in the footer</span>
          </div>
        </div>
      </div>

      <SectionLabel>Footer Links</SectionLabel>
      <p className="ad-hint ad-mb-sm">
        Extra links shown in the bottom bar (e.g. Privacy Policy, Terms).
      </p>
      <div className="ad-stack-sm">
        {l.extraLinks.map((link, i) => (
          <div key={i} className="ad-rowfields">
            <Field value={link.label} onChange={(v) => setLink(i, "label", v)} label="Label" placeholder="e.g. Privacy Policy" />
            <Field value={link.href} onChange={(v) => setLink(i, "href", v)} label="URL" placeholder="/privacy" />
            <button aria-label="Remove link" className="ad-iconbtn" type="button" onClick={() => delLink(i)}>
              <Trash2 size={16} aria-hidden="true" className="ad-text-danger" />
            </button>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={addLink} style={{ marginTop: "var(--space-3)" }}>
        <Plus size={14} aria-hidden="true" />
        <span>Add Link</span>
      </Button>

      <Divider />
      <SaveButton label="Save Footer" onClick={save} />
    </div>
  );
}

// ─── Social Links Tab ───────────────────────────────────────────────────
const SOCIAL_PLATFORMS: {
  key: keyof Social;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/yourpage",
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourhandle",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    placeholder: "https://x.com/yourhandle",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@yourhandle",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourchannel",
  },
  {
    key: "yelp",
    label: "Yelp",
    placeholder: "https://yelp.com/biz/your-business",
  },
  {
    key: "google",
    label: "Google Business Profile",
    placeholder: "https://g.page/...",
  },
];

function SocialTab() {
  const social = useSiteStore((s) => s.social) || DEFAULT_SITE_CONTENT.social;
  const updateSocial = useSiteStore((s) => s.updateSocial);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({ ...DEFAULT_SITE_CONTENT.social, ...social });
  const set = (k: keyof Social, v: string) => setL((p) => ({ ...p, [k]: v }));
  const save = () => {
    updateSocial(l);
    addToast("Social links saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Links shown as icon buttons in the footer. Leave blank to hide."
        title="Social Links"
      />
      <div className="ad-form-2">
        {SOCIAL_PLATFORMS.map((p) => (
          <Field key={p.key} type="url" value={l[p.key] || ""} onChange={(v) => set(p.key, v)} label={p.label} placeholder={p.placeholder} />
        ))}
      </div>
      <SaveButton label="Save Social Links" onClick={save} />
    </div>
  );
}

// ─── SEO & Analytics Tab ────────────────────────────────────────────────
function SeoTab() {
  const seo = useSiteStore((s) => s.seo) || DEFAULT_SITE_CONTENT.seo;
  const updateSeo = useSiteStore((s) => s.updateSeo);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({ ...DEFAULT_SITE_CONTENT.seo, ...seo });
  const set = <K extends keyof typeof l>(k: K, v: (typeof l)[K]) =>
    setL((p) => ({ ...p, [k]: v }));
  const save = () => {
    updateSeo(l);
    addToast("SEO settings saved", "success");
  };

  const charCount = l.metaDescription?.length || 0;

  return (
    <div>
      <TabIntro
        description="Meta tags, Open Graph, and analytics tracking IDs used across the site."
        title="SEO & Analytics"
      />

      <SectionLabel>Page Titles & Meta</SectionLabel>
      <div className="ad-form-2">
        <Field value={l.siteTitle} onChange={(v) => set("siteTitle", v)} label="Site Title" description="Homepage title tag." />
        <Field value={l.titleSuffix} onChange={(v) => set("titleSuffix", v)} label="Title Suffix" description="Appended to all page titles — e.g. “| Mobicare”." />
        <Area
          span
          description={`${charCount}/160 characters. Shown in Google search results.`}
          id="seo-meta-description"
          label="Meta Description"
          maxLength={160}
          rows={3}
          value={l.metaDescription}
          onChange={(e) => set("metaDescription", e.target.value)}
        />
        <Field value={l.keywords} onChange={(v) => set("keywords", v)} span label="Keywords" description="Comma-separated keywords for meta tags." placeholder="phone repair, screen repair, Fairfield IL" />
      </div>

      <Divider />
      <SectionLabel>Open Graph / Social Preview</SectionLabel>
      <div className="ad-form-2">
        <Field type="url" value={l.ogImage} onChange={(v) => set("ogImage", v)} span label="OG Image URL" description="1200×630 px image shown when shared on Facebook/Twitter." placeholder="https://..." />
        {l.ogImage && (
          <div className="ad-inline ad-span">
            <img
              alt="OG preview"
              className="ad-ogprev"
              src={l.ogImage}
            />
            <span className="ad-hint">
              Social share preview image
            </span>
          </div>
        )}
      </div>

      <Divider />
      <SectionLabel>Analytics & Tracking</SectionLabel>
      <p className="ad-hint ad-mb-sm">
        Paste your IDs below. Tracking only activates when the ID is set — no
        code changes needed.
      </p>
      <div className="ad-form-2">
        <Field value={l.googleAnalyticsId} onChange={(v) => set("googleAnalyticsId", v)} label="Google Analytics ID" description="e.g. G-XXXXXXXXXX or UA-XXXXXXXX-X" placeholder="G-XXXXXXXXXX" />
        <Field value={l.facebookPixelId} onChange={(v) => set("facebookPixelId", v)} label="Facebook Pixel ID" description="e.g. 1234567890123456" placeholder="1234567890123456" />
      </div>

      <SaveButton label="Save SEO Settings" onClick={save} />
    </div>
  );
}

// ─── Appearance Tab ─────────────────────────────────────────────────────
const COLOR_FIELDS: {
  key: keyof Pick<
    Appearance,
    "accentColor" | "accentColorDeep" | "bgBase" | "bgSurface" | "bgElevated"
  >;
  label: string;
  hint: string;
}[] = [
  {
    key: "accentColor",
    label: "Accent (Primary)",
    hint: "Active links, badges, buttons",
  },
  {
    key: "accentColorDeep",
    label: "Accent Deep (CTAs)",
    hint: "Solid backgrounds on primary buttons",
  },
  { key: "bgBase", label: "Page Background", hint: "Whole-screen base color" },
  {
    key: "bgSurface",
    label: "Card Surface",
    hint: "Cards, header, floating elements",
  },
  {
    key: "bgElevated",
    label: "Elevated Surface",
    hint: "Nested cards and panels",
  },
];

function AppearanceTab() {
  const appearance = useSiteStore((s) => s.appearance);
  const updateAppearance = useSiteStore((s) => s.updateAppearance);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({ ...appearance });
  const set = <K extends keyof typeof l>(k: K, v: (typeof l)[K]) =>
    setL((p) => ({ ...p, [k]: v }));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast("Logo must be under 2MB", "error");

      return;
    }
    const reader = new FileReader();

    reader.onload = (ev) => {
      set("logoUrl", String(ev.target?.result || ""));
      addToast("Logo loaded — save to apply", "info");
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    updateAppearance(l);
    addToast("Appearance saved", "success");
  };
  const currentFont = FONT_PRESETS.find((f) => f.id === l.fontFamily);

  return (
    <div>
      <TabIntro
        description="Color scheme, custom logo, typography, and visual style across the entire site."
        title="Appearance"
      />

      <SectionLabel>Color Scheme</SectionLabel>
      <SegmentedControl
        label="Color scheme"
        options={[{ value: "dark", label: "Dark mode" }, { value: "light", label: "Light mode" }]}
        value={l.colorScheme}
        onValueChange={(v) => set("colorScheme", v as typeof l.colorScheme)}
      />

      <Divider />
      <SectionLabel>Accent Colors</SectionLabel>
      <div className="ad-form-2">
        {COLOR_FIELDS.map((cf) => {
          const hex = l[cf.key] || "#000000";

          return (
            <ColorRow key={cf.key} description={cf.hint} label={cf.label} value={hex} onCommit={(v) => set(cf.key, v)} />
          );
        })}
      </div>

      <Divider />
      <SectionLabel>Typography</SectionLabel>
      <div className="ad-form-2">
        <Select
          label="Font family"
          options={FONT_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          value={l.fontFamily}
          onValueChange={(v) => set("fontFamily", v)}
        />
        {l.fontFamily === "custom" && (
          <Field value={l.fontUrl || ""} onChange={(v) => set("fontUrl", v)} label="Custom Font URL" description="e.g. https://fonts.googleapis.com/css2?family=Sora..." placeholder="https://fonts.googleapis.com/..." />
        )}
      </div>
      <div
        className="ad-panel ad-panel--lg ad-mt"
        style={{ fontFamily: currentFont?.css || "inherit" }}
      >
        <span className="ad-sample">
          The quick brown fox
        </span>
        <span className="ad-hint">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
        </span>
      </div>

      <Divider />
      <SectionLabel>Custom Logo</SectionLabel>
      <SegmentedControl
        label="Logo type"
        options={LOGO_TYPES}
        value={l.logoType}
        onValueChange={(t) => set("logoType", t as typeof l.logoType)}
      />
      {l.logoType === "image" && (
        <div className="ad-form-2 ad-mt">
          <div className="ad-stack-sm">
            <p className="ad-label">Upload File</p>
            <div className="ad-inline">
              <input
                ref={fileInputRef}
                accept="image/*"
                className="ad-hidden"
                type="file"
                onChange={handleLogoUpload}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} aria-hidden="true" />
                <span>Choose File</span>
              </Button>
              {l.logoUrl && (
                <span className="ad-ok">
                  Loaded ✓
                </span>
              )}
            </div>
            <p className="ad-hint">PNG/SVG, max 2MB</p>
          </div>
          <Field value={l.logoUrl} onChange={(v) => set("logoUrl", v)} label="Or Image URL" placeholder="https://..." />
          <Field value={l.logoAlt} onChange={(v) => set("logoAlt", v)} label="Alt Text" />
          {l.logoUrl && (
            <div>
              <p className="ad-label">Preview</p>
              <div className="ad-logoprev ad-mt-xs">
                <img
                  alt="preview"
                  className="ad-contain"
                  src={l.logoUrl}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Divider />
      <SaveButton label="Save Appearance" onClick={save} />
    </div>
  );
}

// ─── Devices Tab ────────────────────────────────────────────────────────
function DevicesTab() {
  const deviceManufacturers = useSiteStore((s) => s.deviceManufacturers) || [];
  const setDeviceManufacturers = useSiteStore((s) => s.setDeviceManufacturers);
  const addToast = useToastStore((s) => s.add);
  const [ld, setLd] = useState<DeviceManufacturer[]>(() =>
    JSON.parse(JSON.stringify(deviceManufacturers)),
  );

  // Drill-down position — which manufacturer / category / model is open.
  // Only one level below the deepest set id is ever shown at a time.
  const [manuId, setManuId] = useState<string | null>(null);
  const [catId, setCatId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);

  const curManu = ld.find((m) => m.id === manuId) || null;
  const curCat = curManu?.categories.find((c) => c.id === catId) || null;
  const curModel = curCat?.models.find((m) => m.id === modelId) || null;

  // Generic add/rename modal, reused for the manufacturer/category/model
  // levels — they're all just { id, name } nodes with children.
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "rename">("add");
  const [modalLevel, setModalLevel] = useState<
    "manufacturer" | "category" | "model"
  >("manufacturer");
  const [modalValue, setModalValue] = useState("");
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    level: "manufacturer" | "category" | "model";
    id: string;
  } | null>(null);

  const [newGen, setNewGen] = useState("");

  const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const modalLevelLabel: Record<typeof modalLevel, string> = {
    manufacturer: "Manufacturer",
    category: "Device Type",
    model: "Model",
  };

  const openAdd = (level: "manufacturer" | "category" | "model") => {
    setModalMode("add");
    setModalLevel(level);
    setModalValue("");
    setModalTargetId(null);
    setModalOpen(true);
  };
  const openRename = (
    level: "manufacturer" | "category" | "model",
    id: string,
    name: string,
  ) => {
    setModalMode("rename");
    setModalLevel(level);
    setModalValue(name);
    setModalTargetId(id);
    setModalOpen(true);
  };

  const submitModal = () => {
    const name = modalValue.trim();

    if (!name) return;

    if (modalLevel === "manufacturer") {
      if (modalMode === "add") {
        const id = slugify(name);

        if (ld.some((m) => m.id === id)) {
          addToast("Manufacturer already exists", "error");

          return;
        }
        setLd((a) => [...a, { id, name, categories: [] }]);
        setManuId(id);
      } else if (modalTargetId) {
        setLd((a) => a.map((m) => (m.id === modalTargetId ? { ...m, name } : m)));
      }
    } else if (modalLevel === "category") {
      if (!curManu) return;
      if (modalMode === "add") {
        const id = slugify(name);

        if (curManu.categories.some((c) => c.id === id)) {
          addToast("Device type already exists", "error");

          return;
        }
        setLd((a) =>
          a.map((m) =>
            m.id === curManu.id
              ? { ...m, categories: [...m.categories, { id, name, models: [] }] }
              : m,
          ),
        );
        setCatId(id);
      } else if (modalTargetId) {
        setLd((a) =>
          a.map((m) =>
            m.id === curManu.id
              ? {
                  ...m,
                  categories: m.categories.map((c) =>
                    c.id === modalTargetId ? { ...c, name } : c,
                  ),
                }
              : m,
          ),
        );
      }
    } else if (modalLevel === "model") {
      if (!curManu || !curCat) return;
      if (modalMode === "add") {
        const id = slugify(name);

        if (curCat.models.some((m) => m.id === id)) {
          addToast("Model already exists", "error");

          return;
        }
        setLd((a) =>
          a.map((m) =>
            m.id === curManu.id
              ? {
                  ...m,
                  categories: m.categories.map((c) =>
                    c.id === curCat.id
                      ? { ...c, models: [...c.models, { id, name, generations: [] }] }
                      : c,
                  ),
                }
              : m,
          ),
        );
        setModelId(id);
      } else if (modalTargetId) {
        setLd((a) =>
          a.map((m) =>
            m.id === curManu.id
              ? {
                  ...m,
                  categories: m.categories.map((c) =>
                    c.id === curCat.id
                      ? {
                          ...c,
                          models: c.models.map((mo) =>
                            mo.id === modalTargetId ? { ...mo, name } : mo,
                          ),
                        }
                      : c,
                  ),
                }
              : m,
          ),
        );
      }
    }
    setModalOpen(false);
  };

  const deleteManufacturer = (id: string) => {
    setLd((a) => a.filter((m) => m.id !== id));
    if (manuId === id) {
      setManuId(null);
      setCatId(null);
      setModelId(null);
    }
  };
  const deleteCategory = (id: string) => {
    if (!curManu) return;
    setLd((a) =>
      a.map((m) =>
        m.id === curManu.id
          ? { ...m, categories: m.categories.filter((c) => c.id !== id) }
          : m,
      ),
    );
    if (catId === id) {
      setCatId(null);
      setModelId(null);
    }
  };
  const deleteModel = (id: string) => {
    if (!curManu || !curCat) return;
    setLd((a) =>
      a.map((m) =>
        m.id === curManu.id
          ? {
              ...m,
              categories: m.categories.map((c) =>
                c.id === curCat.id
                  ? { ...c, models: c.models.filter((mo) => mo.id !== id) }
                  : c,
              ),
            }
          : m,
      ),
    );
    if (modelId === id) setModelId(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.level === "manufacturer") deleteManufacturer(deleteTarget.id);
    else if (deleteTarget.level === "category") deleteCategory(deleteTarget.id);
    else deleteModel(deleteTarget.id);
  };

  const addGeneration = (e: FormEvent) => {
    e.preventDefault();
    const g = newGen.trim();

    if (!g || !curManu || !curCat || !curModel) return;
    if (curModel.generations.includes(g)) {
      addToast("Generation already exists", "error");

      return;
    }
    setLd((a) =>
      a.map((m) =>
        m.id === curManu.id
          ? {
              ...m,
              categories: m.categories.map((c) =>
                c.id === curCat.id
                  ? {
                      ...c,
                      models: c.models.map((mo) =>
                        mo.id === curModel.id
                          ? { ...mo, generations: [...mo.generations, g] }
                          : mo,
                      ),
                    }
                  : c,
              ),
            }
          : m,
      ),
    );
    setNewGen("");
  };
  const removeGeneration = (g: string) => {
    if (!curManu || !curCat || !curModel) return;
    setLd((a) =>
      a.map((m) =>
        m.id === curManu.id
          ? {
              ...m,
              categories: m.categories.map((c) =>
                c.id === curCat.id
                  ? {
                      ...c,
                      models: c.models.map((mo) =>
                        mo.id === curModel.id
                          ? { ...mo, generations: mo.generations.filter((x) => x !== g) }
                          : mo,
                      ),
                    }
                  : c,
              ),
            }
          : m,
      ),
    );
  };

  const save = () => {
    setDeviceManufacturers(ld);
    addToast("Devices & models saved", "success");
  };

  const goBack = () => {
    if (curModel) setModelId(null);
    else if (curCat) setCatId(null);
    else if (curManu) setManuId(null);
  };

  const breadcrumbs: { label: string; onClick: () => void }[] = [
    {
      label: "Manufacturers",
      onClick: () => {
        setManuId(null);
        setCatId(null);
        setModelId(null);
      },
    },
  ];

  if (curManu) {
    breadcrumbs.push({
      label: curManu.name,
      onClick: () => {
        setCatId(null);
        setModelId(null);
      },
    });
  }
  if (curCat) {
    breadcrumbs.push({ label: curCat.name, onClick: () => setModelId(null) });
  }
  if (curModel) {
    breadcrumbs.push({ label: curModel.name, onClick: () => {} });
  }

  const deleteCopy: Record<
    "manufacturer" | "category" | "model",
    { title: string; description: (name: string) => string }
  > = {
    manufacturer: {
      title: "Delete This Manufacturer?",
      description: (name) =>
        `This deletes "${name}" and every device type, model, and generation nested under it from the Booking Wizard.`,
    },
    category: {
      title: "Delete This Device Type?",
      description: (name) =>
        `This deletes "${name}" and all its models and generations from the Booking Wizard.`,
    },
    model: {
      title: "Delete This Model?",
      description: (name) =>
        `This deletes "${name}" and all its generations from the Booking Wizard.`,
    },
  };

  const deleteTargetName = deleteTarget
    ? deleteTarget.level === "manufacturer"
      ? ld.find((m) => m.id === deleteTarget.id)?.name || ""
      : deleteTarget.level === "category"
        ? curManu?.categories.find((c) => c.id === deleteTarget.id)?.name || ""
        : curCat?.models.find((mo) => mo.id === deleteTarget.id)?.name || ""
    : "";

  // Shared row renderer for the manufacturer/category/model levels — each is
  // an { id, name } node with a child count, a rename/delete action, and a
  // chevron indicating it drills into the next level down.
  const renderNodeList = (opts: {
    items: Array<{ id: string; name: string; count: number; countLabel: string }>;
    onSelect: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    emptyMessage: string;
  }) => (
    <div className="ad-stack-xs">
      {opts.items.length === 0 ? (
        <p className="ad-hint">{opts.emptyMessage}</p>
      ) : (
        opts.items.map((item) => (
          <div
            key={item.id}
            className="ad-noderow"
          >
            <button
              className="ad-nodebtn"
              type="button"
              onClick={() => opts.onSelect(item.id)}
            >
              {item.name}
              <span className="ad-hint ad-count-inline">
                {item.count} {item.countLabel}
                {item.count !== 1 ? "s" : ""}
              </span>
            </button>
            <div className="ad-nodeacts">
              <button aria-label={`Rename ${item.name}`} className="ad-iconbtn" type="button" onClick={() => opts.onRename(item.id, item.name)}>
                <Pencil size={14} aria-hidden="true" />
              </button>
              <button aria-label={`Delete ${item.name}`} className="ad-iconbtn" type="button" onClick={() => opts.onDelete(item.id)}>
                <Trash2 size={14} aria-hidden="true" className="ad-text-danger" />
              </button>
              <ChevronRight size={16} aria-hidden="true" className="ad-text-muted" />
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      <TabIntro
        description="Configure the Manufacturer → Device Type → Model → Generation hierarchy that drives the Booking Wizard's device picker."
        title="Devices & Models"
      />

      <div className="ad-actions ad-mb">
        {curManu && (
          <Button variant="secondary" onClick={goBack}>
            <ChevronLeft size={14} aria-hidden="true" />
            <span>Back</span>
          </Button>
        )}
        <nav aria-label="Device hierarchy" className="ad-crumbs">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="ad-inline ad-inline--xs">
              {i > 0 && <ChevronRight size={14} aria-hidden="true" className="ad-text-muted" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="ad-strong">{crumb.label}</span>
              ) : (
                <button
                  className="ad-crumblink"
                  type="button"
                  onClick={crumb.onClick}
                >
                  {crumb.label}
                </button>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="ad-panel">
        {!curManu ? (
          <>
            <div className="ad-between ad-mb-sm">
              <h3 className="ad-h4">Manufacturers</h3>
              <Button variant="secondary" onClick={() => openAdd("manufacturer")}>
                <Plus size={14} aria-hidden="true" />
                <span>Add Manufacturer</span>
              </Button>
            </div>
            {renderNodeList({
              items: ld.map((m) => ({
                id: m.id,
                name: m.name,
                count: m.categories.length,
                countLabel: "device type",
              })),
              onSelect: (id) => setManuId(id),
              onRename: (id, name) => openRename("manufacturer", id, name),
              onDelete: (id) => setDeleteTarget({ level: "manufacturer", id }),
              emptyMessage: "No manufacturers yet — add one to start building the device picker.",
            })}
          </>
        ) : !curCat ? (
          <>
            <div className="ad-between ad-mb-sm">
              <h3 className="ad-h4">
                Device Types in {curManu.name}
              </h3>
              <Button variant="secondary" onClick={() => openAdd("category")}>
                <Plus size={14} aria-hidden="true" />
                <span>Add Device Type</span>
              </Button>
            </div>
            {renderNodeList({
              items: curManu.categories.map((c) => ({
                id: c.id,
                name: c.name,
                count: c.models.length,
                countLabel: "model",
              })),
              onSelect: (id) => setCatId(id),
              onRename: (id, name) => openRename("category", id, name),
              onDelete: (id) => setDeleteTarget({ level: "category", id }),
              emptyMessage: "No device types yet — e.g. Phone, Tablet, Laptop.",
            })}
          </>
        ) : !curModel ? (
          <>
            <div className="ad-between ad-mb-sm">
              <h3 className="ad-h4">
                Models in {curManu.name} {curCat.name}
              </h3>
              <Button variant="secondary" onClick={() => openAdd("model")}>
                <Plus size={14} aria-hidden="true" />
                <span>Add Model</span>
              </Button>
            </div>
            {renderNodeList({
              items: curCat.models.map((mo) => ({
                id: mo.id,
                name: mo.name,
                count: mo.generations.length,
                countLabel: "generation",
              })),
              onSelect: (id) => setModelId(id),
              onRename: (id, name) => openRename("model", id, name),
              onDelete: (id) => setDeleteTarget({ level: "model", id }),
              emptyMessage: "No models yet — e.g. iPhone 16 Pro Max.",
            })}
          </>
        ) : (
          <>
            <div className="ad-between ad-mb">
              <h3 className="ad-h4">
                Generations for {curModel.name}
              </h3>
              <span className="ad-hint">
                {curModel.generations.length} generation
                {curModel.generations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <form className="ad-rowfields ad-mb" onSubmit={addGeneration}>
              <Field label="New generation" placeholder="e.g. 15 Pro Max" value={newGen} onChange={setNewGen} />
              <Button type="submit">
                Add
              </Button>
            </form>
            <div className="ad-actions">
              {curModel.generations.length === 0 ? (
                <p className="ad-hint">
                  No generations yet — this model is bookable on its own.
                </p>
              ) : (
                curModel.generations.map((g) => (
                  <div
                    key={g}
                    className="ad-gen"
                  >
                    <span>{g}</span>
                    <button
                      aria-label={`Remove ${g}`}
                      className="ad-gen-x"
                      type="button"
                      onClick={() => removeGeneration(g)}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Divider />
      <SaveButton label="Save Devices" onClick={save} />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent title={modalMode === "add" ? `New ${modalLevelLabel[modalLevel]}` : `Rename ${modalLevelLabel[modalLevel]}`}>
          <div className="ad-form">
            <Field label={`${modalLevelLabel[modalLevel]} name`} value={modalValue} onChange={setModalValue} />
            <div className="ad-actions ad-actions--end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={submitModal}>{modalMode === "add" ? `Create ${modalLevelLabel[modalLevel]}` : "Save name"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        description={
          deleteTarget ? deleteCopy[deleteTarget.level].description(deleteTargetName) : ""
        }
        isOpen={!!deleteTarget}
        title={deleteTarget ? deleteCopy[deleteTarget.level].title : ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────
export default function SiteContent() {
  const resetToDefaults = useSiteStore((s) => s.resetToDefaults);
  const addToast = useToastStore((s) => s.add);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);

  const handleReset = () => {
    resetToDefaults();
    addToast("Reset to defaults", "info");
  };

  return (
    <div className="ad-stack">
      <AdminPageHeader
        action={
          <Button variant="secondary" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw size={16} aria-hidden="true" />
            <span>Reset to defaults</span>
          </Button>
        }
        description="Edit the hero, services, trust bar, business info, SEO, and colors shown on the public site."
        title="Site editor"
      />

      <div className="ad-sc">
        <nav aria-label="Site content sections" className="ad-sc-nav ad-only-wide">
          {TABS.map((tab) => (
            <button key={tab.id} aria-current={activeTab === tab.id ? "page" : undefined} type="button" onClick={() => setActiveTab(tab.id)}>
              <tab.icon aria-hidden="true" size={16} strokeWidth={1.75} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="ad-only-narrow ad-sc-select">
          <Select label="Section" options={TABS.map((t) => ({ value: t.id, label: t.label }))} value={activeTab} onValueChange={setActiveTab} />
        </div>
        <div className="ad-sc-panel">
          {activeTab === "brand" && <BrandTab />}
          {activeTab === "hero" && <HeroTab />}
          {activeTab === "trust" && <TrustTab />}
          {activeTab === "cta" && <CtaTab />}
          {activeTab === "services" && <ServicesTab />}
          {activeTab === "devices" && <DevicesTab />}
          {activeTab === "about" && <AboutTab />}
          {activeTab === "business" && <BusinessTab />}
          {activeTab === "footer" && <FooterTab />}
          {activeTab === "social" && <SocialTab />}
          {activeTab === "seo" && <SeoTab />}
          {activeTab === "appearance" && <AppearanceTab />}
        </div>
      </div>

      <AdminConfirmDialog
        confirmLabel="Reset Everything"
        description="This resets ALL site content — brand, hero, services, pages, and colors — back to factory defaults. This cannot be undone."
        isOpen={resetConfirmOpen}
        title="Reset to Factory Defaults?"
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleReset}
      />
    </div>
  );
}
