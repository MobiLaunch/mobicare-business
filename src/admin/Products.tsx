import type { Product } from "@/types/domain";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { History, ImageOff, Link2, PackageOpen, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { Input } from "@/components/arc/input/input";
import { SearchField } from "@/components/arc/search-field/search-field";
import { Select } from "@/components/arc/select/select";
import { Switch } from "@/components/arc/switch/switch";
import { Textarea } from "@/components/arc/textarea/textarea";
import { useProductStore, useToastStore } from "@/lib/store";
import {
  isSupabaseConfigured,
  sbFetchPosInventory,
  sbFetchStockMovements,
  sbSetInventoryStock,
  type PosInventoryItem,
  type StockMovement,
} from "@/lib/supabase";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, { type AdminDataTableColumn } from "@/admin/components/AdminDataTable";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";

interface ProductFormState {
  name: string;
  category: string;
  price: string;
  comparePrice: string;
  stock: string;
  sku: string;
  description: string;
  images: string[];
  tags: string;
  featured: boolean;
  active: boolean;
  shippingDays: { min: number; max: number };
  inventoryId?: number | null;
}

const EMPTY_PRODUCT: ProductFormState = {
  name: "",
  category: "",
  price: "",
  comparePrice: "",
  stock: "",
  sku: "",
  description: "",
  images: [""],
  tags: "",
  featured: false,
  active: true,
  shippingDays: { min: 3, max: 7 },
};

const REASONS: Record<string, string> = {
  adjustment: "Adjusted",
  web_order: "Web order",
  web_order_cancelled: "Web order cancelled",
};

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="ad-pill" data-tone="danger">Out of stock</span>;
  if (stock <= 5) return <span className="ad-pill" data-tone="warning">Low ({stock})</span>;

  return <span className="ad-pill" data-tone="success">{stock} in stock</span>;
}

export default function Products() {
  const [searchParams] = useSearchParams();
  const products = useProductStore((s) => s.products);
  const categories = useProductStore((s) => s.categories);
  const topLevelCategories = categories.filter((c) => !c.parentId);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || id;
  // Flat list with subcategories visually indented under their parent.
  const categoryOptions = topLevelCategories.flatMap((top) => [
    { value: top.id, label: top.name },
    ...categories.filter((c) => c.parentId === top.id).map((sub) => ({ value: sub.id, label: `— ${sub.name}` })),
  ]);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const deleteProduct = useProductStore((s) => s.deleteProduct);
  const addToast = useToastStore((s) => s.add);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [posItems, setPosItems] = useState<PosInventoryItem[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [linkCategory, setLinkCategory] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [costs, setCosts] = useState<Record<number, number>>({});
  const [lowOnly, setLowOnly] = useState(false);
  const synced = isSupabaseConfigured();
  const linkedIds = new Set(products.map((p) => p.inventoryId).filter((v): v is number => typeof v === "number"));
  const lowCount = products.filter((p) => p.active && p.stock <= 5).length;

  const loadMovements = () => {
    if (synced) void sbFetchStockMovements(8).then((m) => m && setMovements(m));
  };

  useEffect(loadMovements, [synced, products]);

  // Cost lives on the POS item; the shop only needs it here to show margin.
  useEffect(() => {
    if (!synced) return;
    void sbFetchPosInventory().then((items) => items && setCosts(Object.fromEntries(items.filter((i) => i.cost > 0).map((i) => [i.id, i.cost]))));
  }, [synced]);

  const openLink = async () => {
    setLinkOpen(true);
    setPicked([]);
    setPosSearch("");
    setPosLoading(true);
    const items = await sbFetchPosInventory();

    setPosLoading(false);
    if (!items) addToast("Couldn't read the POS inventory. Sign in as the shop owner and try again.", "error");
    else setPosItems(items);
  };

  const posVisible = posItems
    .filter((i) => !linkedIds.has(i.id))
    .filter((i) => !posSearch || `${i.name} ${i.sku} ${i.category}`.toLowerCase().includes(posSearch.toLowerCase()));

  const handleLink = async () => {
    if (!linkCategory) return void addToast("Pick a shop category for the new products", "error");
    const chosen = posItems.filter((i) => picked.includes(i.id));

    // Added as hidden drafts: the shop owner reviews photos and copy, then switches them on.
    for (const item of chosen) {
      await addProduct({
        name: item.name,
        sku: item.sku || `POS-${item.id}`,
        category: linkCategory,
        price: item.price,
        stock: item.stock,
        description: item.name,
        images: [],
        tags: [],
        featured: false,
        active: false,
        weight: 0,
        shippingDays: { min: 3, max: 7 },
        inventoryId: item.id,
      });
    }
    await updateAfterLink(chosen.length);
  };

  const updateAfterLink = async (count: number) => {
    setLinkOpen(false);
    addToast(`${count} POS item${count === 1 ? "" : "s"} added as hidden drafts. Review them, then switch them on.`, "success");
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PRODUCT });
    setModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setEditingId(null);
      setForm({ ...EMPTY_PRODUCT });
      setModalOpen(true);
    }
  }, [searchParams]);

  const filtered = products.filter((p) => {
    const matchesCat = catFilter === "all" || p.category === catFilter;
    const matchesLow = !lowOnly || p.stock <= 5;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());

    return matchesCat && matchesSearch && matchesLow;
  });

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      ...product,
      price: String(product.price),
      comparePrice: product.comparePrice ? String(product.comparePrice) : "",
      stock: String(product.stock),
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      images: product.images?.length ? product.images : [""],
    });
    setModalOpen(true);
  };

  const updateForm = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const { name, category, price, stock, sku, description } = form;

    if (!name || !category || !price || !stock || !sku || !description) {
      addToast("Please fill in all required fields (*)", "error");

      return;
    }
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    const compareNum = form.comparePrice ? parseFloat(form.comparePrice) : null;

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      addToast("Please enter a valid non-negative price", "error");

      return;
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      addToast("Please enter a valid stock quantity", "error");

      return;
    }
    if (compareNum != null && (!Number.isFinite(compareNum) || compareNum < 0)) {
      addToast("Please enter a valid compare-at price", "error");

      return;
    }
    if (compareNum != null && compareNum <= priceNum) {
      addToast("Compare-at price must be higher than the selling price", "error");

      return;
    }

    const data: Partial<Product> = {
      ...form,
      price: priceNum,
      comparePrice: compareNum,
      stock: stockNum,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      images: form.images.filter(Boolean),
    };

    if (editingId) {
      const linked = products.find((p) => p.id === editingId)?.inventoryId;

      if (typeof linked === "number") {
        // One shared count: the POS item is the source of truth, the shop mirrors it.
        if (stockNum !== products.find((p) => p.id === editingId)?.stock) void sbSetInventoryStock(linked, stockNum);
      }
      updateProduct(editingId, data);
      addToast("Product saved successfully", "success");
    } else {
      addProduct(data);
      addToast("New product added to catalog", "success");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    addToast("Product removed from catalog", "info");
  };

  const handleToggleActive = (product: Product) => {
    updateProduct(product.id, { active: !product.active });
    addToast(`Product ${product.active ? "hidden from" : "published on"} live store`, "info");
  };

  const handleToggleFeatured = (product: Product) => {
    updateProduct(product.id, { featured: !product.featured });
  };

  const thumb = (p: Product) => (
    <span className="ad-thumb">{p.images?.[0] ? <img alt="" src={p.images[0]} /> : <ImageOff aria-hidden="true" size={16} />}</span>
  );

  const priceCell = (p: Product) => (
    <div>
      <strong className="ad-num" style={{ fontWeight: 500 }}>${p.price.toFixed(2)}</strong>
      {typeof p.inventoryId === "number" && costs[p.inventoryId] > 0 && p.price > 0 && (
        <div className="ad-hint">{Math.round(((p.price - costs[p.inventoryId]) / p.price) * 100)}% margin</div>
      )}
      {p.comparePrice && <div className="ad-hint" style={{ textDecoration: "line-through" }}>${p.comparePrice.toFixed(2)}</div>}
    </div>
  );

  const featuredBtn = (p: Product) => (
    <button aria-label={p.featured ? `Remove ${p.name} from featured` : `Mark ${p.name} as featured`} aria-pressed={p.featured} className="ad-iconbtn" type="button" onClick={() => handleToggleFeatured(p)}>
      <Star aria-hidden="true" fill={p.featured ? "var(--warning)" : "none"} size={16} style={{ color: p.featured ? "var(--warning)" : undefined }} />
    </button>
  );

  const visibility = (p: Product) => <Switch aria-label={`${p.name} visible on store`} checked={p.active} onCheckedChange={() => handleToggleActive(p)} />;

  const rowActions = (p: Product) => (
    <div className="ad-row-actions">
      {featuredBtn(p)}
      <button aria-label={`Edit ${p.name}`} className="ad-iconbtn" type="button" onClick={() => openEdit(p)}><Pencil aria-hidden="true" size={16} /></button>
      <button aria-label={`Delete ${p.name}`} className="ad-iconbtn ad-iconbtn--danger" type="button" onClick={() => setDeleteConfirm(p.id)}><Trash2 aria-hidden="true" size={16} /></button>
    </div>
  );

  const columns: AdminDataTableColumn<Product>[] = [
    { key: "details", header: "Product", render: (p) => <div className="ad-cell-main">{thumb(p)}<div><strong style={{ fontWeight: 500, display: "block" }}>{p.name}</strong>{typeof p.inventoryId === "number" && <span className="ad-hint">Stock shared with POS</span>}</div></div> },
    { key: "sku", header: "SKU", render: (p) => <code className="ad-code">{p.sku}</code> },
    { key: "category", header: "Category", render: (p) => <span className="ad-pill" data-tone="neutral">{categoryName(p.category)}</span> },
    { key: "price", header: "Price", render: priceCell },
    { key: "stock", header: "Stock", render: (p) => <StockBadge stock={p.stock} /> },
    { key: "active", header: "Visible", render: visibility },
    { key: "actions", header: "", render: rowActions },
  ];

  const empty = { icon: PackageOpen, title: "No matching products found", description: "Try adjusting your search criteria or category filter." };

  return (
    <div className="ad-stack">
      <AdminPageHeader
        action={
          <>
            {synced && <Button variant="secondary" onClick={openLink}><Link2 aria-hidden="true" size={16} strokeWidth={1.75} />Add from POS</Button>}
            <Button onClick={openAdd}><Plus aria-hidden="true" size={16} strokeWidth={1.75} />Add product</Button>
          </>
        }
        description={`${products.length} total items · ${products.filter((p) => p.active).length} active on the store.`}
        title="Products"
      />

      <div className="ad-toolbar">
        <div className="grow"><SearchField label="Search products" placeholder="Search by name or SKU" value={search} onValueChange={setSearch} /></div>
        <div style={{ minWidth: "12rem" }}>
          <Select label="Category" options={[{ value: "all", label: "All categories" }, ...categoryOptions]} value={catFilter} onValueChange={setCatFilter} />
        </div>
      </div>

      {(lowCount > 0 || lowOnly) && (
        <div className="ad-chiprow" role="group" aria-label="Stock filter">
          <Button size="sm" variant={lowOnly ? "primary" : "secondary"} onClick={() => setLowOnly((v) => !v)}>
            Low or out of stock ({lowCount})
          </Button>
        </div>
      )}

      <div className="ad-only-narrow">
        {filtered.length === 0 ? <AdminDataTable columns={[]} data={[]} emptyState={empty} rowKey={() => ""} /> : (
          <div className="ad-cards">
            {filtered.map((p) => (
              <article key={p.id} className="ad-mcard">
                <div className="ad-mcard-top">
                  <div className="ad-cell-main">{thumb(p)}<div style={{ minWidth: 0 }}><strong style={{ fontWeight: 500, display: "block" }}>{p.name}</strong><code className="ad-code">{p.sku}</code></div></div>
                </div>
                <div className="ad-mcard-grid">
                  <div><small>Price</small>{priceCell(p)}</div>
                  <div><small>Stock</small><StockBadge stock={p.stock} /></div>
                  <div><small>Category</small>{categoryName(p.category)}</div>
                  <div><small>Visible</small>{visibility(p)}</div>
                </div>
                {rowActions(p)}
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="ad-only-wide">
        <AdminDataTable caption="Products" columns={columns} data={filtered} emptyState={empty} rowKey={(p) => p.id} />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="ad-dialog-wide" description="Fields marked * are required." title={editingId ? "Edit product" : "New product"}>
          <div className="ad-form">
            <Input label="Product name *" required value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
            <div className="ad-form-2">
              <Select label="Category *" options={categoryOptions} placeholder="Select category" value={form.category} onValueChange={(v) => updateForm("category", v)} />
              <Input label="SKU code *" required value={form.sku} onChange={(e) => updateForm("sku", e.target.value)} />
            </div>
            <div className="ad-form-3">
              <Input inputMode="decimal" label="Selling price ($) *" required type="number" value={form.price} onChange={(e) => updateForm("price", e.target.value)} />
              <Input inputMode="decimal" label="Compare price ($)" type="number" value={form.comparePrice} onChange={(e) => updateForm("comparePrice", e.target.value)} />
              <Input inputMode="numeric" label="Stock units *" required type="number" value={form.stock} onChange={(e) => updateForm("stock", e.target.value)} />
            </div>
            <div className="ad-form-2">
              <Input label="Est. min shipping days" type="number" value={String(form.shippingDays.min)} onChange={(e) => updateForm("shippingDays", { ...form.shippingDays, min: parseInt(e.target.value, 10) || 1 })} />
              <Input label="Est. max shipping days" type="number" value={String(form.shippingDays.max)} onChange={(e) => updateForm("shippingDays", { ...form.shippingDays, max: parseInt(e.target.value, 10) || 7 })} />
            </div>
            <Textarea label="Product description *" required value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
            <Input label="Image URL" value={form.images[0] || ""} onChange={(e) => updateForm("images", [e.target.value])} />
            {form.images[0] && (
              <div>
                <p className="ad-hint">Image preview</p>
                <img alt="Preview" src={form.images[0]} style={{ maxHeight: 110, borderRadius: "var(--radius-panel)", border: "1px solid var(--border)" }} />
              </div>
            )}
            <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} />
            <div className="ad-form-2">
              <div className="ad-cell-main">
                <Switch aria-label="Active listing" checked={form.active} onCheckedChange={(v) => updateForm("active", v)} />
                <div><strong style={{ display: "block", fontWeight: 500 }}>Active listing</strong><span className="ad-hint">Visible to shoppers</span></div>
              </div>
              <div className="ad-cell-main">
                <Switch aria-label="Featured product" checked={form.featured} onCheckedChange={(v) => updateForm("featured", v)} />
                <div><strong style={{ display: "block", fontWeight: 500 }}>Featured product</strong><span className="ad-hint">Highlight on storefront</span></div>
              </div>
            </div>
            <div className="ad-actions ad-actions--end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? "Save changes" : "Publish product"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {synced && movements.length > 0 && (
        <section className="ad-card ad-card--flush" aria-label="Recent stock activity">
          <div className="ad-card-head">
            <h2 className="ad-h4" style={{ display: "flex", alignItems: "center", gap: 8 }}><History aria-hidden="true" size={16} />Recent stock activity</h2>
            <span className="ad-hint">Shared with the POS</span>
          </div>
          <div>
            {movements.map((m) => (
              <div key={m.id} className="ad-card-head" style={{ padding: "var(--space-3) var(--space-5)" }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.itemName}</strong>
                  <span className="ad-hint">{REASONS[m.reason] || m.reason}{m.ref ? ` · ${m.ref.slice(0, 12)}` : ""} · {new Date(m.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <span className="ad-pill" data-tone={m.delta < 0 ? "warning" : "success"}>{m.delta > 0 ? "+" : ""}{m.delta} → {m.stockAfter}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="ad-dialog-wide" description="Pick items from your POS inventory. They share one stock count with the shop." title="Add from POS inventory">
          <div className="ad-form">
            <SearchField label="Search POS items" placeholder="Name, SKU or category" value={posSearch} onValueChange={setPosSearch} />
            <Select label="Shop category for these products" options={categoryOptions} placeholder="Select category" value={linkCategory} onValueChange={setLinkCategory} />
            <div className="ad-table-wrap" style={{ maxHeight: "18rem", overflow: "auto" }}>
              {posLoading ? <p className="ad-hint" style={{ padding: "var(--space-4)" }}>Loading POS inventory…</p> : posVisible.length === 0 ? (
                <p className="ad-hint" style={{ padding: "var(--space-4)" }}>{posItems.length ? "Everything matching is already in the shop." : "No POS items found."}</p>
              ) : posVisible.map((i) => (
                <label key={i.id} className="ad-card-head" style={{ cursor: "pointer" }}>
                  <span className="ad-cell-main">
                    <input checked={picked.includes(i.id)} type="checkbox" onChange={(e) => setPicked((a) => (e.target.checked ? [...a, i.id] : a.filter((x) => x !== i.id)))} />
                    <span style={{ minWidth: 0 }}><strong style={{ fontWeight: 500, display: "block" }}>{i.name}</strong><span className="ad-hint">{i.category} · {i.stock} in stock{i.cost ? ` · cost $${i.cost.toFixed(2)}` : ""}</span></span>
                  </span>
                  <strong className="ad-num" style={{ fontWeight: 500 }}>${i.price.toFixed(2)}</strong>
                </label>
              ))}
            </div>
            <div className="ad-actions ad-actions--end">
              <Button variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button>
              <Button disabled={picked.length === 0} onClick={handleLink}>Add {picked.length || ""} as drafts</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        description="This product will be permanently removed from your catalog."
        isOpen={!!deleteConfirm}
        title="Delete product?"
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  );
}
