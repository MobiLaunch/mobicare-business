import type { ChangeEvent, FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import type {
  Appearance,
  DeviceType,
  Social,
  SiteRepairService,
} from "@/lib/siteStore";

import { useRef, useState } from "react";
import {
  BatteryFull,
  BookOpen,
  Building2,
  Camera,
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
import {
  Button,
  Chip,
  ColorField,
  ColorSwatch,
  Description,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  Tabs,
  TextArea,
  TextField,
  ToggleButton,
  parseColor,
} from "@heroui/react";

import {
  DEFAULT_SITE_CONTENT,
  FONT_PRESETS,
  useSiteStore,
} from "@/lib/siteStore";
import { useToastStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";

// NOTE (HeroUI v3 rebuild): the original file was plain HTML wired to a
// BeerCSS-style utility stylesheet (`className="primary round"`,
// `className="border round"`, a global `.input`, Material-Symbols ligature
// icons via `<i>build</i>`, and browser-native `window.prompt` /
// `window.confirm` dialogs). None of that markup talks to HeroUI v3 at all.
// This rewrite replaces every control with a real HeroUI v3 component
// (TextField, TextArea, Select, Switch, ColorField, Modal, AlertDialog via
// AdminConfirmDialog) and every icon ligature with a lucide-react icon,
// matching the pattern already established in Categories.tsx / Products.tsx.
// Two behavioral upgrades came along for free:
//   1. The repair-service "Icon" field was a bare <select> of raw string ids
//      with no visual preview (same issue called out in Categories.tsx) —
//      rebuilt as an icon grid with previews.
//   2. Device-category add/rename/delete used window.prompt/window.confirm,
//      which are unstyled, block the JS thread, and are hard to test —
//      rebuilt as a small HeroUI Modal + the shared AdminConfirmDialog.

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
function TabIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="m-0 text-xl font-extrabold text-foreground">{title}</h2>
      <p className="m-0 mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-widest text-muted first:mt-0">
      {children}
    </h3>
  );
}

function Divider() {
  return <div className="my-6 border-t border-border" />;
}

function SaveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button className="mt-6" variant="primary" onPress={onClick}>
      <Save className="size-4" />
      <span>{label}</span>
    </Button>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
      {SERVICE_ICONS.map(({ id, icon: OptIcon }) => (
        <button
          key={id}
          aria-label={id.replace(/_/g, " ")}
          aria-pressed={value === id}
          className={`flex aspect-square items-center justify-center rounded-xl border transition-colors ${
            value === id
              ? "border-accent bg-accent-soft text-accent"
              : "border-border bg-surface text-foreground"
          }`}
          type="button"
          onClick={() => onChange(id)}
        >
          <OptIcon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function safeColor(hex: string) {
  try {
    return hex ? parseColor(hex) : null;
  } catch {
    return null;
  }
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5"
          value={lb.name}
          onChange={(v) => setLb((b) => ({ ...b, name: v }))}
        >
          <Label>Business Name</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>Shown in the header and page titles.</Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={lb.subLabel}
          onChange={(v) => setLb((b) => ({ ...b, subLabel: v }))}
        >
          <Label>Sub Label</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>
            Small text under the logo (e.g. &ldquo;Device Recovery&rdquo;).
          </Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5 sm:col-span-2"
          value={lb.tagline}
          onChange={(v) => setLb((b) => ({ ...b, tagline: v }))}
        >
          <Label>Tagline / Slogan</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>
            Short slogan used in meta and SEO contexts.
          </Description>
        </TextField>
      </div>

      <SectionLabel>Logo</SectionLabel>

      <div className="mb-4 flex gap-2">
        {(["icon", "image"] as const).map((t) => (
          <ToggleButton
            key={t}
            isSelected={la.logoType === t}
            variant="default"
            onChange={() => setLa((a) => ({ ...a, logoType: t }))}
          >
            {t === "icon" ? "Default Icon + Text" : "Custom Image"}
          </ToggleButton>
        ))}
      </div>

      {la.logoType === "image" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Upload Logo File</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                type="file"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                onPress={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                <span>Choose File</span>
              </Button>
              {la.logoUrl && (
                <span className="text-xs font-semibold text-success">
                  Image loaded ✓
                </span>
              )}
            </div>
            <Description>
              PNG or SVG with transparency recommended. Max 2 MB.
            </Description>
          </div>

          <TextField
            className="flex flex-col gap-1.5"
            value={la.logoUrl}
            onChange={(v) => setLa((a) => ({ ...a, logoUrl: v }))}
          >
            <Label>Or Paste Image URL</Label>
            <InputGroup>
              <InputGroup.Input placeholder="https://..." />
            </InputGroup>
            <Description>Direct URL to a hosted image.</Description>
          </TextField>

          <TextField
            className="flex flex-col gap-1.5"
            value={la.logoAlt}
            onChange={(v) => setLa((a) => ({ ...a, logoAlt: v }))}
          >
            <Label>Alt Text</Label>
            <InputGroup>
              <InputGroup.Input />
            </InputGroup>
            <Description>For screen readers and SEO.</Description>
          </TextField>

          {la.logoUrl && (
            <div className="sm:col-span-2">
              <Label>Preview</Label>
              <div className="mt-1.5 flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-secondary">
                <img
                  alt="Logo preview"
                  className="size-full object-contain"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5 sm:col-span-2"
          value={l.badgeText}
          onChange={(v) => set("badgeText", v)}
        >
          <Label>Badge Text</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>
            Pill above the headline — e.g. &ldquo;Fairfield, IL · Est.
            2019&rdquo;
          </Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.headlineLine1}
          onChange={(v) => set("headlineLine1", v)}
        >
          <Label>Headline Line 1</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.headlineAccent}
          onChange={(v) => set("headlineAccent", v)}
        >
          <Label>Headline Accent Word</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>Shown in your accent colour.</Description>
        </TextField>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="hero-description">Description</Label>
          <TextArea
            id="hero-description"
            rows={4}
            value={l.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.primaryCta}
          onChange={(v) => set("primaryCta", v)}
        >
          <Label>Primary CTA Label</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>Main button — links to /shop.</Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.secondaryCta}
          onChange={(v) => set("secondaryCta", v)}
        >
          <Label>Secondary CTA Label</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>
            Second button — e.g. &ldquo;Call 618-204-1497&rdquo;.
          </Description>
        </TextField>
      </div>
      <SaveButton label="Save Hero" onClick={save} />
    </div>
  );
}

// ─── Trust Bar Tab ──────────────────────────────────────────────────────
function TrustTab() {
  const trustItems = useSiteStore((s) => s.trustItems);
  const updateTrustItem = useSiteStore((s) => s.updateTrustItem);
  const addToast = useToastStore((s) => s.add);
  const [ls, setLs] = useState(trustItems.map((t) => ({ ...t })));
  const set = (i: number, k: "label" | "desc", v: string) =>
    setLs((a) => a.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const save = () => {
    ls.forEach((item, i) => updateTrustItem(i, item));
    addToast("Trust bar saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Four highlights shown below the hero on the homepage."
        title="Trust Bar"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ls.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface-secondary p-4"
          >
            <span className="mb-3 flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
              {i + 1}
            </span>
            <div className="flex flex-col gap-3">
              <TextField
                className="flex flex-col gap-1.5"
                value={item.label}
                onChange={(v) => set(i, "label", v)}
              >
                <Label>Label</Label>
                <InputGroup>
                  <InputGroup.Input />
                </InputGroup>
              </TextField>
              <TextField
                className="flex flex-col gap-1.5"
                value={item.desc}
                onChange={(v) => set(i, "desc", v)}
              >
                <Label>Description</Label>
                <InputGroup>
                  <InputGroup.Input />
                </InputGroup>
              </TextField>
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
  const ctaStrip = useSiteStore((s) => s.ctaStrip) || DEFAULT_SITE_CONTENT.ctaStrip;
  const updateCtaStrip = useSiteStore((s) => s.updateCtaStrip);
  const repairBanner = useSiteStore((s) => s.repairBanner);
  const updateRepairBanner = useSiteStore((s) => s.updateRepairBanner);
  const addToast = useToastStore((s) => s.add);
  const [lc, setLc] = useState({ ...DEFAULT_SITE_CONTENT.ctaStrip, ...ctaStrip });
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5"
          value={lc.headline}
          onChange={(v) => setLc((c) => ({ ...c, headline: v }))}
        >
          <Label>Headline</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={lc.subtext}
          onChange={(v) => setLc((c) => ({ ...c, subtext: v }))}
        >
          <Label>Subtext</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={lc.primaryCta}
          onChange={(v) => setLc((c) => ({ ...c, primaryCta: v }))}
        >
          <Label>Primary Button Label</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={lc.secondaryCta}
          onChange={(v) => setLc((c) => ({ ...c, secondaryCta: v }))}
        >
          <Label>Secondary Button Label</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
      </div>

      <SectionLabel>Repair Banner (Homepage Mid-section)</SectionLabel>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5"
          value={lr.eyebrow}
          onChange={(v) => setLr((r) => ({ ...r, eyebrow: v }))}
        >
          <Label>Eyebrow</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>Small label above the headline.</Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={lr.headline}
          onChange={(v) => setLr((r) => ({ ...r, headline: v }))}
        >
          <Label>Headline</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="repair-banner-description">Description</Label>
          <TextArea
            id="repair-banner-description"
            rows={3}
            value={lr.description}
            onChange={(e) => setLr((r) => ({ ...r, description: e.target.value }))}
          />
        </div>
        <TextField
          className="flex flex-col gap-1.5"
          value={lr.primaryCta}
          onChange={(v) => setLr((r) => ({ ...r, primaryCta: v }))}
        >
          <Label>Primary CTA Label</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={lr.secondaryCta}
          onChange={(v) => setLr((r) => ({ ...r, secondaryCta: v }))}
        >
          <Label>Secondary CTA Label</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
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
          : { ...l, variants: [...(l.variants || []), { name: "", price: "" }] },
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

      <div className="flex flex-col gap-4">
        {ls.map((svc) => {
          const SvcIcon = serviceIconFor(svc.icon);

          return (
            <div
              key={svc.id}
              className="rounded-2xl border border-border bg-surface-secondary p-5"
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <SvcIcon className="size-5" />
                </span>
                <h3 className="m-0 text-base font-bold text-foreground">
                  {svc.name}
                </h3>
                <Chip size="sm" variant="soft">
                  <Chip.Label>{svc.id}</Chip.Label>
                </Chip>
                <div className="flex-1" />
                <Button variant="ghost" onPress={() => setDeleteId(svc.id)}>
                  <Trash2 className="size-4 text-danger" />
                  <span className="text-danger">Delete</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  className="flex flex-col gap-1.5"
                  value={svc.name}
                  onChange={(v) => set(svc.id, "name", v)}
                >
                  <Label>Service Name</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                </TextField>
                <TextField
                  className="flex flex-col gap-1.5"
                  value={svc.priceRange}
                  onChange={(v) => set(svc.id, "priceRange", v)}
                >
                  <Label>Price Range</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                  <Description>e.g. &ldquo;$49 – $249&rdquo;</Description>
                </TextField>
                <TextField
                  className="flex flex-col gap-1.5"
                  value={svc.duration}
                  onChange={(v) => set(svc.id, "duration", v)}
                >
                  <Label>Duration</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                  <Description>e.g. &ldquo;1–2 hours&rdquo;</Description>
                </TextField>
                <div>
                  <Label>Icon</Label>
                  <div className="mt-1.5">
                    <IconPicker
                      value={svc.icon}
                      onChange={(id) => set(svc.id, "icon", id)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor={`svc-desc-${svc.id}`}>Description</Label>
                  <TextArea
                    id={`svc-desc-${svc.id}`}
                    rows={3}
                    value={svc.description}
                    onChange={(e) => set(svc.id, "description", e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <h4 className="m-0 text-sm font-bold text-foreground">
                  Price Tiers / Part Variants
                </h4>
                <p className="mb-3 mt-1 text-xs text-muted">
                  Overrides the price range in the Booking Wizard if set.
                </p>
                <div className="flex flex-col gap-2">
                  {(svc.variants || []).map((v, vi) => (
                    <div key={vi} className="flex items-center gap-2">
                      <TextField
                        className="flex-1"
                        value={v.name}
                        onChange={(val) => updateVariant(svc.id, vi, "name", val)}
                      >
                        <InputGroup>
                          <InputGroup.Input placeholder="e.g. OEM Premium" />
                        </InputGroup>
                      </TextField>
                      <TextField
                        className="flex-1"
                        value={v.price}
                        onChange={(val) => updateVariant(svc.id, vi, "price", val)}
                      >
                        <InputGroup>
                          <InputGroup.Input placeholder="e.g. $149" />
                        </InputGroup>
                      </TextField>
                      <Button
                        isIconOnly
                        aria-label="Remove tier"
                        variant="ghost"
                        onPress={() => deleteVariant(svc.id, vi)}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-3"
                  variant="outline"
                  onPress={() => addVariant(svc.id)}
                >
                  <Plus className="size-3.5" />
                  <span>Add Tier</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
          <Plus className="size-4" /> Add New Service
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            className="flex flex-col gap-1.5"
            value={newSvc.name}
            onChange={(v) => setNewSvc((f) => ({ ...f, name: v }))}
          >
            <Label>Service Name</Label>
            <InputGroup>
              <InputGroup.Input placeholder="e.g. Back Glass Replacement" />
            </InputGroup>
          </TextField>
          <TextField
            className="flex flex-col gap-1.5"
            value={newSvc.price}
            onChange={(v) => setNewSvc((f) => ({ ...f, price: v }))}
          >
            <Label>Price Range</Label>
            <InputGroup>
              <InputGroup.Input placeholder="e.g. $79 – $129" />
            </InputGroup>
          </TextField>
          <TextField
            className="flex flex-col gap-1.5"
            value={newSvc.duration}
            onChange={(v) => setNewSvc((f) => ({ ...f, duration: v }))}
          >
            <Label>Duration</Label>
            <InputGroup>
              <InputGroup.Input placeholder="e.g. 1–2 hours" />
            </InputGroup>
          </TextField>
          <div>
            <Label>Icon</Label>
            <div className="mt-1.5">
              <IconPicker
                value={newSvc.icon}
                onChange={(id) => setNewSvc((f) => ({ ...f, icon: id }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="new-svc-desc">Description</Label>
            <TextArea
              id="new-svc-desc"
              rows={2}
              value={newSvc.desc}
              onChange={(e) => setNewSvc((f) => ({ ...f, desc: e.target.value }))}
            />
          </div>
        </div>
        <Button className="mt-4" variant="outline" onPress={handleAdd}>
          <Plus className="size-4" />
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5"
          value={l.eyebrow}
          onChange={(v) => set("eyebrow", v)}
        >
          <Label>Eyebrow</Label>
          <InputGroup>
            <InputGroup.Input placeholder="Describe the repair..." />
          </InputGroup>
          <Description>Small all-caps label above the headline.</Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.headline}
          onChange={(v) => set("headline", v)}
        >
          <Label>Page Headline</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="about-lead">Lead Paragraph</Label>
          <TextArea
            id="about-lead"
            rows={3}
            value={l.lead}
            onChange={(e) => set("lead", e.target.value)}
          />
        </div>
      </div>

      <SectionLabel>Story Paragraphs</SectionLabel>
      <div className="flex flex-col gap-3">
        {l.story.map((para, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <Label htmlFor={`about-para-${i}`}>Paragraph {i + 1}</Label>
              <TextArea
                className="mt-1.5"
                id={`about-para-${i}`}
                rows={4}
                value={para}
                onChange={(e) => setStory(i, e.target.value)}
              />
            </div>
            <Button
              isIconOnly
              aria-label="Remove paragraph"
              className="mt-7"
              variant="ghost"
              onPress={() => delPara(i)}
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        ))}
      </div>
      <Button className="mt-3" variant="outline" onPress={addPara}>
        <Plus className="size-4" />
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
  const updateBusinessHour = useSiteStore((s) => s.updateBusinessHour);
  const addToast = useToastStore((s) => s.add);
  const [l, setL] = useState({
    ...business,
    hours: business.hours.map((h) => ({ ...h })),
  });
  const set = (
    k: "name" | "phone" | "email" | "address" | "city",
    v: string,
  ) => setL((p) => ({ ...p, [k]: v }));
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
    updateBusiness({ ...l, hours: l.hours });
    l.hours.forEach((h, i) => updateBusinessHour(i, h));
    addToast("Business info saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Contact details and hours shown in the header, footer, and about/repair pages."
        title="Business Information"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5"
          value={l.name}
          onChange={(v) => set("name", v)}
        >
          <Label>Business Name</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          type="tel"
          value={l.phone}
          onChange={(v) => set("phone", v)}
        >
          <Label>Phone Number</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>Include area code, e.g. 618-204-1497</Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          type="email"
          value={l.email}
          onChange={(v) => set("email", v)}
        >
          <Label>Email Address</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.address}
          onChange={(v) => set("address", v)}
        >
          <Label>Street Address</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5 sm:col-span-2"
          value={l.city}
          onChange={(v) => set("city", v)}
        >
          <Label>City + ZIP</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
        </TextField>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface-secondary p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-sm font-bold text-foreground">
            Business Hours
          </h3>
          <Button variant="outline" onPress={addHourRow}>
            <Plus className="size-3.5" />
            <span>Add Row</span>
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {l.hours.map((h, i) => (
            <div key={i} className="flex items-end gap-2">
              <TextField
                className="flex flex-1 flex-col gap-1.5"
                value={h.days}
                onChange={(v) => setHour(i, "days", v)}
              >
                <Label>Days</Label>
                <InputGroup>
                  <InputGroup.Input placeholder="e.g. Monday – Friday" />
                </InputGroup>
              </TextField>
              <TextField
                className="flex flex-1 flex-col gap-1.5"
                value={h.hours}
                onChange={(v) => setHour(i, "hours", v)}
              >
                <Label>Hours</Label>
                <InputGroup>
                  <InputGroup.Input placeholder="e.g. 9:00 AM – 6:00 PM" />
                </InputGroup>
              </TextField>
              <Button
                isIconOnly
                aria-label="Remove row"
                variant="ghost"
                onPress={() => delHourRow(i)}
              >
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <SaveButton label="Save Business Info" onClick={save} />
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
    setL((p) => ({ ...p, extraLinks: [...p.extraLinks, { label: "", href: "" }] }));
  const delLink = (i: number) =>
    setL((p) => ({ ...p, extraLinks: p.extraLinks.filter((_, idx) => idx !== i) }));
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5 sm:col-span-2"
          value={l.tagline}
          onChange={(v) => set("tagline", v)}
        >
          <Label>Footer Tagline</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>
            Short line shown under the logo in the footer.
          </Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.copyrightName}
          onChange={(v) => set("copyrightName", v)}
        >
          <Label>Copyright Name</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>
            e.g. &ldquo;Mobicare Device Recovery&rdquo;
          </Description>
        </TextField>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <Switch isSelected={l.showHours} onChange={(v) => set("showHours", v)}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
          <div>
            <strong className="block text-sm text-foreground">
              Show Business Hours
            </strong>
            <span className="text-xs text-muted">
              Display opening hours in the footer
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <Switch isSelected={l.showSocial} onChange={(v) => set("showSocial", v)}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
          <div>
            <strong className="block text-sm text-foreground">
              Show Social Icons
            </strong>
            <span className="text-xs text-muted">
              Display social media links in the footer
            </span>
          </div>
        </div>
      </div>

      <SectionLabel>Footer Links</SectionLabel>
      <p className="mb-3 text-xs text-muted">
        Extra links shown in the bottom bar (e.g. Privacy Policy, Terms).
      </p>
      <div className="flex flex-col gap-3">
        {l.extraLinks.map((link, i) => (
          <div key={i} className="flex items-end gap-2">
            <TextField
              className="flex flex-1 flex-col gap-1.5"
              value={link.label}
              onChange={(v) => setLink(i, "label", v)}
            >
              <Label>Label</Label>
              <InputGroup>
                <InputGroup.Input placeholder="e.g. Privacy Policy" />
              </InputGroup>
            </TextField>
            <TextField
              className="flex flex-1 flex-col gap-1.5"
              value={link.href}
              onChange={(v) => setLink(i, "href", v)}
            >
              <Label>URL</Label>
              <InputGroup>
                <InputGroup.Input placeholder="/privacy" />
              </InputGroup>
            </TextField>
            <Button
              isIconOnly
              aria-label="Remove link"
              variant="ghost"
              onPress={() => delLink(i)}
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        ))}
      </div>
      <Button className="mt-3" variant="outline" onPress={addLink}>
        <Plus className="size-3.5" />
        <span>Add Link</span>
      </Button>

      <Divider />
      <SaveButton label="Save Footer" onClick={save} />
    </div>
  );
}

// ─── Social Links Tab ───────────────────────────────────────────────────
const SOCIAL_PLATFORMS: { key: keyof Social; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { key: "yelp", label: "Yelp", placeholder: "https://yelp.com/biz/your-business" },
  { key: "google", label: "Google Business Profile", placeholder: "https://g.page/..." },
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map((p) => (
          <TextField
            key={p.key}
            className="flex flex-col gap-1.5"
            type="url"
            value={l[p.key] || ""}
            onChange={(v) => set(p.key, v)}
          >
            <Label>{p.label}</Label>
            <InputGroup>
              <InputGroup.Input placeholder={p.placeholder} />
            </InputGroup>
          </TextField>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5"
          value={l.siteTitle}
          onChange={(v) => set("siteTitle", v)}
        >
          <Label>Site Title</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>Homepage title tag.</Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.titleSuffix}
          onChange={(v) => set("titleSuffix", v)}
        >
          <Label>Title Suffix</Label>
          <InputGroup>
            <InputGroup.Input />
          </InputGroup>
          <Description>
            Appended to all page titles — e.g. &ldquo;| Mobicare&rdquo;.
          </Description>
        </TextField>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="seo-meta-description">Meta Description</Label>
          <TextArea
            id="seo-meta-description"
            maxLength={160}
            rows={3}
            value={l.metaDescription}
            onChange={(e) => set("metaDescription", e.target.value)}
          />
          <span
            className={`self-end text-xs ${charCount > 150 ? "text-warning" : "text-muted"}`}
          >
            {charCount}/160 chars — shown in Google search results.
          </span>
        </div>
        <TextField
          className="flex flex-col gap-1.5 sm:col-span-2"
          value={l.keywords}
          onChange={(v) => set("keywords", v)}
        >
          <Label>Keywords</Label>
          <InputGroup>
            <InputGroup.Input placeholder="phone repair, screen repair, Fairfield IL" />
          </InputGroup>
          <Description>Comma-separated keywords for meta tags.</Description>
        </TextField>
      </div>

      <Divider />
      <SectionLabel>Open Graph / Social Preview</SectionLabel>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5 sm:col-span-2"
          type="url"
          value={l.ogImage}
          onChange={(v) => set("ogImage", v)}
        >
          <Label>OG Image URL</Label>
          <InputGroup>
            <InputGroup.Input placeholder="https://..." />
          </InputGroup>
          <Description>
            1200×630 px image shown when shared on Facebook/Twitter.
          </Description>
        </TextField>
        {l.ogImage && (
          <div className="flex items-center gap-3 sm:col-span-2">
            <img
              alt="OG preview"
              className="h-20 w-36 rounded-xl border border-border object-cover"
              src={l.ogImage}
            />
            <span className="text-xs text-muted">
              Social share preview image
            </span>
          </div>
        )}
      </div>

      <Divider />
      <SectionLabel>Analytics & Tracking</SectionLabel>
      <p className="mb-3 text-xs text-muted">
        Paste your IDs below. Tracking only activates when the ID is set — no
        code changes needed.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="flex flex-col gap-1.5"
          value={l.googleAnalyticsId}
          onChange={(v) => set("googleAnalyticsId", v)}
        >
          <Label>Google Analytics ID</Label>
          <InputGroup>
            <InputGroup.Input placeholder="G-XXXXXXXXXX" />
          </InputGroup>
          <Description>e.g. G-XXXXXXXXXX or UA-XXXXXXXX-X</Description>
        </TextField>
        <TextField
          className="flex flex-col gap-1.5"
          value={l.facebookPixelId}
          onChange={(v) => set("facebookPixelId", v)}
        >
          <Label>Facebook Pixel ID</Label>
          <InputGroup>
            <InputGroup.Input placeholder="1234567890123456" />
          </InputGroup>
          <Description>e.g. 1234567890123456</Description>
        </TextField>
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
  { key: "accentColor", label: "Accent (Primary)", hint: "Active links, badges, buttons" },
  { key: "accentColorDeep", label: "Accent Deep (CTAs)", hint: "Solid backgrounds on primary buttons" },
  { key: "bgBase", label: "Page Background", hint: "Whole-screen base color" },
  { key: "bgSurface", label: "Card Surface", hint: "Cards, header, floating elements" },
  { key: "bgElevated", label: "Elevated Surface", hint: "Nested cards and panels" },
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
      <div className="flex gap-2">
        {(["dark", "light"] as const).map((s) => (
          <ToggleButton
            key={s}
            isSelected={l.colorScheme === s}
            variant="default"
            onChange={() => set("colorScheme", s)}
          >
            {s === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </ToggleButton>
        ))}
      </div>

      <Divider />
      <SectionLabel>Accent Colors</SectionLabel>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COLOR_FIELDS.map((cf) => {
          const hex = l[cf.key] || "#000000";

          return (
            <ColorField
              key={cf.key}
              value={safeColor(hex)}
              onChange={(c) => c && set(cf.key, c.toString("hex"))}
            >
              <Label>{cf.label}</Label>
              <ColorField.Group>
                <ColorField.Prefix>
                  <ColorSwatch color={hex} />
                </ColorField.Prefix>
                <ColorField.Input />
              </ColorField.Group>
              <Description>{cf.hint}</Description>
            </ColorField>
          );
        })}
      </div>

      <Divider />
      <SectionLabel>Typography</SectionLabel>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          selectedKey={l.fontFamily}
          onSelectionChange={(key) => set("fontFamily", String(key))}
        >
          <Label>Font Family</Label>
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {FONT_PRESETS.map((p) => (
                <ListBox.Item key={p.id} id={p.id}>
                  {p.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {l.fontFamily === "custom" && (
          <TextField
            className="flex flex-col gap-1.5"
            value={l.fontUrl || ""}
            onChange={(v) => set("fontUrl", v)}
          >
            <Label>Custom Font URL</Label>
            <InputGroup>
              <InputGroup.Input placeholder="https://fonts.googleapis.com/..." />
            </InputGroup>
            <Description>
              e.g. https://fonts.googleapis.com/css2?family=Sora...
            </Description>
          </TextField>
        )}
      </div>
      <div
        className="mt-4 rounded-2xl border border-border p-5"
        style={{ fontFamily: currentFont?.css || "inherit" }}
      >
        <span className="block text-lg font-semibold text-foreground">
          The quick brown fox
        </span>
        <span className="text-xs text-muted">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
        </span>
      </div>

      <Divider />
      <SectionLabel>Custom Logo</SectionLabel>
      <div className="flex gap-2">
        {(["icon", "image"] as const).map((t) => (
          <ToggleButton
            key={t}
            isSelected={l.logoType === t}
            variant="default"
            onChange={() => set("logoType", t)}
          >
            {t === "icon" ? "Default Icon + Text" : "Custom Image"}
          </ToggleButton>
        ))}
      </div>
      {l.logoType === "image" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Upload File</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                type="file"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                onPress={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                <span>Choose File</span>
              </Button>
              {l.logoUrl && (
                <span className="text-xs font-semibold text-success">
                  Loaded ✓
                </span>
              )}
            </div>
            <Description>PNG/SVG, max 2MB</Description>
          </div>
          <TextField
            className="flex flex-col gap-1.5"
            value={l.logoUrl}
            onChange={(v) => set("logoUrl", v)}
          >
            <Label>Or Image URL</Label>
            <InputGroup>
              <InputGroup.Input placeholder="https://..." />
            </InputGroup>
          </TextField>
          <TextField
            className="flex flex-col gap-1.5"
            value={l.logoAlt}
            onChange={(v) => set("logoAlt", v)}
          >
            <Label>Alt Text</Label>
            <InputGroup>
              <InputGroup.Input />
            </InputGroup>
          </TextField>
          {l.logoUrl && (
            <div>
              <Label>Preview</Label>
              <div className="mt-1.5 flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-secondary">
                <img
                  alt="preview"
                  className="size-full object-contain"
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
  const deviceTypes = useSiteStore((s) => s.deviceTypes) || [];
  const setDeviceTypes = useSiteStore((s) => s.setDeviceTypes);
  const addToast = useToastStore((s) => s.add);
  const [ld, setLd] = useState<DeviceType[]>(() =>
    JSON.parse(JSON.stringify(deviceTypes)),
  );
  const [selId, setSelId] = useState(ld[0]?.id || "");
  const [newModel, setNewModel] = useState("");
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catModalMode, setCatModalMode] = useState<"add" | "rename">("add");
  const [catModalValue, setCatModalValue] = useState("");
  const [catModalTargetId, setCatModalTargetId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const cur = ld.find((d) => d.id === selId);

  const openAddType = () => {
    setCatModalMode("add");
    setCatModalValue("");
    setCatModalTargetId(null);
    setCatModalOpen(true);
  };
  const openRenameType = (d: DeviceType) => {
    setCatModalMode("rename");
    setCatModalValue(d.name);
    setCatModalTargetId(d.id);
    setCatModalOpen(true);
  };
  const submitCatModal = () => {
    const name = catModalValue.trim();

    if (!name) return;
    if (catModalMode === "add") {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      if (ld.some((d) => d.id === id)) {
        addToast("Category already exists", "error");

        return;
      }
      setLd((a) => [...a, { id, name, models: [] }]);
      setSelId(id);
    } else if (catModalTargetId) {
      setLd((a) => a.map((x) => (x.id === catModalTargetId ? { ...x, name } : x)));
    }
    setCatModalOpen(false);
  };

  const delType = (id: string) => {
    if (ld.length <= 1) {
      addToast("Keep at least one category", "error");

      return;
    }
    const updated = ld.filter((d) => d.id !== id);

    setLd(updated);
    if (selId === id) setSelId(updated[0]?.id || "");
  };

  const addModel = (e: FormEvent) => {
    e.preventDefault();
    if (!newModel.trim() || !cur) return;
    if (cur.models.includes(newModel.trim())) {
      addToast("Model already exists", "error");

      return;
    }
    setLd((a) =>
      a.map((d) =>
        d.id === cur.id ? { ...d, models: [...d.models, newModel.trim()] } : d,
      ),
    );
    setNewModel("");
  };
  const delModel = (m: string) =>
    setLd((a) =>
      a.map((d) =>
        d.id === cur?.id ? { ...d, models: d.models.filter((x) => x !== m) } : d,
      ),
    );
  const save = () => {
    setDeviceTypes(ld);
    addToast("Devices & models saved", "success");
  };

  return (
    <div>
      <TabIntro
        description="Configure device categories and models shown in the Booking Wizard dropdowns."
        title="Devices & Models"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-sm font-bold text-foreground">
              Categories
            </h3>
            <Button variant="outline" onPress={openAddType}>
              <Plus className="size-3.5" />
              <span>Add</span>
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            {ld.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-1 rounded-xl ${
                  selId === d.id
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-surface-tertiary"
                }`}
              >
                <button
                  className="flex-1 truncate px-3 py-2 text-left text-sm font-medium"
                  type="button"
                  onClick={() => setSelId(d.id)}
                >
                  {d.name}
                </button>
                <div className="flex shrink-0 items-center gap-0.5 pr-1">
                  <Button
                    isIconOnly
                    aria-label={`Rename ${d.name}`}
                    variant="ghost"
                    onPress={() => openRenameType(d)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    isIconOnly
                    aria-label={`Delete ${d.name}`}
                    variant="ghost"
                    onPress={() => setDeleteId(d.id)}
                  >
                    <Trash2 className="size-3.5 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          {cur ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-sm font-bold text-foreground">
                  Models for {cur.name}
                </h3>
                <span className="text-xs text-muted">
                  {cur.models.length} model{cur.models.length !== 1 ? "s" : ""}
                </span>
              </div>
              <form className="mb-4 flex gap-2" onSubmit={addModel}>
                <TextField
                  className="flex-1"
                  value={newModel}
                  onChange={setNewModel}
                >
                  <InputGroup>
                    <InputGroup.Input placeholder="e.g. iPhone 16 Pro Max" />
                  </InputGroup>
                </TextField>
                <Button type="submit" variant="primary">
                  Add
                </Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {cur.models.length === 0 ? (
                  <p className="text-sm italic text-muted">
                    No models yet — Booking Wizard will show a text field.
                  </p>
                ) : (
                  cur.models.map((m) => (
                    <div
                      key={m}
                      className="flex items-center gap-1.5 rounded-full bg-surface-tertiary py-1 pl-3 pr-1.5 text-xs font-semibold"
                    >
                      <span>{m}</span>
                      <button
                        aria-label={`Remove ${m}`}
                        className="flex size-5 items-center justify-center rounded-full text-muted hover:bg-danger/15 hover:text-danger"
                        type="button"
                        onClick={() => delModel(m)}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="text-sm italic text-muted">
              Select a category to manage models.
            </p>
          )}
        </div>
      </div>

      <Divider />
      <SaveButton label="Save Devices" onClick={save} />

      <Modal>
        <Modal.Backdrop isOpen={catModalOpen} onOpenChange={setCatModalOpen}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {catModalMode === "add" ? "New Device Category" : "Rename Category"}
                </Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <TextField
                  className="flex flex-col gap-1.5"
                  value={catModalValue}
                  onChange={setCatModalValue}
                >
                  <Label>Category Name</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                </TextField>
              </Modal.Body>
              <Modal.Footer className="justify-end gap-2">
                <Button variant="outline" onPress={() => setCatModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onPress={submitCatModal}>
                  {catModalMode === "add" ? "Create Category" : "Save Name"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AdminConfirmDialog
        description="This deletes the category and all its models from the Booking Wizard dropdown."
        isOpen={!!deleteId}
        title="Delete This Category?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && delType(deleteId)}
      />
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────
export default function SiteContent() {
  const resetToDefaults = useSiteStore((s) => s.resetToDefaults);
  const addToast = useToastStore((s) => s.add);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleReset = () => {
    resetToDefaults();
    addToast("Reset to defaults", "info");
  };

  return (
    <div>
      <AdminPageHeader
        action={
          <Button variant="outline" onPress={() => setResetConfirmOpen(true)}>
            <RotateCcw className="size-4" />
            <span>Reset to Defaults</span>
          </Button>
        }
        description="Customize hero banners, services, trust badges, business hours, SEO tags, and color palettes."
        eyebrow="Storefront Customizer"
        title="Live Site Content & Branding"
      />

      <Tabs
        className="w-full overflow-hidden rounded-[28px] border border-border bg-surface-secondary"
        defaultSelectedKey="brand"
        orientation="vertical"
      >
        <Tabs.ListContainer className="shrink-0 border-border p-3 sm:border-r">
          <Tabs.List aria-label="Site content sections" className="gap-1">
            {TABS.map((tab) => (
              <Tabs.Tab
                key={tab.id}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold"
                id={tab.id}
              >
                <tab.icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {TABS.map((tab) => (
          <Tabs.Panel key={tab.id} className="flex-1 p-6 sm:p-8" id={tab.id}>
            {tab.id === "brand" && <BrandTab />}
            {tab.id === "hero" && <HeroTab />}
            {tab.id === "trust" && <TrustTab />}
            {tab.id === "cta" && <CtaTab />}
            {tab.id === "services" && <ServicesTab />}
            {tab.id === "devices" && <DevicesTab />}
            {tab.id === "about" && <AboutTab />}
            {tab.id === "business" && <BusinessTab />}
            {tab.id === "footer" && <FooterTab />}
            {tab.id === "social" && <SocialTab />}
            {tab.id === "seo" && <SeoTab />}
            {tab.id === "appearance" && <AppearanceTab />}
          </Tabs.Panel>
        ))}
      </Tabs>

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
