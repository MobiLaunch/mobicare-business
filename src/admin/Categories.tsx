import type { LucideIcon } from "lucide-react";
import type { Category } from "@/types/domain";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Shapes, Trash2, icons } from "lucide-react";
import {
  Button,
  FieldError,
  InputGroup,
  Label,
  Modal,
  TextField,
} from "@heroui/react";

import { useProductStore, useToastStore } from "@/lib/store";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";

// NOTE (HeroUI v3 rebuild): the original icon field was a plain <select>
// listing raw Material-Symbols-style name strings (e.g. "battery_full") with
// no visual preview — you had to already know what each name looked like.
// Rebuilt as a real icon grid with previews below, then later widened from a
// hand-picked ~13-icon subset to lucide-react's full ~1,767-icon set (see
// `icons` import above — every lucide-react icon keyed by its PascalCase
// component name). New selections store that PascalCase name directly
// (e.g. "BatteryFull") so no lookup table is needed going forward.
//
// Categories saved before this change stored old Material-Symbols-style
// snake_case ids (e.g. "battery_full") instead — LEGACY_ICON_MAP translates
// those specific ids to their PascalCase equivalent so existing categories
// keep rendering the same icon they always did.
const LEGACY_ICON_MAP: Record<string, string> = {
  bolt: "Zap",
  shield: "Shield",
  smartphone: "Smartphone",
  power: "Plug",
  star: "Star",
  battery_full: "BatteryFull",
  headphones: "Headphones",
  photo_camera: "Camera",
  inventory_2: "Package",
  label: "Tag",
  layers: "Layers",
  cable: "Cable",
  category: "Shapes",
};
// A handful of sensible defaults shown before the admin searches — not an
// exhaustive list (that's what search is for), just familiar starting
// points pulled from the old curated set.
const QUICK_ICON_IDS = [
  "Shapes", "Zap", "Shield", "Smartphone", "Plug", "Star",
  "BatteryFull", "Headphones", "Camera", "Package", "Tag", "Layers", "Cable",
];
const readableIconName = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
const iconFor = (id: string): LucideIcon =>
  (icons as Record<string, LucideIcon>)[LEGACY_ICON_MAP[id] || id] || Shapes;

interface CategoryForm {
  id?: string;
  name: string;
  description: string;
  icon: string;
}

const EMPTY: CategoryForm = { name: "", description: "", icon: "category" };

export default function Categories() {
  const categories = useProductStore((s) => s.categories);
  const products = useProductStore((s) => s.products);
  const addCategory = useProductStore((s) => s.addCategory);
  const updateCategory = useProductStore((s) => s.updateCategory);
  const deleteCategory = useProductStore((s) => s.deleteCategory);
  const addToast = useToastStore((s) => s.add);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>({ ...EMPTY });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [iconQuery, setIconQuery] = useState("");

  const allIconNames = useMemo(() => Object.keys(icons).sort(), []);
  const iconResults = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();

    if (!q) return QUICK_ICON_IDS;

    return allIconNames
      .filter((name) => readableIconName(name).toLowerCase().includes(q))
      .slice(0, 120);
  }, [iconQuery, allIconNames]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
    setIconQuery("");
    setModalOpen(true);
  };
  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ ...cat });
    setIconQuery("");
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name) {
      addToast("Category name is required", "error");

      return;
    }
    if (editingId) {
      updateCategory(editingId, form);
      addToast("Category updated successfully", "success");
    } else {
      const newId =
        form.id || form.name.toLowerCase().replace(/\s+/g, "-");

      if (categories.some((c) => c.id === newId)) {
        addToast(`A category with id "${newId}" already exists`, "error");

        return;
      }
      addCategory(form);
      addToast("New category created", "success");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const count = products.filter((p) => p.category === id).length;

    if (count > 0) {
      addToast(
        `Cannot delete — ${count} products rely on this category`,
        "error",
      );

      return;
    }
    deleteCategory(id);
    addToast("Category removed", "info");
  };

  return (
    <div>
      <AdminPageHeader
        action={
          <Button variant="primary" onPress={openAdd}>
            <Plus className="size-4" />
            <span>Add New Category</span>
          </Button>
        }
        description={`${categories.length} active store categories & product groupings`}
        eyebrow="Taxonomy Structure"
        title="Category Management"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const count = products.filter(
            (p) => p.category === cat.id && p.active,
          ).length;
          const CatIcon = iconFor(cat.icon);

          return (
            <div
              key={cat.id}
              className="flex h-full flex-col justify-between rounded-[28px] bg-surface-secondary p-6"
            >
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <CatIcon className="size-6" />
                  </span>
                  <div className="flex-1" />
                  <Button
                    isIconOnly
                    aria-label="Edit category"
                    variant="ghost"
                    onPress={() => openEdit(cat)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    isIconOnly
                    aria-label="Delete category"
                    variant="ghost"
                    onPress={() => setDeleteConfirm(cat.id)}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>

                <h5 className="m-0 mb-1.5 text-lg font-extrabold text-foreground">
                  {cat.name}
                </h5>
                <p className="m-0 mb-4 text-label leading-relaxed text-muted">
                  {cat.description ||
                    "No description specified for this category."}
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-border pt-3">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                  {count} active product{count !== 1 ? "s" : ""}
                </span>
                <div className="flex-1" />
                <code className="rounded-md bg-surface-tertiary px-1.5 py-0.5 text-caption font-bold">
                  {cat.id}
                </code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor modal */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={setModalOpen}>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {editingId ? "Edit Category" : "Create New Category"}
                </Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <TextField
                  isRequired
                  className="flex flex-col gap-1.5"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                >
                  <Label>Category Name *</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                  <FieldError />
                </TextField>

                <TextField
                  className="flex flex-col gap-1.5"
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                >
                  <Label>Description</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                </TextField>

                {!editingId && (
                  <TextField
                    className="flex flex-col gap-1.5"
                    value={form.id || ""}
                    onChange={(v) => setForm((f) => ({ ...f, id: v }))}
                  >
                    <Label>
                      Unique ID (optional, auto-slugified if left blank)
                    </Label>
                    <InputGroup>
                      <InputGroup.Input />
                    </InputGroup>
                  </TextField>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label>Display Icon</Label>
                    <span className="text-caption text-muted">
                      {allIconNames.length.toLocaleString()} icons available
                    </span>
                  </div>
                  <TextField
                    aria-label="Search icons"
                    className="mb-2 mt-1.5 flex flex-col gap-1.5"
                    value={iconQuery}
                    onChange={setIconQuery}
                  >
                    <InputGroup>
                      <InputGroup.Prefix>
                        <Search className="size-4 text-muted" />
                      </InputGroup.Prefix>
                      <InputGroup.Input placeholder="Search the full icon library…" />
                    </InputGroup>
                  </TextField>
                  <div className="grid max-h-56 grid-cols-7 gap-2 overflow-y-auto rounded-2xl border border-border p-2 sm:grid-cols-9">
                    {iconResults.length === 0 && (
                      <p className="col-span-full m-0 py-4 text-center text-label text-muted">
                        No icons match &ldquo;{iconQuery}&rdquo;.
                      </p>
                    )}
                    {iconResults.map((name) => {
                      const OptIcon = (icons as Record<string, LucideIcon>)[name];

                      return (
                        <button
                          key={name}
                          aria-label={readableIconName(name)}
                          aria-pressed={form.icon === name}
                          title={readableIconName(name)}
                          className={`flex aspect-square items-center justify-center rounded-2xl border transition-colors ${
                            form.icon === name
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-border bg-surface-secondary text-foreground hover:bg-surface-tertiary"
                          }`}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, icon: name }))}
                        >
                          <OptIcon className="size-5" />
                        </button>
                      );
                    })}
                  </div>
                  {!iconQuery.trim() && (
                    <p className="m-0 mt-1.5 text-caption text-muted">
                      Showing quick picks — search above for the rest of the library.
                    </p>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer className="justify-end gap-2">
                <Button variant="outline" onPress={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onPress={handleSave}>
                  {editingId ? "Save Changes" : "Create Category"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AdminConfirmDialog
        description="Products currently linked to this category will lose their category association."
        isOpen={!!deleteConfirm}
        title="Delete Category?"
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  );
}
