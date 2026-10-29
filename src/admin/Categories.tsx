import type { Category } from "@/types/domain";

import { useState } from "react";
import { FolderPlus, Pencil, Plus, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { Input } from "@/components/arc/input/input";
import { SearchField } from "@/components/arc/search-field/search-field";
import { Select } from "@/components/arc/select/select";
import { useProductStore, useToastStore } from "@/lib/store";
import { allIconNames, iconFor, readableIconName, searchIcons } from "@/lib/icons";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";

interface CategoryForm { id?: string; name: string; description: string; icon: string; parentId: string | null }

const NONE_PARENT = "__none__";
const EMPTY: CategoryForm = { name: "", description: "", icon: "category", parentId: null };

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

  const topLevel = categories.filter((c) => !c.parentId);
  const subcategoriesOf = (id: string) => categories.filter((c) => c.parentId === id);
  const iconResults = searchIcons(iconQuery);
  const subCount = categories.length - topLevel.length;

  const openAdd = (parentId: string | null = null) => { setEditingId(null); setForm({ ...EMPTY, parentId }); setIconQuery(""); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditingId(cat.id); setForm({ ...cat }); setIconQuery(""); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name) return void addToast("Category name is required", "error");
    if (editingId) {
      updateCategory(editingId, form);
      addToast("Category updated", "success");
    } else {
      const newId = form.id || form.name.toLowerCase().replace(/\s+/g, "-");

      if (categories.some((c) => c.id === newId)) return void addToast(`A category with id "${newId}" already exists`, "error");
      addCategory(form);
      addToast(form.parentId ? "Subcategory created" : "Category created", "success");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const count = products.filter((p) => p.category === id).length;

    if (count > 0) return void addToast(`Cannot delete: ${count} products use this category`, "error");
    deleteCategory(id);
    addToast("Category removed", "info");
  };

  return (
    <div className="ad-stack">
      <AdminPageHeader
        action={<Button onClick={() => openAdd()}><Plus aria-hidden="true" size={16} strokeWidth={1.75} />Add category</Button>}
        description={`${topLevel.length} categor${topLevel.length === 1 ? "y" : "ies"} and ${subCount} subcategor${subCount === 1 ? "y" : "ies"}.`}
        title="Categories"
      />

      {topLevel.length === 0 ? (
        <div className="ad-card"><EmptyState action={<Button onClick={() => openAdd()}>Add category</Button>} description="Categories organize the shop and power the filters on the Shop page." icon={<Tag aria-hidden="true" size={22} />} title="No categories yet" /></div>
      ) : (
        <div className="ad-grid ad-grid-3">
          {topLevel.map((cat) => {
            const count = products.filter((p) => p.category === cat.id && p.active).length;
            const CatIcon = iconFor(cat.icon);
            const subs = subcategoriesOf(cat.id);

            return (
              <article key={cat.id} className="ad-catcard">
                <div className="ad-catcard-top">
                  <span className="ico"><CatIcon aria-hidden="true" size={22} strokeWidth={1.75} /></span>
                  <button aria-label={`Edit ${cat.name}`} className="ad-iconbtn" type="button" onClick={() => openEdit(cat)}><Pencil aria-hidden="true" size={16} /></button>
                  <button aria-label={`Delete ${cat.name}`} className="ad-iconbtn ad-iconbtn--danger" type="button" onClick={() => setDeleteConfirm(cat.id)}><Trash2 aria-hidden="true" size={16} /></button>
                </div>
                <div>
                  <h3>{cat.name}</h3>
                  <p>{cat.description || "No description yet."}</p>
                </div>
                {subs.length > 0 && (
                  <div className="ad-sublist">
                    {subs.map((sub) => {
                      const SubIcon = iconFor(sub.icon);

                      return (
                        <div key={sub.id} className="ad-sub">
                          <span className="ico"><SubIcon aria-hidden="true" size={14} /></span>
                          <span className="name">{sub.name}</span>
                          <button aria-label={`Edit ${sub.name}`} className="ad-iconbtn" type="button" onClick={() => openEdit(sub)}><Pencil aria-hidden="true" size={14} /></button>
                          <button aria-label={`Delete ${sub.name}`} className="ad-iconbtn ad-iconbtn--danger" type="button" onClick={() => setDeleteConfirm(sub.id)}><Trash2 aria-hidden="true" size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button variant="secondary" onClick={() => openAdd(cat.id)}><FolderPlus aria-hidden="true" size={16} strokeWidth={1.75} />Add subcategory</Button>
                <div className="ad-catcard-foot">
                  <span className="ad-pill" data-tone={count ? "success" : "neutral"}>{count} active product{count === 1 ? "" : "s"}</span>
                  <code className="ad-code">{cat.id}</code>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="ad-dialog-wide" description="Categories nest one level deep." title={editingId ? "Edit category" : form.parentId ? "New subcategory" : "New category"}>
          <div className="ad-form">
            <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            {!editingId && <Input description="Optional. Generated from the name when blank." label="Unique ID" value={form.id || ""} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} />}
            <Select
              description="A subcategory can't have its own subcategories."
              label="Parent category"
              options={[{ value: NONE_PARENT, label: "None (top-level category)" }, ...topLevel.filter((c) => c.id !== editingId).map((c) => ({ value: c.id, label: c.name }))]}
              value={form.parentId || NONE_PARENT}
              onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === NONE_PARENT ? null : v }))}
            />
            <div className="ad-stack-sm">
              <div className="ad-actions" style={{ justifyContent: "space-between" }}>
                <p className="ad-label" style={{ margin: 0 }}>Display icon</p>
                <span className="ad-hint">{allIconNames.length.toLocaleString()} icons</span>
              </div>
              <SearchField label="Search icons" placeholder="Search the full icon library" value={iconQuery} onValueChange={setIconQuery} />
              <div className="ad-iconpick">
                {iconResults.length === 0 && <p className="ad-hint" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "var(--space-4)" }}>No icons match &ldquo;{iconQuery}&rdquo;.</p>}
                {iconResults.map((name) => {
                  const OptIcon = iconFor(name);

                  return <button key={name} aria-label={readableIconName(name)} aria-pressed={form.icon === name} title={readableIconName(name)} type="button" onClick={() => setForm((f) => ({ ...f, icon: name }))}><OptIcon aria-hidden="true" size={20} strokeWidth={1.75} /></button>;
                })}
              </div>
              {!iconQuery.trim() && <p className="ad-hint">Showing quick picks. Search to see the rest.</p>}
            </div>
            <div className="ad-actions ad-actions--end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? "Save changes" : "Create category"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        description="Products in this category will lose their category. If it has subcategories, they are promoted to top-level instead of deleted."
        isOpen={!!deleteConfirm}
        title="Delete category?"
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  );
}
